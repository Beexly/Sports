# SPEC-A — Future-Filter Evaluation Contract (FFW-26)
Status: RATIFIED · Freeze state: FREEZE-1 (executed 2026-10-15) · Supersedes: nothing (first forward contract)
Ratified: 2026-10-15 by Garrett Baxley (owner), bundle item (1) — this contract is frozen with the drafted defaults locked (see "Ratified defaults"). FINAL freeze (§10) is still pending and must precede any scoring.
Governs: scored-construction track only. Ingestion is governed by §1 and is never gated.
Conventions: every policy choice is explicit. Items stamped RATIFIED 2026-10-15 were OWNER-DECISION items in the draft; the recommended defaults were adopted as drafted. Assumptions are labeled. No measured numbers are invented.
Freeze record: FREEZE-1.json (this directory) — sha256 hashes of this file, SPEC-B, RULING-C1, and the hypothesis ledger. The repo commit carrying them is the freeze certificate (§10.3).

Ratified defaults (locked at FREEZE-1):
- T_emit = 90 minutes before scheduled kickoff (§2.3).
- Bootstrap resamples B = 10,000 (§4.2).
- α = 0.05 one-sided, power = 0.80, δ_min = 0.02 (§5.3).
- Calibration set = first 30% of the window by kickoff time (§6.2); declared in FREEZE-1.json.
- Abstention threshold τ = 80th percentile of calibration interval widths (§7.3).
- Situational candidates capped at two slots (§9.2).
- Candidate #1 = PRJ-1 per RULING-C1 (§9.1).

## 1. Doctrine: ingestion is total; gates rule emission and promotion
1.1 Ingestion is total. Every signal is ingested into the reasoning substrate (situational graph, shadow lanes, combine-athlete lane) regardless of gate status. Gates never remove knowledge.
1.2 Gates rule only two things: (a) promotion, meaning admission of a construction to the scored-construction track as a weighted, gate-clearing candidate; (b) emission, meaning customer-facing output.
1.3 Every ingested signal carries an in-engine status: INGESTED (raw, unscreened), SCREENED-REFUSED (ran the kill-only screen and failed), PARKED (ran and produced mixed evidence; may reopen only on a leak audit), SLOTTED (survived the screen; pre-registered for the future filter, no weight yet), CANDIDATE (frozen, hashed, scored on the future filter).
1.4 The kill-only screen constrains the scored-construction track only. A SCREENED-REFUSED metric remains in the graph as reasoning substrate with its refusal recorded. Refusal is not deletion.
1.5 Reconciliation with the prior ruling: the "kill-only screen" was a statement about what may become a weighted candidate, never about what may be known. This section makes that explicit so no future reader mistakes a screen refusal for an ingestion ban.

## 2. Window and μ source
2.1 Window: 2026 Week 6 onward (regular season), frozen at the moment the FINAL freeze hash is recorded (§10). Games are added to the filter only by the archiver; no manual additions.
2.2 μ source: μ = the archived spread line at the declared emission timestamp T_emit, not the closing line. Rationale: the evaluation must score the number production can actually achieve.
2.3 Timestamp policy (RATIFIED 2026-10-15): T_emit = 90 minutes before scheduled kickoff, using the archiver's hourly capture whose stamp is closest to but not after T_emit. Default reason: 90 minutes is late enough that lines are stable and early enough that a customer product can be emitted; "closest stamped capture not after T_emit" is point-in-time clean by construction.
2.4 If no stamped capture exists at or before T_emit for a game, the game is EXCLUDED from scoring and counted in the ledger as EXCLUDED-NO-LINE (not as abstention). The exclusion rate is reported.
2.5 The closing line is retained as a diagnostic covariate only. It is never μ.

## 3. Baseline construction
3.1 Baseline = homoscedastic Gaussian with μ = archived line at T_emit (per §2), σ fit point-in-time on the scoring window only.
3.2 Point-in-time refit: for each scored game i, σ is fit on games with kickoff strictly before game i's kickoff (expanding window), using only stamped lines available at T_emit(i). No future information.
3.3 The baseline is refit from scratch on the future window. The frozen-filter baseline (7.154021) is not carried over.
3.4 Family-2 (heteroscedastic σ + key-number atoms) is a CANDIDATE, not the baseline. The gate is measured against the §3.1 baseline.

## 4. The gate: relative paired criterion
4.1 Gate quantity: Δ = mean per-game (CRPS_candidate − CRPS_baseline) on the scoring set. Negative Δ favors the candidate. This is a relative gate; no absolute CRPS level is specified.
4.2 Uncertainty: paired bootstrap over games (B = 10,000 resamples of the per-game difference vector; RATIFIED 2026-10-15: B = 10,000, for stable tail quantiles at reasonable compute).
4.3 Pass rule (all must hold):
  (a) Δ_hat < 0 (point estimate favors candidate);
  (b) the one-sided 95% bootstrap lower confidence bound on Δ excludes 0 (i.e., the 5th percentile of the bootstrap distribution is below 0);
  (c) the Holm-adjusted p-value (see §8) is < 0.05.
4.4 The gate is scored on the FULL scoring set. Abstention never removes games from the gate (§7).

## 5. Sample size: pre-declared n
5.1 n is pre-declared before FINAL freeze (§10). Formula (paired design):
  n = ceil( ((z_{1−α} + z_{power}) · σ_d / δ_min)^2 · DEFF )
  where σ_d = SD of per-game CRPS differences (candidate − baseline), δ_min = minimum detectable effect, DEFF = design effect for within-week correlation.
5.2 Inputs: σ_d ASSUMED = 0.2937 (the family-2 vs. baseline per-game SD recovered from the frozen filter's printed SEs; labeled assumption — it is a planning value until measured on future-filter-like data). DEFF ASSUMED = 1.0 (labeled assumption; within-week correlation of differences is assumed negligible until measured).
5.3 RATIFIED 2026-10-15: α = 0.05 one-sided, power = 0.80, δ_min = 0.02 (2% relative improvement). Default reason: 0.02 is the smallest improvement that would change a promotion decision; smaller effects are not operationally meaningful.
5.4 Planning table (derived, not measured): with σ_d = 0.2937, δ = 0.0342 → n ≈ 581; δ = 0.02 → n ≈ 1,696; δ = 0.01 → n ≈ 6,785. MDE at n = 2,462 ≈ 0.0166.
5.5 If the window cannot supply the pre-declared n (e.g., season ends), the gate is NOT scored early. The window extends to the next season. No interim scoring.

## 6. Calibration/scoring split
6.1 The window is split into CALIBRATION and SCORING sets with no overlap, declared at FREEZE-1 (§10). The FREEZE-1 declaration is recorded in FREEZE-1.json (this directory): CALIBRATION = first 30% of the window's games by kickoff time; SCORING = the remaining 70%. The concrete game-ID lists bind at window open and are hashed at FINAL.
6.2 CALIBRATION: used for the conformal NO_BET set and weight-0 edge calibration. RATIFIED 2026-10-15: first 30% of games by kickoff time (temporal split is point-in-time clean and simple).
6.3 SCORING: the remaining 70%, used for the gate (§4) and only the gate.
6.4 No game appears in both sets. Calibration choices are frozen at FREEZE-1 and cannot be revisited after seeing scoring data.

## 7. Full-set scoring and abstention
7.1 The gate is scored on every game in the SCORING set. The conformal NO_BET advisory may veto emission per game, but vetoed games remain in the gate denominator.
7.2 Abstention value is scored separately: abstention rate, CRPS on vetoed vs. emitted games (descriptive), and a pre-declared abstention rule (§7.3).
7.3 Abstention rule (pre-declared): the conformal set emits NO_BET when the predictive interval width exceeds τ. RATIFIED 2026-10-15: τ = the 80th percentile of interval widths on the CALIBRATION set (a fixed, pre-declared quantile rule that cannot be tuned on scoring data).
7.4 The gate never benefits from dropping games. Any candidate that passes only because hard games were vetoed fails §7.1.

## 8. Hypothesis ledger and multiplicity
8.1 Every scored look on the future filter is entered in a hypothesis ledger: candidate ID, freeze hash, scoring set, Δ_hat, SE, p-value, date.
8.2 Multiplicity correction at the gate: Holm step-down procedure over the family of candidates scored in the window. The pass rule (§4.3c) uses Holm-adjusted p-values.
8.3 PLANNING entries (σ_d measurement, ledger setup, code checks) are logged but do not count as looks. Any entry that scores a candidate on scoring-set outcomes counts.
8.4 The ledger is append-only. Corrections are new entries, not edits.
8.5 The candidate procedure includes its fitting procedure. A candidate's point-in-time parameter fitting — including any discrete model-selection step inside the fit (for PRJ-1: the weekly joint CRPS minimization over (θ_σ, θ_A) with ν selected from the frozen grid G, per RULING-C1 §1.4) — is part of the candidate procedure and is covered by the multiplicity correction of §8.2: the Holm family and the gate's error control apply to the fitted candidate as a whole. No parameter value, grid point, refit outcome, or fallback invocation is a separate look outside the ledger, and no fitting choice made after seeing scoring-set outcomes is permitted; any such change voids the freeze (§10.4). [Added at FREEZE-1 per Grok WO-7 adversarial review of RULING-C1, change 1; ratified 2026-10-15.]

## 9. Pre-registered candidates
9.1 Candidate #1: PRJ-1 ("pit_round2-derived joint"), composed per RULING-C1 (landed copy in this directory, hashed in FREEZE-1.json): integer-lattice support (F1) + family-2's heteroscedastic σ mechanism and key-number atoms (F2) + Student-t kernel variance-matched to that σ (F3), under an exact mean lock, with all parameters fit jointly point-in-time per RULING-C1 §1.4. The pit_round2 handoff authorized "a single joint" without defining it; that authorization is recorded as consumed by RULING-C1, and PRJ-1 — not the handoff phrase — is the frozen specification. (The draft's deferral of the composition to the pit_round2 handoff was circular and is removed.) F4 (empirical-quantile total scale) is excluded from the composition and carried as forward shadow S-ALL4 (RULING-C1 §1.5). PRJ-1 is the sole member of the confirmatory family at FREEZE-1 (m = 1). Its code and config freeze at FINAL (§10); its module freeze record is referenced in FREEZE-1.json as PENDING-BIND until then.
9.2 Candidate #2 and #3: situational-screen survivors, capped at two slots. Slots are PLANNING until the ledger clears them. No more than two situational candidates may be scored in the first window. At FREEZE-1, situational slot 1 of 2 is held by SPESE (hypothesis ledger, this directory); slot 2 is unfilled.
9.3 Each candidate's code, config, and the spec version it was frozen under are hashed together (§10). Candidate #1's composition authority is RULING-C1; no candidate definition defers to the pit_round2 handoff.

## 10. Hash-freeze mechanics
10.1 Two freezes: FREEZE-1 (calibration set declared, calibration code frozen) and FINAL (scoring set declared, all candidate code frozen, n declared). FREEZE-1 was executed 2026-10-15; its record is FREEZE-1.json (this directory). FINAL has not occurred.
10.2 What gets hashed: the spec markdown files (this document + SPEC-B), all candidate code and configs, the game-ID lists for CALIBRATION and SCORING sets, the ledger schema.
10.3 Where recorded: hashes are committed to the repo in a FREEZE.json file and echoed to the owner. The repo commit hash is the freeze certificate.
10.4 What voids the freeze: any change to hashed files, any addition/removal of games from the declared sets, any scoring of a candidate before FINAL. A voided freeze requires a new freeze with a new hash and the ledger notes the void.
10.5 FREEZE-1 must precede any calibration. FINAL must precede any scoring. No exceptions.
