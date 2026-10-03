---
description: Lint + typecheck, fix mechanical only
---
Run lint and typecheck. Auto-fix mechanical issues (formatting, imports, simple lint rules). For anything that changes logic or types, list it for review instead of fixing. Report what was fixed vs deferred.
After applying, run `npm run typecheck && npm run lint && npx vitest run <affected test files>` and report the results; a change is not done until they pass.
