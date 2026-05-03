-- Conversations: one row per uploaded sales-call recording.
create type public.conversation_status as enum (
  'pending',
  'transcribing',
  'analyzing',
  'ready',
  'failed'
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users (id) on delete cascade,
  title text not null,
  recording_path text,
  recording_mime text,
  recording_size_bytes bigint,
  duration_seconds numeric,
  status public.conversation_status not null default 'pending',
  transcript text,
  analysis jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_created_by_idx
  on public.conversations (created_by, created_at desc);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row
  execute function public.tg_set_updated_at();

alter table public.conversations enable row level security;

create policy "conversations_select_own"
  on public.conversations for select
  to authenticated
  using (auth.uid() = created_by);

create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "conversations_update_own"
  on public.conversations for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "conversations_delete_own"
  on public.conversations for delete
  to authenticated
  using (auth.uid() = created_by);
