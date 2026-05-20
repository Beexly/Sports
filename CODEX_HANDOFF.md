# CODEX / ChatGPT Hand-Off — Run These From Your Local Machine

I'm Claude operating in Cowork mode. There are two things I cannot do from my sandbox that I'm handing to you (the user) or Codex/ChatGPT to execute on the actual Windows machine:

1. **Delete `.git/index.lock`** — Windows ACL blocks my sandbox from writing to `.git/`
2. **Commit + push to GitHub** — same reason
3. **Sign up for Neon Postgres / Upstash Redis** — these need account creation

Everything else is done. Files ready in the workspace:
- `VERCEL_ENV.txt` — paste-ready env block (gitignored, never commits)
- `.launch-secrets/secrets.env` — generated NextAuth + Cron secrets (gitignored)
- `LAUNCH_TONIGHT.md` — full sequence
- `social/launch-day.md` — three rounds of posts for X / IG / Threads / FB

---

## Block 1 — Run in PowerShell to push the code (5 min)

Copy-paste this entire block into PowerShell:

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"

# 1. Kill the stale git lock
Remove-Item .git\index.lock -Force -ErrorAction SilentlyContinue

# 2. Configure git identity (one-time)
git config user.email "pickpilotapp@gmail.com"
git config user.name "Garrett Baxley"

# 3. Sanity check
$count = (git status --short | Measure-Object).Count
Write-Host "About to commit $count file changes"

# 4. Stage everything (the .gitignore protects secrets)
git add -A

# 5. Commit
git commit -m "Launch night: pickpilotapp.bet domain wiring, /about /press /observatory /vault, social row, SEO, OG image"

# 6. Push to current branch
git push origin sports-intelligence-os-phase-9-ci
```

If `git push` asks for credentials and you don't have a personal access token handy, paste this prompt into Codex/ChatGPT:

> *"I need to push to a GitHub repo `Beexly/Sports` from Windows PowerShell. I don't have a personal access token set up. Walk me through generating a PAT at github.com/settings/tokens with `repo` scope and using it to authenticate this push, in 4 steps or fewer."*

---

## Block 2 — Tell Vercel to deploy the feature branch (30 sec)

1. Vercel → your project → **Settings → Git**
2. **Production Branch:** change from `main` to `sports-intelligence-os-phase-9-ci`
3. Save

That alone triggers a build. It'll fail because env vars aren't set yet — **expected, ignore.**

---

## Block 3 — Paste env vars into Vercel (5 min)

Open `VERCEL_ENV.txt` in your workspace folder. Then in Vercel:

1. **Settings → Environment Variables → Import .env**
2. Paste the entire contents of `VERCEL_ENV.txt`
3. Scope: **Production + Preview + Development**
4. Save

Three values are still `PASTE_…_HERE` placeholders. Skip those for now and finish Block 4 to fill them.

---

## Block 4 — Sign up for Neon + Upstash (15 min)

**Neon Postgres** (free tier):
1. Go to **neon.tech** → sign up with `pickpilotapp@gmail.com`
2. Create project → name `pickpilot-prod`, region **US East (Ohio)** (matches Vercel's `iad1`)
3. From the dashboard → **Connection Details** panel
4. Copy the **pooled connection string** → paste into Vercel as `DATABASE_URL`
5. Copy the **direct connection string** (toggle "Direct connection") → paste into Vercel as `DIRECT_URL`

**Upstash Redis** (free tier):
1. Go to **upstash.com** → sign up with same email
2. Create database → name `pickpilot-queue`, region **us-east-1**, type **Regional**
3. Enable **TLS** (the free `rediss://` URL — not `redis://`)
4. Copy the **Connect URL** → paste into Vercel as `REDIS_URL`

---

## Block 5 — Trigger the real deploy (1 min)

After Block 3 + 4 are done:

1. Vercel → **Deployments** tab
2. On the latest (failed) deploy, click the `...` menu → **Redeploy**
3. **Uncheck** "Use existing build cache" — env-var changes need a clean build
4. Click **Redeploy**

Watch the build log. If it goes green, hit `https://pickpilotapp.bet` and the site is live.

---

## Block 6 — Smoke test (3 min)

Quick checklist:

- [ ] `https://pickpilotapp.bet` → homepage loads with PickPilot wordmark + plasma gradient
- [ ] Click "See methodology" → page renders
- [ ] Click "Picks" in nav → page renders (will show "No picks published" — expected, ingestion hasn't run yet)
- [ ] Click "Observatory" in nav → page renders with "Status · Pre-launch" card
- [ ] Click "The Vault" in nav → page renders with "Status · Collecting" card
- [ ] Footer shows X / IG / Threads / FB icons → click one → opens your real account
- [ ] `https://pickpilotapp.bet/api/health` → returns JSON
- [ ] Click "Sign in" → Google OAuth flow → lands back on `/dashboard`

If anything is red, paste the symptom into Codex with this prompt:

> *"My Next.js 14 monorepo just deployed to Vercel at pickpilotapp.bet. This is happening: [symptom]. The relevant config is in the repo at apps/web. What's the most likely cause and the one-line fix?"*

---

## What's left after the site is live

- **Round 1 social posts** — open `social/launch-day.md`, copy the launch announcement, post to all four platforms
- **Canva assets** — same file has the spec for the 4 graphics you need (15 min each)
- **Tomorrow:** rotate the Anthropic API key (`console.anthropic.com` → revoke the one in chat, create new, paste into Vercel)
- **Day 7–30:** follow the gate-flipping cadence in `LAUNCH_TONIGHT.md`
