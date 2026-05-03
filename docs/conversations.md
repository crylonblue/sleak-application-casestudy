# Conversations

The core feature: upload an audio file → get a structured coaching review.

## Upload flow

The browser uploads audio bytes directly to Supabase Storage via a
short-lived signed URL — they never flow through the Next.js Server
Action runtime. This sidesteps the Next 16 body-size caps entirely, gives
us native browser progress events for the upload bar, and is the
production-grade pattern documented in
[[decisions#direct-upload-via-signed-url]].

Three server actions in `app/(app)/conversations/actions.ts` orchestrate
the dance, plus a fire-and-forget background phase scheduled with
`after()`:

```
[client]                                     [server]
  │
  │  prepareUpload({ name, mime, size })  ─►  validate (mime, size ≤ 100 MB)
  │                                           INSERT conversations
  │                                             status='pending', title=<filename>,
  │                                             recording_mime, recording_size_bytes
  │                                           createSignedUploadUrl(recordings/<user>/<id>.<ext>)
  │  ◄──────── { conversationId, uploadUrl, path }
  │
  │  XHR PUT bytes ─► uploadUrl                       (browser progress events)
  │      │
  │      └─ on abort/error ► cancelUpload(...)  ─►  remove storage object + delete row
  │
  │  finalizeUpload({ conversationId, path }) ─►  UPDATE status='transcribing',
  │                                                       recording_path
  │                                              after(() => {
  │                                                download blob from storage
  │                                                transcribeAudio(...)
  │                                                UPDATE status='analyzing',
  │                                                       transcript, duration
  │                                                analyzeTranscript(...)
  │                                                UPDATE status='ready', analysis
  │                                                UPDATE title=analysis.title
  │                                                  WHERE title=<filename default>
  │                                              })
  │  ◄─── { conversationId }
  │
  └─► toast "Upload complete — analyzing in background"
```

`after()` from `next/server` lets the response go back the moment the row
is in `transcribing` state — the user is free to start another upload,
navigate elsewhere, or close the dialog. List and detail pages pick up
status changes via the realtime subscription described below.

## AI-generated title

When the user uploads, the row's title starts as the filename minus its
extension (e.g. `recording-2024-11-23.mp3` → `recording-2024-11-23`).
This is just a placeholder so the row has *something* to display while
analysis runs.

The analyze step ([[ai-pipeline]]) returns a `title` field on the
`feedbackSchema` — a 5–9 word CRM-style label like *"Discovery call with
Acme — pricing pushback"*. After `analysis` lands, we issue a conditional
update:

```sql
update conversations set title = <ai_title>
where id = <id> and title = <filename_default>
```

If the user renamed the row in the meantime (via the rename dialog), the
`title = <filename_default>` predicate fails and the AI title is
discarded — user input always wins. No flag column needed.

## Status state machine

```
pending → transcribing → analyzing → ready
   │            │            │
   └────────────┴────────────┴──→ failed (error column populated)
```

`pending` corresponds to the window between `prepareUpload` returning
and `finalizeUpload` being called — the bytes are streaming. Status
badges live in `components/ui/status-badge.tsx`; anything in the
"processing" set (`pending`, `transcribing`, `analyzing`) shows a
spinner. `isProcessing(status)` is exported for callers that want a
"still working" affordance.

## Unified upload + processing status

Browser-side upload progress and server-side pipeline status surface
through the same `ProcessingPanel` on the detail page so the user sees
a single continuous progression:

```
Uploading 47% (12.4 / 26.3 MB)
        │
        ▼
Recording uploaded — getting things ready…  (status='pending', no local upload)
        │
        ▼
Transcribing your call with Deepgram…       (status='transcribing')
        │
        ▼
Generating coaching feedback with GPT-4.1…  (status='analyzing')
        │
        ▼
[FeedbackView]                              (status='ready')
```

The upload dialog publishes byte-level progress to a tiny module-level
tracker (`lib/uploads/upload-tracker.ts`, `useSyncExternalStore`-based).
`ProcessingPanel` is a client component that reads from the tracker via
`useUploadProgress(conversationId)`:

- If `status='pending'` **and** there's tracker data for this id (i.e.
  the upload dialog in this same tab is uploading bytes), it renders
  the byte-level progress bar with file name + MB counter.
- Otherwise it falls through to the textual stage messages.

The tracker is per-tab, module-scoped state — it survives client-side
navigation between routes but doesn't sync across tabs. A different tab
landing on the detail page during the pending window sees the fallback
"Recording uploaded — getting things ready…" message instead.

## Realtime status updates

`components/realtime/conversations-realtime.tsx` is a tiny client
component mounted once in `app/(app)/layout.tsx`. It subscribes to
`postgres_changes` on `public.conversations` filtered by
`created_by=eq.<user_id>` and calls `router.refresh()` (debounced
~250ms) whenever a row changes. Server components re-render with the
latest data without a full reload.

This is what makes the background pipeline visible: the user uploads, the
dialog closes, the new row shows up with `status='transcribing'`, and the
badge transitions through `analyzing` → `ready` (or `failed`) on its
own. The AI title appears as part of the final `ready` transition.

Realtime requires the `conversations` table to be added to
`supabase_realtime` and to have `replica identity full` — both done in a
migration. See [[database#realtime]].

## List page — `app/(app)/conversations/page.tsx`

Server component that calls `getOwnConversations()` ([[database]]) and
renders a shadcn `Table` with title / status / duration / uploaded-at,
plus an `UploadDialog`. Empty state shows the same dialog as the only
CTA.

## Detail page — `app/(app)/conversations/[id]/page.tsx`

Server component, `getOwnConversation(id)` for the row and
`getRecordingSignedUrl(path)` for a 1-hour signed URL on the audio.

Renders, in order:

- Title + status badge + uploaded timestamp + actions (rename, delete)
- Failure alert (if `status='failed'`)
- `<audio>` player (if recording is uploaded)
- `ProcessingPanel` (if still processing)
- `FeedbackView` (if `analysis` parses successfully)
- Transcript panel (if transcript exists)

The `analysis` jsonb is re-validated with `feedbackSchema.safeParse` —
if the schema ever changes, old rows degrade gracefully (feedback
hidden, transcript still shown).

The detail page does not have its own polling component — updates flow
through the realtime subscription mounted at the layout level.

## Rename + delete

Both live in `conversation-actions.tsx` (client) calling
`renameConversation` / `deleteConversation` (server) from
`conversations/actions.ts`.

`deleteConversation` is two-step: remove the storage object first, then
the row. The row removal also cascades from `auth.users`, but a manual
storage remove is needed because storage isn't tied to the row by FK.

## Upload dialog UX

`upload-dialog.tsx` (client component, on the list page).

- File input only — no title input. The AI fills that in after analysis;
  user can rename anytime via the existing rename action.
- Submit goes through the three-step flow above. The dialog shows:
  - "Preparing upload…" while `prepareUpload` runs
  - A real progress bar (with uploaded / total MB and percentage) driven
    by `xhr.upload.onprogress` while bytes stream to Storage
  - "Finalizing — analysis is starting…" while `finalizeUpload` runs
  - On success, dialog closes and a toast appears with a "View" action
    that navigates to the detail page
- "Cancel" during upload aborts the XHR and calls `cancelUpload` to
  remove the partial object and the row, leaving no orphans.
- Closing the dialog by clicking outside or pressing Esc is blocked
  while the upload is in-flight, so the user doesn't accidentally
  abandon work in a way that costs storage.

## See also

- [[ai-pipeline]] — transcription, analysis, feedback schema (incl. `title`)
- [[database]] — schema + RLS + realtime publication
- [[ui]] — components used here
- [[decisions]] — direct upload, background pipeline, AI title rationale
