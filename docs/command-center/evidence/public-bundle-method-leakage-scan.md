# Public Bundle Method Leakage Scan

Date: 2026-06-09

## Result

Status: PASS for checked public static assets.

Scope:

- `apps/web/.next/static`
- `apps/web/public`

This was a targeted public bundle scan, not a formal third-party security audit.

## Commands

Sensitive pattern scan:

`rg -n --hidden --glob '!**/*.map' --glob '!**/cache/**' "sk_live_|whsec_|postgres://|postgresql://|STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET|DATABASE_URL|DIRECT_URL|ANTHROPIC_API_KEY|GOOGLE_CLIENT_SECRET|NEXTAUTH_SECRET|DEV_FAKE_ADMIN" apps/web/.next/static apps/web/public`

Methodology pattern scan:

`rg -n --hidden --glob '!**/*.map' --glob '!**/cache/**' "private prediction|engine weight|model weight|source weighting|founder-only|aggregation formula|bookmakerCoverageMax|gateDecision|v5\.0\.0-seed" apps/web/.next/static apps/web/public`

## Findings

- No checked secret values or sensitive env key names were found in public static assets after the final rebuild.
- No checked founder-methodology strings were found in public static assets.
- One earlier client bundle contained the literal `DEV_FAKE_ADMIN` in admin dashboard instructional copy. That copy was removed from `apps/web/app/admin/dashboard/dashboard-view.tsx`, rebuilt, and rescanned clean.
- Server bundles contain expected server-only internals such as Prisma model names and scoring fields. Those are not public static assets, but they should still be handled as private implementation detail.

## Remaining Risk

This scan used a targeted pattern list. Before launch, run a fuller source and bundle audit with a maintained secret scanner and a founder-methodology phrase list.
