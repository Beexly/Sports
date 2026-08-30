# GSE Overnight Run — Gate-Decision Packet

**Branch:** `claude/gse-overnight-audit` @ `bde90e88` (72 ahead of prod `cbb52634`) · green · UNPUSHED. Companion to `overnight-audit-report.md`.

Every item below is real and valuable but sits OUTSIDE the autonomous envelope — it needs the owner. Nothing here was auto-applied. Authorize with the exact phrase.

| # | Decision | Why it's gated | Blast radius | Exact authorize phrase |
|---|---|---|---|---|
| 1 | **Open a review PR / merge the branch** | merge to `main` on the deploy clone is a production deploy | ⚠️ HIGH — production. Review the diff first. | (owner's call — review `git log cbb52634..HEAD`, then decide) |
| 2 | **Subscriptions doc price/env fix** | stale customer-facing price copy ($19/$49 → canonical $14.99/$24.99) is money-sensitive | low (docs) but money-facing | `Update subscriptions-and-paywall.md to the per-interval Stripe env-var names and correct the displayed prices to the canonical founding ladder ($14.99/$24.99).` |
| 3 | **Export `isStubDbUrl` + boundary test** | source edit to packages/db (no-source-edit rule) | low — additive test | `Export isStubDbUrl from packages/db/src/index.ts and add a pure unit test for its boundary table.` |
| 4 | **Extract `gradeAtsCover()` + ATS test** | source refactor of context-enrichment.ts | low-med — behavior-preserving refactor | `Extract gradeAtsCover() from settleGameLogs in context-enrichment.ts and add a pure ATS cover-margin unit test.` |
| 5 | **Add `selectGradingLine()` + clvLockLine test** | source edit to a settlement-integrity file | low-med | `Add the exported selectGradingLine() helper to settlement.ts and a unit test for the clvLockLine no-drift rule.` |
| 6 | **Resolve dead `PRIORITY_BOOKMAKERS` export** | no-autonomous-deletion; delete OR wire | low | `Either delete the dead PRIORITY_BOOKMAKERS export or wire it into odds-api-client to prefer those books.` |
| 7 | **npm dependency / vuln upgrades** | 13 vulns (1 crit / 6 high); dep bumps can break the build | med — requires install + full re-validate | `Approve the listed npm dependency upgrades (name the package@version) and run install + full build/typecheck/test before commit.` |

## Engine observation (not a gate — an FYI for the owner)
`computeGameContext` with EMPTY input returns `dataQualityScore === 30` (not 0): absent `dataFreshnessMinutes` defaults to 0 → full freshness points, so "no data" scores as "maximally fresh." A test pins the real value honestly; whether to change the semantic (no-data → low quality) is a deliberate engine-behavior decision for the owner.

## Hard line that held all night
No push/merge/deploy · no schema/migration · no env/secret · no Stripe/money · no gate flips (canPublishProjections / canExposePublicPicks / canExposePerformanceStats / canPublishContent / learning / calibration) · no performance/win-rate claims · no fake data · no Lumera/XXX · `beatsNaive=false` preserved.
