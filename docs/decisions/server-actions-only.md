# Server actions, no `app/api/*`

**What:** all writes go through Server Actions
(`signIn` / `signUp` / `signOut`, `prepareUpload` / `finalizeUpload`
/ `cancelUpload`, `renameConversation`, `deleteConversation`). No
route handlers exist.

**Why:** type-safe end-to-end, no manual JSON serialization,
integrates with `useActionState`, and the case study brief explicitly
recommended this approach.

**When to revisit:** if we need to receive webhooks, expose a public
API, or stream large binary responses with custom auth.

**See also:** [[architecture]].
