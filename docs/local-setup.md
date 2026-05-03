# Local setup

## Prerequisites

- **Node 20+** and **pnpm** (this project pins to pnpm)
- **Docker Desktop** running — Supabase CLI uses it
- **Supabase CLI** (`brew install supabase/tap/supabase`)

## First-time install

```bash
pnpm install
supabase start          # boots Docker stack, prints credentials
cp .env.example .env    # then fill in values (see below)
pnpm dev                # http://localhost:3000 by default
```

If you already have other Supabase projects running locally, port collisions
will move this project around — see [[#ports]].

## Env vars (`.env`)

| Var | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase status` → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `supabase status` → Publishable |
| `AZURE_OPENAI_API_INSTANCE_NAME` | Azure portal — the resource name (e.g. `sleak-ai-assessment-resource`) |
| `AZURE_OPENAI_API_DEPLOYMENT_NAME` | The model deployment under that resource (e.g. `sleak-gpt-4.1-assessment`) |
| `AZURE_OPENAI_API_VERSION` | `2024-05-01-preview` works |
| `AZURE_OPENAI_API_KEY` | Azure portal → resource → Keys |
| `DEEPGRAM_API_KEY` | Deepgram dashboard |

`.env` is gitignored; `.env.example` is the template that ships in the repo.

## Ports

This project intentionally uses **non-default Supabase ports** so it can
coexist with other local Supabase projects (see [[decisions]]):

| Service | Port |
|---|---|
| Kong / API Gateway | `54441` |
| Postgres | `54442` |
| Postgres shadow (db diff) | `54440` |
| Studio | `54443` |
| Mailpit (inbucket) | `54444` |
| Analytics | `54447` |
| Pooler | `54449` |

These are pinned in `supabase/config.toml`. If you need to move them, edit
that file and bounce the stack with `supabase stop && supabase start`.

Next.js dev defaults to `3000` but auto-shifts if it's busy — common spot
in this dev environment is `3010`.

## Common commands

```bash
# Stack
supabase start              # boot
supabase stop               # shut down (state preserved)
supabase status             # show URLs + keys
supabase db reset           # rebuild DB from migrations (destructive!)

# Migrations
supabase migration new <name>   # create a new migration file
supabase migration up           # apply pending migrations

# App
pnpm dev                    # next dev (turbopack)
pnpm build && pnpm start    # production build
pnpm lint                   # eslint
pnpm exec tsc --noEmit      # type check
```

## Studio

Local Studio: <http://127.0.0.1:54443> — table editor, SQL editor, auth user
list. No password locally.

## Mailpit

If you ever flip on email confirmations ([[auth]]), Mailpit captures the
outgoing emails at <http://127.0.0.1:54444>.

## See also

- [[architecture]] — how the pieces fit together
- [[database]] — what gets created on `db reset`
- [[auth]] — env vars used by Supabase clients
