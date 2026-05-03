# CLAUDE.md

Project-specific conventions for any AI assistant working in this repo.

## Documentation lives in `docs/`

This repo has a small Obsidian-style wiki under `docs/` — start at
`docs/README.md`. Cross-links use `[[note-name]]` (resolves to
`note-name.md` in the same folder).

## House rule: keep the wiki in sync

> **When you change code, update the matching `docs/*.md` note in the
> same commit. For anything user-visible or architectural, also add a
> `docs/changelog.md` entry.**

Mapping (keep this current):

| If you change… | Update |
|---|---|
| `supabase/migrations/*` or schema-related code | `docs/database.md` |
| `app/auth/*`, `lib/data-access/auth.ts`, `lib/supabase/*` | `docs/auth.md` |
| `lib/ai/*` (Deepgram, Azure OpenAI, feedback schema) | `docs/ai-pipeline.md` |
| `app/(app)/conversations/*` | `docs/conversations.md` |
| `components/*`, `app/globals.css`, `components.json` | `docs/ui.md` |
| `supabase/config.toml`, ports, env vars, dev commands | `docs/local-setup.md` |
| Route layout, server-action vs route-handler split, big patterns | `docs/architecture.md` |
| Made a non-obvious call? | `docs/decisions.md` |

If a change crosses files, update each affected note. If a new area
appears that doesn't fit any note, create a new one and link it from
`docs/README.md`.

## Other conventions

- Use **pnpm** (this project pins to it).
- Local Supabase runs on ports `54441-54449` — see `docs/local-setup.md`.
  Don't reset to defaults without checking for collisions with the user's
  other Supabase projects.
- Server actions for writes; no `app/api/*` route handlers unless there's
  a specific reason (webhooks, binary streaming) — see
  `docs/decisions.md`.
- All authenticated pages live under the `(app)` route group; the
  sidebar belongs there only.
- RLS is the real authorization boundary — every new table needs RLS
  policies, not just a layout-level guard.
- `.env` is gitignored; never commit secrets. Update `.env.example` when
  adding new env vars.
