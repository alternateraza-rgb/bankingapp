-- Paste-friendly starter seed (Supabase SQL editor truncates large pastes).
-- Run the numbered steps in order, OR apply this whole file via CLI/migration.

-- 1) Template table for seed rows
create table if not exists public.starter_activity_template (
  sort_order int primary key,
  entry_type text not null,
  amount numeric not null,
  title text not null,
  subtitle text not null,
  vendor text not null,
  days_ago int not null,
  hour int not null
);

-- 2) Replace template rows
truncate public.starter_activity_template;

insert into public.starter_activity_template
  (sort_order, entry_type, amount, title, subtitle, vendor, days_ago, hour)
values
  (1,  'card', -6.45,  'Starbucks', 'Card payment', 'Starbucks', 0, 9),
  (2,  'card', -14.20, 'Uber', 'Card payment', 'Uber', 0, 18),
  (3,  'card', -2.99,  'Apple', 'App Store', 'Apple', 1, 11),
  (4,  'transfer_out', -48.00, 'Alipay', 'Transfer out', 'Alipay', 1, 20),
  (5,  'card', -15.49, 'Netflix', 'Subscription', 'Netflix', 2, 7),
  (6,  'card', -42.18, 'Amazon', 'Card payment', 'Amazon', 2, 16),
  (7,  'card', -51.30, 'Shell', 'Fuel', 'Shell', 3, 17),
  (8,  'card', -5.85,  'Starbucks', 'Card payment', 'Starbucks', 4, 8),
  (9,  'card', -10.99, 'Spotify', 'Subscription', 'Spotify', 5, 6),
  (10, 'card', -11.40, 'McDonalds', 'Card payment', 'McDonalds', 5, 13),
  (11, 'card', -2.99,  'Apple', 'iCloud+', 'Apple', 6, 10),
  (12, 'card', -67.52, 'Target', 'Card payment', 'Target', 7, 15);

insert into public.starter_activity_template
  (sort_order, entry_type, amount, title, subtitle, vendor, days_ago, hour)
values
  (13, 'card', -23.75, 'Uber Eats', 'Card payment', 'Uber Eats', 8, 19),
  (14, 'card', -29.90, 'Alipay', 'Shopping', 'Alipay', 9, 12),
  (15, 'card', -7.15,  'Starbucks', 'Card payment', 'Starbucks', 10, 9),
  (16, 'card', -84.22, 'Whole Foods', 'Groceries', 'Whole Foods', 11, 14),
  (17, 'card', -54.99, 'Adobe', 'Subscription', 'Adobe', 12, 8),
  (18, 'card', -18.64, 'CVS Pharmacy', 'Card payment', 'CVS', 13, 11),
  (19, 'card', -9.99,  'Apple', 'App Store', 'Apple', 14, 21),
  (20, 'card', -22.10, 'Uber', 'Card payment', 'Uber', 15, 22),
  (21, 'card', -6.25,  'Starbucks', 'Card payment', 'Starbucks', 16, 8),
  (22, 'card', -14.99, 'Amazon', 'Prime', 'Amazon', 17, 7),
  (23, 'card', -13.85, 'Chipotle', 'Card payment', 'Chipotle', 18, 12),
  (24, 'transfer_out', -75.00, 'Alipay', 'Transfer out', 'Alipay', 19, 16);

insert into public.starter_activity_template
  (sort_order, entry_type, amount, title, subtitle, vendor, days_ago, hour)
values
  (25, 'card', -120.00, 'Nike', 'Card payment', 'Nike', 20, 13),
  (26, 'card', -5.45,  'Starbucks', 'Card payment', 'Starbucks', 21, 9),
  (27, 'card', -9.99,  'Google One', 'Subscription', 'Google', 22, 6),
  (28, 'card', -27.33, 'Walgreens', 'Card payment', 'Walgreens', 23, 18),
  (29, 'card', -16.80, 'Uber', 'Card payment', 'Uber', 24, 20),
  (30, 'card', -10.99, 'Apple', 'Music', 'Apple', 25, 7),
  (31, 'card', -8.10,  'Starbucks', 'Card payment', 'Starbucks', 26, 10),
  (32, 'card', -149.99, 'Best Buy', 'Card payment', 'Best Buy', 27, 15),
  (33, 'card', -36.50, 'Alipay', 'Shopping', 'Alipay', 28, 11),
  (34, 'card', -31.20, 'DoorDash', 'Card payment', 'DoorDash', 30, 19),
  (35, 'card', -6.75,  'Starbucks', 'Card payment', 'Starbucks', 32, 8),
  (36, 'card', -58.40, 'Amazon', 'Card payment', 'Amazon', 34, 14);

-- 3) Short RPC: balance + copy from template
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
      v_uid, v_wallet.id, 'deposit', 'completed', v_amount, 'USD',
      'Account top-up', 'Opening balance', 'Wise',
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
    select * into v_wallet from public.wallets where id = v_wallet.id;
  end if;

  select exists (
    select 1 from public.ledger_entries le
    where le.user_id = v_uid and (le.meta->>'seed')::boolean is true
  ) into v_has_seed;

  if not v_has_seed then
    insert into public.ledger_entries (
      user_id, wallet_id, type, status, amount, currency, title, subtitle,
      vendor_name, reference, meta, created_at
    )
    select
      v_uid,
      v_wallet.id,
      t.entry_type,
      'completed',
      t.amount,
      'USD',
      t.title,
      t.subtitle,
      t.vendor,
      public.niro_reference('TXN'),
      jsonb_build_object('seed', true, 'vendor', t.vendor),
      now() - make_interval(days => t.days_ago, hours => t.hour)
    from public.starter_activity_template t
    order by t.sort_order;
  end if;

  return v_wallet;
end;
$fn$;

grant execute on function public.ensure_starting_balance(numeric) to authenticated;

-- 4) Backfill existing users missing seed rows
insert into public.ledger_entries (
  user_id, wallet_id, type, status, amount, currency, title, subtitle,
  vendor_name, reference, meta, created_at
)
select
  w.user_id,
  w.id,
  t.entry_type,
  'completed',
  t.amount,
  'USD',
  t.title,
  t.subtitle,
  t.vendor,
  public.niro_reference('TXN'),
  jsonb_build_object('seed', true, 'vendor', t.vendor),
  now() - make_interval(days => t.days_ago, hours => t.hour)
from public.wallets w
cross join public.starter_activity_template t
where w.currency = 'USD'
  and not exists (
    select 1 from public.ledger_entries le
    where le.user_id = w.user_id and (le.meta->>'seed')::boolean is true
  );
