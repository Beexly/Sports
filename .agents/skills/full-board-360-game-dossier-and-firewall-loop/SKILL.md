---
name: full-board-360-game-dossier-and-firewall-loop
description: Audit all DraftKings sportsbook markets per game, enforce the -250/-300+ heavy-juice firewall and conjunction gate, and verify storefront safety.
metadata:
  source-workflow: workflows/full-board-360-game-dossier-and-firewall-loop.md
  loop-mode: loop-me
---

# 360-Degree Full-Board Market Review & Storefront Publish Loop

## When to Use
- Scheduled pre-game market sweeps (Tuesday lookahead, Thursday/Sunday/Monday locks) or post-steam/injury re-evaluations.
- Auditing call sheets against the `-250` / `-300+` heavy-juice firewall, 5-Stage Conjunction Gate, `scripts/guardrails/trust-gate.mjs`, and `apps/mobile/scripts/lint-rules.js`.

## When Not to Use
- Corpus paper ingestion (`continuous-corpus-ingestion-and-wiring-loop`) or post-game settlement grading (`continuous-post-game-learning-and-pathwise-calibration-loop`).
- Publishing any selection where `independentEdge.decision === "PASS"` (`publishAllowed: false`) or exposing internal math jargon on public copy.

## Execution Workflow
1. **Situational-First Context (Stages 1–2):** Ingest coaching tendencies, charting signals, weather, rest/travel, and true per-player active `player_gp` injuries before running trajectories.
2. **Trajectory & Calibration (Stages 3–4):** Generate 10,000-world conserved trajectory distributions, run walk-forward calibration (`market_calibration_heads_2026.json`), and isolate market residuals via FWL.
3. **De-Vig, Heavy-Juice Firewall & Conjunction Gate (Stage 5):** Require two-sided Class B `marketFairProb`, reject heavy-juice traps (`-250` / `-300+` -> evaluate alt lines or `PASS`), enforce `publishAllowed: false` on negative edge, and format confidence as integer `XX/100` (never `%`).
4. **Storefront, Ledger & Mobile Gates:** Confirm ledger strings come exclusively from `apps/web/lib/ledger/public-record.ts` (`/record`), keep paid selections behind paywall redaction, and run:
```powershell
node scripts/guardrails/trust-gate.mjs
node apps/mobile/scripts/lint-rules.js
python scripts/guardrails/connected-workflow-dossier-guard.py
```

## Completion Criteria
Done when all three guards exit `0`, zero unpriced or `PASS` plays are marked publishable, and owner approves release to `origin/main`.
