---
description: Extract reusable patterns from current session into a skill file
---

Review the current session and save valuable patterns as reusable skills.

## What to extract

Look for patterns in these categories:

1. **Error resolution** — what broke, root cause, reproducible fix
2. **Debugging techniques** — non-obvious diagnostic approaches, tool combinations that worked
3. **Workarounds** — library quirks, API constraints, GSN-specific gotchas
4. **Codebase patterns** — conventions, architectural decisions, integration methods discovered

## What NOT to extract

- Trivial fixes (typos, missing semicolons)
- One-off hacks not applicable elsewhere
- Fixes that are actually bugs to be cleaned up

## Output format

Save to `.claude/skills/learned/<kebab-name>-<YYYY-MM-DD>.md`:

```markdown
# <Pattern Name>

**Extracted:** <date>
**Context:** <when this applies>

## Problem
<Specific description — not generic>

## Solution
<What to do, step by step>

## Code example
\`\`\`typescript
// ...
\`\`\`

## Trigger conditions
<What situation causes you to need this>

## GSN-specific notes
<Any codebase-specific context>
```

## GSN patterns already discovered (from session)

Key patterns worth saving:
- `timingSafeHashEqual` must use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` — plain `===` is vulnerable
- Server actions in `moderation-actions.ts` and `jarvis/ledgers.ts` need `getServerSession` + role check at top
- Dead failover code in `odds-failover.ts` — has circuit breaker pattern worth activating, not deleting
- `dispatchWatchlistAlert` no-op — Elite tier feature sold but not implemented
- `vercel.json` cron is 24h, `REFRESH_STALE_AFTER_MINUTES` is 240min — misalignment causes stale data alerts
- `middleware.ts` matcher excludes `/api/*` — no centralized auth on API routes

## Activation

After saving:
1. Review the file
2. Add to `.claude/skills/` index if applicable
3. Reference in CLAUDE.md under "Learned patterns"
