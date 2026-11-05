# TNF `JAX @ BAL` — 360° Full-Board Dossier

**Generated:** 2026-11-05 14:15 CST | **Kickoff:** 7:15 PM CST (2026-11-06 01:15 UTC)
**Board:** DraftKings via ESPN Core (provider 100), event 401873037
**Verdict:** **PASS — zero publishable legs.** No pick, prop, SGP or DFS entry is released from this board.

Source JSON:
- Board: `data/engine/tnf_jax_bal_dk_full_board_2026_11_05.json`
- Review: `data/engine/tnf_jax_bal_360_board_review_2026_11_05.json`
- 10k Sinkhorn: `data/engine/tnf_jax_bal_10k_sinkhorn_2026_11_05.json`
- Injury sensitivity: `data/engine/tnf_jax_bal_injury_sensitivity_2026_11_05.json`
- Jev spine: `data/engine/jev_full_game_spine_tnf_jax_bal_2026_11_05.json`
- PBP reproductions: `docs/predictions/research/2026-11-05/TNF-JAX-AT-BAL-PBP-REPRODUCTIONS.md`

Official ledger: **16-5 (76.2%, +10.45u)** — `data/engine/new_engine_official_ledger_2026.json`.

## Stage 0 — live roster gate

| Check | Result |
|---|---|
| Roster config as-of | 2026-11-04, age 1 day (max 5) — PASS |
| Lamar Jackson (BAL QB) | Out, thumb surgery — hard-excluded |
| Travis Etienne Jr. | **Not on the 2026 Jaguars roster** (nflverse: NO 31 carries, CAR 8). Retained in the config as a legacy guard; no board impact. |
| Tyler Huntley / Skylar Thompson | Out / IR — hard-excluded |
| Bhayshul Tuten (JAX RB) | **Questionable, ankle + foot, DNP** — 8 board props converted to PASS; modeled as RB1 out |
| BAL QB1 | Joe Fagnano (UDFA rookie, taped ankle) |
| JAX QB1 | Trevor Lawrence |
| Standing rulings | Geno Smith = NYJ; Mike Evans = SF, DNP practice (ribs/achilles) |

## Board inventory

| Metric | Value |
|---|---|
| Total props | **1,453** |
| Market types | **75** |
| Players with props | 37 named athletes + 138 team-level markets |
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
| Median total | **38.64** (market 39.5) |
| Median home margin | **−7.83** (BAL +10 covers on median) |
| Margin σ | 13.50 |
| Total σ | 12.92 |
| Sinkhorn mass moved | 0.1482 |
| P(JAX −10) | 44.03% |
| P(BAL +10) | 55.97% |
| P(over 39.5) | 45.31% |
| P(JAX ML) | 72.05% |

## Stage 3–5 — market gate

| Leg | Model (deflated) | De-vig market | Edge | Gate |
|---|---|---|---|---|
| JAX −10 (−105) | 38.83% | 48.92% | −10.09 | PASS |
| BAL +10 (−115) | 50.77% | 51.08% | −0.31 | PASS |
| JAX ML −520 | 66.85% | 80.43% | −13.58 | PASS |
| BAL ML +390 | 22.75% | 19.57% | +3.18 | BLOCKED: longshot guard (19.57% implied) |
| OVER 39.5 (−110) | 40.11% | 50.00% | −9.89 | PASS |
| UNDER 39.5 (−110) | 49.49% | 50.00% | −0.51 | PASS |

Calibration deflation: −5.2 pts, the measured 2026-09-30 level inflation (ranking monotone, level inflated). No CLV floor is asserted.

### Ruling on the only numerically-clearing leg

BAL ML +390 is the sole leg above +3.0 pts (+3.18 after the 5.2-pt deflation), and it is blocked twice: the Snowberg-Wolfers longshot guard rejects a 19.57% implied longshot, and the model's JAX ML (72.05%) still sits 8.4 points below the de-vigged 80.43%, so the baseline is still under-weighting Baltimore's QB1-out re-rating. Applying the sealed QB1 drop-off (Lamar Jackson out) moved the median from −4.69 to −7.83 and cut BAL +10 from +6.87 to −0.31. The stale-baseline artifact is resolved numerically, not just by ruling.

## Prop board

Every prop is **PASS (publishAllowed: false)**:

1. **G1 price gate:** no two-sided price → no de-vig, no fair price, no CLV.
2. **G3 Stage-0 gate:** 8 Bhayshul Tuten props blocked on Questionable/DNP volume risk; Lamar Jackson and Travis Etienne are not listed by the book at all.
3. **G5 provenance gate:** any thesis that depends on BAL dime rate, BAL two-high rate, Lawrence vs two-high regression, RB YBC or A-gap/Fire-Zone attribution is PASS because those inputs are not reproducible from public data (see reproduction receipt).

## What would change the verdict

- A priced prop feed (two-sided over/under) for G1.
- A coverage-shell/personnel charting source (PFF/FTN proprietary or All-22 tracking) for F6.
- A sealed baseline re-sealed after the BAL QB1-out news, so the spread/ML model carries the injury. (The QB1 drop-off is now applied as a sensitivity; the ML divergence remains.)

Absent those, the honest output is a PASS board. The ledger stays 16-5 / +10.45u; no new unit is risked.
