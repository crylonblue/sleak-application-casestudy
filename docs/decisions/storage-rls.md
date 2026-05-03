# Storage path-prefix RLS

**What:** the `recordings` bucket's RLS policies use

```
(storage.foldername(name))[1] = auth.uid()::text
```

rather than the built-in `owner` column. Path convention is
`<user_id>/<conversation_id>.<ext>`.

**Why:** the path itself encodes ownership. Even if `owner` were unset
or wrong (e.g. an upload happened via a service role), the user could
only ever read/write under their own prefix. Defense in depth.

**See also:** [[database]], [[direct-upload]].
