# Google + Azure Leverage Map — Galaxy Sports Edge

Compiled 2026-07-17 from live consoles (both authenticated) + Gmail. Read-only — nothing changed, no secrets touched. Companion to `AWS_LEVERAGE_MAP.md`.

---

## TL;DR

- **Azure, do first (2 min):** your Foundry project **GSN has ZERO model deployments** — that's the only thing between you and Claude Code on Foundry. Deploy a Claude model (Deploy → Claude → accept Anthropic terms → name it), then run `Setup-ClaudeCode-Foundry.ps1`.
- **Google, biggest untapped pool:** GCP is set up (2 billing accounts) but has **$0 spend and zero credits** — the $300 free trial was never claimed, and **Google for Startups Cloud Program** (up to $200K, more for AI startups) was never applied for. Vertex AI is your product's second Claude lane, already code-supported.
- **Azure Founders Hub** (up to $150K + Azure OpenAI credits): still blocked by the Microsoft portal loop; your subscription shows no sponsorship. Retry from a fresh session/another browser profile.

---

## AZURE — verified state

- **Subscription:** "Azure subscription 1" (`5343ad2a-4ac2-43f7-8197-720ac4a77c69`), role **Owner**, status Active, **current cost $0.00**, tenant `baxleygarrettgmail.onmicrosoft.com` (personal Default Directory).
- **No sponsorship subscription** → Founders Hub credits never landed (consistent with the application loop + zero Microsoft emails in 120 days).
- **Foundry:** resource **GSN-resource** in **rg-baxley.garrett-3810**, project **GSN** (tenant `16268fef-581e-4a12-86dd-60e2a09529b3`). Endpoint = `https://gsn-resource.services.ai.azure.com` — the script's default `gsn-resource` is correct.
- **Deployments: NONE.** The Build → Models → Deployments page is in its empty state. **Nothing can call Claude via this resource until a model is deployed.**
- Project home exposes the API key (masked) + endpoints — grab the key from there when the script prompts.

### Azure actions, in order
1. **Deploy Claude in Foundry (founder, ~2 min):** GSN project → **Deploy** → pick the Claude model you want as your daily driver (deploy the Opus-class one too if you want `/model` switching) → accept the Anthropic terms when prompted → keep the suggested deployment name (or name it e.g. `claude-sonnet`). Serverless = pay-per-token, no fixed cost; deployments are deletable.
2. **Run `Setup-ClaudeCode-Foundry.ps1`** with those deployment names + the API key from the project home.
3. **Founders Hub retry (separate, unblocks credits):** the portal loop from before may be profile/cache-specific — retry in an InPrivate window or different browser at `foundershub.startups.microsoft.com`. If it still loops, their support form is the path. Until credits land, Foundry usage bills your card — fine for Claude Code dev usage, watch it before any heavy automation.
4. Optional guardrail: set an **Azure budget alert** (Cost Management → Budgets) mirroring your AWS `gse-monthly-hard-cap-50`.

## GOOGLE — verified state

- **Google Cloud:** authenticated; **two** active billing accounts ("My Billing Account 1" — `0189D2-25EC7A-569654` and `01A115-0A6A0E-29D429`), both **Direct**, **$0 spend last 30 days**, and **"No credits to display" on both**. So: infrastructure-ready, completely idle, no free-trial credits ever claimed, no startup program attached. (Two billing accounts is mild clutter — consider closing one later; not urgent at $0.)
- **Google Developer Program:** you have the free **Developer Profile** (welcome email 2026-06-02). The **Premium** tier (~$299/yr) adds $50/mo GCP credits + Gemini Code Assist — only worth it if you want Code Assist anyway; not a priority next to the startup programs.

### Google actions, in order
1. **Apply to Google for Startups Cloud Program** — `cloud.google.com/startup`. Start Tier (no funding requirement): up to **$2K year one**; Scale Tier (with funding): up to **$200K over 2 years**, and **AI-first startups get enhanced offers (up to $350K)**. Galaxy's AI angle fits the AI track. Founder-only (company details, possibly site verification — galaxysportsedge.com is live, which helps).
2. **Claim the $300 free trial** if offered when you next touch GCP — instant, no application.
3. **Vertex AI as the second Claude lane:** `provider-dispatch.ts` already routes Bedrock → **Vertex** → direct Anthropic. Once Google credits exist: enable the Vertex AI API, enable Claude in Vertex Model Garden (one-time terms acceptance), flip the env. Same per-token price as direct.
4. Keep the Developer Profile free tier; skip Premium for now.

---

## The combined credit-lane picture (all three clouds)

| Lane | Program | Ceiling | Status | Product-ready? |
|---|---|---|---|---|
| AWS Bedrock | Activate Credits | $100K–$200K | Enrolled; **application not submitted** | ✅ env-flip (`CLAUDE_PROVIDER=bedrock`), budget cap armed |
| Azure Foundry | Founders Hub | ~$150K lifetime | **Blocked (MS portal loop)** — retry | ⚠️ needs a model deployment first; Claude Code script ready |
| Google Vertex | Startups Cloud (AI track) | $200K–$350K | **Never applied** | ✅ env-flip (Vertex lane in provider-dispatch) |

Strategy: apply to **AWS Activate** and **Google for Startups** now (independent applications, both founder-only, ~15 min each); retry **Founders Hub** when Microsoft's portal cooperates. Whichever credits land first, the product can route inference there the same day — that's the payoff of the provider-dispatch work. Claude Code (dev tooling) rides Azure Foundry as soon as you deploy a model, credits or not.

## What I did NOT do (and why)

- Didn't deploy the Foundry model — the flow includes accepting Anthropic marketplace terms (founder-only by policy).
- Didn't read/copy the Foundry API key — secrets stay out of chat; the script prompts you locally.
- Didn't submit any program applications — official financial/legal applications are yours.
