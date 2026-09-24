# Change Proposal — <title>

**Date:** <YYYY-MM-DD>
**Status:** <Proposed / Approved / Rejected>
**Author:** <name or team>
**Affects:** <schema / dependency / product surface / registry / CI>

> *Describe the proposal in one concrete sentence before filling in the sections below.*

## What changes

> *State the concrete diff in plain words, including the files, tables, and behavior that change.*

## Why now

> *Describe the current problem, its impact, and what remains broken if this proposal is not approved.*

## Alternatives considered

> *List at least two alternatives. For each, explain why it was rejected or what trade-off makes it less suitable.*

- <Alternative 1 — reason rejected>
- <Alternative 2 — reason rejected>
- <Optional alternative — reason rejected>

## Blast radius

> *Name the files, tables, routes, jobs, and operators that could break if this change is wrong.*

- <Affected file, table, route, or job — expected impact>
- <Affected file, table, route, or job — expected impact>
- <Affected file, table, route, or job — expected impact>

## Rollback

> *Provide the literal commands or steps to undo the approved change without weakening a guardrail.*

```bash
<command or rollback step 1>
<command or rollback step 2>
```

> *If the rollback is not a simple command, identify the exact files or records to restore and the owner who must approve it.*

## Which non-negotiable rules this touches

> *Check every applicable rule and state how this proposal satisfies it. Do not mark a rule satisfied without evidence.*

- [ ] **No fake data:** <how the change preserves real, traceable data>
- [ ] **No fabricated stats:** <how the change preserves sourced, non-invented metrics>
- [ ] **No frontend-only paywalls:** <how server-side enforcement remains intact>
- [ ] **No secrets in code:** <how credentials and keys remain environment-backed>
- [ ] **No stale data:** <how freshness and timestamps are validated>
- [ ] **Tests required:** <which tests cover the change and must pass>
- [ ] **Types required:** <which strict TypeScript types or type checks cover the change>

## Owner approval

> *An approved signature or explicit approval is required before implementation. Unapproved proposals are not implemented.*

**Owner:** <name>
**Signature / approval:** ______________________________
**Date:** <YYYY-MM-DD>
