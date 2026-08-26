# MEDIA-INTEL — NFL Sports Media/Betting Layer Census
Workspace: C:/Users/Garrett/Sports/handoff/research/nfl-media-2026-08/
Status: Draft / UNVERIFIED items marked freely. Not git-committed.

---
## 1. ANALYTICS PODCASTS / NEWSLETTERS / SHOWS

### Sharp Football (Warren Sharp) — sharpfootballanalysis.com
- Who: Warren Sharp (independent analyst, publishes books + site).
- Methodology bent: Detailed modeling of play-by-play data, customized charting, predictive analytics for totals (claims ~62% win rate on totals historically). Offers betting lines + preseason analysis pages.
- Free reports/scrapable: Free weekly newsletter (subscribe page exists), analysis archives under /analysis/, betting lines page /lines/. No public model download; claims custom predictive analytics + visualized data. UNVERIFIED whether any raw data dumps exist.
- Podcast: Apple Podcasts "Sharp Football Analysis by Warren Sharp" — charts every preseason week offense/defense data (shotgun rate, motion, personnel groupings). Good for process extraction.

### The Athletic — Football Show + analytics writers
- Who: Ben Baldwin, other analytics writers (The Athletic / NYT). Ben Baldwin pioneered "establish the run" debunking; frequently quoted (Sloan Sports Conf, NYT pieces).
- Methodology bent: Play-level EPA models, situational statistics, context-heavy (not pure betting); Baldwin uses expected points / passing efficiency frameworks.
- Free reports: Some NYT Athletic articles free limited; analytics previews exist (e.g., 2025/2026 win totals articles). PFF also behind paywall for much data. Scrape potential: preview snippets + headline-level projections.

### PFF (Pro Football Focus) — PFF NFL Podcast + PFF betting previews
- Who: PFF analytics team (Trevor Sikkema, rotating co-hosts). PFF runs grading + predictive simulations.
- Methodology bent: Grading-based models; publishes projected win totals for all 32 teams (2026 season preview) with betting picks. Uses proprietary grading + simulation layers.
- Free reports/scrapable: Free preview pages (e.g., pff.com/news/bet-nfl-betting-2026-projected-win-totals) — lists best bet picks per team but locks full projections behind paywall. Worth scraping preview snippets + table headers.

### Establish The Run (ETR) — establishtherun.com
- Who: Adam Levitan + Evan Silva (renowned fantasy experts). ETR covers fantasy, DFS, betting, props.
- Methodology bent: Proprietary "Buy-Leone Model" for projections (per position) with injury/game-flow adjustments; betting strategy articles (SGP, odds boosts). Reports model lists (separate per position) but does not publish full underlying data.
- Free reports: Free weekly newsletter "THE FANTASY NEWSLETR" (Saturday mornings), some analysis articles free. Subscription site for premium content. Scrape potential: newsletter text if captured/archived; marketing docs show model names but no formulas.

### Bet The Process — podcast + site (Jeff Ma + Rufus Peabody)
- Who: Jeff Ma (MIT/MIT Sloan fan / Black Jack / MIT blackjack team), Rufus Peabody (professional sports bettor, data scientist, co-founded Unabated with Captain Jack Andrews). Regular guests: Ed Miller, Kevin Clark, others.
- Methodology bent: Process-oriented betting + data science. Rufus discusses dynamic uncertainty modeling (season simulators using power ratings + QB injury probability adjustments). Transcripts available via podcast feeds.
- Free reports/scrapable: Podcast episodes have transcripts (Musixmatch + Apple Podcasts summaries). The transcript of the Gambling With an Edge episode (Captain Jack Andrews + Rufus Peabody) is already captured and contains actual process discussion: dynamic uncertainty, power ratings updates, derivative pricing via regression, hedge ethics. This is a high-value extract.

### Ben Baldwin / Noah Graham threads
- Who: Independent analytics writers; Baldwin now with The Athletic. Noah Graham (analytics Twitter/substack contributor) runs threads on situational stats.
- Methodology bent: EPA-based, situational splits (down/distance/weather/rest). Often free threads with data.
- Free reports/scrapable: Twitter/X threads (hard to archive reliably) but contain actual statistics and reasoning. Worth capturing via web_extract if URLs saved.

---
## 2. BETTING-INDUSTRY REPORTS / PUBLIC BOOK PREVIEWS

### Pinnacle — NFL Win Totals / Pricing Articles
- URL: pinnacle.com/betting-resources/en/football/nfl-win-totals-2026-regular-season-odds
- What it is: Pinnacle posts 2026 regular season win totals with price comparisons to FanDuel/DraftKings/Bet365; includes team-by-team totals. Not a whitepaper but a public pricing snapshot — reveals market-making lines and where Pinnacle prices differ.
- Scrape value: Total lines + prices per team; compare across books to infer sharp line movement. UNVERIFIED whether deeper Pinnacle whitepapers exist (historical Pinnacle articles by BJ Cunningham or others discuss pricing; need targeted search).

### PFF — NFL Betting 2026: Projected Win Totals (free preview)
- URL: pff.com/news/bet-nfl-betting-2026-pff-projected-win-totals-for-all-32-teams
- Contains best-bet table but full projections behind login. Scrape preview + best-bet annotations for edge sources.

### DraftKings / BetMGM / Covers — Season Previews / Win Total Releases
- DraftKings released 2026 NFL season win totals shortly after Super Bowl LX (per VSiN article). BetMGM publishes full team-by-team win totals.
- Scrape value: Line movement stories + which teams are getting early action (e.g., NYT Athletic: Giants/Bears getting early action). Not process, but market sentiment data.

### EdjSports / Pinnacle Professional Syndicate Interviews
- EdjSports (edjsports.com) produces whitepapers / analytical reports (e.g., win probability, 4th-down analytics). Known for data-driven NFL research.
- Professional syndicate interviews: Old Pinnacle / BJ Cunningham pieces (some on betting resources blog) discuss pricing, sharp action, market efficiency. UNVERIFIED full archive; recommend targeted search on site:pinnacle.com + "pricing" / "Cunningham".

---
## 3. TOOLS LANDSCAPE — CONSUMER BETTING / DFS TOOLS

### Unabated — unabated.com
- Price: Essentials $67/mo ($49 annual); Premium $199/mo ($132 annual); NBA Projections add-on $249/mo.
- Engine/claim: Sharp line reference ("Unabated Line"), props simulator, DFS pick'em builder, market-based player projections, alternate line calculator, NFL futures simulator, betting edge tool, in-game tools. Founded by Captain Jack Andrews + Rufus Peabody (co-founded with Dan Fabrizio, Matt Snyder). Philosophy: teach process, not spoon-feed picks; no affiliate marketing to books.
- What's stealable from marketing docs: Pricing tiers, feature list, philosophy statements ("not to help people win — to help them lose less / trim house edge"). No formulas revealed. UNVERIFIED whether simulator code is open-source; appears proprietary.

### Outlier — outlier.bet
- Price: $29.99/mo (entry); $79.99/mo upper tier (per marketing page). Some third-party reviews list $99/mo.
- Engine/claim: Player prop & betting tools; one-click sportsbook integration; focuses on consumer-facing +EV scanning. Less institutional than Unabated.
- What's stealable: Marketing docs show tiered pricing, prop focus, sportsbook integrations. No engine details.

### Stokastic — stokastic.com
- Price: Not clearly listed in marketing snippet; known DFS projection + ownership + simulation service for NFL, NBA, MLB, etc. Used by serious DFS players.
- Engine/claim: "Most accurate DFS projections, ownership data, and simulations." Proprietary projection engine; does not expose methodology.
- What's stealable: Feature claims (ownership + sims) but no underlying model info.

### SaberSim — sabersim.com
- Price: Marketing shows $7 for 7 days trial; unknown full monthly rate.
- Engine/claim: DFS optimizer/simulator. Marketing heavily uses testimonials ($1M DraftKings wins). Engine likely Monte Carlo / projection-based lineups. No public methodology.
- What's stealable: Marketing testimonials + feature claims only.

### OddsShopper / BettingPros — mentioned in search results
- OddsShopper (app) compares odds. BettingPros appears referenced in some betting-tool lists. Not deeply verified here; recommend follow-up search for feature + pricing.

### General observations on tool landscape
- Most serious tools (Unabated, Outlier, Stokastic, SaberSim) are subscription-based with proprietary projection/simulation engines. Marketing docs reveal feature names but almost never formulas or source data. The best steal from marketing is: (a) pricing structure, (b) feature names (what analysis dimensions they cover — props, futures, ownership, in-game), (c) philosophy statements about process vs. picks. Actual process details come from podcast transcripts (see section 4) and from public articles (e.g., Unabated articles on derivative pricing, contests, simulator updates).

---
## 4. SHARP-GUEST TRANSCRIPT EXTRACTS — ACTUAL PROCESSES

### Source: Gambling With an Edge — Captain Jack Andrews + Rufus Peabody (transcript captured; full transcript extracted above)
- Guests discuss launching Unabated, betting education philosophy, simulator mechanics, hedge ethics, exchange markets.
- Key process statements (verbatim from transcript):
  - Jack Andrews: "There's a process to all of this and you have to kind of learn this process." (resists spoon-feeding picks; teaches navigation of market maps instead.)
  - Rufus Peabody (on simulator): "Dynamic uncertainty is something that is not really ... you can't fully capture without running simulations." Describes updating ratings weekly (each Tuesday) and integrating simulation results with futures price screens at various books.
  - Rufus (on props): Discusses truncated distributions for yardage (not normal), mean vs. median differences for receiving yards; plans simulator for receiver yards based on per-catch distribution fitting.
  - Rufus (on hedge / negative EV): Confirms hedging often includes one negative-EV side; recommends assessing whether initial bet is +EV before considering hedge. Emphasizes process over shortcut.
  - Jack (on derivative pricing): Uses "multinomial regression that goes into the various other places that it could land" for pricing alternate lines (e.g., NFL spread derivatives). References horse-racing derivative pricing as analogous.
- Verdict: HIGH-value process extract. Reveals simulator architecture (Monte Carlo / regression-based with weekly updates), philosophy (teach process, not picks), and pricing approach (derivative regression + market integration).

### Source: Bet The Process episodes (podcast feed available; transcripts not fully extracted here)
- Hosts: Jeff Ma + Rufus Peabody. Topics include sports betting process, analytics, prediction markets, Sloan conference recap.
- Potential process extracts: Rufus has discussed betting process, power ratings, seasonal simulation, and professional betting scaling (narrowing focus to best sports, increasing account scale). Recommend extracting specific episodes (e.g., "Kevin Clark Joins Rufus and Jeff to Talk Best NFL Processes" — Sep 12, 2024) for verbatim process descriptions.
- UNVERIFIED: Full transcripts of these episodes not extracted in this session; rely on podcast feed summaries and titles for now. Recommend follow-up extraction for episodes that explicitly mention "NFL Processes" or "Best NFL Processes."

### Source: Risk of Ruin podcast (referenced by Jack Andrews in transcript)
- Series documenting advantage players' transition from online casino beating → sports betting markets → Las Vegas operations. Not a sharp-guest transcript per se but a process documentary.
- Scrape potential: If audio/transcript available, can extract scaling methods, bankroll management practices, and transition strategies.

---
## 5. WHAT REVEALS ACTUAL PROCESS VS. HYPE

- Actual process revealed (confirmed):
  - Unabated founders (Jack + Rufus) explain simulator mechanics (dynamic uncertainty, QB injury probability adjustments, weekly updates, regression-based derivative pricing) and education philosophy. This is real process.
  - PFF / Sharp Football / ETR publish methodology names (grading-based, charting-based, Buy-Leone model) but do not reveal formulas - partial process.
  - Pinnacle / DraftKings win-total pages reveal market lines, not process - hype/market data only.
- Hype / marketing only (confirmed):
  - SaberSim / Stokastic / Outlier marketing is testimonial-heavy with no methodology disclosure.
  - Most betting-tool marketing emphasizes winning amounts rather than analytical steps.

---
## 6. UNSOLVED / FOLLOW-UP
- EdjSports whitepapers: not directly fetched; recommend targeted search + extraction.
- Pinnacle/Cunningham historical pricing articles: not fully located; recommend site:pinnacle.com search.
- Bet The Process full transcripts: only feed summaries captured; recommend selecting 2-3 high-value episodes (e.g., NFL Processes, Sloan recap) and extracting transcripts for process quotes.
- Sharp Football podcast episodes: titles show preseason analysis frameworks; recommend listening/extracting for actual data presentation methods.
- Noah Graham / Ben Baldwin free threads: should be captured when URLs available; not yet archived.

---
## FILE INVENTORY
- MEDIA-INTEL.md (this file)
- Source transcript file (if captured): reference to Gambling With an Edge transcript content extracted via web tool.
- Follow-up notes embedded in UNSOLVED / FOLLOW-UP section.

---
*No git commit performed. Not pushed. Local to workspace only.*
