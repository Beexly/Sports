# PATCH REVIEW REPORT — Agent OS Runtime

**Branch reviewed:** `codex/enforce-use-of-main-branch-in-git-setup`
**Commit:** `3a381d4c` "Export Agent OS runtime visibility patch"
**Base:** `0e70605c` (old main / PR #34) · **Size:** 138 files, +7057 / −69

## 0. Provenance (why the SHA churned)

Codex built this in a **network-isolated cloud worktree** (no `origin`, `403 CONNECT
tunnel failed` on every GitHub call). It could not push, so it re-committed the same tree
repeatedly to export patches/bundles — which is why the SHA kept changing
(`0679aa3` → `3bfc262` → `bcaf2f7` → `b92708c`). The **content was stable**: every export
is `138 files, +7057/−69` on base `0e70605`. The branch I reviewed (`3a381d4c`) is that same
tree, now landed on GitHub. **Codex's own gate log independently matches mine** — including
the exact "only the non-fatal Sentry/OpenTelemetry warning remains" build result. This is
cross-confirmation, not a single-source claim.

## 1. Blast radius — what actually changed

**Purely additive.** New files under new `apps/web/lib/` subtrees. The only pre-existing
files modified are non-safety:

| Modified file | Why | Risk |
|---|---|---|
| `apps/web/app/cockpit/page.tsx` | adds read-only `OperatingRuntimeZone` | none — render-only |
| `apps/web/app/layout.tsx` | offline font fix (no `next/font/google`) | none — fixes the build |
| `scripts/morning-setup.mjs` | appends a local git "prefer main" repo-lock | none — no network |
| `__tests__/homepage-doctrine-hero.test.ts` | inverted to assert offline fonts | **stronger**, not weaker |
| `__tests__/morning-setup-script.test.ts` | **added** a git-env assertion | additive |

**Verified NOT touched** (grep over the diff name-list): `clearance-engine`,
`source-rights-registry`, `data-rules`, `responsible*`, `requirePremium*`/entitlements,
`readiness`, `stripe`/`webhook`, `paywall`, `auth`. **Zero deletions of code.** Codex did not
edit the gates — it added new modules *alongside* them.

## 2. Is it real wiring, or cosmetic?

**Real.** It executes real logic and is rendered + tested:

- **Agent registry** (`agent-registry.ts`) — 23 agents as `const satisfies` typed data,
  each with status, allowed/forbidden actions, review gates, risk, owner/claude-review
  flags. Pure data + pure functions (`getAgent`, `assertAgentCanReceiveExecutableTask`).
- **Health** (`agent-health.ts`) — `summarizeAgentHealth()` computes
  `operationalCapacity` = count(REAL|PARTIAL) = **0**; tracks notWired/draftOnly/manual
  separately. Rendered in the cockpit.
- **Jarvis assessment** (`jarvis-operating-assessment.ts`) — builds owner-facing operating
  state from health + tasks + workflows. Rendered in the cockpit.
- **Task runtime** (`agent-task-runtime.ts`, `agent-task-router.ts`, `agent-task-store.ts`)
  — real in-memory runtime: routes tasks, enforces transitions (`canTransitionTask`),
  fail-closed completion (`canCompleteTaskAutomatically`), dedupes by id. DB-capable via
  the `CockpitTask` model (which **exists** in schema, line 1080) — see the one gap in §5.
- **Workflows** (`workflow-registry.ts`, `workflow-runner.ts`, `workflow-gates.ts`) —
  14 governed workflows; `planWorkflowRun` produces a *plan* (honest naming) and blocks on
  `PROTECTED_SOURCE` / `UNSETTLED_SEASON` events; `workflowCanPublish` /
  `workflowCanChangeModelWeights` are typed to return literal `false`.
- **NFL identity resolvers** (`nfl/*`) — GSIS→Player crosswalk, team alias, game identity,
  settled-season check. Conservative (no name-only merges, no commence-time-only joins).
- **Cockpit `OperatingRuntimeZone`** — renders all of the above read-only.

The cockpit route built successfully (187 pages, exit 0), so the server component that
calls `buildJarvisOperatingAssessment()` does not crash.

## 3. Does it overstate runtime maturity? (the fake-green test)

**No — it under-states, deliberately.** The honesty is *structural*, enforced by types and
tests, not by good intentions:

- `companyHealth: "CRITICAL" | "CAUTION" | "UNKNOWN"` — **there is no "HEALTHY"/"GREEN"
  value the system can emit.** With `notWired > 0` it is CAUTION at best; with any blocked
  task it is CRITICAL.
- **Zero agents are `REAL`.** Best status is `DRAFT_ONLY` (draft, never publish) or
  `MANUAL` (human-triggered). `operationalCapacity` therefore renders **0**, labeled
  "real/partial" in amber — not green.
- The cockpit stat for NOT_WIRED is explicitly subtitled **"not capacity."**
- Status strings are verbatim-honest: public picks "cannot self-enable," calibration
  "model weights cannot change automatically," revenue "Unknown… no fake revenue,"
  memory "ARCHIVE is NOT_WIRED."
- `externalActionsAllowed: false` is hardcoded for **every** agent.

## 4. Are NOT_WIRED agents counted as capacity? Is DRAFT_ONLY/MANUAL truthful?

- **Not counted.** `operationalCapacity` counts only REAL|PARTIAL. NOT_WIRED is a separate
  field, surfaced as "not capacity." Test `does not count not-wired agents as operational
  capacity` asserts `operationalCapacity === 0 && notWired > 0`.
- **DRAFT_ONLY truthful:** `canAgentDraft` allows it, `canAgentExecute` does not; e.g. AVA
  has `DRAFT` allowed and `PUBLISH` forbidden (tested).
- **MANUAL truthful:** e.g. LEDGER/AUDIT are `MANUAL`, cadence `human-triggered` (tested).

## 5. The one real gap (non-safety)

**Agent-task DB persistence is in-memory-only today.** `agent-task-store.ts`'s `create`
writes `{id,title,description,source,payload,decisionNotes}` but `CockpitTask.assignedAgent`
(enum `OperatorAgent`) is **required with no default**, so against a real Postgres every
write throws and is swallowed by the try/catch → in-memory fallback. Worse, `OperatorAgent`
only enumerates **6** agents (JARVIS/SARAH/TAL/SCOUT/AVA/BOBBY) vs the registry's **23**, so
16 agents could never persist even if the column were supplied.

- **Why it's safe:** the fallback is graceful and honest; the **UI does not claim DB
  persistence**; `AgentTaskRuntimeResult.persisted=true` refers to the in-memory upsert.
- **Why it still matters:** Codex's handoff names this "PERSISTED_TASK_RUNTIME," which
  overstates current DB effectiveness. Fix is an **owner-level schema decision** (extend the
  `OperatorAgent` enum, or repoint to a 23-value owning enum) + a small code change (map +
  include `assignedAgent`). Not silently patched. See NEXT_BEST_BUILD.md.

## 6. Tests — meaningful or brittle?

Meaningful. They lock the honesty invariants (full list in TEST_RESULTS.md). A future
attempt to fake-green the system would **fail these tests**.

## 7. Bottom line

Real, honest, additive, safe. Adopt it. Three convergences and one persistence fix are
follow-ups, not blockers (DUPLICATION_VS_MY_BRANCH.md, NEXT_BEST_BUILD.md).
