# Week 10 Roster & Injury Verification — 64 Morning Sweep CSVs vs. Verified Truth (2026-11-13)

Verified by Motif, Friday Nov 13, 2026 (imported from `"C:\Users\Garrett\Downloads\WEEK10-ROSTER-INJURY-VERIFICATION-2026-11-13 (1).md"`).
Scope: all 64 CSVs in Beexly/Sports commit `374eafe9` (`docs/research/2026-11-13/full-tables/`, Nov 13 morning analytics sweep), audited for player-to-team assignments and availability claims against primary team sources, Foundry dossiers, PM refresh pass, and Garrett's standing Week 10 roster rulings.

## Bottom Line
- **14 stale season-stat player-team rows** found, all across **5 `sfdata-*-2026.csv` tables**. Every one tags a player with a team he played for earlier in 2026 rather than his Week 10 active team.
- **ZERO false availability or injury claims** anywhere in the 64 files.
- **Zero edits to the 64 source CSVs** (they are faithful transcriptions of their source posts). Corrections are enforced via:
  1. `AGENTS.md` errata note beside the `2026-11-13` inventory section.
  2. Programmatic entity remapping & quarantine in `intelligence/foundry_bridge/week10_reasoning_mind_bridge.py` (`resolve_week10_csv_entity_row`).

## The 14 Stale Rows (Source Table Tag vs. Week 10 Active Team)
1. **Kyler Murray** — printed as `ARI`, **Week 10 Truth: `MIN` (Minnesota Vikings)**
   - `sfdata-qb-ryoe-2026.csv`: `4,K.Murray,ARI,33.7`
   - `sfdata-throwaway-rate-2026.csv`: `8,K.Murray,ARI,6.5`
   - `sfdata-time-to-scramble-2026.csv`: `25,K.Murray,ARI,5.37`
   - `sfdata-expected-completion-pct-2026.csv`: `14,K.Murray,ARI,64.0`
2. **Kirk Cousins** — printed as `LV` (former team), **Week 10 Truth: `MIN` (Minnesota Vikings)**
   - `sfdata-qb-ryoe-2026.csv`: `33,K.Cousins,LV,-31.0`
   - `sfdata-throwaway-rate-2026.csv`: `22,K.Cousins,LV,3.8`
   - `sfdata-time-to-scramble-2026.csv`: `6,K.Cousins,LV,4.4`
   - `sfdata-expected-completion-pct-2026.csv`: `27,K.Cousins,LV,60.1`
   - `sfdata-quick-pressure-rate-2026.csv`: `2,K.Cousins,LV,9.1`
3. **Jacoby Brissett** — printed as `ARI` (Week 1–8 earned stats before Nov 1 relief by Minshew), **Week 10 Truth: `BAL` (Baltimore Ravens, Garrett standing ruling)**
   - `sfdata-qb-ryoe-2026.csv`: `30,J.Brissett,ARI,-23.6`
   - `sfdata-throwaway-rate-2026.csv`: `17,J.Brissett,ARI,4.6`
   - `sfdata-time-to-scramble-2026.csv`: `15,J.Brissett,ARI,4.9`
   - `sfdata-expected-completion-pct-2026.csv`: `30,J.Brissett,ARI,58.7`
4. **J.J. McCarthy** — printed as `MIN`, **Week 10 Truth: `NYG` (New York Giants; acquired from MIN Sep 28, 2026 for a 2027 5th; Jaxson Dart out for season)**
   - `sfdata-qb-ryoe-2026.csv`: `J.McCarthy` / `J.J. McCarthy` tagged `MIN` (`WAS@NYG` box-score CSV tagging `NYG` is correct).

Note: Later `gwttkb` aggressiveness table correctly lists `K.Murray (MIN)`, `K.Cousins (MIN)`, and `J.Brissett (BAL)`.

## Cross-File Conventions & Trade-Deadline / FA Adjudication
- **Josh Downs:** `statyx` tags `KC` (active post-Nov 10 trade deadline); two `gridiron` tables tag `IND` (earned stats: 33 catches, 354 yds matching Colts release). Both are right under their table conventions; **Week 10 Truth = `KC`**.
- **Kenneth Walker III:** Tagged `KC` (`3yr/$43M` FA signing Mar 12, 2026 after Super Bowl LX MVP) — **Week 10 Truth = `KC`**.
- **Tyler Allgeier:** Tagged `ARI` (`2yr` FA signing Mar 12, 2026) — **Week 10 Truth = `ARI`**.
- **Keenan Allen:** Acquired by `SF` from `IND` (2027 6th) — **Week 10 Truth = `SF`**.

## Quarantined Source Anomaly & Cleared Non-Claims
- **Quarantined Anomaly:** `sfdata-qb-ryoe-2026.csv` lists `J. Daniels` twice (`WAS #1` = Jayden Daniels valid; `TB #20` = unverified duplicate anomaly — quarantined, not treated as fact).
- **Cleared Non-Claims:** Blank team cells in `pff-pressures-since-2020-2026.csv` (missing, not false team); `"OUT"` in `bills-jets-matchup-out` and `pff-burden-top-wr-grade-out` (structural rank/matchup label); `LaPorta OUT` in `magic-jameson-williams-laporta-splits-2026.csv` (historical 8-game on/off split).

## Authoritative Week 10 Availability & Moves Reference (Fri 2026-11-13)
- **Moves:** Garrett `CLE->LAR` (Jun 1; Verse + 3 picks to CLE), Simmons `TEN->CHI` (Oct 29), McDuffie `KC->LAR`, Hooker `TEN->BUF` (Week 10), Bates `ATL->JAX`, Downs `IND->KC` (Nov 10), Allen `IND->SF`, Cousins `LV->MIN`, McCarthy `MIN->NYG` (Sep 28), Walker III `SEA->KC`, Allgeier `ATL->ARI`, Coaches Stefanski `ATL`, Monken `CLE`.
- **Availability:** Parsons (`GB`, not playing / PUP), Nacua & Adams (`LAR`, IR/out), Aiyuk (`SF`, exempt/out), Jaxson Dart (`NYG`, out for season), Ferguson (`DAL`, out multi-week), Brewer (`MIA`, out protocol), Sieler (`MIA`, out for season), Minshew (`ARI`, IR/season), McDuffie (`LAR`, questionable), Derrick Brown (`CAR`, playing), Trent Williams & Dre Greenlaw (`SF`, limited corroborated), Garrett Wilson (`NYJ`, full Friday / formal clearance pending), Kirk Cousins (`MIN`, expected to start / not formally announced), Kyle McCord (`MIA`, first career start), Carson Beck (`ARI`, first career start).
