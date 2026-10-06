# X-Scan Lane — Sweep 4 (final breaking-news sweep)

- **Sweep-4 window:** last-chance material NEW since Sweep 3 (Saturday afternoon, 2026-09-19). Deduplicated against Sweeps 1-3 and the briefing corpus.
- **Method:** `browser.search` (news vertical, since=2026-09-19) + one `browser.open` attempt on the Sporting News index page (resolved to the NFL homepage; headlines below are from its crawl 2 hrs ago).

## Named-account coverage (Sweep 4)

- **All 17 named accounts:** no new indexed posts surfaced in Sweep 4's searches. Same indexing caveat as prior sweeps.

## Final injury/designation items (new detail vs prior sweeps)

1. **Commanders (via commanderswire, 18 hrs old):** LB Frankie Luvu (groin strain, Week 1 vs PHI) and TE Chig Okonkwo (hamstring) officially OUT vs DAL. HC Dan Quinn: "Frankie and Chig weren't able to make it back this week... Neither appears to be a long-term issue." TE replacement: Quinn said it "could be the one to watch" Colson Yankoff, with Ben Sinnott and blocking ace John Bates also in the mix: "none offer the same type of athleticism as Okonkwo." On Luvu: "There's an energy that comes with him... I like him as a blitzer... So, we’ll definitely miss Frankie." LB communication falls to Sonny Styles and Leo Chenal.
2. **Chiefs (via chiefswire, 14 hrs old):** LT Josh Simmons (back) DNP all week, officially OUT vs IND (SNF) — second straight missed game; "no clear timeline for Simmons' return." Rookie Kahlil Benson starts at left tackle. (Confirms + extends Sweep 1's OUT.)
3. **Ravens (via ravenswire, 19 hrs old):** Zay Flowers DOUBTFUL (hamstring); Jeff Zrebiec (The Athletic) reports Flowers is not expected to be available. OUT: DT Nnamdi Madubuike, ILB Teddye Buchanan (both limited all week, couldn't gain clearance), CB T.J. Tampa (knee, DNP all week). QUESTIONABLE: OLB Trey Hendrickson (finger — returned limited Friday), LG John Simpson, LT Ronnie Stanley (both returned limited Friday). If Flowers inactive: available WRs Rashod Bateman, Chris Moore, Devontez Walker, LaJohntay Wester; Elijah Sarratt could make his NFL regular-season debut. Devontez Walker practiced fully all week (was out Week 1 with a groin injury). No designation: Calais Campbell, Jaylinn Hawkins, Keondre Jackson.
4. **Colts (via coltswire, 21 hrs old):** WR Ashton Dulin (ankle) ruled OUT vs KC — DNP all three days. Week 1: 10 offensive snaps + 19 special-teams snaps; core special teamer and kick returner. Laquon Treadwell likely becomes WR4; kick-return options: Seth McGowan, Josh Downs, Deion Burks, or practice-squad Anthony Gould.
5. **Vikings (via vikingswire, 19 hrs old):** QB Kyler Murray (concussion, suffered Week 1 vs Green Bay) OUT — limited in practice all week, Vikings "will play it safe"; Carson Wentz starts. WR Jauan Jennings OUT (personal matter, DNP all week) — NEW name vs prior sweeps. RT Brian O'Neill (knee, DNP Thursday, returned Friday) QUESTIONABLE. No one else has an injury designation. Bears listed NOBODY with a designation — clean bill of health (confirms SI report below).
6. **Broncos (via broncoswire, 17 hrs old):** WR Marvin Mims (foot) OUT vs JAX — 9 offensive snaps Week 1, but All-Pro returner holding the NFL record with a career 15.9-yard punt-return average. RB RJ Harvey (hamstring) QUESTIONABLE (limited Thu/Fri). Week 1 backfield: J.K. Dobbins 8 carries, Harvey 3, Jonah Coleman 0; Harvey 4/4 on targets as a receiver. If Harvey sits: Coleman becomes RB2, Tyler Badie dresses as RB3. Return replacements: Badie/Harvey on kickoffs, Riley Moss on punts (Moss had none Week 1; Kris Abrams-Draine had one fair catch). Jaguars: all 53 active-roster players healthy and cleared.
7. **Bears (via SI, 1 day old):** clean bill of health — D'Andre Swift (ankle/knee), Kyle Monangai (hamstring), Darnell Wright (knee), Ozzy Trapilo (knee), Xavier Woods (groin) all full practice with no designations. Trapilo's first full practice since coming off PUP in camp; Braxton Jones still expected at LT. Woods (groin) was slated to start at safety Week 1 before being ruled inactive — Cam Lewis started instead; Malik Muhammad played the slot and drew praise from HC Ben Johnson. Woods' return creates a safety/slot rotation question.

## Sporting News headline crawl (fresh confirmations + new roster facts)

From the Sporting News NFL index (crawled ~2 hrs ago):

- "Texans make Nico Collins decision for Week 2 that confirms injury fears" — consistent with OUT.
- "Vikings make official Kyler Murray, Carson Wentz decision for Bears matchup" — consistent.
- "Falcons hit with major Michael Penix Jr. news ahead of Panthers game — officially been ruled out" — consistent with Sweep 1.
- "Falcons' Cooper Rush news comes amid unfortunate Michael Penix Jr. update — another week likely to be without QB1 or QB2 for Atlanta" — consistent (Rush starts; Penix out; Tagovailoa doubtful).
- "Steelers reportedly have NFC suitor for Joey Porter Jr. after relationship takes big hit — a team has been in contact with Pittsburgh for Porter" — extends the Porter trade-request item from Sweep 3.
- **NEW roster facts (2026):** Geno Smith is the Jets' starting QB ("The Jets starting QB could be the reason the team wins in Week 2"); Lamar Jackson is the Ravens' QB; Caleb Williams is the Bears' QB ("Bears' Caleb Williams faces biggest challenge yet in Vikings showdown"); Jaxson Dart is the Giants' QB ("Jaxson Dart enters his first real test of the Giants' new era"); the Giants are 1-0 after "their win over the Cowboys" in Week 1. Anne Erickson/Matt Sullivan/Hunter Cookston/Horace Shivers bylines.
- "Cowboys make surprising Jaishawn Barham decision for Week 2 — This is a very unexpected decision for the Cowboys, and it's a risky one." Details NOT captured (article not opened); flagged as a follow-up, not a fact.

## Caveats

- The Sporting News crawl only exposed headlines, not article bodies — the Geno Smith/Lamar Jackson/Williams/Dart/Giants-win facts are headline-level and should be corroborated before use as more than roster context.
- The Barham "surprising decision" is unverified detail; do not use it until the article is read.
- Pregame inactives (90 min before kickoff) remain the final word on all questionable/doubtful tags: McConkey, Flowers, Pittman, Bowers, Olave, Bradford, Van Ness, Gray, Harvey, O'Neill.

## Files produced

- `deep/x-sweep4.md` (this file)
- `raw/x-t-shoe-index-wk2-lookahead.csv` (T Shoe Index Week 2 projections, 8-day-old look-ahead transcribed for the model-projection record)
