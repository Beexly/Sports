# Bills vs. Lions (Thu 2026-09-17, 7:15 PM CT) — Prop Consensus Research Notes

Research-only file. Nothing here is a pick. Fair use: only line/juice facts were preserved from sources, never article text.

## Method
- Public odds-aggregator / public odds pages only. No logins, paywalls, scraping tricks, invented endpoints, or bot circumvention.
- Every CSV row carries an exact source URL and a real fetch timestamp. Where the source page displayed no update time, `source_page_timestamp` is written as "not displayed" (or the page's own stated stamp) and `fetched_at_ct` records the actual fetch — 2026-09-17 ~14:00 CDT, hours before the 7:15 PM CT kickoff, while lines were still moving.
- Lines moved intraday. The notes below document the observed movement; the CSV holds the most recent verified snapshot.

## Consensus (median / range among comparable standard O/U lines only)
Alternate thresholds (Gibbs 100+ rushing, Kincaid 75+ receiving) and historical/opening lines are kept OUT of the medians.

- **Game total:** current books FanDuel 54.5 (O -114 / U -106) and BetMGM 54.5 (O -112 / U -105) agree at **54.5** — two-book consensus. Historical trail: opener 52.5 (DraftKings, ~3 days earlier) → 53.5 (VSiN, Sep 16) → 54.5 (Sep 17). Full observed range 52.5–54.5.
- **Spread:** FanDuel Bills -4.5 (-115) / Lions +4.5 (-105); BetMGM Bills -5 (-110) / Lions +5 (-108). Current range Bills **-4.5 to -5**. Opened Bills -3 (USA Today, DK preview).
- **Moneyline:** FanDuel Bills -235 / Lions +194; BetMGM Bills -225 / Lions +185; VSiN reports -200 or higher (was -160). Current range roughly Bills **-225 to -235**.
- **Jared Goff passing yards:** FanDuel 257.5 (O -113) vs BetMGM 267.5 (U -115). Range 257.5–267.5, midpoint 262.5. Only two books — treat as a range, not a consensus.
- **Josh Allen passing yards:** DraftKings 250.5 (O -111) is the only book-identified standard line. No cross-book median available.
- **Jahmyr Gibbs rushing yards:** DraftKings 89.5 (O -112) is the only book-identified standard line; BetMGM's 100+ (+115) is an alternate threshold, not comparable.
- **Josh Allen passing TDs:** FanDuel Under 1.5 (+136) is the only book-identified line.
- Everything else in the CSV is a single-book FanDuel line — no cross-book consensus exists from public sources found today.

## Intraday line movement (SportsGrid/FanDuel search snippets vs. live pages, same day)
- Jameson Williams: receptions 3.5 Over -192 → **-148**; longest reception 23.5 Over -122 → **24.5 Over -108**; receiving yards 59.5 Over -113 → **57.5 Over -113**.
- DJ Moore receiving yards: 62.5 → **63.5** (Under -113).
- Khalil Shakir: receptions Over +102 → **+112**; longest reception Over -122 → **-125**.
- Josh Allen passing TDs: Under 1.5 +134 → **+136**.
- James Cook longest reception: Over -112 → **-114**.

## Book-unspecified lines (in notes only, NOT in CSV as book rows)
- FTW anytime TDs (book not named on page): Gibbs -330, St. Brown +105, Kincaid +170, DJ Moore +150. Source: https://ftw.usatoday.com/story/sports/nfl/2026/09/17/lions-bills-anytime-td-scorer-predictions/91796651007/
- HelloRookie QB markets (book not named): Allen passing yards 248.5 Over -114; Goff passing yards 265.5 Over -111 ("some books" 270.5 Over -114); Allen passing TDs 1.5 Over -166. Article says Allen opened ~219.5–223.5 before steaming toward 250. Source: https://hellorookie.com/3-qb-passing-props-to-back-for-lions-vs-bills-on-tnf/
- VSiN/Review-Journal: Dawson Knox Over 12.5 receiving yards (-114); says 12.5 still available "at several sportsbooks" without naming one. OptaAI projection cited: 22.48 yards. Source: https://www.reviewjournal.com/sports/betting/thursday-night-football-betting-avoid-the-game-lines-play-the-props-3887074/
- USA Today preview: Gibbs rushing + receiving 119.5 (side Over, juice/book not shown); total moved ~52.5 to 54.5.
- PrizePicks (DFS, not a sportsbook — excluded from book consensus): DJ Moore receiving yards 62.5; Jameson Williams receptions 4. Source: https://www.si.com/onsi/fantasy/dfs/josh-allen-and-3-other-prizepicks-props-bills-lions-thursday-night-football

## Gaps (searched, not found publicly)
- **Pinnacle / Circa:** no public Pinnacle or Circa player-prop numbers found anywhere today. Gap stands.
- **Defensive props:** SportsGrid renders no defensive markets — checked Aidan Hutchinson, Alim McNeill, Greg Rousseau player pages; no sacks/tackles lines anywhere. No other public source showed them.
- **Kicking props:** no individual Tyler Bass / Jake Bates prop lines found. Only team-level kicking market: BetMGM "Both teams to make 2+ field goals" +275 (SportsbookWire).
- **First TD scorer:** no public first-TD board found.
- **Amon-Ra St. Brown FanDuel receiving props:** the PICKS section of his SportsGrid page failed to render on two separate opens. FanDuel-side ASB receiving lines are a gap; book-identified ASB lines are DraftKings receptions 7.5 Over -111 (SI) and SIA anytime TD +115.
- **Jahmyr Gibbs FanDuel rushing yards:** not among the markets SportsGrid displayed (only receiving markets shown).
- **Under juice:** SportsGrid pages show only the Over-side price for O/U markets, so full two-way pricing is unavailable there.
- **Multi-book aggregators:** FantasyPros player-props page failed to fetch; Covers, OddsShark, VegasInsider, Pickswise, SportsLine surfaced no rendered multi-book player-prop table; RotoWire's game page showed team implied totals but player props stayed "Loading Possible Bets." No true current multi-book prop table was reachable from public pages today.

## Source ranking (by usable book-identified coverage for this game)
1. **SportsGrid** — 30 FanDuel prop rows across 10 players; live, single-book, over-side prices only.
2. **SportsbookWire** — 5 BetMGM markets with an explicit page timestamp (8:02 AM CT), plus game lines with timestamps.
3. **SI (betting)** — 3 DraftKings core props.
4. **FTW** — full FanDuel game lines (spread/ML/total); 4 anytime-TD prices with book unnamed.
5. **Sports Interaction** — 2 book-identified anytime-TD lines (St. Brown +115, Gibbs -275).
6. **Action Network** — 1 book-identified anytime-TD line (LaPorta +230 bet365; note the article's own body text says +220 — discrepancy recorded in CSV).
7. **HelloRookie / VSiN / USA Today** — contextual or book-unspecified lines, movement evidence only.
8. **RotoWire / FantasyPros / Covers / OddsShark / VegasInsider / Pickswise / SportsLine** — no usable rendered prop data today.

## Roster corrections verified today
- **David Montgomery plays for Houston, not Detroit** (BUF held HOU's Montgomery to 60 rush yards in Week 1; SI and SportsGrid rosters confirm). No Detroit Montgomery prop exists. He was omitted, not missed.
- **DJ Moore plays for Buffalo** (acquired from Chicago for a 2026 second-round pick). All his lines are BUF lines. NBC noted he "leaves late in game" in Week 1 (5/100/1) — verify his status before kickoff.
- Detroit's listed RBs behind Gibbs are Sione Vaki and Jacob Saylors; Detroit's kicker is Jake Bates, Buffalo's is Tyler Bass.

## Game context flags (not lines)
- Week 1: Bills 36–31 at Houston; Lions 31–30 OT vs. New Orleans. First regular-season game in the new $2.1B Highmark Stadium.
- Detroit secondary injuries: safeties Brian Branch and Kerby Joseph on PUP; CB D.J. Reed questionable (foot); CB D.J. Reed (foot) per SI depth chart.
- Weather: one source flags possible rain/wind in Buffalo Thursday — could matter for kicking props.
- RotoWire's Week 1 sheet (not this game) had Jake Bates Over 8.5 kicking points (-111 DK) — do NOT use as a Week 2 number.
