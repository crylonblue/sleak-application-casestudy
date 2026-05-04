# CLAUDE.md

Project-specific conventions for any AI assistant working in this repo.

## Documentation lives in `docs/`

Small Obsidian-style wiki — start at `docs/README.md` (the Map of
Content). Cross-links use `[[note-name]]`; Obsidian resolves them
regardless of folder.

Layout:

```
docs/
  README.md            map of content
  changelog.md         tight log of shipped changes
  architecture.md      system overview
  database.md          schema, RLS, realtime publication
  ai-pipeline.md       Deepgram + Azure OpenAI + feedback schema
  auth.md              auth pages, session helpers, RLS gate
  ui.md                design system + key primitives + playback store
  local-setup.md       env, ports, commands
  features/            user-visible features (one note each)
    upload.md
    playback.md
    segments.md
    transcript.md
  decisions/           non-obvious choices (one note each, terse)
```

## House rule: keep the wiki in sync

> **When you change code, update the matching note in the same commit.
> Add a `docs/changelog.md` line for anything user-visible. Capture
> non-obvious choices as a new file in `docs/decisions/`.**

Mapping (keep this current):

| If you change… | Update |
|---|---|
| `supabase/migrations/*` or schema-related code | `docs/database.md` |
| `app/auth/*`, `lib/data-access/auth.ts`, `lib/supabase/*` | `docs/auth.md` |
| `app/(app)/profile/*`, `lib/data-access/profile.ts` | `docs/features/profile.md` |
| `lib/ai/*` (Deepgram, Azure OpenAI, feedback schema) | `docs/ai-pipeline.md` |
| `app/(app)/conversations/*`, upload flow / dialog / actions | `docs/features/upload.md` |
| `components/playback/*`, recording player / scrubber | `docs/features/playback.md` |
| Per-segment cards, segment-aware UI | `docs/features/segments.md` |
| Transcript view, click-to-seek, karaoke | `docs/features/transcript.md` |
| `components/ui/*`, `app/globals.css`, `components.json` | `docs/ui.md` |
| `supabase/config.toml`, ports, env vars, dev commands | `docs/local-setup.md` |
| Route layout, server-action vs route-handler split, big patterns | `docs/architecture.md` |
| Made a non-obvious call? | new file in `docs/decisions/` |

If a change crosses files, update each affected note. If a new area
appears that doesn't fit any note, create one and link it from
`docs/README.md`.

## Other conventions

- Use **pnpm** (this project pins to it).
- Local Supabase runs on ports `54441-54449` — see `docs/local-setup.md`.
  Don't reset to defaults without checking for collisions with other
  local Supabase projects.
- Server actions for writes; no `app/api/*` route handlers unless
  there's a specific reason (webhooks, binary streaming).
- All authenticated pages live under the `(app)` route group; the
  sidebar belongs there only.
- RLS is the real authorization boundary — every new table needs RLS
  policies, not just a layout-level guard.
- `.env` is gitignored; never commit secrets. Update `.env.example`
  when adding new env vars.
