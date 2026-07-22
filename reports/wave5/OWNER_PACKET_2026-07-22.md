# Wave 5 Owner Promotion Packet — 2026-07-22

**Branch:** `integration/gse-nova-control-plane-premerge-2026-07-22`
**HEAD:** `61270eaea6ada28f2171440945345a0f45c0719e`
**Worktree:** `/workspace/wt/wave5-integration`

## What this is

This packet synthesizes the Wave 5 cumulative-integration effort for the Beexly/Sports GSE, NOVA, and CONSTELLATION hardening initiative: 16 PRs (#152, #158–#172) and 6 lab/W2 branches (`w2-01-seed-fix`, `w2-02-formal-invariant-foundry`, `w2-03-property-chaos-harness`, `w2-04-context-compiler`, `constellation-wave2-delta`, `w2-prisma-migration-safety`) were merged in dependency order onto one integration branch, followed by two post-merge repair commits (a stale-test fix and a formal-regression import repoint) and a final re-run of the NOVA convergence-inventory tool against the fully-integrated tree. Twelve adversarial-lens reviews were commissioned against the integrated branch; **six full lens reports were available to this synthesis** (money safety, idempotency/concurrency, authority/authorization, data fabrication, secrets & AI-transport import boundary, data freshness/staleness — the last was truncated mid-finding in the material handed to this step). **The other six lenses' reports were not present in the input this packet was built from** and are not summarized below — see the caveat in the lens section. The dedicated integration build/verification-ladder report was still running (no completion output) at the time this packet was written, so this packet's verification numbers come from direct, independently-reproduced spot-checks (guardrail scripts, `git merge-base`, source reads) rather than from that report.

State: **NOT_CUMULATIVELY_VALIDATED until the owner reviews this packet.** Nothing in this branch has been merged to `main`, deployed, or activated. Production code paths that this work touches remain fail-closed (sealed executor, `failClosedCreditAuthorizationPort`, `failClosedReceiptStore`) — the new AI control-plane is not yet wired into any user- or agent-reachable route except a bearer-token-gated cron drain endpoint.

## Decisions needed (ranked)

### 1. Credit-hold leak in the executor — re-sync PR#166 before wiring a real credit adapter (HIGH, money safety)
`apps/web/lib/ai-control-plane/executor.ts:333` takes a `CreditAuthorizationPort.authorizeAndReserve()` hold for every `CONFIRMED_CREDITS_ONLY` invocation. Verified directly: this is the **only** call site for `authorizeAndReserve` in the codebase (`credit-port.ts:60/82`, `internal.ts:136`) — there is no settle/release/reconcile call anywhere for it, and it duplicates the independent per-route reservation system already in `invocation-pipeline.ts`/`credit-admission.ts`. This is dormant today only because `sealedProductionExecutor()` wires `credit: failClosedCreditAuthorizationPort`, which always throws — but the branch's own comments (executor.ts:326) mark wiring a real adapter as "S5," the explicit next step. The fix already exists upstream: commit `58ea76e4` on `feat/ai-control-plane-credit-admission` ("Executor credit-hold leak... every outcome left the reservation HELD forever") adds the missing lifecycle and collapses the duplicate reservation layer — but `git merge-base --is-ancestor 58ea76e4 HEAD` returns **NO** in this worktree (verified directly). Wave 5 merged PR#166 at `9b16ef56`, an earlier point on that branch, before the fix landed.
**Why the owner must decide:** this determines whether S5 (real NOVA credit adapter) is allowed to start, and re-syncing a merged PR's branch after divergence is a judgment call about how to sequence a fast-follow.
**Options:** (a) re-sync/cherry-pick `58ea76e4` into PR#166 before merging it to `main`, or as an immediate fast-follow PR merged before any S5 work begins; (b) merge PR#166 as-is and hard-block S5 (real adapter wiring) with an explicit gate until the fix lands. **Recommendation:** (a) — the fix is small, already written and reviewed on the source branch, and re-syncing now is cheaper than leaving a dangling landmine that only self-detonates once someone wires a real adapter and won't notice the missing settle call in review.

### 2. AI-transport import boundary is currently failing CI (HIGH, secrets/boundary)
`apps/web/lib/ai-control-plane/dispatch.ts:33-49` imports the raw Claude transport (`callClaudeMessages`) and all three raw provider clients (bedrock, vertex, cerebras) directly, bypassing the sanctioned-adapter allowlist. Verified directly: `node scripts/guardrails/ai-transport-import-boundary.mjs` on this exact HEAD reports **4 violations** (dispatch.ts:33, :34, :40, :46) and **exits 1**. This gate is wired into `.github/workflows/ci.yml:245-267` as its own CI job and into the aggregate `npm run guardrails` (`package.json:72`) — so the integration branch as it stands fails CI. `dispatch.ts` is not yet imported anywhere else in the repo (grep confirms), so this is not an active data-exfiltration path today, but it is a real, currently-red gate.
**Why the owner must decide:** widening or adjusting a security-boundary allowlist is exactly the kind of change that shouldn't be made unilaterally by whoever notices the CI failure — it changes what the AI-transport guard permits going forward.
**Options:** (a) add `dispatch.ts` to the guard's `TRANSITIONAL_ALLOWLIST` with a tracked follow-up to route it through `callClaude`/provider-dispatch once it's live; (b) refactor `dispatch.ts` now to go through the sanctioned adapter before this merges anywhere. **Recommendation:** (b) if there's any near-term plan to wire `dispatch.ts` into a live route (the file's own purpose is "exact provider dispatch," i.e., it's meant to go live); (a) only as a stopgap with a hard tracking item, since the guard's own header text already anticipated this exact gap and it was never closed.

### 3. Stale-data kill switch defaults OFF on public picks/board surfaces (HIGH, data freshness)
`isPublicPicksSurfaceStale()` — the only freshness check protecting `apps/web/app/api/picks/route.ts:31`, `apps/web/app/api/picks/daily-slate/route.ts:27`, and `apps/web/lib/board/passes.ts:37-44` — only runs when `gates.forceNoBetIfStale` is true, and `FORCE_NO_BET_IF_STALE` defaults to `false` (verified directly at `packages/prediction-engine/src/platform-config.ts:175`). The code and comments (`passes.ts:37-40`, `route.ts:25-30`) show this is a deliberate, documented kill switch tied to a real 2026-07-10 incident and CLAUDE.md rule #5 — it is well-designed, it's just off by default, and it fails *open* (serves data) on both the disabled-gate path and on any DB error while checking staleness.
**Why the owner must decide:** whether picks/board surfaces should fail closed by default before more real-money-adjacent surfaces launch on this data path is a product-risk tradeoff (availability vs. never serving stale advice), not something to flip silently in a hardening PR.
**Options:** (a) flip `FORCE_NO_BET_IF_STALE` default to `true` now, accepting that a transient ingestion blip will show the 503/empty-state path more often; (b) leave default off and rely on ops to set the env var per-environment, documenting that explicitly as the launch checklist item it currently isn't. **Recommendation:** (a) before any wave that exposes this surface to real users at higher trust/stakes than today — the kill switch clearly exists for exactly this reason and shipping it "off" by default undermines its purpose.

### 4. Budget-hold sweeper race is dormant but one cron away from live (MEDIUM, idempotency)
`apps/web/lib/ai-control-plane/budget.ts:1034-1119` (`sweepExpired`) releases a reservation based only on `ai_attempts` evidence (`mustHold` check at :1064-1069), with no check on whether the owning invocation's execution lease is still live. A slow-clean-failure sequence across permitted routes (invocation-pipeline.ts:535-838) can leave an invocation RUNNING past its 15-minute hold TTL (`DEFAULT_HOLD_TTL_MS`, invocation-pipeline.ts:239) with zero recorded attempts, at which point a sweep pass frees the hold while the invocation is still alive and about to dispatch — letting a second actor reserve into the same freed headroom and pushing total exposure on the window over its cap. `apps/web/__tests__/ai-control-plane-budget.test.ts:906-915` shows this is the intended (if flawed) model, treating RUNNING-with-no-evidence as proof of crash. Verified: `sweepExpired` is exported (`internal.ts:116`) but grep finds **no cron route currently calling it** in this branch — the race isn't reachable yet.
**Why the owner must decide:** this needs a design call (lease-aware sweeping vs. a different staleness signal) before the sweeper is wired to a schedule, not a quick patch after the fact.
**Options:** (a) fix `mustHold`/`sweepExpired` to also check the invocation's lease liveness before release, then wire the cron; (b) wire the cron now and accept the (currently theoretical) race as a known limitation. **Recommendation:** (a) — do not wire `sweepExpired` to any schedule until it checks lease liveness; the fix is well-scoped and the current code's own docstring already frames this function as a safety net, so shipping it un-fixed defeats the point.

### 5. Credit worst-case math uses floating point instead of the codebase's exact-decimal convention (MEDIUM, money safety)
`apps/web/lib/ai-control-plane/invocation-pipeline.ts:561` and `:717` both compute credit authorization/settlement amounts via `Math.round(plan.maxVendorCashUsd * 100)` rather than the `usdToMicros`/BigInt exact-decimal pattern `budget.ts` uses everywhere else money is handled. Both call sites recompute the same float expression independently, so it's self-consistent (not a double-charge vector by itself), but it's a real precision gap that could round a value ±1 minor unit off the true cap near IEEE-754 boundaries.
**Why the owner must decide:** low urgency (same fail-closed gating as #1 keeps this unreachable today), but it should be scheduled as a fix before the credit path goes live, and bundling it with #1's re-sync is a reasonable sequencing call only the owner can bless.
**Options:** (a) fix now as part of the #1 re-sync; (b) track separately as a pre-launch item for the credit path. **Recommendation:** (a) — same file family, same unlock condition (S5), cheap to fix together.

## Verification summary

The dedicated integration-build verification-ladder report had not completed (no output beyond "still running") as of this packet. The following counts were reproduced directly against this worktree's HEAD (`61270eae`) as part of this synthesis, or are cited from lens reports whose authors described running the same commands:

| Check | Result | How verified |
|---|---|---|
| `scripts/guardrails/secret-scan.mjs --all` | **OK** — 4143 tracked files scanned, 0 hits (21 files >2MB skipped, manually confirmed non-secret media/CSV) | Reproduced directly in this synthesis |
| `scripts/guardrails/actor-minting-boundary.mjs` | **OK** — 1576 files scanned, no raw actor minting outside the boundary | Reproduced directly in this synthesis |
| `scripts/guardrails/ai-transport-import-boundary.mjs` | **FAIL, exit 1** — 4 violations, all in `dispatch.ts` | Reproduced directly in this synthesis (see Decision #2) |
| `deps.credit.authorizeAndReserve` call sites | Exactly 1 (executor.ts:333), no settle/release anywhere | Reproduced directly in this synthesis (grep across `apps/web/lib/ai-control-plane`) |
| `git merge-base --is-ancestor 58ea76e4 HEAD` | **NO** — fix commit not in this branch's history | Reproduced directly in this synthesis |
| `sweepExpired` wired to a live cron route | **No caller found** outside tests/exports | Reproduced directly in this synthesis |
| `__tests__/ai-control-plane-authority.test.ts` | 71/71 passed | Cited from authority-authorization lens (ran `npx vitest run` directly per that report) |
| `__tests__/council-ledgers.test.ts` | 48/48 passed | Cited from authority-authorization lens |
| `__tests__/ai-control-plane-credit-admission.test.ts` | 32 passed, 2 skipped (require live Postgres, unavailable in-environment) | Cited from authority-authorization lens |
| `scripts/guardrails/actor-minting-boundary.mjs` (authority lens run) | OK — 1576 files scanned | Cited from authority-authorization lens; matches the independent re-run above |
| Formal-regression harness (`formal-regression/`) | 22/24 tests pass (2 skipped), `tsc --noEmit` clean | Cited from data-fabrication lens (ran `npx vitest run` directly per that report) |
| NOVA convergence-inventory verify (`scripts/nova/verify-convergence-inventory.mjs`, both single- and multi-head) | OK — receipt, committed artifacts, and re-derived artifacts agree | Cited from data-fabrication lens; a spot-checked commit SHA independently resolved via `git cat-file -t` |
| Formal TLC receipts (`InvocationClaim`, `CreditReservation`) | Genuine TLC transcripts, honest provenance including a caught-and-fixed counterexample | Cited from data-fabrication lens |

## Adversarial lens results

**Caveat:** only 6 of the 12 commissioned lens reports were present in the material this packet was synthesized from (the 6th — data freshness — was truncated mid-finding). The other 6 lenses' names/keys were not provided to this synthesis step and are not summarized below; this packet cannot claim full 12-lens coverage until those are supplied and folded in.

1. **money-safety** — 2 findings: 1 high (executor credit-hold leak / duplicate reservation system, executor.ts:321-341 — see Decision #1), 1 medium (float-precision credit math, invocation-pipeline.ts:561/717 — see Decision #5).
2. **idempotency-concurrency** — 1 finding: 1 medium (budget-hold sweeper race, budget.ts:1034-1119 — see Decision #4). All other claim/reservation/authorization paths (reserve/settle/release, credit-admission ledger, control-store leases, settlement-outbox leases, checkout-attempt convergence, reconcile-entitlements) inspected and found sound.
3. **authority-authorization** — 0 findings. One latent defense-in-depth gap noted but not reported as exploitable: `ledgers-core.ts`'s `reviewSubagentRunAs()` checks actor type but not `authorityScope`; the only production caller (`ledgers.ts`) already gates with `requireAdminActor()` first, so it's not currently reachable.
4. **data-fabrication** — 0 findings. TLC receipts, convergence-inventory receipts, formal-regression pass counts, and the S4 Founder OS cockpit were all independently re-run/re-derived and matched their claims; no hardcoded/fabricated stats found.
5. **secrets-and-boundaries** — 1 finding: 1 high (AI-transport import boundary bypass in dispatch.ts:33-49, currently failing CI — see Decision #2). Secret scan clean across all 4143 tracked files.
6. **data-freshness** — at least 1 high finding (stale-data kill switch defaults off across `apps/web/app/api/picks/route.ts:31`, `apps/web/app/api/picks/daily-slate/route.ts:27`, `apps/web/lib/board/passes.ts:37-44` — see Decision #3). The source report text was truncated after this first finding in the material provided to this synthesis, so this lens may contain additional findings not captured here.
7–12. **Not available to this synthesis** — six lens reports were expected per the task framing but were not present in the input. Do not treat their absence as "no findings" — it means "not reviewed here."

## Negative-proof section

Explicitly checked and found **not** to be a problem, with how it was checked:

- **Authorization escalation / privilege boundary:** `TrustedActor` boundary (`apps/web/lib/auth/actor.ts`) — HUMAN actors only via session-derived requires, SERVICE/SYSTEM only via `resolveServiceActor()` with a hardcoded principal allowlist; raw actor-minting constructors are structurally fenced by `scripts/guardrails/actor-minting-boundary.mjs`, independently re-run in this synthesis with a clean result (1576 files, 0 violations).
- **Emergency override abuse:** `EmergencyOverrideReceipt` verification fails closed on missing/expired/revoked/wrong-scope receipts and structurally re-validates the approving actor is HUMAN/SESSION/ADMIN; production receipt store is fail-closed, making `EMERGENCY_RELIABILITY` unreachable until a durable store ships.
- **NOVA Founder OS execution risk:** S1-S4 modules (`founder-command.ts`, `nova-agent.ts`, `capability-governor.ts`) are read-only/no-execution — `classifyFounderWork` only escalates (never de-escalates), every classification type carries `executionAuthority:false`, and the cockpit page has no server actions, fetch, or mutation calls.
- **Live reachability of the new control plane:** `apps/web/lib/ai-control-plane` is imported into exactly one live route — the bearer-token-gated cron drain endpoint (`lib/cron/authorize.ts`, constant-time compare) — confirmed via grep; executor/dispatch/invocation-pipeline are not otherwise wired into any user- or agent-reachable route in this branch.
- **Hardcoded/fabricated data:** dev/demo seed data (`packages/db/prisma/seed.ts`) is tagged `modelVersion='v5.0.0-seed'` and defense-in-depth excluded from the public `/api/picks` endpoint under `NODE_ENV=production`, pinned by two dedicated tests; the S1 conformance fixture is clearly labeled synthetic; no fabricated formal-verification claims found.
- **Secrets in the tree:** 0 hits across all 4143 tracked files via `secret-scan.mjs --all`, independently re-run in this synthesis; 21 size-skipped files manually confirmed non-secret.
- **Double-charge via concurrent authorize():** `credit-admission.ts`'s `authorize()` uses a single atomic conditional UPDATE against a per-grant reservation ledger — no read-then-write race — per direct code review; 2 of the module's own concurrent-Postgres tests could not be re-verified in this environment (no live Postgres available) and remain untested end-to-end.

## Merge order recommendation

If/when the owner approves promotion to `main`, the dependency order already exercised on this integration branch is sound and should be preserved:

1. PR#152 — docs/phase0-truth-convergence
2. PR#158 — feat/ai-control-plane-import-guard
3. PR#159 — security/trusted-actor-model
4. PR#160 — payments/durable-checkout-attempt
5. PR#161 — settlement/evidence-outbox
6. PR#162 — feat/ai-control-plane-contracts
7. PR#163 — feat/ai-control-plane-ledger
8. PR#164 — feat/ai-control-plane-budgets — **fix Decision #2 (import-boundary allowlist/refactor) before or as part of this merge; CI will not go green otherwise.**
9. PR#165 — nova/s1-domain-contracts
10. **PR#166 — feat/ai-control-plane-credit-admission — DO NOT MERGE AS-IS. Re-sync with commit `58ea76e4` (executor credit-hold-leak fix) first, per Decision #1.**
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

Everything else in this list is otherwise clear to merge in this order once #2 and #1 are resolved — no other PR or lab branch was flagged by any of the 6 available lenses as blocking. Decision #4 (sweeper lease check) and #5 (float precision) do not block merge order; they block turning on the sweeper cron and the real credit adapter, respectively, which are both separate follow-on actions after merge.

## What was explicitly NOT done (owner-authority boundary)

No merge to `main`. No deploy. No billing activation. No production database migration. No production secret or environment-variable change (including `FORCE_NO_BET_IF_STALE`). No wiring of `sweepExpired` to a cron schedule. No wiring of a real credit adapter (S5). No outreach sent. This packet is the deliverable — a synthesis for owner review — not an action taken on the owner's behalf. All five ranked decisions above require an explicit owner call before any corresponding code or configuration change is made.
