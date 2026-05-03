# Architecture

Single Next.js 16 app talking to a local Supabase stack and two external
AI services. Authenticated routes are gated by a route group; data access
goes through a server-only DAL with Postgres RLS as the real
authorization boundary.

## Route layout

```
app/
├── layout.tsx             root: html, fonts, Toaster
├── auth/                  anonymous routes (login, signup) — see [[auth]]
└── (app)/                 authenticated route group
    ├── layout.tsx         requireUser() + sidebar shell + realtime client
    ├── page.tsx           redirects → /conversations
    └── conversations/     list page + upload dialog + detail page
                           (see [[upload]], [[playback]], [[segments]], [[transcript]])
```

The `(app)` route group lets us put the sidebar on app routes only and
gives us one canonical place to enforce the auth check. See
[[route-group-auth]].

## Authorization

Two layers; the second is the one we trust.

1. **Route group layout** — friendly UX gate. Redirects unauthenticated
   users to `/auth/login`.
2. **Postgres RLS** — security gate. Server actions run as the user's
   session, so RLS applies uniformly. See [[database]] and
   [[storage-rls]].

## Foreground vs background work

The upload action splits into foreground (validate → insert row → stream
bytes → set `transcribing`) and background (transcribe → analyze → set
`ready`). The background phase is scheduled via `after()` from
`next/server` so the user is free to keep working. See
[[background-pipeline]].

## Server actions vs route handlers

All writes go through server actions; no `app/api/*` routes. See
[[server-actions-only]].
