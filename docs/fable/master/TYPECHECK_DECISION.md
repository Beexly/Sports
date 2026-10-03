# Typecheck Decision

Updated: 2026-07-03

Command under review:

```bash
npm run typecheck --workspaces --if-present
```

Observed blocker before this pass:

- `@sports/web` failed because it imports `@sports/prediction-engine` source files that use BigInt literal syntax.
- Failure files included:
  - `packages/prediction-engine/src/pedersen-ledger.ts`
  - `packages/prediction-engine/src/simhash.ts`
- `apps/web/tsconfig.json` targeted `ES2017`.
- `tsconfig.base.json` already targets `ES2022`.
- `packages/prediction-engine/tsconfig.json` inherits the base target.
- Root `package.json` requires Node `>=20.0.0`.

Decision:

- Option A, safe fix.
- Raise only `apps/web` TypeScript target from `ES2017` to `ES2020`.

Reason:

- BigInt literal syntax requires ES2020 or newer.
- The package that owns the BigInt code already inherits ES2022.
- The runtime floor is Node 20.
- This does not silence typecheck and does not use `skipLibCheck` as a hiding mechanism.

Risk:

- Browser output target changes for the web app typechecker/transpilation assumptions.
- Next.js/SWC still controls final app compilation, so this is expected to be low-risk but must be verified by typecheck and focused tests.

Verification to record:

- rerun `npm run typecheck --workspaces --if-present`
- rerun FABLE focused tests
- rerun prediction-engine tests

Verification update:

- `npm exec --workspace=apps/web -- tsc --showConfig` reported effective `target: es2020`.
- The first full rerun still emitted the same BigInt errors because generated incremental cache files were stale:
  - `apps/web/tsconfig.tsbuildinfo`
  - `apps/web/.next/cache/.tsbuildinfo`
- Both files were untracked/generated and removed.
- `npm run typecheck --workspace=apps/web` then passed.

Final result:

- `npm run typecheck --workspaces --if-present` passed after the ES2020 target change and generated cache removal.
