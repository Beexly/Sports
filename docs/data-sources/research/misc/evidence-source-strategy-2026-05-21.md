# Evidence Source Strategy — 2026-05-21

Purpose: decide what data sources can safely power the next Galaxy Sports Edge intelligence layer without breaking the evidence rules.

## Research Notes

Reviewed current provider surfaces:

- The Odds API: live odds endpoint, core markets, paid quota, historical odds/player-prop/business-tier notes, and explicit API-key/header behavior.
  Source: https://theoddsapi.com/
- Sportradar Sports Data API: broad official/commercial coverage across sports, events, real-time stats, odds, and verified feeds.
  Source: https://docs.sportradar.com/sports-data-api
- SportsDataIO: sports data, injuries, lineups/depth charts, standings, betting data, historical odds, ID mapping, widgets, and league-specific APIs.
  Source: https://sportsdata.io/
- Open-Meteo: forecast and archived forecast APIs with coordinates, hourly variables, multiple weather models, and historical forecast runs.
  Source: https://open-meteo.com/en/docs

## Architecture Decision

Do not add player/ref/venue/pace factors directly to confidence yet.

Add them to the Evidence Readiness Matrix first:

1. SourceSnapshot proves a provider response existed.
2. Normalization produces an EvidenceRecord / GameSignal.
3. Evidence Readiness Matrix decides whether each factor is ACTIVE, SHADOW_READY, SHADOW_COLLECTING, BLOCKED, or ABSENT.
4. Scoring reads only ACTIVE factors that are explicitly allowed to contribute.
5. True EV remains blocked until independent fair probability is source-backed and separately promoted.

## Provider Fit

### Market Odds

Start here because the paid key is already present and deploy-readiness confirms the plan has 20,000 requests remaining.

Use:

- live odds
- scores / settlement
- historical odds only if the current plan includes it

Risks:

- quota exhaustion inside 2 weeks
- stale line movement if opening/current prices are not preserved
- false "edge" if market-derived fair price gets mistaken for independent probability

### Player Availability

Use only official/licensed injury, lineup, and depth-chart feeds.

Candidate source class:

- SportsDataIO or Sportradar

Risks:

- late scratches
- inconsistent team phrasing ("questionable" vs "game-time decision")
- player ID mapping drift across providers

Matrix posture:

- SHADOW_ONLY until enough settled outcome history proves incremental calibration value.

### Officials / Referees

Use only licensed assignment and historical same-sport trend feeds.

Candidate source class:

- Sportradar if coverage includes official assignment for the league
- league official sources if terms permit

Risks:

- small samples
- playoff/prime-time assignment bias
- crew composition changes

Matrix posture:

- SHADOW_ONLY with high min sample size.

### Venue Environment

Use venue coordinates plus game-time weather/roof/surface state.

Candidate source class:

- Open-Meteo for weather where outdoor conditions matter
- licensed schedule/venue metadata for roof/surface/park state

Risks:

- roof decisions
- wind shifts near first pitch/kickoff
- incorrectly geocoded stadiums

Matrix posture:

- weather can be useful quickly, but it must age out aggressively.

### Pace / Team Rates

Use league/team stat feeds, not LLM summaries.

Candidate source class:

- SportsDataIO, Sportradar, or league APIs where legally allowed

Risks:

- early-season samples
- injuries changing tempo
- garbage-time distortion

Matrix posture:

- SHADOW_ONLY until bucket-level Brier improvement is measured.

## What Changed In Code

Added:

- `packages/prediction-engine/src/evidence-readiness-matrix.ts`
- `packages/prediction-engine/src/__tests__/evidence-readiness-matrix.test.ts`

The matrix has executable definitions for:

- market board
- line movement
- rest state
- schedule density
- pace profile
- division context
- player availability
- officials
- venue environment
- venue history
- milestone context
- independent fair probability
- true EV

Each factor carries:

- source categories
- minimum trust
- minimum sample size
- freshness window
- scoring eligibility
- activation requirement
- failure horizon
- likely failure mode

This is intentionally boring infrastructure. It is the layer that lets the product become aggressive later without becoming sloppy now.
