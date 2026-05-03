# Realtime instead of polling

**What:** `ConversationsRealtime` (mounted once in `(app)/layout.tsx`)
subscribes to `postgres_changes` on `public.conversations` filtered by
`created_by=eq.<user_id>` and calls `router.refresh()` (debounced
~250 ms) on every row change. Replaces the earlier per-page polling.

**Why:**

- Status changes are visible instantly across list + detail without
  manual refresh.
- One subscription per session. No wasted network from polling intervals.
- RLS on the table flows through to realtime — clients only receive
  events for rows they have `select` on.

**Required setup:**

- `public.conversations` is in the `supabase_realtime` publication.
- `replica identity full` on the table so UPDATE events carry
  `created_by` for the per-user filter.

**See also:** [[database]], [[background-pipeline]].
