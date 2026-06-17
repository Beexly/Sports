# Owner Action Items — what needs YOU (accounts, keys, deploys)

Everything I can ship in code is shipped + tested. This is the running list of things that
require *you* (signups, API keys, env vars, deploys) to actually switch the leverage on.
Each item says: what, why, exact steps, and which code is already waiting for it.

Status legend: ⬜ not started · 🔧 code done, env/deploy step remaining · ✅ fully live.

---

## A. Cut the Claude bill (#1 — fully done ✅)

✅ **A2 — Model-router haiku flips shipped** (`calibration-insight` + `brief` → Haiku, 66.7% saving).
Already committed and pushed. No action needed.

✅ **A1 — Groq env vars set in Vercel** (internal-LLM tier live).
`INTERNAL_LLM_BASE_URL`, `INTERNAL_LLM_MODEL`, and `INTERNAL_LLM_API_KEY` are all live in
Vercel (Production + Preview). Code in `lib/claude-api/internal-llm.ts` is active.

> ⚠️ **F5 still applies**: if the Groq key was ever in public git history before the
> force-push, rotate it at https://console.groq.com → API Keys and update
> `INTERNAL_LLM_API_KEY` in Vercel.

Economics: Groq Llama-3.3-70B ≈ $0.59/$0.79 per Mtok vs Claude Sonnet $3/$15 → ~85% cheaper;
Groq free tier makes internal classification/normalisation work $0.

---

## B. Reduce Odds-API dependence — free EPL data (#2 — adapter shipped, GATED)

✅ **B1 — FPL/PL terms reviewed; adapter gated permanently (for now).**
PL Terms of Use explicitly prohibit commercial use, database creation, and redistribution
without prior written approval. UK database right (sui generis) covers even factual compilations.
`fpl-api` registered as `permission_required` in `source-rights-registry.ts`.

**To ungate:** email `info@premierleague.com` for written permission, or switch to a licensed
alternative (football-data.org has a free non-commercial tier and paid commercial plans).
Until then, adapter stays gated — no ingestion, no public display.

---

## C. SEO flywheel (#3 — shipped, 2 commits queued to push)

✅ **C1 — `/preview/[sport]/[slug]` pages + sitemap extension shipped.**
- `apps/web/app/preview/[sport]/[slug]/page.tsx` — DB-backed matchup preview pages with
  metadata + JSON-LD structured data. Graceful 404 (never 500) if DB is down.
- `apps/web/app/sitemap.ts` — extended to enumerate up to 2,000 game URLs at
  `changeFrequency: "hourly"`. DB-safe at build time.

All commits pushed to `claude/happy-euler-trkihe`. Preview build is READY. No local action needed.
See **G below** to ship these changes to production.

---

## D. $0 infra on Oracle Cloud (#4 — fully turnkey now)

🔧 **D1 — Create the Oracle Always-Free VPS + run deploy.sh.**

Worker Dockerfiles + `deploy.sh` are now shipped. The stack is genuinely one-command-ready.

### Exact steps:

**1. Create the VPS** — sign up at https://www.oracle.com/cloud/free/
   - Real CC + government ID required (not charged for Always-Free tier)
   - Create an **Always-Free Ampere A1** instance: Ubuntu 22.04, 4 OCPU, 24 GB RAM
   - Open ports **80**, **443**, **22** in the instance's security list
   - Note the **public IP address**

**2. DNS** — in your domain registrar (or Cloudflare), add two A records:
   - `ncaa.galaxysportsedge.com` → `<VPS public IP>`
   - `llm.galaxysportsedge.com` → `<VPS public IP>`

**3. SSH into the box and run:**
```bash
git clone https://github.com/beexly/sports.git
cd sports/docker/oracle-vps
cp .env.example .env
nano .env   # set DOMAIN, REDIS_PASSWORD, LLM_BASICAUTH_HASH
# Generate LLM_BASICAUTH_HASH: docker run --rm caddy:2-alpine caddy hash-password --plaintext 'yourpass'
bash deploy.sh
```

`deploy.sh` auto-installs Docker if needed, validates `.env`, builds + starts all services,
pulls the Ollama model, and prints verification instructions.

**4. Set Vercel env vars** (after the box is up):
```bash
vercel env add HENRYGD_NCAA_BASE_URL production
# paste: https://ncaa.galaxysportsedge.com

# Optional: switch internal LLM from Groq to this box's Ollama ($0):
vercel env add INTERNAL_LLM_BASE_URL production
# paste: https://llm.galaxysportsedge.com/v1
vercel env add INTERNAL_LLM_MODEL production
# paste: llama3.2
```

**5. To run BullMQ workers on the box** (saves any managed queue cost):
   Add `DATABASE_URL` + `DIRECT_URL` + `ANTHROPIC_API_KEY` + `THE_ODDS_API_KEY` to `.env`,
   then: `docker compose -f compose.yml up -d worker-data-refresh worker-pick-generation worker-content-publishing`

Saves: managed Redis + paid VPS + henrygd rate cap + paid internal inference → all $0.

---

## E. Free analytics (#5 — snippet live, tokens pending)

🔧 **E1 — Cloudflare Web Analytics + Microsoft Clarity tokens needed.**
The snippet is already wired in `apps/web/app/layout.tsx` (gated behind
`NEXT_PUBLIC_ANALYTICS_ENABLED`). Two signups + env vars:

**Cloudflare Web Analytics** (cookieless, no consent banner needed):
1. Go to https://dash.cloudflare.com → Web Analytics → Add a site
2. Enter `galaxysportsedge.com` → copy the **beacon token** (32-char hex)
3. `vercel env add NEXT_PUBLIC_CF_BEACON_TOKEN production` → paste token

**Microsoft Clarity** (heatmaps + session recordings, free):
1. Go to https://clarity.microsoft.com → New project → enter site URL
2. Copy the **project ID** (e.g. `abc123xyz`)
3. `vercel env add NEXT_PUBLIC_CLARITY_PROJECT_ID production` → paste ID

**Then activate:**
```bash
vercel env add NEXT_PUBLIC_ANALYTICS_ENABLED production
# paste: true
```

Redeploy. Both tools load only in production (env gate).

---

---

## F. Security env vars — all set ✅

✅ **F1 — CRON_SECRET confirmed live in Vercel** (Production + Preview, set 27+ days ago).
All `/api/cron/*` routes validate `Authorization: Bearer <CRON_SECRET>`. Vercel injects this
automatically on each cron invocation. No action needed.

✅ **F2 — ADMIN_EMAILS set in Vercel** (Production, set 2026-06-16).
Value: `baxley.garrett@gmail.com`. Anyone on this list who signs in via Google OAuth is
automatically elevated to ADMIN at session time. No DB write required. No action needed.
To add more admins: `vercel env add ADMIN_EMAILS production --force` → paste comma-separated list.

✅ **F3 — Open redirect in `/auth/signin` fixed** (shipped in commit `628ea04d`).
`callbackUrl` is now sanitised via `safeCallbackUrl()` — rejects absolute URLs and
protocol-relative URLs (`//evil.com`), accepts only same-origin relative paths (`/dashboard`).
No action needed.

✅ **F4 — `/cockpit` added to middleware `PROTECTED_ROUTES`** (shipped in commit `628ea04d`).
Unauthenticated visitors are now redirected to `/auth/signin?callbackUrl=/cockpit` at the
middleware layer. No action needed.

🔧 **F5 — Rotate the Groq API key**.
A previous commit briefly contained the Groq API key before it was force-pushed out of history.
If that key was ever in a public or shared remote, rotate it at https://console.groq.com → API Keys.
Then update `INTERNAL_LLM_API_KEY` in Vercel.

---

## G. 🚀 Merge branch → main — ✅ SHIPPED 2026-06-16

**Done.** Branch `claude/happy-euler-trkihe` was merged into `main` (commit `98509b84`)
and the Vercel production deploy triggered automatically.

**What shipped:**
- Security fixes (open redirect sanitization, /cockpit middleware gate)
- `/preview/[sport]/[slug]` SEO pages + sitemap extension
- Groq internal-LLM tier (85% cost reduction on classifications)
- Model-router Haiku flips (66.7% saving on light Claude tasks)
- Analytics wiring (Cloudflare + Clarity — activate via env vars, see E1)
- Oracle VPS worker Dockerfiles + deploy.sh (see D1)
- Full TypeScript strict compliance (0 errors)
- 60+ CI/security/quality improvements

**Deployment:** `dpl_4ViioS71A7FKTnMSn53y2cALe9U6` → https://galaxysportsedge.com
**Vercel inspect:** https://vercel.com/pick-pilot-s-projects/sports-web/4ViioS71A7FKTnMSn53y2cALe9U6

---

### Quick status board
| # | Item | Code | Env/Deploy | Status |
|---|------|------|-----------|--------|
| 0 | Push all commits to branch | ✅ pushed | ✅ | ✅ done |
| A1 | Groq env vars in Vercel | ✅ wired | ✅ set (5h ago) | ✅ done |
| A2 | Model-router haiku flips | ✅ committed | n/a | ✅ done |
| B1 | FPL terms → EPL adapter | ✅ gated | n/a | ✅ done (gated) |
| C1 | `/preview` pages + sitemap | ✅ committed | n/a | ✅ done |
| D1 | Oracle VPS | ✅ deploy.sh ready | 🔧 needs VPS signup | Owner action |
| E1 | Analytics snippet | ✅ layout.tsx wired | 🔧 needs CF+Clarity signup | Owner action |
| F1 | CRON_SECRET | ✅ cron routes gate on it | ✅ set in Vercel (27d ago) | ✅ done |
| F2 | ADMIN_EMAILS | ✅ auth.ts elevates on it | ✅ `baxley.garrett@gmail.com` | ✅ done |
| F3 | Open redirect fix | ✅ `628ea04d` | n/a | ✅ done |
| F4 | /cockpit middleware gate | ✅ `628ea04d` | n/a | ✅ done |
| F5 | Rotate Groq key | n/a | 🔧 rotate if key was public | Owner action |
| **G** | **Merge branch → main** | **✅ shipped** | **✅ live `98509b84` (2026-06-16)** | **✅ done** |
