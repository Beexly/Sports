# CURRENT_STATE

Updated: 2026-07-30

**MAIN:** AI-first cockpit prime + free-spine-health cron
**SoT:** `CANONICAL.md` + Production `/cockpit`
**class_A:** 0

## Production truth
- Green on commit `1dbcca9`. Redeployed 2x today after env fix.
- main HEAD `4b4ae1e` does NOT build. Verified 7-file fix patch delivered, NOT pushed. Do not redeploy from HEAD until pushed.
- Env fixed: `DATABASE_URL` + `DIRECT_URL` = gse-postgres (current password). `CRON_SECRET` rotated. `GEMINI_API_KEY` set.
- Smoke green: gamma 401 bad Bearer / 200 good Bearer. `/api/health` db check ok.
- Health "degraded" = stale ingestion only. Paid Odds API key deactivated ~Jul 25. Free-spine patch is the strategic fix.
- DB real: 837 games · 1622 picks · ~1.18M odds rows. Empty: odds_line_snapshots, teams, leagues, historical_games.
- Repo is PUBLIC (Beexly/Sports). No secrets in repo, ever.

## Law
LIVE_BOARD=off · oddsApiRequired=false · refuse-default · CPA blocked · externalActions NONE
Enforced 2026-07-30: `PERFORMANCE_STATS_ENABLED` and `PUBLIC_PICKS_ENABLED` found true in Production (violation), flipped false.

## AI runs (you watch)
- 13 Vercel crons incl. free-spine-health, jarvis-snapshot, free settle. **gamma is NOT scheduled** ÔÇö paused in `3dfbc726` (B-0) pending a counsel-approved source-rights entry for Polymarket Gamma
- Command Center attention + multi-source cues in Jarvis
- Draft tasks from jarvis-snapshot
- Cockpit operating map 28 surfaces · Agent OS draft-primed

## Founder-only remaining
Formal `prove:neon` local run · optional free AI keys (Groq/xAI) · push build-fix patch decision

## Explicit YES only
LIVE_BOARD · PUBLISH_LEDGER · public picks · Phase C · #226

## Orbit unlock

See `docs/ops/ORBIT_UNLOCK.md` · `docs/agent-skills/` · `npm run agent:eval`.
