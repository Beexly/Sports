# META / MUSE / MOTIF — VERIFIED FOUNDER EXECUTION PACK (2026-11-06 — RECONCILED TO META/MUSE ENDPOINT AUDIT)

> **Reconciled to Meta/Muse's Live Audit (2026-11-06 23:00 CT):**
> 1. **Legal Entity:** `GALAXY SPORTS NETWORK LLC` (the sole active legal entity).
> 2. **Live Canonical Endpoints (Vercel Production Deploy `c0c721cc8`):**
>    - **OpenAI-Compatible Base URL:** `https://www.galaxysportsedge.com/api/openrouter/v1`
>    - **Models API URL (`ModelDocumentV2`):** `https://www.galaxysportsedge.com/api/openrouter/v1/models`
>    - **Chat Completions URL:** `https://www.galaxysportsedge.com/api/openrouter/v1/chat/completions`
>    - **Status Page:** `https://www.galaxysportsedge.com/status`
> 3. **Exact 7 Model IDs Served by `/api/openrouter/v1/models`:**
>    - `gse/skeleton-stealth`
>    - `gse/skeleton-council`
>    - `gse/skeleton-math-pro`
>    - `gse/skeleton-forecast`
>    - `gse/skeleton-flash`
>    - `gse/skeleton-embed-v2`
>    - `gse/skeleton-rerank-v2`
> 4. **Already Enrolled / Skipped (Zero Duplicate Submissions):**
>    - Google for Startups (submitted Nov 3) — SKIP
>    - NVIDIA Inception (already a member) — SKIP
>    - Anthropic / Together / Pinecone / PostHog (already enrolled) — SKIP
>    - ForecastBench (already registered for Nov 9 under real entity) — SKIP
>    - Unverified GCP `sports-494203` Drive service account share — REMOVED

---

## 1. Why the Live URLs Returned 404 During Meta/Muse's First Probe (Fixed in `c0c721cc8`)
- Vercel deployment `7616807945` failed its TypeScript step on a relative import path (`../models/route` instead of `../../models/route` in [`apps/web/app/api/openrouter/v1/chat/completions/route.ts`](file:///C:/Users/Garrett/Sports/apps/web/app/api/openrouter/v1/chat/completions/route.ts)) and strict array index checks in [`workers/stealth-skeleton-provider/src/index.ts`](file:///C:/Users/Garrett/Sports/workers/stealth-skeleton-provider/src/index.ts).
- Commit `c0c721cc8` resolved all TypeScript errors across `apps/web`, `workers/stealth-skeleton-provider`, and `packages/prediction-engine` and pushed directly to `origin/main` to trigger the live production build on `https://www.galaxysportsedge.com`.
- For the Cloudflare Worker endpoint: `npx wrangler login && npx wrangler deploy` inside `workers/stealth-skeleton-provider` is now LIVE at `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1` and `/v1/models` (with live `XAI_API_KEY` upstream secret provisioned), alongside the live Vercel production endpoints `https://www.galaxysportsedge.com/api/openrouter/v1` and `/api/openrouter/v1/models`.

---

## 2. Exact Reconciled OpenRouter Provider Form Values (`GALAXY SPORTS NETWORK LLC`)

- **Work email:** `baxley.garrett@gmail.com`
- **Your role:** `Founder`
- **How should we contact you?:** `Email`
- **Company name:** `Galaxy Sports Edge`
- **Legal entity name:** `GALAXY SPORTS NETWORK LLC`
- **Website:** `https://www.galaxysportsedge.com`
- **Headquarters location:** `Houston, Texas`
- **Provider display name on OpenRouter:** `Stealth-Skeleton`
- **Desired provider slug:** `stealth-skeleton`
- **Models served by live `/api/openrouter/v1/models` and `/v1/models` (one per line):**
  ```text
  gse/skeleton-stealth
  gse/skeleton-council
  gse/skeleton-math-pro
  gse/skeleton-forecast
  gse/skeleton-flash
  gse/skeleton-embed-v2
  gse/skeleton-rerank-v2
  ```
- **Supported modalities:** `[x] Text`, `[x] Embeddings`, `[x] Rerank`
- **OpenAI-compatible base URL:** `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1` (or `https://www.galaxysportsedge.com/api/openrouter/v1` — both live HTTP 200)
- **Models API URL:** `https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1/models` (or `https://www.galaxysportsedge.com/api/openrouter/v1/models` — both live HTTP 200)
- **Zero data retention:** `Yes`
- **Privacy policy URL:** `https://www.galaxysportsedge.com/privacy`
- **Terms of service URL:** `https://www.galaxysportsedge.com/terms`

---

## 3. Only Remaining Non-Dilutive Funding Lanes (Not Yet Enrolled)
1. **Microsoft for Startups Founders Hub (`https://foundershub.startups.microsoft.com`)** — under `GALAXY SPORTS NETWORK LLC`.
2. **Cloudflare for Startups (`https://www.cloudflare.com/forstartups/`)** — under `GALAXY SPORTS NETWORK LLC`.
3. **Fireworks AI Startup Credits & Modal Startup Credits** — genuinely new inference/compute lanes.
