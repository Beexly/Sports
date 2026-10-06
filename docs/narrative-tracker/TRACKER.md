# Narrative & Incentive Tracker — Workstream 5B

Structured narrative/incentive factors for the v5.3.0 Premium gate.
**Every entry is zero-weight until it survives historical backtesting.** This file logs
evidence; it does not move picks.

## Entry schema

| Field | Meaning |
|---|---|
| entity | Player / coach / team the narrative attaches to |
| kind | `contract` `milestone` `record` `revenge` `birthday` |
| game | Game + date the narrative applies to (or `season` for season-long) |
| details | The concrete, checkable claim (numbers, thresholds) |
| source | Publication + date + URL where possible |
| provenance | `direct-quote` `reported` `stat-derived` `unverified-example` |
| status | `verified` `unverified` `expired` |
| dedupe_key | entity + kind + threshold — prevents double-counting with beat-desk coverage |
| computed_at | When this entry was logged (UTC) |

## Rules

1. `unverified` entries NEVER feed the gate. Garrett's hypotheticals are logged as
   `unverified-example` so nobody mistakes them for facts.
2. One story = one entry. If the beat desk covers the same story, the dedupe_key
   decides which layer counts it — never both.
3. Entries expire after the game. Milestones that hit get a `result` line.
4. Contract terms come from reputable reports (Schefter/Rapoport/team announcements),
   never from aggregator speculation.

## Entries

### 2026-09-13

**N-001 — Mayfield milestone watch (today)**
- entity: Baker Mayfield | kind: milestone | game: TB @ CIN, 2026-09-13
- details: 2 pass TDs ties Tom Brady (31) for 2nd-most multi-TD games in Bucs history;
  3 pass TDs = 200 career regular-season TDs (16th QB in NFL history to do it in ≤125 games);
  1 win ties Jameis Winston (28) for 4th-most wins by a Bucs starting QB;
  250 pass yards passes Josh Freeman for 3rd-most 250-yd games in team history
- source: Pewter Report, 2026-09-12 — https://www.pewterreport.com/bucs-record-watch-2026-week-1-at-bengals/
- provenance: reported | status: verified
- dedupe_key: mayfield-milestone-2026-09-13
- computed_at: 2026-09-13T16:25Z
- note: milestones favor BUCS passing output — runs counter to the engine's Bengals ML
  lean today. Logged as evidence only; zero gate weight until backtested.

**N-002 — Mayfield extension (contract security)**
- entity: Baker Mayfield | kind: contract | game: season
- details: new 3-year, $165M contract extension (reported ~2026 offseason)
- source: Pewter Report, 2026-09-12 (cited in record-watch piece)
- provenance: reported | status: verified
- dedupe_key: mayfield-contract-2026
- computed_at: 2026-09-13T16:25Z

**N-003 — Chase single-season TD record chase**
- entity: Ja'Marr Chase | kind: record | game: season (plays today vs TB)
- details: chasing 23 receiving TDs to break the NFL single-season record (stated as his
  individual goal entering 2026; won the receiving triple crown in 2024)
- source: Sports Illustrated, 2026-08-10 (via @CameronWolfe) — https://www.si.com/nfl/bengals/onsi/bengals-star-ja-marr-chase-reveals-massive-individual-goal-entering-2026-season-01kzm4nf35w6
- provenance: direct-quote (via reporter) | status: verified
- dedupe_key: chase-td-record-2026
- computed_at: 2026-09-13T16:25Z
- note: Garrett's "needs 105 yards for a bonus" version is UNVERIFIED — do not use.
  The verified incentive is the TD record, which favors Bengals pass-catching output.

**N-004 — Kittle 600 catches (EXPIRED)**
- entity: George Kittle | kind: milestone | game: SF vs LAR, 2026-09-10 (Thursday)
- details: needed 5 catches to reach 600 (would join Kelce/Witten as only TEs with
  600+ in first 125 games)
- source: Niners Wire, 2026-09-08 — https://ninerswire.usatoday.com/story/sports/nfl/niners/2026/09/08/49ers-stats-george-kittle-travis-kelce-jason-witten/91664994007/
- provenance: stat-derived (NFL Communications) | status: expired (game played)
- dedupe_key: kittle-600-2026-09-10
- computed_at: 2026-09-13T16:25Z

### 2026-09-20 (logged early)

**N-005 — Mayfield revenge game vs Browns**
- entity: Baker Mayfield | kind: revenge | game: CLE @ TB, 2026-09-20
- details: Mayfield has the home game vs Cleveland (the team that traded him) circled;
  "First home game. Week 2. Cleveland... [I'm] about that action, boss."
- source: Athlon Sports, ~2026-08-14; Sports Illustrated
- provenance: direct-quote | status: verified
- dedupe_key: mayfield-revenge-cle-2026-09-20
- computed_at: 2026-09-13T16:25Z
