# Paste this whole thing into a fresh claude.ai (browser) chat

You are helping me finish configuring **AWS Bedrock**, **Microsoft Azure AI Foundry**, and confirming **Google Vertex AI**
as Claude providers for my app "GalaxySportsEdge" (internal name for this system: **Jynx credit-stack**). The goal:
route Claude inference through cloud credits (AWS Activate, Azure Founders Hub / credits, Google partner credits)
instead of paying Anthropic cash directly. The code side is already built and unit-tested — this is purely a
console/credentials-gathering exercise. Walk me through it console-by-console; I will paste back what I see on
screen. Do not use computer-use/browsing tools to log into anything yourself — I will always be the one clicking
in AWS/Azure/Google console tabs, not you.

## Ground rules (follow exactly)

1. **Never invent or guess a resource name, model ID, region, or key.** If I haven't given you a real value copied
   from a console, leave that field as `<TODO: paste from console>` in your output. A wrong/guessed model ID makes
   the app throw and silently fall back to paying Anthropic cash — that's the exact failure mode I'm trying to avoid.
2. Treat anything I paste that looks like a secret (access key, API key, service-account JSON) as sensitive: don't
   repeat it back more than once, don't summarize its contents, and remind me once, gently, that this chat holds
   live credentials so I shouldn't share the link or screenshot it publicly.
3. Ask me one cloud at a time. Don't move to the next cloud until we've either captured everything for the current
   one or I say "skip this one."
4. At the very end, output ONE consolidated block of environment variables, using **exactly** the variable names
   listed below (these are hard-coded in the app's source, not flexible) — nothing else mixed in — so I can paste it
   straight into Vercel → Project → Settings → Environment Variables (Production).

## What "done" looks like per cloud

### 1. AWS Bedrock
Walk me through:
- Bedrock console → **Model access** → request/grant access to the Claude models I want (Sonnet, Haiku at minimum).
- Once granted, have me copy the **exact model IDs** shown in the console (they look like
  `anthropic.claude-sonnet-...-v2:0` or an inference-profile ARN/ID — copy verbatim, don't paraphrase).
- IAM: a user or role with `bedrock:InvokeModel` permission scoped to those models (least privilege — not
  full AdministratorAccess). Have me generate an access key pair for it (or confirm we're using a role, in
  which case skip the key pair and tell me so).
- Confirm the AWS region Bedrock is enabled in for Claude (e.g. `us-east-1`).

Target env vars (exact names, from source):
```
CLAUDE_PROVIDER=bedrock          # or "auto" once more than one cloud is done
AWS_ACCESS_KEY_ID=<TODO>
AWS_SECRET_ACCESS_KEY=<TODO>
AWS_BEDROCK_REGION=<TODO, e.g. us-east-1>
BEDROCK_MODEL_MAP={"claude-sonnet-4-6":"<TODO exact console id>","claude-haiku-4-5-20251001":"<TODO exact console id>"}
```

### 2. Azure AI Foundry
Walk me through:
- Azure AI Foundry portal → create/open a project → deploy an **Anthropic Claude** model (Sonnet + Haiku) from the
  model catalog.
- Have me copy the **resource name** (the subdomain before `.services.ai.azure.com`) — just the short name, not
  the full URL, unless the endpoint shape is unusual, in which case capture the full base URL instead.
- Have me copy the **API key** from the Foundry project's Keys/Endpoint page.
- Have me copy the **exact deployment/model name(s)** shown in the Foundry deployments list for each Claude tier.
- Ask me to confirm the billing meter on this resource is actually eligible for Claude/Foundry inference under
  whatever credit program I'm on (Founders Hub, sponsorship, etc.) — some older Azure sponsorship SKUs exclude
  Anthropic models, so don't assume $0 without me confirming.

Target env vars (exact names, from source):
```
CLAUDE_PROVIDER=azure            # or "auto" once more than one cloud is done
AZURE_FOUNDRY_RESOURCE=<TODO resource name>          # OR AZURE_FOUNDRY_BASE_URL=<TODO full https:// URL ending /anthropic>
AZURE_FOUNDRY_API_KEY=<TODO>
AZURE_FOUNDRY_MODEL_MAP={"claude-sonnet-4-6":"<TODO exact deployment/model id>","claude-haiku-4-5-20251001":"<TODO exact deployment/model id>"}
```

### 3. Google Vertex AI (recap — likely already have the service account)
I already have a Vertex service-account key and project ID for this. Just confirm/gather:
- The Vertex **region** where Anthropic Model Garden Claude models are available for my project (e.g. `us-east5`).
- The **exact Vertex model IDs** from Model Garden for the tiers I use (they look like
  `claude-sonnet-4-6@20250514`-style versioned IDs — copy verbatim from the console, don't guess the version
  suffix).

Target env vars (exact names, from source):
```
CLAUDE_PROVIDER=vertex           # or "auto" once more than one cloud is done
GOOGLE_VERTEX_PROJECT=<my GCP project id>
GOOGLE_VERTEX_REGION=<TODO, e.g. us-east5>
GOOGLE_APPLICATION_CREDENTIALS_JSON=<single-line service-account JSON — I already have this, don't ask me to paste it here, just remind me to fill it in myself when I assemble the final block>
VERTEX_MODEL_MAP={"claude-sonnet-4-6":"<TODO exact console id>","claude-haiku-4-5-20251001":"<TODO exact console id>"}
```

## Once two or more clouds are gathered

Ask me which failover order I want (default preference in the app is `bedrock,azure,vertex`), then also give me:
```
CLAUDE_PROVIDER=auto
JYNX_CLOUD_ORDER=bedrock,azure,vertex      # reorder if I said otherwise
JYNX_CLOUD_FAILOVER=true
```

## Final deliverable

One single fenced code block containing every env var we gathered, one per line, `KEY=value`, no commentary
inside the block, ready for me to copy-paste into Vercel. Leave any value I never provided as
`<TODO: paste from console>` rather than guessing — I'd rather see a visible gap than a silent wrong value.

After I paste that into Vercel Production and redeploy, tell me to run this from my terminal to confirm it
actually armed (this part you don't need to do, just remind me):
```
node scripts/ops/verify-credit-stack.mjs
```
