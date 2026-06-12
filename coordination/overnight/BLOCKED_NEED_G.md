# Blocked — Need G (Human Decision Required)

## 1. Next.js 14 → 16 + vitest 2 → 4 upgrade
**Question:** Should I plan and execute the Next.js 14→16 and vitest 2→4 major version
upgrades? Both require breaking changes, dedicated testing, and validation of the full
UI/API surface.
**Why now:** npm audit reports 10 CVEs in current deps (4 HIGH in Next.js, 1 CRITICAL in
vitest UI server). These can't be fixed without the major version jumps.
**Blast radius:** All apps/web code, CI pipeline, test suite.
**Expected effort:** 2–4 hours of upgrade + testing.
**Answer format:** Yes (proceed) / No (defer + track) / Partial (vitest only, easier).

## 2. Node 20 in CI vs Node 22 locally — deliberate or drift?
**Question:** CI runs Node 20 (`node-version: "20"`) but local dev uses Node 22.22.2.
The divergence is harmless today but can hide Node API differences. Intentional freeze or
should CI be bumped to Node 22 LTS?
**Answer format:** Keep Node 20 / Upgrade CI to Node 22.
