# INTEGRATION AUDIT — 2026-10-11

**Scope:** Beexly/Sports + Beexly/agent-bus, last 48 hours (Oct 9–11, 2026)
**Auditor:** Motif subagent
**Method:** GitHub API verification of every claimed artifact against origin. No trust without a SHA.

---

## VERDICT: 11/12 key artifacts verified on origin. 1 stranded.

---

## ARTIFACT VERIFICATION TABLE

| # | Artifact | Claimed Commit | Origin SHA | Size | Status |
|---|----------|---------------|------------|------|--------|
| 1 | `week5_millionaire_lineups.json` | 643fabe | 3072f424 | 49,017 | ✅ VERIFIED |
| 2 | `week5_millionaire_lineups_jev.json` | c0da989 | 54290c39 | 57,851 | ✅ VERIFIED |
| 3 | `week5_millionaire_100k_top1k.json` | 32fe4f3 | cb1df5a0 | 2,035,730 | ✅ VERIFIED |
| 4 | `week5_millionaire_100k_summary.json` | 32fe4f3 | 8e9d85b6 | 3,567 | ✅ VERIFIED |
| 5 | `week5_rayzerr_full_engine.json` | 4366b12 | a12f3118 | 15,480 | ✅ VERIFIED |
| 6 | `week5_rayzerr_single_entry.json` | b709779 | 99ca2495 | 5,057 | ✅ VERIFIED |
| 7 | `GSE_ENGINE_GATE_INVENTORY.md` | f77ac2f | b277ae53 | 22,022 | ✅ VERIFIED |
| 8 | Engine API `api.py` | 4240148 | d54ee555 | 4,763 | ✅ VERIFIED |
| 9 | Engine API `README_API.md` | 4240148 | 1ae2303f | 2,399 | ✅ VERIFIED |
| 10 | `antigravity-jev-process-2026-10-10.md` (agent-bus) | 28d07d4 | 577ed012 | 376,831 | ✅ VERIFIED |
| 11 | Grader files (`rvc_edge5_grade.py`, `jev_rvc_grade.py`, `edge5_crossbook_residual.json`) | ac584d19 / 2925729c | eddfed62 / 7955a5af / f1d4115f | 8,540 / 6,603 / 1,506 | ✅ VERIFIED |
| 12 | `edge5_board_2026-10-11.json` | — | — | — | ❌ **STRANDED** |

All verified artifacts live under `docs/research/2026-10-09/rating-atlas/minis/` on branch `research/rating-atlas-2026-10-09-packet`, except #10 (agent-bus `bus/gse/inbox/`) and #11 (`dfs/` on the research branch).

---

## GAP #1: edge5_board_2026-10-11.json — STRANDED IN CHAT

**What it is:** The EDGE#5 derived-board scanner output — 14 Sunday games with team totals, 1H/2H splits, alt-line probabilities, sigma cells. Garrett pasted the full JSON in chat on 2026-10-11. Hermes reported it as live.

**Where it should be:** `docs/research/2026-10-09/rating-atlas/minis/dfs/edge5_board_2026-10-11.json` on the research branch.

**Where it actually is:** Nowhere on any branch. GitHub code search for `edge5_board` returns 0 results across Beexly/Sports. The `dfs/` directory has the grader and residual files but not the board itself.

**Impact:** HIGH. The board is the input to tomorrow morning's closed-loop diff (derived prices vs DK actuals). Without it on the branch, the diff job has no baseline to compare against.

**Action needed:** Push the board JSON to the branch immediately. The content is in the chat transcript (14 games, `observed_at: 2026-10-11T05:16:28Z`).

---

## COMMIT ACTIVITY (last 48h)

### Beexly/Sports — research/rating-atlas-2026-10-09-packet: 100+ commits
The engine work is all here. Key clusters:
- **DFS optimizer lane:** 643fabe (20 lineups) → c0da989 (JEV 10k sim) → 32fe4f3 (100k scale) → 4366b12 (Rayzerr full engine)
- **EDGE#5 lane:** bfa93171 (grader) → 2f9da9d7 (sign fix) → 6be99238 (armed) → ac584d19 (gateway + poller)
- **JEV RVC lane:** 2925729c99 (grader built, refuse-path proven)
- **Engine upgrades:** OU live WP (e7c110e2), OU θ refinement (95cb179b, f8c9e873), OU v2 empirical attractor (47848be1), equation harvest (0c463549, 88d4d1b5)
- **FreshnessGate:** f794afcf (18 scripts), d45a335c (v2 read_fresh)
- **API:** 42401480 (Flask service)

### Beexly/Sports — main: 19 commits
All X-intel sweeps (PFF grades, matchup cards, analytics). **Zero engine code merged to main in 48h.** The production deploy blocker (migration ledger) remains.

### Beexly/agent-bus — main: 16 commits
- 28d07d4: Antigravity JEV/GSE/GSN extraction (377KB) ✅
- 90eadbb0, 4eb51134, 8d50d032: PR reviews (#1141–1146)
- 6987fd91: Hermes 8-task work order

---

## STRANDED WORK CHECK

- **Local-only files in workspace:** None found. All work was pushed via GitHub API.
- **Unpushed branches:** Not checked (would require local git state). All claimed commits verified on origin.
- **Docs referencing non-existent code:** Not found in this audit's scope. The gate inventory (f77ac2f) honestly labels 15 gates as documented-not-wired.
- **Chat-only data:** `edge5_board_2026-10-11.json` (see Gap #1 above).

---

## HONEST CAVEATS (carried from agent reports)

1. Projections throughout are DK FPPG or salary-derived, not a fitted model.
2. Ownership is a salary-percentile proxy (DK fires no pre-lock ownership XHR).
3. GSE Scores in the DFS files are `sample-vor` (pool-derived), not nflverse processGrade.
4. JEV verdicts are relative heuristics; the live `jev ask` API runs on Garrett's Windows machine only.
5. Pinnacle lines in the Engine API bundle go stale after 2h (FreshnessGate). Need re-pull before London.
6. 15 of 30 engine gates are documented-not-wired (largest: 179 unevaluated prediction-engine modules).

---

## RECOMMENDED ACTIONS

1. **[URGENT]** Push `edge5_board_2026-10-11.json` to the research branch. Content is in chat.
2. Re-pull Pinnacle lines before 8:30 AM CT London kickoff (2h FreshnessGate).
3. Continue PR fix-forward (#1141–1146) — none merged.
4. Resolve production migration-ledger blocker for main deploy.

---

*Audit completed 2026-10-11 ~01:55 CT. Every SHA above was read from origin via GitHub API, not from push exit codes.*
