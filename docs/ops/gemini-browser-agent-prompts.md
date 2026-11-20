# Gemini Browser Agent Prompt Pack (`Zero Founder Clicks`)

This runbook eliminates manual dashboard clicks for external auth and storefront steps.

## Already Resolved Autonomously on Workstation (`0` Browser Steps Needed)
- **Fish Audio (`s2.1-pro-free`):** `FISH_AUDIO_API_KEY` and `FISH_AUDIO_TTS_MODEL` in `c:\Users\Garrett\Sports\.env.local` are now auto-detected by `scripts/ops/fish-audio-tts.mjs` and `scripts/ops/fleet-monitor.mjs`.
- **Sentry Exporter Collector (`otelcol-contrib`):** Windows binary installed at `%USERPROFILE%\.local\bin\otelcol-contrib.exe`, `infra/otel/collector-config.yaml` configured with `10%` probabilistic sampling + `auto_create_projects: { enabled: true }` + `otlphttp/latitude` tee + `debug` exporter, and validated via `node scripts/ops/start-otel-collector.mjs --validate`.
- **Note on Placeholder Sentry Env Vars:** `SENTRY_ORG_SLUG` and `SENTRY_AUTH_TOKEN` added to `c:\Users\Garrett\Sports\.env.local` are **placeholder** environment variables (`your-sentry-org-slug`, `your-sentry-auth-token`) for the browser agent or user to replace with actual Sentry credentials.
- **All 10 Headless Model API Lanes & 7 Cloudflare Workers:** Configured, hardened, and passing `npm run ops:monitor` (`HTTP 200`).

---

## Prompt 0: Master One-Shot `/browser` Prompt (Sentry Exporter + NanoGPT Pro + Whop Storefront)

Paste this directly into Gemini Browser Agent (`/browser`) using your signed-in Chrome profile:

```text
Work through these 3 browser tasks in my signed-in Chrome tabs cleanly and give me back one ready-to-run PowerShell snippet with every extracted value (mask nothing in my local terminal snippet, or write exact placeholder instructions if any page requires 2FA):

1) SENTRY EXPORTER CREDENTIALS (https://sentry.io):
   - Open my active Sentry organization settings.
   - Copy the exact Organization Slug (`SENTRY_ORG_SLUG`) and verify that at least 1 Team exists under Settings -> Teams (because `auto_create_projects: true` assigns new projects to the first team).
   - Go to Settings -> Developer Settings -> Internal Integrations (or Auth Tokens) and create/copy a token with `project:read`, `project:write`, `org:read`, and `event:write` scopes (`SENTRY_AUTH_TOKEN`).

2) NANOGPT PRO SUBSCRIPTION API KEY (https://nano-gpt.com/api):
   - Open my active NanoGPT Pro account (60M weekly units / 100 daily images, active through Dec 5, 2026).
   - Copy an existing API key or create one named `gse-hermes-sub`, and print the key for `%LOCALAPPDATA%\hermes\.env` (`NANOGPT_API_KEY`). Remember we ONLY hit `https://nano-gpt.com/api/subscription/v1`, never PAYG `/api/v1`.

3) WHOP STOREFRONT & CHECKOUT LINKS (https://whop.com/dashboard/biz_jzvuDvevsatKWi/):
   - CRITICAL SAFETY GUARDRAIL: NEVER touch, move, or point `galaxysportsedge.com` or `www.galaxysportsedge.com` root DNS at Whop. Root domain stays on Vercel. Only manage `galaxy-sports-edge.whop.site` and app `app_PrbVglxvAeazeA`.
   - Locate or create the 6 checkout links matching our Value Ladder:
     * `WHOP_CHECKOUT_PRIMETIME_STANDARD` ($9 one-time Week 11 TNF IND @ HOU Pack)
     * `WHOP_CHECKOUT_THANKSGIVING_STANDARD` ($14 one-time Week 12 Thanksgiving 5-Game Pack)
     * `WHOP_CHECKOUT_SUNDAY_STANDARD` ($29 one-time Week 11 Sunday Full-Slate Pack)
     * `WHOP_CHECKOUT_MEMBERSHIP_FOUNDING` ($39/mo Pro Founding Tier Membership)
     * `WHOP_CHECKOUT_MEMBERSHIP_STANDARD` ($79/mo Elite Full Card + 150-Lineup MME DFS Membership)
     * `WHOP_CHECKOUT_MEMBERSHIP_REST_OF_SEASON` ($149 one-time Rest of Season + Playoffs Pass)
   - In Whop App Builder (`app_PrbVglxvAeazeA`), populate `src/data/storefront-products.json` from `https://www.galaxysportsedge.com/products.json`, restore Terms (`https://www.galaxysportsedge.com/terms`) and Privacy (`https://www.galaxysportsedge.com/privacy`) footer links, point `/record`, `/board`, `/clv`, `/performance`, `/proof`, `/verify`, `/auth/signin`, and interactive DFS links to `https://www.galaxysportsedge.com/...`, and republish `galaxy-sports-edge.whop.site`.

When done, output ONE copy-paste PowerShell block that replaces the placeholders in `c:\Users\Garrett\Sports\.env.local` and `%LOCALAPPDATA%\hermes\.env` cleanly.
```

---

## Prompt 1: AWS Startup Credits SSO Refresh (`034220092205` / `hq@galaxysportsedge.com`)

First trigger the CLI session locally (it exits 0 if already active):

```powershell
powershell -ExecutionPolicy Bypass -File c:\Users\Garrett\Sports\scripts\ops\aws-sso-refresh.ps1
```

Then give `/browser` this prompt:

```text
Look at the AWS SSO / AWS Builder Login confirmation tab that just opened in Chrome.
Confirm that the account ID shown is `034220092205` (`hq@galaxysportsedge.com` startup-credit account - NEVER personal AWS).
Click "Confirm and continue" / "Allow access" so the local `aws login --profile gse` CLI session completes.
```

---

## Prompt 2: Sentry Exporter Org Slug & Auth Token Only (`sentry.io`)

```text
Go to https://sentry.io/settings/ while signed into my GSE organization.
1. Record the Organization Slug (`SENTRY_ORG_SLUG`).
2. Open Settings -> Teams and verify at least 1 team exists (create `gse-engineering` only if 0 teams exist).
3. Open Settings -> Developer Settings -> Internal Integrations (or User Auth Tokens) and create/copy an auth token (`SENTRY_AUTH_TOKEN`) with `project:read`, `project:write`, `org:read`, `event:write`.
Return a PowerShell snippet to replace the placeholder `SENTRY_ORG_SLUG` and `SENTRY_AUTH_TOKEN` values in `c:\Users\Garrett\Sports\.env.local`, then run `node c:\Users\Garrett\Sports\scripts\ops\start-otel-collector.mjs --validate`.
```

---

## Prompt 3: NanoGPT Pro API Key Extraction Only (`nano-gpt.com`)

```text
Go to https://nano-gpt.com/api while signed into my Pro subscription account (active until Dec 5, 2026, 60M weekly units / 100 daily images).
Copy an existing active API key (or create one named `gse-sub`).
Return one PowerShell command to set `NANOGPT_API_KEY=<key>` and `NANOGPT_DISABLED=false` in `%LOCALAPPDATA%\hermes\.env`, then verify with `node c:\Users\Garrett\Sports\scripts\ops\nanogpt-subscription-monitor.mjs`.
```

---

## Prompt 4: Whop Storefront `app_PrbVglxvAeazeA` Catalog & Checkout Links Only

```text
Go to https://whop.com/dashboard/biz_jzvuDvevsatKWi/ and App Builder for `app_PrbVglxvAeazeA`.
DO NOT point `galaxysportsedge.com` or `www.galaxysportsedge.com` DNS to Whop. Keep the root domain on Vercel.
1. Sync `src/data/storefront-products.json` with `https://www.galaxysportsedge.com/products.json`.
2. Ensure Terms (`https://www.galaxysportsedge.com/terms`) and Privacy (`https://www.galaxysportsedge.com/privacy`) appear in the footer, and point live dynamic pages (`/record`, `/board`, `/clv`, `/performance`, `/proof`, `/verify`, `/auth/signin`, `/fantasy/dfs`) back to `https://www.galaxysportsedge.com/...`.
3. Copy or create the 6 checkout URLs (`WHOP_CHECKOUT_PRIMETIME_STANDARD`, `WHOP_CHECKOUT_THANKSGIVING_STANDARD`, `WHOP_CHECKOUT_SUNDAY_STANDARD`, `WHOP_CHECKOUT_MEMBERSHIP_FOUNDING`, `WHOP_CHECKOUT_MEMBERSHIP_STANDARD`, `WHOP_CHECKOUT_MEMBERSHIP_REST_OF_SEASON`) and republish `galaxy-sports-edge.whop.site`.
```

---

## Prompt 5: Optional Cloud Enhancements (`Cloudflare API Token`, `Deepgram $200`, `MongoDB Atlas`)

```text
Collect optional cloud tokens for automated CLI/edge dispatch:
1. Cloudflare Dashboard (Account `46f1c1d1c65d19f3f983713b3a8ab67c`): Create an API Token (`CLOUDFLARE_API_TOKEN`) with `Workers AI:Read`, `Browser Rendering:Edit`, `Workers Scripts:Edit`, `D1:Edit`.
2. Deepgram Console (`console.deepgram.com`): Copy API key (`DEEPGRAM_API_KEY`) backed by the $200 credit grant for `workers/airwave-listener`.
3. MongoDB Atlas (`cloud.mongodb.com` startup credits): Copy Data API endpoint URL + API key (or Atlas connection string) for `MONGODB_ATLAS_DATA_API_URL` and `MONGODB_ATLAS_DATA_API_KEY`.
Return PowerShell commands to write them into `%LOCALAPPDATA%\hermes\.env` and `c:\Users\Garrett\Sports\.env.local`.
```
