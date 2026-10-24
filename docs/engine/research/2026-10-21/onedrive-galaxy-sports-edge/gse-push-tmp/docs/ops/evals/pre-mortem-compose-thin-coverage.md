---
surface: pre-mortem-pipeline
template: composer
scenario: thin-coverage-warning
created: 2026-05-22
created_by: claude
status: pending-runner
---

# Input

A canonical published pick where most factor scores are low enough to NOT trigger their respective templates:

PickSignalSnapshot.factors:
```
consensus: 0.48
depth: 0.52
edge: 1.8
lineMovement: 0.34
volatility: 0.12
headToHead: 0.05
venueForm: 0.58
scheduleStress: 0.55
restAdvantage: 0.81    ← only this is high
crossMarket: 0.32
dataQuality: 0.60      ← borderline
```

Pick: NYK -1 moneyline. Model version v6.0.4.
Game: BOS @ NYK, NBA.

# Expected behavior

The composer iterates the 9 failure-mode templates:

- consensus (0.48 < 0.6) → does NOT fire.
- depth (0.52 < 0.55) → does NOT fire.
- lineMovement (0.34 < 0.4) → does NOT fire.
- volatility (0.12 < 0.5) → does NOT fire.
- venueForm (0.58 < 0.6) → does NOT fire.
- scheduleStress (0.55 < 0.6) → does NOT fire.
- restAdvantage (0.81 > 0.65) → fires.
- crossMarket (0.32 < 0.45) → does NOT fire.
- dataQuality (0.60 is in [0.5, 0.85] range) → fires.

Only 2 bullets fire. After sort: restAdvantage (rank 1), dataQuality (rank 6).

The composer returns:

```ts
{
  bullets: [
    { factorKey: 'restAdvantage', severityRank: 1, text: '...' },
    { factorKey: 'dataQuality',   severityRank: 6, text: '...' },
  ],
  warning: null,  // 2 bullets meets MIN_BULLETS_FOR_HEALTHY threshold
  modelVersion: 'v6.0.4',
  generatedAt: '<ISO>',
}
```

`warning` is null because 2 bullets is the minimum threshold (`MIN_BULLETS_FOR_HEALTHY = 2`).

# Edge case — only 1 bullet fires

If the scenario were tuned so only restAdvantage fires (e.g., dataQuality = 0.95 ceiling, all others below thresholds), the composer returns:

```ts
{
  bullets: [
    { factorKey: 'restAdvantage', severityRank: 1, text: '...' },
  ],
  warning: 'Pre-mortem coverage thin — only 1 factor above contribution threshold.',
  modelVersion: 'v6.0.4',
  generatedAt: '<ISO>',
}
```

Both scenarios should be exercised in the test.

# Forbidden behavior

- Composer MUST NOT pad bullets to reach MIN_BULLETS_FOR_HEALTHY. If only 1 fires, output is 1 bullet + warning.
- Composer MUST NOT change trigger thresholds to "find" more bullets.
- Composer MUST NOT mutate the input.
- Composer MUST NOT fabricate factor scores not present in the snapshot.

# Pass criteria

For the 2-bullet scenario:

1. `output.bullets.length === 2`.
2. `output.bullets[0].factorKey === 'restAdvantage'`.
3. `output.bullets[1].factorKey === 'dataQuality'`.
4. `output.warning === null`.

For the 1-bullet edge case:

5. `output.bullets.length === 1`.
6. `output.warning === 'Pre-mortem coverage thin — only 1 factor above contribution threshold.'`.

For both:

7. Surfaces consuming the output (cockpit, Game Room) render correctly even with the warning populated.
8. Compliance scanner on the bullet text returns `status: 'green'`.

This eval verifies that the composer commits to its output rather than hedging — if coverage is thin, the surface acknowledges it explicitly via the warning field.
