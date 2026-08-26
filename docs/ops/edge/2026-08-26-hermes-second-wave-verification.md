# Hermes Second-Wave Verification — Founder Verdict

**Date:** 2026-08-26 · **Scope:** Independent recomputation of the entire Hermes overnight R&D corpus (`handoff/research/overnight-2026-08-26/` + `edge-sources-2026-08-26/`) against `data/nflverse/games_harness_rows.jsonl` (6,967 games, 1999–2025) and `cpoe-backtest-rows.jsonl` (4,174 rows), run through the falsifier repaired on this branch today. File-based only — no `DATABASE_URL` was available and none was used. Eight independent recompute runs, five adversarial re-verifications, three fresh-test runs, and three corpus-mining passes are synthesized below. Every number in this document traces to a command one of those runs actually executed against raw data or the real `falsifyBind`.

---

## 1. THE ANSWER

**Nothing survived. The market is efficient, and that is a real answer, not a shrug.**

Every pre-registered, game-level betting hypothesis in the Hermes corpus that could actually be tested against real closing prices — home favorites ATS, road dogs ATS, overs, unders, divisional ATS, large/short spreads ATS, home moneyline, the CPOE-persistence bind, the 3/6 key-number fade, and the eastward-travel road-favorite bind — was **KILLED** by the repaired falsifier or failed multiplicity correction on honest recomputation. This is distinct from "we could not see it": the closing spread itself is not rejected as biased (intercept ≈ 0, p=0.81; slope ≈ 1.05, p=0.058), the devigged moneyline close is well-calibrated (Brier 0.211, near-zero reliability error), and a 132-test segment scan across era/week/spread/total/divisional/weekday/favorite-side finds nothing pre-game-actionable that survives correction. That is a well-powered null on the primary dataset, not an underpowered shrug — see §7 for the (real) underpowered nulls elsewhere in the corpus. Separately, several signals *could not be evaluated at all* because the underlying data files (FiveThirtyEight Elo, PFR advanced stats, NGS receiving, FTN box counts, most seasons of play-by-play, kickoff times) are not in this container — those are `CANNOT_REPRODUCE`, not nulls, and must not be reported as either. Per C-32, no win-rate, ROI, or hit-rate figure in this document is a product claim; every one is research-only.

---

## 2. HERMES REPLICATION SCORECARD

| Claim | Hermes number | Claude independent number | Replicates? | What the difference means |
|---|---|---|---|---|
| Sign convention (spreadLineHome>0 = home favored) | asserted correction to docs | corr=+0.431, OLS slope=1.050, 98.3% agreement w/ moneyline sign (n=5,061) — unanimous across all 8 independent recompute runs | **REPLICATES** | Foundation is sound; safe to build on |
| Home-fav cover rate, pushes excluded | z=−5.38 vs 52.38% | z=−5.3763, exact match | **REPLICATES (number)** | — |
| ...cause of the −5.38 extremity | "push-handling artifact" | p0 mismatch: push-excluded rate (0.4831) tested against the −110 vig-inclusive breakeven (0.5238), not a fair coin. Correctly specified (p0=0.5): z=−2.227. Adversarially **CONFIRMED**. | **DIFFERS (mechanism)** | Hermes' instinct to distrust the number was right; the named cause was wrong. The residual z=−2.23 itself does not survive an era split (pre/post-2012 individually z=−1.47/−1.68, neither significant) |
| Home-fav cover margin | +0.15 pts | +0.1533, SE 0.1975, 95% CI [−0.23,+0.54] | **REPLICATES** | Null — CI contains 0 |
| All-games cover margin | +0.07 pts | +0.0692, SE 0.158 | **REPLICATES** | Null |
| Decade \|miss\| 1999→2025 | 10.26 → 9.76, "shrinking = improving efficiency" (all 4 rows) | Endpoints replicate exactly, but sequence is 10.26→10.89→10.09→9.76 — **non-monotone**; endpoint delta z=−1.78, p=0.075 (not significant); game-level trend −0.034 pts/yr is real but tiny (p=0.0074) | **REPLICATES numbers, DIFFERS narrative** | Adversarially **CONFIRMED**. The 2006–2012 row rose, not shrank, yet carries the "Shrinking = improving" label |
| Closing spread bias (part d) | task wording implied regressing on `-spreadLineHome`, which one run showed produces a spurious "catastrophic" rejection (t=−77.8) | Correct-sign regression: intercept −0.039 (p=0.81), slope +1.050 (t vs 1 = 1.90, p=0.058), joint Wald p=0.150 | **Null, not rejected** | The task brief itself carried the old inverted-sign convention as a trap; flagged by the recompute agent |
| CPOE falsifier verdict | KILLED — shuffle 87/200, logM=−280.842 | KILLED — shuffle 107/200 (full n=4,174; 80/200 on Hermes' 4,172-row subset), **true logM=−1,022.440** | **Verdict REPLICATES (6+ independent runs); magnitude DIFFERS by 742 log-units** | Hermes' "logM" is actually `logSimpleE`, the clipped display-only statistic (my logSimpleE=−280.334, matches to 3 decimals). KILLED either way, but the doc's own decision-relevant number was mislabeled |
| Key-number 3/6 home-fav fade | n=1,179, z=−3.52 (framed as surviving Bonferroni) | Exact `{3,6}` bucket: n=773, z=−2.554. No bucket definition tried (7 variants, 3 independent agents) reproduces n=1,179 | **DIFFERS — n not reproducible** | Fails Bonferroni at both m=40 (Hermes' own claimed scan size) and m=70 (a broader honest scan) using the reproducible n. First-ever falsifier run: **KILLED** via shuffle (59–95/200 across parameterizations) even where multiplicity nominally passed |
| Wong teaser, favorite leg | 69.9%, n=259 | 69.9–70.4% (denominator-dependent), n=259 exact | **REPLICATES** | — |
| Wong teaser, underdog leg (+1.5/+2.5→+7.5/+8.5) | 66.8%, n=380 | 75.2%, n=380 (two independent methods, same n) | **DIFFERS materially** | Hermes' original script is not committed anywhere in the repo; source of their number could not be traced |
| Wong teaser, underdog leg (+7.5/+8→+13.5/+14) | 77.1%, n=105 | 67.6%, n=105 | **DIFFERS materially** | Same — unresolved, no script to diff against |
| Eastward-travel road-fav bind (H3) | n=79, z=2.34 | Own team-timezone table: n=87, z=1.82. Using the repo's actual `NFL_TEAM_UTC_OFFSET` (which silently omits OAK/SD/STL): n=83, z=2.31 | **Partially replicates; magnitude sensitive to a real code bug** | The shared table's omission of 3 relocated franchises mechanically inflates the reported cover rate (all 4 dropped games were road-fav cover *failures*); a residual ~4-game gap to Hermes' n=79 is still unexplained. First-ever falsifier run: broad variant (n=176) **KILLED** (shuffle 76/200, multiplicity logM=1.379 < 2.996); narrow variant (n=87) too small to gate — **PARKED** |
| "Road favorites" table row | 50.10%, n=2,391, z=−2.23 | That figure is the home **underdog's** cover rate; the true road-favorite rate is 49.90% | **DIFFERS — side mislabeled** | Adversarially **CONFIRMED**. Direction of the (null) conclusion is unaffected, but it is a live inversion hazard in a table other agents read from |
| market-atlas.md "Mean Cover Margin" column | per-season cover margin, e.g. "+2.24 pts/game" home edge | Column equals `mean(result)` (raw home scoring margin), not cover margin, in **27/27 seasons** | **DIFFERS — column mislabeled** | Adversarially **CONFIRMED, MAJOR**. Overstates the market residual by exactly the home-field advantage the line already prices (+2.17 pts = mean spreadLineHome) |
| market-atlas.md "Cover Rate" column | per-season cover rate | Pushes counted as **losses** in 27/27 seasons (matches W/pushes-as-loss, not W/decided) | **DIFFERS** | Adversarially **CONFIRMED**. Contradicts the same-night kickoff-time memo's own stated lesson to exclude pushes |
| Home-fav flat-bet EV | −0.057/unit | −0.0755/unit (true −110 payout, all-4,481-games denominator, pushes refunded) | **DIFFERS** | Adversarially **CONFIRMED**. Hermes used a −105 payout factor (0.952) on a decided-only base while framing "bet every home favorite" |
| QBR team-season persistence | Spearman ρ=0.374, Pearson r=0.379, n=223 | ρ=0.362–0.379, r=0.370–0.383 depending on duplicate-week aggregation (n=223 exact) | **REPLICATES within a documented aggregation choice** | — |
| FiveThirtyEight Elo (Brier 0.2203/0.2928) | reported as a result | Directory `data/fivethirtyeight/` does not exist; confirmed absent on every branch checked | **CANNOT_REPRODUCE** | Not a null — the files simply are not here |
| sportsoddshistory "272/272 incl. kickoff times, VALIDATED" | stated as validated | Only a 1,192-byte prose memo exists; it validates a *row count* (272 games matches the harness), spot-checks **one** row (hedged with a literal "(?)"), and its own text says "full automated cross-validation queued for next cycle" — never run. No parsed data file exists on any branch. | **Overstated — no artifact backs it** | Treat kickoff-time claims as unverifiable until a real parsed dataset is committed |

---

## 3. HERMES ERRORS AND HERMES WINS

**Hermes wins, stated plainly:**
- The sign-convention correction is right, and it is the single most load-bearing fact in the whole corpus — every downstream number depends on it.
- **Hermes self-caught the z=−5.38 push artifact.** That is a real mark in their favor: they noticed the number was suspicious and re-examined it rather than shipping it. The number itself (−5.3763) reproduces to four decimals. Only the *named cause* was wrong (§2) — the instinct to distrust an extreme result was correct, and the corrected residual (z≈−2.23) is what should have been reported, not zero.
- The CPOE KILLED verdict was directionally correct even on the broken pre-fix instrument — a genuinely bad bind stayed bad after repair.
- Wong's favorite-leg number, the QBR persistence figure, and the FiveThirtyEight/sportsoddshistory absence-flags all replicate cleanly.

**Hermes errors, stated plainly:**
- Two columns in `market-atlas.md` are mislabeled in every one of 27 seasons (Mean Cover Margin = raw margin, not cover margin; Cover Rate = pushes-as-losses) — the second is the *exact* trap the kickoff-time memo, written the same night, says was learned from.
- The key-number n=1,179 could not be reconstructed under any bucket definition; the reproducible figure (n=773) fails the very Bonferroni bar Hermes claimed it cleared.
- Two of three Wong-teaser legs are off by 8–10 points and Hermes' generating script was never committed, so the discrepancy is unresolved, not merely disagreed with.
- `cpoe-falsify.md` reports the clipped display-only `logSimpleE` under the label `logM` — a 742-log-unit understatement of how decisively that bind failed (verdict unaffected).
- The road-favorite table row reports the wrong side of the bet.
- In their own harness code (`build-cpoe-falsify-harness.py`), an `is_favored` sign check is inverted relative to the now-confirmed convention, and pushes are graded as losses (54 games / 108 rows) — the same defect class as the self-caught push artifact, recurring unfixed in the same batch. `build-close-calibration.py`'s `devig()` function is a mathematical identity that never removes vig at all, inflating its reported calibration error ~3× the true value.
- Hermes' own attempted repair of `falsify.ts` (on a sibling branch) fixed the overflow defect only partially and left the shuffle test **structurally inert** — a runnable repro shows it returns SURVIVOR even on a fully degenerate, zero-information input where the current branch's fix correctly returns STARVED/PARKED.

---

## 4. THE FIRST HONEST FALSIFIER CAMPAIGN

Today's branch fixed four defects: (1) shuffle+split were structurally inert and could only ever PASS — both now decide on mean log-likelihood ratio, with shuffle permuting outcome labels against fixed predictions; (2) evidence peaks that later decayed were erased — `supM` is now reported; (3) `marketProb` silently defaulted to 0.5 — `marketDataCoverage` now reports real-vs-default; (4) `exp(logM)` overflowed float64 past `logM≈709.78` and a null eProcess read as "not growing," inverting the strongest edges into KILLED. **Every falsifier verdict recorded before today came from a broken instrument.** These are the first valid runs:

| Bind | n | leakage | shuffle | split | multiplicity | Overall |
|---|---|---|---|---|---|---|
| CPOE persistence (full file, real market data) | 4,174 | PASS | **KILLED** (107/200 perms, need ≥190) | PASS (both halves negative, same sign) | **KILLED** (logM=−1022.4 vs bar log(20)=2.996) | **KILLED** |
| Key-number {3,6} home-fav fade, 2006+ real odds | 523–773 | PASS | **KILLED** (59–95/200 across parameterizations) | PASS | PASS in some naive framings (logM up to 5.12) | **KILLED** (by shuffle alone — the exact gate that was broken before) |
| Eastward-travel road-fav, broad (all away teams) | 176 | PASS | **KILLED** (76/200) | PASS | **KILLED** (logM=1.379) | **KILLED** |
| Eastward-travel road-fav, narrow (road favs only) | 87 | PASS | n<minN | n<minN | e=5.321, gates did not refute | **PARKED (starved)** |
| Home favorites / road dogs ATS | 4,357 | PASS | KILLED | PASS | KILLED (logM=−35.1 / −5.6) | KILLED |
| Overs / Unders | 6,868 | PASS | KILLED | PASS | KILLED (logM=−40.5 / −26.5) | KILLED |
| Divisional ATS, Large spreads ATS, Short spreads ATS | 845–2,611 | PASS | KILLED | PASS | KILLED | KILLED |
| Home moneyline, real prices, 2006+ | 5,051 | PASS | KILLED (0/200) | PASS | KILLED (logM=−395.5) | KILLED |

No bind in this campaign returned SURVIVOR. The key-number result is the cleanest illustration of why the shuffle gate matters: naive multiplicity framing alone (logM=5.12, "M=167×") would have called it a PASS — the repaired shuffle gate, absent before today, is what actually kills it. `marketDataCoverage.rowsWithMarketProb` reports a field as "present" even when it holds the symmetric-vig 0.5 fallback rather than a real quote — several runs flagged this as a gameable metric and reported real-vs-fallback coverage separately by hand.

---

## 5. THE MARKET, MEASURED

- **Closing spread is not biased**: intercept −0.039 (p=0.81), slope +1.050 (t vs 1 = 1.90, p=0.058), joint Wald p=0.150, stable in sign across 1999–2012 / 2013–2025 / 2006+ subperiods (never significant in any).
- **Devigged moneyline close is well-calibrated**: Brier=0.21077, 95% CI [0.2062, 0.2153] (n=5,051, 2006–2025); Spiegelhalter's Z fails to reject calibration for raw, proportional-devig, and Shin-devig probabilities alike (all |z|<1.96). A decile-level wobble exists in the 0.55–0.65 predicted band (~2 SE) that the global test misses — the one piece of real, if modest, texture found in the close.
- **Real vig has risen, with a step, not a drift**: moneyline hold 2.03%→2.45%→2.59%→3.69% across 2006–10/11–15/16–20/21–25 five-year eras; the jump is concentrated at 2023 (2.71%→4.28% year over year, then flat). Spread and total hold show the same pattern.
- **Break-even to clear**: for symmetric two-sided books (spread/total), breakeven = overround/2, rising from ~50.9–51.2% (pre-2011) to ~51.9–52.0% (2021–25). Moneyline has **no single breakeven number** — it is side-conditional (favorite side ~68–70%, underdog side ~32–35%, both stable-ish, dog side rising slightly with vig).
- **Tightest defensible upper bound on any generic ATS/totals edge**, from the pooled, unselected 6,778/6,868-game sample: ATS 95% CI [47.78%, 50.16%], OVER 95% CI [48.31%, 50.67%] — both entirely below the 52.38% (−110) breakeven. Across a 132-test segment scan (era × week × spread magnitude × total magnitude × divisional × weekday × favorite side × overtime, plus all 27 individual seasons), the **only** segment surviving Benjamini-Hochberg/Bonferroni correction is overtime (mechanical, not knowable pre-game). Nothing pre-game-actionable survives.

---

## 6. TESTABLE NOW vs NEEDS DATA

**Testable now (file-based, this container, no DB):**
1. Totals-market devig calibration (mirrors the spread devig check already done) — pre-registered kill: |observed−expected| < 2×SE.
2. Divisional-game unders bias, raw z-test on `divGame` (needs no odds; n≈2,300 available) — kill: |z|<2, else escalate to a real `falsifyBind` run rather than treat the raw z as confirmation.
3. Fix `build-cpoe-falsify-harness.py`'s inverted-favorite-sign and push-as-loss bugs, rebuild `cpoe-backtest-rows.jsonl`, re-run the falsifier — the current KILLED verdict rests on a dataset with a real labeling defect; direction of the fix's effect on the verdict is unknown until run.
4. Fix `build-close-calibration.py`'s no-op `devig()`, recompute the true calibration error (currently overstated ~3×).
5. Correct `market-atlas.md`'s two mislabeled columns and remove the "Shrinking" annotation from the 2006–2012 row before any agent cites it again.
6. Amend `kickoff-time-fav-scan.md`'s push-artifact causal claim and the road-favorite row label.
7. Reconcile or retract the Wong-teaser underdog legs (66.8%/77.1%) — cite 75.2%/67.6% until Hermes' original script surfaces.
8. Fix `NFL_TEAM_UTC_OFFSET` to include OAK/SD/STL, re-run H3 to close the residual ~4-game gap.

**Needs data (name the exact missing file):**
- `data/fivethirtyeight/elo_replay_2002_2016.pkl`, `elo_team_season_2015plus.jsonl` — directory does not exist at all, confirmed on every branch.
- `data/nflverse/pfr_advstats/*.csv` — never committed to git on any branch (`git log --all` empty).
- `ngs_receiving_2021_2025_harness_rows.json` — never committed anywhere; the falsifier-sweep.md SURVIVOR verdicts built on it also predate today's repair and are separately self-flagged as float-overflow artifacts.
- `data/nflverse/ftn_boxrate_2024.jsonl` + `play_by_play_{2022,2023,2024}.csv` — not on main; only `play_by_play_2023.csv.gz` exists, and only on the unmerged sibling branch `origin/hermes/w2-audit-settlement`.
- Full `play_by_play_{2016..2024}.csv.gz` (8 of 9 seasons missing everywhere) — blocks re-deriving the CPOE persistence statistic itself (r=0.42, n=32) from source.
- An ESPN-game-id ↔ nflverse-gameId crosswalk — does not exist; blocks the QBR-vs-same-season-margin check (r=0.78 claimed, unverifiable).
- A committed sportsoddshistory kickoff-time dataset — only the row-count-matching memo exists; no parsed file anywhere.
- Kalshi/Manifold quote snapshots — committed only on `origin/hermes/w2-audit-settlement`, one timestamp, season-2026 games with zero overlap against the 1999–2025 harness; Manifold rows are not two-sided and none are NFL.

---

## 7. NULLS: GENUINE vs UNDERPOWERED

**Genuine, well-powered nulls** (MDE ≪ observed effect, or MDE tiny and effect ≈ 0):
- Closing-spread unbiasedness test, n=6,967 (MDE well under the observed near-zero effect).
- The full 8-strategy falsifier sweep, n=845–6,868 per strategy — no survivors, MDE comfortably below typical bettor-relevant effect sizes.
- The 132-test segment scan, pooled ATS/OVER CIs (n=6,778/6,868) — tight enough to bound any generic edge at ~2pp.
- FTN box-count → rush EPA correlation, r≈0.001–0.019, n=1,708/570 (MDE≈0.068) — *if* the underlying reported numbers are accurate (file itself is `CANNOT_REPRODUCE` in this container; this is a power-analysis-only classification).

**Underpowered "nulls" — do not report as confirmed absence:**
- `rest-edge-scan.md` H1/H2/H3 (n=36–180, MDE 10–23pp against 2–6pp effects actually of interest).
- `persistence-to-market.md`'s 5-signal "KILLED as market edges" (n≈104–112, MDE≈13pp) — also `CANNOT_REPRODUCE`, source CSVs absent.
- `pfr-persistence-scan.md`'s n=5 season-pair "Stable (YES)" labels (MDE r=0.96) — also `CANNOT_REPRODUCE`.
- `close-calibration.md`'s cpoe season-persistence r=0.42 at n=32 (MDE r=0.48) — nominally significant but below its own 80%-power floor.
- Key-number bind's 2014–2025 era split alone (n=506, MDE 6.23pp vs observed 4.7pp) — the pooled figure is adequately powered; this one slice is not.
- H3 narrow variant (n=87) — too small even to run the falsifier's gates; correctly PARKED, not KILLED, not confirmed.

---

## 8. NEXT ACTIONS

**AGENT-EXECUTABLE (this container, no DB):**
1. Fix the two harness bugs in `build-cpoe-falsify-harness.py` (inverted favorite sign, push-as-loss) and re-run the falsifier — highest leverage, since the current KILLED verdict rests on a dataset with a known labeling defect.
2. Correct `market-atlas.md`'s two mislabeled columns and the non-monotone "Shrinking" row — cheapest fix, highest downstream-contamination risk if left.
3. Fix `build-close-calibration.py`'s no-op `devig()`.
4. Amend the push-artifact causal claim and the road-favorite row label in `kickoff-time-fav-scan.md`.
5. Run the two proposed-but-unexecuted tests (totals devig, divisional unders) — cheap, file-based, pre-registered kill thresholds already stated in §6.
6. Sweep remaining Hermes docs for the `logM`/`logSimpleE` mislabel pattern found in `cpoe-falsify.md`.

**FOUNDER-GATED (name the exact hands-on step):**
1. Supply `data/fivethirtyeight/elo_replay_2002_2016.pkl` and `elo_team_season_2015plus.jsonl` from your machine — nothing in this line of work moves without them.
2. Decide whether to merge `origin/hermes/w2-audit-settlement` (264 commits ahead of main) or cherry-pick its data files (PFR advstats, NGS receiving, FTN boxrate, `play_by_play_2023.csv.gz`, QBR harness, Kalshi/Manifold snapshots) onto main — most of §6's "needs data" list already exists there and simply isn't merged.
3. Legal/compliance review of covers.com/sportsoddshistory before any further automation: the recon memo documents User-Agent spoofing to defeat an active block, and the source has zero entry in `source-rights-registry.ts`.
4. Legal review of Kalshi commercial use: the Developer Agreement (§3/3.1/3.5, already in the registry) appears to prohibit exactly the derived-analytics/benchmarking use a recon doc rated 5/5 useful — resolve before any Kalshi-based product feature.
5. Commit an ESPN-gameId ↔ nflverse-gameId crosswalk to unblock the QBR-vs-margin check.
6. Track down or regenerate Hermes' original Wong-teaser script to resolve the two unreconciled legs (§2).

---

## 9. AUDIT LIMITS

- **No DB access** — enforced throughout; every figure above is file-based. Anything requiring `packages/db`, live odds ingestion, or production confidence scores was out of scope and is not addressed here.
- **Adversarial re-verification was sampled, not exhaustive**: only 5 claims (all from the `foundation-sign-push-efficiency` run) received a third-pass adversarial check; all 5 were **CONFIRMED**. The remainder of the corpus rests on cross-replication across the 8 independent recompute agents, which agreed on every verdict but occasionally disagreed on secondary statistics (e.g., shuffle-gate survivor counts of 80/83/107/200 across different row subsets and seeds — instrument/seed sensitivity, not a correctness issue, since the KILLED/PASS verdict never moved).
- **NOT RUN**: any live re-scrape of sportsoddshistory or covers.com (compliance-gated, deliberately not attempted); any query against a database; any check requiring the FiveThirtyEight, PFR, NGS, FTN, or missing play-by-play files named in §6.
- **Literature-mining task** (`FRONTIER.md`, `THEORY-LAYER.md`, `ENGINES.md`, `THEORY.md`, `DEEP-DIVES.md`) is largely untestable with only the two named data files — treat it as an acquisition/architecture roadmap, not adjudicated hypotheses. Four arXiv citations were spot-checked by fetch; three matched their claimed content, one (`LLM-SoccerArena`, arXiv:2607.24573) is a real paper whose claimed finding ("no significant differences across models; crowdsourcing beats LLMs") is not clearly supported by its fetched abstract — a mischaracterization, not a fabrication.
- **This document is a synthesis of the fleet's outputs**, not a fresh code run by the document's author — every claim traces to a command a recompute/adversarial/corpus-mining agent actually executed, quoted or paraphrased faithfully from their reported evidence; no number here was independently re-derived in the writing of this document itself.

---

## 10. Sonnet independent spot-check (post-synthesis, per the adopted 7-point protocol)

Two headline numbers re-derived from scratch, directly against `data/nflverse/games_harness_rows.jsonl`, independent of every agent above (own Python, no shared code):

```
SPOT CHECK 1 -- spread bias regression: intercept=-0.0394 slope=1.0500 n=6967
  t(slope vs 1)=1.8985  se_slope=0.02636
SPOT CHECK 2 -- home-fav cover rate (pushes excluded): n=4357 covers=2105 p_hat=0.4831
  z vs 0.5238 (vig breakeven) = -5.3751
  z vs 0.5 (fair coin)        = -2.2270
```

Both match §2's table to the precision reported there (intercept −0.039, slope 1.050, t=1.90; z=−5.38 vs vig breakeven, z=−2.227 vs fair coin, exact). This is a THIRD independent derivation of the two most load-bearing numbers in the document (the market-efficiency finding and the push-artifact mechanism correction), on top of the fleet's own 8 recomputes + 6 adversarial verifies — treated here as confirmed, not merely reported.

**Process note, for the ledger:** this workflow stalled once mid-run (background process died silently after ~2/23 agents, journal frozen 24 minutes with no live process) and was resumed via `Workflow({resumeFromRunId})`, which replayed the 2 completed results from cache and ran the remaining 21 live — worth knowing for any future long-running background workflow in this repo.
