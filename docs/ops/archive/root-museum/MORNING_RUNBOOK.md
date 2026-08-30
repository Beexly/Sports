# Morning Runbook — StatKing integrated & green; launch is owner-gated

_Updated overnight 2026-06-13. Branch: `claude/friendly-fermat-fy99m2`._

---

## What happened overnight (the short version)

1. Codex's StatKing work finally landed on GitHub as **PR #19**
   (`codex/upgrade-galaxy-statking-to-nfl-intelligence-system`). Earlier in the
   night it was stranded on your laptop and its "created the PR" claims weren't
   real yet — now it's actually pushed.
2. **PR #19 as-is does NOT build.** I found and fixed three real defects, then
   integrated the whole thing onto this branch. Everything is now green.
3. **The site still isn't auto-live** — going to production needs your Vercel
   secrets + Postgres (Section 3). That part only you can do.

## What I fixed (all verified)

| # | Defect | Fix |
|---|---|---|
| 1 | **Build crash.** `/admin/statking/crown` + `/backtests` crashed at prerender reading `coverage_report.json`, which an over-broad `coverage/` gitignore rule had excluded from the repo. | Anchored the ignore rule, committed the report, and hardened `readJson()` so a missing snapshot degrades to an honest empty state instead of crashing. |
| 2 | **Security hole.** All **31 `/admin/statking/*` cockpit pages had no access control** — world-readable. | Added the standard `auth()` + `role !== "ADMIN"` + `redirect()` guard to every page (enforced by `admin-routes-gating.test.ts`). |
| 3 | **SEO gap.** The **26 public `/stats/*` pages had no metadata.** | Added unique `title` / `description` / `canonical` to each. |

**Verified state of this branch:** `typecheck` 0 errors · `next build` exit 0 (288 routes) · **4,538 tests pass (316 files)**.

## What is REAL vs. foundation (do not over-claim)

StatKing is a **rights-gated foundation**, not a finished "King of Stats." Per
codex's own handoff (`handoff/claude/statking/DO_NOT_BREAK.md`):
- Data is **fixture/snapshot-backed**, not live feeds. Don't market it as live.
- Many `/stats/*` and `/admin/statking/*` pages are still **placeholder stubs**
  (a heading + one line). They build, are secure, and are indexed — but they are
  **not yet world-class UX.** Real content/UX is the next body of work
  (`handoff/claude/statking/TODO_FOR_CLAUDE.md` lists 25 prioritized tasks).
- Rights gates, fixture labels, and source lineage must **not** be weakened.

## 3. Go-live checklist (owner-gated — only you can do these)

The Vercel project `sports-web` serves `galaxysportsedge.com` but reports
`live: false`; every deploy so far is a branch preview. Production needs:

1. **Set Production env vars in Vercel** (Settings → Env Vars → Production):
   `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `THE_ODDS_API_KEY`,
   `ANTHROPIC_API_KEY`, `REDIS_URL`, `STRIPE_SECRET_KEY`,
   `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_PRO_MONTHLY_PRICE_ID`, `STRIPE_PRO_ANNUAL_PRICE_ID`,
   `STRIPE_ELITE_MONTHLY_PRICE_ID`, `STRIPE_ELITE_ANNUAL_PRICE_ID`,
   `NEXT_PUBLIC_APP_URL=https://galaxysportsedge.com`.
2. **Provision Postgres** (pooled `DATABASE_URL` + direct `DIRECT_URL`). The
   production build runs `prisma migrate deploy` automatically.
3. **Verify before promoting:** create `.env.production.local`, then
   `node scripts/check-deploy-readiness.mjs` — expect all green.
4. **Stripe:** live keys + webhook at `/api/webhooks/stripe`;
   `node scripts/seed-stripe-prices.mjs` if price IDs aren't created.
5. **Promote to production** in Vercel (set production branch / promote a build).

## Branch note

- **This branch (`claude/friendly-fermat-fy99m2`) is the corrected, green
  one** — it has StatKing + the three fixes + all tests passing.
- **PR #19's own branch still has the build break** (my fixes aren't on it; I'm
  scoped to develop on this branch). To ship StatKing, merge **this** branch, or
  tell the next session to push the three fixes onto the PR #19 branch.
- Repo hygiene: there are **60+ branches with no common history**. Converging on
  one canonical line (this one) and retiring the rest is the real fix for work
  getting stranded.

## TL;DR

StatKing is **in, building, secure, and tested** on this branch. It is a solid
foundation — not yet a finished product, and not yet live. To launch: set the
Vercel Production secrets + Postgres (Section 3) and promote. To make it truly
"world-class," work through `handoff/claude/statking/TODO_FOR_CLAUDE.md`.
