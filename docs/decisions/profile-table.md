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

**Downstream FKs point at profiles, not `auth.users`.**
`conversations.created_by` references `public.profiles.id` rather than
`auth.users.id`. The UUID values are identical (the trigger keeps them
in sync), but the constraint pointing at the public table means
PostgREST embeds (`select(*, profiles(full_name, …))`) work without
reaching into the auth schema, and future RLS predicates / joins that
involve the profile don't have to bridge schemas. Cascade behaviour is
preserved end-to-end (auth.users → profiles → conversations).

**Cost:** one extra table + one extra query on the detail page (the
sidebar's NavUser already needs the profile, so the cost is ~zero in
practice — `cache()` makes it free for additional callers in the same
request).

**See also:** [[profile]] (the feature), [[database]], [[auth]].
