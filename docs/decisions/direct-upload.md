# Direct upload via signed URL

**What:** the browser PUTs audio bytes directly to Supabase Storage via
a one-time-use signed upload URL. Audio never flows through the Next.js
Server Action runtime.

**Why:**

- Real progress UX — `xhr.upload.onprogress` gives byte-level events.
  Server Actions over `fetch` don't expose upload progress at all.
- No more body-cap whack-a-mole. Audio bytes never hit Server Action
  body limits, so future Next runtime caps can't silently truncate.
- This is the same pattern Vercel recommends for "large uploads" —
  serverless Server Actions cap bodies (Hobby 4.5 MB) regardless of
  config.

**Cost:**

- Three round-trips (`prepareUpload` → bytes → `finalizeUpload`) instead
  of one. Both wrappers are tiny JSON calls.
- Orphan rows possible between `prepareUpload` and `finalizeUpload` if
  the user closes the tab mid-upload. Realtime makes them visible in
  the list — manual delete works, periodic sweep is the long-term fix.

**See also:** [[upload]], [[body-size-limits]], [[storage-rls]].
