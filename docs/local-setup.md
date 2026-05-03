# Local setup

## Prerequisites

- **Node 20+** + **pnpm** (this project pins to pnpm)
- **Docker Desktop** running (Supabase CLI uses it)
- **Supabase CLI** (`brew install supabase/tap/supabase`)

## First-time

```bash
pnpm install
supabase start          # boots Docker stack, prints credentials
cp .env.example .env    # then fill in values (see below)
pnpm dev                # http://localhost:3000 by default
```

## Env vars

| Var | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase status` → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `supabase status` → Publishable |
| `AZURE_OPENAI_API_INSTANCE_NAME` | Azure resource name |
| `AZURE_OPENAI_API_DEPLOYMENT_NAME` | Model deployment under that resource |
| `AZURE_OPENAI_API_VERSION` | `2024-05-01-preview` works |
| `AZURE_OPENAI_API_KEY` | Azure portal → Keys |
| `DEEPGRAM_API_KEY` | Deepgram dashboard |

`.env` is gitignored; `.env.example` is the template.

## Ports

This project uses **non-default Supabase ports** so it can coexist with
other local Supabase projects on the same machine — pinned in
`supabase/config.toml`.

| Service | Port |
|---|---|
| Kong / API gateway | `54441` |
| Postgres | `54442` |
| Postgres shadow | `54440` |
| Studio | `54443` |
| Mailpit | `54444` |
| Analytics | `54447` |
| Pooler | `54449` |

Don't reset to defaults without checking for collisions.

## Email confirmations are off locally

`enable_confirmations = false` in `config.toml`'s email auth block. Lets
sign-ups produce an immediate session in dev. **Flip it on (and add a
confirm-callback route) before deploying to hosted Supabase.**

## Common commands

```bash
supabase start | stop | status
supabase db reset                # rebuild from migrations (destructive)
supabase migration new <name>
supabase migration up

pnpm dev                         # next dev (turbopack)
pnpm build && pnpm start         # production
pnpm lint                        # eslint
pnpm exec tsc --noEmit           # type check
```

## Studio

Local Studio at <http://127.0.0.1:54443> — table editor, SQL editor,
auth user list. No password locally.
