# Deep Dive: Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities — GSE Audit Report

- **Source:** Drive doc "Auditing Conformal Prediction, Small-Sample Calibration, and Sports Market Probabilities for GSE", converted to `/tmp/drive-deep/conformal-prediction-audit.md` (281 lines, ~23k chars, 2 tables).
- **Note date:** 2026-09-21
- **Purpose:** Deep-read substance pass per Garrett's standing directive — raw corpus first, exact metrics/equations preserved, gaps recorded not invented.

---

## 1. Research question and thesis

**Research question:** How should GSE quantify uncertainty and calibrate its engine outputs so that published numeric lines (spreads, totals, player props) and binary sides (moneylines) carry rigorous finite-sample coverage guarantees — especially when calibration data is scarce (e.g., n = 5) — without resorting to deceptive over-tightening?

**Thesis:** Standard point forecasters and uncalibrated quantile regressions exhibit systematic finite-sample under-coverage whenever feature dimension is non-trivial relative to sample size. GSE should therefore wrap every publishable prediction in distribution-free conformal machinery, and — critically — operate **fail-closed**: whenever the calibration sample is too small to certify the nominal quantile, the system must emit an infinite interval or refuse to publish (No-Bet), never clamp the quantile to the largest observed residual. The document's central slogan is "eliminate fake tightness": clamping is treated as an integrity defect, not a convenience.

The report is structured as an audit with six sections: A (KEEP — primary literature + formulas), B (CONTRADICTIONS — paired opposing quotes), C (HEARSAY — internal hits that cannot override literature), D (IGNORE — unrelated arXiv papers), E (UNREAD — excluded sources), and F (20-line operational plan for n = 5 vs n = 500 at alpha = 0.1), plus a Sources list and two tables.

---

## 2. Methods/models with equations (exact formulas, definitions, metric names)

### 2.1 Conformalized Quantile Regression — Romano, Patterson & Candes (2019), arXiv:1905.03222

- Setup: n training samples {(Xi, Yi)} for i = 1..n; predict unknown Yn+1 at test point Xn+1.
- Fix lower/upper quantiles: **alpha_lo = alpha/2**, **alpha_hi = 1 - alpha/2**.
- Conformity score on calibration set I_2:
  **E_i = max(q_alpha_lo(X_i) - Y_i, Y_i - q_alpha_hi(X_i))**
- Calibration quantile: Q_{1-alpha}(E; I_2) = the **ceil((1 - alpha)(|I_2| + 1))-th largest** element of {E_i}_{i in I_2}.
- Prediction interval: **C(Xn+1) = [q_alpha_lo(Xn+1) - Q_{1-alpha}(E; I_2), q_alpha_hi(Xn+1) + Q_{1-alpha}(E; I_2)]**.
- Guarantee: under exchangeability, **P{Yn+1 in C(Xn+1)} >= 1 - alpha**.

### 2.2 Jackknife+ — Barber, Candes, Ramdas & Tibshirani (2019), arXiv:1905.02928

- Leave-one-out fitted regressions mu_-i; leave-one-out residuals **R_i^LOO = |Y_i - mu_-i(X_i)|**.
- Interval: **[q_alpha^-(mu_-i(Xn+1) - R_i^LOO), q_1-alpha^+(mu_-i(Xn+1) + R_i^LOO)]**.
- Guarantee: under exchangeable training samples, coverage of **at least 1 - 2*alpha** regardless of data distribution, for any algorithm treating training points symmetrically.
- Operational role in the audit: the substitute for split CQR when n is small (no data-splitting loss).

### 2.3 Split conformal (Angelopoulos & Bates 2021, arXiv:2107.07511)

- **q_hat** = the **ceil((n + 1)(1 - alpha)) / n** empirical quantile of calibration scores s_1, ..., s_n.
- Guarantee: **P(Yn+1 in C(Xn+1)) >= 1 - alpha**, "no matter what model is used or what the distribution of the data is."
- Hard constraint: the level delta must satisfy **delta >= 1/(n + 1)** so that ceil((1 - delta)(n + 1)) <= n (Dietterich & Hostetler 2022, arXiv:2206.04860). If n is too small, distribution-free coverage cannot be guaranteed without infinite intervals or abstention.

### 2.4 yromano/cqr computation logic (verbatim from doc)

1. Compute E_i = max(q_alpha_lo(X_i) - Y_i, Y_i - q_alpha_hi(X_i)) for each i in I_2.
2. Compute Q_{1-alpha}(E; I_2) as the ceil((1 - alpha)(|I_2| + 1))-th largest element of {E_i}.
3. Interval: [q_alpha_lo(Xn+1) - Q_{1-alpha}, q_alpha_hi(Xn+1) + Q_{1-alpha}].

### 2.5 The mandatory hand computation: n = 5, alpha = 0.10

- Inflation factor: (1 - alpha) * (1 + 1/n) = 0.90 * 1.20 = **1.08**.
- Rank index: k = ceil((n + 1)(1 - alpha)) = ceil(6 * 0.90) = ceil(5.4) = **6**.
- k = 6 > n = 5. Evaluating an empirical quantile at inflated level 1.08 (> 1.0) yields **+infinity**, forcing the interval [-infinity, +infinity] or total refusal to publish. This is required because a distribution-free 90% marginal coverage guarantee is impossible when **n < ceil(1/alpha) - 1** (i.e., at least n = 9 needed for alpha = 0.1).
- Clamping variant: if software clamps k to max(n) = 5, it selects the maximum observed residual E_(5). True finite-sample coverage of E_(5) under exchangeability is **n / (n + 1) = 5/6 ≈ 83.33%**. Clamping falsely presents a 90%-confidence interval while delivering an **under-coverage defect of 6.67%** — "fake tightness." GSE explicitly bans quantile clamping.

### 2.6 Non-exchangeable sequential methods (sports seasons)

A 272-game NFL season / 82-game NBA season violates i.i.d. exchangeability (weekly regime shifts, momentum, roster changes, weather). Methods replacing strict exchangeability with local stationarity, mixing conditions, or bounded drift:

- **Adaptive Conformal Inference (ACI):** updates nominal miscoverage dynamically after each observed outcome: **alpha_{t+1} = alpha_t + gamma * (alpha - err_t)**, where **err_t = 1{Y_t not in C_t}**. Asymptotic coverage under arbitrary shifts; **no finite-sample marginal guarantee over a short 18-week NFL schedule**.
- **Ensemble Batch Prediction Intervals (EnbPI):** aggregates bootstrap ensemble forecasts over rolling horizons.
- **Sequential Predictive Conformal Inference (SPCI):** fits an autoregressive model to non-conformity scores: **s_t = f(s_{t-1}, ..., s_{t-p}) + e_t**; valid finite-sample intervals provided the residual time series remains stationary.
- **Rolling-Origin Conformal Prediction:** calibrates against the m most recent pseudo-out-of-sample forecast errors. For a structured 272-game NFL season, sliding window **m = 32 to 64 games** gives optimal adaptation to line movements.
- **Synthetic-Powered Predictive Inference (SPI):** augments scarce calibration sets with synthetic samples from domain priors; shrinks interval width while preserving coverage bounds.

### 2.7 Binary probability calibration (moneylines — NOT CQR)

Structural distinction: applying CQR residual math to binary moneyline outcomes Y in {0,1} is mathematically invalid — continuous residual expansion cannot produce a calibrated probability p(X) = P(Y = 1 | X). Moneyline/side markets require:

- **Platt Scaling**, **Isotonic Regression (PAVA)** — non-parametrically fits monotonic step functions to model scores; requires pre-coalescence of tied scores to prevent non-unique knot assignments. (Internal GSE note [16]: for rounded/repeated model scores, sorting alone leaves equal-score observations in input order and PAV may assign different fitted values; aggregate equal-score labels and weights before PAV.)
- **Venn-Abers calibration** (generalized, van der Laan & Alaa 2025, arXiv:2502.05676): computes exact multiprobability bounds **[p0, p1]** via dual isotonic regressions. Interval width **p1 - p0** explicitly measures epistemic uncertainty from data paucity.
- Impossibility result (Barber, Candes, Ramdas & Tibshirani 2020, EJS): in the binary setting, any algorithm giving distribution-free coverage of the conditional label probability pi(X) = P(Y = 1|X) must also cover the label Y — so **meaningful distribution-free confidence intervals for pi(X) of bounded length are impossible without structural assumptions**. Venn-Abers answers this by outputting an interval of probabilities instead of a point.

### 2.8 Calibration metrics and gates named in the doc

- **Expected Calibration Error (ECE)** — audit gate: fail-closed execution whenever **ECE > 0.05**.
- **Brier score** — gate for published outputs alongside ECE.
- **Venn-Abers multiprobability width** — PROVEN gate: **refuse the moneyline pick / No-Bet if p1 - p0 > 0.20**.
- **Clopper-Pearson exact binomial confidence intervals** — for sample win rates; withhold public performance displays until **n >= 30** (internal GSE PR #454: computes headline and per-bucket 95% Clopper-Pearson intervals on decided picks, five equal-mass quantile buckets alongside equal-width buckets).
- **Closing Line Value (CLV)** — models must be partitioned into release-time snapshots; incorporating near-game-time lines into training leaks future information (CLV leakage). Evaluate moneyline probability edges against CLV to verify model EV beats market vigorish.
- **Mondrian conformal calibration** — subgroup calibration across sports categories for equalized marginal coverage across leagues and prop types.
- **Nested Conformal / QOOB** (2019): F_t(x) = {y : score(x, y) <= t}, calibrating t via out-of-bag cross-splits; multi-split aggregation for ensemble-based numeric lines.

---

## 3. Key numerical results, tables, benchmarks (exact values; approximations marked)

### 3.1 Exact values

- n = 5, alpha = 0.10: rank k = **6**; inflation factor **1.08**; clamped coverage **83.33%** (≈ 5/6); under-coverage defect **6.67%**.
- Minimum calibration size for alpha = 0.10: **n >= ceil(1/alpha) - 1 = 9**.
- Jackknife+ finite-sample guarantee: **1 - 2*alpha** (i.e., 80% at alpha = 0.10).
- n = 500, alpha = 0.10: split CQR rank k = ceil(501 * 0.90) = **451**.
- Linear quantile regression under-coverage bias (Lin, Trivedi & Sun 2021): for alpha > 0.5 and small d/n, the alpha-quantile "roughly achieves coverage **alpha - (alpha - 1/2) * d/n**" regardless of noise distribution (stated as approximate in the source quote).
- ECE hard gate: **0.05** (fail-closed above it).
- Venn-Abers width gate: **0.20** (refuse pick above it).
- Public performance display threshold: **n >= 30** (Clopper-Pearson CI on win rates).
- Rolling-origin window for NFL season structure: **m = 32 to 64 games**.

### 3.2 Table 1 — Method inventory (reproduced; see §8 for columns the conversion left blank)

| Method | Year | Formula / Non-Conformity Score | Exchangeable (Y/N) | Small-n Rule / Behavior | GSE Operational Hook |
|---|---|---|---|---|---|
| Conformalized Quantile Regression (CQR) | 2019 | E_i = max(q_alpha_lo(X_i) - Y_i, Y_i - q_alpha_hi(X_i)), k = ceil((n+1)(1-alpha)) | (blank in conversion) | If n < ceil(1/alpha) - 1, k > n; yields +infinity or refusal. | Core interval engine for continuous player props and game totals. |
| Jackknife+ | 2019 | [q_alpha^-(mu_-i(Xn+1) - R_i^LOO), q_1-alpha^+(mu_-i(Xn+1) + R_i^LOO)] | (blank) | Guarantees 1 - 2*alpha coverage without data-splitting loss. | Primary uncertainty engine for scarce calibration segments. |
| Split Conformal Prediction | 2021 | q_hat = Quantile(ceil((n+1)(1-alpha))/n; s_1, ..., s_n) | (blank) | Requires alpha >= 1/(n+1); otherwise emits infinite sets or abstains. | Standard calibration protocol for PROVEN gating. |
| Nested Conformal / QOOB | 2019 | F_t(x) = {y : score(x,y) <= t}, calibrating t via out-of-bag cross-splits | (blank) | Uses out-of-bag ensembling to prevent split sample loss. | Multi-split aggregation for ensemble-based numeric lines. |
| Adaptive Conformal Inference (ACI) | 2021 | alpha_{t+1} = alpha_t + gamma * (alpha - err_t), err_t = 1{Y_t not in C_t} | (blank) | Adapts online; asymptotic coverage under drift. | Adjusts target quantile levels across sequential game weeks. |
| Sequential Predictive Conformal (SPCI) | 2022 | s_t = f(s_{t-1}, ..., s_{t-p}) + e_t, conformalizing residual time series | (blank) | Models residual autocorrelation; relies on transition bounds. | Tracks consecutive game-by-game player performance volatility. |
| Rolling-Origin Conformal Prediction | 2026 | Calibrates quantile against m most recent pseudo-out-of-sample errors | (blank) | Requires window m >= ceil(1/alpha); small m fails without inflation. | Calibrates rolling 14-day team strength shifts and line moves. |
| Venn-Abers Calibration | 2025 | Bounds [p0, p1] via isotonic regressions on calibration set plus (Xn+1, y) | (blank) | Valid for any n; emits wide bounds under small n to expose epistemic risk. | Binary side/moneyline probability calibration and PROVEN gating. |
| Synthetic-Powered Inference (SPI) | 2025 | Augments scarce data with synthetic samples from learned priors | (blank) | Shrinks uninformative bounds at small n while maintaining validity. | Bootstrap mode UQ for new expansion teams or rookie markets. |

### 3.3 Table 2 — Internal GSE evidence log (reproduced; From/Sender and some Source ID cells blank in conversion)

| Date | Excerpt / Quote | Audit Classification |
|---|---|---|
| 2026-09-17T15:48:18-05:00 | "My conformal fix was incomplete. cqr.ts contains the same small-sample quantile clamp, and its tests explicitly expect the wrong behavior. Still unfixed." | (blank) |
| 2026-08-09T11:29:27-05:00 | "PR run failed: CI - feat(cal): CQR numeric stack (OFF) + calibrator preference matrix (a41113d)" | [20, 21] |
| 2026-08-19T00:06:33-05:00 | "For rounded or otherwise repeated model scores, sorting alone leaves equal-score observations in input order and PAV may assign them different fitted values; aggregate equal-score labels and weights before PAV." | [16] |
| 2026-07-24T17:04:05-05:00 | "When an operator tunes with tuneTau and then evaluates with source: 'ivap', source: 'cvap', or a width cap, the tuning path cannot receive these options and coverageEdgeCurve still invokes the default legacy, uncapped gate." | [22] |
| 2026-08-21T16:50:33-05:00 | "Computes headline and per-bucket 95% Clopper-Pearson intervals on decided picks, and generates five equal-mass quantile buckets alongside existing equal-width buckets." | [23] |

The doc also contains a 20-line operational plan (Section F) for n = 5 vs n = 500 at alpha = 0.1 — the practical distillation: fail-closed at n = 5 (infinite intervals/No-Bet, Jackknife+ or SPI substitutes, Venn-Abers for binaries with p1-p0 > 0.20 refusal, Clopper-Pearson CIs, no public displays below n = 30); fully operational split CQR at n = 500 (k = 451, pinball-loss quantile nets/GBTs for 0.05/0.95 quantiles, SPCI/rolling-origin for time series, isotonic PAVA with tie pre-coalescence, Venn-Abers + Platt for binaries, CLV verification, Mondrian subgroup calibration, Brier/ECE audit gates).

---

## 4. Code/data references

- **yromano/cqr** — referenced for computation logic of CQR (conformity score / quantile rank / interval construction). No URL given in the doc; treat as the well-known GitHub repo `yromano/cqr`.
- **Primary arXiv identifiers:** 1905.03222 (CQR), 1905.02928 (Jackknife+), 2107.07511 (Gentle Intro), 2106.05515 (under-coverage bias), 2206.04860 (small-sample / Dietterich & Hostetler), 2402.16300 (conformalized selective regression, Schröder et al.), 2502.05676 (generalized Venn-Abers), 2207.13770-class citations in the IGNORE list (excluded by the auditor).
- **GSE-internal code references:** `cqr.ts` (conformalQuantile small-sample clamp — defect noted 2026-09-17, "still unfixed"; its tests "explicitly expect the wrong behavior"); PR #434, #412, #206, #454 (Clopper-Pearson CI layer for the PROVEN page); `tuneTau` / `coverageEdgeCurve` legacy-gate behavior note; EB-τ tuning path issue.
- **Data pipeline:** nflverse and mlbverse open-source play-by-play repos — rights-clean, audit-verifiable (no proprietary vendor licensing).

---

## 5. What transfers to GSE's engine (and what doesn't)

### Transfers — high leverage

1. **Fail-closed scarce-segment policy.** Any prop/segment with calibration n < ceil(1/alpha) - 1 (n < 9 at alpha = 0.1) must emit +Infinity/Refuse or No-Bet — never publish a clamped interval. This is the doc's center of gravity and directly matches GSE's standing "refuse to publish unverifiable numbers" posture.
2. **CQR for numeric lines (props, totals, margins).** Pinball-loss quantile nets/GBTs at 0.05/0.95, then conformalize with the finite-sample rank correction. GSE already has a numeric CQR stack (currently OFF); the math here is its spec sheet.
3. **Jackknife+ as the scarce-n numeric engine.** Guarantees 1 - 2*alpha without splitting — the bridge for new props/rookies where n < 9.
4. **Venn-Abers for moneylines.** Binary sides must not use CQR; Venn-Abers [p0, p1] bounds expose epistemic uncertainty, with width p1 - p0 as the explicit PROVEN gate input (refuse if > 0.20).
5. **Isotonic PAVA with tie pre-coalescence** for binary probability calibration at scale (n = 500 regime).
6. **CLV discipline:** strict release-time snapshot partitioning to measure true edge vs closing lines; never train on near-game-time lines.
7. **Audit gates:** ECE > 0.05 → fail-closed; Clopper-Pearson 95% CIs on win rates; withhold public performance displays until n >= 30.
8. **Particle-filter/copula distributional forecasting** for correlated multi-leg prop parlays (outperforms point-expectation models) — directly relevant to GSE's props lane.

### Does not transfer / caveats

- ACI's asymptotic coverage does not certify anything over an 18-week NFL season — don't cite ACI as a finite-sample guarantee.
- Split CQR under exchangeability does not apply to time-series player props; use SPCI or rolling-origin instead (serial residual correlation).
- CQR interval math must never touch moneylines (invalid for binary outcomes).
- Ordinal power ratings do not map linearly to win probabilities — rank-difference → win-prob translations need spread-variance calibration, especially for extreme underdog/favorite matchups.
- Truncation/clamping advocates (Schröder et al. selective regression) are explicitly rejected by the auditor for GSE — availability arguments do not override coverage proofs here.

---

## 6. Gaps, limitations, conflicts with other GSE research

- **Exchangeability column blank:** Table 1's "Exchangeable (Y/N)" column has no values in the conversion (see §8) — the doc never explicitly labels which methods require exchangeability, though the text implies it.
- **SPI is hand-waved:** Synthetic-Powered Predictive Inference gets one row and one line; no construction detail for the "domain priors" or coverage-preservation proof. Treat as a direction, not a recipe.
- **Nested conformal / QOOB row is thin:** one formula, no NFL-relevant worked example.
- **Conflict with selective-regression literature:** Schröder et al. (arXiv:2402.16300) argue truncation preserves practical utility "without severe empirical miscalibration in well-specified models" — the auditor rejects this for GSE as fake tightness. This is a genuine methodology fork: other parts of the GSE corpus that tolerate clamping for availability now conflict with this doc's fail-closed invariant.
- **Known live defect in the GSE codebase:** per the doc (2026-09-17), `cqr.ts` contains the banned small-sample clamp and its tests expect the wrong behavior — still unfixed at doc time. **Verified still present in this checkout (2026-09-21):** `apps/web/lib/calibration/cqr.ts`, `conformalQuantile()` line ~15: `rank = Math.min(Math.max(rank, 0), n - 1);` — clamps the rank to max(n)-1 instead of emitting +Infinity when ceil((1-alpha)(n+1)) - 1 >= n. E.g., n = 5, alpha = 0.1: rank = ceil(5.4) - 1 = 5 → clamped to 4 → returns max residual, falsely certifying 90% coverage while delivering 83.33%. This is precisely the 6.67% fake-tightness defect the doc bans.
- **Dated oddity:** Rolling-Origin Conformal Prediction is listed as "2026" in Table 1 — either a 2026 preprint or a transcription artifact; unverified.
- **HEARSAY vs evidence:** Section C demotes all internal workspace hits/emails/PR comments to HEARSAY that "cannot override published scientific literature" — but Table 2 then relies on exactly those internal hits as audit evidence. Internal tension in the doc's own epistemology.
- **Ignored/excluded:** Section D lists 12 unrelated arXiv papers (brain strain, mobile networks, recommendation systems, stellar activity, nuclear physics, etc.) as IGNORE; Section E excludes an internal "CQR Research" doc under "Evidence Rule 0", unopened arXiv PDFs, and blog/Medium summaries to prevent citation hallucination.

---

## 7. Concrete implementation note: what GSE would have to build to apply it

1. **Fix `conformalQuantile` in `apps/web/lib/calibration/cqr.ts` (immediate):** remove the clamp `rank = Math.min(Math.max(rank, 0), n - 1)`. When `ceil((1 - alpha) * (n + 1)) - 1 >= n` (equivalently n < ceil(1/alpha) - 1), return `Number.POSITIVE_INFINITY` and surface a machine-readable `refused: true` / No-Bet signal so the selective-publication gate can abstain. Update `__tests__/cqr.test.ts`, whose expectations the doc says encode the wrong (clamped) behavior.
2. **Numeric-line CQR pipeline (n >= 9 regime):** train pinball-loss quantile models at alpha_lo = 0.05 / alpha_hi = 0.95 (quantile GBT or neural net) on props/totals/margins; calibration split computes E_i and the rank-k residual; add/subtract Q_{1-alpha} at inference. Wire to the PROVEN gate with ECE (<= 0.05) and Brier audit checks.
3. **Jackknife+ module for scarce segments:** implement leave-one-out fits (or OOB-equivalent via QOOB ensembles for GBTs) so new props/rookies with n < 9 still get 1 - 2*alpha intervals without splitting.
4. **Venn-Abers binary calibrator for moneylines:** dual isotonic regressions yielding [p0, p1]; refuse publication when p1 - p0 > 0.20; isotonize with tie pre-coalescence (aggregate equal-score labels/weights before PAV) per the [16] note. Keep the existing Raw → Temp | Platt | PAVA/CIR | EB-τ stack; add Venn-Abers as the multiprob source feeding the width gate.
5. **Time-series props:** SPCI (autoregressive on conformity scores, check residual stationarity) or rolling-origin CP with m = 32–64 pseudo-OOS errors; ACI (alpha_{t+1} = alpha_t + gamma*(alpha - err_t)) for sequential coverage tracking across the season.
6. **CLV harness:** freeze feature snapshots at release time; evaluate EV against closing lines; never train on near-game-time lines.
7. **Performance-display guardrails:** Clopper-Pearson 95% CIs on win rates (headline + per-bucket, equal-mass + equal-width buckets); withhold public displays until n >= 30 (PR #454 territory).
8. **SPI/R&D:** synthetic-prior augmentation for expansion-team/rookie markets — research spike, not production-ready per this doc.

---

## 8. Inaccessibility log (recorded, never invented)

- **Images from the source docx were not extracted** by the python-docx conversion (task-noted): any figures, coverage-vs-n curves, interval illustrations, or calibration plots in the original "Auditing Conformal Prediction..." doc are **inaccessible** — their contents are not represented anywhere in this note.
- **Table 1, "Exchangeable (Y/N)" column:** all cells blank in the conversion. Unknown whether the original doc had Y/N values (lost in conversion) or they were never filled in. Recorded as missing.
- **Table 1, "Source ID" column:** all cells blank in the conversion. Missing.
- **Table 2, "From / Sender" column:** all cells blank in the conversion. Missing (the 2026-09-17T15:48:18 entry's sender — likely Hermes per the "image.png Hermes I found real omissions" Sources entry — is not attributed in the table).
- **Table 2, "Audit Classification" column:** blank for the 2026-09-17 row; [20, 21], [16], [22], [23] present for the others.
- **Citation keys [11]–[23]** are used in the doc body and tables but the "Sources" list at the end is a flat unnumbered bibliography (arXiv titles, ResearchGate, PR links, internal docs) — the key-to-source mapping cannot be fully reconstructed from the conversion. Treated as unverifiable rather than guessed.
- **yromano/cqr** referenced without a URL; resolved by identification, not by the doc.
- The doc's Section B quote from Schröder et al. (arXiv:2402.16300) is presented as a quote; its exact provenance in the original doc could not be verified beyond the conversion.
- No truncated mid-sentence text was observed; the conversion reads complete at 281 lines.

---

*Note prepared 2026-09-21 as the drive-deep substance pass for the conformal-prediction audit. Cross-references: Section F's operational plan is the doc's own checklist; the cqr.ts clamp defect was re-verified live in `~/workspace/vendor/Sports/apps/web/lib/calibration/cqr.ts` on 2026-09-21.*
