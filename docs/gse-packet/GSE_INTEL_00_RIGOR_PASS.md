# GSE Intelligence — Rigor Pass & Correction Layer
### An adversarial self-audit. This document is authoritative where it conflicts with v1.
**2026-06-23 · Read this first. It supersedes specific errors in `GSE_INTELLIGENCE_CORE_AND_FLYWHEEL`, `GSE_INTEL_01–05`, `GSE_CODEX_AUTONOMOUS_EXECUTION`, and the Atlas, and tells you exactly what changed and why.**

---

## Why this document exists

The right test of "did you do your best" is not a single confident pass — it's whether the work survives a hostile review by someone *trying to break it*. So four red-team reviewers attacked the v1 deliverables with the explicit assumption they were **not** world-class. They found nine material defects, two of them in the load-bearing keystones. That is good news: every one has a known, citable fix, and the corrected design is genuinely stronger. This file is the correction layer and the honest scorecard. From here on, **the quality-assurance discipline is the loop itself** — build, red-team, correct, then push further — and you can audit it in these grades and diffs rather than taking it on faith.

## Scorecard (pre-fix → post-fix once corrections land)

| Deliverable | Pre-fix grade | Headline defect | Post-fix |
|---|---|---|---|
| Intelligence Core (`INTEL_01`) | **C+** | dimensional unit error in the market-anchor keystone; false coverage claim | **A−/A** |
| Flywheel + 80-day plan (`INTEL_03/04`) | **C / C−** | preseason calibration is invalid; ladder conflates fantasy & betting | **A−** |
| Forecasting Atlas | **B−** | fantasy-native distributional family missing (Tweedie etc.) | **A−** |
| Advisory Pass | **B** | one section rests on unverified doc-vs-code state | **A−** |
| Codex brief — safety | **C+** | self-satisfiable calibration gate; flag/DB/API escape hatches | **A−** |
| Codex brief — buildability | **D+** | assumes files/branch that may not exist; test substrate sequenced late | **A−** |

The grades are honest. C+ and D+ are not where this should have shipped, and the fixes below are why the next version earns the A−.

---

## The six critical corrections (with the corrected math)

### C1 — Market-anchored reconciliation: anchor YARDS and TDs, not fantasy points *(the big one)*

**The error.** v1 constrains `Σ player fantasy points = Vegas team total`. The Vegas team total is **expected points scored on the scoreboard** (a function of TDs and FGs). Fantasy points are a **different unit** (PPR + yardage). Summing fantasy points to a scoreboard total is dimensionally meaningless; the single `pointsPerImpliedPoint` scalar hides the mismatch and the "conservation test" passes while proving nothing.

**The corrected formulation.** Decompose the market, conserve the *physical* quantities, and derive fantasy points as an output:

1. **Market → team environment.** From total `T` and spread `s`: `teamPoints = T/2 ∓ s/2`. Map `teamPoints` to **expected team TDs and expected team yards** via fitted historical relationships (points↔TD rate, points↔yards, red-zone conversion). Split team yards into expected **pass yards** and **rush yards** using the game-script pass-rate forecast (`INTEL_02` Module 3).
2. **Allocate the physical units by usage posteriors.**
   - Receiving yards: `recYds_j = passYds_team · (targetShare_j · aDOT_j · catchRate_j) / Σ(...)`
   - Rush yards: `rushYds_j = rushYds_team · (carryShare_j · YPC_j) / Σ(...)`
   - TDs: `TD_j = teamTD · (rzUsage_j · tdRate_j) / Σ(...)`, split pass/rush/rec by role.
3. **Conservation constraints (the real invariants):** `Σ recYds = passYds_team`, `Σ rushYds = rushYds_team`, `Σ (passYds thrown) = passYds_team`, `Σ TD = teamTD`. **Never on fantasy points.**
4. **Convert to fantasy points as a derived output** via the league scoring formula (e.g. `0.1·rushYds + 0.1·recYds + 0.04·passYds + 6·rushTD + 6·recTD + 4·passTD + 1·rec`).

**Bonus the error was hiding:** divergence-vs-market is now computed in **matching units** — projected receiving yards vs. the receiving-yards prop, projected receptions vs. the reception prop — which is both correct and a cleaner, per-stat edge signal than a fantasy-point-vs-points comparison ever could be. *Fix lands in:* `INTEL_01` L3, and the Codex `B3` slice + its invariant test.

### C2 — Conformal intervals: adaptive coverage, not a guarantee

**The error.** "Guaranteed/provable marginal coverage" holds only under **exchangeability**. NFL has week-to-week and season-to-season distribution shift, role changes, and injuries — split-conformal coverage will drift.

**The correction.** Use **Adaptive Conformal Inference (ACI, Gibbs & Candès 2021)** — adjust the quantile level online from realized coverage — **inside Mondrian (per-position) bins**, with a rolling recalibration window. Claim the honest thing: *"adaptive coverage that tracks the target rate over time,"* not a finite-sample guarantee. Also fix the **leakage** flagged in review: the conformal calibration weeks must **not overlap** the ensemble-fit weeks (separate, time-ordered folds). *Fix lands in:* `INTEL_01` L5.

### C3 — The launch keystone: historical backtest now, not preseason calibration

**The error (fatal as written).** v1 clears `canPublishProjections` by backtesting the weekly model on the **HOF game + preseason**. Preseason usage is nothing like the regular season — starters play ~a quarter; depth players dominate (verified: by 2019, Week-1 starters took ~23.6% of snaps in preseason Week 3). Calibrating a regular-season projection on that distribution is invalid, and the "publicly backtested" headline would be **false in the exact dimension you sell**.

**The correction (stronger, and available today).** Build a **historical walk-forward backtest harness on nflverse** (regular-season play-by-play back to 1999; advanced metrics from ~2006) **as the first thing built**, with **purged & embargoed** train/test splits (López de Prado) to prevent leakage. Clear the projection from *that* evidence — which exists right now, before kickoff. Use preseason only as a **pipeline dress rehearsal** (does the plumbing commit, score, and publish), never as model calibration. This turns the keystone from a false claim into a real, immediately-demonstrable one: *"backtested across N seasons, here's the out-of-sample error."* *Fix lands in:* `INTEL_04` critical path, `INTEL_03` heartbeat, masterwork Part V, Codex build order (harness becomes Slice E1, moved first).

### C4 — Split the ladder into a fantasy track and a betting track

**The error.** The proof ladder gates everything on betting-pick CLV (`minCLVBeat 0.524`, the −110 break-even) and counts settled WIN/LOSS picks at `n≥100`. CLV is **meaningless for a fantasy points projection**, and `n≥100` game-level picks is one-game-noise per position.

**The correction.** Two tracks on the same `LadderEvent` ledger:
- **Fantasy track** — graded on **per-position MAE + interval coverage + rank-correlation**, with realistic sample targets (hundreds of player-weeks per position; the historical harness provides thousands immediately).
- **Betting track** — graded on **CLV + Brier/log-loss** as today.
Each unlocks its own surfaces; neither borrows the other's evidence. *Fix lands in:* `INTEL_03` `RUNG_REQUIREMENTS`, Codex `A1`.

### C5 — Make the "beats the market" test statistically valid

**The error.** Declaring a model better on a point metric can be noise. And the design proposed **Diebold–Mariano**, which is **undersized for nested models** (market-only is nested inside market+player-signal). The Hedge regret bound was quoted for bounded `[0,1]` losses but fed **unbounded MAE**.

**The correction.** Use the **Clark–West** adjusted test (or a paired block-bootstrap) for nested forecast comparisons, require a minimum effect size, and **bound/normalize the loss** fed to Hedge (e.g., cap per-position error to a known max, or use a scale-free loss) so the regret guarantee actually holds. *Fix lands in:* `INTEL_01` L4, Codex `B4` acceptance gate.

### C6 — Add the cross-player correlation (copula) layer *(was missing entirely)*

**The gap.** v1 projects players **independently**, but QB–WR1 fantasy correlation is ~0.47–0.56, and stacks/parlays/best-ball are *all about correlation*. Independent projections silently break exactly the products the frontier addendum sells.

**The addition.** A **Gaussian-copula correlation layer** over the marginal posteriors: estimate the player-pair correlation structure empirically (QB↔pass-catchers positive, RB↔team-pass negative, game-stack via total), and sample the **joint** distribution. One covariance model powers best-ball spike-week correlation, DFS stacking, **and** parlay correlation — extending the one-engine-many-products thesis to risk. *New file:* `lib/projections/correlation.ts`; consumed by `bestball.ts`, the distribution layer (`INTEL_05` #4), and any parlay surface.

---

## Atlas completeness: the missing fantasy-native family (raises B− → A−)

The Atlas catalogued the **betting** engine well but is thin on the **distributional** methods the fantasy product needs. Add these (the first three are the important ones):

- **Tweedie GLM + gradient-boosted Tweedie** *(the headline omission)* — the compound Poisson–Gamma distribution is the **native model for fantasy points**: a point mass at zero (didn't play / didn't produce) plus a continuous right-skewed tail. Directly usable as `objective="tweedie"` in XGBoost/LightGBM. **ADOPT-NOW** as the base fantasy estimator.
- **Zero-inflated / hurdle models** — separate `P(produces at all)` from the magnitude; correct for low-usage players and anytime-TD. **PILOT.**
- **Dirichlet-multinomial** — target-share / touch-share allocation across a roster *with* uncertainty (feeds C1's allocation honestly). **ADOPT-NOW** for the allocation layer.
- **GAMLSS / distributional regression** — model mean, variance, and skew as functions of covariates (don't assume constant spread). **PILOT.**
- **Plackett–Luce** — rank/finishing-order models for ADP, ownership, and weekly finish. **REFERENCE→PILOT.**
- **Skellam distribution** — difference of two Poissons → margin of victory, NHL puck lines, MLB run lines (the advisory's Top-Moves already wanted this for multi-sport; the Atlas omitted it). **PILOT (multi-sport).**
- **Copulas / Gaussian copula** — the C6 correlation layer above. **ADOPT-NOW for fantasy products.**
- **Mixture Density Networks** — neural distributional output; **REFERENCE** for now (sample-hungry, unexplainable).

Honest note: 169 was not "complete" — it was complete *for betting*. With the family above the catalogue is genuinely fantasy-grade, and the count is not the point; coverage of the revenue product is.

---

## Codex brief hardening (raises safety C+ / buildability D+ → A−)

Apply these to `GSE_CODEX_AUTONOMOUS_EXECUTION.md` (the edits are landing now):

1. **Slice 0 — Surface Audit (mandatory, blocking).** Before any build: clone, enumerate the *actual* files, and confirm the work branch exists (if not, create it from `main` and record that). Produce `docs/SURFACE_AUDIT.md` mapping every referenced file/flag to `exists` or `absent → scaffold-as-new`. **Codex may never "extend/reuse" a file that doesn't exist as if it shipped** — it scaffolds it explicitly, labeled new. This closes the "invent a foundational substrate on an undefined branch" failure the reviewer verified (the branch and ~8 named files were absent in the clone checked).
2. **Forbid self-authored calibration.** `model-freeze.mjs` is satisfied by an `IMPLEMENTED` calibration proposal — so an autonomous agent could *fabricate its own calibration evidence*. Rule: **Codex may only create `DRAFT` calibration proposals; flipping a proposal to `IMPLEMENTED` and bumping `MODEL_VERSION` is a human-only action.** This is the single most important safety fix.
3. **Build-order fix.** The **replay + historical-backtest harness (E1)** is the substrate every estimator's out-of-sample evidence depends on — move it to **right after Slice 0 / A**, before B4/B5 and all of C. C3's historical backtest *is* this harness.
4. **Close the remaining escape hatches.** New flags default **OFF** and are CI-checked; **tests never call live/paid APIs** (fixtures only); **no migrations against any shared/prod DB** (branch uses a scratch DB, or migrations are generated-not-applied); never author secrets.
5. **Autonomy ratification cap.** ≤ ~8 files per slice; maintain `docs/DECISIONS_TO_RATIFY.md`; any slice touching schema/auth/payment/entitlements may **scaffold behind a flag** but must mark itself for human ratification — never self-approve.
6. **B3 correction.** Replace the "sums-to-team-total (fantasy points)" invariant with the C1 yards-and-TDs conservation invariants; the projection-leakage test stays.

---

## New frontier surfaced *by* the red-team (the upside of being attacked)

The audit didn't just subtract — it added genuinely sharp ideas the forward passes missed:

- **The correlation/copula engine (C6)** is not just a fix; it's a *product* — "correlation-aware best-ball and parlay construction" is a frontier feature almost no consumer tool ships, and it falls out of doing the math right.
- **Tweedie-native projection** reframes the whole fantasy model around the correct distribution, which makes the uncertainty bands honest by construction rather than bolted on.
- **Adaptive Conformal Inference** turns a bug (coverage drifts under shift) into a *feature* you can publish: *"our intervals adapt to how the season is actually behaving, and here's the live coverage chart."* That is a calibration artifact no competitor has.
- **The historical-backtest harness** is itself a launch asset: *"backtested across 20+ seasons out-of-sample"* is a stronger, true, immediately-available headline than anything preseason could have produced.

---

## What is still genuinely unverified (the honest edge of the map)

One thing I cannot close from here and you should treat as the top action: **the doc-vs-code/branch reality.** Reviewers checking a local clone could not find the work branch or ~8 of the named engine files. Per the multi-clone history this is *likely* a branch/clone mismatch, not missing code — but it is unverified, and several integration paths are written against names that must be confirmed. **Slice 0 exists precisely to resolve this before any code is written.** Until it runs, treat file-level integration details as "to be confirmed against the real branch," not as fact.

*This rigor pass will itself be re-run after the corrections land — the loop doesn't stop. Companion docs are corrected in place with banners pointing here.*
