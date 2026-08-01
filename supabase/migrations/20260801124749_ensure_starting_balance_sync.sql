-- =============================================================================
-- Keep UI + Supabase wallets in sync: ensure every user has $5500 USD starter
-- Call from app on login via rpc ensure_starting_balance()
-- Safe to re-run.
-- =============================================================================

create or replace function public.ensure_starting_balance(
  p_amount numeric default 5500
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_amount numeric := coalesce(nullif(p_amount, 0), 5500);
  v_has_opening boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Ensure USD + empty EUR/GBP wallets (profile should already exist from auth trigger)
  begin
    insert into public.wallets (user_id, currency, balance, account_number)
    values
      (v_uid, 'USD', 0, public.niro_account_number('USD')),
      (v_uid, 'EUR', 0, public.niro_account_number('EUR')),
      (v_uid, 'GBP', 0, public.niro_account_number('GBP'))
    on conflict (user_id, currency) do nothing;
  exception when foreign_key_violation then
    raise exception 'Profile missing for user — sign out and sign up again';
  end;

  select * into v_wallet
  from public.wallets
  where user_id = v_uid and currency = 'USD'
  for update;

  select exists (
    select 1
    from public.ledger_entries le
    where le.user_id = v_uid
      and (
        (le.meta->>'opening_balance')::boolean is true
        or (le.title = 'Account top-up' and le.subtitle = 'Opening balance')
      )
  ) into v_has_opening;

  -- First-time bootstrap (or legacy 1000 demo grant): set USD to starter amount
  if not v_has_opening then
    update public.wallets
    set balance = v_amount
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
      v_amount,
      'USD',
      'Account top-up',
      'Opening balance',
      'Wise',
      public.niro_reference('TOP'),
      jsonb_build_object('opening_balance', true),
      now() - interval '35 days'
    );
  elsif v_wallet.balance is null then
    update public.wallets
    set balance = v_amount
    where id = v_wallet.id
    returning * into v_wallet;
  else
    -- Already bootstrapped — return live wallet (source of truth)
    select * into v_wallet
    from public.wallets
    where id = v_wallet.id;
  end if;

  return v_wallet;
end;
$$;

grant execute on function public.ensure_starting_balance(numeric) to authenticated;

-- One-shot repair for existing accounts that still have legacy demo balances
-- and never received the new opening-balance marker.
do $$
declare
  r record;
begin
  for r in
    select w.id as wallet_id, w.user_id
    from public.wallets w
    where w.currency = 'USD'
      and w.balance in (0, 1000, 1250)  -- common legacy starter totals
      and not exists (
        select 1 from public.ledger_entries le
        where le.user_id = w.user_id
          and (
            (le.meta->>'opening_balance')::boolean is true
            or (le.title = 'Account top-up' and le.subtitle = 'Opening balance')
          )
      )
  loop
    update public.wallets set balance = 5500 where id = r.wallet_id;

    insert into public.ledger_entries (
      user_id, wallet_id, type, status, amount, currency,
      title, subtitle, vendor_name, reference, meta, created_at
    ) values (
      r.user_id,
      r.wallet_id,
      'deposit',
      'completed',
      5500,
      'USD',
      'Account top-up',
      'Opening balance',
      'Wise',
      public.niro_reference('TOP'),
      jsonb_build_object('opening_balance', true, 'repaired', true),
      now() - interval '35 days'
    );
  end loop;
end;
$$;
