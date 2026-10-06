# c08 Deep Research — Buildable Systems

**Date:** 2026-10-02. Concrete systems for the adversarial layer (`adversaryReview` + `validateChecklist`), each at code-contract level: contract, inputs/outputs, invariants, the test that kills it, corpus justification. Status: specified, not built — each carries its acceptance gate.

---

## SYS-1. Correlated-thesis machinery (the funnel killer)

**Contract:** `correlatedTheses(legs, trace) → ThesisBundle[]`; `overconfidence(bundle) → {OR, n_eff}`.
**Math:** `V_naive = Σσ²_i`; `V_true = w'Σw = Σσ²_i + 2Σ_{i<j}ρ_ij σ_i σ_j` (Bates–Granger MSFE form, 1675); `OR = V_true/V_naive`; `n_eff = n/(1+(n−1)ρ̄)`.
**Detection:** Channel A — chain overlap on the trace (shared named link + overlapping falsifiers = same link). Channel B — PCA-strip common forecast errors → GL on idiosyncratic precision (τ>0 mandatory) → off-diagonal gives R (1675 recipe). Channel C — group-SCAD leg pruning before combining (1482).
**Fusion choice:** CI (unknown correlation) / ICI (identifiable common structure — the funnel's canonical case) / CU (CONFLICT tracks) / never PW on shared-information sources.
**Exposure:** bundle staked as ONE position — fused (ICI/CI) probability, Kelly on bundle edge under the 0822 30% drawdown governor; UI renders one thesis with combined exposure and n_eff; the four-receipts presentation is a contract violation.
**Kill test:** the TNF funnel (4 legs, `pit_pressure_lands`) → one bundle, n_eff ≈ 1.1–1.5, verdict KILL.
**Corpus:** 0790 (PW 0.11 vs ICI 0.48), 1675, 1482, spec §8 T1/T4.

## SYS-2. Per-market abstention gate (1776 × 1151)

**Contract:** `perMarketAbstentionGate(p, q, market) → {FIRE | LEAN | ABSTAIN, reason_code, tiebreak_draw, per_class_errors}`.
**Inputs:** calibrated p, market-implied q, market ∈ {spread,total,moneyline}, per-market caps from bankroll tolerance (re-fit quarterly), nonconformity s=1−max(p,1−p), market-conditional thresholds (α_m,β_m) grid-searched on chronological validation.
**Invariants:** additive ambiguity ONLY (product banned — Phoneme R0=0.0551 precedent); randomized tie-breaking with logged seed; deterministic strict feasibility must never yield all-abstain; no class exceeds its cap in >1 of 4 walk-forward seasons (hard fail).
**Kill test:** ≥15% lower abstention than the single global gate, all classes under cap, walk-forward; else REJECT.
**v2:** re-derive the ambiguity objective in expected-unit terms (count-loss is v1 with the discrepancy logged).
**Corpus:** 1776, 1151, 0211-gate discipline.

## SYS-3. Deferral messaging + override contract

**Rule:** abstained matchups render "ENGINE ABSTAINS — low confidence" with NO lean, NO probability, NO interval. Analyst re-handicaps blind.
**Override:** written justification ≥140 chars, reviewer-stamped, stored with the pick record.
**Activation gate:** internal replication first — 40 abstained matchups, DO vs BM-style, per-analyst; pass = DO-style ≥ BM-style. Until then the rule is a hypothesis with a protocol.
**Kill test:** replication fails to replicate direction → rule stays hypothesis, lean stays visible.
**Corpus:** 1492 (direction survives, magnitudes don't).

## SYS-4. Pooled-parameter challenge (`lopo-challenge.json`)

**Rule:** every player-level model ships pooled-CV AND LOPO metrics side by side; pooled-only claims auto-flag UNVERIFIED.
**Gate:** degradation ≥10% relative (pooled→LOPO) → mandatory path: per-player mean signed residuals as weekly efficiency prior only if week-to-week Spearman ≥0.5 across consecutive 4-week windows; else pooled-only, labeled as such.
**Hardening:** feature-group ablation (memorization groups quarantined behind a player-history-length floor); regime stratification (LOPO-stable vs LOPO-cross-regime reported separately — team changes must not masquerade as player-memorization).
**Artifact:** `lopo-challenge.json` {pooled_r2, lopo_r2, lopo_stable, lopo_cross_regime, degradation_pct, verdict}.
**Corpus:** 0211 (0.38, comparison arm possibly inflated).

## SYS-5. Simulation distrust rubric

**Rubric (0–5, admissible as pick evidence only at ≥4):** +2 version-locked sim (hash before comparison; comparison season never used in tuning); +1 sim-resolved calibration within ±0.05 slope of real-outcome calibration; +1 simulator training data independent of engine training data; +1 N≥30 independent models with reported p.
**Labeling:** all sim-resolved metrics carry `SIM-RESOLVED` prefix + rubric score, forever. Quoting without the score is a reporting defect.
**Corpus:** 1472 (ρ=+0.43, ρ²≈0.185 — a signal, not a certificate).

## SYS-6. Calibration–sizing joint check

**Rule:** the sizing pipeline may not consume a calibration map's output for conviction ranking unless Kendall τ(pre-map, post-map) ≥ 0.95 on the sizing sample.
**When RES≈0:** sizing consumes the pre-calibration score or a rank-preserving alternative (Platt/Temp over PAVA); isotonic stays OFF for sizing inputs.
**Hard error, not warning:** a plateaued (τ<0.95) calibrated score reaching Kelly fails the staking job closed.
**Kill test:** backtest Kelly growth calibrated-vs-pre-calibration on the same sample; if calibrated-input growth < pre-calibration growth, the check stays mandatory.
**Corpus:** ISOTONIC_EXPLORATION.md, ENGINE_RANKING_RES_NEAR_ZERO.md:8.

## SYS-7. Leaf-band exclusion gate (6.5–9.5)

**Rule:** until the collapse remedy lands, the adversary flags any published pick whose calibration prior is the 6.5–9.5 leaf with the `calibration_drift` no-bet reason code. NFL spread picks in [6.5,9.5] hard-blocked; totals and other bands unaffected.
**Corpus:** CALIBRATION_LEAF_DRIFT_6_5_9_5.md (n=576, Δ=−8.74pp; remedy "not applied").

## SYS-8. rankingSource publish filter + census gate

**Rule:** demote any pick with `factorBreakdown.rankingSource == "confidence"` (or absent, pre-v5.2.1) from top-3/top-5 display slots — confidence is anti-predictive at the top (z=−10.7). TOTAL-path rows can never occupy featured slots.
**Census gate:** promote `loadRankingBasisCensus()` to a gate — if the confidence-branch share of published graded rows exceeds a founder-set threshold (start: >50%), fire `calibration_drift` and withhold public ranking claims for the slate.
**Corpus:** BUILD-QUEUE-2026-09-18-ranking.md; `scoring.ts:806,1051-1052,1407`; `ranking-basis-census.ts`.

## SYS-9. Resolution-first promotion gate

**Rule:** replace/augment ECE/Brier-only publish gates with: (a) grouping-loss lower bound > threshold (P-D) as go/no-go; (b) CORP decomposition with CIs — preregistered rule: 95% CI on DSC−MCB entirely ≤0 → do not promote; (c) MI-probe protocol as leak-detection: no feature earns weight unless I(score;Y|q_close) clears a permutation-p threshold.
**Corpus:** frontier dossier (ECE 0.0044 / Brier 0.2556 / suppression 0.0017), BUILD_LOG:125 (MI probe), lane A challenge 4.

## SYS-10. Pre-registration enforcement (on PR #914 merge)

**On merge:** (a) re-run the 108-test suite under the repo's real runner (today's green came from a vitest shim); (b) require every factor/eval run's kill-line commit to predate its run_sha, with full-clone CI enforced (fetch-depth 1 silently degrades the gate); (c) extend the pre-registration contract to board-ranking changes.
**Until merge:** engine-prediction scorecards are provisional — the "score before public picks" capability does not exist on main.
**Corpus:** RESCUE-2026-09-26-2-verifier-port.md; PR #914 (open/draft/unmerged).

## SYS-11. CQR acceptance backtest

**Rule:** before any public interval claim leans on `cqr.ts`, run the acceptance backtest: 90% coverage within ±1.5pp of nominal on a fresh holdout AND length ≤90% of the absolute-residual baseline, no clamp.
**Corpus:** `cqr.ts:10-19` (repair confirmed); `cqr-recipe-audit.ts` exists.

## SYS-12. xFP/FPOE pre-registration gate + REJECT-citation rule

**Rule:** spec-review greps proposed projection-weight changes for xFP/FPOE-as-rank-feature; wiring requires a preregistered counter-test. Narrow uses (role denominator, luck layer, Clay-sign buy-low) pass only with their own preregistered kill lines.
**REJECT-citation rule:** any thesis contradicting a guarded negative cites it by path and states why the new test differs.
**Corpus:** RESCUE-2026-09-26-4 (Unit 1 FAIL, 12-test guard).

## SYS-13. "Beat your own linearization" gate

**Rule:** any GP/symbolic-discovered feature form is ablated against its smooth linearization on a time-separated holdout before wiring; if the linearization wins, the form is dead, the coefficients may live.
**Corpus:** REPORT_BOTTLENECK.md (0.6039 vs 0.5818, ~4σ, n=11,271).

## SYS-14. Assert-vs-measure quote ladder

**Rule:** superlatives ("single most predictive", "sharpest", "best") in research/design docs must link a measured comparison or carry a `PRIOR:` tag before entering the feature registry. Documentation lint.
**Corpus:** DESIGN_BRIEF.md:104 (pressure-EPA superlative asserted, never measured).

## SYS-15. Checklist per-track build rules (§5 ← corpus)

- **qb_behavior** ← JARVIS absence doctrine: missing profile → DATA-GAP, never silent league-average; +30+ settled-picks claim floor.
- **coaching_scheme** ← Airwave vessel (`coaching_note` + EMPHATIC/LEAN/HEDGED + rights + reviewReady); UNFALSIFIABLE → `would_not_claim`.
- **offensive_line** ← Airwave injury-corroboration gate → verification stamping (official → CORPUS-grade; chatter → SINGLE_SOURCE, not load-bearing at L4+).
- **trust_signals** ← 15-value enum + `source_rights_blocked` HARD_PASS + would_not_claim inheritance.
- **scheme_matchup** ← quote-precedence machinery (ordered ladder, `stale_higher_tier` divergence flags, skip-reason logging) over the spec's trust ordering.
- **Gate:** UNCHECKED at L3+ → INVALID naming the track; DATA-GAP load-bearing → adversary worst-plausible; 2+ CONFLICT → L5; `stale_market_context` → HARD_PASS maps to DATA-GAP for stale quote consumers.

## SYS-16. Adversary governance (outputs with teeth)

1. **Shadow near-refusal metrics** — log claims nearly killed / verdicts nearly refused (SHADOW_WOULD_REFUSE pattern).
2. **Signed receipts** — every checklist verdict and admit/refuse decision gets an Ed25519-signed append-only receipt; deterministic tooling manufactures receipts, the model only interprets them (NOVA discipline).
3. **`would_not_claim` inheritance** — the adversary report carries them; published output inherits them; sub-L5 output labeled `ANALYSIS-DRAFT`.
4. **Default-NO promotion** — analysis → published pick requires explicit authorization.
5. **Machine-checkable breaking conditions** — every condition a pipeline-evaluable predicate (FABLE evidence-harness pattern), never prose.
6. **Stub-mode honesty** — `validateChecklist` detects stub/fixture/mock "data present" signals and short-circuits to DATA-GAP (JARVIS `isStubMode()` port).

## SYS-17. Tiebreak audit

**Rule:** every randomized tie-break logs {decision_id, seed, draw_value, boundary_distance}; weekly report on draw-influenced share; >10% → cap-feasibility review (measure inter-class error correlation in the same report).
**Corpus:** 1776 randomized-feasibility fix; lane B Challenge A.

---

**Acceptance for every system above:** blocking pipeline step + persisted (signed) verdicts + shadow near-refusal metrics + production caller on-by-default. Anything short is documentation and gets a NOVA draft-state label.
