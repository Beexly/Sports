# CODEX — Galaxy Sports Edge final-mile deploy

Copy everything from this file straight into Codex / ChatGPT. It is self-contained. The goal: take `galaxysportsedge.com` from "code ready, DNS half-wired" to "site is live."

---

You are finishing the launch of **Galaxy Sports Edge** — a sports intelligence Next.js 14 monorepo. The brand pivot and code are 100% done. Three things remain that I (the upstream agent) could not finish autonomously: (a) Cloudflare DNS to Vercel, (b) Vercel env-var domain update, (c) the actual Vercel CLI deploy.

## State of the world

| Thing | Status |
|---|---|
| Domain | **galaxysportsedge.com** — registered at Cloudflare, Zone `a6533da632c41c348b918fb4b0e25795`, Account `262f9daba818a405a528ca8d4b05ba67` |
| GitHub | `Beexly/Sports`, branch `sports-intelligence-os-phase-9-ci`, HEAD `fb0291d` (+ uncommitted brand-pivot changes — see commit step) |
| Vercel project | `sports-web` (id `prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`) under team `pick-pilot-s-projects`, production branch already set to `sports-intelligence-os-phase-9-ci` |
| Vercel domains | `galaxysportsedge.com` + `www.galaxysportsedge.com` added — both show **Invalid Configuration** (DNS not pointed at Vercel yet) |
| Vercel env vars | All 26 are set, **but** `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` still say `https://pickpilotapp.bet` (old domain) — must be updated to `https://galaxysportsedge.com` |
| Vercel CLI | Installed and authenticated as `pickpilotapp@gmail.com` |
| Build config | `vercel.json` at repo root sets `buildCommand: cd ../.. && npm run db:generate && npm run build --workspace=@sports/web` |
| Audit | Clean — 0 PickPilot residuals customer-facing, 0 old-domain refs, 0 banned-phrase violations on customer surfaces |

## DNS records Vercel wants on Cloudflare

Get them by clicking `Edit` → DNS Records tab on either `galaxysportsedge.com` or `www.galaxysportsedge.com` in https://vercel.com/pick-pilot-s-projects/sports-web/settings/domains, OR use the canonical Vercel defaults:

- **Apex** (`galaxysportsedge.com`): CNAME @ → `ab97365c55901869.vercel-dns-017.com` (the apex CNAME Vercel issued for this project). Cloudflare supports CNAME-flattening at the apex.
- **Apex TXT verification:** TXT @ → `vc-domain-verify=galaxysportsedge.com,d1f25b46fcba42caa741,dc`
- **WWW:** CNAME `www` → `cname.vercel-dns.com`

CRITICAL Cloudflare gotcha: set every record's **proxy status to "DNS only" (gray cloud)**, NOT Proxied (orange). Vercel handles its own SSL termination; orange-cloud will cause SSL handshake errors.

## Block 1 — Commit and push the pending brand-pivot changes

I left ~50 files modified locally (brand pivot from PickPilot → Galaxy Sports Edge). Push them so Vercel sees the latest code.

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
if (Test-Path .git\index.lock) { Remove-Item .git\index.lock -Force }
git config user.email "pickpilotapp@gmail.com"
git config user.name  "Garrett Baxley"
$count = (git status --short | Measure-Object).Count
Write-Host "Committing $count file changes"
git add -A
git commit -m "Galaxy Sports Edge: brand pivot — new palette, logo, OG, taglines, surfaces, social posts, smoke test patterns"
git push origin sports-intelligence-os-phase-9-ci
```

## Block 2 — Update Vercel env vars

Go to https://vercel.com/pick-pilot-s-projects/sports-web/settings/environment-variables and edit the two URL env vars:

- `NEXTAUTH_URL` → `https://galaxysportsedge.com`
- `NEXT_PUBLIC_APP_URL` → `https://galaxysportsedge.com`

Leave every other env var alone. Don't redeploy yet — Block 3 handles that.

## Block 3 — Update Google OAuth redirect URIs

The OAuth client is `96558622288-e7csm4hg6vvbn8nlg1b1aatpt7tbn9f8.apps.googleusercontent.com`. Go to https://console.cloud.google.com → APIs & Services → Credentials → click the client.

Add to **Authorized JavaScript origins**:
- `https://galaxysportsedge.com`
- `https://www.galaxysportsedge.com`

Add to **Authorized redirect URIs**:
- `https://galaxysportsedge.com/api/auth/callback/google`
- `https://www.galaxysportsedge.com/api/auth/callback/google`

You can keep the old `pickpilotapp.bet` entries or delete them — either is fine. Save.

## Block 4 — Wire Cloudflare DNS

In https://dash.cloudflare.com/262f9daba818a405a528ca8d4b05ba67/galaxysportsedge.com/dns/records:

- Delete any pre-existing parking A/AAAA records on the apex.
- Add CNAME `@` → `ab97365c55901869.vercel-dns-017.com`, **Proxy: DNS only (gray cloud)**, TTL Auto.
- Add TXT `@` → `vc-domain-verify=galaxysportsedge.com,d1f25b46fcba42caa741,dc`, TTL Auto.
- Add CNAME `www` → `cname.vercel-dns.com`, **Proxy: DNS only**, TTL Auto.

Save. Wait 30–60 sec for propagation.

## Block 5 — Confirm Vercel sees the DNS

Back in https://vercel.com/pick-pilot-s-projects/sports-web/settings/domains, click **Refresh** next to both `galaxysportsedge.com` and `www.galaxysportsedge.com`. The red "Invalid Configuration" badges should turn into green checkmarks within a minute or two.

## Block 6 — Deploy via Vercel CLI (the actual launch)

Run from PowerShell:

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

# Pipe 'n' four times so any interactive prompts (e.g. the Vercel Plugin
# for Claude Code "install? (Y/n)" prompt) auto-dismiss.
"n`r`nn`r`nn`r`nn" | vercel --prod --yes --no-clipboard
```

What happens:
- CLI uploads the local source (the brand-pivot is on disk and committed).
- Vercel triggers a production build using `vercel.json`'s `buildCommand`.
- Watch for the build URL printed in stdout.
- Build runs `npm run db:generate` (Prisma) and `next build`. Should succeed because `vercel.json` includes the db:generate step that the old `main` branch was missing.
- When done, the CLI prints the production URL.

If the CLI prompts for project link, choose the existing `sports-web` project. If it asks `Set up and deploy?`, answer `Y`. If anything else hangs, kill the script and rerun with `vercel --prod --yes` from inside `apps/web`.

## Block 7 — Smoke test

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
node scripts/post-deploy-smoke.mjs --url=https://galaxysportsedge.com
```

What it checks:
- All 13 public routes return 200 and contain expected brand strings
- robots.txt, sitemap.xml, OG image
- `/api/health` returns JSON
- Security headers present
- No banned phrases in rendered HTML (lock-of-the-day, sure thing, etc.)

Expect: `Result: all green. Ship it.` or `Result: live, N warning(s).` — both are passing states.

## If the build fails

The most likely failure is the build command. Vercel sometimes ignores `vercel.json` if the project's UI override is set. Fix:
1. Go to https://vercel.com/pick-pilot-s-projects/sports-web/settings (Build and Deployment).
2. Set **Build Command (override)** to: `cd ../.. && npm run db:generate && npm run build --workspace=@sports/web`
3. Set **Install Command (override)** to: `cd ../.. && npm install`
4. Set **Root Directory** to: `apps/web`
5. Redeploy: in the Deployments page, click the latest deploy's `...` → Redeploy.

## When the site is live

1. Smoke test green
2. Visit `https://galaxysportsedge.com` — homepage should show: orbital mark, "GALAXY / SPORTS EDGE" wordmark, hero "Find the signal before the market moves.", cyan + magenta accents
3. Click through Signal Feed / Edge Map / Galaxy IQ / The Vault / Calibration Report
4. Sign in with Google → /dashboard renders
5. Open `social/launch-day.md` in the repo, copy Round 1 X post, post it
6. Rotate the Anthropic API key (`console.anthropic.com` → revoke → new key → paste into Vercel) — it was visible in transcripts earlier in this session

## Acceptance

You're done when:
- `https://galaxysportsedge.com` returns 200 with the GSE brand
- Smoke test prints "all green" or "live"
- The first social post is up

Report back the smoke-test summary (or first error verbatim if anything goes red). I'll fix in one round-trip.
