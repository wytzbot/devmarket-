
-- DevMarket database foundation
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key,
  firebase_uid text unique,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'buyer' check (role in ('buyer','developer','admin')),
  github_username text,
  github_connected boolean not null default false,
  verified boolean not null default false,
  paystack_subaccount text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  developer_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  slug text unique not null,
  description text,
  category text,
  technologies text[] not null default '{}',
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'NGN',
  license_type text not null default 'Commercial Use',
  demo_url text,
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','suspended')),
  source_type text not null default 'upload' check (source_type in ('upload','github')),
  source_path text,
  scan_status text not null default 'pending' check (scan_status in ('pending','clean','infected','failed')),
  scan_hash text,
  version text not null default '1.0.0',
  changelog text,
  requirements text,
  installation text,
  sales_count integer not null default 0,
  rating numeric(3,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_firebase_uid_idx on public.profiles(firebase_uid);

create index if not exists products_developer_idx on public.products(developer_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_slug_idx on public.products(slug);

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text not null,
  storage_path text not null,
  sha256 text,
  size_bytes bigint,
  scan_status text not null default 'pending',
  scan_report jsonb,
  scanned_at timestamptz,
  changelog text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  developer_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  payment_provider text not null,
  payment_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists orders_provider_payment_unique
on public.orders(payment_provider, payment_id)
where payment_id is not null;

create index if not exists orders_buyer_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_developer_idx on public.orders(developer_id, created_at desc);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  developer_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid unique not null references public.orders(id) on delete restrict,
  license_type text not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  version text not null,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

-- Note: push tokens live in public.notification_tokens (see final_mvp.sql).

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text,
  payload_hash text,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique(provider,event_id)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.licenses enable row level security;
alter table public.downloads enable row level security;
alter table public.notifications enable row level security;
alter table public.webhook_events enable row level security;

-- Public marketplace reads only published products.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
for select using (status = 'published');

-- Developers can manage their own products.
drop policy if exists products_owner_all on public.products;
create policy products_owner_all on public.products
for all using (developer_id = auth.uid()) with check (developer_id = auth.uid());

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
for select using (true);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists orders_buyer_read on public.orders;
create policy orders_buyer_read on public.orders for select using (buyer_id = auth.uid());

drop policy if exists orders_developer_read on public.orders;
create policy orders_developer_read on public.orders for select using (developer_id = auth.uid());

drop policy if exists licenses_owner_read on public.licenses;
create policy licenses_owner_read on public.licenses
for select using (buyer_id = auth.uid() or developer_id = auth.uid());

drop policy if exists downloads_owner_read on public.downloads;
create policy downloads_owner_read on public.downloads
for select using (buyer_id = auth.uid());

drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications
for select using (user_id = auth.uid());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Writes that must be trusted (orders, licenses, webhook events) should be performed
-- by the server using the service role, never by the browser.
