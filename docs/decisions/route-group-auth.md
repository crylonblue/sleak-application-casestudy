# `(app)` route group + auth-only layout

**What:** two layouts under `app/`:

- `app/auth/layout.tsx` — centered card, logo only.
- `app/(app)/layout.tsx` — sidebar shell + `requireUser()` redirect +
  `ConversationsRealtime` mount.

**Why:** the sidebar shouldn't appear on login/signup, but Next's
nested layouts mean a single root layout would force it everywhere. A
route group is the cleanest split — adds zero URL segments and lets
each group own its chrome and auth gate.

**See also:** [[architecture]], [[auth]].
