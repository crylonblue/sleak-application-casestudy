# Database

Local Supabase Postgres. Schema is defined in versioned migrations under
`supabase/migrations/` — never edit Studio directly.

## `public.conversations`

One row per uploaded sales call. Owner-only RLS keyed on
`auth.uid() = created_by`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK |
| `created_by` | `uuid` | FK → `auth.users.id` (cascade) |
| `title` | `text` | filename default; AI overwrites if user hasn't renamed (see [[ai-title]]) |
| `recording_path` | `text \| null` | object key in the `recordings` bucket |
| `recording_mime` | `text \| null` | |
| `recording_size_bytes` | `bigint \| null` | |
| `duration_seconds` | `numeric \| null` | from Deepgram |
| `status` | `conversation_status` | `pending` → `transcribing` → `analyzing` → `ready` (or `failed`) |
| `transcript` | `text \| null` | flat smart-formatted transcript |
| `analysis` | `jsonb \| null` | structured feedback — see [[ai-pipeline]] for shape |
| `error` | `text \| null` | populated when `status = 'failed'` |
| `created_at`, `updated_at` | `timestamptz` | trigger keeps `updated_at` current |

In the `supabase_realtime` publication with `replica identity full` so
postgres_changes UPDATEs carry `created_by` for the per-user filter.
See [[realtime]] (the realtime client decision).

## `public.profiles`

App-domain user data, kept separate from `auth.users` so the app
schema doesn't reach into Supabase's auth contract. One row per
auth user, kept in sync via a trigger. See [[profile-table]].

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK + FK → `auth.users.id` (cascade) |
| `full_name` | `text \| null` | user-editable |
| `company_name` | `text \| null` | user-editable |
| `created_at`, `updated_at` | `timestamptz` | trigger keeps `updated_at` current |

Owner-only RLS keyed on `auth.uid() = id`.

A `security definer` trigger `on_auth_user_created` fires
`public.handle_new_user()` after every `auth.users` insert, which
inserts the matching profile row (RLS doesn't apply during signup
because the user has no session yet — security definer bypasses it).
Existing users are backfilled by the migration.

## `public.conversation_transcripts`

Deepgram's structured paragraph/sentence/word timing data.

| Column | Type | Notes |
|---|---|---|
| `conversation_id` | `uuid` | PK + FK (cascade) |
| `paragraphs` | `jsonb` | structured timing — see [[ai-pipeline]] |
| `created_at` | `timestamptz` | |

Lives in its own table so realtime UPDATEs on `conversations` don't drag
the bulky timing blob over the wire on every status flip. See
[[storage-shape]]. Owner-only RLS via the parent row's `created_by`.

## Storage — `recordings` bucket

Private, 100 MB cap, audio mimes only. Path convention:
`<user_id>/<conversation_id>.<ext>`. RLS uses the first path segment as
the ownership check — see [[storage-rls]].

## Migrations

```
supabase/migrations/
├── *_init_schema.sql                     conversations + RLS + updated_at trigger
├── *_init_storage.sql                    recordings bucket + path-prefix RLS
├── *_enable_realtime_conversations.sql   adds to publication + replica identity full
├── *_add_conversation_transcripts.sql    timing-data table
└── *_add_profiles.sql                    profiles table + auth-trigger + backfill
```

`supabase migration up` applies pending; `supabase db reset` rebuilds
from scratch.
