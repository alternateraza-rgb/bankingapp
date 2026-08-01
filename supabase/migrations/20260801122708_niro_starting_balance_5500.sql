-- =============================================================================
-- Niro: starting balance $5500 + realistic month of activity (no "demo funds")
-- Run AFTER niro_core (+ optional cards/custom-txn delta)
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_name text;
  v_wallet_usd uuid;
  v_day int;
begin
  v_handle := lower(coalesce(
    new.raw_user_meta_data->>'handle',
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g')
  ));
  if length(v_handle) < 3 then
    v_handle := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  v_handle := substr(v_handle, 1, 24);

  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_handle := substr(v_handle, 1, 18) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end loop;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(
      trim(
        coalesce(new.raw_user_meta_data->>'first_name', '') || ' ' ||
        coalesce(new.raw_user_meta_data->>'last_name', '')
      ),
      ''
    ),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, handle, full_name, avatar_initials)
  values (
    new.id,
    new.email,
    v_handle,
    v_name,
    public.niro_initials(v_name)
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  -- Single starting balance: $5500 USD (other wallets at 0)
  insert into public.wallets (user_id, currency, balance, account_number)
  values
    (new.id, 'USD', 5500.00, public.niro_account_number('USD')),
    (new.id, 'EUR', 0, public.niro_account_number('EUR')),
    (new.id, 'GBP', 0, public.niro_account_number('GBP'))
  on conflict (user_id, currency) do nothing;

  select id into v_wallet_usd
  from public.wallets
  where user_id = new.id and currency = 'USD';

  -- Opening balance ledger (NOT "demo funds")
  insert into public.ledger_entries (
    user_id, wallet_id, type, amount, currency, title, subtitle, vendor_name, reference, meta, created_at
  ) values (
    new.id,
    v_wallet_usd,
    'deposit',
    5500.00,
    'USD',
    'Account top-up',
    'Opening balance',
    'Wise',
    public.niro_reference('TOP'),
    jsonb_build_object('opening_balance', true),
    now() - interval '35 days'
  );

  -- ~1 month of realistic card / transfer activity (amounts do not re-debit wallet;
  -- balance stays at the granted $5500 starting point)
  insert into public.ledger_entries (
    user_id, wallet_id, type, status, amount, currency, title, subtitle,
    vendor_name, reference, meta, created_at
  )
  select
    new.id,
    v_wallet_usd,
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Existing users: set USD wallet to $5500 and clean legacy demo welcome rows
-- ---------------------------------------------------------------------------
update public.wallets
set balance = 5500.00
where currency = 'USD';

update public.wallets
set balance = 0
where currency in ('EUR', 'GBP')
  and balance in (250.00, 200.00);

delete from public.ledger_entries
where (
  title ilike '%welcome bonus%'
  or subtitle ilike '%demo funds%'
  or subtitle ilike '%explore niro%'
  or ((meta->>'sandbox')::boolean is true and type = 'topup' and title ilike '%welcome%')
);

-- Seed realistic history for existing users who don't have seed rows yet
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
    ('deposit'::text, 5500.00::numeric, 'Account top-up'::text, 'Opening balance'::text, 'Wise'::text, 35, 9),
    ('card', -6.45, 'Starbucks', 'Card payment', 'Starbucks', 0, 9),
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
