# Hypothesis Ledger — Future Filter (FFW-26)

Governed by SPEC-A §8 (this directory). **APPEND-ONLY**: corrections are new entries, never edits (§8.4). Any entry that scores a candidate on scoring-set outcomes counts as a look (§8.3); PLANNING entries never count as looks.
Opened: 2026-10-15 at FREEZE-1. The ledger as opened (entries 0001–0010) is hashed in FREEZE-1.json (this directory); later appends are covered by repo commit history and the ledger is re-hashed at FINAL.

## Schema

Each entry carries: **ID · Date · Type · Subject · Freeze hash · Scoring set · Δ_hat · SE · p-value · Status / note** (per SPEC-A §8.1; fields not yet applicable read "—").

Types:
- **CONFIRMATORY** — a registered candidate in the Holm family (§8.2); counts as a look when scored.
- **SLOT** — a pre-registered situational slot (SPEC-A §9.2); no weight; not a look until the ledger clears it for scoring.
- **SHADOW** — exploratory, no α spent, reported only at FINAL (RULING-C1 §1.5).
- **PLANNING** — setup, measurement, or code-check entries (§8.3); never looks.
- **INTEGRITY** — freeze events, voids, fallback invocations, record corrections.

## Entries

| ID | Date | Type | Subject | Freeze hash | Scoring set | Δ_hat | SE | p | Status / note |
|---|---|---|---|---|---|---|---|---|---|
| 0001 | 2026-10-15 | PLANNING | σ_d measurement | — | — | — | — | — | Family-2 per-game CRPS-difference SD **measured** from the landed per-game vectors: σ_d = 0.293745 (n = 2,462 frozen-filter games). SE-recovered value 0.2937 agrees to printed precision (third independent agreement: SE recovery, artifact-pack computation, direct vector measurement). Non-look (§8.3). Source: sigma-d planning job, branch grok/walk-forward-2026-10-14 @ 7297f2f. |
| 0002 | 2026-10-15 | PLANNING | DEFF measurement | — | — | — | — | — | Within-week clustering of the family-2 difference vector: ICC(1) = −0.0034 → DEFF 0.9525 (clusters (season, week), G = 163, m̄ = 15.10); cluster-robust variance ratio 0.9373. Planning DEFF adopted = **1.00** (no credit taken). Non-look. Same source as 0001. Closes the DEFF item RULING-C1 §6 left open. |
| 0003 | 2026-10-15 | PLANNING | RULING-C1 prerequisite P1 | — | — | — | — | — | Family-2's 7.133199 reproduced from landed code: deterministic rerun reproduced baseline 7.154020678264436 (inside the 5e-7 lock; max aggregate deviation 0) and regenerated pit_round2_result.json **byte-identical**, sha256 0fa72d05639fbccbf7fa7172e252ddf4da71be3d7723605bb86a1c249df962c7. P1 SATISFIED. Non-look. Same source as 0001. |
| 0004 | 2026-10-15 | CONFIRMATORY | **PRJ-1** (candidate #1) | PENDING-BIND | SCORING (list binds at FINAL) | — | — | — | Sole member of the confirmatory family (**m = 1**). Composition: RULING-C1 §1 (ratified 2026-10-15). Module freeze building on branch motif/prj1-freeze-2026-10-15; module + config hashes bind at FINAL (FREEZE-1.json). Status: PRE-REGISTERED at FREEZE-1. Not scored; no look taken. Fitting procedure is part of the candidate and multiplicity-covered (SPEC-A §8.5). |
| 0005 | 2026-10-15 | SLOT | SPESE | — | — | — | — | — | Situational slot **1 of 2** (SPEC-A §9.2). Sole survivor of the frozen-filter kill-only situational screen (7 metrics; paired full-filter Δ vs family-2: scale −0.000263, atom −0.000198; coverage 2,412/2,462). Future-filter pre-registration ONLY: no weight, no emission, not a look. Caveats on the record: β/γ pinned at grid edge 0.50; per-season sign flips 5+/5−; 1 survivor of 7 looks. Slot 2 of 2 is unfilled. |
| 0006 | 2026-10-15 | SHADOW | S-G | — | — | — | — | — | PRJ-1 with ν fixed at ∞ (lattice Gaussian, hetero + atoms). Exploratory, no α; reported only at FINAL. Isolates the t-kernel's forward contribution (RULING-C1 §1.5). |
| 0007 | 2026-10-15 | SHADOW | S-F2 | — | — | — | — | — | Family-2's own landed code, refit point-in-time. Exploratory, no α; reported only at FINAL. Isolates the joint vs. family-2 (RULING-C1 §1.5). |
| 0008 | 2026-10-15 | SHADOW | S-ALL4 | — | — | — | — | — | PRJ-1 with σ_g multiplied by F4's per-game scale factor (normalized to mean 1 on training). Exploratory, no α; reported only at FINAL. Carries F4, excluded from PRJ-1 by the role rule — recorded as an engineering choice made after seeing F4's solo result (RULING-C1 Amendment A1); F4 is promotable from this shadow under a future pre-registered rule. |
| 0009 | 2026-10-15 | SHADOW | S-F1 | — | — | — | — | — | F1 alone (lattice homoscedastic Gaussian). Exploratory, no α; reported only at FINAL. Measures the mechanical support gain forward; no signal credit is taken for it (RULING-C1 §3.2). |
| 0010 | 2026-10-15 | INTEGRITY | FREEZE-1 executed | FREEZE-1.json (this directory) | — | — | — | — | SPEC-A + SPEC-B ratified and frozen with defaults locked; RULING-C1 adopted with Amendments A1/A2; calibration/scoring split declared (CALIBRATION = first 30% of the window by kickoff; SCORING = remaining 70%; game-ID lists bind at window open, hashed at FINAL). Product gate decoupled (SPEC-B §7.3). FINAL remains: PRJ-1 module hash binding, product break-even bar value, game-ID lists, pre-declared n. No scoring has occurred; no look has been taken on the future filter. |
