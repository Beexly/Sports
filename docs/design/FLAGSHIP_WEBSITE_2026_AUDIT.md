# Flagship Website 2026 — Current-State Audit

> Phase 0 of the flagship rebuild. Baseline scoring of every major public + cockpit surface so progress is measurable. Scores are 1–5 (1 = poor, 5 = best-in-class). This is a living document — re-score after each phase.

## Scoring dimensions

1. **Visual intelligence** — does the page *look* like it sees the game differently?
2. **Interaction depth** — can the user filter / scrub / compare / expand / simulate?
3. **Information hierarchy** — is the primary decision obvious?
4. **Brand fit** — premium low-light terminal, "We detect. You decide."
5. **Nav clarity** — can the user find this and know what it does?
6. **Mobile** — designed, not squeezed.
7. **Conversion path** — does it route to value ethically?
8. **Trust / proof** — is the proof clear and honest?
9. **Perf risk** — bundle / motion / image weight.
10. **A11y risk** — contrast, reduced-motion, keyboard, focus.

## Surface scores (baseline — pre-rebuild)

| Surface | Route | Vis | Intx | Hier | Brand | Nav | Mob | Conv | Proof | Perf | A11y | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | `/` | 3 | 2 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | Read-heavy landing; "Receipts" section is good substance, weak motion. |
| Board | `/board` | 3 | 3 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | Strong substance; needs market-movement motion + expandable cards. |
| The House | `/house` | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | NFL hub; risks reading like a board clone. |
| Players (Lab) | `/players` | 3 | 3 | 2 | 3 | 2 | 2 | 3 | 4 | 3 | 3 | 11 `?view=` lenses exposed as conceptual tabs — confusing. Table is read-leaning. |
| Intelligence (landing) | `/intelligence` | 4 | 2 | 3 | 4 | 3 | 3 | 2 | 4 | 4 | 3 | Cinematic methodology, but zero interaction + no live numbers. |
| Engines | `/intelligence/engines` | 3 | 3 | 3 | 4 | 3 | 2 | 2 | 4 | 4 | 3 | 11 engines, jargon-dense; outputs are stagnant reads. |
| Metrics | `/intelligence/metrics` | 3 | 1 | 4 | 3 | 2 | 3 | 2 | 4 | 4 | 3 | Catalog page; pure read. |
| Proof of Record | `/proof` | 3 | 2 | 3 | 4 | 2 | 2 | 2 | 5 | 3 | 3 | Excellent proof substance (Merkle), scattered from peers. |
| Calibration Report | `/performance` | 3 | 2 | 3 | 4 | 2 | 3 | 2 | 5 | 3 | 3 | Honest-band gating is a differentiator; static. |
| CLV | `/clv` | 3 | 2 | 3 | 4 | 2 | 3 | 2 | 5 | 3 | 3 | Beat-the-close benchmark; under-surfaced. |
| Trust Ledger | `/ledger` | 3 | 2 | 3 | 4 | 2 | 2 | 2 | 5 | 3 | 3 | Receipts; scattered. |
| Accountability | `/accountability` | 3 | 2 | 4 | 4 | 3 | 3 | 3 | 5 | 3 | 3 | Already a hub linking all proof — natural consolidation point → **The Proof Room**. |
| The Beat | `/the-beat` | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 3 | Differentiated feed rendered as a ledger/running log — biggest under-used brand surface. |
| Academy | `/academy` | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 4-wing hub; isolated from the live product. |
| Fantasy hub | `/fantasy` | 3 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 4 | 3 | Honesty-first; good. |
| Start-Sit Helper | `/fantasy/lineup` | 3 | 4 | 3 | 4 | 3 | 3 | 3 | 4 | 3 | 3 | Real what-if interaction; was mislabeled "Optimizer". |
| DFS Suite | `/fantasy/dfs` | 3 | 4 | 3 | 4 | 3 | 3 | 3 | 4 | 3 | 3 | Strong interactive optimizer. |
| All-in-One Optimizer | `/optimizer` | 3 | 4 | 3 | 4 | 2 | 3 | 3 | 4 | 3 | 3 | Tabbed workspace; nav placement unclear. |
| Pricing | `/pricing` | 3 | 2 | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 3 | Needs instrument-tier framing + comparison interaction. |
| Navigation | `nav.tsx` | 3 | 3 | 2 | 3 | 1→4 | 2→4 | — | — | 4 | 3 | **Was 10 doors → now 4** (Board, Players, Intelligence, Fantasy & Daily) + The Beat. |
| Logo / lockup | `brand-*.tsx` | 3 | 1 | — | 4 | — | 3 | — | — | 4 | 3 | Strong concept; **no kinetic signature, no favicon variant, no sound**. |

## Top gaps (highest leverage first)

1. **Nav sprawl (10 doors)** — fixed in this rebuild → 4 doors. ✅ (Phase 2/4)
2. **Read-only surfaces** — Intelligence landing, Metrics, all proof pages, The Beat ledger. Owner's #1 directive: *no read-only*.
3. **The Beat under-used** — ledger today; should be a cinematic broadcast (flagship).
4. **Players 11-subtab confusion** — collapse to Lab + Edge + lenses/filters.
5. **Proof scattered across 5 routes** — consolidate into one branded surface (**The Proof Room**).
6. **Logo is static** — needs kinetic signature + favicon + optional sting.
7. **Mobile second-class** — tables + dense surfaces need a mobile strategy.

## Phase-1 progress log

- **2026-06-20** — Nav condensed 10 → 4 doors (desktop + mobile parity); DFS→Daily; "Lineup Optimizer"→"Start-Sit Helper"; "Receipts"→"The Proof Room" grouping; Trend Lab moved under Players; Academy folded under Intelligence ("Learn the Signal"). Typecheck + brand-safety green. No new routes introduced (zero dead links).
