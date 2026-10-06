# IG Sweep 2026-10-01 — Master Intelligence Matrix

Aggressive-but-legal OSINT sweep of every Instagram account/post Garrett shared 2026-09-28 → 2026-10-01. Public info only. Gated items labeled GATED. instagram-cli hit 429 after 2 accounts (thelocktalk, simplifyinai profiles + thelocktalk posts) — all instagram-cli reads stopped per policy; remainder via signed-out browser reads, web search, and GitHub API.

**Sweep method per account:** profile (bio, counts, website) → recent posts (captions, claims, engagement) → chase every public lead (repo README + license via GitHub API, public docs, papers) → extract kernel → verdict.

**Verdict key:** ADOPT = use as-is · ADAPT = re-implement/learn the method, rebuild as GSE's own · RESEARCH-only = learn from, don't integrate · WATCHLIST = not now, revisit on trigger.

---

## SPORTS-DIRECT ACCOUNTS

### @thelocktalk — The Lock Talk | Jason Seo (26,778 followers, US, creator, not verified)
Bio: "Ex-hedge fund analyst on sports betting / Strategy, bankroll & sharp angles / Premium plays below". 2,951 posts.

| Post | Type + exact claim | Data source | Repo/API | License | Kernel for GSE | GSE equiv / gap | Verdict | Wiring target | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| Dd4TpsFicXE | Carousel: "watch only the 1st quarter" — 3 prompts: The Script (60% of teams better on scripted plays since 2007), The Stop (1Q ≈ 9 combined pts vs 14 in 2Q), The 1Q Math (1Q = 20% of scoring but 37% of home edge; key numbers 0/3/4/7) | Creator claims, UNVERIFIED | None | N/A | 1Q structural framework: scripted-drive decay, early-down defense tempo, quarter-specific home-edge scaling | Props lane can use 1Q derivatives; engine has no quarter-level model | ADAPT | 1Q spread/total micro-model in props slate; validate scripted-play claim vs nflverse | High (full transcription on file) |
| DdWfk6OFfZf | Carousel: "LIVE BETTING GENIUS" — Lag Check (broadcast delay vs book feed), Overshoot (clock arithmetic vs genuine revision), Chase Test (discipline) | Creator claims (54% live handle, 393 new markets — UNVERIFIED) | None | N/A | Live-prediction analytical structure; "books do clock arithmetic, not game-watching" = GSE's CV differentiator thesis | No live-prediction lane exists | ADAPT | Live win-prob lane design doc; latency truth → never build reaction-speed features on broadcast feeds | High |
| (TD/HR prompt sets) | Touchdown/HR prompt carousels, transcribed to action board | Creator | None | N/A | Prompt-engineering patterns for pre-game analysis | Engine prompts exist | ADAPT | Compose with existing prompt library | High |
| Dd3-CSsleBd | 1Q spread leaders 2026 — fastest-starting teams | Creator compiled | None | N/A | 1Q ATS leaderboard mechanic | No 1Q leaderboard | ADAPT | Weekly 1Q ATS board (internal) | Medium |

GATED: ~21 prompts behind "comment NFL" DM gates across posts (TD set, live-NFL set, 1Q set). Requires Garrett's phone taps. Monitoring: post cadence ~daily; prompt-carousels are the recurring kernel.

### @invisibleinsiderstats (267,626 followers)
Separate browser sweep in flight (parent agent). Fold findings here when delivered. Prior read (2026-09-30): funnel = contrarian/"rigged" hooks → trends carousels → comment-gated lead magnets → Betting Insider app. Dossier: `docs/research/2026-10-01/COMPETE-invisibleinsiderstats-dossier.md`. Kernels to steal: daily cadence, trends-carousel containers, comment-gated magnets, data-compatible contrarian hooks. REFUSE: "rigged" framing, vibes-only records.

### @fieldcoachai (verified) — "Computer Vision for Sports"
Reel DZ6J49Evm-v (2026-06-22): CV film demo — player boxes (PID/TID), Metrics panel (Break Angle 92°, Sep @ Break 2.1 yds, Sep @ Catch 1.4 yds), Feedback panel ("Crisp direction change"...). Full intel: `docs/research/2026-10-01/ig-fieldcoachai-reel-intel.md`.
Kernel: breakAngle / sepAtBreak / sepAtCatch as derived CV metrics → WR route-quality → props. Verdict: ADAPT. Wiring: post-homography derived-metrics spec in `packages/prediction-engine/src/tracking/` (weight 0, shadow). Confidence: high.

### @ethandojo (Ethan Do, ~6.8K) — NFL-tech creator
Kernel (fully reverse-engineered 2026-09-25, see `~/memory/people/ethandojo.md`): XGBoost on nflverse 2018+ (QB EPA/dropback, explosive rate, turnover margin, pass rush, point diff, availability, roster carryover as team-minus-opponent differentials), walk-forward, 10k Monte Carlo sims. Posted 10-6 / 11-5 (2026 W1-W2). 9 build ideas spec'd in v2 handoff (5 compose with existing engine modules: highlight detector, coverage analyzer, game predictor, 4th-down grader, draft copilot; 5 fresh: contract values, trade analyzer, exploit finder, AI OC, film splitter).
Verdict: ADAPT (methodology, not code — no public repo found). Wiring: v2 fullspec handoff on agent bus awaiting coder. GATED: "10+ extra ideas" behind comment-keyword DM gates; story highlights need a follow.
Confidence: high (profile-swept, record posted publicly).

### @GridironInfo_ — IDENTITY UNVERIFIED
Mentioned in corpus; web search surfaces "The Gridiron Expert" (different account, thegridironexpert.com, $69.99–$99.99 pick packages) — do NOT conflate. No verified profile read (instagram-cli rate-limited). Verdict: RESEARCH-only until identity confirmed. Monitoring: re-attempt profile read next pass.

---

## CV / FILM-PIPELINE LANE

### @billy.coder → Meta SAM 3D Body
Post Dd44d_RlFWo: "$2,295 mocap suit vs free mocap from one camera" — 70 body points, single 77MB file, mobile backbone. Caption: code Apache-2.0, weights under Meta SAM license.
Verified: `facebookresearch/sam-3d-body` — 3,588 stars, pushed 2026-02-19, repo license NOASSERTION (no LICENSE file); code is Apache-2.0 per Meta, weights under Meta SAM License; MHR parametric model Apache-2.0; community ONNX ports exist (SAM3DBody-cpp).
Kernel: single-camera full-body 3D mesh → player pose/mesh from broadcast footage; quality-path alternative to FreeMoCap (AGPL).
GSE equiv/gap: CV lane has YOLO boxes + tracklets; no pose/mesh yet.
Verdict: ADAPT with license diligence — read Meta SAM License redistribution/acceptable-use terms before any product use; MHR (Apache-2.0) is the clean part.
Wiring: film-pipeline pose-estimation candidate, QUEUED FOR EVALUATION. Confidence: high.

### @simplifyinai (34.4k, "Simplifying AI", support@simplifyingai.co)
| Post | Claim | Repo | License (verified 2026-10-01) | Kernel | Verdict |
|---|---|---|---|---|---|
| DddNPtGGayH | EgoExoMoCap: full-body mocap from smart glasses, ECCV 2026 paper | eth-siplab/EgoExoMoCap (153★) | MIT | Glasses-fused mocap | RESEARCH-only (needs 2+ smart glasses) |
| DdqpiDaGdUF | RelateAnything: real-time open-vocabulary visual relation prediction from any boxes/masks; browser demo | Maelic/RelateAnything (802★) | AGPL-3.0 | Play segmentation, semantic moment search (who blocked whom, who beat coverage) | RESEARCH-only — AGPL = learn, don't integrate |
| DdyQEqMGb2U | FreeMoCap: USB webcams → 3D skeletal motion, <$100 | freemocap/freemocap (10,366★) | AGPL-3.0 | $0-ish mocap for content lane | RESEARCH-only — AGPL rejected for product |
| DdNiW4Um_nn | InstantHMR: 3D pose+mesh from ONE phone image, one ONNX file, distilled from SAM 3D Body, ~10mm of SOTA | mohamdev/InstantHMR (170★) | Apache-2.0 | On-device pose extraction — most accessible of the trilogy | ADAPT — cleanest license of the mocap set |
| Dd0TsF7mWcV | OpenMuse: persistent personal agent (browser, terminal, files; iOS/Android/web; alpha) | CopilotKit/openmuse (3,521★) | MIT | Max-autonomy agent surface | ADAPT — evaluate vs Minis/Hermes phone setup |
| Ddb3j0cR6QZ | "Lot Vulture AI": parking model trained ENTIRELY on synthetic Blender data, holds up on real footage | Project UNVERIFIED (no repo found) | N/A | METHOD, not project: synthetic Blender scenes as answer to film pipeline's hand-labeling gate | ADAPT the method — synthetic football scenes for play segmentation/replay discrimination/field calibration |
| DdtLoI-mfGB | "coingecko-jev": CoinGecko's official Jev companion repo, crypto trades in real time | NOT FOUND — github.com/coingecko/coingecko-jev 404s, org search 0 results | N/A | None — claim unverified | REJECT the claim; note as engagement-bait pattern |

Wiring targets: InstantHMR → content-lane pose eval; RelateAnything → film-pipeline eval (test on synthetic scenes first, no footage rights needed); synthetic-data method → generate labeled football scenes via Blender (pairs with Scenario's Blender skills). Confidence: high (all repos GitHub-verified).

### @quantscience_ (42k) → QuantMuse
Post Dd4JGF1lIhA: "production-ready" quant trading (AI/ML, multi-factor, sentiment, backtesting, Python+C++). Verified: `0xemmkty/QuantMuse` — MIT, 2,965★, last pushed 2025-07-29 (stale 14 months).
Kernel: factor/sentiment/backtesting components conceptually adjacent to engine modeling. Verdict: RESEARCH-only (learning resource; paper-trading-only boundary; equities domain, not sports). Confidence: high.

---

## AGENT / INFRA LANE

### @gittrend.io (127k)
| Post | Repo (verified) | License | Kernel | Verdict |
|---|---|---|---|---|
| DdsCgnIgtJK — Kev: free self-hosted Jev stand-in, same API, Qwen3.5/3.8 0.8B/4B/9B, answers as probabilities | jaredpalmer/kev (8,152★) | Apache-2.0 | Reopen parked Jev lane at $0 (codila's Jev playbooks vs Kev) | ADAPT — parked until Garrett reopens |
| Dd48PPdDfaq — Scenario skills: 65 skills teaching coding agents media generation via MCP, price-before-spend | scenario-labs/skills (812★) | MIT | Media-gen for viral-video factory, thumbnails, Vow&Post mockups | ADOPT |
| DdxEoJlF82H — TypeLLM: type-safe LLM structured output, 228/231 JevBench, no hallucinations | TypeLLM/TypeLLM (903★) | Apache-2.0 | Structured-output plumbing for every agent pipeline (shot lists, extraction, QC) | ADOPT |
| Dd2nedYGwM8 — motion-skills: 50 skills in 17 packs teaching agents motion graphics/video/charts; deliver-and-verify loop | iart-ai/motion-skills (634★) | MIT | Agent-made motion graphics for content lane | ADOPT |

### @dhirajjij → awesome-llm-apps
Post Dd1WUg-SYHn (comment-to-DM gate): "100+ open-source production-ready apps, 100k+ stars". Strong match: `Shubhamsaboo/awesome-llm-apps` — 140,482★, 20,582 forks, Apache-2.0. Exact DM'd repo unverified.
Kernel: `agent_skills/` installable patterns → agent-fleet workflows. Verdict: ADAPT (45 leverage items already ranked, landed d71069d). Confidence: medium-high.

### @syntaix.ai → 5 agent-tooling repos (DdgD41ciZeY, "203K+ stars" checks out ≈206k)
docling-project/docling (68,199★, MIT) — document parsing for RAG · pocketbase/pocketbase (61,215★, MIT) — 1-file realtime backend · qdrant/qdrant (34,882★, Apache-2.0) — vector DB · apify/crawlee (25,942★, Apache-2.0) — scraping/browser automation · Unstructured-IO/unstructured (15,520★, Apache-2.0) — doc ETL.
Kernel: Docling/Unstructured (ingest) → Qdrant (vector) → WeKnora (wiki) + PocketBase (backend) + Crawlee (acquisition) = complete $0 knowledge-infrastructure stack.
Verdict: ADAPT as an evaluated stack, not five adoptions. Crawlee note: respect robots/ToS; no credentialed scraping without Garrett's word. Confidence: high.

### @lasthumannode → GitHub's most-starred week 9.21–9.27 (DdzDG1qoHH3)
Reel's numbers were WEEKLY stars gained, not totals. All five verified:
1. paperclipai/paperclip (95,655★, MIT) — "manage agents at work": tasks + spending limits + dashboard. Kernel: fleet-management layer the agent bus lacks. ADAPT — evaluate for Motif/Hermes/OpenCode fleet with spend caps.
2. vectorize-io/hindsight (44,180★, MIT) — "Agent Memory That Learns". Kernel: shared learning-memory across Motif/Hermes/OpenCode. ADAPT.
3. cloudflare/security-audit-skill (23,247★, MIT) — multi-phase security audits, machine-readable findings. Kernel: automated first-pass auditor before Motif's QC gate. ADAPT.
4. Tencent/WeKnora (31,318★, NOASSERTION) — docs → queryable RAG + self-maintaining wiki. Kernel: wiki over docs/research/<date>/. RESEARCH-only until license reviewed.
5. anthropics/financial-services (38,276★, Apache-2.0) — Claude finance toolkit. Low priority (his finance lane is balance-checks, not deal memos).
Confidence: high.

### @aitechorigin (1.8M) → open-source tools carousel (Dd2tZCCDofx; "10 repos" but 9 shown — engagement-bait inflation)
getmaxun/maxun (17,602★, AGPL-3.0) · webstudio-is/webstudio (9,003★, AGPL-3.0) · OpenWhispr/openwhispr (8,870★, MIT) · plasmicapp/plasmic (7,052★, MIT) · inovector/mixpost (3,746★, MIT, 6mo quiet) · duongductrong/Snapzy (3,239★, BSD-3, macOS-only) · coollabsio/shoutrrr (398★, Apache-2.0) · 0xsline/OpenChatCut (2,061★, AGPL-3.0; carousel's path 404'd — big accounts don't verify paths).
Kernel: OpenWhispr = THE SLEEPER — local voice-to-text for Garrett's garbled dictation (MIT, clean). Rest = bake-off candidates per slot (scraping, scheduling, editing), not adoptions.
Verdict: ADOPT OpenWhispr; RESEARCH-only AGPL items. Confidence: high.

### @seb.ai → 5 AI trading repos (via dmdaddy mirror of his carousel)
asavinov/intelligent-trading-bot (1,876★, MIT) · HKUDS/Vibe-Trading (34,414★, MIT) · freqtrade/freqtrade (54,975★, GPL-3.0) · TauricResearch/TradingAgents (109,447★, Apache-2.0) · agiprolabs/claude-trading-skills (405★, MIT).
Kernels: (1) TradingAgents' multi-agent debate (bull/bear/researcher) → GSE ensemble debate mechanic for picks; (2) his comment-gate funnel ("comment Team" → auto-reply DM; 3.2K likes / 6.4K comments) → lead-magnet mechanic for GSE content.
Verdict: ADAPT the debate framework + funnel mechanic; paper-trading-only boundary on trading code. Confidence: high (repos verified; funnel mechanics from public skill docs).

### @sebastianhardy_ (74k) → open-source agency stack (Dd40YRPxuEB)
firecrawl/firecrawl (186,904★, AGPL-3.0) · twentyhq/twenty (57,732★, NOASSERTION) · chatwoot/chatwoot (37,356★, NOASSERTION) — "turn into paid client work this week; charge for the audit, charge again for the build."
Kernel: audit-then-build pricing mechanic for Kit lane. Verdict: ADAPT the business mechanic; RESEARCH-only the AGPL/NOASSERTION code. Confidence: high.

### @datasciencebrain → daily AI mini-projects
deepakdj007/daily-ai-mini-projects (1★, no license — build guides, not code products); interview-coach: Gemini Live API real-time webcam+mic interview coach (filler-word counts, body language, scored report).
Kernel: real-time multimodal pattern (1 fps vision + audio → live scoring) — adjacent to the CV watch loop's "watch and judge" shape. Verdict: ADAPT the pattern. Confidence: medium.

### @voxaris_ai → voxaris-ai/voxaris-website (Next.js 14, TS, Tailwind; voxaris.ai)
AI agency/dev shop. No GSE kernel beyond "competitor packaging reference". Verdict: WATCHLIST. Confidence: medium.

### @power.ai (812k) → Whop neobank repost (Dd3nTJlGxwq)
Same blueprint as @albert.olgaard (Dd0m7HOFiJu): whop.com/blog/neobank-blueprint — white-label neobank (their infra, you set fees). Two large accounts in 24h = coordinated creator seeding. @power.ai frames "clone Ramp" (B2B) vs "kill Coinbase" (consumer).
Verdict: WATCHLIST — premature (needs money-moving audience); nearer-term: sell Vow & Post ON Whop as digital products. Confidence: high.

### @ariacodez → "Powerful Tricks/websites" series (#replitPartner, #QuiverQuantPartner — partner content, discount accordingly)
- Dd4IbDBqren: one-prompt Replit app "Find the name. Follow the record." — searches every lawsuit via CourtListener APIs (Free Law Project, free API). Kernel: CourtListener as free structured legal-data API → due-diligence tooling pattern. ADAPT.
- DdzFa44Kcci: perchance.org — free unlimited generators (image/video/photo-editor). Kernel: $0 asset pipeline for content lane. ADAPT with quality check.
- Ddg-NW7KHcv: Claude connectors → Quiver Quant (public congressional + Form 4 insider data) + Robinhood → daily 6am position management. Kernel: scheduled-connector agent loop; Quiver's public insider data as a signal-source pattern. ADAPT the loop shape; trading execution stays paper-only.
Confidence: medium (from stored media-understanding narratives).

---

## TACTICS / SEO / MISC

### @borja.obeso
- DdMpH81FuKw: ".gov backlinks via SAM.gov/SBA registration" — caption honestly notes registration ≠ backlink. Verdict: SKIP (doesn't qualify; low value).
- DdKB0pXFg_b: Google Trends category-drill → trending keywords before Ahrefs updates. Legit mechanic, overstated novelty ("BREAKING" hype; feature is years old). Verdict: ADAPT the mechanic for GSE content SEO.
### @kem_glitch — interface starter skins for AI coding workflows (Ddt7qfgNFh8)
6 skins (Tributary, Quest, Gulp, Thread, Arcade, Studio) built with Claude Code. GATED: repo link not public in post. Monitoring: watch for public link.
### @sahni.ai (36k) — Jev ad-intelligence (Dd5HTrSDeJ2)
"Pulled 724 live ads from 37 brands" via Jev — ad-spy-at-scale use case. Lane PARKED at Garrett's word; filed as use-case data point only.
### @softwarewithnick (297k) — Devin Desktop (Dd5HTrSDeJ2→Db5PHMWAa6Q)
Cognition's agent IDE (ex-Windsurf, ~$250M acq.). Commercial; no kernel beyond "agent command center" validation for paperclip eval.
### @parasmadan.in — OpenAI Dev Day 2026 (Dd4kd_EkgNL)
News (GPT-6 Astra agents, GPT-6.1 Sol pricing). No kernel; pricing intel for model routing.
### @azeem_explains — "secret hidden AI websites" (DdePxRHk3mB)
Engagement bait; one real tool class (free video gens). Filed, low priority.
### @autoinvent_ — AutoInvent (Dd10cOlujGD)
Expired-patent mining + AI improvement prompts, "comment REINVENT" gate. Kernel: mine not-in-force patents via Google Patents (free) — already folded into patent-mining lane.
### @wassimyounes_ — AI/tech news roundup (Dd4ECagxvm2)
News-reel format; "all of this is gold to know" per Garrett. Kernel: news-roundup format for GSE content. Monitor.
### @angus.sewell — Higgsfield "heist pipeline" (Dd4qCXuSNQl)
AI persona pipeline; pairs with mocap findings for content lane. RESEARCH-only.
### @deeptech — profile URL in corpus; no analysis captured. Re-attempt next pass.
### @marc.kaz, @github_dev, @artificialntellligence — in corpus as known accounts; no verified posts/repos found this pass. Re-attempt next pass.
### @thederekgray, @learnaifaster, @albert.olgaard (covered), @syntaix.ai (covered), @codingknowledge (covered: Dd4F7OYkoeB tutorial listicle — XGBoost+SHAP validation only)

---

## GATED / INACCESSIBLE (labeled, not pursued)
1. ~21 @thelocktalk prompts behind "comment NFL" gates (TD, live-NFL, 1Q sets) — needs Garrett's phone taps.
2. @ethandojo "10+ extra ideas" behind comment-keyword DM gates; story highlights need a follow.
3. @kem_glitch starter-skins repo link not public.
4. @seb.ai / @dhirajjij / @sahni.ai / @fieldcoachai DM-gated resources (comment-to-DM) — no comments/DMs made (off-limits).
5. @invisibleinsiderstats deep read — separate browser task in flight; fold in on delivery.
6. instagram-cli rate-limited after 2 accounts — 30 accounts' fresh profile/post reads remain for a later pass.

## MONITORING
- thelocktalk: daily prompt carousels (highest signal for props/live lanes).
- simplifyinai / gittrend.io / aitechorigin / lasthumannode: repo-drop carousels (infra + CV).
- seb.ai / quantscience_: trading repo carousels (modeling-adjacent ideas).
- ethandojo: weekly NFL picks + build series (benchmark lane).
- fieldcoachai: CV product demos (film-pipeline output-shape reference).
- Re-run instagram-cli pass after rate-limit cooldown for the 30 unread accounts.
