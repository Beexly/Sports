# Claude MCP / Plugin / Connector Leverage Map — Galaxy Sports Edge
**Date:** 2026-07-24  
**Author:** Grok team (with Harper, Benjamin, Lucas)  
**Purpose:** Maximize every ounce of leverage from the full Claude connector/plugin/skill list for the GSE website, prediction engine, competitive intel, and local/personal workflows. This document is the durable source of truth so conversation length limits never erase progress.

## 1. Conversation Length Navigation (Immediate Fix)
- This chat and all future ones start clean.
- Persist all state here + in Linear/Notion + existing CLAUDE handoffs.
- New chats begin with: "Continue from docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md + latest EXECUTION_LEDGER".
- Use tools (GitHub, Notion, Linear) instead of pasting history.
- When approaching limit: emit a short handoff note into this file or a new dated one.

## 2. Project Snapshot (Confirmed)
- **Live:** https://www.galaxysportsedge.com (Board, Lab ~140k rows, Intelligence 500+ settled, Fantasy, No-Bet Gate, proof receipts).
- **Monorepo:** Beexly/Sports — Next.js 14, Prisma, BullMQ, Stripe, Anthropic (content only), heavy guardrails.
- **Research:** Beexly/gse-competitive-intel — Glass Ledger + Edge Engine HANDOFF (Phase 0 leak-free → honesty engine → Glass Ledger → real edges).
- **Prediction-engine status:** Already contains sophisticated edge-lab (placebo, walk-forward, conformal, Kelly, GSE scoring, Pedersen-style proof, extensive metrics). Placebo gate matches HANDOFF Phase 0 closely.
- **Key gap:** Explicit "display-only-substantiated-results" render guard (HANDOFF §1) is not yet a dedicated, enforced module.

## 3. Optimized Connector / Plugin / Skill Matrix

### Tier 1 — Critical (keep active, configure tightly, use daily)
| Tool | Leverage for GSE | Concrete Action |
|------|------------------|-----------------|
| GitHub Integration + plugins | Full code, PRs, issues, tree, create/update files | Already authenticated as Beexly. Use for every change. |
| Vercel | Deploy, env, previews, analytics of live site | List projects, monitor deploys, gate production. |
| Stripe | Subs, webhooks, entitlements, pricing | Already wired. Monitor + experiment. |
| Notion | Knowledge base, competitive dossiers, living handoffs, skill definitions | Create GSE workspace pages; store phase status. |
| Linear | Task board mirroring cockpit + Phase tracking | Create issues for remaining HANDOFF gaps. |
| Ahrefs + Semrush | Competitive SEO, content gaps, keyword intel | Ongoing competitor monitoring (FantasyPros, Scores24, etc.). |
| PostHog / Sentry | Product analytics + error monitoring | Wire if not already; track board/lab usage. |
| Exa / Tavily | Research, competitor teardowns, legal public data | Feed into competitive intel package. |
| Anthropic / Claude skills (skill-creator, brand-guidelines, doc-coauthoring, algorithmic-art, mcp-builder, etc.) | Generate GSE-specific skills, maintain brand voice, build custom MCPs | Create "GSE Honesty Guard", "Glass Ledger Recompute", "Phase-0 Runner" skills. |
| Desktop Commander + Claude in Chrome | Local execution, browser automation, personal workflows | Local analysis, notebook runs, private model experiments. |

### Tier 2 — High value (configure next)
- Airtable (structured competitive / ops data)
- Gmail + Google Calendar + Drive (ops alerts, sharing)
- Figma / Canva / Gamma (design system, marketing)
- Zapier / Make (glue between the above)
- Hugging Face / local model tools
- Cloudflare (edge/CDN if used)
- X Ads (promotion once Glass Ledger is public)
- Mem0-style memory layers

### Tier 3 — De-prioritize / disconnect
Most pure legal, bio, clinical, Azure, Snowflake/BigQuery (unless scaling analytics), e-commerce, HR, pure sales tools. They burn context and add noise. Keep only compliance-relevant ones.

## 4. Highest-Leverage Coding & Automation Targets (Execute Now)
1. **Display-only-substantiated-results guard** (HANDOFF §1, missing as dedicated module)
   - Implement a pure function + render-layer assertion that refuses any win-rate / ROI / confidence / "proven" number lacking: coverage denominator, Wilson/Clopper-Pearson LCB, CLV backing, walk-forward provenance.
   - Location: `packages/prediction-engine/src/` or `packages/compliance/` + used in apps/web surfaces.
   - Tests required.

2. **Phase-0 verification script / CI gate**
   - Wire `shuffledTimePlacebo` + `conditionalMiProbe` into a runnable CLI or GitHub Action that fails the build if the gate fails.

3. **Glass Ledger / recompute hardening**
   - Ensure open `recompute` surface and pre-kickoff hash commitments are production-ready and founder-gated.

4. **Custom Claude skills** (via skill-creator)
   - GSE Honesty Guard skill
   - Competitor Teardown skill (Ahrefs + Exa + Notion)
   - Phase Status Reporter
   - Brand Voice + Content Draft skill (respecting CLAUDE.md rules)

5. **Competitive monitoring automation**
   - Scheduled Exa/Tavily + Ahrefs pulls → Notion dossier + Linear issues for material changes.

6. **Local / personal leverage**
   - Desktop Commander workflows for offline placebo runs, feature store inspection, private notebooks.

## 5. Phase Mapping (Current vs Remaining)
- **Phase 0 (Leak-free foundation):** Largely implemented (as-of store, placebo, walk-forward, line archive patterns). Verification + CI gate still high value.
- **Phase 1 (Honesty engine):** Calibration, conformal selective gate, market-blend truth test, portfolio Kelly with CLV deflator — substantial code present; display guard + full acceptance tests remaining.
- **Phase 2 (Glass Ledger):** Pedersen / proof receipts / commitment patterns exist. Public `/ledger` + open recompute + independent verification still need hardening and founder gate.
- **Phase 3+ (Real edges):** Hierarchical-Bayes props, closing-line distillation, residual GBM — research package + edge-lab provide substrate; selective volume engine is the product volume lever.

## 6. Immediate Next Actions for This Session
- [ ] Push this document (done).
- [ ] Implement the display-substantiated guard as a testable module.
- [ ] Create corresponding Linear issue(s) if team exists.
- [ ] Generate 1–2 custom skill prompts ready for Claude Desktop.
- [ ] Optionally wire a simple competitive monitor skeleton.

## 7. How to Use This Document Going Forward
Any new Claude or Grok session starts by reading this file + the latest EXECUTION_LEDGER + CLAUDE.md. All connector decisions, skill creations, and coding priorities flow from here. This keeps value compounding even when context windows reset.

---
*This is the durable leverage map. Execute, do not just describe.*
