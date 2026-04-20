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
