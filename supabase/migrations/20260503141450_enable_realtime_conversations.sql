-- Allow realtime postgres_changes events on conversations.
-- RLS policies on the table govern who receives which events, so this only
-- exposes a row to the user that already has SELECT permission on it.
alter publication supabase_realtime add table public.conversations;

-- Realtime needs full row data for UPDATE events (otherwise only the primary
-- key plus changed columns are emitted, which means the client can't tell
-- which user owns the row when filtering by created_by).
alter table public.conversations replica identity full;
