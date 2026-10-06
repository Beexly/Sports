# What Wins FanDuel NFL Classic/GPPs — Historical Evidence
**Compiled 2026-09-13 for Week 1 Sun-Mon slate (50-man FanDuel classic)**
Free sources only. Hard data vs analyst opinion labeled throughout.

## Sources used
| Source | What it is | Sample |
|---|---|---|
| NBC Sports "Impact of Stacking in DFS" | Top-10 lineups, DK Millionaire Maker + FD Sunday Million, Weeks 1-17, 2015 season | 160 DK + 170 FD lineups |
| 4for4 "Winning GPP Lineup Review" (weekly series) | DK MM + FD Sunday Million winners, 2019-2022 aggregates | 59 FD winners (2020-22), 52 (2019-21) |
| Footballguys "FanDuel GPP Guide" | 2025 season Sunday Million observations | 2025 season |
| FantasyLabs SimLabs / Billy Ward (2026-09-13) | Week 1 2026 sim-based building blocks, contest-size-aware | Current slate |
| RotoBaller Week 1 stacks (2026-09-10) | Week 1-specific structural advice | Current slate |
| RotoWire Week 1 strategy | Large-field GPP ownership heuristic | Multi-year |
| Haugh & Singal, *Management Science* (2020) | "How to Play Fantasy Sports Strategically (and Win)" — portfolio optimization, opponent modeling, 2017 NFL season | Academic |
| Hunter, Vielma & Zaman (2016) | "Picking Winners in Daily Fantasy Sports Using Integer Programming" | Academic |
| TheHuddle / TheSpun (2026-09-13) | Week 1 slate-specific FLEX/TE takes | Current slate |

---

## 1. Stack rates in winning lineups (HARD DATA)

### NBC Sports study — FD Sunday Million top-10 lineups, 2015 (n=170)
| Stack type | % of FD top-10 lineups |
|---|---|
| QB-WR | **40.59%** (most common, ~2x next) |
| RB-WR (same team) | 20.59% — despite cited **-0.07** correlation |
| Game stack (4+ players, same game) | 15.29% — beat *all* triple stacks combined |
| QB-WR + correlation (bring-back) | 7.06% — "best performing correlation play" |
| QB-WR-TE triple | best-performing triple stack (exact % in chart image, not text) |
| Naked QB | +3.09% more common on FD than DK |
| TE-RB (same team) | +3.46% more common on FD than DK (TD scoring matters more on FD: no 100-yd bonus, 0.5 PPR) |
| RB-DEF + bring-back | <1% — **worst** correlation play in the study |

### 4for4 — FD Sunday Million winners (2020-2022)
- **40 of 42** DK Millionaire winners since Week 1 2020 used a QB stack. (FD sample: every 2022 winner listed used a QB-centric primary stack: QB/TE, QB/WR/WR, or QB/RB/WR/TE.)
- Since Week 1 2020, only **3** FD winning lineups used **fewer than 4 correlated players**.
- Only **5** FD winners since 2020 used a double stack with **no bring-back**.
- Week 1 2022 FD winner: QB/TE primary stack, just 2 correlated players (lowest of the year — Week 1 is weird).

**Translation for the 50-man:** QB + at least one pass-catcher is near-mandatory historically. A bring-back (opposing player from the same game) appears in the overwhelming majority of winners.

## 2. FLEX position in winners (HARD DATA)
| Finding | Source |
|---|---|
| **59% of last 59 FD Sunday Million winners (35/59) rostered 3 RBs** (i.e., RB in FLEX) | 4for4 |
| Week 7 2022: 5th time in 7 weeks the FD winner flexed RB | 4for4 |
| DK side: 54% of top-1% lineups flexed RB vs 39% of field | 4for4 |
| TE-in-FLEX: no winner-rate stat found; TheHuddle (today) endorses "double-tight end" to open salary for 3 WRs; TheSpun suggests Likely at FLEX as "WR-lite" | Analyst opinion, current slate |

**Translation:** RB in FLEX is the historical winner's default. TE-in-FLEX is a legitimate *salary-structure* play (double-TE lets you pay up at WR), not a correlation play — use it when the TE is a genuine value smash (today: Mayer $4,600 with Bowers out; Juwan Johnson $5,400).

## 3. Ownership of winners (HARD DATA)
| Finding | Source |
|---|---|
| 2022 FD winners: **avg cumulative ownership 85.1%** (~9.4% per roster spot) | 4for4 |
| 2019-2021: 22 of 52 FD winners had cumulative ownership **≥120%** [article prints "12%", obvious typo] | 4for4 |
| Week 7 2022 FD winner: 121% cumulative — "chalkiest lineup to win this season" | 4for4 |
| DK Week 7 2022 winner: 189.2% cumulative — highest since 2019 | 4for4 |
| RotoWire: large-field GPPs "historically won with cumulative ownership **under 100%**" | Analyst heuristic |
| Footballguys (2025): "chalk hitting at a higher rate than ever"; Judkins 42% owned was a must-have; JT 20%+ must-have | 2025 observation |

**Translation for the 50-man:** Winners are NOT full-fade lineups — average winner owns ~85% cumulative. In a 50-man you beat 49 lineups, not 100k; the bar is lower and chalk tolerance is *higher* than a Milly Maker. Play the good chalk (Gibbs at 40% is fine); get leverage in 2-3 spots, not 9.

## 4. Winning scores (HARD DATA + inference)
- 2025 Sunday Million: **~225 pts to win**; 200 pts = 83rd place (Footballguys, Week 8 2025).
- Implied 50-man bar: lower — you need roughly the ~98th percentile of 50 lineups, not of 100,000. *Inference, not data:* expect ~170-190 to typically take down a 50-man on a 14-game slate, but build for 200+ anyway (3X salary rule: every player should have a realistic path to 3x salary — Footballguys).

## 5. Academic findings (HARD DATA — peer-reviewed/model-tested)
- **Haugh & Singal (Management Science, 2020):** QB-WR points "strongly positively correlated"; stacking increases lineup *variance*, which is desirable in top-heavy contests. Modeling opponents' ownership was most valuable in top-heavy contests: expected P&L over 17 weeks went $1,400 (benchmark) → $6,000 (full opponent model). In *flatter* payout structures (a 50-man is flatter than a Milly Maker), less variance is required — expectation matters more.
- **Hunter, Vielma & Zaman (2016):** integer-programming lineups won top-heavy hockey contests by maximizing projected points *while forcing high variance via stacking*. Practical recipe: public projections + stack constraints + resolve for distinct lineups.

## 6. Bring-back / run-back theory (HARD DATA + current-slate application)
- NBC: QB-WR + bring-back = 7.06% of FD top-10, "best performing correlation play."
- 4for4: only 5 FD winners since 2020 won a double stack with *no* bring-back — the bring-back is near-universal.
- Logic: if your game stack hits (shootout), the opposing team's pass-catchers also score; if it fails, you lose together — but you only need the *joint* upside in tournaments.
- FantasyLabs Ward (today, Week 1 2026): Olave is the "fairly obvious bring-back" vs DET; alternative construction is "naked Mayfield + Chase + Higgins" (capture Burrow's production without paying for Burrow at 3x ownership).

## 7. Week 1 specifics (mostly analyst opinion — labeled)
- RotoBaller: "In Week 1, passing attacks are notoriously rusty... hunting for **stability**: proven QB-WR chemistry and running backs who command carry volume." ← supports Garrett's "teams default to identity" theory (run teams run, pass teams pass).
- FantasyLabs (Ward, trenches): 2025 data "isn't especially relevant" in Week 1 due to personnel/coaching changes — Week 1 is qualitative; hard matchup data stabilizes ~Week 5.
- RotoWire: Week 1 is the most volatile week; "embrace uncertainty" — among the best weeks to take stands.
- FantasyLabs (Ward, SimLabs): Gibbs 44.1% optimal-lineup rate (next closest <25%); Montgomery gone to HOU, Pacheco on IR → "Gibbs early and often."
- Garrett's identity theory (run teams run / pass teams pass / spread-it-around) is **consistent with** the stability-hunting consensus but is analyst opinion, not measured data. One caution from the data: "spread the ball when they pass" cuts *against* double-stacks on crowded WR rooms — Ward's answer is the "naked QB + opposing WRs" construction (Mayfield naked + Chase/Higgins).

## 8. RB-DST pairing note (HARD DATA)
- NBC: RB-DEF **+ bring-back** <1% — worst play in the study. (If your RB's team is blowing teams out, the opponent scores less — the bring-back dies.)
- RB + *own-team* DST (no bring-back) is a different, viable construction: blowout script → RB clock-killing carries + DST turnovers. 4for4's Week 3 2022 FD winner used QB/TE + RB/WR/DEF.
- For today: JAX DST + no Browns is clean. JAX DST + a Brown bring-back would be the historically bad construction.

---

## Garrett's ideas mapped to the data
| His idea | Data verdict |
|---|---|
| Hockenson + Kyler Murray + Jefferson (MIN double stack) | SUPPORTED — QB + 2 pass-catchers is the classic winner's double stack; QB-WR-TE was the best triple stack in the NBC study. Kyler = rushing floor. |
| Saquon + Goedert + DeVonta Smith (PHI, no Hurts?) | MIXED — if it includes Hurts, it's a QB-WR-TE triple (best triple stack). If it's Saquon + pass-catchers *without* Hurts, note 40/42 winners since 2020 used a QB stack; naked-QB works but usually pairs with a *different* cheap QB + elite WRs, not with the same team's pass-catchers unstacked. Prefer adding Hurts. |
| Gibbs + LaPorta (DET, no Goff?) | WEAK without Goff — TE-RB same-team stacks do over-index on FD (+3.46%), but no QB stack = no primary stack, and <4 correlated players has won 3 times since 2020. Prefer Goff + LaPorta (+ Gibbs as the bring-back/secondary, which is literally Ward's recommended construction today). |
| Mayer cheap with Bowers out | SUPPORTED — every source's free square; TE-in-FLEX is a salary-structure play, and Mayer at $4,600 unlocks Chase/Gibbs. |

---

## Rules that win (6-line summary)
1. **Stack your QB with at least one pass-catcher, always** — 40 of 42 big-GPP winners since 2020 did; QB-WR hit 40.6% of FD top-10 lineups, double the next construction.
2. **Bring one player back from the other team** — only 5 FD winners since 2020 won a double stack without a bring-back; it's the highest-ROI correlation in the data.
3. **Default the FLEX to a third RB** — 59% of recent FD Sunday Million winners did; use TE-in-FLEX only as a salary-structure play (Mayer/Juwan today qualify).
4. **Play good chalk in a 50-man** — winners average 85% cumulative ownership; you beat 49 lineups, not 100k, so eat Gibbs at 40% and find leverage in 2-3 spots, not 9.
5. **Never pair your DST with an opposing bring-back** — sub-1% hit rate, the worst construction in the stacking study; JAX D + zero Browns is the clean version.
6. **Week 1: buy proven chemistry and carry volume, not new schemes** — rust is real, last year's matchup data is stale, and "naked QB + opposing studs" (Mayfield + Chase/Higgins) is the sim-backed way to fade 3x-owned Burrow.
