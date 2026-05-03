# Architecture

A single Next.js 16 app talking to a local Supabase stack and two external AI
APIs. All authenticated routes are gated by a route group; all data access goes
through a thin server-only DAL with RLS as the real authorization boundary.

## Data flow

```
Browser
  │
  ▼
Next.js App Router  (Server Components + Server Actions)
  ├── auth pages           (anonymous)        → see [[auth]]
  ├── (app) group          (requires session) → see [[auth]]
  │     ├── /conversations           list
  │     └── /conversations/[id]      detail (audio + transcript + feedback)
  │
  ├── lib/data-access/*    server-only DAL  → see [[database]]
  ├── lib/ai/*             Deepgram + Azure OpenAI → see [[ai-pipeline]]
  └── lib/supabase/*       SSR + browser clients
        │
        ▼
Local Supabase (Docker)
  ├── auth.users
  ├── public.conversations              (RLS: owner-only, in supabase_realtime publication)
  └── storage.objects (recordings/)     (RLS: path-prefix == user_id)

       ▲
       │ realtime postgres_changes (filtered by created_by)
       │
ConversationsRealtime  (mounted in (app)/layout.tsx)
  └── triggers router.refresh() on every owned-row change
```

## Route layout

```
app/
├── layout.tsx                 minimal (html, fonts, Toaster)
├── auth/                      anonymous routes
│   ├── layout.tsx             logo-only chrome
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── auth-form.tsx          shared client form
│   └── actions.ts             signIn / signUp / signOut
└── (app)/                     authenticated route group
    ├── layout.tsx             requireUser() + sidebar shell
    ├── page.tsx               redirects → /conversations
    └── conversations/
        ├── page.tsx           list
        ├── upload-dialog.tsx  client upload form
        ├── actions.ts         uploadConversation / rename / delete
        └── [id]/
            ├── page.tsx       detail
            ├── feedback-view.tsx
            ├── conversation-actions.tsx
            └── processing-refresh.tsx
```

The split between `auth/` and `(app)/` lets us put a sidebar on app routes
without shipping it to the login screen, and gives us one canonical place
(`(app)/layout.tsx`) to enforce the auth check.

## Authorization boundary

There are two layers, and the second is the one we trust:

1. **Route group layout** — friendly UX gate. Calls `requireUser()` and
   redirects unauthenticated users.
2. **Postgres RLS** — security gate. Even if a request bypassed the layout,
   queries against `conversations` and `storage.objects` only see rows owned
   by `auth.uid()`. See [[database]].

Server actions always run as the user's session (we don't use a service-role
key on the server), so RLS applies uniformly.

## Server actions vs route handlers

We use server actions for all writes (`signIn`, `uploadConversation`,
`renameConversation`, `deleteConversation`, `signOut`). No `app/api/*` routes
exist yet. See [[decisions]] for why.

## Foreground vs background work in `uploadConversation`

The upload action splits its work in two:

- **Foreground** (user blocks on this): validate, insert row, stream
  bytes to Storage, set `status='transcribing'`, return.
- **Background** (`after()` from `next/server`): transcribe with
  Deepgram, set `status='analyzing'`, analyze with GPT-4.1, set
  `status='ready'` (or `'failed'`).

The background phase runs after the response is sent, which is what
lets the user keep working. The frontend learns about progress via the
realtime subscription described above. See [[conversations]] and
[[decisions#background-pipeline-via-after-plus-supabase-realtime]].

## See also

- [[conversations]] for the upload/analyze flow specifically
- [[ui]] for the component layer
- [[local-setup]] for ports and env
