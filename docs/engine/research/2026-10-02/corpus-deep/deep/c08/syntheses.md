# c08 Deep Research — Syntheses

**Date:** 2026-10-02. Cross-file connections from the five Phase-2 lanes. Each synthesis states what composes with what, and what the adversarial layer does with the composition.

---

## S1. The master pattern: measurement without enforcement

The slice's honesty machinery measures well and enforces little. Six independent instances:

1. The **no-bet governor** computes shadow scores (`computeGseActionScore`) but decides nothing — "public-safe methodology examples, shadow-only."
2. **SRQC** admit/refuse is enforcement opt-in (`SRQC_ENFORCE=1`); default is observe-and-log.
3. The **ranking census** (`loadRankingBasisCensus`) is wired read-only into `/api/ops/public-surface-truth` — measurement nobody gates on.
4. **Airwave** has the 15-value enum coded and tested; whether approved claims flow into live pick evidence is UNVERIFIABLE.
5. The **verifier harness** (108/108 green) sits in an unmerged draft PR — the scorecard capability doesn't exist on main.
6. **SELECTIVE_PUBLISH** is wired with its flag OFF — infra built, dormant by design.

**Synthesis:** the engine's failure mode is not dishonesty about measurement — it is the absence of a production caller with an on-by-default posture. Lane D's acceptance rule for any gate the adversarial layer builds: blocking pipeline step + persisted signed receipts + shadow near-refusal metrics + production caller on-by-default. Anything short gets a NOVA draft-state label, never "landed." This is the same standard Garrett's 17:34 audit challenge demands: claims need test+gate receipts.

## S2. Calibration-honest yet edge-empty (the frame everything hangs on)

ECE 0.0044, isotonic Brier 0.2556 — and Brier 0.2556 > UNC 0.2499, suppression-curve spread 0.0017, MI probe 0.0095 nats (p=0.060, not significant). The model is honest about adding nothing: constant-0.509 climatology beats it on holdout. This is not a contradiction — it is the slice's whole point, stated five ways across readers 55/57/58: maps fix reliability, never resolution; isotonic plateaus destroy Kelly ranking while RES≈0; calibration metrics can pass a dead model.

**Adversarial consequence:** the layer gates on resolution (grouping-loss lower bound, CORP DSC with CIs, MI probe vs close), never on calibration honesty alone. A model with ECE 0.0044 and zero resolution must never pass a publish gate.

## S3. The correlated-sources lesson, stated six ways (the funnel's math)

0790 (ICI vs PW), 1675 (RD-FGL), 1482 (time-varying + group-SCAD), the TNF pressure funnel, 1492's reviewer-engine correlated error (agreement 44.9% where the model is wrong), and 1776's correlated spread/ML classes — six independent sources, one lesson: **shared information must be modeled, never averaged away.** 0790's PW formula is the exact mathematical shape of the funnel bug: four legs on `pit_pressure_lands` treated as independent edges understates joint variance by dropping every cross-term.

**Composition for the adversary:** overconfidence ratio `OR = V_true/V_naive`, effective bets `n_eff = n/(1+(n−1)ρ̄)` — the TNF funnel scores n_eff ≈ 1.1–1.5 ("one bet with four receipts"). Detection Channels A (chain overlap on the trace) + B (PCA-strip + GL precision → leg-correlation matrix) + C (group-SCAD leg pruning). Fusion choice: CI (unknown correlation) / ICI (identifiable common structure — the funnel's canonical case) / CU (CONFLICT tracks) — never PW on sources that share information.

## S4. The abstention architecture (1776 × 1151, discovered twice)

1776's per-class gates and 1151's market-conditional-β two-threshold conformal policy are the same architectural move: per-market-type gating. They compose into one system — 1151's structure for the publish decision (FIRE/LEAN/ABSTAIN), 1776's additive-ambiguity + randomized tie-breaking + bankroll-derived caps for gate feasibility. One implementation, one acceptance test (≥15% less abstention than the global gate, all classes under cap, walk-forward). The count-loss objective must be re-derived in unit-loss terms (Challenge E) before it prices real decisions.

## S5. The human-in-the-loop rule (1492, bounded)

Direction survives (showing wrong predictions anchors reviewers below chance — mechanistically plausible anywhere); magnitude does not (3.5pp DO gain from 198 lay labelers on binary images; file marks "Not ADOPT" on magnitudes). Standing rule: abstained games render as "ENGINE ABSTAINS — low confidence" with no lean, no probability, no interval — but only after the internal replication passes (40 abstained matchups, DO vs BM-style, per-analyst). Until then it is a hypothesis with a protocol. Overrides of abstained games require written justification (≥140 chars, reviewer-stamped).

## S6. Consensus at rest is noise; the path near close is signal

PLACEABILITY: the engine is worst exactly where ~8 books agree (on-ladder MLB totals 36.3%). 0887: late odds-path moves carry the information (β₂=−0.3386 — but JRA horse racing, ex-post, not an NFL edge). The durable composition: gate/down-weight high-consensus picks (book-path machinery), engineer late-window implied-probability velocity features — backtested on GSE's own Pinnacle archive first, per the deep-read's own prescription. Never quote "14×" as an NFL number.

## S7. The per-track verification mapping (checklist ← corpus)

The §5 checklist validator's five tracks each inherit a corpus mechanism:
- **qb_behavior** ← JARVIS absence doctrine ("absence of data is recorded as absence"; missing profile → DATA-GAP, never a silent league-average default) + 30+ settled-picks claim floor.
- **coaching_scheme** ← Airwave intake vessel (`coaching_note` + EMPHATIC/LEAN/HEDGED + rights + reviewReady predicate); UNFALSIFIABLE takes → `would_not_claim`.
- **offensive_line** ← Airwave injury-corroboration gate → verification stamping (officially corroborated → CORPUS-grade; single-source chatter → SINGLE_SOURCE, not load-bearing at L4+).
- **trust_signals** ← 15-value enum + `source_rights_blocked` HARD_PASS + would_not_claim inheritance.
- **scheme_matchup** ← quote-precedence machinery (ordered ladder, `stale_higher_tier` divergence flags instead of overwrites, skip-reason logging) applied to the spec's trust ordering (live-verified > computed > corpus > single-source > inference).

Conflict escalation composes with the governor: one disagreeing pair → `model_disagreement` → WATCH (explain before action = the steelman); 2+ CONFLICT → L5 required (one notch harder than the governor).

## S8. The REJECT/FAIL register is load-bearing knowledge

Guarded negative results (xFP Unit-1 FAIL with 12-test tamper guard, 2609.23158 REJECT, GP-form DIE, 0004 failed extensions) are as valuable as positive findings — they are what stop the engine re-learning dead ends. The REJECT-citation rule: any new thesis contradicting a guarded negative must cite it by path and state why the new test differs. Silent re-wiring around a FAIL is a trust defect of the same class as the CQR bug.

## S9. Scaffolding is not implementation (the audit standard)

The ensemble directory carries paper names (2209 RD-FGL, 1482 time-varying) on generic stacking/EWA blocks — the paper mechanisms (PCA strip, Woodbury, Bai–Perron; local-linear + reflection + group-SCAD) are not implemented. Same pattern Garrett flagged on the CV work. The honest status vocabulary is NOVA's: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED / NOT_PRODUCTION_ACTIVE — never "landed." Dependency order for the wiring lane: (1) implement ICI (the actual 0.48-Sharpe method — CI alone is the conservative half); (2) replace 2209 scaffolding with the real FGL pipeline; (3) replace 2010-10435v1 blocks with local-linear + reflection + group-SCAD — then run the documented gates on walk-forward data.

## S10. Structures wire; magnitudes preregister (lane E's bottom line)

Lane E's feature families are strong on structure (compositional Dirichlet-multinomial shares, exposure-first ordering, linearization gates, guarded FAILs) and weak on measurement (most magnitudes are priors, most superlatives asserted, the flagship xFP stack failed its holdout). The posture: wire the structures, preregister the magnitudes, cite the FAILs out loud. Narrow surviving theses: xFP as role/exposure denominator, FPOE as luck-decomposition layer, Clay-sign buy-low — each with its own preregistered kill line.
