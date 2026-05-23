# Next.js 15.5.18 Security Upgrade

Date: 2026-05-23
Branch: sports-intelligence-os-phase-9-ci

## Why This Happened

The web app was upgraded from Next.js 14.2.x to 15.5.18 to clear the high-severity Next.js production advisory while keeping the launch gates closed and the existing product behavior intact.

## Package Changes

- `next`: `^14.2.15` to `^15.5.18`
- `eslint-config-next`: `^14.2.15` to `^15.5.18`
- `qs`: resolved to `6.15.2`
- Root `postcss` resolution is pinned through npm override, but Next 15.5.18 still carries its own nested `postcss@8.4.31`

## Runtime/API Changes

Next 15 treats several request APIs as async. The app was migrated where it used these APIs:

- `headers()` is awaited in the picks page origin resolver.
- Dynamic route `params` are typed as promises and awaited in app pages and API routes.
- Page `searchParams` are typed as promises and awaited before use.
- `next.config.mjs` now uses `serverExternalPackages` instead of the removed experimental key.
- `outputFileTracingRoot` is pinned to the monorepo root so a stray lockfile outside the repo does not affect tracing root inference.

## Verification

Commands completed on 2026-05-23:

```powershell
npm.cmd run typecheck
npm.cmd run lint --workspace=apps/web
npm.cmd run test
npm.cmd run test:brand-safety --workspace=apps/web
npm.cmd run build
npm.cmd run deploy:ready
npm.cmd audit --omit=dev --json
npm.cmd run smoke:prod -- --url=https://www.galaxysportsedge.com
```

Results:

- Typecheck: pass
- Web lint: pass
- Full tests: pass, 1,777 tests
- Brand-safety tests: pass, 632 tests
- Build: pass
- Deploy readiness: pass with 1 expected warning for Anthropic 401 while `PUBLIC_BLOG_ENABLED=false`
- Production smoke against `www.galaxysportsedge.com`: pass

## Security Posture

- High advisories: cleared
- `qs` advisory: cleared
- Remaining production audit item: moderate `postcss` advisory through Next's nested dependency

Decision: accept the remaining moderate for this upgrade. Do not force Next 16 as part of this patch. Revisit when a Next 15 backport or a stable Next 16 production path is available.

## Bundle Deltas

Compared with the pre-upgrade baseline from the audit:

| Route | Before | After | Delta |
| --- | ---: | ---: | ---: |
| `/` | 114 kB | 123 kB | +7.9% |
| `/picks` | 109 kB | 118 kB | +8.3% |
| `/pricing` | 103 kB | 113 kB | +9.7% |
| `/dashboard` | 96.2 kB | 106 kB | +10.2% |
| `/admin/dashboard` | 97 kB | 107 kB | +10.3% |

The two dashboard routes are just over the 10% audit line, but remain low in absolute size and are not public landing paths. Public routes are within threshold.

## Notes

- Production has not been redeployed by this note alone.
- The Anthropic key still needs rotation before content automation is enabled.
- The upgrade does not enable public picks, performance stats, true EV, Kelly, blog publishing, or featured pick promotion gates.
