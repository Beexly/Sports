# Einstein Layer — Market Relativity & Belief Physics — Status

*Additive, shadow-only. No live gate, priced flag, customer pick, or model weight touched.
`packages/engine/src/einstein` — 35 fixture tests green, typecheck clean. Galileo gave GSE eyes;
Einstein gives it frames and invariants.*

Thesis: **an edge is not a prediction — it is a temporary non-equilibrium where reality,
attention, liquidity, and book policy have not yet reconciled.** The core object is a
time-locked, causal, adversarially-tested **belief-state transition**.

## What is real (built + unit-tested on fixtures)

| Invention | Module | What it does |
|---|---|---|
| 12 Market Relativity Tensor | `observer-frame.ts` | every book/exchange/DFS/attention source as a frame; FrameDistortionResiduals + cross-frame invariants |
| 13 Information Light Cone | `information-light-cone.ts` | knowability as physics; FAILS CLOSED on future leakage / not-knowable |
| 14 Shock Calculus | `shock-calculus.ts` | typed shocks + causal operators + assumption cards; observed→diagnosis (stale_book / attention_contaminated / absorption / reversion) |
| 15 Conservation Law Engine | `conservation-law.ts` | usage-share, alt-tail-vs-median, TD-vs-role, movement-without-parent — coherent-world checks |
| 16 Flesh State Vector | `flesh-state-vector.ts` | latent role state + role-state transition detection ("priced Role State 2, reality is 4") |
| 17 Book DNA Genome 2.0 | `book-genome.ts` | traits by family × shock × time × liquidity × season → BookGenomeFingerprint + lag map |
| 18 Regime Topology | `regime-topology.ts` | market state from surface shape → named regimes; some suppress action |
| 19 Tradability Filter | `tradability-filter.ts` | the friction cascade — EXECUTABLE_SHADOW / THEORETICAL_ONLY / FRICTION_KILLED / DATA_QUALITY_FAIL |
| 20 Negative Discovery Ledger | `negative-discovery-ledger.ts` | graveyard of false edges; suppresses repeats by structural signature |
| 21 Experiment Allocation | `experiment-allocation.ts` | ranks research by info-gain per cost/risk/rights |
| 22 Market Autopsy | `market-autopsy.ts` | scores whether confidence was DESERVED before the result (deserved/lucky/unlucky) |
| 23 Self-Disproof Court | `self-disproof-court.ts` | 9 engine-specific prosecutors; one FAIL caps at WATCHLIST |
| core | `belief-transition.ts` | assembles all of the above into one record + a conservative disposition |

**Golden scenarios proven end-to-end** (`__tests__/golden.test.ts`): (A) injury shock with a
lagging derivative prop → EXECUTABLE_SHADOW; (B) public overreaction with no causal conservation
support → WATCHLIST; (C) apparent stale book killed by friction → FRICTION_KILLED.

## What is shadow / fixture-only

All of it. The engines are unit-tested on deterministic fixtures, not yet fed real timestamped
surfaces. No candidate has run the live gauntlet; nothing emits a pick or touches a gate.

## Missing data

Dense multi-snapshot odds across the week; historical prop alt-ladders; flesh-state feeds
(injury/practice/snap/route/target timestamps); shock timelines (event/first-seen/confirmed/
absorption); attention feeds for narrative gravity.

## Exact next calibration experiment

Unchanged in target, expanded in ambition: one dense timestamped NFL week, but the deliverable is
no longer "does a stale book exist?" — it is **can GSE detect a finite-speed belief-propagation
event, classify its cause (shock calculus), prove it was knowable (light cone), identify the
lagging observer frame (relativity tensor), and show whether the gap survived execution friction
(tradability) before correction?** Output: a Market Physics Calibration Atlas (book lead/lag by
family, absorption half-life by shock type, conservation violations, CLV-vs-executable split,
regime labels, negative discoveries). ~one week's historical credits, justified because it
calibrates the whole instrument. No bet, no gate.

## Guardrails honored

No global "no edge"; only "this hypothesis failed / this market appears efficient under tested
conditions / this data is insufficient / CLV-only / needs shadow tracking." No publish-gate, no
priced flags, no model weights, no paid calls made. Branch `claude/keen-ptolemy-t38f1g`.
