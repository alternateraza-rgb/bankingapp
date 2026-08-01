-- Ensure custom transactions work (columns + RPC + grants)
-- Safe to re-run. Required for Activity → Add custom transaction.

alter table public.ledger_entries
  add column if not exists vendor_name text,
  add column if not exists vendor_logo_url text,
  add column if not exists reference text,
  add column if not exists card_id uuid references public.cards (id) on delete set null;

-- Widen type check if present
alter table public.ledger_entries drop constraint if exists ledger_entries_type_check;
alter table public.ledger_entries
  add constraint ledger_entries_type_check
  check (
    type in (
      'topup', 'transfer_out', 'transfer_in', 'conversion', 'card',
      'crypto_buy', 'crypto_sell', 'custom', 'deposit', 'withdrawal',
      'purchase', 'income', 'fee', 'refund'
    )
  );

alter table public.ledger_entries drop constraint if exists ledger_entries_status_check;
alter table public.ledger_entries
  add constraint ledger_entries_status_check
  check (status in ('completed', 'pending', 'failed', 'refunded'));

create or replace function public.create_custom_transaction(
  p_amount numeric,
  p_currency text,
  p_vendor_name text,
  p_direction text default 'debit',
  p_type text default 'custom',
  p_vendor_logo_url text default null,
  p_title text default null,
  p_subtitle text default null,
  p_status text default 'completed',
  p_affect_balance boolean default true,
  p_wallet_id uuid default null,
  p_card_id uuid default null,
  p_meta jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_card public.cards;
  v_entry public.ledger_entries;
  v_currency text := upper(trim(p_currency));
  v_direction text := lower(trim(coalesce(p_direction, 'debit')));
  v_type text := lower(trim(coalesce(p_type, 'custom')));
  v_status text := lower(trim(coalesce(p_status, 'completed')));
  v_vendor text := trim(coalesce(p_vendor_name, ''));
  v_signed numeric;
  v_ref text;
  v_title text;
  v_subtitle text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_vendor = '' then raise exception 'Vendor name is required'; end if;
  if v_direction not in ('debit', 'credit') then
    raise exception 'Direction must be debit or credit';
  end if;
  if v_type not in ('custom', 'deposit', 'withdrawal', 'purchase', 'income', 'fee', 'refund', 'card') then
    raise exception 'Invalid custom transaction type';
  end if;
  if v_status not in ('completed', 'pending', 'failed', 'refunded') then
    raise exception 'Invalid status';
  end if;

  if p_wallet_id is not null then
    select * into v_wallet from public.wallets
    where id = p_wallet_id and user_id = v_uid for update;
    if v_wallet is null then raise exception 'Wallet not found'; end if;
  else
    insert into public.wallets (user_id, currency, balance, account_number)
    values (v_uid, v_currency, 0, public.niro_account_number(v_currency))
    on conflict (user_id, currency) do nothing;

    select * into v_wallet from public.wallets
    where user_id = v_uid and currency = v_currency for update;
  end if;

  if p_card_id is not null then
    select * into v_card from public.cards where id = p_card_id and user_id = v_uid;
    if not found then raise exception 'Card not found'; end if;
  end if;

  v_signed := case when v_direction = 'debit' then -abs(p_amount) else abs(p_amount) end;
  v_ref := public.niro_reference('CTX');
  v_title := coalesce(nullif(trim(p_title), ''), v_vendor);
  v_subtitle := coalesce(
    nullif(trim(p_subtitle), ''),
    case when v_direction = 'debit' then 'Custom purchase' else 'Custom credit' end
  );

  if coalesce(p_affect_balance, true) and v_status = 'completed' then
    if v_direction = 'debit' then
      if v_wallet.balance < abs(p_amount) then
        raise exception 'Insufficient funds';
      end if;
      update public.wallets set balance = balance - abs(p_amount) where id = v_wallet.id;
    else
      update public.wallets set balance = balance + abs(p_amount) where id = v_wallet.id;
    end if;
  end if;

  insert into public.ledger_entries (
    user_id, wallet_id, card_id, type, status, amount, currency,
    title, subtitle, vendor_name, vendor_logo_url, reference, meta, created_at
  ) values (
    v_uid,
    v_wallet.id,
    case when p_card_id is not null then v_card.id else null end,
    v_type,
    v_status,
    v_signed,
    v_currency,
    v_title,
    v_subtitle,
    v_vendor,
    nullif(trim(p_vendor_logo_url), ''),
    v_ref,
    coalesce(p_meta, '{}'::jsonb) || jsonb_build_object(
      'custom', true,
      'direction', v_direction,
      'affect_balance', coalesce(p_affect_balance, true)
    ),
    coalesce(p_occurred_at, now())
  ) returning * into v_entry;

  return v_entry;
end;
$$;

grant execute on function public.create_custom_transaction(
  numeric, text, text, text, text, text, text, text, text, boolean, uuid, uuid, jsonb, timestamptz
) to authenticated;
