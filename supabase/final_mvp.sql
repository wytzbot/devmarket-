-- DevMarket final MVP additions
-- (Fixed: previously referenced a non-existent public.users table.
-- The app's single user table is public.profiles, created in schema.sql.
-- Run schema.sql first, then this file.)

create table if not exists public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, token)
);
create index if not exists notification_tokens_user_idx on public.notification_tokens(user_id);
alter table public.notification_tokens enable row level security;
drop policy if exists notification_tokens_self_all on public.notification_tokens;
create policy notification_tokens_self_all on public.notification_tokens
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- (public.notifications is already created by schema.sql with the correct
-- public.profiles foreign key; not recreated here.)

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'open',
  admin_notes text,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists reports_reporter_read on public.reports;
create policy reports_reporter_read on public.reports
for select using (reporter_id = auth.uid());
