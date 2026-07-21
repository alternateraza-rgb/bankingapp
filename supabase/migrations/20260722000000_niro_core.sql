-- Niro core schema: profiles, wallets, ledger, P2P, cards, crypto
-- Run in Supabase SQL Editor (Dashboard → SQL → New query → Run)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  handle text not null unique,
  full_name text not null default '',
  avatar_initials text not null default 'N',
  primary_currency text not null default 'USD',
  created_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,24}$')
);

create index if not exists profiles_handle_idx on public.profiles (handle);
create index if not exists profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- Wallets (fiat)
-- ---------------------------------------------------------------------------
create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  currency text not null,
  balance numeric(18, 2) not null default 0 check (balance >= 0),
  account_number text not null,
  created_at timestamptz not null default now(),
  unique (user_id, currency)
);

create index if not exists wallets_user_id_idx on public.wallets (user_id);

-- ---------------------------------------------------------------------------
-- FX rates (vs USD)
-- ---------------------------------------------------------------------------
create table if not exists public.fx_rates (
  currency text primary key,
  rate_to_usd numeric(18, 8) not null,
  updated_at timestamptz not null default now()
);

insert into public.fx_rates (currency, rate_to_usd) values
  ('USD', 1),
  ('EUR', 1.08),
  ('GBP', 1.27),
  ('PKR', 0.0036),
  ('CNY', 0.14),
  ('AED', 0.27),
  ('AUD', 0.66),
  ('CAD', 0.74),
  ('PHP', 0.017)
on conflict (currency) do update set rate_to_usd = excluded.rate_to_usd, updated_at = now();

-- ---------------------------------------------------------------------------
-- Transfers + ledger
-- ---------------------------------------------------------------------------
create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id),
  to_user_id uuid not null references public.profiles (id),
  currency text not null,
  amount numeric(18, 2) not null check (amount > 0),
  note text not null default '',
  reference text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id),
  wallet_id uuid references public.wallets (id),
  transfer_id uuid references public.transfers (id),
  type text not null,
  status text not null default 'completed',
  amount numeric(18, 8) not null,
  currency text not null,
  title text not null,
  subtitle text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ledger_user_created_idx
  on public.ledger_entries (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, contact_user_id),
  check (owner_id <> contact_user_id)
);

-- ---------------------------------------------------------------------------
-- Virtual cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  wallet_id uuid not null references public.wallets (id),
  cardholder_name text not null,
  last4 text not null,
  full_number text not null,
  expiry text not null,
  cvv text not null,
  network text not null default 'visa',
  status text not null default 'active' check (status in ('active', 'frozen', 'cancelled')),
  spend_limit_daily numeric(18, 2) not null default 1000,
  spend_limit_monthly numeric(18, 2) not null default 5000,
  spent_today numeric(18, 2) not null default 0,
  spent_month numeric(18, 2) not null default 0,
  online_payments boolean not null default true,
  contactless boolean not null default true,
  foreign_transactions boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id);

-- ---------------------------------------------------------------------------
-- Crypto
-- ---------------------------------------------------------------------------
create table if not exists public.crypto_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset text not null,
  quantity numeric(24, 12) not null default 0 check (quantity >= 0),
  unique (user_id, asset)
);

create table if not exists public.crypto_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  asset text not null,
  side text not null check (side in ('buy', 'sell')),
  quantity numeric(24, 12) not null,
  price_usd numeric(18, 8) not null,
  fiat_amount numeric(18, 2) not null,
  fiat_currency text not null default 'USD',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.niro_account_number(p_currency text)
returns text
language plpgsql
as $$
begin
  return upper(p_currency) || '-' || lpad((floor(random() * 100000000))::text, 8, '0');
end;
$$;

create or replace function public.niro_reference(prefix text default 'NRO')
returns text
language plpgsql
as $$
begin
  return prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
end;
$$;

create or replace function public.niro_initials(p_name text)
returns text
language sql
immutable
as $$
  select upper(coalesce(
    nullif(
      array_to_string(
        (select array_agg(left(part, 1))
         from unnest(string_to_array(trim(p_name), ' ')) as part
         where part <> ''),
        ''
      ),
      ''
    ),
    'N'
  ));
$$;

-- ---------------------------------------------------------------------------
-- Signup bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_name text;
begin
  v_handle := lower(coalesce(
    new.raw_user_meta_data->>'handle',
    regexp_replace(split_part(new.email, '@', 1), '[^a-z0-9_]', '', 'g')
  ));
  if length(v_handle) < 3 then
    v_handle := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  v_handle := substr(v_handle, 1, 24);

  -- ensure unique handle
  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_handle := substr(v_handle, 1, 18) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end loop;

  v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, handle, full_name, avatar_initials)
  values (new.id, new.email, v_handle, v_name, public.niro_initials(v_name));

  insert into public.wallets (user_id, currency, balance, account_number)
  values
    (new.id, 'USD', 1000.00, public.niro_account_number('USD')),
    (new.id, 'EUR', 250.00, public.niro_account_number('EUR')),
    (new.id, 'GBP', 200.00, public.niro_account_number('GBP'));

  insert into public.ledger_entries (user_id, type, amount, currency, title, subtitle, meta)
  values (
    new.id,
    'topup',
    1000.00,
    'USD',
    'Welcome bonus',
    'Demo funds to explore Niro',
    jsonb_build_object('sandbox', true)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.topup_wallet(p_currency text, p_amount numeric)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_today numeric;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000 then
    raise exception 'Invalid amount';
  end if;

  select coalesce(sum(amount), 0) into v_today
  from public.ledger_entries
  where user_id = v_uid
    and type = 'topup'
    and created_at::date = current_date;

  if v_today + p_amount > 25000 then
    raise exception 'Daily top-up limit reached';
  end if;

  insert into public.wallets (user_id, currency, balance, account_number)
  values (v_uid, upper(p_currency), 0, public.niro_account_number(upper(p_currency)))
  on conflict (user_id, currency) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = v_uid and currency = upper(p_currency)
  for update;

  update public.wallets
  set balance = balance + p_amount
  where id = v_wallet.id
  returning * into v_wallet;

  insert into public.ledger_entries (user_id, wallet_id, type, amount, currency, title, subtitle, meta)
  values (
    v_uid,
    v_wallet.id,
    'topup',
    p_amount,
    v_wallet.currency,
    'Added money',
    'Sandbox top-up',
    jsonb_build_object('sandbox', true)
  );

  return v_wallet;
end;
$$;

create or replace function public.convert_fiat(
  p_from text,
  p_to text,
  p_amount numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_from public.wallets;
  v_to public.wallets;
  v_from_rate numeric;
  v_to_rate numeric;
  v_to_amount numeric;
  v_rate numeric;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if upper(p_from) = upper(p_to) then raise exception 'Currencies must differ'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  select rate_to_usd into v_from_rate from public.fx_rates where currency = upper(p_from);
  select rate_to_usd into v_to_rate from public.fx_rates where currency = upper(p_to);
  if v_from_rate is null or v_to_rate is null then raise exception 'Unsupported currency'; end if;

  v_rate := v_from_rate / v_to_rate;
  v_to_amount := round(p_amount * v_rate, 2);

  insert into public.wallets (user_id, currency, balance, account_number)
  values (v_uid, upper(p_to), 0, public.niro_account_number(upper(p_to)))
  on conflict (user_id, currency) do nothing;

  select * into v_from from public.wallets
  where user_id = v_uid and currency = upper(p_from) for update;
  if v_from is null or v_from.balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  select * into v_to from public.wallets
  where user_id = v_uid and currency = upper(p_to) for update;

  update public.wallets set balance = balance - p_amount where id = v_from.id;
  update public.wallets set balance = balance + v_to_amount where id = v_to.id;

  insert into public.ledger_entries (user_id, wallet_id, type, amount, currency, title, subtitle, meta)
  values
    (v_uid, v_from.id, 'conversion', -p_amount, upper(p_from), 'Converted',
     upper(p_from) || ' → ' || upper(p_to),
     jsonb_build_object('to_amount', v_to_amount, 'to_currency', upper(p_to), 'rate', v_rate)),
    (v_uid, v_to.id, 'conversion', v_to_amount, upper(p_to), 'Converted',
     upper(p_from) || ' → ' || upper(p_to),
     jsonb_build_object('from_amount', p_amount, 'from_currency', upper(p_from), 'rate', v_rate));

  return jsonb_build_object(
    'from_currency', upper(p_from),
    'to_currency', upper(p_to),
    'from_amount', p_amount,
    'to_amount', v_to_amount,
    'rate', v_rate
  );
end;
$$;

create or replace function public.transfer_p2p(
  p_to_handle text,
  p_currency text,
  p_amount numeric,
  p_note text default ''
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_to public.profiles;
  v_from_wallet public.wallets;
  v_to_wallet public.wallets;
  v_transfer public.transfers;
  v_ref text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  select * into v_to
  from public.profiles
  where handle = lower(trim(both '@' from p_to_handle));

  if v_to is null then raise exception 'User not found'; end if;
  if v_to.id = v_uid then raise exception 'Cannot send to yourself'; end if;

  select * into v_from_wallet
  from public.wallets
  where user_id = v_uid and currency = upper(p_currency)
  for update;

  if v_from_wallet is null or v_from_wallet.balance < p_amount then
    raise exception 'Insufficient funds';
  end if;

  insert into public.wallets (user_id, currency, balance, account_number)
  values (v_to.id, upper(p_currency), 0, public.niro_account_number(upper(p_currency)))
  on conflict (user_id, currency) do nothing;

  select * into v_to_wallet
  from public.wallets
  where user_id = v_to.id and currency = upper(p_currency)
  for update;

  update public.wallets set balance = balance - p_amount where id = v_from_wallet.id;
  update public.wallets set balance = balance + p_amount where id = v_to_wallet.id;

  v_ref := public.niro_reference('NRO');

  insert into public.transfers (from_user_id, to_user_id, currency, amount, note, reference)
  values (v_uid, v_to.id, upper(p_currency), p_amount, coalesce(p_note, ''), v_ref)
  returning * into v_transfer;

  insert into public.ledger_entries (
    user_id, counterparty_id, wallet_id, transfer_id, type, amount, currency, title, subtitle, meta
  ) values
    (v_uid, v_to.id, v_from_wallet.id, v_transfer.id, 'transfer_out', -p_amount, upper(p_currency),
     'Sent to @' || v_to.handle, coalesce(p_note, ''),
     jsonb_build_object('reference', v_ref, 'to_handle', v_to.handle)),
    (v_to.id, v_uid, v_to_wallet.id, v_transfer.id, 'transfer_in', p_amount, upper(p_currency),
     'Received', 'From transfer',
     jsonb_build_object('reference', v_ref));

  insert into public.contacts (owner_id, contact_user_id)
  values (v_uid, v_to.id)
  on conflict do nothing;

  return v_transfer;
end;
$$;

create or replace function public.create_virtual_card(
  p_wallet_id uuid,
  p_daily_limit numeric default 1000,
  p_monthly_limit numeric default 5000
)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_profile public.profiles;
  v_card public.cards;
  v_num text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_wallet from public.wallets where id = p_wallet_id and user_id = v_uid;
  if v_wallet is null then raise exception 'Wallet not found'; end if;
  select * into v_profile from public.profiles where id = v_uid;

  v_num := '4' || lpad((floor(random() * 1e15))::bigint::text, 15, '0');

  insert into public.cards (
    user_id, wallet_id, cardholder_name, last4, full_number, expiry, cvv,
    spend_limit_daily, spend_limit_monthly
  ) values (
    v_uid,
    v_wallet.id,
    v_profile.full_name,
    right(v_num, 4),
    v_num,
    lpad(((extract(month from now())::int % 12) + 1)::text, 2, '0') || '/' ||
      right(((extract(year from now())::int + 4)::text), 2),
    lpad((floor(random() * 1000))::int::text, 3, '0'),
    coalesce(p_daily_limit, 1000),
    coalesce(p_monthly_limit, 5000)
  ) returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.set_card_status(p_card_id uuid, p_status text)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card public.cards;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_status not in ('active', 'frozen', 'cancelled') then
    raise exception 'Invalid status';
  end if;

  update public.cards
  set status = p_status
  where id = p_card_id and user_id = v_uid
  returning * into v_card;

  if v_card is null then raise exception 'Card not found'; end if;
  return v_card;
end;
$$;

create or replace function public.update_card_limits(
  p_card_id uuid,
  p_daily numeric,
  p_monthly numeric
)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card public.cards;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  update public.cards
  set
    spend_limit_daily = greatest(p_daily, 0),
    spend_limit_monthly = greatest(p_monthly, 0)
  where id = p_card_id and user_id = v_uid
  returning * into v_card;

  if v_card is null then raise exception 'Card not found'; end if;
  return v_card;
end;
$$;

create or replace function public.simulate_card_spend(
  p_card_id uuid,
  p_amount numeric,
  p_merchant text default 'Demo Merchant'
)
returns public.ledger_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card public.cards;
  v_wallet public.wallets;
  v_entry public.ledger_entries;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  select * into v_card from public.cards where id = p_card_id and user_id = v_uid for update;
  if v_card is null then raise exception 'Card not found'; end if;
  if v_card.status <> 'active' then raise exception 'Card is not active'; end if;
  if v_card.spent_today + p_amount > v_card.spend_limit_daily then
    raise exception 'Daily spend limit exceeded';
  end if;
  if v_card.spent_month + p_amount > v_card.spend_limit_monthly then
    raise exception 'Monthly spend limit exceeded';
  end if;

  select * into v_wallet from public.wallets where id = v_card.wallet_id for update;
  if v_wallet.balance < p_amount then raise exception 'Insufficient funds'; end if;

  update public.wallets set balance = balance - p_amount where id = v_wallet.id;
  update public.cards
  set spent_today = spent_today + p_amount,
      spent_month = spent_month + p_amount
  where id = v_card.id;

  insert into public.ledger_entries (user_id, wallet_id, type, amount, currency, title, subtitle, meta)
  values (
    v_uid, v_wallet.id, 'card', -p_amount, v_wallet.currency,
    p_merchant, 'Card ···' || v_card.last4,
    jsonb_build_object('card_id', v_card.id)
  ) returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.crypto_buy(
  p_asset text,
  p_fiat_amount numeric,
  p_quote_price numeric,
  p_quoted_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_qty numeric;
  v_asset text := upper(p_asset);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_fiat_amount is null or p_fiat_amount <= 0 then raise exception 'Invalid amount'; end if;
  if p_quote_price is null or p_quote_price <= 0 then raise exception 'Invalid quote'; end if;
  if p_quoted_at < now() - interval '60 seconds' then raise exception 'Quote expired'; end if;
  if v_asset not in ('BTC', 'ETH', 'SOL', 'USDC') then raise exception 'Unsupported asset'; end if;

  select * into v_wallet from public.wallets
  where user_id = v_uid and currency = 'USD' for update;
  if v_wallet is null or v_wallet.balance < p_fiat_amount then
    raise exception 'Insufficient USD balance';
  end if;

  v_qty := p_fiat_amount / p_quote_price;

  update public.wallets set balance = balance - p_fiat_amount where id = v_wallet.id;

  insert into public.crypto_holdings (user_id, asset, quantity)
  values (v_uid, v_asset, v_qty)
  on conflict (user_id, asset)
  do update set quantity = public.crypto_holdings.quantity + excluded.quantity;

  insert into public.crypto_trades (user_id, asset, side, quantity, price_usd, fiat_amount, fiat_currency)
  values (v_uid, v_asset, 'buy', v_qty, p_quote_price, p_fiat_amount, 'USD');

  insert into public.ledger_entries (user_id, wallet_id, type, amount, currency, title, subtitle, meta)
  values (
    v_uid, v_wallet.id, 'crypto_buy', -p_fiat_amount, 'USD',
    'Bought ' || v_asset, 'Demo trade @ $' || p_quote_price::text,
    jsonb_build_object('asset', v_asset, 'quantity', v_qty, 'price', p_quote_price)
  );

  return jsonb_build_object('asset', v_asset, 'quantity', v_qty, 'fiat_amount', p_fiat_amount, 'price', p_quote_price);
end;
$$;

create or replace function public.crypto_sell(
  p_asset text,
  p_quantity numeric,
  p_quote_price numeric,
  p_quoted_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_wallet public.wallets;
  v_holding public.crypto_holdings;
  v_fiat numeric;
  v_asset text := upper(p_asset);
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'Invalid quantity'; end if;
  if p_quote_price is null or p_quote_price <= 0 then raise exception 'Invalid quote'; end if;
  if p_quoted_at < now() - interval '60 seconds' then raise exception 'Quote expired'; end if;

  select * into v_holding from public.crypto_holdings
  where user_id = v_uid and asset = v_asset for update;
  if v_holding is null or v_holding.quantity < p_quantity then
    raise exception 'Insufficient crypto balance';
  end if;

  insert into public.wallets (user_id, currency, balance, account_number)
  values (v_uid, 'USD', 0, public.niro_account_number('USD'))
  on conflict (user_id, currency) do nothing;

  select * into v_wallet from public.wallets
  where user_id = v_uid and currency = 'USD' for update;

  v_fiat := round(p_quantity * p_quote_price, 2);

  update public.crypto_holdings set quantity = quantity - p_quantity where id = v_holding.id;
  update public.wallets set balance = balance + v_fiat where id = v_wallet.id;

  insert into public.crypto_trades (user_id, asset, side, quantity, price_usd, fiat_amount, fiat_currency)
  values (v_uid, v_asset, 'sell', p_quantity, p_quote_price, v_fiat, 'USD');

  insert into public.ledger_entries (user_id, wallet_id, type, amount, currency, title, subtitle, meta)
  values (
    v_uid, v_wallet.id, 'crypto_sell', v_fiat, 'USD',
    'Sold ' || v_asset, 'Demo trade @ $' || p_quote_price::text,
    jsonb_build_object('asset', v_asset, 'quantity', p_quantity, 'price', p_quote_price)
  );

  return jsonb_build_object('asset', v_asset, 'quantity', p_quantity, 'fiat_amount', v_fiat, 'price', p_quote_price);
end;
$$;

create or replace function public.search_profiles(p_query text)
returns table (
  id uuid,
  handle text,
  full_name text,
  avatar_initials text
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.handle, p.full_name, p.avatar_initials
  from public.profiles p
  where p.id <> auth.uid()
    and (
      p.handle ilike '%' || lower(trim(both '@' from p_query)) || '%'
      or p.email ilike '%' || lower(p_query) || '%'
      or p.full_name ilike '%' || p_query || '%'
    )
  order by p.handle
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.fx_rates enable row level security;
alter table public.transfers enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.contacts enable row level security;
alter table public.cards enable row level security;
alter table public.crypto_holdings enable row level security;
alter table public.crypto_trades enable row level security;

-- Profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Wallets: read own only; no direct writes
drop policy if exists wallets_select_own on public.wallets;
create policy wallets_select_own on public.wallets
  for select to authenticated using (user_id = auth.uid());

-- FX readable by all authenticated
drop policy if exists fx_rates_select on public.fx_rates;
create policy fx_rates_select on public.fx_rates
  for select to authenticated using (true);

-- Transfers: participants can read
drop policy if exists transfers_select_own on public.transfers;
create policy transfers_select_own on public.transfers
  for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid());

-- Ledger
drop policy if exists ledger_select_own on public.ledger_entries;
create policy ledger_select_own on public.ledger_entries
  for select to authenticated using (user_id = auth.uid());

-- Contacts
drop policy if exists contacts_select_own on public.contacts;
create policy contacts_select_own on public.contacts
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists contacts_insert_own on public.contacts;
create policy contacts_insert_own on public.contacts
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists contacts_delete_own on public.contacts;
create policy contacts_delete_own on public.contacts
  for delete to authenticated using (owner_id = auth.uid());

-- Cards
drop policy if exists cards_select_own on public.cards;
create policy cards_select_own on public.cards
  for select to authenticated using (user_id = auth.uid());

-- Crypto
drop policy if exists holdings_select_own on public.crypto_holdings;
create policy holdings_select_own on public.crypto_holdings
  for select to authenticated using (user_id = auth.uid());

drop policy if exists trades_select_own on public.crypto_trades;
create policy trades_select_own on public.crypto_trades
  for select to authenticated using (user_id = auth.uid());

-- Grant execute on RPCs
grant execute on function public.topup_wallet(text, numeric) to authenticated;
grant execute on function public.convert_fiat(text, text, numeric) to authenticated;
grant execute on function public.transfer_p2p(text, text, numeric, text) to authenticated;
grant execute on function public.create_virtual_card(uuid, numeric, numeric) to authenticated;
grant execute on function public.set_card_status(uuid, text) to authenticated;
grant execute on function public.update_card_limits(uuid, numeric, numeric) to authenticated;
grant execute on function public.simulate_card_spend(uuid, numeric, text) to authenticated;
grant execute on function public.crypto_buy(text, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.crypto_sell(text, numeric, numeric, timestamptz) to authenticated;
grant execute on function public.search_profiles(text) to authenticated;

-- Realtime
alter publication supabase_realtime add table public.wallets;
alter publication supabase_realtime add table public.ledger_entries;
