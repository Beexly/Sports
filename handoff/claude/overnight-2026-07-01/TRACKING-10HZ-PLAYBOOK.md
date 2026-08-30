# 10Hz Player Tracking — The Acquisition + Mapping Playbook

Owner asked: "Find me 10Hz stats, how to map them, how to get them."
Researched live 2026-07-02. Reality Ladder tags throughout.

## The market, ranked (who actually has it and who will sell to us)

### 1. SkillCorner — the realistic buy [VERIFIED vendor; BUILDABLE on purchase]
Computer-vision tracking derived from All-22 video: **all 22 players, every
play, ~10 frames/second**, with off-camera players extrapolated. American
football product line: XY Tracking Data + Contextual Data (max speed,
acceleration, separation, get-off time) + Prediction Data. Delivered by API,
**already keyed to PFF and GSIS IDs** (which makes mapping into our stack
almost free — see below). Their page lists NFL/college teams as customers;
their soccer business sells to media and betting operators, so an analytics
product is a normal sales conversation, not a novelty.
- How: "Get a Demo" at skillcorner.com/contact-us. Ask for: NFL XY tracking
  API, analytics-product license (not team license), historical seasons +
  in-season delivery, trial slice for evaluation.
- Cost expectation [ESTIMATE, not quoted]: low-to-mid five figures/yr based
  on their soccer-market commercial deals. Cheaper than Genius by 10-100x.
- Key diligence question for counsel + them: their NFL data is derived from
  broadcast/All-22 footage — confirm THEIR license to produce and resell it
  covers our downstream commercial use (get it in the contract as an
  indemnity clause).

### 2. Sports Info Solutions (SIS) DataHub — the buy-it-TODAY layer [VERIFIED]
Not 10Hz, but the richest charting data legally purchasable this week:
route classifications, coverage schemes, pressures, alignment. DataHub Pro
is **$99.99/mo or $749.99/yr self-serve right now**; API + enterprise
licensing via sales@sportsinfosolutions.com. This feeds the same signal
families (separation proxies, scheme tendencies) months before any tracking
contract closes.

### 3. PFF b2b (via Teamworks) — enterprise charting [VERIFIED vendor]
PFF Ultimate-class feeds: participation, grades, alignment, charting.
Enterprise pricing (five figures+). b2b.pff.com/data. Worth a parallel
quote; SkillCorner already keys to PFF IDs, so the two compose.

### 4. Genius Sports — the official raw NGS feed [VERIFIED; MOONSHOT]
The NFL extended Genius's **exclusive** distribution of official data + NGS
through the **2029 season** (announced June 2025; prior deal was
$120M/6yr). This is the true Zebra-chip 10Hz feed. It is the endgame
license when revenue justifies a six-to-seven-figure conversation.
geniussports.com — but do not lead with this; lead with SkillCorner.

### 5. Big Data Bowl / Kaggle — [BLOCKED, harder than we thought]
2026 terms verified tonight: no license granted, strictly confidential, no
redistribution, and entrants **must destroy the NGS data after the
contest**. That kills not just shipping on it but even quiet R&D retention.
The compliance ruling in the project docs stands, now with teeth.

### 6. DIY computer vision on NFL+/broadcast streams — [BLOCKED without counsel]
Facts aren't copyrightable (Feist), but NFL+ terms prohibit automated
extraction, and this is the most litigated corner of sports data. Buying
SkillCorner's output (their legal risk, their indemnity) dominates building
our own extractor in every dimension: cost, time, and lawsuit surface.

### 7. The synthetic/physics-informed engine — [PROPOSED, already chosen]
The project's existing answer: generate physics-plausible trajectories
calibrated to legal aggregates (nflverse NGS, now flowing via the rescued
cron branch). A real SkillCorner feed would become its CALIBRATION set —
these two paths compound, they don't compete.

## The schema and how it maps into what we already built

Industry-standard tracking schema (NGS/BDB convention; SkillCorner's is the
same shape):

| field | meaning |
|---|---|
| gameId, playId | GSIS identifiers (nflverse carries the same GSIS ids -> free join) |
| nflId / gsis player id | player (nflverse rosters crosswalk gsis_id <-> our Player rows) |
| frameId, time | 10Hz clock within the play |
| x, y | field position, 0-120 yds x 0-53.3 yds |
| s, a | speed (yd/s), acceleration (yd/s^2) |
| o, dir | body orientation vs motion direction (degrees) |
| event | frame tags: snap, pass_forward, pass_arrived, tackle... |

**Join strategy:** SkillCorner ships PFF + GSIS IDs -> nflverse's ID
crosswalk (already in our ingestion universe) maps GSIS -> our Player/Game
rows. No fuzzy matching needed. This is why vendor choice #1 is such a fit.

**Storage discipline (do NOT put raw frames in Postgres):** a season is
roughly 50M+ player-frames. Raw frames land as per-play Parquet in object
storage (R2/S3). Postgres gets only DERIVED per-play features, exactly like
the NextGenStat table pattern the rescued branch establishes.

**Feature derivation -> the geometric modules that already exist in the
codebase's design language:**
- Separation Index: min receiver-defender distance at pass_arrived frames
- Pursuit efficiency / closing speed: defender (s, dir) vs ball-carrier path
- PAL (proper acceleration load): integrate |a| per player per play
- Ghost Defender: counterfactual defender position model (needs the raw
  frames; first real use of the Parquet lake)
- Motor/ScLERP pose interpolation: (x, y, o, dir) time series is exactly
  the input those modules were designed for
- Get-off time, route curvature: direct from frames + event tags

**Pipeline shape (one focused build once a feed exists):**
vendor API -> workers/ intake (rate-limited, source-registry gated like
nflverse) -> Parquet lake -> feature jobs -> Postgres feature tables ->
prediction-engine consumes features (never raw frames) -> Reality Ladder:
every derived feature ships [SHADOW] until the edge-lab harness proves it.

## The move order
1. TODAY (owner, ~10 min): SkillCorner demo request + SIS sales email.
   Parallel quotes; name the use case honestly ("consumer analytics
   product, non-team").
2. THIS WEEK: SIS DataHub Pro self-serve ($99.99/mo) if the eval looks
   good — charting signals start flowing while tracking negotiates.
3. ON CONTRACT: the pipeline build above (one session), features shadow-run
   through edge-lab before anything touches the public engine.
4. AT REVENUE: revisit Genius for official NGS (2029 exclusivity horizon).
