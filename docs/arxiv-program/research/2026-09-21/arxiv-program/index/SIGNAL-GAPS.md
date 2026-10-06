# Signal Gap Analysis — what the 1,251 papers don't cover

**Date:** 2026-09-22. Source: `corpus-index.jsonl` signal tags, with false-positive discounting.

Garrett's directive: the engine ingests every signal on earth — on-field, off-field, officials, environment,
competitors — and invents its own proprietary outputs. These gaps are the next research targets, ranked by
how empty the territory is and how much situational edge it could carry.

## Coverage at a glance (raw → honest)

| Signal | Raw tagged | Honest estimate | Verdict |
|---|---|---|---|
| `historical_results` | 350 | ~300 | Saturated |
| `game_state` | 195 | ~180 | Strong |
| `player_tracking` | 158 | ~150 | Strong |
| `market_odds_baseline` | 158 | ~150 | Strong (BASELINE doctrine — starting point, not the goal) |
| `weather_environment` | 123 | ~100 | Adequate for outdoor-game basics |
| `news_narrative` | 83 | ~70 | Adequate |
| `player_physiological` | 75 | ~40 true physiology | Thin where it matters (see gap 5) |
| `stadium_physics` | 35 | ~5 true | **GAP** |
| `officials` | 31 | ~5 true | **GAP** |
| `competitor_intel` | 26 | ~0 true | **GAP** |
| `social_relationships` | 10 | ~2 true | **GAP** |

"Honest estimate" discounts the false-positive patterns documented in SIGNAL-TAXONOMY.md
(e.g., most `officials` tags were Twitter event detection or "official data", not referees;
most `competitor_intel` tags were generic forecasting papers, not competitor reverse-engineering).

## The top 5 gaps (next research targets)

### Gap 1 — `social_relationships` (~2 true papers)
**What's missing:** team chemistry, locker-room dynamics, QB–receiver trust, coaching relationships,
off-field events affecting cohesion. The one real paper (SMOGS: social network metrics of game success)
proves the signal exists; nobody has built the ingestion.
**Research direction:** social-network metrics from public data (interviews, social media graphs, tenure
overlap, shared agents/colleges); chemistry as a latent team effect in hierarchical models.
**Data:** public interviews/transcripts, roster tenure overlap, social graph proxies, beat-reporter sentiment.
**Builds toward:** a "cohesion factor" inside the GSE score — pure situational edge, uncopyable.

### Gap 2 — `competitor_intel` (~0 true papers)
**What's missing:** systematic ingestion of competitors' public formulas, schemes, ratings, and engines
as baseline inputs. Garrett's law: ingest them all, copy none — they set the floor our proprietary
outputs must beat.
**Research direction:** reverse-engineering public ratings (FPI, SP+, DVOA-style) from their published
outputs; scheme classification from charting data; published-projection aggregation as a baseline ensemble.
**Data:** public projections (538, FTN, FantasyPros ECR archives), open-sourced models, published methodologies.
**Builds toward:** the BASELINE ensemble — every GSE prediction ships with "here is what the best public
systems say, and here is where our proprietary model disagrees and why."

### Gap 3 — `officials` (~5 true papers)
**What's missing:** referee/umpire crew tendencies — penalty rates by crew, home-bias by official,
over/under splits by crew assignment, playoff-crew effects.
**Research direction:** crew-level penalty and total models; referee assignment as a game-context feature;
interaction of crew tendencies with dome/outdoor and primetime.
**Data:** nflverse (penalty data by official exists in play-by-play), Pro Football Reference referee pages.
**Builds toward:** a crew-adjustment layer on spreads and totals — small, real, situational points.

### Gap 4 — `stadium_physics` (~5 true papers)
**What's missing:** surface (turf vs grass, turf age), dome vs open-air physics, altitude, wind-tunnel
effects of specific stadiums, ball-flight in cold. The humidor-baseball paper is the template; football
has almost nothing.
**Research direction:** stadium-fixed-effects models on kicking, passing depth, and totals; physics-informed
features (air density from temperature/altitude) rather than raw weather dummies.
**Data:** stadium metadata + game weather merged to play-by-play; kicking splits by stadium.
**Builds toward:** proprietary kicking and deep-passing adjustments no public model bothers with.

### Gap 5 — `player_physiological` depth (sleep / nutrition / cognitive ≈ 10 papers combined)
**What's missing:** the corpus covers injury/workload (20+) but almost nothing on sleep, travel fatigue,
circadian effects of west-coast teams playing 1pm ET, nutrition, or cognitive load. Garrett named these
explicitly as ingest targets.
**Research direction:** travel-distance + timezone-shift features; rest-day differentials; back-to-back /
short-week physiology; altitude acclimatization curves.
**Data:** schedule-derived travel (no wearables needed to start), injury-report text, practice participation.
**Builds toward:** a "freshness factor" in player props and team ratings — situational, legal, public-data only.

## Secondary gaps worth a wave

- **`live_ingame` lane has 1 paper.** The corpus is pre-game heavy; in-game win probability, live calibration,
  and momentum modeling need their own research wave (pairs with the in-play calibration build in BUILD-QUEUE.md).
- **`multimodal_fusion` (12) + `sports_cv` (12):** broadcast video + tracking + text fusion is young — the
  "watch the game like a scout" lane.
- **`continual_online_learning` (13):** the self-updating engine has theory but needs a production-grade
  implementation program (concept-drift alarms live in MONITOR bucket, 219 papers — the wiring, not the math, is missing).
- **Competitor *engines* as data:** beyond published formulas — systematically benchmarking GSE against
  public pick services week over week, stored as a standing dataset (feeds the BASELINE ensemble).

## What "filled" looks like

Each gap closes when: (a) a dedicated research wave adds 15–25 full-text-read papers to the corpus,
(b) at least one ADOPT-grade paper yields a build in BUILD-QUEUE.md format with a numeric gate, and
(c) the signal flows into a named GSE score component (not a one-off notebook).
