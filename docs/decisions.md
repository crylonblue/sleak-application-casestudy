# Decisions

The non-obvious choices we made and why. Add a new entry whenever a future
reader might wonder "why was this done this way?".

---

## Server Actions body size limit raised to 100 MB

**Decision:** Set both `experimental.proxyClientMaxBodySize = '100mb'`
and `experimental.serverActions.bodySizeLimit = '100mb'` in
`next.config.ts` so audio uploads can flow through the server action.

**Why:** Next.js 16 has *two* request-body caps stacked in front of a
Server Action:

1. The proxy/middleware default of 10 MB
   (`experimental.proxyClientMaxBodySize`) — truncates the body before
   it even reaches the action, manifesting as a multipart "Unexpected
   end of form" parse error.
2. The Server Action default of 1 MB
   (`experimental.serverActions.bodySizeLimit`) — raises a clean
   "Body exceeded 1 MB limit" error.

Both must be raised, and they must match the action's own `MAX_BYTES`
validation so the three limits stay in sync. We hit (2) first; (1)
surfaced after raising (2). The three-limit ladder is unfortunate but
that's the Next 16 surface area today.

**Gotcha:** the keys must be **under `experimental`**. Next 16's type
defs expose them at the top of `NextConfig` too, but the runtime config
schema only validates them under `experimental` — placing them at top
level fails silently with "Unrecognized key in object" and the body cap
stays at its default. The deprecated alias `middlewareClientMaxBodySize`
is also accepted (under `experimental`) but emits a deprecation warning.

**Cost:** every audio file is now buffered through the Next.js server
process, which:
- consumes server memory equal to the file size during the request
- counts against function size/time limits on serverless platforms
  (Vercel Hobby caps Server Action bodies at 4.5 MB regardless of this
  setting; even Pro caps at 100 MB and may charge for the time)
- doubles bandwidth (browser → Next → Supabase Storage)

**Production-grade alternative (deferred):** generate a signed upload URL
via a tiny server action, have the browser PUT the audio directly to
Supabase Storage, then call a second server action that just inserts the
row + kicks off transcription. Removes Next.js from the upload path
entirely. Worth doing before deploying to a hosted environment.

See [[conversations#body-size-limit]].

---

## Background pipeline via `after()` plus Supabase Realtime

**Decision:** The upload server action streams the file to storage,
inserts the row with `status='transcribing'`, then schedules
transcription + analysis with `after()` from `next/server` and returns.
A client component (`ConversationsRealtime`) mounted in
`(app)/layout.tsx` subscribes to `postgres_changes` on
`public.conversations` filtered by the current user and calls
`router.refresh()` (debounced) on every row change.

**Why:** The user shouldn't be locked into the upload form for 15–30s
of network + AI calls they didn't ask to wait for. With this split:
- Foreground stays short (just bytes → storage, a few seconds)
- The dialog closes and the user can start another upload, navigate,
  or just wait — their choice
- Realtime makes status changes visible immediately on whatever page
  they're on, no manual refresh, no polling

**Why both `after()` and Realtime?** `after()` lets us run the pipeline
without a separate worker process, queue, or webhook. Realtime makes
the UI react to the resulting row updates. Together they replace the
"inline + polling" pattern we had before with no new infrastructure.

**Cost / caveats:**
- `after()` runs in the same Node process as the request. In dev that
  means our `pnpm dev` keeps it alive. On a serverless host the
  function instance is kept warm until `after()` callbacks complete,
  which is fine for our ~30s pipelines but won't scale to multi-minute
  jobs (those want a real queue).
- The audio bytes (`arrayBuffer`) stay in memory until the `after()`
  callback finishes. For 100 MB uploads that's a real footprint.
  Future optimization: download the file from storage inside the
  background callback rather than holding it in the closure.
- The Supabase server client created in the foreground request is
  reused inside `after()`. Its in-memory JWT is still valid; cookie
  context isn't re-entered (we only do row updates, not auth).
- `replica identity full` is required on `public.conversations` so
  `UPDATE` events carry enough columns for the per-user filter to work
  (see [[database#realtime]]).

**How to evolve further:** if pipelines need to outlive a single Node
process or run in parallel at scale, lift them out of `after()` into a
dedicated queue (Supabase queues, Inngest, Trigger.dev, etc). The
realtime subscription on the frontend doesn't change.

See [[conversations]], [[ai-pipeline]], [[architecture]].

---

## `(app)` route group + auth-only layout

**Decision:** Two layouts under `app/`: `auth/layout.tsx` (centered card)
and `(app)/layout.tsx` (sidebar shell + auth gate).

**Why:** The sidebar shouldn't appear on login/signup, but Next's nested
layouts mean a single root layout would force it everywhere. A route group
is the cleanest way to split — it adds zero URL segments and lets each
group own its chrome.

See [[architecture]], [[ui]].

---

## Port-shifted Supabase (`54441` family)

**Decision:** This project's Supabase containers run on ports `54441-54449`
instead of the defaults (`54321-54329`).

**Why:** This dev environment already has other Supabase projects
(`gaby-crm`, `european-saas`) bound to the default range. The first
`supabase db reset` here failed with a port conflict; pinning a unique
range in `supabase/config.toml` lets all the projects coexist.

**Cost:** documentation has to mention the non-default ports, and the
`.env` URL doesn't match what most Supabase tutorials show.

See [[local-setup]].

---

## Email confirmation disabled locally

**Decision:** `enable_confirmations = false` for email auth in
`supabase/config.toml`.

**Why:** Lets sign-up immediately produce a session in dev — without it the
user is stuck on a "check your email" screen with no email actually sent
unless Mailpit is open.

**Cost / migration risk:** before deploying to hosted Supabase you have to
flip this on AND add a confirm-callback route, otherwise sign-ups will
silently fail to log users in. Captured here so we don't forget.

See [[auth]], [[local-setup]].

---

## Structured output via LangChain `withStructuredOutput`

**Decision:** Use `@langchain/openai`'s `AzureChatOpenAI` +
`withStructuredOutput(zodSchema)` instead of raw OpenAI function calling.

**Why:** It handles the function-calling plumbing for us, validates the
response against the schema, and reuses the same zod schema we use to
decode `analysis` jsonb on the detail page. One source of truth for the
shape.

**Cost:** an extra dep (`langchain` + `@langchain/openai` +
`@langchain/core`) and a tiny indirection compared to a direct OpenAI SDK
call.

See [[ai-pipeline]].

---

## Storing `analysis` as a jsonb column on `conversations`

**Decision:** No separate `analyses` table; the structured feedback lives
as a jsonb column on the `conversations` row.

**Why:** Always 1:1 with the conversation, queried on the same page,
versioning isn't a near-term concern, and it keeps the data model small.

**When to revisit:** if we want analysis history (re-run with a newer
model and keep both), per-section comments, or to query into the
analysis at scale, split it out.

See [[database]].

---

## Path-prefix RLS for storage

**Decision:** Storage RLS uses
`(storage.foldername(name))[1] = auth.uid()::text` rather than the
built-in `owner` column.

**Why:** The path itself encodes ownership, so even if `owner` were
unset or wrong (e.g. an upload via a service role) the user could only
ever see files under their own prefix. Defense in depth.

See [[database]].

---

## Server actions, no `app/api/*`

**Decision:** All writes go through server actions; no route handlers.

**Why:** Type-safe end-to-end, no manual JSON serialization, integrates
with `useActionState` for pending/error state, and the case study brief
explicitly recommended this approach.

**When to revisit:** if we need to receive webhooks (e.g. a hosted
transcription provider with async callbacks), expose a public API, or
serve binary uploads with custom auth — those want route handlers.

See [[architecture]].
