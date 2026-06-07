# COORDINATION.md
<!-- TTL: 90 min per entry. Run 1 completed 2026-06-07T07:30Z -->

## Active Claims (Run 1)

| Stream | Files Claimed | Agent | Expires |
|--------|--------------|-------|---------|
| security-sweep | apps/web/lib/auth.ts, apps/web/lib/entitlements.ts, apps/web/middleware.ts | overnight-claude | 2026-06-07T09:00Z |
| improve | packages/db/package.json | overnight-claude | 2026-06-07T09:00Z |
| grow | apps/web/__tests__/entitlements-dev-admin.test.ts, apps/web/__tests__/middleware-contract.test.ts | overnight-claude | 2026-06-07T09:00Z |

## Completed (Run 1)

- bootstrap: npm install + db:generate — restored full test suite
- security-sweep: NODE_ENV guards added to DEV_FAKE_ADMIN bypasses
- improve: prepare script added to packages/db/package.json
- grow: 4 regression tests added for production guard invariant
