# GSE Frontier Recovery Execution Ledger

Last updated: 2026-07-14
Executor branch: `codex/gse-frontier-recovery-2026-07-13`
Current-main base: `3ce5c4a198df7f9baac37888de4f28297e24f581`
Production deployment identity: `UNVERIFIED` — repository and public runtime evidence must be correlated before a deployment claim.

This file is the execution control plane. It is not a readiness claim.

## Protected zones

- Billing, Stripe checkout/webhooks, subscription reconciliation, and price IDs.
- Auth, OAuth callbacks, role checks, and entitlement persistence.
- Legal copy and static legal dates.
- Canonical URL construction in `apps/web/lib/seo/site-url.ts`.
- Settlement immutability, grade-once semantics, CLV history, and proof receipts.
- Rights snapshots, source clearance, and draft-only/no-auto-publish gates.
- Production migrations, secrets, DNS, OAuth consoles, paid vendors, and destructive production data operations remain owner-gated.

## Current-main findings

| ID | Severity | Current-main status | Evidence / next decisive check |
|---|---:|---|---|
| P0-1 Game Room entitlement leak | P0 | `VERIFYING_FIX` | Main includes #109 (`3ce5c4a1`). Run anonymous/FREE/paid/cockpit projection tests and planted forbidden-value checks across SSR/RSC/API/hydration. |
| P0-2 market units / false precision | P0 | `REPRODUCING` | Trace provider normalization through consensus, persistence, DTOs, settlement/CLV, and market-aware display; lock each confirmed defect with behavioral/property tests. |
| P0-3 stub DB / false health / client boundary | P0 | `REPRODUCING` | Prove production fail-closed behavior, non-vacuous health, and absence of DB modules from client execution. |
| P0-4 performance / calibration / pricing contradiction | P0 | `REPRODUCING` | Compare eligible populations and prove whether raw strength scores enter probability-only metrics. |
| P0-5 stale current-price surfaces | P0 | `REPRODUCING` | Exercise stale per-pick/per-sport data and DB errors at the public selection boundary. |
| P0-6 fictional newsroom framed as live | P0 | `REPRODUCING` | Exercise demo/live source selection, dominant labels, review/rights state, hero and ledger parity. |

## Open PR #76-#101 reconciliation

`PENDING_EVIDENCE` means no disposition has been executed. Each row will be updated from current GitHub state, current-main ancestry, diffs, checks, and unresolved review evidence.

| PR | Head / base | Changed files | Review findings | Current-main reproduction / overlap | Disposition | Validation | Rollback |
|---:|---|---|---|---|---|---|---|
| 76 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD pending risk/license/router/tamper review | PENDING | Close/no merge |
| 77 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD pending repaired admin/risk findings | PENDING | Close/no merge |
| 78 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD pending repaired findings | PENDING | Close/no merge |
| 79 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify supersession; extract only missing fail-closed result logic | PENDING | Revert extracted commit |
| 80 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Correct/rebase if pre-mint slate freeze remains needed | PENDING | Revert PR |
| 81 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify CI topology and scanner coverage on current main | PENDING | Revert PR |
| 82 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Rebuild only if production DB fail-closed gaps remain | PENDING | Revert PR |
| 83 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Candidate for settlement-integrity rollup | PENDING | Revert rollup commit |
| 84 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Candidate for settlement-integrity rollup | PENDING | Revert rollup commit |
| 85 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify canonical record computation/withholding | PENDING | Revert PR |
| 86 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Candidate for settlement-integrity rollup | PENDING | Revert rollup commit |
| 87 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Preserve only non-superseded API/probe/runbook value | PENDING | Revert rebuilt slice |
| 88 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Correct/rebase only if fantasy pricing drift remains | PENDING | Revert PR |
| 89 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Rebase only after public-state prerequisites | PENDING | Revert PR |
| 90 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD pending finite/input/epsilon/event-total repairs | PENDING | Close/no merge |
| 91 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify fully superseded by stronger webhook behavior | PENDING | Close/no merge |
| 92 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Candidate for settlement-integrity rollup | PENDING | Revert rollup commit |
| 93 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify every cockpit page has its own ADMIN check | PENDING | Revert PR |
| 94 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify UTC day bounds and root+count commitment | PENDING | Revert PR |
| 95 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Rebuild mocks only if current tests remain vacuous | PENDING | Revert test slice |
| 96 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD until frozen probability/evidence design exists | PENDING | Close/no merge |
| 97 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify merged/superseded state | PENDING | N/A if merged |
| 98 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify merged deployment repair | PENDING | Revert merge if required |
| 99 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify merged/superseded state | PENDING | N/A if merged |
| 100 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | Verify merged/superseded state | PENDING | N/A if merged |
| 101 | PENDING_EVIDENCE | PENDING | PENDING | PENDING | HOLD migration; repair moneyline-side logic and shadow-validate first | PENDING | Revert code; migration not applied |

## Ordered work queue

1. Verify #109 entitlement behavior across every projection; repair only proven gaps.
2. Make production DB and health fail closed without weakening deliberate local demo behavior.
3. Establish canonical market-unit parsing/aggregation/display invariants without changing settlement truth.
4. Fail closed on stale current prices per pick and sport while retaining labeled historical evidence.
5. Establish one confidence-readiness and eligible-population contract across performance, calibration, pricing, capability registry, cards, and rooms.
6. Prevent fictional newsroom objects from inhabiting live-news framing.
7. Reconcile PR #76-#101 and extract only non-superseded invariants into current-main slices.
8. Build the additive `PickEvidenceEnvelope`, canonical `IntelligenceEvent` stream, and a real `/room/[gameId]` playback slice.
9. Feed the same stream to transcript/table, selected-game Twin/Observatory, postgame autopsy, draft-only Media Studio, and deterministic cockpit explanation.
10. Complete accessibility, performance, browser, visual, trust, and full-workspace validation.

## Validation ledger

| Command / evidence | Exit | Result | Limitation |
|---|---:|---|---|
| `git fetch origin main --prune` | 0 | Live `origin/main` resolved to `3ce5c4a1` | Does not identify production deployment. |
| `git status --short --branch` | 0 | Clean isolated execution branch | Local debug journal is excluded per clone. |
| Targeted tests | PENDING | — | Dependencies and existing suite topology under discovery. |
| `npm.cmd run lint` | PENDING | — | — |
| `npm.cmd run typecheck` | PENDING | — | — |
| `npm.cmd test` | PENDING | — | — |
| `npm.cmd run build` | PENDING | — | — |
| `npm.cmd run guardrails` | PENDING | — | — |
| Browser / console / visual matrix | PENDING | — | Requires a current production-equivalent build. |

## Touched-file ownership

| Path | Owner | Purpose | Status |
|---|---|---|---|
| `reports/agent-handoffs/FRONTIER_RECOVERY_LEDGER.md` | Codex control plane | Execution evidence and decisions | ACTIVE |
| Application/test files | Unassigned until failing evidence selects a work unit | — | UNTOUCHED |

## Blockers and safe adjacent work

- Production secrets, database migrations, Stripe/DNS/OAuth/vendor configuration, and destructive production operations are not authorized. Code, tests, shadow validation, and exact owner steps remain in scope.
- Git transport can fetch the repository. GitHub review/PR mutation authentication and push permission remain to be verified before publication claims.
- Missing production credentials do not block local behavioral tests, pure-domain tests, bundle checks, docs, or current-main PR reconciliation.

## Decisions with evidence

1. Work occurs in an isolated writable clone under the Galaxy control workspace because the canonical `C:\Users\Garrett\Sports` checkout contained pre-existing user scratch files and was initially read-only to the session.
2. Base all fixes on live-fetched `origin/main` (`3ce5c4a1`), not the prompt's older audited baseline. Main already contains #109, so P0-1 begins in verification mode.
3. Do not replay older billing/auth/legal/canonical-host code from open branches; those zones are protected and current main is stronger.
4. No production migration or automatic publish action will be executed. Schema proposals, code, tests, and shadow validation may be completed.
