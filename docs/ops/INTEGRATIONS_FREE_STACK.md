# Free-Only Integrations & Auth Apps Stack

**Date:** 2026-08-17  
**Mandate:** $0 spend. Free tiers only. One tool per category. Revoke everything else.

## Live posture (probed 2026-08-17)

- Health: `ok: true`, status healthy
- Ingestion: recent SUCCESS
- Settlement: healthy, 0 overdue
- Dependabot: lean weekly config already live
- CodeQL: active workflow present
- CI: GitHub Actions native

## Minimal active free stack (target ≤ 8)

| Category | Winner | Status |
|----------|--------|--------|
| Deploy | Vercel (hobby free) | KEEP |
| CI | GitHub Actions | KEEP |
| Dep updates | Dependabot (already configured) | KEEP |
| Secrets scanning | GitHub native secret scanning + push protection | ENABLE if not on |
| Static analysis | CodeQL (already present) | KEEP |
| Backend | Neon free | KEEP (one only) |
| Product analytics | PostHog free (5 events max) or none | Optional |
| Coverage | Codecov free/soft informational only | Optional, soft only |
| AI coding | Max 1–2 that you open weekly | Cap hard |

## Explicit REVOKE list (do in UI today)

Revoke these if present (GitHub Installations + OAuth Apps):

- Mergify (unless proven free and saving hours)
- Extra AI connectors beyond 1–2
- WakaTime
- Pipedream (unless live free automations)
- Postman / Hoppscotch (if unused)
- Qodo / Qodo.ai
- Google Cloud Build
- HackerOne Code
- Imgbot
- Kilo Code Bot
- Linear + Linear Code
- Manus Connector
- Azure App Service / Boards / Pipelines
- Botpress Cloud
- CircleCI
- Codacy
- coderabbitai
- cto.new
- GitKraken (if not daily)
- Snyk
- Socket Security
- SonarQube / SonarCloud
- Any second backend (Supabase / Railway / Render extras)

## Founder-only UI steps (cannot be automated here)

1. https://github.com/settings/installations — uninstall everything on the REVOKE list
2. https://github.com/Beexly/Sports/settings/installations — same at repo level
3. https://github.com/settings/applications — prune Authorized OAuth Apps + Developer applications to only product-required ones (GitHub OAuth for auth, Vercel, Stripe if present, Neon/PostHog free if used)
4. Repo → Settings → Code security and analysis:
   - Enable Dependabot alerts + security updates
   - Enable Secret scanning + push protection
   - Confirm CodeQL is on
5. Branch protection on `main`: require only free native CI checks (lint/type-check/build/secret-scan). No paid-tool required checks.

## Nova Act note

- Free: experimentation via `nova.amazon.com/act` API keys only
- Paid: $4.75 / agent hour on AWS Nova Act service
- Do **not** promote any GSE workflow to the paid AWS service under free-only mandate

## Already correct in repo

- `.github/dependabot.yml` — lean, weekly, majors ignored, grouped
- Native GitHub Actions CI
- CodeQL workflow present
- `docs/ops/cost-controls.md` + `runbook.md` exist

## Do not do

- Install any new marketplace app with paid risk
- Enable hard Codecov / Sonar / Snyk gates
- Keep multiple AI coding apps
- Put paid Odds key back while free path is the posture
- Flip LIVE_BOARD / PUBLIC_PICKS / calibration gates

After you finish the UI revokes, paste the remaining installed app names and this doc will be updated with the final locked list.
