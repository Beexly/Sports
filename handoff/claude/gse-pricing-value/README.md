# GSE Pricing & Value — Handoff Package

Status: **Increment 1 shipped to production.** The value architecture is
implemented, integrated into the live `/pricing` page, tested, and deployed.
Remaining work is owner-gated (Stripe secrets, pricing-model finalization) or the
next build increment (onboarding, locked-state components on more surfaces).

## Read in this order
1. `START_HERE.md` — what this is, the product correction, why queued vs built.
2. `CUSTOMER_VALUE_LADDER.md` — the 4-tier ladder (the shipped model).
3. `OWNER_DECISIONS_NEEDED.md` — **decisions only you can make** (model, Stripe, promos).
4. `IMPLEMENTATION_NOTES.md` — what shipped + next increments.
5. `FORECAST_SCENARIOS.md` — illustrative revenue planning (assumptions).
6. `BLIND_SPOTS_AND_FIXES.md` — risk register (top blocker: Stripe secrets).
7. `NEXT_BUILD_PROMPT.md` — the full sprint brief for the next builder.

## Shipped code (live)
- `apps/web/lib/pricing/value-architecture.ts` — 4-tier ladder (prices from `pricing-phases.ts`).
- `apps/web/lib/pricing/feature-gates.ts` — 26-feature gating map (customer copy + status + lock behavior).
- `apps/web/lib/pricing/promo-codes.ts` — 7 promos, all inactive/unapproved.
- `apps/web/lib/analytics/events.ts` — 20-event funnel plan (inert no-op).
- `apps/web/app/pricing/page.tsx` — integrated positioning + value ladder + Operator waitlist + confidence/No-Bet sections.
- Tests: `__tests__/pricing-value-architecture.test.ts` (22), `__tests__/analytics-events.test.ts` (5).

## Feature gating (summary — full detail in `feature-gates.ts`)
Free = education + previews + samples + No-Bet examples + proof snippets (no full
product). Pro = full board + reasoning + confidence + No-Bet reasoning + proof +
Parlay MRI. Elite = Galaxy Twin + market movement + calibration + CLV + premium
Academy. Operator (waitlist) = exports + scenario + exposure tracking.

## Promo strategy (summary — full detail in `promo-codes.ts`)
GALAXYFOUNDING (founding), KICKOFF20 / CFBPREP15 / BLACKFIELD30 (annual-only
seasonal), IQUPGRADE (Pro→Elite), RETURN15 (win-back, hidden), NOHYPE (content
unlock, no discount). **All inactive + unapproved**; non-stackable; each carries
compliance copy + a kill-switch metric. No Stripe coupons created.

## Compliance copy guardrails (enforced by test + CI Trust Gate/Brand Safety)
- **Banned:** lock (as a pick), guaranteed, free money, risk-free, can't lose,
  sharp lock, whale play, retirement/mortgage play, easy cash, safe bet, sure thing.
- **Allowed:** signal, confidence, edge estimate, uncertainty, market movement,
  No-Bet, volatility, discipline, historical calibration, informational only.
- Responsible-gaming language on conversion surfaces. 21+. No guaranteed profit.

## Competitor alignment (note — full audit pending)
Position against picks-sellers/odds tools/DFS optimizers/trackers by **reframing**,
not matching checkboxes: the differentiators are No-Bet (restraint as a feature),
proof/calibration (auditable claims), and the intelligence-OS framing — not
"more picks." A checkbox ≠ a feature; do not overstate parity. Full per-feature
audit is the next doc to write.

## Files changed
See `git log` on `claude/eloquent-goldberg-der80z`. Pricing commits:
value-architecture layer (31e7479), lint fix, pricing-page integration (9b4e6c5),
analytics plan, docs. Production hotfix earlier: StatKing data bundling (781f37f).
