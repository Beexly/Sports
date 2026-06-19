# Spend Governor Policy — Workstream O

**Status:** Live · zero-spend by default
**Source of truth (code):** `apps/web/lib/spend/spend-governor.ts`
**Cockpit surface:** `/cockpit/spend`
**Posture:** The platform launches and operates at **$0/month**. Every service that
*could* cost money is enumerated, gated, and reported. Spend is **earned by proof**,
never assumed.

---

## 1. The one rule

> Nothing spends real money unless an owner-set environment flag explicitly authorizes
> it, and (for anything above the essential band) a **verified proof signal** clears the
> upgrade gate.

The governor is a **pure reporting + decision layer**. It does not itself spend or
authorize spend at runtime — it reads the **presence** of env vars (never their values)
and reports, in one owner-facing view, exactly where money *could* leak and what holds
it back. The actual gates live with each service; this layer unifies them.

---

## 2. Governance modes

| Mode | Meaning |
|---|---|
| `FREE_ONLY` | Runs only on its $0 path; any paid path is blocked. |
| `OWNER_APPROVAL_REQUIRED` | A paid/owner-provisioned path exists but is not yet authorized. |
| `PAID_ENABLED` | Owner has explicitly authorized paid/keyed use. |
| `CAP_REACHED` | A spend/quota cap has been hit; further use blocked. |
| `DISABLED` | Service entirely off (hard gate). |

## 3. Cost classes

| Class | Nature of the default-path cost |
|---|---|
| `free_keyless` | $0, no key, no quota (keyless LLM/image pool, browser TTS). |
| `free_quota` | $0 within a free quota/credit tier. |
| `owner_paid_flat` | Owner-provisioned flat / per-transaction (Stripe, email plan). |
| `owner_paid_metered` | Owner-provisioned per-call metered (paid LLM, paid data, ads). |

---

## 4. The governed services (default posture)

| Service | Category | Cost class | Default mode | Authorizing flag(s) |
|---|---|---|---|---|
| Free LLM pool (keyless Pollinations + keyed-free) | llm | free_keyless | **FREE_ONLY** | — (always on) |
| Anthropic Claude (paid fallback) | llm | owner_paid_metered | OWNER_APPROVAL_REQUIRED | `ANTHROPIC_API_KEY` |
| Free image pool (keyless URL builders) | image | free_keyless | **FREE_ONLY** | — (always on) |
| Higgsfield generation (paid credits) | image | owner_paid_metered | OWNER_APPROVAL_REQUIRED | `HIGGSFIELD_GENERATION_ENABLED` **and** `OWNER_VISUAL_SPEND_APPROVED` |
| Browser speech (STT + TTS) | voice | free_keyless | **FREE_ONLY** | — (always on) |
| The Odds API (licensed, free 500-credit tier) | sports_data | free_quota | **FREE_ONLY** | `THE_ODDS_API_KEY` (present) · cap: `ODDS_API_CAP_REACHED` |
| Paid sports data (Sportradar/SportsDataIO) | sports_data | owner_paid_metered | **DISABLED** | `PAID_SPORTS_DATA_ENABLED` |
| Email provider (free tier) | email | free_quota | OWNER_APPROVAL_REQUIRED | `EMAIL_PROVIDER_API_KEY` **or** `RESEND_API_KEY` |
| First-party analytics (+ optional free GA4/PostHog) | analytics | free_quota | **FREE_ONLY** | (optional) `NEXT_PUBLIC_ANALYTICS_ENABLED`, `NEXT_PUBLIC_GA4_ID`, `NEXT_PUBLIC_POSTHOG_KEY` |
| Stripe (per-transaction, revenue-coupled) | payments | owner_paid_flat | OWNER_APPROVAL_REQUIRED | `STRIPE_SECRET_KEY` |
| Paid acquisition / ads | ads | owner_paid_metered | **DISABLED** | `PAID_ADS_ENABLED` |

**Key facts:**
- With an **empty environment**, every service is `FREE_ONLY` or `OWNER_APPROVAL_REQUIRED`
  or `DISABLED` — **`zeroSpend = true`**, asserted by test.
- The Odds API key is **already present** in the deployment. Its cost class is `free_quota`:
  it resolves to `FREE_ONLY` (quota-governed evidence capture), **not** paid spend. The key
  is never displayed or logged.
- Stripe's "spend" is a percentage of revenue collected — it only costs when it earns.

---

## 5. Proof-gated upgrade ladder

Spend bands escalate only when real traction is proven (or the owner explicitly approves).

| Band | Monthly ceiling | Unlock rule |
|---|---|---|
| `ZERO` | $0 | Always allowed — the standing posture. |
| `ESSENTIAL_0_25` | $25 | A small, essential cost (e.g. a domain) — **owner approval** suffices. |
| `PROVEN_25_100` | $100 | Requires **any one verified proof signal** (below). |
| `FUNDED_100_PLUS` | $100+ | Requires **sustained revenue, a sponsor, or owner approval**. |

### Proof signals (real, countable — never fabricated)

| Signal | Threshold |
|---|---|
| Paid members | ≥ 10 |
| Email subscribers | ≥ 100 |
| Ask Galaxy submissions | ≥ 25 |
| Total revenue | ≥ $100 |
| Signed sponsor | ≥ 1 |
| Owner approval | explicit |

Counts are supplied from **real data** (Stripe rows, the email store, Ask Galaxy
submissions, settled revenue). `evaluateUpgrade(band, counts)` is pure and data-driven —
it never authorizes a band on assertion.

### Paid ads — the hard line
Paid acquisition is `DISABLED` and stays so until **all three** hold: (1) the funnel is
live end-to-end, (2) a proof signal clears `PROVEN_25_100` or higher, and (3) the owner
sets `PAID_ADS_ENABLED=true`. There is no default path to ad spend.

---

## 6. What this guarantees

- **No accidental spend.** Flags default off; the governor reports `zeroSpend` until a
  flag is set, and the spending services are listed explicitly.
- **No secret leakage.** Presence-only checks; values never appear in the report, the
  cockpit, logs, or tests (asserted).
- **No unearned escalation.** Higher spend bands require verifiable traction.
- **Honest degradation.** When a free path is the only authorized one, the affected
  capability degrades honestly (e.g. signups queue as pending) rather than silently
  failing or spending.

---

*Generated as part of the launch-lock program. Update this doc whenever a service is
added to `GOVERNED_SERVICES` or a gate changes.*
