# 5. DFS & Props Digest

# DFS + Props Metrics Digest — for coding-agent knowledge base

Source directories (repo is READ-ONLY; these are the canonical files):
- `docs/research/2026-09-13-dfs/` — FanDuel Week 1 (Sun-Mon slate, Sept 13-14, 2026)
- `docs/research/2026-09-19-dk-week2/` — DraftKings Week 2 (13-game main slate, Sept 20, 2026)
- `docs/research/2026-09-18-props-reverse-engineering/` — how 9 X analytics creators produce their numbers
- Internal corpus cross-checked throughout: `AGENTS.md` lines ~2500-3502 (X-analytics benchmark inventory 9/17-9/19),
  `docs/research/2026-09-17/full-tables/`, `docs/research/2026-09-18/full-tables/` + `chart-reads/`,
  `docs/research/2026-09-19/full-tables/` + `chart-reads/`, nflverse CSVs in week-1 `verify/nflverse/`

All claims below are dated 2026-09-13 or 2026-09-18/19 (the research dates), not current week. Week-specific numbers
(salaries, projections, injuries) are historical artifacts demonstrating METHOD, not actionable current-week data.

---

## 1. FanDuel Week 1 DFS research (2026-09-13)

### 1.1 Slate definition and methodology

- The 12-game FD "main slate" (RotoBaller, FantasyLabs, FantasyPros, Fox Sports) EXCLUDED SNF (Cowboys@Giants) and MNF
  (Broncos@Chiefs). Kelce/Ferguson appeared only on separate Showdown slates. One consensus file used the 14-game
  Sun-Mon slate instead — always confirm slate scope before trusting any FD salary or projection.
- FanDuel scoring: 4 pts/pass TD, 1 pt/25 pass yds (+3 at 300), 6 pts/rush-rec TD, 1 pt/10 yds, 0.5 PPR, $60K cap.
- Method: 4 parallel researchers per lane + coordinator spot-checks, all numbers labeled single-source vs multi-source;
  paywalled (RotoGrinders premium, RotoWire ownership, FantasyLabs models) and JS-rendered (ESPN aggregate) sources
  were skipped and noted, never worked around. Stale 2025-dated content was excluded per-claim.

### 1.2 Consensus plays by position (representative rows only)

**QB** (consensus proj = mean of FantasyPros 0.5-PPR / numberFire FD / DK Network, compiled 9/13 ~11:25 CT):

| Player | FD sal | Proj | Own% | Anchor fact |
|---|---|---|---|---|
| Jalen Hurts (PHI vs WAS) | $8,300 | 20.2 | mid | RotoWire's #1 pt-per-dollar QB; WAS allowed 3rd-most pass TDs in 2025 |
| Joe Burrow (CIN vs TB) | $8,200 | 19.7 | ~30% chalk | Slate-high 51.1 total; Burrow/Chase the chalk stack on both sites |
| Justin Herbert (LAC vs ARI) | $7,600 | 19.6 | fairly high | ARI 26th in EPA/dropback; LAC implied 28.5; FantasyLabs' top projected QB value |
| Josh Allen (BUF @ HOU) | $8,900 | 19.6 | low ("barely owned") | Top salary, toughest road spot — premium leverage or fade |
| Lamar Jackson (BAL @ IND) | $8,400 | 18.8 | ~5% LEVERAGE | Elite ceiling at 5% owned called "the single best QB leverage point" |

Fades: Tyler Shough ($6,900) — "over-owned trap"; Patrick Mahomes — universal expert fade (17th-22nd, UDFA rookie at LT
vs NFL's #1 sack D, full-go post-ACL/LCL). Value: Mayfield $7,500 (bring-back off Burrow chalk; milestone incentives —
2 TDs ties Brady, 3 = 200 career); C.J. Stroud $6,800 (cheap home side of Allen game).

**RB** (salaries cross-checked 2-3x on Gibbs/Henry/Hampton/Lloyd/Javonte/Achane/Bijan; ownership hard number only for Gibbs):

| Player | FD sal | Proj | Own% | Anchor fact |
|---|---|---|---|---|
| Jahmyr Gibbs (DET vs NO) | $9,100 | 22.8 | ~40% (FantasyLabs; "no other RB over 18-20%") | Unanimous #1; backfield to himself (Montgomery traded to HOU, Pacheco IR); DET 28.5 team total |
| Jonathan Taylor (IND vs BAL) | $8,600 | 18.2 | 14-18% | Bellcow; BAL missing NT Madubuike; heavy home volume |
| Bijan Robinson (ATL @ PIT) | $8,800 | 17.9 | 14-18% | 2,298 scrimmage yds in 2025; Allgeier (now ARI) gone |
| De'Von Achane (MIA @ LV) | $8,500 | 17.1 | 10-14% | "Last man standing"; LV allowed 31.7 PPR/gm to RBs in 2025 |
| Chase Brown (CIN vs TB) | $7,500 | 15.5 | 10-13% | "Priced as FD RB9 — too cheap" (FantasyLabs); 51.1 total |
| MarShawn Lloyd (GB @ MIN) | $4,900 | 11.5 | 10-14% | Jacobs on exempt list; 3rd in FD Plus/Minus; punt of the slate (committee risk) |

Hard fades: DEN 3-headed RBBC (Dobbins/R.J. Harvey/Jonah Coleman, team-declared split); PIT Warren/Dowdle committee;
Judkins (first game back from fractured fibula, worst RB matchup — JAX allowed fewest rush yds in 2025).

**WR** (FD scoring 0.5 PPR; FD salaries 2-source-confirmed only for Chase, St. Brown, Olave):

| Player | FD sal | Proj | Own% | Anchor fact |
|---|---|---|---|---|
| Ja'Marr Chase (CIN vs TB) | $8,900 | ~16.1 (15.61 nF / 16.6 FP) | ~30% w/ Burrow (FantasyAlarm) | 51.1 total; knee designation per Huddle — monitor; self-stated 23-TD record goal |
| Amon-Ra St. Brown (DET vs NO) | $8,600 | ~15.8 | High (FL) | DET 28.25 implied; DET safeties Joseph + Branch on PUP boosted Saints pass game |
| Chris Olave (NO @ DET) | $7,400 | ~13.2 | ~ARSB-level (FA) | Negative script; DET secondaries depleted; "too big to fail" underlying data |
| Zay Flowers (BAL @ IND) | $7,300 | 13.2 (nF only) | Light (FL) | nF's #4 WR — model outlier vs FantasyPros; Lamar stack leverage |
| Ladd McConkey (LAC vs ARI) | $6,500 | 10.9 (nF) | n/a | FanDuel Research's top point-per-dollar WR; LAC -9.5 |

Leverage: Tee Higgins off Burrow/Chase chalk (Chase+Higgins = 55% of CIN targets); D.J. Moore (BUF WR1) "almost entirely
unrostered" with Allen. Fade: Tre Tucker — heavy chalk in a 40.8-total game. Downgrade: Drake London (Tua OUT,
Cooper Rush starts for ATL).

**TE + DST:**

| Player | FD sal | Proj (FP half-PPR / PPR) | Flag |
|---|---|---|---|
| Trey McBride (ARI @ LAC) | $7,600 | 11.4 / 14.5 | Unanimous TE1; elite even with Brissett (10.6 tgt/gm in his starts) |
| Tyler Warren (IND vs BAL) | $5,600 | 10.2 / 12.7 | FD Research's "favorite TE"; #1 FD Plus/Minus at TE (FantasyLabs) |
| Colston Loveland (CHI @ CAR) | $6,000 | 10.7 / 13.2 | Paced Bears receiving from Week 9 (2025) |
| Sam LaPorta (DET vs NO) | $5,800 | 9.8 / 12.1 | WILL PLAY (off injury report; camp hip issue managed) |
| Juwan Johnson (NO @ DET) | $5,400 | 8.2 / 10.3 | Consensus smash: Tyson IR + both Lions safeties out; 2nd-highest projected Plus/Minus (FantasyLabs) |
| Michael Mayer (LV vs MIA) | $4,600 (Huddle) vs $4,800 (FantasyAlarm) | ECR 9 | Bowers OUT (meniscus trim Sept 8) → starting TE; "pricing is broken" |

Confirmed TE absence: only Brock Bowers (OUT). Kelce/Ferguson excluded — not on 12-game FD slate (separate study covered
the 14-game Sun-Mon slate where they ARE eligible; Kelce $5,500 consensus-cool, Likely now a Giant $5,300).

DST: no FD DST salary was verifiable in any free source. Season-long W1 consensus ranks (NOT DFS salaries): 1. JAX
(vs CLE — Watson's first start since 2024; 31 turnovers forced in 2025), 2. PIT (elevated by Tua OUT → Cooper Rush
starting), 3. LAC, 4. HOU, 5. PHI. RotoWire streaming tiers: T1 JAX/PIT, T2 LAC/PHI, T3 DET.

### 1.3 Key methodological learnings (week 1)

- **No free source displayed numeric FD projections or projected ownership %** for TEs/DSTs. FantasyLabs displayed
  Sims optimal-lineup rates (Gibbs 44.1%, Taylor 17.9%, Flowers 10.8%) and Lamar "drawing around 5% ownership" —
  the only numeric ownership/model outputs visible free. Salary evidence came almost entirely from one full-slate
  table (The Huddle's "DFS - Fantasy Domination" FD salary table), cross-checked on 2 entries by FantasyLabs.
- **Stack-win evidence compiled** (`deep/winning-lineups-2026-09-13.md`): NBC Sports study of 170 FD Sunday Million
  top-10 lineups (2015) — QB-WR 40.59% (most common, ~2x next), game stack (4+ players) 15.29%, QB-WR+bring-back
  7.06% ("best performing correlation play"); 4for4 (2020-22 winners) — 59% of 59 FD winners rostered 3 RBs (RB in
  FLEX); since 2020, only 3 FD winners used fewer than 4 correlated players.
- **Week 1 environment thesis** (`deep/week1-environment-2026-09-13.md`): run-heavy teams run more on opening plays
  (PFF 2021-25: Chiefs 73.0%, Patriots 66.7%, Giants 62.5%, Lions 60.4%, Falcons 60.0%); Week 1 CONCENTRATES backfields
  (2025 W1: Chase Brown 91.3% of team rush attempts, Kyren Williams 91% snap share); 2025 neutral pace/pass-rate table
  from Sharp Football. New-scheme caveat: BAL (Minter), ATL (Stefanski), LAC (McDaniel) — old-regime pace numbers
  do not apply.
- **nflverse groundwork**: `verify/nflverse/` holds `roster2025.csv` (~1MB) + `verify_defense.py` + README — evidence
  the team was already pulling nflverse data as the quantitative layer in Week 1.

---

## 2. DraftKings Week 2 DFS research (2026-09-19)

### 2.1 Slate definition and methodology

- DK main slate resolved as **13 Sunday games** (locks Sun 2026-09-20): DET@BUF (played Thu 9/17), NYG@LAR (Mon 9/21), and
  SNF IND@KC all EXCLUDED. Seven sources confirm SNF is on separate DK slates with different salary pools
  (DK Network WR-table footnote: "Thursday, Sunday Night and Monday Night players are on separate contest slates";
  corroborated by DK Buzz Factor, The Huddle 9/19, RotoWire, 4for4, fantasyalarm).
- Spread/total baseline (latest verifiable 9/18: VegasInsider 11:22am, Covers, Bleacher Nation). Highest totals:
  WAS@DAL 50.5 (slate-high, dome), MIN@CHI 48.5-49.5, CIN@HOU 46.5, IND@KC 46.5/47, NO@BAL 46.5/47.5.
  Implied totals: `team_implied = total/2 − signed_spread/2` (from the 9/18 props reverse-engineering report).
- Method: 7 parallel lanes (QB, RB, WR, TE+DST, game environments, 4× X-sweeps, consensus scan), each running
  Phase 1 (breadth) → Phase 2 (gap-hunt vs internal corpus) → Phase 3 (adversarial, fresh 9/18-9/19 reporting) →
  Phase 4 (consensus map). DraftKings draft-group API returned Akamai "Access Denied" — zero salaries were
  endpoint-verified; all salaries second-party (DK Network 9/15 × The Huddle 9/19), corroborated not verified.

### 2.2 Game environment board (post-adversarial)

| Tier | Game | Why |
|---|---|---|
| T1 | WAS@DAL (50.5, dome) | Unanimous consensus top stack (FTN: "most popular stack of the week") |
| T1 | JAX@DEN (44.5-45.5) | Lawrence efficiency (+0.79 EPA/play, Wk1 leader, +16.2 CPOE #2) + rising total |
| T2 | LV@LAC (43.5-44.5, dome) | Ignored dome; spread moving toward LV |
| T2 | CIN@HOU (45.5-46.5, dome) | Total 47.5→45.5 on Nico Collins OUT (-2.0 already moved — no value left to chase) |
| T3 | NO@BAL, MIA@SF (garbage-time), GB@NYJ, MIN@CHI (weather), PHI@TEN (heat contrarian) | Conditional/contrarian |
| Avoid | CAR@ATL (Bijan mega-chalk + Rush at QB), PIT@NE, SEA@ARI, CLE@TB | — |

Weather watch (9/19): MIN@CHI 80% rain / 30-mph gusts / possible delay; PIT@NE 90% rain 2H; CLE@TB t-storms/delay risk;
PHI@TEN 94-99°F heat. All were pre-lock Sunday-AM rechecks, not locked forecasts.

### 2.3 Consensus plays by position (representative rows only)

**QB:** Consensus chalk — Carson Wentz (MIN @ CHI, $4.6k) DK Buzz "Red Hot" + FP QB1 DK value (12/19/133/3TD in relief;
Kyler Murray OUT concussion). Value pivot: Lock $4.9k indoors (JSN 45.8% share, 64% first-read). Purdy $6.2k chalk
DOWNGRADED — **Purdy OUT 2-5 weeks (Rapoport/Schefter via aggregator; Mac Jones starts)** — biggest pre-lock verify,
single-sourced, conflicted with FantasyPros 9/18 projections listing Purdy. Dak $6.4k leads DK FP proj (20.9) in the
50.5 dome. Daniels > Dak as moderate-rostership side of the 50.5 game (WAS 14.7% RPO vs DAL +0.48 motion-pass EPA
allowed, 2nd-worst). Burrow $6.6k full-go ("he'll play" — Zac Taylor) but composite 0.03 EPA/play (rank 19).
Leverage: Lamar (ECR QB2 but "won't be nearly as popular" — RotoWire); Flowers DOUBTFUL concentrates offense
(Henry 144/3 in Wk1; Bateman $4.4k contingent value).

**RB** (dknetwork 9/17 projections, pts/$1K representative):

| Player | DK sal | FP proj | Anchor |
|---|---|---|---|
| Bijan Robinson (ATL vs CAR) | $8,200 | RB1 projected across positions | RotoWire's projected most-rostered player on the slate ("essentially a lock for cash"); 40.9% target share / 0.43 TPRR / 50.0% first-read with Rush; CAR allowed Swift+Monangai 100+ yds each Wk1. Slate's defining fade decision. |
| Christian McCaffrey (SF vs MIA) | $8,000 | — | Wk1 workload limited by cramps, not role |
| Derrick Henry (BAL vs NO) | $7,200 | 24.0 / 3.33 | 144/3 Wk1; Ravens shorthanded at WR; Underdog prop 92.5 rush yds |
| Ashton Jeanty (LV @ LAC) | $6,800 | 22.5 / 3.31 | Pass-catching projection 5.9 targets |
| Javonte Williams (DAL vs WAS) | $6,400
...[truncated 10447 chars]
---

## 4. Deep-research lane summaries (from deep/ — representative, not dumps)

### 4.1 Stack-player dossiers (week 1, `deep/stack-players-2026-09-13.md`)

Per-stack writeups with salaries triple-confirmed (FantasyLabs/FantasyAlarm/thehuddle) vs single-source, plus 2025
form, team changes, matchup, and reporter-sourced risk flags. Representative entries:
- MIN stack (GB @ MIN, dome, MIN -1.5, O/U 46.5): Kyler Murray $7,200 (released by ARI, 1-yr $1.3M prove-it, named
  starter Aug 11 over J.J. McCarthy; Murray 14-3 TD/INT in six career W1 starts; GB without Parsons 7.3%→3.7% sack
  rate) — verdict: tournament weapon, not cash core (shotgun-snap issues in camp per Purple Daily). Justin Jefferson
  $8,100 — "soft salary for the ceiling; best piece of the MIN stack" (career-worst 2025 TDs were QB-driven).
  Hockenson $5,000 — low-owned punt only (PFF grade 61.2, 28th of 37 TEs in 2025).
- PHI stack (WAS @ PHI, -5.5, 44.5): A.J. Brown had been traded to the Patriots (verified, ESPN); DeVonta Smith the
  new PHI WR1; WAS side anchored by Tunsil (IR, torn triceps) vs Eagles front.
- Scoring-format note from the file: one free source (RotoWire) states FD classic NFL is FULL PPR and only Showdown
  is 0.5 PPR — flagged as "verify scoring in-contest before locking a build," not resolved.

### 4.2 Matchup-scheme deep research (`deep/matchup-scheme-2026-09-13.md`)

Scheme-level reads behind stack decisions: neutral pace (Sharp Football), neutral pass rates
(ARI 65.3% highest in NFL, CIN 61.9%, LAC 61.2% vs BAL 50.1%, NYJ 49.9% — structural, don't flip week to week),
two-high shell rates, and defensive vulnerability anchors (e.g., LAC implied 28.5 vs ARI 26th in EPA/dropback;
DET safeties on PUP; NYJ/TEN 38.5 lowest total).

### 4.3 Week-2 internal corpus leverage (week-2 internal data that changed reads)

The 9/17-9/19 X-analytics inventory in `AGENTS.md` ~2500-3502 and the 9/17/9/18/9/19 `full-tables/` + `chart-reads/`
CSVs were the Phase-2 cross-check layer — concrete examples of numbers it produced:
- @sfdata9ers W1 playcalling (FTN charting): LAC 84.3% motion (slate leader), TB 25.5% play action (slate lead),
  TEN & NO 22%+ no-huddle, WAS 14.7% RPO.
- @hawkblogger pressure gen|allowed (FTN): KC 56.3%|39.4%, DEN 39.4%|56.3% (worst allowed), LV 40.5%|6.5%,
  MIA 6.5%|40.5%, HOU 18.2%|28.6%.
- @benbbaldwin v3 objective team tiers (Kalshi blend): LAR 72.6, BUF 67.7 top; SF 65.6, KC 65.5, BAL 65.2;
  CLE 20.1, MIA 25.6 bottom.
- @SumerSports edge PRWR (9/18): Rousseau 28.6%, Crosby 26.7%, W. Anderson 24.1%, Jalyx Hunt 29.6%.
- @MagicSportsGuy StatRankings CB/receiver method — shell splits, assignment/overlap maps, man/zone TPRR/YPRR.
- FantasyPtsData BELLCOW (backfield XFP share): Achane 95%, Javonte 95%, Gibbs/Cook/Taylor 93%.
- @FantasyPtsData TE targets Wk1: Likely +1.379 EPA/target (cleanest), McBride 35% share, LaPorta +0.380.
- @GridironInfo_ Wk1: Lawrence led EPA/play (+0.79), Dart +0.71; CIN defense -1.49 EPA/play allowed when blitzing
  (best); QB aggressiveness Wk1: Stroud 21%, Mayfield 11%, Hurts 8%, Allen 7%, Mahomes 4%.
- @DonAtkinsonNFL QB read progression (FTN): Purdy lowest first-read 27.0%, Love highest 78.6%.
- @jmthrivept recovery chart W2: McConkey 73% (rib), Flowers 47%, Bowers 68% (meniscus, 14.3→10.4 PPG), Collins 29%,
  Chig Okonkwo 55%.
- @ScottBarrettDFB YPRR elite (2025-26): Nacua 3.84, JSN 3.79, Kincaid 3.54, Flowers 2.87.
- @DevyEusuf separation: Ayomanor leads 2nd-year WRs (0.111); McBride/Likely top-2 TE separation market share.
- MediJo20 rushing EPA vs TDs (1999-2026): Allen +2.4 rush EPA/gm, 0.65 rush TD/gm; Hurts +2.0 / 0.685.
- dynatyze Wk1 cmp leaders: Caleb Williams 37.26 FPTS, Lawrence 26.10/4 TD. SumerPass WR leaderboard W1: JSN 45.8%
  target share (NFL lead). Kincaid: 28.5% share / 30.7% TPRR / 24 routes/gm; "~66% route participation, 27-32% TPRR."

### 4.4 X-sweeps (week 2, `deep/x-sweep1.md` … `x-sweep4.md`)

Four scheduled social sweeps of the 18 target accounts for breaking news (injuries, weather, lineup news) in 48-hour
windows, plus adjacent-metric CSVs in `raw/` (`x-adjacent-week2-dfs-metrics.csv`, `x-t-shoe-index-wk2-lookahead.csv`,
`x-dk-main-slate-salaries-wk2.csv`, `x-game-totals-wk2.csv`). The X-scan surfaced the Purdy OUT news, the Kyler
misattribution correction (own sweep corrected its own Sweep-1 error), and the Jayden Higgins ACL rumor strike.

### 4.5 WR/TE full-pool and optimizer artifacts (week 2)

- `deep/wr-te-full-pool-2026-09-19.md` (119KB — largest single writeup), `wrte-computed.json` (52KB) — computed
  per-player fields for the full WR/TE pool.
- `deep/player-advanced-metrics-2026-09-19.md` (48KB), `advanced-matchups-deep-dive-2026-09-19.md` (45KB),
  `coverage-matchups-2026-09-19.md` (34KB), `defense-scheme-layer-2026-09-19.md` (34KB).
- `hidden_slate_optimizer_pool.json` (30KB) — optimizer pool artifact (name flagged: verify schema before reuse).
- `deep/snf-mnf-addendum-2026-09-19.md` (34KB) — separate addendum for the off-slate primetime games.

---

## 5. Props reverse-engineering: per-creator replication cards

(`docs/research/2026-09-18-props-reverse-engineering/report.md` + `notes/` + `firecrawl/`; confidence labels from the
report: confirmed / inferred / unknown-proprietary. Do NOT attempt to bypass paywalls — mission rule.)

### 5.1 Top-5 most valuable REPLICABLE metrics (report's cross-creator ranking)

1. **Market-implied neutral team strength** (after @benbbaldwin): blend game lines + futures into latent ratings,
   de-vigged probabilities, HFA extracted by regression. Replicable to high fidelity with an odds API (The Odds API
   v4, sport key `americanfootball_nfl`, markets `h2h,spreads,totals`, bookmakers incl. draftkings/fanduel/pinnacle).
   Unlocks `market_neutral_win_prob`, `market_power_points`, `futures_residual`.
2. **Coverage/shell-weighted receiver matchup** (after @MagicSportsGuy + @RyanJ_Heath): shell- and man/zone-conditioned
   TPRR/YPRR. Partial version buildable from public data; full version needs PFF or Fantasy Points charting.
3. **Offense/defense EPA-WPA facet decomposition** (after @SamHoppen): ten facets (Pass Off, Run Off, Pass Def,
   Run Def, Takeaways, Giveaways, Off Pen, Def Pen, ST, Other) from free nflverse PBP (`epa`, `wpa` fields).
   Fully replicable — the only risk is the exact turnover/penalty precedence rule (stated as our convention).
4. **Under-center usage × efficiency** (after @tejfbanalytics/SumerSports): `under_center_rate`,
   `under_center_epa_per_play`, `formation_epa_delta`. Formation shifts are sticky week-to-week; partially free
   via nflverse if formation tagging present (field-name verification still needed).
5. **Playcalling tendency rates + O-line/run composite** (after @sfdata9ers + @ThunderDanDFS): motion/screen/PA/
   RPO/no-huddle rates; OL-vs-front matchup grades. Free subset = EPA/success-based matchup grades + implied totals
   (`team_implied = total/2 − signed_spread/2`); the best inputs (PFF grades, FTN DVOA) are paywalled and
   ThunderDan's blend is a black box.

### 5.2 Per-creator cards (representative)

- **@sfdata9ers — W1 playcalling tendencies** (LAC 84.3% motion; TB 25.5% PA; TEN/NO 22%+ no-huddle; WAS 14.7% RPO):
  INPUT = FTN Fantasy proprietary in-house charting (paid/StatsHub subscription, no public API; FTN confirms in-house
  team charts every play — routes, motion, coverage, situation). Rates are simple ratios over charted plays (inferred
  denominators); kickoff drive-start chart likely nflverse PBP (unknown exclusions); Allen career heatmap fully
  replicable from nflverse EPA/play. VERDICT: (a) not publicly replicable; (c) fully replicable; (b) replicable once
  exclusions defined.
- **@ThunderDanDFS — W2 offensive matchup grades** (team passing/rushing; RB grades with O-line data, 2026-only):
  INPUT confirmed = PFF grades + O-line data + FTN DVOA + projected role/usage + game script (explicitly NOT RB
  elusiveness). COMPUTATION: black-box composite; related D/ST method uses 0–100 scaling of DVOA/sack-rate/turnover
  rate. VERDICT: not replicable exactly — paid inputs, black-box blend; approximable with nflverse EPA/success by
  opponent + free OL metrics + implied totals.
- **@SamHoppen — "How the game was won"** (ten-facet WPA/EPA decomposition): INPUT confirmed = nflfastR/nflverse PBP.
  COMPUTATION (inferred, implementable): orient every play's `epa`/`wpa` to the team; assign each play to exactly one
  mutually exclusive facet with turnover > penalty > offense > defense > ST > Other precedence; sum; sanity check
  that WPA telescopes to final WP − initial WP. VERDICT: fully replicable from free data.
- **@benbbaldwin — Team Tiers** (market-implied win% vs average team, neutral field; blends DK game lines with
  division/conference/SB/playoff/#1-seed futures): COMPUTATION lineage — PFF market-implied ratings (HFA ≈ 0.62
  spread points, 2021), footballperspective implied-SRS (transitive spreads, iterative solve), boooeee gist (team-
  incidence regression: intercept = HFA, coefficients demeaned). Blend formula inferred: convert American futures to
  implied probs, de-vig within markets, fit latent strengths `r_i` + HFA to near-term spreads while matching
  futures-implied neutral-field win probs; weight liquid near-term lines above long-tail futures. VERDICT: replicable
  to high fidelity with an odds API; only the exact blend weights are proprietary (defensible choice: inverse-variance
  by market liquidity).
- **@MagicSportsGuy / StatRankings — CB/WR matchup reports** (coverage-assignment maps, alignment shares L/R/slot/
  backfield, man/zone and Cover 1/3/4 shell splits, TPRR/YPRR/FP-per-route, percentile ranks vs peers): INPUT unknown
  or paid charting (StatRankings launch release: 24+ years data, no provider or public API disclosed; DO NOT assert
  FTN is the source merely because Adams founded FTN). Formulas standard: `tprr` = targets/routes,
  `yprr` = yards/routes, `target_share` = player targets/team targets, percentiles vs same-position/alignment peers.
  VERDICT: not publicly replicable at charting level (routes, coverage, assignment); partially replicable with paid
  PFF data.
- **@tejfbanalytics / SumerSports — under-center usage vs efficiency scatter**: INPUT = SumerSports proprietary
  play/frame charting ("300+ data points many times per second," per sumersports.com, verified live 9/18). DATA
  ACCESS verified: NO public or documented API — subscriber web UI only; stats feature pages expose position tables
  updated within 2 hours post-game. PRICING confirmed live on the home page: **$10/week, $20/month, $100/year,
  7-day free trial** for first-time subscribers. (Sep-18 LB/DI/edge tables + preseason/postseason from 2022 + a
  WELCOME15 promo were claimed via parent lead but NOT independently confirmed on public pages.) VERDICT:
  approximable with nflverse if formation tags exist; proprietary charting not fully replicable.
- **@RyanJ_Heath / Fantasy Points — Advanced Matchups** (W2 edition paywalled, NOT accessed): INPUT confirmed = Fantasy
  Points Data Suite proprietary coverage/schematic charting. VERDICT: partially replicable — coverage-agnostic
  version (opponent EPA/success to position groups, free OL/DL mismatch, implied totals) is buildable; schematic
  shell layer requires paid charting. Unlocks `projected_shell_rate`, `coverage_matchup_delta`,
  `shell_weighted_tprr`, `pressure_mismatch`.
- **@Shauncore / PFF — QB positive-vs-negative graded-play-rate scatter**: INPUT = PFF per-play grades (−2..+2 in 0.5
  increments, position-specific rubrics, converted to 0–100). VERDICT: not replicable exactly — subjective grades
  are the input; public proxy is `qb_positive_epa_rate` / `qb_negative_epa_rate` on dropbacks (outcomes, not process).
- **@b_peters12 — manual film-charted concepts** (Dagger/Shallow/Funnel/Choice, Cover-3 rotation reads): INPUT =
  licensed game film/All-22; qualitative coding (personnel, formation, motion, protection, each receiver's route,
  concept family, pre/post-snap shell, QB progression). VERDICT: replicable as a PROCESS (analysts + versioned
  codebook + inter-rater reliability), not as data — his labels are private IP.

### 5.3 Odds and free-API access facts

- **The Odds API v4** (`https://api.the-odds-api.com/v4/`, docs at the-odds-api.com/liveapi/guides/v4/):
  sport key `americanfootball_nfl`; markets `h2h,spreads,totals`; bookmakers incl. draftkings, fanduel, pinnacle;
  API-key auth; paid/freemium with a free tier (verified 9/18).
- **nflverse** (https://github.com/nflverse): free PBP CSV/Parquet/RDS/QS; `nflreadr`/`nflfastR` (R), `nflreadpy`
  (Python); nflfastR docs define the `epa`, `wp`, `wpa`, `vegas_wp`, `vegas_wpa` fields;
  `calculate_win_probability()` inputs: possession, score differential, clock, spread, down, distance, yard line,
  timeouts, second-half kickoff indicator. `nflseedR` simulates remaining-schedule/playoff outcomes from ratings.
- **TheSportsDB free tier** (https://www.thesportsdb.com/free_sports_api; $9/mo premium): CONFIRMED — NFL team
  directory with metadata (stadium, colors, badges, crosswalk IDs idESPN/idAPIfootball, some teams null like ATL);
  NO play-by-play, no EPA/WP, no NGS, no charting, no depth charts — enrichment-only, soft-fail to [] on missing
  season data (don't treat [] as "no games exist"). Gap analysis at
  `firecrawl/THESPORTSDB-COVERAGE-GAPS.md`; TheSportsDB vs OddsAPI vs nflverse coverage detail in
  `firecrawl/ODDSPAPI-DEEP-DIVE.md` (41KB) and `ODDSPAPI-CODE-DEEP-DIVE.md` (22KB).

### 5.4 Could not verify (open questions carried forward)

Exact denominators/exclusions for sfdata9ers' rates and kickoff chart; SamHoppen's exact facet precedence (no public
code found); Baldwin's exact blend weights (rbsdm.com failed to load — do not re-attempt); StatRankings' data
provider / any public API; SumerSports' unconfirmed Sep-18 claims (LB/DI/edge tables, WELCOME15); Fantasy Points W2
Advanced Matchups formula (paywalled); Shauncore chart's minimum-dropback cutoff; exact nflverse field names for
kickoff plays and under-center formation tags.

---

## 6. For the coding agent — inputs, locations, limitations

### 6.1 What each lane needs as data inputs

**DFS lanes (week 1 + week 2):**
- Salaries per position/site/slate — the ONLY structured table family present in the repo: `deep/te-salaries.csv`,
  `dst-salaries.csv`, `qb-salaries.csv`, `rb-salaries-projections.csv`, `wr-salaries-projections.csv`,
  `x-dk-main-slate-salaries-wk2.csv` (week 2); week-1 full-slate FD salary table reproduced inside the research
  writeups (The Huddle table) — no week-1 salary CSV exists.
- Game environments: spreads/totals/implied totals — `raw/slate-lines-current.csv`, `x-game-totals-wk2.csv`;
  weather — `raw/weather.csv`, `qb-weather.csv` (week 2); injuries — `qb-injuries.csv`, `wr-injuries.csv` (week 2).
- Projections: there are NO free numeric projection feeds in the repo; the writeups quote FantasyPros ECR,
  numberFire (FD-scoring model), DK Network projections, 4for4, FantasyLabs, ETR, FantasyPts — all pulled from
  public/free surfaces per-lane and transcribed into the consensus files. A coding agent cannot scrape these
  wholesale; the repo values are snapshots (dated 9/13 and 9/19).
- Ownership: there are NO true projected-ownership numbers anywhere (Stokastic/4for4 GPP paywalled; RotoWire and
  FantasyLabs models paywalled). The only hard numbers: Gibbs ~40% (week 1, FantasyLabs); Bijan "most-rostered"
  (week 2, RotoWire); BettorGreen 9/19 (Schultz ~5.5%, Maye 5.3%). DK Network Buzz Factor tiers ("Red Hot"/"High"/
  "Building"/"On the radar") are discussion-volume proxies, NOT ownership — do not treat them as percentages.

**Props reverse-engineering lane:**
- Free: nflverse PBP (EPA/WPA, formation tags pending verification), nflseedR, The Odds API v4 (free tier),
  TheSportsDB free tier (metadata enrichment only), ESPN public endpoints (alignment/shadow reports are
  editorial, not data feeds).
- Paid/locked: PFF grades, FTN charting/StatsHub, Fantasy Points Data Suite, SumerSports SumerPass, FTN DVOA,
  StatRankings (no public API), RotoGrinders/FantasyLabs/RotoWire numeric ownership models.
- Derived-metric candidate columns (from the report's "new columns" sections — ready to add to a feature table):
  `team_implied_total`, `market_neutral_win_prob`, `market_power_points`, `futures_residual`, `motion_rate`,
  `play_action_rate`, `rpo_rate`, `no_huddle_rate`, `avg_opponent_drive_start_yardline`,
  `under_center_rate`, `under_center_epa_per_play`, `formation_epa_delta`,
  `pass_off_epa` / `run_off_epa` / `pass_def_epa` / `run_def_epa` / `takeaway_epa` / `giveaway_epa` (+ WPA analogues),
  `man_tprr`, `zone_tprr`, `man_yprr`, `zone_yprr`, `shell_weighted_tprr`, `shell_weighted_yprr`,
  `coverage_matchup_delta`, `alignment_overlap`, `qb_positive_epa_rate`, `qb_negative_epa_rate`.

### 6.2 Where the source files live (repo, read-only)

- Consensus tables: `docs/research/2026-09-13-dfs/{qb,rb,wr,te-dst}-consensus-2026-09-13.md`;
  `docs/research/2026-09-19-dk-week2/dk-week2-2026-main-research.md` (master, ~17KB) and
  `deep/consensus-{qb,rb,wr,te-dst}.md` + `deep/consensus-map.md` (agree/conflict/leverage rows).
- Per-lane research: week-1 `deep/{stack-players,matchup-scheme,week1-environment,winning-lineups}-2026-09-13.md`
  + `raw/` (per-site scrape notes) + `verify/` (second-source confirmations incl. `nflverse/` data);
  week-2 `deep/{qb,rb,wr,te,dst,games}-phase{1,2,3}.md`, `x-sweep{1,2,3,4}.md`, `verify/*-verify.md`.
- Raw CSVs: week-2 `raw/` (`rb-salaries-projections.csv`, `wr-salaries-projections.csv`, `te-salaries.csv`,
  `dst-salaries.csv`, `qb-salaries.csv`, `slate-lines-current.csv`, `weather.csv`, `x-adjacent-week2-dfs-metrics.csv`);
  week-1 `verify/nflverse/roster2025.csv`.
- Props: `docs/research/2026-09-18-props-reverse-engineering/report.md` (per-creator sections with
  Metric/Inputs/Computation/Data-access/Replicability-verdict/New-columns), `MISSION-BRIEF-2026-09-18.md`,
  `notes/{sfdata9ers,benbbaldwin,thunderdan,samhoppen,magicsportsguy,sumersports,ryanjheath,shauncore,
  bpeters12}.md`, `firecrawl/` deep-dives (ODDSPAPI 41KB, ODDSPAPI-CODE 22KB, APIKEY-FAN 15KB, FREEPUBLICAPIS 14KB,
  APIVAULT 9KB, THESPORTSDB-COVERAGE-GAPS, nfl-historical-odds/nfl-stats-apis/nfl-odds-apis-metrics 50-link lists).

### 6.3 Known limitations and caveats

1. **All salaries are second-party.** DK draft-group API returned Akamai Access Denied on 9/19 — zero week-2
   salaries are endpoint-verified; week-1 FD salaries rest almost entirely on one full-slate table (The Huddle).
   Treat every salary as corroborated, not verified.
2. **Slate scope must be re-resolved every week.** Week 1's 12-game FD main slate and the 14-game Sun-Mon slate
   coexisted in the same research; week 2's DK slate had to be corrected 14→13 games mid-research (SNF excluded).
   Primetime players (Kelce, Ferguson, Mahomes, etc.) sit on separate salary pools.
3. **No free numeric ownership exists.** Any ownership model in the knowledge base must be built, not read —
   the research only ever had qualitative tiers, Buzz Factor tiers, and three hard numbers (Gibbs ~40%,
   Schultz ~5.5%, Maye 5.3%).
4. **Adversarial pass killed or downgraded real theses** (week 2): Etienne thesis (Kamara debut), Bowers (doubtful
   per Review-Journal), Chig Okonkwo OUT, Purdy OUT 2-5 weeks (single-sourced — flagged, not confirmed),
   Cooper Rush named ATL starter (London downgraded), McConkey truly 50/50. Carry the pattern: injury/weather/news
   overrides must arrive after the breadth pass.
5. **Stale-content discipline is a first-class method step** — 2025-dated trackers, future-dated yardbarker pieces,
   wrong-week ownership pages, and mixed-season trackers were excluded per-claim. Any automated pipeline needs the
   same date-gating (roster/transaction dates, season key, article date vs slate date).
6. **Debunked/stale examples to never reuse:** hellorookie's Mahomes ACL story; RotoGrinders' "Lawrence 10.51%
   most popular QB" (wrong week); yardbarker's Rodgers wrist-fracture piece (future-dated); Jayden Higgins ACL rumor
   (struck); the "Goedert ruled out" and "Waller OUT" notes (Sept 2025); 2025 FantasyAlarm/RotoWire tables keyed to
   2025 matchups.
7. **Consensus is sometimes wrong vs the data:** Achane (95% bellcow XFP) was still a consensus fade because the
   matchup was genuinely brutal — the research's verdict: trust the conflict resolution, don't auto-contrarian it.
   Irving (top RB leverage) vs "Lloyd trap" (projection >> outcome risk) shows projection-versus-role divergence is
   the core signal to model.
8. **Coverage-level receiver metrics are paywalled.** Anything needing routes/coverage/assignment (TPRR splits by
   shell, WR/CB assignment shares) requires PFF/Fantasy Points/SumerSports charting — the repo only holds their
   OUTPUTS as quoted numbers, not the underlying charting data. Free substitutes: EPA/success vs position groups,
   implied totals, EPA-facet decomposition from nflverse.
9. **Do not attempt to bypass paywalls or gated endpoints** — the mission rule applies to any downstream use of
   this research (SumerSports app internals, Fantasy Points Data Suite, RotoWire/FantasyLabs ownership tools,
   DraftKings' SPA JSON — treat as rumored, not confirmed).


---

