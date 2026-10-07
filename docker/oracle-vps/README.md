# Oracle Cloud Always-Free VPS — deploy runbook

Stand up the $0 self-host box: self-hosted **henrygd** (no rate cap), **Redis**,
**Ollama** for the internal-LLM tier, behind **Caddy** auto-TLS. Everything here is free.

> **Redis here is unused capacity, not a queue.** `bullmq` is installed nowhere in this
> repo and no application code reads `REDIS_URL`. Do not describe the platform as
> queue-backed. See `workers/README.md`.

> Honest flags (from the leverage audit): Oracle Always-Free signup needs a real credit card
> + ID, and idle ARM instances have been reclaimed historically — keep it busy / pin your
> home region. Supabase free pauses after 7 days idle and has no backups; for prod, self-host
> Postgres here too.

## 1. Create the VPS (owner)
1. Sign up at https://www.oracle.com/cloud/free/ (real CC + ID required; not charged).
2. Create an **Always Free** Ampere ARM instance (up to 4 OCPU / 24 GB), Ubuntu LTS.
3. Open ports 80 + 443 in the instance's security list / firewall (and 22 for SSH).
4. Point DNS A records `ncaa.<domain>` and `llm.<domain>` at the instance's public IP.

## 2. Install Docker (on the VPS)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

## 3. Deploy the stack
```bash
git clone <this-repo> && cd <repo>/docker/oracle-vps
cp .env.example .env && nano .env        # set DOMAIN, REDIS_PASSWORD, LLM_BASICAUTH_HASH
docker compose -f compose.yml up -d
docker exec sports_ollama ollama pull llama3.1   # or a smaller model for ARM
```
Caddy fetches TLS certs automatically. Verify: `curl https://ncaa.<domain>/rankings/football/fbs/associated-press`.

## 4. Point the app (Vercel env) at the box
```
HENRYGD_NCAA_BASE_URL=https://ncaa.<domain>
# Internal-LLM tier (see OWNER_ACTION_ITEMS A1). Either:
#  - this box's Ollama:  INTERNAL_LLM_BASE_URL=https://llm.<domain>/v1  + INTERNAL_LLM_MODEL=llama3.1
#  - or Groq free tier:  INTERNAL_LLM_BASE_URL=https://api.groq.com/openai/v1 + key
```

## 5. (Optional, and currently broken) Run the standalone workers here too
The three `worker-*` services in `compose.yml` are already declared, not commented out, and
their Dockerfiles already exist under `workers/<name>/Dockerfile`. Put `DATABASE_URL` +
`REDIS_URL=redis://:<pass>@redis:6379` in `.env` and `compose up -d`.

> **They will not start as written.** Every worker `CMD` is
> `npx ts-node --esm src/index.ts`, which fails on Node 20 with
> `ERR_UNKNOWN_FILE_EXTENSION`, and the `data-refresh` deps stage never copies
> `packages/stats-api/package.json` despite `@sports/stats-api` being a declared
> dependency. These are also not queue consumers: `pick-generation` and
> `content-publishing` are run-once stubs and `data-refresh` is a `setTimeout`
> loop whose work is already covered by `/api/cron/refresh-odds` and
> `/api/cron/settle-picks`. Read `workers/README.md` before spending time here.

## What this saves
Managed Redis (Upstash) + a paid VPS + the henrygd rate cap + paid LLM inference for internal
work → all $0 on one Always-Free box.
