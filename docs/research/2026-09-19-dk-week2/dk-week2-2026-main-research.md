# DraftKings NFL Week 2 DFS — Master Research Report (2026-09-19)

**Slate:** DraftKings Classic MAIN SLATE, locks Sunday 2026-09-20.
**Research only** — no lineups constructed, nothing posted, nothing sent.
**Method:** 7 parallel lanes (QB, RB, WR, TE+DST, game environments, X-scan ×4 sweeps, consensus scan), each running Phase 1 (breadth) → Phase 2 (gap-hunt vs internal corpus) → Phase 3 (adversarial) → Phase 4 (consensus map). Coordinator synthesis below.

## 0. SLATE DEFINITION — RESOLVED: 13 GAMES (SNF EXCLUDED)

Seven independent sources confirm the DK main slate excludes Sunday Night Football. Strongest evidence — DK Network's 9/15 WR table footnote (WR lane, verbatim): *"Salary from a non-Sunday DraftKings slate. Thursday, Sunday Night and Monday Night players are on separate contest slates with different salary pools than the Sunday Main."* Corroborated by: DK Network Buzz Factor ("excludes the Thursday, Sunday night and Monday night games"), The Huddle 9/19 ("main slates exclude Sunday night"; its 30-TE salary table contains no Kelce/no Colts TE), RotoWire 13-game analysis, 4for4 13-game analysis, fantasyalarm 9/18 ("eight-game early window and then five in the afternoon" = 13).

**OUT of the pool:** IND@KC entirely (Mahomes, Kelce, Taylor, K. Walker, D. Jones, Worthy, Downs, Pierce, Keenan Allen — all SNF-only salaries). Also out: DET@BUF (played Thu 9/17), NYG@LAR (Mon 9/21).
**Parent should still verify in the DK app before lock** — the briefing originally listed 14 games.

## 1. CONFIRMED MAIN-SLATE BOARD (13 games; lines = latest publicly verifiable 9/18: VegasInsider 11:22am, Covers "as of 9-18", Bleacher Nation 9/18)

| Game (ET Sun) | Spread | Total | Implied fav–dog | Line move since open |
|---|---|---|---|---|
| CAR @ ATL, 1pm (dome) | CAR -2.5 | 43.5 | 23.0–20.5 | FLIPPED: opened ATL -1.5 → CAR -2.5 (Rush named starter) |
| NO @ BAL, 1pm | BAL -8.5 | 46.5–47.5 | 27.6–19.1 | — |
| MIN @ CHI, 1pm | CHI -4.5 | 48.5–49.5 | 26.6–22.1 | -3.5 → -5.5 → -4.5 (Wentz respect); WEATHER GAME |
| CIN @ HOU, 1pm (dome) | HOU -2.5 | 45.5–46.5 | 24.25–21.75 | Total 47.5 → 45.5 (-2.0 on Collins OUT) |
| PIT @ NE, 1pm | NE -5.5 | 41.5–42.5 | 23.6–18.1 | 2H rain risk |
| GB @ NYJ, 1pm | GB -3.5 | 44.5–45.5 | 24.0–20.5 | Market respects GB DL injuries |
| CLE @ TB, 1pm | TB -8.5 | 40.5–41.5 | 25.0–16.5 | T-storm/delay risk |
| PHI @ TEN, 1pm | PHI -7/-7.5 | 39.5 | 23.4–16.1 | Total 42.5 → 39.5; 94–99°F heat |
| JAX @ DEN, 4:05pm | DEN -2.5 | 44.5–45.5 | 23.75–21.25 | Total 43.5 → 45.5 (+2.0) |
| LV @ LAC, 4:05pm (dome) | LAC -6.5 | 43.5–44.5 | 25.0–18.5 | -8.5 → -6.5 (toward LV) |
| SEA @ ARI, 4:25pm (dome) | SEA -3.5/-4.5 | 40.5–41.5 | 22.4–18.6 | -10 → -3.5 (Darnold OUT → Lock) |
| MIA @ SF, 4:25pm | SF -13.5 | 44.5–46.5 | 29.25–15.75 | -10.5 → -13.5; ideal weather |
| WAS @ DAL, 4:25pm (dome) | DAL -3.5/-4.5 | 50.5–51.5 | 27.4–23.4 | Slate-high total |

Implied totals via team_implied = total/2 − signed_spread/2 (reverse-engineering report, 9/18).

## 2. INTERNAL DATA INVENTORY (what we cross-checked against)

- `AGENTS.md` benchmark sections (lines ~2500–3502): 9/17–9/19 X-analytics inventory — playcalling tendencies (LAC 84.3% motion, TB 25.5% PA, TEN/NO 22%+ no-huddle, WAS 14.7% RPO), pressure gen|allowed (hawkblogger/FTN), benbbaldwin v3 team tiers (Kalshi blend), SumerSports edge PRWR, StatRankings CB/receiver method, statyxio Irving rush-path package, JMac_FF target distributions, jmthrivept recovery chart, cmain7 survivor values, GridironInfo_ QB EPA/aggressiveness, QB read-progression, FantasyPtsData BELLCOW/SIMILARITY/TE-targets, ScottBarrettDFB YPRR elite, DevyEusuf separation scores.
- `docs/research/2026-09-19/chart-reads/` + `full-tables/`: benbbaldwin v3 tiers CSV, SumerSports edge PRWR reads, MediJo20 rushing-EPA scatter, DevyEusuf rookie-debut table.
- `docs/research/2026-09-18/full-tables/` (49 CSVs) + `chart-reads/` (6): YPRR elite, Irving package, separation scores, MagicsGuy matchup files, hawkblogger pressure rates.
- `docs/research/2026-09-17/full-tables/` (13 CSVs): recovery chart, read progression, aggressiveness, SumerPass WR leaderboard (JSN 45.8% share), motion-at-snap EPA, etc.
- `docs/research/2026-09-18-props-reverse-engineering/report.md`: how the 9 X creators produce their numbers; replicability verdicts.

---

## PHASE 1 — BREADTH (what each lane found)

**Salary verification status (all lanes):** DraftKings draft-group API returned Akamai "Access Denied" / SPO117 on 9/19 — **zero salaries are endpoint-verified.** All salaries are second-party: DK Network (published 9/15) cross-checked vs The Huddle (published 9/19); checked values agreed. Treat every salary as "corroborated, not verified." No public numeric ownership projections exist except Schultz ~5.5% pOWN (BettorGreen 9/19) and Maye 5.3% (BettorGreen 9/19); all other chalk/leverage language is inference-labeled.

**QB:** Dak $6.4k leads FP proj (20.9) in the 50.5-total dome game (WAS gave up 3 TDs on 25 attempts to PHI — SI 9/18). Wentz $4.6k = salary-relief chalk (FantasyPros QB1 DK value score; 12/19/133/3TD in relief). Mahomes $5.5k price-value leader (3.45 pts/$1K) but Wk1 CPOE -12.3 (rank 31) — moot: SNF off slate. Caleb $6.8k (37.26 DK pts Wk1) faces MIN's 37% 2+ blitz rate. Starters confirmed: Rush (ATL), Wentz (MIN), Brissett (ARI), Lock (SEA), Geno Smith (NYJ), Malik Willis (MIA), Burrow full-go (Q tag retained).

**RB:** Top pts/$1K (dknetwork 9/17 proj): Swift $6.3k/22.0 = 3.49, Henry $7.2k/24.0 = 3.33, Jeanty $6.8k/22.5 = 3.31, Javonte $6.4k/20.6 = 3.22, Bijan $8.2k/25.2 = 3.07. Worst: Barkley $7.0k/13.2 = 1.89. Pass-catching proj: Bijan 8.0 tgt, CMC 6.7, Jeanty 5.9. Mason→IR → Aaron Jones $5.1k starts (18.3 proj touches) = the cheap path.

**WR:** Premium: JSN $8.1k (22.6 DK proj), Jefferson $7.8k, Chase $7.6k, Lamb $7.3k, Olave $7.2k (Q). Value: Watson $6.2k, Pickens $6.3k, Golden $4.7k (12 Wk1 targets), P. Washington $5.9k, Coker $5.1k, Q. Johnston $5.0k, Diggs $5.3k, Vele $4.2k, Odunze $5.5k, Burden $5.7k, Ayomanor $3.5k (GPP).

**TE:** Schultz $3.2k best ratio (11.6 FIC); McBride $6.9k premium floor; midrange Kraft $4.9k/12.6, Kittle $4.6k/12.2, Goedert $4.8k/11.3, Ferguson $3.8k/11.1. Juwan Johnson $3.9k (FantasyPros' favorite TE: 11.71 DK pts/gm in Shough sample). Bowers $6.6k stale (assumes he plays).

**DST:** Public ranks — FP ECR: PHI, TB, SEA, SF, BAL, LAC. Salaries (fantasyalarm 9/18, partial): SF $3.8k (priciest), PHI $3.7k, TB $3.6k, BAL $3.3k, CAR $2.7k, MIN $2.6k, JAX $2.4k.

**Game environments:** Stack tiers P1 — WAS@DAL / CIN@HOU / MIN@CHI primary; JAX@DEN + LV@LAC strong secondary; rest secondary/contrarian; PHI@TEN, SEA@ARI, PIT@NE, CLE@TB avoid/one-offs.

## PHASE 2 — GAP-HUNT (what Phase 1 missed, caught via internal corpus)

- **QB:** Lawrence is the slate's best efficiency+leverage combo — +0.79 EPA/play (Wk1 leader), +16.2 CPOE (#2), +0.81 EPA/db vs pressure, 75% comp/0 INT (GridironInfo_ 9/18 ×3 sources). Geno $4.8k: 79.2% comp, 0 sacks — 9.3 DK pts masks elite efficiency. Baker: 82.1% comp (NFL lead), +15.4 CPOE, TB 25.5% PA (slate lead) vs Ward's 147.9 rating allowed. Stroud = concentrated GPP funnel: 21% aggressiveness (slate high) + Collins/Higgins out → Schultz had 8 Wk1 targets; CIN allowed 20.9 FPG to TEs in 2025. Lock $4.9k > Wentz as cheap pivot (indoors, JSN 45.8% share, 64% first-read). Daniels > Dak as the moderate-rostership side of the 50.5 game (WAS 14.7% RPO vs DAL +0.48 motion-pass EPA allowed, 2nd-worst).
- **RB:** Javonte upgraded — 95% XFP bellcow + 55.6% routes + .25 TPRR (@MagicSportsGuy/StatRankings 9/18). Irving efficiency is real but on n=8 carries (0.63 evaded/att, 99th %ile) — small-sample flag. Lloyd = trap (3.7 DK pts vs 22.6-touch projection; Brooks led GB snaps). Swift regression flag (CHI +2.0 YPA over expected — Paganetti).
- **WR:** Parker Washington raised to top-8 WR play — 0.40 TPRR, 5.53 YPRR, 26.1% share; FantasyPts similarity comps: 2023 Hill, 2025 Nacua, 2025 JSN. CB-liability mapping: Stevenson +158.3 → MIN WRs; Lassiter +153.3 → CIN; Sainristil +149.3 → DAL; Ward +147.9 → TB. Separation: Ayomanor 0.111 (best 2nd-year) → Coker-over-McMillan pivot. YPRR elite on slate: JSN 3.79, Watson 2.85, Burden 2.79, London 2.52, Diggs 2.51, Lamb 2.40.
- **TE:** Schultz 5.5% pOWN (only public TE ownership #) = best owned-vs-projected leverage. Huddle's sharp-public chalk is Goedert ("my most owned TE") — Kraft/Ferguson better per-dollar pivots. Bowers 68% recovery model noted pre-downgrade.
- **DST:** Hidden process plays — **CIN**: 44.4% pressure generated (#4) + −1.49 EPA/play allowed when blitzing (NFL best, @GridironInfo_) vs Stroud's 21% aggressiveness, dome, likely cheap. **JAX $2.4k**: 50.0% generated vs DEN's league-worst 56.3% allowed. Wentz (3 sacks in relief) + wind/rain → CHI DST leverage. **CAR $2.7k flipped fade→value**: Rush named starter (2.6 QBR, worst) + CAR 44.7% pressure (#3) vs 29th-ranked offense, dome.
- **Games:** JAX@DEN promoted (Lawrence efficiency + rising total); LV@LAC upgraded (ignored dome, spread moving toward LV); PHI@TEN tier/line disconnect (62.2 vs 26.0 tiers but only -7/39.5).

## PHASE 3 — ADVERSARIAL (what got overturned; fresh 9/18–9/19 reporting)

1. **Etienne thesis DEAD** — Kamara full practice, no designation, WILL make Week 2 debut (Saints Wire + Heavy.com 9/18, SI 9/17). NO backfield = Etienne/Kamara/Miller; Kamara $4.6k = tournament-only pivot.
2. **Bowers DOUBTFUL** (Review-Journal 9/18; meniscus trim Tuesday, out "a game or two", possible 9/27 return) — supersedes 68% recovery model. $6.6k = trap even if active. Mayer $3.6k = primary LV TE play but now public consensus.
3. **Chig Okonkwo OUT** (Commanders.com 9/18) — was on WAS (not TEN); Bates $2.7k thin punt.
4. **Purdy OUT 2–5 weeks** (Rapoport: toe + shoulder; Schefter: Wk3 return "isn't entirely out of the question" but not optimistic) — **Mac Jones starts for SF.** Single-sourced via aggregator (fanrecap); CONFLICTS with FantasyPros 9/18 projections listing Purdy — **#1 pre-lock verify.**
5. **Cooper Rush officially named ATL starter** (NBC 9/18); Penix OUT (3rd ACL, season); Tua DOUBTFUL (oblique). Rush Wk1: 51.9 rating, 3.5 air yds/att → **London DOWNGRADED to WR3/FLEX at $6k, do not pay up in cash.**
6. **Kyler Murray OUT (concussion)** — Wentz starts MIN; Brissett starts ARI (X-scan corrected its own Sweep 1 misattribution).
7. **Malik Willis starts for MIA** (USA Today 9/19).
8. **Boutte → GPP-only dart** (trio combined 6 catches Wk1; DraftSharks wouldn't trust; NBC: Schultz benefits most from Collins absence).
9. **Odunze HEALTHY** — SBR's 9/17 Q tag stale; Bears cleared him (Heavy.com 9/16). Injury discount gone = upgrade.
10. **Coker NO designation** (full Friday; TheFalconsWire 9/18) + ATL slot CB Bowman OUT = pivot strengthens.
11. **MIN@CHI weather downgrade** — 80% rain, 30-mph gusts, possible delay; both QBs carry weather tax; run-game/kicker pivot unless Sunday forecast eases. PIT@NE 90% rain 2H; CLE@TB t-storms/delay risk.
12. **CIN@HOU total -2.0** (47.5→45.5) on Collins OUT — already moved; no value left to chase.
13. **Burrow fade stands**: full Friday practice ("he'll play" — Zac Taylor, cincinnati.com 9/18) but composite 0.03 EPA/play (rank 19) at $6.6k.
14. **Flowers DOUBTFUL, not expected to play** (official Ravens 9/18; Zrebiec) → Lamar TDs tilt to Henry (144/3 Wk1); Bateman $4.4k Flowers-contingent value.
15. **McConkey truly 50/50** — Schefter 9/17 "unlikely" vs Friday limited practice; FantasyPros model 44%. Herbert news-dependent.
16. **Olave Q but expected full-go** (Underhill: "nothing expected to be a problem", 83% model).
17. **Pittman (PIT WR) Q, "looking bleak"** (DNP Thu/Fri; Steelers Wire 9/19) — briefing's IND attribution corrected twice; Freiermuth bump if out; Metcalf $5.2k / R. Wilson $3.2k absorb targets.
18. **Debunked/stale, do not use:** hellorookie's Mahomes ACL story; RotoGrinders' "Lawrence 10.51% most popular QB" (wrong week); yardbarker Rodgers wrist-fracture piece (future-dated); yardbarker's SF schedule claims (contradicted ×4); Jayden Higgins ACL rumor (struck).
19. **Wk1 CB passer-rating edges → tiebreak only** (one-game samples, opponent-quality confounds).
20. **GB gutted inside** (Brinson OUT, Hargrave doubtful, Van Ness Q) + NYJ: Fitzpatrick/Cooper Jr./Ossai/Nwangwu OUT, McDonald expected to play vs GB LT Morgan (5 pressures allowed Wk1).

**Final stack ranks (post-adversarial):** T1: WAS@DAL (50.5, dome) | JAX@DEN. T2: LV@LAC, CIN@HOU. T3 (conditional/contrarian): NO@BAL, MIA@SF (garbage-time), GB@NYJ, MIN@CHI (weather), PHI@TEN (heat contrarian OVER). T4 (one-offs/fades): CAR@ATL (Bijan mega-chalk = slate's defining fade decision with Rush at QB), PIT@NE, SEA@ARI, CLE@TB.

## PHASE 4 — CONSENSUS MAP (agree / conflict / leverage)

**Consensus chalk (public, 9/15–9/19):** QB Wentz $4.6k (DK Buzz "Red Hot", FP QB1 value, Footballers top-3). RB Bijan $8.2k — RotoWire expects him the **most-rostered player on the slate** ("essentially a lock for cash games"). WR Pickens $6.3k (FTN "insane price"; RotoWire best pt/$), Golden $4.7k. TE Schultz $3.2k (RotoWire "Smash Spot"; FP "justifiably chalky"). DST TB $3.6k (RotoWire #1) / SF $3.8k pay-up (B/R #1, FTN preferred). Top stacks: 1) WAS@DAL (unanimous; FTN "most popular stack of the week"), 2) MIN@CHI, 3) NO@BAL.

**AGREE with our reads:** WAS@DAL top stack; SF DST pressure mismatch (MIA 40.5% allowed); Javonte bellcow; McBride elite; Lawrence (RotoWire cash, Footballers core); Caleb (ECR QB3, multi-source core).

**CONFLICT:**
- **Achane:** our 95% bellcow XFP vs RotoWire "Fading the Field" (@ SF, 16.0 implied, healthy 49ers D, MIA 40.5% pressure allowed). Consensus fade looks sound — do NOT buy as contrarian without new info.
- **Irving by omission:** our strongest RB metrics (>80% backfield XFP, 99th-%ile efficiency, CLE 31/32 run D) vs ONE RotoWire mention and zero Buzz presence. **Top leverage spot on the slate.**
- **Lamar = leverage pivot:** ECR QB2 but "won't be nearly as popular" (RotoWire); Flowers out condenses offense to Henry/Bateman.
- **JSN discounted:** 45.8% share / 0.42 TPRR / 3.79 YPRR, zero DFS buzz — suppressed by Lock; not disagreement, a QB discount.
- **JAX DST ignored:** our data (DEN 56.3% pressure allowed, worst) vs consensus ranking DEN's defense high.

**Our low-buzz leverage list:** Irving $6.1k; Lamar; JAX $2.4k DST; CIN DST; LV DST (40.5% generated vs LAC's broken interior); Coker-over-McMillan; P. Washington; Lawrence; Golden (projection lags role); Odunze (stale Q tag may suppress ownership); Ayomanor $3.5k (separation ignored everywhere — pure deep-sleeper); ARI $2.5k / HOU $3.0k DST (backup-QB spots); Metcalf $5.2k (FTN-only, 10 targets).

**Chalk value converging everywhere (expect high ownership):** Wentz $4.6k, Aaron Jones $5.1k, Pickens $6.3k, Golden $4.7k, Schultz $3.2k, Juwan Johnson $3.9k, Vele $4.2k, Bateman $4.4k (Flowers-contingent).

**Ownership evidence (public, dated):** RotoWire 9/18: Bijan most-rostered; WAS@DAL the clear stack game. BettorGreen 9/19: Schultz ~5.5% pOWN; Maye 5.3% pOWN. Covers 9/18 public splits: bettors on big dogs (52–53% MIA/NO/CLE/TEN/WAS); VI 9/17: 87% of cash on PHI@TEN Under. True projected ownership NOT observable on free surfaces (Stokastic/4for4 GPP paywalled; DK Buzz ≠ projected ownership).

---

## PRE-LOCK ACTION ITEMS (for the parent's Sunday report)

1. **Verify Purdy status** — OUT 2–5 weeks (Rapoport via aggregator) vs FP projections listing him. If Mac Jones starts, SF QB + all SF pass-catcher reads change.
2. **Sunday AM weather recheck:** MIN@CHI (80%/30mph gusts/possible delay), PIT@NE (90% 2H), CLE@TB (t-storms).
3. **11:30 AM CT inactives:** McConkey, Flowers, Pittman, Bowers, Olave, Harvey, Black, Jalen McMillan, O'Neill, Van Ness, Bradford, Gray.
4. **DK app salary/pool check** — confirm 13-game slate; all salaries second-party only.
5. Cowboys' "Jaishawn Barham decision" headline — unverified, needs a read before use.

## FILES WRITTEN (all under `~/workspace/vendor/Sports/docs/research/2026-09-19-dk-week2/`)

- `LANE-BRIEFING.md` — shared lane briefing (slate, injuries, corpus, phases, rules)
- `dk-week2-2026-main-research.md` — this master report
- `deep/qb-phase1.md`, `qb-phase2.md`, `qb-phase3.md`
- `deep/rb-phase1.md`, `rb-phase2.md`, `rb-phase3.md`
- `deep/wr-phase1.md`, `wr-phase2.md`, `wr-phase3.md`
- `deep/te-phase1.md`, `te-phase2.md`, `te-phase3.md`, `deep/dst-phase1.md`, `dst-phase2.md`, `dst-phase3.md`
- `deep/games-phase1.md`, `games-phase2.md`, `games-phase3.md`
- `deep/x-sweep1.md`, `x-sweep2.md`, `x-sweep3.md`, `x-sweep4.md`
- `deep/consensus-qb.md`, `consensus-rb.md`, `consensus-wr.md`, `consensus-te-dst.md`, `consensus-map.md`
- `raw/` — qb-salaries.csv, qb-weather.csv, qb-injuries.csv, rb-salaries-projections.csv, rb-x-sweep.csv, wr-salaries-projections.csv, wr-injuries.csv, te-salaries.csv, dst-salaries.csv, slate-lines-current.csv, weather.csv, x-adjacent-week2-dfs-metrics.csv, x-dk-main-slate-salaries-wk2.csv, x-game-totals-wk2.csv, x-t-shoe-index-wk2-lookahead.csv
- `verify/` — qb-verify.md, rb-verify.md, wr-verify.md, te-dst-verify.md, games-verify.md
