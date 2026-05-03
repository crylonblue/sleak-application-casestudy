# Auth

Email + password via `@supabase/ssr`. No third-party providers, no MFA.

## Pages

- `/auth/login` and `/auth/signup` — server components that redirect to
  `/conversations` if already signed in, then render a shared
  `auth-form.tsx`. Both use `useActionState` driving the matching server
  action.
- Auth section has its own layout (logo only, no sidebar).

## Server actions (`app/auth/actions.ts`)

- `signIn(prev, formData)` — `signInWithPassword` → redirect.
- `signUp(prev, formData)` — `signUp` → redirect (≥ 8-char password).
- `signOut()` — `signOut` → redirect to `/auth/login`.

All three call `revalidatePath('/', 'layout')` before redirect so server
components re-render with the new session state.

## Route gating

Two layers — see [[architecture]] for the rationale:

1. `app/(app)/layout.tsx` calls `requireUser()` and redirects.
2. Postgres RLS rejects every query that isn't from the right user.

The proxy at `proxy.ts` (Next 16's renamed middleware) refreshes the
auth cookie on every request via `lib/supabase/proxy.ts:updateSession`.

## Session helpers

`lib/data-access/auth.ts` exports two:

- `getCurrentUser()` — cached `User | null`. Use when "no user" is a
  valid branch (e.g. the auth pages themselves).
- `requireUser()` — cached `User`, redirects to `/auth/login` otherwise.

## Local quirk

`enable_confirmations = false` for email auth in `supabase/config.toml`
so sign-ups give an immediate session in dev. Before deploying to hosted
Supabase, flip it on and add a confirm-callback route, or sign-ups will
silently fail. Captured in [[local-setup]].
