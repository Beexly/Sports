# Wave 5 Owner Promotion Packet — 2026-07-22 (revised)

**Branch:** `integration/gse-nova-control-plane-premerge-2026-07-22`
**HEAD at time of writing:** `fb2e662201725e5064480415f10b259838d02a0c` (the packet-rewrite commit itself — by definition the branch tip the moment this file was committed; run `git log -1` for the true current tip if further commits have landed since)
**Worktree:** `/workspace/wt/wave5-integration`

**This revision supersedes the version of this packet committed at `fb0d76cc`.** That version was synthesized from a truncated lens-results feed (only ~6 of 12 lenses' full detail were available to it) and from a branch state that had gone stale relative to several source PR branches. Both gaps are closed here:

1. **Staleness.** Four of the 22 source branches (16 PRs + 6 CONSTELLATION labs) had moved forward after being merged into this integration branch. All four have now been re-merged (see "Branch resync" below); the previous packet's Decision #1 (credit-hold leak) and Decision #2 (import-boundary CI failure) are resolved as a result, and are recorded here as closed, not as open decisions.
2. **Truncated lens data.** `reports/wave5/full-lens-results-raw.json` (committed alongside this packet) now carries the full, untruncated output of all 12 commissioned adversarial lenses — 14 findings total. All 14 are addressed below: fixed where small and unambiguous, or carried forward as an explicit owner decision where architectural or genuinely ambiguous.

## What this is

This packet synthesizes the Wave 5 cumulative-integration effort for the Beexly/Sports GSE, NOVA, and CONSTELLATION hardening initiative: 16 PRs (#152, #158–#172) and 6 lab/W2 branches were merged in dependency order onto one integration branch, resynced against 4 branches that moved forward mid-effort, reviewed by 12 adversarial lenses, and had every small/unambiguous finding from that review fixed directly on the branch.

State: **NOT_CUMULATIVELY_VALIDATED until the owner reviews this packet.** Nothing in this branch has been merged to `main`, deployed, or activated. Production code paths this work touches remain fail-closed (sealed executor, `failClosedCreditAuthorizationPort`, `failClosedReceiptStore`) — the new AI control-plane is not wired into any user- or agent-reachable route except a bearer-token-gated cron drain endpoint. No merge to `main`, no deploy, and no production config change were made in the course of producing this packet — see "What was explicitly NOT done" at the end.

## Branch resync (staleness gap closed)

`git fetch origin` plus `git merge-base --is-ancestor <branch> HEAD` was run against all 22 source branches, using each branch's real local head (the branches' worktrees under `/workspace/wt/*`, which were ahead of `origin/*` for several of them — origin's remote-tracking refs lag real pushes in this environment). Four had moved past what was originally merged:

| Branch | Merged at | Real head | Conflict? |
|---|---|---|---|
| `security/trusted-actor-model` | `59b04a68` | `9178effb` | `vercel.json` — both sides added a distinct cron entry (`drain-ai-telemetry-recovery` vs `prune-rate-limits`); kept both. |
| `payments/durable-checkout-attempt` | `90bfb96b` | `7c3695e7` (4 adversarial-review fixes) | `vercel.json` — same pattern, added `repair-checkout-attempts` cron; kept all three. |
| `feat/ai-control-plane-budgets` | `fce7ff1c` | `868d54df` | Clean merge, no conflicts. |
| `feat/ai-control-plane-credit-admission` | `9b16ef56` | `58ea76e4` | `credit-admission.ts`, its test file, and `internal.ts` — add/add and content conflicts (the original 9b16ef56 merge was a single-parent "merge" commit, not a real `git merge`, so git had no shared history to diff against). Resolved by keeping HEAD's version throughout: it was independently confirmed to already carry a more advanced, real-Postgres-backed `createPgCreditAuthorizationPort` (vs. the source branch's in-memory-only fake adapter), and `executor.ts`'s settle/release lifecycle fix (the actual credit-hold-leak fix) merged cleanly on its own with no conflict. |

All 22 branches are now ancestors of HEAD (verified by the same `merge-base --is-ancestor` loop, all report `CURRENT`).

**This closes the previous packet's Decision #1 (executor credit-hold leak) and Decision #2 (AI-transport import-boundary CI failure) — see "Findings fixed" below for confirmation each is actually gone, not just theoretically addressed by the resync.**

## Findings fixed (small, unambiguous — fixed directly on the branch)

1. **money-safety finding 1 / prior Decision #1 — executor credit-hold leak (high).** `executor.ts`'s `CreditAuthorizationPort.authorizeAndReserve()` hold previously had no settle/release call on any exit path. **Resolved by the credit-admission branch resync** (`58ea76e4` carries the fix). Verified directly post-merge: `executor.ts` now settles on `COMPLETED`, releases on a clean failure, and retains the hold (never leaked, never silently freed) on an `AmbiguousCharge`. Still dormant in production (`sealedProductionExecutor()` wires `credit: failClosedCreditAuthorizationPort`, which always throws) — this closes the landmine before S5 wires a real adapter, per the original recommendation.
2. **secrets-and-boundaries finding 1 / prior Decision #2 — AI-transport import-boundary CI failure (high).** `apps/web/lib/ai-control-plane/dispatch.ts` imports raw transport + all three raw provider clients directly; it was never added to the guard's allowlist when the control-plane migration landed, so `npm run guardrails` was red (4 violations). Fixed by adding `dispatch.ts` to `PERMANENT_ADAPTER_ALLOWLIST` in `scripts/guardrails/ai-transport-import-boundary.mjs` — this is exactly the "sealed control-plane executor" join the guard's own header comment anticipated ("These remain allowlisted after the AI control-plane migration... joined then by the sealed control-plane executor"), and `dispatch.ts` is reachable only through the sealed executor (`internal.ts`, §8.2-guarded), never from arbitrary application code. Verified: `node scripts/guardrails/ai-transport-import-boundary.mjs` now reports 0 violations; the guard's fixture + mutation test suite (`npm run test:ai-transport-import-boundary`) still passes 8/8, including the permanent-vs-transitional split assertion.
3. **money-safety finding 2 — float-precision credit math (medium).** `invocation-pipeline.ts:561`/`:717` computed credit worst-case/settlement amounts via `Math.round(plan.maxVendorCashUsd * 100)` instead of the codebase's exact-decimal (`usdToMicros`/BigInt) convention. Fixed with a new `usdToCreditMinorUnitsCeil()` helper that routes through `usdToMicros` (which already refuses lossy >6-decimal amounts) and ceiling-divides to cents with no float step. Both call sites updated.
4. **schema-migration-safety finding 1 — colliding migration timestamps (medium).** `20260722150000_add_actor_receipts_and_durable_rate_limits` and `20260722150000_add_ai_budget_reservations` shared an identical timestamp prefix (a two-branch merge collision), disambiguated only by lexical folder-name ordering. Renamed the latter to `20260722150001_add_ai_budget_reservations`; updated the one test (`ai-control-plane-budget-pg.test.ts`) that hardcodes the directory name.
5. **formal-verification-soundness finding 2 — mislabeled property-test title (high, but doc-only in scope).** `formal-regression/src/tests/credit-reservation.real.property.test.ts`'s test titled `"release() frees headroom for a LATER attempt (settle keeps it consumed)"` never calls `settle()` — the parenthetical is an untested claim, and per finding 1 (left as an owner decision below) it is also a *false* claim: the real `settle()` frees the hold exactly like `release()`. Corrected the title to stop asserting something untested and contradicted, and added a comment pointing at finding 1 / this packet for the underlying architectural question.
6. **test-coverage-honesty finding 1 — untested dead-letter-receipt failure path (medium).** `appendDeadLetterReceipt`'s own write-failure branch (`worker.ts`) — the durable owner-queue escalation path for `DEAD_LETTER` deliveries — had no test forcing `outboxDeadLetterReceipt.createMany` to throw. Added a test (`worker.test.ts`) that does exactly that across a full attempt-cap drain sequence and proves: every delivery still reaches `DEAD_LETTER` (the loop isn't aborted), no receipt is persisted (the write kept failing), and the failure is captured in `summary.errors` (never silently swallowed into nothing). All 30 tests in the file pass, including the new one.

## Findings left as explicit owner decisions (architectural or genuinely ambiguous)

### A. Duplicate `CreditAuthorizationPort` implementations (genesis-jarvis-nova-boundary finding 1, formal-verification-soundness finding 1 — medium/high)
Two independently-designed `CreditAuthorizationPort` implementations exist for the same `CONFIRMED_CREDITS_ONLY` admission decision: a whole-plan-level port (`credit-port.ts`, sealed into the outer executor, fail-closed) and a per-route Postgres-backed port (`credit-admission.ts`, instantiated with a real DB handle inside `productionDispatch`, but gated behind an always-`undefined` `deps.creditStore`). Both remain fail-closed today (verified: `invocation-pipeline.ts:499-528`), so there is no live double-spend risk — but this is the "second economic-truth model" pattern the canonical ownership table's "one economic truth" rule exists to prevent. It is also **pre-acknowledged**: the same collision is what `npm run nova:inventory` flags as its one true `duplicate-guarded-export` collision (see Verification below), and it was already called out as an owner decision during the original PR#166 merge (`9b16ef56`).
Compounding this: `credit-admission.ts`'s real Postgres-backed `settle()` **does not** permanently consume the grant's balance — it decrements the transient reservation ledger back to (effectively) zero, identically to `release()` (confirmed via a real-Postgres reproduction: authorize $60 against a $100 grant, settle it, authorize another $60 against the same grant — it is admitted a second time). The TLA+ spec (`formal/credit-budget/CreditReservation.tla`) models `Settle` as permanently occupying the balance, so the formal proof does not actually cover this real behavior. This bug is currently unreachable (no production `CreditSnapshotStore` exists yet), and fixing it requires deciding which of the two ports is canonical first — attempting a point-fix on the dormant, possibly-to-be-deleted port risked wasted or contradictory work.
**Decision needed:** which port is the intended long-term design (or should they be merged into one), and whether `settle()`'s balance semantics should permanently consume the grant (matching the TLA+ model) or remain transient-only (current code) — both before S5 wires a real adapter to either one.

### B. Budget-hold sweeper lease-liveness gap (idempotency-concurrency finding 1 — medium)
`budget.ts:1034-1119`'s `sweepExpired` releases a stale HELD reservation based only on `ai_attempts` evidence, with no check on whether the owning invocation's execution lease is still live — it cannot distinguish "process crashed before dispatching" from "still RUNNING and about to dispatch the next fallback route." A slow-clean-failure sequence across permitted routes can leave an invocation RUNNING past its hold TTL with zero recorded attempts; a sweep pass in that window frees the hold while the invocation is still alive, letting a second actor reserve into the freed headroom and pushing total exposure over the window's cap.
**Verified still true after this session's resyncs:** `grep -rn sweepExpired apps/web/app/api` finds no cron call site, and the final `vercel.json` (after resolving this session's own two cron-entry conflicts) adds `drain-ai-telemetry-recovery`, `prune-rate-limits`, and `repair-checkout-attempts` — none of them wire `sweepExpired`. **This is not a currently-live risk; it is a fix-before-wiring-any-cron item.** Do not wire `sweepExpired` to a schedule until the lease-liveness check is added.

### C. Stale-data kill switch defaults OFF on public picks/board surfaces (freshness-staleness finding 1 — high)
`isPublicPicksSurfaceStale()` only runs when `gates.forceNoBetIfStale` is true, and `FORCE_NO_BET_IF_STALE` defaults to `false` (`platform-config.ts:175`). This is a deliberate, documented kill switch tied to a real prior incident and CLAUDE.md rule #5 — well-designed, just off by default, and fails *open* on both the disabled-gate path and any DB error while checking staleness. Whether picks/board surfaces should fail closed by default before more real-money-adjacent surfaces launch is a product-risk tradeoff (availability vs. never serving stale advice), not something to flip silently in a hardening pass. **Left unchanged** — flipping a production-facing default is exactly the kind of owner-authority-boundary-crossing action this pass was told not to take.

### D. NOVA source-runtime freshness classifier is fully built but never invoked (freshness-staleness finding 2 — low)
`scripts/nova/source-runtime-core.mjs`'s `receiptFreshness` (FRESH/STALE/INVALID) is implemented and schema-checked but called only in its own definition and its own test. No code under `apps/web` currently reads the NOVA source-runtime artifacts it would gate. The module's own docstring self-declares `Draft state: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED`. **Left as-is** — this is dead/unwired code with a real future obligation ("whoever wires a consumer must call `receiptFreshness` before trusting a receipt"), not a live defect; wiring it in speculatively without a real consumer would be scope creep beyond this pass.

### E. No migration baseline; CHECK constraints unverified in CI (schema-migration-safety findings 2 & 3 — high/medium)
The migrations directory has no baseline `CREATE TABLE` for the core schema (the earliest migration only ALTERs pre-existing tables) — `prisma migrate deploy` cannot bootstrap a genuinely empty Postgres from migration history alone; the schema has only ever been materialized via `prisma db push`. This is a pre-existing, self-documented limitation (`scripts/integration/settlement-outbox-acceptance.mjs` calls it out verbatim), not introduced by this wave, but this wave adds 9 more migrations on top of the same ungrounded history. Compounding it: CI's own Postgres step runs `prisma db push`, never `prisma migrate deploy` — so the CHECK constraints this wave's migrations add (e.g. `checkout_attempts_terminal_key_released_chk`) are **never applied or exercised in CI**, only in whatever ad hoc setup a developer uses locally. This session hit that gap directly: the disposable Postgres set up for this pass's own verification (see below) needed those CHECK constraints applied by hand, outside `db push`, before `checkout-attempt-db.integration.test.ts`'s CHECK-constraint test could pass.
**Decision needed:** whether to invest in a real baseline migration (a disruptive, repo-wide change with disaster-recovery implications) and/or wire `scripts/integration/settlement-outbox-acceptance.mjs` (or an equivalent `migrate deploy`-based CI step) into `.github/workflows/ci.yml`. Both are meaningful infrastructure changes with their own risk; left unchanged here as owner calls, not point-fixes.

### F. Watchlist alerts: inert seam converted to a real, cron-driven outbound-communication pipeline (owner-authority-boundaries finding 1 — low)
This branch wires `resend` (email) and `web-push` SDKs into what was previously a fully inert watchlist-alert seam, and registers a new daily Vercel cron (`deliver-settlement-alerts`) that will autonomously email/push-notify real, already-entitled, already-opted-in users once deployed. It is properly gated today: `WATCHLIST_ALERTS_ENABLED` defaults to `"false"` in `.env.example`, `RESEND_API_KEY`/`ALERTS_EMAIL_FROM`/VAPID keys are unset, the route is `CRON_SECRET`-authenticated, and this is transactional alerting to opted-in subscribers, not cold outreach. **No code change made** — this is flagged purely so the owner is aware that flipping one env var + populating keys (a routine "turn the feature on" action, not a code change) activates real sends with no per-batch human approval step, and can decide whether that's the intended launch posture.

## Verification ladder (real output, this session)

All of the following were run for real, synchronously, against the final HEAD in this worktree — not against the stale/truncated state the prior packet version was built from.

| Check | Result |
|---|---|
| `npm run db:generate` (Prisma client regen after the 4 branch resyncs) | Required — the client was stale post-resync, causing spurious `tsc` errors on `CheckoutAttempt` fields (`activeClientIntentId`, `subjectUserId`, etc.) that exist in `schema.prisma` but not yet in the generated client. Regenerated clean. |
| `npm run typecheck` (all 13 workspaces incl. `@sports/web`) | **Clean** — 0 errors, every workspace. |
| `formal-regression`: `npx tsc --noEmit` | **Clean** — 0 errors. |
| `npm run guardrails` (19 guardrail scripts + eval-contracts, incl. `ai-transport-import-boundary`, `secret-scan --all`, `ai-control-plane-sealing`) | **All green.** `secret-scan`: 4162 tracked files scanned (21 >2MB skipped), 0 hits. `ai-transport-import-boundary`: 1647 files, 0 violations (previously 4 — see Finding 2 above). |
| `npm run test:ai-transport-import-boundary` (guard's own fixture + mutation-test suite) | **8/8 pass**, incl. the permanent-vs-transitional allowlist-split assertion — confirms the allowlist fix didn't weaken the guard. |
| Full `apps/web` vitest suite (`npx vitest run`) | **661 files passed, 3 skipped; 9304 tests passed, 42 skipped; 0 failed.** Run to completion synchronously (219.9s), not left "still running." |
| Real-Postgres suites (disposable local Postgres, schema pushed + this wave's CHECK constraints applied by hand — see Owner Decision E) | `ai-control-plane-credit-admission.test.ts` (`FORCE_REAL_PRISMA=true`): **34/34 pass**, including the real 100-concurrent-`authorize()` atomicity proof (cap=$60.00, N=100 → exactly 60 admitted, 40 refused, 0 errors, ledger matches). `ai-control-plane-budget-pg.test.ts`: **12/12 pass**, including its own 100-concurrent-invocation cap proof. `checkout-attempt-db.integration.test.ts`: **5/6 pass, 1 correctly `runIf`-skipped** — including the CHECK-constraint test, which only passes once the migration's raw CHECK constraints are applied (db-push alone omits them; see Owner Decision E — this is the concrete manifestation of that gap, not a code defect: the underlying `checkout-attempt.ts` logic was never in question). `durable-write-store.test.ts`: **13/13 pass**. |
| `npm run nova:inventory` (re-run after the 4 branch resyncs) | `COMPLETE_COLLISIONS_FOUND`, 352 changed files (up from 332 pre-resync — the resyncs pulled in real file changes), 0 unparsed, **50 flagged items — byte-identical (diffed after sorting) to the pre-resync 61270eae report.** The resyncs introduced no new collisions. The 50 = 1 true `duplicate-guarded-export` (`CreditAuthorizationPort`, Owner Decision A above) + 49 `forbidden-prefix-outside-owner` naming-convention notes, both pre-existing and already accounted for. |
| `npm run nova:inventory:verify` | **OK** — receipt, committed artifacts, and re-derived artifacts agree. |

## Negative-proof section

Explicitly checked and found **not** to be a problem, with how it was checked (carried forward from the prior packet, independently consistent with this session's re-verification):

- **Authorization escalation / privilege boundary:** `TrustedActor` boundary (`apps/web/lib/auth/actor.ts`) — HUMAN actors only via session-derived requires, SERVICE/SYSTEM only via `resolveServiceActor()` with a hardcoded principal allowlist; raw actor-minting constructors are structurally fenced by `scripts/guardrails/actor-minting-boundary.mjs`, re-run clean in this session's `npm run guardrails` pass.
- **Emergency override abuse:** `EmergencyOverrideReceipt` verification fails closed on missing/expired/revoked/wrong-scope receipts; production receipt store is fail-closed, making `EMERGENCY_RELIABILITY` unreachable until a durable store ships.
- **NOVA Founder OS execution risk:** S1-S4 modules are read-only/no-execution — every classification carries `executionAuthority:false`; the cockpit page has no server actions, fetch, or mutation calls.
- **Live reachability of the new control plane:** `apps/web/lib/ai-control-plane` is imported into exactly one live route — the bearer-token-gated cron drain endpoint — confirmed via grep; executor/dispatch/invocation-pipeline are not otherwise wired into any user- or agent-reachable route in this branch.
- **Hardcoded/fabricated data:** dev/demo seed data is tagged and defense-in-depth excluded from the public `/api/picks` endpoint under `NODE_ENV=production`, pinned by two dedicated tests.
- **Secrets in the tree:** 0 hits across 4162 tracked files via `secret-scan.mjs --all`, re-run in this session.
- **Double-charge via concurrent `authorize()`:** re-verified end-to-end against a **real, disposable Postgres** in this session (not just code review, as the prior packet had to settle for) — 100 concurrent `authorize()` calls against a $60-capacity grant admit exactly 60, refuse 40, 0 errors, ledger balance matches exactly.
- **`sweepExpired` reachability:** re-confirmed no cron wires it after this session's own two `vercel.json` cron-entry merges (Owner Decision B).

## Merge order recommendation

Unchanged from the prior packet — the dependency order already exercised on this integration branch is sound and should be preserved on promotion to `main`:

1. PR#152 — docs/phase0-truth-convergence
2. PR#158 — feat/ai-control-plane-import-guard
3. PR#159 — security/trusted-actor-model
4. PR#160 — payments/durable-checkout-attempt
5. PR#161 — settlement/evidence-outbox
6. PR#162 — feat/ai-control-plane-contracts
7. PR#163 — feat/ai-control-plane-ledger
8. PR#164 — feat/ai-control-plane-budgets
9. PR#165 — nova/s1-domain-contracts
10. PR#166 — feat/ai-control-plane-credit-admission
11. PR#167 — nova/convergence-inventory-tooling
12. PR#168 — nova/s2-capability-governor
13. PR#169 — nova/s3-source-runtime
14. PR#170 — jarvis/genesis-kernel-recovery
15. PR#171 — feat/provider-hardening-registry
16. PR#172 — nova/s4-founder-os
17. labs/constellation-wave2-delta
18. labs/w2-01-seed-fix
19. labs/w2-02-formal-invariant-foundry
20. labs/w2-03-property-chaos-harness
21. labs/w2-04-context-compiler
22. labs/w2-prisma-migration-safety

**Unlike the prior packet, no step in this list is currently blocked** — the prior packet's blocking items on PR#164 (import-boundary CI) and PR#166 (credit-hold leak) are both resolved (see "Findings fixed" above). Owner Decisions A–F above do not block this merge order; they block, respectively: wiring a real S5 credit adapter (A), wiring `sweepExpired` to any cron (B), a product-risk call on the staleness kill switch default (C), nothing currently (D — dead code), CI infrastructure investment (E), and turning on real outbound alert sends (F) — all separate, later actions.

## What was explicitly NOT done (owner-authority boundary)

No merge to `main`. No deploy. No billing activation. No production database migration. No production secret or environment-variable change (including `FORCE_NO_BET_IF_STALE` and `WATCHLIST_ALERTS_ENABLED`). No wiring of `sweepExpired` to a cron schedule. No wiring of a real credit adapter (S5). No resolution of the duplicate-`CreditAuthorizationPort` architecture question (Owner Decision A) — only the small, unambiguous parts of the findings that surfaced it were fixed. No CI workflow changes. No outreach sent. This packet, the branch resyncs, and the fixes listed above are the deliverable — a fully-caught-up integration branch plus a synthesis for owner review — not an action taken on the owner's behalf. All six lettered decisions above require an explicit owner call before any corresponding code, configuration, or production change is made.
