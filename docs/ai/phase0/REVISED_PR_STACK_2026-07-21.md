# Revised PR Stack — 2026-07-21

Supersedes the "Phase 1" stack in `MASTER-PLAN-SONNET-2026-07-21.md`. Built from the actual Phase 0 disposition ledger. **None of these are opened by this Phase 0 pass** — this is the plan for what comes after Phase 0 is reviewed, per the governing directive ("do not create replacement PRs yet").

## Current state (already exists, from before this directive)

| PR | Status | Action needed |
|---|---|---|
| #147 `fix/ledger-and-security-fixes` | Open draft, CI green, **contains 2 REJECT_UNSAFE files (stripe.ts, settle-sport.ts) and 2 EXTRACT_AFTER_REDESIGN files (hash.ts, ledgers.ts) that must NOT merge as-is** | Do not merge. Split per below before any merge. |
| #148 `feat/cost-policy` | Open draft, CI green | Do not merge as "the control plane" — retain as foundation only, per ADR |
| #149 `docs/integrations-wave8` | Open draft, CI green | Redirect to archive location instead of `docs/ai/integrations/` on `main`, per disposition ledger |
| #150 `feat/command-usage-telemetry` | Open draft, CI green | Fine as-is — pure opt-in tooling, no risk |
| #151 `feat/dispatch-telemetry` | Open draft, stacked on #148 | Fine as a foundation-layer extension; do not present as complete |

## Recommended split of #147 (do this before merging anything from it)

1. **`fix/hash-validation`** — `hash.ts` with strict hex/decoded-length validation added first
2. **`fix/ci-postgres-health`** — `.github/workflows/ci.yml` only, trivially safe, independently mergeable today
3. **`security/actor-boundaries`** — `ledgers.ts` + `moderation-actions.ts` + `council-ledgers.test.ts`, redesigned with actor identity + typed errors, reviewed as its own security PR
4. **`payments/checkout-attempt-idempotency`** — `stripe.ts`, redesigned to a durable checkout-attempt/order ID
5. **`settlement/missing-score-quarantine`** — `settle-sport.ts`, redesigned to quarantine + corroboration + one transaction

**#147 itself should be closed once these 5 replace it**, same pattern already used for #145.

## Full stack, in dependency order

1. `docs/phase0-truth-convergence-2026-07-21` — this Phase 0 work (documentation only, no behavior change)
2. `fix/hash-validation`
3. `fix/ci-postgres-health`
4. `security/actor-boundaries`
5. `payments/checkout-attempt-idempotency`
6. `settlement/missing-score-quarantine`
7. `feat/cost-policy` (#148, already exists — retarget framing to "foundation," not "complete")
8. `feat/dispatch-telemetry` (#151, already exists — same retarget)
9. `feat/ai-control-plane-core` — import-boundary CI guard, missing-mode fail-closed, `AiInvocation`/`AiAttempt` types (NEW, not started)
10. `feat/ai-credit-reconciliation` — converges with NOVA's `monetization.ts`/`policy.ts` per the convergence map (NEW, blocked on NOVA's own credit persistence landing first)
11. `feat/command-usage-telemetry` (#150, already exists — no change needed)
12. `docs/archive-integration-research` — moves the 35 Wave 1-8 guides out of `docs/ai/integrations/` on `main` into an archival location (NEW, small)
13. `#146` (NOVA) — proceeds on its own track; its persistence-design phase (explicitly not-yet-started per its own PR description) should read this convergence map first, specifically the credit-lifecycle and cockpit-dashboard rows

## Explicit non-goals for this stack

- No merge, deploy, or external action is authorized by this document.
- Items 9-10 and 12 are NOT started — they are planning placeholders, not branches that exist yet.
- #146 is not modified, retargeted, or rebased by this document — it proceeds on its own track, informed by the convergence map.
