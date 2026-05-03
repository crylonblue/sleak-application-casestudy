# Changelog

Append-only log of meaningful changes. Add a `## YYYY-MM-DD — short title`
section at the top whenever you ship something user-visible or
architectural. Link to the docs note that captures the resulting state.

---

## 2026-05-03 — Raise Server Actions body size limit to 100 MB

Set `experimental.serverActions.bodySizeLimit = '100mb'` in
`next.config.ts`. The default 1 MB cap was rejecting real audio
uploads through the `uploadConversation` server action. The new limit
matches the action's own validation. See [[decisions#server-actions-body-size-limit-raised-to-100mb]]
for the tradeoff and the future direct-upload refactor.

**Note:** changing `next.config.ts` requires a full dev-server restart
(`pnpm dev`); HMR doesn't pick up config changes.

---

## 2026-05-03 — Wiki + house rules

Bootstrapped this `docs/` directory and added a `CLAUDE.md` rule that
docs get updated in the same commit as the code change. See
[[README]] and the root `CLAUDE.md`.

---

## 2026-05-03 — MVP build

Commit `d07a44a`. End-to-end implementation of the case study brief.

**Added**

- Supabase migrations: `conversations` table + RLS, `recordings` storage
  bucket + path-prefix RLS, `updated_at` trigger. See [[database]].
- Email/password auth via `@supabase/ssr`: login + signup pages, server
  actions, `(app)` route-group gate, real-user `NavUser`. See [[auth]].
- AI pipeline in `lib/ai/`: Deepgram (`nova-3`) + Azure OpenAI GPT-4.1
  via LangChain `withStructuredOutput` against a zod feedback schema.
  See [[ai-pipeline]].
- Conversations feature: upload server action with status state machine,
  list page (shadcn Table + status badges + empty state), detail page
  (signed-URL audio + transcript + structured feedback + auto-refresh
  while processing), rename + delete. See [[conversations]].
- UI polish: sidebar `Conversations` link with active state, home →
  /conversations redirect, Sonner Toaster, GitHub stub link removed.
- Fixed pre-existing `react-hooks/purity` lint error in
  `components/ui/sidebar.tsx`.

**Infrastructure**

- Supabase ports pinned to `54441/54442/54443/54444/54447/54449` to
  coexist with other local Supabase projects. See [[local-setup]] and
  [[decisions]].
- `git remote` repointed to
  `https://github.com/crylonblue/sleak-application-casestudy.git`.

**Verified**

- `tsc --noEmit` and `eslint .` clean.
- Pipeline smoke-tested on a real wav (Deepgram 2.5s, GPT-4.1 4.3s,
  schema-valid output).
- DB/RLS smoke-tested via REST: signup → JWT → owner insert succeeds,
  anon listing returns `[]`.

---

## 2026-05-03 — Initial scaffold

Pre-existing commits `bb92df2`/`f5c0f95`/`47962b5`/`3028f7e`. Next.js 16
+ Tailwind v4 + shadcn scaffold, Supabase SSR clients wired, route stubs,
README from the case study brief, `.env.example` populated with placeholders.
