# Issue #420 — Decision Packet: API v1 route tree (promote, don't delete)

Status: **decision-ready**. Recommendation: **PROMOTE** — the v1 tree is not
accidental; it is the intentional, key-gated B2B surface.

## Evidence (read this session)

`apps/web/app/api/v1/` contains three live route handlers (not dead stubs):

- `probabilities/route.ts` — B2B experimental probabilities. Gates:
  `authorizeB2bApiKey()` (401), `rateLimitB2b(key, 30)` (429), `isStubMode()`
  → honest empty payload, seed rows excluded, `claimPosture:
  "experimental_research_grade_not_verified_roi"` on every response.
- `signals/route.ts`, `openapi/route.ts` — same auth/rate-limit pattern.

`apps/web/lib/b2b/api-key-auth.ts`:
- `authorizeB2bApiKey` — env keys (`GSE_B2B_API_KEYS`, comma-separated), no DB
  table, **timing-safe compare** (`timingSafeEqual`), rejects missing env.
- `rateLimitB2b` — fixed-window counter keyed by presented key.

## Why NOT delete

1. These are the B2B revenue path (`docs/ops/B2B_API.md`). Removing them kills
   the only external API surface the roadmap monetizes.
2. They are already defended: key auth + per-key throttle + honest posture +
   seed exclusion + stub-mode guard. The guardrail's "unpromoted" concern is
   about contract stability, not exposure.
3. The repo already owns the promotion machinery:
   `docs/api/API_V1_PROMOTION_READINESS_MATRIX.md` and
   `docs/api/API_V1_REVIEWER_MERGE_CHECKLIST.md` exist for exactly this.

## Recommended resolution (owner action)

1. Run the promotion checklist in `docs/api/API_V1_REVIEWER_MERGE_CHECKLIST.md`
   (confirm external consumers, pin the schema, publish versioning policy).
2. Once the checklist passes, update `scripts/guardrails/api-v1-boundary.mjs`
   to reflect the promoted state (guard's own resolution option 2) so CI goes
   green instead of failing on an intentional surface.
3. Add a durable rate-limit store note: `rateLimitB2b` is process-local, so on
   serverless (Vercel) the counter is per-instance, not global. Fine for key
   holders today (keys are already the trust boundary); document it before any
   public self-serve key issuance.

## Low/Info finding attached

- GSE-SEC-015 (new): B2B rate limit is per-process; multi-instance deployments
  multiply the effective limit. Severity: Low (key-gated surface).
