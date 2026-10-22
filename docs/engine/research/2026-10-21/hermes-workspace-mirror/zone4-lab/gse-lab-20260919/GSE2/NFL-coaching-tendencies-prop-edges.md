# NFL Coaching / Tendency Prop Edges

**Research Summary — Play-calling biases, 4th-down rates, clock management**

*Sources: nfeloapp, SumerSports, ESPN, Wharton Sports Analytics, Yale Sports Analytics Group, Sports Info Solutions, 4for4, Sharp Football Analysis, StatsbyLopez, Harvard Sports Analysis Collective, Jake Fisher (Pro Football Focus)*

---

## Edge 1: Run-After-Pass Alternation Bias (Recency / Small-Sample Fallacy)

**What it is:** NFL coaches systematically alternate play types after a pass, believing they need to "even out" run/pass balance. This is driven by **recency bias** and the **small-sample fallacy** — the impulse to overcorrect after a single play rather than maintaining true game-theory-random sequences.

**Data (key stats):**
- Teams are **~25% more likely to run** after a pass play compared to random expectation (StatsbyLopez, 2016; 2000–2015 data).
- **Absolute run-rate difference: ~12 percentage points** when the prior play was a pass.
- On **2nd & longs** specifically, teams rush **44% more often** (19% absolute) after a 1st-down pass — the largest effect size observed.
- The **2nd-and-10 rush spike** (which disproportionately follows an incomplete 1st-down pass) was significant at **p < 0.00005** across 20,000+ plays (Jesse Galef/Advanced Football Analytics, 2017).
- Harvard Sports Analysis model achieved **~70% accuracy** predicting run vs. pass using just game-state variables (time, score, field position, down/distance), well above the 57% baseline of always guessing pass.

**Coaching psychology:** Coaches fear looking "predictable" or "one-dimensional" in small samples, so they overcorrect. If a team passes on 1st down, the defense *expects* a run on 2nd down — but the coach's own bias makes that expectation *correct*, making the offense predictable.

**Prop betting edge:**
- **RB receptions / targets**: Slightly *over*valued immediately after a pass play (lower rush likelihood than perceived) — contrarian angle.
- **QB rushing yards**: *Under* after a 1st-down pass (coaches rush more → QB scrambles drop).
- **2nd-down play-type markets**: If 1st-down call was a pass, lean **run** — but only when the result was *not* a big gain (coaches still overcorrect after successful passes ~75% of the time).
- **Over/under rushing attempts**: In games where Team A passes frequently early, the run rate rebounds higher than neutral models predict.

**Teams most prone:** Historically run-heavy coaches (Bill O'Brien, Sean McVay pre-2023, Mike Tomlin) show the strongest alternation signatures.

---

## Edge 2: 4th-Down Conversion Probability Miscalibration (Conservatism Gap)

**What it is:** NFL coaches systematically **underestimate** 4th-down conversion probabilities, leading to overly conservative decision-making relative to analytics-optimal choices. This creates a gap between expected and actual outcomes that prop lines often fail to price in real-time.

**Data (key stats):**
- **4th-and-5**: Coaches' subjective estimate ≈ **33–37%; Actual base rate = 42.7%** (43.7% for evenly-matched teams after selection-bias adjustment — Wharton Sports Analytics, 2024).
- **4th-and-4**: ~**50%** conversion probability for a favored offense (Wharton model).
- **4th-and-8**: ~**40%** for a favored offense (vs. coaches' intuition of ~30%).
- **4th-and-1**: ~**70%** conversion rate league-wide.
- **4th-and-2**: ~**55–60%** in recent seasons.
- **League-wide go-for-it rate**: ~**34%** (up from ~20% in the early 2010s, per ESPN/4th Down Bot).
- **Coach-level repeatability**: SumerSports' "right decision over expected" metric for 4th downs shows a **0.247 year-to-year correlation** across 199 coaches (2014–2022 each with 50+ decisions), indicating this is a **repeatable, identifiable coach skill** — not noise.

**Coach profiles:**
- **Most aggressive**: Dan Campbell (Lions), Sean McVay (Rams), Nick Sirianni (Eagles) — Lions led the league in 4th-down attempts for multiple seasons.
- **Most conservative**: Bill Belichick (pre-2024), Sean Payton (post-Denver), older-school coaches — consistently below league-average go-for-it rate.

**Prop betting edge:**
- **Game totals**: In matchups where the *underdog* coach is conservative and the *favorite* is aggressive, unders cash more often (fewer scoring drives from failed 4th-down attempts).
- **First-down market**: When aggressive coaches are involved, the **over** on first downs hits more frequently.
- **Anytime TD scorers**: Short-yardage rushers (goal-line backs) on aggressive-offense teams see inflated TD rates.
- **Player rushing over**: On teams that go for it more often inside the 10, the lead RB's rushing TDs spike vs. FG-only teams.

---

## Edge 3: Timeout Mismanagement & Home-Road Asymmetry

**What it is:** NFL coaches waste timeouts at different rates depending on venue. **Home teams force road teams into early-timeout situations** (primarily to avoid delay-of-game from crowd noise), then **conserve timeouts** for the critical end-of-half moments. This creates a systematic home-road asymmetry in clock-control resources.

**Data (key stats):** (Yale Sports Analytics Group, 2017; 2009–2015 data)

- **Early-half timeout usage** (12:00 to 2:00 remaining in half):
  - **Road teams use significantly more timeouts** than home teams in this window.
  - **85% of these early-half timeouts** are used to avoid delay-of-game — a preventable waste.
- **Last 2 minutes of each half**:
  - Home teams use **more timeouts** than road teams in the final 2:00.
  - Home teams are **more aggressive** at the end of halves; road teams adopt a "preserve-and-hope" mindset.
- **End-of-game (last 7 minutes of 4th quarter)**:
  - Road teams initially use more timeouts (to stop the clock and get the ball back).
  - But home teams — who win more often — have **more timeouts available** for their own final drives.

**Mechanism:** Crowd noise forces the visiting offense to call timeout before the snap, burning one of three precious second-half timeouts. Coaches then enter end-game situations with fewer tools to manage the clock.

**Prop betting edge:**
- **End-of-half scoring props**: Road teams underperform projected points in the final 2 minutes of the half (fewer timeouts = fewer opportunities = lower-scoring 2-minute drills).
- **Total plays in 2-minute drills**: *Under* for road teams, *over* for home teams.
- **Timeout-related markets** (if offered): Road team timeout over is overvalued — they typically finish with fewer used in critical moments.
- **Game-clock stoppages**: In games where the road team needs a late comeback, expect *fewer* clock-stoppage opportunities due to timeout depletion.

---

## Edge 4: No-Huddle / Tempo Extremes

**What it is:** NFL teams exist on a wide spectrum of offensive tempo, from slow-possession grinders to no-huddle chaos agents. **Outlier-teams at either extreme create predictable statistical distortions** that prop markets adjust for slowly.

**Data (key stats):** (nfeloapp, Sharp Football Analysis, 4for4, 2025 data)

| Team | No-Huddle Rate | Notes |
|------|---------------|-------|
| **Commanders** | **61.6%** | Extreme outlier — excluded from 4for4's pace graph because they were "in their own stratosphere" |
| Saints | 22.8% | Highest among traditional offenses |
| Giants | 20.8% | High-tempo, but personnel-limited |
| Eagles | 18.5% | Fast tempo, high-variance |
| **Dolphins** | ~3.7–12.2% | Among slowest-paced teams (deliberate) |
| **Patriots** | **2.4%** | Slowest; methodical, low-play-volume approach |
| **Chiefs** | 2.7% | Slow tempo, high-efficiency (not volume) |

- **Pace impact**: Slow-tempo teams (Patriots, Dolphins, Chiefs) average **3–5 fewer offensive plays per game**, while fast-tempo outliers (Commanders, Saints) average **5–8 more plays**.
- **Target concentration**: No-huddle/frequent-play teams concentrate targets on fewer receivers (higher target share per game). Fast tempo reduces defensive substitution options.
- **Variance effect**: High-tempo offenses produce **higher week-to-week variance** in player props — great for gambling when the market assumes mean reversion.

**Prop betting edge:**
- **Player reception/touch over/under**: Fast-tempo teams (Commanders, Saints) → **over on volume-based props** for top-3 receivers/RBs. Slow-tempo teams (Patriots, Chiefs) → **under**.
- **Total game plays**: Over/under lines are slow to adjust to coaching changes (e.g., Commanders' 61.6% no-huddle rate was not fully priced in pre-2025 season).
- **QB sack totals**: Fast-tempo QBs face slightly fewer pressures per attempt (quicker decisions) but more total chances — net neutral on sacks, *over* on attempts/completions.

---

## Edge 5: Red Zone Run > Pass Efficiency (Counter-Intuitive Bias)

**What it is:** **In the red zone, running the ball is statistically MORE successful than passing** — the inverse of the rest of the field. Yet coaches continue to pass disproportionately (~55–60% on red-zone 3rd/4th-and-short), creating exploitable inefficiencies in red-zone prop markets.

**Data (key stats):** (Sports Info Solutions, 2024; Reddit OC analysis, Sharp Football Analysis)

- **Red zone success rate**:
  - **Rushing**: **46.2%** (2018–2023 average)
  - **Passing**: **42.1%** (2018–2023 average)
- **Non-red zone success rate** (for contrast):
  - **Passing**: **46.7%**
  - **Rushing**: **40.5%**
- **2024 red zone passing success**: Dropped to **37.3%** (worst in a decade) due to defensive "2-high" schemes compressing space.
- **Red zone on-target %**: **68.5%** (vs. **78.7%** outside the red zone) — QBs struggle with accuracy in tight quarters.
- **Red zone 3rd/4th-and-short**: Teams pass **just over 55%** of the time, despite runs producing a **12% success-rate disadvantage** relative to passes in *open field*. Inside the red zone, the equation flips.

**Root cause:** Coaches' mental model defaults to "pass = better" because passing works everywhere else on the field. The compressed geometry of the red zone (narrower passing windows, shorter fields = fewer deep opportunities) isn't reflected in their play-calling bias.

**Prop betting edge:**
- **Over on red-zone RB rushing/TD props**: Teams that run more in the red zone (Ravens, 49ers, Titans historically) see their lead back outproduce pass-heavy offenses' RB TD totals.
- **Under on red-zone WR TD props**: The inverse — high-aDOT WRs on pass-heavy red-zone offenses *underperform* their goal-line TD projections.
- **Red zone field goal attempts**: *Over* — inefficient passing leads to more FG opportunities for offenses that should be scoring TDs.
- **Total points in games with weak rushing offenses**: *Under*, especially if the opposing defense is strong against the run (forcing more obvious passing downs).

---

## Quick Reference: Team Tendency Outliers (2025)

| Edge Area | High Side (Exploit) | Low Side (Fade) |
|---|---|---|
| **4th-down aggression** | Lions, Eagles, Rams | Patriots, Cowboys, Steelers |
| **No-huddle tempo** | Commanders (61.6%), Saints (22.8%) | Patriots (2.4%), Chiefs (2.7%) |
| **Pass-heavy (PROE+)** | Cardinals (+4.0%), Chiefs (+4.0%), Rams (+3.0%) | Jets (-8.8%), Ravens (-8.8%), Dolphins (-5.8%) |
| **Run-heavy (PROE-)** | Ravens (-8.8%), Jets (-8.8%) | Cardinals (+4.0%), Chiefs (+4.0%) |
| **Motion rate** | Falcons (67.2%), Rams (62.8%), Jaguars (60.6%) | Seahawks (54.1%), Giants (38.7%) |
| **Play-action rate** | Rams (21.3%), Bears (19.9%), Colts (19.0%) | Commanders (49.3%), Giants (38.7%) |

---

## Verification Notes

- **4th-down data** sourced from Wharton Sports Analytics (Sept 2024) + SumerSports In-Game Coaching Model (Feb 2023) + ESPN game-management cheat sheet.
- **Alternation bias** sourced from StatsbyLopez (2016) + Jesse Galef/AdvancedNFLAnalytics (2017) + Harvard Sports Analysis Collective (2016: 70.3% prediction accuracy).
- **Timeout/home-road** sourced from Yale Sports Analytics Group (April 2017: 2009–2015 data).
- **Red-zone run > pass** sourced from Sports Info Solutions (Sept 2024) + Sharp Football Analysis.
- **Tempo/no-huddle** sourced from Sharp Football Analysis (2025 tendencies) + nfeloapp team tendencies + 4for4 (2026 preseason analysis).
- All data reflects 2021–2025 season trends unless otherwise noted. Coach personalities and tendencies shift with staff changes — always verify current play-caller before betting.
