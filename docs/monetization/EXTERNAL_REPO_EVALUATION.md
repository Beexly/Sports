# External Monetization Repo Evaluation

**Date:** 2026-06-17 · **Scope:** ~20 open-source monetization/ads/billing repos + 3 "claude-ads"
Claude Code skills, evaluated for fit against Galaxy Sports Edge.

> **Bottom line: adopt ZERO as a dependency.** Nearly every idea is either already
> implemented here, would conflict with this platform's (stronger) trust/security
> architecture, or targets the wrong stack/platform. The only genuinely net-new
> primitive — an affiliate **payout ledger** — has been built natively (pure +
> tested, no migration): `apps/web/lib/affiliate/ledger.ts`.

## Why "adopt none" is the correct call

The platform is already mature on monetization. Verified in-repo:

| Capability | Status | Where |
|---|---|---|
| Stripe subscriptions + webhooks (sig verify, idempotency) | ✅ live | `app/api/webhooks/stripe/route.ts`, `lib/stripe.ts` |
| Server-side entitlement gating (no frontend-only paywall) | ✅ live | `lib/pricing/tier-access.ts`, `feature-gates.ts` |
| Annual vs monthly framing + savings math | ✅ live | `components/pricing/pricing-plans.tsx`, `annualSavingsPct()` |
| Soft paywall (server-side seal, in place of gated data) | ✅ live — **stronger than a blur** | `components/pricing/tier-gate-panel.tsx` |
| Failed-payment / past_due status re-sync | ✅ live | stripe webhook `invoice.payment_action_required` |
| AI / agent spend cap + numeric guard | ✅ live | `lib/claude-api/budget-store.ts`, `numeric-guard.ts` |
| Affiliate/sportsbook offers (draft-only) | ✅ live | cockpit `promo-desk`, "Bobby" agent |
| Affiliate **payout accounting** (debits/credits/clawbacks) | ❌ gap → **built here** | `lib/affiliate/ledger.ts` |

Notably, the "blur the locked picks" idea several galleries suggest would be a
**regression**: `TierGatePanel` deliberately does NOT send gated data to the
client (a blur requires shipping the data, then a paywall leak). The current
server-side seal is the safer design.

## Verdicts

### Billing / SaaS infrastructure
| Repo | License | Verdict | Why |
|---|---|---|---|
| uselotus/lotus | MIT | SKIP | Python billing *service*, dormant since 2023; usage-metering solves a problem flat tiers don't have |
| velobase/velobase-harness | MIT | ADAPT-PATTERN (done) | Unproven v0.1.0 boilerplate; ~95% duplicates our stack. Took only the **affiliate double-entry ledger** pattern (stripped its USDT cashout + ad pixels) |
| saasify-sh/saasify | MIT | SKIP | Archived/shut down 2022; API-monetization model |
| Glench/ExtPay | MIT | SKIP | Browser-extension payments via a 2nd processor; conflicts with server-side gating |
| ertugrulakben/cashclaw | MIT | SKIP (concept already covered) | JS agent-earning framework; its "cost cap" idea already exists as `lib/claude-api/budget-store.ts` |
| Freemius/wordpress-sdk | GPLv3 | SKIP | PHP/WordPress; **GPLv3 copyleft hazard** for a proprietary SaaS |

### Paywall / strategy (reference-only resources)
| Resource | License | Verdict |
|---|---|---|
| paywallpro/paywall-gallery | custom (ref-only) | Mine for layout patterns; **reject** urgency timers / pre-checked upsells / token "currency" paywalls (dark patterns → banned-phrase + responsible-gaming conflicts) |
| PayDevs/awesome-oss-monetization | CC0 | Confirms our per-feature gating; "early access" is a clean trust-safe Elite lever |
| thomasbnt/awesome-web-monetization | CC0 | SKIP — Web Monetization API / Coil is defunct; crypto/ILP rails are a regulatory liability for a betting-adjacent product |
| floatinghotpot/coding-to-monetization | n/a | SKIP — ad-supported mobile-app playbook; off-domain |

### Mobile ads / media / misc
| Repo | Verdict |
|---|---|
| cordova-admob-pro, cordova-plugin-admob-free, admob_flutter, admob-plus, cordova-plugin-admob | SKIP — all native/hybrid mobile AdMob; this is a web-only product with no native app |
| vlitejs/vlite | WATCH (conditional) — MIT, TS, ~6KB, Next.js-compatible video/audio player w/ IMA pre-roll; only relevant **if** a media surface ("The Beat") serves video, and only for free-tier ads |
| mayeaux/nodetube | REFERENCE-ONLY — wrong stack (Express/Mongo); its subscription+creator-credit model can inform media packaging |
| WatchItDev/watchit-app | SKIP — web3/blockchain, license unclear |
| PELock SDK | SKIP — Windows .exe protection; irrelevant to server-enforced SaaS |
| FIWARE/catalogue | SKIP — IoT/smart-city; AGPL-3.0 copyleft |

### "claude-ads" links (separate category)
`AgriciDaniel/claude-ads`, `Hainrixz/claude-ads`, `zubair-trabzada/ai-ads-claude`
are **Claude Code skills (plugins), MIT** — dev-time agent tooling, not app code,
the sibling of the already-backlogged `claude-seo`. Use via `/plugin marketplace
add …` in a Claude Code session; nothing to integrate into the app.

## The one net-new build (shipped here)

`lib/affiliate/ledger.ts` — pure, double-entry referral payout accounting:
`accrueCommission` (with a refund-window hold), `clawbackCommission` (refund/
chargeback reversal), `recordPayout` (validated against cleared payable), and
`auditLedger` (double-entry invariant). I/O-free and tested, following the repo's
"primitive built ahead of activation" pattern (cf. `kelly.ts`, `calibration-apply.ts`).

**Owner-gated to activate:** a Prisma model + migration for persistence, and
wiring into the promo-desk surface — both deliberate later steps (no auto-migration).

## Trust-safe polish ideas (optional, not built)

1. **Elite "early access"** — picks drop to Elite a fixed window before Pro (real,
   time-based, non-fabricated upsell).
2. **Trust-first onboarding** — lead the pre-checkout flow with the public
   calibration / track-record page.
3. **`TierGatePanel` honest teaser** — show *aggregate* counts ("7 locked picks
   today across MLB/NHL") — counts/sport labels only, never selections/lines —
   to convey value without leaking gated data.
