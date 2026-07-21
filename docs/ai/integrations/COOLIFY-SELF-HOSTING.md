# Coolify: Self-Hosted Infrastructure for Cost Reduction + Credit Leverage

> Source: `coollabsio/coolify` (Apache-2.0, 38k★)
> Purpose: Deploy GSN's background workers, cron jobs, and auxiliary services to a $20/mo Hetzner server — 10-50x cheaper than Vercel serverless for always-on processes, and qualifies for Hetzner Cloud startup credits

## What This Solves

GSN's architecture has two tiers of compute:
1. **Request-response routes** (Next.js pages, API routes) → Vercel is the right choice
2. **Always-on processes** (BullMQ workers, cron jobs, Mastra agent runners) → Vercel is the wrong choice

Vercel is optimized for functions that run for 0-60 seconds. A BullMQ worker that runs 24/7 processing pick jobs doesn't fit that model — it requires a persistent process. Currently this runs... somewhere. Coolify manages it properly.

**Cost comparison for 1 BullMQ worker process:**
- Vercel Pro dedicated function: ~$20-40/month
- Railway worker: ~$10-20/month
- Hetzner CX21 server (2 vCPU, 4GB RAM, 40GB SSD): **€4.55/month** ($5/month)

One $5/month Hetzner server can run:
- `workers/pick-generation` (BullMQ worker)
- `workers/settlement` (result settlement worker)
- Redis (replaces Upstash for worker-internal queuing — Upstash still needed for Edge)
- ElectricSQL service (real-time Postgres sync sidecar)
- Mastra agent playground (`npx mastra dev`)
- n8n self-hosted instance

Coolify is the dashboard that manages deployments, SSL, Docker containers, and environment variables on any VPS — including Hetzner, which has a startup program.

## What This Does NOT Duplicate

| Tool | Role |
|---|---|
| Vercel | Next.js app (SSR, API routes, Edge functions) — keep |
| Trigger.dev | Serverless background jobs (60-min max, no persistent process) |
| Upstash QStash | HTTP job queue for Vercel Edge — keep |
| **Coolify on Hetzner** | **Always-on worker processes, Redis, ElectricSQL, n8n, Mastra** |

Coolify doesn't replace Vercel for the Next.js app. It replaces Railway/Render/Fly.io for the worker tier.

## Hetzner Cloud + Startup Program

Hetzner Cloud is Europe's leading cloud provider with US-east and US-west regions. It's dramatically cheaper than AWS/GCP/Azure:

| | Hetzner | AWS EC2 | Fly.io |
|---|---|---|---|
| 2 vCPU, 4GB RAM | €4.55/mo | ~$34/mo | ~$20/mo |
| 4 vCPU, 8GB RAM | €8.21/mo | ~$66/mo | ~$38/mo |
| Traffic (20TB) | €0 | $1,800 | $200 |
| Backups | €0.91/mo | $5/mo | $5/mo |

**Hetzner is 6-15x cheaper than AWS for equivalent compute.**

**Hetzner for Startups:** Not a formal program but Hetzner is part of Techstars, Y Combinator, and European accelerator ecosystems. Many accelerators provide Hetzner credits. Also: Hetzner's free tier (5 "robot" servers) for qualified open-source projects.

## Installation (Local Dev Preview)

```bash
# Coolify runs on Docker — preview locally:
docker run -d \
  --name coolify \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v coolify_data:/data \
  coollabsio/coolify:latest
# → Access at http://localhost:8000
```

**Production install (one-time, on your Hetzner server):**
```bash
# SSH into Hetzner CX21 ($5/mo):
ssh root@your-hetzner-ip

# Install Coolify (Docker-based):
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
# → Coolify dashboard at http://your-ip:8000 or https://coolify.your-domain.com
```

## GSN Use Case 1: BullMQ Worker Deployment

Deploy `workers/pick-generation` to Hetzner via Coolify with zero manual Docker knowledge:

**`workers/pick-generation/Dockerfile`**:

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app

# Install workspace dependencies
COPY package*.json .
COPY turbo.json .
COPY packages/ packages/
COPY workers/ workers/
RUN npm ci --workspace=workers/pick-generation

# Build
RUN npm run build --workspace=workers/pick-generation

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/workers/pick-generation/dist ./workers/pick-generation/dist
COPY --from=base /app/packages ./packages

ENV NODE_ENV=production
CMD ["node", "workers/pick-generation/dist/index.js"]
```

In Coolify:
1. Connect GitHub repo → Coolify auto-detects Dockerfile
2. Set environment variables (DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, etc.)
3. Click Deploy → Coolify builds, runs, and monitors the container
4. Enable "Auto-deploy on push to main" → zero manual deploys

## GSN Use Case 2: Redis on Hetzner (BullMQ's TCP Redis)

Upstash handles Edge-compatible HTTP Redis. BullMQ needs TCP Redis. Run it yourself on Hetzner:

In Coolify:
1. New Resource → Service → Redis
2. Set password
3. Internal URL: `redis://redis:6379` (Docker network)
4. External URL: `redis://:password@your-hetzner-ip:6379`

Update `workers/pick-generation` env:
```bash
REDIS_URL=redis://:your-password@your-hetzner-ip:6379
```

Cost: $0 additional (runs on the same $5/mo server alongside the worker).

## GSN Use Case 3: ElectricSQL on Hetzner

The ElectricSQL service (CDC from Postgres → HTTP Shape log) runs as a long-lived Docker container. Coolify manages it:

In Coolify → New Resource → Docker Compose:

```yaml
services:
  electric:
    image: electricsql/electric:latest
    environment:
      DATABASE_URL: "postgresql://user:pass@your-neon-host/sports?sslmode=require"
      DATABASE_USE_IPV6: "false"
    ports:
      - "3000:3000"
    restart: unless-stopped
```

Set `NEXT_PUBLIC_ELECTRIC_URL=https://electric.your-domain.com` in Vercel.
Add `electric.your-domain.com` as a domain in Coolify → auto-SSL via Let's Encrypt.

## GSN Use Case 4: n8n Self-Hosted on Hetzner

n8n runs permanently on the same Hetzner server, managed by Coolify:

In Coolify → New Resource → One-Click Deploy → n8n:
- Coolify ships n8n as a one-click service
- Sets up PostgreSQL or SQLite backend automatically
- Adds SSL domain automatically
- All n8n workflows persist in the container volume

This is significantly cheaper than n8n Cloud (~$20/month) — included in the $5/month Hetzner server.

## GSN Use Case 5: Mastra Playground

Run `npx mastra dev` as a persistent service for visualizing pick workflows:

```dockerfile
# cloudflare/workers/mastra-playground/Dockerfile
FROM node:22-alpine
WORKDIR /app
COPY packages/ai/ packages/ai/
RUN cd packages/ai && npm install @mastra/core @mastra/memory
EXPOSE 4111
CMD ["npx", "mastra", "dev", "--port", "4111", "--dir", "packages/ai/src"]
```

In Coolify: deploy to port 4111, add `mastra.your-domain.com` domain with basic auth (password protect — not public).

## Resource Planning: One Hetzner Server

A single Hetzner CX31 (4 vCPU, 8GB RAM, 80GB SSD, €14.64/mo) can run:

| Service | RAM | CPU |
|---|---|---|
| BullMQ pick-generation worker | 256MB | 0.2 vCPU |
| BullMQ settlement worker | 128MB | 0.1 vCPU |
| Redis | 512MB | 0.1 vCPU |
| ElectricSQL | 512MB | 0.2 vCPU |
| n8n | 512MB | 0.2 vCPU |
| Mastra playground | 256MB | 0.1 vCPU |
| **Total** | **~2.2GB** | **~1 vCPU** |

Headroom: 5.8GB RAM, 3 vCPU remaining for growth. Total cost: **€14.64/month** vs equivalent Railway/Render infrastructure at ~$80-120/month.

## Coolify Features

- **Auto-deploy**: git push → Coolify rebuilds and deploys automatically
- **SSL**: Let's Encrypt certificates auto-renewed for all services
- **Health checks**: Restart containers on crash
- **Environment variables**: Managed per-service, never in git
- **Logs**: Tail container logs in browser
- **Resource monitoring**: CPU/memory/network graphs
- **Backups**: Automated volume backups to S3/R2
- **Preview environments**: Create a staging server from a PR branch

## Domain Setup

All services on one Hetzner server with one domain:

```
coolify.your-domain.com   → Coolify dashboard (password protected)
electric.your-domain.com  → ElectricSQL HTTP endpoint
mastra.your-domain.com    → Mastra playground (password protected)
n8n.your-domain.com       → n8n workflows dashboard (password protected)
```

Set these as A records pointing to your Hetzner server IP.
Coolify handles SSL for all of them automatically.

## Environment Variables

```bash
# On Hetzner server (set in Coolify per-service):
DATABASE_URL=postgresql://...neon.tech/sports     # Same Neon DB as Vercel
REDIS_URL=redis://:password@localhost:6379         # Local Redis
ANTHROPIC_API_KEY=...
LITELLM_URL=http://localhost:4000                  # If running LiteLLM on same server
AGENTOPS_API_KEY=...
TRIGGER_SECRET_KEY=...
```

## Migration Path (Zero-Downtime)

1. Start with ElectricSQL (stateless, easy to migrate back)
2. Add Redis (workers still connect to Upstash until Hetzner Redis is stable)
3. Migrate BullMQ workers one at a time
4. Add n8n, Mastra
5. Decommission Railway/Render if currently used

## Status

- [ ] Sign up at `hetzner.com/cloud` → create CX21 server (€4.55/mo, EU or US region)
- [ ] SSH in → run Coolify install: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`
- [ ] Access Coolify at `http://server-ip:8000` → complete setup wizard
- [ ] Connect GitHub repo (`beexly/Sports`) in Coolify → enable auto-deploy
- [ ] Deploy Redis via Coolify one-click service
- [ ] Add `Dockerfile` to `workers/pick-generation/` (see above)
- [ ] Deploy pick-generation worker in Coolify → set env vars
- [ ] Deploy ElectricSQL via Coolify Docker Compose
- [ ] Add `electric.your-domain.com` A record → Coolify domain → SSL auto-provisioned
- [ ] Update `NEXT_PUBLIC_ELECTRIC_URL` in Vercel to point to Hetzner ElectricSQL
- [ ] Deploy n8n one-click service in Coolify
- [ ] Migrate n8n workflows from localhost to Hetzner n8n
- [ ] Verify: pick-generation worker processes jobs from Upstash QStash
- [ ] Monitor: Coolify health checks alert on container crashes
