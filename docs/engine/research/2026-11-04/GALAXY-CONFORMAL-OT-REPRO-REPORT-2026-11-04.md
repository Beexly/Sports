# Adversarial Reproduction Report — galaxy-conformal-ot Dual Benchmarks

**Source:** Beexly/Sports, branch `research/gds-fast-grants-and-clean-kernel-2026-11-03`, commit `74cdec5f1`
**Reproduction environment:** fresh venv (numpy 2.5.4, pandas 3.1.0, pyarrow 26.0.1), data fetched independently from the public sources the code specifies. Working tree of the Sports checkout was not disturbed; code extracted via `git archive` to `~/workspace/benchmark-repro/`.
**Date:** 2026-11-03

## Verdicts

| Benchmark | Verdict | Headline delta |
|---|---|---|
| NFL PBP Schrödinger (sports) | **REPRODUCED** (within data-vintage tolerance) | Full-model AUC 0.687 mine vs 0.686 claimed (Δ +0.001). n differs: 4,395 mine vs 4,281 claimed — one extra week of in-season 2026 nflverse data, see §3. |
| MIMIC-IV Demo clinical | **REPRODUCED — exact** | Every number in the results JSON matches to 6 decimal places, including both bootstrap CIs. |

The code genuinely computes what the JSONs report, on the real public datasets, with no hardcoded results and no synthetic data passed off as real. The caveats below are about **evaluation design and narrative framing**, not about fabricated numbers.

---

## 1. Code audit

### Kernel (`galaxy_conformal_ot/`)
Real implementations throughout — no stubs, no result hardcoding:
- `solve_schrodinger_bridge_trajectory`: genuine log-domain Sinkhorn/Schrödinger-potential iteration; control energy = τ · KL(coupling ‖ reference kernel).
- `conformal_finite_sample_rank`: the correct finite-sample rank ⌈(n+1)(1−α)⌉ (Shafer & Vovk).
- `compute_critical_slowing_down_index`: lag-1 autocorrelation + variance-ratio composite, as documented.
- Model combination weights in both benchmarks are **hand-set constants** (sports: [0.42, 0.28, 0.10, 0.20]; clinical: [0.30, 0.25, 0.20, 0.12, 0.13]) — nothing is trained. That is honest in the code, but it means the reported AUCs are the performance of a fixed, hand-weighted score, not a fitted model.

### Sports benchmark (`sports_pbp_schrodinger_benchmark.py`)
- **Data provenance (in code):** reads `data/nflverse/pbp/play_by_play_{2024,2025,2026}.parquet` and `data/nflverse/injuries_{yr}.csv` from the repo root. Those files are **not committed** in the repo (not in commit 74cdec5f1); they are the standard nflverse public releases. I fetched them from `github.com/nflverse/nflverse-data` releases (tags `pbp` and `injuries`) — same schemas the code expects, including `game_type`, `report_status`, `practice_status`, `gsis_id`.
- **Leakage check — features/label: CLEAN.** Label = Out/Doubtful on the week w+1 injury report. Features use week w only; the chronic-workload window is `range(max(1, w-4), w)`, strictly excluding week w. `prac_strain` is week w's own report status/practice status — legitimately known before week w+1. Requiring the team to play in w+1 uses schedule only.
- **Leakage check — preprocessing: mild, unsupervised.** Feature standardization (mean/std) and the Cholesky whitening matrix are fit on the **full dataset**, including rows later used as the conformal "test" half. No labels are involved, but the "out-of-sample" claim should be read with that in mind.
- **Conformal split: order-based, not random, positives never held out.** The gate calibrates on the **first half of the negative rows in dataframe order** and tests on the second half. Because rows are ordered season-major, calibration negatives are in fact all 1,852 negatives from 2024 + 258 from 2025, and test negatives are the rest of 2025 + all of 2026 (verified by direct inspection). Ironically this behaves like a crude walk-forward split — arguably a harder test than a random split — but it is an artifact of row order, not a designed temporal split, and it is not the exchangeable split conformal theory assumes. The detection rate (28.1%) is computed on **all** positives; no positive is ever held out from anything (positives play no role in calibration, so this is not contamination — but "out-of-sample" applies strictly only to the negative half).
- **Mislabeled metric:** the JSON field `precision_lift_over_base_rate` (3.05 claimed) is actually TPR ÷ FPR — the positive likelihood ratio. Actual precision at the gate ≈ 0.110 vs base rate 0.0396, i.e. a true precision lift of ≈ **2.8×**, not 3.05×. The underlying TPR and FPR numbers are correct; the label is wrong.
- **Attribution note:** the 2-feature "Schrödinger dropoff + depletion" score alone scores 0.669; the full model adds the week-w practice/report strain (a conventional injury-report feature; the report-only baseline is 0.563) and kinetic hit rate to reach 0.686. The Schrödinger-bridge term in the dropoff feature is, for a 2-node bridge, a fixed monotone reweighting of the share change — it adds no independent information beyond the 1H→2H usage-share drop itself. The signal is real; most of it is "player's second-half usage collapsed + workload depletion + he was already limited in practice," which is a sensible finding, but the exotic machinery is not where the AUC comes from.
- **Narrative check:** the script docstring and commit message claim "140,000+ snaps." The code analyzes REG pass/run plays only: **81,321 plays** across 2024–2026 in the current data (33,470 + 32,941 + 14,910). Total rows in the three parquet files (all play types) are also below 140K. The 140K figure is not supported by the code's own data selection.

### Clinical benchmark (`clinical_mimic_iv_real_benchmark.py`)
- **Data provenance (in code):** reads `data/mimic_iv_demo/{icu_icustays, icu_chartevents, hosp_admissions, hosp_diagnoses_icd}.csv.gz` — the PhysioNet **MIMIC-IV Clinical Database Demo v2.2** files (`physionet.org/files/mimic-iv-demo/2.2/`), renamed flat. No credentialing needed for the demo; I downloaded them directly. The demo contains exactly 140 ICU stays; the code's minimum-data filters (≥6 HR, ≥4 SBP, ≥4 RR measurements) leave **138 evaluated** — matches the JSON (the fleet's pasted narrative says both 138 and 140 in different places; 138 is the evaluated n, 140 is the demo size).
- **Labels:** y=1 if the admission carries a sepsis/septic-shock ICD-9/10 code (A40/A41/R652/99591/99592/78552) **or** `hospital_expire_flag=1`. 38 positives — reproduces exactly.
- **Design caveat — this is retrospective discrimination, not early warning.** Features are computed over the **entire stay**, including "peak strain" (85th/15th percentiles across the whole stay). The label is an admission-level discharge diagnosis / in-hospital death. Measurements taken during or after decompensation therefore contribute to the "prediction." The AUC (0.766) is a real association statistic on real data, but the design has no prediction horizon and cannot support an "early-warning system" reading. This is a temporal-leakage-by-design issue in framing, invisible from the headline number.
- **Design caveat — shock index pairing:** HR and SBP series are filtered separately and zipped **by array position**, not by timestamp, for both the baseline (`shock_index_only`) and one Galaxy feature (`mean_shock_index`). Internally consistent across models, but physiologically sloppy.
- **Conformal gate:** same pattern as sports — negatives split in half **in stay_id order** (arbitrary w.r.t. time), first 50 calibrate, remaining 50 test; realized FA 12% = 6/50 stays. Positives are never split; detection (44.7%) uses all 38. Asymmetric denominators in the headline comparison: the naive alarm's 63% FA is computed over **all 100** negatives, the Galaxy gate's 12% over the **50** test negatives only. Both numbers reproduce exactly as coded; the comparison should be read knowing the denominators differ.
- **Small-n caution:** 138 stays / 38 positives. The Galaxy CI [0.664, 0.842] and shock-index CI [0.579, 0.771] overlap substantially; the +0.089 AUC gap is not decisive at this sample size.

## 2. Data provenance (what I fetched)

| Dataset | Source | Result |
|---|---|---|
| nflverse PBP 2024/2025/2026 parquet | github.com/nflverse/nflverse-data releases, tag `pbp` | Fetched (20.6 / 20.3 / 9.0 MB) |
| nflverse injuries 2024/2025/2026 CSV | same repo, tag `injuries` | Fetched; schema matches code |
| MIMIC-IV Demo v2.2 (icustays, chartevents, admissions, diagnoses_icd) | physionet.org/files/mimic-iv-demo/2.2/ | Fetched, no credentialing; 140 stays, chartevents filtered vitals sum to exactly 69,124 |

No data source failed. The fleet did not commit its data copies, so exact bit-for-bit dataset identity for the sports run can't be proven — see the vintage note below.

## 3. Numbers side-by-side

### Sports (claimed → reproduced)
The current 2026 nflverse files include Week 9 (played Nov 1–2, 2026); the fleet's run predates that release. My dataset is therefore slightly larger: **n=4,395 vs 4,281 (+114 player-weeks, +2 players, +3 positives)**, with the excess entirely in the 2026 slice (544 player-weeks over eligible weeks). Every performance metric lands within noise of the claim:

| Metric | Claimed | Reproduced | Δ |
|---|---|---|---|
| Naive ACWR AUC | 0.388 [0.343, 0.433] | 0.385 [0.341, 0.430] | −0.003 |
| Injury-report-only AUC | 0.563 [0.527, 0.595] | 0.563 [0.530, 0.599] | 0.000 |
| SB dropoff+depletion AUC (all) | 0.669 [0.625, 0.710] | 0.671 [0.629, 0.714] | +0.002 |
| SB dropoff+depletion AUC (unlisted, n=3,297→3,387) | 0.676 [0.630, 0.728] | 0.677 [0.628, 0.722] | +0.001 |
| **Galaxy full model AUC** | **0.686 [0.651, 0.725]** | **0.687 [0.645, 0.733]** | **+0.001** |
| Conformal threshold (α=0.10) | 0.7749 | 0.7770 | +0.002 |
| Realized false-alarm rate | 9.20% | 9.24% | +0.04 pp |
| Detection rate at gate | 28.07% | 27.59% | −0.48 pp |
| "Precision lift" (actually LR+) | 3.05 | 2.99 | −0.07 |

**Verdict: REPRODUCED.** The result is also stable to a data-vintage change, which is a point in its favor.

### Clinical (claimed → reproduced)
Bit-exact reproduction on a frozen public dataset:

| Metric | Claimed | Reproduced | Δ |
|---|---|---|---|
| Stays evaluated | 138 | 138 | 0 |
| Vital measurements | 69,124 | 69,124 | 0 |
| Positives | 38 | 38 | 0 |
| Shock-index AUC | 0.677 [0.579, 0.771] | 0.677 [0.579, 0.771] | 0 |
| **Galaxy AUC** | **0.766 [0.664, 0.842]** | **0.766 [0.664, 0.842]** | **0** |
| Naive alarm FA / detection | 63.0% / 89.5% | 63.0% / 89.5% | 0 |
| Galaxy gate FA / detection (α=0.15) | 12.0% / 44.7% | 12.0% / 44.7% | 0 |
| Relative FA reduction | 80.95% | 80.95% | 0 |

**Verdict: REPRODUCED — exact.** Every digit, including bootstrap CIs (seeded, deterministic).

## 4. Bottom line

Both benchmarks are real: real public data, real computation, results that an independent rerun confirms (exactly for MIMIC, within one week of in-season data drift for the NFL). Nothing is hardcoded or synthetic.

What should be corrected before these numbers are used anywhere external (grant applications, preprints):

1. **"140,000+ snaps"** → the code analyzes 81,321 REG pass/run plays. Fix the narrative.
2. **`precision_lift_over_base_rate`** → it is the positive likelihood ratio (TPR/FPR ≈ 3.05); true precision lift ≈ 2.8×. Rename or recompute.
3. **Conformal "out-of-sample"** → disclose that the split is an order-based half-split of negatives only (in the sports case effectively calibrate-2024/test-2025–26), standardization/whitening are fit on all rows, and positives are never held out. A shuffled or explicit temporal split with held-out positives would make the claim airtight.
4. **Clinical "early warning" framing** → features span the entire stay and the label is a discharge-level diagnosis; as designed it is retrospective discrimination on 138 demo stays, not prospective early warning. A defensible version needs features truncated at a prediction time (e.g. first 24h) and a horizon-defined outcome.
5. **Clinical headline comparison** → naive FA uses all 100 negatives; Galaxy FA uses 50 test negatives. Same-denominator reporting would be cleaner.

Run artifacts: `sports_run_output.json`, `clinical_run_output.json` in `~/workspace/benchmark-repro/`; the scripts also overwrote the extracted copies of the results JSONs in place with the reproduced values.
