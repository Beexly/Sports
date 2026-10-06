# LANE BRIEFING — DraftKings NFL Week 2 DFS Research (2026-09-19)

Today: Saturday 2026-09-19 CDT. DraftKings Classic MAIN SLATE locks Sunday 2026-09-20.
RESEARCH ONLY. No lineup construction. No posts anywhere. No messages sent.

## CONFIRMED MAIN SLATE (14 Sunday games — DET@BUF played Thu 9/17, EXCLUDED; NYG@LAR is Mon 9/21, EXCLUDED from main slate)

Spreads/totals are ranges from rg.org consensus (as of Wed 2026-09-16) + bet365 9/14. Verify against live lines in your phase 1.

| # | Game (ET) | Spread | Total | Implied home | Implied away |
|---|-----------|--------|-------|--------------|--------------|
| 1 | CAR @ ATL, Sun 1pm | CAR -1.5 to -2.5 (MOVED: bet365 9/14 had ATL -1.5; now CAR favored) | 43.5-44.5 | ~23 | ~21 |
| 2 | NO @ BAL, Sun 1pm | BAL -8.5/-9.5 | 46.5-47.5 | ~28 | ~19 |
| 3 | MIN @ CHI, Sun 1pm | CHI -5.5 | 48.5 | ~27 | ~21.5 |
| 4 | CIN @ HOU, Sun 1pm | HOU -2.5/-3 | 46.5 | ~24.5 | ~22 |
| 5 | PIT @ NE, Sun 1pm | NE -4.5 to -5.5 | 41.5/42.5 | ~23 | ~18 |
| 6 | GB @ NYJ, Sun 1pm | GB -3.5 | 44.5/45.5 | ~20.5 (NYJ) | ~24 (GB) |
| 7 | CLE @ TB, Sun 1pm | TB -7.5/-8.5 | 41-42.5 | ~24.5 | ~16.5 |
| 8 | PHI @ TEN, Sun 1pm | PHI -6.5/-7 | 38.5/39.5 | ~16 (TEN) | ~22.5 (PHI) |
| 9 | JAX @ DEN, Sun 4:05pm | DEN -2.5/-3 | 44.5-45.5 | ~23.5 | ~21 |
| 10 | LV @ LAC, Sun 4:05pm | LAC -6.5 | 43.5 | ~25 | ~18.5 |
| 11 | SEA @ ARI, Sun 4:25pm | SEA -4/-4.5 | 41/41.5 | ~18.5 (ARI) | ~22.5 (SEA) |
| 12 | MIA @ SF, Sun 4:25pm | SF -13.5 | 45.5/46.5 | ~29.5 | ~16 |
| 13 | WAS @ DAL, Sun 4:25pm | DAL -3.5/-4 | 50.5 (HIGHEST) | ~27 | ~23.5 |
| 14 | IND @ KC, Sun 8:20pm | KC -6.5/-7 | 46.5/47 | ~26.5 | ~20 |

Implied-total formula: team_implied = total/2 − signed_spread/2 (per reverse-engineering report).
Highest totals: WAS@DAL 50.5, MIN@CHI 48.5, CIN@HOU 46.5, IND@KC 46.5/47, NO@BAL 46.5/47.5.

## INJURY / NEWS BASELINE (from parent's social sweep 9/17-9/18 — VERIFY each against official reports, these are claims not facts)
- Nico Collins (HOU WR) — RULED OUT Wk2 (hamstring, official NFL graphic 9/18). Conflicts with internal recovery chart (29% Wk2) — official wins.
- Joe Burrow (CIN QB) — QUESTIONABLE (back, limited Wed; Rapoport says expected to play)
- Sam Darnold (SEA QB) — OUT (Seahawks)
- Zay Flowers (BAL WR) — DOUBTFUL (hamstring); recovery chart: 47% Wk2, 14.0→12.0 PPG
- Joey Porter Jr. (PIT CB) — OUT
- Michael Pittman Jr. (IND WR) — questionable (foot)
- Warren Brinson (GB DT) — OUT (calf); Javon Hargrave (GB DT) — doubtful
- Aaron Donald return rumors vs Giants — UNVERIFIED rumor; treat adversarially (likely noise)
- Final injury reports already out for: NO@BAL, PIT@NE, GB@NYJ, LAC@LV, TEN@PHI, CLE@TB, DAL@WSH

## INTERNAL CORPUS (use this to cross-check everything — the Phase 2 edge)
Repo: ~/workspace/vendor/Sports (local checkout of Beexly/Sports)
- AGENTS.md lines ~2500-3502: full X-analytics inventory 9/17-9/19 (benchmark sections). Key items:
  - @sfdata9ers Week 1 playcalling tendencies (FTN charting): LAC 84.3% motion leader; TB 25.5% play action; TEN & NO 22%+ no-huddle; WAS 14.7% RPO
  - @hawkblogger pressure rates (FTN): generated|allowed — KC 56.3%|39.4%, DEN 39.4%|56.3% (worst allowed), LV 40.5%|6.5%, MIA 6.5%|40.5%, HOU 18.2%|28.6%
  - @benbbaldwin v3 objective team tiers (Kalshi blend): LAR 72.6, BUF 67.7 top; SF 65.6, KC 65.5, BAL 65.2; CLE 20.1, MIA 25.6 bottom
  - @SumerSports edge PRWR (9/18): Rousseau 28.6%, Crosby 26.7%, W. Anderson 24.1%, Jalyx Hunt 29.6% (approx reads)
  - @MagicSportsGuy StatRankings CB/receiver matchup report (NYG@LAR — note: MONDAY game, off main slate, but method + shell-split examples apply)
  - @statyxio Bucky Irving vs CLE package: LG 37% lane usage, Interior 62.5% vs CLE ranked 31/32 "Softer"; 0.63 evaded tackles/att (99th), 62.5% success (99th)
  - @JMac_FF Week 2 target distributions (Bills/Lions — Thursday game, context only): Kincaid 28.5% share/30.7% TPRR, 24 routes/game
  - @SumerSports PRWR: JSN 45.8% target share in opener (led NFL), 0.42 TPRR
  - @jmthrivept recovery chart: McConkey 73% Wk2 (rib), Flowers 47%, A.J. Brown IR, Bowers 68% (meniscus trim, 14.3→10.4 PPG), Collins 29%, Chig Okonkwo 55%
  - @cmain7 survivor future value (survivor-only, context)
  - @ScottBarrettDFB YPRR elite (2025-26): Nacua 3.84, JSN 3.79, Kincaid 3.54, Flowers 2.87
  - @DevyEusuf separation: Ayomanor leads 2nd-year WRs (sep score 0.111); McBride/Likely top-2 TE separation market share
  - FantasyPtsData BELLCOW (backfield XFP share): Achane 95%, Javonte 95%, Gibbs/Cook/Taylor 93%
  - @FantasyPtsData TE targets Wk1 EPA/target: Likely +1.379 (cleanest), McBride 35% share, LaPorta +0.380
  - @GridironInfo_: Lawrence led Wk1 EPA/play (+0.79), Dart +0.71; NYJ offense +0.99 EPA/play vs blitz (best); CIN defense -1.49 EPA/play allowed when blitzing (best); QB aggressiveness Wk1: Stroud 21%, Mayfield 11%, Hurts 8%, Allen 7%, Mahomes 4%
  - @DonAtkinsonNFL QB read progression Wk1 (FTN): Purdy lowest first-read 27.0%, Love highest 78.6%
  - Search-hit text intel (9/18 PM): Irving ">80% of Bucs backfield XFP"; Kincaid "~66% route participation, 27-32% TPRR"; Greg Rousseau 30.6% PRWR through 2 wks; Dalton Kincaid hyper-efficiency note
- CSVs:
  - docs/research/2026-09-19/full-tables/: benbbaldwin-objective-ratings-v3-2026-09-19.csv, devyeusuf-rookie-debut-wr-game1.csv (Makai Lemon -5 yds debut)
  - docs/research/2026-09-19/chart-reads/: bucsjuice-sumersports-prwr-edge-week2.csv, mediJo20-rushing-epa-vs-rushing-tds-1999-2026.csv (Allen +2.4 rush EPA/gm, 0.65 rush TD/gm; Hurts +2.0/0.685)
  - docs/research/2026-09-17/full-tables/ (13 CSVs): defensive-epa-motion-at-snap-week1.csv, dynatyze-qb-cmp-leaders-week1.csv (Caleb Williams 37.26 FPTS, Lawrence 26.10/4 TD), hb-pass-protectors-week1.csv, hb-pass-rushers-week1.csv, passer-rating-allowed-week1.csv, penalty-yard-leaders-week1.csv, qb-aggressiveness-by-team-week1.csv, qb-read-progression-week1.csv, recovery-chart-week2.csv, snap-weighted-age-defense-week1.csv, snap-weighted-age-offense-week1.csv, sumerpass-wr-leaderboard-week1.csv, survivor-future-value-week2.csv
  - docs/research/2026-09-18/full-tables/ (49 CSVs) + chart-reads/ (6 CSVs): scottbarrett-yprr-elite-2025-26.csv, statyx-irving-lane-usage-week2.csv / run-path-interaction / runner-evidence, devyeusuf-separation-score-2ndyear-wr-2026.csv, magicsportsguy-*.csv (6 files), hawkblogger-pressure-rates-generated-allowed-2026.csv
  - docs/research/2026-09-18-props-reverse-engineering/report.md: HOW 9 X creators produce their numbers; replicability verdicts
- AGENTS.md ## POSTABLE BOARD / FOUNDER PICKS: BEEX PICK — Texans -2.5 vs Bengals (Garrett's call, NOT engine). Garrett's X voice rules in ops/x-copy-rules.md. (Context only — research task, not posting.)

## PHASE STRUCTURE (each lane runs all applicable phases)
- PHASE 1 (breadth): full coverage of your lane. For every relevant game/player: DraftKings salaries (from DraftKings public draft-group/player-pool endpoints — DO NOT invent; if you cannot verify a salary, say so), projections (FantasyPros ECR, 4for4, RotoBaller, ETR, FantasyPts — public/free surfaces only), final injury/practice reports + Q-tags, weather for outdoor stadiums, pace/game-script, ownership where public. Per position: top plays by value, salary tiers, chalk vs leverage.
- PHASE 2 (gap-hunt): re-sweep hunting for what Phase 1 missed, forgot, or under-leveraged. Cross EVERY phase-1 read against the internal corpus above (TPRR/target-share tables, PROE+ composites, xFP, EPA/WPA splits, CB/receiver alignment data, PRWR for DST, playcalling tendencies, QB read progression, recovery chart). Hunt leverage: low-owned upside, pivots off chalk, game stacks the field will underweight, positional scarcity in DK pricing.
- PHASE 3 (adversarial): attack your phase 1-2 conclusions. What could be wrong? Run FRESH searches + fresh X-side scans for news since your earlier passes. Build contrarian scenarios that break the slate. Confirm or refute each major read with a SECOND source. Flag anything stale.
- PHASE 4 (consensus, consensus-lane only): aggregate expert consensus (FantasyPros ECR top plays by position, DK Playbook, RotoWire, 4for4, ETR, FantasyPts) and map where consensus agrees vs conflicts with the deep-research reads.

## X-SCAN RULES
- social.search does NOT cover X. Use browser.search (sports/news verticals, since-filters) and browser.open on tool-returned URLs only. Never guess URLs.
- Target accounts: @sfdata9ers, @tejfbanalytics, @MagicSportsGuy, @SumerSports, @Shauncore, @samhoppen, @benbbaldwin, @thunderdandfs, @ryanj_heath, @jjcrosschop, @cmain7, @jmthrivept, @JMac_FF, @ScottBarrettDFB, @LateRoundQB, @AdamLevitan, @EstablishTheRun. Breaking news: injuries, weather, lineup news. Last-48h windows.

## HARD RULES
- Never invent salaries, projections, injury statuses, or line moves. If unverified, label it UNVERIFIED.
- Cite every claim: source + date.
- Files: write to ~/workspace/vendor/Sports/docs/research/2026-09-19-dk-week2/{raw,deep,verify}/. raw/ = scraped numbers/tables; deep/ = per-lane research writeups; verify/ = second-source confirmations/refutations.
- Naming: <lane>-<phaseN>.md, e.g. deep/rb-phase1.md, deep/rb-phase2.md, deep/rb-phase3.md, verify/rb-verify.md, raw/rb-salaries.csv.
- Your FINAL MESSAGE to me is your handoff: complete findings organized by phase (what P1 found, what P2 caught that P1 missed, what P3 overturned, consensus/conflict notes), key numbers with sources+dates, and repo paths of every file you wrote. I synthesize lanes into the master report — do not rely on me having read your files; restate the substance.
