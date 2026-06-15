# Leverage Index — your resource dump, aligned to you + the project + the future

Five parallel subagents went through the dump's ~2,200 actionable resources item-by-item,
verified the promising ones live, and aligned each to this platform. This is the synthesis.
Deep detail lives in the per-domain reports (`01`–`05`); this is the map and the plan.

## The one-sentence reframe

The dump has **no sports-data/odds sources** — but it *is* a near-complete **$0 operating
system for the company**: free compute, free-data discovery + ingestion, an AI-cost-cutting
layer, a content/SEO growth flywheel, free analytics, and solo-dev velocity tooling. The goal
it unlocks: **run everything except the Odds API at ~$0 marginal cost** — and even the Odds
API now has a free-discovery escape path.

## Verified-live tally

55 resources were fetched/confirmed live across the five sweeps (13 data/API · 12 AI/LLM ·
8 infra · 9 growth · 14 dev). Everything below is either live-verified or assessed from the
ledger + known free tiers (each report marks which).

---

## The 12 highest-leverage moves (cross-domain, deduped)

| # | Move | Why it matters for YOU (solo, $0) | Report |
|---|---|---|---|
| 1 | **Oracle Cloud Always-Free ARM VPS** | The keystone. Host BullMQ workers + self-hosted Redis + self-hosted henrygd + analytics/LLM on one free box (4 OCPU/24GB). Kills the biggest infra bill. | 03 |
| 2 | **Internal-LLM tier: Ollama + Groq, gated by promptfoo, priced by models.dev** | Move non-user-facing LLM work (classification, normalization, JSON extraction, drafts) off Claude; keep Claude for user-facing quality. Direct cut to your biggest variable cost. | 02 |
| 3 | **Free-data discovery: public-apis + publicapis.dev + APIs.guru** | The path off the paid Odds API — these indexes already surface free **NBA Stats** + **Fantasy Premier League** APIs. Mine, clear, wire as adapters. | 01 |
| 4 | **Programmatic SEO flywheel** | Auto-generate thousands of game-preview/matchup pages from the odds+stats you already ingest, with schema.org markup. Your primary $0 acquisition channel. | 04 |
| 5 | **Content intake: RSSHub + Miniflux + siftrss** | Turn 200+ services (Reddit/X/team blogs) into filtered feeds → daily AI-repurposed content. Feeds the flywheel and the "no stale data" rule. | 01, 04 |
| 6 | **Free track-record widget** | Productize your public calibration as an embeddable "here are the receipts" widget — the viral trust hook vs. receipt-less touts. | 04 |
| 7 | **Cloudflare Web Analytics + MS Clarity** | $0, cookieless, no consent banner (banners kill conversion) + session replay to find paywall-funnel leaks. | 03, 04 |
| 8 | **Crawl4AI + DuckDB** | Zero-key cleared-source fact ingestion + in-process OLAP for backtesting/calibration over CSV/Parquet — no warehouse bill. | 01 |
| 9 | **Integration dev kit: Crontab Guru + Bruno + Webhook.site** | De-risk the Odds API + Stripe + BullMQ work: get cron cadence right, version API collections in-repo, inspect raw webhooks. | 05 |
| 10 | **Asset pipeline: SVGO + Squoosh + PageSpeed/Pa11y** | Cut Vercel bandwidth + win Core Web Vitals = SEO ranking for the content play; CI-gate perf + a11y. | 05 |
| 11 | **shadcn/ui (+ Radix)** | Own-the-code accessible React/Tailwind components → build picks UI, paywall gates, dashboards fast, no dependency lock-in. | 05 |
| 12 | **Security baseline: Snyk + Fail2Ban + Let's Encrypt/Caddy** | $0 dependency/code scanning in CI + VPS hardening + auto-TLS for self-hosted surfaces. | 03 |

---

## Roadmap (sequenced by effort × payoff)

### This week — zero-dependency wins (no infra needed)
- Add **Cloudflare Web Analytics** + **MS Clarity** to the app (JS snippet) → instant funnel insight.
- Add **promptfoo** evals for the 3 live Claude surfaces (pick-explainer, model-court, calibration) → the gate that lets you safely downgrade models later.
- Adopt **Bruno** (commit API collections), **Crontab Guru** for worker schedules, **Webhook.site** for Stripe/Odds debugging.
- Run **SVGO** over `public/` + **Squoosh** on hero/OG images; add **PageSpeed**/**Pa11y** checks to the launch checklist.
- Wire **Snyk** + (gap†) **gitleaks** into GitHub Actions.

### This month — stand up the $0 stack
- Provision the **Oracle Cloud** free VPS; move BullMQ workers + **self-hosted Redis** + **self-hosted henrygd** onto it (drops henrygd's rate cap, ties to shipped work).
- Stand up **Crawl4AI + DuckDB** as the cleared-ingestion + backtesting pair.
- Stand up **Miniflux + RSSHub + siftrss**; pipe sports-news feeds into the content engine.
- Harvest the **API discovery indexes**; run each candidate free sports API through `checkClearance()`; wire the cleared ones as `data-ingestion` adapters → reduce Odds-API dependence.
- Add the **internal-LLM route** (Ollama on the VPS / Groq free API) behind the existing cost layer; wire **models.dev** into `model-router`.

### Future / at scale
- Fine-tune a tiny house-style model (**Unsloth**) on settled-pick history → near-zero drafting cost.
- **txtai/Qdrant** embeddings to ground picks + shrink prompts. **Discourse** SEO forum. **Grafana/Prometheus** business dashboards. Self-host **Postgres** on Oracle for prod (off Supabase's idle-pause).

---

## Three alignment lenses

**Aligned to YOU (solo, unemployed, $0):** every item above is free or free-tier. The plan
needs no hires and no paid SaaS — one free VPS + free tiers + OSS run the whole operation.
Time, not money, is the constraint, so the roadmap front-loads zero-dependency wins.

**Aligned to the PROJECT (Next.js/Postgres/Stripe/Claude/BullMQ, Free/Pro/Elite):** picks map
to real workstreams — model-router/budget layer (AI cost), data-ingestion adapters (free-data),
content engine (RSS/SEO), paywall funnel (analytics/Clarity), worker infra (Oracle/Redis),
CI (Snyk/Pa11y), UI (shadcn). Nothing is generic; each cites a concrete hook.

**Aligned to the FUTURE:** the same stack scales — local→fine-tuned models, Supabase→self-host
Postgres, Discord→Discourse, single-source→multi-source ingestion, manual→CI-gated perf/a11y.
Choices avoid lock-in (own-the-code components, OSS, portable data formats).

---

## Guardrails (non-negotiable, per CLAUDE.md)

- **Rights-gated ingestion:** every new source/scraper (Crawl4AI, RSS sources, any adapter)
  runs through `checkClearance()`; ingest **facts + links + our own analysis only** — never
  article bodies or proprietary predictions for republication.
- **No evasion:** temp-mail / fake-account / proxy-rotation tools in the dump are **excluded**
  (fake-account evasion) — do not adopt.
- **Quality bar:** user-facing content stays on Claude; local/cheap models only do internal
  grunt work, and only after promptfoo proves parity.
- **Honest gaps (not in the dump, use standard free tiers†):** transactional email + web push
  (Elite alerts), error tracking (Sentry†), uptime (UptimeRobot†), secret scanning (gitleaks†),
  backups (restic/B2†). These are feature work, not dump wins.

## The detailed reports
- `01-apis-data-feeds.md` — APIs, datasets, feeds, scraping, OSINT, algorithms
- `02-ai-llm-ml.md` — local LLMs, model selection, prompt eval, embeddings, prediction-engine refs
- `03-cost-infra-analytics-security.md` — hosting, DB, analytics, monitoring, security
- `04-sales-growth-content-seo.md` — the 7 growth plays + the $0 growth stack
- `05-devtools-frontend-design.md` — cron/API/webhook, testing, perf/a11y, UI, media optimization
