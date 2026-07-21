# Kalshi: Regulated Prediction Market Data for CLV Grading

> Source: `packages/data-ingestion/src/kalshi-client.ts` (already written, zero new code)
> Purpose: Pull de-vigged fair-value probabilities from Kalshi's regulated US prediction market — the sharpest market-implied win probabilities available — for closing line value (CLV) grading

## What This Solves

CLV (closing line value) is the gold standard for evaluating pick quality. A pick beats the closing line only if it was made at better odds than the market settled at. But "closing line" requires a sharp market reference — sportsbook lines are vigged and move on public action, not just information.

Kalshi is a CFTC-regulated prediction market. Its yes/no contracts on game outcomes represent true-probability bets with no house edge beyond a small fee. The resulting prices are market-implied win probabilities **de-vigged by construction** — the only regulated, public, real-money probability market for US sports.

`kalshi-client.ts` pulls these probabilities and converts them to the `IndependentMarketFairValue` type the pick engine already consumes.

## What Already Exists

```
packages/data-ingestion/src/
  kalshi-client.ts    ← KalshiClient, getFairValue, devigTwoSided, ticker format
```

No API key required. All data is from Kalshi's public read-only endpoints.

## Key Functions

### `KalshiClient.getFairValue(game)`

```typescript
const client = new KalshiClient();
const fairValue = await client.getFairValue({
  league: "NFL",
  homeTeam: "KC",   // abbreviation
  awayTeam: "LV",
  date: new Date("2025-09-07"),
});
// fairValue: KalshiFairValue | null (null if market not found or settled)
```

`KalshiFairValue`:
```typescript
{
  ticker: string;          // "KXNFLGAME-25SEP07LVKC"
  homeWinProb: number;     // de-vigged fair probability (0–1)
  awayWinProb: number;     // de-vigged fair probability (0–1)
  overround: number;       // typically 0–0.005 (0–0.5%)
  status: "active" | "open";
  fetchedAt: Date;
}
```

### `toIndependentFairValue(fairValue, homeAbbr, awayAbbr)`

Converts to the pick engine's `IndependentMarketFairValue` type for CLV grading:

```typescript
import { KalshiClient, toIndependentFairValue } from "@packages/data-ingestion/kalshi-client";

const client = new KalshiClient();
const fv = await client.getFairValue(game);
if (fv) {
  const engineFairValue = toIndependentFairValue(fv, "KC", "LV");
  // Use engineFairValue in pick grading / CLV calculation
}
```

### `devigTwoSided(rawA, rawB)`

Removes the overround from a two-sided market. Kalshi's overround is typically 0–0.5% (vs. 4–6% at sportsbooks).

```typescript
const { fairA, fairB, overround } = devigTwoSided(0.52, 0.50);
// fairA: 0.5098, fairB: 0.4902, overround: 0.02
```

## Ticker Format

`toKalshiEventTicker(game)` builds the ticker from game metadata:

```
KX{LEAGUE}GAME-{YY}{MON}{DD}{AWAY}{HOME}
```

Example: NFL game 2025-09-07, LV @ KC → `KXNFLGAME-25SEP07LVKC`

The client tries the event ticker first, then falls back to individual market search if the event is structured differently.

## Public API Endpoints Used

```
GET https://api.elections.kalshi.com/trade-api/v2/events?tickers=KXNFLGAME-...
GET https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker=...
```

No authentication headers required. Read-only. Rate-limited but generous for non-bulk use.

**What the client does NOT do:**
- No trading
- No order placement
- No authenticated endpoints
- No API key storage

## Market Status Handling

Only `active` or `open` markets are used as live data:
```typescript
// From kalshi-client.ts:
if (market.status !== "active" && market.status !== "open") {
  return null; // settled or closed prices are not fair-value indicators
}
```

A settled market (after game end) has a resolved price of 0 or 100 — not a probability. The client returns `null` rather than a meaningless number.

## Reliability

`KalshiClient` retries with exponential backoff + jitter, 15-second timeout per request:

```typescript
const KALSHI_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  jitterFactor: 0.3,
};
```

If the market doesn't exist (game not yet listed on Kalshi) or the fetch fails after retries, `getFairValue` returns `null` — callers should treat null as "no Kalshi data available" and fall back to sportsbook implied probability.

## Integration: CLV Grading

The primary use case is CLV grading at pick settlement time:

```typescript
// After a game settles:
const fv = await kalshiClient.getFairValue(game);
const closingLineRef = fv
  ? toIndependentFairValue(fv, game.homeAbbr, game.awayAbbr)
  : fallbackToSportsbook(game);

const clv = computeClv(pick.takenOdds, closingLineRef.homeWinProb);
// clv > 0 → beat the close → sharp pick
```

## Why Kalshi Over Sportsbooks for CLV

| Source | Vig | Data access | Regulatory |
|---|---|---|---|
| Sportsbook lines | 4–6% | Public but unstructured | State-by-state |
| Sharp book (e.g., Pinnacle) | 2–3% | No US public API | Not US-licensed |
| Kalshi | 0–0.5% | Public REST API | CFTC-regulated |
| Prediction market | 0% (fee) | Public | Regulated |

Kalshi prices are set by real-money participants with no house bias. They're the closest thing to "true probability" available via public API in the US.

## Status

- [x] `KalshiClient` implemented (`packages/data-ingestion/src/kalshi-client.ts`)
- [x] `getFairValue(game)` → de-vigged `KalshiFairValue`
- [x] `toIndependentFairValue` adapter to pick engine type
- [x] Public endpoints only (no API key, no trading)
- [x] Retry + jitter + timeout
- [ ] Wire `getFairValue` into pick settlement flow (CLV grading)
- [ ] Expose Kalshi fair value in Cockpit pick grading view
- [ ] Add Kalshi market availability as a data-freshness canary
- [ ] Consider Kalshi as a secondary signal in pre-game pick confidence
