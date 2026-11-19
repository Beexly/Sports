# Canonical Web Information Architecture and 301 Redirect Consolidation Plan (2026-11)

**Status:** Planning Blueprint (Task 7 Operational Hardening, scheduled post-TNF H4-H5)  
**Scope:** Consolidate **246** Next.js App Router pages (`apps/web/app/**/page.tsx`) -- **162** public/member routes + **84** internal `/admin/*` and `/cockpit/*` operator routes -- into a clean **~90-route** canonical information architecture with permanent HTTP **301** redirects for retired aliases.  
**Scheduled Crons SoT:** See [docs/ops/CRON_MATRIX.generated.md](CRON_MATRIX.generated.md) (consolidated from 40 to 16 Vercel schedules; 24 routes offloaded to GitHub Actions, Cloudflare Workers, and Upstash QStash).

---

## 1. Current Verified Inventory (246 Page Routes, 258 Route Handlers)

Measured directly under `apps/web/app/`:
- **Public and Member Surfaces (`162` page routes):** Split across overlapping proof/record views (`/record`, `/glass-ledger`, `/ledger`, `/proof`, `/accountability`, `/how-to-verify-a-record`, `/verify`, `/performance`, `/clv`, `/kill-ledger`), multiple board/slate aliases (`/board`, `/public-slate`, `/today`, `/live`, `/sealed`, `/slate`, `/games/[gameId]`, `/observatory`, `/founder-picks`), 20 fantasy/DFS sub-pages (`/dfs`, `/fantasy/*`), 34 player/stats lab pages (`/players/*`, `/stats/*`), 9 free tools (`/parlay-mri`, `/optimizer`, `/tools/*`), and commercial/editorial/legal pages (`/packages`, `/pricing`, `/props`, `/sgp-projections`, `/partners`, `/media-kit`).
- **Internal Operator & Control-Plane Surfaces (`84` page routes):** `40` routes under `/admin/*` (including 27 `/admin/statking/*` pages) and `44` routes under `/cockpit/*`.
- **Existing Redirects (`apps/web/next.config.mjs`):** Already redirects `/dfs` -> `/fantasy/dfs` (permanent 308/301), `/signup`, `/register`, `/login` -> `/auth/signin`, `/checkout`, `/subscribe` -> `/pricing`, `/observatory` -> `/board`, `/games/:gameId` -> `/room/:gameId`, and 9 `/players/*` aliases -> `/players?view=*`.

---

## 2. Target Canonical ~90-Route Architecture

Consolidation preserves every live revenue, proof, tool, and SEO/GEO landing page while eliminating thin/duplicate cannibalization and isolating internal admin consoles behind IAP + server-side JWT verification:

| Domain Cluster | Before | Target Canonical Routes | Primary Canonical Entrypoints |
|---|---:|---:|---|
| **Core Commercial & Storefront** | 12 | 9 | `/`, `/packages`, `/packages/[slug]`, `/pricing`, `/props`, `/sgp-projections`, `/preview/[sport]/[slug]`, `/partners`, `/media-kit` |
| **Verified Record & Proof Room** | 13 | 4 | `/record`, `/performance/losses`, `/performance/losses/[id]`, `/methodology` |
| **Live Slates, Matchups & Content** | 23 | 12 | `/board`, `/picks`, `/room/[gameId]`, `/slate/[sport]`, `/blog`, `/blog/[slug]`, `/journal`, `/journal/[slug]`, `/newsletter`, `/newsletter/[slug]`, `/podcast`, `/podcast/[slug]` |
| **9 Free Calculators & Embeds** | 11 | 10 | `/parlay-mri`, `/optimizer`, `/tools`, `/tools/clv-calculator`, `/tools/ev-calculator`, `/tools/line-movement`, `/tools/no-vig-calculator`, `/tools/odds-converter`, `/tools/parlay-calculator`, `/embed/edge-index/[gameId]` |
| **DFS, Fantasy & Player Intelligence** | 54 | 10 | `/fantasy/dfs`, `/fantasy/showdown`, `/fantasy/lineup`, `/stats`, `/stats/players`, `/stats/player/[id]`, `/stats/teams`, `/stats/injuries`, `/stats/trenches`, `/nflverse` |
| **Authority, Case Studies, Auth & Legal** | 49 | 19 | `/about`, `/case-studies/aws-governed-sports-intelligence`, `/changelog`, `/contact`, `/data-policy`, `/faq`, `/privacy`, `/responsible-play`, `/status`, `/terms`, `/vs/tout-services`, `/waitlist`, `/age-verify`, `/auth/signin`, `/auth/error`, `/mlb`, `/nhl`, `/academy`, `/integrations` |
| **Internal Operator Control Plane (IAP/JWT)** | 84 | 26 | `/admin`, `/admin/dashboard`, `/admin/picks`, `/admin/posts`, `/admin/users`, `/admin/cash`, `/admin/clv`, `/admin/compliance`, `/admin/runway`, `/admin/statking`, `/cockpit`, `/cockpit/command-center`, `/cockpit/agents`, `/cockpit/agents/[agentKey]`, `/cockpit/api-costs`, `/cockpit/calibration`, `/cockpit/content`, `/cockpit/founder-picks`, `/cockpit/gsi-telemetry`, `/cockpit/integrity`, `/cockpit/losses`, `/cockpit/review`, `/cockpit/settlement-hold`, `/cockpit/sources`, `/cockpit/synthetic-monitoring`, `/cockpit/workflows` |
| **TOTAL** | **246** | **90** | **64 Public/Member + 26 Internal IAP Routes** |

---

## 3. HTTP 301 Permanent Consolidation Map (Public & SEO Surfaces)

When implementing in `apps/web/next.config.mjs` (setting `permanent: true` for retired duplicates; retaining `permanent: false` only for feature-gated stubs if needed), map duplicate pages to canonical destinations so search equity, `/llms.txt`, and `apps/web/app/sitemap.ts` point exclusively to canonical 200-OK destinations:

### 3.1 Record, Proof, Calibration & Ledger Duplicates -> `/record` & `/methodology`
- `/glass-ledger`, `/ledger`, `/proof`, `/accountability`, `/how-to-verify-a-record`, `/verify`, `/verify/slate/opening`, `/performance`, `/clv`, `/kill-ledger` -> `301` `/record`
- `/calibration`, `/calibration/market`, `/bookgrade`, `/benchmarks`, `/engine`, `/intelligence/engines`, `/intelligence/metrics`, `/intelligence/observatory`, `/intelligence/reconstruction`, `/research` -> `301` `/methodology`

### 3.2 Slate, Board & Matchup Aliases -> `/board`, `/picks`, `/room/[gameId]`
- `/public-slate`, `/today`, `/live`, `/sealed`, `/board/gate`, `/founder-picks`, `/observatory` -> `301` `/board`
- `/slate` -> `301` `/slate/nfl`
- `/games/:gameId` -> `301` `/room/:gameId` (upgrade existing redirect to permanent 301)

### 3.3 DFS & Fantasy Sprawl -> `/fantasy/dfs`, `/fantasy/showdown`, `/optimizer`
- `/dfs` -> `301` `/fantasy/dfs` (already `permanent: true`)
- `/fantasy`, `/fantasy/academy`, `/fantasy/autopilot`, `/fantasy/baseline`, `/fantasy/bestball`, `/fantasy/connect`, `/fantasy/draft`, `/fantasy/gm-ledger`, `/fantasy/league-twin`, `/fantasy/nba`, `/fantasy/props`, `/fantasy/scheme`, `/fantasy/studio`, `/fantasy/touchdowns`, `/fantasy/trade`, `/fantasy/waivers` -> `301` `/fantasy/dfs` (with `?tab=` query preservation where helpful)

### 3.4 Player Lab & Stats Sub-Page Sprawl -> `/stats` & `/players`
- `/players/combine`, `/players/dfs`, `/players/injuries`, `/players/market`, `/players/opportunity`, `/players/qbr`, `/players/snaps`, `/players/trenches` -> `301` `/players?view=<slug>` (upgrade existing `permanent: false` rules in `apps/web/next.config.mjs`)
- `/stats/alerts`, `/stats/ask`, `/stats/compare`, `/stats/comps`, `/stats/depth`, `/stats/expert-board`, `/stats/media`, `/stats/media/podcasts`, `/stats/media/reddit`, `/stats/media/rss`, `/stats/media/signals`, `/stats/media/trending`, `/stats/media/youtube`, `/stats/proof`, `/stats/scheme`, `/stats/scouting`, `/stats/source-graph`, `/stats/sources`, `/stats/source-suggest`, `/stats/watchlist` -> `301` `/stats`

### 3.5 Misc Editorial / Retired Stubs
- `/airwave`, `/brief`, `/cipher`, `/content-lab`, `/data`, `/deck`, `/edge-index`, `/fable`, `/gsn`, `/house`, `/human`, `/launch`, `/press`, `/promotions`, `/resources/card-supplies`, `/the-beat`, `/track`, `/track/platform`, `/trends`, `/vault`, `/watchlist`, `/weather`, `/dashboard` -> consolidate via `301` to `/board`, `/packages`, `/about`, or `/tools` (keep `/vault` redirect only until private vault UI moves cleanly under `/cockpit`).

---

## 4. Internal `/admin/*` & `/cockpit/*` Isolation & API Surface Alignment

1. **Public vs Private Boundary:** All 26 retained `/admin/*` and `/cockpit/*` routes remain excluded from `apps/web/app/sitemap.ts` and `llms.txt`, require authenticated operator session / IAP + server-side JWT verification, and never serialize raw signals, weights, or vault files into public HTML props.
2. **Zero-Vault-Leak Enforcement:** `scripts/guardrails/verify_public_root_zero_vault_leak.py` ensures zero equation, signal, CSV, or vault payloads live under `apps/web/public/`.
3. **Consolidated Cron Plane (40 -> 16):** Only the 16 critical production schedules remain in `apps/web/vercel.json` (mirrored byte-identically to root `vercel.json` and `apps/web/lib/ops/cron-schedule-manifest.ts`); see [docs/ops/CRON_MATRIX.generated.md](CRON_MATRIX.generated.md). The 24 offloaded endpoints remain callable via bearer `CRON_SECRET` from GitHub Actions, Cloudflare Workers, and Upstash QStash.
4. **Verification Before Deploying Redirects:** Run `npm run build` and `npm run typecheck` after updating `apps/web/next.config.mjs` and `apps/web/app/sitemap.ts` so every sitemap entry resolves directly to a canonical HTTP 200 URL (zero redirect chains inside `sitemap.xml`).
