# PickPilot Automation Architecture

**Decision: self-hosted n8n on Coolify. Week-1 setup.**

This is the long-term answer to "how do I run social media, content, and ops automation for PickPilot." It replaces Buffer / Hootsuite / Zapier — costs ~$5/mo, owns its own data, integrates with everything.

---

## Why this stack

You uploaded 9 candidate tools. Here's why three of them win and six lose:

| Tool | Verdict | Reasoning |
|---|---|---|
| **n8n** | ✅ Core | 400+ integrations, AI-native (LangChain), fair-code license, runs anywhere, has a real UI. Direct nodes for X, Twitter, Telegram, Discord, RSS, OpenAI/Anthropic, HTTP, webhooks, Postgres. |
| **Coolify** | ✅ Platform | Self-hosted Heroku/Vercel alternative. One-click deploys n8n, Postgres, Redis, Ghost. Runs on a $5/mo Hetzner VPS. |
| **Ghost** | 🟡 Optional | Newsletter platform. PickPilot already has a `/blog` route — Ghost only makes sense if you want to run a paid newsletter ("Weekly Edge — top 3 picks of the week, $5/mo"). |
| Bridgy | ❌ Skip | IndieWeb POSSE — wrong use case for PickPilot. |
| postwill | ❌ Skip | Ruby gem requiring custom glue code. n8n covers it with a UI. |
| Automated-Socialmedia-Posting | ❌ Hard skip | Browser-scraping FB/IG/X via Selenium. Against ToS. Will get accounts banned within days. |
| Social-Media-App | ❌ Wrong tool | A "build your own Facebook" tutorial. Not a posting tool. |

**Bottom line:** n8n + Coolify is what serious operators run. The other tools are either dangerous, niche, or duplicate what we already have.

---

## Architecture diagram

```
  ┌─────────────────────────────────────────────────────────────┐
  │  Hetzner CX11 VPS — $5/mo, Frankfurt or Ashburn            │
  │                                                             │
  │   ┌───────────────┐                                         │
  │   │   Coolify     │  ← self-hosted PaaS, web UI on :8000   │
  │   └───────────────┘                                         │
  │           │                                                 │
  │           ├── deploys ─→ n8n           (workflows, :5678)   │
  │           ├── deploys ─→ Postgres      (n8n state)          │
  │           ├── deploys ─→ Redis         (n8n queue)          │
  │           └── deploys ─→ Ghost (opt)   (newsletter, :2368)  │
  │                                                             │
  │   Public: automate.pickpilotapp.bet  ← Caddy/Traefik (Coolify) │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
       ┌────────────────────────────────────────────────────┐
       │              n8n workflows                         │
       │                                                    │
       │  • Daily post drafter:                             │
       │    Cron 9am → Anthropic API → review queue        │
       │                                                    │
       │  • Buffer/social pusher:                           │
       │    Approved post → Buffer API → IG/FB/X/Threads   │
       │                                                    │
       │  • Pick-published webhook:                         │
       │    pickpilotapp.bet/api/picks/published →         │
       │    n8n → auto-draft post → Slack for approval     │
       │                                                    │
       │  • Performance gate watcher:                       │
       │    Daily SELECT COUNT(*) FROM picks WHERE         │
       │    settled_at IS NOT NULL → Slack alert at 100    │
       │                                                    │
       │  • Health check:                                   │
       │    Every 5 min → GET pickpilotapp.bet/api/health  │
       │    → Slack alert on failure                        │
       └────────────────────────────────────────────────────┘
```

---

## Cost math vs SaaS

| Tool | SaaS price | Self-hosted equivalent | Savings |
|---|---|---|---|
| Zapier (5k tasks/mo) | $30/mo | n8n unlimited | $30/mo |
| Buffer (10 channels) | $15/mo | n8n + free APIs | $15/mo |
| UptimeRobot Pro | $7/mo | n8n cron + Slack | $7/mo |
| Make.com (basic) | $10/mo | n8n | $10/mo |
| **Total replaced** | **$62/mo** | **+$5/mo VPS** | **~$57/mo** |

Pays for itself in **3 days**. Over a year, ~$680 saved.

---

## Week-1 deploy plan

### Day 1 — Provision

1. Sign up at **hetzner.com/cloud** → create CX11 VPS, Ubuntu 22.04, Ashburn
2. SSH in, run the Coolify installer:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
3. Visit `http://<server-ip>:8000`, create admin account
4. Point a subdomain at it: `automate.pickpilotapp.bet` → A record → `<server-ip>` in Cloudflare DNS, gray cloud (DNS only)

### Day 2 — Deploy n8n

In Coolify UI:
1. **+ New Resource → Service → n8n** (one-click template)
2. Domain: `n8n.pickpilotapp.bet`
3. Set env vars: `N8N_BASIC_AUTH_ACTIVE=true`, `N8N_BASIC_AUTH_USER=<you>`, `N8N_BASIC_AUTH_PASSWORD=<strong>`
4. Deploy. Coolify provisions Postgres + Redis automatically.
5. Visit `https://n8n.pickpilotapp.bet`, sign in.

### Day 3 — Connect social APIs

For each platform, n8n has a built-in OAuth credential type. You do this ONCE per platform:

| Platform | n8n node | Auth |
|---|---|---|
| X (Twitter) | `Twitter` | Need X Developer account ($100/mo for posting via API — paid tier required) |
| Facebook | `Facebook Graph API` | Free, Facebook for Developers |
| Instagram | `Instagram` | Via Facebook Graph (same flow) |
| Threads | `HTTP Request` (no native node yet) | Meta's Threads API — still rolling out 2026 |
| Telegram | `Telegram` | Free bot via @BotFather |
| Discord | `Discord` | Free |
| Buffer | `Buffer` | Buffer free tier gives the cross-platform reach without per-platform API fees |

**Practical recommendation:** Use **Buffer** as the social fan-out layer. n8n drafts and approves → pushes to Buffer → Buffer handles the actual posting to IG/X/Threads/FB. This avoids the X $100/mo API tier AND the complexity of separate Meta + X + Threads OAuth flows.

### Day 4 — Build the first three workflows

**Workflow 1: Daily Anthropic-drafted post**
```
[Cron 9am CT] → [Anthropic node: "Draft an on-brand PickPilot post about
                  today's NBA slate. Voice: calm, technical, mission-control.
                  Banned: guaranteed, lock, sure thing. 280 char max."]
              → [Slack: "Approve daily post?" with Approve/Reject buttons]
              → on approve: [Buffer node: schedule for 6pm CT]
```

**Workflow 2: Pick-published auto-draft**
```
[Webhook: POST /pick-published]   ← PickPilot pings this on every pick
              → [HTTP node: GET pickpilotapp.bet/api/picks/{id}]
              → [Anthropic: draft a teaser post]
              → [Slack: review/approve]
              → [Buffer: schedule]
```

**Workflow 3: Health monitor**
```
[Cron every 5 min] → [HTTP: GET pickpilotapp.bet/api/health]
                  → [If status != 200] → [Slack alert]
```

### Day 5 — Ghost (optional)

If you want a newsletter:
1. Coolify → + New Resource → Ghost (one-click)
2. Domain: `newsletter.pickpilotapp.bet`
3. Connect Mailgun (free 1k emails/mo) for sending
4. n8n workflow: every Sunday, draft "Weekly Edge" → review → publish via Ghost API

If you don't want a newsletter yet: skip.

---

## What I'm NOT recommending

- **Don't fork n8n/Ghost/Coolify into the AI Sports monorepo.** They're separate services running on separate infrastructure. The CLAUDE.md preserve-integrity rule applies. Keep `Beexly/Sports` clean.
- **Don't use the Selenium scraper.** Accounts WILL be banned.
- **Don't pay for X API ($100/mo) tonight.** Use Buffer as the bridge until X traffic justifies the cost.

---

## What to do tonight vs Week 1

**Tonight:** finish the deploy of PickPilot itself. Don't touch n8n yet. Use Meta Business Suite (free, native IG + FB scheduling) and Buffer free tier (X + Threads).

**Week 1 (after deploy is stable):** follow this doc to stand up the n8n + Coolify stack. Move all automation to it.

This is the playbook for being a real operator instead of paying SaaS rent forever.
