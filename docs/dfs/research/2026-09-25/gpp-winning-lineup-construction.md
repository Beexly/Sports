# Winning Lineup Construction for DraftKings NFL Classic GPPs

**Compiled:** 2026-09-25 · **Scope:** structural, evergreen research — no player picks, no slate-specific recommendations.
**Contest archetype in view:** DraftKings NFL classic ($50K cap; QB/RB/RB/WR/WR/WR/TE/FLEX/DST), small-to-mid-field GPPs like the $18-entry / ~980-entry / $15K Sun–Mon Special.

> **Provenance warning (read first):** Nearly all quantitative GPP findings below come from **large-field main-slate** studies (Millionaire Maker, 100K+ entries, Thursday games excluded). They are the best available data, but ownership calibration, stack sizing, and duplication dynamics do not transfer 1:1 to ~1,000-entry Sunday–Monday slates. Each section flags provenance.

---

## 1. Winning lineup data (sourced, never invented)

### 1.1 QB stacking rates among winners

| Sample (source, published) | Finding |
|---|---|
| 17 outright 2020 Milly winners (4for4 NFL DFS Playbook: Quarterback, preseason 2021; https://www.4for4.com/2021/preseason/nfl-dfs-playbook-quarterback-strategy-guide) | **16 of 17 used a QB stack; 13 of those 16 used ≥3 players from the same game** |
| 17 outright 2017 Milly winners (FantasyLabs, Aug 2018; https://www.fantasylabs.com/articles/draftkings-fantasy-football-millionaire-maker-dfs-lineup-trends-2018/) | **All 17 stacked; 14 of 17 stacked QB with a teammate; 4 of 17 stacked three from the same offense** |
| 14 outright 2016 Milly winners (SportsHandle, Jan 2017; https://sportshandle.com/a-breakdown-of-draftkings-millionaire-maker-contests-from-2016/) | **10 of 14 had a QB stack** — 7 two-player, 1 QB-WR2-WR3, 1 QB-RB1-WR1, 1 four-player |
| 150 Top-10 2019 Milly lineups (RotoGrinders, 2020; https://RotoGrinders.com/articles/analyzing-the-top-10-lineups-from-2019-draftkings-nfl-millionaire-makers-3409412) | **143 of 150 (95.3%) used a QB-based stack** (up from 89.4% in 2018). Of the 143: 33 two-man team stacks, 25 three-man team stacks, 36 three-man game stacks, 39 four-man game stacks |
| Top-100 Milly, 2022 season (Levitan/ETR, Sep 7 2023; https://establishtherun.com/levitan-how-to-win-draftkings-milly-maker-in-2023/) | QB+2WR double stack: field ~13% vs **top-100 19% (positive leverage)**; single stacks neutral; **naked QB "a losing bet"**; triple stacks field 4.3% vs top-100 7.7% (viable) |
| Top-100 Milly, 2020 season (Levitan/ETR, Sep 2021; https://establishtherun.com/levitan-how-to-win-draftkings-nfl-milly-maker/) | **Double stacks (QB + exactly 2 teammates): field 28.6% vs Top-100 39.5% — "the biggest edge"**; single stacks 46.6% vs 47.0% (no leverage); triple stacks 3.4% vs 2.5% (poor) |
| Top-10 Milly, 2017–19 (Levitan/ETR, Oct 26 2020; https://establishtherun.com/levitan-winning-draftkings-milly-maker-trends/) | Naked QB: field 17.4% vs **Top-10 6.4%**; QB + two teammates: 28.9% vs **41.2%**; single stacks 49% vs 49.1% (neutral); QB + three teammates 4.2% vs 3.3% (negative); no Top-10 team paired a QB with more than three teammates |

*Data-note caveat (ETR Sep 2021): the article's data label reads "2021 Weeks 1–16" but all in-text references (2020-season injuries, incoming rookie class) indicate the 2020 season — treat as 2020 data.*

### 1.2 Bring-backs (opposing-team game-stack piece)

- Levitan/ETR (Sep 2021, 2020 season): single bring-back — field 34.6% vs **Top-100 52.5%**; bring-back of one WR specifically — field 25.5% vs **Top-100 48% ("best leverage")**. (https://establishtherun.com/levitan-how-to-win-draftkings-nfl-milly-maker/)
- Levitan/ETR (Sep 7 2023): **bring-back tight ends used 34% more frequently on top-100 teams** over the prior three years. (https://establishtherun.com/levitan-how-to-win-draftkings-milly-maker-in-2023/)
- 4for4 (2019; 2017–18 winners): the opposing-player "run-back" appeared on **10 of 33 winning Milly teams (~30%)**. (https://www.4for4.com/2019/preseason/using-contrarian-stacks-nfl-dfs)
- DFS Army (Sep 2022; 17 weeks of 2022 Milly winners): of the week's **highest-projected game**, winners stacked QB + pass-catcher from it in 17% of weeks, QB + pass-catcher + bring-back in 11%, and QB + two pass-catchers + bring-back in 0%. Counterpoint: 4for4/ETR winner studies show winners usually stacked games **outside** the top-5 projected totals — 58% of 2021 winners did (DFS Army, Sep 2022; https://www.dfsarmy.com/2022/09/nfl-dfs-strategy-tips-picks-how-to-win-trends-2022-fanduel-draftkings.html). (https://www.dfsarmy.com/2022/09/nfl-dfs-strategy-tips-picks-how-to-win-trends-2022-fanduel-draftkings.html)

### 1.3 Cumulative ownership — how contrarian were winners, really?

- Levitan/ETR (Sep 2021, 2020 season): Top-100 teams sat in the **75–125% cumulative-ownership band 62.2% of the time vs 53.2% for the field**. The field was too contrarian (<75%) 11.0% vs Top-100 6.3%; too chalky (>125%) 37.5% vs 31.4%. (https://establishtherun.com/levitan-how-to-win-draftkings-nfl-milly-maker/)
- Levitan/ETR (2022 DFS Strategy Guide PDF, Sep 2022): **sum ownership nearly identical — top-100 113.4% vs field 113.9% — but product ownership of top-100 teams was almost half the field's.** Winners ate the same *amount* of chalk but as high-owned anchors + low-owned satellites. Same study: **top-100 averaged 16.8% ownership at RB** — far above QB (9.1%), TE (9.5%), D/ST (9.9%): "It's OK to eat some chalk, especially at RB," because RB scoring is opportunity-based and predictable. The 5–10% bucket is the leverage zone (2.43 players/lineup vs 2.27 field); avoid the 15–25% "dead zone" (1.76 vs 1.98). (https://cdn.establishtherun.com/wp-content/uploads/2022/09/23110421/2022-DFS-Strategy-Guide.pdf)
- RotoGrinders (2019 Top-10): average cumulative ownership **114.32%** per Top-10 lineup; **2.2 players at ≤5% owned**; 44% of Top-10 lineups used a QB at ≤5% owned; only 14.5% of RBs were ≤5% owned vs 36% of WRs. (https://RotoGrinders.com/articles/analyzing-the-top-10-lineups-from-2019-draftkings-nfl-millionaire-makers-3409412)
- Levitan (establishtherun.com, "DFS Ownership Projections Week 1," Sep 2026; 45 Milly winners 2016–18): **43 of 45 winners had ≥1 player under 5% owned; 38 of 45 had ≥1 player over 20% owned.** "We can certainly roster players in large-field GPPs at 30%+ ownership as long as the average ownership of players is much lower."
- Guardrails (large-field provenance): DFS Army "Domination Station" manual (Aug 2023 PDF) — **130% weekly projected-ownership cap**, 35% max global player exposure (https://wp.dfsarmy.com/wp-content/uploads/2023/08/Domination_Station_-_The_DraftKings_Manual.pdf); Sports Gambling Podcast flowchart (Sep 2020) — "around 120%, never more than 150%" (https://www.sportsgamblingpodcast.com/2020/09/11/nfl-dfs-flowchart-week-1/); FantasyFootballers Tournament Takes (Sep 2026) — aim ~100–125% in GPPs (https://www.thefantasyfootballers.com/dfs/nfl-dfs-tournament-takes-leverage-points-week-2-fantasy-football-2/).

### 1.4 Salary spent / left on the table

- 4for4 "DraftKings Cash Games and GPPs: A 2019 Review" (2020): "leaving significant salary on the table doesn't seem to be a winning strategy — **only one winning Millionaire lineup left more than $200 unused and over half of the winners used all $50,000.**" (https://www.4for4.com/node/144013)
- Levitan/ETR (Sep 7 2023, 2022 season): field averaged **$49,877**; top-100 averaged **$49,893** — no difference. (https://establishtherun.com/levitan-how-to-win-draftkings-milly-maker-in-2023/)
- Levitan/ETR (Sep 2021): "For the fourth straight year, we found **zero edge in leaving money on the table.**" (https://establishtherun.com/levitan-how-to-win-draftkings-nfl-milly-maker/)
- FantasyLabs (Aug 2018) *speculated* leaving $100–200 could reduce duplication — Levitan's later multi-year data found no edge. Noted, not endorsed. (https://www.fantasylabs.com/articles/draftkings-fantasy-football-millionaire-maker-dfs-lineup-trends-2018/)

### 1.5 Positional spending: DST, TE, FLEX, QB

**DST — the middle tier, not the floor:**
- 4for4 NFL DFS Playbook: Defense (preseason 2021; 2019–20 Milly winners; https://www.4for4.com/node/153875): winners' DST salaries averaged **$3,125 (2019)** and **$2,959 (2020)** — ~6% of cap, "at or above the middle tier." Winner DST ownership averaged **10.9%** both seasons. Salary→points correlation **0.28 — weakest of any position** ("pay down when possible"). "Few lineups make it to the top... by punting defense. The cheapest defenses — usually big underdogs — rarely offer enough upside. **The middle salary tier has been the sweet spot.**"
- Levitan/ETR (Sep 2021): D/ST salary→points correlation **0.232**, ownership→points **0.250** — weakest at every position ("the field is simply bad at picking them"; 2022 guide). Sub-$2,500 DSTs: field 22.2% vs Top-100 27.6% — mild leverage for spending *down*, not punting to the floor.
- SportsHandle (2016 winners): DST average salary **$3,300** (min $2,500, max $4,100); 10 of 14 winners' defenses under 11% owned. (https://sportshandle.com/a-breakdown-of-draftkings-millionaire-maker-contests-from-2016/)

**TE — spend at the extremes, never in the FLEX:**
- 4for4 NFL DFS Playbook: Tight End (preseason 2021; 2019–20 winners; https://www.4for4.com/2021/preseason/nfl-dfs-playbook-tight-end-strategy-guide): winners' TE salaries averaged **$4,769 (2019)** and **$4,653 (2020)** — "typically only spent less on their defense and flex player than they have at tight end." Finding: **spend at the extremes, not the middle** — cheap TEs regularly match mid-tier TEs; "paying down is the slightly more favorable strategy on DraftKings"; if eating chalk, do it with a premium TE in optimal conditions.
- SportsHandle (2016): TE average **$4,464** (min $2,500, max $7,000); all 14 winners' TEs ≤15% owned.
- Levitan/ETR (Sep 7 2023): **TE-in-FLEX was negative leverage** — field 19% vs top-100 12%; but bring-back TEs got 34% more top-100 usage over three years — TE belongs in game stacks, not as a flex slot.
- 4for4 TE Playbook: **just 3 of 67** DK Millionaire + FanDuel Sunday Million winners used a TE in the flex.

**FLEX distribution (RB vs WR vs TE):**

| Source (sample) | RB | WR | TE |
|---|---|---|---|
| RotoGrinders 2019 (150 Top-10) | 51.33% | 42.67% | 6% |
| Levitan/ETR 2021 (2020 Top-100) | 35.4% | 56.4% | 8.2% |
| Levitan/ETR 2020 (2017–19 Top-10) | 58% | ~33% | 9% |
| FantasyLabs 2018 (2017 winners) | 59% | 29% | 12% |
| SportsHandle 2017 (2016 winners) | 50% | 43% | 7% |
| 4for4 2015 (15 winners) | 53% | 47% | 0% |

*Levitan's 2021 study is the WR-favoring outlier (attributed to the $4,000 RB salary floor and 2020 RB injuries). Every study agrees **TE-in-FLEX is the worst of the three**.*

**QB salary tier — a genuine era tension in the record:**
- 4for4 QB Playbook (2019–20 winners): winners' QB salaries averaged **$6,263 (2019)** and **$6,641 (2020)** — "the mid-to-high range is usually the sweet spot."
- Levitan/ETR (Sep 2021, 2020 season): Top-100 QBs averaged **$6,825** vs field $6,568; **$7,000+ QBs: field 31.4% vs Top-100 49.6%** — the dual-threat era (Allen/Murray/Lamar/Watson) forced spending up.
- 4for4 2019 review: among 2019 winners, **twice as many QBs were priced below $6,000 as at $7,000+**.
- SportsHandle (2016): QB average **$6,464** (min $5,300, max $8,100). 4for4 (Dec 2015): median winner QB **$6,300**, under $7K, under 10% owned.
- *Unverified/lore (AI-generated summary of a promotional video for "Cracking the DFS Code," crawled 2026 — directional only, not the dataset): claims punt QBs (sub-$5,000) rose from a 2% to 22% win rate 2022–2025. Weight lightly; it contradicts Levitan's 2021 "spend up" thesis and describes a later era.*

---

## 2. Correlation facts

Anchored on the FantasyLabs/RotoViz positional-correlation matrices (main-slate, DraftKings PPR era), cross-checked across independent publications.

| Pairing | Coefficient | Source |
|---|---|---|
| QB – same-team WR1 | **0.53–0.55** ("most closely correlated among stacking options") | FanSided 2019-08-25 (https://fansided.com/2019/08/25/nfl-dfs-gpp-strategy-fanduel-draftkings/4/); FantasyFootballers Aug 2021, FantasyLabs 2014–2020 data (https://www.thefantasyfootballers.com/dfs/dfs-stacking-the-strategy-thinking-behind-it-fantasy-football/) |
| QB – same-team TE1 | **0.47** (tied 2nd-strongest with QB–WR2) | Same two sources; FantasyLabs Jan 2019 ("since 2014" average; team outliers: Kelce's QBs 0.78) — https://www.fantasylabs.com/articles/nfl-dfs-fantasy-football-quarterback-breakdown-divisional-round-2019/ |
| QB – opposing QB | **0.58–0.59** (highest of any pairing) | Same sources; 4for4 data cited: when a QB posts 25+, **61% chance the opposing QB posts 25+ too** |
| QB – opposing WR1 / WR2 / RB1 | **0.37 / 0.41 / 0.41** | FanSided 2019-08-25; FantasyFootballers Aug 2021 (opposing WR2 carries as much correlation as opposing RB1 — bring-back WR2 gives leverage since the field plays WR1) |
| QB – same-team RB1 | **0.42 league-wide, but role-dependent**: receiving backs strongly positive (Chiefs 0.63, Cowboys 0.51); ground-and-pound workhorses negative (Saints −0.11, Jaguars −0.66) | FanSided 2019-08-25; FantasyLabs 2018 showdown dashboard samples via Raybon |
| RB1 – same-team DST | **Positive, game-script-driven.** 4for4 (2019): "RB1s (and only RB1s) get a production bump when their defense scores at least 15 fantasy points" (https://www.4for4.com/2019/preseason/rb-def-stack-analyzing-game-script-nfl-dfs). DFS Army (Sep 2022, 2021 Milly winners): defense stacked in **10 of 17** winners; 6 of those 10 with an RB (https://www.dfsarmy.com/2022/09/nfl-dfs-strategy-tips-picks-how-to-win-trends-2022-fanduel-draftkings.html). Caveat: FantasyFootballers (Aug 2021) — positive but weak; "the RB + DST stack doesn't correlate as much as the field thinks" |
| RB1 – RB2 (same team) | **Negative tendency** (Saints −0.19, Jaguars −0.63) with pass-catching-RB2 exceptions (Colts Hines +0.41 with Luck) | FantasyLabs/Raybon 2018; FanSided 2019-08-25 ("steer clear of" RB1–RB2) |
| RB1 – WR1 (same team) | **−0.07, ~neutral** | FantasyLabs "Another Look at NFL Correlations" (~2016; https://www.fantasylabs.com/articles/another-look-at-nfl-correlations/) |
| RB – opposing RB | **−0.31** | FantasyLabs "Utilizing Negative Correlations" (~2016; https://www.fantasylabs.com/articles/utilizing-negative-correlations-as-a-contrarian-gpp-approach/) |

**Stacking-specific leverage numbers:**
- Double stack = QB + exactly two teammates (any positions): field 28.6% vs **Top-100 39.5% — "the biggest edge"** (Levitan/ETR, Sep 2021). Single stacks: 46.6% vs 47.0% = no leverage. Triple stacks: 3.4% vs 2.5% = poor (2020 data; the Sep 2023 study found triples viable at 4.3% vs 7.7% in 2022 — definition/methodology differences, treat the double-stack edge as the stable finding).
- Bring-back one opponent: field 34.6% vs **Top-100 52.5%**; bring-back one WR: field 25.5% vs **Top-100 48%** (Levitan/ETR, Sep 2021).
- FantasyFootballers "DFS Milly Maker Trends" (~Aug 2023): **94.1% of top-25% lineups used at least a single stack** vs 82.8% of missed-cash lineups; 41% double-stacked vs 37.8% (https://www.thefantasyfootballers.com/dfs/dfs-milly-maker-trends-how-to-win-big-on-draftkings-fantasy-football/).
- QB ownership among winners: DFS Army (Sep 2022, 2021 Milly): **winning QBs were under 14% owned in all 17 weeks** (never exceeded 13.43%).

**Leverage (negative-correlation) doctrine:**
- Canonical worked example, DFF DFS Primer (2023): "If everyone is playing Joe Burrow with Ja'Marr Chase and you play Joe Mixon and Mixon scores three rushing touchdowns resulting in Chase and Burrow scoring pedestrian numbers, you now have leverage on the Burrow/Chase stacks." (https://dynastyfootballfactory.com/the-dff-dfs-primer/)
- FantasyFootballers Tournament Takes (Sep 2026): "I care more about the entire stack than finding the lowest-owned QB"; leverage example — Lamar Jackson 5.28% owned vs Derrick Henry 19.64%: "We can agree with the field that BAL scores and disagree about who collects the TDs."
- FantasyAlarm 2026 GPP guide: "Ownership leverage wins tournaments. Fade the chalk for a similarly priced, lower-owned alternative when you can find one." (https://www.fantasyalarm.com/articles/nfl/fantasy-football-draft-guide/2026-draftkings-vs-fanduel-dfs-strategy-guide/191484)

**No published coefficient found (unverified / industry lore):** QB vs opposing DST, RB vs opposing DST, WR vs opposing DST — consensus is negative by DK scoring mechanics (a QB's yards/TDs directly subtract from DST points-allowed/turnover upside), but no study has published the numbers. Same-team QB–DST is asserted *positive* (FantasyLabs 2016; Dallas 0.59 in a 2018 showdown sample) — do not confuse the two.

---

## 3. Concrete examples — real winning lineups

### Example A — Week 14, 2023: Lamar Jackson triple stack
- **Source:** DFS Army, "DFS NFL Week 14 DraftKings Milly Maker Review" (Dec 2023) — https://www.dfsarmy.com/2023/12/dfs-nfl-week-14-draftkings-milly-maker-review
- **Contest:** DraftKings Millionaire Maker, $20 entry, $1M to 1st. **Score: 230.84. Salary: $50,000 exactly.**

| QB | RB | RB | WR | WR | WR | TE | FLEX | DST |
|---|---|---|---|---|---|---|---|---|
| Lamar Jackson $7,700 (3.68%) 35.64 | Rachaad White $6,800 (3.93%) 24.50 | Austin Ekeler $7,600 (5.26%) 21.00 | Deebo Samuel $6,800 (16.48%) 37.00 | Drake London $4,600 (21.33%) 32.20 | Odell Beckham Jr. $3,800 (7.65%) 19.70 | Isaiah Likely $3,500 (14.56%) 19.30 | Joe Mixon $6,100 (26.03%) 21.50 | Vikings $3,100 (5.88%) 20.00 |

- **Structure:** Triple stack Lamar + OBJ + Likely in the Ravens–Rams OT shootout (68 real points); secondary Falcons mini (London + White); ate chalk at Mixon/Deebo/London/Likely and won via the 3.68%-owned QB + sub-6% RB pivots off failed mega-chalk (CMC "snowflake," Moss). Faded chalk Browns DST for the 5.88%-owned Vikings (2nd-best DST score). No player above $7,700 — the review notes $8,500+ players struggle to return 4X; Likely at $3,500 returned 5.5X.
- **Lesson:** textbook formula — triple QB stack at genuinely low combined ownership, two mid-tier ceiling WRs, differentiation through lineup composition, chalk eaten selectively.

### Example B — Week 16, 2025: twin AFC West stacks (won by <0.5 pts)
- **Source:** DraftKings Network, Zach Thompson (2025-12-22) — https://dknetwork.draftkings.com/2025/12/22/draftkings-fantasy-football-millionaire-winning-lineup-breakdown-week-16-2025/
- **Contest:** NFL $2.25M Millionaire [$1M to 1st], $20 entry, 132,352 entries. **Score: 218.2. First prize: $1,000,000.**
- **Roster:** QB Justin Herbert 33.2 · RB James Cook III 29.4 · RB Chase Brown 32.9 (6.1%) · WR Chris Olave 39.8 · WR Quentin Johnston 23.4 (1.5%) · WR Keenan Allen 9.4 · TE Brock Bowers 14.3 (2.1%) · FLEX Ashton Jeanty 34.8 (2.0%) · DST Raiders minimum salary, 1.0.
- **Structure:** Triple stack Herbert + Johnston + Allen (Chargers–Cowboys shootout); second mini Jeanty + Bowers + Raiders DST, financed by punting DST to minimum salary. Three chalk-agnostic ceiling scorers (Cook, Brown, Olave) anchored the early wave. Johnston (1.5%), Jeanty (2%), Bowers (2.1%) were the differentiators — bets against the field's matchup/inconsistency fears. The minimum-salary DST scored 1 point and the margin was under half a point.
- **Lesson:** heavy double-game-stacking with leverage pieces the field feared, financed by a minimum-salary DST; four players under 3% owned — a pure effective-ownership win.

### Example C — Week 17, 2025: value-flex + Patriots triple (won by 13)
- **Source:** DraftKings Network, Zach Thompson (2025-12-29) — https://dknetwork.draftkings.com/2025/12/29/draftkings-fantasy-football-millionaire-winning-lineup-breakdown-week-17-2025/
- **Contest:** NFL $2.25M Millionaire [$1M to 1st], $20 entry, 132,352 entries. **Score: 218.24. First prize: $1,000,000.**
- **Roster:** QB Drake Maye 32.44 (11.1%) · RB Rhamondre Stevenson 27.2 · RB Chase Brown 32.1 · WR Stefon Diggs 25.1 · WR Michael Wilson 19.9 · WR Parker Washington 22.0 · TE Trey McBride 23.6 · FLEX Michael Mayer **$2,500** 17.9 · DST Giants 18.0.
- **Structure:** Triple stack Maye + Diggs + Stevenson (Maye: 256 yds, 5 TDs); second game stack McBride + Wilson (Cardinals) + Chase Brown (Bengals); Mayer at $2,500 (~7.2X) was "a win for game theory everywhere" — one hyper-value piece enabling the pay-ups. DST was a *pay-up that hit* (Giants 18).
- **Lesson:** concentrate value in a single flex pivot (minimum-salary injury replacement with real volume), not spread thin; the salary structure existed to fit two high-total game stacks plus an elite defense.

### Example D (partially sourced) — Week 3, 2025: Raiders double stack
- **Source:** Sports Illustrated (Sep 2025) — https://www.si.com/onsi/fantasy/dfs/tre-tucker-breakout-winning-draftkings-millionaire-maker-lineup-week-3. Full roster not published (rendered as image); treat as corroborating color.
- **Known pieces:** Geno Smith QB (1.1%) + Bowers (9.8) + Tre Tucker (0.6%, 8/145/3) = three Vegas players for $14,600 (~4.1X); chalk RBs Jonathan Taylor (~35.1%), CMC (~25.5%), Jordan Mason (~24.1%); Vikings DST 30.0.
- **Structure:** ate chalk at the top, won with the 0.6%-owned Tucker triple-TD eruption from the QB's double stack. The runner-up had the *same* roster except a triple Raiders stack (Jakobi Meyers instead) — 2.90 points behind: a live lesson in double-vs-triple construction.
- **Season context:** 2025 low-dollar Milly averaged a 228.39 winning score through three weeks; low-priced QBs won three straight weeks.

**Cross-example structural notes:** winning scores cluster **218–231** (2023 season averaged ~240 per DFS Army's 14-week sample; ~4.6X salary on average). Every winner stacked the QB with ≥2 teammates. The differentiator is always sub-5% (often sub-2%) ownership on a slate-breaker. DST is a weapon — fade chalk defenses, pay up when the matchup breaks right, or minimum-price punt *only* to finance stack leverage. TE/FLEX is the value slot.

---

## 4. Contest-size theory (~1K entries vs 100K+ MME)

### 4.1 Precision vs differentiation
- FantasyAlarm 2026 strategy guide (~Jul 2026): "**Large-field GPPs demand maximum differentiation.** Mid-field GPPs in the 2,000–5,000 entry range give you the best mix of prize size and win odds. **Small-field GPPs reward precision over wild differentiation.**" Single-entry/limited-entry contests reward "skill over volume." (https://www.fantasyalarm.com/articles/nfl/fantasy-football-draft-guide/2026-draftkings-vs-fanduel-dfs-strategy-guide/191484)
- DFS Army (Feb 2017): heavy-floor "cash type" builders should target smaller GPPs — "You don't have to take some whackass, crazy and obscure guess." Anecdote: a 2016 Milly entry ~20 points off 1st (~$20K) would have won a 10,000-player event and $100K. (https://www.dfsarmy.com/2017/02/comparing-dfs-gpps-contest-best.html)
- FantasyLabs small-field specialist Justin Bailey (Nov 2021; defines small field as ≤500, typically ≤300): "your lineups don't need to be as perfect" as in large fields; formula = correlate in the best spots, use Leverage Scores for pivots off high-rostership players, **rely on ceiling projections over median projections**. Critical caveat: "the projected ownership levels in the models are geared toward large-field GPPs, so there is some guesswork on estimating ownership projections for smaller fields." (https://www.fantasylabs.com/articles/fantasy-football-week-9-nfl-dfs-small-field-gpp-strategy-and-draftkings-picks-2021/)
- Levitan/ETR 2022 DFS Strategy Guide (Sep 2022): "focusing on smaller fields, 20-max entries or smaller, and being rake-conscious must be the priority" for positive weekly expectation; massive top-heavy tournaments are "lottery style." In single-entry fields, "many of our opponents will use their cash roster. The 'best plays' will see bloated ownership. Work on creating leverage against this 4,901-entry field." (https://cdn.establishtherun.com/wp-content/uploads/2022/09/23110421/2022-DFS-Strategy-Guide.pdf)

### 4.2 Stack sizing shifts by field size
- 4for4 (Sep 2022, Milly review): "a rough rule of thumb is **the larger the field, the fewer big game stacks I will have and vice versa**." (https://www.4for4.com/2022/w3/week-2-draftkings-fanduel-winning-gpp-lineup-review)
- FantasyLabs (Milly Week 4 review, Oct 2024): "single stacks working better in massive GPPs generally since it's hard for two pass catchers from the same team to both score well enough to be in the optimal lineup. **Keep in mind, as the best strategy for the milly maker might not be optimal for smaller tournaments.**" (https://www.fantasylabs.com/articles/nfl-dfs-week-4-millionaire-maker-review-breaking-down-the-winning-lineup-2/)

### 4.3 Eating chalk vs pivoting
- Levitan/ETR 2022 guide (3,234 top-100 Milly teams): eat chalk **at RB** (top-100 avg 16.8% RB ownership vs 9.1% QB) — "Grossly underpriced RBs can be fine plays even at very high ownership, as long as we're keeping our cumulative ownership in check." **Get weird at D/ST** (ownership→points correlation 0.165 vs ≥0.427 everywhere else — "the field is simply bad at picking them").
- Thunder Dan, RotoBaller (2020): "The cheaper the play, the more likely I am to eat the chalk... be wary of high-priced chalk as that player has to hit their floor or you're in big trouble." (https://www.rotoballer.com/thunder-dans-2020-nfl-dfs-strategy-guide/775241)
- Footballguys (Dec 2018): "Of all positions, **eating chalk at quarterback typically works out.**" (https://www.footballguys.com/article/2018-fanduel-gpp-strategy-guide-week13?article=2018-fanduel-gpp-strategy-guide-week13)
- DK Network (Aug 2025): "you don't need to be different everywhere, but you do need to be different *somewhere*"; fade 25%+ owned for similarly talented lower-owned options. (https://dknetwork.draftkings.com/2025/08/28/draftkings-nfl-millionaire-strategy/)

### 4.4 Duplication risk in ~1K-entry fields
**Direct NFL ~1K-field duplication-rate data: NOT FOUND.** Adjacent citable evidence:
- RotoGrinders (2016, **golf** Milly): "almost 30% of lineups in the first two Millionaire Makers turned out to be duplicates when zero salary is left on the table." (https://rotogrinders.com/articles/draftkings-milly-maker-strategy-avoiding-lineup-duplication-748722) — golf/large-field, not NFL.
- ETR product-ownership math: duplicate probability scales with the *product* of rostered players' ownerships; lower product ownership reduces expected dupes/splits.
- FantasyLabs optimizer guide (Billy Ward, ~Sep 2026): "Because thousands of users have access to the same default projections, **blindly optimized lineups are highly duplicated.** Even if that lineup wins, the prize pool gets split." (https://www.fantasylabs.com/articles/hodge-use-nfl-dfs-optimizer/)
- ETR Showdown (Cody Main): underdog CPTs in 9+ point-spread games were **39.9% less duplicated** on average (https://establishtherun.com/nfl-showdown-playing-like-a-pro/ — Showdown provenance).
- FantasyLabs (2017, two-game slate): "With fewer teams and players to choose from, the odds are relatively high that, even if one creates a tournament-winning lineup, someone else would've created that exact same lineup." (https://www.fantasylabs.com/articles/improbable-probabilities-building-a-unique-gpp-lineup/)

### 4.5 Entry-count / bankroll guidance
- Sports Gambling Podcast (Sep 2020): "You should always try to get as close as possible to the max number of entries for a contest." (https://www.sportsgamblingpodcast.com/2020/09/11/nfl-dfs-flowchart-week-1/)
- DFSMastermind (Jul 2025): "Single entry is not the same as playing just one lineup in a 150-max GPP." Build lineups *for the format*; select contests matching style and bankroll. (http://dfsmastermind.com/wp-content/uploads/2025/07/DFSMastermindBP.pdf)
- FantasyFootballers 2026 contest-selection (~Sep 2026): slate-budget table ($25 → 1 cash + 1–2 GPP; $100 → 1 cash + 2–6 GPP); never deploy >10% of account on a slate. (https://www.thefantasyfootballers.com/dfs/2026-dfs-contest-selection-for-any-budget-fantasy-football/)
- FantasyAlarm 2026: keep GPP entries to **0.5–2% of bankroll** per entry.
- ETR Showdown data (Cody Main): "max-entry players outperform single-entry players in every single metric" — decision quality, not coverage. Single-entry players over-indexed sub-5% CPT darts (25.4% vs 16.3%) with poor slate-winning odds. Lesson: with 1–3 bullets, **don't over-rotate into sub-5% darts**. (https://establishtherun.com/nfl-showdown-playing-like-a-pro/)

---

## 5. Sunday–Monday slate edge: the Monday night game as structural leverage

### 5.1 Mechanics (verified)
- **DraftKings:** each roster spot locks at its own player's game kickoff; unplayed spots (all MNF players) remain swappable until Monday kickoff. **FanDuel:** entire lineup locks at the first game — no late swap. (RotoBaller, https://rotoballer.com/?p=314694)
- DK eliminated late swap for **NBA only**; NFL retains it. (LegalSportsReport, ~Jun 2025; https://www.legalsportsreport.com/11818/draftkings-late-swap-dfs-change/)

### 5.2 The information doctrine (sharp usage)
1. **Jonathan Bales (FantasyLabs, ~Jan 2025):** "So few people utilize late-swap except for injuries or late scratches, but it's a massive potential edge... With the passing of each minute in an NFL weekend, we have more and more information about where our lineup stands in relation to others, and we should utilize that information to edit the lineup accordingly. **If you start cold in the 1 p.m. ET games and you're an underdog to cash, you're better off being more contrarian with your late-game players** to give yourself a chance to come back... The information you have on hand at any given moment — and not what your lineup looked like in the past — should dictate how you structure it moving forward." (https://www.fantasylabs.com/articles/jonathan-bales-endowment-effect-gamblers-fallacy-betting-fantasy-sports/)
2. **Labyrinthian/FantasyLabs (2016), summarizing Bales:** use late swap to "assume or decrease risk and to add or remove stacks when necessary"; **"be aggressive in early games and hedge a position in later games."** Construction rule: put your **weakest players in the earliest games** and your **latest players in the most flexible slots**, so Sunday/Monday information arrives when you still have maximum options. (https://www.fantasylabs.com/articles/playing-bridge-punting-early-and-late-swap/)
3. **DK Network Millionaire guide (~Aug 2025):** "view it in two phases. Kickoff and right before the late afternoon games begin. **If your early players underperform, pivot to lower-owned, high-upside players in the late games. If you're ahead, stick with safer chalk to block the field.**" (https://dknetwork.draftkings.com/2025/08/28/draftkings-nfl-millionaire-strategy/)
4. **FantasyLife "The Late-Game Hammer" (~Sep 2025):** play low-owned contrarian pieces early; if the unique early stack hits, you get the green light to play the best (most popular) late plays; if it flops, you know you must go more contrarian late. "Taking advantage of the late-swap dynamic on DraftKings can help you make better lineups than the majority of the field who are often too lazy or busy... to make these swaps." (https://www.fantasylife.com/articles/dfs/5-dfs-strategies-for-week-4-on-draftkings-and-underdog-cam-skatt)

### 5.3 MNF-specific swap playbook
- DK strategy guide (f-static PDF, older but MNF-specific; https://cdn-cms.f-static.net/uploads/4454547/normal_6047070cc7b39.pdf): (a) **put your MNF player in a flexible roster slot (FLEX)** so a Monday issue lets you swap to any WR/RB/TE in that game, not just like-for-like; (b) far from the money with a high-owned MNF player who can't make up ground even with a good night → **swap to a very-low-owned MNF breakout**; (c) safe in the money with no big climb available → swap to the safer play.
- Bales' own process (4for4, 2015): "I check in before the 4pm ET games and the Sunday night game to see if there are any late-swap opportunities." (https://www.4for4.com/2015/w5/bales-goes-deep-how-i-work)
- Practical construction implication (synthesis, not a named system): keep ≥1 MNF-exposed FLEX alive so Monday's decision set includes both the MNF QB-led stack (chase mode) and a low-owned one-off pivot (block mode).

### 5.4 Explicitly NOT found
1. **No published study** tracks how Sun–Mon GPP winners used the Monday night game (MNF stacks, Monday QB leverage, "double-dip" constructions). FantasyLabs' weekly Milly winner reviews are main-slate only (MNF excluded by slate design).
2. **No measurement** of MNF over/under-ownership within Sun–Mon slates. The claim that nationally televised/primetime players get over-owned via the availability heuristic is **industry lore without a citable sharp source**.
3. **No named, published "MNF hedge system"** — the doctrine (early aggression, late hedge, information-driven swaps, FLEX flexibility) is well-sourced, but no outlet packages it as a Monday-specific construction system.
4. One inference worth testing with our own data: in Sun–Mon contests, MNF players carry unique *optionality value* (the only swap-live pool on Monday). If the field prices that optionality in, MNF skill players run hotter than projection-implied ownership; if the field ignores it, they run cooler. **Unverified — measurable with engine ownership data, not answered by the literature.**

---

## 6. Distilled checklist — 15 construction rules

1. **Stack the QB — almost always.** 95.3% of 2019 Top-10 Milly lineups used a QB-based stack (RotoGrinders, 2020); naked QBs ran 17.4% field vs 6.4% Top-10 — a losing bet (ETR, Oct 2020).
2. **Default to the double stack (QB + exactly two teammates).** Field 28.6% vs Top-100 39.5% — "the biggest edge" in Levitan's data (ETR, Sep 2021). Single stacks carry no leverage; triples are situational.
3. **Add a bring-back — one opposing player, preferably a WR.** Field 25.5% vs Top-100 48% bring-back-WR rate (ETR, Sep 2021); opposing QB correlation 0.59 is the highest of any pairing (FantasyLabs matrix, 2014–2020 data).
4. **Eat chalk at RB; get weird elsewhere.** Top-100 teams averaged 16.8% ownership at RB vs 9.1% at QB (ETR 2022 guide) — RB scoring is opportunity-based and predictable, so overpriced-chalk RBs are fine as long as cumulative ownership is controlled.
5. **Build a barbell: ~100–125% cumulative ownership.** Pair high-owned anchors with 5–10% leverage shots; avoid the 15–25% "dead zone" (ETR, Sep 2021). Winners had the *same* total chalk as the field but half the *product* ownership (ETR 2022 guide).
6. **Every lineup needs a sub-5% slate-breaker.** 43 of 45 Milly winners (2016–18) rostered one (ETR, Sep 2026); the four real examples above all turned on a 0.6–3.9%-owned eruption.
7. **Spend the cap.** Winners averaged $49,893 of $50,000; "zero edge in leaving money on the table" four years running (ETR, Sep 2021). Over half of 2019 winners spent all $50K (4for4, 2020).
8. **DST: middle tier, not the floor.** Winners averaged ~$3,000–3,300 (~6% of cap); salary→points correlation 0.28, weakest of any position (4for4, 2021). Cheapest defenses "rarely offer enough upside to take down a GPP" — the middle tier is the sweet spot. Sub-$2,500 has mild leverage (ETR) but floor punts are not a winning structure.
9. **TE: pay down or pay all the way up — never the middle, never in FLEX.** Cheap TEs match mid-tier TEs (4for4, 2021); only 3 of 67 Millionaire/Sunday Million winners used a TE in the flex; TE-in-FLEX was negative leverage (field 19% vs top-100 12%, ETR 2023). Bring-back TEs got 34% more top-100 usage — TE belongs in game stacks.
10. **FLEX = RB or WR.** Historically RB 50–58%, WR 29–47%, TE ≤12% across six winner/top-100 studies (2015–2019). (The 2020 WR-favoring outlier was injury-driven.)
11. **QB tier: mid-to-high range is the historical sweet spot, but don't dogmatize.** Winner QB salaries averaged $6,263–$6,825 (2019–2020); $7K+ QBs ran 31.4% field vs 49.6% Top-100 in the dual-threat era (ETR, Sep 2021) — yet twice as many 2019 winners were sub-$6K as $7K+. The record shows era dependence, not a fixed rule.
12. **Small fields (~1K): precision over differentiation.** Correlate in the best spots, pivot in the right spots, use ceiling projections (Bailey, FantasyLabs Nov 2021). With 1–3 bullets, don't over-rotate into sub-5% darts — max-entry players win on process quality, not coverage (ETR Showdown data).
13. **Keep MNF alive: FLEX slot + late-swap on information.** Weakest players in the earliest games, latest players in the most flexible slots (Labyrinthian/Bales, 2016). If behind Sunday night → contrarian MNF pivot; if ahead → chalk to block (Bales ~Jan 2025; DK Network ~Aug 2025). MNF player in FLEX preserves cross-positional Monday swap rights (DK guide).
14. **RB + same-team DST is a positive correlation, not a sin.** RB1s get a production bump when their DST scores 15+ (4for4, 2019); 10 of 17 2021 Milly winners stacked a defense, 6 with an RB (DFS Army, Sep 2022). Positive but weak — don't overpay for it.
15. **Don't fade elite WRs on matchup.** Top-5 WRs performed best even against the "best defenses" vs WRs (DiSorbo/ETR research via FantasyFootballers, 2022). And 58% of 2021 winners stacked games *outside* the top-5 projected totals (DFS Army, Sep 2022) — leverage the game environment, not just the players.

---

## Appendix: honest gaps

- **No small-slate (~1K entry) quantitative studies exist** in the published record for stacking rates, cumulative ownership bands, or salary patterns — every number above is large-field main-slate provenance (flagged per section).
- **No NFL ~1K-field duplication-rate data** (only golf Milly ~30% at $0 salary left, and product-ownership math).
- **No published coefficient** for QB/RB/WR vs opposing DST (consensus negative, unquantified).
- **No study of Sun–Mon winners' MNF usage** and no measurement of MNF over/under-ownership within Sun–Mon slates.
- **Newest quantitative ETR study is Sep 2023 (2022 data)**; RotoGrinders' winner series ended with 2019; 4for4's Playbook with 2019–20. 2023–2025 claims in circulation (e.g., punt-QB win-rate rise) come from promotional/AI-summarized material — weight accordingly.
- AI-generated summaries of promotional videos (gist.ly / "Cracking the DFS Code") were consulted but are flagged directional-only throughout; none of the checklist rules depend on them alone.
