-- Short top-up RPC so Add money updates wallets + ledger reliably.
-- Safe to re-run / paste-friendly.

create or replace function public.topup_wallet(
  p_currency text,
  p_amount numeric
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_currency text := upper(trim(p_currency));
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  insert into public.wallets (user_id, currency, balance, account_number)
  values (v_uid, v_currency, 0, public.niro_account_number(v_currency))
  on conflict (user_id, currency) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = v_uid and currency = v_currency
  for update;

  if v_wallet is null then
    raise exception 'Wallet not found';
  end if;

  update public.wallets
  set balance = balance + p_amount
  where id = v_wallet.id
  returning * into v_wallet;

  insert into public.ledger_entries (
    user_id, wallet_id, type, status, amount, currency,
    title, subtitle, vendor_name, reference, meta, created_at
  ) values (
    v_uid,
    v_wallet.id,
    'deposit',
    'completed',
    p_amount,
    v_currency,
    'Added money',
    'Added money',
    'Bank transfer in',
    public.niro_reference('ADD'),
    jsonb_build_object('topup', true, 'affect_balance', true),
    now()
  );

  return v_wallet;
end;
$fn$;

grant execute on function public.topup_wallet(text, numeric) to authenticated;
