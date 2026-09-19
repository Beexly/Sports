# NFL Depth Charts + Snap Count Edge Analysis
## How OL Personnel, TE/WR Rotation, and RB Timeshare Create Prop Edges

> **Source:** Multi-source research (SumerSports, PFF, FantasyPros, Rotowire, Footballguys, ESPN, 4for4, OddsIndex, Sharp Football Analysis)
> **Date:** 2026 NFL Season (2025 data baseline)

---

## DATA SOURCES AT A GLANCE

| Source | What It Provides | Access Level |
|---|---|---|
| **SumerSports** | Personnel tendency stats (11/12/13/21/22 personnel rates, EPA per package) | Free |
| **Pro Football Reference** | Game-level snap counts for all players (since 2012) | Free |
| **FantasyPros** | Snap count leaders & analysis reports (snap %, rush %, tgt %) | Free tier + premium |
| **Rotowire** | Weekly snap counts, sortable tables | Subscribers-only for full data |
| **Footballguys** | Snap counts by team, game logs, depth charts | Free tier + premium |
| **PFF Betting Tool** | Cover probability, hit rates vs similar defenses, projection models | PFF+ subscription |
| **NFLPlayerSnaps (X)** | Real-time snap count tweets from NFL GSIS | Free |
| **ESPN Depth Charts** | Live depth chart updates, personnel groupings analysis | Free |

---

## 1. OFFENSIVE LINE PERSONNEL & PROP EDGES

### Core Principle
Starting QBs and the 5 starting offensive linemen play 100% of offensive snaps when healthy. **Any mid-game deviation from 95%+ snap share is an immediate injury/benching signal** — this is the strongest real-time edge indicator in prop betting.

### OL Health Metrics & Edge Framework

**The "Snap Percentage Drop" Signal (Mile High Report):**
- Starting OL players typically play 90%+ of snaps when healthy
- A drop below 80% snap share mid-game = injury or performance benching
- Teams that lose OL starters see cascading negative effects:
  - RB rushing yards decrease (20-30% drop with backup-tier OL)
  - QB pressure rate spikes (pressure rate allowed correlation = 18.2%)
  - Sack frequency increases (adjusted sack rate correlation = 38.4%)

**OL Health Score Methodology:**
- Weight players with 90%+ snaps at 3x
- Add players with 80%+ snaps at 1x
- Subtract players with >20% snaps
- Score ranges from ~-18 (worst: 2022 Rams, 15 OL used) to 13 (best: 2019 Colts, all 5 started every snap)
- Average team uses 10 OL per season; 15+ = severe injury crisis

### OL Metrics Correlation to Fantasy Points (4for4)

| O-Line Metric | Full League Correlation | Top-10/Bot-10 Only | Fantasy Impact |
|---|---|---|---|
| **Adjusted Line Yards** | 43.1% | 49.4% | Best predictor of RB success |
| **Adjusted Sack Rate** | 38.4% | 51.2% | Strongest predictor when isolated |
| **RB Yards Before Contact** | 32.4% | 50.2% | Direct RB yardage driver |
| **Blown Block Rate** | 24.5% | 24.5% | Consistent across samples |
| **QB Pressure Rate Allowed** | 18.2% | 22.5% | Moderate correlation |
| **# of OL Penalties** | 11.4% | 17.3% | Weak but directional |
| **# of OL Starters** | 4.0% | 6.0% | Weak signal |

### OL Personnel Sub Packages & Edges

**Run-Heavy Packages (13 personnel — 1 RB, 3 TE, 1 WR):**
- Teams like Rams use extra tight ends as blockers
- Creates 8-on-7 box advantages for run plays
- **Edge:** RB rush share spikes; opposing run defense DVOA degrades; WR/TE receiving props go UNDER

**Protection Packages:**
- 6-man protection (6 OL): reduces targets to RBs/TEs by ~20% (chip block responsibilities)
- 5-man protection: standard, maintains normal route distribution
- **Edge:** When OL is struggling, QB may use more RBs/TEs in protection → receiving yardage props for slot WRs go OVER (targets shift to other receivers)

**Backup Substitution Patterns:**
- Right tackle and left guard are most injury-prone positions
- When RT backup enters, QB hurry rate increases 15-20%
- When LG backup enters, run game efficiency drops 8-12% (affecting RB and TE screen game)
- **Edge:** OL injury news → immediately fade RB rushing yards OVER and bet QB pressure/sack props

### OL Depth Chart Monitoring (Key Teams to Watch)

| Team | OL Vulnerability | Impact on Props |
|---|---|---|
| **LAC** | Slater/Alt injury history | QB sack/rush attempts props volatile |
| **DEN** | Williams/McLaughlin depth | RB rush share fluctuates wildly |
| **DET** | Sewell at new position (LT) | Adjustment period → short-term edge on UNDER for QB pocket time |
| **CAR** | Settled OL, depth concerns | RB receiving props more reliable early season |
| **JAX** | Unsettled interior | Trevor Lawrence O/U difficult to project early |

---

## 2. TE / WR ROTATION PATTERNS & PROP EDGES

### Personnel Groupings Reference

| Grouping | Composition | League Usage | TE Impact | WR Impact |
|---|---|---|---|---|
| **11 personnel** | 1 RB, 1 TE, 3 WR | ~56% league avg | TE runs routes on 86% of dropbacks | WR competition highest (3 WRs vs 1 TE) |
| **12 personnel** | 1 RB, 2 TE, 2 WR | ~22% league avg | TE runs routes on 76% of dropbacks; 1.60 YPRR | WR competition moderate (2 WRs vs 2 TEs) |
| **13 personnel** | 1 RB, 3 TE, 1 WR | ~5% league avg | TE routes on ~65% of dropbacks; blocking focus | WR3 essentially disappears |
| **21 personnel** | 2 RB, 1 TE, 2 WR | ~6% league avg | TE competes vs 2 RB + 2 WR | Slot WR/WR2 most affected |
| **22 personnel** | 2 RB, 2 TE, 1 WR | ~1% league avg | TE in heavy run game, limited targets | WR1 only real receiving threat |

### TE Rotation Patterns

**11 vs 12 Personnel TE Value (Hayden Winks analysis):**
- **11-personnel TE:** Competes against 3 receivers for targets → lower per-route efficiency (1.30 YPRR, 0.25 FPPRR) but higher route volume
- **12-personnel TE:** Competes against 1 other TE + 2 WRs → better per-route efficiency (1.60 YPRR, 0.31 FPPRR) but fewer routes per dropback (76% vs 86%)
- **Net result:** Fantasy points per passing snap nearly identical (~0.22 in 11-personnel, ~0.24 in 12-personnel)
- **Edge:** TE must play in BOTH 11 and 12 personnel to maximize value. TE who only plays 11-personnel is volume-dependent; TE who only plays 12-personnel is efficiency-dependent but lower floor

### TE Archetype Classification

**Route/Run Ratio is the Key Metric:**
- **Pass-catching TEs** (60%+ routes per snap): Mike Gesicki (66.9%), Eric Ebron (66.7%), Jimmy Graham (66.0%), Mark Andrews (65.4%)
- **Balanced TEs** (40-60% routes per snap): Travis Kelce (56.0%), Darren Waller (51.2%), George Kittle (51.1%)
- **Blocking TEs** (<40% routes per snap): Jonnu Smith (35.1%), Tyler Higbee (36.8%)

**Target Rate per Route Run (Critical for TE props):**
- Elite: Andrews (25.5%), Kelce (22.6%), Waller (22.1%), Kittle (24.9%)
- Mid-tier: Hooper (17.2%), Howard (15.7%)
- Low: Gesicki (15.1% despite 66.9% route rate — volume compensates)

### WR Rotation Patterns

**The "Slot Receiver Spike" (Fantasy History Data):**
- When WR1/WR2 injury sidelines a starter, the slot receiver's target share jumps from **12-15% to 22-26%** for 3-5 weeks
- Duration: Typically persists for 4-6 games until defenses adjust or starter returns
- **Edge:** Bet WR3/slot OVER on targets/receiving yards immediately after WR1 injury news

**Snap Share Thresholds for WRs:**
- **90%+**: Every-down starter (DeVonta Smith, A.J. Brown)
- **75-89%**: Core starter, occasional sub-package removal
- **50-74%**: Rotational/backup role, game script dependent
- **Below 50%**: Depth role, limited value

**Route Participation Rate:**
- A WR with 85% snap share but <70% route rate = run blocker/decoy (low fantasy value)
- A WR with 65% snap share but >90% route rate = efficient route runner on passing downs
- **Edge:** Players with high route rate but lower snap share are better targets for OVER props (coaches deploy them in optimal situations)

### TE/WR Depth Chart Monitoring

| Team | Rotation Change | Edge Direction |
|---|---|---|
| **ATL** | 12-personnel emphasis (Stefanski system) | TEs gain value, slot WR target share decreases |
| **KC** | Kelce aging, more 12-personnel looks | TE2 emergence potential, WR3 target share may increase |
| **BUF** | Dalton Kincaid taking on larger role | TE Over props; Gabriel Davis replacement affecting WR order |
| **TB** | Moving from 11 to 12 personnel | Cade Otton target share up; WR3 volume down |
| **MIA** | Tyreek Hill declining, Waddle/Jackson primary | WRs competing for targets; TE improves as safety valve |
| **NO** | Juwan Johnson leaving, new TE room | Slot receiver target spike; TE opportunity opening |

---

## 3. RB TIMESHARE DYNAMICS & PROP EDGES

### Bell Cow vs. Committee Classification (Footballguys "Gibbs Split")

| Classification | Criteria | Annual Prevalence | Fantasy Value |
|---|---|---|---|
| **Bell Cow** | 15+ games, 67%+ snap share | ~4-6 RBs/year | High floor, RB1-RB2 ceiling |
| **Committee Leader** | 16+ games, 50-67% snap share | ~8-10 RBs/year | RB2 flex value, boom/bust |
| **Committee Member** | <50% snap share, <110 carries | ~12-15 RBs/year | RB3/FLEX dart throw |

### Bell Cow Performance (2021-2024)

| Metric | Average Season |
|---|---|
| Games Played | 16.5 |
| Snap Share | 74.5% |
| Half-PPR PPG | 15.7 |
| Total Half-PPR | 258.3 |
| Age | 24.8 |
| % Finishing as RB1-12 (PPG) | 63.1% |
| % Finishing as RB1-12 (Total) | Higher (volume compensates) |

**Key Insight:** 36.9% of bell cows fall to RB2 PPG despite RB1 total points (injury/games played factor). True bell cows (>300 half-PPR points): McCaffrey (2x), Barkley, Robinson, Taylor, Jacobs.

### Committee Backfield Analysis (2024)

#### Tier 1 Committee (Both RBs Viable Starters)
- **Detroit (Gibbs + Montgomery):** Gibbs 250 carries/RB1, Montgomery 185 carries/RB18. Both 15+ PPG. Best committee in NFL.
- **Tampa Bay (Irving + White):** Irving 207 carries (more touches, RB13), White 144 carries (higher snap %, RB22). Both 12+ PPG.
- **Seattle (Charbonnet + Walker):** Both injured/traded. Walker missed 6 games. Combined output mediocre.

#### Tier 2 Committee (Clear RB1 + FLEX RB2)
- **Pittsburgh (Harris + Warren):** Harris 263 carries, 49% snaps (goal-line/early down), Warren 120 carries, 8.3 PPG flex appeal.
- **Buffalo (Cook + Davis):** Cook 207 carries, 16.7 PPG RB8, Davis 113 carries, 6.8 PPG (26% snaps, receiving role).
- **New England (Stevenson + Gibson):** True 50/50 snaps, both 33%+. Stevenson 11.7 PPG, Gibson 6.1 PPG.
- **Jacksonville (Etienne + Bigsby):** Near-even carries (150 vs 168), both mediocre (8.7 vs 8.1 PPG).

#### Tier 3 Committee (Starter + Handcuff)
- **Atlanta (Robinson + Allgeier):** Robinson dominates (RB3), Allgeier RB43. Clear 1A/1B.
- **Denver (Williams + McLaughlin):** Williams 47% snaps/139 carries, McLaughlin 24% snaps/113 carries. Neither broke 10 PPG.
- **NY Giants (Tracy + Singletary):** Tracy 192 carries (RB26), Singletary 113 carries (RB46). Clear 1A/1B.

### RB Timeshare Edge Framework

#### 1. Carries vs. Snaps Imbalance
When one RB has more carries than snaps relative to teammate:
- **Signal:** Early-down/goal-line back role (high-value touches)
- **Edge:** Bet OVER on rushing yards for high-carry RB; bet UNDER on receiving for low-carry/high-snap RB
- **Example:** Jaylen Warren had 120 carries but 49% snaps vs. Najee Harris's 263 carries at 49% snaps. Harris is the goal-line/early-down back.

#### 2. Snap Share > Rush Share
When RB plays more snaps than carries suggest:
- **Signal:** Passing-down specialist (targets/receptions value)
- **Edge:** Bet OVER on receptions/receiving yards for this player

#### 3. Multi-Week Snap Share Shifts
- **Signal:** Coaching staff expanding/contracting a player's role
- **Threshold:** 3-4 week upward trajectory in snap share = role expansion
- **Edge:** Enter OVER positions before the market adjusts (typically lags 1-2 weeks)

#### 4. Third-Down/Two-Minute Role
- **Signal:** The RB who stays in during obvious passing situations
- **Edge:** This RB's receptions prop has higher floor than rushing yards for same-backfield companion

### RB Timeshare Warning Signs

From Week 6 2025 data (Yahoo Sports):
- **Snap share < 50% for 3+ consecutive games** = committee confirmed (fade OVER props, target UNDER)
- **Target share dropping while snap share rises** = role becoming run-only (fade receiving OVERs)
- **Carries > 15 but snap share < 40%** = goal-line back only (bet TDs/special teams OVER; receiving UNDER)
- **Single-game snap spike** (15%+ increase) = likely injury to starter or game script (bet next 2-3 games before regression)

### Current RB Timeshare Situations to Monitor (2026)

| Backfield | RB1 | RB2 | Snap Split | Edge |
|---|---|---|---|---|
| **Lions** | Jahmyr Gibbs | Isiah Pacheco | 70/30 (proj) | Gibbs OVER; Pacheco UNDER except goal-line |
| **Bucs** | Bucky Irving | Kenny Gainwell | 65/35 (proj) | Irving OVER carries; Gainwell OVER receptions |
| **Steelers** | Najee Harris | Jaylen Warren | 55/45 | Harris goal-line OVER; Warren receiving OVER |
| **Raiders** | Alexander Mattison | Zeke | 50/50 (proj) | Avoid; high variance |
| **Cowboys** | Javonte Williams | Jaydon Blue | 75/25 (proj) | Williams OVER; volatility on backup |
| **Packers** | Josh Jacobs | MarShawn Lloyd | 70/30 (proj) | Jacobs OVER; Lloyd only value with injury |
| **Titans** | Tyjae Spears | TreVeyon Henderson | 45/55 | Henderson emerging; Spears fade |
| **Seahawks** | Jadarian Price | Zach Charbonnet | 60/40 | Price OVER; Charbonnet injury-dependent |
| **Commanders** | Brian Robinson | Austin Ekeler | 50/50 | Pure committee — avoid OVERs on yardage |

---

## ACTIONABLE EDGE CHECKLIST

### Pre-Game (Snap Count Phase)
1. Check OL snap share from previous game — any starter below 90% = injury/sub signal
2. Verify TE/WR rotation alignment (11 vs 12 personnel) via team tendencies
3. Review RB snap-to-carry ratio — identify passing-down vs rush-first backs
4. Cross-reference depth chart with injury reports for backup activation impact

### In-Game (Live Betting Window)
1. OL substitution in first half → immediately bet QB sacks/rush attempts UNDER, RB rushing UNDER
2. TE rotation shift to 12 personnel → TE receiving OVER, WR3 receiving UNDER
3. RB snap share spike (10%+ above norm) → bet corresponding over before books adjust
4. Third-down personnel → identify pass-catching RB or slot WR for targets OVER

### Post-Game (Market Preparation)
1. 3-game snap share trend — upward trajectory = role expansion (bet OVERs before line moves)
2. Snap share decline (10%+ drop) = role contraction (bet UNDERs before market adjusts)
3. Personnel grouping shifts — teams adding 12/13 personnel = TE value increase
4. OL health deterioration — track number of OL used; 12+ = crisis, bet RB UNDERs

### Key Data Points to Monitor Weekly
- **OL Snaps:** 100% expected for starters; <90% = red flag
- **TE Route Rate:** Must be >60% to justify receiving props (cross-check with snap share)
- **WR Route Participation:** >85% snap share with <70% route rate = decoy (fade receiving props)
- **RB Carry/Snap Ratio:** >80% ratio = pure rusher; <60% = passing-down back

### Bookmark These Sources
- SumerSports.com → Teams → Offensive → Personnel Tendency (free)
- ProFootballReference.com → Weekly → Snap Logs (free historical)
- FantasyPros.com → Reports → Snap Count Analysis (free tier)
- PFF.com/betting/player-props (PFF+ subscription)
- Rotowire.com → Football → Snap Counts (subscription)

---

## METHODOLOGY NOTES

**Personnel Notation:** First digit = RBs, second digit = TEs, remainder = WRs (5 - RB - TE)
- 11 = 1 RB, 1 TE, 3 WR; 12 = 1 RB, 2 TE, 2 WR; 13 = 1 RB, 3 TE, 1 WR
- 21 = 2 RB, 1 TE, 2 WR; 22 = 2 RB, 2 TE, 1 WR

**Snap Share Calculation:** Snap Share = (Player Snaps / Team Total Offensive Snaps) × 100

**Caveats:**
- Single-game snap spikes can be misleading (injuries, blowouts, special teams)
- Cross-reference snap counts with target/carry data for true role assessment
- Personnel grouping changes may not appear in snap counts until 2-3 weeks after implementation
- Preseason snap counts are not predictive (rotations managed heavily)
- Early-season (Weeks 1-3) snap counts are establishing baselines; trust 4+ week trends