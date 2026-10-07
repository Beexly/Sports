# Resource Dump Triage — Grok/xAI + PaaS + Monetization + Growth (2026-08-24)

> **FOR CLAUDE — PICK-UP NOTES.** Garrett pasted 45 unique URLs (46 given; MoneyPrinterTurbo
> was submitted twice). Four research agents fetched every page live and produced verdicts
> against GSE's standing constraints ($0 marginal cost, Next.js/TS/Prisma/BullMQ on Vercel,
> silent launch C1–C8, rights-cleared ingestion only, no ToS-evasion tooling — same
> guardrails as `00-LEVERAGE-INDEX.md`). This file is the synthesis; raw agent reports are
> in `raw/` next to this file. Nothing below is an install order.
>
> **Bottom line: 2 things fit GSE directly, ~8 are worth borrowing ideas from, and the
> loudest cluster (grok2api-style "free Grok API" proxies) is a HARD GUARDRAIL REJECT.**

---

## TL;DR — the 3 decisions Claude actually needs to make

1. **ADOPT (idea-level, no new infra): MoneyPrinterTurbo** (`harry0703/MoneyPrinterTurbo`,
   MIT, 116k★, active) as the short-video arm of the content engine once gate C3/C7 flips —
   auto-generate matchup-preview TikTok/YT Shorts from the same programmatic-SEO data feeds.
   Park until public content is live; zero code changes needed now.
2. **PARK (future infra): Coolify** (61k★, Apache-2.0, very active) as THE self-hosted PaaS
   candidate for the Oracle free-VPS endgame (Next.js + BullMQ + Redis + Postgres one-click).
   Dokploy is the runner-up; Kubero rejected (K8s overkill). Do NOT touch during silent launch.
3. **REJECT ON SIGHT if re-suggested: grok-free-web-api-vercel, grok2api, tweazy,
   ai-reply-guy-opensource, sherlock** — all are ToS-violating token-scrapers/spam-bots/
   privacy-risk tools. The "$0 Grok API" pattern = extracting auth tokens from web sessions;
   direct guardrail violation regardless of cost appeal.

---

## VERDICT TABLE (all 45, grouped by batch)

### Batch A — Grok/xAI ecosystem + self-hosted PaaS (9)
| URL | What it is | Verdict | Note |
|---|---|---|---|
| lennysnewsletter how-i-ai-grok | Podcast/newsletter on Grok Bot & Grok 4.6 benchmarks | IDEA-ONLY | Confirms Grok 4.6 as frontier-tier → candidate for internal LLM tier eval; no artifact |
| morphic.com grok-imagine-guide | xAI Image 2.0 marketing guide ("API coming soon") | PARK | Possible AI infographic source for SEO pages later; low priority |
| chenyme/grok2api (7.5k★ MIT active) | Multi-account Grok→OpenAI-compatible API gateway | REJECT (guardrail) | Token extraction + multi-account pooling = xAI ToS breach. Architecture reference ONLY if ever building a legit multi-model gateway on official xai-sdk-python |
| xai-org org (9 repos) | Official xAI: grok-build 26k★, x-algorithm 32k★, xai-sdk-python 559★ active | REFERENCE | Use `xai-sdk-python` for any official Grok API work; ignore grok-1 (stale open weights) |
| DE0CH/grok-frontend (45★ stale) | React UI for xAI image/video gen | REJECT | Stale, API key in cookie, no GSE relevance |
| omgpizzatnt/grok-free-web-api-vercel | ARCHIVED "free Grok" Vercel proxy | HARD REJECT | Instructs scraping auth_bearer/tokens from DevTools — credential-theft pattern, archived by owner |
| Dokploy/dokploy (36.8k★ MIT active) | Self-hosted PaaS (Vercel alt), Docker+Traefik | PARK | Viable when scaling off Vercel free tier onto Oracle VPS |
| coollabsio/coolify (61k★ Apache-2.0 active) | Self-hosted PaaS, 280+ one-click services incl. Postgres/Redis | PARK ★ best-of-three | The Oracle-VPS endgame candidate. Not now — silent launch stays on Vercel |
| kubero-dev/kubero (4.4k★ GPL stale-ish) | Kubernetes-based PaaS | REJECT | K8s overhead absurd for solo Next.js app |

### Batch B — Monetization / indie-hacking / meta-lists (12)
| URL | Verdict | Note |
|---|---|---|
| harry0703/MoneyPrinterTurbo | **ADOPT-LATER** | See TL;DR #1. MIT, 116k★, updated daily |
| moneyphp/money + RubyMoney/money | REJECT | Wrong languages. TS equivalent if needed: `dinero.js` (GSE already has Stripe wiring, so likely never needed) |
| zcash/zcash | REJECT | Archived crypto repo; Stripe-only payments |
| easychen/howto-make-more-money | IDEA-ONLY | Chinese indie-hacker handbook. Transferable: sell shovels not gold; build assets not hours |
| mezod/awesome-indie | IDEA-ONLY | Bookmark-grade classic list |
| ellite/Wallos | REJECT | Personal subscription tracker; no GSE angle worth the hosting |
| List-Of-Open-Source-Internships | REJECT | Solo dev, not hiring |
| **XiaomingX/ai-money-maker-handbook (!! flagged)** | **IDEA-ONLY ★ deepest read** | See deep-dive section below |
| iamzifei/show-me-the-money | REJECT | Low value (Claude automation notes) |
| PayDevs/awesome-oss-monetization | IDEA-ONLY | Relevant only IF GSE open-sources components |
| saasify-sh/saasify | REJECT | DEAD — archived Dec 2022 |
| Pintree-io/pintree | REJECT | Bookmark-directory SaaS; GSE's programmatic pages already supersede |

### Batch C — SEO / automation / MCP distribution (9)
| URL | Verdict | Note |
|---|---|---|
| bmpi-dev/awesome-seo (2.8k★ MIT active) | USE (reference) | Best SEO knowledge base of the dump: crawl-budget, authority-site model, RPM focus → feed into programmatic-SEO page templates |
| Anil-matcha/awesome-generative-ai-apps (3.1k★ MIT active) | USE (reference) | Catalog stack ≈ GSE stack exactly (Next.js+Prisma+Stripe+Vercel). Reference architectures for RAG pick-explainer etc. |
| automatisch/automatisch (13.9k★ AGPL, 7mo stale) | REJECT | Redundant vs existing BullMQ crons + AGPL + stale. Confirms n8n/Zapier-class tools stay out |
| velobase/velobase-harness (584★ MIT active) | USE (reference) | Billing + affiliate + ANTI-ABUSE patterns for future pick-alert products |
| lbryio/lbry-sdk | REJECT | Dead 2+ years |
| cporter202/agentic-ai-starters (225★ MIT) | USE (reference) | `seo-content-agent` + `mcp-toolchain-starter` map straight onto GSE's SEO flywheel + agent-distribution goals |
| xpack-ai/XPack-MCP-Marketplace (169★ Apache-2.0) | CONSIDER | Distribution channel: expose picks-explainer as paid MCP server. Only if/when MCP exposure is a goal |
| aaronjmars/tweazy | HARD REJECT | X scraping + crypto-wallet monetization; explicit ToS/guardrail violation |
| Build-Share-Sell-OpenAI-Assistants-API | LOW | Tutorial-level streamlit; concept only (package alerts as products) |

### Batch D — Growth / social / analytics / misc (15)
| URL | Verdict | Note |
|---|---|---|
| UncleJ-h/xs (1★ MIT) | REJECT | SuperGrok X-search CLI; official API but no GSE use |
| per-simmons/ai-reply-guy-opensource | HARD REJECT | Chrome keystroke-injection spam bot to dodge X anti-spam. Textbook guardrail violation |
| BranchMetrics ios-deep-linking | REJECT | Native iOS SDK; GSE is mobile-web PWA |
| Countly/countly-server (5.9k★ AGPL) | REJECT | Already committed to Cloudflare Analytics + MS Clarity ($0, no hosting). Countly needs Mongo/Redis/ClickHouse |
| sherlock-project/sherlock (90k★) | REJECT | OSINT username hunter; privacy red line, no legit sports use |
| gitroomhq/postiz-app (35.1k★ AGPL, active) | CANDIDATE | Self-hosted Buffer; OFFICIAL OAuth APIs (no scraping). Distribution channel for blog/picks content once public. Mind AGPL (run as separate service, don't embed) |
| StevenBlack/hosts (30.9k★) | REJECT (GSE) | Personal-machine hygiene only — fine for Garrett's own PC, not project infra |
| enescingoz/awesome-n8n-templates (24.9k★) | IDEA-ONLY | NO n8n install. Steal patterns for BullMQ crons: RSS→Discord notify, Gmail digest, cross-post scheduling, competitor-content watch |
| apify/apify-mcp-server (4.8k★ MIT) | CONDITIONAL-NO | Paid credits ($0 conflict) + scraping-ToS risk. Revisit only for rights-cleared structured feeds |
| orgs/apify/repositories | REFERENCE | Free tier exists; actors usage-priced. No dependency |
| FujiwaraChoki/MoneyPrinterV2 (31.7k★ AGPL stale) | REJECT | Superseded by Turbo; less maintained |
| ddean2009/MoneyPrinterPlus (7k★ GPL stale) | REJECT | Stale + commercial-use restriction |
| FujiwaraChoki/MoneyPrinter (original) | CONFIRM-ONLY | Turbo supersedes |
| liaoqiaochunfengchuijiuxing/hot-opensource-projects | REJECT | 0★ tracker, low credibility |
| hihumanzone/Gemini-Discord-Bot (98★ MIT) | REFERENCE ARCH | Pattern for GSE Discord community bot: Discord.js + LLM + session memory → portable to BullMQ worker + webhook |
| 10up/classifai | HARD REJECT | WordPress plugin; GSE is Next.js |
| bradautomates/content-ideas (102★ MIT) | CANDIDATE-IDEA | Competitor-content → content-idea pipeline. Uses ScrapeCreators API (paid, scraping) — take the PIPELINE idea, verify rights before any adoption |

---

## DEEP DIVE — XiaomingX/ai-money-maker-handbook (the !! item)

4.4k★, actively maintained (bot commits daily), Chinese-language AI side-hustle museum.
Mostly listicle/hype, but three genuinely transferable principles for GSE:

1. **"做垂类而非平台" — vertical beats platform**: GSE already IS the vertical play
   (NFL picks vs generic betting info). Validates staying narrow instead of adding sports.
2. **"卖铲子而非挖金子" — sell shovels, not gold**: the highest-margin play in the book.
   GSE translation: the edge ENGINE (calibration receipts, provenance) is sellable as
   B2B/API/MCP product even if consumer picks revenue is slow — connects directly to the
   XPack-MCP-Marketplace CONSIDER above.
3. **"做资产而不是卖时间" — build assets, not billable hours**: every programmatic SEO page,
   the track-record widget, the calibration history = compounding assets. Matches the
   existing flywheel plan; reinforces front-loading asset work over one-off gigs.

What to IGNORE from it: 套壳站/API-reselling/发卡站 (account reselling — ToS risk),
video-translation content arbitrage (rights violations), essay-writing services.

## Cross-cutting conclusions

- **Zero repos in this dump belong in GSE's runtime today.** Everything ADOPT/CANDIDATE is
  either later-stage (post-C3 gates) or reference material. Silent-launch posture unchanged.
- **The "free premium-API via scraped tokens" family appears 3× (grok2api,
  grok-free-web-api-vercel, plus ai-reply-guy's keystroke bypass). Treat any future
  suggestion in this family as pre-rejected** — it's the exact fake-account/proxy-evasion
  red line, and archived-by-owner suggests enforcement risk is real.
- **License watch:** Postiz/Automatisch/Countly/MoneyPrinterV2 are AGPL/GPL — fine to
  self-host separately, never embed into GSE's closed source.
- **Strongest references ranked:** awesome-seo > awesome-generative-ai-apps >
  agentic-ai-starters > velobase-harness > Gemini-Discord-Bot > awesome-n8n-templates (ideas).

## Raw agent reports
- `raw/batch-A-grok-xai-paas.md`
- `raw/batch-B-monetization.md`
- `raw/batch-C-seo-automation-mcp.md`
- `raw/batch-D-growth-social-analytics.md`

— triaged 2026-08-24 by ox-alpha (Hermes), 4 parallel research agents, all URLs fetched live
