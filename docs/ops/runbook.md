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

1. In Vercel dashboard → Deployments → find previous successful production deployment → Promote to Production.
2. Or: `vercel rollback` (CLI) if available.
3. Confirm DATABASE_URL / secrets still match the rolled-back code (schema compatibility).
4. Re-run health checks.
5. Announce in internal notes if user-facing impact occurred.

## Incident Checklist (Severity Order)

1. **Contain**: Disable public surfaces if needed (LIVE_BOARD=off, feature flags).
2. **Assess**: Check Vercel logs, GitHub Actions, Neon metrics, PostHog (if enabled).
3. **Communicate**: Internal only until severity confirmed.
4. **Fix**: Prefer hotfix PR with full CI; avoid direct main commits.
5. **Verify**: Post-fix health + one end-to-end path.
6. **Post-mortem**: Short note in docs/ops/ within 48h (what, impact, prevention).

## Secret Hygiene

- Never commit `.env*` (already in .gitignore).
- Rotate NEXTAUTH_SECRET, STRIPE keys, ODDS_API_KEY, CRON_SECRET on any suspicion of leak.
- Use Vercel Environment Variables + GitHub Secrets only.
