# Model Routing Policy (Shadow Mode)

`apps/web/lib/ai-routing/` is the executable version of this policy;
`apps/web/__tests__/ai-routing.test.ts` pins it. Version:
`routing-policy/1.0.0`.

**Route policy is GSE intellectual property.** Nothing from this module is
rendered on a public surface; lanes, rules, and budgets stay server-side.

## Shadow contract (this wave)

- The router **recommends**; it never calls a model, never retries, never
  falls back, never mutates state. Source-level test pins forbid network
  primitives anywhere in the module.
- Production call sites are untouched (pinned: `lib/claude-api/` contains no
  reference to the router). `ClaudeApiCallRecord` is neither renamed nor
  dual-written in this wave — a provider-neutral telemetry migration is
  documented below as owner-gated future work.
- `AI_MODEL_ROUTER_SHADOW_ENABLED` defaults off; even on, the return value is
  logging material. `AI_MODEL_ROUTER_LIVE_ENABLED` is never set by this
  program.

## Lanes

`NO_MODEL` · `PLAN_FRONTIER` · `EXECUTE_BOUNDED` · `EXTRACT_STRUCTURED` ·
`VERIFY_INDEPENDENT` · `LOCAL_PRIVATE` · `PUBLIC_HIGH_STAKES`

Rules in priority order (first match wins, every outcome carries a reason):

1. Deterministic solution exists → `NO_MODEL` (a model adds variance, not value).
2. `SENSITIVE` data → `LOCAL_PRIVATE`; with no local endpoint registered this
   **blocks** rather than leaking to an external provider.
3. Public visibility or `CRITICAL` risk → `PUBLIC_HIGH_STAKES` — a cheap lane
   is unreachable for public claims regardless of budget.
4. verify/review tasks → `VERIFY_INDEPENDENT` (reserved so a future second
   endpoint can be pinned different from the producer).
5. Structured extraction without tools → `EXTRACT_STRUCTURED`.
6. High-risk / open-ended planning → `PLAN_FRONTIER`.
7. Everything else → `EXECUTE_BOUNDED`.

## Endpoints

One registered endpoint: the Claude configuration production already uses
(`isCurrentProduction: true`, `trainsOnData: false`). Additions require an
owner-approved adoption dossier (radar path). Unknown endpoint ids are
structurally blocked. Endpoints that train on submitted data are structurally
refused. Health is honest: no probes exist, so health is UNKNOWN — usable
only for the endpoint production already exercises.

## Budgets

Per-lane USD ceilings (`LANE_BUDGET_CEILINGS`); a task budget can lower but
never raise the ceiling, and budgets can never downgrade a public/critical
task off the high-stakes lane.

## Frozen evals

Typed interfaces + empty committed suite/history. **No model is claimed
better than another without an EvalRun full of real fixture cases.** The
shape makes comparative claims impossible to state without evidence.

## Future telemetry migration (owner-gated, not this wave)

Dual-write plan: when the owner approves, AI call sites add a nullable
`routeLane` + `policyVersion` to a NEW provider-neutral call record (schema
+ migration in their own PR, applied by the owner), while
`ClaudeApiCallRecord` keeps working unchanged until two release cycles of
parity are observed.
