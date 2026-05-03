# Sleak Wiki

Living documentation for this codebase. Each note is focused on one topic and
cross-links to the others Obsidian-style — open this folder as a vault to get
the graph view, or just browse the files in your editor.

## Map

- **[[architecture]]** — system overview, data flow, route layout
- **[[database]]** — schema, RLS, storage bucket, migrations
- **[[auth]]** — sign-in/sign-up, route gating, session helpers
- **[[ai-pipeline]]** — Deepgram transcription + Azure OpenAI analysis
- **[[conversations]]** — upload + list + detail + rename + delete flows
- **[[ui]]** — design system, shadcn components, sidebar shell
- **[[local-setup]]** — prerequisites, env vars, ports, run commands
- **[[decisions]]** — why we made the non-obvious calls
- **[[changelog]]** — what changed and when

## Where to start

- New to the repo? Start with [[architecture]] then [[local-setup]].
- Touching a feature? Read the matching note and update it as part of your PR.
- Made a non-obvious choice? Capture it in [[decisions]].
- Shipped something? Append a [[changelog]] entry.

## House rule

> When you change code, update the doc that describes it **in the same commit**.
> Add a [[changelog]] entry for anything user-visible or architectural.

This rule is also encoded in `CLAUDE.md` so future Claude sessions follow it.
