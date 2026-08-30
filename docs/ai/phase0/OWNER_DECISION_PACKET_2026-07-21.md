# Owner Decision Packet — 2026-07-21

Phase 0 (repository truth, disposition, convergence, evidence audit) is complete. This packet lists what needs your decision before Phase 1 (small correctness/security extractions) begins. Nothing below has been merged, deployed, applied for, sent, or activated.

## What already happened (before this Phase 0 request arrived)

This session closed PR #145 and split it into 5 branches (#147-#151) under an earlier, less rigorous master plan. That plan treated the cost-policy work as more complete than it is and didn't converge with PR #146 (NOVA). This Phase 0 pass corrects that — see `AI_CONTROL_PLANE_ADR_2026-07-21.md` and `PR145_PR146_CONVERGENCE_MAP_2026-07-21.md`. **None of #147-#151 have been merged.** All are still open drafts.

## Decisions needed from you

1. **Two files in #147 are REJECT_UNSAFE and must not merge as-is:**
   - `stripe.ts` — the current idempotency-key design can replay an old checkout session or collapse two distinct legitimate purchase attempts. Needs a redesign (durable checkout-attempt ID) before this touches real payments.
   - `settle-sport.ts` — currently infers a game was POSTPONED from a single observation of "completed=true but scores missing," with no corroboration and non-atomic writes. This is real-money settlement logic; a false POSTPONED inference voids pending picks incorrectly.
   
   **Your call:** should I proceed with the redesigns now (Phase 1 items 4-5 in the revised stack), or do you want to review the current unsafe versions first to understand exactly what's live in production today (note: neither is merged, so nothing is live yet — but if similar logic already exists on `main` from before this session, that's worth knowing)?

2. **Two auth files in #147 (`ledgers.ts`, `moderation-actions.ts`) need an actor-identity redesign** before merge — currently they check "is there an admin session" but don't distinguish interactive-admin vs. background-service vs. owner-only callers. `moderation-actions.ts` in particular had ZERO auth before this session's fix, so even the current (imperfect) version is a large improvement over what's on `main` today — **this is not a regression, but it's also not finished.**

3. **35 integration-research documents (Wave 1-8, in #149) should move to an archive location, not `docs/ai/integrations/` on `main`.** They contain real research but per the directive, product `main` should carry only current operational docs tied to implemented architecture. Where should the archive live — a subdirectory of this repo, or the separate `gse-competitive-intel` repo already used for this kind of material this session?

4. **`credit-pool.ts`'s claims about which credit pool "paid for" an API call are unverified** — it infers this from the model-ID string shape alone, never reconciled against an actual AWS/Google billing statement. Until Phase 3 (credit reconciliation, blocked on NOVA's own credit persistence landing) exists, treat any dollar figure this code reports as a hint, not a fact. No action needed from you right now — flagging so it doesn't get repeated as a confirmed number in a future report.

5. **NOVA's live-source validation has no successful receipt** (confirmed — both supplied NOVA evidence documents state this themselves). This is preserved as `FAILED_CLOSED`, not re-run in this pass. If you want it re-verified, that needs to happen in an environment with real network access (this session's environment returned DNS-resolution failures on the one NOVA status check attempted).

## What I did NOT do in this pass

- Did not open any new PRs (`fix/hash-validation`, `security/actor-boundaries`, etc. — planned in `REVISED_PR_STACK_2026-07-21.md`, not created).
- Did not close #145 again (already closed before this directive) or modify #146.
- Did not merge, deploy, apply for credits, send outreach, or activate billing.
- Did not re-verify NOVA's source-validation claims (network-restricted; flagged as `FAILED_CLOSED` instead of fabricating a pass).
- Did not attempt exhaustive re-reads of all 71 original #145 files' current byte-for-byte content — the disposition ledger is built from verified `git diff` output, commit messages, and direct reads of the highest-risk files (hash.ts, ledgers.ts, moderation-actions.ts, stripe.ts, settle-sport.ts, cost-policy.ts, provider-dispatch.ts, credit-pool.ts, internal-llm.ts) rather than every file.

## Next smallest coherent unit (if you approve proceeding)

`fix/ci-postgres-health` — the CI Postgres health-check fix, isolated from the auth/payment/settlement risk cluster, independently safe, one file, already verified working this session. Lowest-risk starting point for Phase 1.

## Branch and evidence pointer

This Phase 0 work is on branch `docs/phase0-truth-convergence-2026-07-21`, based on current `main` (`c19a00d`). No files outside `docs/ai/phase0/` were touched. Artifacts: `CURRENT_REPOSITORY_TRUTH_2026-07-21.md`, `PR145_COMPLETE_DISPOSITION_2026-07-21.json`, `PR145_PR146_CONVERGENCE_MAP_2026-07-21.md`, `AI_CONTROL_PLANE_ADR_2026-07-21.md`, `EVIDENCE_GAPS_AND_FAILED_RECEIPTS_2026-07-21.md`, `REVISED_PR_STACK_2026-07-21.md`, this document.
