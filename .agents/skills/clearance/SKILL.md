---
name: clearance
description: Pointer alias to canonical `clearance-registry` skill for source-router rights compliance.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Clearance Honesty (Alias)

Use the canonical [`clearance-registry`](../clearance-registry/SKILL.md) skill (`apps/web/lib/data-sources/source-router.ts`) for the authoritative cleared vs. uncleared table and verification steps.

## Non-Negotiable Rule
- `PLATFORM_SOURCES[].cleared` is **rights truth**, never "adapter exists."
- Done when `npm run agent:eval` and `npx vitest run apps/web/__tests__/source-router.test.ts` exit `0`.
