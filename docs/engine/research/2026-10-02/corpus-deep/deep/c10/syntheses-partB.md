# Syntheses — Corpus Slice C10, HALF B (r31–r60)

Cross-file pipelines and patterns with the composition logic. Each synthesis names the
composition order, the seam between components, and what must be true for the pipeline to
work. INFERENCE is marked explicitly.

---

## S1. The three-layer staking stack

**Components:** fractional Kelly (SESSION_2, r51) → drawdown governor (1749, r32) →
composite risk sizing (2143, r38). Variant selection by mean ignorance (1083, other half).

**Composition order:**
1. **Edge estimate** p̂ comes out of the calibrated probability stack (S2). Sizing uses
   **effective price** — never the listed line — per 1702/lead-lag: effective price =
   listed price adjusted by the market's mean-reversion dynamics.
2. **Fractional Kelly κ=0.25** (SESSION_2:60,64: `KELLY_FRACTION=0.25`, SHIPPED, never κ=1).
3. **α-governor (1749):** scale the weekly Kelly stake by π = 1 − α/d_t where d_t = B_t/M_t
   (bankroll / running maximum), α=0.7. Adoption gate from the ledger: min B_t/M_t ≥ α−0.02
   with ≥80% of unconstrained terminal log growth on the 2023–2025 NFL backtest.
   (Caveat: π = 1 − α/d_t is the ledger's discrete-time reconstruction; the paper gives only
   continuous-time existence/uniqueness/turnpike results.)
4. **Two-layer CVaR (2143):** inner CVaR_ε over game outcomes given the market model F;
   outer CVaR_δ over the posterior of the engine's own edge estimate p (beta-binomial on
   rolling 8-week Brier history). CVaR-Expectation (33) is convex and LP-solvable via SAA
   with the paper's sample-complexity bound M ≥ C₁(H,F)/γ²·[C₂(H,F)n + C₃(H,F)log(1/ε)].
   **VaR-Expectation is non-convex** — use CVaR-Expectation.

**Why this order:** Kelly sets the unconstrained growth rate; the governor enforces the
drawdown constraint pathwise; CVaR penalizes both game variance (inner) and
edge-estimation uncertainty (outer) — the latter is genuinely new capability: GSE has no
edge-uncertainty penalty today. Dominant Asset screening (1213, other half) runs before
Kelly: only play assets whose growth rate is robust to the edge-estimation noise CVaR-δ
penalizes.

**Seam risk:** the α-governor needs bankroll dynamics at weekly granularity; CVaR-δ needs
the rolling 8-week Brier history as the p̂ posterior. Both are buildable from existing
ledger data.

## S2. The calibration honesty pipeline

**Components:** production chain (BAYES_NONPARAMETRIC r49 = PLATT_HIERARCHICAL r51) →
adaptive-bin ECE (LAUNCH_CALIBRATION_COHORT r50) → Wilson edge claim (ENGINEERING_PRINCIPLES
r60) → 15-test evidence guard (RESCUE r58) → benchmark-lab gates (r49) → win-rate sample
floor (content-provenance r49).

**The chain, in order:**
1. **Production calibration stack** (two independent docs agree): Raw → Temperature →
   Platt (MAP IRLS) → Isotonic PAVA/CIR → hierarchical EB-τ (τ clamped [0.05, 2],
   intercept-only A_g = A + a_g unless holdout proves slope hierarchy). DP/HDP mixtures
   are notebook-only — **never production**.
2. **Adaptive-bin ECE is the honest binning** (cohort E: adaptive 0.0126 vs equal-width
   0.0180 — equal-width is inflated by sparse tails). Cohort E baseline: Brier 0.2106
   [0.2050, 0.2172] on 5,281 games, reliability 0.0324, resolution 0.0361.
3. **Wilson 95% LB ≥ 52.4%** to claim edge on any source (ENGINEERING_PRINCIPLES:24),
   default 50% null; 80% two-sided CI, **90% for public**; n≥30 minimum sample.
4. **15-test evidence guard** (RESCUE: 15/15 GREEN): every artifact rebinds evidence by
   hash at publish; BLOCKED artifacts (A8: Boltzmann 0.2558 vs isotonic 0.2148, Δ=0.041 —
   the concrete cost of shipping uncalibrated logits) never touch a live pick.
5. **Benchmark-lab gates** (model-benchmark-lab:49,97,111): ≥30 picks per sport per version,
   ≥30 per pick type, A/B on same holdout, p<0.05 on 100+ picks on ≥1 dimension, **never
   suppress a failing dimension**.
6. **≥30 settled picks, defined window, model version** before any win-rate claim
   (content-provenance:129).

**Why this order:** calibration makes probabilities honest; ECE measures the honesty;
Wilson decides whether a source clears the edge bar; the evidence guard makes the claim
auditable; the benchmark lab makes it comparative; the sample floor makes it publishable.
The ladder baseline: Elo 0.2314, pregame logit 0.2262, devigged price 0.2122 (historical
walk-forward, r57) — GSE models must beat the **devigged price**, not Elo.

## S3. The leak-wall / integrity stack

**Components:** EV rules (CARDS_EDGE_VALIDATE r42) → covariate bus (AGENT r49) →
CONFIRMS provenance (r44) → CANONICITY dedup (r49) → architecture-handoff contamination
punchlist (r54) → fail-closed migration invariants (pr3-tlaps r48) → backfill guard
(NEEDS_VERIFY, from map addendum A1).

**Composition:**
- **Ingestion discipline (EV):** `latestPriorRow` leak wall must fail **closed** on
  non-finite weeks (currently fail-open — the r42 finding); missing market feeds refuse
  `no_market_feed`, never proxy a close; tests must pin values by **independent
  derivation** (a test recomputing the implementation's own formula is vacuous).
- **Covariate bus (AGENT:21-22):** contract key gsisId|season|week|statType; **week t
  predicts t+1**; returns {value, grain:"week_t_for_tplus1", provenance}, never a bare
  float; null → fail-closed.
- **Provenance stamp (confirms-stamp:55,81):** per-source homeFairProb + direction on every
  pick row; SPLIT when directions genuinely differ — fixes the same stamp-at-emission /
  enforce-nowhere class as the CARDS finding.
- **Dedup (CANONICITY:46,55):** 9/80 slots (11%) lost to duplicate rows — dedupe before
  take:80, not a bigger cap.
- **Contamination punchlist (architecture-handoff:88-135, dated 2026-09-18):** six-hourly
  cron rewrites trueProb with non-as-of inputs (lines 96-101); cqr finite-sample clamp
  delivers 83.33% coverage while claiming 90% (n=5); in-play exclusion keeps null-clock
  rows; walk-forward cuts by row index without group key; logistic shrinks market logit to
  base rate (must be fixed offset); compute_advanced_metrics double-inverts lower-is-better
  metrics. **Re-verify each item's current state — dated, may be fixed.**
- **Migration invariants (pr3-tlaps:121,125):** Inv_FileDefaultSafe, Inv_MigrateOnlyVerifiedLocal.
- **Backfill NEEDS_VERIFY (map A1):** ~100K-row trueProb recompute needs as-of + seeded +
  hash-verified before any model trains on the column.

**Why this order:** the EV rules are the acceptance criteria; the bus is the enforcement
mechanism; CONFIRMS/canonicity fix provenance and dedup at emission; the punchlist is the
known-violations register; the invariants prevent half-applied migrations.

## S4. The QB-behavioral program (feeds TNF Track 1)

**Components:** 8-dim QB vector (qb-pipeline r57) + rusty-backup archetype (keenum r47) +
first-read/aggressiveness features (LANE-BRIEFING r57) + NGS methodology (r40, internal) +
efficiency weights (dossier-v2 r41) + Phase 2/3 open slots.

**The 8-dim vector (qb-pipeline-spec:5):** age/experience, 3-game rolling efficiency,
rushing floor, weapons/context, injury, opponent pass-D, OL tier, weather.
**Additions from this half:**
- **Rusty-backup archetype (keenum:97,99-159):** ≥10 targeted attempts after ≥8-week gap;
  the blanket is individual-player (slot/receiving-RB/WR1 with the most separation-friendly
  role), not positional; 323 targets / 10 games, suggestive not predictive.
- **Processing features (LANE-BRIEFING:9-18):** first-read% (Purdy 27.0, Love 78.6) and
  aggressiveness% (Stroud 21, highest 2024) as QB-decision features.
- **Efficiency weights (dossier-v2:178,182,188):** passing-efficiency vs wins r 0.53–0.61
  across three eras vs rushing 0.13–0.19; strip scripted/opening-drive EPA (non-scripted
  0.51/0.29 vs scripted 0.26/0.16).
- **NGS methodology (r40):** TCN + spliced binned-Pareto QB score (released PyTorch
  notebook); 2D-CNN Zoo recipe; transformer ADE 4.61 vs Zoo 5.78 — **reasoning fuel only,
  never public, never metric names.**

**Composition:** Phase 1 shipped (`qb-signal-v1.ts` + `qb-odds-comparison.ts`, Sleeper vs
DK consensus). **Phase 2 (archetypes: rusty-backup, processing-profile) and Phase 3
(calibration) are open build slots** (qb-pipeline-spec:17,25,58,63). The rusty-backup
archetype is the natural Phase-2 seed: the rule is behavioral, already parameterized, and
feeds the TNF program's Watson questions directly.

**Seam risk:** NGS doctrine — everything from r40 stays internal. The 8-dim vector can
carry NGS-derived features only as unlabeled inputs, never as named signals.

## S5. The new-regime module: two independent shots

**Components:** MAML (1912, r35) vs NGGP (1902, r34), gated by the new-regime Brier gates
from the reasoning-depth spec.

**The race:**
- **MAML (1912):** gradient-based meta-learning, first-order approx at ~33% less compute
  (48.07 vs 48.70 5-way 1-shot), adapts with K∈{2,4} support examples. Gate: **≥0.02
  Brier improvement** on new-regime prediction.
- **NGGP (1902):** non-Gaussian GP with neural-parameterized likelihood + FFJORD prior
  flows; wins concentrate in NLL (calibration) and out-of-range (NASDAQ100 NLL
  1.049→−2.978). Gate: **≥0.01 Brier improvement**.

**Composition logic:** run both against the same new-regime holdout (coordinator changes,
rookie breakouts, scheme flips — the regimes Regime-PCMCI (1964) detects: 99.6% regime
reconstruction, TPR 0.99 / FPR 0.01, N_K selected by AICc). **INFERENCE:** MAML is the
speed shot (few gradient steps, fast adaptation); NGGP is the calibration shot (better
NLL, but O(n³) + ODE solves per step). If both clear their gates, MAML for the weekly
regime-adaptation loop, NGGP for the offseason prior-refit. **Do not adopt either without
the gate — both papers' headline numbers are on toy/finance data, not sports.**

## S6. The feature pipeline: from raw tracking to leak-free features

**Components:** tsflex (2188, r39) → time-aware OpenFE (1842, r33) → feature programming
(1852, r33) → (event_ts, creation_ts) feature store (2022, r36) → drift ensemble (1885,
r34) → stream chaos/release (2032, r36).

**Composition:**
1. **tsflex (2188):** index-based feature extraction (4.3s vs TSFEL 16.4s, ~2.5× less
   memory) — the bye-week gap is exactly its design case. Wrap all functions with
   `make_robust`; re-verify the current API (paper is v0.2.3, 2021).
2. **Time-aware OpenFE (1842):** expanding-window pre-game semantics + ≥3-of-4-season
   stability filter; the paper's 80/20 random split is **not** the eval — walk-forward.
3. **Feature programming (1852):** Difference/Window/Shift operators, 0th/1st/2nd order
   (one-step R² gains 1.3–5.85%; multi-horizon +88% R²). **Needs a pruning stage** (the
   paper lacks one) before it meets OpenFE's output.
4. **Feature store (2022):** offline keyed (event_timestamp + creation_timestamp), online
   override iff newer event_ts (or equal event_ts + newer creation_ts); per-source delay
   for the nearest-past-value rule (NGS re-runs 48h, odds 0). **Paper admits parts are
   aspirational and the anti-leakage mechanism is unvalidated** — adopt as design input,
   not validated architecture.
5. **Drift ensemble (1885):** majority vote over ADWIN + HDDM-A + KSWIN (abrupt) /
   HDDM-A + HDDM-W + Page-Hinkley (gradual); kNN(k=4) imputation always helped; 2000/1000
   instance windows.
6. **Chaos/release (2032):** corrupt-Parquet / kill-mid-write / delete-Delta-log suite
   with ACID-rollback verification via time travel; probe task recomputing one known week
   against a pinned hash.

**Seam risk:** the store's merge semantics assume "no failure of dumping" (2022:58-61) —
no staleness bound. The drift ensemble is the compensating control for silent staleness.

## S7. The abstention module

**Components:** NNTD (1778, r32) + conformal reject (0987, other half) + MC-Dropout
disagreement (0716, other half).

**Composition logic:** NNTD gives **training-dynamics disagreement** (25–50 checkpoints,
late-weight k=0.05): coverage 91.2/86.4/75.9 at 2/1/0.5% error. But the ledger's own
limitation: disagreement vs the final model's *own label* — confidently-wrong
subpopulations are invisible. **The fix is the composition:** intersect NNTD's
training-dynamics signal with the market's external second opinion (the market
disagrees with the model for real-world reasons training dynamics can't see). The
ledger's joint training-dynamics × market-disagreement experiment is the real idea.
Conformal reject (0987) provides the formal coverage guarantee; MC-Dropout (0716)
invalidates the naive difficulty/consensus heuristics.

**Seam risk:** k=0.05 was tuned on the same benchmarks it wins on — re-tune on NFL data.
The abstention module is the natural consumer of the evidence-guard (S2) BLOCKED logic:
abstain = don't publish.

## S8. The CLV measurement program: honest status

**Components:** Neon odds history (clv-hunt r59) + CLOSE-stamping gap (RESULTS r55) +
staleness fix (clv-forensics r53) + per-book grading (LAUNCH_CALIBRATION_COHORT r50) +
provider probes (l10 r53) + F3 bias note (REPO_CONSOLIDATION_MAP r52).

**Honest status, assembled:**
- History **exists**: `gse.odds` 8,083,183 rows (2.0 GB), 2025-04-24→2026-10-01.
- **Broken window**: 2026-08-22→mid-September (broken snapshot writer) — CLV for in-season
  weeks 1–4 **cannot** be computed without repaired close lines; the season-1 calibration
  report cannot ship (clv-hunt:45-48).
- **Unmerged fix**: MAX_CLOSE_AGE_MS (M-F7) not merged — no staleness bound on the closing
  snapshot; "corrupts the shared closing snapshot SPREAD, TOTAL, and [ML] use"; ML −27.4pp
  unexplained (clv-forensics:45-51,74).
- **Missing phases**: CLOSE-phase rows absent for NFL and MLB at query time (RESULTS:17-25).
- **Canonical grading**: per-book American→implied, mean per side, proportional two-way
  de-vig, latest row fetchedAt ≤ generatedAt, ≥MIN_BOOKMAKERS books quoting both sides
  (LAUNCH_CALIBRATION_COHORT:102-107).
- **Interaction**: F3 — TeamGameLog ATS graded vs OPENING consensus, not the close →
  systematically biased ATS form signal (one-line fix, founder sign-off).
- **ESPN is blocked** until a fresh probe contradicts the 403s (l10, CONTRADICTED).

**Repair path (from the files):** settle games on the odds archive — no re-probe needed.
Then merge M-F7, backfill CLOSE stamps for NFL/MLB, and only then quote a CLV beat-rate.
The 0.2273 beat-rate (328/611/504 of 1,443) is graded under the broken regime —
**clearsBreakEven=false; no edge claimed.**

## S9. The reasoning-layer map: from spec to evidence

**The reasoning-depth spec's L1–L5 mapped to this half's evidence:**

- **L1 (situation signals):** the canonical field list — rest, roof, surface, weather,
  stadium, teams, kickoff, no prices (situation-signal-vs-quote-plane:1-10); quote-plane
  = book market-state merge ladder with the `eventId` join seam and the no-odds-in-signals
  invariant.
- **L2 (QB behavioral profiles):** S4 above — the 8-dim vector + rusty-backup archetype +
  first-read/aggressiveness + NGS (internal). Feeds TNF Track 1.
- **L3 (OL→scheme→QB causal chains):** dossier-v2 efficiency weights (pass ≫ rush,
  0.53–0.61 vs 0.13–0.19); QB-WR consensus rules (OL-injury × pass-rush downgrade;
  personnel-absence → positional boost); Regime-PCMCI for when the causal structure itself
  changes (injury, coordinator change).
- **L4 (adversarial review):** the corrupted-ledger method (1173, other half) +
  this-half's honesty gates — the evidence guard, the vacuous-test rule
  (CARDS_EDGE_VALIDATE:65-68), the 2047 double-dipping flag. L4's job is to run the
  challenges file against every L1–L3 output.
- **L5 (checklist synthesis):** the calibration honesty pipeline (S2) as the final gate —
  no claim passes L5 without adaptive ECE, Wilson LB, evidence hash, and ≥30-pick sample.

**The reasoning layer's current state is honestly bad** (2025-holdout: 285/285
INSUFFICIENT; bridge-premises audit: no time index on the rows). The map above is the
build target, not the current state.
