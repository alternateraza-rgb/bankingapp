-- Niro feature migration: auth/profile onboarding, custom cards, custom transactions
-- Depends on: 20260722000000_niro_core.sql
--
-- Covers:
--   1. Auth signup bootstrap enhancements (profile fields + onboarding flags)
--   2. Full onboarding profile data + complete_onboarding RPC
--   3. Random + custom virtual cards
--   4. Custom transactions (amount, vendor name, vendor logo) → ledger (+ optional wallet)
--   5. User settings, storage buckets, updated_at helpers, tighter constraints

-- ---------------------------------------------------------------------------
-- Helpers: updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1–2. Profiles: onboarding + richer identity
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists phone text,
  add column if not exists country_code text not null default 'US',
  add column if not exists date_of_birth date,
  add column if not exists avatar_url text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step text not null default 'profile',
  add column if not exists passcode_enabled boolean not null default false,
  add column if not exists biometric_enabled boolean not null default false,
  add column if not exists two_factor_enabled boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_onboarding_step_check;

alter table public.profiles
  add constraint profiles_onboarding_step_check
  check (
    onboarding_step in (
      'profile',
      'contact',
      'preferences',
      'security',
      'done'
    )
  );

alter table public.profiles
  drop constraint if exists profiles_country_code_check;

alter table public.profiles
  add constraint profiles_country_code_check
  check (country_code ~ '^[A-Z]{2}$');

-- Backfill first/last from existing full_name where empty
update public.profiles
set
  first_name = coalesce(nullif(first_name, ''), split_part(trim(full_name), ' ', 1), ''),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), ''),
    ''
  )
where coalesce(first_name, '') = '' or coalesce(last_name, '') = '';

-- Existing users who already have a profile are treated as onboarded
update public.profiles
set
  onboarding_completed = true,
  onboarding_step = 'done'
where onboarding_completed = false
  and created_at < now() - interval '1 second';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- User settings (notifications / appearance / balance privacy)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  hide_balances boolean not null default false,
  appearance text not null default 'system'
    check (appearance in ('system', 'light', 'dark')),
  notify_transfers boolean not null default true,
  notify_rates boolean not null default true,
  notify_security boolean not null default true,
  notify_marketing boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Cards: nickname / styling / custom flag
-- ---------------------------------------------------------------------------
alter table public.cards
  add column if not exists nickname text not null default '',
  add column if not exists color text not null default '#1A1F36',
  add column if not exists is_custom boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.cards
  drop constraint if exists cards_network_check;

alter table public.cards
  add constraint cards_network_check
  check (network in ('visa', 'mastercard', 'amex', 'discover'));

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Ledger: vendor branding + reference + type constraint
-- ---------------------------------------------------------------------------
alter table public.ledger_entries
  add column if not exists vendor_name text,
  add column if not exists vendor_logo_url text,
  add column if not exists reference text,
  add column if not exists card_id uuid references public.cards (id) on delete set null;

create index if not exists ledger_vendor_name_idx
  on public.ledger_entries (user_id, vendor_name)
  where vendor_name is not null;

create index if not exists ledger_type_created_idx
  on public.ledger_entries (user_id, type, created_at desc);

alter table public.ledger_entries
  drop constraint if exists ledger_entries_type_check;

alter table public.ledger_entries
  add constraint ledger_entries_type_check
  check (
    type in (
      'topup',
      'transfer_out',
      'transfer_in',
      'conversion',
      'card',
      'crypto_buy',
      'crypto_sell',
      'custom',
      'deposit',
      'withdrawal',
      'purchase',
      'income',
      'fee',
      'refund'
    )
  );

alter table public.ledger_entries
  drop constraint if exists ledger_entries_status_check;

alter table public.ledger_entries
  add constraint ledger_entries_status_check
  check (status in ('completed', 'pending', 'failed', 'refunded'));

-- ---------------------------------------------------------------------------
-- Signup bootstrap (auth.users → profiles + wallets + settings)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handle text;
  v_first text;
  v_last text;
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

  while exists (select 1 from public.profiles where handle = v_handle) loop
    v_handle := substr(v_handle, 1, 18) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);
  end loop;

  v_first := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(split_part(coalesce(new.raw_user_meta_data->>'full_name', ''), ' ', 1)), ''),
    split_part(new.email, '@', 1)
  );
  v_last := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(
      trim(
        substr(
          trim(coalesce(new.raw_user_meta_data->>'full_name', '')),
          length(split_part(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ' ', 1)) + 1
        )
      ),
      ''
    ),
    ''
  );
  v_name := trim(both ' ' from (v_first || ' ' || v_last));
  if v_name = '' then
    v_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  end if;

  insert into public.profiles (
    id, email, handle, full_name, first_name, last_name, avatar_initials,
    onboarding_completed, onboarding_step
  ) values (
    new.id,
    new.email,
    v_handle,
    v_name,
    v_first,
    v_last,
    public.niro_initials(v_name),
    false,
    'profile'
  );

  insert into public.user_settings (user_id) values (new.id);

  insert into public.wallets (user_id, currency, balance, account_number)
  values
    (new.id, 'USD', 1000.00, public.niro_account_number('USD')),
    (new.id, 'EUR', 250.00, public.niro_account_number('EUR')),
    (new.id, 'GBP', 200.00, public.niro_account_number('GBP'));

  insert into public.ledger_entries (
    user_id, type, amount, currency, title, subtitle, vendor_name, meta, reference
  ) values (
    new.id,
    'topup',
    1000.00,
    'USD',
    'Welcome bonus',
    'Demo funds to explore Niro',
    'Niro',
    jsonb_build_object('sandbox', true),
    public.niro_reference('WEL')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed settings for any profiles missing a row
insert into public.user_settings (user_id)
select p.id from public.profiles p
where not exists (
  select 1 from public.user_settings s where s.user_id = p.id
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Onboarding RPCs
-- ---------------------------------------------------------------------------
create or replace function public.update_onboarding_profile(
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_country_code text default null,
  p_date_of_birth date default null,
  p_avatar_url text default null,
  p_primary_currency text default null,
  p_handle text default null,
  p_onboarding_step text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_handle text;
  v_first text;
  v_last text;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  if v_profile is null then raise exception 'Profile not found'; end if;

  v_first := coalesce(nullif(trim(p_first_name), ''), v_profile.first_name);
  v_last := coalesce(nullif(trim(p_last_name), ''), v_profile.last_name);
  v_name := trim(both ' ' from (v_first || ' ' || v_last));
  if v_name = '' then
    v_name := v_profile.full_name;
  end if;

  if p_handle is not null then
    v_handle := lower(trim(both '@' from p_handle));
    if v_handle !~ '^[a-z0-9_]{3,24}$' then
      raise exception 'Invalid handle';
    end if;
    if exists (
      select 1 from public.profiles
      where handle = v_handle and id <> v_uid
    ) then
      raise exception 'Handle already taken';
    end if;
  else
    v_handle := v_profile.handle;
  end if;

  if p_onboarding_step is not null
     and p_onboarding_step not in ('profile', 'contact', 'preferences', 'security', 'done') then
    raise exception 'Invalid onboarding step';
  end if;

  if p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then
    raise exception 'Invalid country code';
  end if;

  if p_primary_currency is not null
     and not exists (select 1 from public.fx_rates where currency = upper(p_primary_currency)) then
    raise exception 'Unsupported currency';
  end if;

  update public.profiles
  set
    first_name = v_first,
    last_name = v_last,
    full_name = v_name,
    avatar_initials = public.niro_initials(v_name),
    phone = case when p_phone is null then phone else nullif(trim(p_phone), '') end,
    country_code = coalesce(p_country_code, country_code),
    date_of_birth = coalesce(p_date_of_birth, date_of_birth),
    avatar_url = case when p_avatar_url is null then avatar_url else nullif(trim(p_avatar_url), '') end,
    primary_currency = coalesce(upper(p_primary_currency), primary_currency),
    handle = v_handle,
    onboarding_step = coalesce(p_onboarding_step, onboarding_step)
  where id = v_uid
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.complete_onboarding(
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_country_code text default null,
  p_date_of_birth date default null,
  p_avatar_url text default null,
  p_primary_currency text default null,
  p_passcode_enabled boolean default null,
  p_biometric_enabled boolean default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  -- Apply any final profile fields first
  perform public.update_onboarding_profile(
    p_first_name,
    p_last_name,
    p_phone,
    p_country_code,
    p_date_of_birth,
    p_avatar_url,
    p_primary_currency,
    null,
    'done'
  );

  update public.profiles
  set
    onboarding_completed = true,
    onboarding_step = 'done',
    passcode_enabled = coalesce(p_passcode_enabled, passcode_enabled),
    biometric_enabled = coalesce(p_biometric_enabled, biometric_enabled)
  where id = v_uid
  returning * into v_profile;

  if v_profile is null then raise exception 'Profile not found'; end if;
  if coalesce(nullif(trim(v_profile.full_name), ''), '') = '' then
    raise exception 'Name is required to complete onboarding';
  end if;

  return v_profile;
end;
$$;

create or replace function public.upsert_user_settings(
  p_hide_balances boolean default null,
  p_appearance text default null,
  p_notify_transfers boolean default null,
  p_notify_rates boolean default null,
  p_notify_security boolean default null,
  p_notify_marketing boolean default null
)
returns public.user_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_settings public.user_settings;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  if p_appearance is not null and p_appearance not in ('system', 'light', 'dark') then
    raise exception 'Invalid appearance';
  end if;

  insert into public.user_settings (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  update public.user_settings
  set
    hide_balances = coalesce(p_hide_balances, hide_balances),
    appearance = coalesce(p_appearance, appearance),
    notify_transfers = coalesce(p_notify_transfers, notify_transfers),
    notify_rates = coalesce(p_notify_rates, notify_rates),
    notify_security = coalesce(p_notify_security, notify_security),
    notify_marketing = coalesce(p_notify_marketing, notify_marketing)
  where user_id = v_uid
  returning * into v_settings;

  return v_settings;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cards: random (enhanced) + custom
-- ---------------------------------------------------------------------------
-- Drop prior signatures before recreating with extra optional args
drop function if exists public.create_virtual_card(uuid, numeric, numeric);
drop function if exists public.simulate_card_spend(uuid, numeric, text);

create or replace function public.create_virtual_card(
  p_wallet_id uuid,
  p_daily_limit numeric default 1000,
  p_monthly_limit numeric default 5000,
  p_nickname text default '',
  p_color text default '#1A1F36',
  p_network text default 'visa'
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
  v_network text := lower(coalesce(p_network, 'visa'));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_network not in ('visa', 'mastercard', 'amex', 'discover') then
    raise exception 'Invalid network';
  end if;

  select * into v_wallet from public.wallets where id = p_wallet_id and user_id = v_uid;
  if v_wallet is null then raise exception 'Wallet not found'; end if;
  select * into v_profile from public.profiles where id = v_uid;

  -- Generate network-ish BINs for demo cards
  v_num := case v_network
    when 'mastercard' then '5' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
    when 'amex' then '3' || lpad((floor(random() * 1e14))::bigint::text, 14, '0')
    when 'discover' then '6' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
    else '4' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
  end;

  insert into public.cards (
    user_id, wallet_id, cardholder_name, last4, full_number, expiry, cvv,
    network, spend_limit_daily, spend_limit_monthly, nickname, color, is_custom
  ) values (
    v_uid,
    v_wallet.id,
    coalesce(nullif(trim(v_profile.full_name), ''), 'Niro User'),
    right(v_num, 4),
    v_num,
    lpad(((extract(month from now())::int % 12) + 1)::text, 2, '0') || '/' ||
      right(((extract(year from now())::int + 4)::text), 2),
    case when v_network = 'amex'
      then lpad((floor(random() * 10000))::int::text, 4, '0')
      else lpad((floor(random() * 1000))::int::text, 3, '0')
    end,
    v_network,
    coalesce(p_daily_limit, 1000),
    coalesce(p_monthly_limit, 5000),
    coalesce(trim(p_nickname), ''),
    coalesce(nullif(trim(p_color), ''), '#1A1F36'),
    false
  ) returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.create_custom_card(
  p_wallet_id uuid,
  p_cardholder_name text,
  p_network text default 'visa',
  p_full_number text default null,
  p_expiry text default null,
  p_cvv text default null,
  p_nickname text default '',
  p_color text default '#1A1F36',
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
  v_card public.cards;
  v_network text := lower(coalesce(p_network, 'visa'));
  v_num text;
  v_expiry text;
  v_cvv text;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_wallet from public.wallets where id = p_wallet_id and user_id = v_uid;
  if v_wallet is null then raise exception 'Wallet not found'; end if;

  if v_network not in ('visa', 'mastercard', 'amex', 'discover') then
    raise exception 'Invalid network';
  end if;

  v_name := trim(coalesce(p_cardholder_name, ''));
  if length(v_name) < 2 then
    raise exception 'Cardholder name is required';
  end if;

  if p_full_number is null or trim(p_full_number) = '' then
    -- Fall back to random generation when number omitted
    v_num := case v_network
      when 'mastercard' then '5' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
      when 'amex' then '3' || lpad((floor(random() * 1e14))::bigint::text, 14, '0')
      when 'discover' then '6' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
      else '4' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
    end;
  else
    v_num := regexp_replace(p_full_number, '\s+', '', 'g');
    if v_num !~ '^[0-9]{15,16}$' then
      raise exception 'Card number must be 15–16 digits';
    end if;
  end if;

  if p_expiry is null or trim(p_expiry) = '' then
    v_expiry := lpad(((extract(month from now())::int % 12) + 1)::text, 2, '0') || '/' ||
      right(((extract(year from now())::int + 4)::text), 2);
  else
    v_expiry := trim(p_expiry);
    if v_expiry !~ '^(0[1-9]|1[0-2])/[0-9]{2}$' then
      raise exception 'Expiry must be MM/YY';
    end if;
  end if;

  if p_cvv is null or trim(p_cvv) = '' then
    v_cvv := case when v_network = 'amex'
      then lpad((floor(random() * 10000))::int::text, 4, '0')
      else lpad((floor(random() * 1000))::int::text, 3, '0')
    end;
  else
    v_cvv := trim(p_cvv);
    if v_network = 'amex' then
      if v_cvv !~ '^[0-9]{4}$' then raise exception 'Amex CVV must be 4 digits'; end if;
    else
      if v_cvv !~ '^[0-9]{3}$' then raise exception 'CVV must be 3 digits'; end if;
    end if;
  end if;

  insert into public.cards (
    user_id, wallet_id, cardholder_name, last4, full_number, expiry, cvv,
    network, spend_limit_daily, spend_limit_monthly, nickname, color, is_custom
  ) values (
    v_uid,
    v_wallet.id,
    v_name,
    right(v_num, 4),
    v_num,
    v_expiry,
    v_cvv,
    v_network,
    coalesce(p_daily_limit, 1000),
    coalesce(p_monthly_limit, 5000),
    coalesce(trim(p_nickname), ''),
    coalesce(nullif(trim(p_color), ''), '#1A1F36'),
    true
  ) returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.update_card_controls(
  p_card_id uuid,
  p_online_payments boolean default null,
  p_contactless boolean default null,
  p_foreign_transactions boolean default null,
  p_nickname text default null,
  p_color text default null
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
    online_payments = coalesce(p_online_payments, online_payments),
    contactless = coalesce(p_contactless, contactless),
    foreign_transactions = coalesce(p_foreign_transactions, foreign_transactions),
    nickname = coalesce(p_nickname, nickname),
    color = coalesce(nullif(trim(p_color), ''), color)
  where id = p_card_id and user_id = v_uid
  returning * into v_card;

  if v_card is null then raise exception 'Card not found'; end if;
  return v_card;
end;
$$;

-- Keep simulate_card_spend aligned with new ledger columns
create or replace function public.simulate_card_spend(
  p_card_id uuid,
  p_amount numeric,
  p_merchant text default 'Demo Merchant',
  p_vendor_logo_url text default null
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
  v_ref text;
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

  v_ref := public.niro_reference('CRD');

  insert into public.ledger_entries (
    user_id, wallet_id, card_id, type, amount, currency, title, subtitle,
    vendor_name, vendor_logo_url, reference, meta
  ) values (
    v_uid,
    v_wallet.id,
    v_card.id,
    'card',
    -p_amount,
    v_wallet.currency,
    coalesce(nullif(trim(p_merchant), ''), 'Card purchase'),
    'Card ···' || v_card.last4,
    coalesce(nullif(trim(p_merchant), ''), 'Merchant'),
    nullif(trim(p_vendor_logo_url), ''),
    v_ref,
    jsonb_build_object('card_id', v_card.id, 'sandbox', true)
  ) returning * into v_entry;

  return v_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- Custom transactions
-- ---------------------------------------------------------------------------
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
  v_direction text := lower(trim(p_direction));
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
  if p_amount > 1000000 then raise exception 'Amount too large'; end if;
  if v_vendor = '' or length(v_vendor) > 120 then
    raise exception 'Vendor name is required (max 120 chars)';
  end if;
  if v_direction not in ('debit', 'credit') then
    raise exception 'Direction must be debit or credit';
  end if;
  if v_type not in ('custom', 'deposit', 'withdrawal', 'purchase', 'income', 'fee', 'refund', 'card') then
    raise exception 'Invalid custom transaction type';
  end if;
  if v_status not in ('completed', 'pending', 'failed', 'refunded') then
    raise exception 'Invalid status';
  end if;
  if not exists (select 1 from public.fx_rates where currency = v_currency) then
    raise exception 'Unsupported currency';
  end if;

  if p_wallet_id is not null then
    select * into v_wallet
    from public.wallets
    where id = p_wallet_id and user_id = v_uid
    for update;
    if v_wallet is null then raise exception 'Wallet not found'; end if;
    if v_wallet.currency <> v_currency then
      raise exception 'Wallet currency mismatch';
    end if;
  else
    insert into public.wallets (user_id, currency, balance, account_number)
    values (v_uid, v_currency, 0, public.niro_account_number(v_currency))
    on conflict (user_id, currency) do nothing;

    select * into v_wallet
    from public.wallets
    where user_id = v_uid and currency = v_currency
    for update;
  end if;

  if p_card_id is not null then
    select * into v_card from public.cards where id = p_card_id and user_id = v_uid;
    if not found then raise exception 'Card not found'; end if;
  end if;

  v_signed := case when v_direction = 'debit' then -p_amount else p_amount end;
  v_ref := public.niro_reference('CTX');
  v_title := coalesce(nullif(trim(p_title), ''), v_vendor);
  v_subtitle := coalesce(
    nullif(trim(p_subtitle), ''),
    case
      when v_direction = 'debit' then 'Custom purchase'
      else 'Custom credit'
    end
  );

  -- Only mutate balances for completed money-moving rows
  if p_affect_balance and v_status = 'completed' then
    if v_direction = 'debit' then
      if v_wallet.balance < p_amount then
        raise exception 'Insufficient funds';
      end if;
      update public.wallets
      set balance = balance - p_amount
      where id = v_wallet.id;
    else
      update public.wallets
      set balance = balance + p_amount
      where id = v_wallet.id;
    end if;
  end if;

  insert into public.ledger_entries (
    user_id,
    wallet_id,
    card_id,
    type,
    status,
    amount,
    currency,
    title,
    subtitle,
    vendor_name,
    vendor_logo_url,
    reference,
    meta,
    created_at
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
      'affect_balance', p_affect_balance
    ),
    coalesce(p_occurred_at, now())
  ) returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.delete_custom_transaction(p_entry_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_entry public.ledger_entries;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_entry
  from public.ledger_entries
  where id = p_entry_id and user_id = v_uid
  for update;

  if v_entry is null then raise exception 'Transaction not found'; end if;
  if coalesce((v_entry.meta->>'custom')::boolean, false) is not true then
    raise exception 'Only custom transactions can be deleted';
  end if;

  -- Reverse completed balance impact when the original write affected the wallet
  if coalesce((v_entry.meta->>'affect_balance')::boolean, true)
     and v_entry.status = 'completed'
     and v_entry.wallet_id is not null then
    update public.wallets
    set balance = balance - v_entry.amount
    where id = v_entry.wallet_id and user_id = v_uid;
  end if;

  delete from public.ledger_entries where id = v_entry.id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: avatars + vendor logos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'avatars',
    'avatars',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'vendor-logos',
    'vendor-logos',
    true,
    2097152,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Avatars: users manage files under their own folder {uid}/...
drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects
  for select to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Vendor logos: same ownership model
drop policy if exists vendor_logos_select_public on storage.objects;
create policy vendor_logos_select_public on storage.objects
  for select to public
  using (bucket_id = 'vendor-logos');

drop policy if exists vendor_logos_insert_own on storage.objects;
create policy vendor_logos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists vendor_logos_update_own on storage.objects;
create policy vendor_logos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists vendor_logos_delete_own on storage.objects;
create policy vendor_logos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vendor-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.update_onboarding_profile(
  text, text, text, text, date, text, text, text, text
) to authenticated;

grant execute on function public.complete_onboarding(
  text, text, text, text, date, text, text, boolean, boolean
) to authenticated;

grant execute on function public.upsert_user_settings(
  boolean, text, boolean, boolean, boolean, boolean
) to authenticated;

-- Recreate grants for replaced card RPCs (signature changed)
grant execute on function public.create_virtual_card(
  uuid, numeric, numeric, text, text, text
) to authenticated;

grant execute on function public.create_custom_card(
  uuid, text, text, text, text, text, text, text, numeric, numeric
) to authenticated;

grant execute on function public.update_card_controls(
  uuid, boolean, boolean, boolean, text, text
) to authenticated;

grant execute on function public.simulate_card_spend(
  uuid, numeric, text, text
) to authenticated;

grant execute on function public.create_custom_transaction(
  numeric, text, text, text, text, text, text, text, text, boolean, uuid, uuid, jsonb, timestamptz
) to authenticated;

grant execute on function public.delete_custom_transaction(uuid) to authenticated;

-- Realtime for profile / settings / cards (optional UI sync)
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.user_settings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.cards;
  exception when duplicate_object then null;
  end;
end;
$$;
