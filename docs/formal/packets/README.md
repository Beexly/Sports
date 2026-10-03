# Weekly Gravity Packets

Each `week-YYYYWW.json` file is a snapshot produced by
`scripts/growth/weekly-gravity-packet.ts`, assembled from whatever real data
sources exist on the branch at the time it was run.

## Honest caveat: several fields are placeholders

The following inputs have no real data source wired up yet. Until they do,
the script stubs them with conservative defaults (usually 0 / false) rather
than fabricating numbers:

- `sdkStars` (moat-score input) — no SDK-stars data source wired yet.
- `labeledShadowN` (moat-score input) — no labeled-shadow counter wired yet.
- `uniqueReceiptVerifies7d` / `receiptsSigned7d` — no live receipt-verify
  telemetry wired yet.
- `distinctSurfacesGoverned` (moat-score input) — no governed-surface
  registry wired yet.
- `mrrCents` — no billing data source wired yet.
- `stressTestPass` — no stress-test runner wired yet.

`cutoffNStar` is real *only* when `formal/receipts/cutoff-matrix/summary.txt`
exists on the branch (it currently lives on a separate, not-yet-merged formal
branch); otherwise it defaults to 0 and is not real.

`moatScore` is a LEAD-TIME indicator, not a claim of permanent or defensible
uniqueness — see the doc comment on `apps/web/lib/growth/moat-score.ts`.

## CI lint (owner opt-in only)

`isPacketMissingForWeek` (exported from
`scripts/growth/weekly-gravity-packet.ts`) can be called by a future CI job
to fail a build if a week's packet is missing. This is NOT wired into any CI
workflow by default — it is owner opt-in via `REQUIRE_GRAVITY_PACKET=1`.
