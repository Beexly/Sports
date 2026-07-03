# Command Log

Commands from the first-level FABLE implementation:

```bash
npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts
```

Result: passed, 7 files / 18 tests.

```bash
npm run test --workspace=packages/prediction-engine
```

Result: passed, 71 files / 738 tests.

```bash
npm run test --workspace=packages/data-ingestion
```

Result: passed, 16 files / 131 tests.

```bash
npm run typecheck --workspaces --if-present
```

Result: failed in `@sports/web` because imported prediction-engine BigInt literal files require an ES2020-or-newer target.

```bash
npm run guard:secrets
npm run guard:trust
```

Result: passed after staging the first-level files.

Second-level commands:

```bash
npm run fable:evidence
```

Result: passed, aggregate evidence harness returned `[fable-evidence] OK - all`.

```bash
npm run fable:claims
```

Result: passed, claim ledger and FABLE claim scanner returned `[fable-evidence] OK - claims`.

```bash
npm run fable:sources
```

Result: passed, source-rights adapter validation returned `[fable-evidence] OK - sources`.

```bash
npm run fable:aws-gates
```

Result: passed, AWS gate validation returned `[fable-evidence] OK - aws-gates`.

```bash
npm run fable:demo
```

Result: passed, fixture-only forensic report emitted `fixture-nfl-public-001` with `probability_delta` of `0.11` and explicit `would_not_claim` caveats.

```bash
npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts lib/fable/docs-claims.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts
```

Result: passed, 4 files / 11 tests.

```bash
npm run guard:trust
```

Result: passed after encoding scanner detection literals: scanned 1102 files; no banned phrases.

```bash
npm run guard:secrets
```

Result: passed after staging the second-level files: scanned 3051 tracked files; no secrets detected.

```bash
git diff --check
```

Result: passed, no whitespace errors.

```bash
gh auth status
```

Result: failed because GitHub CLI is not logged into any host. GitHub issue and PR bodies remain copy-paste-ready local artifacts.

Third-pass commands:

```bash
npm run fable:evidence
npm run fable:claims
npm run fable:sources
npm run fable:aws-gates
npm run fable:demo
```

Result: all passed. Demo emitted `fixture-nfl-public-001` with `probability_delta` of `0.11`.

```bash
npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/aws-decision-engine.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts lib/fable/evidence/evidence-harness.test.ts
```

Result: passed, 9 files / 33 tests.

```bash
npm run test --workspace=packages/prediction-engine
npm run test --workspace=packages/data-ingestion
npm run typecheck --workspaces --if-present
npm run guard:secrets
npm run guard:trust
git diff --check
```

Result: passed. Prediction-engine: 71 files / 738 tests. Data-ingestion: 16 files / 131 tests. Secret guard scanned 3051 tracked files. Trust guard scanned 1103 files.

```bash
actionlint .github/workflows/fable-evidence.yml
```

Result: not run; `actionlint` is unavailable on this host. Workflow YAML was manually inspected.

Final report-refresh commands:

```bash
npm run fable:evidence
npm run fable:claims
```

Result: both passed after refreshing `CODEX_FINAL_REPORT.md`, `AWS_FINAL_REPORT.md`, and Claude handoff docs.

```bash
npm run guard:secrets
```

Result: passed after final staging; scanned 3063 tracked files and found no secrets.

```powershell
$files = @('apps/web/lib/fable/aws-decision-engine.ts','apps/web/lib/fable/aws-decision-engine.test.ts','apps/web/lib/fable/evidence/schemas.ts','apps/web/lib/fable/evidence/validators.ts','apps/web/lib/fable/evidence/evidence-harness.test.ts','scripts/fable-evidence.ts'); foreach ($file in $files) { $count = (Get-Content $file | Where-Object { $_.Trim() -ne '' -and -not $_.TrimStart().StartsWith('//') } | Measure-Object -Line).Lines; "$file`t$count" }
```

Result: `aws-decision-engine.ts` measured 202 effective lines; all other measured TypeScript files were below 140 effective lines.

Final staged verification:

```bash
npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/aws-decision-engine.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts lib/fable/evidence/evidence-harness.test.ts
```

Result: passed, 9 files / 33 tests.

```bash
npm run fable:aws-gates
```

Result: passed, AWS gate validation returned `[fable-evidence] OK - aws-gates`.

```bash
npm run typecheck --workspaces --if-present
```

Result: passed.
