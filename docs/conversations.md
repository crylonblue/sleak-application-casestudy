# Conversations

The core feature: upload an audio file → get a structured coaching review.

## Upload flow

`uploadConversation` in `app/(app)/conversations/actions.ts`:

```
1. requireUser()                       — auth gate
2. validate file (mime + size ≤ 100MB) — early rejection
3. INSERT conversations (status='pending')
   → returns id, used as the storage path
4. upload to recordings/<user_id>/<id>.<ext>
   → on failure, delete the row and return error
5. UPDATE status='transcribing', recording_path=...
6. transcribe (Deepgram)               — see [[ai-pipeline]]
7. UPDATE status='analyzing', transcript, duration_seconds
8. analyze (Azure OpenAI structured)   — see [[ai-pipeline]]
9. UPDATE status='ready', analysis, error=null
   (any thrown error → status='failed', error=message)
10. revalidatePath + redirect to /conversations/<id>
```

Steps 6–8 happen inline inside the server action. The user's form sits in
its pending state for ~15–30s on a typical 2–3 minute call. See
[[decisions]] for why this isn't a queue yet.

### Body size limit

The audio file is sent through the Next.js Server Action runtime. Two
separate body caps need to be lifted from their defaults to allow real
audio uploads — both are configured in `next.config.ts`:

| Setting | Default | Set to | Why |
|---|---|---|---|
| `proxyClientMaxBodySize` | 10 MB | `100mb` | Cap on the proxy/middleware buffer. Defaults truncate the multipart stream → "Unexpected end of form". |
| `experimental.serverActions.bodySizeLimit` | 1 MB | `100mb` | Server Action body cap. Below this, the action fails with "Body exceeded 1 MB limit". |

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
`isProcessing(status)` is exported for the detail page to decide whether to
mount [[#auto-refresh]].

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

### Auto-refresh

`<ProcessingRefresh intervalMs={2500}/>` is a tiny client component that
calls `router.refresh()` on a timer while `isProcessing(status)` is true.
It's only mounted in that state, so finished pages don't poll.

## Rename + delete

Both live in `conversation-actions.tsx` (client) calling
`renameConversation` / `deleteConversation` (server) from
`conversations/actions.ts`.

`deleteConversation` is two-step: remove the storage object first, then the
row. The row removal also cascades from `auth.users`, but a manual storage
remove is needed because storage isn't tied to the row by FK.

## See also

- [[ai-pipeline]] — the actual transcription + analysis
- [[database]] — schema + RLS that this builds on
- [[ui]] — components used here
- [[decisions]] — inline-vs-queue rationale
