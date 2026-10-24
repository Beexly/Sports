# Exact wiring for factor-narrative (do this now)

Import at top of scoring.ts:

```ts
import { factorNarrative, factorHeadline } from "./engine/factor-narrative.js";
```

In each of the three functions, AFTER the factors array is complete and BEFORE the reasoning assignment:

```ts
const trail = factorNarrative(factors);
const headline = factorHeadline(factors);
```

## Spread (non-ladder branch)

Replace the Edge line so the trail is between Edge and contextNote:

```ts
`Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
trail +
contextNote +
```

reasoningShort prefers headline:

```ts
const reasoningShort = headline
  ? `${headline}.` + firstContextClause
  : `${consensusClause}` + firstContextClause;
```

## Total

```ts
`Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
trail +
movementNote +
```

```ts
const reasoningShort = headline
  ? `${headline}.`
  : `${Math.round(consensusPct * 100)}% of bookmakers favor ${direction} ${totalDisplay}.`;
```

## Moneyline

```ts
`Edge: ${rawEdge > 0 ? "+" : ""}${Math.round(rawEdge * 100 * 10) / 10}%.` +
trail +
contextNote +
```

```ts
const reasoningShort = headline
  ? `${headline}.` + (contextClauses.length > 0 ? ` ${contextClauses[0]!.charAt(0).toUpperCase() + contextClauses[0]!.slice(1)} noted.` : "")
  : `${chosenTeam} implied at ${Math.round(fairProb * 100)}% across ${h2hOdds.length} books.` + ...;
```

After wiring, run the factor-narrative tests and the prose smoke suite. New cards carry the argument. Existing rows keep old text until regenerated.

Shadow population (availability, venue) is the next measured cycle. No more idle modules.
