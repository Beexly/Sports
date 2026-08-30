# Sports OS — AutoGPT-Style Task Loop Boundaries

**Status**: Doctrine. Binding on all agentic workflows in Sports OS.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/agents/agent-action-policy.md` — permitted agent actions
- `docs/audit/agentic-owasp-controls.md` — LLM08 Excessive Agency control
- `docs/audit/codemod-safety-policy.md` — agent-driven code change rules
- `CLAUDE.md` — autonomous loop protocol

---

## Purpose

AutoGPT and similar autonomous agent frameworks operate on a task loop:
1. Break a goal into subtasks
2. Execute a subtask using available tools
3. Observe the result
4. Choose the next subtask
5. Repeat until the goal is complete

This pattern is powerful but carries risks when deployed in production:
- An agent loop can take irreversible actions (sending emails, posting content,
  executing database writes) before a human can intervene
- An agent loop can hallucinate a successful outcome and continue building
  on false assumptions
- An agent loop can spiral into unintended scope (the goal expansion problem)
- An agent loop that encounters an error may retry aggressively, causing
  API quota exhaustion or rate limiting

This document defines the specific boundaries that govern any autonomous
task loop operating within Sports OS — whether Claude in Cowork mode, a
Codex coding agent, or future agentic infrastructure.

---

## Section 1 — The Three Loop Zones

Every action an autonomous agent takes in Sports OS falls into one of three zones:

### Zone 1 — Safe (Agent proceeds autonomously)

Actions in Zone 1 require no human confirmation and may be chained:

| Action | Zone 1 condition |
|---|---|
| Reading files | Always Zone 1 |
| Reading the database (SELECT) | Always Zone 1 |
| Running `npm run typecheck` | Always Zone 1 |
| Running `npm run lint` | Always Zone 1 |
| Running `npm run test` | Always Zone 1 |
| Writing a new documentation file in `docs/` | Zone 1 if additive, no existing file overwritten |
| Writing a new test file in `**/__tests__/` | Zone 1 if additive |
| Running git status, git log, git diff | Always Zone 1 |
| Reading environment variable names (not values) | Always Zone 1 |

**Zone 1 loop behavior**: Agent may proceed through a sequence of Zone 1
actions without checking in. The agent may autonomously fix linting errors
or typecheck failures that it caused.

---

### Zone 2 — Requires Pre-Declaration (Agent declares intent, then proceeds)

Actions in Zone 2 must be preceded by an explicit pre-declaration that
names every file to be touched, explains why, and confirms which non-negotiable
rules are honored.

| Action | Zone 2 condition |
|---|---|
| Modifying an existing file | Pre-declare files to be touched |
| Creating a new TypeScript source file in `apps/web/` | Pre-declare and confirm no new dependencies |
| Creating a new test file for existing code | Pre-declare expected test behavior |
| Running database migrations | Pre-declare only when schema is pre-approved |
| Committing and pushing to a non-main branch | Pre-declare branch name and commit message |

**Zone 2 loop behavior**: Agent pre-declares, then proceeds. It does NOT
wait for human confirmation before executing — the pre-declaration is the
safety check, not a gate. If the agent discovers mid-execution that the
scope expanded beyond the pre-declaration, it STOPS and re-declares before continuing.

---

### Zone 3 — Hard Stop (Agent stops and requests human approval)

Zone 3 actions cannot be executed by an autonomous agent without explicit
human confirmation. The agent's task loop PAUSES here.

| Action | Why it is Zone 3 |
|---|---|
| Modifying `middleware.ts` | Paywall and auth logic |
| Modifying the compliance scanner rules | Claim governance layer |
| Modifying `apps/web/lib/auth.ts` or auth config | Authentication |
| Adding a new npm dependency | Dependency drift |
| Modifying `prisma/schema.prisma` | Schema change |
| Creating a new API route in `apps/web/app/api/` | New public surface |
| Posting any content to an external platform | Auto-publish is permanently forbidden |
| Sending any email or notification | External communication |
| Rotating or creating API keys | Secret management |
| Executing a database write (INSERT, UPDATE, DELETE) without a pre-approved migration | Data integrity |
| Deleting any file | Irreversible action |

**Zone 3 loop behavior**: The agent:
1. Identifies the Zone 3 action it needs to take
2. Documents what the action is, why it is needed, and what the alternatives are
3. STOPS the autonomous loop for this specific action
4. Continues with other Zone 1 and Zone 2 tasks that do not depend on the Zone 3 action
5. Presents the Zone 3 request to the human when the loop completes

**The agent does NOT**:
- Attempt to reclassify a Zone 3 action as Zone 2 to avoid waiting
- Attempt to find a workaround that achieves the same effect without triggering Zone 3
- Continue with dependent tasks that require the Zone 3 action's completion

---

## Section 2 — Scope Containment Rules

Autonomous agents in Sports OS are subject to hard scope containment:

### Rule 1 — Declare Before Expand

If a task requires touching more files than originally declared, the agent
must re-declare the expanded scope before touching the additional files.

### Rule 2 — No Creative Goal Expansion

An agent that has been given a task for documentation writing may not
autonomously decide to also implement a feature, add a dependency, or
modify a route because it seems like a natural next step.

The task boundary is the task boundary. The agent completes the assigned
task and stops — it does not continue to the "obvious" follow-on work
without a new human instruction.

### Rule 3 — No Self-Approval for Gate Violations

An agent that encounters a gate (owner approval required, operator sign-off
required) may not self-approve the gate because it judges the action to be
safe. Gates exist because human judgment is required. The agent's judgment
that the action is safe is not a substitute for the required approval.

### Rule 4 — Stop on First Irreversible Error

If an agent's action produces an irreversible error (a failed database
migration, a deleted file, a corrupted state), the agent must STOP the
loop immediately. It must document the error and the state at the time
of the error. It must NOT continue and attempt to auto-recover, as
recovery actions can compound the damage.

---

## Section 3 — Loop Termination Criteria

An autonomous task loop must terminate when any of the following occur:

| Termination condition | Required next action |
|---|---|
| All tasks in the current session are complete | Deliver the completion report |
| A Zone 3 action is encountered and no adjacent Zone 1/2 work remains | Present Zone 3 request and stop |
| A validation command fails and the failure cannot be diagnosed in 2 attempts | Stop and report the failure with diagnostic context |
| A Zone 3 action has been taken without authorization | Emergency stop — this is a P0 incident |
| An irreversible error has been introduced | Emergency stop and report |
| Scope has expanded to include a forbidden zone without re-declaration | Stop, revert if possible, report |
| A non-negotiable rule (CLAUDE.md) has been violated | Emergency stop — this is a P0 incident |

---

## Section 4 — Context Compaction and Continuity

Autonomous task loops that run across long context windows must handle
context compaction without losing task state:

**Before compaction**:
- Write a state summary to `docs/ops/` or the agent relay file
- Record: completed tasks, in-progress tasks, pending Zone 3 actions,
  files touched, validation status

**After compaction**:
- Read the state summary before beginning new work
- Verify that the files touched before compaction are in the expected state
- Do not assume that pre-compaction actions succeeded without verification

---

## Section 5 — AutoGPT Reference Analysis

AutoGPT (and similar: BabyAGI, AgentGPT, Hermes Agent, Open WebUI agents)
operate by:
1. Setting a high-level goal
2. Breaking the goal into subtasks
3. Using tools (file access, code execution, web browsing, API calls) to
   execute subtasks
4. Evaluating whether the goal is complete
5. Repeating until complete or until a max iteration limit

**Why these frameworks require boundary rules for Sports OS**:

- **Unbounded tool use**: Without Zone classification, an AutoGPT-style agent
  might read a file (Zone 1), modify a route (Zone 3), post a pick to social
  media (Zone 3 — forever blocked), and delete a test (Zone 3 — forever blocked)
  in a single session without human review.

- **Goal hallucination**: An agent that believes it has achieved its goal but
  has not (because it hallucinated a success state) will proceed to the next
  subtask on a false foundation. The sports intelligence context is particularly
  sensitive — a hallucinated "test pass" means invalid picks are deployed.

- **Scope creep**: A goal stated as "improve the pick card component" can
  autonomously expand to "add a new dependency", "refactor the whole component
  system", and "push to production" without any of those being in scope.

The Zone 1/2/3 system, combined with the scope containment rules, prevents
these failure modes while preserving the efficiency benefit of autonomous execution.

---

## Section 6 — The No-Stopping Work Ladder

When a Zone 3 action blocks progress, the agent must not stop entirely.
From `CLAUDE_CODEX_SEAMLESS_OPERATING_PROTOCOL.md`:

```
1. Complete approved implementation.
2. If blocked, complete tests for intended behavior.
3. If tests blocked, complete docs/spec.
4. If docs blocked, complete audit report.
5. If audit blocked, complete file inventory.
6. If file inventory blocked, complete next-agent handoff
   with exact blocker and next safe command.

Never end with only "I can't."
```

This ladder ensures that a Zone 3 block on one task does not paralyze
the entire session. The agent continues on Zone 1/2 adjacent work while
the Zone 3 request awaits human action.

---

## Forbidden Actions

- Do NOT self-approve a Zone 3 action
- Do NOT expand scope without re-declaring
- Do NOT continue after an irreversible error
- Do NOT attempt to achieve a Zone 3 effect through Zone 2 workarounds
- Do NOT post content to any external platform under any circumstances
- Do NOT delete any file without Zone 3 authorization
- Do NOT disable or bypass any test suite or compliance scanner

---

## Codex Audit Requirements

1. Confirm no agent-controlled endpoint exists that would allow auto-publishing
   to any external platform
2. Confirm no scheduled worker performs Zone 3 actions (schema changes, route
   creation, external posting) without explicit operator trigger
3. Confirm the Claude API integration does not give the model write access
   to the database without going through validated server-side routes
4. Report any agent-controlled file deletion or dependency modification as P0
