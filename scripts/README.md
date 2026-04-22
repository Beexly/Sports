# scripts

## `local.sh` — one-command local bootstrap

Prereqs: **Node 20+**, **npm 10+**, **Docker Desktop running**.

```bash
bash scripts/local.sh            # full: set up + run app + worker
bash scripts/local.sh setup      # set up only (write .env, start Docker, install, migrate, seed)
bash scripts/local.sh run        # run app + worker (assumes setup is done)
bash scripts/local.sh reset      # destructive: wipe Postgres volume and re-setup
```

### What it does (idempotent)
1. Verifies Node / Docker are present and Docker is running
2. Writes `.env` at repo root (with a working local DB URL, freshly-generated `NEXTAUTH_SECRET`, and your `THE_ODDS_API_KEY`) — skipped if `.env` already exists
3. Symlinks `.env` into `apps/web/` and `packages/db/` where Next.js and Prisma auto-load it
4. Starts Postgres + Redis from `docker/docker-compose.yml` and waits for Postgres health
5. Runs `npm install` if `node_modules` is missing
6. Runs `prisma generate`, `prisma db push`, and the seed (sports + leagues)
7. Launches `next dev` on :3000 and the `data-refresh` worker, streaming both logs

`Ctrl-C` cleanly stops both processes.

### After it's running
- App: http://localhost:3000
- Worker logs: `tail -f /tmp/sports-worker.log`
- App logs: `tail -f /tmp/sports-app.log`
- Health: http://localhost:3000/api/health (returns `degraded` until the worker records a successful ingestion run)

### Bootstrap flags
Public-facing APIs (`/api/picks`, `/api/performance`, `/api/picks/daily-slate`) return 503 by design until the bootstrap progression flags in `.env` are flipped on in order. See `.env.example` for the full guide.
