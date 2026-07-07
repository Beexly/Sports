# Deep Intel: Action Network · Covers/OddsShark/VegasInsider/WagerTalk · SportsData.io

*Public-record research. `(documented)` = explicit in a cited public source ·
`(inferred)` · `(speculative)`. Passive-public only — no infrastructure probing
(that angle was excluded per [[feedback-osint-passive-only]]). These three
research runs completed their angles but their final synthesis stalled during a
model switch; findings extracted directly from the run journals.*

## The consolidation map (the headline)

Most of this competitive set has rolled up into **three public companies** + one
private data vendor. That's a different competitive reality than "many
independent competitors":

| Parent (public) | Owns | Notes |
|---|---|---|
| **Gambling.com Group** (Nasdaq: **GAMB**) | **RotoWire** (Roto Sports, 2022, $27.5M) + OddsJam/OpticOdds (Jan 2025) | affiliate-marketing + sports-data roll-up |
| **Better Collective** (Nasdaq STO: **BETCO**) | **Action Network** ($240M, 2021) + **VegasInsider** + **ScoresAndOdds** (2019, $20M asset purchase) | Danish, founded 2004, listed 2018, 600+ employees, group rev >€180M |
| **Genius Sports** (Nasdaq: **GENI**) | **Covers.com** (via **Legend** / CS Media Ltd — Genius acquired Legend, closed **May 1 2026, up to $1.2B**) | one of the sports-data "Big Three" |
| **SportsData.io** (private, Scott Gimpel) | data VENDOR to Action Network + Better Collective + DK/FanDuel/Fanatics/etc. | not an owner — a supplier underneath the others |

**Still independent / private:** LineStar (BetFully), FantasyPros (Marzen Media),
WagerTalk (WagerTalk Media), and **OddsShark** (parent unnamed on-site; app
developer of record is **Barscope Interactive Data Systems Inc.**, Halifax NS —
circumstantially in the same Halifax cluster as Covers.com/CS Media/Legend, but
**ownership not confirmed**; Better Collective / GAMB / Catena / PENN explicitly
ruled out). *(documented / speculative on the Halifax link)*

## Action Network (Better Collective)

- **$240M acquisition, closed Q2 2021** (cash + Nordea debt + BETCO equity),
  from Better Collective's own investor deck (verbatim). Pre-acquisition stats
  (from the deck): ~100% revenue growth 2019→20, **130M picks tracked by 400K
  pick-trackers**, ~3.6M avg monthly betting users, 30+ content team (ESPN/CBS/
  CNBC alumni), ~10K betting stories in 2020, 500M social impressions. *(documented)*
- **No public expert-accuracy methodology** (unlike FantasyPros' Accuracy
  Challenge) — it shows an A–F grade stat but no graded ROI methodology. *(documented)*
- **Affiliate engine:** a group-wide uniform redirect/tracking system at
  `switchboard.actionnetwork.com/offers`. *(documented)*
- **Legal/reputation:** a **BBB F-rating** profile and a **NY AG consumer alert**
  surfaced. *(documented — treat as flagged, not adjudicated)*
- Core analytics: Sharp Report (steam/line-move signals), Public Betting
  (bet% vs money%), Projections, Systems backtester — most gated behind PRO
  ("Locked Content"). *(documented)*

## Covers / OddsShark / VegasInsider / WagerTalk

- **VegasInsider = Better Collective** — its own `/about` says *"one of many
  Brands under the Better Collective Universe"* (Better Collective USA Inc., NYC).
  Acquired 2019 via a **$20M asset purchase** (with ScoresAndOdds). This is why
  VegasInsider embeds Action Network's CDN/widgets: **same parent.** *(documented)*
- **Covers.com → CS Media Ltd → Legend → Genius Sports (Nasdaq: GENI).** Genius
  acquired Legend (Covers' parent holding group), **closed May 1 2026, up to
  $1.2B** ($900M-ish at close). *(documented)*
- **OddsShark** — parent unnamed on every disclosure page; app developer of
  record **Barscope Interactive Data Systems Inc.** (Halifax NS). Halifax overlap
  with Covers/CS Media is circumstantial only. *(documented / speculative)*
- **Legal:** OddsShark AND VegasInsider had **2019 New Jersey DGE regulatory
  actions** for promoting unlicensed offshore books (Bovada/BetOnline). *(documented)*
- **WagerTalk** — the outlier: independent, boutique **subscription tout/
  handicapper** (founded 2007, Jeffrey Keim; merged with GoldSheet via Rick Allec;
  Las Vegas). Direct pick-selling model, not content+affiliate. Zero patents for
  it / CS Media / GoldSheet. *(documented)*

## SportsData.io (the data layer beneath)

- **Private, self-funded, debt-free.** Founded 2007/08 by **Scott Gimpel** as
  **FantasyData LLC**, rebranded SportsDataIO 2019, HQ Philadelphia, **200+ (self-
  reports "more than 200") clients.** Zero patents. Small, **.NET/VB.NET** eng
  team. Clean litigation record. *(documented)*
- **Markets itself against Genius Sports & Sportradar** (the "Big Three" of
  sports data). **20-brand customer list** on its own site: Action Network,
  Better Collective, Catena Media, DraftKings, FanDuel, Fanatics, Microsoft, Fox
  Sports, Sports Illustrated, Sleeper, Underdog, Betr, Crypto.com, ABInBev, … *(documented)*
- **Cross-reference result:** **Action Network + Better Collective are confirmed
  SportsData.io customers.** The other 7 prior targets are **not** — RotoWire
  appears only as a `RotoWirePlayerID` cross-reference field in SportsData's NFL
  schema (next to `SportRadarPlayerID`), i.e. an ID mapping, not a vendor tie. *(documented)*
- Public developer docs (Data Dictionary, API docs, Fantasy Scoring System) are
  genuinely open — a rare case where the "engine" is deliberately public because
  the product *is* the data feed. Business model: 3-tier, contact-sales-gated,
  free trial serves scrambled data. *(documented)*

## GSE implications

- **The market is consolidated, not fragmented.** GSE competes against three
  public conglomerates' brands + a shared data vendor — the "independent scrappy
  competitor" framing is outdated. Differentiation is on *method transparency +
  proof-of-accuracy*, not out-scaling them.
- **SportsData.io is a legitimate data-vendor option to evaluate on its own
  merits** (200+ clients, open docs, DK/FD/Fanatics-grade) — decoupled from any
  competitor's use of it. Weigh against GSE's existing nflverse/open-data-first
  doctrine only if a specific feed (live odds, injuries) fills a real gap.
- Action Network's BBB-F / NY-AG-alert and the OddsShark/VegasInsider NJ-DGE
  actions are reminders that the affiliate-betting-media lane carries real
  consumer-protection/regulatory exposure — the lane GSE's skill-based stance
  deliberately avoids ([[project-gse-gaming-stance]]).
