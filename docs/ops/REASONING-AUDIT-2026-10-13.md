# REASONING-AUDIT 2026-10-13 (Section 5b + 5c)

Trace continuity: 2026-10-13T173138Z0000-3fdf15a4

## 5b — What the reasoning engine outputs today

Two engines, two roles:

1. `intelligence/reasoning_engine/run_game.py` (the mind's per-game host).
   Before this change it output: facts, gaps, trace_label, checklist, levels,
   mint, and then collapsed everything into `pick: None, confidence: None`
   with a "Withheld." note. The L3 causal chains the reasoning layer builds on
   the trace (`reasoning/schemas.py: ReasoningTrace.chains`) were DROPPED on
   the floor. A game came back as a bare withhold. That is the MNF failure mode.
2. `packages/prediction-engine` (the TS scoring pipeline).
   Emits ScoredPick rows with factor breakdowns; the publication gate is
   `pricesWorseThanMarket` (safety, sealed 13e945f06) + `calibrationHistoryWithholds`.

## Where causal chains live

- Built: `intelligence/reasoning/levels.py run_l3` → `trace.chains` (CausalChain
  of CausalLink: cause → mechanism → outcome + verification + breaking conditions).
- Adversary: `reasoning/adversary.py` evaluates breaking conditions against
  observed values; KILL-verdict legs are never recommended.
- Surfaced in the run document: NO, until this change.

## PASS / null / false short-circuits — audit and classification (5c)

| Location | Behavior | Classification | Action |
|---|---|---|---|
| run_game.py return (`pick: None`) | Terminal collapse of all traces | MISSION-BLOCKING | CONVERTED: always emits `causal_chain` + `ranked_board`; withhold/pass remain as mint action text, never as terminal silence |
| reasoning_engine/mint_gate.py | INVALID or DATA-GAP → withhold, no probability substituted | SAFETY (honesty: a trace does not mint a probability) | KEPT, documented |
| packages/types/src/index.ts pricesWorseThanMarket | PASS decision or adverse expectedClv → drop at mint | SAFETY (the sealed veto; spec: "the only veto that survives is the one you sealed") | KEPT, documented as safety not gate |
| packages/prediction-engine/src/scoring.ts calibrationHistoryWithholds | Broken calibration slice → withhold | SAFETY | KEPT |
| apps/web/lib/picks/adverse-edge-suppression.ts | Drop picks priced worse than market from the board | SAFETY (same rule as the sealed veto, ported web-side) | KEPT |
| packages/prediction-engine/src/edge-engine.ts | Classifies decision as SPEAK/LEAN/PASS | VOCABULARY, not a gate | No change: PASS here is a label on the independentEdge summary |

## The smallest change (made in this commit)

`intelligence/reasoning_engine/run_game.py`:
- `causal_chains(trace, facts)`: serializes `trace.chains`; if the mind built
  no thesis, emits the shortest honest chain — the observed facts themselves,
  typed as context (no directional claim).
- `ranked_board(trace, facts, gaps, decision)`: ALWAYS emits a ranked board
  (TOTAL/SPREAD/MONEYLINE skeleton) with conviction = chain coverage
  = observed / (observed + named gaps), explicitly NOT a win probability;
  breaking conditions carry every named gap as unverifiable-at-this-run; the
  mint action and reason ride along instead of replacing the output.

Verified: `uv run --no-project --with pandas --with pyarrow --with numpy --with polars python` run of `reason_game()` printed the full board (conviction 67,
TOTAL/SPREAD/MONEYLINE ranked, gaps as breaking conditions, mint=withhold with
"a withhold is not a terminal silence"); `pytest reasoning_engine/test_run_game.py`
still passes (pick stays None — it still does not mint a probability; the board
is additive).

## What remains for the full L1–L5 default

- Slate-level: `intelligence/reasoning_engine/slate.py` should call the same
  board surface per game so a whole slate emits ranked boards.
- Directional candidates: when the mind's L3 chains carry thesis legs
  (trace.legs + adversary verdicts), the board should rank those legs by
  verdict + chain strength instead of the surface skeleton.


## L4 UPDATE (later the same day): the two-layer doctrine is now code

Architecture as pushed (6a7929dd3..836411507 + auto-attach):

- `intelligence/reasoning/signals.py` - typed `Signal` records, 10 domains,
  mandatory provenance, likelihood ratios with verification labels,
  `effective_lr()` (contradict -> inverse, neutral -> 1).
- `intelligence/reasoning/bayes.py` - `MarketPrior` + `update()`:
  posterior_odds = prior_odds x prod(LR); every step recorded; LR=1 / neutral
  logged as unapplied, never dropped.
- `intelligence/reasoning/market_priors.py` - Layer 1 for EVERY game: ESPN
  inline odds (DraftKings American strings at moneyline.home.close.odds)
  de-vigged multiplicatively -> MarketPrior (booksum recorded).
- `reasoning_engine/run_game.py` - auto-attaches priors by matchup (named gap
  on failure), always emits `ranked_board` (+ `bayes_updates` when priors
  exist) + `causal_chain`; withhold/pass are mint actions, never silence.
- `reasoning_engine/facets.py` - L1 facts now carry the metric-universe set:
  success_rate, air_yards_per_att, wpa, cpoe_mean, xyac_mean, air/yac EPA
  (point-in-time, same parquet).

END-TO-END PROOF (real data only): DAL@PHI - DK close -120/+100 ->
de-vig 0.5217/0.4783 (booksum 1.0455) x air-density LR 1.10 (Lincoln Financial,
rho 1.1891, MEASURED) -> PHI posterior 0.5455 with the step shown; DAL flat
0.4783 (no firing signals - honest). Kalshi cross-check: 0.51 -> 0.5338.

DEFAULT BEHAVIOR NOW: every run emits ranked board + chain + (when odds exist)
Bayesian posterior with full update math. PASS/withhold survive only as the
mint action text - the only veto that remains is the sealed pricesWorseThanMarket
safety rule.
