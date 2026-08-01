-- Wise schema: profiles, virtual cards, transactions (incl. custom vendor txns)
-- Paste into Supabase SQL Editor and run once.
-- Requires Auth (email) enabled. Optional: disable "Confirm email" for demos.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
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

  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_name)
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Virtual cards
-- ---------------------------------------------------------------------------
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cardholder_name text not null,
  last4 text not null,
  full_number text not null,
  expiry text not null,
  cvv text not null,
  network text not null default 'visa'
    check (network in ('visa', 'mastercard', 'amex', 'discover')),
  status text not null default 'active'
    check (status in ('active', 'frozen', 'cancelled')),
  spending_limit numeric(18, 2) not null default 2500 check (spending_limit >= 0),
  spending_used numeric(18, 2) not null default 0 check (spending_used >= 0),
  online_payments boolean not null default true,
  contactless boolean not null default true,
  foreign_transactions boolean not null default true,
  nickname text not null default '',
  color text not null default '#163300',
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on public.cards (user_id, created_at desc);

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Transactions (all activity, including custom vendor entries)
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  type text not null
    check (type in (
      'transfer', 'conversion', 'card', 'deposit', 'withdrawal',
      'fee', 'custom', 'purchase', 'income', 'refund'
    )),
  status text not null default 'completed'
    check (status in ('completed', 'pending', 'failed', 'refunded')),
  title text not null,
  subtitle text not null default '',
  amount numeric(18, 8) not null,
  currency text not null,
  converted_amount numeric(18, 8),
  converted_currency text,
  fee numeric(18, 8) not null default 0,
  fee_currency text not null default 'USD',
  exchange_rate numeric(18, 8),
  reference text not null,
  merchant_or_recipient text not null default '',
  vendor_name text,
  vendor_logo_url text,
  icon text,
  is_custom boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, reference)
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

create index if not exists transactions_user_type_idx
  on public.transactions (user_id, type, occurred_at desc);

create index if not exists transactions_vendor_idx
  on public.transactions (user_id, vendor_name)
  where vendor_name is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.wise_reference(prefix text default 'WISE')
returns text
language sql
volatile
as $$
  select prefix || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.wise_generate_card_number(p_network text)
returns text
language plpgsql
as $$
declare
  v_network text := lower(coalesce(p_network, 'visa'));
begin
  return case v_network
    when 'mastercard' then '5' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
    when 'amex' then '3' || lpad((floor(random() * 1e14))::bigint::text, 14, '0')
    when 'discover' then '6' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
    else '4' || lpad((floor(random() * 1e15))::bigint::text, 15, '0')
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: cards
-- ---------------------------------------------------------------------------
create or replace function public.create_random_card(
  p_cardholder_name text default null,
  p_network text default 'visa',
  p_nickname text default '',
  p_color text default '#163300',
  p_spending_limit numeric default 2500
)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_card public.cards;
  v_network text := lower(coalesce(p_network, 'visa'));
  v_num text;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_network not in ('visa', 'mastercard', 'amex', 'discover') then
    raise exception 'Invalid network';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  v_name := coalesce(
    nullif(trim(p_cardholder_name), ''),
    nullif(trim(v_profile.full_name), ''),
    'Wise User'
  );
  v_num := public.wise_generate_card_number(v_network);

  insert into public.cards (
    user_id, cardholder_name, last4, full_number, expiry, cvv, network,
    spending_limit, nickname, color, is_custom
  ) values (
    v_uid,
    v_name,
    right(v_num, 4),
    v_num,
    lpad(((extract(month from now())::int % 12) + 1)::text, 2, '0') || '/' ||
      right(((extract(year from now())::int + 4)::text), 2),
    case when v_network = 'amex'
      then lpad((floor(random() * 10000))::int::text, 4, '0')
      else lpad((floor(random() * 1000))::int::text, 3, '0')
    end,
    v_network,
    coalesce(p_spending_limit, 2500),
    coalesce(trim(p_nickname), ''),
    coalesce(nullif(trim(p_color), ''), '#163300'),
    false
  ) returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.create_custom_card(
  p_cardholder_name text,
  p_network text default 'visa',
  p_full_number text default null,
  p_expiry text default null,
  p_cvv text default null,
  p_nickname text default '',
  p_color text default '#163300',
  p_spending_limit numeric default 2500
)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_card public.cards;
  v_network text := lower(coalesce(p_network, 'visa'));
  v_num text;
  v_expiry text;
  v_cvv text;
  v_name text;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_network not in ('visa', 'mastercard', 'amex', 'discover') then
    raise exception 'Invalid network';
  end if;

  v_name := trim(coalesce(p_cardholder_name, ''));
  if length(v_name) < 2 then raise exception 'Cardholder name is required'; end if;

  if p_full_number is null or trim(p_full_number) = '' then
    v_num := public.wise_generate_card_number(v_network);
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
    elsif v_cvv !~ '^[0-9]{3}$' then
      raise exception 'CVV must be 3 digits';
    end if;
  end if;

  insert into public.cards (
    user_id, cardholder_name, last4, full_number, expiry, cvv, network,
    spending_limit, nickname, color, is_custom
  ) values (
    v_uid,
    v_name,
    right(v_num, 4),
    v_num,
    v_expiry,
    v_cvv,
    v_network,
    coalesce(p_spending_limit, 2500),
    coalesce(trim(p_nickname), ''),
    coalesce(nullif(trim(p_color), ''), '#163300'),
    true
  ) returning * into v_card;

  return v_card;
end;
$$;

create or replace function public.set_card_frozen(p_card_id uuid, p_frozen boolean)
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
  set status = case when p_frozen then 'frozen' else 'active' end
  where id = p_card_id and user_id = v_uid and status <> 'cancelled'
  returning * into v_card;

  if v_card is null then raise exception 'Card not found'; end if;
  return v_card;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs: transactions
-- ---------------------------------------------------------------------------
create or replace function public.upsert_transaction(
  p_id uuid default null,
  p_type text default 'custom',
  p_status text default 'completed',
  p_title text default '',
  p_subtitle text default '',
  p_amount numeric default 0,
  p_currency text default 'USD',
  p_converted_amount numeric default null,
  p_converted_currency text default null,
  p_fee numeric default 0,
  p_fee_currency text default null,
  p_exchange_rate numeric default null,
  p_reference text default null,
  p_merchant_or_recipient text default '',
  p_vendor_name text default null,
  p_vendor_logo_url text default null,
  p_icon text default null,
  p_is_custom boolean default false,
  p_card_id uuid default null,
  p_meta jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.transactions;
  v_ref text;
  v_type text := lower(trim(coalesce(p_type, 'custom')));
  v_status text := lower(trim(coalesce(p_status, 'completed')));
  v_title text := trim(coalesce(p_title, ''));
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if v_type not in (
    'transfer', 'conversion', 'card', 'deposit', 'withdrawal',
    'fee', 'custom', 'purchase', 'income', 'refund'
  ) then
    raise exception 'Invalid transaction type';
  end if;
  if v_status not in ('completed', 'pending', 'failed', 'refunded') then
    raise exception 'Invalid status';
  end if;
  if v_title = '' then
    v_title := coalesce(nullif(trim(p_vendor_name), ''), 'Transaction');
  end if;

  v_ref := coalesce(nullif(trim(p_reference), ''), public.wise_reference('WISE'));

  if p_card_id is not null and not exists (
    select 1 from public.cards c where c.id = p_card_id and c.user_id = v_uid
  ) then
    raise exception 'Card not found';
  end if;

  insert into public.transactions (
    id, user_id, card_id, type, status, title, subtitle, amount, currency,
    converted_amount, converted_currency, fee, fee_currency, exchange_rate,
    reference, merchant_or_recipient, vendor_name, vendor_logo_url, icon,
    is_custom, meta, occurred_at
  ) values (
    coalesce(p_id, gen_random_uuid()),
    v_uid,
    p_card_id,
    v_type,
    v_status,
    v_title,
    coalesce(p_subtitle, ''),
    p_amount,
    upper(p_currency),
    p_converted_amount,
    case when p_converted_currency is null then null else upper(p_converted_currency) end,
    coalesce(p_fee, 0),
    upper(coalesce(p_fee_currency, p_currency)),
    p_exchange_rate,
    v_ref,
    coalesce(nullif(trim(p_merchant_or_recipient), ''), v_title),
    nullif(trim(p_vendor_name), ''),
    nullif(trim(p_vendor_logo_url), ''),
    nullif(trim(coalesce(p_icon, p_vendor_logo_url)), ''),
    coalesce(p_is_custom, v_type in ('custom', 'purchase', 'income')),
    coalesce(p_meta, '{}'::jsonb),
    coalesce(p_occurred_at, now())
  )
  on conflict (user_id, reference) do update set
    type = excluded.type,
    status = excluded.status,
    title = excluded.title,
    subtitle = excluded.subtitle,
    amount = excluded.amount,
    currency = excluded.currency,
    converted_amount = excluded.converted_amount,
    converted_currency = excluded.converted_currency,
    fee = excluded.fee,
    fee_currency = excluded.fee_currency,
    exchange_rate = excluded.exchange_rate,
    merchant_or_recipient = excluded.merchant_or_recipient,
    vendor_name = excluded.vendor_name,
    vendor_logo_url = excluded.vendor_logo_url,
    icon = excluded.icon,
    is_custom = excluded.is_custom,
    card_id = excluded.card_id,
    meta = excluded.meta,
    occurred_at = excluded.occurred_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.create_custom_transaction(
  p_amount numeric,
  p_currency text,
  p_vendor_name text,
  p_direction text default 'debit',
  p_vendor_logo_url text default null,
  p_title text default null,
  p_subtitle text default null,
  p_type text default 'custom',
  p_status text default 'completed',
  p_card_id uuid default null,
  p_affect_balance_note boolean default true,
  p_occurred_at timestamptz default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_direction text := lower(trim(coalesce(p_direction, 'debit')));
  v_signed numeric;
  v_vendor text := trim(coalesce(p_vendor_name, ''));
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  if v_vendor = '' then raise exception 'Vendor name is required'; end if;
  if v_direction not in ('debit', 'credit') then
    raise exception 'Direction must be debit or credit';
  end if;

  v_signed := case when v_direction = 'debit' then -abs(p_amount) else abs(p_amount) end;

  return public.upsert_transaction(
    null,
    coalesce(nullif(trim(p_type), ''), 'custom'),
    coalesce(p_status, 'completed'),
    coalesce(nullif(trim(p_title), ''), v_vendor),
    coalesce(
      nullif(trim(p_subtitle), ''),
      case when v_direction = 'debit' then 'Custom purchase' else 'Custom credit' end
    ),
    v_signed,
    upper(p_currency),
    null,
    null,
    0,
    upper(p_currency),
    null,
    public.wise_reference('CTX'),
    v_vendor,
    v_vendor,
    p_vendor_logo_url,
    p_vendor_logo_url,
    true,
    p_card_id,
    jsonb_build_object(
      'custom', true,
      'direction', v_direction,
      'affect_balance_note', coalesce(p_affect_balance_note, true)
    ),
    p_occurred_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists cards_select_own on public.cards;
create policy cards_select_own on public.cards
  for select to authenticated using (user_id = auth.uid());

drop policy if exists cards_update_own on public.cards;
create policy cards_update_own on public.cards
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated using (user_id = auth.uid());

-- Mutations go through security definer RPCs; still allow direct insert for sync clients
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: vendor logos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
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
grant execute on function public.create_random_card(text, text, text, text, numeric) to authenticated;
grant execute on function public.create_custom_card(text, text, text, text, text, text, text, numeric) to authenticated;
grant execute on function public.set_card_frozen(uuid, boolean) to authenticated;
grant execute on function public.upsert_transaction(
  uuid, text, text, text, text, numeric, text, numeric, text, numeric, text,
  numeric, text, text, text, text, text, boolean, uuid, jsonb, timestamptz
) to authenticated;
grant execute on function public.create_custom_transaction(
  numeric, text, text, text, text, text, text, text, text, uuid, boolean, timestamptz
) to authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.cards;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.transactions;
  exception when duplicate_object then null;
  end;
end;
$$;
