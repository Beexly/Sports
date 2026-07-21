---
description: Run the full GSN verification suite — types, lint, guardrails, and tests
---

Execute the complete quality gate. All checks must pass before any merge or deploy.

## Sequence

Run in this exact order (stop on first failure, fix before continuing):

### 1. Type check
```bash
npm run typecheck
```
Expected: exit 0, no errors

### 2. Lint
```bash
npm run lint
```
Expected: exit 0, no warnings if `--max-warnings 0` configured

### 3. Guardrails (17 scripts)
```bash
cd /workspace/sports && node scripts/guardrails/run-all.js
```
Expected: all 17 pass

### 4. Full test suite
```bash
npm run test
```
Expected: all tests pass (baseline: 10,281 tests across 807 files)

### 5. Build check (optional, slow)
```bash
npm run build
```
Expected: exit 0, no build errors

## On failure

For each failure:
1. Note the exact error message and file:line
2. Run `/build-fix` for type/build errors
3. Run `/lint` for lint errors
4. Run `/test-gaps` to identify missing test coverage
5. Fix, re-run only the failing check, confirm, then continue sequence

## Gate status output

Report as:
```
Quality Gate: [PASS/FAIL]
  ✓/✗ typecheck
  ✓/✗ lint
  ✓/✗ guardrails (17/17)
  ✓/✗ tests (N/N passing)
  ✓/✗ build
```

## GSN non-negotiables

A PR is NOT ready to merge if:
- Any test references fake/mocked sports data as "real"
- Any subscription check exists only on the frontend
- Any secret is hardcoded (even in test files)
- `npm run typecheck` exits non-zero
- Guardrail `check-no-hardcoded-secrets` fails
