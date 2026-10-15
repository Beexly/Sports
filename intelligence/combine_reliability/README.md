# Combine-Feature Reliability Lane

Feature-level trust for Combine-derived signals. A Combine feature may make a
predictive claim in the engine only after passing three legs, measured on the
same yardstick:

1. **Repeatability** — Spearman–Brown reliability of the feature as used.
   Floors from the audits: < 0.50 = not analysable (faith-amanze,
   pre-registered); 0.70 = decision-grade for individual players
   (Pratheeksh-7S).
2. **Transfer** — a Combine→game association on the **same movement
   primitive** (generic athleticism is not transfer), with a CI or p-value,
   estimated through the same-yardstick normalization.
3. **Controls** — position/role, weight/size, draft slot, official forty /
   10-yd split, alignment, as applicable. An uncontrolled estimate caps the
   verdict at UNDERPOWERED.

Additional rules: |r| ≥ 0.95 vs an existing measurement → FAIL (REDUNDANT);
a feature containing its own outcome → FAIL (leakage); **a null at
insufficient power is UNDERPOWERED, never FAIL** — every null is recorded
with its minimum detectable effect.

## Modules

- `gate.py` — the gate. `FeatureEvidence` in, `GateVerdict`
  (PASS / FAIL / UNDERPOWERED + flags + reasons + per-leg detail) out.
  `reps_needed()` reproduces the audits' Spearman–Brown reps table.
- `yardstick.py` — same-yardstick normalization (infrastructure
  prerequisite), extracted from vanductan-NLT's method: uniform 10 Hz
  resampling, onset back-extrapolation (constant acceleration from rest;
  attempts starting > 2 yd/s excluded), one identical metric set over the
  first 1.5 s, left/right attempt averaging (attempts are sides, not
  replicates), within-class / within-position centering, partial
  correlation with player-bootstrap CIs.
- `features.py` — SHADOW features built to the extracted specs:
  Bend Score (peak centripetal acceleration a_c = v·ω over three arc
  drills, z-mean, 50/10 scale; StevanHRG) and KTD Combine-side primitives
  (ΔS, retention on the isolated cut; usufalbaz). The published KTD ratio
  is **not** implemented: its denominator is the outcome.
- `shadow.py` + `shadow/combine_shadow_ledger.jsonl` — the lane's shadow
  ledger (pattern of the trust/matchup/film shadow ledgers). Rows are
  weight 0, status SHADOW. The ledger is seeded with the gate evaluations
  of every candidate extracted in Phase 1.

## Gate verdicts on the extracted evidence (2026-10-15)

| Candidate | Verdict | Basis |
|---|---|---|
| Tracked peak speed (new-feature admission) | FAIL — REDUNDANT | reliability 0.99, but r = −0.98 vs official forty (faith-amanze notebook cell 5); Pratheeksh-7S dissent recorded in the addendum |
| WR cut-efficiency composite | FAIL | reliability 0.03 (Pratheeksh-7S) |
| DL pass-rush drill features | UNDERPOWERED | transfer ≈ 0 at n = 65, MDE 0.36 (faith-amanze) |
| Pass-rush burst → get-off | FAIL | powered null: 0.03 (CI −0.16–0.23), ceiling 0.68 (Pratheeksh-7S) |
| Bend Score (CBS) | UNDERPOWERED | controlled transfer +0.99 (0.45–1.53), nested-validated; repeatability never measured |
| KTD, published ratio | FAIL | outcome leakage; headline unverifiable from repo (14 of 106 rows shipped) |
| KTD numerator-only (ΔS / retention) | FAIL at 1 rep | input reliability 0.40 single-rep; retest at 4 reps (reps_needed) |
| OL kick-slide speed@1yd | UNDERPOWERED | r = 0.44 (0.12–0.65) controlled, but best-of-six post-hoc; drill repeatability unmeasurable as run |

Full extraction (seven-field tables, per-claim sourcing):
`census-combine-reliability-addendum-2026-10-15.md`. The Bend & Burst
(KPRI) vs Bend Score redundancy test protocol is specified in that
addendum (common cohort, correlation leg, nested incremental leg,
component leg, leave-one-class-out leg) and is pre-registered there; it
has not been run — rep-level data is not in either repo.

## Fences

Shadow only: weight 0 everywhere, emission stays ZERO_OBJECT, nothing in
this lane touches picks, pricing, or any recommendation surface. Sources
are public BDB 2027 repos, read-only inspected; competition data is not
in them, so audit numbers are labeled NOTEBOOK-OUTPUT / WRITEUP-CLAIMED /
VERIFIED as the addendum records.
