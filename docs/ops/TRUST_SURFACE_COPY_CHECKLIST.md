# Trust-surface copy checklist (1-page)

**Owner:** GSE (product) · **Orchestra:** GSE Main · **Consumers:** Design & Intel (UI copy), Company Docs, Figma Ship Bridge  
**Locked:** 2026-09-23 (GSE Main B + C) · **Brand:** "We're not AI. We're math you can read." Deterministic factor-model — never tip-sheet / +EV autopilot

## Rule

Any user-facing claim on board, pricing, receipts, LIVE_BOARD, stats, or marketing must **cite a ledger/source** or be **explicitly labeled a claim**. Fake readiness is a fail.

## Checklist (every string / UI chip / hint)

| # | Check | Pass when |
|---|--------|-----------|
| 1 | Source or label | Number/claim ties to AGENT_LEDGER / metrics / receipts / documented gate — or says "claim" / "estimate" / "not live" |
| 2 | No invented readiness | Never say live / proven / ready / DONE without DoD evidence |
| 3 | Gate honesty | PUBLIC_PICKS, LIVE_BOARD, PERFORMANCE_STATS, PRICING_PHASE stay inert unless founder-flipped; copy must not imply flipped |
| 4 | Drop / withhold reasons | Prefer named drop reasons and coverage counts over silent empty boards |
| 5 | Positioning vocab | Pass brand lint (`docs/positioning.md`, `positioning-vocab.json`) — no AI-picks / tip / lock / guaranteed |
| 6 | Per-unit proof | Prefer per-pick / per-market / per-window evidence over vague scale claims |
| 7 | Evidence-before-narrative | WP/C ship rhythm: implement → test → ledger → PR. No Galaxy-style event framing on GSE until LIVE_BOARD trust gates are real (Main C) |

## Fail examples

- "Live board is ready" while LIVE_BOARD gate is off
- "Our AI locks winners tonight"
- Marketing "millions of …" without a sourced ledger row
- Marking C-xx DONE without SHA/PR/DoD

## Pass examples

- Coverage hint: "TOTAL withheld — top reason `confidence_below_floor` (n=…)"
- Pricing: PROVEN amounts with Stripe price IDs matching catalogue; never loosen amount-match
- Stats: "sample too small — showing methodology, not a public win rate"

## Maintenance

Figma Ship Bridge runs brand-lint-ui-copy before UI PRs. Company Docs cites sources on how-tos. GSE re-checks /pricing + Subscribe after catalogue changes. Exceptions → GSE Main only.
