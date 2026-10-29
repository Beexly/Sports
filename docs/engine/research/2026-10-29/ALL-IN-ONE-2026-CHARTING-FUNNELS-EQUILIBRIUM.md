# 2026 WEEKS 1–7 ALL-IN-ONE HUMAN-CHARTED BALL PLACEMENT, TARGET FUNNELS & MINIMAX EQUILIBRIUM

- **Generated:** `2026-10-29T18:40:40Z`
- **Data Spine:** `18,738` 2026 W1–W7 plays (`play_by_play_2026.parquet`) × `18,019` FTN human-charted plays (`ftn_charting_2026.parquet`) = `7,522` charted pass attempts.

## 1. QB Catchable Ball Rate (`CTBL%`), Open Target Rate (`OPENTGT%`) & Pickable Pass Rate (`PKP%`)

| Team | QB | Att | Aimed CTBL% | Raw CTBL% | Open Target% | Pickable Pass% | Receiver Drop% | Survival Archetype |
|---|---|---:|---:|---:|---:|---:|---:|---|
| `CHI` | **C.Williams** | 136 | **77.2%** | 69.9% | 91.1% | 0.74% | 6.3% | `IN_POCKET_MANIPULATOR` |
| `DAL` | **D.Prescott** | 253 | **75.9%** | 73.5% | 80.0% | 2.37% | 9.1% | `IN_POCKET_MANIPULATOR` |
| `MIN` | **K.Murray** | 136 | **75.4%** | 69.9% | 88.9% | 2.21% | 7.4% | `IN_POCKET_MANIPULATOR` |
| `BAL` | **L.Jackson** | 101 | **75.3%** | 72.3% | 86.6% | 2.97% | 5.5% | `IN_POCKET_MANIPULATOR` |
| `WAS` | **M.Mariota** | 54 | **75.0%** | 72.2% | 76.9% | 1.85% | 7.7% | `IN_POCKET_MANIPULATOR` |
| `SF` | **B.Purdy** | 216 | **74.8%** | 72.7% | 84.3% | 2.78% | 3.2% | `IN_POCKET_MANIPULATOR` |
| `CIN` | **J.Burrow** | 229 | **74.7%** | 73.4% | 84.4% | 1.31% | 3.6% | `IN_POCKET_MANIPULATOR` |
| `NYJ` | **G.Smith** | 227 | **74.1%** | 71.8% | 80.9% | 2.2% | 7.4% | `STRUCTURED_POCKET_PASSER` |
| `SEA` | **D.Lock** | 50 | **74.0%** | 74.0% | 90.0% | 2.0% | 5.4% | `IN_POCKET_MANIPULATOR` |
| `KC` | **P.Mahomes** | 198 | **73.5%** | 68.7% | 91.9% | 2.53% | 4.4% | `IN_POCKET_MANIPULATOR` |
| `BUF` | **J.Allen** | 183 | **72.8%** | 67.2% | 90.5% | 3.83% | 4.9% | `IN_POCKET_MANIPULATOR` |
| `NO` | **T.Shough** | 287 | **72.8%** | 70.0% | 85.1% | 3.14% | 5.0% | `IN_POCKET_MANIPULATOR` |
| `JAX` | **T.Lawrence** | 193 | **72.7%** | 70.5% | 89.3% | 3.11% | 8.1% | `IN_POCKET_MANIPULATOR` |
| `NYG` | **J.McCarthy** | 48 | **72.3%** | 70.8% | 78.7% | 6.25% | 0.0% | `STRUCTURED_POCKET_PASSER` |
| `SEA` | **S.Darnold** | 189 | **72.3%** | 67.7% | 84.2% | 4.23% | 7.0% | `IN_POCKET_MANIPULATOR` |

## 2. Active Week 8 Receiver Human-Charted Ball Placement & Catchable Target Board

> [!IMPORTANT]
> Filtered for Week 8 active players (present in team's active `top_receivers` / `top_rushers` in `nfl_2026_w1_w7_trends_and_usage.json` and excluding confirmed Out/IR players: Malik Nabers, Puka Nacua, Matthew Golden, Mike Evans, Nico Collins, Jayden Reed, Saquon Barkley, Xavier Legette, Brandon Aiyuk, Ricky Pearsall, Tyreek Hill).

| Team | Receiver | Targets | Catchable Tgts | Catchable Rate% | Open Target% | Contested Catch% | Drop Rate% | Created Rec |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `ARI` | **T.McBride** | 78 | **64** | **82.1%** | 62.8% | 51.7% | 3.1% | 3 |
| `SEA` | **J.Smith-Njigba** | 78 | **64** | **82.1%** | 82.1% | 42.9% | 4.7% | 1 |
| `NO` | **C.Olave** | 71 | **54** | **76.1%** | 83.1% | 50.0% | 7.4% | 3 |
| `DAL` | **C.Lamb** | 69 | **54** | **78.3%** | 75.4% | 52.9% | 5.6% | 2 |
| `DET` | **A.St. Brown** | 68 | **48** | **70.6%** | 70.6% | 25.0% | 0.0% | 2 |
| `NYG` | **I.Likely** | 63 | **45** | **71.4%** | 82.5% | 27.3% | 2.2% | 1 |
| `BAL` | **Z.Flowers** | 53 | **43** | **81.1%** | 92.5% | 100.0% | 7.0% | 1 |
| `ARI` | **Mi.Wilson** | 66 | **42** | **63.6%** | 65.2% | 21.7% | 2.4% | 3 |
| `NYJ` | **G.Wilson** | 51 | **41** | **80.4%** | 64.7% | 50.0% | 4.9% | 2 |
| `LV` | **A.Jeanty** | 44 | **41** | **93.2%** | 95.5% | 0.0% | 12.2% | 1 |
| `ATL` | **D.London** | 56 | **39** | **69.6%** | 91.1% | 60.0% | 2.6% | 0 |
| `GB` | **C.Watson** | 56 | **39** | **69.6%** | 69.6% | 23.5% | 7.7% | 2 |
| `PIT` | **D.Metcalf** | 58 | **38** | **65.5%** | 72.4% | 31.2% | 10.5% | 2 |
| `DAL` | **G.Pickens** | 52 | **37** | **71.2%** | 78.8% | 45.5% | 10.8% | 2 |
| `CIN` | **T.Higgins** | 50 | **37** | **74.0%** | 74.0% | 53.8% | 5.4% | 4 |
| `NO` | **D.Vele** | 48 | **37** | **77.1%** | 77.1% | 45.5% | 5.4% | 6 |
| `GB` | **T.Kraft** | 43 | **37** | **86.0%** | 83.7% | 42.9% | 10.8% | 0 |
| `SF` | **C.McCaffrey** | 42 | **37** | **88.1%** | 92.9% | 100.0% | 0.0% | 0 |
| `CAR` | **T.McMillan** | 54 | **36** | **66.7%** | 88.9% | 33.3% | 2.8% | 3 |
| `TEN` | **C.Tate** | 51 | **36** | **70.6%** | 84.3% | 50.0% | 8.3% | 5 |
| `LA` | **K.Williams** | 41 | **36** | **87.8%** | 97.6% | 100.0% | 8.3% | 2 |
| `LV` | **B.Bowers** | 51 | **35** | **68.6%** | 66.7% | 35.3% | 2.9% | 4 |
| `CHI` | **L.Burden** | 47 | **35** | **74.5%** | 83.0% | 25.0% | 0.0% | 0 |
| `SF` | **G.Kittle** | 46 | **35** | **76.1%** | 82.6% | 37.5% | 2.9% | 0 |
| `HOU` | **D.Schultz** | 43 | **35** | **81.4%** | 88.4% | 80.0% | 5.7% | 1 |
