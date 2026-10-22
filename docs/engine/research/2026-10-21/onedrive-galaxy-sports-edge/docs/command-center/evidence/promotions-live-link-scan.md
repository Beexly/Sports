# Promotions / Live-Link Scan

As of: 2026-06-09

## Verified Against Real App

- /promotions returned 200 and rendered a safe empty state.
- The route includes affiliate disclosure and responsible-gaming style language.
- apps/web/lib/promotions/guards.ts requires disclosure, responsible gaming text, terms URL, eligibility evidence, approved status, and operator approval before public display.
- /api/promotions returned 500 because Prisma promotion query could not authenticate to local DB.

## Risk

Public shell is safer than a link dump, but the API must fail closed. Seed fixtures include example affiliate URLs and an intentionally bad offer for guard testing; those must never become production data.

## Launch Status

YELLOW/RED: compliant shell exists, but live-link and API behavior are not launch-ready.
