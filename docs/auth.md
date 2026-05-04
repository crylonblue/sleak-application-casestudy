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

## Profile auto-create on signup

Every `auth.users` insert fires a `security definer` trigger that
creates the matching `public.profiles` row (see [[database]] +
[[profile-table]]). The signed-up user has no app session at the
moment the row hits `auth.users`, so the trigger uses the elevated
privilege to bypass RLS for that single insert. From then on, the
profile is owner-only via RLS like everything else.

The signup action itself (`app/auth/actions.ts`) doesn't have to know
about this — it just calls `supabase.auth.signUp` and the trigger does
the rest.

## Local quirk

`enable_confirmations = false` for email auth in `supabase/config.toml`
so sign-ups give an immediate session in dev. Before deploying to hosted
Supabase, flip it on and add a confirm-callback route, or sign-ups will
silently fail. Captured in [[local-setup]].
