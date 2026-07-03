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
