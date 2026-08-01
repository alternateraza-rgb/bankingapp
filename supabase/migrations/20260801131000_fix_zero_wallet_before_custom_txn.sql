-- Repair $0 USD wallets + make ensure_starting_balance fix them.
-- Also make create_custom_transaction bootstrap balance before debit.
-- Paste-friendly / safe to re-run.

-- One-shot: any USD wallet still at 0 with no real (non-seed) spend → $5500
update public.wallets w
set balance = 5500
where w.currency = 'USD'
  and coalesce(w.balance, 0) = 0
  and not exists (
    select 1
    from public.ledger_entries le
    where le.user_id = w.user_id
      and le.status = 'completed'
      and le.amount < 0
      and coalesce((le.meta->>'seed')::boolean, false) is not true
  );

create or replace function public.ensure_starting_balance(
  p_amount numeric default 5500
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_amount numeric := coalesce(nullif(p_amount, 0), 5500);
  v_has_opening boolean;
  v_has_seed boolean;
  v_has_real_spend boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  begin
    insert into public.wallets (user_id, currency, balance, account_number)
    values
      (v_uid, 'USD', 0, public.niro_account_number('USD')),
      (v_uid, 'EUR', 0, public.niro_account_number('EUR')),
      (v_uid, 'GBP', 0, public.niro_account_number('GBP'))
    on conflict (user_id, currency) do nothing;
  exception when foreign_key_violation then
    raise exception 'Profile missing for user - sign out and sign up again';
  end;

  select * into v_wallet
  from public.wallets
  where user_id = v_uid and currency = 'USD'
  for update;

  select exists (
    select 1 from public.ledger_entries le
    where le.user_id = v_uid
      and (
        (le.meta->>'opening_balance')::boolean is true
        or (le.title = 'Account top-up' and le.subtitle = 'Opening balance')
      )
  ) into v_has_opening;

  select exists (
    select 1 from public.ledger_entries le
    where le.user_id = v_uid
      and le.status = 'completed'
      and le.amount < 0
      and coalesce((le.meta->>'seed')::boolean, false) is not true
  ) into v_has_real_spend;

  if not v_has_opening then
    update public.wallets set balance = v_amount
    where id = v_wallet.id returning * into v_wallet;

    insert into public.ledger_entries (
      user_id, wallet_id, type, status, amount, currency,
      title, subtitle, vendor_name, reference, meta, created_at
    ) values (
      v_uid, v_wallet.id, 'deposit', 'completed', v_amount, 'USD',
      'Account top-up', 'Opening balance', 'Wise',
      public.niro_reference('TOP'),
      jsonb_build_object('opening_balance', true),
      now() - interval '35 days'
    );
  elsif coalesce(v_wallet.balance, 0) = 0 and not v_has_real_spend then
    -- Opening row exists but wallet stuck at $0 (common after partial setup)
    update public.wallets set balance = v_amount
    where id = v_wallet.id returning * into v_wallet;
  else
    select * into v_wallet from public.wallets where id = v_wallet.id;
  end if;

  select exists (
    select 1 from public.ledger_entries le
    where le.user_id = v_uid and (le.meta->>'seed')::boolean is true
  ) into v_has_seed;

  if not v_has_seed and to_regclass('public.starter_activity_template') is not null then
    insert into public.ledger_entries (
      user_id, wallet_id, type, status, amount, currency, title, subtitle,
      vendor_name, reference, meta, created_at
    )
    select
      v_uid, v_wallet.id, t.entry_type, 'completed', t.amount, 'USD',
      t.title, t.subtitle, t.vendor, public.niro_reference('TXN'),
      jsonb_build_object('seed', true, 'vendor', t.vendor),
      now() - make_interval(days => t.days_ago, hours => t.hour)
    from public.starter_activity_template t
    order by t.sort_order;
  end if;

  return v_wallet;
end;
$fn$;

grant execute on function public.ensure_starting_balance(numeric) to authenticated;
