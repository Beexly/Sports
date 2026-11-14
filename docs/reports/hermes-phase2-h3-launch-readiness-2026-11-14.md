# Hermes Phase-2 H3 — Launch-Readiness / Stage-0 / Dual-Oracle Pre-Flight

Run: 2026-11-14 (Canada/Central), inline by hermes, $0.00 OpenRouter spend.
Worktree: Sports-phase2-wt @ origin/main e1508322c, branch hermes/phase2-c9-sweep-wiring-2026-11-14.
Method: real tool output only. No fabricated verdicts.

## 1. Launch-readiness (`node scripts/check-launch-readiness.mjs --json`)

Base: https://www.galaxysportsedge.com — checkedAt 2026-11-14T18:47:47Z.
22 checks: **15 PASS / 6 WARN / 1 FAIL** (script exit 1). NOT launch-green.

PASS (15): health (strict), settlement, gates, stale-data kill switch, record gate,
canonical sample, odds freshness, free score spine, pricing ladder, closing-line value,
money path, GET /api/picks (HTTP 503 feature gate — deliberate, public picks off),
GET /api/proof/ledger (200), GET /api/proof/openapi.json (200), cron config (39 schedules).

FAIL (1):
- nflverse currency — probe exited without a dataset verdict (freshness probe inconclusive).

WARN (6):
- scheduler liveness — not reported.
- calibration eligibility — RED: n=470, brier=0.181 (floor 0.22), ece=0.0575 (floor 0.05), streak 0/3.
  ECE exceeds the 0.05 floor and the 3-streak gate is unmet → not calibration-eligible.
- market coverage — americanfootball_ncaaf:MONEYLINE (43 games, 0 picks), nfl:MONEYLINE (13 games, 0 picks).
- confidence tail — overconfident at >=80: n=268, actual win 52.2% vs claimed 86.4%.
- founder P0 queue — STATS_PUBLIC is ON; confirm rights memo + feed SLA before promoting StatKing.
- operator tasks — 9 open, 1 done, 1 repo-verified; 1 repo-verifiable item UNVERIFIED.

## 2. Week-10 Stage-0 roster / freshness

- `preflight-roster-gate.ts` unit suite: **7/7 pass** (gate logic is sound).
- Live gate `require_week(9)` and `require_week(10)`: **BLOCKED** —
  `PreflightRosterGateError: roster config as_of 2026-11-07 is 7 days old (max 5);
  refresh transactions/injuries before running`.
- Only `data/nflverse/week9_live_roster_transactions_and_starters_2026.json` exists;
  there is **no week10 config**. The live roster/injury feed must be refreshed and a
  Week-10 config emitted before the Stage-0 gate can pass. This is consistent with the
  launch-readiness nflverse-currency FAIL. Do NOT publish picks against a stale roster.

## 3. Dual-Oracle pre-flight

- Per the Phase-2 directive, the OpenRouter Decisions API
  (https://openrouter.ai/api/alpha/decisions) is reported LIVE (jev doctor exit 0),
  supporting ~typesafe/jev-latest AND google/gemini-decision-1.
- Policy honored: bulk extraction stays $0.00 on Alibaba/NVIDIA; OpenRouter Decisions
  reserved strictly for Stage-3/5 decision verification. No paid decision calls made
  during this pre-flight.

## Verdict

The money path, proof ledger, gates, and kill switches are green, but the board is NOT
launch-ready: nflverse freshness is inconclusive (FAIL), the Stage-0 live roster gate is
BLOCKED on a 7-day-old config with no Week-10 feed, calibration is RED (ECE + streak), and
the >=80 confidence tail is materially overconfident (52.2% vs 86.4%). Passing on this
board is the correct call; refresh the roster/injury feed and recalibrate the tail before
any public promotion.