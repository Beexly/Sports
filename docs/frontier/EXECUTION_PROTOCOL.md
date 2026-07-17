# Execution Protocol

## Contract template (freeze BEFORE editing)

```text
Workstream:
User/system value:
Existing assets:
Files expected to change:
Protected zones:
Acceptance criteria:
Verification commands:
Explicit exclusions:
```

## Protected zones (adversarial gse-red-team review required)

settlement populations & grading · CLV methodology · calibration thresholds · proof/commitment semantics · public performance claims · entitlements & paywalls · Stripe/billing · Prisma migrations · source rights & licensing · publication/deployment · write-once historical values · production secrets/infrastructure.

Never disguise a policy change as cleanup. Never deploy, merge to `main`, apply production migrations, mutate live billing, publish externally, or broaden source permissions from an agent session.

## Verification gates (run once, at completion)

```bash
npm run test --workspace=<each touched workspace>   # full suite per touched workspace
npm run typecheck
npm run lint
npm run guardrails          # trust-gate … eval-contracts chain
git diff --check
npm run build               # only when the changed surface affects production compilation
```

Plus browser/a11y verification when user-facing behavior changed. Do not claim green without command evidence (exit codes captured).

## Subagent boundaries

- **gse-scout** — read-only narrow mapping; exact files/symbols/tests/overlap + recommendation.
- **gse-builder** — one frozen contract, smallest coherent diff, no scope expansion.
- **gse-verifier** — independently inspects the actual diff, re-runs gates, checks claims against evidence.
- **gse-red-team** — read-only; protected zones and major architecture only; hunts silent population changes, methodology drift, fail-open behavior, fabricated states, migration hazards, claim drift, leaks.

One subagent at a time. Cheap models for discovery/mechanical work; strongest reasoning for orchestration and protected-zone review.

## Session discipline

One workstream per session. Update `CURRENT_STATE.md`, `WORK_QUEUE.md`, `DECISIONS.md` (and `RECOVERY_MATRIX.md` when classifications change) before stopping. End with the completion receipt: BASELINE · SELECTED WORKSTREAM · CONTRACT · RECOVERED ASSETS · IMPLEMENTATION · PROTECTED-ZONE REVIEW · VERIFICATION · BRANCH/PR · OWNER GATES · UPDATED LEDGERS · NEXT RECOMMENDED WORKSTREAM · TOKEN-DISCIPLINE RECEIPT.
