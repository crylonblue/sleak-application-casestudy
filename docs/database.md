# Database

Postgres via local Supabase. Schema is defined in versioned migrations under
`supabase/migrations/` — never edit Studio directly, write a migration.

## Migrations

| File | Purpose |
|---|---|
| `20260503123552_init_schema.sql` | conversations table, status enum, RLS, updated_at trigger |
| `20260503123611_init_storage.sql` | private `recordings` bucket + path-prefix RLS |
| `20260503141450_enable_realtime_conversations.sql` | adds `conversations` to `supabase_realtime` + `replica identity full` |

Apply with `supabase db reset` (rebuilds from scratch + runs migrations) or
`supabase migration up` (applies new migrations on top).

## `public.conversations`

One row per uploaded sales call.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, defaults to `gen_random_uuid()` |
| `created_by` | `uuid` | FK → `auth.users.id` (cascade delete) |
| `title` | `text` | user-supplied or derived from filename |
| `recording_path` | `text \| null` | object key in `recordings` bucket |
| `recording_mime` | `text \| null` | MIME of the original upload |
| `recording_size_bytes` | `bigint \| null` | original size |
| `duration_seconds` | `numeric \| null` | filled by Deepgram |
| `status` | `conversation_status` | enum, see below |
| `transcript` | `text \| null` | filled after transcribe step |
| `analysis` | `jsonb \| null` | structured feedback, shape in [[ai-pipeline]] |
| `error` | `text \| null` | populated when `status = 'failed'` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()`, kept current by trigger |

Index: `(created_by, created_at desc)` for the list view.

### `conversation_status` enum

```
pending → transcribing → analyzing → ready
                                    ↘ failed
```

The upload action ([[conversations]]) walks the row through these states.
Anything that's not `ready` or `failed` is "processing" — the detail page
auto-refreshes while in those states.

## RLS

Enabled on `public.conversations` with four owner-only policies:

| Policy | For | Rule |
|---|---|---|
| `conversations_select_own` | `select` | `auth.uid() = created_by` |
| `conversations_insert_own` | `insert` | `with check (auth.uid() = created_by)` |
| `conversations_update_own` | `update` | `auth.uid() = created_by` (using + with check) |
| `conversations_delete_own` | `delete` | `auth.uid() = created_by` |

All policies target the `authenticated` role. Anon users see nothing.

## `storage.objects` — `recordings` bucket

Private bucket, 100 MB cap, mime allow-list of common audio formats.

**Path convention:** `<user_id>/<conversation_id>.<ext>`

RLS uses the first path segment as the ownership check:

```
(storage.foldername(name))[1] = auth.uid()::text
```

This means you can only read/write/delete files whose path starts with your
own UUID — even if you somehow guessed another user's `conversation_id`,
storage rejects you.

## Realtime

The third migration adds `public.conversations` to the
`supabase_realtime` publication so postgres_changes events flow through
to subscribed clients. RLS still applies — clients only receive events
for rows they have `select` on, which means each user sees only their
own.

`replica identity full` is set on the table so `UPDATE` events carry the
full new row rather than just changed columns. Without this the client
filter `created_by=eq.<user_id>` would drop updates whose payload
doesn't include `created_by`.

The frontend subscription lives in
`components/realtime/conversations-realtime.tsx`, mounted once in
`app/(app)/layout.tsx`. See [[conversations#realtime-status-updates]].

## See also

- [[auth]] for how `auth.uid()` gets populated
- [[conversations]] for how we read/write rows
- [[ai-pipeline]] for the `analysis` jsonb shape
