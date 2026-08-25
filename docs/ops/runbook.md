# Ops Runbook — Beexly/Sports (Lean)

## Deploy Checklist (Vercel)

1. Confirm CI green on the target branch (all required checks).
2. Merge to `main` (or promote the preview).
3. Vercel auto-deploys production from `main`.
4. Verify health:
   - `/api/health` or equivalent returns 200
   - Board / cockpit loads without errors
   - Critical crons (if scheduled) fire correctly
5. Spot-check one prediction surface and one auth flow.

## Rollback Checklist

> **Full version: [`ROLLBACK.md`](ROLLBACK.md)** — migration reversibility table,
> what each kill switch actually does when flipped off, and how to confirm recovery.
> Read that one during an incident; this is the summary.

1. In Vercel dashboard → Deployments → find previous successful production deployment → Promote to Production.
2. Or: `vercel rollback` (CLI) if available.
3. Schema compatibility: Promote does **not** re-run the build, so it does not roll
   migrations back. Every migration is additive (guarded by
   `apps/web/__tests__/migration-additivity.test.ts`), so an older app against a
   newer schema is a safe state. See `ROLLBACK.md` §3.
4. Re-run health checks — and `node scripts/post-deploy-smoke.mjs`, which is the
   only thing that checks whether pages actually render. Confirm the rollback landed
   via `deployment.sha` on `/api/health`.
5. Announce in internal notes if user-facing impact occurred.

## Incident Checklist (Severity Order)

1. **Contain**: Disable public surfaces if needed — `PUBLIC_PICKS_ENABLED=false`
   (not `LIVE_BOARD`, which gates nothing on the public board; see `ROLLBACK.md` §4).
   A flag change needs a redeploy to take effect, so for a bad deploy, Promote is
   faster. Do **not** use `WATCHLIST_ALERTS_ENABLED` as a kill switch until PR #632
   lands — flipping it off writes permanent `SUPPRESSED` rows.
2. **Assess**: Check Vercel logs, GitHub Actions, Neon metrics, PostHog (if enabled).
3. **Communicate**: Internal only until severity confirmed.
4. **Fix**: Prefer hotfix PR with full CI; avoid direct main commits.
5. **Verify**: Post-fix health + one end-to-end path.
6. **Post-mortem**: Short note in docs/ops/ within 48h (what, impact, prevention).

## Secret Hygiene

- Never commit `.env*` (already in .gitignore).
- Rotate NEXTAUTH_SECRET, STRIPE keys, ODDS_API_KEY, CRON_SECRET on any suspicion of leak.
- Use Vercel Environment Variables + GitHub Secrets only.
