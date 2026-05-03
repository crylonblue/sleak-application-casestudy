# Conversations

The core feature: upload an audio file → get a structured coaching review.

## Upload flow

`uploadConversation` in `app/(app)/conversations/actions.ts` splits into
a fast foreground phase and a background phase:

```
[foreground — user waits on this]
1. requireUser()                       — auth gate
2. validate file (mime + size ≤ 100MB) — early rejection
3. INSERT conversations (status='pending')
   → returns id, used as the storage path
4. upload to recordings/<user_id>/<id>.<ext>
   → on failure, delete the row and return error
5. UPDATE status='transcribing', recording_path=...
6. revalidatePath('/conversations')
7. return { conversationId }            — dialog closes, toast shown

[background — runs after the response, scheduled with `after()`]
8. transcribe (Deepgram)               — see [[ai-pipeline]]
9. UPDATE status='analyzing', transcript, duration_seconds
10. analyze (Azure OpenAI structured)  — see [[ai-pipeline]]
11. UPDATE status='ready', analysis, error=null
    (any thrown error → status='failed', error=message)
```

The user only blocks on steps 1–7 (typically a few seconds while the file
streams to storage). Steps 8–11 run via `after()` from `next/server`
*after* the action's response is sent — the user is free to start
another upload, navigate elsewhere, or close the dialog. List and detail
pages update in realtime as the background updates land — see
[[#realtime-status-updates]] below and [[decisions#background-pipeline-via-after-plus-supabase-realtime]].

### Body size limit

The audio file is sent through the Next.js Server Action runtime. Two
separate body caps need to be lifted from their defaults to allow real
audio uploads — both are configured in `next.config.ts`:

| Setting | Default | Set to | Why |
|---|---|---|---|
| `experimental.proxyClientMaxBodySize` | 10 MB | `100mb` | Cap on the proxy/middleware buffer. Defaults truncate the multipart stream → "Unexpected end of form". |
| `experimental.serverActions.bodySizeLimit` | 1 MB | `100mb` | Server Action body cap. Below this, the action fails with "Body exceeded 1 MB limit". |

Both caps must live **under `experimental`** for the Next 16.0.7 runtime
config schema to accept them — the type defs expose them at top level too,
but the runtime rejects that placement with "Unrecognized key in object".

Both match the action's own `MAX_BYTES = 100 MB` validation, so the
three limits stay in sync. See
[[decisions#server-actions-body-size-limit-raised-to-100mb]] for the
tradeoff and the production-grade alternative (signed direct upload
to Supabase Storage, bypassing the Next runtime entirely).

## Status state machine

```
pending → transcribing → analyzing → ready
   │            │            │
   └────────────┴────────────┴──→ failed (error column populated)
```

Status badges live in `components/ui/status-badge.tsx`. Anything in the
"processing" set (`pending`, `transcribing`, `analyzing`) shows a spinner;
`isProcessing(status)` is exported for callers that want to render a
"still working" affordance.

## Realtime status updates

`components/realtime/conversations-realtime.tsx` is a tiny client
component mounted once in `app/(app)/layout.tsx`. It subscribes to
`postgres_changes` on `public.conversations` filtered by
`created_by=eq.<user_id>` and calls `router.refresh()` (debounced ~250ms)
whenever a row changes. Server components re-render with the latest data
without a full reload.

This is what makes the background pipeline visible: the user uploads, the
dialog closes, the new row shows up with `status='transcribing'`, and the
badge transitions through `analyzing` → `ready` (or `failed`) on its own.

Realtime requires the `conversations` table to be added to
`supabase_realtime` and to have `replica identity full` — both done in a
migration. See [[database#realtime]].

## List page — `app/(app)/conversations/page.tsx`

Server component that calls `getOwnConversations()` ([[database]]) and
renders a shadcn `Table` with title / status / duration / uploaded-at, plus
an `UploadDialog`. Empty state shows the same dialog as the only CTA.

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

The `analysis` jsonb is re-validated with `feedbackSchema.safeParse` — if
the schema ever changes, old rows degrade gracefully (feedback hidden,
transcript still shown).

The detail page does not have its own polling component — updates flow
through the realtime subscription mounted at the layout level.

## Rename + delete

Both live in `conversation-actions.tsx` (client) calling
`renameConversation` / `deleteConversation` (server) from
`conversations/actions.ts`.

`deleteConversation` is two-step: remove the storage object first, then the
row. The row removal also cascades from `auth.users`, but a manual storage
remove is needed because storage isn't tied to the row by FK.

## Upload dialog UX

`upload-dialog.tsx` (client component, on the list page).

- File input + optional title input
- Submit blocks while the bytes stream to storage (typically a few
  seconds), then the dialog closes
- A success toast appears with a "View" action that navigates to the
  detail page; staying on the list lets the user start another upload
  immediately
- Errors stay visible inside the dialog (and as a toast) so the user
  can correct and retry without losing context

## See also

- [[ai-pipeline]] — the actual transcription + analysis
- [[database]] — schema + RLS + realtime publication
- [[ui]] — components used here
- [[decisions]] — background pipeline + realtime rationale
