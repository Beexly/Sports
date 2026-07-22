# Live PR Registry — 2026-07-22

**Status vocabulary is deliberate.** A branch that passes CI on its own head is
`CI_GREEN_IN_ISOLATION`. It is **not** "shipped", "landed", "merged", or
"integrated". All work below is `IMPLEMENTED_ON_DRAFT_BRANCH` and
`NOT_STACK_VALIDATED` — every branch was cut from the same pre-merge `main`
(`c19a00d`) and none has been rebased and tested sequentially against the
others. Several touch the same infrastructure families (CI, Prisma, settlement,
auth, AI control plane), so isolation-green does not imply combined correctness.

`main` head at time of writing: **`c19a00d`** (unchanged — nothing in this stack
is merged).

## Registry

| PR | Branch @ head | Base | State | CI (isolation) | Depends on | Overlaps | Disposition |
|----|---------------|------|-------|----------------|------------|----------|-------------|
| #144 | `claude/watchlist-alert-channels` @ `5449299b6c23` | main | open/draft | not re-verified this cycle | — | **#157** (same settlement fn, schema, cron, tests) | `HOLD_AND_CONVERGE` — merge into one settlement-evidence/outbox stack with #157 |
| #146 | `codex/nova-ai-opportunity-engine-2026-07-21` @ `fbc3cfe0ccea` | main | open/draft | green (NOVA verify) | — | conceptual: credit/telemetry/persistence/Founder OS vs #148/#151 | `FREEZE_AND_SPLIT` — reference/integration branch; split into 6 units (see addendum) |
| #148 | `feat/cost-policy` @ `1ebc993a1d2a` | main | open/draft | not re-verified this cycle | — | AI economic policy vs control-plane stack | `SUPERSEDE_AFTER_REPLACEMENT_LINKED` — foundation, not final control plane |
| #149 | `docs/integrations-wave8` @ `5f0c0842d30f` | main | open/draft | n/a (docs) | — | superseded master plan | `ARCHIVE_AND_CLOSE` — research to archive; plan superseded |
| #150 | `feat/command-usage-telemetry` @ `b5a8c95b61dd` | main | open/draft | not re-verified this cycle | — | may later feed NOVA capability ledger | `PARK_LOW_PRIORITY` — optional tooling, not a blocker |
| #151 | `feat/dispatch-telemetry` @ `a741f3c009b8` | **`feat/cost-policy` (#148)** | open/draft | not re-verified this cycle | **stacked on #148** | one dispatch record ≠ multi-attempt ledger; provider/payer conflation | `SUPERSEDE_AFTER_REPLACEMENT_LINKED` |
| #152 | `docs/phase0-truth-convergence-2026-07-21` @ `09c923f0…` | main | open/draft | green (13/13) | — | this registry lives here | `UPDATE_THEN_READY` — this addendum is the update |
| #153 | `fix/ci-postgres-health` @ `61fd7dc7c5ae` | main | open/draft | **green** | — | CI workflow vs #158 job add | `READY_FIRST` — rebase, re-verify, owner-merge first |
| #154 | `fix/hash-validation` @ `e498cdf8e00a` | main | open/draft | **green** | after #153 | — | `READY_SECOND` — rebase after #153, re-verify |
| #155 | `security/actor-boundaries` @ `6b7f57cb7702` | main | open/draft | **green** | — | shared actor identity | `REQUEST_CHANGES` — spoofable identity contract (see findings) |
| #156 | `payments/checkout-attempt-idempotency` @ `9a7c9dcb8885` | main | open/draft | **green** | — | shared idempotency/outbox | `REQUEST_CHANGES` — ephemeral token, not durable attempt |
| #157 | `settlement/missing-score-quarantine` @ `2403468b7ba6` | main | open/draft | **green** | — | **#144** | `REQUEST_CHANGES` — race-prone threshold, erases evidence; converge w/ #144 |
| #158 | `feat/ai-control-plane-import-guard` @ `f55d171d5385` | main | open/draft | **green** (15/15) | — | CI job vs #153 | `REVISE_THEN_REVIEW` — regex→AST, exact allowlist, correct claims |
| ~~#147~~ | `claude/ecc-gse-gsn-commands-…` | main | **closed, unmerged** | n/a | — | — | `SUPERSEDED` by #153–#157 (closure comment maps all five) |
| ~~#145~~ | (source branch) | main | **closed, unmerged** | n/a | — | — | `SUPERSEDED` — see PR145_COMPLETE_DISPOSITION |

> Out-of-scope open drafts not covered by this directive but present in the repo
> (recorded for completeness, no disposition assigned here): #52, #112, #121,
> #123, #124, #125, #127, #129, #130. These predate the GSE convergence
> directive and are tracked separately.

## Merge-train truth

- **Nothing is merged.** `main` is still `c19a00d`.
- Only **#153** and **#154** qualify for the near-term owner merge train, and
  only after rebase onto current `main` and a full cumulative verification
  ladder (Prisma generate/validate, disposable-DB `db:push`, lint, typecheck,
  all workspace tests, all guardrails, production build).
- **#155, #156, #157, #158, #144, #146, #148, #151** must not be marked ready or
  merged as currently written — each carries a remediation gate documented in
  the Phase 1 addendum.

## Evidence honesty

NOVA live-source validation remains **`FAILED_CLOSED`**. The supplied ecosystem
snapshot records that no live source receipt existed, and the validation report
records that the command produced no receipt. No reproducible immutable receipt
has been produced since. Do not describe NOVA source validation as passing.
