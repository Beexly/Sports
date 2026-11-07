# WAVE 2 ANNEX — Deep Research Wave 2 results (for the coding agent)

Pointer annex, written by Motif 2026-10-30 ~18:20 CT. Full substance lives in
~/workspace/research-deep-wave2-2026-10-30/: 00-SYNTHESIS.md · 01-CRITICAL-REGISTER.md ·
02-NEW-PDF-INDEX.md · 03-GAP-AUDIT.md · dossiers/ (48 deep dossiers) · pdfs/ (31 new
PDFs, 1,904 pages, 0 duplicates vs the 4,056-ID corpus union). This annex is the
packet-level summary + the build items; the dossiers are the authority.

## Verdicts that changed at depth (Wave-1 → Wave-2)
13 Wave-1 verdicts were reversed or narrowed. The load-bearing ones:
- **FNO: ADOPT → REJECT.** **DeepONet: REJECT.** **GNS (Learning to Simulate):
  REJECT.** Register R2: all three fail on one missing asset — a field/trajectory
  corpus GSE does not own. Do not revive from the Wave-1 dossiers.
- **Pyro: REJECT.** **Neural ODE: LEARN-ONLY.**
- SINDy: ADAPT — discrete form only, behind the planted-law + coverage gates (§Design 3).
- PINNs Part I: ADAPT-narrow — the calibration-harness/inversion pattern only.
  Register R3: the critics converge — PINNs' only defensible use is inversion,
  not forward simulation.
- NUTS: ADOPT. Barber weighted conformal: ADOPT. Gelman/Betancourt/Vehtari
  process gates: ADOPT. Romano **CQR: the single most deployable item in the wave.**
- ACI: ADAPT as drift diagnostic only — its coverage bound is ±67pp at season scale.
- Blei VI: ADAPT with a hard rule — raw VI intervals are banned from publication
  (mean-field SDs run 0.44× truth at ρ=0.9).
- Petersen & Zech: ADAPT for structure only — zero operator learning; its numeric
  bounds are vacuous at GSE scale (≈33 at season scale), banned as gates.
  §17.3 (transformers) still owed a full read (gap audit).
- CMU text (Sullivan & Mackey): ADOPT-narrow — 10 proof-discipline rules extracted
  as a fleet checklist; it contains no probability theory.

## Critical register headlines (01-CRITICAL-REGISTER.md, R1-R14)
- R1: the conformal stack's four theorems do NOT compose into a joint guarantee
  on season-ordered data. Quote them separately, never jointly.
- REJECT count: 4 full (FNO, DeepONet, GNS, Pyro) + 4 component-level.

## The three synthesis designs (00-SYNTHESIS.md — components + first experiment + kill number in full there)
1. **ARGON, re-scoped:** classical RK drag/Magnus core + a PINN-pattern INVERSE
   layer for coefficient estimation, behind the Grossmann cost-accuracy gate;
   operator learning parked behind a restated wake condition. First experiment:
   synthetic coefficient recovery, NLS vs PINN. Kill: PINN fails to beat NLS in
   the no-initial-condition regime, or >10× compute for parity.
   **BLOCKER (critic pass 1):** the PINN arm cites Part I for parameter discovery
   its own dossier reserves to Part II — the PINN arm is BLOCKED pending a
   Part II dossier. 9 critic amendments adopted into the synthesis addendum.
2. **The honest-interval stack:** hierarchical BT (NUTS / Caron-Gibbs) under
   divergence/R̂/ESS promotion gates; CQR + Barber-weighted conformal on top; ACI
   as monitor only. First experiment: nominal-90% backtest on the 2,462 locked
   games. Kill: any major subgroup <82% coverage, or >25% width growth for <2pp
   coverage gain.
3. **MOVE-37 as a method:** discrete SINDy on team-week state panels behind a
   planted-law gate (≥80% true-support / ≤10% false) + a coverage arm. Kill:
   failing the plant, or no out-of-sample win vs ridge/persistence.

## Build/spec items for QC/Jules (noted in the synthesis, not built)
RK harness (Design 1) · conformal layer (Design 2) · SINDy harness (Design 3) ·
fit-report gate fields (process gates). Fire in that evidence order; Design 1's
PINN arm waits on the Part II dossier above.

## Critic coverage
Pass 1 (physics + Design 1): DONE — 17 claims, 9 HIT / 7 PARTIAL / 1 MISS, all
verified against dossier text; dossiers survived better than the synthesis.
Pass 2 (Designs 2-3 + inference/books dossiers): RUNNING under a Motif lane —
result lands at ~/workspace/research-deep-wave2-2026-10-30/04-CRITIC-PASS-2.md.
Until it lands, Designs 2-3 are strong drafts, not finals.

## Method note for the corpus
Six hunt-list arXiv IDs were wrong; title-page verification caught all six before
filing. Title-page verification is now the corpus ingestion standard.
