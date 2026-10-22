# GSE Triage Verdict — 9 URLs

## 1. bmpi-dev/awesome-seo
- What: SEO knowledge base (2.8k stars, MIT, active commit Aug 23 2026). Programmatic checklist + monetization section.
- Actionable for GSE: crawl-budget optimization, content-marketing framework, authority-site model, RPM focus. Reuse SEO-writing framework for pick-explainer pages.
- Verdict: USE (reference only) — free, rights-clear knowledge base.

## 2. Anil-matcha/awesome-generative-ai-apps
- What: 50+ open-source GenAI apps (3.1k stars, MIT, active Aug 21 2026). Common stack = Next.js 14 + Prisma + Postgres + Stripe + Vercel — nearly identical to GSE stack. Starter base at SamurAIGPT/ai-saas-starter.
- Relevance: direct architecture reference; image/video/app categories less relevant; base billing/auth wiring highly reusable.
- Verdict: USE — clone starter for productization of pick-alert products; no conflicts.

## 3. automatisch/automatisch
- What: Open-source Zapier alt (13.9k stars, AGPL-3.0 + enterprise, commit Jan 15 2026 — 7 months stale).
- GSE already uses BullMQ cron workers. Adding Automatisch = redundant orchestration layer, new infra, AGPL infection risk.
- Verdict: REJECT — redundant vs BullMQ; stale; license conflict with $0/commercial constraint.

## 4. velobase/velobase-harness
- What: AI SaaS boilerplate — billing, payments, affiliates, anti-abuse, deployment (584 stars, MIT, active Aug 14 2026). Includes usage billing and Stripe wiring.
- Relevance: overlaps GSE (already has Stripe); adds affiliate/anti-abuse patterns useful for selling pick products; Next.js/Prisma/Vercel aligned.
- Verdict: USE — reference billing/anti-abuse patterns; not a dependency.

## 5. lbryio/lbry-sdk
- What: Decentralized P2P content SDK (7.2k stars, MIT). Last commit Aug 2 2024 (2+ years stale); no releases.
- Verdict: REJECT — dead/stale; decentralized media model irrelevant to sports-picks subscription; no value for GSE.

## 6. cporter202/agentic-ai-starters
- What: Agent starter blueprints (225 stars, MIT, last commit Apr 7 2026). Includes seo-content-agent, mcp-toolchain-starter, multi-agent-ops-starter, monetization notes.
- Relevance: seo-content-agent aligns with GSE programmatic SEO; mcp-toolchain-starter relates to agent distribution; prompts/templates reusable.
- Verdict: USE — reference architecture/prompts; free MIT.

## 7. xpack-ai/XPack-MCP-Marketplace
- What: Open-source MCP marketplace for monetizing MCP servers (169 stars, Apache-2.0, commit May 18 2026). Stripe billing, per-call/token pricing, user accounts.
- Relevance: possible distribution channel — GSE could expose a picks-explainer or edge-engine as an MCP server and sell calls; fits agent distribution goal.
- Verdict: CONSIDER — aligns with MCP/agent channel; evaluate only if GSE plans MCP exposure; Apache-2.0 safe.

## 8. aaronjmars/tweazy
- What: X/Twitter scraping + monetization via x402 / CDP smart wallets (46 stars, MIT, active Aug 20 2026). Includes scraping logic.
- Legal/ToS conflict: X/Twitter scraping violates X Terms of Service and robots.txt; monetizing scraped social data conflicts with GSE "rights-cleared content only / no affiliate-spam" guardrail. Scraping for sports picks risks data-rights violations.
- Verdict: REJECT — explicit ToS/legal conflict; guardrail violation.

## 9. IntelligenzaArtificiale/Build-Share-Sell-OpenAI-Assistants-API
- What: OpenAI Assistants builder/seller (44 stars, MIT, 103 commits, streamlit-based). Focus on packaging OpenAI assistants for monetization.
- Relevance: GSE could package pick-alerts as an assistant product; but repo is basic (streamlit, no Prisma/BullMQ), mostly tutorial-level. Low technical value vs existing GSE Next.js/Stripe stack.
- Verdict: LOW USE — conceptual reference only for packaging alerts; not a dependency; no conflicts.

## Cross-cutting observations
- $0 constraint satisfied: all 9 repos are free/open-source.
- Rights-cleared: only #8 (tweazy) introduces rights conflict (X scraping). #5 (LBRY) is legal MIT but dead.
- BullMQ alignment: #3 (automatisch) conflicts/redundant; #7 (XPack) and #6 (agentic starters) extend agent/MCP channels without replacing BullMQ.
- Strongest references for GSE: #1 (SEO), #2 (GenAI apps architecture), #4 (velobase billing), #6 (agent starters/MCP toolchain), #7 (MCP marketplace distribution).
