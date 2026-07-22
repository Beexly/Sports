# Owner Decision Packet — 2026-07-22

Supersedes the status sections of `OWNER_DECISION_PACKET_2026-07-21.md` (that
document's analysis stands; its "not yet begun" status lines are historical).
`main` is still **`c19a00d`** — nothing in any of the work below is merged,
deployed, migrated to production, billed, applied, or sent.

## 1. What was built and proven this session (all draft, all CI-green in isolation)

### Phase 1 remediation — safe correctness/security fixes
| PR | Unit | Evidence |
|----|------|----------|
| #153 | CI Postgres health | green; stack-validated with #154 (0 conflicts) |
| #154 | Hash hex/length validation | green; 12 tests |
| #158 | AI **transport** import boundary (AST, exact allowlist, fixtures) | green; mutation suite 5/5; overclaim corrected |
| #159 | Trusted actor model (HUMAN\|SERVICE\|SYSTEM) | green; 67 tests; spoofing made unrepresentable; disposable-PG proof |
| #160 | Durable CheckoutAttempt | green; 91 tests; race convergence via real P2002; PG constraint proof |
| #161 | Settlement evidence + transactional outbox (converges #144) | green; 143 pipeline + 8413 apps/web tests; 4 uniques **constraint-proven on Postgres** |
| #152 | Phase 0/1 truth docs + this packet | green (docs) |

Closed as superseded (replacement exists + green, closure comment maps every unit):
**#145, #147, #149, #155→#159, #156→#160, #157→#161, #144→#161.**

### Phase 2 — provider-neutral AI control plane (additive, DORMANT — imported by no runtime path)
Built to the spec in `AI_CONTROL_PLANE_DESIGN_2026-07-22.md`, stacked A→B→C:

| PR | Base | Unit | Hard guarantee proven |
|----|------|------|-----------------------|
| #162 | main | PR-A: task contracts + cost-mode resolver | **production + unset `LLM_COST_MODE` → deploy-failing `ConfigurationError`; never cash-capable.** 62 tests. |
| #163 | #162 | PR-B: invocation/attempt/attribution ledger + `executeAiTask` facade | **#151 fixed at compile time** — `AttributionCreateInput` has no `reconciledLabel`/`billedUsd`, so dispatch physically cannot write a confirmed-payment claim; failed provider is its own attempt row, never "serves". **Telemetry failure never retries a paid call.** 80 tests. |
| #164 | #163 | PR-C: atomic budget reservations | **100 concurrent reservations vs cap-60 → exactly 60 authorized, 40 blocked, `reserved+settled ≤ cap` holds** (real Postgres); single conditional `UPDATE`, not read-then-write; unknown pricing fails closed for billable modes. 96 unit + 20 integration tests. |

## 2. Decisions required from the owner (the two that gate everything downstream)

### Decision A — the merge train (all engineering is done; only merges remain)
Recommended order (each: rebase → full CI ladder → owner merge → rebase the rest):
1. **#153** (CI health) — lowest risk, unlocks nothing else.
2. **#154** (hash) — after #153.
3. **#158** (transport guard) — independent.
4. **#159 / #160 / #161** — the security/payment/settlement trio; independently reviewable.
5. **#162 → #163 → #164** — the Phase 2 stack, **in stack order** (each PR's base is the prior).

I have **not** merged, marked ready, or requested review on any of these — they are drafts awaiting your authority.

### Decision B — unblock PR-D / PR-E (Phase 2 cannot proceed autonomously past PR-C)
- **PR-D (credit truth)** must consume NOVA's (#146) credit-program lifecycle. Building it now would invent the parallel credit schema the governing directive forbids. **It is blocked on the #146 freeze-and-split decision** (which shared credit/telemetry/persistence models NOVA owns). The split plan is in `PHASE1_EXECUTION_ADDENDUM_2026-07-22.md` §4 and the #146 comment — it needs your go-ahead.
- **PR-E (provider hardening)** begins **live call-site migration** (routing existing `callClaude` callers through `executeAiTask`) — the first non-dormant, behavior-changing step. That is an explicit owner-authority boundary. It should follow PR-D and a decision to activate the control plane.

## 3. What stays true regardless

- `main` = `c19a00d`. No merge/deploy/migration/billing/outreach occurred.
- NOVA live-source validation remains **`FAILED_CLOSED`**.
- The control plane is dormant: `executeAiTask` exists, is fully tested, and is imported by nobody — activating it (migrating call sites, enabling a billable cost mode) is entirely your decision.
- Every "confirmed credit / cash charged" label remains writable only by a post-billing reconciliation that does not yet exist (PR-D+), so no code can currently assert that credits or cash paid for anything.

## 4. Honest caveats carried forward
- #160: workspace `db:push` env quirk (pre-existing, not introduced); `npx prisma db push` in `packages/db` with both URLs works.
- #161: push delivery is at-least-once by design (settlement itself exactly-once); cron routes tested at worker-module level.
- Phase 2 CHECK constraints live in the additive `migration.sql` files only (Prisma `db:push` from `schema.prisma` cannot express them) — same pattern as the existing OddsLineSnapshot/Watchlist tables. A production apply must run the migrations, not `db:push`.
