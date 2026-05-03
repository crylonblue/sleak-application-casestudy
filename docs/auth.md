# Auth

Email + password via `@supabase/ssr`. No third-party providers, no MFA, no
email confirmation (locally).

## Pages

- `/auth/login` — sign-in form
- `/auth/signup` — sign-up form

Both are server components that redirect to `/conversations` if a session
already exists, then render the shared `auth-form.tsx` client component
(`useActionState` driving the matching server action).

The auth section uses its own minimal layout (`app/auth/layout.tsx`) — logo
only, no sidebar.

## Server actions (`app/auth/actions.ts`)

| Action | What it does |
|---|---|
| `signIn(prev, formData)` | `supabase.auth.signInWithPassword`, then `redirect('/conversations')` |
| `signUp(prev, formData)` | enforces ≥8-char password, `supabase.auth.signUp`, then redirect |
| `signOut()` | `supabase.auth.signOut`, redirect to `/auth/login` |

All three call `revalidatePath('/', 'layout')` before redirect so server
components re-render with the new session state.

## Route gating

Two layers — see [[architecture]] for why:

1. **`app/(app)/layout.tsx`** calls `requireUser()` and redirects to login.
2. **Postgres RLS** rejects every query that isn't from the right user.

The proxy at `proxy.ts` (Next 16's renamed middleware) refreshes the auth
cookie on every request via `lib/supabase/proxy.ts:updateSession`.

## Session helpers (`lib/data-access/auth.ts`)

```
getCurrentUser() → User | null    cached per-request
requireUser()    → User           redirects to /auth/login if absent
```

Both are wrapped in `cache()` so calling them many times in one request is
free. Use `requireUser` in any server component or action that absolutely
needs a user; use `getCurrentUser` when "no user" is a valid branch (the
auth pages themselves use it to redirect signed-in visitors away).

## Local quirk

`supabase/config.toml` has `enable_confirmations = false` for email auth, so
sign-ups give you an immediate session in dev. **Before deploying to hosted
Supabase, flip this on and add a confirm-callback route** — without it,
sign-ups silently fail to create sessions on real environments.

## See also

- [[database]] — RLS depends on `auth.uid()`
- [[ui]] — `NavUser` consumes `getCurrentUser()`
- [[local-setup]] — env vars
