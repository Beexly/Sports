# Galaxy Sports Edge (GSE) — Comprehensive Second Opinion & Commercial Architecture

**Prepared by:** Gemini (Autonomous Systems & Code Audit)  
**Date:** 2026-09-25  
**System of Record:** `C:\Users\Garrett\Sports` (with multi-agent coordination under `C:\Users\Garrett\agent-bus\sports`)  
**Target:** Scale recurring subscription and B2B data revenue to ~$300/day ($9,000/month) with minimal human intervention.

---

## 1. What GSE is

Galaxy Sports Edge (public site `galaxysportsedge.com`, X `@GalaxySportsHQ`) is a production Next.js 14 / TypeScript platform backed by Neon PostgreSQL, an automated multi-source sports data ingestion spine, a deterministic prediction engine, and an active Stripe subscription billing engine. This is an actual product with live payment infrastructure: Stripe keys have been active in production since 2026-07-09 ([`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md#L15)), server-side paywall entitlements are enforced in code ([`apps/web/lib/entitlements.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/entitlements.ts)), and 22 Vercel cron schedules handle data ingestion, scoring, and settlement. The Founding pricing ladder is locked in ([`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts): $14.99 Pro, $24.99 Elite, $4.99 Fantasy). A stranger with a credit card can sign up and pay today. The theater surrounding GSE is not the software itself, but the multi-agent cognitive sprawl on `agent-bus\sports`: dozens of JSON dispatches where AI agents debate 500-signal super engines, copulas, and 32 stadium turf friction matrices while production sits blocked on an unmerged PR and a single unrun deploy.

---

## 2. GSE Money paths, ranked

### Rank 1: The Founding Subscription Ladder ($14.99 Pro / $24.99 Elite)
* **Who pays:** Sports bettors and fantasy players seeking transparent, verifiable, data-backed models rather than tout marketing.
* **How much:** $14.99/mo ($99/yr) Pro; $24.99/mo ($179/yr) Elite. Per [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L108-L113):
  * 67 Pro = ~$1,000 MRR (Bootstrap survival)
  * 150 Pro + 20 Elite = ~$2,750 MRR (Rent & bills)
  * 400 Pro + 60 Elite + 100 Fantasy = ~$8,000 MRR (Full-time replacement)
* **What already exists in the tree:**
  * Complete Next.js 14 App Router codebase with 23 packages and strict TypeScript ([`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md)).
  * Neon PostgreSQL database with 2,641+ canonical settled picks ([`docs/2026-09-13-confidence-calibration-baseline.md`](file:///C:/Users/Garrett/Sports/docs/2026-09-13-confidence-calibration-baseline.md)).
  * Live Stripe integration with webhook handlers (`customer.subscription.created`, `invoice.payment_succeeded`, etc.) in [`docs/subscriptions-and-paywall.md`](file:///C:/Users/Garrett/Sports/docs/subscriptions-and-paywall.md).
  * Validated **Signal Path** (`generate-signal-slate.ts`): Win rate is 57.0% (n=423) at 60–69 confidence, 66.0% (n=247) at 70–79, and 67.8% (n=59) at 80–89 ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L15-L16)).
  * Display-side adverse edge suppression ([`apps/web/lib/picks/adverse-edge-suppression.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/picks/adverse-edge-suppression.ts)) to withhold negative expected-CLV picks from paying users without modifying the frozen model core.
* **What is missing:** Deploying PR #808 and PR #811 to Vercel production.
* **What can run without Garrett at the keyboard:** The entire pipeline: 22 Vercel cron schedules fetch data, score games, settle completed matchups, and update truth records. Stripe webhooks provision entitlements automatically.
* **First hard block that is truly his:** Approving the Vercel production merge/deployment and verifying the Stripe webhook signing secret in production env.

### Rank 2: B2B Sports Intelligence & Evidence API / Historical Data Licensing
* **Who pays:** Independent betting creators, sports analytics blogs, newsletter writers, or betting software tools seeking verified historical price data, BookGrade ratings (L-18 BPQI), or line movement consensus.
* **How much:** $99 to $299/month for API key subscriptions, or $750–$2,000 for one-off historical dataset / data-room access ([`docs/commercial/BUSINESS_MODEL_MAP.md`](file:///C:/Users/Garrett/Sports/docs/commercial/BUSINESS_MODEL_MAP.md#L11-L12) & [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L88-L90)).
* **What already exists in the tree:**
  * Append-only odds archive dating back to 2026-05-22 with millions of data points across 11+ sportsbooks ([`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L37-L41)).
  * Metric calculation modules for BookGrade (BPQI), PulseScore (BURS), Consensus Clock, and Line DNA ([`packages/feature-store`](file:///C:/Users/Garrett/Sports/packages/feature-store)).
  * Token-bucket rate limiting and API entitlement primitives in [`apps/web/lib/api-entitlement.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/api-entitlement.ts).
* **What is missing:** A clean public documentation page exposing the OpenAPI spec and an API key generator in user settings with Stripe metered billing.
* **What can run without Garrett at the keyboard:** Ingestion, metric computation, API routing, rate limiting, and Stripe billing run entirely unattended.
* **First hard block that is truly his:** Publishing the API Terms of Service (prohibiting raw feed resale) and activating Stripe B2B Price IDs.

### Rank 3: Disclosed Non-Gambling Media Sponsorships & Tool Partner Program
* **Who pays:** Sports tech tools, fantasy platforms, trading software, sports apparel, and newsletter brands. (Explicitly excludes sportsbooks and DFS affiliate deals per the F-6 doctrine in [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md#L118-L133)).
* **How much:** $250 to $1,000/month flat sponsorship per placement (newsletter header, board banner, or podcast/video mention) ([`docs/revenue/SPONSOR_MEDIA_KIT.md`](file:///C:/Users/Garrett/Sports/docs/revenue/SPONSOR_MEDIA_KIT.md)).
* **What already exists in the tree:**
  * Complete partner documentation: [`SPONSOR_MEDIA_KIT.md`](file:///C:/Users/Garrett/Sports/docs/revenue/SPONSOR_MEDIA_KIT.md), [`PARTNER_OUTREACH_PLAYBOOK.md`](file:///C:/Users/Garrett/Sports/docs/revenue/PARTNER_OUTREACH_PLAYBOOK.md), [`PARTNER_TARGET_LIST_TEMPLATE.md`](file:///C:/Users/Garrett/Sports/docs/revenue/PARTNER_TARGET_LIST_TEMPLATE.md).
  * Automated compliance rules enforcing strict FTC disclosures and blocking prohibited sportsbooks ([`apps/web/lib/revenue/responsible-gaming-policy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/responsible-gaming-policy.ts), [`offer-eligibility.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/offer-eligibility.ts)).
  * Public-facing route scaffolding at `/media-kit` and `/partners` ([`docs/commercial/90_DAY_COMMERCIALIZATION_PLAN.md`](file:///C:/Users/Garrett/Sports/docs/commercial/90_DAY_COMMERCIALIZATION_PLAN.md#L9)).
* **What is missing:** A live analytics widget displaying verified impression and pageview counts so partners can confirm reach without manual reporting.
* **What can run without Garrett at the keyboard:** Offer validation, compliance checking of sponsor copy ([`banned-copy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/banned-copy.ts)), and automated contract-date placement rendering.
* **First hard block that is truly his:** Sending 5 to 10 structured emails per day using the existing playbook templates to prospective software sponsors.

### Rank 4: Daily Fantasy (DFS) Optimizer & Prop Intelligence Suite
* **Who pays:** Serious daily fantasy players on DraftKings and FanDuel who need mathematical lineup generation and red zone opportunity metrics.
* **How much:** $4.99/mo or $49/yr (Fantasy tier) as a low-friction entry point below Pro ([`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts#L78)).
* **What already exists in the tree:**
  * DFS exact solver and optimizer edge logic in `apps/web/lib/fantasy/` (`dfs-exact.ts`, `dfs-optimizer-edge.ts`).
  * Prop models including red zone conversion metrics (`redzone-opportunity-conversion.ts`) with real NFL data.
  * Dedicated route `/fantasy/dfs` and fantasy pricing definitions.
* **What is missing:** Deploying the bug fix for TS2459 (missing exports in `dfs-exact.ts` that caused 8 Vercel 500 runtime errors on 2026-09-13, resolved in PR #808; see [`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L80-L89)).
* **What can run without Garrett at the keyboard:** Automated ingestion of DraftKings/FanDuel salaries and contest slates, constraint-based lineup generation, and player projection updates.
* **First hard block that is truly his:** Merging PR #808 to main and configuring `STRIPE_FANTASY_PRICE_ID` in Vercel.

---

## 3. What Grok underweighted in GSE

1. **The Production Codebase & Stripe Integration:**
   * Grok virtually abandoned `C:\Users\Garrett\Sports` to focus on offline website sales. Grok overlooked that GSE is a live, production-grade SaaS with active Stripe keys, NextAuth, and automated server-side entitlement checks ([`apps/web/lib/entitlements.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/entitlements.ts)).
2. **The Validated Signal Path:**
   * Grok treated the entire prediction engine as broken and radioactive. But Motif's live audit on 2,641 settled picks in Neon Postgres proved that the **Signal Path** (`generate-signal-slate.ts`, where confidence = blended `trueProb`) is statistically valid and beats the market:
     > *"Signal path (`generate-signal-slate.ts`, confidence = blended trueProb): 60–69 → 57.0% (n=423), 70–79 → 66.0% (n=247), 80–89 → 67.8% (n=59). Roughly honest, slightly conservative. LEAVE IT ALONE."* ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L15-L16)).
   * The defect was isolated exclusively to the heuristic weighted sum in the Book Path (`scoring.ts`), which inverted at the top (80–89 won 41.5%, 90–99 won 31.2%). PR #811 already created the display-side adverse edge suppression ([`apps/web/lib/picks/adverse-edge-suppression.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/picks/adverse-edge-suppression.ts)) to solve this without touching the core model freeze.
3. **The Pre-Engineered Pricing Ladder:**
   * Grok overlooked [`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts), which defines the exact Founding Phase ladder ($14.99 Pro, $24.99 Elite), the Grandfather Guarantee, and the milestone triggers to scale to $19.99/$29.99 upon reaching 100 canonical settled picks.
4. **The Complete Commercial Partner OS:**
   * Grok ignored the entire `Sports/docs/revenue/` and `docs/commercial/` folders, missing that media sponsorship packages, FTC disclosure engines, and partner outreach playbooks were already written.

---

## 4. What Grok overweighted in GSE

1. **Infinite Model Recalibration & "Book Path" Obsession:**
   * Grok spent days trying to fix the heuristic Book Path score. As proven in [`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L126-L132), isotonic regression (PAVA) is monotonic and cannot invert an anti-predictive curve. Grok got trapped trying to recalibrate an uncalibratable heuristic instead of simply displaying the already-calibrated Signal Path.
2. **Multi-Agent Bus Cognitive Sprawl:**
   * Multiple agents on `agent-bus\sports` spent dozens of cycles generating JSON messages about 32 stadium turf friction matrices, copulas, and 500-signal architectures while production sat broken on a runtime 500 error on `/fantasy/dfs`.
3. **Closing-Line-Value (CLV) as the Sole Validator:**
   * As recognized in [`agent-bus\sports\CHARTER.md`](file:///C:/Users/Garrett/agent-bus/sports/CHARTER.md#L18-L32), testing novel signals exclusively against closing lines on small pick samples killed every new idea. Rung-2 predictive power against actual game outcomes was ignored in favor of market-relative benchmarking.

---

## 5. Contradictions inside the Sports Tree

1. **Pricing Ladder Discrepancies:**
   * *The Contradiction:* [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) §3 and [`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md#L99-L100) specify Pro at $14.99/mo and Elite at $24.99/mo. However, [`docs/intelligence/monetization-lanes.md`](file:///C:/Users/Garrett/Sports/docs/intelligence/monetization-lanes.md#L19-L20) and [`docs/subscriptions-and-paywall.md`](file:///C:/Users/Garrett/Sports/docs/subscriptions-and-paywall.md#L8-L9) state Pro is $19/mo and Elite is $49/mo.
   * *Resolution & Authority:* **Believe [`apps/web/lib/pricing/pricing-phases.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/pricing/pricing-phases.ts).** The executable code implements the Founding rate ($14.99/$24.99) with an explicit milestone trigger (`minCanonicalSettledPicks: 100` + published calibration curve) required before advancing to $19.99/$29.99.
2. **Sportsbook Affiliate Bounties vs. The Brand Moat:**
   * *The Contradiction:* [`Sports/docs/revenue/CONTENT_AFFILIATE_OS.md`](file:///C:/Users/Garrett/Sports/docs/revenue/CONTENT_AFFILIATE_OS.md) provides checklists for affiliate monetization, whereas [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) §5 explicitly records the founder decision (F-6 DECIDED): *"no sportsbook or DFS affiliate revenue, permanently."*
   * *Resolution & Authority:* **Believe [`docs/business/GSE-BUSINESS-PLAN-2026.md`](file:///C:/Users/Garrett/Sports/docs/business/GSE-BUSINESS-PLAN-2026.md) and [`apps/web/lib/revenue/responsible-gaming-policy.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/revenue/responsible-gaming-policy.ts).** GSE's entire value proposition is *"We show our work. Nobody else in sports can."* Taking CPA bounties from books when users lose destroys the brand's core trust moat. Non-gambling software partnerships are allowed; sportsbook affiliate links are prohibited.
3. **Confidence Display vs. Probability Claims:**
   * *The Contradiction:* Older marketing docs describe confidence as win probability.
   * *Resolution & Authority:* **Believe [`CLAUDE.md`](file:///C:/Users/Garrett/Sports/CLAUDE.md#L66) Rule 8 and [`docs/positioning.md`](file:///C:/Users/Garrett/Sports/docs/positioning.md).** Positioning is strictly: *"We're not AI. We're math you can read."* Confidence is rendered as a raw factor score (e.g. "72/100"), never as an unsubstantiated win probability.

---

## 6. Thirty-day GSE execution bet

### The Bet: Turn On and Scale the GSE Founding Subscription Engine ($14.99 Pro / $24.99 Elite)

**The 30-Day Execution Steps:**
1. **Unblock Production (Day 1):** Merge and deploy PR #808 and PR #811 to Vercel. This fixes the runtime 500 error on `/fantasy/dfs` ([`AGENTS.md`](file:///C:/Users/Garrett/Sports/AGENTS.md#L80-L90)) and enforces `adverse-edge-suppression.ts` on the live board.
2. **Surface the Validated Signal Path (Days 2–5):** Ensure the public board sorts by true model edge ([`generate-signal-slate.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/generators/generate-signal-slate.ts)) rather than the uncalibrated heuristic book score. Display the honest track record (57%–68% win rate across 729+ settled signal picks).
3. **Automate Organic Teaser Distribution (Days 6–15):** Stand up a lightweight scheduled script that extracts 1 daily public teaser pick after slate settlement, renders an honest graphic (factor breakdown + cited data), and stages it for X (@GalaxySportsHQ) with zero tout hype.
4. **Scale to First Revenue Milestones (Days 16–30):** Direct verified traffic to `/pricing`. Target the milestone ladder: 67 Pro subscribers ($1,000 MRR) -> 150 Pro + 20 Elite ($2,750 MRR) -> 400 Pro ($8,000 MRR).

### What to Ignore On Purpose in GSE
* **Ignore the 500-signal super engine chatter on `agent-bus\sports`:** Stop adding experimental signal heads until 100 paying subscribers are actively using the platform.
* **Ignore heuristic book-path recalibration:** Leave the book path suppressed and let the Signal Path drive predictions.
* **Ignore sportsbook affiliate programs:** Keep the zero-affiliate pledge intact.

---

## 7. Do not (GSE Edition)

1. **Do not engage in calibration theater on the heuristic Book Path.** PAVA cannot invert a curve where higher scores correlate with worse outcomes.
2. **Do not flip `status: IMPLEMENTED` or bump `MODEL_VERSION` without passing all CI guardrails.** `scripts/guardrails/model-freeze.mjs` and `trust-gate.mjs` must remain untouched.
3. **Do not take sportsbook or DFS affiliate kickbacks.** Sacrificing the radical verification moat for short-term affiliate money will permanently destroy the platform's positioning.
4. **Do not allow agents to debate theoretical math on `agent-bus` while production routes have runtime errors.**
5. **Do not fabricate win rates, backtest records, or customer results.** Every number must trace to settled data in Neon Postgres.
