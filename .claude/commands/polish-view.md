---
description: Elevate the design of one cockpit view/component
argument-hint: [view or component]
---
Visually elevate only: $ARGUMENTS
Refine spacing rhythm, hierarchy, alignment, and accent usage while preserving the dark command-center identity. Stay strictly in scope — touch nothing else.
Explain each change and why it raises perceived quality, then show a diff before applying.
After applying, run `npm run typecheck && npm run lint && npm run test --workspace=apps/web -- <affected test files>` (the workspace run loads apps/web/vitest.config.ts: jsdom, setup file and the `@` alias) and report the results; a change is not done until they pass.
