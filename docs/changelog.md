# Changelog

Append-only log of meaningful changes. One short entry per shipped
feature or fix; link to the doc note that captures the resulting state.
For implementation history, read `git log`.

---

## 2026-05-03

- **Drag-and-drop upload + sticky progress toast.** Single dropzone
  dialog that closes on file pick; progress lives in a bottom-right
  toast that morphs through preparing → uploading → finalizing →
  success. See [[upload]].
- **Merged segment timeline into the player scrubber.** One bar with
  segment-block background, taller darker overlay on the active block,
  hover tooltip. No more thumb knob. See [[playback]].
- **Tabs + accordion redesign on the detail page.** Audio + scrubber
  always visible above; *Segments* / *Coach* / *Transcript* tabs
  underneath; segments are a single-open accordion that follows
  playback (8 s grace after manual click). See [[segments]].
- **Custom audio player.** Native `<audio controls>` replaced with
  shadcn-styled play/pause + scrubber + time readout. See [[playback]].
- **Segmented call analysis.** GPT splits each call into 3–8 logical
  segments with per-segment summaries, strengths, improvements;
  sentence-level karaoke transcript with click-to-seek + auto-scroll;
  Deepgram timing data persisted in its own table. See [[segments]],
  [[transcript]], [[storage-shape]].
- **Background pipeline + Realtime.** Upload action returns as soon as
  bytes are in storage; transcribe + analyze run via `after()`;
  status updates flow through Supabase Realtime instead of polling.
  See [[background-pipeline]].
- **Direct upload via signed URL.** Audio bytes bypass the Server
  Action runtime — closes out the body-cap saga and gives us native
  upload progress events. See [[direct-upload]].
- **AI-generated title.** Title input dropped from the upload dialog;
  GPT generates a CRM-style title that the row adopts unless the user
  has renamed. See [[ai-title]].
- **Body size limits raised.** Both `proxyClientMaxBodySize` and
  `serverActions.bodySizeLimit` set to `100mb` under `experimental`
  (placement gotchas captured). See [[body-size-limits]].

---

## 2026-05-03 — Wiki + house rules

Bootstrapped this `docs/` directory and added `CLAUDE.md` at the repo
root. House rule: update the matching doc note in the same commit as
the code change.

---

## 2026-05-03 — MVP build

Commit `d07a44a`. End-to-end implementation of the case study brief —
Supabase migrations + RLS, email/password auth, Deepgram + Azure OpenAI
pipeline via LangChain `withStructuredOutput`, conversations CRUD with
list + detail + rename + delete, sidebar shell.

---

## 2026-05-03 — Initial scaffold

Pre-existing commits. Next.js 16 + Tailwind v4 + shadcn scaffold,
Supabase SSR clients wired, route stubs, README from the brief,
`.env.example` placeholders.
