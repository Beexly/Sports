# Codex / ChatGPT prompt — finish the Galaxy Sports Edge Vercel deploy

Paste everything below into Codex. It's a self-contained brief.

---

You are finishing a Vercel production deploy for a Next.js 14 monorepo. Most of the work is done; you just need to push through the last step. Run in Windows PowerShell.

## State as of right now

- **Working directory:** `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`
- **GitHub repo:** `Beexly/Sports` — branch `sports-intelligence-os-phase-9-ci` at commit `fb0291d` (already pushed to origin)
- **Vercel project:** `sports-web` (id `prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL`) under team scope `pick-pilot-s-projects`, user `pickpilotapp@gmail.com`
- **Vercel production branch:** already set to `sports-intelligence-os-phase-9-ci`
- **Env vars:** all 26 saved in Vercel (NEXTAUTH_URL, DATABASE_URL placeholders, GOOGLE_CLIENT_*, STRIPE_*, THE_ODDS_API_KEY, ANTHROPIC_API_KEY, NEXTAUTH_SECRET, CRON_SECRET, the trust-gate flags — all in place)
- **Domain:** `galaxysportsedge.com` mapped to Vercel
- **Vercel CLI:** already installed globally, already authenticated as `pickpilotapp@gmail.com`
- **Build config:** `vercel.json` at repo root sets `buildCommand` to `cd ../.. && npm run db:generate && npm run build --workspace=@sports/web` with `installCommand: cd ../.. && npm install` and `rootDirectory: apps/web`

## What's currently blocked

A previous PowerShell run of `npx vercel link` is hung on an interactive prompt:
> `Working with Vercel is easier with the Vercel Plugin for Claude Code. Would you like to install it? (Y/n)`

The Vercel for GitHub webhook is not auto-triggering builds (`vercel.com/pick-pilot-s-projects/sports-web/deployments` shows only one failed `main` build from earlier; pushes to `sports-intelligence-os-phase-9-ci` are not being picked up). We need to deploy directly via the CLI.

## What you need to do

1. **Kill the hung process** (if it's still running):
   ```powershell
   Get-Process node, vercel -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'vercel|PowerShell' } | Stop-Process -Force -ErrorAction SilentlyContinue
   Get-Process | Where-Object { $_.ProcessName -eq 'WindowsTerminal' -and $_.MainWindowTitle -match 'vercel-deploy|Windows PowerShell' } | Stop-Process -Force -ErrorAction SilentlyContinue
   ```

2. **Pre-link the project non-interactively** by writing `.vercel/project.json` directly so `vercel link` is unnecessary:
   ```powershell
   cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
   New-Item -ItemType Directory -Path .vercel -Force | Out-Null

   # We know the projectId. We need the orgId — fetch it via Vercel API
   $token = (Get-Content "$env:USERPROFILE\.local\share\com.vercel.cli\auth.json" -ErrorAction SilentlyContinue | ConvertFrom-Json).token
   if (-not $token) {
     $token = (Get-Content "$env:APPDATA\com.vercel.cli\auth.json" -ErrorAction SilentlyContinue | ConvertFrom-Json).token
   }
   if (-not $token) {
     Write-Error "Vercel token not found — run 'vercel login' interactively then re-run this"
     exit 1
   }

   $team = Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } -Uri "https://api.vercel.com/v2/teams?slug=pick-pilot-s-projects"
   $orgId = $team.id

   @{ projectId = "prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL"; orgId = $orgId } | ConvertTo-Json | Set-Content .vercel/project.json
   Write-Host "Linked: orgId=$orgId  projectId=prj_ZAFYsTbVviP2iiSZdzQcloZVHkBL"
   ```

3. **Deploy to production**, piping `n` to skip any interactive plugin-install prompt:
   ```powershell
   "n`nn`nn" | vercel --prod --yes --no-clipboard
   ```
   Watch the output. The CLI will upload the source, trigger a build on Vercel, and print the production URL when it's done.

4. **If `vercel.json` `rootDirectory` causes issues** (the project root is `apps/web` per the Vercel project setting, but the CLI runs from the repo root), force the project root override:
   ```powershell
   cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports\apps\web"
   "n`nn`nn" | vercel --prod --yes --no-clipboard
   ```

5. **Watch the build** at `https://vercel.com/pick-pilot-s-projects/sports-web/deployments`. If it fails, read the build logs and report the error message verbatim. Common failure modes:
   - **Prisma generate not running** → check that the `vercel.json` `buildCommand` is being respected; the project's Build Command override in Vercel settings might be empty (which makes Vercel default to `npm run build`, skipping `db:generate`). If so, in Vercel → Settings → Build & Deployment → set Build Command to `cd ../.. && npm run db:generate && npm run build --workspace=@sports/web`
   - **Missing env var at build time** → the build will say `Error: ENV_VAR_NAME is not set`. Add it to Vercel env vars and redeploy.
   - **TS strict-mode error** → patch the offending file with the minimum change needed to compile, commit, push, and run `vercel --prod --yes` again.

6. **When deploy succeeds**, verify with the smoke test:
   ```powershell
   cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
   node scripts/post-deploy-smoke.mjs --url=https://galaxysportsedge.com
   ```
   This hits every public route, robots.txt, sitemap.xml, OG image, and `/api/health`. It exits non-zero on any failure.

## Acceptance criteria

- `https://galaxysportsedge.com` returns the Galaxy Sports Edge homepage with "Find the signal before the market moves." in the hero
- The smoke test prints `Result: all green. Ship it.` (or `Result: live, N warning(s).` is OK too)
- The deploy is visible in the Vercel dashboard as a successful Production build on branch `sports-intelligence-os-phase-9-ci`

## What NOT to do

- Don't modify any of the env vars unless a build error explicitly demands it
- Don't change the Vercel production branch back to `main`
- Don't paste the Anthropic API key, Stripe keys, or NEXTAUTH_SECRET back into chat — they're already in Vercel
- Don't commit `.vercel/project.json` (it's typically gitignored, and contains identifiers that don't need to be in source control)

If you hit a hard wall, paste the exact error message and what step you're on, and I'll give you the next move.
