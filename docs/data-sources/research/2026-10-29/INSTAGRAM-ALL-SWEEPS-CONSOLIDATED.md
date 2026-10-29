# INSTAGRAM — ALL SWEEPS CONSOLIDATED
### Every Instagram sweep/scrape session Garrett Baxley has run with Motif, merged and deduped into one document
**Built:** 2026-10-29 · **Method:** consolidation of the existing record only — no new research. Verdicts and numbers are preserved exactly as the source files state them; where a later session corrected an earlier figure, the correction is kept and marked "(corrected)". Items appearing in multiple sessions are merged into one entry citing each session.

---

## SCORECARD — every session

| Date | Session | Type | Volume on record | State |
|---|---|---|---|---|
| Sep 10, 2026 | Self-DM thread review | Self-share corpus | 103 share messages → 98 unique media IDs analyzed, 7 unreadable | Write-up **LOST** (Oct 16 provenance note); themes + counts survive in the daily log |
| Oct 1, 2026 | Creator/competitor sweep (@thelocktalk, @simplifyinai + ~40 accounts) | Creator corpus | ~40 accounts in the matrix; only 2 fresh CLI reads before HTTP 429 | Deliverables in Sports repo `docs/research/2026-10-01/ig-sweep/` (commit aa68e31); ~30 accounts still rest on prior-corpus rows |
| Oct 10, 2026 | Funding-content micro-check | Feed/saved check | 50 saved + 30 liked + 2 feed pages — zero funding content | Complete; surfaces folded into Oct 13 mining |
| Oct 13–14, 2026 | Self-archive mining (v1 + v2 dossiers) + shared-post notation + second-pass Streams A–E | Self-archive corpus | 774 self-DM entries; 267 saves; likes mined to the provider ceiling (10,778 unique returned of 14,998 claimed, corrected); 164 creator posts; 37 notation items (23 + 14, all repos API-verified); 654 DM shares attempted → **356 dossiered, 298 blocked by HTTP 429**; 90-repo universe → 31 deep-evaluated | The corpus bedrock. 298 shares still unclassified — see gap audit |
| Oct 26, 2026 | One-off shared-reel dissection (@wassimyounes_) | Shared item | 3 items (2 VERIFIED, 1 UNVERIFIED) | Complete |
| Oct 27, 2026 | Self-DM shares + Suggested feed sweep, rounds 1–2 + gap pass | DM shares + feed sweep | 50 DM shares (39 new dossiers, Items 11–49); two 50-item feed inventories (40 posts + 10 ads each); 17 Suggested tool posts dissected round 1; 9 deferred items later read via browser; **275 distinct named items across the day's two reports** | Complete; round-2 feed mostly inventory-only (36 posts + 10 ads) |
| Oct 27–29, 2026 | Rolling shared-items register S1–S49 | Shared items on arrival | 49 tracked entries (S37 is a re-share of S32) | Register kept current in `SHARED-ITEMS-REGISTER.md`; S7 unread, S8/S9 not dissected — see gap audit |
| Oct 29, 2026 | For You feed sweeps (AM + midday) + keyword explore | Feed sweep + explore | AM: 35 organic inventoried (+9 ads), 20 dissected, 11 taken to repo-depth. Midday: 50 inventoried, 30 new dissected, zero 429s. Explore: 24 terms → 24 candidates (14 tech + 10 sports), 38 pick-sellers skipped | Complete; the standing twice-daily sweep continues from here |

## TOP FINDS ACROSS ALL SESSIONS (12)

1. **Headroom** (headroomlabs-ai/headroom, 78,233★, Apache-2.0) — local reversible context compression for coding agents. **TEST, ranked #1** of the Oct 29 deep dive. (Oct 29)
2. **Opik** (comet-ml/opik, 23,022★, Apache-2.0) — agent tracing whose built-in agent root-causes failed spans and turns them into regression tests. **TEST**. (Oct 29)
3. **Claude SEO** (AgriciDaniel/claude-seo, 23,860★, MIT) — full technical/AI-citation site audits inside Claude Code in ~15 min; Kit sales artifact + GSE visibility tool. **TEST**. (Oct 29)
4. **codebase-memory-mcp** (DeusData, 47,781★, MIT) — persistent local code knowledge graph; the honest figure from its own arXiv preprint is 10× fewer tokens, not the 99% its post claimed. **FLAG** for deep dive. (Oct 29 explore)
5. **WeKnora** (Tencent/WeKnora, 35,674★, MIT) — cited hybrid-search RAG + ReAct agent + auto-wiki, built-in MCP server. **ADOPT-CANDIDATE** — strongest platform find of the Oct 27 cloud-agent hunt. (S12)
6. **Higgsfield CLI** (higgsfield-ai/cli, official, MIT) — includes `soul-id` training from the shell: a concrete path to an addressable CLI-trained Nova character. **ADOPT-CANDIDATE**, top find of its batch. (S36)
7. **n8n** (207,303★) — **ADOPT** as the ARE backbone; Paperclip (101,682★) settled as the bounded agent-company pilot beside it. (Oct 13–14, Streams D–E)
8. **Understand Anything** (Egonex-AI, 88,587★, MIT) — codebase→knowledge-graph plugin with Hermes + Antigravity installers. **VERIFIED + CATALOGED**. (S2)
9. **Kronos** (shiyu-coder/Kronos, 43,957★, MIT; arXiv 2508.02739) — financial candlestick foundation model. **VERIFIED + CATALOGED + FULLY READ**; desk-lane ingestion candidate only, never a pick source. (S3)
10. **Watcher** (thalesgroup-cert, AGPL-3.0) + **Zero Breach Toolkit** (interplains, Apache-2.0) — CTI/leak monitoring and offline spyware-indicator scanning for the Family Shield lane. **TEST**. (Oct 29 deep dive)
11. **TypeSafe Jev** — hosted decision model, $0.042 per million input tokens, typed answers with calibrated probabilities. **VERIFIED**; the exact "small fast decision in front of big models" shape the fleet keeps re-deriving. (Oct 13 notation)
12. **@thelocktalk's method corpus** — 1Q structures (The Script / The Stop / The 1Q Math) and the nflverse method posts (Data Map / dumbest-baseline-first / Leak Check), mapping one-to-one onto Garrett's engine doctrine. **KERNEL EXTRACTED**. (Oct 1 + Oct 29 explore)

---
## SESSION — Sep 10, 2026: Instagram self-DM thread review (the first pass)

Coverage: Garrett's Instagram DM thread with himself, 30 days ending 2026-09-10 — **103 share messages** (102 Instagram inline shares + 1 Facebook share; zero plain-text self-messages) → **98 unique Instagram media IDs analyzed**, **7 items with no readable description**. Source: 2026-09-10 daily log; the write-up itself (`self-thread-writeup-2026-09-10.md`) is **LOST** — a provenance note was filed Oct 16, 2026 (`~/workspace/goals/self-notes-dm-archive-and-action-board/files/provenance-note-lost-self-thread-writeup-2026-10-16.md`). What survives is the log's thematic record:

- The self-thread functions as Garrett's visual bookmark library. Strongest recurring themes: AI-agent infrastructure and computer use, open/local or uncensored models, AI monetization and content-production playbooks, cybersecurity/OSINT, and a smaller sports-tech cluster.
- Two items identified as directly useful for Galaxy Sports Edge: a "QB Vulture" prompt (analyzing quarterbacks who take goal-line TDs from running backs) and a Higgsfield/GPT-6 Astra demonstration reconstructing a soccer match with player/pass/possession tracking for automated game-film-style content.
- One time-sensitive item: Anthropic's 2026–27 Claude Campus Ambassador program ($3,600 stipend, stated application deadline 2026-09-12) — surfaced to Garrett; no application action was requested or taken.

## SESSION — Oct 1, 2026: Instagram creator/competitor sweep (sports-creator corpus)

Coverage: Garrett authorized aggressive-but-legal collection from the Instagram sports-creator accounts he had been sharing (hard line: nothing illegal; no follows/likes/comments/DMs performed). The broad sweep ran across **~40 accounts** and landed four deliverables in the Sports repo under `docs/research/2026-10-01/ig-sweep/` on branch `motif/ig-sweep-2026-10-01` (remote head verified at commit `aa68e31`): master account/post matrix, ranked top-10 kernels, ranked follow list, verified repos/APIs/datasets with license notes. Local raw pulls survive in `~/workspace/ig-sweep/` (profiles + posts for the two accounts read fresh before the rate limit: @thelocktalk and @simplifyinai, Oct 1 15:37 CT).

- **Rate limit:** `instagram-cli` hit HTTP 429 after fresh reads of only @thelocktalk and @simplifyinai; all further CLI calls stopped. ~30 accounts' matrix rows rest on previously saved corpus material and are confidence-labeled; ~30 accounts still needed a later cooldown pass.
- Highest-value kernels extracted: @thelocktalk's 1Q/live-betting structures; @fieldcoachai's break-angle and separation metric shape; TradingAgents' debate mechanic (Apache-2.0); paperclip+hindsight (MIT); InstantHMR (Apache-2.0); synthetic Blender training-data generation; a $0 knowledge stack. AGPL or unclear-license projects were kept research-only, not integrated.
- @thelocktalk's shared carousel (Sep 29 post, https://instagram.com/p/Dd4TpsFicXE/) contributed three prompts transcribed to the action board: The Script (scripted-opening-drive execution), The Stop (defenses that end drives early — reason in possessions, not per-game averages), The 1Q Math (1Q holds ~20% of scoring but ~37% of the home edge). Seven more prompts sat behind a "comment NFL" gate — never triggered (no-messaging rule); needs Garrett's own tap.
- Follow status: ranked list held 11 recommended follows; `instagram-cli` cannot follow, and the completed browser read was signed in as @gbeexly (not the GSE account), so **no follows were attempted**.

## MICRO-CHECK — Oct 10, 2026: Instagram funding-content check (part of a funding sweep)

Not a dossier session — recorded so the count is not lost: Instagram sweep completed without rate limits — **50 saved posts** (captions inspected for the 20 most recent), **30 liked posts**, and **two following-feed pages** contained **zero funding content** (Garrett follows no funding accounts). This check's surfaces were later folded into the Oct 13 self-archive mining below.

---
## SESSION — Oct 13–14, 2026: self-archive mining + shared-post notation dossiers

**Coverage:** Notation batch 1 (`ig-links-notation-2026-10-13.md`): 4 posts, 23 items notated. Notation batch 2 (`ig-links-notation-2-2026-10-13.md`): 2 posts (Batch A carousel + Batch B reel), 14/14 items notated, 14/14 repos verified against the GitHub API. Self-archive dossier (`self-archive-dossier-2026-10-13.md`, 9,309 lines / ~784 KB as listed on disk; described in the brief as ~803 KB / ~9,300 lines): 774 self-DM messages read in full; 267 saved posts returned of 310 claimed (43 never returned); 16 collections; 500 liked posts in v1, superseded by Stream C below — 10,778 unique liked posts returned of 14,998 claimed, 4,220 never returned (corrected); creator sweep 164 posts (39 + 23 + 64 + 38); X: 0 posts recovered. Second pass (`~/workspace/second-pass/`, 2026-10-14): Stream A 654 DM-share shortcodes attempted, 356 dossiered, 298 blocked; Stream B 4 side-chat mega-messages, 404,228 chars, completed, 18 NEW distinct URLs; Stream C 10,278 new liked posts (10,778 total); Stream D 31 of 80 external repos deep-evaluated, 15 full dossiers, 49 residual notated-not-evaluated, 10 Beexly-owned excluded, 90 total reconciled; Stream E: Laya eval designed + armed but UNRUN, Foreman demo run, free-tier watcher spec-only, Paperclip vs n8n settled. Flag legend in batch 1: VERIFIED = confirmed against the source itself · CLAIM-UNVERIFIED = asserted in the post, no independent confirmation · GATE-LOCKED = full content behind a comment/DM gate · ACTED-ON = Garrett's fleet already runs this or its equivalent · STALE = fact has moved since the post. No gate was triggered and no one was messaged in any pass (standing no-messaging rule).

### 1. Notation batch 1 — 4 posts, 23 items (2026-10-13)

#### Post 1 — @askgpts, "AI spider system" (2026-10-03; carousel, 1,090 likes / 708 comments; gate: comment "System" — GATE-LOCKED, ONE-TAP-FOR-GARRETT)

Post-level numbers (5,152 items processed, 81 ms per item, human involvement 100% → 10%) are attributed to no one and confirmed by no one: CLAIM-UNVERIFIED. @askgpts is a news/repost account (148K followers); it did not build the system.

- **Dots (OpenAI Dots)** — always-on personal agents, launched at DevDay 2026-09-29, powered by GPT-6 Astra; own cloud computer/browser, 4,000+ apps via plugins, via ChatGPT/Slack/Teams. One personal dot per user at launch (specialist "teams" are enterprise pilots; cross-dot routing "had not been announced"); Pro / Business Premium only, desktop setup. Lane: Personal efficiency / ARE oversight. Status: VERIFIED (product) · CLAIM-UNVERIFIED (its role in the video's four-layer stack).
- **Jev (TypeSafe Jev)** — TypeSafe AI "System One" decision model, early access 2026-09-15; state + typed questions (`choice` up to 255 options / `score` / `noul`) → typed answers with calibrated probabilities in one forward pass; `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest` (jev-1.13.0), 64K tokens. Cost VERIFIED: $0.042 per million input tokens; output tokens free; ~100K tokens/sec, 40 req/sec. "81 ms per item": CLAIM-UNVERIFIED; reviewers note overconfidence where probabilities were off, calibration not independently demonstrated. Lane: Intel bot / GSE / personal efficiency. Status: VERIFIED (product, API, price) · CLAIM-UNVERIFIED (81 ms figure) · ACTED-ON in pattern.
- **Claude Sonnet 5.5** — Anthropic mid-tier agent/coding model, launched 2026-09-28; routine-work drafting layer ("12 task drafts" on screen). Cost VERIFIED: $2 input / $10 output per million tokens; cache reads $0.10–0.20/M; Batch $1/$5; 1M-token context. Lane: ARE + personal efficiency, GSE support. Status: VERIFIED (existence, price) · ACTED-ON.
- **Claude Opus 5.5** — Anthropic frontier tier, launched 2026-09-22; hard-case escalation layer. Cost VERIFIED: $4 input / $20 output per million tokens; cache reads $0.20/M; Batch $2/$10; Fast mode $8/$40 (up to 2.5× faster, double price, API-only research preview); above it Claude Fable 5.1 at $10/$50. "~40% cheaper than Opus 5" is a vendor estimate = CLAIM. Lane: all lanes as escalation tier. Status: VERIFIED · ACTED-ON.

#### Post 2 — @borja.obeso, "God-Mode 2027 AI SEO Setup" (2026-09-28; 8-slide carousel, 867 likes / 819 comments; gate: comment "SEO" — GATE-LOCKED, ONE-TAP-FOR-GARRETT)

Borja Obeso (10K followers). Production stack named on slide 1: Claude Opus 5.5 (§1.4 above), Grok Bot, Jev, Muse, ChatGPT. Claim of 94.4K impressions in three months graded at §2.7.

- **2.1 Technique: buy-intent comparison pages ("X alternatives")** — build a genuine comparison page for the query a buyer types while choosing (his example "Klaviyo alternatives"), link down to migration guide and up to product page. Lane: ARE (Kit) and GSE. Status: VERIFIED (technique) · Not yet acted on by Garrett in this exact form.
- **2.2 Technique: topic-cluster internal linking** — clusters grouped by reader task (choose → migrate → use); comparison hub, migration/pricing/FAQ/product spokes, no orphan pages. Lane: ARE/GSE web. Status: VERIFIED (technique).
- **2.3 Technique: information gain** — read top-10 results alongside real customer questions, find the question none answer, publish the finding with its evidence. Lane: GSE / Intel bot (matches Garrett's Hermes Pattern). Status: VERIFIED · ACTED-ON in spirit; the top-10-diff step is the new, adoptable piece.
- **2.4 Technique: "Be the answer" product pages (who / how / cost)** — page answers who it helps, how it works, what it costs, immediately and consistently. Lane: ARE (Kit $350 offer, Intel bot packages). Status: VERIFIED (technique).
- **2.5 Technique: roundup pitching for quality backlinks** — pitch inclusion in "best X tools" roundups with the §2.3 evidence attached. Noted as a business-development action Garrett fires himself, not executed under the no-messaging research rule. Lane: ARE / GSE. Status: VERIFIED (technique).
- **2.6 Technique: publish where AI already cites (citation-source analysis)** — ask ChatGPT/Claude/Grok/Perplexity the 10–20 buyer questions, log cited sources, rank by citation frequency, place research there, re-run monthly. Lane: all lanes. Status: VERIFIED (technique).
- **2.7 Google Search Console — Generative AI features report** — launched 2026-06-03, worldwide rollout 2026-08-31; Performance → Generative AI; free, verified property required. VERIFIED limitation: impressions-only — pages/countries/devices/dates, no clicks, no CTR, no query data; AI impressions were already in standard Performance totals (double-count trap). His 94.4K impressions in 3 months: CLAIM-UNVERIFIED (private property data; measures citation visibility, not revenue/traffic). Status: VERIFIED (tool, access, limits) · CLAIM-UNVERIFIED (94.4K figure).
- **2.8 Grok Bot** — SpaceXAI (formerly xAI) always-on agent, beta August 2026, own cloud computer/browser; SuperGrok or paid Cursor access; ~418,000 weekly active users (Bloomberg, via Android Headlines). On 2026-10-07 Musk announced per-task routing to "the best back end model," naming Claude Opus 5.5 first, then Midjourney and Suno; Suno leg UNVERIFIED as an integration (no public API). Lane: GSE/Signal Origin, ARE reference. Status: VERIFIED (product, routing announcement) · ACTED-ON (adjacent Grok surfaces).
- **2.9 Muse** — Anthropic agentic coding tool (terminal/IDE); model tiers Haiku 5.5 ($0.10/$0.50), Sonnet 5.5 ($2/$10), Opus 5.5 ($4/$20); warning: Haiku 100K-token price cliff (above 100K prompt tokens the whole request reprices 5×). Lane: all lanes. Status: VERIFIED · ACTED-ON.
- **2.10 ChatGPT** — OpenAI flagship; host surface for Dots. Dots require Pro or Business Premium (first dot included); Enterprise/Edu/Healthcare admin-enabled beta; not available in EEA/Switzerland/UK at launch for Pro. Lane: personal efficiency + ARE research. Status: VERIFIED · ACTED-ON (Dots specifically untested by Garrett).

#### Post 3 — @lasthumannode, "Can Paperclip pay my rent in 30 days" — Week 1 (2026-10-09; reel, 1,286 likes / 31 comments; no comment gate, bio DM gates noted, not triggered)

Last Human Node (15.3K followers). Day 1 CEO agent one-shotted an entire swarm, rage-quit; Day 2 agents burned his $20 Claude plan in ~10 minutes, so he built a token warden; Day 3 two agent-built websites, "neither any good"; Day 4 API keys/logins/permissions, Sales agent wired to Exa, Apify, Outlook, domain bought; Day 5 every manager got one prompt and 24 hours unaided; Day 6 agents sent real sales emails. Day 7 scoreboard: revenue −$50 against a $1,500 goal. All figures self-reported (CLAIM), negative self-reports with named failure modes.

- **3.1 Paperclip** — open-source agent-company orchestration (CEO/managers/workers, goals, task assignment/reporting). Repo paperclipai/paperclip — 101,465 stars, MIT license, created 2026-03-02, last pushed 2026-10-13; site paperclip.ing. Framework $0; real cost is unbounded model spend without §3.2. Lane: ARE reference implementation / possible chassis. Status: VERIFIED (repo, license, activity) · CLAIM (his revenue/experience figures, self-reported) · Not acted on by Garrett.
- **3.2 The token warden** — budget-guard technique (Day-2 fix): per-agent/per-company budgets, spend telemetry, soft alert / hard pause / daily cap, queue freeze + human digest on hard pause. Lane: all lanes. Status: VERIFIED (technique/pattern) · ACTED-ON in doctrine (his cost-killer gates), not as this named component.
- **3.3 Exa** — AI-agent search API (neural search, contents, answers, deep research, MCP server); Sales agent's prospect search. Cost VERIFIED: free tier ≈ $10 credits/month (~1,000 requests); Search instant $4 / fast-auto $7 per 1,000 requests; Deep Search $12, Deep Reasoning $15 per 1,000; Contents $1 per 1,000 pages; Answer $5 per 1,000; results past 10 +$1/1,000 each. Lane: ARE / GSE research / Intel-bot enrichment (complement to Firecrawl). Status: VERIFIED.
- **3.4 Apify** — cloud scraper marketplace ("Actors"), 70K+ listed tools, scheduling/proxies/MCP. Cost VERIFIED: Free $0 ($5 credit/mo, $0.20/compute unit); Starter $29/mo ($29 credit, $0.20/CU); Scale $199/mo ($0.16/CU); Business $999/mo ($0.13/CU); 1 CU = 1 GB RAM × 1 hour; residential proxies ~$8/GB; monthly Actor rentals retired 2026-10-01, pay-per-use. (Some third-party listings show Starter at $19 — plan-table sources converge on $29.) Lane: ARE lead lists, Intel bot public-profile collection. Status: VERIFIED.
- **3.5 Outlook agent sending** — Sales agent connected to his Outlook mailbox (Microsoft 365 / Graph API / OAuth) so the company could send real email; Day 6 emails sent, Day 7 revenue still negative. Lane: ARE, under Garrett's approval doctrine (his kit-dm-watcher drafts and never sends). Status: VERIFIED (mechanism) · ACTED-ON in draft-only form by Garrett.
- **3.6 The 30-day public challenge (method)** — one public question, fixed target ($1,500), scheduled honest scoreboards including zeros (−$50 on Day 7), no moved goalposts. Lane: GSE/ARE public surfaces (nothing posts without his approval). Status: VERIFIED (format) · Not yet run by Garrett as a public series.

#### Post 4 — @kush.hustles, "3 Most Gatekept Websites for trading" (2026-09-25; reel, 3,156 likes / 863 comments; gate: comment "sauce" — GATE-LOCKED, ONE-TAP-FOR-GARRETT, and pointless: all three URLs are spoken/shown in the reel)

Kush (1,102 followers, Florida). VERIFIED from the capture: his own bio reads "Building with @invo" — affiliated with item 4.2. None of the three is gatekept in any meaningful sense.

- **4.1 Messari (messari.io)** — crypto research/market intelligence: asset profiles, metrics screener, analyst reports, watchlists/alerts, portfolio, API. Blockworks acquired Messari for $10M (reported June 2026, per Ainvest). Cost VERIFIED: Free $0; Pro $29.99/month, or $300/year ($24.99/mo); Enterprise custom, reported ~$5–6K/year up to $34K. (One stale review lists Pro at $299/mo — outdated.) "See what will blow up before anyone else": CLAIM-UNVERIFIED marketing. Lane: weak-to-none; personal crypto bookmark only. Status: VERIFIED (platform, pricing, acquisition) · CLAIM-UNVERIFIED ("before anyone else" framing) · Not acted on.
- **4.2 Invo (app.invoapp.com)** — social copy-trading app; traders post live leveraged crypto-perp positions, followers tap "Mimic Position." Company claims 250K+ users (company claim). No public subscription price; terms disclose "We may add a spread to each digital asset transaction." Automation path: plungarini/invo-sentinel (MIT, GitHub), auto-mirrors followed Invo traders onto Hyperliquid, built on a reverse-engineered Invo API (unofficial; account/ToS risk). Poster affiliated ("Building with @invo"). Lane: none for GSE/ARE/Intel bot; personal efficiency negative fit. Status: VERIFIED (product, mechanics, spread disclosure, poster affiliation) · CLAIM-UNVERIFIED (any profitability implication).
- **4.3 Finviz (finviz.com)** — stock screener/visualization since 2007; 10,000+ stocks, 70+ criteria, heat map; free Registered account: portfolios (50 tickers each), up to 50 saved presets. Cost VERIFIED: Free/Registered $0 (delayed data, ads); Elite $39.50/month or $299.50/year ($24.96/mo) (real-time, premarket 4:00 AM ET / after-hours to 8:00 PM ET, intraday charts, unlimited alerts, Excel/CSV export, correlations, ad-free). STALE: several reviews still list backtesting as Elite — Finviz ended its backtesting tool on 2026-03-26 with no replacement planned. Lane: personal efficiency (Trading Desk), free tier only. Status: VERIFIED (platform, pricing, feature set) · STALE (backtesting references in third-party reviews).

Batch 1 "what changed vs. the chat triage" (preserved): (1) Post 1 was under-called — Jev and Dots are both products with prices/access rules. (2) Post 2's claim needed the instrument — the GSC report's impressions-only design grades the 94.4K. (3) Paperclip is bigger than the reel suggests (101,465 stars, MIT, pushed the day of the dossier); the token warden is load-bearing. (4) Post 4 was "weakest" for the wrong stated reason — the story is the Invo affiliation + spread + reverse-engineered API; Finviz is exactly as described. (5) Nothing was killed — four reasoned no-fits (Messari, Invo for business lanes; Dots for GSE; Finviz except personal use), access paths preserved.

### 2. Notation batch 2 — 14 GitHub projects, resolved & verified from source (2026-10-13)

Method: GitHub API metadata + README reads + public web evidence only; no messages/comments/DMs sent. Star/fork/license/date figures are from GitHub API responses in this pass, not the posts ("an earlier post understated Kronos by ~13K stars; posts lie, APIs don't").

- **Batch A** — @aitechorigin carousel, 2026-09-30, "10 OPEN-SOURCE PROJECTS YOU'LL WISH YOU FOUND EARLIER" (9 unique projects; the 10th slide duplicates LiteRT-LM). Links printed — no gate.
- **Batch B** — @sahni.ai (Divjot Sahni) reel, 2026-10-01, "5 github repos that feel illegal to know about." All 5 links gated behind comment "REPO." All 5 resolved from public evidence (see gate-resolution table at the end of this subsection).

#### Batch A

- **A1 free-claude-code — Alishahryar1/free-claude-code — 60,128★** — local proxy/router spending 61 providers' free tiers through your own keys (default NVIDIA NIM); 11 harnesses incl. Hermes. License: AGPL-3.0-only per README (API: NOASSERTION); last push 2026-10-13. Verdict (source's one line): "Real and huge — but 'free' = 61 providers' free tiers spent through your own keys via a local proxy; subscription-OAuth routes are the gray zone." Flags: "ToS-friendly" is the project's own claim; subscription-OAuth routes carry ban risk to his accounts; Telegram/Discord access is real remote control (bot token = credential); documented install is `curl | sh`; some bundled providers restricted to personal interactive use (Kimi Code, QwenCloud Coding Plan).
- **A2 ml-intern — huggingface/ml-intern — 10,806★, Apache-2.0, last push 2026-09-29** — HF experimental autonomous ML-research agent (LiteLLM loop up to 300 iterations, HF Jobs). Verdict: **ARCHIVED** by Hugging Face — "the post showcased a dead project; its pattern lives on in HF Jobs + agents.md." Current README is a 4-line redirect to HuggingChat (`huggingface.co/chat/?mode=ml-intern`); "No support, bug fixes, or security updates will be provided." Post was wrong by omission (archived ~8 months before the 2026-09-30 post).
- **A3 FinceptTerminal — Fincept-Corporation/FinceptTerminal — 32,451★** — Bloomberg-style desktop terminal, C++20/Qt6 + Python 3.11, 100+ connectors, 37 AI agents, 16 broker integrations (README never names the 16 brokers). License AGPL-3.0-or-later per README (API: NOASSERTION); last push 2026-10-13. Verdict: "A genuine Bloomberg-style terminal (100+ connectors, 37 AI agents) — but live broker trading + algo is gated to the closed Enterprise edition ($15/$30/$45)" (Exclusive $15 / Exclusive+ $30 / Exclusive Pro $45 per user/month; AI credits 400/2,000/5,000; open terminal account Free, or Pro $10/mo). Also: Fincept Data API (500+ REST endpoints, 423,000+ instruments); Quantcept pricing stated inconsistently in the same README (banner Alpha $3 / Apex $8 per 30 days vs. later Alpha $14 / Apex $24 — quote neither until checked live). Lane: personal efficiency / Trading Desk.
- **A4 ds2api — CJackHwang/ds2api — 4,738★, AGPL-3.0, last push 2026-05-10** — Go middleware converting DeepSeek's consumer web chat into OpenAI/Claude/Gemini/Ollama-compatible APIs; solves DeepSeek's proof-of-work anti-bot challenge in pure Go (DeepSeekHashV1); pooled web accounts via email/mobile login. Verdict: **ARCHIVED** (2026) — "DeepSeek-web-session→API converter that automated logins and solved DeepSeek's PoW anti-bot challenge; explicit ToS/ban-risk territory." README carries no retirement notice; disclaimer says AGPL "does not grant any commercial authorization"; `DS2API_DEV_PACKET_CAPTURE=true` stores full request/response bodies. No fit as software; intelligence value only.
- **A5 Pixelle-Video — AIDC-AI/Pixelle-Video — 18,142★, Apache-2.0, last push 2026-10-08** — topic → finished automated AI short video (LLM script, ComfyUI/hosted media, Edge-TTS/IndexTTS, FFmpeg/moviepy; Streamlit WebUI at localhost:8501). By Alibaba International's AIDC-AI (family: Pixelle-MCP, ComfyUI-Copilot 5.3K★, Marco-o1, Ovis). Verdict: "Topic→finished AI short video, fully automated — a doctrine conflict for GSE footage, a maybe for non-sports ARE content." "Custom Media" mode (own photos/video) is the one feature that could touch real-footage workflows as an editing/assembly aid.
- **A6 cua — trycua/cua — 29,606★, last push 2026-10-13** — open computer-use stack (Cua Driver, Cua Spaces, Lume/lumier, cua SDK/CLI, CUA-S1, Cua Bench). License correction to the listicle: NOT uniformly MIT — most is MIT, but Cua Spaces and Cua Driver Bench are FSL-1.1-MIT; optional perception extension has AGPL-3.0 components. Spaces macOS 26+ only; security flag: deprecated `cuabot` npm package has known security issues — do not run it. Verdict: "The serious open computer-use stack (driver + Spaces + benchmarks) — capability is real; deployment is gated by Garrett's computers-OFF policy."
- **A7 DeepTutor — HKUDS/DeepTutor — 41,294★, Apache-2.0, last push 2026-10-12** — document → personalized tutor workspace (multi-engine RAG: LlamaIndex, PageIndex, GraphRAG, LightRAG, Obsidian, Kiwix; Chat/Quiz/Research/Visualize/Solve/Co-Writer; 3-layer Memory; can harness Claude Code, Codex, opencode, Hermes, MCP). Docker trial port 3782; `pip install -U deeptutor`, Python 3.11–3.14 + Node 20+. Verdict: "Document→personalized tutor with co-writing and question generation; a learning accelerator, not a business tool." Ships a model-generated code-execution sandbox — configure deliberately. HKUDS family: CLI-Anything (52K★), nanobot (49K★), LightRAG (40K★), Vibe-Trading (35K★), AI-Trader (23K★), DeepCode (17K★).
- **A8 openscreen — siddharthvaddem/openscreen — 39,918★, MIT, last push 2026-06-17** — free Screen Studio alternative (record, smooth cursor, auto-zoom, captions, no watermark/subscription). The post misspelled the username ("vaddeem" ≠ "vaddem"; credited URL 404s). Living branch: getopenscreen/openscreen (4,224 stars, MIT, pushed today in that pass, not a GitHub fork). Verdict: "The post **misspelled the username** (vaddeem ≠ vaddem) — real repo found; free Screen Studio alternative, direct ARE/Kit fit." Install the getopenscreen build today; original hasn't pushed since June 2026.
- **A9 LiteRT-LM — google-ai-edge/LiteRT-LM — 6,663★, Apache-2.0, last push 2026-10-13** — Google's production on-device LLM orchestration over LiteRT (GPU/NPU, vision+audio, tool use; Gemma/Llama/Phi-4/Qwen in `.litertlm` form; powers on-device GenAI in Chrome, Chromebook Plus, Pixel Watch per README). Python/Kotlin/C++ Stable; Swift/JavaScript/Web Early Preview. Verdict: "Google's production edge-LLM runtime — excellent tech, no current lane; watch-list."

#### Batch B (all resolutions from public evidence; no comment sent)

- **B1 Foreman — thruwire/foreman — 751★, MIT, last push 2026-10-13** — Jev-powered supervisor for coding agents: 10 typed `Noul` checks in one parallel request, grouped completion / verification / worker health / repo instructions / human escalation, thresholds 0.65–0.80 in TOML; Jev only evaluates, a deterministic Python policy picks CONTINUE / START_WORKER / START_VERIFIER / STEER_WORKER / STOP_WORKER / RETRY_WORKER / FINISH / ESCALATE. Workers: Codex (default, only live in-turn steering), OpenCode, Hermes (`hermes chat` headless), LangChain Deep Agents. `pip install foreman-core`; key-free `foreman demo --repo .` exists. Its own Limitations: "Jev assessment accuracy is unproven for this use case." Safety flag: local execution not isolated; OpenCode runs with `--auto` with no added sandbox. Verdict: "**A Jev-powered supervisor for coding agents** — independent completion/test judgment over Codex, OpenCode, Hermes workers." Resolution confidence: HIGH. Runner-up ponderousdev/foreman (0★, Apache-2.0) rejected on semantics/adoption; canhta/foreman now 404s. (Evaluated live in Stream E2 below.)
- **B2 Open-glean — hydra-db/open-glean — 1,590★, 496 forks, Apache-2.0, last push 2026-10-06** — open-source Glean-style workspace over Hydra DB (hosted context/memory DB does extraction/graph); Next.js cited Q&A, Deep Research mode (DAG of sub-questions), mindmap, BYO-model. No self-hosted Hydra backend in the repo; README states no Hydra pricing at all. Verdict: "Open-source Glean-style workspace over Hydra DB — real, but the brain (Hydra) is a hosted paid backend." Resolution confidence: HIGH. Steal the Deep Research DAG pattern, not the product.
- **B3 Openjev — razorback16/openjev — 697★, 61 forks, Apache-2.0, last push 2026-10-13** — open Jev-wire-compatible decision server on DiffusionGemma (26B-A4B via vLLM ≥24 GB VRAM, ~18 GB weights, `127.0.0.1:8080`, or MLX on Apple silicon); same wire API as TypeSafe Jev, also answers OpenAI Decisions shape. Backend table includes `laya-1.0` — Laya, the open-weights decision model in Garrett's archive (NandhaKishorM/laya, 32,734★, Apache-2.0) (corrected) — plus Verdict (151M), CLM, JevK5, Cloudflare's Clef. Small backends silently truncate over-long states (Laya: 1,024 tokens; Verdict: 512). Hosted free tier on Codiv: 100M input tokens, no card, at `api.codiv.ai/v1/systemone`. Verdict: "Open Jev-wire-compatible decision server — **and it serves Laya as a backend model**; the GSE-gate component." Resolution confidence: HIGH. Runner-up lookski/openjev (5★, MIT) is a different local-LLM take. Ecosystem: awesome-jev (SemIf 4.7K★, NanoJev, jevlike, OpenJevSwift, JevBench, Jev MCP servers). Caveat: schema-valid ≠ correct.
- **B4 Aria-Icons — LeulAria/Aria-Icons — 88★, MIT, last push 2026-10-11** — icon supply chain: README headline "380,000+ SVG icons" (catalog has since grown — repo description now reads "1M+ SVG icons"); CLI (`search / get / add / migrate / doctor / suggest`) + MCP server; icons written into the repo as source files; npm `aria-icons` v0.1.0 (2026-08-28); also an installable agent skill. Verdict: "380K+ (now 1M+) SVG icons as CLI + MCP server — small repo, exactly shaped for agent-built websites." Resolution confidence: HIGH (exact 380,000+ figure match). Lane: ARE/Kit.
- **B5 Repolyze — MxCorpIn/Repolyze — 227★, MIT, TypeScript, last push 2026-03-09** — repo health-score/audit web app (0–100 health score, Mermaid architecture diagrams, security/dependency findings, PDF/Markdown export), ex-OssiumOfficial/Repolyze (redirects to MxCorpIn; README/demo identities not yet reconciled — repolyze.mxcorp.in vs repolyze.ossium.live). Self-host needs a GitHub classic PAT (`repo` + `read:user`) + OpenRouter key, both REQUIRED, yet FAQ says only public repositories are supported (scope-mismatch flag). Verdict: "Repo health-score/audit web app (ex-Ossium) — real but gone quiet since March; 21 same-name repos make this a name-collision swamp." Resolution confidence: MEDIUM-HIGH. Runner-up: repolyze-ai (1 star, Semgrep/TruffleHog security auditor); also lirantal/repolyze (56★), revolunet/repolyzer.

**Where the gates actually lead (Batch B resolution summary, verbatim confidence):** Foreman → thruwire/foreman, High; Open-glean → hydra-db/open-glean, High; Openjev → razorback16/openjev, High; Aria-Icons → LeulAria/Aria-Icons, High; Repolyze → MxCorpIn/Repolyze (ex-OssiumOfficial), Medium-High. Hidden structure: the list is Jev-themed — Foreman + OpenJev (which serves Laya) are two halves of one stack.

**Top 5 across all 14 (ranked for Garrett, source's ranking):** 1. OpenJev + Laya (B3) — step #1: `pip install typesafe-sdk`, point at Codiv, run the settled-picks eval. 2. Foreman (B1) — step #1: `pip install foreman-core`, key-free `foreman demo --repo .` on the Sports repo. 3. OpenScreen (A8) — step #1: install getopenscreen build, record one Kit walkthrough. 4. Aria-Icons (B4) — step #1: `npx -y aria-icons@latest setup`. 5. FinceptTerminal (A3) — step #1: download the release installer, run the open build a week on free public feeds. Honorable mention: cua (A6); Open-glean's Deep Research DAG pattern (B2).

### 3. Self-archive dossier — "Everything Garrett Sent Himself" (2026-10-13, v1; condensed)

Compiled 2026-10-13 · Subject: Garrett Baxley (@gbeexly) · Scope: Instagram self-archive (both accounts), X self-archive attempt, 30-day creator sweep 2026-09-13 → 2026-10-13 of @ariacodez, @marc.kaz, @wassimyounes_, @carterperez.dev. Garrett's own words are never blended with other people's content: Part 1 is his; Parts 2–3 are posts he kept (saved) or endorsed (liked); Part 4 is the creator sweep; Part 5 is X. Credential regex scans of every caption, self-DM text/URL, and liked caption: zero credentials found.

#### Coverage (as stated in the dossier)

| Surface | Result |
|---|---|
| IG saved posts, @gbeexly | 267 posts returned and archived in full (6 pages, pagination exhausted). Page-1 header claimed 310 total — 43 items never returned by the provider (no further cursor; most likely deleted/private). Provider gap, not skipped work. |
| IG saved collections, @gbeexly | 16 collections (14 his + 2 auto). Names/counts complete; per-collection membership capped at 12 posts with no pagination, so big folders are partial: Saved 310, Money 45, Food 31, Workout 25, Dark art 16, Tattoo 13, Hair and Fashon 10, Shh 8, Hitting 5, Work 4, Halloween FX 4, Movies & Shows 1, Content 1, Dating 1, Food 1 (collection names as returned, including the duplicate "Food" and the spelling "Fashon"). |
| IG self-DM thread, @gbeexly | FOUND and read in full: 774 messages, 2020-01-22 → 2026-10-13, exhausted. 744 are posts/reels/profiles shared to himself; 2 are text; 1 is a Facebook share; 27 returned with null content. |
| IG own posts, @gbeexly | 0 feed posts exist (post_count = 0). One captionless Story from 2026-10-13. |
| IG, @galaxysportsnetwork | 0 saved, 0 collections, no self-DM thread, 1 own post (the GSE/Kit launch post, verbatim in Part 1). |
| IG recently liked, @gbeexly | 500 archived in v1 (10 pages × 50). API reported ~14,998 total; ~14,498 remained unfetched in v1 — superseded by Stream C: 10,778 returned total, 4,220 claimed never returned (corrected). |
| IG media-understanding | Run on the first 50 saved reels/videos (of 136 saved reels/videos) and on all 150 reels in the creator sweep. |
| Creator sweep (Part 4) | 164 posts: @ariacodez 39, @marc.kaz 23, @wassimyounes_ 64, @carterperez.dev 38 (24 reels + 14 carousels). ~45 unique tools/repos/sites; ~30 mentions NEW vs ~71 already covered on the Intel board / in daily digests. |
| X (Part 5) | 0 of Garrett's posts recovered. No X read path in this environment. Full gap in Part 5 below. |

#### Part 1 — His own words

Self-DM thread ("Garrett Baxley," one participant): 774 messages over nearly six years; 744 messages (96%) are shares — a link inbox, not a journal. Only 2 text messages in six years: 2024-08-16 "This is the one she sent. Size 6.5" and 2025-02-15 "🦇" (single bat emoji). 1 Facebook share; 27 messages returned with null content (type NOT_SET) — recorded as a gap, not guessed at. Neither the DM thread nor the saves contains written business plans, credentials, or drafted posts. Flag — FORGOTTEN (structural): 744 shares with only 2 ever annotated; the stream's value is as a discovery index. Complete self-DM index (all 774, newest first) is in the source at Part 1.1 — not reproduced here; Stream A below resolves its post/reel URLs to content level.

#### Part 2 — Saved posts (267)

Every saved post is dossiered in the source (§2.1–§2.268, plus an addendum) with verbatim caption; substantive tool/business items carry full dossiers, lifestyle saves carry a one-line lane judgment. Headline substantive saves named in the closing synthesis/action list: the property-render postcard pipeline items (saves #6 + #12 — sold-home data → CV filter → render on the real listing photo → mailed postcard → QR → booking; pergola first, pools second), codebase-memory, Agent Zero, Claude-Code-as-social-manager, Answer The Public, and the small-model + verifier router pattern (save #1). Addendum items: A. @david__wehner — "Mac mini money" (2026-03-31, reel DWk-oS1ja3V); B. @byeloya — LyrC Studio clip-remix tool (2026-03-09, reel DVsRGp7DX6_) — the latter flagged in the consolidated flags as violating his real-footage doctrine (do not use for GSE).

#### Part 3 — Recently liked posts (500 in v1)

500 most recent likes archived in v1 (Part 3, items 1–500, ending at @ryans.amazing.finds, 2026-01-30); themes section at "Part 3 themes (what the 500 likes say)" in the source. This stream is a curation/consumption signal, NOT self-messages. Its ceiling and full mining are Stream C below (corrected totals there).

#### Part 4 — Creator 30-day sweep (164 posts; deep dossiers — NEW items)

16 deep dossiers (not on the Intel board, not in daily digests):

1. **TypeSafe Jev + Laya (open weights)** — @marc.kaz Sep 17 & 20; @wassimyounes_ Sep 19–20. (Laya figure as corrected in the v2/API pass and used in Stream E1: NandhaKishorM/laya, 32,734★, Apache-2.0, pushed 2026-10-12 (corrected).)
2. **FreeLLMAPI** — @ariacodez, Oct 13.
3. **Alibaba Open Code Review** — @wassimyounes_, Sep 15.
4. **Xiaomi MiMo-V2.6 RL environments** — @wassimyounes_, Sep 30.
5. **Ever Gauzy** — @wassimyounes_, Sep 15.
6. **VoiceStudio** — @wassimyounes_, Oct 2.
7. **CourtListener lawsuit-search build** — @ariacodez ("SUED").
8. **Siri / Apple Intelligence settlement claim** — @ariacodez.
9. **AirCard** — @ariacodez, Sep 30.
10. **universal-modder** — @ariacodez Oct 4 + @wassimyounes_ Oct 2.
11. **prod-FARM-IOS-Core (Git-Agni)** — @marc.kaz, Sep 14.
12. **carterperez-dev/cybersecurity-projects** — @carterperez.dev, Oct 10 & 13.
13. **Revealer.us** — @ariacodez + @marc.kaz, Sep 14 — live OSINT search service; unverified pricing/limits; test against three known handles vs the bot's /user2, board only if it finds more. Flags: NEW, UNVERIFIED depth.
14. **GitHub URL tricks (GitDiagram / GitIngest / codewiki / star-history)** — @ariacodez, @marc.kaz — zero-install repo reading; free, works today. Flags: NEW, zero-risk adoption.
15. **SceneAI** — @marc.kaz — sceneai.art prompt library for websites/landing pages/animations; Kit lane; test against one real Kit build.
16. **AnyPS5** — @wassimyounes_, Oct 5.

Also NEW but minor are in the sweep record (§4.2 of the source), which gives the complete per-post, per-creator record for all 164 posts (Track C @ariacodez shown in full in the source, and the other creators likewise) — including recurring already-boarded items such as CertGames (26,000+ practice questions across 21 certifications, free tier; repeated in 6+ @carterperez.dev posts; Status: ALREADY ON BOARD (INTEL_BOARD in bot.py)), Sherlock, RustScan, Nuclei (ProjectDiscovery), Sliver (BishopFox), TruffleHog, and Higgsfield AI — each marked "ALREADY ON BOARD" in place where applicable, and comment-gated items marked UNRESOLVED as a link where the gated bundle was not publicly resolvable.

#### Part 5 — X: findings and access gaps

Bottom line in the source: nothing of his could be recovered from X — an honest gap, not a skipped task. The x-poster skill is post-only (no read path/API/archive); 20 distinct searches were run (13 social-search queries in 7 calls + 7 public web queries, incl. `GalaxySportsHQ` and `site:x.com GalaxySportsHQ`); result: 0 posts by Garrett recovered (social search indexes Instagram/Facebook/Threads only, not X; web search returned LA Galaxy / Samsung Galaxy / Signal-app noise). @SignaL_OriginHQ could not be verified by public search. The one unlocking action stated: Garrett signs into X himself in the live browser, after which a browser task can read Bookmarks, self-DMs, post/thread history, Likes, and Lists. Flags: GAP — X self-archive.

#### Ranked Action List (source, highest payoff first — condensed, steps #1 only)

1. Build the property-render postcard pipeline (pergola first, pools second) — pick one Houston installer partner and pull the first Harris County recent-sales list.
2. Evaluate Laya (open-weights Jev) against the GSE gate — download the Laya English checkpoint and build the settled-picks eval set. (→ Stream E1.)
3. Adopt codebase-memory for the Sports repo — clone it and run the first index; time a with/without session.
4. File the Siri settlement claim — verify the official settlement site, then check device eligibility (creator-stated deadline Dec 21, 2026).
5. Add Alibaba Open Code Review as second reviewer in CI — GitHub Action on Sports, comment-only, on the next Jules PR.
6. Unlock the X archive — Garrett signs into X in the live browser.
7. Implement the small-model + verifier router for cheap fleet tasks — pick the three highest-volume fleet tasks, route small-model-first behind OmniRoute with a verifier.
8. Stand up FreeLLMAPI as the free-tier overflow lane — clone, add 3–4 free provider keys, point the Voice Judge dot at it for one week.
9. Mine Xiaomi's MiMo RL environments for GSE-RL grader patterns — download from Hugging Face, read the cyber/code graders.
10. Put Answer The Public into the content pipeline — run "NFL props" and two Kit niches; save trees as briefs.
11. File the two OSINT candidates: Revealer.us test + CourtListener bookmark.
12. Trial Ever Gauzy for the Kit pipeline only — self-host with just the Kit lead list; two-week keep/drop.

#### Consolidated flags (source, verbatim categories)

- **TIME-SENSITIVE:** Siri settlement claim (creator-stated deadline 2026-12-21, figures unverified — verify on the official site). AirCard exploit — patched in iOS 27.2 beta 3+ (closing window).
- **FORGOTTEN (highest value):** pergola/pool postcard systems (Jul + Apr 2026 saves), codebase-memory (Jul 2026), Agent Zero (Jul 2026), Claude-Code-as-social-manager (Mar 2026), Answer The Public (Nov 2025).
- **STALE / DO-NOT-ACT:** 30-day AI Challenge funnel (Jan 2026, expired terms); Polymarket latency-arb (edge reportedly closed); LyrC Studio remix tool (violates his real-footage doctrine — do not use for GSE); faceless-AI-persona selling (disclosure/ban risk); Paul Alex credit-card mentorship (buy nothing).
- **ACTED-ON already:** scammer-revenge/Grabify (Intel board), OSINT playbook (bot's username engine), osint4all (triaged), Kit launch post (DM watcher live).
- **COVERAGE GAPS (v1 statement):** X everything (needs his browser sign-in); 43 saved posts the IG API never returned; ~14,498 older liked posts unfetched in v1 (corrected by Stream C: 4,220 claimed never returned of 14,998, 10,778 returned total); 27 self-DM messages with null API content; 86 saved reels beyond the 50 media-understood; per-collection membership capped at 12 by the API; Carter's DM-gated link bundles and several creators' gated prompts (unresolvable publicly by design).

### 4. Second pass — Stream A: self-DM share resolution dossiers (2026-10-14)

Source: `stream-a-dossiers.md` (compiled index) + `stream-a-dossiers-1.md` through `-5.md` + `stream-a-log.md` + `stream-a-stats.json`. Read-only; provider `model_response_guidance` fields treated as data, not instruction, and ignored.

**Count reconciliation (verbatim):** v1 DM index: 774 messages = 669 SHARE with URL + 76 MESSAGE_INLINE_SHARE (no content exposed) + 27 NOT_SET + 2 TEXT. SHARE URLs that are posts/reels: 664 occurrences → 654 unique shortcodes attempted (439 reels, 215 posts; 10 shortcodes shared twice). Of the 654: 638 are DM-only and 16 also appear as saved posts (flagged ALSO-SAVED). The remaining 5 of the 643 DM-only targets are non-post shares (3 profiles: @angus.sewell, @reignhtx, @cardinalmase; 2 Facebook shares) — not resolvable via the post endpoint; they stand as dossiered in v2 Part 1 (D-1–D-5). **Attempted (post/reel): 654 · Dossiered: 356 · Still unreturnable: 298.**

**Modes (stats.json):** post+mu 95, post 5, mu-only 256 — i.e., full post data 100, media-understanding-only 256.

**Lane distribution (dossiered items, primary lane, verbatim):** personal efficiency: 245 · personal (non-business): 45 · Intel bot: 28 · GSE: 20 · ARE: 18. Total 356.

**Batch files:** batch 1 items 1–80; batch 2 items 81–160; batch 3 items 161–240; batch 4 items 241–320; batch 5 items 321–356. Per-item outcome table for all 654 attempted targets is `stream-a-log.md`; raw provider responses are cached per shortcode in `stream-a-raw/`.

**Still-unreturnable breakdown (verbatim):** 285× — not yet returned — provider HTTP 429 rate-limit block on the post endpoint (from 2026-10-14 ~05:44 UTC) and media-understanding throttled in turn; cannot be classified deleted/private while the block stands. 13× — media-understanding returned an empty record (all content fields null, error=null) and the post endpoint is blocked by provider HTTP 429 Too Many Requests (in effect from 2026-10-14 ~05:44 UTC; evidence in stream-a-fetch.log). Total 298. A re-pull kit for the 298 was preserved (per the memory log's later summary; the files themselves state the block and the per-item log).

**Headline items (first batch, illustrative of the 356 — full per-item dossiers are in the batch files and every dossiered shortcode is indexed in the companion TSV):**

- **DecRIB6RWF- — @angus.sewell** — reel critiquing Kalshi's alleged creator-cloning growth strategy and walking through a thumbnail/title split-test monitoring workflow. Lane: personal efficiency. Flags: GATE-LOCKED (comment/DM-gated payoff — described, never engaged).
- **Ddz_2_jRkbI — @prediction_alpha** — tutorial on copying successful prediction-market traders (Polymarket profile 'HomeRunHazard' shown with $2,631,646.32 profit, $1.2M positions value, +$3.0M total PnL — content claims, in the post). Lane: GSE. Flags: none.
- **DecKfjAKnQR — @ariacodez** — FreeLLMAPI: "One free tool gives access to 34 AI providers for your coding agent," ~7.4 billion free tokens a month claimed, 34.1k stars shown on screen, dashboard at localhost:3001. Lane: personal efficiency. Flags: none. (Same item as Part 4 deep dossier #2 above.)
- **DeR2Qllm6aP — @simplifyinai** — OpenDots by CopilotKit: open-source agent workspace, specialist agents, persistent browsers/files, text/voice/Slack, approval cards. Lane: personal efficiency. Flags: GATE-LOCKED.
- **DeOPnJDltkN — @seb.ai** — "6 Grok bots. One trading account." rebuilt six-bot trading team (Scout/News/Sentiment/Charts/Risk/Decision) behind a viral $89-to-$68,024 experiment (self-reported in the post, "aren't guaranteed"). Lane fit and flags as dossiered in the batch file.

### 5. Second pass — Stream B: side-chat mega-message tails (2026-10-14)

Source: `stream-b-harvest.md` (115 lines). Read-only; tails read via the same read-only database surface as the first pass, paging by character offsets; every `http` occurrence located by an exhaustive position chain and inspected in context. Forwarded content marked [forwarded]; Garrett's own words marked [Garrett]. Dedupe baseline: master-ledger §B (side chats) and §A (main chat) — NEW only if not already there. Disclosure in the source: three bulk extractions (seq 6137 chars 6,001–30,000; seq 6198 chars 21,001–33,000) tripped the runtime's prompt-injection check because those ranges consist of forwarded agent-task instructions; those instructions were not followed and their content is not reproduced or characterized there.

**Count reconciliation (verbatim table):** Week 3 seq 6137: 171,691 chars, first pass got Kats context @ ~54,832 only, this pass 0 → end full, 11 `http` occurrences, 5 NEW distinct URLs. Week 3 seq 6198: 77,017 chars, first pass Kats @ ~27,290, this pass full, 1 occurrence (Kats, ledgered), 0 new URLs. Week 3 seq 7291: 44,059 chars, first pass 1 chunk @ ~18,854 (placeholder only), this pass full, 16 occurrences (1 placeholder + 15 real), 13 NEW distinct URLs. Minis seq 189: 111,461 chars, first pass base URL @ ~17,721, this pass exhaustive URL/domain scan + full-length sampling, 6 occurrences (1 URL + 5 code tokens), 0 new URLs. **Total: 404,228 chars; 4 messages partially read → 4 / 4 messages completed; 34 occurrences inspected; 18 NEW distinct URLs.**

**Seq 6137 — NEW URLs (5):**

- ESPN site scoreboard API — `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` (3×) — unofficial public scoreboard JSON, keyless GET, verified via public sources 2026-10-14, no rate-limit guarantee. Lane: GSE. Status: VERIFIED as a real public endpoint pattern.
- ESPN core API event-odds endpoint for event 401872978 — `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/401872978/competitions/401872978/od…` (4×) — DraftKings lines/props reported through it. Lane: GSE. Status: TRUNCATED IN SOURCE (the stored message itself cuts each URL).
- Sleeper players API — `https://api.sleeper.app/v1/players/nfl` — public full NFL player dictionary (~5 MB+, fetch at most once/day and cache); verified via Sleeper API documentation mirrors 2026-10-14; quirk: Sleeper drops name suffixes (e.g. "Jr."), causing false mismatches. Lane: GSE (roster gate / identity cross-check). Status: VERIFIED.
- Garrett's own launch file — `https://github.com/Beexly/Sports/blob/claude/launch-handoff-merge-g01115/scripts/ops/chaos/c11-total-launch.txt` (2×), attached to [Garrett]'s closing message. Lane: GSE. Status: recorded verbatim; not independently opened.
- Stack Overflow Chart.js question — `https://stackoverflow.com/questions/30464750/chartjs-line-chart-set-background-color` — inside scraped StatRankings JavaScript / a library code comment. Lane: none — incidental library provenance, NOT a resource Garrett selected. Status: incidental / no action.

Already ledgered, confirmed again: facebookresearch/Kats. NEW named (no URL): arXiv:1908.05428 (Romano et al., equalized coverage / conformal) — GSE calibration; the Maher (1982) / Dixon & Coles (1997, JSTOR stable/2986290) / Karlis & Ntzoufras (2003) citation-correction cluster (PR #1025 review, Beexly/Sports); @PattonAnalytics, @ColeJacksonFB, @AjayTakes attributions (GSE wiring backlog); export.arxiv.org/api/query (the 11 lanes duplicate §B — not new).

**Seq 6198 — NEW named items (1):** "Kats 6/7 v3 — Harmonic regression for gappy series (RETRY)" — versioned task label referencing `gse-ml-service/app/models/harmonic_regression.py`. Lane: GSE. Everything else duplicates seq 6137 or §B's Kats entry. New distinct URLs: 0.

**Seq 7291 — biggest yield — NEW URLs, 10-entry bibliography (9 new external + 1 self-citation):**

1. arXiv:2603.24704 — Bai & Jin (2026), Conformal Selective Prediction with General Risk Control ("SCoRE"). VERIFIED on arXiv 2026-10-14. Lane: GSE abstention/risk-control.
2. arXiv:2610.08322 — Xie & Alsinglawi (2026), Structure-Aware Graph Abstention for Reliable Selective Forecasting ("SASF"). VERIFIED on arXiv (submitted 6 Oct 2026). Lane: GSE.
3. arXiv:2408.10867 — Lopez & Bliss (2024), Bye-Bye, Bye Advantage — doc's finding: post-2011-CBA bye/rest edge ≈ +0.15 pts, not significant. Lane: GSE situational.
4. doi:10.1080/09603100701720484 — Borghesi (2008), Weather biases in the NFL totals market — doc's finding: winds >15 mph cut totals ~1.8–2.8 pts. Lane: GSE weather.
5. doi:10.1016/j.jeconbus.2006.09.001 — Borghesi (2007), The home team weather advantage and biases in the NFL betting market. Lane: GSE weather/home-field.
6. Boulier & Stekler (2003), Predicting the outcomes of NFL games (course lit-review mirror PDF). Lane: GSE forecasting benchmarks.
7. Rosen (2026 working paper), Resource Optimization Under Asymmetric Spillovers: The NFL Laboratory — doc's finding: starter→backup QB transitions cost ~3.5–7.0 implied points. Status: working paper as cited; not independently opened.
8. github.com/nflverse/nflreadr — Ho & Carl, nflverse data 1999–present, MIT. Lane: GSE data foundation. Free/open source.
9. arXiv:2609.09678 — Wu & Rus (2026), Safe to Stop? Risk-Constrained Stopping for Sequential Clinical Diagnosis Agents ("CROS"). VERIFIED on arXiv 2026-10-14. Lane: GSE stopping/abstention pattern (methodological, not sports).
10. github.com/beexly/sports — the doc's self-citation of Garrett's own repo, flagged in the forwarded doc as inaccessible/unverified from the doc author's vantage. Status: forwarded claim, noted as such.

**Seq 7291 — situational datasets table (4 new):** FTN Data (ftndata.com, commercial, 2020–2026, join `nfl_game_id`/`ftn_fixture_id`); NFLWeather (nflweather.com, hourly observations 2009–2026); Pro-Football-Reference (pro-football-reference.com, 1970–2026, join `boxscore_id`); Kaggle competitions (kaggle.com/competitions — Big Data Bowl 2018–2024, historical only, custom non-commercial license, join `gameId`; URL recorded exactly as written). Fifth row (nflverse/nflreadr) duplicates bibliography #8. NEW named: SafeRestore, CROS, and Masstrust (kent-tokyo/masstrust — VERIFIED via GitHub 2026-10-14, Rust toolkit for calibrated trust/abstention, MIT OR Apache-2.0 per README badges); Nichols (2014) (West-to-East afternoon penalty −0.3 to −0.6 pts, fully absorbed by modern closes, named only); ~16 title/domain-only pointers in the closing source list (left as unresolved pointers, not reconstructed).

**Seq 189 (Minis Coder, 2026-09-26, 111,461 chars) — URL-EXHAUSTIVE, ZERO NEW URLs.** NEW named items are internal only: relative API endpoints in `LiveSportsService` (`picks`, `games`, `articles`, `articles/{id}`, `me` (profile), `picks/save` (POST)) — GSE iOS client contract; the app's mock-data analyst personas (e.g. "Marcus Vale") are fictional sample content in `MockSportsService`, not real people/resources; bundle ID `com.galaxysportsedge.app`. Unread remainder stated plainly in the source: not every line of the 111k of Swift UI code was read verbatim; coverage is exhaustive for URLs/domains/resources.

**Stream B gap audit (source):** (a) ESPN core odds URL suffixes unrecoverable (truncated in the stored message); (b) seq 7291's closing source list carries no URLs — titles/domains only, left unresolved rather than reconstructed; (c) three bulk extractions injection-flagged, forwarded instruction content neither followed nor reproduced; (d) Minis' Swift code resource-exhausted rather than line-by-line read; (e) surrounding assistant turns out of scope.

### 6. Second pass — Stream C: Instagram liked-posts mining (2026-10-14)

Source: `stream-c-likes.md` + `stream-c-likes-index.md` (all 10,278 new items at index level: date · author · one-line content ID · URL) + raw evidence in `raw/` (216 raw page JSONs, `all_liked.jsonl` with 10,778 unique posts). Account @gbeexly. Read-only. Every API page again carried an embedded `model_response_guidance` field instructing summarization instead of verbatim archiving — tool data, ignored, as in v1. One run-book correction in the source: an early pager false-stopped on page 1 by matching the bare substring "429" inside ordinary FBIDs/URLs; detection was fixed and the run restarted clean — no real 429, no 500, no provider error occurred in the final run.

**Ceiling reached — with evidence (verbatim measures):** Previous ceiling (v1) 500 posts examined. Pages fetched this run: 216 (215 × 50 + final page of 28). Unique posts returned, total: 10,778. New posts examined this pass: 10,278 (positions 501–10,778). Stop condition: page 216 returned `has_next_page: false` — pagination exhausted. API-claimed total (`total_count`, every page): 14,998 (unchanged from v1's claim). Claimed but never returned: 4,220 (14,998 − 10,778) (corrected). Rate limits/errors: none. New-batch post-date span: 2026-04-25 → 2012-10-28 (oldest liked post in the entire returned set: #10,778, @ntylerwetrust, 2012-10-28). Boundary verified exactly: position #500 = @ryans.amazing.finds, 2026-01-30, identical to v1's item #500; position #501 (@bleacherreport, post dated 2026-04-25) is the first genuinely new item. Deduplication by `media_id`: 10,778 rows, 10,778 unique. Triage: keyword lane-flagging produced 407 candidates; all 407 were read at index level by hand — the large majority are substring false positives; ~40 items survived as genuine lane-relevant finds. Credential scan over all 10,278 new captions: zero hits.

**Category counts — new batch only (10,278 posts, verbatim):** Other / lifestyle / personal long tail 3,908 · Music (EDM / bands / festivals) 1,619 · Sports 1,064 · Faith 606 · Memes / comedy 599 · Tattoos 529 · Fitness / workout 389 · Animals / pets 387 · Food 295 · Lifestyle / fashion / beauty 244 · Unclassifiable (no caption) 187 · Motivation 129 · AI / business / OSINT (caption-classified) 126 · Relationships 105 · Sports-betting / DFS accounts 48 (all 48 are @draftkings) · Pokémon / cards 43. By post year (new batch): 2026 ×390, 2025 ×2,225, 2024 ×1,060, 2023 ×2,100, 2022 ×1,158, 2021 ×535, 2020 ×458, 2019 ×1,196, 2018 ×1,015, 2017 ×138, and single posts from 2015, 2013, and 2012. Watched creators in the new batch: @ariacodez ×4 (all four notated); @marc.kaz ×0, @wassimyounes_ ×0, @carterperez.dev ×0.

**Full notations — 36 notations covering 49 items.** Status for every item in this stream (verbatim): *liked only — never saved or acted on; cataloged here, not a verdict.* Creator claims are labeled as claims and were not independently verified; media-understanding was not run on these reels (see gap audit).

- **A1 #937 — OSINT digital-footprint audit demo** (@ariacodez, 2025-12-19) — researchers audit public data exposure with OSINT tools; simulated dummy data in the demo. Lane: Intel bot / Family Shield.
- **A2 #1092 — Exposed-webcam awareness** (@ariacodez, 2025-10-15).
- **A3 #939 — 3D PC builder tool** (@ariacodez, 2025-12-07).
- **A4 #1087 — "Portal to the deep web" free-streaming post** (@ariacodez, 2025-11-24) — Status in source: flagged, not endorsed — piracy-adjacent; recorded under nothing-gets-killed as learn-only, never as a resource to use.
- **B1 #533 — @power.ai: "caveman" Claude token-cost trick** (2026-04-09) — claiming broken caveman-style answers cut token use by up to 75% (the post's claim, UNVERIFIED). Lane: personal efficiency / fleet cost — cheap to test, worth one measured trial.
- **B2 #677 — @albert.olgaard: Claude skills giveaway post** (2026-03-17).
- **B3 #936 — @edward.builds: animated Gmail logo via Google VEO3** (2025-12-20) — logo → VEO3 looping animation → MP4 → GIF → Google account profile picture (moves in Gmail). Lane: ARE / Kit sender branding. Status in source: concrete, replicable, and the most immediately usable ARE item in the batch.
- **B4 #2050 — @joshyspeed: AI & automation services masterclass** (2025-01-12) — Lane: ARE (the Kit/service-lane business model taught as a course); model-level find, not a tool.
- **B5 #2141 — @therundownai: The Rundown AI newsletter** (2025-05-23).
- **B6 #2778 — @artificialzone: 11 free Harvard courses** (2025-03-25).
- **C1 #593 — @technology weekly roundup** (2026-03-23); **C2 #511 + #745 — @evolving.ai weekly roundups ×2** (Claude Design, Claude Code desktop for parallel agents, Codex using a Mac, Claude Cowork on Windows, Gemini 3 Deep Think, Seedance 2.0, ElevenLabs voice latency — news-level); **C3 #668 — @stics.ai: AI acceleration roundup**; **C4 #918 — @airesearches: CES 2026 day-1 roundup**; **C5 #3205 — @hoodratchetv: the DeepSeek R1 market shock**; **C6 #4151 + #6156 — @metav3rse ×2** (OpenAI Sora announcement; an AI-investing thesis via @eluna.ai, explicitly not financial advice — both dated); **C7 #4437 — @davinciaiapp: DaVinci AI tattoo-design app**; **C8 #3041 — @swayai.app: Sway AI profile optimizer**. Section C header verdict: all news-level — what happened, no tool to run.
- **D1 #2339 — University of Houston cybersecurity bootcamp ad** (2025-05-27); **D2 #2376 — @tripleten.techcareers: TripleTen bootcamp ad** (2025-05-13). Section D: OSINT / security careers.
- **E1 #5523 + pattern — @draftkings ×48 posts** — the batch's betting-account bucket is 100% DraftKings (FanDuel appears only as a TV-network credit). Lane: GSE — consumption signal, not a tool.
- **E2 — Betting-content accounts ×3 (grouped, brief)**.
- **E3 #3500 — @1v1meapp: 1v1ME game-staking app** (2024-07-19).
- **F1 — @calltoleap ×3 (grouped)** — Steve, investing-education creator; **F2 #3114 — @wealthsurgeworkshop: free Houston stock-trading workshop** (2025-02-04); **F3 — Trading cluster ×4 (grouped, brief)** (creator numbers in this cluster incl. a 74% trading record are reported as the posts' claims, UNVERIFIED per the gap audit); **F4 #3489 — @mikehoffmannofficial: vending-machine business coaching**; **F5 #2867 — @theyounetworkhq: UPS Store franchise claim** ($30k franchise figure is a creator claim, UNVERIFIED per gap audit); **F6 #4092 — @jameszmurphy: Airbnb arbitrage play** (~$2k/mo Airbnb net is a creator claim, UNVERIFIED per gap audit); **F7 #4028 — @norisoldit: Houston duplex house-hack listing**; **F8 #2186 — @unpublished_diaryy: Instagram Growth Guide course**; **F9 #5239 — @dot.cards: dot. NFC digital business card**; **F10 #1301 — @hoodratchetv: China influencer-certification rules**. Section F also contains the concrete Roth procedure and the $75k-salary item (#3333, save 20% to a high-yield savings account, 2024-12-15) noted in the source's bottom line / §F.
- **G1 — Restock-monitor cluster ×3 (grouped)** — the tooling layer of Pokémon TCG reselling; **G2 — @tydeancards ×3 (grouped)** (incl. #835 "Weekly card sales on my eBay store — attempting to grow sales to $10,000," 2025-12-13; returns not stated); **G3 #1944 — @htowncardshow: H-Town Card Show** (2025-06-23) — 230+ tables, Stafford Centre, Stafford, TX; the edition in the post (Aug 23–24) has passed, the show recurs; the batch's one offline, local, immediately physical find.

**Evaluated and deliberately NOT given full notations (honesty log, verbatim items):** @simplestability_ ×6 posts (identical hashtag captions, nothing extractable); @airesearches #1919 (AI in the caption, self-help in substance); @coingrams #566 ("Easy Money Sniper 👏" — three words); FanDuel/DraftKings-adjacent false positives (~a dozen baseball posts, broadcast-network credits only); the remaining ~360 of 407 lane-flagged items (substring matches — all read, all count-logged).

**Stream C gap audit (source):** (1) Provider gap (not closable from here): 4,220 of the API-claimed 14,998 never returned across 216 pages; pagination ended cleanly (`has_next_page: false`). (2) No media-understanding on the new batch — for reels where the tool name lives in the video (@ariacodez A1/A3 especially), specific product names remain unextracted; closing it is one bounded media-understanding batch over the ~15 reel notations in §4. (3) Category long tail: 3,908 posts in "other/lifestyle" (author-level mapping only for unambiguous repeat authors ≥18 posts). (4) Claims not re-verified: creator numbers (75% token savings, ~$2k/mo Airbnb net, $30k franchise, 74% trading record) are reported as the posts' claims, labeled UNVERIFIED. (5) 22 rows returned with no author username (API omission); no identity invented.

**Stream C bottom line (source):** the liked stream is now mined to the provider's true ceiling: 10,778 of a claimed 14,998 posts examined (500 in v1 + 10,278 new), 4,220 claimed items unreachable through any cursor the API offers (corrected). It is a consumption history (EDM, baseball, softball, tattoos, faith, memes); lane-relevant yield is thin but real — 4 @ariacodez OSINT items, one testable AI-cost trick, one five-minute ARE branding workflow, a concrete Roth procedure, a complete Airbnb-arbitrage outline, the Pokémon restock-monitor tooling cluster, and a recurring Houston card show.

### 7. Second pass — Stream D: chat-harvested GitHub repos, evaluation pass (2026-10-14)

Source: `stream-d-dossiers.md`. Universe: master-ledger §E verification table = 90 repos; 10 are Garrett's own Beexly repos (excluded from ranking: autonomous-revenue-engine, Clouds-bruh, Project-Tree, Sports, XXX, DirectorOS, OmniRoute, Dev-Main-BF — 404 in ledger §E, gse-competitive-intel, agent-bus); 80 external. This pass deep-evaluated 31 (fresh GitHub API figures + README read, 2026-10-14) and wrote full dossiers for the top 15. Ranking logic (published in the source): Score = log₁₀(verified stars) × LaneFit (0–5, best lane among GSE engine/data, ARE revenue, Intel bot, fleet/orchestration, personal efficiency). Where the API returns NOASSERTION or no license, that is reported as-is and treated as a caution, not a verdict.

**Ranking table — evaluated tier (31 repos, ★ verified 2026-10-14, verdicts verbatim):**

| # | Repo | ★ | License | Last push | Verdict |
|---|---|---:|---|---|---|
| 1 | n8n-io/n8n | 207,303 | NOASSERTION (fair-code / Sustainable Use) | 2026-10-14 | ADOPT |
| 2 | yt-dlp/yt-dlp | 197,569 | Unlicense | 2026-10-10 | ADOPT |
| 3 | TryGhost/Ghost | 55,532 | MIT | 2026-10-14 | ADOPT |
| 4 | gitroomhq/postiz-app | 37,154 | AGPL-3.0 | 2026-10-14 | ADOPT (self-host, unmodified — per dossier heading) |
| 5 | lissy93/web-check | 35,101 | MIT | 2026-10-13 | ADOPT |
| 6 | xai-org/x-algorithm | 33,609 | Apache-2.0 | 2026-10-14 | LEARN-ONLY |
| 7 | jivoi/awesome-osint | 30,211 | NOASSERTION | 2026-10-13 | ADOPT (as a curated source) |
| 8 | knadh/listmonk | 23,776 | AGPL-3.0 | 2026-10-14 | ADOPT |
| 9 | polarsource/polar | 10,363 | Apache-2.0 | 2026-10-14 | ADOPT (hosted) |
| 10 | facebookresearch/Kats | 6,497 | MIT | 2026-10-01 | ADOPT (vendored, per-sport) |
| 11 | metabase/metabase | 49,650 | NOASSERTION (open-source ed. AGPL + commercial ed.) | 2026-10-14 | WATCH |
| 12 | alibaba/open-code-review | 46,987 | Apache-2.0 | 2026-10-13 | ADOPT |
| 13 | vnpy/vnpy | 45,857 | MIT | 2026-10-06 | LEARN-ONLY |
| 14 | PostHog/posthog | 40,272 | NOASSERTION | 2026-10-14 | ADOPT (cloud free tier) |
| 15 | chatwoot/chatwoot | 37,767 | NOASSERTION (MIT per repo footer; enterprise parts separate) | 2026-10-14 | WATCH |
| 16 | webadderallorg/Recordly | 33,680 | NOASSERTION | 2026-10-13 | ADOPT |
| 17 | vxcontrol/pentagi | 28,410 | MIT | 2026-10-09 | LEARN-ONLY |
| 18 | dubinc/dub | 24,879 | NOASSERTION | 2026-10-14 | WATCH |
| 19 | qeeqbox/social-analyzer | 24,303 | AGPL-3.0 | 2026-01-12 | LEARN-ONLY |
| 20 | browser-use/jev-ultrafast | 22,853 | MIT | 2026-09-30 | WATCH |
| 21 | cft0808/edict | 16,987 | MIT | 2026-09-28 | LEARN-ONLY |
| 22 | future-agi/future-agi | 2,145 | Apache-2.0 | 2026-10-14 | ADOPT |
| 23 | discourse/discourse | 47,971 | GPL-2.0 | 2026-10-14 | WATCH |
| 24 | calcom/cal.diy | 48,985 | MIT | 2026-09-26 | WATCH |
| 25 | FoundationAgents/MetaGPT | 70,837 | MIT | 2026-01-21 | LEARN-ONLY |
| 26 | medusajs/medusa | 36,737 | NOASSERTION | 2026-10-13 | WATCH |
| 27 | n8n-io/self-hosted-ai-starter-kit | 15,280 | Apache-2.0 | 2026-10-12 | WATCH |
| 28 | mautic/mautic | 10,761 | NOASSERTION | 2026-10-14 | WATCH |
| 29 | growthbook/growthbook | 8,497 | NOASSERTION | 2026-10-14 | WATCH |
| 30 | meta-llama/llama | 59,629 | NOASSERTION (Llama community license) | 2025-01-26 | WATCH |
| 31 | DhavalKapil/icmptunnel | 3,251 | none | 2022-04-12 | LEARN-ONLY |

Scores for #23–#31 fall below #22 despite higher raw stars in some cases because LaneFit is 2–3, not 5 — "that is the ranking logic working as published, not an error."

**Full dossiers — top 15 (one-line whys, verbatim from the ranking table):** 1. n8n — the ARE/fleet automation backbone the corpus keeps nominating; self-host internal workflows only (fair-code bars offering it as a service). 2. yt-dlp — already the footage/research acquisition backbone (via Reclip); clips stay short and transformative per doctrine. Verdict in dossier: ADOPT (already the backbone; this dossier closes the "never evaluated" gap formally). 3. Ghost — publishing + memberships + newsletter in one MIT package; change condition: if list growth stalls below a few hundred after a genuine 90-day cadence, fold sending into listmonk alone and keep Ghost as the archive/site. 4. Postiz — self-hosted scheduling for approved posts across X/TikTok/IG/YouTube; AGPL = run unmodified internally, never offer as a service; change condition: if platform app approvals stall for 30+ days, the cloud tier becomes the fallback. 5. web-check — the Intel bot's `/webcheck` already ports its 26 checks (per dossier); adopt upstream as the reference implementation and QA baseline. 6. x-algorithm — X's actual For You ranking/visibility code; study it, not a runnable product; wake condition: if X ships a runnable ranking simulator from this codebase, re-evaluate as a pre-post scoring tool. 7. awesome-osint — already gap-mined into the Intel bot (~190 links triaged into 12 wired commands, per dossier); keep as a board source, re-verified on a cadence. 8. listmonk — single-binary self-hosted list/campaign manager, pairs with Ghost; change condition: if Ghost alone covers sending at his actual volume for a year, listmonk can be retired (lists export as CSV). 9. Polar — merchant-of-record billing for digital products; change condition: if an offer's volume makes the per-transaction percentage exceed a Stripe-plus-tax-tooling stack's true cost, re-run the comparison. 10. Kats — time-series detection/features for per-sport market and performance series; vendor the modules (TSFeatures first, then BOCPD/CUSUM/StatSig on market series); forecasting models stay subordinate to the engine's own walk-forward backtests. 11. Metabase — WATCH: point-and-click BI over the Neon engine DB is real value, but it overlaps PostHog; wake: a recurring internal dashboard need PostHog doesn't serve. 12. OpenCodeReview (alibaba/open-code-review) — deterministic-plus-agent PR review at ~1/9 the tokens of a general agent (its own benchmark); ADOPT as second reviewer on a trial set of real PRs, scored against Merge Sheriff verdicts; change condition: if its findings duplicate Sheriff's at a high rate with no unique true positives over ~20 PRs, demote to LEARN-ONLY. 13. vnpy (VeighNa) — LEARN-ONLY ★ MANDATORY DOSSIER: 45,857★, forks 12,517, MIT, created 2015, ~6,900 commits, 68 releases; a serious quant platform whose live gateways and market assumptions don't transfer; its backtest/risk/alpha patterns do. What would change the verdict: a Trading Desk sprint that (a) stays paper-only, (b) picks a Python chassis deliberately, and (c) shows the [pattern transfer — dossier text continues in source]. 14. PostHog — ADOPT (cloud free tier, not self-host) for galaxysportsedge.com + Kit analytics; instrument a small, named event set (pageview, pick-view, kit-cta-click). 15. Chatwoot — WATCH: omnichannel support inbox + AI agent (the Kit Receptionist shape); wake: first paying Kit client (or Intel-bot paid tier generating recurring support).

**Residual — notated-not-evaluated after this pass (49, by primary cluster, names verbatim from the closing note; verdict for all: notated-not-evaluated, cataloged, not killed):** Meta/Llama batch remainder (4): meta-llama/llama-api-typescript · meta-llama/llama-api-python · meta-llama/prompt-ops · meta-llama/synthetic-data-kit. Business-batch remainder (7): facebook/hhvm · Eternaldeath/AIProductHome · minhnv0807/ai-business-skills · aws-samples/generative-ai-use-cases · ertiqah/The-Efficient-Entrepreneur · MindWorkAI/AI-Studio · Denis2054/Building-Business-Ready-Generative-AI-Systems. Small/research repos (6): ruparelmetarya/Deep-Learning-Based-Tamper-Detection-on-Images · ruparelmetarya/Fast-Image-Retrieval · mcnamee/react-native-starter-kit (archived upstream) · up-for-grabs/up-for-grabs.net · jtmuller5/The-HustleGPT-Challenge · evolution-foundation/evo-nexus. Full-Court Press video/content pipeline remainder (17): BurntSushi/nflvid · haydenw22/DVarr · satoshate/obs_replay_script · longomatch/longomatch (404 in ledger §E — project exists, org path dead; successor not confirmed in this pass) · SidSarkar13/FOOTBALL-ANALYSIS-AI · vreelb/dewdle · zaltinsoy/AutoSubZ · angelarose210/revideo · Corzed/AutoMediaV2 · brightbeanxyz/brightbean-studio · TikHub/TikHub-API-Python-SDK · PlainsightAI/openfilter · chicogong/media-pipeline · Apra-Labs/ApraPipes · Owlseer-AI/Social-ops · pubspro/viral-radar-mcp · MrChartist/x-algorithm-toolkit (this cluster is the single biggest residual block and the natural Stream D-2). Sports-data remainder (5): nflverse/nflverse-pbp · nflverse/nfl4th · stat-api/mcp · carter-tyra/AIntelligent-Oddz · ruidazeng/the-playmakers (stat-api/mcp in particular is tiny-star/high-fit and should not wait for a star-sorted pass). Business-arsenal remainder (8): talivia-group/talivia · Refferq/Refferq · arkitekt-ai/OpenCRM · achref-soua/helio · lozit/variolab · sublyna/discord-stripe-paywall (404 in ledger §E) · AOSSIE-Org/InPactAI (ledger notes the doc's InPact link resolves here) · NVIDIA-AI-Blueprints/content-localization. Fleet remainder (2): abhi1693/openclaw-mission-control (archived upstream) · catlog22/maestro-flow (no license file). Cluster sub-counts are by primary cluster; several residual items carry wake conditions already recorded in the packet's dormant shelf (§6.4 covers hhvm, the two ruparelmetarya repos, AIProductHome, The-Efficient-Entrepreneur, Building-Business-Ready-Generative-AI-Systems, react-native-starter-kit, up-for-grabs.net and The-HustleGPT-Challenge). **Count check (verbatim): 31 evaluated + 49 residual + 10 Beexly-owned = 90**, reconciling with the §E universe.

**Stream D known gaps (source):** (1) READMEs read in full for all 15 dossier repos and the majority of the tier; for a few ranking-table-only repos (e.g. Dub, Medusa, GrowthBook) the verdict rests on the API record + the packet's prior dossier summary + the repo description, not a fresh full-README read — they are WATCH verdicts, so no adoption depends on them. (2) Two ledger 404s (longomatch, discord-stripe-paywall) were not successor-hunted beyond the ledger's own notes. (3) All figures are a 2026-10-14 snapshot; assume drift and re-verify before acting on any single number.

### 8. Second pass — Stream E: evaluations grown out of the IG corpus (2026-10-14)

#### E1 — Laya as a GSE gate: evaluation design (`stream-e1-laya-eval-design.md` + `laya-eval/eval-set.csv` + `laya-eval/README.md`)

Status: **DESIGNED + ARMED but UNRUN** — no Laya/Jev/Verdict inference was executed in this stream (design + set only, as tasked); no backend was installed; the eval harness itself (state→Openjev→scoring) is designed, not built; the canary states are specified, not yet generated. The completing pull needs DATABASE_URL (Garrett's credential class in the source's framing; not available to this stream and not hunted).

Subject: "Laya" — NandhaKishorM/laya, 32,734★, Apache-2.0, actively pushed (2026-10-12) (corrected, per the corrected GitHub-API pass in `self-archive-dossier-v2-2026-10-13.md` §M11). 421M-param English checkpoint, ~1 GB inference footprint (per design §0). It takes a text/JSON state plus typed questions (Choice / Score / Noul) and returns schema-valid answers with probabilities in one non-autoregressive forward pass. Vendor figures claimed in the corpus (~9 ms P50 / 86.5 decisions/sec) — "the run measures, it does not assume."

Hypothesis H1: given only pre-game state, Laya's pass/reject rulings + confidence identify realized pick quality better than (a) passing everything, (b) a one-feature threshold rule on model-vs-market edge, and (c) chance. H0 (null) is "a live, respectable outcome." Corpus warning preserved: schema-valid ≠ correct — these models "can pick the wrong valid option with a confident face" (notation #2, §B3).

Eval set: 3,081 rows (Tier A 570 + Tier B 2,511), every row built from real on-disk GSE/nflverse data, no row fabricated. Tier A — `A_bridge_holdout`: 570 rows (285 games × 2 markets, bridge model, sealed 2025 holdout 2025-09-04 → 2026-02-08 incl. playoffs; ML 285, SPREAD 285, no TOTAL). Tier B — `B_prod_settled`: 2,511 rows (2,662 production settled picks − 151 in-play removed; ML 1,105, SPREAD 776, TOTAL 630; model versions v5.2.7: 1,545 · v5.1.0: 515 · v5.2.6: 297 · v5.0.0: 149 · v5.2.2: 2 · v5.2.4/v5.2.5/v5.3.0: 1 each; dates unknown — the source CSV preserves no dates). Pass-all baselines (what Laya must beat): Tier A ML 174 W / 110 L / 1 push, −0.080 units/pick; Tier A Spread 135 W / 149 L / 1 push, −0.092 units/pick (47.5% cover vs 52.4% breakeven at −110); Tier B 2,511 rows, 54.8% won (ML 64.8%, SPREAD 46.1%, TOTAL 47.9%) — win-rate only, no prices/units. Tier B outcomes: 1,376 W / 1,135 L. Results are in units, never dollars.

Arms (identical harness): 1. Laya local (Openjev `laya-1.0`, zero-shot); 2. Pass-all baseline; 3. Edge-threshold rule (`edge_vs_market > 0`, Tier A only); 4. Verdict backend (Openjev `verdict-1.4`, 512-token budget); 5. Hosted Jev via Codiv (optional, free tier); 6. (Secondary, later) Laya fine-tuned on pre-2025 settled seasons only.

Truncation constraint (hard): small backends silently truncate — Laya at 1,024 tokens, Verdict at 512. Budget: target state ≤ 700 tokens for Laya, ≤ 400 for Verdict; hard cap: any state over 800 tokens (Laya) is refused by the harness and logged, never sent. Measured on this set: every `gate_state_text` ≤ ~152 estimated tokens. Leakage rules: no outcome field in the state; outcome/label columns joined after Laya has ruled, never by the state builder.

The bar — stated in advance (§5.1, ALL must hold for a shadow-mode seat, Tier A primary): passed-set mean units ≥ +0.02 u/pick pooled with cluster-bootstrapped 95% CI lower bound > −0.02; false-pass rate ≤ 0.40; false-reject rate ≤ 0.60; passed spread beat-close (cover) rate ≥ 52.4%; calibration ECE ≤ 0.07 and Brier ≤ 0.24, AUC ≥ 0.58 (reference: bridge holdout Brier 0.2237 / ECE 0.0519); pass rate 15%–85%, abstention ≤ 25% with abstained-set mean units < passed-set mean; zero truncation-canary failures; schema failure rate < 1%. Tier B corroboration: passed-set win rate ≥ 58% overall (vs 54.8% pass-all) at pass rate ≥ 20%, above pass-all in each market separately. Kill conditions (§5.2, ANY one): passed-set mean units ≤ 0 (or CI entirely below the edge-threshold rule's); AUC < 0.50 or ECE > 0.10 with top-bin overconfidence; abstained set realizes better than passed set; any silent-truncation incident; schema failure ≥ 5%; fails to beat the edge-threshold rule on both primary unit metrics. "Kill" = the experiment verdict only, recorded as current status per the nothing-gets-killed corpus rule, not a permanent ban. INCONCLUSIVE (§5.3) is a legitimate verdict if CIs are too wide (Tier A is clustered: 570 rows over 285 games; SE on mean units roughly ±0.05–0.06u). Shadow rollout (only if §5.1 clears): Phase 0 offline eval → Phase 1 shadow (≥ 2 full NFL weeks, ≥ 100 candidate picks, logged only) → Phase 2 advisory → Phase 3 veto-only consideration, only by Garrett's explicit decision; Laya is never public-facing, never gains pass authority, never touches staking.

What would complete the data (§7, exact pulls): (1) true CLV + lock-time lines via the existing read-only export `scripts/export-settled-picks-for-calibration.mjs` against the Neon DB (requires DATABASE_URL); (2) outcomes for the 16 real 2026 Week-3 engine readings (only 1 of 16 settled in the on-disk snapshot fetched 2026-09-26) via a refreshed nflverse schedules pull (expected yield: 15 additional settled games, 16 total); (3) dates/teams/lines for the 2,511 Tier B picks (same export in (1) supersedes Tier B entirely). No true CLV exists in any on-disk source — `clv_available = false` on every row; spread `beat_close` is the honest realized proxy.

#### E2 — Foreman (thruwire/foreman): demo run, claims vs observed (`stream-e2-foreman-report.md`)

Install: `pip install foreman-core` in an isolated venv → foreman-core 0.5.0 (exactly the name/version the notation promised); PyPI license MIT, home page github.com/thruwire/foreman; GitHub live check 2026-10-14: 754★, MIT, HEAD `381ca2de`, created 2026-09-17 (notation batch 2 recorded 751★ on 2026-10-13). Installed wheel files `cli.py`, `policy.py`, `foreman/simulation.py` are byte-identical to GitHub main.

Demo outcome: **RAN, exit 0, four times** — `foreman demo --repo ./demo-target`, ~1 second, final status FINISHED, including a no-env run (no API key, no config, no home-dir state — key-free claim is real). `foreman run` without a key fails closed: exit 2, `Missing TYPESAFE_API_KEY…`, nothing spawned. Catch: the demo's trajectory is NOT deterministic — run 1 took 5 assessments (CONTINUE → START_WORKER → CONTINUE → CONTINUE → FINISH, verifier never ran, `verification_started=False`) while runs 2–4 took 4 assessments (… → START_VERIFIER → FINISH); the cause is a wall-clock race between the assessment loop and the fake workers' sleeps, not model randomness.

What the demo actually exercises: the real FactoryRuntime, deterministic policy/arbiter, responsibility registry, persistence (`<repo>/.foreman/runs/<run-id>/state.json` + `events.jsonl`, auto git-ignored, tracked files untouched), event stream, terminal UI, and bounded observation building (read-only `git status`/`git diff`, capped). What is fake (the load-bearing part): the "Jev" is a hard-coded list — `DEMO_ASSESSMENTS` = 4 literal FactoryAssessment objects; `FakeForemanModel.assess()` does `del checks` and returns the next scripted score; the "workers" are sleeps with canned stdout (no files edited, no tests run, no coding-agent CLI spawned). Repo test suite (bonus evidence): 430 passed in 9.35s, offline, no network/credentials — and still zero evidence about Jev assessment accuracy.

Policy layer: source-verified deterministic — `FactoryPolicy.evaluate()` selects with `max()` over (priority, confidence) with stable tie-breaking, hard guardrails in code (iteration ceiling → ESCALATE priority 950, etc.); directive priorities are fixed constants (human escalation 1000, RETRY 800, documentation 750, FINISH 700, START_VERIFIER 600, START_WORKER 500, CONTINUE 0); thresholds in TOML match the README exactly: needs_human / worker_stuck / work_off_track / agents_md_drift = 0.80; needs_verification = 0.65; implementation_complete / requirements_satisfied / ready_to_finish / tests_sufficient / documentation_sufficient = 0.75 (range 0.65–0.80, as the notation said).

Claims vs observed (13 claims, source verdicts): #1 install CONFIRMED · #2 key-free deterministic demo PARTIALLY (key/CLI/repo-free CONFIRMED; trajectory timing-racy) · #3 demo sequence PARTIALLY (3 of 4 runs; run 1 skipped verification and still FINISHED) · #4 Jev-only-evaluates / deterministic policy CONFIRMED (policy) / NOT DEMONSTRATED (Jev) · #5 10 typed Noul checks PARTIALLY (checks real; the one parallel Jev request is code-verified, never executed) · #6 thresholds 0.65–0.80 CONFIRMED · #7 same runtime/policy/persistence/UI in demo as real runs CONFIRMED · #8 bounded observations PARTIALLY (code does exactly this; behaviorally untestable in the demo) · #9 workers (Codex/OpenCode/Hermes/Deep Agents, `foreman hook`) NOT DEMONSTRATED · #10 "Jev assessment accuracy is unproven for this use case" CONFIRMED — and the demo does nothing to change it · #11 OpenCode `--auto`, no added sandbox CONFIRMED (source + README) · #12 Codex `workspace-write` sandbox + limits CONFIRMED in source/tests, NOT DEMONSTRATED live · #13 persistence per repo CONFIRMED.

Security notes (source): demo path is genuinely safe (no network client constructed, only read-only git subprocesses, only `.foreman/` writes); real paths are not sandboxed (workers run with the invoking user's full local permissions; OpenCode `opencode run --auto` auto-approves anything not explicitly denied; Codex is the only backend requesting an OS-level sandbox, `workspace-write`, and live steering exists only there); evidence-command providers are arbitrary local code execution by design (central config only — target repos cannot supply them); job text, diffs, worker output tails, and AGENTS.md contents are sent to the Jev endpoint on real runs.

Fleet-fit verdict (source): Foreman judges in-flight work (stuck? off-track? done? needs a human?) — a seat currently empty in the fleet — while Garrett's Review Board judges finished artifacts. What the demo earns: the architecture (typed checks, deterministic priority arbiter, steer-once-then-grace, persisted inspectable record) — "the Merge Sheriff doctrine, productized," plumbing demonstrably works (430 offline tests + a working demo). What it does not earn: a seat as a judge — Jev's assessment accuracy is unproven by the author's own admission, and run 1 shows FINISH can be granted with verification never performed (verification is score-gated, not evidence-gated). First real step, if it gets one: a calibration pilot, not a deployment — ~10 toy tickets on a throwaway repo (never Sports, Codex `workspace-write` only) with a real Jev endpoint, scored against the Review Board. Gap audit: no real Jev assessment was ever made (requires TYPESAFE_API_KEY or an OpenRouter key — the single gap that matters); no real worker backend was run; the OpenJev-as-Foreman-backend pairing was not tested (plausible-by-protocol, undocumented, untested); network-freedom of the demo is code-proven, not packet-proven.

#### E3 (watcher) — Free-tier watcher: build-ready spec (`stream-e3-freetier-watcher-spec.md`)

Status: **spec-only** (build-ready spec, not built in this pass). Owner lane: ARE / fleet infra. Host recommendation: n8n (see Paperclip vs n8n, Seat 1). Watch list: 22 watches — counting method: 1 directory watch + 18 provider watches + 3 meta watches = 22. Tier A — the directory (poll first): A1 freellm.net directory (live check 2026-10-14: homepage states ~500 free models / 30 providers; corpus figure from 2026-10-13 was 502 / 31 / 412 no-card — already drifting, which is the point of watching it; its FAQ already carries the GitHub Models retirement). Tier B — providers Garrett actually routes through or has corpus-flagged (daily), incl. B3 OpenRouter (limits docs + `:free` model count/identity). Tier C — meta / early-warning (weekly). Design: poll cadence per tier; snapshot + storage; change detection by hash diff (every poll) → structured diff (on hash change) → live-call canary (weekly, and on any "provider dark" suspicion); material-change grading (§5); false-positive controls; alert routing into the fleet, by name; build order (§8) — Step 1 fetches each baseline URL once and records the final resolved URL (any 404/redirect replaced and logged; do not ship with an unverified URL).

#### E3 (comparison) — Paperclip vs n8n as the ARE orchestration backbone (`stream-e3-paperclip-vs-n8n.md`)

Recommendation (one line, verbatim): **Use both in different seats — n8n as the ARE backbone now, Paperclip as a bounded pilot for the agent-company layer** — because n8n solves today's deterministic glue (leads, follow-ups, publishing, alerts) with a mature integration catalog, while Paperclip solves a different, later problem (governing a swarm of autonomous agents) that Garrett's MCP bus + OpenDots + crons already partly cover. Neither alone is the answer; replacing the MCP fleet bus with either would be a downgrade.

Fresh repo facts (GitHub API, 2026-10-14): Paperclip (paperclipai/paperclip) 101,682★, 17,051 forks, 6,079 open issues, created 2026-03-02, last push 2026-10-14 05:24 UTC, MIT. n8n (n8n-io/n8n) 207,303★, 61,125 forks, 1,180 open issues, created 2019-06-22, last push 2026-10-14 04:06 UTC, license NOASSERTION. Check against the prior dossiers: the 2026-10-13 dossiers recorded Paperclip at 101,465★ and n8n at ~207K★ / ~61K forks — the live API on 2026-10-14 confirms both (Paperclip 101,682★ is ordinary one-day growth). (Erratum, same day, in the source: an earlier draft of this note carried lower counts for both repos from a garbled API read; the figures above are from two clean, complete API responses and supersede that draft.)

Licence — the decisive asymmetry (source heading): Paperclip is MIT; n8n is fair-code / Sustainable Use (NOASSERTION) — internal use fine, offering n8n itself as a hosted service to clients is not. Comparison highlights: cost observability / token control is Paperclip's strongest point (token/cost tracked by company, agent, project and model; per-agent monthly budgets with warning thresholds, hard stop + auto-pause at limit, queued work cancelled on overspend) vs n8n's execution-level logging with no native per-agent token budget / hard spend cap. Maturity/risk: Paperclip repo ~7 months old, very high issue count (6,079 open), single-vendor, no cloud fallback — MIT removes licence risk, youth is the risk; n8n since 2019, company-backed, cloud escape hatch — risk is licence scope and enterprise-feature gating, not survival.

Seats (source): Seat 1 — Backbone (adopt now): n8n, self-hosted; condition: all LLM calls from n8n go through Garrett's OmniRoute endpoint with a budget-check step; never expose the n8n editor publicly without auth + tunnel/VPN. Seat 2 — Agent-company pilot (bounded, not backbone): Paperclip owns one experiment mirroring a single ARE lane (e.g. Kit outreach research: CEO agent → researcher → drafter), per-agent budgets set before the first unattended run, board approval required for any external send, a 14-day honest scoreboard in the @lasthumannode format (revenue, spend, accepted outputs — including zeros); success criteria set in advance: cost per accepted output beats the current OpenDots/cron path, and zero gate violations — if it fails either, the pilot ends and the pattern is ported as ideas into the MCP bus. Do not migrate the MCP fleet bus, Review Board dots, or GSE engine tasking into Paperclip. Seat 3 — Unchanged: MCP fleet bus + crons + OpenDots. What NOT to do (source): do not run either tool unwardened against metered frontier models — "The $20-in-10-minutes burn is the documented default, not an edge case."

### Session gap audit (what this section does NOT contain)

- Notation batches 1–2: complete — every item in both source files is above; no item dropped.
- Self-archive dossier: condensed by design — the 774-entry self-DM index, the 267 saved-post dossiers (§2.1–§2.268 + addendum), the 500 v1 liked-post entries, and the 164-post creator sweep record are in the source file, not reproduced here; counts, stream findings, deep-dossier items, action list, and flags are above.
- Stream A: 356 dossiered items are represented by counts, lane triage, batch ranges, and headline items above, and by one TSV line per dossiered shortcode in the companion index; the 298 blocked shortcodes are represented by the verbatim breakdown (285 + 13) and the per-item log in `stream-a-log.md`, not by individual lines here.
- Stream C: the 10,278-item index is `stream-c-likes-index.md` in the source directory, not reproduced; the 36 notations / 49 items, category counts, and gap audit are above.
- Stream D: the 31 evaluated repos are fully tabled; the 49 residual repos are listed by cluster as far as the source's closing note was read — the binding total is the source's count check (31 + 49 + 10 = 90).
- Stream E: Laya eval is designed + armed but UNRUN (needs DATABASE_URL for the completing pull); Foreman's real Jev judgment was never tested (no key); the free-tier watcher is spec-only; Paperclip vs n8n is a settled comparison, with n8n as Seat 1 and Paperclip as a bounded Seat 2 pilot.
- A separate `self-archive-dossier-v2-2026-10-13.md` exists in `~/workspace/your_files/` and is cited by Stream E1 for the corrected Laya figure (32,734★ (corrected)); it was not one of the sources assigned for full reading in this pass, so no v2-only content beyond that cited correction is claimed here.

### Consolidation note — the v2 dossier (read this before citing v1 numbers)

A second file, `~/workspace/your_files/self-archive-dossier-v2-2026-10-13.md` (640 KB), is the **Deep Edition** and **supersedes v1 for the Instagram + creator sections**: every substantive item was re-researched from the opened source. Its own coverage statement reconciles to: 774 self-DM entries (745 share-type — 669 with URL + 76 inline exposing no content — 2 genuine texts, 27 nulls); 654 unique shared posts, of which **643 are DM-only targets whose v1/v2 data is URL-only** (no captions, no author handles) — only 5 are identifiable from the URL alone; 267 saves (45 dossier sections + 224 one-line appendix classifications + 2 addendum dossiers); likes 500/500 accounted (40 full dossiers covering 44 items); creator sweep 164 posts (107 dossier entries covering 128 posts, 36 appendix-classified); 100+ sources opened. **In this consolidation, the Oct 13–14 section above condenses v1 + the second-pass streams; v2's per-item dossier text was not re-read line-by-line in this pass** (its coverage accounting and the corrections it carries — e.g. Laya 32,734★ (corrected) — are included). The 638 not-content-dossiered DM-only targets in v2's framing are the same population the second pass attacked as Stream A: 654 attempted → 356 dossiered → **298 still blocked/unclassified**, which is the live open number carried into the gap audit at the end of this document.

---
## ONE-OFF — Oct 26, 2026: shared reel dissected on arrival

Reel: @wassimyounes_ (Wassim Younes), posted 2026-10-26 11:18 CT — tech-news roundup, 3 items. Dissected directly per the no-messaging rule (the "comment GPU" gate was NOT triggered; projects found at source). Source: 2026-10-26 daily log.

- **Item 1 — VERIFIED: Zagitta "gpu-unlock"** (GitHub, GPL-2.0, v1.0.0) — Linux kernel module removing NVIDIA's half-rate cap on FP16/BF16 Tensor Core ops with FP32 accumulation on GA102/103/104/106 (RTX 3060–3090 Ti). Project benchmarks @450W 3090 Ti: FP16 87.46→118.39 TFLOPS (+35%), BF16 87.50→157.41 (+80%), TF32 42.58→82.61 (+94%); real-world ComfyUI +47–59%, vLLM prefill +14–36%, TTFT −25%, decode unchanged. Corroborated by TweakTown, VideoCardz, Hardware Busters, BigGo (Oct 24–26, 2026).
- **Item 2 — VERIFIED: gpu-unlock-ada by JustAResearcher** — RTX 4090 FP16 165.6→331.6 TFLOPS, BF16 165.5→330.6 (2.0×); INT8/FP8 unmoved; RTX 20 also done (KohakUnlock). Limits: Linux-first; Windows only via experimental UEFI path; changes clear on power loss; experimental label.
- **Item 3 — UNVERIFIED** (the caption itself flags it): researcher "log4j" claims re 2025 Samsung TV ad/telemetry capabilities; continuous-recording claim unverified (Tom's Hardware).
- GSE relevance: cataloged, not wired — applies only if a fleet machine runs a consumer RTX 20/30/40 under Linux for local inference; neither of Garrett's hosts has a GPU on record.
## SESSION — Oct 27, 2026: self-DM shares + Suggested feed sweep (rounds 1–2)

**Coverage:** Sources: `IG-SWEEP-2026-10-27.md` (round 1 + deep-context addendum), `MASSIVE-RECON-2026-10-27.md` Part 1 only (round 2 Instagram; Parts 2–5 are X/GitHub, out of Instagram scope except for totals/convergence), `GAP-REPORT-2026-10-27.md` (closing gap pass), spot-checked against working files in `ig-sweep-2026-10-27/` (batch-1..4, deep-batch-A..D — all headings/content confirmed present in the compiled sweep; round2/*.md — the source files for MASSIVE-RECON and GAP-REPORT). Self-DM window Oct 12 14:53 CT → Oct 27 10:56 CT: **50 shares: 49 posts + 1 profile share; 50 of 50 messages returned, 49 of 49 posts fetched, 0 rate limits in round 1**. 11 Oct 12–13 items already on record (not redone, listed below); **39 new items** dossiered. Round-1 ranked home feed: **50 items: 40 regular posts + 10 ads** (confirmed in file). Deep-context pass: extraction stopped at item 31 on Instagram **429**; 12 DM items re-run — **9 payloads recovered in full, 3 in part**; **17 feed Suggested tool posts fully dissected** (Batches C+D: 7 + 10). Round-2 feed (fresh scroll 3:14–3:19 PM CDT): **50 items: 40 posts + 10 ads, 1 repeat of round 1** (item 19 = round-1 feed-4); self-DM check: **0 new shares**. At MASSIVE-RECON point: **9 round-1 items still un-extracted / deferred** (429 stop). GAP-REPORT closure: **all 9 deferred + Garrett's linked reel + 4 unread profiles later READ via the signed-in browser route (4:51–4:58 PM CDT)** — final outcomes below. Day totals (both Oct 27 reports): **275 distinct named items; 11 in PACKAGE-REGISTER.md; 264 not; 114 distinct GitHub-section repos, none in the register by name. 298 of 654 historical DM shares still unclassified** at that date. Verdicts below are the sources' Disposition lines, verbatim in substance; later corrections are marked (corrected).

### Round 1 — DM-share dossiers (39 items)

- **Item 11 — @angus.sewell, "Angus the Nontechnical"** — profile share; AI creator teaching non-technical people paste-ready agent/workflow systems, prompts via comment-keyword DM, paid membership on angussewell.com — **Catalog — high-value source account. Candidate for the content/fleet-ops lane whenever Garrett wants the testing-loop system rebuilt from the public Statur version rather than the gated prompts.**
- **Item 12 — "The X Subscription" + Gemini 4 Argon** — news reel: Cursor folded into a real bundle ($8–$200, shared usage pool, third-party models API-metered); Argon "crushing" benchmarks are Google vendor numbers, trails Opus 5.5 on terminal/agentic work — **Candidate for a lane — agent fleet / AI infra (subscription decision input; Argon as a priced long-context option).**
- **Item 13 — AutoResearchClaw** — real open-source idea-to-paper research pipeline (23 stages, verified citations → sandboxed experiments → LaTeX paper); "free" ignores LLM API costs — **Candidate for a lane (agent fleet / research pipeline — evaluate as a citation-verified research runner; at minimum mine the 4-layer citation check design).**
- **Item 14 — Harness²** — real open-source framework (Apache 2.0, runs on OpenCode) rewriting an agent's prompts/tools/memory while the model stays frozen; +11.5-point bench claim checks out exactly — **Candidate for a lane — agent fleet / local AI infra. Strongest item in this batch.**
- **Item 15 — MadsLorentzen/ai-job-search** — Claude Code job-search system, real repo, MIT, ~59k stars: /setup /scrape /apply /interview, drafter + fresh-context reviewer, LaTeX CVs, ATS checks; creator funnel numbers creator-reported; /setup writes personal data into tracked files — private clone only — **Candidate for a lane (personal/job-search). Highest-actionability item in this batch.**
- **Item 16 — DeepSeek V4.1-Flash-1017** — model real (MIT weights, ~1/40th frontier cost); reel headline "beat Opus 5.5 and GPT-6.1 Sol" REFUTED — DeepSeek's own table compares against prior generation only — **Candidate for a lane — agent fleet / local AI infra (model-routing input for the OpenCode lane). Headline claim logged as creator exaggeration.**
- **Item 17 — CleanYourTV** — verified: Claude Code + ADB debloat for Android/Google TVs (not Samsung/LG) — **Candidate for a lane (personal / Family Shield — usable as-is on any Android TV or Google TV in the house; skip if his TVs are Samsung/LG).**
- **Item 18 — @sportskmac NFL reel** — first pass: caption pure gate bait, content not recoverable — **Cataloged, no current lane fit — unevaluated gap (video content + gated link unrecovered).** Superseded by deep pass dm-18 (below).
- **Item 19 — Angus Sewell ChatGPT workflow (sponsored)** — first pass described as content-testing workflow — **Cataloged; the system is a candidate for the content lane via the public Statur version. The gated prompt drop itself: gated-unrecovered, no need to chase it.** (corrected) — see dm-19: the reel is actually the Fake Door Test, not the content-testing loop.
- **Item 20 — @quantscience_ image post, empty caption** — **Cataloged as an unevaluated gap — retry only with image access.** Superseded by dm-20 (below).
- **Item 21 — "Claude just jailbroke a PS5, a TV and a BMW"** — real events inflated into one false claim; no evidence AI cracked the PS5 — **Cataloged — reference specimen for claim-inflation; no lane fit as a tool.**
- **Item 22 — OpenAI Decisions API** — real (beta Oct 6, GA Oct 22): typed probabilities/choices at $0.10/M input tokens; "Jev killer" is vendor spin — Jev is cheaper and ranks ahead on public benchmarks — **Candidate for a lane — agent fleet tooling, possible GSE gate component.**
- **Item 23 — Meta Muse Gadgets** — verified almost in full: open SDK (Apache-2.0), exactly 5,000 free units for US Muse subscribers; pairing needs an SDK token, retail dongle can't be reflashed — **Candidate for a lane (agent fleet + local AI infra / home).**
- **Item 24 — "AI moved fast this week" news carousel (7 claims checked)** — **Candidate for a lane — agent fleet security (SPACE as sandbox reference; OpenCode Console breach as a key-handling case study). Remainder cataloged as verified news.**
- **Item 25 — Angus Sewell: reverse-engineering $10k coaching funnels with AI agents** — **Candidate for a lane (revenue engine / competitor research — adopt the public-source teardown pattern; the skill repo is the recoverable payload).**
- **Item 26 — @ariacodez API-key exposure awareness reel** — **Cataloged, no current lane fit — awareness content, no payload beyond standard practice.**
- **Item 27 — @ariacodez "insane free resource for learning cybersecurity"** — first pass: resource never named in caption — **Cataloged — unevaluated gap on the reel's actual payload.** Superseded by dm-27: resource is pwn.college (below).
- **Item 28 — "5 tools turn Claude into your web designer, animator and QA tester" (gated list)** — 1 of 5 verified to a public equivalent in round 1, 4 best-effort inferences — **Candidate for a lane — Kit / autonomous revenue engine (the design-skills ecosystem, adopted on the public repos' own merits). The gated list itself: cataloged, gated-unrecovered.** Deep pass dm-28 below.
- **Item 29 — "Gatekept websites" Part 1133: DeepWork, GetFreeSnacks, The Hustle Blower** — **Cataloged, no current lane fit (content recovered from the video; all three sites unverified).**
- **Item 30 — @ariacodez "one tapped picture hands over your IP"** — mechanism verified (tracking links log tapper's IP + device); impact overstated — IP gives ISP and rough city, not identity — **Catalog — Family Shield awareness, accurate mechanism with an overstated impact claim.**
- **Item 31 — @carterperez.dev "Comment OSINT and I'll send you the links"** — **Cataloged, no current lane fit for the gated payload (gated-unrecovered); creator's public repo cataloged as the source of record.** Superseded by dm-31 (payload recovered in full).
- **Item 32 — Carter Perez OSINT links reel (comment-gated)** — **Cataloged, no current lane fit beyond a pointer to the public GitHub repo. Payload gated-unrecovered.** Superseded by dm-32.
- **Item 33 — Carter Perez: three OSINT tools (FaceCheck.ID, Robin AI, Airplanes.live)** — recovered from video without the gate — **Cataloged — Airplanes.live candidate for the OSINT lane; Robin cataloged with OPSEC warning; FaceCheck.ID cataloged, excluded by the standing no-facial-recognition rule.**
- **Item 34 — @sebastianhardy_ "what just happened in AI in the last 24 hours" carousel** — **Cataloged, no current lane fit — unevaluated gap (slides unread, links gated).** Superseded by dm-34.
- **Item 35 — REA (Reverse Engineer Anything, morluto/rea)** — MIT MCP server letting an agent drive Ghidra/Hopper/IDA, findings labeled observed/derived/inferred; finds structure, not logic; not a sandbox — **Candidate for a lane (OSINT/Family Shield tooling + fleet MCP catalog). The most technically substantial item in this batch.**
- **Item 36 — RAG-Anything (HKUDS)** — real, but capabilities merged into LightRAG v1.5, standalone repo unmaintained — **Candidate for a lane — GSE engine research / corpus infrastructure, via LightRAG as the live vehicle.**
- **Item 37 — CuPy** — fully verified, mature; independent benchmarks support claimed speedups on suitable workloads — **Candidate for a lane (GSE engine compute — benchmark CuPy on the heaviest NumPy jobs wherever a GPU is available).**
- **Item 38 — @vikasingh neuron-steering reading list (Monosemanticity + Cammarata)** — **Catalog — personal research reading list, both sources verified real.**
- **Item 39 — NVIDIA SimReady Central** — 2,575 simulation-ready 3D assets on Hugging Face — **Cataloged, no current lane fit (recorded, not killed — if a simulation/world-model lane ever opens in the engine research program, this is the asset library of record for it).**
- **Item 40 — Grok for Startups (SpaceXSI)** — real program (x.ai/startups); carousel's "1:1 spend match for six months" appears nowhere official — unverified; eligibility requires venture backing + live product — **Candidate for a lane — autonomous revenue engine / funding watch, flagged eligibility-gated. Headline match claim logged as unverified.**
- **Item 41 — Angus Sewell "My actual system" — AI content-testing loop (Hormozi method)** — **Candidate for a lane (content operations — the KEEP/CHANGE/CUT + lessons-ledger loop, via the public STATUR reconstruction).** Confirmed in full by dm-41.
- **Item 42 — Clueso** — real funded company; "recreate any ad around your brand" is a paid creator's framing of a product-demo tool; 50%-off link is gated affiliate bait — **Candidate for a lane (weak) — Kit/revenue content tooling; core company and feature verified, ad-specific claim is creator framing.**
- **Item 43 — @itstundeanthony "Comment 'brag' for the setup guide"** — **Cataloged — unevaluated gap (caption carries no recoverable content; payload behind a DM gate).** Superseded by dm-43: Brag (below).
- **Item 44 — @wnbadata / Maddy Brown "How to actually learn sports analytics"** — verified almost line by line: Rice SMGT 430, Lopez GitHub course, Deshpande open STAT 479, wehoop with shipped RAPM datasets; free — **Candidate for a lane — GSE sports engine (methods curriculum + data-package pattern). Highest-priority catalog entry in this batch.**
- **Item 45 — "SHADOW INDEX — PROXY RELOAD"** — black-hat SEO traffic-inflation script (rotating proxies + fake hits), detectable and penalizable — **Cataloged, no current lane fit — flagged as black-hat; do not use. (Kept, not killed: the recognition value is the value.)**
- **Item 46 — deep-hlr** — real GitHub tool, thin wrapper over paid Defastra API; headline "social accounts + geolocation" fields unverified vendor data — **Catalog — OSINT reference, defensive context only; tool verified real, data quality of its headline claims unverified.**
- **Item 47 — Memvid** — real (Apache-2.0, ~12.6k stars); .mv2 format spec matches claims; circulating benchmarks project-adjacent, not independent — **Candidate for a lane (agent fleet + local AI infra). Catalog the repo; any trial should be a measured bake-off against his current markdown/SQLite memory, not a leap.**
- **Item 48 — LEANN** — verified mechanism (arXiv 2506.08276): recompute pruned embeddings on demand — 6 GB vs ~201 GB for 60M chunks, paid for in retrieval latency — **Candidate for a lane — local AI infra / personal knowledge base. Catalog the latency trade-off with it.**
- **Item 49 — @quantscience_ carousel, empty caption** — **Cataloged as an unevaluated, image-only gap — content not established; do not infer.** Superseded by dm-49.

**Already on record — not redone (11 of the 50):** Oct 12 @linemakersports "Easiest Way to Predict an NFL Score!" (DeW20ZwAW3L); Oct 13 @jakeswiz Assembly/security (DeZws1TtQH_); @bestapps.ai "$0 Test Setup Kit" AI trading bot (DeKalHoDNnd); @simplifyinai Microsoft AI resources (DeWlTIZGdZF); @karlestampador ML resume projects (DeXbkJqyqHG); @incmagazine Anthropic founders program (DePGXlIDK-0); @seb.ai 6 Grok bots trading system (DeOPnJDltkN); @simplifyinai AI coworkers (DeR2Qllm6aP); @ariacodez one tool / 34 AI providers (DecKfjAKnQR); @prediction_alpha copy-trading routine (Ddz_2_jRkbI); @angus.sewell "angle" prompts (DecRIB6RWF-).

**Following feed sample (connector, appendix):** page 1 only — @elevationworship, @mlb, @kngstoic, @brainmdhealth, @nfloncbs; none tool/improvement content.

### Deep-dive addendum — deep-context pass (Oct 27, 11:59 CT order)

Headline: 12 DM items re-run — 9 payloads recovered in full, 3 in part (partials missing only DM-only convenience material: bare URLs, repo names, or literal prompt wording, with public substitutes on file). Revised gap audit: **DM window unevaluated-at-content-level is now ZERO.**

- **dm-18 — Linemate (@sportskmac, DeM5XlzzJuT)** — gated "site" named on screen: Linemate, NFL props hit-rate cheatsheets — **cataloged as competitor reference. No purchase, no signup, no follow.**
- **dm-19 — Fake Door Test (@angus.sewell, DerzAbwtNts) (corrected)** — ChatGPT Work builds two waitlist pages, emails dormant CRM contacts, 3-day read, build the winner; NOT the content-testing loop — **protocol cataloged. The gated prompt text is not needed.**
- **dm-20 — Free Python quant stack (@quantscience_, DepZC77lF3L)** — entire list recovered from the image itself (screenshot of Quant Science's own X post, Oct 18, 2026, 19:04) — **cataloged. No signup, no purchase, no action.**
- **dm-25 — Decompiling $10k coaching funnels (@angus.sewell, Deh4GM9tIO-)** — method + worked examples confirmed step-by-step from video — **cataloged. The MIT skill is the adoptable artifact if Garrett wants funnel teardowns run; the creator's gated prompts are unnecessary.**
- **dm-27 — pwn.college (@ariacodez, DehaGWFqHPB)** — unnamed resource named on screen: pwn.college, free, "Learn to Hack!" — **cataloged as a free training resource for the Family Shield lane.**
- **dm-28 — 5 Claude design tools (@simplifyinai)** — payload recovered in part; five functions shown in slides — **Catalog the five-function pattern as a Kit production checklist. Do not chase the DM list.**
- **dm-31 — Three "websites hackers use" (@carterperez.dev, 2026-06-18; 23,928 likes / 15,886 comments)** — names recovered in full: Grayhat Warfare, GeoSpy/Raven, cyberthreat maps — **Grayhat Warfare is a legitimate defensive exposure-audit tool; GeoSpy/Raven on the exposure-awareness list, not in an offensive workflow; cyberthreat maps situational-awareness wallpaper; catalog all three.**
- **dm-32 — Three more OSINT sites (@carterperez.dev, 2026-06-15; 36,010 likes / 12,387 comments)** — Reddit-archive tooling, camera aggregator, MarineTraffic — **Reddit-archive: defensive use (audit own accounts); camera aggregator awareness-only, not to be used to view other people's feeds; MarineTraffic neutral public utility; catalog all three.**
- **dm-34 — 11-slide AI news roundup (@sebastianhardy_, 2026-10-23; 32,822 likes)** — stories recovered in full; link pack DM-only — **Catalog the roundup as verified-mostly-true. Flint gets a catalog entry with its hardware caveat.**
- **dm-41 — Content-testing system (@angus.sewell, 2026-10-26)** — method recovered in full; exact prompts DM-only — **Method recovered; prompts not needed — implement from the public STATUR loop if Garrett wants it.**
- **dm-43 — Brag (@itstundeanthony / Tunde Alao, 2026-10-22)** — payload recovered in full: Brag (latent-spaces/brag), MIT Claude skill that makes a launch video from project code — **Strongest single-tool find in batch B. Catalog as test-when-ready; output quality contested ("generic slop" charge in comments) — judge on one real Kit/GSE project.**
- **dm-49 — Hidden Markov Models in algorithmic trading (@quantscience_, 2026-10-25; 105 likes)** — 7-slide carousel recovered in full — **Catalog as a methods note: HMM regime inference, textbook-accurate, with the RenTec framing corrected to 66% gross / 39% net (corrected).**

**Feed Batch C (7 dissected):**
- **feed-1 — "20 Claude GitHub Repos" (@codingknowledge, De9SUccyZF-)** — list printed on image; gate decorative — **Agent fleet / local AI — catalog.**
- **feed-4 — "Beyond Prompting: Autonomous Factor Investing via Agentic AI" (@quantscience_, arXiv:2603.14288)** — Huang and Fan paper — **catalog the paper as a methods reference for the factor-discovery lane; performance numbers labeled UNVERIFIED (preprint, self-reported).**
- **feed-8 — "6 GOVERNMENT DATABASES YOU DIDN'T KNOW WERE PUBLIC" (@technologybrief, DeZ4G90mTqB)** — six free federal databases incl. EDGAR, USPTO — **catalog as an OSINT reference card.**
- **feed-10 — CINDY (@githubprojects, De1y3m9PyCt)** — open-source agent mixing harnesses (Claude Code + Codex, now also Pi), plan → parallel-execute → independent-review; only client open source, backend closed — **candidate — fleet architecture reference; evaluate before any install.**
- **feed-11 — Halupedia (@simplifyinai)** — halupedia.com, "library of AI hallucinations," synthetic by design — **catalog (curiosity item) + blocklist recommendation: halupedia.com belongs on the ingestion blocklist.**
- **feed-13 — wifit3 v0.4.3 by derv82 (@dayofexploits, DeZuHo5iYuY)** — Wi-Fi auditing tool on Kali — **catalog, defensive-use-only: own-network auditing only.** Identity note: this URL was inventory-labeled @the_coding_wizard — (corrected) in Batch D corrections / GAP (see deferred).
- **feed-14 — 'xcape' repo / Proliv4.exe / Hermes MaaS (@carterperez.dev)** — walkthrough of Russian malware lure repo (fake X-scraper), loader fires on import; 99 lure repos across X-scraper/OSINT/AI categories in the underlying record — **catalog, high defensive value.**

**Feed Batch D (10 dissected):**
- **feed-17 — llm-d (@dailydoseofds_)** — Kubernetes LLM inference, prefix-cache-aware routing, v0.8, Apache 2.0 — **catalog — inference-serving reference; no current build fit.**
- **feed-19 — P(doom) music video in p5.js (@gittrend.io)** — Claude paints a music video, repos sepvej/PDoomVideo (+ mexicat/pdoom-video) — **catalog — creative-coding reference; barred from game-footage use by the standing video rule.**
- **feed-21 — Paperclip rent challenge, Days 9–10 (@lasthumannode, DeftCX3qIZW)** — ledger −$35 against a $1,500 target — **catalog — attach as field evidence to the existing Paperclip entry; the bounded-pilot settlement stands (n8n = ARE backbone, Paperclip = bounded pilot).**
- **feed-24 — Lemo-Opuscar (@gittrend.io)** — Claude Code skill directing short films in code; repo 8,571 stars, 962 forks, MIT/CC BY 4.0 — **candidate for a lane (content/explainer, non-game).** Style count **59, not 51 (corrected)**.
- **feed-27 — "5 Gadgets You Can Build Yourself This Weekend" (@technologybrief, De2_FvjjkU0)** — incl. $4/RP2040 BadUSB-class slide (defensive read, no build content reproduced), Pi-hole, LoRa mesh; prices $4 / $100 in post contradicted in verification — **catalog — security-awareness and home-network notes.**
- **feed-33 — Four AI agents in 10 weeks (@power.ai, De_Y38DldEj)** — Grok Bot vs Muse vs Dots vs Claude Duet; Dots requires $100/month Pro, Duet included with Claude Pro at $20/month — **catalog — agent fleet / competitive landscape** (Dots price nuance (corrected): Dot included in the $100 Pro tier, not a separate charge).
- **feed-34 — nnInteractive Agent (@simplifyinai)** — DKFZ tool connected to Claude Code/Codex; 14 scans, 51 targets, Dice 0.81 to 0.84; arXiv 2610.31080; bundle media_understanding empty (owned gap) — **catalog — architecture-pattern reference for the agent fleet.**
- **feed-35 — OSSU Data Science (@softwarewithnick)** — ossu/data-science, 22,328 stars, 4,356 forks, ~2 years at ~20 hours/week — **catalog — learning-path reference.** "All free" narrowed (corrected) to "free syllabus, variable course economics."
- **feed-39 — Free My TV (@gittrend.io, De7HSFtkp60)** — simbasjungles/free-my-tv (corrected spelling), MIT, ~4,910 stars, 807 forks, ad-free home screen for Google TV/webOS/Tizen — **candidate for a lane (personal/home), cataloged with install path and caveats. Nothing installed.**
- **feed-40 — Obscura (@drcintas, De9kMGeShp9)** — h4ckf0r0day/obscura, Apache-2.0, Rust headless browser for agents, CDP-compatible, ~30 MB — **candidate for a lane (fleet tooling trial).** Star count "28,000" unconfirmed (corrected): 20,002 documented Aug 5, 2026; 40-vs-3 figure is the project's own graphic.

**Round-1 feed inventory (remaining, inventoried only):** #2 @thelocktalk NBA 3pt; #3 monday.com ad; #6 @jrrivas17 roofing; #7 Granola ad; #9 @des_dinsdale homecoming; #12 Granola ad; #16 @court_lane28 youth baseball; #18 Runway ad; #20 @invested.hq finance; #22 Fanatics Markets ad; #23 @arshman content photo; #26 @sportscenter LaMelo; #28 Azure ad; #29 @lasthumannode carousel; #30 @thebetterbull AI-financing alarm; #31 @micole.austin; #32 MongoDB ad; #36 @pureathleteinc; #38 Mercury ad; #42 Context.dev ad; #44 @jilliankeeper; #46 @houseofhighlights; #48 Viktor AI-employee ad; #49 @thecamryncole. Tool-class subset counted in source: 17 items (12 named finds + 5 @dayofexploits tool-name posts).
**Round-1 deferred list (at deep-pass / MASSIVE point, 9 items):** feed-41 @ariacodez smart-glasses, feed-43 OpenTakeoff, feed-45 @sahib.creator Goldman, feed-50 @esgeeks Stalkie, @dayofexploits doe1–5 (r4ven, wifit3-slot, Thief Raccoon, MY-WIFI---, Undetectable), and @the_coding_wizard list — final outcomes in Round 2 closures below. Note: feed-13 wifit3 was in fact dissected in Batch C; the @the_coding_wizard post was NOT extracted then and joined the deferred list (corrected #13/#15 swap).

### Round 2 — MASSIVE-RECON Part 1 + GAP-REPORT closures

**Counts:** Self-DMs 0 new. Feed: 50 items (40 posts + 10 ads), 1 repeat (item 19). Deferred at that point: 9 items un-extracted, 429 stop on first connector call. Value profiles: 12 profiles named by Garrett.

**Round-2 feed items with an actual finding (all other 50 are inventory lines in MASSIVE-RECON §1B / feed-inventory-r2.md, carried as counts above):**
- **R2-2 — Shannon (@someonenamenicky, DegvQ5gSqs5)** — "Best hacking tool" reel showing Shannon AI pentester, billed for bug bounty hunters. Same Shannon as Garrett's linked reel and @marc.kaz's newest post — 3 surfaces in one day (GAP).
- **R2-9 — @simplifyinai drone 3D-mapping reel (De9WMWTxQ99)** — drone maps forest in 3D following a runner (no GPS); "Comment 'AI'" gate — not acted on.
- **R2-15 — instaloader (@dayofexploits, DdzJ3erCUSI)** — text graphic about the tool instaloader; inventory only.
- **R2-19 — "Beyond Prompting" (@quantscience_, DfAPYDCFMrn)** — repeat of round-1 feed-4, already fully dissected (arXiv:2603.14288).
- **R2-20 — "10 best Github repos for Claude" (@aiagently, DedkCc6olmo)** — names visible: REA, Ponytail, Hallmark, Humanizer, Onyx, Impeccable, UI/UX Pro Max, Last 30 Days, Scrapling, Diagram Design.
- **R2-23 — Genie 4 (@evolving.ai, DfAobiiDKzZ)** — "Google has unveiled Genie 4, a new AI model that lets you create and explore entire playable worlds…" — inventory line, creator claim as stated.
- **R2-25 — $7 ESP32-S3 iPhone control (@circuit_digest, Dejmjq9O-PB)** — AI controls an iPhone using a $7 ESP32-S3 board, AirPlay + USB — inventory line.
- **R2-27 — Free-tools poster (@theopenstack, DfAKyS2iS_z)** — "Most people are paying for tools that developers are giving away for free." — inventory only.
- **R2-39 — Earshot (@gittrend.io, De_b6mpD88Q)** — "gives your AI coding agent ears — it can hear what a sound file sounds like, judge if it fits…" — inventory line.
- **R2-48 — "You deleted it. Your phone kept a copy." (@theartificialintelligence, De_1Z69o4ZW)** — inventory only.
- **R2-50 — "10 GitHub repos that help you build an AI employee in 5 minutes" (@hasantoxr, DeeksLymAvI)** — inventory only.
- Ads (10, inventoried only, never read as data — GAP §7): @chewyvetcare, @elevenlabs ElevenAgents, @openai, @wisprflow, @chatgpt, @capitalone, @link (Stripe), @oakley_us (Houston in-store event Thu Oct 29, 6–9 PM), @sonos, plus one further ad in the 50-count as listed in the source scroll. GAP residual: round-2 feed 36 posts remain inventoried-only after the deferred closures; 10 ads inventoried only.

**Deferred items — FINAL outcomes (source: GAP-REPORT-2026-10-27.md §1, from ig-deferred-read.md, browser route 4:51–4:58 PM CDT; all 10 posts + 4 profiles loaded, nothing still unread in that set):**
- **Garrett's linked reel DXW_055D7GF (@work_withdaas) — Shannon** — KeygraphHQ/shannon, AGPL-3.0, open-source AI penetration-testing tool, described as "Claude Code for hackers" (speaker's claim: #1 GitHub trending repo of its day).
- **feed-41 — Nearby Glasses (@ariacodez, DfAPy0tKnxq)** — app scanning nearby Bluetooth for smart-glasses IDs, repo yjeanrenaud/yj_nearbyglasses (2.5K stars as shown); caption: "it's a clue, not proof." One top comment reports it did not work against Meta glasses (commenter's claim).
- **feed-43 — OpenTakeoff (@github_dev, DeUTZhTSNOd)** — kentucky-ai/opentakeoff, open-source browser-based construction takeoff, auto-detects room boundaries/square footage, audit trail on every number, repo link was in the caption the whole time.
- **feed-45 — Goldman Sachs 10,000 Small Businesses (@sahib.creator, De1xSxbzaFm)** — 12-week, fully funded business training, all 50 states; 71% revenue growth within 18 months and 18,000+ graduates are the program's own reported figures.
- **feed-50 — Stalkie (@esgeeks, DeKDotTkehK)** — ashendilantha/stalkie, Go username OSINT checker, 13+ platforms, 0–100 confidence score per result, Tor/proxy, CSV/JSON export; example scores in image: Pinterest 79%, Medium 78%, Behance 78%, Twitch 78%, TikTok 74%.
- **doe1 — r4ven (@dayofexploits, DePl4juk3TI)** — spyboy-productions/r4ven, phone/PC location-and-photo capture via Discord webhook — awareness-only: threat model, not a tool for use.
- **doe2 — @the_coding_wizard 10-repo carousel (DeTVl8BCHIk) (corrected)** — NOT @dayofexploits; this fully closes the round-1 #13/#15 swap. The 10: Cobalt (imputnet/cobalt), SearXNG, Reactive Resume, changedetection.io, Suwayomi, LibreTranslate, gallery-dl, ArchiveBox, LocalSend, Vaultwarden. Star counts on slides are creator's figures; slide 2 body mistakenly repeats Cobalt's (flagged by commenters).
- **doe3 — Thief Raccoon (@dayofexploits, De48NVSAfTI)** — login-phishing simulation tool (fake OS login screens) by @davenisc — awareness-only.
- **doe4 — MY-WIFI--- (@dayofexploits, De-AAmDlsm1)** — Python utility (github.com/cyb3r-luckysant) recalling saved Wi-Fi passwords on one's own machine.
- **doe5 — Undetectable (@dayofexploits, DeAKe_zj7Qr)** — Metasploit payload generator (github.com/kinghacker0/Undetectable) evading Android antivirus — awareness-only.

**Value profiles — 12 named by Garrett (headlines):** 1 @angus.sewell, 2 @ariacodez, 3 @simplifyinai, 4 @carterperez.dev, 5 @iwillgroupe, 6 @wassimyounes_, 7 @marc.kaz, 8 @gittrend.io, 9 linked reel DXW_055D7GF (Shannon, above), 10 @therealyanjigb, 11 @phanik.ig, 12 @itstundeanthony. @wassimyounes_: 73.1K followers, 311 following; following list transcribed from Garrett's 4 screenshots (~42 unique visible of 311 in MASSIVE; GAP following-lists pass later completed it: 311 of 311).
**4 unread profiles — now read (GAP §1):**
- **@iwillgroupe ("Hachikō")** — 15 posts, 933 followers, 7 following; "SHADOW INDEX — PROXY RELOAD" post — same name flagged black-hat in round-1 Item 45; Python scraping/automation services, API hunting, construction-tech tags; link computerngo.store.
- **@marc.kaz (Verified)** — 1,048 posts, 128K followers, 4,279 following; Garrett already follows him; newest posts: Shannon AI pentester, Recursive's Flint local coding model, LiDAR-scan-to-3D-room agent skill, Claude Duet, openGym, OpenCode Console key-theft report.
- **@therealyanjigb ("Yanji | AI & Cyber Security")** — 187 posts, 5,345 followers, 669 following; pinned/recent posts heavily about Jev — "JEV Signal Loom," "JEV cell atlas," Jev context patterns/decision tooling, Claude Opus 5.5 orchestration; bio claims ($20K–45K/mo cuts, "most valuable AI account") unverified.
- **@phanik.ig (Phani Krishna)** — 94 posts, 15.3K followers, 2 following; bio claim "Trained 3M+ Professionals on AI" (his claim); recent: 5 free open-source alternatives to paid AI subscriptions, Claude "Anatomy" 3D-animation skill, building n8n workflows with Claude, Claude Duet vs Dots/Muse/Grok Bot comparison.

**GitHub / X lanes (MASSIVE Parts 2–5 — counts only, Instagram scope note):** X: 6 bookmarks (entire list) + 50 For You posts. GitHub trending: 8 today, 13 this week, 21 last 30 days (5 in more than one window) + 25 monthly trending developers complete. GitHub comparatives: 50 repos across 6 build areas. GitHub improvements: 40 entries. Those files are notes-only in the sources (no verdicts assigned); their items are counted in the 275 total and in convergence, not re-listed as Instagram items here, to avoid double-counting.

**Convergence findings (convergence-and-diff.md / GAP §5, 9 surfaces):** 76 items named on 2+ independent surfaces. Top: Claude Code (7 surfaces, 74 mentions), MCP (6, 79), Anthropic (6, 45), OpenAI (6, 37), n8n (5, 25), Gemini (5, 23). Bare word "Claude" on all 9 surfaces, 188 occurrences. REA is the only item that is at once an IG dossier subject, a feed name, and a trending developer's repo. CINDY (feed-10) = makecindy/cindy in GitHub trending. GeoSpy = Raven (corrected name, April 2026 rename). RAG-Anything merged into LightRAG. 11 same-thing-two-names pairs; 7 same-name-different-thing collisions (Hermes ×3, Jev ×2, Orca ×2 main). Already-his list: 11 register names (Claude Code, OpenCode, DeepSeek, Gemini, Grok/Grok Bot, Hermes, Dots, Orca, Jev, nflverse, arXiv — several name-match only, referents flagged in source). Checked, 0 register lines: n8n, Paperclip, Firecrawl, Supabase, OpenRouter.

**Working-file-only substantive material (spot-check):** batch-1..4 and deep-batch-A..D are fully contained in the compiled sweep (no substantive remainder). Round2-only files not in MASSIVE-RECON: `following-lists.md` (exemplar following lists: @wassimyounes_ 311/311 complete in GAP pass, @carterperez.dev 305/306, @angus.sewell first 200/789 capped, @marc.kaz first 200/4,279 capped, @gittrend.io 4/4, @simplifyinai 1/1, @ariacodez 0/0, @iwillgroupe 7/7; 17 cross-list overlaps), `github-self-corpus.md` (Beexly: 30 starred repos — agent frameworks 12, LLM routing/inference 5, media 4, OSINT/RE 3, sports 1, other 5; 0 watched, 0 following; exactly 4 overlap with the day's recon: paperclip, VoiceStudio, ghidra, rea), `x-blindspots.md` (X Likes 12 complete, Lists none, Following 41 complete), and `blindspot-memo.md` — all summarized in GAP-REPORT, which is cited above. No other substantive working-file-only IG content was found.

**Residual gaps at Oct 27 close (GAP §9):** Round-2 feed 36 posts inventoried-only; round-2 ads 10 inventoried only; 298/654 historical DM shares unclassified; IG Saved (50) / Liked (30) last read Oct 9–13; exemplar following lists capped as above (@carterperez.dev short exactly 1; @angus.sewell 589 past cap, @marc.kaz 4,079 past cap not captured).
## ROLLING REGISTER — Oct 27–29, 2026: shared items dissected on arrival (S1–S49)

Source: `~/workspace/your_files/SHARED-ITEMS-REGISTER.md` — every post/repo Garrett handed Motif, dissected → verified at source → routed to a lane → status kept current. Condensed below; verdicts verbatim. (S24–S47 arrived as GitHub links shared in chat but are tracked in this same register and dissected to the same standard, so they are carried here.)

### Oct 27 evening shares
- **S1 — @openart_ai reel DenlDC3MG7v** — One-prompt AI-influencer ad for OpenArt; 83 likes/18 comments on 638K followers, comments majority hostile. Lane: Content OS (negative exemplar). Status: DISSECTED COMPLETE (reel duration not verifiable from the player — the one open residue).
- **S2 — Understand Anything (via @dailydoseofds_ Deqni2Tic2N)** — Codebase→knowledge-graph plugin; Egonex-AI/Understand-Anything, 88,587★, MIT; caveat: heavy token use, 336 open issues. Lane: fleet tooling. Status: VERIFIED + CATALOGED.
- **S3 — Kronos (via @hypertech De9vFEZkduC)** — Financial candlestick foundation model; shiyu-coder/Kronos, 43,957★, MIT; arXiv 2508.02739, AAAI 2026; large weights NOT released. Lane: research program (desk/stock ingestion-only candidate; never a pick source without doctrine gates). Status: VERIFIED + CATALOGED + FULLY READ (7/7 slides).
- **S4 — TwinDesk (via @gittrend.io De_6WwaCSzR)** — Cross-device desk sharing, no account/cloud; InukaAsith/TwinDesk, 709★, GPL-3.0, created Oct 14 2026; commenters report Windows Defender trojan warnings. Status: VERIFIED + CATALOGED with caution flag — DO NOT INSTALL unvetted.
- **S5 — PaperBanana (via @dailydoseofds_ De8pG7ZgRl9)** — Automated academic figures; implementation llmsresearch/paperbanana, MIT, 2,424★ (original dwzhu-pku/PaperBanana, Apache-2.0, 7,464★). Lane: research program + content. Status: VERIFIED + CATALOGED.
- **S6 — The Hugging Bay (via @simplifyinai De6mQq5GZWP)** — Torrent-style index for models/weights/datasets; DrMaxis/the-hugging-bay, 79★, MIT, quiet since Aug 8 2026. Awareness only — NOT a model source (license provenance unverifiable + poisoned-weights risk). Status: VERIFIED + CATALOGED (awareness).
- **S7 — Reel DfAssuHthqK** (self-DM share, Oct 27 19:03 CT) — Not identified; direct post lookup timed out. Status: **UNREAD** — closing step on record: retry lookup, then dissect.
- **S8 — @jakemok.io reel DezPwauKlaI** (self-DM share, Oct 27 19:37 CT) — Internship/Claude Code gate post ('say "it"'); 2,533 likes, 3,811 comments. Status: IDENTIFIED, NOT DISSECTED.
- **S9 — Post DeLuAN4jr8a** (shared in main chat Oct 27 20:23 CT) — Garrett directed "just mark that down"; media-understanding returned Invalid media ID; content not guessed. Status: LOGGED, NOT DISSECTED (Garrett's instruction).
- **S20 — libimobiledevice.org** (shared Oct 27 21:42 CT) — Cross-platform FOSS library (LGPL-2.1 core, since 2007, release 1.4.0 Oct 2025) for native iOS device communication without iTunes. Status: IDENTIFIED — full dissection available on Garrett's word.

### Oct 27 GitHub repo batch (cloud-agent systems hunt — S10–S19; full dossier: `~/workspace/gse-money-prep/repo-batch-2026-10-27-cloud-agents.md`)
- **S10 — ansible/ansible** — 71,158★, GPL-3.0. DISSECTED — ADOPT-CANDIDATE (fleet-infra playbook for the VM, --check first).
- **S11 — SigNoz/signoz** — 32,471★, MIT core + proprietary ee/. DISSECTED — ADOPT-CANDIDATE (fleet observability, infra half).
- **S12 — Tencent/WeKnora** — 35,674★, MIT, v0.8.3. DISSECTED — ADOPT-CANDIDATE (strongest platform find; knowledge/RAG layer for the mind corpus).
- **S13 — salimfk619-jpg/open-ai-ecosystem** — 3★, no license; README claims a platform the repo does not contain. DISSECTED — CATALOG-ONLY with DO-NOT-INSTALL caution.
- **S14 — app-vitals/shipwright** — 14★, MIT. DISSECTED — WATCH (queue discipline + pipeline metrics; wake = code-level vetting, then one-week non-production pilot).
- **S15 — osaurus-ai/osaurus** — 8,082★, MIT, macOS-only. DISSECTED — CATALOG-ONLY (steal memory architecture + identity patterns; no Mac in the fleet).
- **S16 — TransformerOptimus/SuperAGI** — 17,719★, MIT, dormant ~21 months. DISSECTED — CATALOG-ONLY (historical reference; do not stand up).
- **S17 — elizaOS/eliza** — 19,682★, MIT. DISSECTED — WATCH (persona lane; wake = persistent interactive social presence needed).
- **S18 — DietrichGebert/ponytail** — 178,250★, MIT. ALREADY IN CORPUS — DISSECTED — CATALOG-ONLY (decision of record stands).
- **S19 — KnockOutEZ/wigolo** — 5,509★, AGPL-3.0. DISSECTED — ADOPT-CANDIDATE (local web-intelligence MCP; A/B against Firecrawl).

### Oct 28 shares (S21–S23 IG-native; S24–S47 GitHub batch)
- **S21 — @marc.kaz reel De4oMnBM_8f: "Flint"** — RecursiveSI/flint, 39.8B MoE coding model, Apache 2.0; caption benchmark claims match the HF model card but are Recursive's own evals; the laptop story depends on quantized variants NOT in the repo (BF16 checkpoint ~80 GB, serving path = one B300/H200 via SGLang). DISSECTED — WATCH (wake: independent benchmarks + quantized runtime check).
- **S22 — @askgpts carousel De_9Z81EwXE: Coolify** — coollabsio/coolify, 65,089★, Apache-2.0; caption claims all check out; the "comment COOLIFY" gate is theater (creator DMs the public link). DISSECTED — CATALOGED as deployment candidate; no install.
- **S23 — @someonenamenicky (profile)** — Bug bounty creator, 9,807 followers; self-built recon tools on GitHub (crt-finder, all-domains); his two "comment Ebook" gate carousels pull 842 + 1,046 comments vs near-zero on most videos — the gate funnel is his whole distribution. DISSECTED — cataloged (defensive awareness + Content OS gate-funnel data point); no outreach.
- **S24 — HumanAIGC/AnimateAnyone** — 14,779★, Apache-2.0 — but the repo contains NO code and NO weights (docs/README only). CATALOGED; successor pointer Wan-Animate named, not dissected.
- **S25 — a16z-infra/ai-town** — 10,718★, MIT. CATALOGED (persona-fleet design reference — steal the character-memory pattern, not the stack).
- **S26 — wu-tian807/AstraLayering** — 41★, LGPL-3.0, 644 commits. CATALOGED / WATCH (layered-stills only; style mismatch with Nova's photoreal face).
- **S27 — Gudegi/KangEngine** — 2★, MIT. CATALOGED (robotics/RL sim; no GPU on the VM, no robotics lane open).
- **S28 — dsablic/sidou** — 5★, GPL-3.0. CATALOGED (SID music firmware; personal interest, no GSE/ARE fit).
- **S29 — moeru-ai/airi (Project AIRI)** — 50,853★, MIT. CATALOGED / WATCH (Nova live-runtime candidate; wake = a live/interactive persona build).
- **S30 — mergisi/awesome-openclaw-agents** — 4,031★, MIT; 196 SOUL.md templates; README funnels to a paid service. CATALOGED (template-mining only).
- **S31 — AhmadHassan-BTed/SoulMatrix** — 3,804★ vs 1 fork (unusual ratio, flagged); NO license stated. CATALOG-ONLY.
- **S32 — OSideMedia/higgsfield-ai-prompt-skill** — 815★, MIT, v3.42.0. DISSECTED — ADOPT-CANDIDATE (install on Garrett's word; first use = Nova + GSE Higgsfield prompt work).
- **S33 — wide-trace/open-higgsfield** — 4,956★; license NONE despite "open-source" claims. CATALOGED / WATCH with caution (does NOT make the web-trained Nova addressable; never paste his key into the hosted version).
- **S34 — SegFault42/HeliosGen** — 3,209★; no license; routes spend through the author's referral gateway; unsigned macOS-only builds. CATALOG-ONLY with caution.
- **S35 — heygen-com/hyperframes** — 74,601★, Apache-2.0. ALREADY IN STACK — adopted as the Content OS Route B renderer (decision of record stands).
- **S36 — higgsfield-ai/cli (OFFICIAL)** — 688★, MIT, npm @higgsfield/cli. DISSECTED — ADOPT-CANDIDATE (top find of the batch): includes `soul-id` train/manage from the shell — a concrete path to an addressable CLI-trained Nova character ID; changes addressability, not billing (account credits >90% used, payment failed; generation in that state UNVERIFIED until tried).
- **S37 — RE-SHARE of S32** (higgsfield-ai-prompt-skill, shared again minutes later) — verdict stands: ADOPT-CANDIDATE. No second dissection.
- **S38 — YouMind-OpenLab/awesome-nano-banana-pro-prompts** — 13,700★, license NOASSERTION. CATALOGED (prompt mining reference, not a republishing license).
- **S39 — jamez-bondos/awesome-gpt4o-images** — 8,154★, NOASSERTION, dormant since May 26, 2025. CATALOG-ONLY.
- **S40 — Codium-ai/AlphaCodium** — 3,967★, AGPL-3.0, dormant since Nov 25, 2024. CATALOG-ONLY (method already = Garrett's Hermes Pattern doctrine; citable research anchor).
- **S41 — huggingface/pytorch-image-models (timm)** — 37,256★, Apache-2.0. CATALOGED (canonical vision-backbone reference; nothing to install).
- **S42 — ashishpatel26/500-AI-Agents-Projects** — 39,101★, MIT. CATALOGED (idea mine only).
- **S43 — hesamsheikh/awesome-openclaw-usecases** — 31,640★, MIT, stale ~7 months. CATALOGED (companion to S30).
- **S44 — google-ai-edge/gallery** — 25,134★, Apache-2.0. CATALOGED / WATCH (on-device inference reference).
- **S45 — themanojdesai/genai-llm-ml-case-studies** — 1,692★, MIT, dormant since Jun 21, 2025. CATALOG-ONLY.
- **S46 — genieincodebottle/generative-ai** — 2,657★, MIT. CATALOG-ONLY (learner-tier material).
- **S47 — mongodb-developer/GenAI-Showcase** — 4,265★, MIT. CATALOGED (RAG-pattern reference; Atlas-flavored).
- **S48 — @charlieautomates reel DemU8amxpoC: Hypit (hypit-ai/hypit)** — Agent skill (`npx skills add hypit-ai/hypit -g`) rebuilding a performing video as a word-anchored re-skinnable template (HyperFrames render + Fish Audio voice + Rhubarb lip-sync). Repo verified real: 26,229★, pushed Oct 28. Corrections: its "#1 repo of the day" is a Trendshift badge, not GitHub Trending; license is "Apache-2.0 with conditions" (GitHub NOASSERTION) — conditions file NOT yet read. Comment gate confirmed at content level (newest 50 of 2,332 comments: 38 pure keyword + 9 creator templated replies). VERDICT: ADOPT-CANDIDATE as a Content OS explainer-lane pattern, fenced by license-conditions-first. Gaps: 2,282 of 2,332 comments unread; DM'd payload not obtained (no-messaging rule). Dossier: `~/workspace/gse-money-prep/S48-reel-dissection-2026-10-28.md`.

### Oct 29 share
- **S49 — @simplifyinai carousel DfD_VBfGQbV: Mesh LLM (Mesh-LLM/mesh-llm)** — Pools GPU/memory across owned machines behind one OpenAI-compatible API (localhost:9337/v1); "Skippy stage splits" = pipeline layer splits on a patched llama.cpp. Verified: 3,629★, 471 forks, Apache-2.0, pushed Oct 29, 2026. Comment gate confirmed (newest 30 of 136 comments: 12 pure keyword + creator replies; the one substantive comment carried the repo URL). VERDICT: LEARN-ONLY / WATCH — it pools hardware, doesn't create it; no GPU on either of Garrett's hosts, so the 70B headline is not usable compute today; TEST candidate only if a real second compute node appears. Gaps: 106 of 136 comments unread; DM'd payload not obtained (no-messaging rule). (This post also appeared as rank #1 in the Oct 29 AM feed sweep — same item, counted once; see the Oct 29 session.)

### Register reference note (not a sweep item)
- Nova persona reference accounts read read-only Oct 27: @itslilypod (203K, primary), @yung.planet (774K — note: the Oct 29 midday sweep recorded this account again as a Nova personality source), @godnotthisgirlagain (65K). Style language extracted into the Nova bible; no likeness copied.
## SESSION — Oct 29, 2026: For You feed sweeps (AM + midday) + keyword explore

**Coverage:** AM For You feed sweep — 35 organic posts inventoried + 9 ads excluded, 2 duplicates skipped, 33 new posts available, 20 selected and dissected (inventory #2–#19, #21, #22); 13 further new posts (#23–#35) were inventoried but not selected in the AM report, 6 of them later dissected in the AM deep-dive pass. AM 429 limits: instagram-cli returned 429 on the 5th `post` call (inventory #6); only 4 of 20 got full CLI JSON; media-understanding 0/20 and comment fetches 0/20. AM deep-dive pass — 11 items (Part A: 5 repo re-reads; Part B: 6 posts from inventory #23–#35, one of which identifies 3 repos, for 13 repo entries total). Midday run — Batch A: 15 posts (positions 1–15), Batch B: 15 posts (positions 16–30), 30 new posts dissected total, zero 429s in either batch. Keyword explore — 24 terms, 24 candidates (14 tech + 10 sports); candidates file: `~/workspace/ig-for-you-sweep/raw/2026-10-29-explore-candidates.md`; triage report: `reports/2026-10-29-explore-triage.md` (only the assigned five items were individually verified in that pass — see its gap audit).

### AM For You feed sweep — reports/2026-10-29-AM.md, with AM deep-dive merges (reports/2026-10-29-AM-deep-dive.md)

- ZOON (@dayofexploits, De7bDCrEw3a) — IP-based victim location/device tracker; no matching repo resolved on GitHub, repo identity UNVERIFIED — **Verdict: CONTEXT-ONLY** (threat awareness).
- @quantscience_ photo, no caption (DfFVOetH50Y) — caption empty; image payload unread (media-understanding never ran — 429 stop) — **Verdict: CONTEXT-ONLY** with an explicit gap: image payload unread.
- "erase" gate (@itstundeanthony, DfC10ExiGYa) — "Comment 'erase' for the setup guide"; entire payload behind the keyword gate, not obtained — **Verdict: LEARN-ONLY** (gate pattern cataloged; payload not obtained, by rule).
- Brand commentary + "launch" gate (@angus.sewell, DfFQH_VRtmo) — critique of brands that go corporate and water down their positioning (Hims and Hers example); prompt payload gated, not obtained — **Verdict: LEARN-ONLY.**
- Self-improving trading-bot architecture (@arwazaz_, De2EFbZjBHi) — caption carries the full design in the open: research agents → strategy generation → backtest + out-of-sample + robustness → one-change-at-a-time self-improvement loop with version control → risk controls → paper trading; repositories and build plan behind a "Comment ROADMAP" gate, NOT obtained — **Verdict: LEARN-ONLY** (gated payload not obtained, by rule).
- Univer — dream-num/univer (@gittrend.io, DfFAAhWiRDu) (deep dive) — "The Office Harness for AI Agents": isomorphic TypeScript runtime for spreadsheets, docs, slides, canvas, relational tables, and PDF inside your own app, with programmatic editing, output verification, and worktree collaboration for agents; 22,784★, 1,912 forks, Apache-2.0, pushed 2026-10-29 — **Verdict: TEST** (at need — when a real sheets/docs surface is on the table).
- @mlb — William Contreras post (DfECruPtam2) — "WORLD BASEBALL CLASSIC CHAMP ✅ / WORLD SERIES CHAMP ✅" — **Verdict: CONTEXT-ONLY.**
- Zero Breach Toolkit — interplains/Zero-Breach-Toolkit (@archive.genocide, DfAkXOeIRBm) (deep dive) — offline indicator-matching scanner for mercenary spyware (Pegasus, Predator, Graphite, Candiru/DevilsTongue, Paragon-class) against ~12,400 published indicators from 29 named sources; deep-dive read: 3,303★, 362 forks, Apache-2.0, created 2026-10-25 (AM read: 3,296 stars, 361 forks); the "12,100 traces" figure is the creator's number (UNVERIFIED) — **Verdict: TEST** (sandbox/VM first run; strongest Family Shield find of the day).
- @fuckjerry — "Team work" (DfD43mlhtYR) — comedy clip, credit @meishellnicole; no spoken/on-screen payload recovered — **Verdict: CONTEXT-ONLY** (entertainment; feed-composition signal only).
- @chiefgyk3d photo, no caption (DezDUl1R8hE) — image payload not read (no stored understanding; media-understanding blocked by the 429 stop) — **Verdict: CONTEXT-ONLY** with an explicit gap: image payload unread.
- @houseofhighlights + @bleacherreport — LeBron reaction (DfD3ezoNn3K) — "Bron couldn't believe it 💀", courtside reaction clip — **Verdict: CONTEXT-ONLY.**
- @thetradingfraternity — Anthropic/biotech claim (DfDm-KKPmsL) — "Anthropic just bought a 1 person biotech…"; no company named, no source linked — **Verdict: CONTEXT-ONLY** (claim labeled UNVERIFIED).
- OpenNavo — opennavo/OpenNavo (@gittrend.io, DfAWKNnjB9n) (deep dive) — Homebrew GUI / Mac app catalog platform (Go/Gin catalog backend, Nuxt 4 web directory, Tauri 2 + Rust macOS app, built-in MCP service); 69★, 2 forks, GPL-3.0, pushed 2026-10-29 — **Verdict: WATCH** (real, well-built, wrong hardware fleet today — pattern value now, product value if a Mac ever joins).
- @pjtradesnq — trading emotion post (DfD6GpPu2mn) — NQ futures-trading account reacting to news; payload is the video, not recovered — **Verdict: CONTEXT-ONLY.**
- @quantscience_ carousel, no caption (DfE-_PLmHgA) — slide payloads not read (media-understanding blocked by the 429 stop) — **Verdict: CONTEXT-ONLY** with an explicit gap: slide payloads unread.
- WishFish — kinghacker0/WishFish (@dayofexploits, DehqrYXlvC7) (deep dive) — phishing kit whose lure page plus permission prompt grabs front-camera pictures and target IP information; 1,304★, GPL-3.0, created 2019, stale since 2023-03; recognition rule: a greeting card, wish page, or meeting link never legitimately needs camera access — **Verdict: CONTEXT-ONLY** (threat awareness; never adopted, never operated).
- @esim3400 — Brewers World Series post (DfECbUpAclR) — "BREWERS WIN THEIR 1ST EVER WORLD SERIES!"; whether it depicts a real result or a simulation is not established — **Verdict: CONTEXT-ONLY.**
- @restructureai — "Private AI Operating System" (DfEBpHnAatB) — Claude-based private AI OS to run a business; substance is in the spoken video, which was not recovered — **Verdict: WATCH** (spoken payload unrecovered — explicit gap).
- @donovanlancome + @houstontips — Houston house (DfD5SUxO3KU) — Houston (Galleria) real-estate content, likely a wholesaler/investor walkthrough; no outreach — **Verdict: CONTEXT-ONLY.**
- @kem_glitch — LLM-wiki commentary (DfFSZDvN6oV) — take on the LLM-wiki knowledge-base pattern associated with Karpathy; argument itself is in the spoken video, not recovered — **Verdict: CONTEXT-ONLY.**

### AM deep-dive pass — new items (reports/2026-10-29-AM-deep-dive.md, Part B + Mesh LLM)

Duplicates merged above: Zero Breach Toolkit, Univer, OpenNavo, and WishFish carry the deep-dive content in the AM subsection and are marked "(deep dive)" there.

- Mesh LLM — Mesh-LLM/mesh-llm (register S49, AM feed duplicate #1 @simplifyinai DfD_VBfGQbV) (deep dive) — Rust workspace: Skippy (patched llama.cpp inference) + Mesh (peer discovery, QUIC/Iroh encrypted transport, routing, web console); single-machine fit first, private meshes invite-token only, stage splits for big models, experimental Mixture-of-Agents gateway; 3,629★, 471 forks, Apache-2.0, created 2026-02-11 — **Verdict: WATCH** — TEST trigger defined in the deep dive (single-node `--local-model-only` endpoint test).
- malicious-pdf — jonaslejon/malicious-pdf (@fork.cast_, DdWWKxUFDmm) — Python generator emitting a standardized battery of 67 test PDFs (phone-home callbacks, SSRF, XSS, XXE, NTLM capture, exfiltration) pointed at a URL you supply; 4,500★, 596 forks, BSD-2-Clause, created 2021, pushed 2026-10-17 — **Verdict: LEARN-ONLY** (a defensive test-fixture generator for systems he owns; know it cold, run it rarely).
- Watcher — thalesgroup-cert/Watcher (@esgeeks, DeSJ_Gzo_n1) — self-hosted cyber-threat-intelligence platform (Django + React, Docker): CERT RSS, CVEs, ransomware feeds, CertStream, SearxNG, local flan-t5-base / bert-base-NER information-leak detection (Pastebin, GitHub, GitLab, Bitbucket, StackOverflow, npm, APKMirror) and suspicious-domain detection; 1,435★, 219 forks, AGPL-3.0, created 2020, pushed 2026-10-29 — **Verdict: TEST** (self-hosted; the exposure-side half of Family Shield, plus a brand-protection seat for GSE).
- Headroom — headroomlabs-ai/headroom (@voxaris_ai, De2nMPixp_n) — local context-compression layer between a coding agent and the model (CacheAligner, ContentRouter, SmartCrusher, CodeCompressor, Kompress-v2-base) with CCR reversible compression; project benchmarks: code search 17,199 → 13,597 tokens (−21%), SRE incident debugging 55,957 → 24,340 (−57%), codebase exploration −42%, GitHub issue triage −30%; 78,233★, 6,094 forks, Apache-2.0, created 2026-01-07 — **Verdict: TEST** — the single highest-leverage fleet find in this feed; test it first (Part C).
- ReelMimic — edenfunf/reelmimic (@gittrend.io, DeyOj96CRXH) — local web app (localhost:4318) that clones the craft of a reference video without copying footage; agent crew of up to 6 builder agents, every shot reviewed by a different agent; 2D only, seven drawing engines; 265★, 41 forks, MIT, created 2026-09-28, pushed 2026-10-26 — **Verdict: LEARN-ONLY** (the product doesn't fit his content rules; the production *pattern* is a Content OS blueprint).
- FreeLLMAPI — tashfeenahmed/freellmapi (@cracked.artificial, DfDI4ByApuO) — "7.4 billion tokens per month. 34 free LLM providers. 635 free model endpoints. All behind one /v1 endpoint."; local router pooling free tiers behind one OpenAI-compatible endpoint (http://localhost:3001/v1) and one unified key; 43,780★, MIT, created 2026-04 — **Verdict: TEST** (head-to-head against his OmniRoute fork — one of them should win on evidence).
- VoiceStudio — debpalash/VoiceStudio (@cracked.artificial, DfDI4ByApuO) — fully local voice workbench: zero-shot voice cloning, voice design, video dubbing, dictation, transcription (WhisperX), multi-voice audiobooks; default engine k2-fsa/OmniVoice is the source of the 646-language figure; 93,903★, AGPL-3.0, created 2026-04-09 — **Verdict: WATCH** (real and remarkable; license-fenced for revenue work — the default OmniVoice model's weights are non-commercial).
- MoneyPrinterTurbo — harry0703/MoneyPrinterTurbo (@cracked.artificial, DfDI4ByApuO) — one topic sentence in; script, voiceover, stock footage, music, and subtitles out; Python pipeline (WebUI, API, CLI, agent mode); 136,264★, MIT, pushed 2026-10-29 — **Verdict: CONTEXT-ONLY** (capability cataloged; conflicts with his sports-content rules).
- Openjutsu — D3voz/openjutsu (@githubsignals, DfCrknOAoua) — open-source, fully local ComfyUI character-swap / motion transfer (SAM 3.1 tracking, grey-mannequin motion reference, MiniMax H3 regeneration, Qwen3-VL 8B shot description); hard requirement: an NVIDIA GPU; 266★, 46 forks, MIT, TypeScript, created 2026-10-26 — **Verdict: WATCH** (the right tool class for a lane Garrett has deliberately stopped; hardware-blocked besides — cataloged for the day that decision reopens).

**Deep-dive proposed test order (Part C4, verbatim order):** 1. **Headroom** — highest leverage, lowest risk, self-measuring. 2. **Zero Breach Toolkit** — run on this VM first, verify the reproducible-release hash while doing it. 3. **Watcher** — one Docker deployment, three watch rules, one week of quiet-or-signal. 4. **FreeLLMAPI × OmniRoute bake-off** (with a Headroom-combined arm) — one workload, three configurations, numbers decide. 5. **Univer** — when the DFS packet or another real sheets surface is scheduled. 6. **Mesh LLM single-node endpoint test** — `--local-model-only`, one small GGUF, verify :9337 + an agent launcher. Waiting on hardware or on Garrett's word, honestly labeled: OpenNavo (needs a Mac), Openjutsu (needs an NVIDIA GPU and a reopened video lane), VoiceStudio revenue use (needs an engine-license decision), malicious-pdf battery (a scheduled hygiene task, not a blocker).

**Deep-dive / AM self-corrections (filed openly in the AM report addendum):** (1) **OpenNavo exists** — the first repository search returned total 0 and the original draft reported the project as non-existent; that was wrong: **github.com/opennavo/OpenNavo** exists: 69 stars, 2 forks, GPL-3.0, pushed 2026-10-29 — it was created/indexed inside the sweep window itself. Verdict stays WATCH, for the opposite reason: real, brand-new, and unproven, not a phantom. (2) **Univer figures corrected** — an early search-index read showed stale 11,360 stars / 1,596 forks / pushed 2026-10-28; the direct repository read gives **github.com/dream-num/univer — 22,784 stars / 1,912 forks / pushed 2026-10-29T10:41Z**. The TEST verdict is unchanged.

**AM gap audit (preserved):** DM/comment-gated payloads NOT obtained (by rule): #4 "erase" setup guide; #5 "launch" prompts; #6 ROADMAP build plan + repository list; #14 "brew" repo link. Still undisected from the AM inventory after the deep-dive pass: #24 (Ernie Johnson), #27 (starter_story), #29 (bond-market claim), #30, #32, #34, #35 — none is a named-tool post; they remain unindexed for a future run.

### Midday Batch A — reports/2026-10-29-midday-A.md (positions 1–15)

- "Hermes" malware investigation (@carterperez.dev, DfFXDxkBKze) — supply-chain investigation part 4: Python X-client library "xscrape" carrying hidden malware reporting to a panel sold as "Hermes" on Russian-language forums; 28 trojanized GitHub repos updated in lockstep by one operator; name collision warning: this "Hermes" is a malware panel — NOT Garrett's Hermes agent — **Verdict: LEARN-ONLY** (threat awareness).
- Opik — comet-ml/opik (@dailydoseofds_, Deld9TBjYyr) — open-source LLM/agent observability, evaluation, and optimization platform: tracing across 50+ frameworks, Ollie root-cause-and-fix agent, plain-English regression test suites, agent sandbox; 23,022 stars, 1,905 forks, Apache-2.0, created 2023, pushed 2026-10-29 — **Verdict: TEST.**
- @shootwithali — fashion (DfFaLtkgTMv) — Friday the 13th mini dress, Hot Topic; alt-fashion outfit post, no tool, repo, or claim — **Verdict: CONTEXT-ONLY.**
- CamXploit — spyboy-productions/CamXploit (@dayofexploits, Dd7EFOEk9u4) — reconnaissance tool for finding potentially exposed IP cameras by scanning open ports and common misconfigurations; 1,201 stars, pushed 2026-01-06; recognition only, no operating detail — **Verdict: CONTEXT-ONLY** (threat awareness; cataloged, not killed).
- @houseofhighlights — sports clip (DfFKMj0zy_6) — NBA highlight/reaction clip ("IQ in sync with Scottie"), via X — **Verdict: CONTEXT-ONLY.**
- OOMWOO — makerspet/oomwoo (@githubprojects, Dee733jvYUT) — build-it-yourself open-source robot vacuum: Raspberry Pi, ESP32/Arduino, ROS2, 2D LiDAR, 3D-printed chassis, Home Assistant, fully local — no cloud account, no telemetry; hardware not yet validated end-to-end, runs in simulation today; 12,864 stars, Apache-2.0, pushed 2026-10-29 — **Verdict: WATCH.**
- @dani_white12 — fashion carousel (DfDvlRYDTqa) — outfit post ("Fb saw the drip"), no caption payload, no tool or claim — **Verdict: CONTEXT-ONLY.**
- YouPi-PG — youpi-pg/YouPI-PG (@drcintas, DerepBfSJSK) — self-hosted payment gateway for UPI and cash-on-delivery with zero per-transaction platform fees, verified by monitoring the merchant's bank SMS and email alerts; gate keyword "OPEN"; 2,718 stars, JavaScript, created 2026-09-19, pushed 2026-10-28; license UNCONFIRMED (GitHub API returned no license object) — **Verdict: WATCH** (pattern cataloged; geography is the current constraint).
- 9Drive — zenhosta/9drive (@ariacodez, DfFZSNfqTMr) — open-source web app pooling multiple Google Drive accounts (plus S3 buckets) into one unified storage dashboard; gate keyword "DRIVE" hides only the setup prompt; 2,718 stars, Apache-2.0, pushed 2026-10-25 — **Verdict: LEARN-ONLY** (pattern cataloged: storage-gateway pooling; constraint = ToS-adjacency + token risk).
- PHP2Shell attribution correction (@d3ndr1t30x, Dezvqx1mK8L) — PHP2Shell = two PHP engine RCE flaws, CVE-2026-109618 and CVE-2026-109619, CVSS 9.2, emergency-patched 2026-10-21; correction restores full record: Calif's Ryan Austin reported an RCE on Aug 11, OpenAI independently reported the same root cause, Wiz reported Aug 24; correction's dates and credits check out against the PHP Foundation timeline; the domain/marketing accusation remains an accusation (UNVERIFIED motive) — **Verdict: LEARN-ONLY** (verified correction; doctrine + patch-posture value).
- @specialreport — "PROJECT FORTRESS" (DfA6007FPif) — DoD domestic-defense commentary reel; no document, tool, or primary source named; "PROJECT FORTRESS" as a named program is UNVERIFIED from this post alone — **Verdict: CONTEXT-ONLY** (claims UNVERIFIED).
- @neuron.machinelearning — 20 ML algorithms cheatsheet (DejSYdxIvhX) — standard, accurate taxonomy cheatsheet (regression/classification/ensembles/clustering/dim-reduction/DL/RL) with when-to-use guidance; nothing novel — **Verdict: LEARN-ONLY** (brief — generic but correct reference material).
- Kem's verification skill (@kem_glitch, DfAIPrAtteM) — "Verification is how you move": agents check their own work with Playwright (hands), Chrome DevTools (eyes), image diff, Storybook, Sentry, packaged as a reusable SKILL.md built from five questions — surface, run, drive, observe, isolate — **Verdict: LEARN-ONLY** (method adopted into doctrine candidates; high value).
- @mattjayy — Florida driver license database breach (DdErmDuNMwb) — FLHSMV's DAVID database accessed on 2026-09-04 using compromised credentials of a Plant City police employee improperly stored on a personal electronic device; FLHSMV announced 2026-10-16; ShinyHunters attribution reported but not officially confirmed (UNVERIFIED) — **Verdict: CONTEXT-ONLY** (news; verified, with a Family Shield hygiene note).
- @brwalkoff — Brewers World Series final out (DfEFp16SQhA) — crowd-noise clip of Milwaukee's final out (via @mlb) — **Verdict: CONTEXT-ONLY.**

### Midday Batch B — reports/2026-10-29-midday-B.md (positions 16–30)

Batch B verdict counts as stated in the report: TEST ×1, LEARN-ONLY ×4, CONTEXT-ONLY ×10, ADOPT ×0, WATCH ×0.

- CyberStrikeAI / "44 AI agents" (@thehackernews, DfBSp6Cvi0g) — The Hacker News report on TrendAI (Trend Micro) research into three exposed attacker server environments used against Japanese organizations: operators abused CyberStrikeAI (verified: AIPentest/CyberStrikeAI, 8,219★, Apache-2.0) delegating work among 44 agents; at least 19 identifiable organizations (16+ in Japan) received structured validation reports — **Verdict: LEARN-ONLY** (doctrine-grade input for Family Shield).
- @yung.planet — BMO cosplay (DfFYhI6J6dH) — Mars, day 29 of a 31-day Halloween series, BMO (Adventure Time) take; filed as a Nova personality-source data point only — **Verdict: CONTEXT-ONLY.**
- @hurdles — Burfict reel (DfDD1omPmkc) — NFL history clip: undrafted → 127-tackle rookie year → NFL-leading 171 tackles in 2013 → suspension/fine history ending in the 12-game 2019 ban, the longest on-field suspension in NFL history at the time — **Verdict: CONTEXT-ONLY.**
- Claude SEO — AgriciDaniel/claude-seo (@gittrend.io, De9us3NAi0A) — universal SEO skill for Claude Code: 26 sub-skills + 19 sub-agents covering technical SEO, E-E-A-T, schema, and GEO; screen read rendered the owner as "AgricDaniel", the real owner is AgriciDaniel; 23,860 stars, MIT license, last pushed 2026-10-22; claimed full site audit in 10–15 minutes vs a 4–8 hour manual audit; author's "10.8K Search Console clicks in 12 weeks / 99 PageSpeed" figures UNVERIFIED as typical results — **Verdict: TEST.**
- @solarcastarchive — "next lockdown will be digital" (DfERlLZqLRp) — CBDC/digital-ID doom commentary; opinion content, no verifiable claim set, no payload — **Verdict: CONTEXT-ONLY.**
- @lil.timm — no caption, Houston (De4hFzOhl2h) — 4,037 likes / 623 comments on an uncaptioned reel; payload is the video itself, which text routes don't recover — **Verdict: CONTEXT-ONLY** + gap (video not transcribed).
- "Grok Bot" self-improving prompt loop (@therealyanjigb, DfE81EDqvX7) — "GROK LOOP" demo: 15 worker agents → a Grader scores every output against a fixed rubric → anything under 0.9 goes to a Coach, which rewrites that worker's prompt and reruns → worse rewrites rolled back; claimed 108 tasks overnight, pass rate 61% → 97%, 23 prompt rewrites, 6 fails fixed, zero human edits — all numbers UNVERIFIED; no public repo resolves — **Verdict: LEARN-ONLY** (pattern is an ADOPT-candidate for fleet-ops design; every claim UNVERIFIED).
- @alpha_leaders — Jio Platforms IPO (DfFWKciMO5d) — Jio's Oct 28, 2026 debut: ~$3.17B raise, +21.36% at open, ~$131.3B market value, 22.19× subscribed, 533.3M subscribers, FY26 revenue ~$15.44B / profit ~$3.16B — all figures as stated in the post, not independently verified — **Verdict: CONTEXT-ONLY.**
- @mrintentional_ — motivational (DfC_MhBMF90) — "Bet on yourself. It's only cringey until it works." — **Verdict: CONTEXT-ONLY.**
- @bleacherreport — LaMelo/Kuminga timeout clip (DfFap46uSJf) — NBA entertainment clip — **Verdict: CONTEXT-ONLY.**
- Stolen-iPhone "secret text" location trick (@khanjicyber, DfDXKV4ziBl) — built-in iOS Shortcuts personal automation: a message containing a secret phrase triggers the phone to send its current location (Google Maps link) and (per the caption) a front-camera photo back to the sender; gate keyword "OUTSMART", full mechanism already in the caption — **Verdict: LEARN-ONLY** (Family Shield awareness + optional own-device use).
- @alexxsharpx — personal outfit post (DfFag3qRs_U) — alt/corporate-goth fashion with gifted items; no payload for any lane — **Verdict: CONTEXT-ONLY.**
- @dugoutforever — Vogelbach champion-as-coach (DfFXPAROEKY) — Dan Vogelbach, never a World Series winner as a player, is a champion in his first season as the Brewers' hitting coach in Milwaukee's first title (via Front Office Sports) — **Verdict: CONTEXT-ONLY.**
- @remonbiz — "AI slop must be destroyed" (DfEZ5o1Ohqu) — thumbnail for the creator's 1h47m YouTube teardown "reverse engineering AI slop apps and exposing their keys"; field evidence that keys shipped inside client apps get extracted and publicly exposed — **Verdict: LEARN-ONLY** (brief; the video itself was not watched).
- @bentellect — comedy (DfAcqZMRyE7) — "Im never flying at night" — 878K likes, pure entertainment — **Verdict: CONTEXT-ONLY.**

### Keyword explore — reports/2026-10-29-explore-triage.md; candidates file: ~/workspace/ig-for-you-sweep/raw/2026-10-29-explore-candidates.md

24 terms (8 tech + 16 sports), 24 unique candidates: 14 tech + 10 sports; 38 pick-selling/trading-bot/signal posts skipped on sight (sports grids). Triage verdicts below are the triage report's; candidates the triage did not individually verify carry its gap-audit line: "Explore candidates outside the assigned five items were not individually verified in this pass."

#### Tech candidates (14)

- codebase-memory-mcp — DeusData/codebase-memory-mcp (@fullstackparody, Sep 24) — local code-intelligence MCP layer: 162 languages parsed into a persistent knowledge graph, 17 MCP tools, hybrid search (SQLite FTS5 BM25 + bundled Nomic `nomic-embed-code` embeddings, no API key); 47,781★, 3,929 forks, MIT, created 2026-02-24, last push 2026-10-29; the IG "99% token cut" claim cherry-picks an old five-query comparison (~3,400 vs ~412,000 tokens, ≈99.2% on those five structural queries only); the project's 31-repository arXiv preprint (arXiv:2603.27277) reports 10× lower token use and 2.1× fewer tool calls — the defensible headline is 10×, not 99% — **Verdict: FLAG** — the strongest code-context candidate of the day.
- Video-gen repo roundup (term: "open source AI tool") — Open-Sora, Wan 2.1, CogVideoX, HunyuanVideo, AnimateDiff — no triage verdict; not individually verified in this pass.
- Opik stack post (term: "open source AI tool") — DUPLICATE of midday feed #2 — already dissected in Midday Batch A above — **Verdict: TEST** (see comet-ml/opik entry).
- OpenBot explainer (@simplifyinai, Sep 2) — IG framing matches the verified CopilotKit/OpenBot dossier (7,937★, MIT, beta template; per-coworker container with own Chromium, logins, workspace; single policy gateway) — triage: **No new facts** beyond today's trending deep dive (`~/workspace/trending-scan/2026-10-29-deep-dive.md` §5); delta: none.
- "32 open-source AI tools" roundup (term: "open source AI tool") — AnythingLLM, Jan, LibreChat, ComfyUI, LTX… — no triage verdict; not individually verified in this pass.
- Agentic workflow cheatsheet (term: "AI agent workflow") — LangGraph/CrewAI/AutoGen… — no triage verdict; not individually verified in this pass.
- seb.ai "AI content team" (term: "AI agent workflow") — 7 roles, Research→Write→Script→Design→Post→Analyze loop — no triage verdict; not individually verified in this pass.
- ByteByteGo 12-MCP list (term: "MCP server", 2025) — no triage verdict; not individually verified in this pass.
- cheahjs/free-llm-api-resources + LiteLLM/LocalAI/Open WebUI roundup (term: "free AI API") — no triage verdict; not individually verified in this pass.
- Saluki 27B — ConwayResearch/Underdog-Saluki-27B-1.0 (term: "new AI model") — community release built on Qwen 3.8 27B as captioned; 629,102 downloads on Hugging Face plus multiple community GGUF quantizations (the "<8GB" local angle); not a major-lab model — triage quick verification: **Exists**.
- Kimi K3.1 Pro claims (@ohmo.ai, Oct 23; term: "new AI model") — checked against Moonshot official sources only: "Full weights due Nov 4" — **CONFIRMED as Moonshot's announced commitment** — not yet fulfilled (no K3.1 Pro repo on Moonshot's HF org as of Oct 29); "65.7% Terminal-Bench 4.0" — **CONFIRMED as Moonshot's published figure; independently UNVERIFIED**; "1M-token context" — **CONFIRMED** (official spec: 1,048,576 tokens, native); "Hallucinations 23.4% → 8.3%" — **CONFIRMED as Moonshot's claim; methodology in-house, independently UNVERIFIED**.
- Onyx platform (term: "local LLM") — onyx-dot-app/onyx, "Open Source AI Platform — AI Chat that works with every LLM," 50+ connectors consistent with the caption; **33,077★** (the caption's "28k" is stale), pushed 2026-10-29 — triage quick verification: **Real** — one correction: the license is **not** a clean MIT — GitHub reports NOASSERTION (mixed licensing), so the caption's flat "MIT" is only partly accurate.
- "10 best repos for Claude" graphic (term: "GitHub AI") — includes Impeccable (already deep-dived), Onyx, Scrapling, others named only in-image — no triage verdict; not individually verified in this pass.
- n8nstack automation-as-system layers post (term: "AI automation") — no triage verdict; not individually verified in this pass.

#### Sports candidates (10, method/data only)

- thelocktalk nflverse methodology carousel (@thelocktalk; resurfaced under NFL model / NFL analytics / NFL betting model / play-by-play data) — free pbp since 1999, EP per snap, rosters/snaps/injuries; three method prompts — Data Map, Baseline (dumbest version first), Leak Check (where the model sees the future) — triage content note: each maps directly onto Garrett's doctrine (ingestion-first / measured-over-guessed / no-lookahead); no separate verdict word in the triage.
- thelocktalk anytime-TD splits (@thelocktalk) — reproduced from nflverse play-by-play (regular season only, touchdown plays only, `yardline_100` at the snap; sample: 2012, 2018, 2024 — 1,377 rushing TDs, 2,596 passing TDs pooled; full 2010–2025 aggregation NOT COMPUTED): "74% of rushing TDs from inside the 10" — **CLOSE** (pooled inclusive ≤N 75.2%, strict <N 72.9%); "57% of rushing TDs from inside the 5" — **REPRODUCED** under the strict reading (56.1 vs 57; inclusive 60.9%); "33% of rushing TDs from the 1-yard line" — **REPRODUCED** (33.1%); "22% of passing TDs from inside the 5" — **CLOSE** (strict 20.7%, inclusive 25.7%).
- seb.ai ChatGPT sports researcher workflow — games→stats→injuries→odds→research→tracking — no triage verdict; not individually verified in this pass.
- tom.developer free sports APIs list — FastF1 first slide — no triage verdict; not individually verified in this pass.
- masoud.kharat GPS/load/wellness monitoring platform explainer — no triage verdict; not individually verified in this pass.
- data_by_faro EPA-per-drive quadrant chart — no triage verdict; not individually verified in this pass.
- fboutsiders DVOA explainer (2022, originator account) — no triage verdict; not individually verified in this pass.
- nerdabovethenet CONTACT volleyball rally-level win probability model — method transfer — no triage verdict; not individually verified in this pass.
- sundayfunday.mx Elo/Glicko/Bayes explainer (Spanish) — + calibration-honesty line (58% means more probable, not will win) — no triage verdict; not individually verified in this pass.
- nextgenstats OFFICIAL — new 2026 NGS metrics (@nextgenstats, Sep 8) — **Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0** — triage tracker line: classification-type features; add to the NGS inventory/glossary, relevant to the engine's OL/scheme matchup track.

**Explore gap audit (preserved):** Anytime-TD full 2010–2025 aggregation NOT COMPUTED (3 of 16 seasons sampled; playoffs excluded by design); codebase-memory-mcp not installed/run — token figures rest on the project's own preprint and old-README comparison, not our measurement; Kimi K3.1 Pro — no independent benchmark replication exists yet anywhere; weights-drop fulfillment check belongs on/after Nov 4; explore candidates outside the assigned five items were not individually verified in this pass. Thin/none terms in the candidates file: CPOE (grid was a high-school hashtag), player props model (hit-rate posts only, skipped), sports research (supplement-brand pollution).

### Seen-index cross-check

seen-index.md (`~/workspace/ig-for-you-sweep/seen-index.md`) confirms: AM run 20 posts, AM deep-dive pass 6 posts, midday-A 15 posts, midday-B 15 posts — 56 posts total across the feed runs, matching the reports above. No dissected post appears in seen-index.md that is missing from the reports; the explore candidates are not entered in seen-index.md (they live in the candidates file named above).
## MASTER INDEX — every distinct item, first-seen session

577 distinct items after dedupe across all sessions. Verdicts are the strongest/latest on record; "+ <session>" marks later re-appearances.

| Item | Handle / shortcode / repo | Verdict | First seen |
|---|---|---|---|
| Claude Campus Ambassador post | (self-thread share) | TIME-SENSITIVE — surfaced, no action | Sep 10 |
| Higgsfield/GPT-6 Astra soccer tracking demo | (self-thread share) | USEFUL — GSE content | Sep 10 |
| QB Vulture prompt | (self-thread share) | USEFUL — GSE | Sep 10 |
| 11 free Harvard courses (@artificialzone) | B6 #2778 / DHoC7huykcc | liked only — cataloged, not a verdict | Oct 13–14 |
| 1v1ME game-staking app (@1v1meapp) | E3 #3500 / C9m7pGaAmIo | liked only — cataloged, not a verdict | Oct 13–14 |
| 3D PC builder tool | A3 #939 / DR-_bXfCVIj | liked only — cataloged, not a verdict | Oct 13–14 |
| @fieldcoachai break-angle / separation metric shape | @fieldcoachai | KERNEL — metric shape noted | Oct 1 |
| @thelocktalk 1Q prompt pack (The Script / The Stop / The 1Q Math) | @thelocktalk Dd4TpsFicXE | KERNEL EXTRACTED — prompts to action board | Oct 1 |
| abhi1693/openclaw-mission-control | abhi1693/openclaw-mission-control | notated-not-evaluated (Stream D residual) · archived upstream | Oct 13–14 |
| achref-soua/helio | achref-soua/helio | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Agent Zero | self-archive Part 2 | FORGOTTEN (highest value, Jul 2026) | Oct 13–14 |
| AI & automation services masterclass (@joshyspeed) | B4 #2050 / DEvdKy8guQN | liked only — cataloged, not a verdict · model-level find, not a tool | Oct 13–14 |
| AI acceleration roundup (@stics.ai) | C3 #668 / DWFjfofElsA | news-level | Oct 13–14 |
| Airbnb arbitrage play (@jameszmurphy) | F6 #4092 / C3BeRpAoVCI | liked only — cataloged, not a verdict · approx $2k/mo net claim UNVERIFIED | Oct 13–14 |
| AirCard | @ariacodez | NEW deep dossier · TIME-SENSITIVE (patched in iOS 27.2 beta 3+) | Oct 13–14 |
| Alibaba Open Code Review | @wassimyounes_ | NEW deep dossier · Action #5: add as second reviewer in CI (also Stream D ADOPT) | Oct 13–14 |
| angelarose210/revideo | angelarose210/revideo | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Animated Gmail logo via Google VEO3 (@edward.builds) | B3 #936 / DSgVdLkiJDJ | liked only — cataloged, not a verdict · most immediately usable ARE item in the batch | Oct 13–14 |
| Answer The Public | self-archive Part 2 | FORGOTTEN (highest value, Nov 2025) · Action #10 | Oct 13–14 |
| AnyPS5 | @wassimyounes_ | NEW deep dossier | Oct 13–14 |
| AOSSIE-Org/InPactAI | AOSSIE-Org/InPactAI | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Apify | @lasthumannode / DeTAIZKO7w- | VERIFIED | Oct 13–14 |
| Apra-Labs/ApraPipes | Apra-Labs/ApraPipes | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Aria-Icons | LeulAria/Aria-Icons | 88 stars · MIT · 380,000+ (now 1M+) SVG icons as CLI + MCP server | Oct 13–14 |
| arkitekt-ai/OpenCRM | arkitekt-ai/OpenCRM | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| awesome-osint | jivoi/awesome-osint | ADOPT (as a curated source) · 30,211 stars · NOASSERTION | Oct 13–14 |
| aws-samples/generative-ai-use-cases | aws-samples/generative-ai-use-cases | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Beexly Sports c11-total-launch.txt | Beexly/Sports (claude/launch-handoff-merge-g01115) | Garrett's own repo path, recorded verbatim; not independently opened | Oct 13–14 |
| Betting-content accounts x3 (grouped) | E2 (Stream C) | grouped, brief · liked only | Oct 13–14 |
| brightbeanxyz/brightbean-studio | brightbeanxyz/brightbean-studio | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| BurntSushi/nflvid | BurntSushi/nflvid | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Bye-Bye, Bye Advantage (Lopez & Bliss 2024) | arXiv:2408.10867 | doc finding: bye/rest edge approx +0.15 pts, not significant · GSE situational | Oct 13–14 |
| cal.diy | calcom/cal.diy | WATCH · 48,985 stars · MIT | Oct 13–14 |
| Card sales / eBay playbook (@tydeancards x3) | G2 (Stream C) | grouped · liked only · returns not stated | Oct 13–14 |
| carter-tyra/AIntelligent-Oddz | carter-tyra/AIntelligent-Oddz | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| catlog22/maestro-flow | catlog22/maestro-flow | notated-not-evaluated (Stream D residual) · no license file | Oct 13–14 |
| caveman Claude token-cost trick (@power.ai) | B1 #533 / DW6Jbh4jpMu | liked only — cataloged, not a verdict · 75% savings claim UNVERIFIED | Oct 13–14 |
| CertGames | @carterperez.dev | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| CES 2026 day-1 roundup (@airesearches) | C4 #918 / DTN-TzjAeIC | news-level | Oct 13–14 |
| ChatGPT | @borja.obeso / Dd1bQiNllOw | VERIFIED · ACTED-ON | Oct 13–14 |
| Chatwoot | chatwoot/chatwoot | WATCH · 37,767 stars · NOASSERTION | Oct 13–14 |
| chicogong/media-pipeline | chicogong/media-pipeline | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| China influencer-certification rules (@hoodratchetv) | F10 #1301 / DQShszMDf18 | liked only — cataloged, not a verdict | Oct 13–14 |
| Claude Opus 5.5 | @askgpts / DeCWRKAk3Hr | VERIFIED · ACTED-ON | Oct 13–14 |
| Claude skills giveaway post (@albert.olgaard) | B2 #677 / DWAQr1TDLW9 | liked only — cataloged, not a verdict | Oct 13–14 |
| Claude Sonnet 5.5 | @askgpts / DeCWRKAk3Hr | VERIFIED (existence, price $2/$10 per M) · ACTED-ON | Oct 13–14 |
| Claude-Code-as-social-manager | self-archive Part 2 | FORGOTTEN (highest value, Mar 2026) | Oct 13–14 |
| codebase-memory | self-archive Part 2 | FORGOTTEN (highest value, Jul 2026) · Action #3 | Oct 13–14 |
| Conformal Selective Prediction with General Risk Control (SCoRE) | arXiv:2603.24704 | VERIFIED on arXiv 2026-10-14 · GSE abstention | Oct 13–14 |
| Corzed/AutoMediaV2 | Corzed/AutoMediaV2 | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| CourtListener lawsuit-search build | @ariacodez | NEW deep dossier · Action #11: bookmark | Oct 13–14 |
| cua | trycua/cua | 29,606 stars · MIT core; Spaces/Bench FSL-1.1-MIT · deployment gated by computers-OFF policy | Oct 13–14 |
| cybersecurity-projects | carterperez-dev/cybersecurity-projects | NEW deep dossier | Oct 13–14 |
| DaVinci AI tattoo-design app (@davinciaiapp) | C7 #4437 / Cy-vc4WAYfM | news-level | Oct 13–14 |
| DeepSeek R1 market shock (@hoodratchetv) | C5 #3205 / DFVcOCPRp27 | news-level | Oct 13–14 |
| DeepTutor | HKUDS/DeepTutor | 41,294 stars · Apache-2.0 · learning accelerator, not a business tool | Oct 13–14 |
| Denis2054/Building-Business-Ready-Generative-AI-Systems | Denis2054/Building-Business-Ready-Generative-AI-Systems | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Discourse | discourse/discourse | WATCH · 47,971 stars · GPL-2.0 | Oct 13–14 |
| dot. NFC digital business card (@dot.cards) | F9 #5239 / Csj3Z6Hty0j | liked only — cataloged, not a verdict | Oct 13–14 |
| Dots (OpenAI Dots) | @askgpts / DeCWRKAk3Hr | VERIFIED (product) · CLAIM-UNVERIFIED (role in stack) | Oct 13–14 |
| DraftKings posts x48 | E1 #5523 + pattern | GSE consumption signal, not a tool · liked only | Oct 13–14 |
| ds2api | CJackHwang/ds2api | 4,738 stars · AGPL-3.0 · ARCHIVED (2026) · explicit ToS/ban-risk territory | Oct 13–14 |
| Dub | dubinc/dub | WATCH · 24,879 stars · NOASSERTION | Oct 13–14 |
| edict | cft0808/edict | LEARN-ONLY · 16,987 stars · MIT | Oct 13–14 |
| ertiqah/The-Efficient-Entrepreneur | ertiqah/The-Efficient-Entrepreneur | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| ESPN core API event-odds endpoint (event 401872978) | sports.core.api.espn.com | TRUNCATED IN SOURCE · GSE | Oct 13–14 |
| ESPN site scoreboard API | site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard | VERIFIED as a real public endpoint pattern · GSE | Oct 13–14 |
| Eternaldeath/AIProductHome | Eternaldeath/AIProductHome | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Ever Gauzy | @wassimyounes_ | NEW deep dossier · Action #12: trial for Kit pipeline only | Oct 13–14 |
| evolution-foundation/evo-nexus | evolution-foundation/evo-nexus | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Exa | @lasthumannode / DeTAIZKO7w- | VERIFIED | Oct 13–14 |
| Exposed-webcam awareness | A2 #1092 / DP2Wgl2gYra | liked only — cataloged, not a verdict | Oct 13–14 |
| facebook/hhvm | facebook/hhvm | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| FinceptTerminal | Fincept-Corporation/FinceptTerminal | 32,451 stars · AGPL-3.0-or-later per README (API: NOASSERTION) · live trading gated to Enterprise $15/$30/$45 | Oct 13–14 |
| Finviz | @kush.hustles / Ddtx56vtR9H | VERIFIED (platform, pricing) · STALE (backtesting references) | Oct 13–14 |
| Foreman | thruwire/foreman | 751 stars · MIT · Jev-powered supervisor for coding agents (see Stream E2: demo plumbing CONFIRMED, Jev judgment NOT DEMONSTRATED) | Oct 13–14 |
| Foreman demo run (Stream E2) | thruwire/foreman / stream-e2-foreman-report.md | Demo RAN exit 0 four times · plumbing CONFIRMED · Jev judgment NOT DEMONSTRATED · calibration pilot, not deployment · 754 stars (2026-10-14 live check) | Oct 13–14 |
| Free Houston stock-trading workshop (@wealthsurgeworkshop) | F2 #3114 / DFqv6tRAD_r | liked only — cataloged, not a verdict | Oct 13–14 |
| free-claude-code | Alishahryar1/free-claude-code | 60,128 stars · AGPL-3.0-only per README (API: NOASSERTION) · subscription-OAuth routes are the gray zone | Oct 13–14 |
| Free-tier watcher spec (22 watches) | stream-e3-freetier-watcher-spec.md | spec-only · host recommendation n8n | Oct 13–14 |
| freellm.net directory watch | freellm.net (Tier A1 watcher) | live check 2026-10-14: approx 500 free models / 30 providers (corpus 2026-10-13: 502 / 31 / 412 no-card) | Oct 13–14 |
| FreeLLMAPI | @ariacodez | NEW deep dossier · Action #8: stand up as free-tier overflow lane | Oct 13–14 |
| FTN Data | ftndata.com | commercial proprietary feed 2020-2026 · GSE situational data | Oct 13–14 |
| future-agi | future-agi/future-agi | ADOPT · 2,145 stars · Apache-2.0 | Oct 13–14 |
| Ghost | TryGhost/Ghost | ADOPT · 55,532 stars · MIT | Oct 13–14 |
| GitHub URL tricks (GitDiagram / GitIngest / codewiki / star-history) | @ariacodez / @marc.kaz | NEW, zero-risk adoption | Oct 13–14 |
| Google Search Console Generative AI features report | @borja.obeso / Dd1bQiNllOw | VERIFIED (tool, limits) · CLAIM-UNVERIFIED (94.4K impressions) | Oct 13–14 |
| Grok Bot | @borja.obeso / Dd1bQiNllOw | VERIFIED (product, routing announcement) · ACTED-ON | Oct 13–14 |
| GrowthBook | growthbook/growthbook | WATCH · 8,497 stars · NOASSERTION | Oct 13–14 |
| H-Town Card Show (@htowncardshow) | G3 #1944 / DLRO-FrMBnL | liked only — cataloged, not a verdict · 230+ tables, Stafford Centre · edition in post has passed, show recurs | Oct 13–14 |
| haydenw22/DVarr | haydenw22/DVarr | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Higgsfield AI | @carterperez.dev | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| Houston duplex house-hack listing (@norisoldit) | F7 #4028 / C5TUFAAuvwx | liked only — cataloged, not a verdict | Oct 13–14 |
| icmptunnel | DhavalKapil/icmptunnel | LEARN-ONLY · 3,251 stars · no license | Oct 13–14 |
| Instagram Growth Guide course (@unpublished_diaryy) | F8 #2186 / DLFQK1wJXi0 | liked only — cataloged, not a verdict | Oct 13–14 |
| InstantHMR | (creator corpus) | Apache-2.0 — kernel noted | Oct 1 |
| Investing education (@calltoleap x3) | F1 (Stream C) | grouped · liked only | Oct 13–14 |
| Invo | @kush.hustles / Ddtx56vtR9H | VERIFIED (product, spread, affiliation) · CLAIM-UNVERIFIED (profitability) | Oct 13–14 |
| Jev (TypeSafe Jev) | @askgpts / DeCWRKAk3Hr | VERIFIED (product, API, price $0.042/M input) · CLAIM-UNVERIFIED (81 ms) · ACTED-ON in pattern | Oct 13–14 |
| jev-ultrafast | browser-use/jev-ultrafast | WATCH · 22,853 stars · MIT | Oct 13–14 |
| jtmuller5/The-HustleGPT-Challenge | jtmuller5/The-HustleGPT-Challenge | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Kaggle Big Data Bowl | kaggle.com/competitions | 2018-2024, historical only, custom non-commercial license · URL recorded exactly as written | Oct 13–14 |
| Kats | facebookresearch/Kats | ADOPT (vendored, per-sport) · 6,497 stars · MIT | Oct 13–14 |
| Kats 6/7 v3 — Harmonic regression for gappy series (RETRY) | gse-ml-service/app/models/harmonic_regression.py | new only as a labeled work item · GSE | Oct 13–14 |
| Laya as GSE gate — evaluation design + eval set (3,081 rows) | NandhaKishorM/laya / stream-e1-laya-eval-design.md | DESIGNED + ARMED but UNRUN · bar pre-registered in section 5.1/5.2 · completing pull needs DATABASE_URL | Oct 13–14 |
| listmonk | knadh/listmonk | ADOPT · 23,776 stars · AGPL-3.0 | Oct 13–14 |
| LiteRT-LM | google-ai-edge/LiteRT-LM | 6,663 stars · Apache-2.0 · excellent tech, no current lane; watch-list | Oct 13–14 |
| llama (meta-llama) | meta-llama/llama | WATCH · 59,629 stars · NOASSERTION (Llama community license) | Oct 13–14 |
| longomatch/longomatch | longomatch/longomatch | notated-not-evaluated (Stream D residual) · 404 in ledger section E | Oct 13–14 |
| lozit/variolab | lozit/variolab | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| LyrC Studio clip-remix tool | @byeloya / DVsRGp7DX6_ | Saved-post addendum B · STALE / DO-NOT-ACT for GSE (violates real-footage doctrine) | Oct 13–14 |
| Mac mini money | @david__wehner / DWk-oS1ja3V | Saved-post addendum A | Oct 13–14 |
| Maher (1982) / Dixon & Coles (1997) / Karlis & Ntzoufras (2003) citation cluster | JSTOR stable/2986290 | named-only; standard references · GSE research corpus | Oct 13–14 |
| Masstrust | kent-tokyo/masstrust | VERIFIED via GitHub 2026-10-14 · MIT OR Apache-2.0 per README badges · GSE gate/abstention design | Oct 13–14 |
| Mautic | mautic/mautic | WATCH · 10,761 stars · NOASSERTION | Oct 13–14 |
| mcnamee/react-native-starter-kit | mcnamee/react-native-starter-kit | notated-not-evaluated (Stream D residual) · archived upstream | Oct 13–14 |
| Medusa | medusajs/medusa | WATCH · 36,737 stars · NOASSERTION | Oct 13–14 |
| Messari | @kush.hustles / Ddtx56vtR9H | VERIFIED (platform, pricing, acquisition) · CLAIM-UNVERIFIED (before anyone else framing) · Not acted on | Oct 13–14 |
| meta-llama/llama-api-python | meta-llama/llama-api-python | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| meta-llama/llama-api-typescript | meta-llama/llama-api-typescript | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| meta-llama/prompt-ops | meta-llama/prompt-ops | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| meta-llama/synthetic-data-kit | meta-llama/synthetic-data-kit | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Metabase | metabase/metabase | WATCH · 49,650 stars · NOASSERTION | Oct 13–14 |
| MetaGPT | FoundationAgents/MetaGPT | LEARN-ONLY · 70,837 stars · MIT | Oct 13–14 |
| MindWorkAI/AI-Studio | MindWorkAI/AI-Studio | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| minhnv0807/ai-business-skills | minhnv0807/ai-business-skills | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| ml-intern | huggingface/ml-intern | 10,806 stars · Apache-2.0 · ARCHIVED | Oct 13–14 |
| MrChartist/x-algorithm-toolkit | MrChartist/x-algorithm-toolkit | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Muse | @borja.obeso / Dd1bQiNllOw | VERIFIED · ACTED-ON | Oct 13–14 |
| n8n | n8n-io/n8n | ADOPT · 207,303 stars · NOASSERTION (fair-code / Sustainable Use) | Oct 13–14 |
| nflreadr | nflverse/nflreadr | MIT · GSE data foundation · free/open source | Oct 13–14 |
| nflverse/nfl4th | nflverse/nfl4th | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| nflverse/nflverse-pbp | nflverse/nflverse-pbp | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| NFLWeather | nflweather.com | hourly observations 2009-2026 · GSE weather | Oct 13–14 |
| Nichols (2014) transcontinental-travel study | (named only, Stream B seq 7291) | named only · West-to-East afternoon penalty -0.3 to -0.6 pts, fully absorbed by modern closes | Oct 13–14 |
| Nuclei (ProjectDiscovery) | projectdiscovery/nuclei | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| NVIDIA-AI-Blueprints/content-localization | NVIDIA-AI-Blueprints/content-localization | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Open-glean | hydra-db/open-glean | 1,590 stars · Apache-2.0 · real, but brain (Hydra) is a hosted paid backend | Oct 13–14 |
| OpenCodeReview | alibaba/open-code-review | ADOPT · 46,987 stars · Apache-2.0 | Oct 13–14 |
| Openjev | razorback16/openjev | 697 stars · Apache-2.0 · serves Laya as a backend model; the GSE-gate component | Oct 13–14 |
| openscreen | siddharthvaddem/openscreen | 39,918 stars · MIT · post misspelled username (vaddeem) · direct ARE/Kit fit (living branch: getopenscreen/openscreen 4,224 stars) | Oct 13–14 |
| OSINT digital-footprint audit demo | A1 #937 / DSeKusJEvxi | liked only — never saved or acted on; cataloged, not a verdict · Intel bot / Family Shield | Oct 13–14 |
| Outlook agent sending | @lasthumannode / DeTAIZKO7w- | VERIFIED (mechanism) · ACTED-ON in draft-only form | Oct 13–14 |
| Owlseer-AI/Social-ops | Owlseer-AI/Social-ops | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Paperclip | paperclipai/paperclip | VERIFIED (repo, 101,465 stars, MIT) · CLAIM (creator figures) · Not acted on | Oct 13–14 |
| paperclip + hindsight | (creator corpus) | MIT — kernel noted | Oct 1 |
| Paperclip vs n8n comparison | stream-e3-paperclip-vs-n8n.md | Use both in different seats — n8n backbone (Seat 1, adopt now), Paperclip bounded pilot (Seat 2), MCP bus unchanged (Seat 3) · Paperclip 101,682 stars MIT · n8n 207,303 stars NOASSERTION | Oct 13–14 |
| PentAGI | vxcontrol/pentagi | LEARN-ONLY · 28,410 stars · MIT | Oct 13–14 |
| Pixelle-Video | AIDC-AI/Pixelle-Video | 18,142 stars · Apache-2.0 · doctrine conflict for GSE footage, maybe for non-sports ARE | Oct 13–14 |
| PlainsightAI/openfilter | PlainsightAI/openfilter | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Pokemon restock-monitor cluster x3 (grouped) | G1 (Stream C) | grouped · tooling layer of Pokemon TCG reselling · liked only | Oct 13–14 |
| Polar | polarsource/polar | ADOPT (hosted) · 10,363 stars · Apache-2.0 | Oct 13–14 |
| Portal to the deep web free-streaming post | A4 #1087 / DRdkj4DiT_j | flagged, not endorsed — piracy-adjacent, learn-only | Oct 13–14 |
| PostHog | PostHog/posthog | ADOPT (cloud free tier) · 40,272 stars · NOASSERTION | Oct 13–14 |
| Postiz | gitroomhq/postiz-app | ADOPT (self-host, unmodified) · 37,154 stars · AGPL-3.0 | Oct 13–14 |
| Predicting the outcomes of NFL games (Boulier & Stekler 2003) | brendanwhit.github.io/ds1-final-project | GSE forecasting benchmarks | Oct 13–14 |
| Pro-Football-Reference | pro-football-reference.com | 1970-2026 · GSE reference/results | Oct 13–14 |
| prod-FARM-IOS-Core (Git-Agni) | @marc.kaz | NEW deep dossier | Oct 13–14 |
| Property-render postcard pipeline (pergola/pool) | self-archive saves #6 + #12 | FORGOTTEN (highest value) · Action #1 | Oct 13–14 |
| pubspro/viral-radar-mcp | pubspro/viral-radar-mcp | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Recordly | webadderallorg/Recordly | ADOPT · 33,680 stars · NOASSERTION | Oct 13–14 |
| Refferq/Refferq | Refferq/Refferq | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Repolyze | MxCorpIn/Repolyze | 227 stars · MIT · real but gone quiet since March; 21 same-name repos | Oct 13–14 |
| Resource Optimization Under Asymmetric Spillovers: The NFL Laboratory (Rosen 2026) | jeremyarosen.com/papers/asymmetric_spillovers_paper.pdf | working paper as cited; not independently opened · doc finding: QB transitions cost approx 3.5-7.0 implied points | Oct 13–14 |
| Revealer.us | @ariacodez / @marc.kaz | NEW, UNVERIFIED depth · Action #11: test vs bot /user2 | Oct 13–14 |
| Romano et al. equalized coverage (conformal) | arXiv:1908.05428 | named citation · GSE calibration | Oct 13–14 |
| ruidazeng/the-playmakers | ruidazeng/the-playmakers | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| ruparelmetarya/Deep-Learning-Based-Tamper-Detection-on-Images | ruparelmetarya/Deep-Learning-Based-Tamper-Detection-on-Images | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| ruparelmetarya/Fast-Image-Retrieval | ruparelmetarya/Fast-Image-Retrieval | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| RustScan (bee-san) | bee-san/RustScan | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| Safe to Stop? / CROS (Wu & Rus 2026) | arXiv:2609.09678 | VERIFIED on arXiv 2026-10-14 · GSE stopping/abstention pattern | Oct 13–14 |
| SafeRestore | (named only, Stream B seq 7291) | named architectural pattern · GSE shadow consumer | Oct 13–14 |
| satoshate/obs_replay_script | satoshate/obs_replay_script | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| SceneAI | @marc.kaz | NEW deep dossier · Kit lane, test against one real Kit build | Oct 13–14 |
| Self-DM share dossier — @activeprogrammer | Dcq0LG5DlXj | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @albert.olgaard | DdBhOTAgoMq | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @angus.sewell | DecRIB6RWF- | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @ariacodez | DecKfjAKnQR | DOSSIERED (batch 2) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @artificialintelligencecountry | DdApw0llIMK | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @artificialintelligenceupdater | Dc0iQmXH22c | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @artificialntellligence | DdIAxPynbHV | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @askgpts | DdYAk2ok2LM | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @bestapps.ai | DeKalHoDNnd | DOSSIERED (batch 1) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @carterperez.dev | DdeODCnxRoi | DOSSIERED (batch 1) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — @chantzramos | DdZo4CToD-4 | DOSSIERED (batch 1) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @chatgptricks | DdXg7mYnS9K | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @datasciencebrain | DdJaqf9GJQ- | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @eluna.ai | Dc4KKywkjTq | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @evolving.ai | DctNmzJgPXb | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @fbajayden | DcliLp8kZfc | DOSSIERED (batch 2) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @github_dev | DdEebQRtEd1 | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @githubsignals | DdQvKY_jSvw | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @gittrend.io | Ddja2_uDxqr | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @gogreen_ai | DdatXCRmVwW | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @hoodratchetv | Dc9L53cnVsW | DOSSIERED (batch 1) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — @incmagazine | DePGXlIDK-0 | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @innovation | DdKIfRAE9dx | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @jakeswiz | DeZws1TtQH_ | DOSSIERED (batch 1) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — @js.admin_ | DYNy1sTyeeG | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @karlestampador | DeXbkJqyqHG | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @kem_glitch | DcyNNHKtEsL | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @leoreal.ai / Leo De Matos | DYo_7AYKkCx | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @linemakersports | DeW20ZwAW3L | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @longliveai | Ddb63t1lj__ | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @marc.kaz | DdwcTq6OdpH | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @marcinteodoru | Dbb38hFCPuc | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @maximiliandier | DdpfTcTkeBI | DOSSIERED (batch 1) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — @openart_ai | DcICa7QMznz | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @power.ai | DdEHNwZleC4 | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @prathamunpluggedd | DcwFQqxzjE8 | DOSSIERED (batch 1) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @prediction_alpha | Ddz_2_jRkbI | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @reezyresells | Dcg7oL5D6C7 | DOSSIERED (batch 1) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @scottsmithyta | DdEymuKEWfh | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @seb.ai | DeOPnJDltkN | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @sebastianhardy_ | DdmP7AcDvug | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @simplifyinai | DeR2Qllm6aP | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @taharamzi__ | DdAzHkAFNW9 | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @techs | DcwQbNNjwmP | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @thelocktalk | DcykhfnFfq3 | DOSSIERED (batch 2) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @thevintageapetcg | DYgQ8AEv9D- | DOSSIERED (batch 4) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — @thewizeai | DdCY3Ejla6n | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @thylldaco | DQw_HvBk-OC | DOSSIERED (batch 1) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @tism.maxxing | Dc_wf4BN_2R | DOSSIERED (batch 1) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @voxaris_ai | DcudS35xEg3 | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @vyzual.ai | Dcv4CU6DYNP | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — @wassimyounes_ | Ddha4Pzh7GU | DOSSIERED (batch 4) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — @winningnmindset | Dc6ZmFsloFn | DOSSIERED (batch 1) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Aaron | DaJFTijuEfG | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Adam Stewart | DbdT7pRvywJ | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — AI with Misbah | DcN16mFBOMY | DOSSIERED (batch 2) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — Alex / AI made easy | DXFfzk5jpLG | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Andrew Saline | DZqXNLGP3TP | DOSSIERED (batch 3) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — Angus the Nontechnical | DX9tzh7x5ob | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Anjela Petkova | DaxwCd3sv5m | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Arya Patel | DYLhCUeoH8o | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Ash Harris | DXZlhjFjz7v | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — ashen | Db4VomDp2es | DOSSIERED (batch 2) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — Baroobi | DXzz_83NF0A | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Baroobi (@baroobi.inc) | DXKEfFTDRv0 | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Bella.content | DYvtNYCsOJW | DOSSIERED (batch 4) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — Ben Crerar | DW3l0E8kdfB | DOSSIERED (batch 5) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Bennett Spooner / AI Automation | DWQaymMD2gm | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Bill | DYnpqfbR4UX | DOSSIERED (batch 4) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — Brody | DbB7y4pyPof | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Carter Perez | Dax0xFSRfVg | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Carter Perez (@carterperez.dev) | DZkK4h1R2Us | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Casey G | DV9X3RpD401 | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — CEO Watchlist - BACKUP Page | DWWEUOzjieA | DOSSIERED (batch 5) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Chanyoung Ryu (Chandler) | DZVXehQRe3T | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Christian | DZ_j5JAAuN0 | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Code & Complexity | DbQ9SdYqoNk | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Dean Lauer | DaI2HqvRLTM | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Developers as a Service | DXW_055D7GF | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Devin Huynh | DYGhjpdT0uT | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Frank Ocean / Personal Brand | DXy3y5ytJTh | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Galina • Cybersec brain on AI | DZEgmevz0Ys | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Global AI Force | DaeE2ulj4Z_ | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Harish Bhatt | DZVHuW6SN4c | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Harry | DXeWD0XEnfz | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — James Goldbach | DaLg2dBjQah | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Jay Volpenhein | DXvfS2Lh-FP | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Jordan (@jdiggsmac) | DXzybV2Oxg9 | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Josh See | DZll5NuD3rP | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Joshua Boyd | DYlatkTCsi_ | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Joshua Stevenson | Dbfs-AGx9w9 | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Kayvon Jafarzadeh | Da6cLdrqPxF | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Know Good | DavtDMVvU3Y | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — LearnMora Ai | DYcHHuVRWM_ | DOSSIERED (batch 4) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — Lloyd Canfield | DaSkn6HgwtU | DOSSIERED (batch 3) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — Lukasz Wieczorek | DadNwl5uCIY | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Luke Cutting | DZC-H3tRH7C | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Manas Patil / AI | DKCSJVyMKBC | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Mario / Chronically offline | DaBwuBKPdzA | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Mark Thomas | DX3FufHMokP | DOSSIERED (batch 5) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — Maverick Maltin / AI & ChatGPT | DX5wG8rKp3G | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Max Johnson | DYznwOcM1OQ | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Max Sturtevant | DXSsRFxCQ0G | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Micah Thurman | DYT9823Oqi6 | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Mindset Therapy | DX2sTsjmY9z | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Mirko / Travel, Lifestyle & Automotive | DYP2Wn4oBRW | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Naman Narayan | DYtySlVJFnh | DOSSIERED (batch 4) · lane: ARE | Oct 13–14 |
| Self-DM share dossier — Nedz | Dbeo9gQT8Xm | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Noah Frydberg | DYFcne_xBhK | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — not returned | DcbHlPCjDn2 | DOSSIERED (batch 2) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Nugget | Dcl2ephILJM | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Octillion | Da5ywMYR2ab | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Octillion (@octillion13) | DZTnAnzR3fS | DOSSIERED (batch 3) · lane: Intel bot | Oct 13–14 |
| Self-DM share dossier — Paul Ortiz | DWEZ7XBjT2C | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Rafael Brasil | DXT2wSBjRHv | DOSSIERED (batch 4) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — San Jose tattoo artist ✍🏽 Dillon 🇵🇹 | DacCRWdhD7N | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Seb Intel | DYuO6ZnPGzs | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — sebastian | DbpQgw1Po0L | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — sebastian / Ai & Income | Db2FO4FPkV2 | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Shubham Soni | DXzEyN2sdke | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Stephanie Madsen | DbPWHkDszu_ | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Stock Guy | DYNP0Qsp2LJ | DOSSIERED (batch 4) · lane: GSE | Oct 13–14 |
| Self-DM share dossier — Stride Josh | DcpX2K4ARd_ | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — The AI Surfer | DawQ6_7DNRD | DOSSIERED (batch 4) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Thor Aarsand | DZ3CL5qs5Y- | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Trending OpenSource Projects | DcrQILYIEJS | DOSSIERED (batch 2) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Tyler & Hannah Rachal | DWVMiclDeoV | DOSSIERED (batch 5) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Tyler Pauley | Da8MuaGhBfT | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Unknown author | DX5tUaaSyP_ | DOSSIERED (batch 5) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — Vinny Dary | Da4TJEiOVKi | DOSSIERED (batch 2) · lane: personal (non-business) | Oct 13–14 |
| Self-DM share dossier — Web Systems Specialist | DX4fE7zPL7a | DOSSIERED (batch 4) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — ZOEY OS / CREATE YOUR WORLD | DaSw8Balfqk | DOSSIERED (batch 3) · lane: personal efficiency | Oct 13–14 |
| Self-DM share dossier — ꪖꪀᧁꫀꪶ꠸ᥴꪖ ˚ ༘♡ | DZoB7jLpPRI | DOSSIERED (batch 3) · lane: personal (non-business) | Oct 13–14 |
| self-hosted-ai-starter-kit | n8n-io/self-hosted-ai-starter-kit | WATCH · 15,280 stars · Apache-2.0 | Oct 13–14 |
| Sherlock | @carterperez.dev | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| SidSarkar13/FOOTBALL-ANALYSIS-AI | SidSarkar13/FOOTBALL-ANALYSIS-AI | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Siri / Apple Intelligence settlement claim | @ariacodez | NEW deep dossier · TIME-SENSITIVE (creator-stated deadline 2026-12-21, figures unverified) · Action #4 | Oct 13–14 |
| Sleeper players API | api.sleeper.app/v1/players/nfl | VERIFIED · GSE roster gate | Oct 13–14 |
| Sliver (BishopFox) | BishopFox/sliver | ALREADY ON BOARD (INTEL_BOARD in bot.py) | Oct 13–14 |
| Small-model + verifier router | self-archive save #1 | Action #7 | Oct 13–14 |
| social-analyzer | qeeqbox/social-analyzer | LEARN-ONLY · 24,303 stars · AGPL-3.0 | Oct 13–14 |
| Sora announcement + AI-investing thesis (@metav3rse x2) | C6 #4151 + #6156 | news-level · both dated · investing thesis explicitly not financial advice | Oct 13–14 |
| Stack Overflow Chart.js question 30464750 | stackoverflow.com/questions/30464750 | incidental / no action (library provenance) | Oct 13–14 |
| stat-api/mcp | stat-api/mcp | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Structure-Aware Graph Abstention for Reliable Selective Forecasting (SASF) | arXiv:2610.08322 | VERIFIED on arXiv · GSE | Oct 13–14 |
| sublyna/discord-stripe-paywall | sublyna/discord-stripe-paywall | notated-not-evaluated (Stream D residual) · 404 in ledger section E | Oct 13–14 |
| Sway AI profile optimizer (@swayai.app) | C8 #3041 / DFDfrXYM-jk | news-level | Oct 13–14 |
| talivia-group/talivia | talivia-group/talivia | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Technique: Be the answer product pages (who / how / cost) | @borja.obeso / Dd1bQiNllOw | VERIFIED (technique) | Oct 13–14 |
| Technique: buy-intent comparison pages (X alternatives) | @borja.obeso / Dd1bQiNllOw | VERIFIED (technique) · Not yet acted on | Oct 13–14 |
| Technique: information gain (publish what the top 10 miss) | @borja.obeso / Dd1bQiNllOw | VERIFIED · ACTED-ON in spirit | Oct 13–14 |
| Technique: publish where AI already cites (citation-source analysis) | @borja.obeso / Dd1bQiNllOw | VERIFIED (technique) | Oct 13–14 |
| Technique: roundup pitching for quality backlinks | @borja.obeso / Dd1bQiNllOw | VERIFIED (technique) | Oct 13–14 |
| Technique: topic-cluster internal linking | @borja.obeso / Dd1bQiNllOw | VERIFIED (technique) | Oct 13–14 |
| The 30-day public challenge (method) | @lasthumannode / DeTAIZKO7w- | VERIFIED (format) · Not yet run by Garrett | Oct 13–14 |
| The home team weather advantage (Borghesi 2007) | doi:10.1016/j.jeconbus.2006.09.001 | GSE weather/home-field | Oct 13–14 |
| The Rundown AI newsletter (@therundownai) | B5 #2141 / DKAFy1osHxw | liked only — cataloged, not a verdict | Oct 13–14 |
| The token warden | @lasthumannode / DeTAIZKO7w- | VERIFIED (technique/pattern) · ACTED-ON in doctrine | Oct 13–14 |
| TikHub/TikHub-API-Python-SDK | TikHub/TikHub-API-Python-SDK | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Trading cluster x4 (grouped) | F3 (Stream C) | grouped, brief · creator claims UNVERIFIED (incl. 74% trading record per gap audit) | Oct 13–14 |
| TradingAgents debate mechanic | (creator corpus) | RESEARCH-ONLY license screen (Apache-2.0 noted) | Oct 1 |
| TripleTen bootcamp ad (@tripleten.techcareers) | D2 #2376 / DJmXPOXAet_ | liked only — cataloged, not a verdict | Oct 13–14 |
| TypeSafe Jev + Laya (open weights) | @marc.kaz / @wassimyounes_ | NEW deep dossier · Laya: NandhaKishorM/laya 32,734 stars, Apache-2.0 (corrected) · evaluate against GSE gate (Action #2) | Oct 13–14 |
| universal-modder | @ariacodez / @wassimyounes_ | NEW deep dossier | Oct 13–14 |
| University of Houston cybersecurity bootcamp ad | D1 #2339 / DKKONpbMe6G | liked only — cataloged, not a verdict · OSINT/security careers | Oct 13–14 |
| up-for-grabs/up-for-grabs.net | up-for-grabs/up-for-grabs.net | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| UPS Store franchise claim (@theyounetworkhq) | F5 #2867 / DHlbMN1u7PJ | liked only — cataloged, not a verdict · $30k franchise claim UNVERIFIED | Oct 13–14 |
| Vending-machine business coaching (@mikehoffmannofficial) | F4 #3489 / DBOt_G5i086 | liked only — cataloged, not a verdict | Oct 13–14 |
| vnpy (VeighNa) | vnpy/vnpy | LEARN-ONLY · 45,857 stars · MIT · mandatory dossier | Oct 13–14 |
| VoiceStudio | @wassimyounes_ | NEW deep dossier | Oct 13–14 |
| vreelb/dewdle | vreelb/dewdle | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| Weather biases in the NFL totals market (Borghesi 2008) | doi:10.1080/09603100701720484 | doc finding: winds >15 mph cut totals approx 1.8-2.8 pts · GSE weather | Oct 13–14 |
| web-check | lissy93/web-check | ADOPT · 35,101 stars · MIT | Oct 13–14 |
| Weekly roundup (@technology) | C1 #593 / DWPdC3TiSMS | news-level: what happened, no tool to run | Oct 13–14 |
| Weekly roundups x2 (@evolving.ai) | C2 #511 + #745 | news-level | Oct 13–14 |
| x-algorithm | xai-org/x-algorithm | LEARN-ONLY · 33,609 stars · Apache-2.0 | Oct 13–14 |
| Xiaomi MiMo-V2.6 RL environments | @wassimyounes_ | NEW deep dossier · Action #9: mine for GSE-RL grader patterns | Oct 13–14 |
| yt-dlp | yt-dlp/yt-dlp | ADOPT · 197,569 stars · Unlicense | Oct 13–14 |
| zaltinsoy/AutoSubZ | zaltinsoy/AutoSubZ | notated-not-evaluated (Stream D residual) | Oct 13–14 |
| gpu-unlock | Zagitta via @wassimyounes_ reel | VERIFIED — cataloged, not wired | Oct 26 |
| gpu-unlock-ada | JustAResearcher via @wassimyounes_ reel | VERIFIED — cataloged | Oct 26 |
| Samsung TV telemetry claim | "log4j" via @wassimyounes_ reel | UNVERIFIED | Oct 26 |
| $0 Test Setup Kit AI trading bot | @bestapps.ai / DeKalHoDNnd | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| $7 ESP32-S3 iPhone control | @circuit_digest / R2-25 / Dejmjq9O-PB | Inventoried only (round 2) | Oct 27 |
| 10 best Github repos for Claude (REA/Ponytail/Hallmark/Humanizer/Onyx/Impeccable/UI-UX Pro Max/Last 30 Days/Scrapling/Diagram Design) | @aiagently / R2-20 / DedkCc6olmo | Inventoried only (round 2) | Oct 27 |
| 10 GitHub repos to build an AI employee | @hasantoxr / R2-50 / DeeksLymAvI | Inventoried only (round 2) | Oct 27 |
| 10 repos that feel illegal to know about (Cobalt/SearXNG/Reactive Resume/changedetection.io/Suwayomi/LibreTranslate/gallery-dl/ArchiveBox/LocalSend/Vaultwarden) | @the_coding_wizard / doe2 / DeTVl8BCHIk | Read via browser (GAP) (corrected — not @dayofexploits; closes #13/#15 swap) | Oct 27 |
| 11-slide AI news roundup | @sebastianhardy_ / Item 34 | Catalog as verified-mostly-true (deep pass) | Oct 27 |
| 20 Claude GitHub Repos | @codingknowledge / feed-1 / De9SUccyZF- | catalog | Oct 27 |
| 5 Gadgets You Can Build Yourself This Weekend | @technologybrief / feed-27 / De2_FvjjkU0 | catalog — security-awareness and home-network notes | Oct 27 |
| 5 tools turn Claude into web designer/animator/QA | @simplifyinai / Item 28 | Candidate for a lane — Kit / autonomous revenue engine. Gated list cataloged, gated-unrecovered (round 1); pattern cataloged as Kit checklist (deep pass) | Oct 27 |
| 6 Government Databases | @technologybrief / feed-8 / DeZ4G90mTqB | catalog as an OSINT reference card | Oct 27 |
| 6 Grok bots trading system | @seb.ai / DeOPnJDltkN | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| @iwillgroupe profile | @iwillgroupe | Read via browser (GAP) — profile read, no verdict assigned | Oct 27 |
| @marc.kaz profile | @marc.kaz | Read via browser (GAP) — profile read, no verdict assigned | Oct 27 |
| @phanik.ig profile | @phanik.ig | Read via browser (GAP) — profile read, no verdict assigned | Oct 27 |
| @therealyanjigb profile (Jev-focused) | @therealyanjigb | Read via browser (GAP) — profile read; bio money claims unverified | Oct 27 |
| AI content-testing loop (Hormozi method) | @angus.sewell / Item 41 | Candidate for a lane (content operations) | Oct 27 |
| AI coworkers | @simplifyinai / DeR2Qllm6aP | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| AI moved fast this week carousel (7 claims) | Item 24 | Candidate for a lane — agent fleet security. Remainder cataloged as verified news. | Oct 27 |
| Angle prompts post | @angus.sewell / DecRIB6RWF- | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| Angus Sewell profile | @angus.sewell / Item 11 | Catalog — high-value source account | Oct 27 |
| ansible | ansible/ansible | ADOPT-CANDIDATE | Oct 27 (S10) |
| Anthropic founders program | @incmagazine / DePGXlIDK-0 | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| API-key exposure awareness reel | @ariacodez / Item 26 | Cataloged, no current lane fit — awareness content | Oct 27 |
| Assembly/security learning | @jakeswiz / DeZws1TtQH_ | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| AutoResearchClaw | Item 13 | Candidate for a lane (agent fleet / research pipeline) | Oct 27 |
| Beyond Prompting: Autonomous Factor Investing via Agentic AI | @quantscience_ / feed-4 / arXiv:2603.14288 | catalog the paper as a methods reference; performance numbers UNVERIFIED | Oct 27 |
| Brag (latent-spaces/brag) | @itstundeanthony / Item 43 | Catalog as test-when-ready; strongest single-tool find in batch B (corrected, deep pass) | Oct 27 |
| CINDY (makecindy/cindy) | @githubprojects / feed-10 / De1y3m9PyCt | candidate — fleet architecture reference; evaluate before any install | Oct 27 |
| Claude jailbroke PS5/TV/BMW claim | Item 21 | Cataloged — reference specimen for claim-inflation; no lane fit | Oct 27 |
| CleanYourTV | Item 17 | Candidate for a lane (personal / Family Shield) | Oct 27 |
| Clueso | Item 42 | Candidate for a lane (weak) — Kit/revenue content tooling | Oct 27 |
| Copy-trading routine post | @prediction_alpha / Ddz_2_jRkbI | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| CuPy | Item 37 | Candidate for a lane (GSE engine compute) | Oct 27 |
| deep-hlr (Defastra API wrapper) | Item 46 | Catalog — OSINT reference, defensive context only | Oct 27 |
| DeepSeek V4.1-Flash-1017 | Item 16 | Candidate for a lane — agent fleet / local AI infra. Headline claim logged as creator exaggeration. | Oct 27 |
| Drone 3D-mapping reel (round 2) | @simplifyinai / R2-9 / De9WMWTxQ99 | Inventoried only (round 2) | Oct 27 |
| Earshot | @gittrend.io / R2-39 / De_b6mpD88Q | Inventoried only (round 2) | Oct 27 |
| Easiest Way to Predict an NFL Score! | @linemakersports / DeW20ZwAW3L | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| eliza | elizaOS/eliza | WATCH | Oct 27 (S17) |
| FaceCheck.ID / Robin AI / Airplanes.live | @carterperez.dev / Item 33 | Cataloged — Airplanes.live candidate for OSINT lane; Robin OPSEC warning; FaceCheck.ID excluded by no-facial-recognition rule | Oct 27 |
| Fake Door Test (Angus Sewell) | @angus.sewell / Item 19 / DerzAbwtNts | protocol cataloged (corrected) | Oct 27 |
| Four AI agents in 10 weeks (Grok Bot/Muse/Dots/Claude Duet) | @power.ai / feed-33 / De_Y38DldEj | catalog — agent fleet / competitive landscape | Oct 27 |
| Free My TV (simbasjungles/free-my-tv) | @gittrend.io / feed-39 / De7HSFtkp60 | candidate for a lane (personal/home); repo spelling corrected | Oct 27 |
| Free Python quant stack (@quantscience_) | @quantscience_ / Item 20 / DepZC77lF3L | cataloged (deep pass, recovered in full) | Oct 27 |
| Free-tools poster carousel | @theopenstack / R2-27 / DfAKyS2iS_z | Inventoried only (round 2) | Oct 27 |
| Gatekept websites Pt 1133: DeepWork/GetFreeSnacks/The Hustle Blower | Item 29 | Cataloged, no current lane fit (all three sites unverified) | Oct 27 |
| Genie 4 | @evolving.ai / R2-23 / DfAobiiDKzZ | Inventoried only (round 2) | Oct 27 |
| Goldman Sachs 10,000 Small Businesses | @sahib.creator / feed-45 / De1xSxbzaFm | Read via browser (GAP) — deferred closed; figures are program's own reports | Oct 27 |
| Grok for Startups | Item 40 | Candidate for a lane — autonomous revenue engine / funding watch, flagged eligibility-gated. Headline match claim logged as unverified. | Oct 27 |
| Halupedia | @simplifyinai / feed-11 | catalog (curiosity item) + ingestion blocklist recommendation | Oct 27 |
| Harness² | Item 14 | Candidate for a lane — agent fleet / local AI infra. Strongest item in this batch. | Oct 27 |
| Hidden Markov Models in algorithmic trading | @quantscience_ / Item 49 | Catalog as a methods note; RenTec framing corrected to 66% gross / 39% net (corrected, deep pass) | Oct 27 |
| instaloader graphic | @dayofexploits / R2-15 / DdzJ3erCUSI | Inventoried only (round 2) | Oct 27 |
| Internship/Claude Code gate reel | @jakemok.io DezPwauKlaI | IDENTIFIED, NOT DISSECTED | Oct 27 (S8) |
| IP-logger photo warning | @ariacodez / Item 30 | Catalog — Family Shield awareness, accurate mechanism with overstated impact claim | Oct 27 |
| Kronos | shiyu-coder/Kronos via @hypertech De9vFEZkduC | VERIFIED + CATALOGED + FULLY READ | Oct 27 (S3) |
| LEANN | Item 48 | Candidate for a lane — local AI infra / personal knowledge base | Oct 27 |
| Lemo-Opuscar | @gittrend.io / feed-24 | candidate for a lane (content/explainer, non-game); 59 styles not 51 (corrected) | Oct 27 |
| libimobiledevice | libimobiledevice.org | IDENTIFIED | Oct 27 (S20) |
| Linemate (@sportskmac NFL reel) | @sportskmac / Item 18 / DeM5XlzzJuT | cataloged as competitor reference (corrected, deep pass) | Oct 27 |
| llm-d | @dailydoseofds_ / feed-17 | catalog — inference-serving reference; no current build fit | Oct 27 |
| MadsLorentzen/ai-job-search | @simplifyinai / Item 15 / DelSdCDmd2I | Candidate for a lane (personal/job-search). Highest-actionability item in this batch. | Oct 27 |
| Memvid (.mv2) | Item 47 | Candidate for a lane (agent fleet + local AI infra) | Oct 27 |
| Meta Muse Gadgets | Item 23 | Candidate for a lane (agent fleet + local AI infra / home) | Oct 27 |
| Microsoft AI resources list | @simplifyinai / DeWlTIZGdZF | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| ML resume projects | @karlestampador / DeXbkJqyqHG | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| MY-WIFI--- | @dayofexploits / doe4 / De-AAmDlsm1 | Read via browser (GAP) — own-machine Wi-Fi password recall utility | Oct 27 |
| Nearby Glasses (yjeanrenaud/yj_nearbyglasses) | @ariacodez / feed-41 / DfAPy0tKnxq | Read via browser (GAP) — deferred closed | Oct 27 |
| Neuron-steering reading list (Monosemanticity + Cammarata) | @vikasingh / Item 38 | Catalog — personal research reading list, both sources verified real | Oct 27 |
| nnInteractive Agent | @simplifyinai / feed-34 | catalog — architecture-pattern reference for the agent fleet | Oct 27 |
| NVIDIA SimReady Central (2,575 assets) | Item 39 | Cataloged, no current lane fit (recorded, not killed) | Oct 27 |
| Obscura (h4ckf0r0day/obscura) | @drcintas / feed-40 / De9kMGeShp9 | candidate for a lane (fleet tooling trial); star count 28,000 unconfirmed (corrected) | Oct 27 |
| One tool / 34 AI providers | @ariacodez / DecKfjAKnQR | Already on record Oct 13 dossier v2 — not redone | Oct 27 |
| open-ai-ecosystem | salimfk619-jpg/open-ai-ecosystem | CATALOG-ONLY — DO-NOT-INSTALL | Oct 27 (S13) |
| OpenAI Decisions API | Item 22 | Candidate for a lane — agent fleet tooling, possible GSE gate component | Oct 27 |
| OpenArt one-prompt influencer reel | @openart_ai DenlDC3MG7v | DISSECTED COMPLETE (negative exemplar) | Oct 27 (S1) |
| OpenTakeoff (kentucky-ai/opentakeoff) | @github_dev / feed-43 / DeUTZhTSNOd | Read via browser (GAP) — deferred closed | Oct 27 |
| osaurus | osaurus-ai/osaurus | CATALOG-ONLY | Oct 27 (S15) |
| OSINT sites (Reddit archive/camera aggregator/MarineTraffic) | @carterperez.dev / Item 32 | Catalog all three; camera aggregator awareness-only (deep pass) | Oct 27 |
| OSINT websites hackers use (Grayhat Warfare/GeoSpy-Raven/cyberthreat maps) | @carterperez.dev / Item 31 | Catalog all three; defensive exposure-audit / awareness (deep pass, recovered in full) | Oct 27 |
| OSSU Data Science (ossu/data-science) | @softwarewithnick / feed-35 | catalog — learning-path reference | Oct 27 |
| P(doom) music video (sepvej/PDoomVideo) | @gittrend.io / feed-19 | catalog — creative-coding reference; barred from game-footage use by standing video rule | Oct 27 |
| PaperBanana | llmsresearch/paperbanana via @dailydoseofds_ De8pG7ZgRl9 | VERIFIED + CATALOGED | Oct 27 (S5) |
| Paperclip rent challenge Days 9-10 | @lasthumannode / feed-21 / DeftCX3qIZW | catalog — field evidence; bounded-pilot settlement stands | Oct 27 |
| ponytail | DietrichGebert/ponytail | CATALOG-ONLY (already in corpus) | Oct 27 (S18) |
| pwn.college | @ariacodez / Item 27 / DehaGWFqHPB | cataloged as a free training resource for the Family Shield lane (deep pass) | Oct 27 |
| r4ven (spyboy-productions/r4ven) | @dayofexploits / doe1 / DePl4juk3TI | Awareness-only record (GAP) | Oct 27 |
| RAG-Anything / LightRAG (HKUDS) | Item 36 | Candidate for a lane — GSE engine research / corpus infrastructure, via LightRAG | Oct 27 |
| REA (morluto/rea) | Item 35 | Candidate for a lane (OSINT/Family Shield tooling + fleet MCP catalog) | Oct 27 |
| Reverse-engineering $10k coaching funnels | @angus.sewell / Item 25 / Deh4GM9tIO- | Candidate for a lane (revenue engine / competitor research) | Oct 27 |
| SHADOW INDEX — PROXY RELOAD | Item 45 | Cataloged, no current lane fit — flagged as black-hat; do not use | Oct 27 |
| Shannon (KeygraphHQ/shannon) | @work_withdaas / DXW_055D7GF | Read via browser (GAP) — 3 surfaces in one day; no verdict assigned in source | Oct 27 |
| Shannon (round-2 feed post) | @someonenamenicky / R2-2 / DegvQ5gSqs5 | Inventoried (round 2); same tool as linked reel — 3 surfaces in one day (GAP) | Oct 27 |
| shipwright | app-vitals/shipwright | WATCH | Oct 27 (S14) |
| SigNoz | SigNoz/signoz | ADOPT-CANDIDATE | Oct 27 (S11) |
| Sports analytics curriculum (@wnbadata) | Item 44 | Candidate for a lane — GSE sports engine. Highest-priority catalog entry in this batch. | Oct 27 |
| Stalkie (ashendilantha/stalkie) | @esgeeks / feed-50 / DeKDotTkehK | Read via browser (GAP) — deferred closed | Oct 27 |
| SuperAGI | TransformerOptimus/SuperAGI | CATALOG-ONLY | Oct 27 (S16) |
| The Hugging Bay | DrMaxis/the-hugging-bay via @simplifyinai De6mQq5GZWP | VERIFIED + CATALOGED (awareness only) | Oct 27 (S6) |
| The X Subscription + Gemini 4 Argon | Item 12 | Candidate for a lane — agent fleet / AI infra | Oct 27 |
| Thief Raccoon | @dayofexploits / doe3 / De48NVSAfTI | Awareness-only record (GAP) | Oct 27 |
| TwinDesk | InukaAsith/TwinDesk via @gittrend.io De_6WwaCSzR | VERIFIED + CATALOGED — DO NOT INSTALL unvetted | Oct 27 (S4) |
| Understand Anything | Egonex-AI/Understand-Anything via @dailydoseofds_ Deqni2Tic2N | VERIFIED + CATALOGED | Oct 27 (S2) |
| Undetectable (kinghacker0/Undetectable) | @dayofexploits / doe5 / DeAKe_zj7Qr | Awareness-only record (GAP) | Oct 27 |
| Unidentified post | DeLuAN4jr8a | LOGGED, NOT DISSECTED | Oct 27 (S9) |
| Unidentified reel | DfAssuHthqK | UNREAD | Oct 27 (S7) |
| WeKnora | Tencent/WeKnora | ADOPT-CANDIDATE | Oct 27 (S12) |
| wifit3 v0.4.3 (derv82) | @dayofexploits / feed-13 / DeZuHo5iYuY | catalog, defensive-use-only: own-network auditing only | Oct 27 |
| wigolo | KnockOutEZ/wigolo | ADOPT-CANDIDATE | Oct 27 (S19) |
| xcape / Proliv4.exe / Hermes MaaS | @carterperez.dev / feed-14 | catalog, high defensive value | Oct 27 |
| You deleted it. Your phone kept a copy. | @theartificialintelligence / R2-48 / De_1Z69o4ZW | Inventoried only (round 2) | Oct 27 |
| 500 AI Agents Projects | ashishpatel26/500-AI-Agents-Projects | CATALOGED | Oct 28 (S42) |
| AI Town | a16z-infra/ai-town | CATALOGED | Oct 28 (S25) |
| AlphaCodium | Codium-ai/AlphaCodium | CATALOG-ONLY | Oct 28 (S40) |
| AnimateAnyone | HumanAIGC/AnimateAnyone | CATALOGED (empty repo — no code/weights) | Oct 28 (S24) |
| AstraLayering | wu-tian807/AstraLayering | CATALOGED / WATCH | Oct 28 (S26) |
| Awesome GPT-4o Images | jamez-bondos/awesome-gpt4o-images | CATALOG-ONLY | Oct 28 (S39) |
| Awesome Nano Banana Pro Prompts | YouMind-OpenLab/awesome-nano-banana-pro-prompts | CATALOGED | Oct 28 (S38) |
| Awesome OpenClaw Agents | mergisi/awesome-openclaw-agents | CATALOGED | Oct 28 (S30) |
| Awesome OpenClaw Use Cases | hesamsheikh/awesome-openclaw-usecases | CATALOGED | Oct 28 (S43) |
| Coolify | coollabsio/coolify via @askgpts De_9Z81EwXE | CATALOGED — deployment candidate | Oct 28 (S22) |
| Flint (Recursive) | RecursiveSI/flint via @marc.kaz De4oMnBM_8f | WATCH | Oct 28 (S21) |
| GenAI/LLM/ML Case Studies | themanojdesai/genai-llm-ml-case-studies | CATALOG-ONLY | Oct 28 (S45) |
| Generative AI | genieincodebottle/generative-ai | CATALOG-ONLY | Oct 28 (S46) |
| Google AI Edge Gallery | google-ai-edge/gallery | CATALOGED / WATCH | Oct 28 (S44) |
| HeliosGen | SegFault42/HeliosGen | CATALOG-ONLY with caution | Oct 28 (S34) |
| Higgsfield AI Prompt Skill | OSideMedia/higgsfield-ai-prompt-skill | ADOPT-CANDIDATE | Oct 28 (S32, re-shared S37) |
| Higgsfield CLI | higgsfield-ai/cli | ADOPT-CANDIDATE (top find of batch) | Oct 28 (S36) |
| HyperFrames | heygen-com/hyperframes | ADOPTED — Route B renderer (already in stack) | Oct 28 (S35) |
| Hypit | hypit-ai/hypit via @charlieautomates DemU8amxpoC | ADOPT-CANDIDATE (license conditions unread) | Oct 28 (S48) |
| KangEngine | Gudegi/KangEngine | CATALOGED | Oct 28 (S27) |
| MongoDB GenAI Showcase | mongodb-developer/GenAI-Showcase | CATALOGED | Oct 28 (S47) |
| Nicky (bug bounty creator) | @someonenamenicky | DISSECTED — cataloged | Oct 28 (S23) |
| OpenHiggsfield | wide-trace/open-higgsfield | CATALOGED / WATCH with caution | Oct 28 (S33) |
| Project AIRI | moeru-ai/airi | CATALOGED / WATCH | Oct 28 (S29) |
| SIDOU | dsablic/sidou | CATALOGED | Oct 28 (S28) |
| SoulMatrix | AhmadHassan-BTed/SoulMatrix | CATALOG-ONLY | Oct 28 (S31) |
| timm (PyTorch Image Models) | huggingface/pytorch-image-models | CATALOGED | Oct 28 (S41) |
| "10 best repos for Claude" graphic (Impeccable, Onyx, Scrapling) | explore "GitHub AI" | not individually verified in this pass | Oct 29 |
| "32 open-source AI tools" roundup (AnythingLLM, Jan, LibreChat, ComfyUI, LTX) | explore "open source AI tool" | not individually verified in this pass | Oct 29 |
| "erase" gate (@david_knowsai setup) | @itstundeanthony / DfC10ExiGYa | LEARN-ONLY | Oct 29 |
| "Grok Bot" / GROK LOOP self-improving prompt loop | @therealyanjigb / DfE81EDqvX7 | LEARN-ONLY | Oct 29 |
| "Hermes" malware-panel supply-chain investigation | @carterperez.dev / DfFXDxkBKze | LEARN-ONLY | Oct 29 |
| "Private AI Operating System" — @restructureai | @restructureai / DfEBpHnAatB | WATCH | Oct 29 |
| "PROJECT FORTRESS" DoD commentary | @specialreport / DfA6007FPif | CONTEXT-ONLY | Oct 29 |
| 20 ML algorithms cheatsheet | @neuron.machinelearning / DejSYdxIvhX | LEARN-ONLY | Oct 29 |
| 9Drive — zenhosta/9drive | @ariacodez / DfFZSNfqTMr | LEARN-ONLY | Oct 29 |
| @alexxsharpx — personal outfit post | @alexxsharpx / DfFag3qRs_U | CONTEXT-ONLY | Oct 29 |
| @bentellect — comedy reel | @bentellect / DfAcqZMRyE7 | CONTEXT-ONLY | Oct 29 |
| @bleacherreport — LaMelo/Kuminga timeout clip | @bleacherreport / DfFap46uSJf | CONTEXT-ONLY | Oct 29 |
| @brwalkoff — Brewers World Series final-out clip | @brwalkoff / DfEFp16SQhA | CONTEXT-ONLY | Oct 29 |
| @chiefgyk3d photo, no caption | @chiefgyk3d / DezDUl1R8hE | CONTEXT-ONLY | Oct 29 |
| @dani_white12 — fashion carousel | @dani_white12 / DfDvlRYDTqa | CONTEXT-ONLY | Oct 29 |
| @dugoutforever — Vogelbach champion-as-coach | @dugoutforever / DfFXPAROEKY | CONTEXT-ONLY | Oct 29 |
| @esim3400 — Brewers World Series celebration post | @esim3400 / DfECbUpAclR | CONTEXT-ONLY | Oct 29 |
| @fuckjerry — "Team work" comedy clip | @fuckjerry / DfD43mlhtYR | CONTEXT-ONLY | Oct 29 |
| @houseofhighlights — NBA highlight clip (midday) | @houseofhighlights / DfFKMj0zy_6 | CONTEXT-ONLY | Oct 29 |
| @hurdles — Burfict career/suspension history reel | @hurdles / DfDD1omPmkc | CONTEXT-ONLY | Oct 29 |
| @lil.timm — uncaptioned Houston reel | @lil.timm / De4hFzOhl2h | CONTEXT-ONLY | Oct 29 |
| @mlb — William Contreras WBC + World Series champion | @mlb / DfECruPtam2 | CONTEXT-ONLY | Oct 29 |
| @mrintentional_ — motivational menswear post | @mrintentional_ / DfC_MhBMF90 | CONTEXT-ONLY | Oct 29 |
| @pjtradesnq — NQ trading reaction post | @pjtradesnq / DfD6GpPu2mn | CONTEXT-ONLY | Oct 29 |
| @quantscience_ carousel, no caption | @quantscience_ / DfE-_PLmHgA | CONTEXT-ONLY | Oct 29 |
| @quantscience_ photo, no caption | @quantscience_ / DfFVOetH50Y | CONTEXT-ONLY | Oct 29 |
| @remonbiz — AI slop app teardown thumbnail | @remonbiz / DfEZ5o1Ohqu | LEARN-ONLY | Oct 29 |
| @shootwithali — Friday the 13th dress fashion post | @shootwithali / DfFaLtkgTMv | CONTEXT-ONLY | Oct 29 |
| @solarcastarchive — "next lockdown will be digital" | @solarcastarchive / DfERlLZqLRp | CONTEXT-ONLY | Oct 29 |
| @yung.planet — BMO cosplay (Nova personality source) | @yung.planet / DfFYhI6J6dH | CONTEXT-ONLY | Oct 29 |
| Agentic workflow cheatsheet (LangGraph/CrewAI/AutoGen) | explore "AI agent workflow" | not individually verified in this pass | Oct 29 |
| Anthropic/biotech claim | @thetradingfraternity / DfDm-KKPmsL | CONTEXT-ONLY | Oct 29 |
| Brand commentary + "launch" gate | @angus.sewell / DfFQH_VRtmo | LEARN-ONLY | Oct 29 |
| ByteByteGo 12-MCP list | explore "MCP server" | not individually verified in this pass | Oct 29 |
| CamXploit — spyboy-productions/CamXploit | @dayofexploits / Dd7EFOEk9u4 | CONTEXT-ONLY | Oct 29 |
| cheahjs/free-llm-api-resources + LiteLLM/LocalAI/Open WebUI roundup | explore "free AI API" | not individually verified in this pass | Oct 29 |
| Claude SEO — AgriciDaniel/claude-seo | @gittrend.io / De9us3NAi0A | TEST | Oct 29 |
| codebase-memory-mcp — DeusData/codebase-memory-mcp | @fullstackparody / explore "MCP server" | FLAG | Oct 29 |
| CyberStrikeAI / TrendAI "44 AI agents" | @thehackernews / DfBSp6Cvi0g | LEARN-ONLY | Oct 29 |
| data_by_faro EPA-per-drive quadrant chart | explore sports | not individually verified in this pass | Oct 29 |
| fboutsiders DVOA explainer | explore sports | not individually verified in this pass | Oct 29 |
| Florida FLHSMV DAVID database breach | @mattjayy / DdErmDuNMwb | CONTEXT-ONLY | Oct 29 |
| FreeLLMAPI — tashfeenahmed/freellmapi | @cracked.artificial / DfDI4ByApuO | TEST | Oct 29 |
| Headroom — headroomlabs-ai/headroom | @voxaris_ai / De2nMPixp_n | TEST | Oct 29 |
| Houston Galleria house content | @donovanlancome / DfD5SUxO3KU | CONTEXT-ONLY | Oct 29 |
| Jio Platforms IPO news | @alpha_leaders / DfFWKciMO5d | CONTEXT-ONLY | Oct 29 |
| Kem verification-as-a-skill method | @kem_glitch / DfAIPrAtteM | LEARN-ONLY | Oct 29 |
| Kimi K3.1 Pro claims | @ohmo.ai / explore "new AI model" | CONFIRMED as Moonshot's published figures; independently UNVERIFIED (context CONFIRMED) | Oct 29 |
| LeBron courtside reaction clip | @houseofhighlights / DfD3ezoNn3K | CONTEXT-ONLY | Oct 29 |
| LLM-wiki commentary (Karpathy take) | @kem_glitch / DfFSZDvN6oV | CONTEXT-ONLY | Oct 29 |
| malicious-pdf — jonaslejon/malicious-pdf | @fork.cast_ / DdWWKxUFDmm | LEARN-ONLY | Oct 29 |
| masoud.kharat GPS/load/wellness monitoring platform explainer | explore sports | not individually verified in this pass | Oct 29 |
| Mesh LLM | Mesh-LLM/mesh-llm via @simplifyinai DfD_VBfGQbV | LEARN-ONLY / WATCH | Oct 29 (S49) |
| Mesh LLM — Mesh-LLM/mesh-llm | @simplifyinai / DfD_VBfGQbV | WATCH | Oct 29 |
| MoneyPrinterTurbo — harry0703/MoneyPrinterTurbo | @cracked.artificial / DfDI4ByApuO | CONTEXT-ONLY | Oct 29 |
| n8nstack automation-as-system layers post | explore "AI automation" | not individually verified in this pass | Oct 29 |
| nerdabovethenet CONTACT volleyball rally-level win probability model | explore sports | not individually verified in this pass | Oct 29 |
| nextgenstats — new 2026 NGS metrics | @nextgenstats / explore sports | add to NGS inventory/glossary | Oct 29 |
| Onyx platform — onyx-dot-app/onyx | explore "local LLM" | Real (license NOASSERTION, not clean MIT) | Oct 29 |
| OOMWOO — makerspet/oomwoo | @githubprojects / Dee733jvYUT | WATCH | Oct 29 |
| OpenBot explainer — CopilotKit/OpenBot | @simplifyinai / explore "open source AI tool" | No new facts beyond trending deep dive | Oct 29 |
| Openjutsu — D3voz/openjutsu | @githubsignals / DfCrknOAoua | WATCH | Oct 29 |
| OpenNavo — opennavo/OpenNavo | @gittrend.io / DfAWKNnjB9n | WATCH | Oct 29 |
| Opik — comet-ml/opik | @dailydoseofds_ / Deld9TBjYyr | TEST | Oct 29 |
| PHP2Shell attribution correction | @d3ndr1t30x / Dezvqx1mK8L | LEARN-ONLY | Oct 29 |
| ReelMimic — edenfunf/reelmimic | @gittrend.io / DeyOj96CRXH | LEARN-ONLY | Oct 29 |
| Saluki 27B — ConwayResearch/Underdog-Saluki-27B-1.0 | explore "new AI model" | Exists | Oct 29 |
| seb.ai "AI content team" — 7 roles | explore "AI agent workflow" | not individually verified in this pass | Oct 29 |
| seb.ai ChatGPT sports researcher workflow | explore sports | not individually verified in this pass | Oct 29 |
| Self-improving trading-bot architecture | @arwazaz_ / De2EFbZjBHi | LEARN-ONLY | Oct 29 |
| Stolen-iPhone iOS Shortcuts "secret text" location trick | @khanjicyber / DfDXKV4ziBl | LEARN-ONLY | Oct 29 |
| sundayfunday.mx Elo/Glicko/Bayes explainer | explore sports | not individually verified in this pass | Oct 29 |
| thelocktalk anytime-TD splits (nflverse reproduction) | @thelocktalk / explore sports | CLOSE / REPRODUCED (per claim — see section) | Oct 29 |
| thelocktalk nflverse methodology carousel | @thelocktalk / explore sports | content note — maps to Garrett's doctrine; no separate verdict | Oct 29 |
| tom.developer free sports APIs list | explore sports | not individually verified in this pass | Oct 29 |
| Univer — dream-num/univer | @gittrend.io / DfFAAhWiRDu | TEST | Oct 29 |
| Video-gen repo roundup (Open-Sora, Wan 2.1, CogVideoX, HunyuanVideo, AnimateDiff) | explore "open source AI tool" | not individually verified in this pass | Oct 29 |
| VoiceStudio — debpalash/VoiceStudio | @cracked.artificial / DfDI4ByApuO | WATCH | Oct 29 |
| Watcher — thalesgroup-cert/Watcher | @esgeeks / DeSJ_Gzo_n1 | TEST | Oct 29 |
| WishFish — kinghacker0/WishFish | @dayofexploits / DehqrYXlvC7 | CONTEXT-ONLY | Oct 29 |
| YouPi-PG — youpi-pg/YouPI-PG | @drcintas / DerepBfSJSK | WATCH | Oct 29 |
| Zero Breach Toolkit — interplains/Zero-Breach-Toolkit | @archive.genocide / DfAkXOeIRBm | TEST | Oct 29 |
| ZOON | @dayofexploits / De7bDCrEw3a | CONTEXT-ONLY | Oct 29 |

---

## GAP AUDIT — what was NOT read at content level, with counts

In Garrett's format: what was not read, not returned, not dossiered, not evaluated — and where the evidence lives. Nothing here was killed; every item below is cataloged with its closing step on record.

**Not classified / not dossiered (the big one):**
- **298 of 654 unique DM-share shortcodes remain UNCLASSIFIED.** The Oct 14 second pass dossiered 356; the other 298 were blocked by a single cause — Instagram provider HTTP 429 on the post endpoint from ~05:44 UTC, Oct 14 — unclassified, NOT deleted or private, and never retried around. Status at the last record that touches them (Oct 27 gap report): still unclassified. Re-pull kit (targets + script + raw cache of the 356) preserved in `~/workspace/second-pass/`. In v2's framing, 638 of 643 DM-only targets had no captions in the archive data at all; the second-pass re-pull is what converted 356 of them into dossiers.
- **49 of ~90 repos notated-not-evaluated** (Stream D residual; Stream D-2 owns them; the 17-repo Full-Court Press block is the largest cluster). 31 were deep-evaluated (15 full dossiers); 10 of the 90 are Beexly-owned.
- **Laya-as-GSE-gate eval: DESIGNED + ARMED, never run.** 3,081-row eval set, thresholds frozen, bar pre-registered; the completing pull needs DATABASE_URL (Garrett's credential class).

**Not returned by the provider (counted, closed as unreachable):**
- **43 saved posts** never returned (API claimed 310, returned 267) — Oct 13 mining.
- **4,220 liked posts** claimed by the API but never returned (14,998 claimed; 10,778 unique returned = the provider's proven ceiling, (corrected) from v1's ~14,498-unfetched framing).

**Sessions/artifacts lost or partial:**
- **Sep 10, 2026 self-thread write-up: LOST.** 103 shares / 98 media IDs were analyzed; the file no longer exists anywhere in the workspace. Counts and themes survive only in the Oct 16 provenance note and the Sep 10 daily log. 7 of its 98 items had no readable description even at the time.
- **Oct 1 sweep:** ~30 of ~40 accounts were never read fresh — the CLI stopped at 429 after @thelocktalk and @simplifyinai; their matrix rows rest on previously saved corpus material, confidence-labeled. 11 recommended follows were never executed (the CLI cannot follow; the browser pass was signed in as @gbeexly, not the GSE account).
- **Oct 27 round 2:** 36 of 40 feed posts and all 10 ads are inventory-only (no content-level read). Exemplar following lists are capped by Instagram's dialog: @angus.sewell 589 of 789 and @marc.kaz 4,079 of 4,279 entries past the 200-cap were not captured; @carterperez.dev is short exactly 1 of 306, unidentifiable from what Instagram showed. IG Saved (50) / Liked (30) counts date from the Oct 9–13 reads.

**Register items still open (Oct 27–29):**
- **S7 (reel DfAssuHthqK): UNREAD** — lookup timed out; author/caption/content unknown, never guessed.
- **S8 (@jakemok.io DezPwauKlaI): IDENTIFIED, NOT DISSECTED** — payload (spoken/on-screen) never pulled.
- **S9 (post DeLuAN4jr8a): LOGGED, NOT DISSECTED** — at Garrett's own instruction ("just mark that down"); media ID unresolved.
- **S48 (Hypit): license "conditions" file NOT read** — a hard blocker before any install/commercial use; 2,282 of 2,332 comments unread; the DM'd payload was not obtained (obtaining it requires commenting — barred by the no-messaging rule).
- **S49 (Mesh LLM): 106 of 136 comments unread**; DM'd payload not obtained (same rule). S1's reel duration was never verifiable from the player.

**Oct 29 run limits (as recorded in its own gap audits):**
- AM run: the CLI hit 429 on the 5th `post` call — only **4 of 20** dissected posts rest on full CLI JSON; 16 were built from stored annotation records; media-understanding 0/20 and comment fetches 0/20. The repo-depth pass later re-read 11 of them at primary source.
- AM inventory posts never dissected even after the deep-dive pass: positions #24 (@crssd), #27 (@starter_story), #29 (@thetradingfraternity bond-market claim), #30 (@knowgood), #32 (@feelwellbyanna), #34 (@kem_glitch #2), #35 (@jacobnach).
- Explore: 15 of 24 candidates received no individual verification in the triage pass (status carried as such in their entries, not invented). The anytime-TD reproduction sampled 3 of 16 seasons (2012/2018/2024); the full 2010–2025 aggregation was NOT COMPUTED.

**This consolidation's own limits:**
- The two self-archive dossiers (v1, 802,731 bytes / 9,309 lines; v2, 640,323 bytes) are **condensed, not reproduced** — their per-item dossier text, the 774-entry DM index, and the 267-save appendix live only in the originals: `~/workspace/goals/self-notes-dm-archive-and-action-board/files/self-archive-dossier-2026-10-13.md` and `~/workspace/your_files/self-archive-dossier-v2-2026-10-13.md`. Stream A's 356 one-line dossiers are carried in the master index; their full text is in `~/workspace/second-pass/stream-a-dossiers*.md`.
- Oct 27's X and GitHub lanes (MASSIVE-RECON Parts 2–5) are counted here, not merged — they belong to the X/GitHub consolidation, not this one.

**Where the evidence lives:**
- **175 raw capture JSONs at the workspace root** (`~/workspace/ig-*.json`), by filename pattern: 110 post captures, 39 media-understanding, 12 comments, 5 profile, 2 zeitgeist, 7 other/bare captures (incl. the `ig-ref-*` Nova reference pulls and `ig-marc-*`). These are evidence for the Oct 13–29 dissections; most were never individually dossiered beyond the posts they belong to.
- `~/workspace/second-pass/` — Stream A–E working files, raw cache, re-pull kit (`stream-a-targets.json`, `run_fetch.sh`, `finish_stream_a.sh`).
- `~/workspace/ig-sweep-2026-10-27/` — batch inputs/dossiers, deep batches, context JSONs (12 DM + 18 feed), round2 working files. `~/workspace/track-c-raw/` — creator-sweep full captions + media-understanding JSON (per the v2 dossier).
- `~/workspace/ig-sweep/` — Oct 1 raw profile/post JSONs (@thelocktalk, @simplifyinai) + the sweep script.
- `~/workspace/ig-for-you-sweep/` — Oct 29 reports, seen index (63 lines), raw inventories and explore candidates.
- Sports repo `docs/research/2026-10-01/ig-sweep/` @ `aa68e31` — Oct 1 deliverables (matrix, top-10 kernels, follow list, verified repos/APIs/datasets).

**What was checked for missed sessions in building this document:** all known IG directories and files above; the SHARED-ITEMS-REGISTER (S1–S49) in full; daily logs `~/memory/2026-09-10.md`, `2026-10-01.md`, `2026-10-10.md`, `2026-10-13.md`, `2026-10-14.md`, `2026-10-21.md`, `2026-10-26.md`, `2026-10-27.md`, `2026-10-28.md`, `2026-10-29.md` (grepped for sweep/dossier/dissection records). Sessions found beyond the three Garrett named: Sep 10, Oct 1, Oct 10, Oct 26, and the Oct 27–29 rolling register — all included above. No other Instagram sweep session exists in the record.
