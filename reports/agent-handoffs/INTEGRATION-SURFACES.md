# Galaxy Sports Edge Brand Integration Surfaces

This pass turns brand from an idea into enforceable code. The source of truth is
`@sports/brand`; other packages must import from it rather than hardcoding
identity, colors, voice rules, or legal copy.

## Added Packages

- `@sports/brand` - product identity, color tokens, grade styles, microcopy,
  voice rules, and banned claim vocabulary.
- `@sports/ui-brand` - reusable React components backed by `@sports/brand`:
  mark, wordmark, grade tiles, confidence meter, Edge Index badge, states,
  disclaimer, site chrome primitives, and tabular number formatting.
- `@sports/emails` - transactional HTML templates for welcome, receipt, weekly
  recap, and password reset.
- `@sports/social-formatters` - Twitter/X, Discord, and push-format composers
  with length limits and hype-scrubbing.

## Guardrails

- `npm run lint:brand` blocks hardcoded brand drift outside approved source
  files.
- `npm run guard:trust` continues to scan customer-facing surfaces for banned
  claims. Brand policy definitions are whitelisted, but the phrases remain
  blocked everywhere public.
- `.github/workflows/brand-lint.yml` runs brand lint plus package tests on PRs.
- `.github/PULL_REQUEST_TEMPLATE.md` adds the brand checklist to every PR.

## Runtime Hardening Included

Several DB-backed pages now opt into request-time rendering with
`export const dynamic = "force-dynamic"` so `next build` does not require a live
database to prerender operational surfaces.

The server entitlement and settled-correlation loaders now fail closed when the
database is unavailable:

- entitlement lookup falls back to `FREE`
- correlation history falls back to an empty row set

That keeps local/test/preview environments from accidentally granting access or
inventing historical evidence.

## Verification

Validated in `C:\Users\Garrett\Sports`:

- `npm run typecheck`
- `npm run lint --workspace=apps/web`
- `npm run test`
- `npm run test:brand-safety --workspace=apps/web`
- `npm run build`
- `npm run guardrails`

`npm run deploy:ready` is blocked in this clone because no
`.env.production.local` is present; the script reports missing production
environment variables rather than code failures.
