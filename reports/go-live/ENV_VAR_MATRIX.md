# Environment Variable Matrix

Every variable the platform reads, classified by whether it's **required to launch**,
**optional** (adds value), or **already set**. Presence is read; values are never
logged or displayed. Live status: `/cockpit/go-live`. Spend impact:
`reports/finance/SPEND_GOVERNOR_POLICY.md`.

Legend: 🟥 required · 🟦 optional · ✅ already set · 💲 has cost implication

---

## Required to launch (🟥)

| Variable | Group | What it unlocks | Cost |
|---|---|---|---|
| `DATABASE_URL` | Infrastructure | Real persistence (picks, members, signals) | $0 free tier |
| `DIRECT_URL` | Infrastructure | Prisma migrations | $0 |
| `NEXTAUTH_SECRET` | Auth | Session signing | $0 |
| `NEXTAUTH_URL` | Auth | Correct auth callbacks in prod | $0 |
| `STRIPE_SECRET_KEY` | Billing | Live checkout + webhooks | 💲 % of revenue |
| `STRIPE_WEBHOOK_SECRET` | Billing | Verified webhook events | $0 |
| `STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID` | Billing | Founding Desk checkout | $0 |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Billing | Pro checkout | $0 |
| `STRIPE_ELITE_MONTHLY_PRICE_ID` | Billing | Elite checkout | $0 |
| `ADMIN_EMAILS` | Auth | Your operator/cockpit access | $0 |

## Already set (✅) — do not touch

| Variable | Note |
|---|---|
| `THE_ODDS_API_KEY` | Present. Evidence capture is **quota-governed** (one sport, h2h/spreads/totals, budgeted to a safety slice of the free 500-credit/mo cap). Never displayed, never broad-fanned-out. |
| *(none required for AI)* | The LLM layer runs on a **free keyless pool** (Pollinations). Jarvis + content work with zero key. |

## Optional — adds value, never blocks (🟦)

| Variable | Adds | Cost |
|---|---|---|
| `OUTCOME_LEARNING_ENABLED` | Begins accumulating learning-eligible settled picks (set to `true` after DB is live) | $0 |
| `REDIS_URL` | BullMQ queue for heavier background jobs | $0 free tier |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in (vs. email only) | $0 |
| `CEREBRAS_API_KEY` / `GROQ_API_KEY` / `DEEPSEEK_API_KEY` / `OPENROUTER_API_KEY` / `TOGETHER_API_KEY` / `GEMINI_API_KEY` | Wider free LLM pool — more capacity + perspective + failover | $0 free tiers |
| `ANTHROPIC_API_KEY` | Paid LLM fallback when the whole free pool is down | 💲 metered |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` + `NEXT_PUBLIC_CF_BEACON_TOKEN` / `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Free cookieless web analytics | $0 |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` / `NEXT_PUBLIC_POSTHOG_KEY` | Free-tier product analytics | $0 free tier |
| `EMAIL_PROVIDER_API_KEY` / `RESEND_API_KEY` | Real outbound email (confirmations, Desk Note) | $0 free tier |
| `STRIPE_*_ANNUAL_PRICE_ID` | Annual billing options | $0 |

## Hard-gated paid lanes — DISABLED unless explicitly enabled (💲)

| Variable | Default | Effect when `true` |
|---|---|---|
| `PAID_SPORTS_DATA_ENABLED` | `false` | Allows enterprise/metered data feeds (free-first ladder otherwise) |
| `PAID_ADS_ENABLED` | `false` | Allows paid acquisition — **blocked until funnel live + a proof signal** |
| `ODDS_API_CAPTURE_MODE` | `HEALTH_ONLY` | `OFF`/`HEALTH_ONLY`/`WATCHLIST_ONLY`/`CAPTURE_ACTIVE` — capture intensity within budget |
| `ODDS_API_CAP_REACHED` | `false` | Force-stop Odds capture if the free cap is hit |

---

## Bootstrap progression flags (🟦 — flip in sequence, see .env.example)

`CANONICAL_HISTORY_ENABLED`, `DERIVED_MODEL_HISTORY_ENABLED`, `PUBLIC_PICKS_ENABLED`,
`FEATURED_PICK_PROMOTION_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `PUBLIC_BLOG_ENABLED`.
All default `false` (safest). Each has documented prerequisites in `.env.example`.
Model/calibration flips are **founder-gated** (MODEL_VERSION + audit), never automatic.

---

*The minimal launch set is the 🟥 rows + the ✅ rows (already done). Everything else is
upside you add when you want it.*
