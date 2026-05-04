# Profile

App-domain user data — full name + company name. Kept in
`public.profiles`, separate from `auth.users`. See [[profile-table]].

## Page

`/profile` (under the `(app)` route group, so it's gated on auth and
inherits the sidebar shell).

A simple form with three fields:

- **Email** — read-only; comes from `auth.users` and can't be edited
  here.
- **Full name** — text input, optional.
- **Company** — text input, optional.

Submit goes to `updateProfile` server action, which writes to
`public.profiles` and revalidates `/` (so the sidebar's `NavUser`
re-renders with the new name) plus `/profile`.

## NavUser integration

`components/sidebar/nav-user.tsx` reads `getCurrentProfile()` and uses
two helpers from `lib/data-access/profile.ts`:

- `profileDisplayName(profile, email)` — full name when set, email
  otherwise.
- `profileInitials(profile, email)` — two-letter avatar fallback
  derived from the name (initials of first + last token), or from the
  email local-part otherwise.

The dropdown gains a *Profile* item that links to `/profile`.

## Used by the AI pipeline

The uploader's `full_name` and `company_name` are also fed to Deepgram
as `keyterm` entries during transcription so the rep's name and
company come through correctly in the transcript. See
[[ai-pipeline#keyterms]].

## Row guarantees

Because of the `auth.users` insert trigger, a profile row exists for
every signed-in user. `getCurrentProfile()` therefore returns a
non-nullable `Profile` and downstream code can skip the null branch.
See [[auth]] and [[database]].

## See also

- [[profile-table]] — why profiles live in their own table
- [[auth]] — signup trigger detail
- [[database]] — schema
