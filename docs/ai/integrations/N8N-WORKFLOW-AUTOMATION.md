# n8n: Visual Workflow Automation — AI + Sports APIs + Everything Else

> Source: `n8n-io/n8n` (Fair Code, 62k★)
> Purpose: No-code/low-code automation glue layer — connect Claude, sports APIs, email, Slack, Google Sheets, and 400+ other services without writing integration code

## What This Solves

After Waves 1–3, GSN has excellent code-level tooling. What's missing is the **glue layer**:

- Every new integration requires writing TypeScript code and deploying it
- Ad-hoc tasks (weekly market research → Google Sheet → Slack summary) involve multiple tools with no orchestration
- Personal productivity workflows (morning sports briefing, alert routing, research summaries) aren't automated
- Testing a Claude prompt against a new data source requires a dev environment

n8n is the answer. Visual workflow builder + 400+ connectors + Claude integration + self-hosted (your data stays local). It's the "connect everything without writing code" layer that sits ABOVE the codebase.

**Critical distinction**: n8n is NOT for replacing TypeScript code in the production app.
It's for:
1. **Personal workflow automation** — the workflows that aren't worth writing a full TypeScript module for
2. **Rapid prototyping** — test a Claude integration with a new data source in 10 minutes
3. **Operations automation** — alert routing, data exports, report generation
4. **The glue** — connect GSN's systems to external services without new deployments

## How It Differs from OpenHands

| | OpenHands | n8n |
|---|---|---|
| Primary use | Autonomous code agent (writes and runs code) | Visual workflow automation (no code required) |
| Claude integration | Runs Claude Code internally as an agent | Node-level connector (AI Transform, HTTP Request) |
| Trigger types | Manual, schedule, GitHub event | 400+ triggers (webhook, schedule, email, etc.) |
| Data flow | Agent decides the flow | You define the flow visually |
| Best for | "Fix this bug" / "write this test" | "When X happens, do Y with Z" |
| Infrastructure | Docker required | Docker or n8n.cloud |

## Installation

```bash
# Self-hosted (recommended — your sports data stays local)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Open: http://localhost:5678

# OR: n8n.cloud (hosted, free tier: 5 workflows + 5,000 executions/month)
```

## GSN Use Case 1: Morning Sports Briefing (Personal)

Every morning at 7am: fetch today's games → ask Claude for key angles → send to phone via Pushover.

**n8n workflow** (JSON import):
```json
{
  "name": "Morning Sports Briefing",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "cronExpression", "expression": "0 7 * * *" }] } }
    },
    {
      "name": "Fetch Today's Games",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds",
        "qs": { "apiKey": "={{ $env.ODDS_API_KEY }}", "markets": "spreads" }
      }
    },
    {
      "name": "Claude Analysis",
      "type": "@n8n/n8n-nodes-langchain.lmChatAnthropic",
      "parameters": {
        "model": "claude-haiku-4-5-20251001",
        "messages": {
          "values": [{
            "content": "Analyze today's NFL slate. For each game, give me: the key narrative in one sentence, and whether the spread looks sharp or square. Format as a bullet list. Games: {{ JSON.stringify($json) }}"
          }]
        }
      }
    },
    {
      "name": "Send to Phone",
      "type": "n8n-nodes-base.pushover",
      "parameters": {
        "title": "GSN Morning Brief",
        "message": "={{ $json.text }}"
      }
    }
  ]
}
```

## GSN Use Case 2: PR Notification → Claude Review → Slack

When a PR opens on beexly/Sports, send the diff to Claude for a quick review summary, then post to #gsn-engineering:

```
GitHub Webhook → Extract diff → Claude review → Post to Slack
```

n8n nodes:
1. **Webhook** — receives GitHub PR event
2. **HTTP Request** — fetch the PR diff from GitHub API
3. **Anthropic** — `"Summarize this PR diff in 3 bullets: what changed, why it matters, any risks. Diff: {{ $json.diff }}"`
4. **Slack** — post to `#gsn-engineering` with PR link + Claude summary

This replaces the need to manually read every PR — Claude reads it and surfaces the important bits.

## GSN Use Case 3: Weekly Competitor Intelligence Scrape

Every Monday, scrape competitor sports betting apps' public pages, extract positioning changes, and update a Google Sheet:

```
Schedule (Monday 8am) → [Parallel]
  → Fetch competitor A homepage
  → Fetch competitor B homepage
  → Fetch competitor C homepage
→ Claude: "What changed in their positioning/offers vs last week?"
→ Append to Google Sheet
→ Slack summary to #gsn-strategy
```

## GSN Use Case 4: User Win Alert → Social Post Draft

When a pick settles as WIN with 75%+ confidence, draft a social post:

```
GSN Webhook (POST /n8n/pick-settled)
  → Filter: result == "WIN" AND confidence >= 75
  → Claude: "Write a celebratory tweet about this win: {{ pick.selection }} covered at {{ pick.confidence }}% confidence. Keep it under 280 chars, no guarantees, professional tone."
  → Buffer/Typefully: schedule the tweet for 2 hours after settlement
```

Set up: add a webhook call in `settle-sport.ts` when a high-confidence pick wins:
```typescript
if (result === "WIN" && pick.confidence >= 75) {
  await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pickId: pick.id, selection: pick.selection, confidence: pick.confidence }),
  });
}
```

## GSN Use Case 5: ELITE Tier Onboarding Sequence

When a user upgrades to ELITE, trigger a 7-day onboarding sequence via n8n:

```
GSN Webhook (POST /n8n/subscription-upgraded)
  → Filter: tier == "ELITE"
  → Day 0: Send welcome email (Resend)
  → Wait 1 day
  → Day 1: Send "How to read the confidence scores" email
  → Wait 2 days
  → Day 3: Check if user has viewed 3+ picks → if not, send re-engagement email
  → Day 7: Send "7 days in" summary with their picks record
```

This entire onboarding sequence lives in n8n — no code changes needed to adjust timing or copy.

## Personal Productivity Workflows (Local Machine)

Beyond GSN, n8n multiplies personal efficiency:

### Research → Notion
```
Reddit posts on /r/sportsbook
  → Claude: "Extract the 3 most interesting betting angles from these posts"
  → Append to Notion database: "Market Research"
```

### Email → Action
```
New email with subject "urgent"
  → Claude: "Summarize this email and suggest the single most important action"
  → Create task in Linear/Notion
  → Reply with acknowledgment
```

### GitHub Stars → Knowledge Base
```
When you star a GitHub repo
  → Fetch README
  → Claude: "How could this be useful for a sports betting intelligence platform? 2 sentences."
  → Append to Notion: "Interesting Repos"
```

## Local Setup

```bash
# Start n8n locally
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=changeme \
  n8nio/n8n

# Access at http://localhost:5678

# Add credentials in n8n UI:
# - Anthropic: ANTHROPIC_API_KEY
# - Slack: Bot token
# - GitHub: Personal access token
# - Google Sheets: OAuth
# - The Odds API: API key
```

## n8n Claude Node

n8n has a built-in Anthropic node (LangChain-based):
- **AI Transform** — pipe data through Claude with a custom prompt
- **Chat** — multi-turn conversation node
- **Summarize** — built-in summarization
- Models: any Claude model via API key

## Self-Hosted vs n8n.cloud

| | Self-hosted (Docker) | n8n.cloud |
|---|---|---|
| Cost | Your hosting (~$5/mo DigitalOcean) | Free (5 workflows) / $20/mo (unlimited) |
| Data residency | Your server | n8n's servers |
| Maintenance | You update Docker | Managed |
| Custom code | `Code` node with full Node.js | Same |
| Recommended for GSN | Yes — sports data stays local | Fine for personal workflows |

## Status

- [ ] `docker run -p 5678:5678 n8nio/n8n` — start locally
- [ ] Add credentials: Anthropic, Slack, GitHub, Google Sheets, Odds API
- [ ] Build "Morning Sports Briefing" workflow (quick win, immediate value)
- [ ] Build "PR → Claude Review → Slack" workflow
- [ ] Add webhook call to `settle-sport.ts` for high-confidence WIN alerts
- [ ] Build ELITE tier onboarding sequence (7-day email drip)
- [ ] Deploy to a $5/mo DigitalOcean droplet for always-on operation
- [ ] Export all workflows as JSON and commit to `docs/n8n-workflows/` for version control
