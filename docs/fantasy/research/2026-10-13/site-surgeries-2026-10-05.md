# Site Surgeries — 2026-10-05

Garrett's orders, executed via Jules (all sessions run with fleet standards + plan approval + PR review before merge).

## 1. Methodology page — REMOVED from public site

- **Jules session:** `sessions/15640586322796356330`
- **Status:** Patch complete, PR submission in progress.
- **What it does:** Deletes the entire `/intelligence` route tree (`apps/web/app/intelligence/*` — clv, engines, expected-points, metrics, opportunity-transfer, players pages) and strips references from nav, footer, sitemap, and other pages (academy, airwave, board, calibration, deck, gsn) plus related tests.
- **Diff:** 34 files, +4 / −1,224.
- **Internal copy:** Methodology content stays in the repo under `docs/` for internal use — off the public site only.
- **Still to verify:** production build returns 404 on `/intelligence`, no internal links point to it.

## 2. Rankings links — REMOVED (rankings were never built)

- **Jules session:** `sessions/10535477016935886912`
- **Status:** In progress.
- **What it does:** Removes every nav link, footer link, CTA, and sitemap reference to `/rankings`. Rankings are NOT being built — dead surface removed only, per Garrett's call to focus on spreads, props, parlays, fantasy, and DFS.
- **Note:** Session produced an empty patch on its first pass after 50 work cycles; called out and redirected. Now reworking.

## 3. NGS — removed from public, stays in the engine

- **Jules session:** `sessions/5803381671283202624`
- **Status:** In progress (course-corrected).
- **What it does:** Removes every *public* NGS route and reference. NGS stays 100% internal as engine reasoning fuel.
- **Course correction:** First attempt only renamed "Next Gen" → "tracking" in UI copy — cosmetic hiding, not removal. Rejected. Redirected to: verify the internal ingestion routes (`/api/cron/ngs-ingest`, `/api/ops/ngs-backfill`) are actually auth-gated, delete any publicly reachable NGS-serving route, and remove public NGS references outside `/intelligence/` (that directory is being deleted by surgery #1 — no overlapping edits).
- **Doctrine:** Public site shows projections and rankings only. All NGS data, metric names, signals, and methodology stay internal.

## Verification checklist (runs after all three PRs merge)

- [ ] `/intelligence` returns 404 on production
- [ ] No internal link points to `/intelligence` or `/rankings`
- [ ] No public route serves NGS data (grep + build check)
- [ ] Sitemap contains no dead entries
- [ ] Full site regression: homepage, board, picks, and focus pages (spreads, props, parlays, fantasy, DFS) render clean

## Still open (Garrett's taps)

- **Neon password rotation** — `/board` and `/picks` are down (`DB_UNREACHABLE`); the exposed Oct 3 credential is the prime suspect. Only Garrett can rotate it in the Neon console.
- **v0 seats cancellation** (~$24/mo) — dashboard only.
- **Vercel spend budget** — dashboard only.
- **CodeRabbit app install** — one OAuth tap; unlocks automated PR review.

## Already landed today

- **Vercel cost surgery:** preview deployments disabled on `sports-web` (branch builds were the #1 cost driver); 10 dead sample projects paused (all reversible).
- **PR #703 merged** (squash `7104bf03`): launch-readiness audit doc + ledger row. Resolved a merge conflict and cleaned up pre-existing conflict markers baked into main. Two-agent review, both approved.

---
*Written 2026-10-05 ~18:15 CDT. Work in flight — this doc gets updated as PRs land.*
