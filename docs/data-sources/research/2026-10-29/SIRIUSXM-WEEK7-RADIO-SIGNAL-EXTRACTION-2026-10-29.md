# Week 7 NFL Radio Transcript — Structured Data Extraction & Engine Wiring
**Source:** SiriusXM Fantasy Sports Radio — Elite Sports with Jeff Mans (Reaction Monday)
**Date:** October 26-27, 2026 (Week 7 reactions, ingested 2026-10-29 for Week 8 Engine)
**Verification layer:** Cross-checked against 2026 Week 7 PBP, `snap_counts_2026.csv`, and `injuries_2026.csv`

---

## 1. Verified Game Results (Key Games Referenced)

| Game | Score | Key Notes |
|------|-------|-----------|
| Cincinnati Bengals @ Baltimore Ravens | CIN 35-13 | Lamar Jackson out (ankle); Tyler Huntley started. Ravens "whitewashed". |
| San Francisco 49ers @ Atlanta Falcons | ATL 29-20 | 49ers first loss. CMC rested while leading 14-0; backups fumbled; Shanahan 0-59 when trailing by 10+ in 4th. |
| Cleveland Browns @ Tennessee Titans | CLE 27-24 | Tony Pollard: 25 carries, 129 rush yds, **3 TDs**. High DFS ownership (~30-40%). |
| Indianapolis Colts @ Minnesota Vikings | MIN 16-10 | Vikings remain 6-0. Offense limited (150 pass yds). Defense elite. |
| Tampa Bay Buccaneers @ Carolina Panthers | TB 43-13 | Bucs defense dominant; Baker Mayfield limited volume. |
| Green Bay Packers @ Detroit Lions | DET 20-17 | Low total despite high expectations; both teams bypassed points. |
| New York Giants @ Houston Texans | NYG 27-21 (OT) | Cam Skattebo hamstring concerns; Tyrone Tracy. |

---

## 2. Injury & Status Updates Wired into Stage 1 & Stage 4

| Player | Team | Status / Update | Engine Action |
|--------|------|-----------------|---------------|
| **Aaron Jones** | MIN | Day-to-day (knee / prior MCL aggravated); left W7 early (`28%` snaps) | **Jordan Mason** (`55%` W7 snaps, 15 carries / 68 yds) locked as `MIN RB1` for `MIN @ DET`. |
| **Lamar Jackson** | BAL | Missed W7 (high ankle sprain, 3rd consecutive miss); returning W8 vs BUF | Post-layoff mobility & rust caution applied in `BAL @ BUF` (`PASS` on side/total). |
| **Christian McCaffrey** | SF | Quad / thigh rest while leading 14-0 | Monitored post-bye. |
| **Cam Skattebo & Tyrone Tracy** | NYG | Hamstring concerns out of OT vs HOU | Monitored in NYG backfield table. |
| **Woody Marks** | HOU | Missed nearly a quarter in W7 | Underreported in-game snap loss logged. |

---

## 3. Player Usage, Process & DFS Leverage Signals (`evaluateSiriusXmRadioReactionSignals`)

| Signal | Matchup | Quantitative / Process Rule |
|--------|---------|-----------------------------|
| **Ashton Jeanty Receiving Volume Floor** | `LV @ NYJ` | 8 rush / 15 yds + **8 rec / 61 yds / 1 TD (21.6 PPR)** in W7. Checkdown target funnel (`8 targets`) insulates floor despite immobile pocket play. |
| **Tony Pollard 3-TD Box-Score Mirage (DFS Fade)** | `TEN @ CIN` | 25 carries, 129 yds, 3 TDs in W7 at 35% DFS ownership = unsustainable box-score luck heading into +10.0 road dog script at CIN. Hard process fade in GPP. |
| **Vikings 6-0 Defense-First / Stagnant Offense Split** | `MIN @ DET` | Undefeated 6-0 driven by Brian Flores defense (16-10 win) while offense ranks bottom-4 in yards. Reinforces `MIN @ DET UNDER 50.5` & Flores variance index. |
| **Packers / Lions Mutual-Conservative Low-Total Script** | `CAR @ GB` | `DET 20 - GB 17` (37 pts) saw LaFleur bypass points and lean on controlled clock/pass-catching RB script. Reinforces `CAR @ GB UNDER 47.5` (`59/100`). |
| **Bo Nix Scramble Ceiling Activation** | `KC @ DEN` | 62-yard scramble + first-play vertical seam to Courtland Sutton unlocks rushing floor vs Spagnuolo blitz looks. |
| **Caleb Williams Top-5 Ascent** | `CHI @ SEA` | Legitimate top-5 efficiency growth under Ben Johnson's pre-snap motion & play-action crossers. |
