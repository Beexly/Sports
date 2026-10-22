# Frontier R&D — Agent-Auditable Record & AI-Feature Runway
**Date:** 2026-07-17 · Autonomous R&D pass (founder asleep) · Author: Claude (activation co-pilot)

## TL;DR
The AI-sports-picks market is saturated with **unverifiable ROI claims** ("31.7% ROI", "trusted by 70,000+"). None of it can be checked. Your moat is the opposite: a **cryptographically verifiable, publish-before-kickoff record**. I took that moat one step past where any competitor is and made it **agent-auditable** — I built and tested a working **MCP server** that lets any AI (Claude, Cursor, etc.) *recompute your hashes itself and prove your record without trusting your server*. As far as the public record shows, that's a first for sports prediction. Below: the shipped build + a prioritized runway of the next aligned AI/website builds, each grounded in your actual repo, with the smallest possible human list at the end.

## The wedge (why this is the right bet)
- Buyers increasingly ask **AI agents** to vet products. "Is Galaxy Sports Edge legit?" will be answered by an agent, not a review site.
- Everyone else's answer is "trust our dashboard." Yours can be: *"here's the tool — verify us yourself."* An agent that can **recompute your commitments** and find them intact is a trust signal no unverifiable competitor can fake.
- "AI-verified reputation" is now openly discussed as the emerging **trust layer** for prediction markets. You already built the hard part (the hash-chained Proof API). This makes it AI-native.

## ✅ Shipped this pass: Galaxy Proof MCP (working, tested)
A standalone MCP server (`galaxy-proof-mcp/`) that wraps your public Proof API as 7 agent tools. The flagship tool, `audit_record_trustlessly`, paginates every settled receipt, **recomputes each `sha256("leaf:"+pickId+":"+payload)` locally** (node:crypto), rebuilds the Merkle root, and reports integrity — trusting your server only to serve raw data, never for the verdict.
- **Grounded in your code:** the hash + Merkle algorithm is copied exactly from `packages/prediction-engine/src/proof-of-record.ts` and `apps/web/lib/proof/receipt-proof.ts`.
- **Verified, not assumed:** `tsc` builds clean; an end-to-end stdio smoke test passes (7 tools list; a correct hash verifies `true`, a tampered hash verifies `false`).
- **Honest by construction:** read-only GETs; makes **no** win-rate claim (proves *integrity*, not profitability); surfaces your ledger's honest unpublished/empty state verbatim.
- **Status:** works today against any host serving `/api/proof/*`. Since that surface is on the undeployed branch, the network tools return an honest "not deployed" until you ship the branch (or point `GSE_PROOF_BASE_URL` at a Preview). The trustless math needs no network.
- **Distribution upside:** list it in an MCP registry and it becomes the tool agents reach for when evaluating sports-prediction services — with your name on it.

## Frontier runway (prioritized; each grounded in your repo)
Ranked by leverage × low-friction. Model-engine items are flagged **build-session** because they touch the protected prediction engine / draft-only guards (I won't ship those unsupervised).

1. **Answer-Engine Optimization pack (low effort, high distribution).** You already ship `llms.txt` + `news-sitemap.xml` on the branch. Add JSON-LD (`Organization`, `FAQPage`, a `Dataset`/`SoftwareApplication` node pointing at the Proof API) and make `llms.txt` explicitly advertise the MCP + `/api/proof/openapi.json`. Being *citable and verifiable* by AI search is the 2026 discovery channel. **Human decision:** none beyond deploying it.
2. **"Verify us" public surface (low effort).** A `/verify`-adjacent page + a copy-paste block: *"Ask your AI to verify our record"* with the MCP install snippet. Turns the MCP from infrastructure into a marketing/trust asset on the site itself. **Human decision:** approve the page copy (draft-only).
3. **Open-Meteo weather edge features (medium; build-session).** Your leverage atlas already flags Open-Meteo (free, commercial-OK) NFL weather as a real $0 model-improvement lever; the repo notes weather "awaits an as-of forecast loader." Wind/precip are genuine edge factors. **Human decision:** it's a `MODEL_VERSION`-affecting engine change — founder-gated per your own rules.
4. **Body-clock edge feature (medium; build-session).** Your docs say it's "backtestable now." Travel/time-zone/rest as an as-of feature. Same `MODEL_VERSION` gate as #3.
5. **Data-backed content automation (medium; build-session).** The repo has scaffolded loss-autopsy / journal / calibration-training generators. Wiring them to auto-*draft* (draft-only guard holds) turns settled results into SEO/trust content on a schedule. **Human decision:** review-before-publish stays on.

## Smallest human-input list (only what genuinely needs you)
1. **Deploy the branch** (or a Preview) → lights up the Proof API so the MCP's network tools go live. *(Already on your finish-list.)*
2. **Decide if you want the MCP published** (npm + an MCP registry listing) — that's a public listing, so it's your call. I've left it build-ready.
3. **Pick which runway items to green-light** — I'd start with #1 (AEO pack) and #2 (verify page); both are low-risk and pure distribution. Say the word and I'll build the safe ones (specs/schema/copy) as drop-in deliverables; the engine items (#3–5) go to your build session.

## Sources
- Verification as the emerging trust layer: [AI-Verified Reputation for Sports Prediction Markets](https://www.geekmetaverse.com/how-ai-verified-reputation-is-building-the-trust-layer-for-sports-prediction-markets/)
- The unverified-claims landscape (context): [PropsBot](https://propsbot.ai/best-ai-sports-betting-app/), [Leans.AI](https://leans.ai/)
- AI-search discoverability trend: [llms.txt in 2026 guide](https://limy.ai/blog/llms.txt-in-2026-the-full-guide), [Contentful: do llms.txt files improve AI search visibility?](https://www.contentful.com/blog/llms-txt-search-visibility/)
