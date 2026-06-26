> Companion deep-dive to **GSE_INTELLIGENCE_CORE_AND_FLYWHEEL.md** · Galaxy Sports Edge · 2026-06-23

# GSE Intelligence — The Frontier Addendum
### The genuinely-rare mechanisms, and an honest ledger of what's novel vs. applied

This file exists because "is it the best you can give me?" is the right question to keep asking. The answer is made of two honest parts: (1) a short, hard novelty ledger so we never confuse *applied-well* with *unprecedented*, and (2) six frontier mechanisms that were not yet in the plan and that take GSE from "excellent application of known methods" to "a combination this market has not seen."

---

## The novelty ledger (read this first — it keeps us honest)

**Table-stakes** — everyone *should* do these; few do them well, so doing them well is already an edge:
no fabricated data; uncertainty intervals on every number; a stated model version; responsible-gaming posture.

**Applied-well** — known methods, executed with rigor most consumer tools skip. This is the bulk of the Intelligence Core and it is *genuinely valuable* precisely because it is testable and falsifiable:
hierarchical-Bayesian shrinkage, conformal prediction, Hedge-weighted ensembles, Shin de-vig, isotonic calibration, CLV grading, walk-forward + purged/embargoed cross-validation.

**Frontier-for-this-market** — combinations and postures I believe no consumer sports-intelligence product currently ships together. This is the defensible part, and it is defensible *because it's transparent*, not despite it:
market-anchored reconciliation with **divergence-as-the-product**; **one LadderEvent ledger** coupling price to model activation; **self-published per-position calibration**; and the six mechanisms below.

**Not claimed** — "unknown to science," "no machine has thought of it." We don't need that claim, and making it would be the first dishonest sentence in the company. The moat is *integration + transparency + discipline*, which is rare, compounding, and hard to copy. A secret formula is none of those things.

---

## Frontier mechanism 1 — Cross-market triangulation (three markets must agree)

The Core anchors player projections to the **game total → team total**. The frontier move is to triangulate against a **third, independent market: the player-prop market** (receptions, rush yards, anytime-TD lines, which are widely posted). Now three estimates of a player's outcome exist: (a) bottom-up usage/efficiency, (b) top-down allocation of the team total, (c) the prop market's implied line. 

- Where all three agree → high-confidence projection, tight interval.
- Where bottom-up and the prop market agree but disagree with the naive team-total allocation → a *game-script* signal (the script is redistributing volume).
- Where the prop market disagrees with *both* of GSE's internal views → either a genuine edge **or** a data-quality alarm; the system must decide which, and that decision is logged.

Almost no consumer tool reconciles three markets. It is cheap (the prop data is already licensable via the Odds API), it sharpens every projection, and the triangulation residuals are a second-generation edge signal. *Files:* extend the reconciliation layer (`GSE_INTEL_01` L3) with a `prop-anchor.ts`; feed residuals into the divergence layer.

## Frontier mechanism 2 — The public model parliament

The earned-weight ensemble (Hedge / multiplicative-weights) already runs internally. Make it **public**: a live leaderboard where GSE's own internal models — market-anchored, pure bottom-up, opponent-adjusted-EPA, the dumb baseline — compete each week on out-of-sample CRPS / Brier, with their weights visible and moving. Users literally watch the intelligence evolve and see *which way of thinking is winning right now*. 

This is proof, engagement, and the "learning, growing" narrative in one artifact, and no tout can fake it because it requires a pre-committed history. It also disciplines the team: a model that stops earning its weight is visibly demoted. *Surface:* `/observatory/parliament`, backed by the calibration ledger.

## Frontier mechanism 3 — The community calibration tournament

Turn the audience into a forecasting engine. Let users submit their own weekly projections or pick confidences; score *everyone* with proper scoring rules (CRPS / Brier / log-loss); rank them on a public, season-long calibration leaderboard. The best community forecasters earn status, discounts, or a "verified sharp" badge — and their submissions, **aggregated and extremized** (the superforecasting move that let the Good Judgment Project beat intelligence analysts), become a proprietary consensus signal GSE benchmarks its own models against.

This is a wisdom-of-crowds data flywheel that is also a retention and acquisition engine, and it is almost unheard of in consumer fantasy. It produces proprietary data no competitor has, it's defensible (the community is the moat), and it costs almost nothing to run. *Files:* `lib/tournament/*`, scored through the existing calibration harness; gated behind a flag; respects `draft-only` (no auto-sends).

## Frontier mechanism 4 — Options-style distribution pricing

Stop selling a point estimate; sell the **distribution**. With posteriors (L2) and conformal intervals (L5), every player already *is* a distribution — so price it like one: a player's ceiling is a call-option payoff, their floor is downside protection, "spike-week probability" is the tail mass above a threshold. Best-ball and DFS decisions become explicit risk/portfolio decisions ("this roster is long volatility; this one is long floor"). 

This reframes fantasy from "who scores more" to "how is value distributed and correlated," which is how the sharpest players actually think and how almost no consumer tool presents it. *Files:* extend `bestball.ts` and the projections output with `distribution.ts` (ceiling/floor/spike-prob/bust-risk from the posterior + conformal band).

## Frontier mechanism 5 — Active learning (point the budget at your own ignorance)

The data-dominance program says "ingest everything." The frontier discipline says **ingest what most reduces forecast error per dollar.** The system already knows where it's weakest — the widest conformal intervals, the worst-calibrated reliability buckets, the positions/situations with highest residual variance. Rank those, and let that ranking drive what gets ingested, charted, or modeled next. 

For a solo founder with scarce attention, optimal experiment design is the difference between a year of motion and a year of progress. It also makes a great public artifact: "here's what we're least sure about, and what we're doing about it." *Files:* `lib/metrics/uncertainty-map.ts` reading the calibration ledger; feeds the coverage map and the charting queue.

## Frontier mechanism 6 — Replayable forecast provenance (open-science trust)

The proof layer already hash-commits each slate pre-kickoff. Take it all the way: publish enough that **anyone can replay GSE's entire forecast history** from the hash chain plus the open methodology and independently reproduce the calibration numbers. The track record stops being "trust our screenshot" and becomes a third-party-verifiable artifact, like a reproducible research repo. 

In a market defined by touts who delete their losses, *verifiable* is the whole brand. *Surface:* `/observatory/replay` + a published methodology doc + the integrity ledger.

---

## How these slot onto the ladder

None of these require flipping `canPublishProjections` early or making an un-backtested claim. Triangulation, the parliament, the tournament, distribution pricing, the uncertainty map, and replayable provenance are all either *process-grade today* or *gated behind the same proof milestones* as everything else. They make the FOUNDING phase richer (more engagement, more proprietary data, more proof) **before** the model is even cleared — which is exactly what a cash-constrained launch needs: differentiation that doesn't depend on a claim you haven't earned yet.

**Build priority among the six (cheapest, highest-leverage first):** (1) cross-market triangulation — pure win, reuses licensed data; (2) options-style distribution pricing — reuses posteriors, directly monetizable in best-ball; (3) the model parliament — turns work you're already doing into a public artifact; (4) replayable provenance — extends the proof layer you already prize; (5) the community tournament — bigger build, biggest moat; (6) active learning — the discipline that compounds all of the above.

*Companion deep-dives: `GSE_INTEL_01_CORE_ARCHITECTURE` · `GSE_INTEL_02_FORECASTING_FRONTIER` · `GSE_INTEL_03_FLYWHEEL_LADDER_COST` · `GSE_INTEL_04_80DAY_SEQUENCE`. Execution: `GSE_CODEX_AUTONOMOUS_EXECUTION.md`.*
