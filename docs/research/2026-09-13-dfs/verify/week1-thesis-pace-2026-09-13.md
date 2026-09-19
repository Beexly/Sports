# Week 1 Thesis & Pace Claims — Verification

**Date:** 2026-09-13 (CDT)
**Method:** Public web search/fetch only. Verdicts: `CONFIRMED` / `CORRECTED` / `UNVERIFIABLE`.

## Pace methodology note (read first)

Pace was evaluated using **2025 total offensive plays per game** for all 32 teams — this is **play volume**, not situation-neutral pace (seconds-per-play in neutral situations). Every relevant team below carries its 2025 rank and value. One attempted TeamRankings fetch failed (terminal for this run); figures come from StatMuse's 2025 plays/game league table, cross-checked against official team stats pages (Dolphins, Raiders, Vikings) and StatMuse team pages (Titans, Ravens).

---

## Claim 1 — "Twelve of 16 NFL Week 1 games went under in 2025."

**Verdict: UNVERIFIABLE**

- The general "Week 1 unders" trend is widely documented (Covers and others have covered it), but **no allowed source states the exact 12-of-16 figure**.
- The only verbatim match for the exact claim found during research appears on a source on the forbidden list, so it cannot be used.
- A SportsbookReview forum thread (09-12-2025) has a poster claiming unders were 13-4 "through the first seventeen NFL games (including last night's under 48.5)" — i.e., Week 1 plus the Week 2 Thursday game — which would arithmetically imply 12-4 in Week 1 *if* the Thursday game went under, but that is one poster's arithmetic, not an audited ledger, and the Thursday total was not independently confirmed.
- A full 16-game archived-totals reconstruction was not completed in this run. Do not publish the number.

**Sources:** Covers Week 1 coverage (https://covers.com/nfl/nfl-odds-week-1); SportsbookReview forum thread (https://www.sportsbookreview.com/forum/players-talk/29899995-nfl-totals-thus-far).

---

## Claim 2 — "Only two quarterbacks threw for 300+ yards in 2024 Week 1."

**Verdict: CONFIRMED — exactly two.**

Per StatMuse's 2024 Week 1 passing leaders, the top totals were:

| QB | Yards |
|---|---:|
| Tua Tagovailoa | 338 |
| Matthew Stafford | 317 |
| Next-highest QB | 291 |

Exactly two QBs cleared 300; the next closest was 291.

**Source:** StatMuse — NFL passing leaders, Week 1 2024 (https://www.statmuse.com/nfl/ask/nfl-passing-leaders-week-1-2024), observed 2026-09-13.

---

## Claim 3 — "'Run-heavy teams' ran on 60–73% of opening offensive plays across 2021–2025 Week 1."

**Verdict: UNVERIFIABLE**

- No allowed source was found that (a) defines "run-heavy teams," (b) defines "opening offensive plays" (first snap? first 15 plays? first drive?), or (c) confirms the 60–73% range **specifically for Week 1 games over 2021–2025**.
- The only sources surfaced carrying the 60–73%-style figures are on the forbidden list and could not be used. A Medium analysis of scripted first drives (nflfastR-based) discusses opening-drive scripting generally but does not contain these figures.
- Treat as anecdote-level framing, not a citable stat, until an allowed source with a defined methodology is found.

---

## Claim 4 — "The fastest 2026 Week 1 pace environments are DAL@NYG, NO@DET, and WAS@PHI."

**Verdict: CORRECTED — one of three holds; one is mid-pack; one is actually among the SLOWEST.**

All 16 Week 1 games ranked by combined 2025 plays/game (two-team average):

| # | Game | Avg plays/team/gm | Team ranks |
|---:|---|---:|---|
| 1 | **DAL@NYG** | **64.85** | 1 + 8 |
| 2 | **BUF@HOU** | **63.83** | 10 + 6 |
| 3 | **ARI@LAC** | **63.80** | 12 + 3 |
| 4 | SF@LAR | 63.77 | 9 + 7 |
| 5 | DEN@KC | 63.33 | 5 + 15 |
| 6 | NO@DET | 62.89 | 11 + 14 |
| 7 | TB@CIN | 62.50 | 13 + 16 |
| 8 | CLE@JAX | 62.44 | 19 + 4 |
| 9 | CHI@CAR | 62.18 | 2 + 22 |
| 10 | NE@SEA | 60.56 | 18 + 21 |
| 11 | ATL@PIT | 59.89 | 17 + 29 |
| 12 | NYJ@TEN | 59.24 | T-23 + 26 |
| 13 | BAL@IND | 58.59 | 32 + 20 |
| 14 | GB@MIN | 58.80 | T-23 + 28 |
| 15 | WAS@PHI | 58.83 | 27 + T-23 |
| 16 | MIA@LV | 57.44 | 30 + 31 |

- **DAL@NYG — CONFIRMED** as the fastest environment on the slate (ranks 1 and 8, 64.85 avg).
- **NO@DET — REJECTED as "top 3."** It is the 6th-fastest game (62.89 avg), above average but not elite.
- **WAS@PHI — MAJOR CORRECTION.** This is the **3rd-slowest** game on the slate (58.83 avg; ranks 27 and T-23), not a fast one.
- **Corrected fastest three: DAL@NYG (64.85), BUF@HOU (63.83), ARI@LAC (63.80).** SF@LAR (63.77) is a hair behind third.
- **Regime flag:** LAC's 2025 figure (#3, 64.41) predates Mike McDaniel's 2026 OC scheme (flag per assignment brief). BUF@HOU's strength rests on two genuinely fast 2025 teams with no regime flag.

---

## Claim 5 — "The slowest are TB@CIN, MIA@LV, and ATL@PIT."

**Verdict: CORRECTED — one of three holds; one is mid-fast; one is mid-low.**

- **MIA@LV — CONFIRMED** as the slowest pairing on the slate (ranks 30 and 31, 57.44 avg).
- **TB@CIN — MAJOR CORRECTION.** It is the **7th-fastest** game on the slate (62.50 avg; ranks 13 and 16), both teams above the league median.
- **ATL@PIT — REJECTED as "bottom 3."** It ranks 11th of 16 (59.89 avg): Pittsburgh is slow (29th) but Atlanta is mid-pack (17th).
- **Corrected slowest three: MIA@LV (57.44), BAL@IND (58.59), GB@MIN (58.80).** WAS@PHI (58.83) sits just behind, so the original list's WAS@PHI (from Claim 4) actually belongs in this conversation.
- **Regime flag:** BAL's 2025 figure (#32, 57.29) predates the Jesse Minter 2026 era (flag per assignment brief). **Caveat on BAL:** two sources agree on 974 plays (StatMuse Ravens team page; ESPN team stats), but StatMuse's own Ravens team page also displays a "29th" plays-rank value that conflicts with the league-table placement — the 32nd placement follows arithmetically from 974 < 975 (LV). This does not change any verdict: MIA@LV is the slowest pairing under any reading, and BAL@IND remains in the bottom cluster.
- **Regime note (rejected pick):** ATL's 2025 figure predates Kevin Stefanski's 2026 regime — worth flagging if ATL@PIT is mentioned in any corrected copy.

---

## 2025 plays/game — full league table

StatMuse 2025 plays/game (plays ÷ 17). GB/NYJ/PHI tied at 59.41 (shown T-23).

| Rk | Team | Plays/gm | Plays | Rk | Team | Plays/gm | Plays |
|---:|---|---:|---:|---:|---|---:|---:|
| 1 | DAL | 65.88 | 1,120 | 17 | ATL | 61.65 | 1,048 |
| 2 | CHI | 64.88 | 1,103 | 18 | NE | 61.41 | 1,044 |
| 3 | LAC | 64.41 | 1,095 | 19 | CLE | 60.59 | 1,030 |
| 4 | JAX | 64.29 | 1,093 | 20 | IND | 59.88 | 1,018 |
| 5 | DEN | 64.24 | 1,092 | 21 | SEA | 59.71 | 1,015 |
| 6 | HOU | 64.00 | 1,088 | 22 | CAR | 59.47 | 1,011 |
| 7 | LAR | 63.88 | 1,086 | T-23 | GB | 59.41 | 1,010 |
| 8 | NYG | 63.82 | 1,085 | T-23 | NYJ | 59.41 | 1,010 |
| 9 | SF | 63.65 | 1,082 | T-23 | PHI | 59.41 | 1,010 |
| 10 | BUF | 63.65 | 1,082 | 26 | TEN | 59.06 | 1,004 |
| 11 | NO | 63.24 | 1,075 | 27 | WAS | 58.24 | 990 |
| 12 | ARI | 63.18 | 1,074 | 28 | MIN | 58.18 | 989 |
| 13 | TB | 62.82 | 1,068 | 29 | PIT | 58.12 | 988 |
| 14 | DET | 62.53 | 1,063 | 30 | MIA | 57.53 | 978 |
| 15 | KC | 62.41 | 1,061 | 31 | LV | 57.35 | 975 |
| 16 | CIN | 62.18 | 1,057 | 32 | BAL | 57.29 | 974 |

**Sources:**
- StatMuse 2025 offensive-plays-per-game league table (https://www.statmuse.com/nfl/ask/nfl-team-with-the-most-offensive-plays-per-game-this-season), observed 2026-09-13
- StatMuse Titans 2025 team page — 1,004 plays, 26th (https://www.Statmuse.Com/nfl/team/tennessee-titans-72/2025)
- Miami Dolphins official stats 2025 — 978 plays (https://www.miamidolphins.com/team/stats/2025/REG)
- Las Vegas Raiders official stats 2025 — 975 plays (https://www.raiders.com/team/stats/2025/reg)
- Minnesota Vikings official stats 2025 — 989 plays (https://www.vikings.com/team/stats/2025/reg)
- StatMuse Ravens 2025 team page — 974 plays (https://www.statmuse.com/nfl/ask/raven-savks)
- Cross-checks (earlier StatMuse result rows): WAS 990, MIN 989, PIT 988, PHI 1,010 (T-23)

---

## Verdict table

| Claim | Verdict | Corrected figures |
|---|---|---|
| 12 of 16 games went under in 2025 Week 1 | **UNVERIFIABLE** | No allowed source confirms the exact figure |
| Only two QBs threw 300+ yards in 2024 Week 1 | **CONFIRMED** | Tua 338, Stafford 317, next-highest 291 |
| Run-heavy teams ran 60–73% of opening plays, 2021–2025 Week 1 | **UNVERIFIABLE** | No allowed source with this methodology/figures |
| Fastest: DAL@NYG, NO@DET, WAS@PHI | **CORRECTED** | DAL@NYG (64.85), BUF@HOU (63.83), ARI@LAC (63.80); NO@DET is 6th (62.89); WAS@PHI is 3rd-slowest (58.83) |
| Slowest: TB@CIN, MIA@LV, ATL@PIT | **CORRECTED** | MIA@LV (57.44), BAL@IND (58.59), GB@MIN (58.80); TB@CIN is 7th-fastest (62.50); ATL@PIT is 11th (59.89) |

**Regime flags:** LAC (2025 data predates McDaniel OC) — relevant, LAC appears in corrected fastest group. BAL (2025 data predates Minter era) — relevant, BAL appears in corrected slowest group. ATL (2025 data predates Stefanski) — relevant only if ATL@PIT is referenced.
