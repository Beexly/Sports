# Intelligence Graph — Test Fixtures

Fixtures backing `docs/product/intelligence-graph-spec.md`. Codex's typed-primitives module is tested against these.

Each fixture is a self-contained example of an input → expected `GameIntelligenceNode` (or `SlateWeather`) output. The fixture format is documented inline in each file.

## Files

| File | Scenario |
|---|---|
| `happy-path-canonical.ts` | A normal NBA game with 12 books reporting, evidence health A, published pick at 73% confidence. |
| `bootstrap-game.ts` | A game with only 2 books reporting, no `PickSignalSnapshot`, scored but pre-publish-threshold. |
| `gated-game.ts` | A game evaluated and gated for thin consensus. Edge Index below threshold. |
| `settled-loss-with-autopsy.ts` | A pick that settled as L, with a `LossAutopsy` row attached. Tests Galaxy Memory composition. |
| `slate-weather-notable.ts` | A daily slate with notable conditions (outdoor weather flag, schedule cluster). |

## Format

Each fixture exports a single object:

```ts
import type { GameNodeInput, GameIntelligenceNode } from "@/lib/intelligence-graph/types";

export const fixtureName = {
  scenario: "human-readable description",
  input: {
    game: { /* Prisma Game shape */ },
    picks: [ /* Pick[] */ ],
    pickSignalSnapshots: [ /* PickSignalSnapshot[] */ ],
    gameSignals: [ /* GameSignal[] */ ],
    sourceSnapshots: [ /* SourceSnapshot[] */ ],
    ingestionRuns: [ /* IngestionRun[] */ ],
    lossAutopsies: [ /* LossAutopsy[] | undefined */ ],
  } satisfies GameNodeInput,
  expected: { /* Expected GameIntelligenceNode after composition */ },
};
```

The `expected` shape lets Codex's tests assert against a known-good composition output.

## Conventions

- Dates are ISO strings with explicit timezone (`+00:00` suffix).
- Numeric scores are exact decimals — no floating-point comparisons in tests, use precision checks.
- Team IDs are short codes for readability (`BOS`, `NYY`, `LAL`).
- Game IDs follow the pattern `<sport>-<away>-<home>-<yyyy-mm-dd>`.
- Use realistic-looking but obviously-synthetic data. No real future games. Avoid implying actual lines or actual outcomes.

## Adding new fixtures

When the graph spec evolves, add a new fixture file rather than modifying an existing one. Existing fixtures freeze the contract at the time they were written.

If a fixture needs to be deprecated (the underlying scenario changes shape), mark it with a `@deprecated` JSDoc comment but leave the file. Codex's test runner can skip deprecated fixtures.
