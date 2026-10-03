# Bootstrap Leverage — mining the resource dump for $0 wins

The owner's link dump (11,126 resources) has **no sports-data sources** (see
`FREE_FIRST_DATA.md`), but it is full of **operational, cost-saving, and dev-velocity
leverage** for a zero-budget build. This is the prioritized, grounded extraction — every
named tool is an `approved_direct` (cleared) entry in
`handoff/codex/galaxy-2026-limit-push/NORMALIZED_RESOURCE_LEDGER.csv`. Adopt top-down by
impact. (Items marked † are standard free tiers **not** in the dump, noted for completeness.)

## 1. Infra cost — run the platform at near-$0

| Need | From the dump | What it saves |
|---|---|---|
| Postgres + Auth | **Supabase** | managed Postgres free tier; we already use Prisma/NextAuth |
| Free VPS (self-host henrygd, workers, Redis) | **Oracle Cloud** (free VPS, ARM), **Selfhosted-Apps-Docker** guides | kills the henrygd rate cap + hosts BullMQ workers for $0 |
| Git hosting / CI | **Gitea**, **Codeberg**, **GitLab** | free private repos/CI if we leave paid GitHub |
| Dashboards / log analysis | **Grafana** (self-host), **GoAccess** (web log analyzer) | $0 observability vs paid APM |
| Redis / queue† | Upstash free tier† | BullMQ needs Redis; Upstash free tier or self-host on the Oracle VPS |

**Action:** self-host henrygd on the Oracle Cloud free VPS (compose service already exists),
set `HENRYGD_NCAA_BASE_URL`. Park workers + Redis on the same box.

## 2. AI / LLM cost — the biggest variable cost

The app already has a budget layer (`lib/claude-api/`: cost-monitor, usage-store, budget
policy, model-router) and prompt caching **is enabled** on the per-pick surface
(`pick-explainer`). Remaining leverage from the dump:

- **promptfoo** — prompt eval/testing playground. Use it to regression-test + shrink system
  prompts (fewer input tokens) and to prove a cheaper model still passes before downgrading a
  surface in `model-router`. Highest-ROI dev tool here.
- **LM Studio / GPT4All / AnythingLLM / Awesome Local LLM / Can I Run AI Locally** — run a
  local model for **non-critical, high-volume** generation (draft summaries, internal
  classification) to keep Claude spend for the surfaces that need quality. (Content shipped to
  users stays on Claude per `CLAUDE.md`.)
- **Ccusage** — token-usage tracking for Claude Code itself (our own dev loop cost).
- **Code2prompt / promptfoo / LLM Stats** — pick the cheapest capable model per surface.

**Action:** add a `promptfoo` config to eval the 3 live surfaces (pick-explainer,
model-court, calibration) and validate any model downgrade before shipping it.

## 3. Analytics — drop any paid analytics ($0, privacy-friendly)

Dump has **21** options: **Cloudflare Web Analytics** (no JS cost, no cookies),
**Umami**, **GoatCounter**, **Rybbit** (self-host), **MS Clarity** (free session
replay/heatmaps). All free; pick one self-host (Umami) + Cloudflare for edge metrics.

**Action:** wire Cloudflare Web Analytics (zero-config) now; self-host Umami later for funnels.

## 4. Content engine — sports news intelligence (free)

Dump has **15** RSS/aggregator tools: **Feedly** (already noted), self-host **FreshRSS /
Miniflux / CommaFeed** (owner-review batch), news aggregators **Kagi News, NewsMinimalist,
Upstract, DeadStack**. Feed sports news into the content pipeline + Airwave monitoring.

**Action:** accept the owner-review batch's RSS bucket → self-host FreshRSS; subscribe team
beats; pipe into the content engine's source list.

## 5. Dev velocity (free tools that speed THIS build)

- **Crontab Guru** — author/verify the job schedules (data-refresh, settlement, content crons).
- **Mockaroo / Mockend** — generate realistic test data for seeds/fixtures.
- **mitmproxy / HTTPToolkit** — inspect The Odds API / ESPN traffic while debugging adapters.
- **Snyk** — free dependency vulnerability scanning in CI (see §7).
- **Crontab Guru + promptfoo + Mockaroo** are the three I'd wire into the workflow first.

## 6. Frontend / performance (Vercel bandwidth + Core Web Vitals = SEO)

- **SVGO / SVGCrop / Caesium** — optimize SVGs/images → less bandwidth, faster LCP.
- **PageSpeed / GTmetrix** — measure Core Web Vitals (SEO ranking factor for the content play).
- **102** color-palette / SVG / icon generators (AI Colors, Blobmaker, Adobe Color, Bootstrap)
  for fast, on-brand UI without a designer.

**Action:** run SVGO over `public/` assets; add a PageSpeed check to the launch checklist.

## 7. Security / CI (free)

- **Snyk** — free tier dependency + code vuln scanning. **AbuseIPDB** — block bad IPs at the
  edge. **gitleaks†** — secret scanning in CI (we already manually scan for pasted keys).

**Action:** add Snyk + gitleaks to the GitHub Actions pipeline (free for our scale).

## Honest gaps the dump does NOT cover

- **Transactional email + web push** for the Elite tier (real-time alerts) — not in the dump.
  Use free tiers†: Resend / Postmark / Mailgun (email), and Web Push API + a free VAPID setup
  or OneSignal free tier (push). These are feature work, not a dump win.
- **Sports data / odds** — none in the dump; stays on the independently-sourced free path
  (ESPN/henrygd/Open-Meteo/nflverse) + the gated candidate registry (CFBD next).

## Priority order (do these first)

1. Self-host henrygd on **Oracle Cloud** free VPS → removes the rate cap (ties to shipped work).
2. **promptfoo** eval harness → safely downgrade models / shrink prompts = direct Claude savings.
3. **Cloudflare Web Analytics** → $0 analytics immediately.
4. **Snyk + gitleaks** in CI → free security baseline.
5. Self-host **FreshRSS** → sports-news intake for the content engine.
