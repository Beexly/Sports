# Founder Windows ops (CMD / PowerShell)

Agent recovery snippets often assume bash. On **Windows CMD** those fail for two reasons:

1. `gh workflow run` needs `--repo Beexly/Sports` (or a git remote in the current directory).
2. **CMD does not treat single quotes as string wrappers** — `jq '{ok,...}'` is a syntax error. Use double quotes.

## Health (no jq required)

```bat
curl -sS https://www.galaxysportsedge.com/api/health
```

## Health (with jq) — CMD

```bat
curl -sS https://www.galaxysportsedge.com/api/health | jq "{ok: .ok, status: .status, ingestion: .checks.ingestion}"
```

## Health — PowerShell

```powershell
curl.exe -sS https://www.galaxysportsedge.com/api/health | jq '{ok,ingestion:.checks.ingestion}'
```

(`curl.exe` avoids PowerShell's `curl` alias.)

## Fire free-spine (from any directory)

```bat
gh workflow run external-cron.yml --repo Beexly/Sports -f target=free-spine-health
```

Other targets: `refresh-player-stats` · `settle-picks` · `jarvis-snapshot` · `refresh-odds`

```bat
gh run list --repo Beexly/Sports --workflow=external-cron.yml --limit 5
```

## Authenticated free-spine (optional — if you have Production CRON_SECRET)

```bat
set CRON_SECRET=paste-from-vercel-production
curl -sS -H "Authorization: Bearer %CRON_SECRET%" https://www.galaxysportsedge.com/api/cron/free-spine-health
```

PowerShell:

```powershell
$env:CRON_SECRET = "paste-from-vercel-production"
curl.exe -sS -H "Authorization: Bearer $env:CRON_SECRET" https://www.galaxysportsedge.com/api/cron/free-spine-health
```

## Founder 5-minute money unblock (Vercel env only)

| Env | Value / action |
|-----|----------------|
| `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` | Same DSN from Sentry project `gse-web` (see live-state package) |
| `GSE_WAITLIST_GATE_ENABLED` | `false` or delete — opens `/waitlist` for leads |
| `STRIPE_*_PRICE_ID` (6 vars) | Live IDs in `MONEY_PATH_LIVE_2026-08-06.md` |
| Free-lane (margin) | `CONTENT_FREE_LANE_ENABLED=true` + Cerebras key |
| Claude credits | `CLAUDE_PROVIDER=auto` + cloud maps |

After env changes: redeploy or wait for next main deploy.

## Already green (do not re-debug)

- `/api/health` ok when free-spine/External Cron has fired recently
- Stripe GSE webhook enabled; medusa foreign endpoint disabled
- #258 brand / LIVE_BOARD / rights fork = founder product calls only

## Repo path for `gh` without --repo

```bat
cd C:\Users\Garrett\Sports
gh workflow run external-cron.yml -f target=free-spine-health
```

(Only works if that clone has `origin` → `Beexly/Sports`.)
