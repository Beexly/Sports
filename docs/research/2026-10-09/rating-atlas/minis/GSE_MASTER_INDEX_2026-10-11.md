# GSE Master Index — Everything, Everywhere, All In Place

**Compiled:** 2026-10-11 ~02:00 CT
**Purpose:** One page that maps the entire Galaxy Sports Edge system — every artifact from the last 48h, every gate, every edge, every output. Garrett asked for "everything, everywhere, all in place." This is the map.

---

## How to Read This

- **Repo:** Which GitHub repo (`Beexly/Sports` or `Beexly/agent-bus`)
- **Branch:** Which branch (most work is on `research/rating-atlas-2026-10-09-packet`)
- **Commit:** The verified commit SHA where it landed
- **Path:** File path within the repo

---

## 1. DFS Optimizer Outputs

All on `Beexly/Sports` @ `research/rating-atlas-2026-10-09-packet` under `docs/research/2026-10-09/rating-atlas/minis/dfs/`:

| File | Size | Commit | What It Is |
|---|---|---|---|
| `week5_millionaire_lineups.json` | 49 KB | `643fabe` | 20 lineups from the REAL 587-player DK pool (1,079 draftables deduped). Salary-verified, no duplicates. Projections = DK FPPG. |
| `week5_millionaire_lineups_jev.json` | 58 KB | `c0da989` | Same 20 lineups + JEV 10,000 correlated sims on EACH. sim_mean/p50/p90/p99, ceil_ev, dup_risk, tourney_score. Ranked by tourney_score. Top: lineup #5 (tourney 190.2, p99 232.6). GSE Score on all 180 player slots. |
| `week5_millionaire_100k_top1k.json` | 2.0 MB | `32fe4f3` | Top 1,000 of 100,000 unique GPP lineups generated in 63 seconds. QB-stacked, exposure-capped at 25%, GSE-weighted. Best: 184.04 proj (Burrow+Chase CIN stack). |
| `week5_millionaire_100k_summary.json` | 3.5 KB | `32fe4f3` | Proof of 100k unique generation: mean proj 137.5, max exposure 17.7%, salary distribution. |
| `week5_rayzerr_full_engine.json` | 15 KB | `4366b12` | FULL ENGINE breakdown for the Rayzerr 13-game slate (no London). 13-game reasoning, top-5 stacks (#1 BUF@LAR 54.5, #2 DET@ARI 54.5 dome), 6 prop edges, 5 contrarian angles. Final lineup: Drew Lock ($4K) + JSN SEA stack, Monangai, Mason, Collins, Olave, Bowers, Fant, Raiders DST — $49,900, JEV CERTIFIED. Engine overruled mass optimizer's CIN triple-stack after head-to-head sim. |
| `week5_rayzerr_single_entry.json` | 5 KB | `b709779` | Single-entry Rayzerr lineup card (earlier version, superseded by full_engine). |

---

## 2. Engine API (Runnable Service)

**Repo:** `Beexly/Sports` @ `research/rating-atlas-2026-10-09-packet`
**Commit:** `4240148`
**Path:** `docs/research/2026-10-09/rating-atlas/minis/api/`

| File | What It Is |
|---|---|
| `api.py` | Flask service. `GET /health`, `GET /board/nfl` (12 games, real Pinnacle lines), `GET /board/cfb` (frozen model card). Tested with curl — real JSON returned. |
| `README_API.md` | Start instructions: `python3 api.py`, then `curl localhost:8899/board/nfl`. Field docs, caveats. |
| `live_board.py` | Board logic with FreshnessGate + CollegeGuard. Every row labeled `baseline` or `diagnostic overlay`. Zero pick/bet/edge language. |
| `freshness_gate.py` | The gate (verbatim branch copy). Lazy pandas import noted for numpy ABI. |
| `nfl_closing_lines.json` | Real Pinnacle lines pulled 2026-10-11, stamped `observed_at`. **Goes stale in 2h — re-pull before London.** |
| `nfl_games.json` | 12 Week 5 game definitions. |
| `MODEL_CARD_v1.json` | Frozen CFB model card (sigma 15.185, HFA 3.929, CRPS 8.3314). |

**To run:** Clone the branch → `cd docs/research/2026-10-09/rating-atlas/minis/api/` → `python3 api.py` → `curl localhost:8899/board/nfl`

---

## 3. The 30 Gates

**Full inventory:** `GSE_ENGINE_GATE_INVENTORY.md` — `Beexly/Sports` @ `research/rating-atlas-2026-10-09-packet`, commit `f77ac2f`, path `docs/research/2026-10-09/rating-atlas/minis/GSE_ENGINE_GATE_INVENTORY.md` (22 KB)

**Tally:** 30 total — 14 live, 5 partial, 11 documented-not-wired.

### Live Gates (14) — Enforced in Code

| # | Gate | Code Location | What It Refuses |
|---|---|---|---|
| 1 | FreshnessGate | `minis/freshness_gate.py` (branch) | Stale/unstamped data files. Wired across 18 scripts (commit `f794afc`). |
| 2 | Injury Pull Gate | `intelligence/providers/injury_gate.py` (main) | Injury pulls before Friday 18:00 ET. |
| 3 | CollegeGuard | `minis/live_board.py` (branch) | ENTIRE board if CFB params match NFL constants within ±2%. 10 hardcoded constants. |
| 4 | Signal Spine | `apps/web/lib/signals/spine.ts` (main) | N/A (penalties degrade to zero) — shared facts/weights across DFS/waivers/trades/props. |
| 5 | Contest-Shape Guard | `apps/web/lib/fantasy/dfs-signals.ts` (main) | Wrong optimizer objective for contest shape (cash vs GPP vs leverage). |
| 6 | Per-Market Calibration Gate | `apps/web/lib/ops/per-market-gate.ts` (main) | Markets where model < random. ML PASS 1.95x, SPREAD PASS 1.81x, TOTAL FAIL 0.33x. |
| 9 | Selective Abstention | `packages/prediction-engine/src/certificate/selective-abstention.ts` (main) | Publication on empty strata, wide intervals, unreliable predictions. |
| 10 | Proper Scoring Gate | `packages/ingestion-pipeline/src/publish-guards-bridge.ts` (main) | Non-finite p, p outside (0,1), y not in {0,1}. |
| 11 | JEV 10K Sim Engine | `apps/web/lib/fantasy/dfs-correlation.ts` (main) | Incomplete lineups (no sim metrics = no JEV verdict). 10,000 correlated sims, <100ms TS / <5ms Python. |
| 15 | DFS Lineup Validation | `apps/web/lib/fantasy/dfs-lineup-validation.ts` (main) | 9 issue codes: WRONG_SIZE, SLOT_MISMATCH, OVER_CAP, DUPLICATE_ATHLETE, etc. Independent of solver. |
| 16 | Board Gate Rows | `apps/web/lib/board/gate-rows.ts` (main) | Undetermined pick sides, three-way markets, unresolvable fields. Never guesses. |
| 17 | Live Board Honesty Labels | `minis/live_board.py` (branch) | Pick/bet/edge/play language. Every row = `baseline` or `diagnostic overlay`. |
| 18 | Kill Ledger | `minis/kill_ledger.jsonl` (branch) | Nothing directly — auditable refusal trail. 12 entries. Append-only. |
| 19 | GSE Score Honesty | `apps/web/lib/fantasy/gse-score.ts` (main) | Presenting pool-derived scores as live nflverse grades. Labels: `live-process` vs `sample-vor`. |
| 20 | Banned Language Filter | `minis/live_board.py` (branch) | Any board output containing "pick", "bet", "edge", "play". |

### Partial (5)

| # | Gate | Status |
|---|---|---|
| 8 | Model Promotion Gate (Champion/Challenger) | Contract frozen at `docs/frontier/MODEL_PROMOTION_GATE_CONTRACT.md`. Shadow evaluation lane ("Workstream E router") has no implementation on trunk. |

### Documented-Not-Wired (11)

| # | Gate | Status |
|---|---|---|
| 7 | Prediction-Engine Acceptance Gates | 179 modules, 116 `NOT EVALUATED`. Spec at `docs/gates/GATE-SPECS.md` (152 KB). Largest unwired surface. |
| 12 | JEV 5-Gate Mathematical Sieve | Ran in Antigravity Oct 4 (19 signals). Python at `C:/Users/Garrett/onejev/frontier/sports/universal_jev_signal_scanner.py` (Windows only). |
| 13 | JEV Epistemic Arbitration Oracle | Live `jev ask` API on Garrett's Windows. This VM uses labeled heuristics. |
| 14 | GSE Fail-Closed Mandate | Written (Antigravity Tier-A), not enforced in code. |
| 21-30 | Infrastructure/security gates | Age gate, CSRF, in-play guard, durable write, numeric guard, trust gate, evidence guard, calibration scale docs, release gate plan, independence gates. |

---

## 4. The 8 Edges (Measured Intelligence)

These are not gates — they are the measured intelligence that flows through the gates:

| # | Edge | Measurement | Artifact |
|---|---|---|---|
| 1/1b/2 | Laplace margins, σ(T)×spread cells, OT equation | −33% CRPS vs baseline; spread-sign trap documented | `minis/edge1b_edge2_ot.py`, `minis/edge1b_edge2_params.json` (branch) |
| 3 | FG/kicker model | Miss EPA −3.5→−4.8 by distance; Folk +2.49 … Ryland −2.07; 55+ outdoor 62.1% | Engine (Hermes) |
| 4 | Timeout tables | Final-2-min trailing: 10.4% (0 TO) → 14% (1+) | Engine (Hermes) |
| 5 | Derived-board scanner | Team totals, 1H/2H, alt lines for all 14 Sunday games | `edge5_board_2026-10-11.json` (Hermes, bus). **Grader ARMED** — fires at London Final. |
| 6 | Drive-graph derivatives | First-score TD 58–63%; race-to-21 fav 34.6% vs dog 2.8%; KO-return TD 0.23%/kick | Engine (Hermes) |
| 8 | Crew penalty-EPA | Torbert −0.78 → Smith +1.58/game | Engine (Hermes) |
| 9 | Sunday drift | T-60/T-30 snapshots, derived-vs-DK diffs — first closed loop | Runs 2026-10-11 AM (Hermes) |
| 10 | Live CV | OU live WP + mono-depth + audio triggers | Architecture path set (frontier sweep) |

**Engine upgrades shipped 2026-10-11:** Empirical Laplace margin layer (cell-σ → fair alt ladders) + OU live win-probability equation (arXiv 2602.19513, calibrated to √τ law at kickoff). In `minis/engine_math.py` (branch). Selftests pass.

---

## 5. JEV Process Documents

**Master doc:** `Beexly/agent-bus` @ main, commit `28d07d4`, path `bus/gse/inbox/antigravity-jev-process-2026-10-10.md` (377 KB, secret-scanned clean)

Pulled by Hermes from Garrett's Antigravity workspace (Oct 4 session). Contains:
- **Section 0:** TL;DR — JEV is real, TEV/KEV don't exist (452 JEV hits, 0 TEV, 0 KEV)
- **Section 2:** Full text of 29 candidate documents, including:
  - `JEV_AND_10K_SIMULATION_OPTIMIZER_INTEGRATION.md` — the JEV + 10k sim spec (factor model, positional loadings, output metrics, tourney_score formula)
  - `UNIVERSAL_JEV_ARBITRATED_SIGNALS_REPORT.md` — 5-gate sieve + JEV arbitration across 19 signals (7 CERTIFIED, 4 CAUTION, 8 TRAP/REFUSED)
- **Section 3:** Inventory with absolute paths (72 CLI brain artifacts + IDE store)
- **Section 4:** Conversation index (53 CLI conversations flagged for GSE)
- **Sections 5-6:** Evidence excerpts + reproduction commands

**Key finding:** "JEV is a decisions API, not an agent" (Sep 22 correction). The live `jev ask` API runs on Garrett's Windows machine.

---

## 6. Live Board & FreshnessGate

| Artifact | Commit | Path (branch) |
|---|---|---|
| `live_board.py` | `2cd5e0e` | `minis/live_board.py` — honest baseline/diagnostic board, CollegeGuard active, banned language removed |
| `freshness_gate.py` | `f794afc` | `minis/freshness_gate.py` — sole read path, 18 scripts patched |
| `FRESHNESS_GAPS.md` | `f794afc` | `minis/FRESHNESS_GAPS.md` — 16 files lack `observed_at`, format extensions needed |
| Kill ledger #12 | `2cd5e0e` | `minis/kill_ledger.jsonl` — success_agree_rate=1.0000, diagnostic |

---

## 7. Frontier Sweep (arXiv + Kaggle)

**Report:** `shared/gse/FRONTIER_SWEEP_2026-10-10.md` (Hermes)

**BUILD-NOW:**
1. OU live win-probability (arXiv 2602.19513) — T-process dT = θ(μ−T)dt + σdW. **Shipped** into `engine_math.py`.
2. Monocular 3D pose via field registration (2304.04437) — CV live-games backbone.
3. Audio-only event detection GRU (2609.17923) — whistle/crowd/announcer triggers.
4. BDB winners: CHASE (receiver spatial impact) + pre-snap coverage tells (DBSCAN).
5. PINN ball-flight — physics-informed kick trajectory for FG model.
6. NFL impact-detection frames (Kaggle) — CV training data.

**LANE:** CMP count dispersion, spike-and-slab variable selection, diffusion play sim, LLM play-by-play.

---

## 8. Armed Graders (Self-Firing)

| Grader | Commit | Fires When | Pre-registered |
|---|---|---|---|
| EDGE#5 cross-book residual | `ac584d198` (Hermes) | London game goes Final | Kalshi devig 0.765 vs DK-implied 0.7136 (+5.1pp ML) |
| JEV RVC grader | `2925729c99` (Hermes) | Contest 196458728 settles (~4h) | Portfolio vs field percentile, p50/p90/p99, DupRisk proxy |
| Nash NFL prop ladders | `e96bd1e7a3` (Hermes) | **REFUSED** — Akamai walls automated Chrome. Unblock: Garrett's real Chrome + CDP 9222. |

---

## 9. Key Commits (Last 48h)

| Commit | Repo | What |
|---|---|---|
| `f794afc` | Sports (branch) | FreshnessGate wired across 18 scripts |
| `2cd5e0e` | Sports (branch) | live_board.py + kill ledger #12 |
| `56f677b` | Sports (branch) | Corrected metrics (CPOE r=0.9659, success agree 1.0000) |
| `4240148` | Sports (branch) | Engine API (Flask, tested with curl) |
| `643fabe` | Sports (branch) | 20 Millionaire lineups (real 587-player pool) |
| `c0da989` | Sports (branch) | 20 lineups + JEV 10k sims |
| `32fe4f3` | Sports (branch) | 100k lineups (top 1k + summary) |
| `b709779` | Sports (branch) | Rayzerr single-entry lineup |
| `4366b12` | Sports (branch) | Rayzerr full engine breakdown |
| `f77ac2f` | Sports (branch) | Gate inventory (30 gates) |
| `28d07d4` | agent-bus (main) | Antigravity JEV process doc (377 KB) |
| `ac584d198` | Sports (Hermes) | EDGE#5 grader armed |
| `2925729c99` | Sports (Hermes) | JEV RVC grader armed |
| `e96bd1e7a3` | Sports (Hermes) | Nash prop ladders refused (unblock stamped) |

---

## 10. What's Still Open

1. **Pinnacle lines go stale** — `nfl_closing_lines.json` has a 2h FreshnessGate. Re-pull before London (8:30 AM CT).
2. **Nash prop ladders** — needs Garrett's real Chrome + CDP 9222 (4-step unblock stamped).
3. **179 prediction-engine modules** — acceptance gates specified, not evaluated. Largest unwired surface.
4. **JEV arbitration on Windows** — live `jev ask` not reachable from VM. Heuristics labeled as such.
5. **Model promotion shadow lane** — contract frozen, implementation missing.
6. **Fail-closed mandate** — written, not enforced in code.
7. **SiriusXM cron** — still uses dead audio method, needs transcript-panel rewrite before 5:00 AM CT.
8. **Production deploy** — blocked on Prisma migration ledger (53 squashed migrations, DB still has old rows).

---

*This index is the map. The engine is the territory. Both are growing.*
