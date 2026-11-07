# STAGE 1B UNIFORMITY — V3: THE CONTRAST, COMPLETED (Motif, 2026-11-07)

Completes STAGE1B-UNIFORMITY-V2-2026-11-07.md. V2 established that the receipt's headlining cognitive_router (TS/matrix) block is a constant across all 19 dossiers, and asserted the Python gate's field varies — on the strength of tonight's executed contexts, not the receipts. The receipts themselves now confirm it:

**equation_gate_12304_clamped_delta (the Python gate's output, workflow line 2407), per dossier:**
ARI@SEA +0.279806 · BUF@MIN +0.035600 · CIN@ATL +0.073958 · CLE@NO +0.035600 · DAL@IND +0.073958 · DEN@CAR +0.022107 · DET@GB +0.047279 · DET@MIA −0.026935 · GB@NE +0.115408 · HOU@LAC +0.079705 · IND@MIN +0.073958 · JAX@BAL −0.038152 · LAR@WAS +0.047475 · LV@SF +0.041189 · MIA@BUF +0.098909 · NYG@PHI −0.006078 · NYJ@KC +0.074746 · TB@CHI +0.045333 · TB@KC +0.161626

19 dossiers, 16 distinct values, range −0.038 to +0.280, both signs present. Three exact repeats (BUF@MIN = CLE@NO at +0.0356; CIN@ATL = DAL@IND = IND@MIN at +0.073958) — plausibly shared context features between those matchups; noted, not adjudicated.

**The contrast, in one line:** inside the same Stage 1B receipt, the Python gate consumed the per-game context and produced a per-game number; the TS/matrix router block consumed an all-bits-on mask and produced a constant. One stage, two paths, opposite behavior. The production pipeline's game-specific equation signal exists — it is the smaller field (equation_gate_12304_clamped_delta), not the headlined router block. Any consumer reading the cognitive_router Stage-D delta as the game's equation adjustment is reading a constant 0.35 for every game; any consumer reading the gate field is reading a real per-game value.

Fix priority follows: the TS mask construction (v2) decides whether the headlined block ever becomes a signal; until then, downstream stages should be checked for which of the two fields they actually consume — that consumption check is the next open item this note hands forward.

**CORRECTION (2026-11-07, independent subagent re-verification):** the distinct-value count above is 16, not 15 — an earlier count rounded det_gb (0.047279) and lar_was (0.047475) into one bucket at 4 decimal places; at the files' stored precision they are distinct. The subagent independently CONFIRMED Claim 1 in full (all four constants, 19/19 files, zero exceptions) and Claim 2's occurrence count (exactly 1 per file) and extrema (−0.038152 / +0.279806). Repeats: 0.035600 ×2, 0.073958 ×3.
