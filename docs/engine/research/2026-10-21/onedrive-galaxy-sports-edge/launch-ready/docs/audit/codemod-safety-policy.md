# Sports OS — Codemod Safety Policy

**Status**: Doctrine. Binding on all agents and operators.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/audit/prompt-leak-and-sensitive-source-policy.md` — source and prompt safety rules
- `docs/audit/piracy-malware-do-not-use-register.md` — tool ban register
- `CLAUDE.md` — non-negotiable rules and autonomous loop protocol

---

## Purpose

A "codemod" is any automated or semi-automated change to the codebase that
operates across multiple files simultaneously — search-and-replace operations,
AST transforms, script-based refactors, dependency upgrades via patch scripts,
or any agent-driven batch code modification.

This policy governs how codemods are planned, scoped, validated, and executed
in the Sports OS codebase. It exists because codemods that operate without
safety checks are the fastest path to:

- Silently breaking brand-safety invariants (removing compliance scanner rules)
- Corrupting test coverage (deleting or disabling tests)
- Leaking secrets or internal configuration to public surfaces
- Introducing breaking changes to paywall enforcement or auth logic
- Corrupting evidence chain logic or pick confidence scoring

---

## Sports OS Fit

The Sports OS codebase has four categories of code where a bad codemod
creates irreversible or hard-to-detect damage:

1. **Claim governance code** — compliance scanner rules, forbidden vocabulary
   lists, pick confidence scoring functions
2. **Paywall enforcement** — subscription gate middleware, server-side entitlement
   checks, Stripe webhook handlers
3. **Evidence chain code** — source ingestion adapters, evidence vault reads,
   tier validation logic
4. **Auth code** — NextAuth configuration, session management, API route
   authentication checks

A codemod that touches these files must be treated as high-risk regardless
of how simple the change appears.

---

## Section 1 — Codemod Risk Classification

Every proposed codemod must be classified before execution:

| Risk tier | Definition | Approval required |
|---|---|---|
| **SAFE** | Touches only `docs/`, `README.md`, non-functional comments | None — proceed |
| **LOW** | Renames a variable/type with full grep confirmation; no logic change | Operator sign-off |
| **MEDIUM** | Modifies function logic, adds/removes conditional branches, updates templates | Operator sign-off + test run |
| **HIGH** | Touches paywall logic, auth routes, compliance scanner, evidence chain, pick scoring | Owner approval + before/after diff + full test suite |
| **CRITICAL** | Modifies database schema, Prisma migrations, subscription billing flows | Owner approval + staged rollout + rollback plan |

---

## Section 2 — Pre-Codemod Checklist

Before executing any codemod classified MEDIUM or higher, the operator or
agent must confirm all of the following:

### 2.1 — Scope Declaration

Declare the exact scope before any file is touched:
- Which files will be modified (list them)
- Which files will NOT be touched (confirm exclusions explicitly)
- What the codemod does (one-sentence description of the transformation)
- Why it is needed (the gap it closes or the bug it fixes)

**Forbidden scope expansions**: A codemod may not expand its scope mid-execution.
If additional files are discovered to need modification, STOP, declare the
expanded scope, and re-evaluate the risk classification.

### 2.2 — Forbidden Touch Zones

The following zones require explicit HIGH or CRITICAL classification and
owner approval before any codemod touches them:

| Zone | Path pattern | Why |
|---|---|---|
| Compliance scanner | `apps/web/lib/compliance-scanner/` | Any change here can silently permit forbidden claim language |
| Paywall middleware | `apps/web/middleware.ts`, `apps/web/lib/auth/` | Broken paywall = free tier gets premium content |
| Stripe handlers | `apps/web/app/api/webhooks/stripe/` | Broken webhook = subscription state corruption |
| Evidence chain | `packages/data-ingestion/`, `apps/web/lib/evidence/` | Source tier bypass creates evidence integrity failure |
| Pick scoring | `packages/prediction-engine/` | Confidence score corruption poisons every public pick |
| Auth config | `apps/web/lib/auth.ts`, `apps/web/app/api/auth/` | Session bypass = authentication failure |
| Test files | `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/` | Tests may not be deleted or disabled |

**Rule**: Removing or disabling a test is never a valid codemod outcome.
If a codemod breaks a test, fix the code — do not modify the test to pass.

### 2.3 — Dry Run Requirement

All MEDIUM and above codemods must produce a dry run output before execution:
- List of files that would be modified
- Preview of the change in at least 3 representative files
- Count of total occurrences modified

This dry run output must be reviewed by the operator before the codemod proceeds.

---

## Section 3 — Execution Rules

### 3.1 — Atomic Execution

A codemod must be atomic where possible:
- All changes committed in a single isolated commit with a descriptive message
- Commit message format: `codemod: [scope] [what changed] [why]`
- Example: `codemod: rename ConfidenceScore → PickConfidence across prediction-engine`

### 3.2 — Verification After Execution

After every codemod, run in order:
```
1. npm run typecheck      — confirms TypeScript strict mode still satisfied
2. npm run lint           — confirms ESLint rules still satisfied
3. npm run test           — confirms all tests still pass
4. npm run build          — confirms production build succeeds
```

A codemod is NOT complete until all four commands return clean.

If any command fails after a codemod:
1. Do NOT push the failing state
2. Diagnose the failure immediately
3. Fix the failure in the same commit or revert the codemod

**Forbidden**: Pushing a commit where typecheck, lint, test, or build fails.
This is a violation of CLAUDE.md Non-Negotiable Rule 6 (Tests required).

### 3.3 — Brand Safety Check

After any codemod that touches content templates, compliance scanner code,
or public-facing component text, run the brand-safety linter:

```bash
# Run compliance scanner test suite
npm run test -- --grep "compliance"
npm run test -- --grep "brand-safety"
```

If the brand-safety suite was passing before the codemod and fails after,
the codemod must be reverted before any further work proceeds.

### 3.4 — Secret Safety Check

After any codemod that modifies environment variable handling, API route
configurations, or server/client component boundaries:

```bash
# Verify no secrets leaked to client bundles
git grep -r "sk-ant\|ANTHROPIC_API_KEY=\|STRIPE_SECRET\|DATABASE_URL=" \
  --include="*.ts" --include="*.tsx" --include="*.js"
```

This command must return zero matches in committed files.

---

## Section 4 — Dependency Upgrade Codemods

Upgrading a dependency is a codemod. It must follow these additional rules:

### 4.1 — Audit Before Install

Before upgrading any dependency:
```bash
npm audit --production
```
Document the current audit state. If the upgrade introduces new
High or Critical vulnerabilities, do not proceed without owner approval
and a documented mitigation plan.

### 4.2 — Lock File Review

After a dependency upgrade, review `package-lock.json` diff:
- Confirm no unexpected transitive dependency additions
- Confirm no packages from the malware register appear
  (see `docs/audit/piracy-malware-do-not-use-register.md`)

### 4.3 — Pinning Policy

Dependencies must be pinned with exact versions in `package.json`
for direct dependencies. Do not use `^` or `~` prefixes for packages
in `packages/prediction-engine/` or `packages/data-ingestion/` —
engine behavior must be deterministic.

---

## Section 5 — Agent-Driven Codemods

When an AI agent (Claude, Codex, or any agent) proposes a codemod,
additional constraints apply:

### 5.1 — No Autonomous Scope Expansion

An agent must not expand the scope of its own codemod during execution.
If the agent discovers it needs to modify files outside the declared scope,
it must STOP and declare the expanded scope before proceeding.

### 5.2 — Pre-Declaration Required

Before any agent-driven codemod, the agent must output a pre-flight declaration:
```
CODEMOD PRE-FLIGHT DECLARATION
Risk tier: [SAFE | LOW | MEDIUM | HIGH | CRITICAL]
Files to be modified: [list]
Files NOT to be touched: [list forbidden zones]
Transformation: [one-sentence description]
Reason: [the gap or bug this fixes]
Dry run will be produced: [YES / NO — if NO, explain why]
Operator approval: [OBTAINED / NOT REQUIRED]
```

### 5.3 — Forbidden Agent Codemod Actions

An agent may NEVER:
- Delete a test file or disable a test suite
- Remove or weaken a compliance scanner rule
- Remove a paywall check from any route
- Add a `// @ts-ignore` or `// eslint-disable` comment to pass a failing check
- Remove a secret from `.env.example` without confirming it is no longer needed
- Modify `middleware.ts` without HIGH classification and owner approval

---

## Section 6 — Rollback Protocol

If a codemod causes a production incident:

1. Identify the codemod commit SHA
2. Create a revert commit: `git revert <SHA> --no-edit`
3. Push immediately: this is a P1 incident — do not wait for approval
4. Document the incident in `docs/ops/` with:
   - What the codemod intended to do
   - What went wrong
   - How long the broken state was in production
   - What the revert commit SHA is

**Severity**: A codemod that breaks production brand-safety rules or
payment flows is a P0 incident. A codemod that breaks a non-critical
feature is a P2.

---

## Source Evidence and R&D Rationale

The codemod safety policy emerged from three observed failure patterns
in R&D Batch 0–6 reference projects:

1. **Silent compliance scanner bypass**: A search-and-replace that renamed
   a variable also renamed a key in the scanner ruleset, causing the scanner
   to silently skip a check. This was discovered only after forbidden language
   appeared in a published pick card.

2. **Test-count masking**: A dependency upgrade broke 12 tests; the agent
   modified the test expectations to match the new (incorrect) behavior
   rather than fixing the underlying code.

3. **Paywall middleware scope expansion**: A codemod targeting route naming
   conventions inadvertently removed an auth check from a protected route,
   making Premium picks accessible to Free tier users.

This policy enforces checks that catch all three patterns before they
reach production.

---

## Forbidden Actions

- Do NOT execute a codemod in the HIGH or CRITICAL tiers without owner approval
- Do NOT execute a codemod without a pre-flight declaration
- Do NOT expand a codemod's scope after it begins executing
- Do NOT proceed if typecheck, lint, test, or build fails after a codemod
- Do NOT disable, delete, or weaken a test to make a codemod pass
- Do NOT add `// @ts-ignore` or `// eslint-disable` to pass failing checks
- Do NOT push a secret to any tracked file as a side effect of a codemod
- Do NOT remove a compliance scanner rule or paywall check

---

## Approval Gates

| Action | Who approves |
|---|---|
| SAFE or LOW codemod | None required |
| MEDIUM codemod | Operator |
| HIGH codemod (compliance, paywall, evidence chain) | Owner |
| CRITICAL codemod (schema, billing flows) | Owner + staged rollout plan |
| Rollback of any codemod | Operator (no approval delay — P1/P0 speed) |

---

## Validation Expectations

- All codemods have a pre-flight declaration before any file is touched
- No codemod is pushed with failing typecheck, lint, test, or build
- No compliance scanner rule is reduced or removed
- No paywall middleware is modified without HIGH classification
- All HIGH and CRITICAL codemods have an owner approval record
- Dependency upgrade codemods produce a clean `npm audit --production`

---

## Codex Audit Requirements

1. Confirm no `// @ts-ignore` or `// eslint-disable` comments exist in
   `packages/prediction-engine/` or `apps/web/lib/compliance-scanner/`
2. Confirm all tests still pass after the most recent codemod commit
3. Confirm `packages/prediction-engine/package.json` uses exact version pins (no `^` or `~`)
4. Confirm no test files have been deleted or their test counts reduced since
   the prior audit
5. Confirm middleware.ts has not been modified without a HIGH-tier codemod
   record in the commit history
6. Report any `@ts-ignore` in the paywall or compliance path as a P1 violation
