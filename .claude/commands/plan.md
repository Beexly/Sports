---
description: Implementation planning before writing any code — grounded in existing codebase patterns
---

Research the codebase, draft a complete implementation plan, and WAIT for explicit approval before writing any code.

## Steps

1. **Restate requirements** — summarize what is being asked in 2–3 sentences; flag ambiguities
2. **Pattern scan** — search the codebase for conventions used in:
   - Naming (files, functions, variables)
   - Error handling (`AppError`, `SafeActionError`, etc.)
   - Data access (Prisma patterns, transaction usage)
   - Auth guards (`requireSubscription`, `getServerSession`, server actions)
   - Testing (vitest, supertest patterns)
   - Logging and observability
3. **Risk identification** — list what could break, schema changes needed, external deps affected
4. **Phased plan** — break into ordered phases (≤5 tasks each); each task must be verifiable
5. **Files to change** — list every file that will be created or modified with a one-line description
6. **Validation checklist** — how to prove each phase is done (test IDs, type checks, API calls)

## Output format

```
## Plan: <feature-name>

### Summary
<2–3 sentence restatement>

### Patterns used from codebase
- ...

### Risks
- ...

### Phases
**Phase 1: <name>**
- [ ] Task 1 — <file>: what changes
- [ ] Task 2 — ...

### Validation
- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- <relevant-suite>` passes
- [ ] ...
```

## Critical constraint

**DO NOT write any code until the user explicitly confirms the plan** with "yes", "go", "proceed", or similar. Output the plan only.

## Input modes

- No argument → ask for clarification
- Free-form text → produce plan inline
- `.prd.md` file path → read it, pick a milestone, write plan to `.claude/plans/<name>.plan.md`
