# Contributing to Sports Intelligence OS

Welcome. The platform is built around a small set of non-negotiable rules
that protect customers from inflated claims, leaky bootstrap data, and
unreviewed auto-publish paths. Skim them before you open your first PR.

## Trust-first invariants (CI enforces these)

1. **No fabricated data on customer surfaces.** Every customer-facing
   page that shows a record, win-rate, or claim must source it from
   `evaluatePublicPerformancePolicy()` in
   `apps/web/lib/performance/public-performance-policy.ts` (or be
   server-side gated by `getReadinessGates()`).
2. **No banned phrases on public copy.** The trust-claim registry in
   `apps/web/lib/trust-claims.ts` lists every banned phrase. The
   `public-copy-scanner.test.ts` + `public-copy-scan-strong.test.ts`
   tests fail CI if any appear on a public page.
3. **Bootstrap picks never count toward public performance.** Pick
   queries that feed customer surfaces must include
   `isBootstrap: false`. The dashboard, performance, picks, and
   daily-slate APIs all enforce this.
4. **Performance gate is the only way to expose a public win rate.**
   `PERFORMANCE_STATS_ENABLED=false` (the default) means *no* customer
   surface displays a record. Flip it only when canonical history has
   accumulated.
5. **No auto-publish.** Content drafts require an explicit operator
   action to publish. The `draft-only` CI guardrail walks the codebase
   looking for `status: "PUBLISHED"` writes outside the explicit
   publish path.
6. **MODEL_VERSION can only move alongside an IMPLEMENTED
   CalibrationProposal.** Enforced by the `model-freeze` guardrail.
7. **Cockpit and admin pages are ADMIN-gated.** The `cockpit-routes`
   test walks every cockpit page + API route and verifies the gate.
8. **No top-level `await db.*` in cockpit pages.** Stub mode must
   always render. Enforced by `cockpit-stub-safety.test.ts`.

## Where to look when CI fails

| CI job | Where to investigate |
|---|---|
| `test` | The full `npm test` run — pinpoint the failing file with `npx vitest run __tests__/<file>.test.ts` |
| `trust-gate` | `apps/web/lib/trust-claims.ts` + `apps/web/__tests__/public-copy-scanner.test.ts` |
| `model-freeze` | `scripts/guardrails/model-freeze.mjs` |
| `draft-only` | `scripts/guardrails/draft-only.mjs` |
| `brand-safety` | Customer-copy invariants — `public-performance-policy`, `dashboard-performance-gate`, `history-eligibility`, `jarvis`, `cockpit-routes`, `trust-claims` |

## Adding a new customer-facing claim

1. Add the claim to `TRUST_CLAIMS` in `apps/web/lib/trust-claims.ts`
   with status `APPROVED` (or `GATED` + `requiredGate`).
2. Reference the claim by ID in the component that renders it
   (not strictly required, but it makes the audit trail explicit).
3. Add the page file to the SCAN_TARGETS in
   `apps/web/__tests__/public-copy-scan-strong.test.ts` if it's not
   already covered.

## Touching an existing trust-claim

When you edit a claim's `copy`, `status`, or any other field, **bump
`lastReviewedAt` to today's date**. The
`trust-claims.test.ts` freshness test fails CI once a claim's
`lastReviewedAt` is more than 365 days old — touching the entry
without resetting the date eventually fails everyone else's PRs too.

## Adding a new cockpit page

1. Put the page under `apps/web/app/cockpit/<route>/page.tsx`. The
   layout enforces ADMIN gating — you don't need your own check.
2. Add an entry to the `NAV` constant in
   `apps/web/app/cockpit/layout.tsx`. The `cockpit-nav-coverage` test
   will fail if you don't.
3. If the page touches the DB, wrap each call in `.catch()` so stub
   mode renders. See `apps/web/lib/cockpit/jarvis-data.ts` for the
   pattern.

## Local validation

```bash
# Run all customer-copy invariants in under a minute:
cd apps/web
npx vitest run __tests__/public-copy-scanner.test.ts \
  __tests__/public-performance-policy.test.ts \
  __tests__/dashboard-performance-gate.test.ts \
  __tests__/history-eligibility.test.ts \
  __tests__/jarvis.test.ts \
  __tests__/cockpit-routes.test.ts \
  __tests__/trust-claims.test.ts

# Run the full suite:
npm test

# Build:
npm run build
```

## Further reading

- `CLAUDE.md` — system overview, tech stack, non-negotiable rules
- `docs/launch-observatory.md` — customer/admin/cockpit surface map,
  brand voice, troubleshooting
- `docs/launch-runbook.md` — step-by-step operator recipe for going to
  production
- `reports/launch-night/final-report.md` — what shipped in the most
  recent autonomous loop
