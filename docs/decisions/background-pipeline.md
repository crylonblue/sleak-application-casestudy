# Background pipeline via `after()` + Realtime

**What:** the upload action streams bytes to storage, sets
`status='transcribing'`, then schedules transcription + analysis with
`after()` from `next/server` and returns. A `ConversationsRealtime`
client mounted in `(app)/layout.tsx` subscribes to `postgres_changes`
on `public.conversations` filtered by `created_by` and calls
`router.refresh()` (debounced) on every row change.

**Why:**

- The user shouldn't be locked into the upload form for 15–30 s of
  network + AI calls.
- `after()` runs the pipeline post-response; Realtime makes status
  visible immediately on whatever page the user is on. No polling.
- Replaces an earlier inline-pipeline + 2.5s-`router.refresh` polling
  approach. No new infra needed.

**Cost / caveats:**

- `after()` keeps the Node function instance warm until callbacks
  finish — fine for ~30 s pipelines, won't scale to multi-minute jobs
  (those want a real queue).
- The Supabase server client is reused inside `after()`; its in-memory
  JWT is still valid, cookie context isn't re-entered.
- `replica identity full` on `public.conversations` is required so
  UPDATE events carry `created_by` for the per-user filter.

**See also:** [[architecture]], [[upload]], [[ai-pipeline]],
[[realtime]].
