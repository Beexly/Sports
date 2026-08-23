# Oversight Agent 7 — Cross-Verification Report

**Purpose:** Cross-verify all research agent findings for duplicate edge discoveries and consolidate overlapping findings.

**Scope:** Night-of-2026-08-19 research fleet (L-6 through L-18, C-14 through C-47, R-9/R-10), the Aug-21 research-track findings (3 math bugs + 6 lanes), the Aug-22/23 overnight NGS temporal-stability results, and the H0 grunt slices (H0.5–H0.6).

**Verdict: NO duplicate edge discoveries.** The single "duplicate" (C-41) is a deliberate, explicitly-flagged quarantine of an L-16 exploratory survivor. Three clusters of overlapping findings were identified and are consolidated below.

---

## 1. Duplicate Edge Discoveries — Review

### 1.1 C-41 vs L-16 — DELIBERATE quarantine, not accidental (✓ handled correctly)

**L-16** tested two book-level mechanisms (per-book shade, cross-book lead-lag). Both DEAD. While testing, it surfaced ONE secondary-market outlier: fanatics MONEYLINE shade at t=−2.18, +0.8pp CLV over 163 bets, which clears both the t-bar and the 150-bet bar.

**C-41** explicitly quarantines this as the "ONE exploratory survivor from L-16." It is correctly NOT promoted to a claim because:
- The pre-registered primary market was TOTALS, not moneyline.
- This is a secondary market surfaced while testing something else — the textbook multiple-comparisons trap.
- Three other |t|>2 moneyline books fell below the 150-bet floor.

**Verdict:** This is the ONLY near-duplicate, and it is handled correctly — quarantined, labeled "explicitly NOT a claim," gated to a future prospective pre-registered track only.

### 1.2 R-9 / R-10 vs C-46/C-47 — Intentional lineage, not a duplicate (✓)

R-9 (synthetic NB-RBPF shadow) and R-10 (DML causal prototype) adopted the Grok-derived engine design (Liu-West, Laplace-for-NB conditional, house-filter conventions) per C-47. C-46 audited the Grok "self-regularizing e-process": core algorithm real, novelty claim rejected, sandbox capital inadequate — ADOPTED as candidate for a future prospective program.

**Verdict:** The R-9/R-10 engines are the *implementation* of C-46's audited Grok design. Intentional lineage, explicitly documented in the ledger. Not a duplicate.

### 1.3 C-23/C-48/C-50/C-51 — Progressive refinement, not a duplicate (✓)

C-23 defined the anytime-valid certification protocol (gap: needs e-process for continuous price-space null). C-48 retired V1 (point-null only, not valid under composite null). C-50 adopted V2 (asymmetric fractional increment, valid supermartingale under p≤m). C-51 finalized with a deterministic side-selection rule (q>m bet OVER, q≤m bet UNDER).

**Verdict:** Four progressive refinement rounds of the same protocol. Each explicitly supersedes the prior. Not a duplicate.

---

## 2. Consolidated Overlapping Findings — Three Clusters

### Cluster A: Book-level deviation from consensus (L-15 test 2, L-16 test A, L-18 BPQI)

| Investigation | Metric | Level | Finding | Conclusion |
|---|---|---|---|---|
| L-15 test 2 | mean(p) − median(p) vs Δ | Market/aggregate | r=0.402, p=3.9e-38 | corr(X, Y−X) identity artifact — not a signal |
| L-16 test A | per-book p − median_close (anti-shade) | Per-book shade strategy | max |t|=1.48 (betus), nobody clears |t|>2 | No persistent shade |
| L-18 (BPQI) | per-book mean dev from cross-book median | Per-book quality metric | fanatics totals t=−2.05 (0.21pp), moneyline t=−2.18 | Measured deviation, not a trade |

**Overlap:** All three investigate the same phenomenon — books deviate from the cross-book consensus. They differ in scope (L-15 market-aggregate, L-16/L-18 per-book) and treatment (L-15 predictive feature → rejected as artifact; L-16 trading signal → rejected; L-18 quality metric → measured, never traded).

**Consolidated verdict:** The deviation is real (it exists, hence L-18's BPQI/BURS public metrics surface). But it is NOT exploitable as an edge: at the market level it's the corr(X, Y−X) identity, and at the book level no book persistently clears the statistical bar. The L-16 anti-shade CLV (+1.2 to +1.8pp on the deviation subset) was correctly called fade-the-outlier noise, not a signal.

**No action needed.** The investigations are appropriately differentiated by question and level. The overlap is methodological (same concept) rather than finding-level (same edge).

### Cluster B: NFL data gap — symptom → root cause → fix (L-14, C-35, C-36, C-37)

| Investigation | Finding | Level |
|---|---|---|
| L-14 (label census) | NFL preseason: 48 games, 0 odds rows. NFL regular: 84 future games, last snapshot 2026-06-17, 0 clean closes. First-half totals: 0 rows ingested. | Symptom |
| C-35 (SEASON_WINDOWS audit) | SEASON_WINDOWS in config.ts gated americanfootball_nfl to Sep–Feb → NFL filtered out of every 15-min refresh for all of August. 6 regression tests, 0 type errors. | Root cause |
| C-36 (preseason key mapping) | The Odds API serves preseason under `americanfootball_nfl_preseason` key. Needs key-to-sport mapping so preseason odds attach to existing games. Hard expiry ~Aug 30. | Fix |
| C-37 (archive flag) | LINE_ARCHIVE_ENABLED is OFF (founder-gated). NOT data loss — odds table is append-only (1,368,288 rows). Archive adds phase-tagged OPEN/INTERIM/CLOSE snapshots that make close identification reliable. | Clarification |
| EDGE-ROADMAP §0 | NFL preseason = under-attended venue (limits ~$2k, ~80% professional handle). | Strategic context |

**Consolidated verdict:** A single causal chain. L-14 observed the symptom, C-35 diagnosed root cause and fixed it (merged, 6 tests pass), C-36 identified the remaining preseason key-mapping requirement (owner-gated, hard expiry), and C-37 clarified that the empty archive is a founder flag, not data loss. No contradiction.

**Action:** C-36 is BLOCKED (hard expiry ~Aug 30, 7 days from now). The preseason ingestion fix (C-35's SEASON_WINDOWS widening to Aug–Feb) is DONE and deployed. Recommend confirming whether the founder has time to review C-36 before the preseason window closes.

### Cluster C: Model-as-market-echo (L-15, C-14, C-28, L-12, EDGE-ROADMAP §0)

| Investigation | Finding |
|---|---|
| L-15 (close-pred feasibility) | Totals Ridge r=0.490 is the corr(X, Y−X) identity: corr(p_entry, p_close)=0.40 ⇒ corr(p_entry, Δ)=−0.51 is textbook, not forecast skill. A Ridge on p_entry alone matches the full model (r=0.503). Kill. |
| C-14 (CLV forensics) | CLV math correct but NOT de-vigged (methodology fact). 58.5% TOTAL beat rate is raw, not vig-adjusted. Unpatched bugs: no staleness bound on closing snapshot (take:80 vs :240) and no odds_batch provenance on 909/909 lock prices. |
| C-20 (price-space CLV) | 58.5% is "not evidence of anything" until juice is in the CLV computation. Requires C-23's e-process-for-continuous-null to be closed. NEVER re-grade historical census in place (voids anytime-valid guarantees). |
| C-28 (calibration = market echo) | ECE 0.0044 was computed on confidence/100 — confidence is a market-structure echo (scoring.ts:486–494). Near-perfect reliability AND near-zero resolution is exactly what you get when your score is the market. |
| L-12 (grouping-loss gate) | BLOCKED: no modelProb exists. modelProb is documented as "null until one genuinely exists" (schema.prisma:602). Cannot compute grouping-loss gate without it. |
| EDGE-ROADMAP §0 | Team-strength modeling tuned for accuracy collapses onto the book's own model and yields zero residual resolution (Hubáček et al. 2019). |

**Consolidated verdict:** Five independent investigations converge on the same diagnosis: the published confidence/probability is a market-structure echo with zero residual resolution. The apparent "skill" (58.5% beat rate, r=0.49 Ridge) is an artifact of the corr(X, Y−X) identity and unpatched measurement bugs.

**Action items (consolidated):**
1. C-15 (CLV measurement integrity fix) is the gate: merge 8e2af6f1's 3-file landable slice (clv-capture.ts + settle-sport.ts take:240). C-30 confirmed 6f0353e1 does NOT contain this change — use 8e2af6f1 only.
2. C-20 (price-space CLV grading) requires C-23's gap closed first (e-process for continuous price-space null). This is the next blocker after C-23.
3. C-21 (grouping-loss lower bound) requires a genuine modelProb (C-28). Blocked until C-20 or C-22 delivers one.
4. The "58.5% TOTAL beat rate" should appear ONLY as a diagnostic in the CLV forensics artifact, never as a public claim, until C-20 lands.

### Cluster D: Ridge + grouped-by-game CV (L-15 test 5, L-17)

| Investigation | Data | Features | r | Verdict |
|---|---|---|---|---|
| L-15 test 5 | 1.37M odds rows, 947 labels | 5 close-prediction features | 0.490 | r≥0.15 "promising" — BUT it's the p_entry artifact (corr(X,Y−X)); A Ridge on p_entry alone matches |
| L-17 (final edge experiment) | 241 clean-close games, 203 in CV | 6 path-geometry features | 0.091 | r<0.10 STOP, no appeal |

**Overlap:** Same model class (Ridge, alpha=1.0, GroupKFold-by-game, same CV split: first 120 for pair/feature selection, last 121 holdout). Both kill on totals.

**Consolidated verdict:** L-15's r=0.49 is explained by L-17's more rigorous test — when features are pre-entry-only and the model runs on clean-close games, the signal disappears (r=0.091). L-15 found the apparent signal is an artifact; L-17 confirmed the real signal is null. C-16's literature confirmed calibration-only methods are ranking-invariant and cannot create resolution.

**No action needed.** Progressive: L-15's looser test on the full corpus suggested a signal → L-17's tighter test on clean closes confirmed it was noise. Not a duplicate finding.

### Cluster E: NGS temporal stability vs H0.6 covariate bindings (NEW — Aug 23 results)

The overnight research agent (Research Agent 1, route-running efficiency) produced `2026-08-23-ngs-temporal-stability-results.json`: ICC and SNR for 15 NFLVerse NGS metrics across 2024–2025 seasons, 455–1441 player-seasons, 8.3–11.1 weeks per season.

**Cross-verification against H0.6 (PR #576, rush-yards + INT covariate binds):**

| H0.6 covariate | NGS field | ICC | SNR | Temporal stability |
|---|---|---|---|---|
| RushSample: avgTimeToLos | avg_time_to_los | 0.258 | 0.347 | **Best rushing metric** ✓ (correctly chosen) |
| RushSample: pctAttemptsGte8Defenders | percent_attempts_gte_8_defenders | 0.178 | 0.217 | Moderate-low ⚠️ |
| IntSample: avgTimeToThrow | avg_time_to_throw | 0.314 | 0.458 | **Decent passing metric** ✓ (correctly chosen) |
| IntSample: aggressiveness | aggressiveness | 0.113 | 0.127 | **Weak** ⚠️ |

**Key negative finding (cross-referenced):** The H0.6 bind files explicitly exclude `expectedRushYards` / `ryoePerAtt` from the covariate bus ("y-axis only, GSE-RYOE referee"). The NGS results confirm this was the right call:
- `rush_yards_over_expected_per_att` (RYOE): **ICC = 0.043, SNR = 0.045** — essentially noise
- `efficiency` (rushing): **ICC = 0.0, SNR = 0.0** — pure noise, zero signal
- `avg_yac_above_expectation` (GSE-xYAC): **ICC = 0.075, SNR = 0.081** — very low
- `avg_yac` (receiving): **ICC = 0.101, SNR = 0.113** — low

**Cross-referenced with L-17:** L-17's STOP verdict (r=0.091, six features survived decimation but don't predict CLV) is consistent with the NGS results — when the best features have ICC 0.05–0.35, the upper bound on predictive r is inherently low. The exception (rushing `efficiency` at ICC=0.0) confirms L-17 couldn't have found signal there even in principle.

**Cross-referenced with L-9:** L-9's lone market clearing 52.4% was TOTAL (58.5% beat rate). The NGS results show that player-level metrics with low ICC (RYOE 0.043, xYAC 0.075, YAC 0.101) are too noisy to support player-prop edges — consistent with the close-prediction program's overall null result.

**Consolidated verdict:** The overnight NGS stability results independently validate the H0.6 design:
- ✓ Used the 2 highest-ICC metrics available (avgTimeToLos, avgTimeToThrow)
- ✓ Correctly excluded RYOE/efficiency from the covariate bus (they have near-zero ICC)
- ⚠️ 2 of 4 covariates are low-signal (aggressiveness ICC=0.113, pctAttemptsGte8Defenders ICC=0.178) — these are still leak-safe NGS weekly means, so they meet the honesty bar, but their contribution to predictive power is limited by temporal stability.

**Action:** No defect to fix. The H0.6 binds are correctly designed. The NGS results provide a floor estimate for H0.6's expected uplift: with avgTimeToLos (ICC 0.26) and avgTimeToThrow (ICC 0.31) as the stronger signals, any lift is bounded by those reliability coefficients. Recommend recording these ICC values as priors in the EDGE-ROADMAP evidence base for future model-power calculations.

---

## 3. Summary: Cross-Verification Results

| Category | Count | Detail |
|---|---|---|
| Duplicate edge discoveries (accidental) | **0** | The only near-duplicate (C-41) is a deliberate quarantine |
| Overlapping findings requiring consolidation | **5 clusters** | A–E above, all with coherent consolidated verdicts |
| Findings that are progressive (not duplicate) | **8** | L-14→C-35→C-36→C-37; L-15→L-17; L-15→C-14→C-20; L-16→C-40→C-41; C-23→C-48→C-50→C-51; L-12→C-28; C-46→R-9/R-10; H0.6→NGS(08/23) |
| Open action items from overlaps | **3** | C-36 (preseason key mapping, expiry ~Aug 30); C-20 gated on C-23 (price-space CLV); C-21/C-22 gated on C-28 (no modelProb) |

### Overall finding

Every research agent tested a **distinct** angle. No two agents independently "discovered" the same edge. The apparent overlaps are all **progressive investigations** — earlier findings seeding later, more rigorous tests. The consolidation mechanism (C-40 absorbing L-16, C-41 quarantining the one survivor, C-38 correcting prior misdiagnoses) is functioning correctly. The single exploitable bug (Anscombe 3/8→1/8 offset, ~5.3pp P(Over) > vig) was caught pre-freeze by the Research Track and is NOT wired into the frozen MVE.

**No fabricated evidence, no duplicate claims, no un-quarantined false edges.**
