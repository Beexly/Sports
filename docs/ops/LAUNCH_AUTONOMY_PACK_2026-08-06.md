# Launch autonomy pack — run the machine, minimal human

**Date:** 2026-08-06  
**Truth:** `github.com/Beexly/Sports` · `main`  
**Live:** `https://www.galaxysportsedge.com`

## Law (never violate)

| Flag / rule | Default |
|-------------|---------|
| LIVE_BOARD / PUBLIC_PICKS | OFF |
| STATS_PUBLIC | OFF |
| Trust-gate | No ROI / guaranteed edge / bare “lock” |
| Settlement | Free path; no invented scores; DISPUTED holds |
| Serverless | No ephemeral durable pretenses |

## Preflight (Claude / agent, every session)

```bash
node scripts/ops/launch-preflight.mjs
# optional authenticated settle check:
CRON_SECRET=… node scripts/ops/launch-preflight.mjs
node scripts/guardrails/trust-gate.mjs
```

## Founder env block (one paste into Vercel Production)

```bash
# After Redeploy Production from main HEAD
CONTENT_FREE_LANE_ENABLED=true
CEREBRAS_API_KEY=…                    # primary free content
# optional secondary free host (Gemma/Nemotron free OpenAI-compat):
# FREE_LANE_SECONDARY_BASE_URL=https://…/v1
# FREE_LANE_SECONDARY_MODEL=…
# FREE_LANE_SECONDARY_API_KEY=…

CLAUDE_PROVIDER=auto
# At least one cloud fully mapped:
# AWS Bedrock: AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION BEDROCK_MODEL_MAP
# Azure Foundry: AZURE_FOUNDRY_ENDPOINT AZURE_FOUNDRY_API_KEY AZURE_FOUNDRY_MODEL_MAP
# Vertex: VERTEX_PROJECT VERTEX_LOCATION VERTEX_MODEL_MAP (+ ADC)
JYNX_CLOUD_ORDER=bedrock,azure,vertex
JYNX_CLOUD_FAILOVER=true

# Optional model tier bumps only after maps include the id:
# MODEL_PRIMARY=claude-sonnet-4-6
# MODEL_CHEAP=claude-haiku-4-5-20251001
# MODEL_OPUS=claude-opus-4-8

# Never for launch day:
# LIVE_BOARD=true PUBLIC_PICKS=true STATS_PUBLIC=true
```

## Autonomy already in vercel.json (15 crons)

| Cadence | Path | Role |
|---------|------|------|
| */30 | refresh-odds | Odds (may free-skip) |
| :20 hourly | settle-picks | Settlement + CLV/SNAPSHOT free path |
| */15 | health-alert | Ops signal |
| hourly | jarvis-snapshot | Cockpit (process-local) |
| */6h | free-spine-health | Free data path |
| daily | generate-drafts, prune RL, receipts, … | Hygiene |

Agents: **do not add** surface-enablement crons. Prefer settle health + free-lane + deploy SHA.

## Merge bar for autonomy PRs

1. `trust-gate.mjs` OK  
2. Targeted vitest for changed pure paths  
3. No LIVE_BOARD/STATS/PUBLIC_PICKS enablement  
4. Prefer ≤5 files; ship tripwire with fix  
5. Re-run `launch-preflight.mjs` after deploy  

## Human-only (cannot be agent-substituted)

1. Vercel **Redeploy** Production to main HEAD  
2. Vercel/Neon/AWS/Azure/Google **secrets**  
3. Credit program **signups** / partnership outreach  
4. Legal rights memo for StatKing  
5. Flip LIVE_BOARD only after proof bar (founder judgment)  

## Docs map (session)

| Doc | Use |
|-----|-----|
| FOUNDER_MULTI_DOMAIN_QUEUE.md | Ordered domains |
| FRONTIER_SURFACE_SCORECARD.md | Probe table |
| JYNX_COST_STACK.md | Free + credits OS |
| JYNX_OPEN_WEIGHT_FREE_MAP.md | Free model lanes |
| JYNX_MARKET_TIER_MAP.md | Market heat → tiers |
| CLOUD_CREDIT_LAUNCH_MAP.md | AWS/Azure/Google |
| OUTSIDE_THE_BOX_BLIND_SPOTS_V3.md | Trust chrome |
| STATKING_STILL_DARK.md | Why stats dark |
| This pack | Autonomy runbook |

## Success = machine can

- Settle hourly without human  
- Free-lane content without cash  
- Fail over Claude across credit clouds  
- Expose ops truth + founderNextSteps  
- Hold public gates dark until founder flips  
