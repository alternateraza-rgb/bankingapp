-- =============================================================================
-- ensure_starting_balance also seeds ~1 month of activity when missing.
-- App relies on this SQL seed (not local fake transactions).
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
  v_has_seed boolean;
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
    select * into v_wallet
    from public.wallets
    where id = v_wallet.id;
  end if;

  -- Seed realistic month of activity if this user has none yet.
  -- Amounts do not re-debit the wallet; balance stays at starter amount.
  select exists (
    select 1
    from public.ledger_entries le
    where le.user_id = v_uid
      and (le.meta->>'seed')::boolean is true
  ) into v_has_seed;

  if not v_has_seed then
    insert into public.ledger_entries (
      user_id, wallet_id, type, status, amount, currency, title, subtitle,
      vendor_name, reference, meta, created_at
    )
    select
      v_uid,
      v_wallet.id,
      x.type,
      'completed',
      x.amount,
      'USD',
      x.title,
      x.subtitle,
      x.vendor,
      public.niro_reference('TXN'),
      jsonb_build_object('seed', true, 'vendor', x.vendor),
      now() - (x.days_ago || ' days')::interval - (x.hour || ' hours')::interval
    from (
      values
        ('card'::text, -6.45::numeric, 'Starbucks'::text, 'Card payment'::text, 'Starbucks'::text, 0, 9),
        ('card', -14.20, 'Uber', 'Card payment', 'Uber', 0, 18),
        ('card', -2.99, 'Apple', 'App Store', 'Apple', 1, 11),
        ('transfer_out', -48.00, 'Alipay', 'Transfer out', 'Alipay', 1, 20),
        ('card', -15.49, 'Netflix', 'Subscription', 'Netflix', 2, 7),
        ('card', -42.18, 'Amazon', 'Card payment', 'Amazon', 2, 16),
        ('card', -51.30, 'Shell', 'Fuel', 'Shell', 3, 17),
        ('card', -5.85, 'Starbucks', 'Card payment', 'Starbucks', 4, 8),
        ('card', -10.99, 'Spotify', 'Subscription', 'Spotify', 5, 6),
        ('card', -11.40, 'McDonald''s', 'Card payment', 'McDonald''s', 5, 13),
        ('card', -2.99, 'Apple', 'iCloud+', 'Apple', 6, 10),
        ('card', -67.52, 'Target', 'Card payment', 'Target', 7, 15),
        ('card', -23.75, 'Uber Eats', 'Card payment', 'Uber Eats', 8, 19),
        ('card', -29.90, 'Alipay', 'Shopping', 'Alipay', 9, 12),
        ('card', -7.15, 'Starbucks', 'Card payment', 'Starbucks', 10, 9),
        ('card', -84.22, 'Whole Foods', 'Groceries', 'Whole Foods', 11, 14),
        ('card', -54.99, 'Adobe', 'Subscription', 'Adobe', 12, 8),
        ('card', -18.64, 'CVS Pharmacy', 'Card payment', 'CVS', 13, 11),
        ('card', -9.99, 'Apple', 'App Store', 'Apple', 14, 21),
        ('card', -22.10, 'Uber', 'Card payment', 'Uber', 15, 22),
        ('card', -6.25, 'Starbucks', 'Card payment', 'Starbucks', 16, 8),
        ('card', -14.99, 'Amazon', 'Prime', 'Amazon', 17, 7),
        ('card', -13.85, 'Chipotle', 'Card payment', 'Chipotle', 18, 12),
        ('transfer_out', -75.00, 'Alipay', 'Transfer out', 'Alipay', 19, 16),
        ('card', -120.00, 'Nike', 'Card payment', 'Nike', 20, 13),
        ('card', -5.45, 'Starbucks', 'Card payment', 'Starbucks', 21, 9),
        ('card', -9.99, 'Google One', 'Subscription', 'Google', 22, 6),
        ('card', -27.33, 'Walgreens', 'Card payment', 'Walgreens', 23, 18),
        ('card', -16.80, 'Uber', 'Card payment', 'Uber', 24, 20),
        ('card', -10.99, 'Apple', 'Music', 'Apple', 25, 7),
        ('card', -8.10, 'Starbucks', 'Card payment', 'Starbucks', 26, 10),
        ('card', -149.99, 'Best Buy', 'Card payment', 'Best Buy', 27, 15),
        ('card', -36.50, 'Alipay', 'Shopping', 'Alipay', 28, 11),
        ('card', -31.20, 'DoorDash', 'Card payment', 'DoorDash', 30, 19),
        ('card', -6.75, 'Starbucks', 'Card payment', 'Starbucks', 32, 8),
        ('card', -58.40, 'Amazon', 'Card payment', 'Amazon', 34, 14)
    ) as x(type, amount, title, subtitle, vendor, days_ago, hour);
  end if;

  return v_wallet;
end;
$$;

grant execute on function public.ensure_starting_balance(numeric) to authenticated;

-- Backfill seed activity for existing users who only have opening balance
insert into public.ledger_entries (
  user_id, wallet_id, type, status, amount, currency, title, subtitle,
  vendor_name, reference, meta, created_at
)
select
  w.user_id,
  w.id,
  x.type,
  'completed',
  x.amount,
  'USD',
  x.title,
  x.subtitle,
  x.vendor,
  public.niro_reference('TXN'),
  jsonb_build_object('seed', true, 'vendor', x.vendor),
  now() - (x.days_ago || ' days')::interval - (x.hour || ' hours')::interval
from public.wallets w
cross join (
  values
    ('card'::text, -6.45::numeric, 'Starbucks'::text, 'Card payment'::text, 'Starbucks'::text, 0, 9),
    ('card', -14.20, 'Uber', 'Card payment', 'Uber', 0, 18),
    ('card', -2.99, 'Apple', 'App Store', 'Apple', 1, 11),
    ('transfer_out', -48.00, 'Alipay', 'Transfer out', 'Alipay', 1, 20),
    ('card', -15.49, 'Netflix', 'Subscription', 'Netflix', 2, 7),
    ('card', -42.18, 'Amazon', 'Card payment', 'Amazon', 2, 16),
    ('card', -51.30, 'Shell', 'Fuel', 'Shell', 3, 17),
    ('card', -5.85, 'Starbucks', 'Card payment', 'Starbucks', 4, 8),
    ('card', -10.99, 'Spotify', 'Subscription', 'Spotify', 5, 6),
    ('card', -11.40, 'McDonald''s', 'Card payment', 'McDonald''s', 5, 13),
    ('card', -2.99, 'Apple', 'iCloud+', 'Apple', 6, 10),
    ('card', -67.52, 'Target', 'Card payment', 'Target', 7, 15),
    ('card', -23.75, 'Uber Eats', 'Card payment', 'Uber Eats', 8, 19),
    ('card', -29.90, 'Alipay', 'Shopping', 'Alipay', 9, 12),
    ('card', -7.15, 'Starbucks', 'Card payment', 'Starbucks', 10, 9),
    ('card', -84.22, 'Whole Foods', 'Groceries', 'Whole Foods', 11, 14),
    ('card', -54.99, 'Adobe', 'Subscription', 'Adobe', 12, 8),
    ('card', -18.64, 'CVS Pharmacy', 'Card payment', 'CVS', 13, 11),
    ('card', -9.99, 'Apple', 'App Store', 'Apple', 14, 21),
    ('card', -22.10, 'Uber', 'Card payment', 'Uber', 15, 22),
    ('card', -6.25, 'Starbucks', 'Card payment', 'Starbucks', 16, 8),
    ('card', -14.99, 'Amazon', 'Prime', 'Amazon', 17, 7),
    ('card', -13.85, 'Chipotle', 'Card payment', 'Chipotle', 18, 12),
    ('transfer_out', -75.00, 'Alipay', 'Transfer out', 'Alipay', 19, 16),
    ('card', -120.00, 'Nike', 'Card payment', 'Nike', 20, 13),
    ('card', -5.45, 'Starbucks', 'Card payment', 'Starbucks', 21, 9),
    ('card', -9.99, 'Google One', 'Subscription', 'Google', 22, 6),
    ('card', -27.33, 'Walgreens', 'Card payment', 'Walgreens', 23, 18),
    ('card', -16.80, 'Uber', 'Card payment', 'Uber', 24, 20),
    ('card', -10.99, 'Apple', 'Music', 'Apple', 25, 7),
    ('card', -8.10, 'Starbucks', 'Card payment', 'Starbucks', 26, 10),
    ('card', -149.99, 'Best Buy', 'Card payment', 'Best Buy', 27, 15),
    ('card', -36.50, 'Alipay', 'Shopping', 'Alipay', 28, 11),
    ('card', -31.20, 'DoorDash', 'Card payment', 'DoorDash', 30, 19),
    ('card', -6.75, 'Starbucks', 'Card payment', 'Starbucks', 32, 8),
    ('card', -58.40, 'Amazon', 'Card payment', 'Amazon', 34, 14)
) as x(type, amount, title, subtitle, vendor, days_ago, hour)
where w.currency = 'USD'
  and not exists (
    select 1
    from public.ledger_entries le
    where le.user_id = w.user_id
      and (le.meta->>'seed')::boolean is true
  );
