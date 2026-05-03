# Changelog

Append-only log of meaningful changes. Add a `## YYYY-MM-DD — short title`
section at the top whenever you ship something user-visible or
architectural. Link to the docs note that captures the resulting state.

---

## 2026-05-03 — Make the active segment block taller and darker

The active segment used to be barely visible on the merged scrubber
(`bg-primary/25` over `bg-primary/45` played overlay made the played
portion dominate the active state). Restructured so the active segment
renders as its own absolutely-positioned overlay between the base
blocks and the played overlay:

- Base track: uniform `h-1.5` blocks (clean borders, all aligned).
- Active overlay: full-track-height (`h-4`), `bg-primary/55` — taller
  and darker than anything else.
- Played overlay: stays a thin `h-1.5` stripe through the centre, so
  in the active region it shows a darker progress streak crossing
  through the tall block.

Effectively: the segment you're in jumps out as a tall dark slab; the
played portion is visible as a streak through it.

See [[conversations#detail-page--app-app-conversations-id-page-tsx]].

---

## 2026-05-03 — Merge segment timeline into the player scrubber

The Recording card had two horizontal bars stacked on top of each other
— a Slider for scrubbing and a separate `SegmentTimeline` strip for
segment boundaries. Merged them into one custom `Scrubber` inside
`RecordingPlayer`:

- The track is rendered as proportional **segment blocks** (the active
  segment block tinted primary, others muted).
- Played portion is darkened on top of the segment colours.
- Current position is a thin **vertical line**, not a thumb knob.
- Hovering the track shows a faint guide line plus a tooltip that
  reads `mm:ss · Segment title` for the spot under the cursor.
- Click anywhere to seek; click-and-drag to scrub. Arrow keys move ±5s
  when focused; space toggles play.

`SegmentTimeline.tsx` is gone; the player now takes an optional
`segments` prop. The Slider shadcn primitive is no longer used (file
left in `components/ui/slider.tsx` for future).

See [[conversations#detail-page--app-app-conversations-id-page-tsx]].

---

## 2026-05-03 — Custom audio player to replace browser-default controls

The native `<audio controls>` looked different in every browser and
clashed with the rest of the shadcn UI. Replaced with a small
custom player:

- A filled circular play/pause button (lucide `Play` / `Pause`).
- A shadcn `Slider` scrubber that maps drag fraction to
  `seekTo(fraction × duration)`.
- An `mm:ss / mm:ss` time readout under the slider.
- The `<audio>` element stays in the DOM with the same `registerAudio`
  callback ref, just with `class="hidden"` so its native chrome
  doesn't render.

Required adding `togglePlay()` and `useDuration()` to the playback
store (loadedmetadata + durationchange listeners now drive duration).
The transcript pane, segment cards, and segment timeline already
share that store, so they keep working unchanged.

See [[ui#playback-store]] and
[[conversations#detail-page--app-app-conversations-id-page-tsx]].

---

## 2026-05-03 — Detail page tabs + accordion segments + transcript scroll fix

The detail page was getting crowded — overall coaching feedback, every
segment expanded, and a long transcript all stacked vertically. Two
shifts:

- **Tabs** (`Segments` / `Coach` / `Transcript`) under a persistent
  Recording card. The audio player + segment timeline stay visible from
  any tab so scrubbing keeps working while reading the transcript or
  coach view.
- **Single-open accordion** for segments. The currently-playing segment
  auto-expands; clicking another segment opens it and suspends
  auto-follow for 8 seconds so playback can't yank the reader back. Each
  panel has a *Jump to mm:ss* button.

Also fixed a transcript scrolling bug: the auto-scroll's
`scrollIntoView({ block: 'center' })` was bubbling out and nudging the
page in some browsers. Replaced with manual `container.scrollTo` math so
only the transcript box moves. Added `overscroll-contain` so wheel
events at the edges of the box don't bubble to the page either.

See [[conversations#detail-page--app-app-conversations-id-page-tsx]],
[[conversations#segments]], and [[ui#components-in-use]].

---

## 2026-05-03 — Segmented call analysis + click-to-seek karaoke transcript

Calls are now split by GPT into 3–8 logical segments (e.g. *Discovery
questions*, *Pricing pushback*) with per-segment summaries, strengths,
and improvements. The detail page renders:

- A `SegmentTimeline` strip inside the Recording card — proportional
  blocks per segment, click-to-seek, "Segment N of M · Title" pill
  above showing the active one.
- `SegmentFeedback` stacked cards under the overall feedback. The
  currently-playing segment gets an accent ring; clicking any card
  seeks to its start.
- An interactive `TranscriptView` with paragraph-level Rep/Customer
  speaker labels (driven by GPT-inferred `rep_speaker_number`),
  per-sentence buttons that seek on click, sentence-level karaoke
  highlighting that follows playback, and auto-scroll with a 5-second
  manual-scroll grace period.

All driven by a tiny module-level `playback-store` (same shape as the
existing upload tracker) — components subscribe to `useCurrentTime()`
and call `seekTo(seconds)` without any context plumbing.

Data model:

- New `conversation_transcripts(conversation_id PK, paragraphs jsonb)`
  table for Deepgram's structured timing data, kept off the
  `conversations` row so realtime UPDATE events don't drag ~150–250 KB
  per status flip.
- `feedbackSchema` gained `segments[]` (with min(3)/max(8) and
  contiguous-coverage post-processing in `analyze.ts`),
  `rep_speaker_number`, and per-segment `strengths`/`improvements`
  arrays. Top-level `strengths`/`improvements` stay (top 1–3 across the
  call).
- `analyze.ts` now takes `{ segments, durationSeconds }` and feeds the
  model a sentence-level timestamped transcript.

Rows that pre-date this work and don't have a `conversation_transcripts`
row or `analysis.segments` won't render the corresponding sections of
the detail page — re-upload to refresh. We deliberately don't carry a
backwards-compat fallback `<pre>` transcript view for old rows; the
new shape is the only shape.

See [[plans/segmented-call-analysis]] (the planning doc),
[[ai-pipeline#feedback-schema--libaifeedback-schemats]],
[[ai-pipeline#analysis--libaianalyzets]],
[[conversations#segments]],
[[conversations#detail-page--app-app-conversations-id-page-tsx]],
[[database#publicconversation_transcripts]],
and [[ui#playback-store]].

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
