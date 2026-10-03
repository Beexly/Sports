# Live PR Registry — 2026-07-22

**Status vocabulary is deliberate.** The words "shipped" and "landed" are
banned for unmerged work. The canonical draft-state labels (freeze hardening
addendum §A1) are:

- `IMPLEMENTED_ON_DRAFT_BRANCH`
- `CI_GREEN_IN_ISOLATION`
- `NOT_MERGED`
- `NOT_CUMULATIVELY_VALIDATED`
- `NOT_PRODUCTION_ACTIVE`

All work below carries `IMPLEMENTED_ON_DRAFT_BRANCH`, `NOT_MERGED`,
`NOT_CUMULATIVELY_VALIDATED`, and `NOT_PRODUCTION_ACTIVE`; a branch whose own
CI passed additionally carries `CI_GREEN_IN_ISOLATION`. (The earlier label
`NOT_STACK_VALIDATED` is superseded by `NOT_CUMULATIVELY_VALIDATED`.) Every
branch was cut from the same pre-merge `main` (`c19a00d`) and none has been
rebased and tested sequentially against the others. Several touch the same
infrastructure families (CI, Prisma, settlement, auth, AI control plane), so
isolation-green does not imply combined correctness.

`main` head at time of writing: **`c19a00d`** (unchanged — nothing in this stack
is merged).

## Registry

| PR | Branch @ head | Base | State | CI (isolation) | Depends on | Overlaps | Disposition |
|----|---------------|------|-------|----------------|------------|----------|-------------|
| ~~#144~~ | `claude/watchlist-alert-channels` @ `5449299b6c23` | main | **closed, unmerged** | n/a | — | **#157** (same settlement fn, schema, cron, tests) | `SUPERSEDED` — converged into #161's outbox design |
| #146 | `codex/nova-ai-opportunity-engine-2026-07-21` @ `fbc3cfe0ccea` | main | open/draft | green (NOVA verify) | — | conceptual: credit/telemetry/persistence/Founder OS vs #148/#151 | `FREEZE_AND_SPLIT` — reference/integration branch; split into 6 units (see addendum) |
| #148 | `feat/cost-policy` @ `1ebc993a1d2a` | main | open/draft | not re-verified this cycle | — | AI economic policy vs control-plane stack | `EVIDENCE_SOURCE` — remains open as evidence/test source until corrected #162/#163 map every retained unit, then close |
| ~~#149~~ | `docs/integrations-wave8` @ `5f0c0842d30f` | main | **closed, unmerged** | n/a (docs) | — | superseded master plan | `ARCHIVED` — research archived; plan superseded |
| #150 | `feat/command-usage-telemetry` @ `b5a8c95b61dd` | main | open/draft | not re-verified this cycle | — | may later feed NOVA capability ledger | `PARKED` — optional tooling, not a blocker |
| #151 | `feat/dispatch-telemetry` @ `a741f3c009b8` | **`feat/cost-policy` (#148)** | open/draft | not re-verified this cycle | **stacked on #148** | one dispatch record ≠ multi-attempt ledger; provider/payer conflation | `EVIDENCE_SOURCE` — same closure condition as #148 |
| #152 | `docs/phase0-truth-convergence-2026-07-21` @ `aa61929…` | main | open/draft | green (13/13) | — | this registry lives here | `TRUTH_BRANCH` — the truth/control-document branch; receives the freeze hardening addendum |
| #153 | `fix/ci-postgres-health` @ `61fd7dc7c5ae` | main | open/draft | **green** | — | CI workflow vs #158 job add | `SAFE_AFTER_REBASE` — safe merge candidate after ordinary rebase; owner-merge first |
| #154 | `fix/hash-validation` @ `e498cdf8e00a` | main | open/draft | **green** | after #153 | — | `SAFE_AFTER_REBASE` — safe candidate after #153, re-verify |
| ~~#155~~ | `security/actor-boundaries` @ `6b7f57cb7702` | main | **closed, unmerged** | n/a | — | shared actor identity | `SUPERSEDED` by #159 (closure comment maps all 6 gaps) |
| ~~#156~~ | `payments/checkout-attempt-idempotency` @ `9a7c9dcb8885` | main | **closed, unmerged** | n/a | — | shared idempotency/outbox | `SUPERSEDED` by #160 (closure comment maps all 5 gaps) |
| ~~#157~~ | `settlement/missing-score-quarantine` @ `2403468b7ba6` | main | **closed, unmerged** | n/a | — | **#144** | `SUPERSEDED` by #161 (converged with #144) |
| #158 | `feat/ai-control-plane-import-guard` @ `39bd416` | main | open/draft | **green** (AST rewrite) | — | CI job vs #153 | `CORRECT_BEFORE_OWNER_PACKET` — close namespace/default/export-star/barrel bypasses; post-migration allowlist flip (directive §7) |
| #159 | `security/trusted-actor-model` @ `ef80280` | main | open/draft | **green** (67 tests) | — | shared actor identity; #162 consumes | `CORRECT_BEFORE_OWNER_PACKET` — anonymous-report limiter bypassable; SERVICE/SYSTEM constructors ungoverned; audit fields not fully persisted (directive §4) |
| #160 | `payments/durable-checkout-attempt` @ `6bf296f` | main | open/draft | **green** (91 tests) | — | Stripe checkout path | `CORRECT_BEFORE_OWNER_PACKET` — missing production migration; fail-open DB lookup; ambiguous Stripe errors marked FAILED; clientIntentId erasure (directive §5) |
| #161 | `settlement/evidence-outbox` @ `034fdf3` | main | open/draft | guardrails/build green; full tests verified locally | — | converges #144+#157 | `CORRECT_BEFORE_OWNER_PACKET` — random per-call runId defeats retry dedup; cascade FKs erase evidence; DELIVERED on failed deliveries; stale-claim attempt overrun (directive §6) |
| #162 | `feat/ai-control-plane-contracts` @ `2392d5c` | main | open/draft | **green** (62 tests) | #159 (actor swap) | control-plane stack base | `CORRECT_BEFORE_OWNER_PACKET` — caller-authored policy must invert to registry-owned; seal production dependencies; replace ActorRef (directive §8) |
| #163 | `feat/ai-control-plane-ledger` @ `b9d0d05` | #162 | open/draft | **green** (80 tests) | stacked on #162 | invocation/attempt/attribution | `CORRECT_BEFORE_OWNER_PACKET` — concurrent idempotency race double-dispatches; RUNNING replay dispatches again; default dispatcher ignores selected provider (directive §9) |
| #164 | `feat/ai-control-plane-budgets` @ `f1d85d2` | #163 | open/draft | **green** (96 unit + 20 integration) | stacked on #163 | budget windows/reservations | `CORRECT_BEFORE_OWNER_PACKET` — AMBIGUOUS releases cash hold; settlement can exceed hold, no DB cap invariant; zero-dollar cap can authorize billable call (directive §10) |
| #165 | `nova/s1-domain-contracts` @ `2feafc1` | main | open/draft | not re-verified this cycle | freeze §4 (S1: none) | NOVA S1 contracts incl. `CreditGrantState` | `S1_DRAFT` — canonical credit vocabulary source for PR-D; pure TS, zero Prisma per S1 gate |
| #166 | `feat/ai-control-plane-credit-admission` @ `785886a` | main | open/draft | not re-verified this cycle | **#165 (S1)**; S5 for activation | PR-D credit admission | `PR_D_DRAFT_DORMANT` — fail-closed admission against S1 contracts + fake adapter only; `CONFIRMED_CREDITS_ONLY` unreachable until real S5 adapter (addendum §A2) |
| ~~#147~~ | `claude/ecc-gse-gsn-commands-…` | main | **closed, unmerged** | n/a | — | — | `SUPERSEDED` by #153–#157 (closure comment maps all five) |
| ~~#145~~ | (source branch) | main | **closed, unmerged** | n/a | — | — | `SUPERSEDED` — see PR145_COMPLETE_DISPOSITION |

> Out-of-scope open drafts not covered by this directive but present in the repo
> (recorded for completeness, no disposition assigned here): #52, #112, #121,
> #123, #124, #125, #127, #129, #130. These predate the GSE convergence
> directive and are tracked separately.

## Revised merge posture (hardening directive §18)

**Do not authorize the current merge train yet.** Nothing is merged; `main` is
still `c19a00d`.

### Safe candidates after ordinary rebase

- **#153**, **#154** — the only near-term owner merge candidates, and only
  after rebase onto current `main` and a full cumulative verification ladder
  (Prisma generate/validate, disposable-DB migration apply, lint, typecheck,
  all workspace tests, all guardrails, production build).

### Must be corrected before the owner merge packet

- **#158, #159, #160, #161, #162, #163, #164** — each carries confirmed
  load-bearing defects (per-PR rows above; directive §4–§10). None may be
  marked ready or proposed for merge as currently written. Isolation-green CI
  does not waive these gates.

### Reference / archive

- **#146** remains open and unmerged as the integration/reference branch for
  the S1–S6 split.
- **#148 / #151** remain open as evidence/test sources until corrected
  #162/#163 map every retained unit, then close.
- **#150** remains parked optional tooling.
- **#152** remains the truth/control-document branch and receives the freeze
  hardening addendum.

The eventual owner merge packet proposes a sequential order **only after the
cumulative pre-merge integration branch
(`integration/gse-nova-control-plane-premerge-2026-07-22`) is green** across
the full proof ladder (directive §15).

## Evidence honesty

NOVA live-source validation remains **`FAILED_CLOSED`**. The supplied ecosystem
snapshot records that no live source receipt existed, and the validation report
records that the command produced no receipt. No reproducible immutable receipt
has been produced since. Do not describe NOVA source validation as passing.

---

## 2026-07-22 addendum — C0 truth registration (append-only)

Appended by the CONSTELLATION §15-C0 unit. Rows and notes above are NOT
rewritten; this section supersedes only the specific heads it names. All heads
below were verified live via `git ls-remote origin` and the GitHub PR list on
2026-07-22. `main` remains **`c19a00d`** (re-verified). All rows carry
`IMPLEMENTED_ON_DRAFT_BRANCH`, `NOT_MERGED`, `NOT_CUMULATIVELY_VALIDATED`,
`NOT_PRODUCTION_ACTIVE`.

### New rows

| PR | Branch @ head (verified) | Base | State | Disposition |
|----|--------------------------|------|-------|-------------|
| #167 | `nova/convergence-inventory-tooling` @ `5c5d754` | main | open/draft | NOVA deterministic convergence inventory + receipt tooling; launched this wave |
| #168 | `nova/s2-capability-governor` @ `225a64b` | main | open/draft | NOVA S2 — capability inventory + governor (freeze §4, precondition S1/#165); launched this wave |
| #169 | `nova/s3-source-runtime` @ `a7e2c1a` | main | open/draft | NOVA S3 — source registry/runtime with failed-closed evidence receipts (freeze §4); launched this wave |
| #170 | `jarvis/genesis-kernel-recovery` @ `bbb7f9f` | main | open/draft | Genesis Kernel plan-compiler recovery (J lane). The C0 tasking listed this branch as "PR pending"; verification found the PR already open as **#170** |

### Head refreshes (branches whose heads moved since the table above)

| PR | Old head (table above) | New head (verified 2026-07-22) | Why |
|----|------------------------|--------------------------------|-----|
| #152 | `aa61929` | `098fbf3` | freeze hardening addendum committed to the truth branch |
| #158 | `39bd416` | `9c1218f` | correction work on the import guard |
| #159 | `ef80280` | `afa2792` | Phase 1A hardening corrections |
| #160 | `6bf296f` | `52d7dba` | Phase 1P hardening corrections |
| #162 | `2392d5c` | `4c8af90` | **head moved: authority inversion (caller-authored → registry-owned policy) + adversarial-review fixes** |
| #165 | `2feafc1` | `d52e3c9` | S1 contract work continued (14.1 in progress) |

Unchanged heads re-verified: #161 `034fdf3`, #163 `b9d0d05`, #164 `f1d85d2`,
#166 `785886a`, #146 `fbc3cfe`, #153 `61fd7dc`, #154 `e498cdf`.

New heads are drafts like everything else here: a moved head does NOT imply
re-verified CI; per-PR `CORRECT_BEFORE_OWNER_PACKET` gates in the table above
remain open until their recovery units report with receipts. See
`CONSTELLATION_MASTER_PLAN_REGISTRATION_2026-07-22.md` §4 for the 14.x
correction mapping.
