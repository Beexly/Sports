# Funding · Partnerships · Credit alignment — MASTER

**2026-08-06** · One page. Do not scatter.  
**Law:** Applications = **founder-only**. Agent wires env + smoke after keys land.  
**Never invent grants. Never claim ROI. Sportsbook CPA = HARD_REFUSE.**

Goal: **systems that reward us for using them** — free tiers, Activate credits, startup programs, non-gambling partners — so **cash AI burn → 0** while product moat compounds.

---

## 1. Stack already built (activation is env / applications)

| Lane | Reward mechanism | Code ready? | Founder action |
|------|------------------|-------------|----------------|
| **Cerebras free-lane** | Free inference for content | **YES** — content generator wired (#320) | Key + `CONTENT_FREE_LANE_ENABLED=true` + redeploy |
| **Bedrock / AWS Activate** | GenAI credits pay Claude | **YES** — `callClaude` | Activate claim → model access → `CLAUDE_PROVIDER=bedrock` + map |
| **Vertex / Google** | Partner credits | **YES** | Google AE / $10k path → `CLAUDE_PROVIDER=vertex` |
| **Groq internal LLM** | Free/cheap classify | **YES** | `INTERNAL_LLM_API_KEY` |
| **Haiku router** | Cheaper Anthropic | **YES** | `MODEL_CHEAP` optional |
| **Free settlement spine** | No Odds API bill | **YES** — live HEALTHY | Keep Odds key **off** |
| **Claude Max Pro** | Flat coding cost | You | Use for agent work, not prod inference |
| **Neon / Vercel startups** | Infra credits | Docs | Claim only when you'll burn |
| **Non-gambling partners** | Sponsor / affiliate | `docs/revenue/*` | Target list + FTC + RG policy |

Ops visibility: `/api/ops/public-surface-truth` → **`creditStack`** (booleans only).

---

## 2. Click-queue — (value × probability) ÷ minutes

### Zero-application free capacity (do today)

1. **Cerebras** → env flip (content free after #320)  
2. **Groq** → internal LLM key  
3. Smoke: `node scripts/ops/smoke-free-lane.mjs`  
4. Confirm ops `creditStack.freeLaneConfigured: true` after redeploy  

### Funding / credit programs (this week)

5. **`founder@galaxysportsedge.com`** keystone email (Zoho if Google 31-day rule)  
6. **NVIDIA Inception** — free, self-serve, GPU later  
7. **Anthropic Claude for Startups** — honest application (gates OFF; free-first spine)  
8. **AWS Activate** tier confirm → Bedrock model ids → hand agent map for smoke  
9. **PostHog / Neon / GitHub for Startups** — only if you'll spend the free capacity  

### Partnerships / non-cash revenue

10. Fill **one** row in partner target list (`docs/revenue/PARTNER_TARGET_LIST_TEMPLATE.md`)  
    Categories that fit: sports_data, creator_tool, ai_tool, cloud_tool, local_sponsor  
    **Never** sportsbook CPA  
11. Use `PARTNER_OUTREACH_PLAYBOOK.md` + FTC + RG policies  
12. Sponsor media kit only when assets honest (`SPONSOR_MEDIA_KIT.md`)  

### Accelerator meta-play

13. One affiliation evaluation (multiplies AWS/Google/CF/GitHub tiers) — 1 hour  

---

## 3. Claim-order traps (cash destroyers)

| Program | Trap |
|---------|------|
| Stripe | **One** lifetime offer — save for payments go-live |
| Vercel | Activate path may consume larger startup slot |
| Datadog | Claim via program **before** organic trial |
| Google | 31-day Workspace · anti-stacking |
| AWS | Sequential Founders → Portfolio/GenAI; credits expire |
| Claude on Azure / Marketplace | **Not** credit-eligible — Bedrock **InvokeModel** only |
| Odds API paid | Not required — free spine is production settle |

---

## 4. Product moat alignment (not polish theater)

| Domain | Live (probe) | Funding link |
|--------|--------------|--------------|
| Settlement | HEALTHY · 0 overdue | Proves reliability for partners/investors |
| Contests paper | postgres durable | Skill product without prize risk |
| StatKing | dark | Rights-first honesty |
| Live board / public picks | OFF | Trust-gate; no ROI theater |
| Content free-lane | wire ready | Zero cash narrative drafts |
| Credit posture API | shipping | Investor/operator dashboard input |

---

## 5. What agents must NOT do

- Apply to programs, invent grant $ amounts, or set LIVE_BOARD  
- Soften trust-gate for “demo ROI”  
- Hyper-focus settlement forever while credits stay unflipped  
- Sportsbook CPA partnerships  

## 6. Success for this track

- [ ] `creditStack.anyCreditLaneReady === true` on prod  
- [ ] Usage ledger shows `cerebras_free` and/or `aws_activate` spend  
- [ ] Anthropic cash share trending down  
- [ ] ≥1 non-gambling partner outreach started (founder)  
- [ ] ≥1 startup credit program application submitted (founder)  

**Docs index:** Action Pack v3 · CREDITS.md · JYNX_COST_STACK · BEDROCK_CREDIT_INTEGRATION · revenue/*
