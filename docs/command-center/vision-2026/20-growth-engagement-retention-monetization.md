# Vision 2026 — Growth · Engagement · Retention · Monetization

**Workstream:** Forward-looking ("what to ADD to be the best-in-class product of 2026"), NOT a re-audit.
**Date:** 2026-06-09 · **Author:** research subagent (read-only; docs only)
**Posture:** trust-first · reveal-less on the proprietary recipe · no real-money/chance gambling · responsible-gaming · compliance-as-code.

**Tags used throughout:** `safe-now` (build today, no live switch) · `founder-gated` (needs a founder to flip a switch/spend) · `legal-gated` (needs counsel sign-off) · `aspirational` (real, but further out).

> Grounding rule honored: every "we have X today" is a `file:line` or audit/data-mesh citation; every "2026 best-in-class" benchmark carries a web source. Two clones labeled on every claim:
> **DEPLOY** = `C:/Users/Garrett/Sports` (launch target, narrower) · **CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` (full platform).

---

## 0. The one-paragraph thesis

GSE has already built the *hardest* parts of a 2026 growth engine and left them **inert or clone-stranded**: a compliant free skill game (Beat the Model), a notification spine (Novu), a share-link spine (Dub), a daily content anchor (Brief), a weekly dead-air puzzle (Cipher), and a proof-gated pricing ladder. What is missing is not infrastructure — it is the **loop wiring**: an identity/streak layer on the free game, a triggered daily/lifecycle cadence, a closed referral attribution loop, and a lifecycle-email program (Klaviyo, currently absent entirely). The 2026 bar for a consumer subscription product is a DAU/MAU stickiness ≥20%, Day-30 retention in the 10–18% "productivity/utility" band, a 4%+ free→paid conversion sustained by progressive value gates, and a working viral coefficient even at K=0.3–0.5. GSE can hit that bar **without dark patterns** because its trust-first posture is itself the differentiator: every leading paid competitor (Outlier, Action Network) sells data depth but ships **no** daily-habit game, **no** free community hook, and **no** streak mechanic. That is open white space, and it is exactly the space a "prove-it, don't-trust-me" brand is licensed to own.

---

## 1. What we have TODAY (grounded inventory of the growth/engagement stack)

| Primitive | State today | Clone | Citation |
|---|---|---|---|
| **Beat the Model** free pick'em | Built, compliant, **localStorage-only** — no account, no streak, no leaderboard, no share, no server record | CANONICAL only (grep "Beat the Model" in DEPLOY = 0 hits) | `components/fantasy/beat-the-model.tsx` (whole file); audit `03-brand-marketing-copy.md:47-49` |
| **Novu** notifications (in-app/email/push) | Wired to **welcome** (`auth.ts:63`) + **subscription-confirm/upgrade** (`stripe/route.ts:87`). The daily-habit workflows (`pick-alert-*`, `gse-rating-mover`) are **defined but never triggered**. No-op without `NOVU_API_KEY`. | CANONICAL | `lib/notifications/novu.ts:19-26`; trigger grep shows only auth + stripe callers |
| **Dub** share links | Helper to build UTM/short links for picks (`buildPickShareUrl`). **No referral attribution loop, no reward.** No-op without key. | CANONICAL | `lib/analytics/dub.ts:68-94` |
| **Brief** (daily habit anchor) | Composer exists | CANONICAL | `lib/brief/compose.ts`; surfaced `app/brief` |
| **Glass Box Cipher** (weekly hidden-puzzle, AI-proof shards, Mon–Thu ET "no-game window") | Built; reward **founder-gated** (manual claim, never auto-comped) | CANONICAL | `lib/cipher/cipher.ts:1-44` |
| **Academy / scenarios** (skill-builder content) | Built | CANONICAL | `lib/academy/scenarios.ts`, `lib/fantasy/academy.ts` |
| **Pricing-phase ladder** (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY, proof-gated, grandfather guarantee) | Built, human-gated, defaults FOUNDING | CANONICAL | audit `04-financials-monetization.md:74-76`; `lib/pricing/pricing-phases.ts` |
| **Stripe** checkout/portal/idempotent webhook | Production-grade, gated only by env presence | both | audit `04:21-27,106` |
| **Entitlements** FREE/PRO/ELITE, `dailyPickLimit=1` for FREE | Server-side, fail-closed | both | audit `04:13-19`; `packages/types/src/index.ts:7,88` |
| **n8n** automation, **PostHog/Langfuse** analytics | Wired, no-op without keys (OSS stack) | CANONICAL | memory `project-gse-oss-stack`; `lib/automation/n8n.ts` |
| **Klaviyo / lifecycle-email program** | **ABSENT** — grep "klaviyo" across canonical lib = 0 hits | neither | grep result (this session) |
| **Referral attribution / reward ledger** | **ABSENT** — Dub builds links but nothing closes the loop | neither | (gap) |
| **Streak / identity / cohort retention layer** | **ABSENT** | neither | grep streak/leaderboard → only incidental matches |

**Read of the inventory:** the engine is ~70% pre-built but *unwired and clone-stranded*. The single highest-leverage move is not new infrastructure — it is **(a) port Beat the Model to DEPLOY and give it an identity/streak/leaderboard spine, (b) trigger the dormant Novu daily workflows, (c) close the Dub referral loop, (d) stand up a Klaviyo lifecycle program.**

---

## 2. The 2026 best-in-class bar (web-verified benchmarks)

| Metric / mechanic | 2026 best-in-class bar | Source |
|---|---|---|
| **DAU/MAU stickiness** | ~20% good, ≥25% strong | RevenueCat / enable3 / getstream (below) |
| **Day-1 retention** | 25–30% (iOS ~24%, Android ~21%) | UXCam / Business of Apps |
| **Day-7 retention** ("habit forms or dies") | 10–15% | getstream / enable3 |
| **Day-30 retention** (utility/productivity band — closest analog to a daily intelligence tool) | 10–18% | enable3 / UXCam |
| **Fast activation** | value within **3 min** → ~2× retention; 55% of trial cancels happen **Day 0** | getstream / enable3 |
| **First-90-day push** | ≥1 push in first 90 days → **3× more likely to retain** | enable3 |
| **Freemium free→paid** | 3–5% good, 8–12% great; sustainability needs **≥4%** or progressive gates | First Page Sage / Pulseahead |
| **Trial length** | 17–32-day trials convert at **42.5% median** (~70% better than <4-day) | enable3 / RevenueCat |
| **3-tier pricing** | converts **~1.4×** vs 2-tier, **~1.8×** vs 4+-tier; middle tier should be the best value & target margin | Price Intelligently via orbix / glencoyne |
| **Anchoring** | adding a high "Enterprise" anchor lifted mid-tier conversions **+28%** (Slack) with zero feature change | orbix.studio |
| **Decoy / bundle** | good-better-best lifts AOV **15–25%** | smartsmssolutions / evelance |
| **Referral** | double-sided used by **78%** of consumer programs; **K=0.3–0.5 still materially lowers CAC** (you don't need K>1) | viral-loops / saber.app |
| **Streaks (Duolingo)** | next-day retention **12%→55%**; churn **47%→28%**; DAU **+36% YoY**; XP/streaks **+60% engagement** | yukaichou / strivecloud / orizon |
| **Welcome flow** | 3 emails is optimal; welcome emails generate the most revenue of any flow | Klaviyo / Flowium |
| **Winback** | keep to ~3 emails; target the *reason* they left | Klaviyo |

**Competitive read (sports-prediction specific):** the leading paid tools compete on *data depth and EV tooling*, not on habit/community. **Outlier.bet** = 7-day trial, no permanent free tier, three tiers ($19.99 / $29.99 / $79.99), and **no streaks, no free daily picks, no community/gamification** (bettingnews review). The category's engagement is largely **off-platform in Discord** (daily "good morning" messages, react-to-wins, 30/60/90 cohort tracking) rather than in-product — meaning the in-product daily-habit loop is *unowned* in this category. GSE's compliant, on-platform, trust-first loop is a genuine wedge.

---

## 3. The recommendations — a daily-habit + lifecycle + referral + packaging program

Ordered by leverage. Each item: mechanic · why it works (benchmark) · concrete tooling · tag.

### TIER A — Daily-habit loop (the thing that makes them come back DAILY)

**A1. Ship the daily free value, then escalate the gate — "1 free signal/day" → a *reason to open it every day*.** `safe-now`
- Today FREE gets `dailyPickLimit=1` (`04:17`). That is a *cap*, not a *hook*. Reframe it as a **daily ritual**: one free, fully-reasoned GSE Rating read per day, delivered at a fixed time, with a "yesterday's call settled X" honesty line. This is the activation primitive: deliver value in <3 min (2× retention — getstream) and give a fixed daily reason to return (stickiness).
- Mechanic: a `/today` surface (the orphaned `/today` page already exists in CANONICAL — `02-product-ia-ux.md:23` — wire it in) that always has *one* new, free, dated, reasoned read. Progressive gate: depth/extra picks blur behind PRO (the tier-gate pattern already blurs depth not rating — `02:87`).
- Tag: `safe-now` (no money switch; uses existing entitlements + tier-gate).

**A2. Give Beat the Model an identity + streak + leaderboard spine — the single biggest retention unlock.** `safe-now` (game) / `founder-gated` (any reward)
- Today it is localStorage-only, no account, no streak, no social (`beat-the-model.tsx:39-61`). Add: (1) optional account-linked record so picks survive devices; (2) a **streak** = consecutive weeks you logged a call before kickoff (loss-aversion is the documented engine — "protect it from collapse," yukaichou; Duolingo next-day 12%→55%); (3) a **"You vs the Model" season scoreboard** and an opt-in **public leaderboard** (skill, not money).
- **Ethical guardrail (honor the posture):** measure the *right thing*. Duolingo's lesson is "measure learning, not sessions" (yukaichou). For GSE that means the streak rewards **logging a reasoned call**, never wagering, never spend; cap visible streak pressure; offer a humane "streak freeze"/repair; no shame copy. This keeps it a *tool for the user*, not a *trap* — directly on-brand.
- Tooling: existing component + a small `BeatTheModelEntry` table; PostHog (available) for cohort/streak analytics. Any *reward* for streaks stays `founder-gated` (mirror Cipher's manual-claim model — `cipher.ts:21`).
- Tag: `safe-now` to build the streak/leaderboard; `founder-gated` for any comp/reward.
- **Port to DEPLOY first** — it is self-contained and compliant, and the launch tree currently has **zero** top-of-funnel growth mechanic (`03:47-49`).

**A3. Trigger the dormant daily Novu workflows (the first-90-day push that triples retention).** `founder-gated` (needs `NOVU_API_KEY`)
- `pick-alert-elite/strong` and `gse-rating-mover` are **defined but never fired** (`novu.ts:19-26`). Wire the publish pipeline to trigger them, and add a **daily-digest** workflow ("your free read is ready · last call settled X"). Benchmark: ≥1 push in first 90 days = **3× retention** (enable3).
- Honesty constraint: alerts must respect the fail-closed truth contract — never push a "live" read on stale data (the read-side freshness gap is a known audit P1, `00-EXEC:118`); push only settled/fresh content.
- Tag: `founder-gated` (founder sets the key + opt-in defaults); building the trigger wiring is `safe-now`.

**A4. Use Cipher + Brief to own the *dead air*.** `safe-now`
- Cipher already targets the Mon–Thu ET "no-game window" (`cipher.ts:16-18`) — exactly the retention valley. Promote it into the daily loop (a Cipher tease in the daily digest), and make Brief the daily editorial anchor. These are built; they just need to be *surfaced in the daily cadence* rather than sitting orphaned.
- Tag: `safe-now`.

### TIER B — Lifecycle / email (the retention + conversion compounding layer)

**B1. Stand up a Klaviyo lifecycle program — it does not exist today and is the biggest single gap vs the 2026 bar.** `founder-gated` (Klaviyo MCP available in this session; needs account + key)
- Welcome series (3 emails — Klaviyo's documented optimum; welcome flows generate the most revenue of any flow): #1 instant "here's your first free read + how we prove it," #2 (+2d) the trust story ("proven, not explained"), #3 (+4d) the Beat the Model invite + first PRO value tease.
- **Free→PRO upsell flow** keyed to *engagement*, not time: fire after a FREE user hits the daily cap N times or builds a 2-week streak (progressive value gate — the documented path to ≥4% sustainable freemium conversion, Pulseahead). Slack-style anchoring in the email (show ELITE to make PRO feel like the value pick — +28%, orbix).
- **Winback** (~3 emails, target the *reason* — Klaviyo) on PRO→FREE downgrade or `PAST_DUE`. Note the audit's dunning gap: one failed invoice instantly drops to FREE with no grace (`04:70-72`) — a Klaviyo dunning/winback flow + a Stripe Smart-Retries grace window is both a revenue-save and a UX-save.
- **Klaviyo MCP is available** (`mcp__plugin_marketing_klaviyo__*`) — auth-gated; founder connects the account. Build the *flow specs + event taxonomy* now (`safe-now`), connect later (`founder-gated`).
- Tag: spec/taxonomy `safe-now`; live sends `founder-gated`.

**B2. Event taxonomy + cohort instrumentation (so retention is *measured*, not guessed).** `safe-now`
- PostHog/Amplitude are available (this session: `mcp__plugin_marketing_amplitude__*`, plus PostHog in the OSS stack). Instrument the canonical loop events: `daily_read_viewed`, `btm_pick_locked`, `streak_extended`, `cipher_shard_found`, `paywall_viewed`, `checkout_started`. Track DAU/MAU stickiness (target ≥20%), D1/D7/D30 by cohort, and time-to-activation (<3 min target).
- Tag: `safe-now` (analytics are read-only telemetry; respect the reveal-less posture — never log the proprietary method, only the interaction).

### TIER C — Referral / virality (lower CAC even at K<1)

**C1. Close the Dub referral loop — attribution + double-sided, non-cash reward.** `founder-gated` (reward) / `safe-now` (mechanic)
- Dub builds share links (`dub.ts`) but nothing attributes a signup back to a referrer or rewards it. Add a referral ledger: referrer link → referee signup → both get a **non-cash** reward (e.g., +N days PRO, or an ELITE-week — *not* money, honoring "no autonomous money"). 78% of consumer programs are double-sided (viral-loops); even **K=0.3–0.5 meaningfully lowers CAC** (saber.app) so this pays off well before going "viral."
- Natural share surface already exists: `buildPickShareUrl` (`dub.ts:68`) — make the *shared artifact* a settled, honest "the model called this; I trusted/faded it" card (proof-led, not hype — stays inside the banned-phrase scanner, `03:71`).
- Tag: mechanic `safe-now`; the reward grant (comping PRO days) is `founder-gated` — it spends product margin, so a founder enables it, mirroring the Cipher reward model.

**C2. "Beat the Model" public season + shareable scorecard = built-in virality.** `safe-now`
- A user's season "X-Y vs the Model" record is inherently shareable and credibility-building (it shows the model is honest enough to *let you fade it*). This is the trust-first answer to tout-service "lock of the day" hype, and it is a viral artifact that doubles as proof.
- Tag: `safe-now`.

### TIER D — Pricing / packaging (convert without dark patterns)

**D1. Keep 3 tiers; make PRO the obvious-value middle; anchor with ELITE.** `founder-gated` (numbers) / `safe-now` (page mechanics)
- 3 tiers convert ~1.4× vs 2 and ~1.8× vs 4+ (glencoyne); the middle tier must be the *disproportionately good deal* and your target margin (evelance). GSE already has FREE/PRO/ELITE (`04:13`). Reconcile the **two-clone price split first** — DEPLOY shows $19/$49 monthly-only; CANONICAL shows Founding $14.99/$24.99 + annual (audit P0, `04:43-56`). Pick CANONICAL's `pricing-phases.ts` as source of truth.
- Add annual toggle everywhere (CANONICAL has it; DEPLOY doesn't — `04:50`): annual smooths churn and lifts LTV. Long trials convert ~70% better (42.5% at 17–32 days — enable3) — if a trial is offered, make it long, not 4-day.
- Tag: page/toggle mechanics `safe-now`; final prices + any Stripe price object are `founder-gated` (and must not be created until the clone split is reconciled — `04:56`).

**D2. Hold the proof-gated ladder (this is the anti-dark-pattern moat).** `safe-now` (discipline, no change)
- `pricing-phases.ts` only raises price when honesty milestones are met, with a grandfather guarantee (`04:76,110`). Keep `PRICING_PHASE=FOUNDING` until milestones are *real*. This is the rare case where the *restraint* is the growth asset: "we only charge more when we've proven more" is shareable trust copy.
- Tag: `safe-now` (do nothing — keep the gate).

---

## 4. Responsible-gaming / trust guardrails baked into every mechanic (non-negotiable)

- **Streaks measure reasoning, never wagering/spend.** Humane streak repair, no shame copy, opt-out — the documented line between "tool" and "trap" (yukaichou). Adolescent/compulsive-risk caution is a known gamification ethics concern (abstractmediaverse) — keep pressure low and reversible.
- **No money is ever auto-comped.** Referral/streak/Cipher rewards stay founder-gated, mirroring the existing Cipher manual-claim model (`cipher.ts:21`) and the inert-lever guard that fails on any live URL (`04:29,107`).
- **No fabricated outcomes in any loop.** Beat the Model already refuses to fake results ("Results post after the week's games settle" — `beat-the-model.tsx:198,299`); every notification/email must respect the read-side freshness gate so nothing stale is pushed as "live" (`00-EXEC:118`).
- **All copy passes the banned-phrase scanner.** Lifecycle emails + share cards are marketing copy — route them through `lib/trust-claims.ts` / content-engine compliance (`03:71`), and extend the scanner's static allowlist to cover them (the scanner today covers ~8 of 60+ pages — `03:39-41`).
- **Helpline + RG text consistent.** Resolve the helpline inconsistency (1-800-GAMBLER vs 1-800-522-4700 — `03:31-33`) before any email program ships; emails are a regulated surface.

---

## 5. Sequenced build order (highest leverage first; all compliant)

1. **Port Beat the Model → DEPLOY** + add identity/streak/leaderboard spine + shareable season scorecard. `safe-now` (game) — closes the "launch tree has no growth loop" gap (`03:47-49`) and lands A2+C2 together.
2. **Wire the daily free read** (`/today` un-orphaned) + **instrument the event taxonomy** (PostHog/Amplitude). `safe-now` — lands A1+B2.
3. **Build the Klaviyo flow specs + Novu daily triggers** (code-complete, key-gated). `safe-now` to build; `founder-gated` to turn on — lands A3+B1.
4. **Close the Dub referral loop** (ledger + double-sided non-cash reward). `safe-now` mechanic; `founder-gated` reward — lands C1.
5. **Reconcile pricing to one source of truth, add annual toggle + ELITE anchor.** `founder-gated` numbers — lands D1; D2 is "keep the gate."

None of 1–5 flips a live money/legal switch; each is wiring, instrumentation, or a founder decision. The live switches (Novu/Klaviyo keys, reward grants, Stripe prices, `PRICING_PHASE` advance) stay correctly founder/legal-gated.

---

## 6. Available tooling map (what's connectable in this session)

| Need | Tool (this session) | Gate |
|---|---|---|
| Lifecycle email | Klaviyo MCP (`mcp__plugin_marketing_klaviyo__*`) | founder connects account/key |
| Product analytics / cohorts | Amplitude MCP (`mcp__plugin_marketing_amplitude__*`), PostHog (OSS stack) | founder/key |
| Push / in-app / email triggers | Novu (already in code, `novu.ts`) | `NOVU_API_KEY` |
| Referral short-links + attribution | Dub (already in code, `dub.ts`) | `DUB_API_KEY` |
| Payments / coupons / trials | Stripe MCP (`mcp__stripe__*`) — coupons, prices, payment links | founder; reconcile clone split first |
| Marketing analytics / SEO | Ahrefs, SimilarWeb, Supermetrics MCPs | founder/key |
| Design of share cards / emails | Figma MCP, Canva MCP | safe-now |
| Ops / workflow | Linear, Asana, Slack, n8n | founder/key |

---

## Sources (web-verified 2026 benchmarks)
- App retention benchmarks 2026 — https://enable3.io/blog/app-retention-benchmarks-2025 · https://getstream.io/blog/app-retention-guide/ · https://uxcam.com/blog/mobile-app-retention-benchmarks/ · https://www.businessofapps.com/data/app-retention-rates/
- Subscription app trends/benchmarks 2026 — https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/
- Freemium conversion — https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/ · https://www.pulseahead.com/blog/trial-to-paid-conversion-benchmarks-in-saas · https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/
- Referral / viral loop / K-factor — https://viral-loops.com/blog/referral-program-best-practices-in-2025/ · https://www.saber.app/glossary/viral-loop
- Streaks / Duolingo / ethical gamification — https://yukaichou.com/gamification-study/master-the-art-of-streak-design-for-short-term-engagement-and-long-term-success/ · https://www.strivecloud.io/blog/gamification-examples-boost-user-retention-duolingo · https://www.orizon.co/blog/duolingos-gamification-secrets · https://abstractmediaverse.com/gamification-retention-risk/
- Klaviyo lifecycle flows — https://flowium.com/blog/klaviyo-flows/ · https://help.klaviyo.com/hc/en-us/articles/115002775172 (welcome) · https://help.klaviyo.com/hc/en-us/articles/115002775192 (winback)
- Pricing psychology / tiers / anchoring / decoy — https://www.orbix.studio/blogs/saas-pricing-page-psychology-convert · https://www.glencoyne.com/guides/saas-pricing-tiers-psychology · https://evelance.io/blog/psychology-behind-pricing-tiers-that-sell/ · https://adapty.io/blog/tiered-pricing/
- Competitor (sports) — https://www.bettingnews.com/tools/outlier-bet-review/ · https://help.outlier.bet/en/articles/12556823-choosing-the-right-outlier-plan-for-your-betting-style · https://xclsvmedia.com/how-to-build-discord-community-sports-picks-service-2026/
