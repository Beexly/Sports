---
description: Quality pass on a single file/module
argument-hint: [file or module]
---
Polish only: $ARGUMENTS
Improve naming, remove dead code, tighten structure, and clarify comments. Stay strictly within the named file/module — touch nothing else. Preserve behavior. Show a diff before applying.
After applying, run `npm run typecheck && npm run lint && npx vitest run <affected test files>` and report the results; a change is not done until they pass.
