# Sovereign Audit Report: Detroit Lions at Carolina Panthers (SNF)
**Audit Timestamp:** 2026-10-05T00:57:42.278370+00:00  
**Event ID:** 401872978 | **Kickoff:** 2026-10-05T00:20Z  
**Venue:** Bank of America Stadium, Charlotte, NC | **Weather:** 68.0°F, 5.0 mph wind  
**Standard Stamp:** `ENGINE_GATE_V1`  

---

## 1. Executive Summary

> **CORE VERDICT:** **ZERO FORCED PICKS. 100% FAIL-CLOSED TO ABSTAIN.**
> 
> EVERY candidate prop fails closed to ABSTAIN under real empirical Wilson 95% LCB evaluation. Book lines are heavily inflated compared to legacy tout lines (Gibbs 98.5 vs 74.5, Amon-Ra 7.5 vs 6.5, McMillan 73.5 vs 64.5, Hubbard 66.5 vs 54.5). The legacy script's scalar shortcut 'edge_pct * 0.8' was an invalid tout bypass. Real empirical sample evaluation proves that none of the candidate lines offer a statistically positive 95% Lower Credible Bound (LCB <= 0%). Zero picks forced. Full fail-closed protection.

All candidate propositions evaluated on tonight's Sunday Night Football board between the Detroit Lions and Carolina Panthers were audited through the mandatory 5-Gate Engine (`ENGINE_GATE_V1`), resolving every athlete against live ESPN 32-team rosters cross-checked with the Sleeper NFL player database, and evaluating real empirical outcomes ($n \ge 5$) against the Wilson 95% Lower Credible Bound (LCB).

---

## 2. Live Market Ingestion & Line Movement Audit

- **Official Scoreboard:** Detroit Lions at Carolina Panthers (ESPN Event `401872978`)
- **DraftKings Live Spread:** DET -4.5 (-105) / CAR +4.5 (-115)
- **DraftKings Live Total:** 52.5 (Over -105 / Under -115) [Opened at 45.5 -> **+7.0 points inflation**]
- **DraftKings Moneyline:** DET -225 / CAR +185

Notice that the game total steamed from an open of 45.5 all the way to 52.5, driving widespread public chalk into over-inflated player proposition lines.

---

## 3. Gate 1: Live Roster & Inactive Gate Audit

Per Standing Doctrines 6 and 12, every athlete must be verified against current-season team rosters by stable ID (ESPN primary + Sleeper cross-check) before evaluation. Generational suffixes are identity-bearing.

### Negative Control Test Verification (Mandatory Gate 1 Blocks)
| Athlete Claimed | Claimed Team | Live Verification Status | Gate 1 Reason | Audit Verdict |
|---|---|---|---|---|
| David Montgomery | DET | **BLOCKED** | BLOCK: stale roster -- live team is HOU, not DET espn_id=4035538 | `PROPERLY_BLOCKED` |
| Andy Dalton | CAR | **BLOCKED** | BLOCK: stale roster -- live team is PHI, not CAR espn_id=14012 | `PROPERLY_BLOCKED` |
| Diontae Johnson | CAR | **BLOCKED** | BLOCK: not on any live NFL roster | `PROPERLY_BLOCKED` |
| Saquon Barkley | PHI | **BLOCKED** | BLOCK: Sleeper injury status 'out' espn_id=3929630 | `PROPERLY_BLOCKED` |

**Gate 1 Result:** 100% of planted negative controls (stale traded player, traded quarterback, unlisted free agent, inactive/out starter) were immediately caught and blocked by Gate 1, failing closed to `ABSTAIN` before any math evaluation.

---

## 4. Gate 4: Real Empirical Wilson 95% LCB vs Legacy Tout Bypass

In legacy pick-emitting scripts (e.g. `run_tonight_snf_board.py`), touts relied on a fraudulent scalar shortcut `lcb_edge = edge_pct * 0.8` to manufacture artificial confidence, claiming plays were 'Tier 1 Sovereign Gold'.

Under Law 9 and Standing Doctrine 5, **no scalar shortcuts are permitted**. The Wilson 95% one-sided Lower Credible Bound is calculated strictly from empirical per-game actuals ($n \ge 5$). When books inflate the line, the empirical hit rate crashes and the 95% LCB widens, forcing LCB edge below 0%.

### Side-by-Side Proposition Board Audit
| Regime | Player | Market | Line | Odds | Imp. Prob | Sample $n$ | Hits | Hit Rate | 95% LCB | Point Edge | LCB Edge | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 🔴 LIVE | Amon-Ra St. Brown | receptions | 7.5 | -115.0 | 53.5% | 20 | 10 | 50.0% | 32.7% | -3.5% | **-20.8%** | `ABSTAIN` |
| 🔴 LIVE | Jahmyr Gibbs | rushing_yards | 98.5 | -115.0 | 53.5% | 20 | 5 | 25.0% | 12.7% | -28.5% | **-40.8%** | `ABSTAIN` |
| 🔴 LIVE | Jameson Williams | receiving_yards | 52.5 | -115.0 | 53.5% | 20 | 10 | 50.0% | 32.7% | -3.5% | **-20.8%** | `ABSTAIN` |
| 🔴 LIVE | Tetairoa McMillan | receiving_yards | 73.5 | -115.0 | 53.5% | 21 | 7 | 33.3% | 19.2% | -20.2% | **-34.3%** | `ABSTAIN` |
| 🔴 LIVE | Chuba Hubbard | rushing_yards | 66.5 | -115.0 | 53.5% | 19 | 3 | 15.8% | 6.5% | -37.7% | **-47.0%** | `ABSTAIN` |
| 🔴 LIVE | Chuba Hubbard | receptions | 3.5 | -110.0 | 52.4% | 19 | 3 | 15.8% | 6.5% | -36.6% | **-45.9%** | `ABSTAIN` |
| 🔴 LIVE | Aidan Hutchinson | player_sacks | 0.75 | -135.0 | 57.5% | 20 | 13 | 65.0% | 46.7% | +7.5% | **-10.8%** | `ABSTAIN` |
| 🔴 LIVE | Detroit Lions | team_sacks | 3.5 | -110.0 | 52.4% | 10 | 5 | 50.0% | 26.9% | -2.4% | **-25.5%** | `ABSTAIN` |
| ⚪ LEGACY | Amon-Ra St. Brown | receptions | 6.5 | -120.0 | 54.5% | 20 | 12 | 60.0% | 41.9% | +5.5% | **-12.7%** | `ABSTAIN` |
| ⚪ LEGACY | Jahmyr Gibbs | rushing_yards | 74.5 | -115.0 | 53.5% | 20 | 8 | 40.0% | 24.2% | -13.5% | **-29.2%** | `ABSTAIN` |
| ⚪ LEGACY | Tetairoa McMillan | receiving_yards | 64.5 | -115.0 | 53.5% | 21 | 10 | 47.6% | 31.0% | -5.9% | **-22.5%** | `ABSTAIN` |
| ⚪ LEGACY | Chuba Hubbard | rushing_yards | 54.5 | -115.0 | 53.5% | 19 | 4 | 21.1% | 9.8% | -32.4% | **-43.7%** | `ABSTAIN` |

### Critical Mathematical Observations:
1. **Amon-Ra St. Brown Receptions:**
   - Legacy line 6.5: 12/20 hits (60.0%), but Wilson 95% LCB is 41.9%. Against implied 53.5%, LCB edge is **-11.6%**.
   - Live book line 7.5: hit rate falls to 10/20 (50.0%), Wilson 95% LCB drops to 32.7%, and LCB edge collapses to **-20.7%**.
   - **Verdict:** Inflated line fails closed to `ABSTAIN`.
2. **Jahmyr Gibbs Rushing Yards:**
   - Legacy line 74.5: 8/20 hits (40.0%), point edge -13.5%, LCB edge **-29.3%**.
   - Live book line 98.5 (+24.0 yards inflation): hit rate plummets to 5/20 (25.0%), Wilson LCB is 12.7%, and LCB edge is **-40.8%**.
   - **Verdict:** Severe book inflation trap. Fails closed to `ABSTAIN`.
3. **Tetairoa McMillan Receiving Yards:**
   - Live book line 73.5 (inflated from 64.5): only 7/21 hits (33.3%), Wilson LCB 19.2%, LCB edge **-34.3%**.
   - **Verdict:** Fails closed to `ABSTAIN`.
4. **Chuba Hubbard Rushing Yards & Receptions:**
   - Live rush line 66.5: 3/19 hits (15.8%), LCB edge **-47.0%**.
   - Live receptions line 3.5: 3/19 hits (15.8%), LCB edge **-45.9%**.
   - **Verdict:** Fails closed to `ABSTAIN`.
5. **Aidan Hutchinson Sacks:**
   - Line 0.75 at -135 odds (57.4% implied): 13/20 hits (65.0%), but with $n=20$, Wilson 95% LCB is 46.6%, resulting in an LCB edge of **-10.8%**.
   - **Verdict:** Fails closed to `ABSTAIN`.
6. **Detroit Lions Team Sacks:**
   - Line 3.5 at -110 odds (52.4% implied): 5/10 recent games over 3.5 (50.0%), Wilson LCB 26.8%, LCB edge **-25.6%**.
   - **Verdict:** Fails closed to `ABSTAIN`.

---

## 5. Multi-Leg Same Game Parlay (C-Vine Copula & Higham Repair)

A correlated 3-leg SGP (Amon-Ra Over 7.5 Rec + McMillan Over 73.5 Rec Yds + Hutchinson Over 0.75 Sacks) was evaluated using Canonical Vine Copula simulation with Higham nearest-PSD matrix repair:
- **Legs:** `['live_amonra_rec_7_5', 'live_mcmillan_rec_yds_73_5', 'live_hutchinson_sacks_0_75']`
- **Matrix Repaired:** `False`
- **Fréchet Bounds Compliant:** `True`
- **C-Vine Correlated Joint Probability:** `18.04%` (Fair American Odds: `454`)
- **Parlay Gate Verdict:** **`ABSTAIN`**

> **Fail-Closed Parlay Invariant:** Because all three component legs failed Gate 4 due to negative Wilson 95% LCB edge, the compound parlay immediately fails closed to `ABSTAIN`. Zero corrupt legs may be hidden inside parlay wrappers.

---

## 6. Audit Certification

- **CI Anti-Bypass Static Scan:** Verified 0 violations (`violations() == []`).
- **Sourced Provenance:** All inputs carry verified ISO UTC timestamps and authentic API sources (`espn_core_odds_feed`, `espn_athlete_gamelogs_2025_2026`).
- **GSE Signal Registry:** 47 signals verified across all 8 catalogued families.
- **Law 9 Enforcement:** Zero forced picks. 100% fail-closed adherence.

**Certified by:** Worker 3 (Engine Gate & Roster Enforcement Auditor)  
**Stamp:** `ENGINE_GATE_V1` | **Timestamp:** `2026-10-05T00:57:42.278370+00:00`