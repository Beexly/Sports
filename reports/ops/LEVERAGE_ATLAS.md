# Leverage Atlas — every external program, free tier, and partner edge for Galaxy Sports Edge

**Owner directive (2026-07-17):** "Just because I listed Google + AWS doesn't mean there
aren't other developer programs we can leverage … map anything that provides positive
value, positive leverage, or improves our model — even a 0.5% improvement is still an
improvement. Improve, not remove."

**Scope:** the full external-leverage surface for GSE (Next.js/TS, Postgres, Redis,
Stripe, Claude, sports data, subscriptions). The AWS/Google deep-dive lives in
`CLOUD_CREDIT_LEVERAGE_STRATEGY.md`; this is the superset. Every activation is a
founder account/console step — documented, never auto-executed; no secrets in code.

---

## Top 6 to claim now (highest value × lowest friction, GSE qualifies for all)

1. **Microsoft for Startups Founders Hub — up to $150,000 Azure credits, NO funding/VC
   needed** (bootstrapped/solo/pre-revenue qualify; self-serve ~$1–5K, top tiers via an
   Investor Network referral). Includes **Azure OpenAI**, GitHub Enterprise, M365,
   LinkedIn Premium. → the single largest infra runway available to us; can host DB,
   Redis, compute, object storage, and an OpenAI shadow/eval lane.
2. **NVIDIA Inception — FREE, up to $100K DGX (H100) cloud credits**, stacks with up to
   **$100K AWS Activate** + up to **$150K Nebius**, plus **free NVIDIA NIM inference
   endpoints** (build.nvidia.com). Eligibility: ≥1 developer, working website,
   incorporated, <10 yrs, no crypto — **GSE's original edge-engine ML qualifies**. This
   is the model-improvement lever (GPU for training/backtesting) AND it unlocks the AWS
   AI-tier nomination.
3. **Cloudflare (free tier + startup program)** — **R2 object storage: 10 GB + $0
   egress** (perfect for ledger snapshots / proof-receipt exports / the verification
   surfaces we shipped), **Turnstile: unlimited free bot protection** (auth/signup),
   **Web Analytics: unlimited free** (we have none), Workers 100K req/day. Startup
   program covers R2 to $10K, Workers AI to $50K.
4. **PostHog (generous free tier + $50K PostHog-for-Startups)** — 1M events, 5K session
   replays, 1M feature-flag requests, 100K error events **free**. Fills our **zero-analytics
   gap** with product analytics + **feature flags + A/B experiments** (optimize the paywall
   / confidence-display / funnel → revenue), **LLM observability** (track the Claude cost
   lever), session replay, and error tracking. Best single observability pickup.
5. **AWS Activate Founders** ($1,000 + $350 Developer Support) + route Claude → **Bedrock**
   on credits (already code-complete — see the cloud-credit doc).
6. **Google Developer Program / Google-for-Startups** — $500/yr (or $10–$100/mo via AI
   Pro/Ultra) Cloud credits → **Vertex** (Claude, incl. the **$10K Anthropic partner
   credit** the code already targets) + **BigQuery** for edge-lab/backtest at scale.

**Stacking:** these are NOT mutually exclusive. NVIDIA Inception + AWS Activate + Azure
Founders Hub + Cloudflare/PostHog startup programs can stack to **$300K–$500K+** in
combined credits/benefits. Sequence: incorporate → NVIDIA Inception (free, unlocks
referrals) → AWS Activate + Azure Founders Hub → tooling programs.

---

## Full map by category

### A. Cloud & compute credits
| Program | Value | GSE fit | Owner action |
|---|---|---|---|
| **Azure Founders Hub** | up to **$150K**, no funding | host everything + Azure OpenAI eval lane | apply (business verification) |
| **AWS Activate** | $1K Founders → $100K Portfolio, $300K AI tier | Bedrock (Claude on credits), RDS, SES, S3 | apply Founders now |
| **Google Dev/Startups** | $500/yr–$100/mo; $10K Anthropic partner | Vertex (Claude), BigQuery, Cloud SQL | join / apply |
| **NVIDIA Inception** | free; $100K DGX H100 + stacks | **train/backtest the edge engine**; free NIM | apply (year-round) |
| **Oracle Cloud Always-Free** | ARM VMs free forever | already scaffolded: Redis + Ollama LLM lane (`docker/oracle-vps`) | optional deploy |
| **Cloudflare** | R2 $0-egress, Workers, startup caps | object storage for proofs/exports, edge | free signup |

### B. AI / LLM inference lanes (Claude stays source-of-truth; these are cost/eval lanes)
| Lane | State | Use |
|---|---|---|
| **Bedrock / Vertex** (Claude) | **code-complete**, env-flip | move the AI bill onto AWS/Google credits at zero premium |
| **Cerebras free lane** (`providers/cerebras.ts`) | scaffolded | $0 non-critical drafts |
| **NVIDIA NIM** (Inception) | free endpoints | prototyping / shadow eval |
| **Azure OpenAI** (Founders Hub) | credits | shadow/eval alternative for non-pick content only (model-freeze holds for picks) |
| **Groq / Together / OpenRouter** | free/cheap tiers | fast fallback lanes |
| Oracle VPS **Ollama** (llama3.2) | scaffolded | $0 local LLM floor |

### C. Sports data — the model-improvement lever (rights-gated via our clearance engine)
| Source | License note | Value |
|---|---|---|
| **nflverse** (using) | CC-BY-4.0 | free NFL PBP/EPA/WP — own-data commercial OK |
| **Big Balls Sports Data** | hosted nflverse, free 1K/day (2K w/ GitHub) | drop-in nflverse PBP+EPA API, no infra |
| **MLB StatsAPI + Baseball Savant** (loaders exist) | public facts | Statcast, platoon splits |
| **Open-Meteo** | free, **commercial OK**, no key | NFL weather features (wind/precip) at $0 |
| **balldontlie** | free tier | multi-league expansion |
| **MySportsFeeds** | **non-commercial only** → `permission_required` | evaluate only; do NOT ingest commercially |
| Kaggle / Google Dataset Search | per-dataset | injury history, historical lines |

> **Rights discipline (non-negotiable):** every new source MUST pass the Scraping
> Clearance Engine + get a `source-rights-registry` classification before ingestion.
> This atlas PROPOSES sources; classification is a founder/counsel step. Open-Meteo and
> the nflverse family are the clean, high-value adds; MySportsFeeds is non-commercial and
> stays research-only.

**Model-improvement thesis:** more clean features (weather via Open-Meteo, deeper
Statcast, hosted nflverse EPA) → richer as-of feature store → more candidates through the
§5 trials registry → more honestly-admitted edges. GPU credits (NVIDIA/AWS/Azure) → more
edge-lab experiments + bigger walk-forward backtests per unit time. Both compound.

### D. Observability, analytics & growth optimization (currently ZERO wired — real gap)
| Tool | Free tier | Use |
|---|---|---|
| **PostHog** | 1M events, feature flags, A/B, replays, LLM obs | funnel + paywall optimization, Claude cost/quality, drop-off |
| **Sentry** | 1 user, 5K errors | deeper error/perf tracing (add after PostHog) |
| **Cloudflare Web Analytics** | unlimited free, cookieless | privacy-first traffic |
| **Google Search Console + News Publisher** | free | already shipped `/news-sitemap.xml` — submit it |
| **Bing Webmaster + IndexNow** | free | instant indexing of new picks/journal (complements the News sitemap) |

### E. Email / push / notifications (the Elite + watchlist alert channel)
| Provider | Free/cheap | Fit |
|---|---|---|
| **AWS SES** | $0.10/1k, 3K/mo free yr1 | email alerts via the existing SigV4 signer (seam at `alert-dispatch.ts:92`) |
| **Google FCM** | free | push alerts |
| **OneSignal** | free push tier | drop-in web/mobile push |
| **Resend / Brevo / Postmark** | free 3K/mo tiers | email alternative to SES |
| **Twilio** | startup credits | SMS (optional, higher cost) |

### F. Payments, security, dev tooling
| Program | Value |
|---|---|
| **Stripe** (using) | Atlas incorporation + credits, Tax, adaptive pricing, Radar fraud |
| **Cloudflare** WAF/DDoS/Turnstile | free security perimeter |
| **Let's Encrypt** | free TLS (via Vercel/Cloudflare) |
| **GitHub** (using) | Actions minutes, Copilot, Codespaces; Startup discounts on Linear/Notion/Figma/Sentry via Activate + Founders Hub marketplaces |

---

## The "0.5% improvements" list (compounding small wins)
- **Open-Meteo weather features** — free, commercial-OK NFL weather → a real edge factor at $0.
- **IndexNow** — new picks/journal indexed in minutes, not days → SEO/traffic lift.
- **Turnstile** on signup — cut bot/fraud signups → cleaner funnel + Stripe Radar synergy.
- **PostHog feature flags** — A/B the paywall copy, confidence framing, CTA → conversion lift.
- **Cloudflare R2** — archive proof receipts / ledger snapshots at $0 egress → the
  verification surfaces we shipped get durable, cheap public storage.
- **LLM observability (PostHog)** — watch Claude token cost/quality → tune prompts, catch
  regressions, prove the Bedrock/Vertex credit routing is working.
- **NIM / Cerebras / Groq free lanes** — offload non-critical drafts off the paid Claude bill.

---

## What needs a founder account/key before code can wire it
Nearly all of the above require the owner to create the account and set an env key first.
Once provisioned, the ready-to-wire code hooks are: the alert channel seam
(`alert-dispatch.ts:92`, SES/FCM/OneSignal), analytics/flags SDK init (PostHog),
IndexNow ping (a tiny gated helper), and R2/object-storage for proof exports. Say which to
prioritize and I build it behind a flag with tests.

---

## Sources
- Microsoft Founders Hub: https://www.microsoft.com/en-us/startups , https://learn.microsoft.com/en-us/startups/microsoft-for-startups/overview
- NVIDIA Inception: https://www.nvidia.com/en-us/startups/
- Cloudflare R2 / free tier: https://www.cloudflare.com/products/r2/ , https://www.cloudflare.com/startups/
- PostHog / Sentry: https://posthog.com/blog/posthog-vs-sentry
- Sports data: https://www.thesportsdb.com/free_sports_api , https://www.balldontlie.io/ , https://open-meteo.com , https://www.mysportsfeeds.com/data-feeds/
- (AWS/Google specifics + sources: see CLOUD_CREDIT_LEVERAGE_STRATEGY.md)
