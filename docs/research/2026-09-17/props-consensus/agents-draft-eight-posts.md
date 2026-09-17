# AGENTS.md draft — Garrett's 8-post sweep (2026-09-17)

Paste-ready. Research only; no public output, no engagement with these accounts.

**Retrieval status:** 1 of 8 post bodies seen (post 2, via Garrett's breakdown). X blocked direct fetch; no text mirrors. All accounts identified from public sources; method claims marked UNVERIFIED where unknowable.

## The 8 accounts

1. **@The_Coach_A** — Cody Alexander (MatchQuarters author, 6 books on defense; Head of Football Ops, Field Vision Sports). Posts Field Vision **Havoc Ratings** (defense) / **Threat Ratings** (offense): per-player impact learned play-by-play from years of NFL PBP, expressed as 0–100 percentile *within position group, scheme-adjusted* (e.g., zone vs man CB splits). Proprietary model; method summarized on fieldvisionsports.com, exact formula UNVERIFIED.
2. **@kylem_ff** — Kyle Menton, Fantasy Points content creator (joined Feb 2026; runs weekly trading-guide series). Posts a **Fantasy Football Trade Chart & Rankings** with **FPOE** (Fantasy Points Over Expectation = XFP − FPG on his chart — inverted sign: negative FPOE = OUTscoring expectation; James Cook 62.5 trade value, −3.1 FPOE = sell-high), **FP/S** (fantasy points per snap), buy/shop/sell trend coding. Values: Gibbs 80.0 #1 RB, Amon-Ra 70.0, Josh Allen top QB, Goff 16.4 FPG / 0.23 FP/S.
3. **@Doug_Analytics** — anonymous chart-craft account, media-cited (SI, The Athletic's Dan Duggan). One-stat-one-visual: QB EPA/play **in vs out of pocket**; **NFL draft-pick probability Monte Carlo** (e.g., Bengals 59.1% pick 11 / 25.5% pick 12); niche counting stats (7 INTs on Jalin Hyatt targets = 9.6% of targets, worst since 2022). Exact sim engine UNVERIFIED.
4. **@tbir_9** — "The Bryce Is Right," Panthers fan account (~400 followers). No known metric output; fan-lane engagement surface only.
5. **@sfdata9ers** — 49ers analytics account (NBC Sports Bay Area, SI citations). 49ers EPA plots: special-teams **EPA/play kickoff vs punt coverage**; **expected points from penalties on no-yardage plays**; kickoff-coverage opponent starting field position. Penalty-EPA formula is theirs, UNVERIFIED.
6. **@jonboybeats** — Jon Jackson (engineer; won $75K Underdog Slow Puppy best-ball 2023; "Show Me The Data" newsletter). Best-ball/DFS data, projections, market trends; current NFL-survivor lane.
7. **@Doug_Analytics** (second post) — same as 3.
8. **@threesandtds24** — (Thomas) threes&tds, Panthers fan account (~350 followers). News curation, fantasy rants; no metric output.

## Metric inventory: definition, method, data source, our reproduction path

**FPOE / xFP (expected fantasy points).** Definition: xFP = fantasy points an average player would score given a player's opportunities; FPOE = actual − expected (Menton's chart uses XFP − FPG, sign-flipped). Method (public, Mike Clay/ESPN + Barrett/RSJ lineage): targets → expected catch rate by depth-of-throw × location × position; expected receiving yards by depth × location; xTD by depth × location; rushes → expected yards by position × direction, xRuTD by yardline; × PPR scoring. Data: nflverse columns `air_yards`, `pass_location`, `yardline_100`, `complete_pass`, `receiving_yards`, `rushing_yards`, `rush_location`, TD flags, `position` — all present in PBP. **Reproduction: full.** Our edge: (a) luck-layer decomposition — split FPOE into xTD-luck vs efficiency components; (b) bootstrap uncertainty bands per player; (c) opponent adjustment (defense faced); (d) same-day refresh (nflverse Thurs AM → chart by afternoon); (e) quadrant display: xFP (role) vs FPOE (regression signal) with league context. Regression fact: FPOE mean-reverts; high-xFP + negative-FPOE (Clay sign) = buy-low.

**Havoc/Threat Ratings.** Definition: scheme-adjusted 0–100 percentile of individual per-play impact, position-group-relative. Method: proprietary ML over years of PBP (UNVERIFIED internals). **Reproduction: partial.** We can build an open version: EPA on involved plays (tackler/pass-rusher/targeted defender/receiver) + scheme-split leaderboards (man vs zone from FTN charting coverage columns). We CANNOT attribute off-ball value exactly. Our edge: publish the method, add uncertainty bands from play counts, ship the scheme-split quadrants Field Vision doesn't make public.

**Pocket-split EPA quadrants (Doug-style).** Definition: QB EPA/play in-pocket vs out-of-pocket. Method: needs pocket-presence charting — nflverse PBP does NOT carry it; requires FTN charting pressure/pocket columns or NGS. **Reproduction: conditional on charting.** Our edge: swap pocket for splits we DO own (EPA vs blitz vs no-blitz from nflverse `blitz` proxy? nflverse lacks it — use FTN charting; EPA by down, by field zone, pressure-proxy via sack+hit flags).

**Draft-pick probability Monte Carlo.** Definition: distribution over final draft slots given current record + SOS. Method: simulate remaining games (ELO from our lab ratings) × tiebreak rules. **Reproduction: full.** Our edge: our own ELO ratings as the sim engine; weekly chart during the tank-race window (Nov–Jan), when media cites it.

**Special-teams / penalty EPA plots (sfdata9ers-style).** Definition: EPA/play on kickoff and punt coverage units; expected points extracted from penalties on dead plays. Method: nflverse EPA on `play_type` kickoff/punt (fully public); penalty-EPA = their construction, UNVERIFIED — we define our own: EPA delta of penalty plays vs expected no-penalty outcome. **Reproduction: full.** Our edge: this niche is under-charted; league-wide versions (not team-specific) + hidden-yardage rollup (ST EPA + penalty EPA + starting field position) is an ownable weekly chart.

**Best-ball / survivor EV (jonboybeats-style).** Definition: contest-specific expected value — survivor = win prob × future team value; best-ball = roster-construction edge from ADP + projections. Method: nflverse `wp` for win probs; our projections + ADP for construction. **Reproduction: full, seasonal.** Our edge: integrate with our own projections instead of market ADP; survivor EV chart weekly in-season.

**Fan-lane accounts (@tbir_9, @threesandtds24).** No metric to reproduce. Engagement targets only; Panthers/Bryce Young 2026 season is the content seam.

## Ranked build targets for the engine

1. **FPOE/xFP stack** — full reproduction, same-day, luck-decomposed, with bands, opponent-adjusted, quadrant display. Feeds trade chart, buy-low/sell-high posts, prop projections. Highest ROI.
2. **Doug-style single-stat charts** (EPA splits we own + draft-pick Monte Carlo) — cheap, same-day, media-citable format.
3. **Hidden-yardage chart** (ST EPA + penalty EPA + field position) — under-charted niche; league-wide weekly.
4. **Open Havoc** (involved-play EPA + scheme-split leaderboards, method published, uncertainty bands) — medium effort; differentiator is transparency.
5. **Survivor/best-ball EV** — seasonal; wire to our projections.
6. **Fan accounts** — no build; engagement only.

**What we do NOT build:** Field Vision's proprietary per-player model (unreproducible internals; we build the open alternative instead). No republished charts — learn, don't lift.
