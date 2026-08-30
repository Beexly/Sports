# Personal zero-cost hive vs GSE Jynx

**Do not put CrewAI / Ollama / OpenClaw into `Beexly/Sports`.** Two systems, one founder.

| | **Personal hive** (laptop + iPhone) | **GSE production** (this repo) |
|--|-------------------------------------|--------------------------------|
| Goal | Research, plan, personal assistant @ $0 | Sports intelligence product |
| LLM | Ollama local only | Cerebras free → AWS/Azure/Vertex credits → cash last |
| Orchestration | CrewAI (± LangGraph/AG2 only if needed) | Jynx + crons + Neon |
| iPhone | OpenClaw → gateway → Ollama on your LAN | Browser / app → galaxysportsedge.com |
| CI | Your private hive repo + GH Actions | Sports monorepo CI + Vercel |
| Trust | Personal | Honesty gates; **no LLM on board/settlement truth** |

## Leverage (copy mindset, not stack)

| From hive handoff | Use on GSE |
|-------------------|------------|
| Free-first, skip paid SaaS | Already: free-lane + credit clouds; no LangSmith |
| GitHub Actions free tier | Already on Sports |
| Clear skip-list (AMP, Studio, Platform) | Keep |
| Consensus voting MCP | **Not** for pick settlement — personal research only |

## Personal machine order (you run, not Sports agents)

1. `ollama` + `qwen2.5:7b` (or `llama3.2:3b` if RAM-tight)  
2. Minimal CrewAI 2-agent crew (skip freeCodeCamp mega-clone until day 2)  
3. OpenClaw gateway → Ollama → pair iPhone  
4. Optional: hive-mind-mcp later  
5. **Never** point OpenClaw at GSE secrets or Neon

## GSE after #334 (Claude Code RCA)

| Fact | Status |
|------|--------|
| Build ERROR since #324 (cipher `kind === "code"`) | Fixed on main (#334) |
| TEAM_GAME_LOG undrained | Drain wired (#334) |
| Prod public SHA lag | Re-check Vercel Production READY after #334 |
| Stripe webhook → medusajs domain | **Founder** audit in Stripe |
| Analytics off | Expected until env flags |

## One rule

Personal hive builds **your** leverage at $0. GSE ships **product** with Jynx + free credits. Crossing wires = wrong costs, wrong trust, wrong deploy surface.
