-- Profiles: app-domain user data, kept separate from `auth.users` so we
-- never reach into the auth schema and so the app can iterate on its own
-- columns without coupling to Supabase's auth contract. One row per
-- auth.users row, kept in sync via a trigger.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.tg_set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth.users row is inserted.
-- `security definer` lets the trigger bypass RLS for the insert (the new
-- user has no session at the moment auth.users gets the row).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for any users who already exist (idempotent).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
