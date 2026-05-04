# Profiles table separate from `auth.users`

**What:** app-domain user data (full name, company name, future
preferences) lives in `public.profiles`, with `id` referencing
`auth.users.id`. Not stored on `auth.users.user_metadata` or read
directly from the auth schema.

**Why:**

- The `auth` schema is Supabase's contract; we shouldn't add columns
  there. Putting our domain data in `public.profiles` keeps that
  boundary clean.
- `user_metadata` is editable by the user via the auth API, which is
  the wrong shape for "company name" (anyone could set it to
  anything). Our table is governed by RLS like the rest of the app.
- Joining to a real table is straightforward; pulling from
  `auth.users.raw_user_meta_data` is awkward and untyped.

**How a profile is guaranteed to exist:** an `after insert` trigger
on `auth.users` calls a `security definer` function that inserts the
matching profile row. The signed-up user has no session yet so the
trigger needs the elevated privilege to bypass RLS for that single
insert. After that the row is owner-only.

**Cost:** one extra table + one extra query on the detail page (the
sidebar's NavUser already needs the profile, so the cost is ~zero in
practice — `cache()` makes it free for additional callers in the same
request).

**See also:** [[profile]] (the feature), [[database]], [[auth]].
