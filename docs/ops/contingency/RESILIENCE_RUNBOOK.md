# Resilience Runbook — Galaxy Sports Edge

Authoritative index for operating Galaxy under degraded conditions.
This is the entry point. Every other doc in `docs/ops/contingency/`
extends a section of this runbook.

## Reliability tiers

| Tier | Surfaces | Target |
|---|---|---|
| T1 — Trust-critical | `/today`, `/picks`, `/no-bet`, `/room/[gameId]`, `/api/telemetry` | 99.9% monthly, p95 < 1.5s |
| T2 — Decision-support | `/autopsy`, `/parlay-mri`, `/command`, `/academy` | 99.5% monthly, p95 < 2.5s |
| T3 — Educational / static | `/methodology`, `/galaxy-demo`, `/about`, `/blog` | 99.0%, no latency target |

## Degradation ladder

1. **Green.** All providers up. Live odds, live calibration, telemetry firing.
2. **Bootstrap.** `THE_ODDS_API_KEY` absent or provider failing — render with `bootstrap: true` labels, suppress edge claims.
3. **Read-only.** DB writes failing — disable Save/Track widgets, surface a banner via `STATUS_PAGE_TEMPLATES.md`.
4. **Static fallback.** App server down — Cloudflare/Vercel edge serves cached `/today`, `/galaxy-demo`, `/methodology`.
5. **Maintenance.** Planned outage — switch `GALAXY_LAUNCH_MODE` to `internal-calibration`, redirect to `/maintenance`.

## On-call decision tree

```
Alert fires → check STATUS_PAGE_TEMPLATES.md banner template
           ↓
Identify category:
  - Data provider issue       → DATA_PROVIDER_FAILOVER.md
  - DB / payments outage       → PAYMENTS_CONTINGENCY.md
  - AI surface failure         → AI_FAILURE_PLAYBOOK.md
  - Security event             → SECURITY_INCIDENT_PLAYBOOK.md
  - Trust / content incident   → USER_TRUST_RECOVERY_PLAYBOOK.md
  - Bad deploy                 → ROLLBACK_PLAYBOOK.md
  - Secret leaked              → SECRETS_ROTATION_PLAYBOOK.md
  - Data loss event            → BACKUP_RESTORE_DRILLS.md
           ↓
Activate appropriate kill switch from FEATURE_FLAG_KILL_SWITCHES.md
           ↓
Update status page per STATUS_PAGE_TEMPLATES.md
           ↓
Post-mortem within 72h, log in INCIDENT_RESPONSE_MATRIX.md
```

## Hard-coded invariants under all conditions

These never weaken regardless of degraded state:

- No fabricated picks (Constitution #5)
- No autonomous external posting (Constitution #14)
- No methodology client-side leak (Constitution #20)
- No live AI in CoachPromptHost without `COACH_LIVE_AI_ENABLED=true`
- No betting-volume optimization events emitted

## Drill cadence

| Drill | Frequency | Owner |
|---|---|---|
| Backup restore | Quarterly | Data |
| Provider failover | Quarterly | Platform |
| Rollback rehearsal | Per release | Eng |
| Secrets rotation | Twice yearly | Security |
| Incident tabletop | Quarterly | Eng leadership |
