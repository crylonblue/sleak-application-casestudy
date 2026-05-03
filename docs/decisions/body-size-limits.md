# Body size limits

**What:** Next.js 16 has *two* request-body caps in front of a Server
Action, both raised to `100mb` in `next.config.ts` under
`experimental`:

```ts
experimental: {
  proxyClientMaxBodySize: '100mb',  // proxy/middleware buffer (default 10 MB)
  serverActions: { bodySizeLimit: '100mb' },  // Server Action body (default 1 MB)
}
```

**Gotchas (history we don't want to repeat):**

- Both keys must live under `experimental`. Next 16's type defs expose
  them at the top of `NextConfig` too, but the runtime config schema
  rejects that placement with "Unrecognized key in object" and the cap
  stays at default. This caused real upload failures.
- The deprecated alias `middlewareClientMaxBodySize` is also accepted
  but emits a deprecation warning.
- Below the proxy cap, requests fail with "Unexpected end of form"
  (multipart truncation). Below the action cap, requests fail with
  "Body exceeded 1 MB limit".

**Now:** these caps don't actually matter for audio uploads anymore,
because [[direct-upload]] sends bytes straight to Supabase Storage. The
configuration is kept in case any future Server Action ever receives
larger-than-default payloads.

**See also:** [[upload]], [[direct-upload]].
