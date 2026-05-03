# Upload

Audio bytes flow from the browser **directly to Supabase Storage** via a
short-lived signed URL — they never go through the Next.js Server Action
runtime. See [[direct-upload]] for the rationale.

## Surface

`upload-dialog.tsx` is a single drag-and-drop **dropzone** (also accepts
click-to-browse). The instant a file is selected the dialog closes; a
sticky [[sonner]]-style toast in the bottom-right takes over.

## Three actions

`app/(app)/conversations/actions.ts`:

- `prepareUpload({ fileName, mimeType, sizeBytes })` — validates, inserts
  the row in `pending` state, mints a signed upload URL, returns
  `{ conversationId, uploadUrl, path }`.
- `finalizeUpload({ conversationId, path })` — flips status to
  `transcribing` and schedules transcription + analysis via
  `after()` ([[background-pipeline]]).
- `cancelUpload({ conversationId, path })` — best-effort cleanup if the
  XHR aborts.

## Sticky progress toast

A single toast under a stable id morphs through stages:

- `Preparing upload…`
- `Uploading · NN%` with a live progress bar (driven by
  `xhr.upload.onprogress`, throttled to ~10 Hz)
- `Finalizing — analysis is starting…`
- Success card with a `View` action that navigates to the new
  conversation (auto-dismisses after 8 s)

All four stages render through `toast.custom()` with the same shell so
sonner doesn't swap container layouts mid-flight. Multiple uploads can
run in parallel — each gets its own toast id.

## Body-size knobs

Even though audio bypasses Server Actions, we still raise both
`experimental.proxyClientMaxBodySize` and
`experimental.serverActions.bodySizeLimit` to `100mb` in
`next.config.ts` for any small-file Server Actions that might need it.
See [[body-size-limits]].

## Progress tracker

The dialog also publishes byte-level progress to a module-level
[[upload-progress-tracker]] so the detail page's `ProcessingPanel`
can show the same upload progress when the user navigates there
mid-upload.

## See also

- [[direct-upload]] — why bytes bypass the server action
- [[ai-title]] — why there's no title input on the dropzone
- [[background-pipeline]] — what happens after `finalizeUpload`
- [[playback]], [[segments]], [[transcript]] — what the user sees once `ready`
