## 2026-10-13T17:30:00Z
You are teamwork_preview_worker with identity worker_m2.
Your working directory is: C:\Users\Garrett\Sports\.agents\teamwork\worker_m2\
You MUST read C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Also read C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\PROJECT.md and survey findings in:
- C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_gate_reasoning\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your assigned Milestone is: M2 — 200+ Engine Gates, PASS Veto Closure & L1-L5 Reasoning Filter.

Exclusive File Ownership:
- `frontier/sports/` (restoring missing files and gate wiring)
- `packages/types/src/index.ts`
- `packages/prediction-engine/src/scoring.ts`
- `apps/web/lib/picks/adverse-edge-suppression.ts`
- `packages/ingestion-pipeline/src/generate-signal-slate.ts`
- `intelligence/reasoning/` (integration points)

Tasks to Execute:
1. Restore 50 Missing Frontier Engine Files:
   - Restore the 50 missing Python files in `frontier/sports/` from commit `b711f4c81598090f5b94e04e689c0ecdef60ddc5` (branch `opencode/grok-espn-odds-first-20261008` / git tree `c351aa8081e5a33297351a20c5654e531be1a676`).
   - Files include: `bayesian_robust_kelly_engine.py`, `shootout_velocity_engine.py`, `nfl_ep_wp_engine.py`, `matrix_repair.py`, `vine_copula_parlay_engine.py`, `stadium_microclimate_engine.py`, `player_props_intelligence_engine.py`, `adaptive_conformal_engine.py`, `test_bayesian_robust_kelly_engine.py`, `test_vine_copula_parlay_engine.py`, `test_matrix_repair.py`, `test_mathematical_engines.py`, etc.
   - Command pattern: `git checkout b711f4c81598090f5b94e04e689c0ecdef60ddc5 -- frontier/sports/` (or restore missing files into `frontier/sports/`).
2. Seal the `independentEdge.decision == "PASS"` Publication Leak:
   - In `packages/types/src/index.ts`: update `pricesWorseThanMarket(edge: IndependentEdgeSummary | null)`:
     If `!edge` return false; if `edge.decision === "PASS"` return true; if `edge.expectedClv < 0` return true.
   - In `packages/prediction-engine/src/scoring.ts` (lines 815, 1456): ensure if `independentEdgeRaw.decision === "PASS"` or `pricesWorseThanMarket(independentEdgeRaw)` returns true, return `null` so PASS decisions are never minted/published under book path.
   - In `apps/web/lib/picks/adverse-edge-suppression.ts` (lines 82-84): ensure `isAdverseEdgeRow` returns `true` if `edge.decision === "PASS"` or `edge.expectedClv < 0`.
   - In `packages/ingestion-pipeline/src/generate-signal-slate.ts` (lines 875-877): ensure that on pick update, if `publicationVeto` is true (`passVeto || stalenessVeto`), set `{ isPublished: false }`.
3. Wire L1–L5 Reasoning Trace Engine into Emission:
   - In `frontier/sports/engine_gate.py`: require verified L5 reasoning trace for any card/pick (`Exposure.requires_l5()`).
   - Ensure L4 adversary breaking conditions evaluate to `False`.
   - Ensure 5-track checklist (`qb_behavior`, `coaching_scheme`, `offensive_line`, `trust_signals`, `scheme_matchup`) has zero UNCHECKED tracks.
   - Strict hierarchy order OL -> Coaching -> QB enforced.
4. Verify Live Roster & Mathematical Engines:
   - Verify `py -3.13 -m pytest intelligence/roster/test_live_roster_gate.py` (11/11 passing).
   - Verify `py -3.13 -m pytest frontier/sports/test_engine_gate.py frontier/sports/test_signal_registry_parity.py frontier/sports/test_mathematical_engines.py`.
   - Verify static CI anti-bypass scan (`violations() == []`).
5. Write your handoff report to `C:\Users\Garrett\Sports\.agents\teamwork\worker_m2\handoff.md` following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
6. Send a completion message via send_message to parent (4b4ec98b-b9df-4eda-bc9a-7faeca182fee).
