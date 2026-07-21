---
description: Multi-model collaborative planning — decompose complex features with parallel analysis
---

Decompose a complex feature using parallel analysis before any implementation begins.

## When to use

Use `/multi-plan` for features that:
- Touch ≥ 3 packages (e.g. `prediction-engine` + `data-ingestion` + `apps/web`)
- Require both backend design and UI decisions simultaneously
- Have unclear scope or competing implementation approaches
- Affect the subscription/billing layer or prediction scoring

For simple single-file changes, use `/plan` instead.

## Phase 1: Context retrieval

Gather complete context before analysis:

```bash
# Architecture map
find /workspace/sports -name "*.ts" -not -path "*/node_modules/*" | head -50
cat CLAUDE.md
ls packages/ apps/

# Relevant existing code
grep -r "<feature-keyword>" packages/ apps/ --include="*.ts" -l | head -20
```

Get "complete definitions and signatures" — no assumptions about interfaces.

## Phase 2: Parallel analysis (decompose by concern)

Spawn parallel analysis agents, each with a different lens:

**Backend agent** — focus on:
- Data model changes (Prisma schema)
- API route design (REST contract)
- Business logic (prediction engine impact)
- Worker/job changes (BullMQ queues)
- Performance and query plans

**Frontend agent** — focus on:
- Component structure and state management
- Subscription gate placement (server-side enforcement)
- Data fetching patterns (RSC vs. client fetch)
- Mobile responsiveness
- Design token compliance (Hallmark rules)

**Security agent** — focus on:
- Auth guard placement
- Input validation and sanitization
- Stripe idempotency
- Rate limiting
- Scraping clearance if external data involved

Each agent must reference existing codebase patterns, not invent new ones.

## Phase 3: Plan synthesis

Merge all three analyses into a single implementation plan:

```markdown
## Multi-Plan: <feature-name>

### Technical solution
<Unified approach from all three lenses>

### Affected files
| File | Change | Risk |
|---|---|---|
| packages/db/schema.prisma | Add <table> | Migration needed |
| ... | ... | ... |

### Phased implementation
Phase 1: Schema + migration (no UI)
Phase 2: API routes + server actions
Phase 3: Frontend components
Phase 4: Tests + guardrails

### Risk mitigations
- <Backend risk>: mitigated by <approach>
- <Security risk>: addressed by <check>
- <UX risk>: handled by <pattern>

### Open questions (must resolve before code)
- [ ] <Question 1>
- [ ] <Question 2>
```

Save plan to `.claude/plans/<feature-name>.md`.

## Critical constraints

- External models (if using multi-model): **zero filesystem write access** — analysis only
- Background tasks timeout at 600 seconds max
- **No automatic execution** — plan output requires explicit user "go ahead"
- Users invoke `/build-fix` or implementation commands separately
