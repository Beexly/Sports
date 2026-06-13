# GSE Pricing & Value Architecture Sprint — QUEUED (not yet executed)

**Status:** Queued 2026-06-13, deliberately **not executed** in the go-live session.

**Why queued, not built now:** This is a large, multi-deliverable re-architecture
(pricing config, feature-gating system, promo engine, forecasts, competitor
audit, onboarding, analytics plan, ~15 docs). It is also **owner-gated** — the
owner is actively deciding the pricing model. Cramming it in before the live
audit would have rushed it and risked the verified-green launch. Build it as a
focused sprint after the audit + after the pricing decisions below are made.

## Critical product correction (must honor when built)

The sprint spec says: **Free users must NOT receive all picks, the full board,
full reasoning, full props, full alerts, or full signal inventory.** Free is a
*trust preview* (methodology, education, responsible-gaming framing, a limited
sample/preview, partial board with locked rows, No-Bet examples, proof
snippets). The paid product must not leak into Free.

**Conflict to resolve:** Current `apps/web/lib/pricing/pricing-phases.ts` +
`CLAUDE.md` define Free as "1 pick/day, no confidence scores." That is already
limited, but the sprint wants a richer locked-preview model and a 4-tier ladder
(Free / Pro / Elite / Operator). There is also an **open, different proposal**
in PR #14 (weekly billing + VIP tier). These three pricing models must be
reconciled into ONE owner-approved source of truth before implementation.

## Recommended ladder (from the spec — owner to confirm)

| Tier | Founding | Future target | Promise |
|---|---|---|---|
| Free — Signal Preview | $0 | $0 | "Understand how Galaxy thinks." |
| Pro — Edge Board | $14.99/mo · $99/yr | $19/mo · $149/yr | "Read today's board with confidence." |
| Elite — Galaxy IQ | $24.99/mo · $179/yr | $39/mo · $299/yr | "Understand the market behind the board." |
| Operator — Command | waitlist | $79/mo · $699/yr | "Run a serious workflow." (do not launch until infra real) |

Positioning: a **sports-intelligence operating system**, not "more picks."
Emotional value: "I feel less exposed to hype, noise, stale data, forced action."

## Owner decisions needed before build (see OWNER_DECISIONS_NEEDED.md)

1. **Which pricing model wins** — phase-ladder (current) vs this 4-tier vs PR #14 weekly/VIP.
2. Founding-access end date.
3. Free: delayed picks vs sample-only; exact # of free preview signals/day.
4. Annual discount aggressiveness.
5. Operator: public waitlist vs hidden.
6. Refund / trial policy.
7. Promo-code windows + whether to activate live Stripe coupons.
8. Which odds/CLV features are live vs demo vs preview vs disabled.

## Deliverables when built (target dir: this folder)

README · PRICING_DECISION_REPORT · FEATURE_GATING_MAP · CUSTOMER_VALUE_LADDER ·
PROMO_STRATEGY · PROMO_CODES_DRAFT · FORECAST_SCENARIOS · BLIND_SPOTS_AND_FIXES ·
COMPETITOR_ALIGNMENT_AUDIT · COMPLIANCE_COPY_GUARDRAILS · IMPLEMENTATION_NOTES ·
FILES_CHANGED · OWNER_DECISIONS_NEEDED · NEXT_BUILD_PROMPT.

Full brief: `NEXT_BUILD_PROMPT.md`.

## Compliance guardrails (carry into all copy)

Banned: lock, guaranteed, free money, risk-free, can't lose, sharp lock, whale
play, retirement/mortgage play, easy cash, safe bet, sure thing. Allowed: signal,
confidence, edge estimate, uncertainty, market movement, No-Bet, volatility,
discipline, historical calibration, informational only. Responsible-gaming
language on every paid conversion surface. (These already pass the repo's Trust
Gate + Brand Safety CI — keep it that way.)
