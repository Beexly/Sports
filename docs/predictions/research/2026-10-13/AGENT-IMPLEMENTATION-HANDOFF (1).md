# AGENT IMPLEMENTATION HANDOFF — Garrett's full actionable system

**Owner:** Garrett Baxley (Kingwood, TX · America/Chicago). He runs Galaxy Sports Edge (sports picks/fantasy on X @GalaxySportsHQ), $350 Kit websites for local businesses, and autonomous money lanes.
**Mission:** Implement the highest-leverage items below with AS LITTLE HUMAN INPUT AS POSSIBLE. Garrett is disabled and out of work; the financial lane is real money, not a hobby. Standard: ensure nothing is missed, under-leveraged, under-valued, or forgotten.

## Standing operating rules (follow these exactly)
1. **Zero-human-input mode.** Do everything you can do alone. Never end work with "your call" / "tell me when done". Only surface TRUE hard blocks, batched: sign-ins he must do himself, identity/tax/bank docs, spending his money, account creation.
2. **Read-only on socials.** Never send, react, like, follow, comment, delete, or alter anything on his social accounts. Nothing posts without his explicit approval.
3. **Do not commit or push** `~/workspace/jev-ultrafast` (or any repo) unless he explicitly asks.
4. **Never expose, repeat, store, or commit credentials.** Keys live only in `~/workspace/jev-ultrafast/.env` (chmod 600) and the Secure Vault. Never write them into chat, logs, or docs.
5. **No paid API use** without his authorization or a cap.
6. **Treat social-post claims as leads requiring verification**, not established facts. Every star-count, benchmark, income, and cost claim below is UNVERIFIED until checked against official sources or repos.
7. **Do not touch** the `gse-grok-build-sandbox` repo (isolated by design). Fanatics mail is always a fresh compose, never a thread reply. The Fanatics case sits idle until Garrett says otherwise.

## Environment & resources you inherit
- **Jev-ultrafast agent:** `~/workspace/jev-ultrafast`, run via `./run.sh --env-file .env python examples/run.py --url <url> --goal '<goal>'`. Decision model: OpenCode Zen `jev-1.13-free` via `https://opencode.ai/zen/v1/systemone`. Text helper: AI/ML API `inception/mercury-2.5` (reasoning off). Keys only in the local `.env`.
- **GitHub org:** Beexly (repos: Sports = Galaxy Sports Edge system of record, autonomous-revenue-engine, agent-bus for multi-agent handoffs, Sports is the record — workspace is scratch).
- **Grok Bot research:** branch `notes/grok-bot-galaxy` on `Beexly/autonomous-revenue-engine` (commit `41c55f4`, 250 files) — see section below.
- **Raw captures:** `~/workspace/self-notes-log/` — `self-notes-log.md` (original IG log), `action-board.md` (this system), `ig_browser_retry.jsonl` (246 recovered saves w/ captions), `ig_post_info.jsonl`, `ig_codes.json`.

## Where to start
Work the **START HERE** list top-to-bottom — it is already ranked by leverage-per-effort. Then the themed sections. **Rotting** at the end is explicit non-work: expired, debunked, sketchy, or off-mission items — do not implement them.

---
# Action board — Garrett's self-notes, weaponized

_Built 2026-09-24, merged IG + X the same day. Companion to `self-notes-log.md` (the raw IG log). This file is the DO file: every item has an action attached. Nothing here is "someday" — it's ranked, effort-tagged, and mapped to his actual lanes._

**Effort tags:** ⚡ quick win = one evening · 🛠️ weekend project = 1–2 days · 🔬 deep dive = research track, no deadline

**Source key:** items marked **[X]** came from his X self-DMs (@GalaxySportsHQ). Unmarked items are from the IG self-thread.

**Coverage (audited 2026-09-24):** 107 fully-described IG saves (saved 2026-08-23 → 2026-09-24) → 74 board items after dedupe. 78 usable X self-DM cards (2026-09-13 → 2026-09-21) → 48 board items after within-X and cross-platform dedupe. **249 actionable items total** (122 original + 127 from the 2026-09-24 browser gap-fill). Every described save is now accounted for: actionable in the sections below, or named in Rotting with a reason. 248 unique older IG saves still link-only (249 link-lines — one post saved twice; IG post API hard-blocked 2026-09-24 — spaced retry ran 15/248, all HTTP 500, connector/provider-side; superseded by the logged-in browser run the same day (246/249 recovered)). 2 X cards rendered "Preview Unavailable" and are unrecoverable.

---

## 📱 About the X self-DMs — important correction

The X account **@GalaxySportsHQ joined in August 2026** — there is no 6-month X history. The ENTIRE self-DM thread is one 9-day span: **Sun Sep 13 → Mon Sep 21, 2026**, exactly one conversation, ~80 message cards, **ALL shared posts, zero typed text**. Two cards (Sep 17, 12:50 PM session) rendered "Preview Unavailable" — **resolved 2026-09-24 via logged-in browser: one recovered (Inspector's "5 AI Girls. 60 Days. $91K" article, now a Money item below), the other (@fuckgrowth) confirmed deleted/unrecoverable.** Strictly read-only: nothing sent, liked, deleted, or modified.

Theme skew: heavily **AI agents + money** (Jev stacks, Polymarket quant bots, faceless YouTube monetization, AI influencers). Strong overlap with the IG pile — Jev cluster, Hypit, Claude Code configs — deduped across platforms below. X adds what's genuinely new: the DeepSeek V4.1 Flash cost-routing playbook, onchain wallet research via MCP, Jev competitor-research at $0.12, and the Grok Bot + Jev business-agent pattern.

---

## 🎯 START HERE — highest leverage, ranked (IG + X combined)

1. **@thelocktalk (09-03) — 8 AI prompts for NFL anytime-TD props.** Directly his GSE lane; props is where the edge lives. → Get all 8 prompts, run them against the engine's TD numbers this weekend. ⚡
2. **[X] Rahul (09-13) — DeepSeek V4.1 Flash: "98% of GPT-6 Astra's score at 1.4% of the cost." "Burning $100 in a single night running AI agents... Flash costs ~1/70th of Astra... Astra orchestrates while Flash does almost all the work. 3 mins to set up."** The cost architecture for his whole agent fleet: smart model orchestrates, cheap model executes — "24/7 AI company for $50/month." → Rewire his agent routing this week. ⚡
3. **@marc.kaz (09-21) — OSINTsearch.org: live username/email/phone lookups across 759 endpoints.** His standing directive is OSINT client-finding for Kit sites — this is the tool for it. → Run his target business list through it. ⚡
4. **@seb.ai (09-15) — an AI that refuses to work unless the job is profitable.** Cost/margin gate before action. This is the closest thing to his autonomous-money mandate anyone's built. → Steal the pattern: put a profit gate in front of his money-lane agents. 🛠️
5. **[X] Sarvesh Shrivastava (09-21) — "Grok Bot + Jev is going to make more businesses millionaires in 2026 than crypto ever did. prompt → GrokBot → Jev SEO decision → GrokBot execution → $$$$$." + codila's 7-minute Jev+GrokBot setup.** The business-agent loop. → Map it onto Kit client work (SEO decisions for client sites). 🛠️
6. **@marc.kaz (09-14) — SceneAI: prompt library for websites/landing pages.** He sells $350 one-pagers; this kills the blank-page hours. → Try it on the next Kit build. ⚡
7. **[X] Jami (09-14) — "Claude can now BUILD a YouTube channel from scratch and hit monetization in 90 days. 8 prompts."** → Get the 8 prompts; this is the faceless-revenue lane with a concrete recipe. 🛠️
8. **@stridejosh.ai (08-25) — Cursor leaked Grok Bot's entire runtime: 0.18.0 shipped with source maps on, and dev Bennett reconstructed its system prompts, tool definitions, and model-routing logic. The mirror repo has more forks than stars — and Claude Code's identical leak got DMCA'd within a day.** Grok Bot IS his ops stack (Signal Desk briefs, Signal Origin ops). This is a free blueprint of its internals. → Pull the archive + @wassimyounes_' companion writeup tonight, before it disappears. ⚡ **UPDATE 2026-09-24: Hermes already captured the deeper intel — branch `notes/grok-bot-galaxy` on Beexly/autonomous-revenue-engine (commit 41c55f4, 250 files): 77 production agent prompts extracted from the xAI Galaxy marketplace payloads, 10 workshop transcripts, launch timeline, packaging matrix, 137 install deep links. Framed as competitive intel, not a product (per REPO-NOTES.md). Mine the branch instead of chasing the leak.**
9. **[X] Bella (09-17) — "A 27-year-old from Tampa built an AI flight attendant with Claude, makes $16,800/month. Trained a LoRA on 71 renders, fixed the seed, left tiny imperfections on purpose."** Strongest documented AI-influencer playbook in the pile. → Study the LoRA workflow (pair with Tech with Mak's LoRA explainer, same pile). 🛠️
10. **[X] Rekt Fencer (09-13) — "CLAUDE JUST MADE ONCHAIN WALLET RESEARCH STUPIDLY EASY. Paste a wallet address into chat and have it read the chain. No API keys. No scripts. Two connectors: mcp.blockscout.com, mcp.crypto.com."** Free crypto OSINT. → Add the MCPs to Claude tonight. ⚡
11. **[X] Ori Silver (09-18) — "JEV makes competitor research feel like a cheat code. Fed it Resilia's ad library: classified 1,891 ads in 19 seconds for $0.12."** → Point Jev at Kit prospects' ad libraries. ⚡
12. **@eluna.ai (09-04) — NVIDIA's free PAIR tool turns multiple PCs/Macs on the same network into a personal AI data center, sharing spare compute for local AI workloads — prompts and files stay on the local network.** His agent fleet spans the VM + his PC + phone; this is free fleet compute instead of cloud spend. → Install PAIR across his machines, route local inference through it. ⚡
13. **@marc.kaz (08-26) — OpenShorts: free AI video clipping, no watermarks, no limits, open source.** His GSE clips need telestrated seconds-long cuts — this is the free clipping layer. → Install, clip this week's games. ⚡
14. **@sebastianhardy_ (09-05) — "Don't build a SaaS, sell these 7 free repos" + price list & pitch.** Productized open-source resale. → Get the list, package one as a Kit upsell or standalone offer. 🛠️
15. **[X] Mr. Buzzoni (09-14) — Anthropic hackathon winner open-sourced his Claude Code setup: 68 subagents, 286 skills, 94 commands.** → Steal the configs; companion to IG's "Everything Claude Code." ⚡
16. **@thewizeai (09-09) — 50 free productivity prompts + ~7.4B free tokens/month stacked across 34 providers.** He's bleeding on AI spend; this is the free-tier stacking playbook. → Set up the stack, route cheap calls through it. ⚡
17. **@innovation (09-21) — Fireflies AI runs sales calls for you (screening, inbound, interviews).** Kit lane needs sales motion without his time. → Point it at Kit inquiries; AI does the pitch call. 🛠️
18. **[X] MIKE (09-13) — article: "What It Actually Takes to Build a $45K/Month YouTube Channel" — Claude, Python, production pipeline, six revenue streams.** → Mine the playbook for the GSE faceless lane. 🛠️
19. **@codingknowledge (05-26) — NVIDIA hosted inference across ~80 AI models, free via build.nvidia.com.** The free inference layer for his whole stack: the free-claude-code proxy below, OpenCode Zen, his whole agent fleet. → Set it up tonight; route cheap calls here before anything paid. ⚡ https://www.instagram.com/p/DXeWD0XEnfz/
20. **@askgpts (05-28) — Postiz: open-source self-hosted social stack (30+ platforms, AI agents, n8n/API; github.com/gitroomhq/postiz-app).** The AI-managed content pipeline for every social surface he runs — GSE X/TikTok/IG plus Kit client accounts. → This is the social-ops layer his operation is missing; self-host and wire it to his agent fleet. 🛠️ https://www.instagram.com/p/DY4roz-E629/

---
## 💰 Money & hustles

- **2026-09-15** · @seb.ai · AI that only works if the job is profitable (margin gate before action). → Prototype the gate on one money-lane agent. 🛠️ https://www.instagram.com/p/DdF6PqhPP5B/
- **2026-09-05** · @sebastianhardy_ · Sell 7 free repos instead of building SaaS (price list + pitch via comment). → Get the list, package one offer. 🛠️ https://www.instagram.com/p/Dcv9HtHDLDZ/
- **2026-08-24** · @bestapps.ai · "People are downloading money with these 10 free GitHub repos" — run AI models on cheap hardware, shared agent memory, books→skills, multi-agent without RAM destruction, security automation, free AI curriculum. → Claim the list; pairs with the sebastianhardy_ resale playbook above. ⚡ https://www.instagram.com/p/DcbHlPCjDn2/
- **2026-09-21** · @sebastianhardy_ · 7 now-free AI tools + the service to sell with each. → Claim tools, launch one service. ⚡ https://www.instagram.com/p/DdgngwSDNhG/
- **2026-09-09** · @reezyresells · $8.5k/mo reselling playbook, step-by-step. → Extract tactics for card listings. ⚡ https://www.instagram.com/p/Dcg7oL5D6C7/
- **2026-09-01** · @fbajayden · Amazon training: 10 products with buy/sell prices; brand approval is the real filter. → Learn the approval-getting tactic. ⚡ https://www.instagram.com/p/DcliLp8kZfc/
- **2026-09-14** · @marc.kaz · SceneAI prompt library for websites/landing pages. → Use on next $350 Kit build. ⚡ https://www.instagram.com/p/DdO-gzeuWGW/
- **2026-09-21** · @innovation · Fireflies AI runs your sales/inbound calls. → Route Kit inquiries through it. 🛠️ https://www.instagram.com/p/DdKIfRAE9dx/
- **2026-09-04** · @openart_ai · Describe-it-get-video, up to 5 min, chat-refined. → Kit demo videos, Vow & Post previews. ⚡ https://www.instagram.com/p/DcICa7QMznz/
- **2026-09-04** · @ariacodez · "Clone any app from its URL, no code" (Readdy). → Fast competitive teardowns for Kit designs. ⚡ https://www.instagram.com/p/DcTokRYq_NX/
- **2026-09-02** · @seb.ai · Appsmith (40k⭐): drag-drop internal business software. → Sell "custom dashboards" as Kit upsell. 🛠️ https://www.instagram.com/p/Db64BZHP1Nh/
- **2026-09-19** · @longliveai · "Higgsfield CEO open-sourced the whole platform" — VERIFIED 2026-09-24: **false as stated.** Higgsfield released APIs, SDKs and select repos; the platform/models stay proprietary. What's real: community open-source studios (e.g. `princejain756/higgsfield-open`) that use YOUR Higgsfield API key — no subscription, pay per generation. → Use the API + an open studio instead of the monthly plan. ⚡ https://www.instagram.com/p/Ddb63t1lj__/
- **2026-09-19** · @wassimyounes_ · "Claude for Social Media" tool (not Anthropic — marketing name): paste site → auto promo videos. → VERIFY; if legit, GSE promo machine. ⚡ https://www.instagram.com/p/DaTZxm-J5mZ/
- **[X] 2026-09-13** · Rahul · DeepSeek V4.1 Flash: "98% of GPT-6 Astra's score at 1.4% of the cost... build an AI workforce that works 24/7 for around $50/month." Follow-up: "I was burning $100 in a single night running AI agents... V4.1 Flash costs ~1/70th of Astra... Astra orchestrates while Flash does almost all the work. 3 mins to set up." → The cost architecture: smart model orchestrates, cheap model executes. Rewire his agent fleet this week. ⚡
- **[X] 2026-09-13** · MIKE · Article: "What It Actually Takes to Build a $45K/Month YouTube Channel" — Claude, Python, production pipeline, six revenue streams. → Mine the playbook for the GSE faceless lane. 🛠️
- **[X] 2026-09-13** · Force🦅 · "HE SHOWS YOU HOW TO MONETIZE A YOUTUBE CHANNEL IN JUST 16 MINUTES. The entire process reportedly took 9 days." → Verify; if real, 9-day channel-launch recipe. ⚡
- **[X] 2026-09-13** · Force🦅 · "1 MILLION VIEWS = $650" — video DEBUNKING a YouTube earnings claim. → Reality-check filter: run every faceless-channel income claim in this pile (the $45K article, the $31K claim below) through this before believing any of them. ⚡
- **[X] 2026-09-14** · Jami · "Claude can now BUILD a YouTube channel from scratch and hit monetization in 90 days. 8 prompts." → Get the 8 prompts. ⚡
- **[X] 2026-09-15** · Devon Canup · "YouTube + AI = $31,662. Claude + Manus for script, ElevenLabs voiceover, freelancers for editing. $31k in a month from a faceless channel. Hotel room. Laptop. Wi-Fi." → Blueprint — but cross-check against the $650/1M-views debunk above. 🛠️
- **[X] 2026-09-17** · Bella · "A 27-year-old from Tampa built an AI flight attendant with Claude, makes $16,800/month. Trained a LoRA on 71 renders, fixed the seed, left tiny imperfections on purpose." → Strongest documented AI-influencer playbook in the pile; pair with Tech with Mak's LoRA explainer (09-21). 🛠️
- **[X] 2026-09-17** · Inspector · Article: "5 AI Girls. 60 Days. $91K. One System Behind Everything" (23.6M views) — the full multi-character system: face.json (appearance), motion.md (behavior), calendar.md (publishing schedule) per character; 3-tool stack Flux 1.1 Pro + Kling 2.6 + ElevenLabs; 5-week pipeline (characters → movements → voices → distribution → automation). Key insight: character #6 is just another face on the same machine. → The deepest AI-influencer ops doc in the pile; revenue claims unverified (run through the $650/1M debunk) and platform/ToS risk applies. 🔬
- **[X] 2026-09-17** · @fuckgrowth · card unrecoverable — post deleted or account gone (verified 2026-09-24). → Nothing to do; logged so the gap is closed, not forgotten.
- **[X] 2026-09-21** · Ryker Stone · "21-year-old college student made $43,000 in a month with an AI virtual girlfriend... OnlyFans 'Maya', 1,247 paid subscribers." → Biggest number in the pile; ethically gray + platform risk (AI creators vs OnlyFans ToS) — research before touching. 🔬
- **[X] 2026-09-14** · KillerFrost · "23-year-old AI tennis champion makes $58,000 a month" (AI avatar athlete Sophia). → AI-avatar athlete concept; same risk class as the item above. 🔬
- **[X] 2026-09-15** · TakerX · "Eleven seconds through the glass printed $3,800 on the first drop, day 16 at $9,400 on the same pink top. Do not change the girl." → The real mechanic is the REPEAT DROP: same character, same setup, still printing on day 16 — a product-drop formula, not a one-off video. Character consistency is the whole game — directly relevant to Vow & Post video drops. ⚡
- **[X] 2026-09-15** · H A J R A · Seedance 2.5 prompt for a 15-second premium UGC fashion commercial with consistent character reference. → Sellable UGC-ad service for local shops. ⚡
- **[X] 2026-09-14** · Obisley ai · AI fashion-video prompts. → Prompt bank for Vow & Post / product videos. ⚡
- **[X] 2026-09-13** · Daniro · "This guy built a Bayesian Quant model and it made $1,362 a day on Polymarket. +$29,972 PnL in 22 days, $29 average trade, 9 setups/hour on BTC Up or Down markets." → Research lane: his engine does calibration — a Polymarket paper-trade experiment could cross-verify. Real money = gambling risk. 🔬
- **[X] 2026-09-14** · Daniro · Quant Resolution model: "$2,191/day on Polymarket, +$363,748 PnL in 166 days." → Escalating claims from the same account — verify before believing anything. 🔬
- **[X] 2026-09-14** · Roan · "GPT-6 Astra builds the MOST POWERFUL 24/7 trading agents. 6-page research paper on using Astra to build mathematical trading strategies like hedge funds, complete codebase." → Get the codebase; paper-trade only. 🛠️
- **[X] 2026-09-14** · Shelpid.WI3M · AI trading agents. → Same paper-trade lane. 🔬
- **[X] 2026-09-14** · draven · "GPT-6 Astra ran six AI Agents on my trading account... $500 in, $5,110 by morning" (PROBE/PRISM crypto trading). → Extreme claim; paper-trade, never real funds on a stranger's screenshot. 🔬
- **[X] 2026-09-21** · Sarvesh Shrivastava · "Grok Bot + Jev is going to make more businesses millionaires in 2026 than crypto ever did. prompt → GrokBot → Jev SEO decision → GrokBot execution → $$$$$." → The business-agent loop; map onto Kit client work (SEO decisions for client sites). 🛠️
- **[X] 2026-09-21** · codila · "Jev + GrokBot is the best AI agent system I've built. 7 minutes setup: prompt → GrokBot → Jev decision → GrokBot execution → result." → Get the setup; pairs with the Sarvesh pattern above. ⚡
- **[X] 2026-09-21** · Roan · Jev + TradingView trading setup, 81-millisecond decisions; "Jev is the FASTEST AI model ever built for trading." → Trading-infra curiosity; paper only. 🔬
- **[X] 2026-09-21** · bl888m · "JEV BOT ON GOD-MODE... Elon Musk posted: 'the trade already happened by the time you see the chart move.' Gave it $45 and told it to earn its keep." → Tiny-budget Jev trading experiment — $45 is the most honest number in the trading pile. 🔬
- **2026-09-21** · @simplifyinai · "Jev can now trade crypto with real money on hyperliquid — five coins, live orders placed every second. Jev decides the trades, entries earn the maker fee. Ships in dry-run mode; testnet before real funds. 100% free, open source." → The real infra behind bl888m's $45 experiment above — Jev-native trading on a real venue. Dry-run/paper first, mainnet only if he ever wants to. 🔬 https://www.instagram.com/p/Ddg9nLkmVs7
- **[X] 2026-09-21** · CyrilXBT · "POV: you found the Jev + claude stack for free and already made $3000 of it." → Money claim on the free stack; unverifiable, treat as hype. 🔬


- **2026-05-18** · @evolving.ai · Anthropic Fellows Program: $3,850/week for 4 months of AI research, "no prior research experience required" — VERIFY from the official posting before believing the terms; if real, this is paid AI-research money while he's out of work. ⚡ https://www.instagram.com/p/DYZtUugDVsM/
- **2026-08-03** · @ai.theshift · Anthropic Claude Corps: paid fellowship for early-career candidates (18+, authorized to work in the US, <2 years full-time experience) — VERIFY; same flag as the Fellows program above. ⚡ https://www.instagram.com/p/Dbfo3ZUj1iJ/
- **2026-05-01** · @benkellyone · Free mini-course on buying 'boring businesses' from retiring owners ($900k earnings claim — unverified). → Claim the course; verify the number against SBA data before believing it. 🛠️ https://www.instagram.com/p/DXXfpo-CIZ3/
- **2026-05-02** · @benkellyone · 2026 small-business acquisition opportunities tied to government investment signals. → Acquisition-opportunity scan for his money lane. 🛠️ https://www.instagram.com/p/DXxNyj2iPAW/
- **2026-05-20** · @thevintageapetcg · Pokemon card grading secrets: claims $2K–$4K into $22K via PSA grading — reality check: his own slab audit prices to sold comps, so take the GRADING PROCESS playbook, not the number. ⚡ https://www.instagram.com/p/DYgQ8AEv9D-/
- **2026-04-27** · @thederekgray · AI agent strategy for recurring revenue ('AGENT' CTA). → Get the strategy; map it onto Kit retainers. 🛠️ https://www.instagram.com/p/DXcC-O6gmmp/
- **2026-06-02** · @theaisurfer · One-line Claude Code stack building a $10,000-looking website in minutes. → Steal the stack for Kit builds; blank-page hours die. ⚡ https://www.instagram.com/p/DY8ZQhUDy6V/
- **2026-04-19** · @wellcopymax · AI-generated on-brand email campaigns from a single prompt (agency pitch). → Cold-email engine for Kit outreach. ⚡ https://www.instagram.com/p/DXSsRFxCQ0G/
- **2026-05-20** · @syntaix.ai · 10 open-source repos developers can package and sell (open-source Calendly, Zapier, Shopify…). → Pairs with sebastianhardy's "sell 7 free repos" playbook (Money, 09-05) — the resale lane. 🛠️ https://www.instagram.com/p/DYhZShWiaLX/
- **2026-05-27** · @artificialzone · 10 GitHub repos that quietly power SaaS businesses and income-generating products. → Same resale lane; read both, pick one to package. 🛠️ https://www.instagram.com/p/DY2F6ekGDPK/
- **2026-05-17** · @codingknowledge · 10 GitHub repos claimed to generate passive income (+ duplicate 06-21 'repos for programming and side income' — deduped). → Claim the list; run every claim through the $650/1M-views debunk filter. ⚡ https://www.instagram.com/p/DYZ5UTiknH2/
- **2026-06-17** · @aimasteryhub__ · Little-known GitHub repos for AI agents + online business ideas. → Mine for the resale lane. ⚡ https://www.instagram.com/p/DZpdEVQAiDr/
- **2026-05-29** · @bella.contentcreation · YouTube side hustle "anyone can do." → Vet the method for the GSE faceless lane. ⚡ https://www.instagram.com/p/DYvtNYCsOJW/
- **2026-07-12** · @ytadanny · Passive-income breakdown ('YTA' CTA). → Get the breakdown. ⚡ https://www.instagram.com/p/DalUTTPEvCL/
- **2026-05-12** · @faceless.isaac · Claude + NexLev faceless YouTube automation side hustle. → Faceless-lane recipe. 🛠️ https://www.instagram.com/p/DX5tUaaSyP_/
- **2026-05-13 / 05-26** · @josh.doesyta ×2 · AI UGC/influencer 'clone' money method (everygen.ai, paid partnership) — within-IG duplicate. → Same AI-influencer risk class as Bella's LoRA playbook; verify platform ToS before touching. 🛠️ https://www.instagram.com/p/DX24p8TCXqs/
- **2026-07-17** · @thederekgray · Running a one-person AI agent business: tax write-offs, cash flow. → The tax framing for his autonomous-money mandate. 🛠️ https://www.instagram.com/p/Da3WwK0DE0-/
- **2026-05-01 / 08-05 / 08-09** · @irv.official ×3 · "Claude changed business funding" — free personalized funding roadmap via comment — within-IG duplicate. → Funding lane: check against his Kiva/LiftFund ladder before using. ⚡ https://www.instagram.com/p/DXpCASLFR4E/
- **2026-06-16** · @paulalex · $150K Dairy Queen franchise vs his credit-card processing business doing $30K+/mo — unverified earnings claim. → The real item is the "boring cash-flow business" thesis; verify any number. 🔬 https://www.instagram.com/p/DZnGrM3G9yG/
- **2026-04-15** · @businessbulls.in · Unverified claim: trader turned $1,500 into $300,000 with Claude + Polymarket/BTC arbitrage. → Paper-trade only; escalating-claim pattern (see Daniro). 🔬 https://www.instagram.com/p/DWt3w_Fiok6/
- **2026-06-29** · @ariacodez · AI that copies money-making apps and builds pages to outrank the original on Google. → Clone-and-outrank SEO for Kit client work; platform/ToS check first. 🛠️ https://www.instagram.com/p/DZkkHsRq20z/
- **2026-04-11 / 04-12** · @chasebfisher ×2 · TikTok Shop affiliate pitch (same content, two URLs — within-IG duplicate). → Affiliate angle for GSE merch when the audience exists. ⚡ https://www.instagram.com/p/DWhoqqpgAqU/

---
## 🏈 GSE / sports edge

- **2026-09-03** · @thelocktalk · 8 AI prompts for NFL anytime-TD props. → Get all 8, test vs engine. ⚡ https://www.instagram.com/p/DcykhfnFfq3/
- **2026-09-10** · @scottsmithyta · Google Trends workflow behind a faceless channel doing 4M views / $19.7k per 28 days. → Apply to GSE YouTube/TikTok topic picks. 🛠️ https://www.instagram.com/p/DdEymuKEWfh/
- **2026-09-01** · @voxaris_ai · timesfm-3: free spreadsheet forecasting, no training. → Forecast from engine/traffic data. 🛠️ https://www.instagram.com/p/DcudS35xEg3/
  - 2026-09-24 status: benchmark lane wired as `POST /predict/timesfm-benchmark` (gse-ml-service; 6/6 tests; structurally barred from consensus). License VERIFIED non-commercial — research/benchmark OK, pick path needs a Google commercial license. Blocked on Garrett's one tap: accept gated HF terms at huggingface.co/google/timesfm-3.0-pytorch, then `pip install 'timesfm[torch]'` + weights fetch (see gse-ml-service/TIMESFM_SETUP.md).
- **2026-09-11** · @datasciencebrain · "Not the pipeline. The measurement." — the post that separates hired AI engineers from the rest: write the success criterion into code BEFORE running anything, commit it so you can't move the goalposts, publish the failures anyway ("a number that fails is the only proof you did not tune the threshold after seeing the answer"), exact McNemar tests not vibes, validity gates that can void your own results. → This is the eval discipline his whole engine-benchmark lane runs on. Steal the pre-registered-criterion + validity-gate pattern for GSE model evals. ⚡ https://www.instagram.com/p/DdJaqf9GJQ-/
- **2026-09-02** · @seb.ai · Open repo: Claude Code → full faceless Shorts team (script, visuals, voiceover, captions). → GSE Shorts pipeline. 🛠️ https://www.instagram.com/p/DcrutPfvGI3/
- **2026-08-26** · @marc.kaz · OpenShorts: free AI clipping, no watermarks/limits. → Highlight clipping for telestration. ⚡ https://www.instagram.com/p/DcgcaAjuLE6/
- **2026-09-16** · @gittrend.io · Hypit: AI clones viral videos (footage, captions, B-roll). → GSE Reels/TikTok formats. ⚡ https://www.instagram.com/p/DdV2ftSAsfV/
- **[X] 2026-09-15** · 李韭二/EverMind · @hypitai: agent-written video workflow engine (NOT templates) for cloning viral videos; GitHub: `hypit-ai/hypit`. → **Cross-platform dedupe:** same Hypit as the IG item above — the X share adds the GitHub repo name. Clone it, test on GSE formats. ⚡
- **2026-08-29** · @marc.kaz · Diffusion Studio: video editing as code, agent-editable via CLI. → Agent-driven GSE edits. 🔬 https://www.instagram.com/p/DcoIjyNOVE0/
- **2026-09-10** · @github_dev · ComfyUI Ref2VA VSA: 5-sec character video in 72 sec on one consumer GPU. → GSE character/mascot clips. 🛠️ https://www.instagram.com/p/DdEebQRtEd1/
- **2026-09-04** · @ariacodez · Higgsfield plugin: 12-sec luxury product video from one prompt. → Ad creatives for Kit/cards. ⚡ https://www.instagram.com/p/Dc1RbwFqMW9/
- **2026-08-29** · @artificialntellligence · GPT-6 Astra + Higgsfield demos incl. football player/passing tracking in footage. → Telestration ideas for GSE clips. ⚡ https://www.instagram.com/p/DdCbr3VHay6/
- **2026-09-19** · @simplifyinai · Jev Ultrafast: 7-second browser agent (Browser Use). → Running on the workspace VM (verified 2026-09-24); his Windows install was mid-setup — daemon not yet alive. Finish the Windows setup. ⚡
- **2026-09-20** · @wassimyounes_ · Jev explainer (decision engine, typed probabilities). → Background reading. ⚡ https://www.instagram.com/p/Ddha4Pzh7GU/
- **2026-09-19** · @chatgptricks · TypeSafe/Jev emerge-from-stealth piece. → Background. ⚡ https://www.instagram.com/p/DdXg7mYnS9K/
- **[X] 2026-09-17** · Vincent · "This MCP with 52,000 downloads lets you create INFINITE localized TikTok accounts. Geo-targeted accounts in 16+ countries. Plug into Astra or Claude." → GSE TikTok growth lever — but bulk-account creation is spam-adjacent; verify TikTok ToS risk before touching. 🛠️
- **[X] 2026-09-21** · Tech with Mak · LoRA vs QLoRA vs LoRA-FA vs VeRA vs Delta-LoRA vs LoRA+ explainer. → Background for the AI-influencer items (Bella's LoRA workflow). ⚡

---

- **2026-06-28** · @thelocktalk · 3 AI prompts for finding likely home-run hitters. → Prop-lane companion to the anytime-TD prompts (Start Here #1). ⚡ https://www.instagram.com/p/DaBUDfsDjhz/
- **2026-06-15** · @power.ai · New open-source tool giving Claude Code the ability to understand and analyze video. → Agent-assisted clipping review for GSE. 🛠️ https://www.instagram.com/p/DYYP90LE8YM/
- **2026-07-11** · @ashharrisprod · Open Generative AI: open-source Higgsfield alternative (image, video, lip sync, cinema studios). → Verify vs the debunked "Higgsfield open-sourced the platform" claim; if real, video infra for GSE. 🛠️ https://www.instagram.com/p/DXZlhjFjz7v/
- **2026-06-26** · @ariacodez · Cartoon content engine: generates cartoons, predicts virality, posts automatically (Claude + Higgsfield). → Faceless-lane automation; test on a scratch channel. 🔬 https://www.instagram.com/p/DaBZwv-SIjc/
- **2026-06-29** · @angus.sewell · Guide for setting up an autonomous content agent. → GSE content ops. 🛠️ https://www.instagram.com/p/DZc2ci4xCp6/
- **2026-06-24** · @dugoutforever · MLB juicing the baseballs again (Action Network analysis). → Content angle + calibration note for his engine's priors. ⚡ https://www.instagram.com/p/DZ8w1qXlGwN/
- **2026-06-24** · @todayyearsold · YouTube permanently terminated 16 AI-generated channels — biggest crackdown on templated AI content. → The caution flag for the whole faceless lane: templated = dead; original process wins. ⚡ https://www.instagram.com/p/DZBflujB5yw/
- **2026-05-26** · @elevenpercentprod · Claude-powered AutoEdit Creator Mode for Premiere Pro (auto rough cuts + captions). → Clipping layer for GSE. ⚡ https://www.instagram.com/p/DYGhjpdT0uT/
- **2026-05-26** · @thesanskaarsingh · Fish Audio: realistic TTS/voice cloning. → Voiceover layer for GSE clips. ⚡ https://www.instagram.com/p/DYo5657k7cx/
- **2026-05-13** · @nordic_scott · ChatGPT + Kling 3.0 prompts for a viral KBO broadcast-style trend video. → Format idea for GSE trend content. 🛠️ https://www.instagram.com/p/DYP2Wn4oBRW/
- **2026-07-12** · @jdiggsmac · YouTube thumbnails debate. → Thumbnail practice for the faceless lane. ⚡ https://www.instagram.com/p/DXzybV2Oxg9/
- **2026-07-21** · @gobi_automates · Running an entire content system via AI connectors; "attention is the new moat in 2026." → The content-ops thesis for GSE socials. 🛠️ https://www.instagram.com/p/Da3OgYWEvCW/
- **2026-07-20** · @anjela.marketing · Claude Design workflow for Instagram carousels. → Carousel format for GSE/Kit. ⚡ https://www.instagram.com/p/DaxwCd3sv5m/
- **2026-06-04** · @wassimyounes_ · Free Higgsfield alternative using Claude Code + agentic workflows. → Verify; if real, kills video cost. 🛠️ https://www.instagram.com/p/DW45Nt6gAFu/
- **2026-06-13** · @mindset.therapy · Claude Fable 5 cinematic video + website building via Higgsfield MCP. → Higgsfield MCP for Claude — video-gen pipeline for Kit ads. 🛠️ https://www.instagram.com/p/DZdNtuymZjQ/

---
## 🔍 Research & OSINT

- **2026-09-21** · @marc.kaz · OSINTsearch.org: 759 endpoints, username/email/phone lookups, deleted-account traces. → Client-finding for Kit outreach (standing directive). ⚡ https://www.instagram.com/p/DdhBJQjuoSR/
- **2026-08-23** · @mortaltechschool · 400+ ethical-hacking tools list (comment-gated). → Mine for his OSINT start.me page. ⚡ https://www.instagram.com/p/DcVJ7ZDiLAb/
- **2026-08-28** · @ariacodez · iPhone lockdown setting (10 sec, kills Apple's iCloud spare key). → Do it on his phone tonight. ⚡ https://www.instagram.com/p/DcESRivqD4A/
- **2026-09-04** · @marcinteodoru · PixelRAG: AI reads pages via screenshots, not code. → Relevant to his scraping/agent approach. 🔬 https://www.instagram.com/p/Dbb38hFCPuc/
- **2026-09-04** · @vyzual.ai · WebMCP: sites expose structured actions for agents. → Watch; changes agent-vs-website economics. 🔬 https://www.instagram.com/p/Dcv4CU6DYNP/
- **2026-09-22** · @gogreen_ai · Cache-to-Cache: LLMs talk via KV-cache, not words. → Research curiosity; long-term agent efficiency. 🔬 https://www.instagram.com/p/DdatXCRmVwW/
- **2026-09-07** · @carterperez.dev · OSINT links (caption empty — content was in comments/DM). → Rotting unless retry recovers it. https://www.instagram.com/p/Dc_pJpLxIMq/
- **[X] 2026-09-13** · Rekt Fencer · "CLAUDE JUST MADE ONCHAIN WALLET RESEARCH STUPIDLY EASY. Paste a wallet address into chat and have it read the chain. No API keys. No scripts. Two connectors: mcp.blockscout.com, mcp.crypto.com." → Free onchain OSINT via Claude MCP; add tonight. ⚡
- **[X] 2026-09-14** · Mr. Buzzoni · Using GPT-6 Astra to search like a quant desk. → Research technique upgrade for his deep-research lanes. ⚡
- **[X] 2026-09-18** · Ori Silver · "JEV makes competitor research feel like a cheat code. Fed it Resilia's ad library: classified 1,891 ads in 19 seconds for $0.12. Customer journey stage, ad style, account deep dive. Coming soon to the maxfusion MCP." → Near-zero-cost competitor research; point at Kit prospects' ad libraries. ⚡
- **[X] 2026-09-15** · ハル｜AIマスターズ · Japanese post: found a viral overseas account (1M+ views, 20K likes, 1000 comments). → Overseas-virality research method; translate-and-mine for GSE formats. 🔬
- **2026-09-02** · @wassimyounes_ · God's Eye View: spy-satellite simulator in the browser, but the sources are public and the data is real — live aircraft, ships, satellites, earthquakes, traffic, public cameras on a photorealistic 3D globe, with hands-free AI voice control. → Free OSINT/visualization toy with real data; useful for research demos and his start.me OSINT page. ⚡ https://www.instagram.com/p/Dcyzw-SJxyn/


- **2026-06-24** · @codingknowledge · Osiris: free open-source Palantir alternative for real-time tracking and OSINT (github.com/simplifaisoul/osiris). → Add to his OSINT start.me page. ⚡ https://www.instagram.com/p/DZVHuW6SN4c/
- **2026-06-10** · @ariacodez · Directory of free OSINT tools (reverse phone/image lookup, people search, temp mail) (+ 08-21 same author: "most powerful open-source OSINT tools on one page" — deduped). → OSINT kit. ⚡ https://www.instagram.com/p/DZYFS5cK59F/
- **2026-08-23** · @carterperez.dev · Sherlock OSINT tool in-depth guide. → Username-hunting for client research. ⚡ https://www.instagram.com/p/Db3ZNRcRhzW/
- **2026-05-29** · @sovereignty.ai · FMHY: website directory of free internet resources (Google delisted, MPA flagged). → Standing resource directive: add FMHY alongside free-for.dev. ⚡ https://www.instagram.com/p/DYvbyXdiPIx/
- **2026-05-15** · @evolving.ai · An X user erased his digital footprint with Claude in ~6 hours (justdeleteme.xyz, haveibeenpwned.com, CCPA opt-outs). → Privacy hygiene for his own accounts. ⚡ https://www.instagram.com/p/DYWm6yygPWm/
- **2026-05-27** · @ariacodez · Free GitHub plugin giving Claude 183 pentesting tools (network auditing, OSINT, pentest automation) — defensive/educational use only. → Authorized testing only. 🔬 https://www.instagram.com/p/DXfOe6sEsMH/
- **2026-06-04** · @ai.shelest · BadHost Starlette vulnerability: three steps to secure MCP servers. → Security hardening for his whole agent fleet. ⚡ https://www.instagram.com/p/DZEgmevz0Ys/
- **2026-06-10** · @ariacodez · Free voice-cloning tool + the deepfake/voice-scam risks it creates. → Know the scam vectors; protect his own voice likeness. ⚡ https://www.instagram.com/p/DPh7YE8Eqwa/
- **2026-08-18** · @weposttech · 6 open-source Instagram automation repos (InstaPy, GramAddict, Instagram-Scraper, InstaLooter, Instagrapi). → Read-only research only; aggressive automation violates IG rules. ⚡ https://www.instagram.com/p/DcJtc6ak44Z/

---
## 🤖 Agent infra (his operations)

- **2026-08-25** · @stridejosh.ai · **Grok Bot runtime leaked.** Cursor shipped Grok Bot 0.18.0 with source maps still enabled; dev Bennett reconstructed large parts of its internal architecture — system prompts, tool definitions, model-routing logic. The mirror repo has more forks than stars; the dev himself says it'll be archived "if not taken down" (Claude Code's identical leak got DMCA'd within a day). *(+ companion: 08-25 @wassimyounes_ "A security researcher just read Grok Bot's mind" writeup — same leak.)* https://www.instagram.com/p/DceB30yu5KQ/ → Grok Bot runs his ops (Signal Desk briefs, Signal Origin). Pull the archive + the writeup NOW, mine the routing/prompt architecture for his own fleet. ⚡ https://www.instagram.com/p/Dcebcftgpsn/
- **2026-09-04** · @eluna.ai · NVIDIA PAIR: free tool that turns multiple PCs/Macs on the same network into a personal AI data center — spare compute shared for local AI workloads, prompts/files stay local. → Free fleet compute across his VM + PC instead of cloud spend. ⚡ https://www.instagram.com/p/Dc4KKywkjTq/
- **2026-09-01** · @simplifyinai · OpenBot: "literally the free version of Grok bot," 100% open source — AI coworkers with a computer of their own; every bot gets its own browser, files, and logins; actions decided before they happen; "take the wheel" hands control to a human; bring any agent framework. → Free Grok Bot-class ops layer for his fleet. 🛠️ https://www.instagram.com/p/Dcxo6cRGa1m/
- **2026-08-31** · @evolving.ai · Perplexity + NVIDIA's "Portable Computer": an AI agent that runs locally on your own hardware — planner, scheduler, tool router and local search stay on-machine (27B model trained for the job), connects to Gmail/Drive/Slack/GitHub, files stay local; calls frontier models only when a task needs them. → The local-first ops pattern for his background work. 🛠️ https://www.instagram.com/p/DctNmzJgPXb/
- **2026-09-19** · @artificialntellligence · Google's AI ecosystem map: Stitch (interface design), Antigravity (development), Flow (audiovisual), Opal (mini-apps), Mixboard (idea exploration), AI Studio (build/experiment) — many with free options. → Free-tool directory; check Antigravity + AI Studio against his current stack before paying for anything overlapping. ⚡ https://www.instagram.com/p/DdIAxPynbHV/
- **[X] 2026-09-21** · codila · "Jev is the 'Internet' moment for the AI industry. It tells your agents and LLMs what to do next, in milliseconds and at almost zero cost. If you set it up correctly, you will have the AI engineer's stack for 2028." *(RESCUED from Rotting — this card had real text, not a bare link; the attached article x.com/i/article/2077 stays in the retry list.)* → The Jev thesis piece; pairs with 雪踏乌云's API playbook and Diogo Almeida's doc below. ⚡

- **2026-08-23** · @marc.kaz · OpenSandbox: isolated envs for code/browse/desktops, MCP server, Apache 2.0. → Sandbox for his agent fleet. 🛠️ https://www.instagram.com/p/DcBuc3XuVif/
- **2026-09-04** · @gittrend.io · OpenViking: one memory DB for all agent context. → Shared memory across his agents. 🛠️ https://www.instagram.com/p/Dc273JcEhrI/
- **2026-09-07** · @gittrend.io · TrueForge: runs the whole agent loop for you. → Evaluate against current setup. 🛠️ https://www.instagram.com/p/Dchw3IQkVHT/
- **2026-09-04** · @wassimyounes_ · Ghost: computer-use layer for Windows/Linux (MCP/CLI/REST), no cursor stealing. → Automate his PC in background. 🛠️ https://www.instagram.com/p/Dc4hp52AjoJ/
- **2026-08-31** · @gittrend.io · OpenCodex: free local proxy — any model in Codex/Claude Code. → Cut inference spend. ⚡ https://www.instagram.com/p/DcFw7QsiHHz/
- **2026-09-01** · @simplifyinai · dsh: free open DeepSeek harness, swappable model/sandbox/UI. → Free local agent runtime. 🛠️ https://www.instagram.com/p/Dcuz_JdmWYH/ *(+ 08-18 @wassimyounes_ deep-dive: 130k⭐/13k forks in a week, plugin architecture, `npx @deepseek-ai/dsh web` local UI, ships CLAUDE.md + AGENTS.md in the repo root; honest caveats from the post: the harness is free, the MODEL isn't — bring your own key; benchmarks are DeepSeek's own runs, no independent reproduction yet. → The agent-runtime layer for his fleet; independently verify benchmarks before trusting. 🛠️ https://www.instagram.com/p/DcJs0wCpic-/)*
- **2026-09-19** · @wassimyounes_ · Self-evolving AI agents repo (Claude Code + Codex). → Try on a scratch repo first. 🛠️ https://www.instagram.com/p/DXMgbckgDhG/
- **2026-09-19** · @wassimyounes_ · OpenCodeReview: AI PR reviews, line-by-line, full-file context. → Point at Sports repo. ⚡ https://www.instagram.com/p/DdUNPQXxYkq/
- **2026-09-16** · @wassimyounes_ · Union Alpha: stealth coding model, strong DeepSWE score, cheap. → Try via OpenCode Zen. ⚡ https://www.instagram.com/p/DdW_cjfpEt5/
- **2026-09-22** · @askgpts · "Everything Claude Code": 10 months of refined agentic configs, open-sourced. → Steal the configs. ⚡ https://www.instagram.com/p/DdYAk2ok2LM/
- **2026-09-21** · @askgpts · Google SAM: open-source networking layer for agents. → Future agent mesh; watch. 🔬 https://www.instagram.com/p/DcZZ8PLkxP_/
- **2026-08-28** · @adamstewartmarketing · Block's Buzz: shared workspace for humans + agents. → Evaluate vs his agent-bus. 🔬 https://www.instagram.com/p/DbdT7pRvywJ/
- **2026-09-01** · @wassimyounes_ · Why system-prompt leaks matter (blueprint for guardrails). → Security reading for his agent setups. ⚡ https://www.instagram.com/p/Dcw1w0oggu0/
- **2026-08-26** · @theaifield · Grok Bot as full-time AI employee (Slack/email/Notion/Stripe). → Pattern for his ops. 🔬 https://www.instagram.com/p/DcgXihDjA3L/
- **2026-08-28** · @ariacodez · Pokee-Isaac 28B: 10M-token context (75 books), scored 93 on a 10M-token benchmark where GPT/Gemini scored zero. NOTE: it's a freemium SaaS (free trial, then a plan) — not local. → Whole-codebase-in-one-context experiments on the trial tier. 🔬 https://www.instagram.com/p/DcjNVnfqY5h/
- **2026-09-10** · @simplifyinai · MiniCPM5-1B: tiny reasoning/coding model, runs anywhere. → On-device small tasks. 🔬 https://www.instagram.com/p/DdF85HXm4ya/
- **2026-09-14** · @githubsignals · Claude Unlimited: pools all AI subscriptions, auto-switches at limits. *(+ duplicate save 09-21 @gittrend.io — deduped.)* VERIFIED 2026-09-24: real open-source project (`devdock-ai/claude-unlimited`), fully local daemon, credentials in OS keystore. Caveat: rotating subscriptions likely violates Anthropic/OpenAI ToS — his call. ⚡ https://www.instagram.com/p/DdQvKY_jSvw/
- **2026-08-27** · @ariacodez · Autonomous security-research agent stack (local model + bug-bounty MCP + 27 tools). → Only for authorized testing. 🔬 https://www.instagram.com/p/DceJfw-q6em/
- **2026-08-28** · @simplifyinai · Strix: free open-source vuln scanner. *(+ duplicate saves 08-28 @ariacodez, @carterperez.dev — deduped.)* → Scan his own sites. ⚡ https://www.instagram.com/p/DcVyW50G_P4/
- **2026-09-04** · @marc.kaz · Ravage: evidence-first pentest CLI for apps you're authorized to test. → Kit client sites, with permission. 🛠️ https://www.instagram.com/p/Dc3oI7iuppW/
- **2026-08-31** · @gittrend.io · Zoetrope: Claude Code session → live flow graph. → Debug his agent runs visually. ⚡ https://www.instagram.com/p/DcrQILYIEJS/
- **2026-09-09** · @thewizeai · (listed in Start Here #7 — free token stacking playbook.) https://www.instagram.com/p/DdCY3Ejla6n/
- **[X] 2026-09-14** · Mr. Buzzoni · Anthropic hackathon winner open-sourced his Claude Code setup: 68 subagents, 286 skills, 94 commands. → Steal the configs; related to IG's "Everything Claude Code" but a different source — keep both. ⚡
- **[X] 2026-09-21** · nicco · Anthropic engineer on building self-prompting agent systems: "Prompts → Harness → Loops." → Design pattern for his agent fleet. 🔬
- **[X] 2026-09-14** · Alex · Cognitive Relay: connecting Kimi K3 to GPT-6 Astra. → Model-relay routing idea; evaluate vs direct calls. 🔬
- **[X] 2026-09-14** · 0xMarioNawfal · OpenAI Codex agent tips, no keyboard. → Codex workflow upgrades. ⚡
- **[X] 2026-09-14** · Rshhad · Andrej Karpathy's AI workflow. → Steal Karpathy's workflow. 🔬
- **[X] 2026-09-21** · codila · Jev creator Diogo Almeida's 7-page doc / 14-page PDF guide. → Jev reference doc. ⚡
- **[X] 2026-09-21** · Diogo Almeida/TypeSafe AI · TypeSafe coding agents + Google doc. → Evaluate for Sports repo work. 🛠️
- **[X] 2026-09-21** · 雪踏乌云 · Jev API playbook checklist; mentions jev-ultrafast (browser-use/jev-ultrafast) as the high-speed browser agent. → He already runs jev-ultrafast (installed 09-24); the playbook extends it to API use. ⚡
- **[X] 2026-09-21** · Simplifying AI · Open-source Jev alternative: 6-7x faster, typed-decision classification, under 1GB, free on Hugging Face, runs on laptop. → Local Jev-class decision engine; evaluate vs hosted. 🛠️
- **[X] 2026-09-16** · Anatoli Kopadze · "20-200x faster. 40-400x cheaper. output tokens free forever. The man who co-invented ChatGPT just dropped a new kind of AI called Jev — it can't write a word, it only makes decisions." → Launch hype, background only — he already has Jev working. (theme-deduped)
- **[X] 2026-09-16** · Diogo Almeida/TypeSafe AI · Jev launch: RLCD training details. → Background. (theme-deduped)


- **2026-06-02** · @askgpts · Claude Code Router: routes Claude Code requests to cheaper models (DeepSeek, Gemini). → The concrete tool for Start Here #2's cost architecture. ⚡ https://www.instagram.com/p/DY-1P8wE_Q9/
- **2026-06-02** · @aitickerdaily · andrej-karpathy-skills: Karpathy's four Claude Code rules, #1 trending (github.com/ForrestChang/andrej-karpathy-skills). → Steal the rules for his fleet. ⚡ https://www.instagram.com/p/DYm0Y9EktzS/
- **2026-06-03** · @marc.kaz · ECC: Anthropic hackathon winner's full AI coding setup — 183 agent skills, 48 sub-agents (github.com/affaan-m/ECC). → Companion to Start Here #15 (Mr. Buzzoni's 68/286/94); diff the two setups. ⚡ https://www.instagram.com/p/DZFhBEnOxo0/
- **2026-06-02** · @datasciencebrain · Agent2Agent (A2A) open standard: agent discovery + communication, buildable in 30 minutes. → His fleet is multi-agent; A2A is the mesh. 🛠️ https://www.instagram.com/p/DZAOHsDmE2q/
- **2026-08-02** · @datasciencebrain · Build the MCP host (not just install servers): the program that launches servers, aggregates tools, trims context with an allowlist — 60-minute free build. → His fleet needs a host, not just servers. 🛠️ https://www.instagram.com/p/Dbhdx66GL3O/
- **2026-06-07** · @datasciencebrain · Self-debugging AI coding agent in Python (writes, runs, fixes itself) — 30 minutes. → Pattern for his coding agents. 🛠️ https://www.instagram.com/p/DZRQoT8mCQe/
- **2026-07-30** · @datasciencebrain · Autonomous agent that watches docs and fixes FAQ answers when they drift. → Self-healing knowledge base for Kit client sites. 🛠️ https://www.instagram.com/p/DbKRzDsGIOm/
- **2026-08-06** · @datasciencebrain · Ambient agent running unattended 8 hours (LangGraph + SQLite checkpoints + Streamlit). → The pattern for his background money-lane agents. 🛠️ https://www.instagram.com/p/DbrxlmVmGTc/
- **2026-08-04** · @datasciencebrain · Tool-calling agent in Telegram that messages HIM first: reminders surviving restarts, link summaries, cross-day memory. → The notification layer for his whole operation. 🛠️ https://www.instagram.com/p/DbcTDSwiIIq/
- **2026-08-05** · @datasciencebrain · Five-agent CrewAI equity research desk (4 analysts + 1 editor, parallelism measured, every number traces to source). → Multi-agent pattern done right. 🛠️ https://www.instagram.com/p/Dbml7lEGGre/
- **2026-08-17** · @datasciencebrain · Local model router: 4B model answers, local verifier checks, frontier only on escalation — 56% cheaper at 95% of baseline quality. → The cost-routing recipe, quantified. ⚡ https://www.instagram.com/p/DcFgAcimHZr/
- **2026-06-27** · @datasciencebrain · Reflexion: an AI agent that grades and rewrites its own work until it passes. → Self-grading loop for his agents. ⚡ https://www.instagram.com/p/DaFwEGRGGIg/
- **2026-07-30** · @nedz_reclassified · Ego: free open-source tool giving AI agents their own browser sharing YOUR logged-in session. → Huge capability; security review first (session sharing = credential surface). 🔬 https://www.instagram.com/p/DbRA_przNZS/
- **2026-08-10** · @seb.ai · HeadlessX: self-hosted live-web access for agents (scrape, crawl, screenshots, built-in search operators, remote MCP endpoint). → Fresh-data layer for his research agents; respect site ToS. 🛠️ https://www.instagram.com/p/Db2FO4FPkV2/
- **2026-08-08** · @futurewalt.ai · model-router: DeepSeek V4 Flash as subagents inside Codex — replaces a $200/mo Claude setup. → The execution layer of Start Here #2. ⚡ https://www.instagram.com/p/DbyNwsLAd3w/
- **2026-07-20** · @theaisurfer · Graphify: free tool cutting Claude Code token usage by 70%. → Cost lane. ⚡ https://www.instagram.com/p/DawQ6_7DNRD/
- **2026-08-05** · @seb.ai · Graft: codebase map built once (42% fewer tokens, 46% fewer tool calls, 60% less time, same correctness). → Cost lane for his coding agents. ⚡ https://www.instagram.com/p/DbpQgw1Po0L/
- **2026-08-09** · @simplifyinai · Numbat: Perplexity's open-source tool watching agent actions live and blocking dangerous ones (SSH keys, .env) before they run. → Safety layer for zero-human-input mode. ⚡ https://www.instagram.com/p/Dbwlg2nmYqO/
- **2026-08-09** · @simplifyinai · Colibri: runs a 744B-parameter model on a laptop with no GPU (VRAM/RAM/disk hierarchy, 25GB RAM) — slow but real. → Extreme local inference; research curiosity. 🔬 https://www.instagram.com/p/Dbxla8Bm3iZ/
- **2026-08-03** · @simplifyinai · jcode: free open-source coding agent, "245x faster than Claude Code" (Rust, semantic memory graph, 30+ providers, swarm mode). → Verify the 245x claim; evaluate against his current stack. 🛠️ https://www.instagram.com/p/DbkDDWklCc5/
- **2026-08-07** · @wassimyounes_ · Prime Agent: Prime Intellect's self-improving coding harness (Opus 5 + harness: 95.5% on ARC-AGI-3). → Self-modifying scaffolding; research. 🔬 https://www.instagram.com/p/DbtJytsumrO/
- **2026-05-27** · @simplifyinai · 'free-claude-code': open-source proxy running Claude Code free via NVIDIA API keys (+ duplicate 06-18 fcc-server — deduped). → Cost lane; pairs with Start Here #19 (NVIDIA inference). ⚡ https://www.instagram.com/p/DYfULBQGWAU/
- **2026-07-21** · @brodyautomates · Orca: open-source IDE running a fleet of Claude Code agents in parallel. → Parallel coding fleet. 🛠️ https://www.instagram.com/p/DbB7y4pyPof/
- **2026-07-23** · @simplifyinai · Codex-Orchestration: free plugin orchestrating multiple models inside Codex. → Model orchestration layer. 🛠️ https://www.instagram.com/p/DbEAjZnGVAz/
- **2026-07-21** · @kayvon.ai · 5 MCPs that supercharge Claude Code (Perplexity, Playwright, Firecrawl, Glif, Chrome). → Install set for his coding agents. ⚡ https://www.instagram.com/p/Da6cLdrqPxF/
- **2026-07-24** · @getintoai · Claude Cowork "Record a skill": screen recordings become reusable skills. → Skill-capture for his fleet's repeat workflows. ⚡ https://www.instagram.com/p/DbJnnJ8k85J/
- **2026-08-07** · @futurewalt.ai · Jack Dorsey open-sourced a free tool for one-person businesses (14.4K stars: own server + chat + search + Git + automation + agent teammates). → Verify repo identity; one-person-ops stack. 🛠️ https://www.instagram.com/p/DbvqGVUAQns/
- **2026-05-26** · @wassimyounes_ · Fast web scraper for Claude Code. → Scrape layer for his research agents. ⚡ https://www.instagram.com/p/DX2orbYgPVI/
- **2026-05-26** · @syntaix.ai · OpenHands: open-source Devin alternative (73K+ stars). → Evaluate vs his current coding agents. 🛠️ https://www.instagram.com/p/DYLzop0iduH/
- **2026-05-26** · @wassimyounes_ · 31 Anthropic small-business Claude skills (382k day-one downloads), 10-minute setup. → Skill pack for Kit client automation. ⚡ https://www.instagram.com/p/DYsVcNPJBdm/
- **2026-05-27** · @wassimyounes_ · Entire open-sourced AI company for instantly creating an agency. → Agency-in-a-box; Kit lane. 🛠️ https://www.instagram.com/p/DX17KO5gd2V/
- **2026-05-27** · @baroobi.inc · #1 GitHub repo for saving Claude tokens / avoiding re-explaining context. → Token-saving layer. ⚡ https://www.instagram.com/p/DXKEfFTDRv0/
- **2026-05-27** · @syntaix.ai · Chinese open-source local 'AI employee' working 24/7 (research, code, sites, decks, videos). → Local agent employee. 🛠️ https://www.instagram.com/p/DYKSiyRCbkk/
- **2026-08-21** · @nedz_reclassified · Free open-source skill pack turning Claude Code/Cursor/Cline/Kiro into a reverse-engineering tool — authorized security only. → Forensic tool for his own code audits. 🔬 https://www.instagram.com/p/Dbeo9gQT8Xm/
- **2026-05-28** · @appinventiv4ai · 'Superpowers': open-source framework (200K+ stars) bringing structured workflows to coding agents. → Evaluate against his agent setups. 🛠️ https://www.instagram.com/p/DY19vbGGUnr/
- **2026-08-04** · @syntaix.ai · 6 open-source AI agent repos to star (agency-agents, codebase-memory-mcp, OpenMontage, Agent-Reach, orca). → Star list for his fleet. ⚡ https://www.instagram.com/p/Dam_GQNiezK/
- **2026-08-05** · @agentic.james · Skill for understanding and learning from any open-source repo. → Repo-learning pattern; pairs with GitReverse (Dev tools). ⚡ https://www.instagram.com/p/DaLg2dBjQah/
- **2026-07-21** · @chatgptricks · Build AI workflows and systems around models instead of chasing the newest model. → The principle behind his cost routing. ⚡ https://www.instagram.com/p/DbDgIPdlYWC/
- **2026-05-06** · @tenfoldmarc · agency-agents: AI agent project showcase (github.com/msitarzewski/agency-agents). → Agent-team pattern. 🛠️ https://www.instagram.com/p/DX5Hr92zpKf/
- **2026-07-11** · @zoeyos.ai · Zoey: Jarvis-style multi-agent AI system. → Evaluate. 🔬 https://www.instagram.com/p/DaSw8Balfqk/
- **2026-07-03** · @angus.sewell · AI agent "first tools" on his radar. → Watch list. 🔬 https://www.instagram.com/p/DX9tzh7x5ob/
- **2026-05-18 / 06-03** · @lukebuildsai ×2 · Jarvis-style AI assistant + an agent team ('Jarvis' manager + specialists) running in Slack as AI coworkers — within-IG duplicate. → The Slack-coworker pattern for his fleet. 🛠️ https://www.instagram.com/p/DYUlvUTNbRi/
- **2026-05-27** · @sebintel · Godmode: free local tool accessing 50+ AI models (ChatGPT, Claude, Gemini), no data leaks. → Local model-router UI. ⚡ https://www.instagram.com/p/DYuO6ZnPGzs/
- **2026-05-27** · @work_withdaas · 'Shannon': the Claude Code for hackers. → Authorized testing only. 🔬 https://www.instagram.com/p/DXW_055D7GF/
- **2026-05-27** · @myself_immortal · Agentic hacking (Metasploit Agentic, OpenClaw mapping infra autonomously). → Defensive awareness only. 🔬 https://www.instagram.com/p/DYpAPvzjbsb/
- **2026-06-07** · @myself_immortal · 'Vibe hacking': AI agents building mutating malware + a defensive playbook. → Defensive awareness. 🔬 https://www.instagram.com/p/DZPNj0Djbm_/
- **2026-05-29** · @baroobi.inc · Claude acting as a security researcher to hack your own code. → Authorized self-testing. ⚡ https://www.instagram.com/p/DXzz_83NF0A/
- **2026-07-01** · @ariacodez · API key security scanner on blink.new (60 seconds). → Key hygiene for his API sprawl — do this. ⚡ https://www.instagram.com/p/DTvSNF9CgBf/
- **2026-06-03** · @wassimyounes_ · AI agent jailbreaking another AI model 7 minutes after launch. → Safety note for his multi-agent fleet. ⚡ https://www.instagram.com/p/DY-5JGLgzTY/

---
## 🛠️ Dev tools worth installing

- **2026-09-13** · @gittrend.io · Fortress: anti-block browser engine, one-line change. → His scrapers stop getting blocked. ⚡ https://www.instagram.com/p/DdMgKczjl3g/
- **2026-08-30** · @marc.kaz · Capacitor: ship one web codebase as iOS/Android/PWA. → If he ever needs a GSE app. 🛠️ https://www.instagram.com/p/Dcq02X0ubGo/
- **2026-09-08** · @marc.kaz · Argent: agentic toolkit driving real iOS/Android/TV/desktop. → Agent QA on real devices. 🛠️ https://www.instagram.com/p/DdCBk9ROSAU/
- **2026-08-28** · @marc.kaz · NodeGraphQt: node-graph UI framework for Python. → If he builds visual tools. 🛠️ https://www.instagram.com/p/DcbcKeGO2RF/
- **2026-08-31** · @ariacodez · Replit rebuilt around conversation: tell it a problem (e.g. "my resume keeps getting rejected") and it finds keywords, builds a working scoring tool, rewrites the resume — same conversation. Free Mode for experimenting. → Fastest prototyping loop for throwaway tools; try the next scratch build here instead of local setup. ⚡ https://www.instagram.com/p/Dctc_xTKeBh/
- **2026-08-26** · @marc.kaz · Godogen: generate complete games from a description. → Fun / possible product. 🔬 https://www.instagram.com/p/Dcd84biuiDo/
- **2026-09-02** · @techs · 160+ free 3D components / creative web ideas (6 developers, weird/creative builds: bouquet→QR code, live 3D iPhone, Claude-designed website). *(+ duplicate 08-30 @activeprogrammer — deduped.)* → Kit site wow-factor. ⚡ https://www.instagram.com/p/DcwQbNNjwmP/
- **[X] 2026-09-15** · 俺の娘たち · Japanese prompt-tip meme: phrase image prompts as "shake on the x-axis," not "shake the body" — small phrasing change, big output difference. → Video-gen prompting technique for his AI video work. ⚡
- **[X] 2026-09-14** · sauda moni · LongCat-Avatar: free open video-avatar model from Chinese devs. → Avatar layer for faceless videos. 🛠️


- **2026-08-21** · @marc.kaz · free-for-dev: 132K⭐ list of real free tiers (Oracle Cloud 2 servers + 12GB RAM forever, Lambda 1M invocations/mo, Cloudflare unlimited sites, Cloud Run 2M requests/mo) — updated daily by 1,600+ contributors. → THE list behind his standing free-for.dev directive; mine it before paying for anything. ⚡ https://www.instagram.com/p/DcTnbkSuD8Y/
- **2026-08-21** · @marc.kaz · Onyx: #1 GitHub trending, open-source self-hostable AI platform (agentic RAG, deep research, custom agents, web search + code execution, voice & image gen). → Self-hosted AI stack candidate. 🛠️ https://www.instagram.com/p/DWtgbzLDgwm/
- **2026-08-21** · @marc.kaz · GitReverse.com: paste a GitHub link, get the prompt that built the repo. → Repo-learning for his builds. ⚡ https://www.instagram.com/p/DWoZspWDo6F/
- **2026-05-27** · @codersoni · Free platform with 175,000+ AI/ML models, one API key. → Model directory. ⚡ https://www.instagram.com/p/DXzEyN2sdke/
- **2026-05-26** · @codingknowledge · Nango: open-source integration infrastructure (700+ APIs, OAuth, retries) that SaaS companies spend $50K–$500K+ on. → Integration layer for Kit client work. 🛠️ https://www.instagram.com/p/DYyW_NFyVTd/
- **2026-07-08** · @globalaiforce · Open-source free LLM API directory (25,000+ stars). → Free-API directory. ⚡ https://www.instagram.com/p/DaeE2ulj4Z_/
- **2026-06-15** · @appinventiv4ai · Open-source alternatives replacing $855/month in overlapping AI subscriptions. → Audit his stack against this. ⚡ https://www.instagram.com/p/DXllxuZmevv/
- **2026-06-15** · @appinventiv4ai · Notion 30-day Business trial (advanced AI models + Notion Agents). → Trial the agent features. ⚡ https://www.instagram.com/p/DZX9OlJmbGy/
- **2026-06-02** · @hasantoxr · 10 free open-source repos replacing Zapier, Slack, Airtable, Calendly, DocuSign (+ duplicate 06-09: 8 zero-feature-loss SaaS replacements — deduped). → Stack audit. ⚡ https://www.instagram.com/p/DZAMn3TmKyu/
- **2026-07-01** · @aipagedaily · 10 open-source projects with 900,000+ stars combined replacing paid tools. → Stack audit. ⚡ https://www.instagram.com/p/DaM_-hTFCeA/
- **2026-05-23** · @leoreal.ai · Higgsfield.ai MCP inside Claude. → Video-gen MCP for his Claude. ⚡ https://www.instagram.com/p/DYo_7AYKkCx/
- **2026-06-15** · @carterperez.dev · Cybersecurity/homelab/self-hosting projects (GitHub links in comments). → Homelab ideas for his fleet. 🔬 https://www.instagram.com/p/DZkK4h1R2Us/
- **2026-06-06** · @codewith_random · Underrated GitHub repos that save developers months of learning. → Mine. ⚡ https://www.instagram.com/p/DZOqMYfkqJC/
- **2026-07-17** · @marc.kaz · Ghost Downloader 3: open-source download manager replacing IDM. → Utility. ⚡ https://www.instagram.com/p/Da3DJIGulrL/
- **2026-04-29** · @aipagedaily · Google's free Gemini tool for building personal AI assistants in under five minutes. → Try it. ⚡ https://www.instagram.com/p/DW_Wbe7jkAG/
- **2026-05-03** · @mindset.therapy · ChatLLM by Abacus AI: all-in-one multi-model platform (chatllm.abacus.ai) — sponsored post. → Evaluate vs his routers before paying. ⚡ https://chatllm.abacus.ai/
- **2026-07-09** · @sebastianhardy_ · 5 free GitHub repos replacing ElevenLabs, HeyGen, Nano Banana, Runway, Wispr Flow. → Free video/audio stack for the faceless lane. ⚡ https://www.instagram.com/p/DajCWEUjktT/
- **2026-08-22** · @wassimyounes_ · Ox Alpha: stealth frontier model, 1M-token context, free preview week on OpenRouter/OpenCode. → Try during the free window if still live. ⚡ https://www.instagram.com/p/DcT2dXrx-kI/
- **2026-08-01** · @power.ai · pxpipe: open-source proxy cutting Claude API costs by converting text to images (github.com/teamchong/pxpipe) (+ duplicate 07-06 @acknowledge.ai — deduped). → Cost lane; accuracy trade-off noted. ⚡ https://www.instagram.com/p/Da4wGUwlXYa/
- **2026-08-01 / 08-09** · @theartificialintelligence + @unfoldedai · Kimi K3: Moonshot AI's 2.8T-parameter open-weights model topping coding leaderboards (same model, two posts). → Watch; open-weights frontier. 🔬 https://www.instagram.com/p/Da6s-WpGqpe/
- **2026-07-07** · @bestapps.ai · Leaked Claude Fable 5 system prompt (3,800+ lines) — adapt its structure into cheaper models (+ duplicate 06-14 @futurewalt.ai — deduped). → Prompt architecture for his fleet. ⚡ https://www.instagram.com/p/DaYCj9tle85/

---
## 💡 Idea seeds (no direct action, don't lose)

- **2026-08-23** · @acknowledge.ai · Guy gave a Claude agent a domain + $90 and no goal; it named itself, built tools and a product. → The "unsupervised agent with a budget" experiment — revisit when he has sandbox infra. 🔬 https://www.instagram.com/p/DbzNZExj2WF/
- **2026-08-30** · @nugget · Strawberry self-driving browser with task companions (outreach, recruiting, invoices). *(+ duplicate 09-05 @winningnmindset — deduped.)* → The "companions per job" framing for his own agents. 🔬 https://www.instagram.com/p/Dcl2ephILJM/
- **2026-09-08** · @taharamzi__ · GPT-6 Astra's computer-use: every local business runs on tools with no API. → The whole pitch for agent services to local shops. 🔬 https://www.instagram.com/p/DdAzHkAFNW9/
- **2026-09-02** · @ranne.director · GTA6 + Claude + OpenArt MCP "best opportunity." → Vague; only useful as a content-angle reminder. Rotting-adjacent.
- **[X] 2026-09-14** · Noisy · "18, built an LLM and sold it to Anthropic for $3.2M." → The extreme-outcome reminder; filed, not chased.
- **[X] 2026-09-17** · NO1ennn · "SpaceXAI engineers spent 9 hours building a company from zero on camera." 3-page digital guide: how to pick what to build, ask publicly, build a bot to read replies. → Startup-build content format; steal the format for GSE/Kit content.
- **[X] 2026-09-17** · Grok Bot/SpaceXAI · Three employees building a company in 3 days with Grok Bot, Day 1. → The "build in public with agents" series format.
- **[X] 2026-09-21** · kocer · xAI employees, 50 Grok Bot prompts, 72-hour build challenge. → Get the 50 prompts — they're Grok Bot build prompts from xAI's own people, directly reusable for his Signal Origin reply-ops and GSE agent work.
- **[X] 2026-09-14** · 0xMarioNawfal · "AI agent building treasure" (summary thin — likely a tool roundup). → Low priority; skim if bored.

---

- **2026-08-04** · @sovereignty.ai · Privacy Guides: which private tool replaces every surveillance product in your life. → Privacy hygiene reference. 🔬 https://www.instagram.com/p/Da56AIbFl7r/
- **2026-06-04** · @stics.ai · Open-source computer that keeps working when the internet goes down. → Offline-resilience concept for his fleet. 🔬 https://www.instagram.com/p/DZH7r9qCGnp/
- **2026-06-02** · @techs · Startup installing compact data centers in homes to run AI workloads on spare electrical capacity. → Wild infra idea. 🔬 https://www.instagram.com/p/DZAr0SojcP0/
- **2026-06-16** · @collegeinhighschool · University of Houston accepts unlimited CLEP exam credits (free ModernStates.org prep). → Credential shortcut — local and real. ⚡ https://www.instagram.com/p/DZll5NuD3rP/
- **2026-08-18** · @futurewalt.ai · China built a simulation with 1 BILLION AI agents (14 hours, 4M agents "re-educated"). → Multi-agent scale research. 🔬 https://www.instagram.com/p/Db5fyW3gfje/
- **2026-08-19** · @nugget · Quantum-security deadlines (BTQ QCIM hardware) — governments setting timelines now. → Long-horizon security awareness. 🔬 https://www.instagram.com/p/DcPFpVEDzfz/
- **2026-08-01** · @entrepreneurbible · Marshall Rosenberg's Nonviolent Communication framework. → Client communication skill for Kit sales. 🔬 https://www.instagram.com/p/DbDmB6iCqx-/
- **2026-05-19 / 05-20** · @hassenzerasoft ×2 · Taste and direction — not AI tools — make award-winning websites; control and guidance, not generation, create valuable sites. → The craft doctrine for his $350 Kit builds. 🔬 https://www.instagram.com/p/DX4fE7zPL7a/
- **2026-06-08** · @themister.ai · Site teaching the most common methods hackers use (to help people understand and protect). → Defensive awareness. 🔬 https://www.instagram.com/p/DXT2wSBjRHv/

---
## 🗑️ Rotting — let these go

_Why a section exists: these clog the pile. They're expired, empty, or bait with no payload. Skim once, then forget._
- **Claude Campus Ambassador** (09-08 @artificialintelligencecountry, 09-10 @artificialintelligenceupdater): applications closed Sep 12; also not a student. Dead.
- **apinex.bond "free models"** (09-20 @simplifyinai): sketchy URL, no verifiable provider. Don't put keys in it.
- **Comment-bait with zero caption content** — the value was in DMs he never received: @alliecatbuildai (08-24), @power.ai "NIM" (09-01), @albert.olgaard "Gemini guide" (09-09), @prathamunpluggedd ×2 (09-07, 09-21), @fbajayden "GO" (08-31), @wassimyounes_ "DEEPSEEK obliterated" (09-15), @power.ai "Top 10 AI Tools" (09-09), @ariacodez "these websites give you access to AI" (09-08), @tism.maxxing "QWEN 27B uncensored" (09-07), @kem_glitch "FABLE 5.1" (09-02).
- **Zero-content saves**: @ashenonebot "someone hold me" (08-28), @menloparklab "AI danger is for real" (08-28), @nugget Amazon-tutorial mocking meme (08-24).
- **Local-model hacking that needs hardware he doesn't have** (128GB+ RAM class): @stridejosh.ai uncensored GLM-5.3 repos + hardware requirements (08-30), @wassimyounes_ dealignai "CRACK" weight-level uncensoring deep-dive (08-29). Revisit if he ever has the iron.
- **Local variant of a kept playbook**: @tism.maxxing DeepSeek V4 Flash Vision abliterated GGUF for local inference (09-02) — the API cost-routing version of this is Start Here #2; the local build only matters if he wants it on-device.
- **Empty captions** (unrecoverable context): @carterperez.dev ×3 (08-23 Db1mjaxxvDE, 08-28 Dax0xFSRfVg, 09-07 Dc_pJpLxIMq).
- **Stale news, no action**: @technology 24h roundup (08-23), @hoodratchetv Tesla robotaxi (06-2024 news), @evolving.ai weekly roundup (08-30), @wassimyounes_ Jalapeño chip benchmarks (08-25), NSA/FBI vs DeepSeek (09-10), CXMT/GLM news dump (09-01).
- **@chantzramos** pumpkin soft-launching (09-21): not his lane, not his content.
- **[X] "Preview Unavailable" ×2** (09-17, 12:50 PM session) — X rendered these cards with no content at all; unrecoverable. Gone.
- **[X] Article links with no preview** — 22 cards across 12 unique `x.com/i/article/` numbers, no text survived: 2090×4, 2088×3, 2093×3, 2098×2, 2096×2, 2101×2, 2100, 2073, 2079, 2097, 2099, 2092. (2077 excluded — rescued: codila's "Internet moment" card had real text and is now an Agent infra item.) If one of these numbers ever shows up with content elsewhere, promote it to a real item.
- **[X] Daniel Ch (09-17)** — "Absouloutly fucked this is free." No recoverable context about WHAT is free. Dead.
- **[X] gemchanger (09-14)** — "proposal grammar/bar computation" — too cryptic to act on. Dead unless clarified.


- **Claude Fable 5 launch news cycle** (06-11 @wassimyounes_ launch, 06-12 @aifastlaners monetization, 06-13 covered under GSE Higgsfield MCP, 06-14 prompt leak → kept in Dev tools, 07-06 @sciencexplains $2.2M engineer leak, 07-07 @getintoai free-window [expired], 07-20 @blueviper.ai "8 insane tasks"). Stale model news; the durable bits (system prompt, hybrid benchmark, MCP host pattern) are kept above.
- **@octillion13 ×3** (05-28, 06-22, 07-20) · "find anyone's password in 5 minutes/30 seconds." Sketchy, not his lane.
- **2026-05-18** · @simplifyinai · Chinese student turned $0.90 into $408,292 with a latency-exploiting trading bot — commenters say debunked. Dead.
- **2026-04-16** · @chatgptricks · OpenClaw AI agent automating pool sales via AI before/after images — commenters question if it's fake. Dead.
- **Stale news, no action**: @stics.ai 03-24 AI recap, @evolving.ai 04-29 news roundup, @futurewalt.ai 05-26 Google I/O 2026, @aipagedaily 06-15 5-day AI Agents course (expired), @sovereignty.ai 06-17 China AI-race news, @cryptosityclub 06-16 BITA ETF filing, @jayvolp 06-08 data-center debate, @mavgpt 05-29 ChatGPT shopping trick, @theceowatchlist 05-03 Lululemon newsletter, @bencrerar 04-19 hot honey bowl, @businessbulls.in 05-03 iPhone battery settings, @kekoamac ×2 05-03 flight pricing + energy demand, @matrice_vaughn 05-03 FCRA credit pitch, @sbhelpers 05-23 clothing brands, @bdon_trades 05-23 stock pitch, @itsangelicageorges 06-16 sponsored NotebookLM, @mobileappdaily_ 06-15 resource list, @innovation 06-15 16-year-old satellite story, @thestockguytwitch 06-03 trader hype, @learnmora_ai 06-10 hacking devices, @manas.talks.ai 06-18 uncensored models, @arya.ip_ 08-17 certifications, @knowgood 08-13 track promo, @aaronclosz 07-06 running documentaries, @lloydcanfieldfc 07-06 Braves fans, @angus.sewell 07-10 Emergent (sponsored), @getintoai 08-02 Seedance pre-sale (expired), @evolving.ai 04-27 ChatGPT Images 2.0 prompts, @explaining 04-29 productivity apps, @alex2learn 04-20 Claude/Obsidian guide, @maxjohnscn 06-02 dev-stack debate, @hustler_nmn 06-02 game-dev tool, @js.admin_ 05-27 build-in-public (commenters skeptical), @casey.aicreates 05-28 "AI predicts the future" (thin), @wassimyounes_ 05-28 business "leakage" tool (thin), @check 05-28 "Have fun" (thin), @vasini_devi 06-02 Telegram CTA (thin), @codeandcomplexity 07-30 (thin), @check 07-19 AI creators (thin), @xsoulfit 07-12 (thin), @wutronicai 07-07 (thin), @bylanger 07-12 brain playlist, @subconscious.ink 07-06 tattoo, @special_tatts 07-04 tattoos, @beastmode_373 07-04 gym, @micahthurman1 07-06 gym, @deanothebarber_ 06-28, @lifebythor 06-29, @andrewcsaline 06-29, @angelicasgrass 06-29 UFOs, @conspiracyveil 08-13 presidents genealogy, @conspiracy.deception 07-27 electroculture, @frankpersonalbrand 05-14 lifestyle, @rachalfam 04-13 UV-pen Bible, @nugget 07-23 Latvia demographics, @vinmeister7 08-11 license plates, @albert.olgaard 08-10 Gemini screen cleaner, @getintoai 05-29 iPhone camera settings, @gptprompts.ai 05-20 3000+ prompts (debunked as grift in comments), @careerwithnadeem 05-20 AI tools listicle, @appinventiv4ai 05-20 2026 model leaderboard (stale).

---
## 🔗 Still unresolved → RESOLVED 2026-09-24 via logged-in browser

The browser gap-fill is complete. Final tally across 249 source link-lines (2026-03-24 → 2026-08-23):
- **246 recovered** — appended to `ig_browser_retry.jsonl` (250 result lines: 249 + 1 retry of DaKkZqvACzU)
- **3 unrecoverable:**
  - https://www.instagram.com/p/DWXVWqfkvpS/ — generic page-load error (batch 1)
  - https://www.instagram.com/p/DaKkZqvACzU/ — generic page-load error, failed twice (batch 4 + retry)
  - https://www.instagram.com/p/DcKra-skiTa/ — deleted (redirects to /deeptech/, "page isn't available")
- One source-level duplicate: DcJs0wCpic- saved twice (2026-08-18 and 2026-08-21)
- No rate limit, "try again later", challenge, or login wall was ever encountered.

All 246 recovered saves are now merged into the sections above (actionable items) or Rotting (expired/empty/bait), with dedupes recorded below.

## Dedupes merged

Same item saved multiple times — counted once above.
**Within IG:** Claude Unlimited ×2, Strix ×3, Strawberry browser ×2, 6-developers creativity ×2 (@techs 09-01 ↔ @activeprogrammer 08-30 — same reel), @fbajayden ×2, @prathamunpluggedd ×2, Claude Campus Ambassadors ×2. CORRECTION (audit 2026-09-24): the six @simplifyinai "Comment 'AI'…" posts were previously treated as one template — they are NOT duplicates; they share a wrapper but carry distinct payloads, now each accounted for: Strix (Agent infra), dsh free DeepSeek harness (Agent infra), self-evolving agents (Agent infra), OpenBot free Grok-bot (Agent infra), apinex.bond "free models" (Rotting — sketchy URL), Jev-hyperliquid trading (Money).
**Within X:** Rahul DeepSeek V4.1 Flash ×2, Daniro Bayesian Quant ×2, Roan GPT-6 Astra trading agents ×2, codila Jev+GrokBot ×2, Roan Jev+TradingView ×2, Inspector article-2093 ×2, x.com/i/article/ numbers deduped to 13 unique (2090×4, 2088×3, 2093×3, 2098×2, 2096×2, 2101×2, 2100, 2073, 2079, 2077, 2097, 2099, 2092).
**Cross-platform (IG ↔ X):** Hypit (IG @gittrend.io 09-16 ↔ X @hypitai 09-15 — same tool; X adds the GitHub repo `hypit-ai/hypit`); Jev theme cluster (IG 3 items: Ultrafast installed ✅, explainer, TypeSafe stealth piece ↔ X ~11 Jev cards: open-source alternative, API playbook, GrokBot+Jev pattern, trading setups, $0.12 competitor research, launch hype — theme-deduped, genuinely new X angles kept as separate items); Claude Code configs (IG "Everything Claude Code" ↔ X hackathon winner's 68-subagent setup — different sources, both kept, noted as related).

**Recovered-cohort within-IG:** @chasebfisher ×2 TikTok Shop pitch; @irv.official ×3 Claude funding; @octillion13 ×3 password-finding; @lukebuildsai ×2 Jarvis; @bestapps.ai 07-07 ↔ @futurewalt.ai 06-14 Fable 5 system prompt; @simplifyinai free-claude-code ↔ fcc-server; @codingknowledge 05-17 ↔ 06-21 side-income repos; @hasantoxr 06-02 ↔ 06-09 SaaS replacements; @evolving.ai 07-13 ↔ @unfoldedai 08-05 Fable/Sonnet hybrid benchmark; @power.ai 08-01 ↔ @acknowledge.ai 07-06 pxpipe; @ariacodez 08-21 ↔ 06-10 OSINT tools; @josh.doesyta 05-13 ↔ 05-26 AI-influencer clone; DcJs0wCpic- saved twice (source-level duplicate).
**Recovered → original cohort:** PixelRAG (08-03 @askgpts ↔ 09-04 @marcinteodoru); TimesFM (05-28 @appinventiv4ai ↔ 09-01 @voxaris_ai timesfm-3); Strawberry (08-17 @successfularcs ↔ the two deduped Strawberry saves — third duplicate).

---

## 🤖 Grok Bot research (xAI Galaxy Page teardown)

Location: branch `notes/grok-bot-galaxy` on `Beexly/autonomous-revenue-engine` (commit `41c55f4`, 250 files). Garrett's directive 2026-09-24: "that should be plenty on the grok bot stuff" — **this lane is closed for new research; use the existing corpus only.**

Corpus contents:
- **77 production agent prompts** extracted from marketplace page payloads
- **10 workshop transcripts** (61,506 words total)
- **91 news posts**, **10 guides**, launch timeline, packaging matrix, metrics ledger
- **137 install deep links**
- Framed as **competitive intel, NOT a product** (per its REPO-NOTES.md, nothing publishes without human approval).

How it connects to the system: the Grok Bot runtime-architecture item sits at Start Here #8 (updated to point at this branch). Cross-pollinate: the Jev cluster (IG + X theme-deduped), the self-evolving-agent pattern (agent infra), and the OpenBot "free Grok-bot" save (agent infra) all speak to the same runtime/agent-economics question — mine the branch for real prompts before building anything that touches his agent fleet.

---
