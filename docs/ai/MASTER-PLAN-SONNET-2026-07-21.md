# MASTER PLAN — Sonnet Execution Handoff (2026-07-21)

> Written by the planning session (Fable 5) on branch `claude/ecc-gse-gsn-commands-weaxnk`.
> The hardest architectural item — the LLM cost-policy layer — is ALREADY CODED and tested on this branch. Everything below is bounded implementation work for a Sonnet-class agent.
> This plan supersedes all prior "Wave" roadmaps. **No Wave 9. No new integration guides** until an existing project produces a real commercial signal.

## Operating truth (verified, not projected)

| Fact | State |
|---|---|
| PR #145 (Sports) | Open draft, CI green at `035cfd4`. DO NOT merge intact — split per Phase 1. |
| Cost-policy layer | CODED on this branch: `apps/web/lib/claude-api/cost-policy.ts` + rewired `provider-dispatch.ts`. 12/12 focused tests pass, web typecheck clean. |
| Provider adapters | `bedrock.ts`, `vertex.ts`, `cerebras.ts`, `internal-llm.ts`, `credit-pool.ts` all exist and are inert by default. |
| Usable credits | $0 ACTIVATED today. Everything else is AVAILABLE or un-applied. Do not plan against maximum award arithmetic. |
| Realized revenue | $0. The bottleneck is customer contact and launch blockers, not infrastructure. |

## Credit-state discipline (use these words everywhere)

`AVAILABLE → APPLIED → APPROVED → ACTIVATED → EXHAUSTED`
Only ACTIVATED balances are runway. Google's main startup award does not pay for Claude — the Vertex partner-model benefit (~$10k) does. Self-funded AWS Activate starts far below the $100k headline.

## What Fable 5 already coded (do not rebuild)

### `LLM_COST_MODE` — economic policy layer
- `apps/web/lib/claude-api/cost-policy.ts` — `resolveLlmCostMode` (unrecognized values THROW rather than defaulting to cash), `CostPolicyBlockedError`, `LlmDispatchRecord` telemetry type.
- `apps/web/lib/claude-api/provider-dispatch.ts` — `callClaude(request, env, { onDispatch })`:
  - `normal` → provider error falls back to direct Anthropic (unchanged behavior).
  - `credits-only` / `zero-cash` → provider error **fails closed** (`CostPolicyBlockedError`); the billable Anthropic endpoint is never touched. Verified by test: only 1 fetch fires on Bedrock failure.
  - Every dispatch emits an `LlmDispatchRecord`: costMode, providerRequested/Used, modelRequested/Used, fallbackReason, billingPool, surface.
- Tests: `provider-dispatch.test.ts` (12 passing). Billing-pool attribution already exists in `credit-pool.ts` (model-id shape → pool).

## Execution phases (in order — each is one bounded PR-sized unit)

### Phase 1 — Split PR #145 into reviewable units (first task)
Keep #145 in draft as the archive. Extract onto fresh branches from `main`:
1. `fix/ledger-auth` — ledger validation-before-auth fix, test auth mock, timing-safe hash comparison. Small, verified, merge first.
2. `feat/cost-policy` — cherry-pick `cost-policy.ts`, `provider-dispatch.ts`, `provider-dispatch.test.ts` from this branch. Merge second.
3. `docs/integrations` — the corrected integration guides only (credit reality checks included). Low priority.
4. Claude commands — keep only commands used in the last 2 weeks of real workflow; park the rest (do not delete — move to `docs/ai/parked/`).
Acceptance: each PR green on CI independently; #145 closed with a comment linking its replacements.

### Phase 2 — Wire dispatch telemetry into the usage ledger
- Persist `LlmDispatchRecord` alongside the existing `ClaudeApiCallRecord` (additive column/JSON field — no destructive migration).
- Surface in Cockpit: provider-use split, fallback rate, billing pool per surface.
- Alert (log-level is fine initially) when `providerUsed=anthropic` while `CLAUDE_PROVIDER` is set — that is cash burning during a credits outage.
Acceptance: one dashboard/route shows the split; test covers record persistence.

### Phase 3 — Normal-mode budget guards
- Daily spend ceiling + per-request cost ceiling for `normal` mode using existing `budget-store.ts` / `cost-monitor.ts` (extend, don't duplicate).
- Circuit breaker: when the daily ceiling is hit, `normal` degrades to `credits-only` semantics until midnight UTC.
Acceptance: unit tests for ceiling hit → blocked billable call.

### Phase 4 — Internal-LLM lane activation (zero-cash workhorse)
- `internal-llm.ts` already exists. Wire the 3 highest-volume NON-user-facing tasks (classification, normalization, dedup) to it behind `isInternalLlmConfigured()`.
- Owner action (not agent): run Ollama locally or set Groq free-tier key → `INTERNAL_LLM_BASE_URL`, `INTERNAL_LLM_MODEL`.
Acceptance: with env set in test, those tasks route internal; without it, unchanged.

### Phase 5 — Kalshi proof layer (repositioning, not marketing)
Public claim allowed: "an additional regulated-market price signal used to test market agreement and disagreement." Forbidden: "only legal prediction-market client" or any moat claim.
- Snapshot persistence for `getFairValue` results (ticker, probs, overround, spread, liquidity, timestamp).
- Weekly coverage/liquidity report per league; correlation vs. sportsbook consensus.
Acceptance: 2+ weeks of snapshots before any public surface shows Kalshi numbers.

### Phase 6 — Revenue lane (owner-led; agent prepares only)
Allocation for every working cycle: **60% revenue activation / 25% launch blockers / 10% cost-control infra / 5% credits applications.**
- Agent: keep checkout, delivery, and proof surfaces defect-free; prepare (never send) outreach materials.
- Owner-only: send the prepared outreach drafts, approve the manual payment method, submit credit applications (AWS Activate self-funded, Cloudflare startup accessible tier, Vertex partner-model benefit, Microsoft for Startups, NVIDIA Inception — record each as APPLIED with date).

## Standing rules for the executing agent
- Never weaken tests/guardrails to go green. Secret-scan placeholders must be obviously fake (`PLACEHOLDER_...`).
- No fake data, no fabricated stats, server-side paywalls only, secrets via env only, freshness validated, tests + strict types required.
- `checkClearance()` before every extraction job; no CAPTCHA/login/paywall bypass; no proxy rotation to evade blocks.
- Stop before anything external or irreversible (send, spend, merge to main without review, deploy, apply, publish) — present an owner decision packet instead.
- Classify every failure: BRANCH_CAUSED / BASE_EXISTING / ENVIRONMENTAL / STALE_FIXTURE / UNKNOWN.
- Per task, state: what / why / acceptance criteria / evidence — before editing.

## Owner-only checklist (nothing here is agent work)
- [ ] Send the 5 prepared outreach drafts (highest expected revenue action available)
- [ ] Approve one manual payment method
- [ ] Apply: AWS Activate (self-funded), Vertex partner-model benefit, Cloudflare startup accessible tier
- [ ] Check `$env:ANTHROPIC_API_KEY` in your coding shell — if set, interactive sessions may bill the API instead of your subscription (`Remove-Item Env:ANTHROPIC_API_KEY` per-session)
- [ ] Install Ollama + one model (per hardware) for the internal-LLM lane and local mechanical coding
- [ ] Decide when to set `LLM_COST_MODE=credits-only` in production (recommended: the day the first credit pool is ACTIVATED)
