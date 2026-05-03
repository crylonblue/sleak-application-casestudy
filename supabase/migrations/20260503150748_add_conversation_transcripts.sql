-- Persist Deepgram's structured paragraph/sentence/word timing data.
--
-- Lives in a separate table from `conversations` so realtime UPDATE
-- events on the parent row don't have to drag ~150-250 KB of timing
-- data across the wire on every status flip. Inserted once, never
-- updated; cascades on delete.
create table public.conversation_transcripts (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  paragraphs jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.conversation_transcripts enable row level security;

-- Owner-only access, gated on the parent conversation row.
create policy "conversation_transcripts_select_own"
  on public.conversation_transcripts for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

create policy "conversation_transcripts_insert_own"
  on public.conversation_transcripts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );
