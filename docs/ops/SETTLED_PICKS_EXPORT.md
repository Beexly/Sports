# Settled picks export (calibration / ranker labels)

**No foundation training code in-repo.** Export only when you need offline calibration.

## Intent
Rows of settled picks with features + outcome for lightweight ranker/calibration experiments.

## Sketch (operator runs with real DATABASE_URL)
```sql
-- Illustrative; adjust to live Prisma schema field names before running.
SELECT
  p.id,
  p."sportKey",
  p."pickType",
  p.line,
  p.confidence,
  p."modelVersion",
  p.result,
  p."settledAt",
  g."startTime"
FROM picks p
JOIN games g ON g.id = p."gameId"
WHERE p.result IS NOT NULL
  AND p."settledAt" IS NOT NULL
ORDER BY p."settledAt" DESC
LIMIT 5000;
```

Export CSV → offline notebook. Do not train foundation models on this path.
