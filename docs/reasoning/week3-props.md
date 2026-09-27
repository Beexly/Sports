# Week 3 props surface

Child D (props / surface). `publishes_pick`: false. Chat explains and does not vote. This page does not set LIVE and does not add a prior. OpenRouter was not called. Lane: `openrouter_unconfigured`.

Files opened:

- `data/gse-dataset/current/calibration-weights.json` (`props`)
- `data/gse-dataset/current/DKSalaries-Week3-SunMon.csv`
- `data/gse-dataset/current/week3-context.jsonl` (`game_id` `2026_03_LAC_BUF` only)

Sunday means `Game Info` contains `09/27/2026`. PHI at CHI (`09/28/2026`, 54 salary rows) is left out. ATL at GB (`09/24/2026`) is not in this salary file. `AvgPointsPerGame` is ignored. It is not a projection used here. Salary only marks who is on the slate. Salary is not printed and is not a recommendation.

A 2025 slope is how a frozen projection regresses toward the actual stat on that season block (yards for the yard props, receptions for receptions). It is not a player edge, not a probability, not +EV, and not a pick. Slope is not multiplied by salary. This page does not rank anyone and does not say who to start.

2026 did not choose `w`. The 2026 n, MAE, and slope are a watch row only.

`by_position` exists for every position mapped below, so each player row uses the 2025 position slope, not the prop-level slope.

## Prop families (2025, prop-level)

| prop | w_chosen_on_2024 | 2025 n | 2025 MAE | 2025 slope | 2025 intercept |
| --- | ---: | ---: | ---: | ---: | ---: |
| passing_yards | 0.6 | 583 | 68.03554743617347 | 0.6230849301839038 | 75.74300962210906 |
| rushing_yards | 0.3 | 2007 | 17.13861774968651 | 0.8369363773598116 | 5.979466549770699 |
| receiving_yards | 0.1 | 4844 | 16.180261461753567 | 0.7803106685953941 | 5.6232065570059575 |
| receptions | 0.3 | 4844 | 1.2342535691786591 | 0.7895501836381323 | 0.4598147769331644 |

## 2026 watch (w was not chosen)

| prop | 2026 n | 2026 MAE | 2026 slope |
| --- | ---: | ---: | ---: |
| passing_yards | 34 | 84.1470588235294 | 0.24722993590080664 |
| rushing_yards | 115 | 22.8 | 0.5119948878861631 |
| receiving_yards | 289 | 21.33217993079585 | 0.48223879640773254 |
| receptions | 289 | 1.5830449826989619 | 0.5306558649498408 |

## Position slopes joined (2025 `by_position`)

| prop | position | 2025 n | 2025 MAE | 2025 slope | 2025 intercept |
| --- | --- | ---: | ---: | ---: | ---: |
| passing_yards | QB | 583 | 68.03554743617347 | 0.6230849301839038 | 75.74300962210906 |
| rushing_yards | QB | 583 | 11.62903922287928 | 0.6073379582849603 | 5.630420337554623 |
| rushing_yards | RB | 1424 | 19.394294913400422 | 0.8273394885170235 | 7.862775821253198 |
| receiving_yards | RB | 1424 | 9.840161959704604 | 0.6503698436677783 | 4.235771005622003 |
| receiving_yards | TE | 1150 | 15.042656994816783 | 0.7752538668061226 | 6.615790924230598 |
| receiving_yards | WR | 2270 | 20.73380631985705 | 0.75461004188291 | 7.708820447772702 |
| receptions | RB | 1424 | 1.0390754243220892 | 0.7302417544745032 | 0.4240258046653316 |
| receptions | TE | 1150 | 1.2408626490659098 | 0.785611043454417 | 0.565814374076075 |
| receptions | WR | 2270 | 1.3533431006347898 | 0.7938931488949884 | 0.47676336743687187 |

Mapped props: passing_yards on QB; rushing_yards on QB and RB; receiving_yards on RB, WR, and TE; receptions on RB, WR, and TE. A blank slope cell means that prop is not mapped to that position.

## LAC at BUF

`Game Info`: `LAC@BUF 09/27/2026 01:00PM ET`. 47 skill rows (QB, RB, WR, TE), 47 distinct DK IDs. Listed by team, then position, then name. That order is not a rank.

Context status is copied only from `week3-context.jsonl` for `game_id` `2026_03_LAC_BUF` (`gameday` `2026-09-27`, away LAC, home BUF). The salary-file `Status` column is not used. `not listed` means the name is absent from that game's out, doubtful, and questionable arrays. Both doubtful arrays are empty. No other injury status is assigned.

Away LAC, out: Dalvin Tomlinson (DT, Hamstring), Trey Pipkins (T, Knee), Kayode Awosika (G, Fibula), Elijah Molden (S, Hamstring), Charlie Kolar (TE, Forearm), Brenen Thompson (WR, Quadricep).

Away LAC, questionable: Trey Lance (QB, Groin), Rodney Shelley (CB, Hamstring).

Home BUF, out: Jordan Hancock (CB, Hamstring), T.J. Sanders (DE, Illness).

Home BUF, questionable: DJ Moore (WR, Shoulder), Ed Oliver (DT, Hip), Keon Coleman (WR, Ankle), Ar'maj Reed-Adams (G, Elbow).

Names in those arrays that are not Sunday QB/RB/WR/TE rows for LAC or BUF on this salary file: Dalvin Tomlinson, Trey Pipkins, Kayode Awosika, Elijah Molden, Rodney Shelley, Jordan Hancock, T.J. Sanders, Ed Oliver, Ar'maj Reed-Adams.

| team | pos | name | DK ID | context status | passing_yards slope | rushing_yards slope | receiving_yards slope | receptions slope |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUF | QB | Josh Allen | 44247572 | not listed | 0.6230849301839038 | 0.6073379582849603 |  |  |
| BUF | QB | Kyle Allen | 44247662 | not listed | 0.6230849301839038 | 0.6073379582849603 |  |  |
| BUF | QB | Shane Buechele | 44247663 | not listed | 0.6230849301839038 | 0.6073379582849603 |  |  |
| BUF | RB | Brock Lampe | 44247998 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| BUF | RB | Frank Gore Jr. | 44248000 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| BUF | RB | James Cook III | 44247686 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| BUF | RB | Ray Davis | 44247778 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| BUF | RB | Ty Johnson | 44247996 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| BUF | WR | DJ Moore | 44248070 | questionable (Shoulder) |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Greg Dortch | 44248540 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Ja'Mori Maclin | 44248538 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Joshua Palmer | 44248200 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Keon Coleman | 44248140 | questionable (Ankle) |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Khalil Shakir | 44248110 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Skyler Bell | 44248534 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Stephen Gosnell | 44248544 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Trent Sherfield Sr. | 44248542 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | WR | Tyrell Shavers | 44248536 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| BUF | TE | Dalton Kincaid | 44248594 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| BUF | TE | Dawson Knox | 44248664 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| BUF | TE | Jackson Hawes | 44248892 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| BUF | TE | Keleki Latu | 44248894 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | QB | DJ Uiagalelei | 44247661 | not listed | 0.6230849301839038 | 0.6073379582849603 |  |  |
| LAC | QB | Justin Herbert | 44247585 | not listed | 0.6230849301839038 | 0.6073379582849603 |  |  |
| LAC | QB | Trey Lance | 44247660 | questionable (Groin) | 0.6230849301839038 | 0.6073379582849603 |  |  |
| LAC | RB | Alec Ingold | 44247994 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Amar Johnson | 44247988 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Gregory Desrosiers | 44247990 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Keaton Mitchell | 44247788 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Kimani Vidal | 44247986 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Omarion Hampton | 44247688 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | RB | Scott Matlock | 44247992 | not listed |  | 0.8273394885170235 | 0.6503698436677783 | 0.7302417544745032 |
| LAC | WR | Brenen Thompson | 44248522 | out (Quadricep) |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Derius Davis | 44248524 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Gary Jennings | 44248526 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | KeAndre Lambert-Smith | 44248528 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Ladd McConkey | 44248068 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Marquez Valdes-Scantling | 44248532 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Quentin Johnston | 44248104 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Theo Wease Jr. | 44248530 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | WR | Tre' Harris | 44248168 | not listed |  |  | 0.75461004188291 | 0.7938931488949884 |
| LAC | TE | Charlie Kolar | 44248886 | out (Forearm) |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | TE | David Njoku | 44248670 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | TE | Evan Svoboda | 44248890 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | TE | Hayden Rucci | 44248856 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | TE | Oronde Gadsden II | 44248628 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |
| LAC | TE | Patrick Herbert | 44248888 | not listed |  |  | 0.7752538668061226 | 0.785611043454417 |

## Sunday skill counts

One count per Sunday game. The count is QB, RB, WR, and TE rows on the salary file. DST rows are excluded (2 per game on this file). This is not a ranking. Game labels are listed in label order.

- ARI@SF 09/27/2026 04:05PM ET: 52 skill players
- BAL@DAL 09/27/2026 04:25PM ET: 48 skill players
- CAR@CLE 09/27/2026 01:00PM ET: 47 skill players
- CIN@PIT 09/27/2026 01:00PM ET: 46 skill players
- HOU@IND 09/27/2026 01:00PM ET: 51 skill players
- KC@MIA 09/27/2026 01:00PM ET: 49 skill players
- LAC@BUF 09/27/2026 01:00PM ET: 47 skill players
- LAR@DEN 09/27/2026 08:20PM ET: 49 skill players
- LV@NO 09/27/2026 04:25PM ET: 56 skill players
- MIN@TB 09/27/2026 04:05PM ET: 48 skill players
- NE@JAX 09/27/2026 01:00PM ET: 47 skill players
- NYJ@DET 09/27/2026 01:00PM ET: 46 skill players
- SEA@WAS 09/27/2026 01:00PM ET: 51 skill players
- TEN@NYG 09/27/2026 01:00PM ET: 48 skill players

Sunday skill rows total 685. Monday is not included.

## Prices

Market prices are not on this file, so no prop price was joined. Agreement with a posted player prop is impossible from these inputs.

No web app. No separate parts page. No vote control.
