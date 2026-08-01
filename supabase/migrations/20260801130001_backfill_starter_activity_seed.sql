-- =============================================================================
-- Backfill seed activity for existing users who only have opening balance.
-- Run AFTER 20260801130000_ensure_starter_activity_seed.sql
-- Safe to re-run.
-- =============================================================================

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
  now() - make_interval(days => x.days_ago, hours => x.hour)
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
    ('card', -11.40, 'McDonalds', 'Card payment', 'McDonalds', 5, 13),
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
