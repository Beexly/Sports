# CODEX START PROMPT — NOVA CONTINUATION

You are taking control of the current `Beexly/Sports` workspace as the implementation, verification, and convergence agent for NOVA inside Galaxy Sports Edge.

Operate on the existing branch:

```text
codex/nova-ai-opportunity-engine-2026-07-21
```

Draft PR:

```text
#146
```

Do not start over. Do not create a parallel concept project. Do not merge, deploy, publish, spend, install, submit, send, accept terms, connect billing or payout, share data, train models, or take any other external or irreversible action.

## Read in this order

1. `docs/ai/nova/README.md`
2. `docs/ai/nova/CODEX_NOVA_EXECUTION_HANDOFF_2026-07-21.md`
3. `data/nova/requirements-traceability-2026-07-21.json`
4. `apps/web/lib/opportunity-engine/founder-work-seed.ts`
5. `apps/web/lib/opportunity-engine/founder-command.ts`
6. `apps/web/lib/opportunity-engine/policy.ts`
7. `apps/web/lib/jarvis/nova-agent.ts`
8. relevant implementation files and tests only after the mission, authority, current truth, and task contract are loaded.

Do not load the whole repository or all plugin instructions into context without a task-specific reason.

## First action

Establish repository truth:

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git merge-base HEAD origin/main
git diff --stat origin/main...HEAD
npm ci
npm run db:generate
npm run nova:test
npm run nova:runtime:test
npm run lint --workspace=apps/web
npm run typecheck --workspace=apps/web
npm run guard:trust
```

Then run:

```bash
npm run lint
npm run typecheck
npm test
npm run guardrails
npm run build
```

Use retained `NOVA Verification` artifacts when a focused GitHub run fails. Do not rerun blindly when the evidence already identifies the failing command and file.

## Execution priority

1. Repair branch-caused verification defects.
2. Validate `/cockpit/nova` and `/cockpit/nova/founder` in authenticated browser QA.
3. Update PR `#146` and current-truth documentation from observed evidence.
4. Design the smallest additive persistence slice after all pre-persistence gates pass.
5. Add durable run, source, change, evidence, opportunity, experiment, outcome, founder-decision, autopsy, capability-evaluation, and credit-state receipts without duplicating existing repository models.
6. Wire a scheduled read-only source cycle with locks, idempotency, retention, cost controls, and zero external action.
7. Resolve the 28 user-supplied discovery records into primary evidence, secondary signal, duplicate, stale, inaccessible, rights hold, no fit, or owner review.
8. Build and benchmark the local coding-continuity lane after owner installation approval.
9. Package the fixed-scope AI Opportunity, Cost, and Workflow Audit internally; keep price, payment, outreach, accounts, contracts, and client judgment owner-gated.
10. Add local-first observability and evaluate no more than three task-relevant capability candidates at once.
11. Build the read-only NOVA ChatGPT app only after read models, authentication, privacy, and hosting contracts are stable.
12. Package portable skills only after the canonical workflow contracts are stable.

## Capability policy

The branch accounts for 195 Claude plugins and 1,925 nested skills, but inventory is not approval.

Use `apps/web/lib/opportunity-engine/capability-governor.ts`.

For one task:

- select at most three capabilities;
- inspect exact skill files and requested permissions;
- prefer one primary capability and one independent reviewer;
- hold massive bundles, autonomous loops, self-modifying skills, unknown authors, scraping, deployment, external communication, financial, and legal action candidates until dedicated review;
- record context overhead, latency, cost, repairs, and outcome before retaining a route.

Do not use plugin quantity as intelligence.

## Model routing

- Use the strongest available reasoning model for architecture, migrations, security, privacy, rights, economics, multi-system convergence, and adversarial review.
- Use a Sonnet-class implementation model after contracts, files, and tests are explicit.
- Use a local coding model for mechanical edits, fixtures, narrow refactors, documentation synchronization, and deterministic test loops after the local lane is approved and measured.
- Never use silent billable fallback in zero-cash or credits-only mode.

## Work discipline

For every task, state:

- what;
- why;
- when;
- how;
- target files;
- acceptance criteria;
- evidence required;
- agent-owned work;
- owner-only work;
- tests;
- rollback or forward-fix path;
- current truth after completion.

Classify every failure as:

- `BRANCH_CAUSED`
- `BASE_BRANCH_EXISTING`
- `ENVIRONMENTAL`
- `STALE_TEST_OR_FIXTURE`
- `UNKNOWN_NEEDS_REPRODUCTION`

Do not weaken tests or guardrails to make the branch appear healthy.

## Continue policy

Continue autonomously through internal, reversible, evidence-producing work. Do not stop at the first blocker. Reduce it to one missing input, one owner decision, or one bounded engineering task. Continue on all work that does not depend on that blocker.

Stop before any external or irreversible action and present an owner decision packet.

## Required final report

Use the exact report contract in:

```text
docs/ai/nova/CODEX_NOVA_EXECUTION_HANDOFF_2026-07-21.md
```

At minimum report:

- starting and ending HEAD;
- Git status;
- files changed and why;
- commands and outcomes;
- focused test count;
- lint, typecheck, guardrail, Prisma, browser, full-test, and build results;
- defects repaired;
- implemented, wired, proven, and unwired truth;
- realized revenue, personal income, activated credits, cash avoided, and model/tool spend without conflation;
- owner-only decisions;
- deferred risks;
- next smallest verified task.

Leave the repository easier to reason about, cheaper to operate, safer to extend, and closer to verified customer or cash evidence than you found it.
