# Current Repository Truth — 2026-07-21

> All figures below were pulled live from the GitHub API and local `git diff`/`git log` against the actual repository state at the time of writing. Superscript "stale" markers below identify claims from prior documents that no longer match reality.

## `main`

Head: `c19a00d` — "feat(clv): FV-001 — side-aware CLV dispersion capture + Pedersen slate aggregate (#136)"

The merge-base both PR #145 and PR #146 branched from is `bf931ab` ("feat(health): P2 — wire epistemic-twin into the health route + canActAsIf guard (#142)"), **not** `main`'s current head. `main` has advanced past both branch points (`bf931ab` → `c19a00d`, one intervening commit: the CLV/Pedersen feature). Any extraction work must rebase onto current `main`, not the stale merge-base.

## PR #145 — **CLOSED, not open**

This is the fact this directive's authoring context did not have: **PR #145 was closed by this session before the "stop and rebase" instruction arrived**, split into five replacement branches/PRs (below), per an internally-authored master plan. It was not merged — `merged: false`, `state: closed`.

| Field | Value |
|---|---|
| Head SHA | `157d1160bdbf241028244e34e2950ce9acc3ceef` |
| Base | `main` @ `bf931ab` (stale — 1 commit behind current `main`) |
| Additions / Deletions | 11,114 / 37 |
| Changed files | 71 |
| Commits | 11 |
| Closed at | 2026-07-21T22:48:52Z |
| Replaced by | #147, #148, #149, #150, #151 (see below) |

**This document treats #145 as closed and its content as already redistributed.** The disposition ledger (companion doc) is built against the five replacement branches, not against #145's 71 files directly, since that is the actual current shape of the work.

## The five replacement branches (created and pushed before this directive arrived)

All five are independent draft PRs opened against `main`. All were green on GitHub Actions CI (`Test, type-check, lint, Prisma` + guardrail jobs) at last check. **None have been merged. No production behavior has changed on `main`.**

| PR | Branch | Base | Head SHA (current) | Contents |
|---|---|---|---|---|
| #147 | `fix/ledger-and-security-fixes` | `main` | `80e5559` | Timing-safe hash compare, JARVIS ledger + moderation auth guards, Stripe idempotency key, settlement VOID/no-op path, ledger auth-order fix, CI postgres health-check fix |
| #148 | `feat/cost-policy` | `main` | `1ebc993` | `cost-policy.ts` (`LLM_COST_MODE`), `provider-dispatch.ts` fail-closed routing |
| #149 | `docs/integrations-wave8` | `main` | `5f0c084` | 5 integration guides (Bedrock/Vertex/Kalshi/NFLverse/Cerebras) + `MASTER-PLAN-SONNET-2026-07-21.md` |
| #150 | `feat/command-usage-telemetry` | `main` | `b5a8c95` | Opt-in local-only slash-command usage logging (replaces a guess-based "park unused commands" plan) |
| #151 | `feat/dispatch-telemetry` | `feat/cost-policy` (#148, stacked) | `a741f3c` | `LlmDispatchRecord` → usage-ledger persistence, additive migration, all 7 Claude call sites wired |

**#151's GitHub-visible head was stale relative to local work** until this session pushed the second commit (`a741f3c`, the 6-call-site wiring) moments before this directive arrived — GitHub previously showed `1eccb3a`. This has been corrected; `a741f3c` is now on `origin`.

## PR #146 — open, NOVA

| Field | Value |
|---|---|
| Head SHA | `fbc3cfe0ccea23d5d9657248ac374945c1dec9c4` |
| Base | `main` @ `bf931ab` (same stale base as #145) |
| Additions / Deletions | 14,419 / 40 |
| Changed files | 70 |
| Commits | 99 |
| State | open, draft, `mergeable_state: clean` |
| Updated | 2026-07-21T21:42:05Z |

## File-level overlap between #145 and #146

**Zero.** `comm -12` on the sorted changed-file paths of both branches (diffed against the shared merge-base `bf931ab`) returns no common paths. There is no textual merge conflict between the two efforts. The overlap the directive correctly identifies is **conceptual**, not file-level — see `PR145_PR146_CONVERGENCE_MAP_2026-07-21.md`.

## Evidence-artifact status (NOVA)

Not independently re-verified in this pass (out of scope for Phase 0 given time budget) — this document does not confirm or deny the live-source-validation receipt claims in `NOVA_LIVE_SOURCE_VALIDATION_REPORT.md` / `NOVA_CURRENT_AI_ECOSYSTEM_SNAPSHOT.md`. Per the directive's instruction, those are preserved as `FAILED_CLOSED` pending a reproducible immutable receipt — see `EVIDENCE_GAPS_AND_FAILED_RECEIPTS_2026-07-21.md`.

## Corrections to prior-session claims

- The `MASTER-PLAN-SONNET-2026-07-21.md` (in #149) states "PR #145 (Sports): Open draft, CI green at `035cfd4`." **Both facts are stale**: #145 is closed, and `035cfd4` was superseded by `157d116` before that document was written. This document supersedes that claim.
- The same document implicitly treats the cost-policy layer as a complete "economic control plane." It is not — see `AI_CONTROL_PLANE_ADR_2026-07-21.md` for the gap analysis.
