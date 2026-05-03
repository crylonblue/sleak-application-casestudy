# Changelog

Append-only log of meaningful changes. Add a `## YYYY-MM-DD — short title`
section at the top whenever you ship something user-visible or
architectural. Link to the docs note that captures the resulting state.

---

## 2026-05-03 — Surface upload progress on the detail page

The detail page's `ProcessingPanel` now shows the byte-level upload
progress bar when the row is in `status='pending'` and the local upload
tracker has data for it, then transitions naturally to the existing
`Transcribing…` / `Analyzing…` stages. Single rolling status surface.

Implemented via a module-level `lib/uploads/upload-tracker.ts` (using
`useSyncExternalStore`) that the upload dialog writes to and the panel
reads from. Per-tab state, no new server surface needed.

See [[decisions#upload-progress-shown-in-the-same-panel-as-processing-status]],
[[conversations#unified-upload--processing-status]].

---

## 2026-05-03 — Direct upload to Storage with progress bar + AI-generated title

The upload no longer flows through the Next.js Server Action runtime.
The browser PUTs audio bytes directly to a signed Supabase Storage URL
with `xhr.upload.onprogress` driving a real progress bar in the dialog.
Three actions orchestrate the dance: `prepareUpload` (insert row + mint
URL), `finalizeUpload` (flip to `transcribing` + schedule pipeline via
`after()`), and `cancelUpload` (cleanup on abort).

The title input is gone from the upload dialog. The analyze step now
returns a `title` field on `feedbackSchema`; the row is updated to that
value with a `where title = <filename_default>` predicate so user
renames always win. Existing rename action stays untouched.

Side effects:

- New shadcn `Progress` component.
- `feedbackSchema` gained a required `title` string. Old rows whose
  `analysis` lacks `title` now fail `safeParse` on the detail page →
  feedback section hides for those rows; transcript still shows. Wipe
  local rows or re-run analysis if you care.
- The body-size knobs in `next.config.ts` are no longer load-bearing
  for the audio path (kept for any future small-file Server Actions).

See [[decisions#direct-upload-via-signed-url]],
[[decisions#ai-generated-crm-style-title]],
[[conversations#upload-flow]],
[[ai-pipeline#feedback-schema--libaifeedback-schemats]].

---

## 2026-05-03 — Background pipeline + realtime status updates

The upload action no longer blocks the user on transcription + analysis.
Foreground work is just `validate → insert row → upload bytes → set
status='transcribing' → return`; transcription and analysis run via
`after()` from `next/server` after the response is sent. A new
`ConversationsRealtime` client component subscribes to
`postgres_changes` on `public.conversations` (filtered by `created_by`)
and triggers `router.refresh()` on every change, so list and detail
views update live as the background pipeline progresses.

Side effects:

- Upload dialog closes immediately on success and toasts a "View"
  action — user can start another upload or navigate freely while
  analysis runs.
- Removed `app/(app)/conversations/[id]/processing-refresh.tsx` (the
  former polling component); realtime replaces it.
- New migration `20260503141450_enable_realtime_conversations.sql`
  adds the table to `supabase_realtime` and sets `replica identity
  full`.

See [[decisions#background-pipeline-via-after-plus-supabase-realtime]],
[[conversations#realtime-status-updates]],
[[database#realtime]], and [[architecture#foreground-vs-background-work-in-uploadconversation]].

---

## 2026-05-03 — Move proxy body cap under `experimental` (it was being silently rejected)

Previous commit set `proxyClientMaxBodySize` at the top of
`NextConfig`, where Next 16's type defs expose it but the runtime
config schema rejects it with "Unrecognized key in object". The cap
stayed at the 10 MB default and uploads kept failing with "Unexpected
end of form". Moved both caps under `experimental` and confirmed the
banner now shows `proxyClientMaxBodySize: "100mb"`. See
[[decisions#server-actions-body-size-limit-raised-to-100mb]] and
[[conversations#body-size-limit]].

---

## 2026-05-03 — Also raise proxy/middleware body cap to 100 MB

After the previous bump to `experimental.serverActions.bodySizeLimit`,
real uploads still failed with `Unexpected end of form`. Root cause: a
*second* Next 16 body cap on the proxy/middleware
(default 10 MB) was truncating the multipart stream before the Server
Action saw it. Raised that to `100mb` too.

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
