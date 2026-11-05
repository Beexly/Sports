# TNF `JAX @ BAL` — 360° Full-Board Dossier

**Generated:** 2026-11-05 12:20 CST | **Kickoff:** 7:15 PM CST (2026-11-06 01:15 UTC)
**Board:** DraftKings via ESPN Core (provider 100), event 401873037
**Verdict:** **PASS — zero publishable legs.** No pick, prop, SGP or DFS entry is released from this board.

Source JSON:
- Board: `data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json`
- Review: `data/engine/tnf_jax_bal_360_board_review_2026_11_05.json`
- 10k Sinkhorn: `data/engine/tnf_jax_bal_10k_sinkhorn_2026_11_05.json`
- Jev spine: `data/engine/jev_full_game_spine_tnf_jax_bal_2026_11_05.json`
- PBP reproductions: `docs/predictions/research/2026-11-05/TNF-JAX-AT-BAL-PBP-REPRODUCTIONS.md`

Official ledger: **16-5 (76.2%, +10.45u)** — `data/engine/new_engine_official_ledger_2026.json`.

## Stage 0 — live roster gate

| Check | Result |
|---|---|
| Roster config as-of | 2026-11-04, age 1 day (max 5) — PASS |
| Lamar Jackson (BAL QB) | Out, thumb surgery — hard-excluded |
| Travis Etienne Jr. (JAX RB) | IR — hard-excluded |
| Tyler Huntley / Skylar Thompson | Out / IR — hard-excluded |
| Bhayshul Tuten (JAX RB) | **Questionable, ankle, DNP** — 8 board props converted to PASS |
| BAL QB1 | Joe Fagnano (UDFA rookie, taped ankle) |
| JAX QB1 | Trevor Lawrence |
| Standing rulings | Geno Smith = NYJ; Mike Evans = SF — enforced by config |

## Board inventory

| Metric | Value |
|---|---|
| Total props | **1,453** |
| Market types | **75** |
| Players with props | 34 (plus 138 team-level markets) |
| Two-sided prices | **0** |
| Largest markets | Receiving Yards Milestones (174), Receptions Milestones (85), Team Total Points (78), 1H Receiving Yards (74), Tackles + Assists (63) |

ESPN Core `propBets` publishes target lines without over/under prices. De-vig, CLV and conjunction pricing are therefore impossible on every prop. **G1 price gate fails 1,453/1,453.**

## Stage 2 — full-game Jev spine

| Metric | Value |
|---|---|
| Snaps simulated | **158** (Q1 15:00 → Q4 0:00) |
| Drives | 22 |
| Spine final | JAX 13 – BAL 21 |
| Avg latency | 221.6 ms/snap |
| API cost | $0.01211 |
| Questions per snap | `off_play_call`, `def_shell_call`, `target_carrier`, `snap_outcome` (choice + probabilities), `pressure_disruption` (noul) |

## Stage 2B — 10,000 worlds × 175 snaps

| Metric | Value |
|---|---|
| Simulated snaps | **1,750,000** |
| Median total | **40.29** (market 39.5) |
| Median home margin | **−4.69** (BAL +10 covers on median) |
| Margin σ | 13.50 |
| Total σ | 12.93 |
| Sinkhorn mass moved | 0.1482 |
| P(JAX −10) | 36.85% |
| P(BAL +10) | 63.15% |
| P(over 39.5) | 57.69% |
| P(JAX ML) | 65.30% |

## Stage 3–5 — market gate

| Leg | Model (deflated) | De-vig market | Edge | Gate |
|---|---|---|---|---|
| JAX −10 (−105) | 31.65% | 48.92% | −17.27 | PASS |
| BAL +10 (−115) | 57.95% | 51.08% | **+6.87** | numeric only — BLOCKED |
| JAX ML −520 | 60.10% | 80.43% | −20.33 | PASS |
| BAL ML +390 | 29.50% | 19.57% | **+9.93** | numeric only — BLOCKED |
| OVER 39.5 (−110) | 52.49% | 50.00% | +2.49 | PASS (below 3.0) |
| UNDER 39.5 (−110) | 37.11% | 50.00% | −12.89 | PASS |

Calibration deflation: −5.2 pts, the measured 2026-09-30 level inflation (ranking monotone, level inflated). No CLV floor is asserted.

### Ruling on the two numerically-clearing legs

BAL +10 and BAL ML clear the 3.0-pt numeric gate **only because the sealed baseline is dated 2026-10-25, before Baltimore lost Lamar Jackson (thumb surgery), Tyler Huntley (toe) and Skylar Thompson (IR)**. The model's team ratings do not carry that re-rating; the W1–7 trend override adjusts completion rate but not team strength. The edge is a stale-input artifact, not alpha. Both legs are **PASS (publishAllowed: false)**.

## Prop board

Every prop is **PASS (publishAllowed: false)**:

1. **G1 price gate:** no two-sided price → no de-vig, no fair price, no CLV.
2. **G3 Stage-0 gate:** 8 Bhayshul Tuten props blocked on Questionable/DNP volume risk; Lamar Jackson and Travis Etienne are not listed by the book at all.
3. **G5 provenance gate:** any thesis that depends on BAL dime rate, BAL two-high rate, Lawrence vs two-high regression, RB YBC or A-gap/Fire-Zone attribution is PASS because those inputs are not reproducible from public data (see reproduction receipt).

## What would change the verdict

- A priced prop feed (two-sided over/under) for G1.
- A coverage-shell/personnel charting source (PFF/FTN proprietary or All-22 tracking) for F6.
- A sealed baseline re-sealed after the BAL QB1-out news, so the spread/ML model carries the injury.

Absent those, the honest output is a PASS board. The ledger stays 16-5 / +10.45u; no new unit is risked.
