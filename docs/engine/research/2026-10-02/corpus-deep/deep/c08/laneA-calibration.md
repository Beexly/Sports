# Lane A — Calibration & Ranking Claims Verification (c08 deep)

Deep-research, lane A of slice c08 ("the mind"). Phase 2 critical thinking, not summarization.
Method: every major number checked against the actual source file under
`~/workspace/vendor/Sports/docs/` (read-only) plus live code/PR state. Append-only; entries
below are this session's verification record (2026-10-02).

Key note for the adversarial layer: **the slice's calibration honesty machinery is real and
measured, but three of the four headline remedies named in the briefs have NOT been executed.**
The board is still ordered by an anti-predictive key, the 6.5–9.5 leaf is still live as a
calibration prior, and the verifier harness is still a draft PR. Only the CQR correctness bug
is actually repaired in shipped code.

---

## VERIFIED CLAIMS

### 1. Board ranking is anti-predictive at the top — CONFIRMED, all numbers

**Source:** `~/workspace/vendor/Sports/docs/ops/hermes/BUILD-QUEUE-2026-09-18-ranking.md:16-17`

- `confidence` ≥ 80, n = 235: claims 0.8663, realizes **0.5191**, z = −10.7, Brier 0.3617 vs 0.25 for constant-0.5 — **CONFIRMED verbatim**.
  - z re-derivation (INFERENCE): with SE at the *realized* rate, sqrt(0.5191·0.4809/235) = 0.0326; (0.5191−0.8663)/0.0326 = −10.65 ≈ −10.7. ✓ Arithmetic is internally consistent. Note the z is computed against the realized-rate SE, not the claimed-rate SE — the doc is honest about direction but this choice is the smaller of the two plausible SEs for the numerator's size (the claimed rate 0.8663 would give SE 0.0222, |z| ≈ 15.6). The quoted z = −10.7 is therefore the *conservative* version. Realized win rate peaked at 75–79 (0.6146), fell to 0.4643 at 90–94, below the 0.5280 lowest band — CONFIRMED from the same source.
- Priced vs unpriced rows on one scalar — **CONFIRMED in live code:**
  - TOTAL path never calls `deriveRankingProbability` and hardcodes `rankingP = confidence/100`:
    `packages/prediction-engine/src/scoring.ts:1051` (`rankingP: Math.min(1 - 1e-6, Math.max(1e-6, confidence / 100))`) with `rankingSource: "confidence", // no independent total model yet` at `:1052`. (Queue doc cited scoring.ts:950/:966; lines have shifted in later code but the mechanism is exactly as described — the TOTAL path still has NO independent total model as of this check.)
  - Sort cascade: `apps/web/lib/ranking/sort-key.ts:36-58` (`readRankingKey`): prefers `factorBreakdown.rankingP`, then `rankingScore`, then raw `confidence/100`. Three-branch fallback chain exists as described.
  - The 30% confidence blend exists: `packages/prediction-engine/src/ranking-prob.ts` header (`Derive ranking probability from heuristic confidence + optional independent edge`, missing trueProb → confidence only).
  - The `rankingSource` discriminator is written at `scoring.ts:806` and `:1407` (`rankingSource: rank.source`), beside `rankingP` — the zero-cost separation the queue describes. **CONFIRMED persisted.**
- **Specified remedy NOT executed — CORRECTED from the brief impression:** the map's finding 2 names "`rankingSource`-tiered remedy" as the specified remedy. The remedy spec (ranking-candidates.ts, orderingPricedTierFirst, shadow report, pinned tests) does not exist in the checkout: `packages/types/src/ranking-candidates.ts`, `scripts/ops/ranking-shadow-report.ts`, `apps/web/lib/ranking/__tests__/sort-key-confidence-paths.test.ts` are all absent. Commit `0573059f5` in git history is literally titled "audit(calibration): honest status labels — stale v5.3.0 proposal + rankings queue (NOT BUILT) (#998)". The founder-gated remedy was never built; the queue doc itself demanded the committed default stay `current` and founder-gated. **Status: specified, pinned honest, NOT executed.**

### 2. Calibration leaf 6.5–9.5 drift — CONFIRMED, all numbers; remedy NOT executed

**Source:** `~/workspace/vendor/Sports/docs/data/CALIBRATION_LEAF_DRIFT_6_5_9_5.md:24-31, :43-60, :202-209`

- Leaf table row: n = 576, train base 65.86%, test actual 57.12%, Δ = −8.74 pp, z = −4.42, p = 9.7e−06 (Bonferroni 4.9e−05), leaf Brier 0.2526 — **CONFIRMED verbatim.**
  - z re-derivation (INFERENCE): (0.5712−0.6586)/sqrt(0.6586·0.3414/576) = −0.0874/0.019757 = −4.42. ✓ Exactly consistent with the stated SE formula sqrt(p(1−p)/n) at the *train* rate.
- Cochran's Q = 19.57 on 4 df, heterogeneity p = 6.07e−04, I² = 79.6%; common-drift estimate −1.46 pp — **CONFIRMED** (`:43-60`). Contrast vs other-four pooled: others Δ = +0.59 pp (SE 1.05), z = −4.17, p = 3.03e−05 — **CONFIRMED**.
- Honest caveat inside the source itself: "every z here, including the −4.42 and the Cochran's Q weights, uses SE = sqrt(p_train(1−p_train)/n_test) and ignores estimation error in p_train itself. That makes |z| optimistic and the reported p-values lower-bound approximations." The document is explicitly self-critical on its own test statistic — good honesty machinery; the p-value cannot be taken at face value without the (unpublished) train-sample n.
- **Remedy NOT executed — CONFIRMED from the source itself:** section "## 4. Recommendation (not applied)": collapse the 6.5–9.5 leaf into a neighbouring band or fall back to the global mean, gated by `CALIBRATION_ADJUSTMENTS_ENABLED` and the model-freeze guard, "the owner's call and an owner's edit, not an agent's." Code check: `CALIBRATION_ADJUSTMENTS_ENABLED` is referenced in `probability-calibration.ts`, `temperature-scaling.ts`, `book-path-tail-shrink.ts`, `platform-config.ts` — but nothing in the calibration stack collapses or disables the 6.5–9.5 leaf specifically. **Status: characterized, recommendation owner-gated, NOT executed.**

### 3. On-ladder MLB totals 36.3% vs 49.5% off-ladder; late odds move β₂ = −0.3386 — CONFIRMED, all numbers

**Sources:** `~/workspace/vendor/Sports/docs/ops/PLACEABILITY_AND_PERFORMANCE_2026-09-07.md:49-51, :56-57, :63` and `~/workspace/vendor/Sports/docs/arxiv-program/research/2026-09-21/arxiv-deep/0887-final-market-prices-information-aggregation.md:6, :17-29, :41-44`

- MLB totals on-ladder: 70/193 = 36.3% vs off-ladder 136/275 = 49.5%; MLB spreads on-ladder 127/294 = 43.2% vs off-ladder 116/232 = 50.0% — **CONFIRMED** from the win-rate table (`:49-51`). The 3.8σ-below-coin-flip claim: (0.363−0.5)/sqrt(0.25/193) = −3.81 ✓ (INFERENCE — consistent). Book-coverage control: mean bookmakerCount 8.32 on-ladder vs 8.26 off-ladder for totals (`:63`) — not a data-volume artifact, **CONFIRMED**.
- Crucial confound the source names honestly: with ~8 books, on-ladder average ≈ books agreed, off-ladder ≈ books disagreed, so the split measures **market consensus**, not just placeability. The engine is worst exactly where books agree — **CONFIRMED as the source's own reading**.
- Ground-truth caveat the source names: GROUND_TRUTH_AUDIT measured 68/590 moneyline results wrong and 187/670 game rows carrying another fixture's final; spread/total results never re-derived against ESPN; corruption balance across cohorts unknown. The 36.3% number sits on a ground-truth surface the source itself calls corrupt — **CONFIRMED caveat, and it weakens the headline.**
- Late-steam regression: β₂ = −0.3386 (SE 0.0392), n = 894,127, ≈8.6σ, 10% late move ≈ 14× the return association of an equivalent cross-sectional final-odds difference at median odds 25.5 — **CONFIRMED verbatim** from the 0887 deep-read. Domain caveat stated in the source: this is JRA Japanese horse racing, 2004–2023, parimutuel; "ex-post association, not a proven tradable edge"; adaptation is a steam-detection *feature*, not a follow-the-move system. Cross-domain transfer to NFL is an INFERENCE, not a finding.

### 4. "Calibration-solved yet edge-empty" — CONFIRMED as measured engine state (with dates attached)

**Sources:** `~/workspace/vendor/Sports/docs/ops/edge/2026-08-19-research-frontier-dossier.md:14, :25` (ECE/Brier/R*/D-minus-MCB); `~/workspace/vendor/Sports/docs/ops/archive/root-museum/BUILD_LOG.md:125` (MI probe)

- ECE 0.0044, isotonic-calibrated holdout Brier 0.2556 (baseline 0.2815), UNC pinned 0.2499 (base rate 50.9%), suppression-curve spread 0.0017 — **CONFIRMED verbatim** from the frontier dossier (`:14, :25`).
- DSC − MCB ≈ −0.0057 (Brier 0.2556 > UNC 0.2499 under Brier = MCB − DSC + UNC → negative net skill vs base rate) — **CONFIRMED** from the dossier's own arithmetic (`:25`). The 0.0057 is a derived identity, not an independent measurement (INFERENCE — it has no CI of its own; the dossier itself flags that CORP decomposition with CIs is the load-bearing measurement still owed, P-B).
- MI probe I(score; Y | q_close) = 0.0095 nats, permutation p = 0.060 — **CONFIRMED** from the archived root BUILD_LOG (`:125`). Important context: this was a Phase 0 acceptance run on real nflverse data (1,871 games 2019–2025, seed 20260716), and the run's real-run EV-vs-close was −0.113 ± 0.048 — labeled NOT claimable. The p = 0.060 is *not* significant at the conventional 0.05 level; the honest reading is "no measured information beyond the close," which is exactly what the brief says. Placebo gate passed (median permutation p = 0.015 on negative median EV).
- Additional measured state in the dossier worth pinning down: `Pick.confidence` is "substantially a market-structure echo" (`scoring.ts:486-494, 844-851` cited); no independent ATS/totals model exists; independent trueProb stream attenuated ×0.484 and re-anchored 45% to market (`live-calibration-p.ts`); the ×1.12 sharpness stretch `homeP = 0.5+(homeP-0.5)*1.12` (P-C, hours to delete) — these are dated 2026-08-19 and later commits may have moved some. The ×1.12 deletion was audited-deprecated in favor of P-G/P-C successor logic per the brief; landing status of the deletion itself was not verified in this lane.
- INFERENCE: Brier 0.2556 vs UNC 0.2499 — the model is 0.0057 worse than constant-0.509 climatology on holdout. That is a *measured indictment of the blend being flat/noisy*, not of isotonic calibration. The dossier's thesis ("information problem, not calibration problem") follows directly.

### 5. Verifier + pre-registration gate, PR #914 — CORRECTED: not landed; draft PR with green tests on its own branch

**Sources:** `~/workspace/vendor/Sports/docs/research/2026-09-26/RESCUE-2026-09-26-2-verifier-port.md` (rescue doc), live GitHub API for PR #914, repo checkout

- The map's finding 20 ("Verifier + pre-registration gate, already landed") is **WRONG**. GitHub API: PR #914 `feat(verifier): port frozen-holdout harness, factor specs and runners off mimo/docs-cleanup`, state=open, **draft=True, merged=False, mergeable_state=unstable** (created 2026-09-26, head branch `hermes/port-verifier-harness`).
- `packages/verifier/` does not exist on main (checkout confirmed); it exists on the PR branch (contents API: fixtures, package.json, src, tsconfig.json, vitest.config.ts). `killLineCommitDate` grep across the main checkout returns zero hits; the file `scripts/factors/index.mjs` on the PR branch (366 lines) contains `killLineCommitDate` — **CONFIRMED the gate lives only in the unmerged PR**.
- The rescue doc's 108/108 own tests green (7 duel, 15 factgraph, 14 holdout, 8 joint, 21 nflverse-releases, 10 scorecard, 28 stats-pins, 5 v530) is **CONFIRMED as the doc's claim** — run via a ~200-line vitest shim + esbuild mirror (vitest can't run on the host), so it is not a standard CI signal; the doc itself is explicit about this. CI on the PR was red, but "already red on main at both the branch base and current main" — pre-existing typecheck errors in `@sports/prediction-engine`, none in files the PR touches. So the 108/108 is credible-as-measured but not CI-certified, and nothing is usable on main until merge.
- Kill-line gate design: refuses specs whose kill-line commit date is after their run, fixed from HEAD-scoped `git log -- <yaml>` to earliest-qualifying-commit across all refs; requires full clone (fails under fetch-depth 1). **CONFIRMED from rescue doc + PR-branch file.**
- Related: 28 pre-registered factor specs (A1–A28) exist only on the PR branch; `docs/factors/` absent on main. run_sha values deliberately not re-anchored (to avoid falsifying provenance) — **CONFIRMED from rescue doc.**

### 6. CQR bug — sibling-lane correction CONFIRMED; bug is stale

**Source:** `~/workspace/vendor/Sports/apps/web/lib/calibration/cqr.ts:10-19`

- Current code: `const rank = Math.ceil((1 - alpha) * (n + 1)) - 1;` with `if (rank >= n) return Number.POSITIVE_INFINITY;` — the unclamped (1−α)(n+1) rank with a vacuous +∞ interval instead of clamping to n−1. Header comment documents the change explicitly (`:10`). **CONFIRMED: the "LIVE CQR bug" from the map's finding 1 is STALE, as the sibling lane established. The acceptance backtest is the remaining owed item.**

---

## CHALLENGES (contradictions, weak stats)

1. **"Already landed" vs draft PR.** The map's top-20 finding 20 says the verifier "landed"; it is an open draft PR (mergeable_state=unstable). A lane reading the map without checking the remote will report a measurement capability the engine does not actually have on main. Same pattern risk for the ranking remedy (specified, committed default `current`, never built) — both read as done-in-brief but are not done-in-repo.

2. **The 36.3% on-ladder number sits on corrupt ground truth.** PLACEABILITY's own caveat: 68/590 moneyline results wrong, 187/670 game rows carrying another fixture's final, spread/total never re-derived against ESPN, corruption balance across cohorts unknown. The 3.8σ is a z against an unre-derived outcome surface. The anti-consensus *direction* is still the honest takeaway (the confound analysis is the load-bearing part), but the exact 36.3% is softer than the briefs present it.

3. **Calibration-leaf z values are optimistic by the source's own admission.** The 6.5–9.5 p = 9.7e−06 treats the train base rate as fixed; train n is not printed; a proper two-proportion test cannot be run from the reproduction file. The effect size (−8.74 pp on n = 576) is large enough to survive most corrections, but the p-value is a lower-bound approximation, not a p-value. Also: only the 10+ leaf beat the 0.25 coin-flip line (Brier 0.1979); the leaf model beats global mean by 0.0038 Brier in aggregate — a real but tiny gain, meaning even the "good" leaf structure adds almost nothing (consistent with the edge-empty verdict, and a contradiction of any reading that says "the leaf model works").

4. **Isotonic-calibrated Brier 0.2556 is "solved calibration" on a dead model.** Calibration-honest vs edge-empty is not a contradiction — it is the slice's whole point — but a reader can easily misread "ECE 0.0044" as engine health. The suppression-curve spread (0.0017) is the number that matters: the model's output barely varies game to game. Brier 0.2556 > UNC 0.2499 says constant-0.509 climatology beats the model on holdout. Publish-gates keyed to calibration metrics (ECE, Brier decomposition) will pass a model that adds nothing; the adversarial layer must gate on resolution/probabilistic skill vs the market (DSC, grouping-loss, CLV), not on calibration alone. Reader 55's warning is the same shape: isotonic plateaus destroy ranking for Kelly sizing while RES ≈ 0 — a calibration method fine for display can be harmful for staking.

5. **The 0887 transfer is the weakest link in the "line-path > consensus" pattern.** JRA parimutuel horse racing ≠ NFL spreads/totals: parimutuel late money moves the price against itself (no standing book), and the deep-read explicitly says "ex-post association, not a proven tradable edge." The slice uses it as a *method* (odds-path velocity features), which is fair, but any lane that converts "14× return association" into an expected NFL edge is inflating. The honest build is the deep-read's own prescription: recompute on GSE's own Pinnacle archive (any league, 2023–2024), event fixed effects, check the late-move coefficient's sign and significance. Not done as far as this lane could find.

6. **The ranking queue's own caveat is underweighted in briefs.** `rankingP` is "measured MONOTONE, n 1,390" per the `ranking-basis-census.ts` header (`apps/web/lib/calibration/ranking-basis-census.ts:8-14`), while raw confidence is "measured ANTI-predictive, n 2,385, z = −10.7" — the defect is *which branch orders the row*, not that every number on the board is poisoned. The census exists to measure the share (`loadRankingBasisCensus`) and is now wired read-only into `/api/ops/public-surface-truth` (route.ts:734) — but it is a measurement, never a gate. Adversarial layer should promote it to a gate.

7. **Pre-registration gate has a structural dependency risk.** The kill-line gate requires full git history (`git log --all` fails under fetch-depth 1) — any CI running shallow clones silently degrades the gate. Also `run_sha` deliberately not re-anchored across the mimo→Sports port, so provenance chains across the port are doc-level, not cryptographic.

---

## BUILDABLE SYSTEMS (what the adversarial layer enforces)

Concrete gates the adversary layer can implement from today's code (all read-only measurement first, founder-gated behavior change):

1. **Leaf-band exclusion gate (6.5–9.5).** Until the collapse remedy lands: the adversary *rejects or flags* any published pick whose calibration prior is the 6.5–9.5 leaf. Operationalize: the doc's remedy is "collapse into a neighbouring band or fall back to the global mean" under `CALIBRATION_ADJUSTMENTS_ENABLED` + model-freeze. Adversary-side interim (no engine edit): any pick stamped with a spread in [6.5, 9.5] on the spread path gets a `calibration_drift` no-bet reason code (the reason-code vocabulary already exists — reader 53: calibration_drift, model_disagreement, stale_market_context, missing_required_data). Hard-block only NFL spread picks in that band; NFL totals and other bands unaffected (contrast test says the other four leaves show no collective drift).

2. **rankingSource-tiered ordering as an adversary-side filter (pre-founder).** The comparator change is founder-gated, but the adversary doesn't need to re-sort the board to protect it: enforce a *publish filter* that demotes any pick with `factorBreakdown.rankingSource == "confidence"` (or absent, pre-v5.2.1 rows) from top-3/top-5 display slots — the positions where the measured inversion ("top-ranked pick had the worst edge that clears zero") does damage. `rankingSource` is persisted at `scoring.ts:806/:1407`; TOTAL-path rows are stamped `confidence` at `:1052`. Total-path rows therefore can *never* occupy featured slots — correct per the mechanism, since confidence is anti-predictive at the top.

3. **Ranking-basis census as a hard gate.** `loadRankingBasisCensus()` (`apps/web/lib/calibration/ranking-basis-census.ts`) is wired read-only into `/api/ops/public-surface-truth` (route.ts:734). Promote `confidenceShare` to a gate: if the share of published, graded rows ordered by the confidence branch exceeds a founder-set threshold (suggest starting at anything >50% given z = −10.7 anti-predictiveness), the adversary fires a calibration_drift alert and withholds public ranking claims for the slate. Measurement exists; only the threshold + enforcement are new.

4. **Market-consensus anti-signal gate.** From PLACEABILITY: picks where the engine's line sits on-ladder (or equivalently, where ~8 books agree) are the worst-performing cohort. Operationalize the existing `book-path` machinery: any pick with on-ladder line + high book consensus gets down-weighted or requires an independent-source cross-check (`rankingSource` ∈ {independent_trueProb, blend_indep_conf}) before publish. The direction is "consensus at rest is noise; path near close is signal" — gate the former, engineer the latter (late-window implied-probability velocity/acceleration features per 0887, backtested on GSE's own Pinnacle archive first).

5. **Resolution-first promotion gate (not calibration-first).** Replace/augment any publish gate that uses ECE or Brier alone with: (a) grouping-loss lower bound > threshold (P-D, Perez-Lebel) as the go/no-go for week-plus builds; (b) the CORP decomposition with CIs (P-B) — preregistered rule already written in the dossier: if the 95% CI on `Pick.confidence`'s DSC−MCB is entirely ≤0, do not promote; (c) the MI-probe protocol from the archived BUILD_LOG as the leak-detection gate: no feature earns weight unless I(score; Y | q_close) clears a permutation-p threshold. A model with ECE 0.0044 and zero resolution must never pass a publish gate.

6. **Pre-registration gate enforcement when PR #914 merges.** The kill-line gate (`killLineCommitDate`, PR branch `scripts/factors/index.mjs`, verified present) plus 28 factor specs (A1–A28) give the adversary a spec→run→score chain. On merge: (a) run the 108-test suite in real CI (today's green came from a vitest shim — re-verify under the repo's real runner); (b) require every new factor/eval run to have a kill-line commit predating its run_sha, with full-clone CI enforced so fetch-depth 1 can't silently degrade the gate; (c) extend the pre-registration contract to board-ranking changes (the ranking queue's "report first, decide after" pattern is the same shape). Until merge: treat engine-prediction scorecards as provisional — the "score engine predictions before public picks" capability the map claims does not exist on main yet.

7. **CQR acceptance backtest (the one owed item).** The code fix is in (`cqr.ts:16-17`); the adversary should require the acceptance backtest named by the acceptance criteria (90% coverage measured on a fresh holdout, no clamp) before any public interval claim leans on `cqr.ts` output. This is the smallest open item in the lane.

---

## INFLATION WATCH (plain language)

- **The briefs overstate how much is done.** Two of the biggest credibility items — the verifier harness and the ranking remedy — are a draft PR and an unbuilt queue respectively, and the map lists the verifier as "already landed." If you read only the briefs, the engine has a scorecard, a pre-registration gate, and a tiered ranking remedy. It has a scorecard in a draft PR, a gate in the same draft PR, and a remedy that was deliberately left switched off with the committed default `current`. Treat "landed" claims in this slice as unverified until you see them on main.
- **36.3% is a real direction on a shaky denominator.** The on-ladder MLB totals number is ~3.8σ below a coin flip, but the outcome surface it was graded on is self-reported corrupt (wrong results, fixture mixups, no ESPN re-derivation for spreads/totals). The confound — on-ladder means books agreed — is the durable insight; the exact 36.3% is not.
- **The leaf-drift p-values are lower bounds, not p-values.** The doc says so itself. −8.74 pp on n = 576 is a big effect, but don't cite p = 9.7e−06 at full face value; the train-rate sampling error is unaccounted for.
- **14× is a horse-racing regression coefficient, not an NFL edge.** It describes ex-post association in Japanese parimutuel racing. Useful as a feature-engineering idea (late-move velocity), not as a number to put in a pitch.
- **ECE 0.0044 does not mean the engine is good.** It means the engine's numbers are honest about a model that adds nothing. Calibration metrics can pass a dead model; the adversary gates on resolution, not honesty alone.
- **108/108 green came from a shim, not CI.** The verifier's test suite passed under a hand-rolled vitest replacement with the repo's CI red for unrelated pre-existing reasons. Credible, but re-verify under the real runner before trusting the scorecard to gate anything.

---

## File:line index of verified claims

| Claim | Source | Lines | Verdict |
|---|---|---|---|
| conf ≥80: 0.8663 claimed / 0.5191 realized, n=235, z=−10.7, Brier 0.3617 vs 0.25 | docs/ops/hermes/BUILD-QUEUE-2026-09-18-ranking.md | 16–17 | CONFIRMED |
| Priced/unpriced rows on one scalar; TOTAL path rankingP=confidence/100 | same + packages/prediction-engine/src/scoring.ts | 65–75 (doc); 1051–1052 (code) | CONFIRMED |
| rankingSource discriminator persisted | scoring.ts | 806, 1407 | CONFIRMED |
| rankingSource-tiered remedy specified but NOT built | repo (absent files); git 0573059f5 "NOT BUILT" | — | CORRECTED (not executed) |
| Leaf 6.5–9.5: n=576, 65.86%→57.12%, Δ=−8.74, z=−4.42, p=9.7e−06 | docs/data/CALIBRATION_LEAF_DRIFT_6_5_9_5.md | 24–31 | CONFIRMED |
| Cochran's Q=19.57, p=6.07e−04, I²=79.6% | same | 43–60 | CONFIRMED |
| Remedy "not applied", owner-gated | same | 202–209 | CONFIRMED (not executed) |
| MLB totals on-ladder 70/193=36.3% vs off-ladder 136/275=49.5%; ~3.8σ | docs/ops/PLACEABILITY_AND_PERFORMANCE_2026-09-07.md | 49–51, 56–57 | CONFIRMED |
| Consensus confound; ground-truth caveat | same | 63, caveat section | CONFIRMED (caveat weakens) |
| β₂=−0.3386, SE 0.0392, n=894,127, ~8.6σ, 14× at median odds 25.5 | docs/arxiv-program/research/2026-09-21/arxiv-deep/0887-final-market-prices-information-aggregation.md | 6, 28–29, 41–44 | CONFIRMED (JRA horse racing, ex-post) |
| ECE 0.0044, Brier 0.2556 (baseline 0.2815), UNC 0.2499, suppression spread 0.0017, DSC−MCB≈−0.0057 | docs/ops/edge/2026-08-19-research-frontier-dossier.md | 14, 25 | CONFIRMED (DSC−MCB derived) |
| MI probe 0.0095 nats, p=0.060 | docs/ops/archive/root-museum/BUILD_LOG.md | 125 | CONFIRMED |
| Verifier PR #914: 108/108 tests, kill-line gate, 28 factor specs | RESCUE-2026-09-26-2-verifier-port.md; GitHub API (open, draft, unmerged); PR-branch files | rescue doc; PR #914 state=open/draft | CORRECTED (not landed on main) |
| CQR bug stale; unclamped (1−α)(n+1) rank, vacuous +∞ | apps/web/lib/calibration/cqr.ts | 10–19 | CONFIRMED (sibling-lane correction holds) |

## Open questions for sibling lanes / the parent

1. The ×1.12 sharpness-stretch deletion (P-C) and the logit-space pooling successor (P-G) — did either land after the 2026-08-19 dossier? Not verified in this lane; `homeP = 0.5+(homeP-0.5)*1.12` may still be live.
2. `pick-proof-receipt.ts:190` types `rankingSource?: string | null` — the proof-receipt system records rankingSource. Lane for receipts/QC may already have publish-side data on confidence-share; worth joining with the census.
3. The `/api/ops/public-surface-truth` endpoint (route.ts:734) reads the ranking census — is it consumed by any dashboard or cron today, or is it a measurement nobody looks at?
4. MI probe and the Phase-0 nflverse acceptance (seed 20260716, 1,871 games) predate the sealed 2025 season (272 games) — was the sealed set ever used for the follow-up the BUILD_LOG implies?
