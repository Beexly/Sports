# StatKing Typecheck and Dev Status

| Command | Result | StatKing-related? | Status |
| --- | --- | --- | --- |
| `npm run typecheck --workspace=apps/web` | Fails on pre-existing Prisma/generated-type drift and implicit-any errors outside StatKing | false | Warning |
| `npm run dev --workspace=apps/web` | Starts Next dev and compiles instrumentation | false | Pass |
| `npm run statking:all` | Pass | true | Pass |
| `npm run test:statking` | Pass | true | Pass |

## Next action
Regenerate Prisma/client types and clean repo-wide implicit-any debt in a separate branch; StatKing product-depth files are covered by focused tests.
