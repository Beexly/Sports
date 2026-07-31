# CURRENT_STATE

Updated: 2026-07-30 (APEX boot)

**MAIN HEAD:** `3dfbc726c7c296f4f187a856f14ac91f03c9a985`  
**SoT:** `CANONICAL.md` + Production `/cockpit`  
**class_A:** 0

## Production truth

- main HEAD includes free-spine ship (`a3d015b`) + jarvis fixes + **gamma cron pause B-0** (`3dfbc726`).
- Older note that `4b4ae1e` did not build is **superseded** — free-spine fix is on main.
- Env: `DATABASE_URL` + `DIRECT_URL` = gse-postgres. `CRON_SECRET` rotated. `GEMINI_API_KEY` set.
- Smoke green historically: gamma 401/200 (route still exists; **schedule paused**). `/api/health` db ok.
- Health "degraded" = stale paid-Odds ingestion only. Free-spine is the strategic path; do not re-buy paid Odds for free path.
- DB real: 837 games · 1622 picks · ~1.18M odds rows (as of prior ops note). Empty: odds_line_snapshots, teams, leagues, historical_games (verify before claims).
- Repo visibility: treat as **no secrets in repo, ever**.

## Law

LIVE_BOARD=off · oddsApiRequired=false · refuse-default · CPA blocked · externalActions NONE  
`PERFORMANCE_STATS_ENABLED` and `PUBLIC_PICKS_ENABLED` must stay false without explicit YES.

## Agent OS

- Primary run-from-this: `docs/gse/GSE_GROK_APEX_AUTONOMOUS_PROMPT.md`
- Checklist companion: `docs/gse/GSE_GROK_MASTER_AUTONOMOUS_PLAN.md`
- CLAUDE.md outranks APEX on conflict — declare conflicts explicitly.

## Dual scheduler

See `CRON_MATRIX.md`. Gamma schedule paused (B-0). Actions settle hourly only.

## Founder-only remaining

Formal `prove:neon` local run · optional free AI keys (Groq/xAI) · explicit YES gates only

## Explicit YES only

LIVE_BOARD · PUBLISH_LEDGER · public picks · Phase C · #226 HEOS · re-enable gamma schedule post-registry
