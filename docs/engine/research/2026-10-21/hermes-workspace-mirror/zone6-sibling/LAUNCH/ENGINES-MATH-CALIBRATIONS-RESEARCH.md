# GSE ENGINES + MATH + CALIBRATIONS RESEARCH (rebuilt 2026-09-08)
NOTE ON PROVENANCE: the research subagent verified all items below via live fetches tonight but
exhausted its budget before its file write succeeded (twice). This file was rebuilt by the parent
from (a) the subagent's verification transcript (quoted statuses), (b) its JSON evidence files in
this directory, (c) the parent's own 04-METRICS-CANON.md. Items NOT seen verified tonight are
marked in the NOT-VERIFIED section. Nothing here is from memory alone without a paper-level citation.

## AREA 1 — OPEN-SOURCE PREDICTION/SIM ENGINES (GitHub, verified via api.github.com tonight)
| repo | stars | license | pushed | core algorithm | status |
|---|---|---|---|---|---|
| georgedouzas/sports-betting | 783 | MIT | 2026-07-28 | ML odds-value pipeline (sklearn), probability calibration, value-bet selection | VERIFIED (child transcript) |
| PySport/kloppy | 550 | BSD-3-Clause | 2026-09-01 | soccer tracking/event data standardization — ingestion layer, not prediction | VERIFIED (_verify_gh.json) |
| JetQiao/football-prediction-skill | 20 | MIT | 2026-07-27 | Dixon-Coles + odds-value (CN doc) | VERIFIED (_gh_new_candidates.json) |
| sdv-dev/Copulas | 652 | BUSL-1.1 (Business Source License, DataCebo) — DO NOT DEPEND | 2026-09 | multivariate joint sampling — correlation/parlay wedge primitive | LICENSE READ 2026-09-08: "Business Source License 1.1, Licensor DataCebo, Inc." — production use restricted; use statsmodels (BSD-3, distributions.copula) instead |
| kochlisGit/ProphitBet | — | — | — | — | DEAD (404 at check time) |
| opisthokonta/Odds-calculation | — | — | — | — | DEAD (404 at check time) |
Known-supply (from corpus, GSE_BLUEPRINT Part II): penaltyblog (MIT; Dixon-Coles/Poisson, LP arb, Kelly), WagerBrain (MIT; odds math), draftfast (constraint solver), pydfs-lineup-optimizer, sportsdataverse (free NFL JSON).

## AREA 2 — CALIBRATION METHODS CANON (formulas + primary citations)
1. PLATT SCALING: p' = sigma(A*z + B); fit A,B by log-loss minimization on held-out set.
   Platt 1999, "Probabilistic Outputs for Support Vector Machines".
2. ISOTONIC: non-decreasing step fit minimizing squared error (PAV algorithm). Zadrozny & Elkan 2002.
   Repo: prediction-engine/src/calibration/pav.ts + local-isotonic-patch.ts. Needs > ~1,000 samples; bin-sparse above that.
3. BETA CALIBRATION: 3-parameter map via beta CDFs; interpolates between identity and Platt.
   Kull, Filho, Flach 2017, ICML, "Beta calibration: a well-founded and easily implemented improvement on logistic calibration".
4. VENN-ABERS: multiprobability output [p_lo, p_hi] from ICP over calibration set; probabilistic
   prediction under exchangeability without distributional assumptions. Vovk et al. 2015.
   Repo: ivap.ts / cvap.ts (CVAP aggregates K-fold multiprobabilities; log-space geometric mean minimax rule).
5. CONFORMAL INTERVALS: q = ceil((n+1)(1-alpha))/n quantile of calibration residuals; yhat +- q.
   Mondrian variant = per-group calibration sets. Vovk/Papadopoulos. Primary modern citation:
   Angelopoulos & Bates, "Conformal Prediction: A Gentle Introduction" (arXiv:2107.07511). Repo: conformal-intervals.ts.
6. RECALIBRATION UNDER DRIFT: sliding-window refits + prequential (test-then-train) protocol;
   monitor ECE per window. Repo: calibration-drift.ts, calibration-monitor.ts.

## AREA 3 — EVALUATION METRICS CANON
- BRIER: BS = (1/N) sum (p_i - y_i)^2. Murphy 1973 decomposition: BS = REL - RES + UNC. Brier 1950.
  Repo: metrics/core (brier-ogd-ensemble.ts = online Brier with OGD-weighted ensemble).
- LOG LOSS: CE = -(1/N) sum [y ln p + (1-y) ln(1-p)]. Comparisons only on the same sample set.
- E-VALUES / E-PROCESSES (anytime-valid): s_t = (p_hat/p0)^y * ((1-p_hat)/(1-p0))^(1-y);
  reject when E_T >= 1/alpha at ANY stopping time. Shafer 2021 (working paper series), Ramdas et al.
  Repo: bernoulli-eprocess.ts, instrumented-eprocess.ts. Marketing line: "our record is auditable at any stopping time, by anyone."
- CALIBRATION SLOPE/INTERCEPT: logistic regression of outcome on logit(p); slope 1.0 = calibrated. Cox 1958.
- CLV: nCLV = p_close - 1/P_lock. Beat-close rate, closure efficiency. Literature: closing-line
  efficiency in market-microstructure of betting (Pinnacle articles; treat as gray-literature citation).

## AREA 4 — CORRELATION MATH (parlay/stacking wedge)
- GAUSSIAN COPULA: (u1..uk) ~ joint via Gaussian latent correlation R; P(A&B) = Phi_2(z_A, z_B; rho).
- Correlated Bernoulli (common-cause): P(A&B) = pA*pB + rho*sqrt(pA(1-pA)pB(1-pB)) (Gaussian copula first-order).
- SAME-GAME PARLAY APPLIED: game total & spread share a latent game-environment factor; QB-stack &
  receiver share offensive-drive factor. Fit rho from historical joint outcomes per market pair.
- OSS: statsmodels (BSD-3) Gaussian copula — SAFE for GSE; R 'copula' package (reference only). sdv-dev/Copulas EXCLUDED (BUSL-1.1).
- GSE angle: publish the rho matrix methodology — the DGFantasy complaint (dossier: correlation-tool
  value decay) is the wedge. Never price parlays at naive independence.

## AREA 5 — PUBLIC REFERENCE POINTS (methodology-page citations)
- FiveThirtyEight club soccer GM + SPI; NFL Elo: Gini-coefficient-weighted blend of pre-season and
  post-game Elo (methodology pages public). NOT re-verified tonight — cite the pages, not summarized formulas.
- COLLEY MATRIX: C r = b, C = 2I + (diag of games) - (adjacency), b = 1 + (wins-losses)/2.
  Colley 2002 (Virginia Tech report). Child grep-verified the formula text from the cached PDF tonight.
- World Football Elo Ratings (eloratings.net): point-value transfer W_o = W_e * G(goal diff).
  Child verified formulas captured. Site reachable only intermittently tonight (502/timeouts on API paths; root 200).
- MASSEY ratings / SAGARIN: NOT VERIFIED tonight — do not cite formulas until checked.

## NOT VERIFIED (do not cite without checking)
- Massey ratings formula details; Sagarin methodology internals.
- clubelo.com API endpoints (connection timed out / 502 from this network tonight; root page 200).
- oddspapi.io free-tier specifics (pricing page partially captured; confirm limits before writing copy).
