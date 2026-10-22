# Galaxy & Revenue Engine: Second Opinion on the Whole Company

**Prepared by:** Gemini (Autonomous Systems & Code Audit)  
**Date:** 2026-09-25  
**Audited Repositories:**  
1. `C:\Users\Garrett\Sports` (Galaxy Sports Edge — GSE)  
2. `C:\Users\Garrett\autonomous-revenue-engine` (Signal Origin / Micro-tool Factory)  
3. `C:\Users\Garrett\agent-bus` (Multi-agent coordination, sports research, stock desk)  
**Target:** ~$300/day ($9,000/month) recurring revenue, maximizing unattended operations.

---

## 1. What this is

This company is not a local web agency, not a micro-cap stock desk, and not an open-source prompt pack. Across all three repositories, there is exactly **one** product with an active production database, real authentication, an automated data ingestion pipeline, and an end-to-end payment rail: **Galaxy Sports Edge (GSE)** (`C:\Users\Garrett\Sports`). On GSE, Stripe has been live since 2026-07-09, server-side paywall entitlements are enforced in code ([`apps/web/lib/entitlements.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/entitlements.ts)), 22 Vercel cron jobs run automatically, and the Founding pricing ladder is locked in ([`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts): $14.99 Pro, $24.99 Elite). A stranger with a credit card can actually buy that subscription this week on `galaxysportsedge.com`. Everything else in `autonomous-revenue-engine` is commercial theater: `apps/kit` is a 65-line client-side HTML form ([`apps/kit/index.html`](file:///C:/Users/Garrett/autonomous-revenue-engine/apps/kit/index.html)) with zero Stripe wiring and no database; `apps/framefit`, `apps/reviewwall`, `apps/linknest`, `apps/stamp`, and `apps/board` are static, client-side browser utilities that cannot charge a user; `apps/qi-check` has a functioning score endpoint ([`apps/qi-check/app/api/score/route.js`](file:///C:/Users/Garrett/autonomous-revenue-engine/apps/qi-check/app/api/score/route.js)) but explicitly operates without auth or payments; and `clients/chick-goodies` is a one-off static website delivery for a Tomball charcuterie caterer. Meanwhile, the Alpaca "stock desk" in `agent-bus\outbox\from-grok` is nursing a $199.26 equity balance for a prospective profit of $3.47 on two resting limit orders, while multiple AI models on `agent-bus\sports` burn cognitive cycles debating 32 stadium turf friction matrices and copulas instead of making the production web application work.

---

## 2. Money paths, ranked

### Rank 1: Galaxy Sports Edge (GSE) Core Subscription Engine (Pro & Elite)
* **Who pays:** Sports bettors and fantasy players who want transparent, unmanipulated, model-backed sports analytics without tout hype.
* **How much:** $14.99/month ($99/year) Pro; $24.99/month ($179/year) Elite (Founding Phase pricing per [`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts)). Milestone economics: 67 Pro = ~$1,000 MRR; 150 Pro + 20 Elite = ~$2,750 MRR; 400 Pro + 60 Elite + 100 Fantasy = ~$8,000 MRR ([`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L108-L113)).
* **What already exists in the tree:** 
  * Full Next.js 14 App Router codebase with 23 packages and strict TypeScript ([`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md)).
  * Neon PostgreSQL database with 2,641+ canonical settled picks ([`docs/2026-09-13-confidence-calibration-baseline.md`](file:///C:/Users/Garrett/Sports/docs/2026-09-13-confidence-calibration-baseline.md)).
  * Live Stripe integration with webhook handlers for subscriptions (`customer.subscription.created`, `invoice.payment_succeeded`, etc.) in [`docs/subscriptions-and-paywall.md`](file:///C:/Users/Garrett/Sports/docs/subscriptions-and-paywall.md).
  * Validated **Signal Path** (`generate-signal-slate.ts`): Win rate is 57.0% (n=423) at 60–69 confidence, 66.0% (n=247) at 70–79, and 67.8% (n=59) at 80–89 ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L15-L16)).
  * Adverse-edge suppression gate deployed in code ([`apps/web/lib/picks/adverse-edge-suppression.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/picks/adverse-edge-suppression.ts)) to suppress bad book-path picks.
* **What is missing:** Vercel production deploy of the PR #808/#811 branch (which fixes the runtime 500 on `/fantasy/dfs` and applies adverse edge suppression to the live board).
* **What can run without Garrett at the keyboard:** The entire stack. 22 Vercel Cron jobs trigger odds ingestion, score generation, pick settlement, and daily truth metrics. Stripe webhooks provision entitlements automatically.
* **The first hard block that is truly his:** Approving the Vercel production deployment and verifying that the live Stripe webhook signing secret matches production env variables.

### Rank 2: B2B Sports Intelligence & Evidence API / Historical Data Licensing
* **Who pays:** Sports betting content creators, independent newsletter operators, sports analytics tools, and DFS researchers who need verified closing line history, consensus movement, or BookGrade ratings without paying $1,000+/mo for enterprise radar feeds.
* **How much:** $99 to $299/month for API access keys (metered or tiered), or $750–$2,000 for one-time historical data snapshots / data room access ([`docs/commercial/BUSINESS_MODEL_MAP.md`](file:///C:/Users/Garrett/Sports/docs/commercial/BUSINESS_MODEL_MAP.md#L11-L12) & [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L88-L90)).
* **What already exists in the tree:** 
  * Append-only odds archive dating back to 2026-05-22 with millions of data points across 11+ sportsbooks ([`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L37-L41)).
  * Pure calculation modules for BookGrade (BPQI), PulseScore (BURS), Consensus Clock, and Line DNA ([`packages/feature-store`](file:///C:/Users/Garrett/Sports/packages/feature-store)).
  * Token-bucket and API entitlement primitives in [`apps/web/lib/api-entitlement.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/api-entitlement.ts).
* **What is missing:** A single public route exposing the API documentation (OpenAPI spec), an API key generation screen in the user settings, and Stripe Billing meter setup.
* **What can run without Garrett at the keyboard:** The entire API query pipeline, rate limiting, and Stripe metered billing run autonomously on Vercel and Neon.
* **The first hard block that is truly his:** Formally publishing the API Terms of Service (restricting resale of raw feed data) and enabling Stripe B2B Price IDs.

### Rank 3: GSE Disclosed Media Sponsorships & Tool Partner Program
* **Who pays:** Non-gambling sports tools, creator SaaS, tracking software, sports apparel, and newsletter brands. Explicitly excludes sportsbooks/DFS affiliates per the F-6 doctrine in [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L118-L133).
* **How much:** $250 to $1,000/month flat sponsorship per placement (newsletter header, board banner, or podcast/video mention) ([`docs/revenue/SPONSOR_MEDIA_KIT.md`](file:///C:/Users/Garrett/Sports/docs/revenue/SPONSOR_MEDIA_KIT.md)).
* **What already exists in the tree:** 
  * A complete commercial partner system under [`Sports/docs/revenue/`](file:///C:/Users/Garrett/Sports/docs/revenue/): [`SPONSOR_MEDIA_KIT.md`](file:///C:/Users/Garrett/Sports/docs/revenue/SPONSOR_MEDIA_KIT.md), [`PARTNER_OUTREACH_PLAYBOOK.md`](file:///C:/Users/Garrett/Sports/docs/revenue/PARTNER_OUTREACH_PLAYBOOK.md), [`PARTNER_TARGET_LIST_TEMPLATE.md`](file:///C:/Users/Garrett/Sports/docs/revenue/PARTNER_TARGET_LIST_TEMPLATE.md).
  * Automated compliance rules enforcing strict FTC disclosures and blocking prohibited sportsbooks ([`apps/web/lib/revenue/responsible-gaming-policy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/responsible-gaming-policy.ts), [`offer-eligibility.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/offer-eligibility.ts)).
  * Route foundations at `/media-kit` and `/partners` ([`docs/commercial/90_DAY_COMMERCIALIZATION_PLAN.md`](file:///C:/Users/Garrett/Sports/docs/commercial/90_DAY_COMMERCIALIZATION_PLAN.md#L9)).
* **What is missing:** A live analytics widget or verified public metric counter (impressions/pageviews) on the `/media-kit` page so sponsors can verify reach without manual screenshots.
* **What can run without Garrett at the keyboard:** Offer validation, compliance scanning of partner copy ([`banned-copy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/banned-copy.ts)), and contract-date placement display.
* **The first hard block that is truly his:** Sending 5 to 10 structured emails per day using the existing playbook templates to prospective software sponsors.

### Rank 4: Automated Local Lead & Missing-CTA Website Replacement (Kit as a Remote Productized Offer)
* **Who pays:** Local home-service trades (HVAC, roofers, plumbers) whose existing web pages fail mobile conversion checks (no tap-to-call link, broken viewport).
* **How much:** $199–$350 one-time setup, or $29–$49/month including hosting and automated quote notifications.
* **What already exists in the tree:** 
  * `tools/page-grade.py` and `tools/grade-trades.py`: Autonomous tools that crawl trade websites and classify them as KEEP (has `tel:` link), REPLACE (loads, but no tap-to-call), or DEAD ([`tools/page-grade.py`](file:///C:/Users/Garrett/autonomous-revenue-engine/tools/page-grade.py)).
  * `apps/kit/index.html`: Fully functioning in-browser site generator producing clean, responsive HTML with prominent `tel:` buttons ([`apps/kit/index.html`](file:///C:/Users/Garrett/autonomous-revenue-engine/apps/kit/index.html)).
* **What is missing:** Moving away from Grok's manual "walk into shops" fiction. What is missing in code is a 30-line script that takes the REPLACE URLs, auto-generates a hosted preview at `https://autonomous-revenue-engine-eight.vercel.app/preview/{slug}`, and embeds a Stripe Checkout link ("Click to purchase and claim this mobile-optimized site").
* **What can run without Garrett at the keyboard:** Prospector scanning local directories via Python, grading pages, generating the preview HTML, and staging email drafts with the preview link.
* **The first hard block that is truly his:** Authorizing email sends (or buying a domain for cold outreach) and creating the Stripe Payment Link.

### Rank 5: Specialized Daily Fantasy (DFS) Optimizer & Prop Intelligence Tier
* **Who pays:** High-volume daily fantasy players on DraftKings and FanDuel seeking mathematical lineup construction without tout narratives.
* **How much:** $4.99/month or $49/year (Fantasy tier) as a low-friction entry point below Pro ([`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts#L78)).
* **What already exists in the tree:** 
  * DFS exact solver and optimizer edge logic in `apps/web/lib/fantasy/` (`dfs-exact.ts`, `dfs-optimizer-edge.ts`).
  * Prop models including red zone conversion metrics (`redzone-opportunity-conversion.ts`) with real NFL data.
  * Dedicated route `/fantasy/dfs` and fantasy pricing definitions.
* **What is missing:** Deploying the bug fix for TS2459 (missing exports in `dfs-exact.ts` that caused 8 Vercel 500 runtime errors on 2026-09-13, resolved in PR #808; see [`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L80-L89)).
* **What can run without Garrett at the keyboard:** Automated ingestion of DraftKings/FanDuel salaries and contest slates, constraint-based lineup generation, and player projection updates.
* **The first hard block that is truly his:** Pushing PR #808 to main and configuring `STRIPE_FANTASY_PRICE_ID` in Vercel.

### Rank 6: Direct Agency Close (Charcuterie Chick & Local Trade Wrap-Up)
* **Who pays:** Tricia Holfelder (`clients/chick-goodies`), plus any direct inbound client.
* **How much:** $600 for the completed Charcuterie Chick multi-page web platform ([`.work-review/04-review.md`](file:///C:/Users/Garrett/autonomous-revenue-engine/.work-review/04-review.md#L98), [`tools/profit-gate.py`](file:///C:/Users/Garrett/autonomous-revenue-engine/tools/profit-gate.py#L76)).
* **What already exists in the tree:** Complete 15-page static site in `clients/chick-goodies/samples/sample-3` with passing QA gates, exact SEO titles/descriptions, FAQPage JSON-LD, real event photos, and menu tables.
* **What is missing:** Final DNS switch to `charcuteriechick.ai`, client acceptance, and invoicing.
* **What can run without Garrett at the keyboard:** Static hosting on Vercel.
* **The first hard block that is truly his:** Sending the final deliverable link to Tricia, collecting the $600 balance, and closing the ticket. (Ranked last because it is one-time client service labor, not a recurring $300/day unattended engine).

---

## 3. What Grok underweighted

1. **The GSE Production Machine and Pricing Ladder:**
   * Grok completely ignored that `C:\Users\Garrett\Sports` has a fully implemented Stripe subscription system, NextAuth, and server-side entitlement checks ([`apps/web/lib/entitlements.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/entitlements.ts)).
   * Grok overlooked [`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts), which defines the exact Founding Phase ladder ($14.99 Pro, $24.99 Elite), the Grandfather Guarantee, and the milestone triggers to scale to $19.99/$29.99 upon reaching 100 canonical settled picks.
2. **The Validated Signal Path:**
   * Grok treated the entire prediction engine as broken and radioactive. But Motif's live audit on 2,641 settled picks in Neon Postgres proved that the **Signal Path** (`generate-signal-slate.ts`, where confidence = blended `trueProb`) is statistically valid and conservative:
     > *"Signal path (`generate-signal-slate.ts`, confidence = blended trueProb): 60–69 → 57.0% (n=423), 70–79 → 66.0% (n=247), 80–89 → 67.8% (n=59). Roughly honest, slightly conservative. LEAVE IT ALONE."* ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L15-L16)).
   * The defect was isolated exclusively to the heuristic weighted sum in the Book Path (`scoring.ts`), which inverted at the top (80–89 won 41.5%, 90–99 won 31.2%). PR #811 already created the display-side adverse edge suppression ([`apps/web/lib/picks/adverse-edge-suppression.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/picks/adverse-edge-suppression.ts)) to solve this without touching the core model freeze.
3. **The GSE Business Plan of Record:**
   * [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) mapped the exact math to replace full-time income ($8,000 MRR from 400 Pro + 60 Elite + 100 Fantasy) based on an asymmetric competitive moat: *"We show our work. Nobody else in sports can."* Grok ignored this comprehensive plan to chase 26 walk-in one-page websites.
4. **The B2B Media & Partner System:**
   * `C:\Users\Garrett\Sports\docs\revenue\` contains complete, production-ready partner policies, media kits, outreach playbooks, and FTC compliance checkers that provide an immediate path to $250–$1,000/mo sponsorship checks without taking gambling affiliate risk.

---

## 4. What Grok overweighted

1. **The $350 Kit Walk-In Campaign:**
   * Grok reduced a company with 23 software packages and an enterprise-grade sports data spine into a fantasy where Garrett—an unemployed, disabled founder—physically prints flyers (`kit-pack/flyer.pdf`) and walks into 5 brick-and-mortar storefronts in The Woodlands to pitch a 65-line static HTML file ([`apps/kit/index.html`](file:///C:/Users/Garrett/autonomous-revenue-engine/apps/kit/index.html)).
   * The arithmetic (26 kits × $350 = $9,100) is elementary school multiplication disconnected from sales reality, lead fatigue, and physical constraints.
2. **The $200 Alpaca Micro-Trading Desk:**
   * Grok created multiple Windows Task Scheduler scripts (`StockDeskNickelSell`, `StockDeskNickelBuy`), OpenBB integrations, and risk gates ([`agent-bus/outbox/from-grok/risk_gate.py`](file:///C:/Users/Garrett/agent-bus/outbox/from-grok/risk_gate.py)) to manage an account with $199.26 equity and $10.50 cash holding 68 shares of OPEN and 1 share of SOFI.
   * As measured on 2026-09-24, if both resting limit orders fill, the net gain is **$3.47**. Building institutional quantitative architecture for a $3.47 gain while the owner needs $300/day is severe operational blindness.
3. **`tools/profit-gate.py` as an "Autonomous Treasurer":**
   * This script ([`tools/profit-gate.py`](file:///C:/Users/Garrett/autonomous-revenue-engine/tools/profit-gate.py)) hardcodes `kit_350`, `charcuterie_600`, and `open_sofi_if_both_sells_fill` directly into test assertions. It is not an enterprise financial control system; it is a rigid script enforcing Grok's narrow fixations.
4. **Scraped Prompt Pack Obsession & Infrastructure Theater:**
   * Grok spent days digesting the 249-item saved-post board ([`AGENT-IMPLEMENTATION-HANDOFF__1 (1).md`](file:///C:/Users/Garrett/Downloads/AGENT-IMPLEMENTATION-HANDOFF__1%20%281%29.md)), Grok Bot workshop transcripts, and the 382-skill NVIDIA Brev catalog ([`grok-bot-galaxy-review (2).md`](file:///C:/Users/Garrett/Downloads/grok-bot-galaxy-review%20%282%29.md) §13). Setting up multi-agent cognitive architecture on Brev GPU instances with no published per-hour price caps while the primary web application was throwing HTTP 500 errors in production is the definition of AI theater.

---

## 5. Contradictions

1. **GSE Subscription Pricing Ladder: Business Plan vs. Docs vs. Code:**
   * *The Contradiction:* [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) §3 and [`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md#L99-L100) specify Pro at $14.99/mo ($99/yr) and Elite at $24.99/mo ($179/yr). However, [`docs/intelligence/monetization-lanes.md`](file:///C:/Users/Garrett/Sports/docs/intelligence/monetization-lanes.md#L19-L20) and [`docs/subscriptions-and-paywall.md`](file:///C:/Users/Garrett/Sports/docs/subscriptions-and-paywall.md#L8-L9) state Pro is $19/mo and Elite is $49/mo.
   * *Resolution & Authority:* **Believe [`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts).** The code implements the "Founding" tier ($14.99/$24.99) with an explicit milestone trigger (`minCanonicalSettledPicks: 100` + published calibration curve) required before human approval can advance prices to "Proven" ($19.99/$29.99). The code governs runtime billing.
2. **Affiliate Monetization: The Zero-Affiliate Pledge vs. Affiliate Docs:**
   * *The Contradiction:* [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) §5 explicitly records the founder decision of 2026-08-20 (F-6 DECIDED): *"no sportsbook or DFS affiliate revenue, permanently."* It killed C-17 (sportsbook odds widget) and R-7 (sportsbook affiliate applications). Yet [`Sports/docs/revenue/CONTENT_AFFILIATE_OS.md`](file:///C:/Users/Garrett/Sports/docs/revenue/CONTENT_AFFILIATE_OS.md) and parts of `autonomous-revenue-engine` still draft affiliate schemes.
   * *Resolution & Authority:* **Believe [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) and [`apps/web/lib/revenue/responsible-gaming-policy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/responsible-gaming-policy.ts).** GSE's entire market position is *"We show our work. Nobody else in sports can."* Taking CPA kickbacks when a user loses at a book destroys the brand's core trust moat. Non-gambling software partnerships remain valid; gambling affiliate bounty is dead.
3. **"Autonomous Revenue Engine" as a Live Business vs. Static Demos:**
   * *The Contradiction:* The documentation in `autonomous-revenue-engine/ops/` continuously claims `https://autonomous-revenue-engine-eight.vercel.app/` is a multi-product commercial business generating daily cash flow.
   * *Resolution & Authority:* **Believe the source code.** Every app in `autonomous-revenue-engine/apps/` (`kit`, `framefit`, `linknest`, `reviewwall`, `brain`) is client-side static HTML/JS without Stripe, database tables, or authentication. It is a showcase of prototypes, not an autonomous business.

---

## 6. Thirty-day bet

### The Bet: Turn On and Scale the Galaxy Sports Edge (GSE) Founding Subscription Engine ($14.99 Pro / $24.99 Elite)

This is the only asset that possesses a functioning product engine, data ingestion, database, user auth, and live payment processing.

**The 30-Day Execution Sequence:**
1. **Unblock Production (Day 1):** Merge and deploy PR #808 and PR #811 to Vercel. This fixes the production HTTP 500 crashes on `/fantasy/dfs` ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L80-L90)) and applies `adverse-edge-suppression.ts` to ensure no negative expected-CLV picks are displayed on the public board.
2. **Promote the Signal Path Exclusively (Days 2–5):** Ensure the public board sorts by true model edge ([`generate-signal-slate.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/generators/generate-signal-slate.ts)) rather than the uncalibrated heuristic book score. Display the honest track record (57%–68% win rate across 729+ settled signal picks).
3. **Automate Organic Attention (Days 6–15):** Stand up a single lightweight script that runs once daily after slate settlement, selects the top public teaser pick, formats it into an automated graphic using the logic from `apps/board`, and stages an honest post for X (@GalaxySportsHQ) with zero tout language ("Math you can read", citing the factor breakdown).
4. **Activate the Founding Price Ladder (Days 16–30):** Enforce the Founding rates ($14.99/mo Pro, $24.99/mo Elite). Drive traffic to `/pricing`. Target the first milestone: 67 Pro subscribers ($1,000 MRR), ramping into the NFL/NCAAF season toward 400 subscribers ($8,000 MRR).

### What to Ignore On Purpose
* **Ignore the Alpaca Stock Desk entirely:** Let the two resting sell orders execute or cancel them. Do not allocate a single minute or dollar to micro-cap equity trading.
* **Ignore door-to-door Kit walk-ins:** Do not walk into shops. If Kit is ever sold, sell it via remote automated email outreach with self-serve Stripe checkout links.
* **Ignore the 249-item prompt board:** Close `AGENT-IMPLEMENTATION-HANDOFF__1 (1).md` and stop saving other people's Instagram/X marketing prompts.
* **Ignore uncapped GPU clouds:** Do not launch NVIDIA Brev or AWS instances without hard spend limits.
* **Ignore multi-agent research debates on `agent-bus`:** Halt all agent discussions about 500-signal copula engines and turf friction until the live website has paying customers.

---

## 7. Do not

1. **Do not engage in calibration theater on the heuristic Book Path.** The isotopic PAVA calibrator cannot invert an anti-predictive curve. Attempting to fit complex isotonic or logistic heads on heuristic weighted scores that get worse at high confidence is a mathematical trap ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L126-L132)). Rely on the Signal Path and market offsets.
2. **Do not trade the $200 Alpaca account.** Options and crypto were formally rejected by the broker. $10 of cash cannot generate $300 a day. Any agent claiming otherwise is hallucinating.
3. **Do not pitch Kit as a physical walk-in service.** Demanding an unemployed operator pound the pavement to sell raw HTML files for $350 is an absurd use of engineering leverage.
4. **Do not touch sportsbook or DFS affiliate programs.** The F-6 decision in [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) is final. Sacrificing the radical verification moat for $50 DraftKings bounties will permanently destroy GSE's brand authority.
5. **Do not spin up Brev or cloud GPU instances without hard spend caps.** The Brev catalog does not publish per-GPU-hour pricing in its skill files. Running unmetered autonomous agent loops on cloud hardware is a guaranteed path to unexpected debt.
6. **Do not build 3D WebGPU cinematic experiences before generating cash.** The 434-line `BUILD-BIBLE.md` with WebGPU shaders, Theatre.js timelines, and Three.js canvases is pure distraction until the core business produces baseline revenue.
7. **Do not invent win rates or tamper with frozen model gates.** `scripts/guardrails/model-freeze.mjs` and `trust-gate.mjs` exist to keep the operation legally and ethically sound. Never bypass them to fabricate marketing claims.
