# Prediction Engine

## Overview

The prediction engine is a deterministic, data-driven system that converts raw odds data into ranked picks with confidence scores. It is NOT an AI/LLM system — it is a statistical model.

## Scoring Algorithm

### Inputs
- Current line (spread, moneyline, total)
- Line movement (delta from open to current)
- Number of bookmakers offering the line
- Consensus direction across bookmakers
- Historical performance of model on similar games

### Confidence Score Formula

```
confidence = base_score + movement_bonus + consensus_bonus + market_depth_bonus

base_score = normalize(implied_probability, 0, 100)
movement_bonus = abs(line_movement) * movement_weight (max +15)
consensus_bonus = (consensus_pct - 0.5) * 2 * 20 (max +20, only if > 60%)
market_depth_bonus = min(bookmaker_count / 10, 1) * 10 (max +10)

Final confidence clamped to [0, 100]
```

> **UPDATE 2026-06-30:** Three corrections below, each verified against
> `packages/prediction-engine/src/constants.ts` (the source of truth for model
> version, weights, and thresholds). Historical text above is preserved.
>
> 1. **Model version.** The pick-schema comment `modelVersion // e.g. "v1.0.0"`
>    (in *Pick Object Schema* below) is **stale**. The current `MODEL_VERSION`
>    constant is **`"v5.1.0"`** (constants.ts; v5.1.0 activated isotonic
>    calibration on 2026-06-22).
>
> 2. **Confidence weights are outdated.** The formula above understates and
>    omits real components. Per `WEIGHTS` in constants.ts the actual maxima are:
>    `CONSENSUS_COMPONENT_MAX = 30` (doc said max +20),
>    `MARKET_DEPTH_COMPONENT_MAX = 20` (doc said max +10),
>    `EDGE_COMPONENT_MAX = 25`, `LINE_MOVEMENT_COMPONENT_MAX = 15`,
>    `VOLATILITY_PENALTY_MAX = -15`. The doc also omits the v4/v5 intelligence
>    terms now in `WEIGHTS`: `HEAD_TO_HEAD_COMPONENT_MAX = 5`,
>    `VENUE_FORM_COMPONENT_MAX = 5`, `UNCERTAINTY_PENALTY_MAX = -8`,
>    `CROSS_MARKET_AGREE_BONUS = 4`, `CROSS_MARKET_DISAGREE_PENALTY = -3`, and
>    `SCHEDULE_STRESS_COMPONENT_MAX = 5`. **`constants.ts` is the source of truth
>    for the weights** — read it rather than this formula sketch.
>
> 3. **Tier thresholds remain ACCURATE — do not over-correct.** The *Tier
>    Assignment* values below are still correct and match constants.ts:
>    `PREMIUM_CONFIDENCE_THRESHOLD = 70` (>= 70 → PREMIUM),
>    `MIN_PUBLISH_CONFIDENCE = 50` (50–69 → FREE, < 50 → not published). Leave
>    these as written.

### Tier Assignment
- Confidence >= 70 → PREMIUM pick
- Confidence 50–69 → FREE pick (shown, confidence hidden)
- Confidence < 50 → Not published

### Pick Types
- `SPREAD` — against the spread
- `MONEYLINE` — straight win
- `TOTAL` — over/under

## Pick Object Schema

```typescript
interface Pick {
  id: string
  gameId: string
  sport: string
  league: string
  homeTeam: string
  awayTeam: string
  commenceTime: Date
  pickType: 'SPREAD' | 'MONEYLINE' | 'TOTAL'
  selection: string         // e.g. "Chiefs -3.5" or "OVER 48.5"
  line: number
  confidence: number        // 0–100
  tier: 'FREE' | 'PREMIUM'
  reasoning: string         // data-backed explanation
  modelVersion: string      // e.g. "v1.0.0"
  ingestionRunId: string    // audit trail
  generatedAt: Date
  result?: 'WIN' | 'LOSS' | 'PUSH' | 'PENDING'
  settledAt?: Date
}
```

## Versioning

Each pick records the `modelVersion` used to generate it. When scoring logic changes:
1. Bump `MODEL_VERSION` constant in prediction engine
2. New version picks do not overwrite old version picks
3. Performance tracking is version-aware

## Historical Performance Tracking

- When game results come in (via scores API), picks are settled
- WIN/LOSS/PUSH recorded on each pick
- Performance metrics computed per: sport, league, pick type, tier, model version
- Published on public performance page (builds trust/credibility)

## Audit Trail

Every pick includes:
- `ingestionRunId` — which data fetch produced the underlying data
- `modelVersion` — which scoring model version was used  
- `generatedAt` — exact timestamp
- `createdBy` — 'system' (automated) or user ID (manual override by admin)
