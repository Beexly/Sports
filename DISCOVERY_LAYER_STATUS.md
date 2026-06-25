# Discovery Layer — Autonomous Market-Science Lab — Status

*Additive, shadow-only. No live gate, priced flag, customer pick, or model weight touched.
`packages/engine/src/discovery` — 42 fixture tests green (30 module + 12 acceptance), full engine
suite 174 green, typecheck clean. Galileo gave GSE eyes; Einstein gave it frames and invariants;
the Discovery Layer gives it a **method** — it discovers, tests, compresses, falsifies, and
remembers laws of market belief propagation.*

Thesis: **do not find more picks. Build a machine that turns an observed contradiction into tested
knowledge** — proposing competing causal theories, designing the cheapest experiment that could
kill them, keeping only what compresses and survives out-of-sample, and burying the rest into a
memory that makes the same mistake un-repeatable.

## What is real (built + unit-tested on fixtures)

| Invention | Module | What it does |
|---|---|---|
| 24 Epistemic Compression | `epistemic-compression.ts` | a concept earns its place by explaining the most with the least; classifies LAW / HYPOTHESIS / GHOST; complexity pays rent |
| 25 Market Law Miner | `market-law-miner.ts` | fits linear/inverse/log/sqrt + multilinear forms per feature; ranks by R²−complexity (recovers e.g. `τ ≈ a + b/liquidity`) |
| 24-atom Belief-State Transition | `belief-state-transition.ts` | re-exports the Einstein transition + attaches a discovery **learning outcome** (supports/refutes/neutral + resulting status) |
| 27 Causal Representation Foundry | `causal-representation-foundry.ts` | classifies cause / effect / non-causal; proposes a latent factor only if ≥2 members share variance; decomposes a shock |
| 28 Inverse Bookmaker Mind | `inverse-bookmaker-mind.ts` | infers book POLICY (trapping / shading / slow-to-follow / copying / possibly-mispriced) vs ignorance; exploitable only off-fair + full-limit + non-public |
| 29 Market Dark Matter | `market-dark-matter.ts` | infers hidden information **pressure** (not fact) from sharp-before-public movement; routes to RESEARCH_ONLY + quarantine; no public claim unless source-cleared |
| 30 Belief Geodesic | `belief-geodesic.ts` | path length / displacement / efficiency / reversals / curvature of a belief's journey to its resting point |
| 31 Phase Transition Detector | `phase-transition-detector.ts` | detects regime/role-boundary crossings in a market-state sequence |
| 32 Counterfactual Market Theater | `counterfactual-market-theater.ts` | a world model: replays the timeline under earlier/later news, more attention, thinner liquidity, one sharp reactor, a false rumor, a partial correction → steps, candidate windows, traps |
| 26 Expected Discovery Yield | `expected-discovery-yield.ts` | the research governor — value = decisions changed / gates unlocked / theories killed, per unit cost+rights+eng+complexity |
| 33 Scientific Discovery Council | `scientific-discovery-council.ts` | 10 typed scientific roles run ONE cycle: theorize → ghost-check → select → experiment → trade-test → govern → archive → route |
| 36 Decision Leverage Index | `decision-leverage-index.ts` | the platform's universal currency — a datum matters only if it CHANGES an action under proof constraints |
| 37 Ghost Economy | `ghost-economy.ts` | the graveyard TEACHES: new candidates are penalized for resembling buried failures; the machine remembers humiliation precisely |
| 38 Sensor Placement | `sensor-placement.ts` | which feed / cadence / market family / replay would most improve discovery per unit cost+rights |
| 39 Theory Tournament | `theory-tournament.ts` | selection pressure over theories; buries fitness≤0 / leakage / ghost-resemblance; the survivor is the one that compresses + survives OOS + friction |

**Acceptance scenarios proven end-to-end** (`__tests__/acceptance.test.ts`, real modules, no mocks):

- **A. Confirmed injury shock; derivative props lag.** GSE reconstructs a knowable, court-cleared,
  friction-surviving belief-state transition (light cone → tradability → court → assemble →
  learning outcome), then runs the full council: ≥2 competing theories, derivative-lag wins,
  tradability EXECUTABLE_SHADOW, emits a **shadow-track** task ("no live bet, no gate") and no
  certainty language.
- **B. Rank by compression / OOS survivability.** A simple, broad, OOS-surviving theory is promoted
  to **LAW**; a complex, narrow, in-sample-only theory with *higher raw predictive gain* is buried
  as a **GHOST**. Complexity paid no rent.
- **C. Cheapest falsifying experiment.** A cheap, informative injury-replay outranks an expensive,
  net-negative premium feed (EDY ≤ 0 → "do not spend"); the council selects the same cheapest
  falsifier.
- **D. Detect friction survival.** A theoretically interesting winner with a sub-friction edge is
  flagged **FRICTION_KILLED** and routed to **burial**, not shadow-tracking.
- **E. In-sample mirage buried by the ghost economy.** A resurrected early-season-under resembles a
  buried settlement-negative cluster → suppressed by the Historian, buried by the tournament,
  classified **GHOST** by compression; the survivor (not the mirage) wins.
- **F. Hidden pressure quarantined.** Sharp-before-public movement with no news → **RESEARCH_ONLY**,
  quarantined, `publicClaimAllowed=false`, no insider/leak language; suppressed entirely when a
  public news item already explains the move.
- **G. Ontology earns its keep.** A term that compresses **and** survives falsification is
  **accepted**; a term that adds language but no compression is **rejected**; a compressing term
  that fails falsification is **rejected**.

## What is shadow / fixture-only

All of it. Every module is pure and deterministic (no I/O, clock, or RNG; `Date.parse` of provided
ISO strings only) and unit-tested on hand-built fixtures, **not yet fed real timestamped market
surfaces.** No theory has run the live gauntlet; the council emits research tasks and `PROPOSED`
artifacts only. Nothing here emits a customer pick, sets `priced=true`, flips a gate, or makes a
public claim.

## Laws discovered (on fixtures) / ghosts buried / experiments ranked

- **Discovered (fixture-grade, illustrative):** the Law Miner recovers compact functional forms
  (e.g. absorption time falling with liquidity, `τ ≈ a + b/liquidity`); the council promotes a
  *derivative-prop-lag* hypothesis after a confirmed shock. These are method demonstrations on
  synthetic data, **not** validated market laws.
- **Buried:** the early-season-total-under shape (real, settlement-negative — consistent with the
  killed totals-under mirage in `CLV_FINDINGS.md`) seeds the ghost economy and auto-suppresses its
  own resurrection.
- **Ranked:** experiments are ordered by Expected Discovery Yield; net-negative data buys
  (high-rights, low-information feeds) are flagged "do not spend" before any credit is committed.

## Missing data (what would make the laws real)

Same backbone the Einstein layer needs, now consumed by a discovery loop: dense multi-snapshot
odds across the week (opener→close trajectories), historical prop alt-ladders, flesh-state feeds
(injury/practice/snap/route/target timestamps), shock timelines
(event/first-seen/confirmed/absorption), and attention feeds. Until these arrive, the Discovery
Layer is a fully-wired method with synthetic fuel.

## Exact next empirical calibration plan

One dense, timestamped NFL week (the same one-week historical-credit spend the Einstein atlas
needs — no separate cost), run through the Discovery loop end-to-end:

1. **Reconstruct** the week's belief-state transitions from real surfaces (light cone +
   tradability + court).
2. **Mine** candidate laws (Law Miner) over the real features; record R²−complexity.
3. **Tournament** the survivors; **bury** the rest into a *persisted* ghost economy (the first
   real, non-fixture graveyard).
4. **Rank** the next week's experiments by Expected Discovery Yield; spend only on positive-yield
   sensors (Sensor Placement).
5. **Gate:** a candidate law becomes a `PROPOSED` promotion only after K consecutive independent
   OOS weeks (Bonferroni-over-nights), exactly as Pillar 3's nightly-discovery worker enforces.

Deliverable: a **Discovery Atlas** — laws proposed, theories buried with reasons, ghost economy
seeded, experiments ranked by yield, and a single honest verdict per candidate (LAW / HYPOTHESIS /
GHOST / friction-killed / quarantined). No bet, no gate, no public claim.

## Guardrails honored

No live gate touched. No `priced=true` changes. No public claims. No fabricated data. No future
leakage (light cone fails closed). No auto-publishing. No betting-certainty language (asserted in
the acceptance test). Fixture-safe, deterministic, typed (strict, no `any`), tested. Every output
carries provenance, knowability/light-cone status, rights, data-quality, prosecutor verdict, and
ghost-ledger status. Branch `claude/keen-ptolemy-t38f1g`.
