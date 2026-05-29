# Responsible Intelligence Layer — Galaxy Sports Edge

## Purpose

Galaxy must know **when to slow the user down** — show risk, route to
Academy, elevate the No-Bet doctrine, or pause for an interstitial.
That is the Responsible Intelligence Layer.

It is the only system in Galaxy whose explicit goal is to slow a bet.

## Architecture

```
apps/web/lib/responsible-intelligence/
├── friction.ts    # 7 contextual friction prompts
└── restraint.ts   # 6 always-eligible restraint affordances
```

## Friction (contextual)

Seven triggers and seven prompts:

1. `parlay-correlation-high` — modal, reads diagnostic first.
2. `tilt-cascade-detected` — modal, elevates Responsible Play.
3. `stale-data-on-bet-surface` — inline, verify freshness.
4. `no-bet-list-not-checked` — inline, the pass list is the cheapest edge.
5. `evidence-card-skipped` — inline, open the evidence card.
6. `first-time-on-betting-surface` — inline, methodology context.
7. `post-loss-within-cooldown` — modal, bias toward restraint.

Every prompt's actions are restricted to **navigation actions only** —
never a bet, never a stake change. `isLegalAction()` asserts.

## Restraint (permanent floor)

Six always-eligible restraint affordances:

- Responsible play link
- Self-exclusion options
- Session time summary
- No-Bet doctrine link
- Cool-off link
- Support resource link

All of these are **never gated by tier**. `isRestraintGatedByTier()`
returns `false` as a literal type.

## Authority

- Constitution #11 (clarity is the default)
- Constitution #14 (no autonomous publishing or betting)
- Responsible-play link required on every betting-adjacent surface
- AI Assistant Boundary ab-001 (no place-bet)

## Cadence

- Per-release: verify every betting-adjacent surface still inherits
  the restraint floor via Footer + per-surface inline disclosures.
- Quarterly: review friction prompt triggers and copy.
- Owner-only amendments.
