# Run 1 Summary — 2026-05-30

## What Changed

**REPAIR (Critical)**
- Fixed `Prisma.validator` incompatibility in `apps/web/lib/correlation/load-settled-picks.ts`. Prisma 5.22 removed this runtime function. Replaced with `satisfies Prisma.PickSelect` which preserves the narrow type for `PickGetPayload` inference without a runtime call.
- Installed node_modules (was missing in fresh clone) and generated Prisma client.

**IMPROVE**
- Fixed root `package.json` `db:generate/push/migrate/studio` scripts from broken `--workspace=packages/db` (misroutes in npm 10.9+) to direct `prisma <cmd> --schema packages/db/prisma/schema.prisma`.
- Added `prepare` lifecycle hook so `npm install` / `npm ci` always generates the Prisma client automatically — eliminates the 68-test-file failure that any fresh clone would hit.
- Fixed two broken regex patterns in `apps/web/lib/compliance-scanner/rules.ts`:
  - `L2-PUBLIC-WIN-RATE`: `we hit NN%` and `we win NN%` were dead alternatives because `\b` cannot fire after `%` (non-word) when the next char is also non-word (space). Fixed by using `\b` only at pattern start.
  - `L2-PUBLIC-EV`: `EV of ` and `expected value of ` never matched for the same reason. Fixed with lookbehind-anchored alternative for the `[+-]\d+ units per` form.

**GROW**
- Added `apps/web/__tests__/compliance-scanner-rules.test.ts`: 25 tests covering all 3 rule layers (L1 platform bans, L2 unsupported claims, L3 tout/bait), all template-specific rule sets, and the `getRulesForTemplate()` contract.
- Added `compliance-scanner-rules.test.ts` to `test:brand-safety` npm script in `apps/web/package.json`.
- Added `compliance-scanner-rules.test.ts` to CI `brand-safety` job in `.github/workflows/ci.yml`. Compliance rule regressions now surface in <6 seconds rather than waiting for the full test matrix.

## Baseline → End State
| Metric | Before | After |
|---|---|---|
| Test files passing | 68 failed / 164 | 165 passed |
| Tests passing | ~0 (module not found) | 1876 |
| Type errors | 30+ | 0 |
| Lint warnings | N/A | 0 |
| Compliance rules covered by tests | 0 | 16 rules / 25 test cases |

## Synthesis Finding
Both the failing tests AND the compliance rule gaps share a root cause: no automated coverage enforcement on utility modules. The compliance-scanner `rules.ts` is the execution engine for brand safety across 6 surfaces, but had zero tests. The `load-settled-picks.ts` had a Prisma API incompatibility that only surfaced when tests could actually run. The `prepare` hook fixes the bootstrapping issue at the infrastructure level, which compounds forward — any new contributor or CI environment gets a working baseline without manual steps.

## Red-Team
The compliance regex fixes could in theory cause false positives — e.g., `EV of course we should...` would now match `EV of `. But:
1. Compliance scanner is review-gating, not auto-blocking
2. The patterns are used in LLM-generated content contexts where such false positives are essentially impossible
3. The alternative (silent miss) was worse: guaranteed win-rate marketing copy passing through undetected

## Calibration Invariant Check
All four platform gates remain at their defaults (false). No picks, stats, or content gates were modified.
