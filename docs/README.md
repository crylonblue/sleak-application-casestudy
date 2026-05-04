# Sleak Wiki

Living documentation. Notes are small and cross-link Obsidian-style with
`[[note-name]]`. Open the folder as a vault for the graph view.

## How to read this

- **Start here** if you're new: [[architecture]] → [[local-setup]].
- **Looking for a feature?** Open the matching note in `features/`.
- **Wondering why X works that way?** Find the rationale in `decisions/`.
- **Track shipped changes** in [[changelog]].

## Map

### System

- [[architecture]] — system overview, route map, authorization boundary
- [[database]] — schema, RLS, realtime publication
- [[auth]] — sign-in/up, session helpers
- [[ai-pipeline]] — Deepgram + Azure OpenAI, feedback schema
- [[ui]] — design system, key primitives, playback store
- [[local-setup]] — env, ports, commands

### Features

- [[upload]] — dropzone, signed-URL upload, sticky progress toast
- [[playback]] — custom player and merged segment scrubber
- [[segments]] — per-segment AI feedback (accordion)
- [[transcript]] — interactive transcript with karaoke + click-to-seek
- [[profile]] — user profile (full name, company)

### Decisions

See `decisions/` for one-decision-per-file notes. Common entry points:

- [[direct-upload]], [[background-pipeline]], [[ai-title]] — the upload + analysis story
- [[storage-shape]], [[structured-output]] — data + AI-output choices
- [[storage-rls]], [[route-group-auth]], [[server-actions-only]] — security + routing

## House rule

> When you change code, update the matching note **in the same commit**.
> Add a [[changelog]] entry for anything user-visible. Capture
> non-obvious choices as a new note in `decisions/`.

This is also encoded in the project root `CLAUDE.md`.
