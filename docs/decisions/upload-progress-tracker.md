# Upload-progress tracker

**What:** a tiny module-level singleton (`lib/uploads/upload-tracker.ts`)
backed by `useSyncExternalStore`. The upload dialog publishes
byte-level progress on every `xhr.upload.onprogress` event; any client
component on the same tab can subscribe via
`useUploadProgress(conversationId)`. Used by the detail page's
`ProcessingPanel` to show the same upload progress when the user
navigates there mid-upload.

**Why:**

- Real upload progress only exists in the browser doing the upload —
  the server never sees the bytes (they go straight to Storage via
  signed URL). Pushing progress through Realtime would require chatty
  100ms round-trips for no benefit beyond cross-tab sync.
- A module-level Map + `useSyncExternalStore` is ~30 lines, survives
  client-side navigation in the same tab, and adds no server surface.

**Cost:** per-tab only. Other tabs see status='pending' fallback text
("Recording uploaded — getting things ready…") instead of byte progress.
A hard reload mid-upload loses the display (and cancels the XHR
anyway).

**See also:** [[upload]], [[ui]], [[direct-upload]].
