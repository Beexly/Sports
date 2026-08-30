# GSN — Customer Psychology & Growth Report

**Author:** Customer-psychology & growth strategist (read-only analysis session).
**Date:** 2026-06-01. **Mode:** bootstrap (no public win-rate until enough canonical picks settle).
**Method:** Direct read of GSN source + schema (cited by path), cross-referenced with `COMPETITIVE_INTELLIGENCE.md` and `REPO_INTELLIGENCE_REPORT.md`, plus June-2026 web research on behavioral science (cited by URL).
**Evidence labels:** `verified` (read in this repo / cited source) · `inferred` (reasoned from code) · `recommended` (my proposal) · `speculative` (directional).

> Naming note: `CLAUDE.md` calls the product "GSN / Galaxy Sports Network"; the live UI brand string is "Galaxy Sports Edge" (`apps/web/app/page.tsx` L176, L633; `subscribe-button.tsx` L56 `hq@galaxysportsedge.com`). `verified`. I use **GSN** for the company, **Galaxy Sports Edge** for the UI.

---

## 0. The one-paragraph thesis

GSN's entire moat is **emotional, not analytical**. The bettor's core wound is *being lied to by touts* — sites that post wins and delete losses. GSN's verified-by-construction track record (`isBootstrap` fencing, immutable `PickSignalSnapshot`, public loss autopsies, Brier-scored calibration) is the only credible answer to that wound, and it is *already built* (`REPO_INTELLIGENCE_REPORT.md` §3, §8). The growth job is therefore **not** to manufacture urgency or dopamine — that is exactly the dark-pattern playbook now being sued into oblivion (PHAI v. DraftKings/FanDuel/NFL, filed 2026-03-24). The job is to convert *trust* into a daily habit: make the proof legible, make restraint feel like a feature, and let the only "variable reward" be the honest one — *did the math hold up today?* `recommended`

---

## 1. The bettor/fan emotional + cognitive profile

The target is not a degenerate gambler; it is the **burned semi-sharp** — a fan who has paid a tout, been ghosted after a losing week, and now distrusts every accuracy claim. Their psychology, mapped to mechanisms in the research and to GSN's existing surfaces:

| Cognitive force | What it does to a bettor | GSN's trust-first answer (vs hype tout) |
|---|---|---|
| **Loss aversion** — the pain of a loss is ~2× the pleasure of an equal win (`verified`: [Immunize Nevada](https://immunizenevada.org/the-psychology-of-sports-betting-understanding-risk-and-reward/); [Loss aversion, Wikipedia](https://en.wikipedia.org/wiki/Loss_aversion)) | Drives chasing, tilt, and rage-churn after a bad pick. A tout's hidden losses make every loss feel like a *betrayal*. | GSN **pre-commits to losing in public** via `LossAutopsy` (schema L423–451) and the homepage "Autopsy" beat (`page.tsx` L542–605: *"When we are wrong, we say so. The receipt stays attached."*). A loss the user was warned about is a loss they forgive. `verified` |
| **Recency bias** — recent outcomes dominate judgment (`verified`: [Nature SciRep 2025, value integration](https://www.nature.com/articles/s41598-025-08333-3)) | One cold week = "this service is broken," cancel. | Reframe the unit of judgment from *yesterday's result* to *calibration over n≥30* (`compute.ts`; `calibration-panel.tsx` brier band L31–36). The product literally teaches users to ignore recency. `verified` |
| **Dopamine / variable reward** — anticipation of reward, not reward itself, drives the loop; striatal inhibition on loss exceeds activation on reward (`verified`: [Nature SciRep 2025](https://www.nature.com/articles/s41598-025-97370-z); [Hook Model, SaaSfactor](https://www.saasfactor.co/blogs/mastering-saas-retention-how-to-transition-users-from-activation-to-habit-and-expansion)) | Microbetting weaponizes this (DK ≈517 live options/game, `COMPETITIVE_INTELLIGENCE.md` §1F). It is the addiction vector now in litigation. | GSN must harvest the *same neural loop* with an **ethical reward**: the daily "did the gate fire / how is calibration trending" check-in, not a bet-now button. The variable reward is *epistemic* (was the model right?), not financial. `recommended` |
| **Status / belonging** — bettors want to be "the sharp friend" | Tout Discords sell tribal identity; the product is belonging, the picks are incidental. | GSN can offer *earned* status: "I follow the service that publishes its losses" is a higher-status identity than "I chase a guy's parlays." Lean into the Cialdini **Unity** principle (`verified`: [IAW 7 principles](https://www.influenceatwork.com/7-principles-of-persuasion/)). `recommended` |
| **Need to trust a tout** (authority transfer) | Bettors *want* someone competent to outsource the decision to. Touts exploit this with fake authority (fabricated ROI). | GSN replaces *borrowed* authority with *demonstrated* authority: methodology page, factor trail, model version stamping (`MODEL_VERSION v5.0.0`, `REPO_INTELLIGENCE_REPORT.md` §3). Authority earned through transparency is the durable form. `verified`/`recommended` |

**Strategic read (`recommended`):** every competitor sells *certainty* (the dopamine of "lock of the day"). GSN sells *calibrated humility* — and humility is counter-intuitively stickier for the burned bettor because it is the one thing they've never been offered. The homepage already nails this tonally ("Math you can read." / "It says no far more than it says yes." `page.tsx` L191, L351). The gap is downstream: there is no machinery to convert that first emotional relief into a habit or a referral (§3, §9).

---

## 2. The "aha" moment and the daily-return loop

**Activation research (`verified`):** users who activate within 3 days are ~90% more likely to retain; aha within 5 min → ~40% higher 30-day retention; cutting onboarding steps (12→7 + SSO) moved time-to-activation 8.2d→1.6d ([Appcues](https://www.appcues.com/blog/aha-moment-guide); [Artisan](https://www.artisangrowthstrategies.com/blog/user-activation-rate-find-fix-saas-aha-moment); [June.so](https://www.june.so/blog/activation-playbook)).

**GSN's aha is NOT "I got a winning pick"** (bootstrap mode means no settled record yet, and a single win would teach recency bias — the exact thing to avoid). `inferred`.

**GSN's aha = "Oh — they showed me *why*, and they showed me what they *passed on*."** The moment of value is the **factor trail + the pass list** (`page.tsx` PassListBeat L422–475: *"What we passed, and why. No edge, no pick."*). That is the instant a burned bettor feels the difference from a tout. `recommended`.

**The honest daily-return loop (`recommended`), mapped to the Hook Model ([Hook/habit, SaaSfactor](https://www.saasfactor.co/blogs/mastering-saas-retention-how-to-transition-users-from-activation-to-habit-and-expansion)):**
- **Trigger:** a once-daily "the board is set" signal (email/push via the `Alert` model, schema L628–642). Internal trigger over time = the pre-game ritual itself.
- **Action:** open Today's Board (`/picks`) — make it one tap, already authenticated.
- **Variable reward:** *not* win/loss. The reward is **resolution of curiosity** — did the gate publish or stay quiet? where did line movement go? did yesterday's pick settle, and if it lost, is there an autopsy? This is variable-magnitude information reward, the ethical analogue of the slot mechanic.
- **Investment:** the user sets an alert threshold (`Alert.threshold`, default 70, L633), follows a sport, or reads an autopsy — each raises switching cost and personalizes the next trigger.

**The single biggest activation gap (`verified` from code):** the free tier shows **1 pick/day with no confidence score** (`getEntitlements`, `packages/types/src/index.ts` L90–96; `dailyPickLimit: 1`). For a *bootstrap* product with no track record, a confidence-stripped lone pick is a weak aha — it looks like every other free tease. The factor-trail/pass-list "why" is GSN's actual differentiator and free users barely see it. **The free tease is gating the wrong thing.** (See §5 and §10.)

---

## 3. Acquisition → Activation → Retention → Referral, mapped to GSN's real surfaces

| Stage | Real surface that exists today (`verified`) | Psychological objective | The gap (`recommended`) |
|---|---|---|---|
| **Acquisition** | Public, indexable trust surfaces: `/performance` (Calibration Report, `performance/page.tsx`), homepage gate/pass/calibration/autopsy beats (`page.tsx`), `/methodology`, FAQ JSON-LD on `/pricing` (L142–153), `sitemap.ts`. Twitter + Discord templates (`lib/twitter-bot/templates`, `lib/discord-bot/templates`). | Earn the click with *proof artifacts*, not accuracy claims. SEO around "is [tout] legit / verified sports picks." | No referral/share primitive on the artifacts most worth sharing (autopsies, a sharp pass). The loss autopsy is the most viral asset GSN owns and it has no share affordance. |
| **Activation** | `/picks` board, `PickCard` factor trail, pass list, sign-in (Google SSO via NextAuth). | Deliver the "they show their work / they pass on bad bets" aha in <3 days. | Free tier hides confidence + factor trail (the aha) behind Pro; no first-session guided tour of *how to read a pick*. Onboarding is "sign in → see 1 capped pick." |
| **Retention** | `Alert` model (email, confidence threshold), weekly `ModelJournalEntry` (schema L988–1019, has `emailedAt`/`twitterTeasedAt`), settlement → autopsy loop. | Convert the daily check-in into a pre-game ritual; reframe judgment to calibration not recency. | Alerts are **Elite-only** (`canGetAlerts: tier === "ELITE"`, types L95) — so the #1 retention/habit primitive is paywalled away from the Free and Pro users who most need a return trigger. The weekly journal is a perfect retention email but isn't tied to a lifecycle. |
| **Referral** | **None.** `User` model (schema L18–36) has no referral code, no inviter, no streak. No annual interval anywhere (`verified` via grep). | Turn trust into word-of-mouth ("the honest one"). | Greenfield. Highest-leverage *missing* loop. A trust brand spreads through vouching, not promo codes — see §6 Exp. 4. |

---

## 4. Track-record / social-proof trust mechanics ("verified, not self-reported")

The market has already proven that **verified beats self-reported**: Pikkit logged >$10B in tracked wagers in ~4 years on exactly this principle — co-founder Pranav Tadikonda: *"automated bet tracking… makes it verifiable, it makes it trustworthy,"* and Pikkit **disallows manual bet entry** so records can't be faked (`verified`: [BettingStartups](https://news.bettingstartups.com/p/pikkit-from-launch-to-10b-in-tracked-bets); [Pikkit blog](https://pikkit.com/blog/how-to-find-profitable-bettors-to-follow)). Cialdini's **Social Proof** lowers perceived risk; **Authority** and **Unity** convert it to allegiance (`verified`: [IAW](https://www.influenceatwork.com/7-principles-of-persuasion/)).

**GSN's structural advantage:** Pikkit verifies *users'* records; **GSN verifies the model's own record by construction** — `isBootstrap` fencing keeps pre-canonical picks out of all stats, `PickSignalSnapshot` is immutable, calibration never mutates weights (`REPO_INTELLIGENCE_REPORT.md` §3, §5, §8; `calibration-panel.tsx` L173–176). No AI pick competitor does this credibly. `verified`.

**Trust mechanics to foreground (`recommended`), all using existing data:**
1. **Lead with "verified, not self-reported" as literal copy** — borrow Pikkit's proven frame. The `/performance` `metadata.description` already says *"Bootstrap-era picks are excluded by design"* (`performance/page.tsx` L13–16); make that a hero claim, not metadata.
2. **The loss autopsy is the highest-trust artifact in the entire category.** Process/Outcome/Lesson split (`page.tsx` L569–573) is *radical* honesty. Make each autopsy a standalone shareable page with OG image (route exists: `/performance/losses/[pickId]`, linked L575).
3. **"Empty is honest" is a trust feature, not a bug.** The product repeatedly refuses to fabricate ("Empty is an honest state. Nothing is staged" `page.tsx` L599; "No edge, no pick"). This *is* the brand — but it must be paired with a reason to come back tomorrow (§2 loop), or honesty reads as "nothing here."
4. **Discrimination metric as the bootstrap-honest headline.** Because confidence is a heuristic, not a probability (`REPO_INTELLIGENCE_REPORT.md` §5), the public number to lead with is *"does higher confidence win more?"* (`calibration-panel.tsx` L118–139), not a win-rate GSN can't yet defend. This is the single most defensible trust claim available pre-launch. `verified`/`recommended`.

---

## 5. Pricing & paywall psychology (Free / Pro / Elite)

**Verified live state (this matters — it contradicts the brief/CLAUDE.md):**
- `CLAUDE.md` and the system brief say **Pro $19/mo, Elite $49/mo**. The **live pricing page ships Pro $9.99/week, Elite $13.99/week**, billed weekly, with a **7-day refund window (not a free trial)** (`apps/web/app/pricing/page.tsx` L28–93, L367–370; metadata L12–22). `verified`. **This discrepancy should be reconciled deliberately — see §10/closing.**
- **Entitlements (`verified`, `packages/types/src/index.ts` L86–98):** Pro already unlocks `canSeeConfidence`, `canSeeLineMovement`, `canSeeFactorBreakdown`, premium picks, all 7 sports. **The ONLY thing Elite adds is `canGetAlerts`** (notifications). The pricing table confirms it: the single differentiating row is "Email + push notifications" (L88–89 vs L68).

**Psychology read:**
- **Anchoring / framing.** Weekly pricing ($9.99/wk) is a classic small-number frame — it reads cheaper than its ~$43/mo equivalent ([RevenueCat](https://www.revenuecat.com/blog/growth/subscription-pricing-psychology-how-to-influence-purchasing-decisions/); [DigitalApplied 2026](https://www.digitalapplied.com/blog/subscription-pricing-page-psychology-decision-framework-2026)). But weekly billing **maximizes the number of churn decision-points** (4–5×/month vs 1×) — every billing event re-triggers loss-aversion reconsideration, especially after a cold week (recency bias). For a variance product this is the *worst* cadence for retention. `recommended`: offer **monthly and annual** options; annual collapses churn decisions to 1/year (annual subs churn ~3× less, [GrowMeOrganic](https://www.growmeorganic.com/decoy-effect/)) and pre-commits the user through a cold streak — which is *pro-consumer* here because the product's whole thesis is "judge me over n≥30, not over a bad week."
- **The free-pick tease is gating the wrong asset.** Free shows 1 pick/day with **confidence hidden** (L43, L47). The actual aha is the *reasoning*, not the score. Hiding the "why" makes Free look like every tout's free play. `recommended`: let Free see **one fully-reasoned pick (factor trail + pass-list visibility)** but cap *quantity*; gate *confidence numbers + all-slate access + line movement* behind Pro. You tease the differentiator, not the commodity.
- **Gated confidence as the core Pro lever.** Confidence is the dopamine object (the number bettors crave). Gating it is sound — *provided* the public discrimination metric proves the number is meaningful first (§4.4). Selling a confidence score you haven't shown to discriminate would torch the moat (`COMPETITIVE_INTELLIGENCE.md` §3 "don't advertise an accuracy % you can't defend").
- **Decoy effect — currently absent and an opportunity.** With only Pro/Elite and a $4/wk gap whose sole delta is *notifications*, Elite is not a compelling target; it reads as "Pro + a toggle." The decoy literature says a well-placed third option makes the target obvious and lifts annual signups 30–40% ([Shopify](https://www.shopify.com/enterprise/blog/108418950-decoy-pricing-the-strategies-your-competitors-use-to-get-customers-to-buy-more); [GrowMeOrganic](https://www.growmeorganic.com/decoy-effect/)). `recommended`: rebuild the Elite value story around **real Elite-only substance** — early access, analytics, and the alert engine — matching what `CLAUDE.md` promised Elite ("+ early access, analytics, alerts"). Right now code delivers only the alerts third of that. Until Elite has substance, a decoy is lipstick.
- **Ethical guardrail on all of the above.** The 2025–27 regulatory climate is "the most aggressive in history on dark patterns"; the "tiny-yes-to-big-yes" funnel and hidden opt-ins now draw class-action scrutiny ([CXL](https://cxl.com/blog/cialdinis-principles-persuasion/); [Cognitigence](https://www.cognitigence.com/blog/cialdini-7-principles-of-persuasion)). GSN's "No upsell games" headline (`pricing/page.tsx` L178) and refund window are brand assets — **do not** trade them for a decoy that feels manipulative. The honest decoy is "monthly (flexible) vs annual (best value, judge-us-over-a-season)," not a deliberately crippled trap tier.

---

## 6. Ethical habit formation + responsible-gaming guardrails

This is existential, not optional. On 2026-03-24 the Public Health Advocacy Institute sued DraftKings, FanDuel, Genius Sports, and the NFL alleging microbetting is *"unreasonably dangerous"* product design that uses **AI to identify each user's vulnerabilities and push offers when they're most susceptible — late at night or after a significant loss** (`verified`: [PHAI/PRNewswire](https://www.prnewswire.com/news-releases/public-health-advocacy-institute-phai-files-landmark-sports-gambling-lawsuit-against-draftkings-fanduel-genius-sports-and-the-national-football-league-nfl-302723901.html); [Sportico](https://www.sportico.com/law/analysis/2026/draftkings-fanduel-nfl-microbetting-addictions-lawsuit-1234888135/); [Bloomberg Law](https://news.bloomberglaw.com/litigation/sports-betting-apps-nfl-sued-over-addictive-product-designs)). New Jersey is moving to ban microbetting outright.

**Implication:** the standard growth-hacker reflexes — loss-triggered win-back emails, late-night push, streak-loss "don't break your streak" nags, urgency timers — are now *the exact conduct named in litigation*. GSN must adopt **inverse dark patterns** as brand. `recommended` (and consistent with `REPO_INTELLIGENCE_REPORT.md` §7: Promotions hard-gate on `responsibleGamingText`, "risk free" is banned copy, geo honesty).

**GSN responsible-habit doctrine (`recommended`):**
1. **Frequency ceiling, not floor.** GSN is research, not action — there is no bet button (`page.tsx` L633 "research, not sportsbook hype"). Cap engagement triggers at **one daily digest**; never re-trigger on a loss or late at night. This is both ethical *and* the right cadence for a calibrated product.
2. **Reward information, never action.** The variable reward is "was the model right / what got passed" — it can't escalate into chasing. This structurally defuses the dopamine-addiction vector (§1) the lawsuits target.
3. **Loss autopsies double as RG instruments.** Showing *why a pick lost* is the opposite of "bet more to win it back." It teaches variance acceptance. Keep them prominent (`page.tsx` L542–605).
4. **Make limits a first-class CTA.** `/responsible-play` and "Set limits" already sit on the homepage close (`page.tsx` L669–672) and `RiskDisclosure` recurs across surfaces (`/picks`, `/performance`, home). Elevate "set limits" to the *dashboard*, not just the footer (`COMPETITIVE_INTELLIGENCE.md` §3.5 "responsible-gaming the brand, not the footer").
5. **Commitment that helps the user, not traps them.** Cialdini commitment-consistency *ethically* applied = onboarding that asks the user to articulate *their own* goal ("I want a disciplined second opinion") — which compounds retention — rather than tricked micro-yeses, which "produce churn and class-action lawsuits" ([CXL](https://cxl.com/blog/cialdinis-principles-persuasion/)). `verified`.

---

## 7. Six prioritized growth experiments

Each: **Hypothesis · Build · Success metric · Failure signal.** Priority by leverage × safety in bootstrap mode. All require human approval before anything ships to users.

**P1 — Free tier teases the "why," not the score (the activation fix).**
- *Hypothesis:* Free users who see one *fully-reasoned* pick + the pass list (the real aha) activate and convert better than those shown a confidence-stripped lone pick.
- *Build:* In `getEntitlements` (`packages/types/src/index.ts` L86–98), keep Free `dailyPickLimit:1` and keep confidence/line-movement gated, but flip `canSeeFactorBreakdown` to `true` for FREE on the single allotted pick; mirror copy on `pricing/page.tsx` and the `/picks` paywall banner. (Server-side gate stays authoritative — `app/api/picks/route.ts`.)
- *Success:* Free→Pro conversion ↑; D3 activation (returned + opened a pick) ↑.
- *Failure:* Free users get the value and *stop* upgrading (factor trail cannibalizes Pro) → revert; gate factor trail to "1/day preview" only.

**P1 — Once-daily "the board is set / yesterday settled" digest for ALL tiers.**
- *Hypothesis:* A single honest daily trigger builds the pre-game ritual and lifts retention without any dark pattern.
- *Build:* Lifecycle email (Free + Pro included, not just Elite) using the `Alert` model (schema L628) + the settlement/autopsy + `ModelJournalEntry` content. Strict: one send/day, never loss-triggered, never late-night.
- *Success:* D7/D30 return rate ↑; email→board CTR.
- *Failure:* Unsubscribe/spam-complaint rate ↑, or open rate < ~20% → reduce to weekly journal only.

**P2 — Monthly + Annual pricing alongside weekly (churn-cadence + honest decoy).**
- *Hypothesis:* Offering monthly and an annual "judge us over a full season" plan reduces churn-decision frequency and lifts LTV; weekly billing's 4–5 monthly churn points are bleeding retention.
- *Build:* Add Stripe prices + `interval` to the `PLANS` data in `pricing/page.tsx`; surface a billing toggle. No crippled trap tier.
- *Success:* Blended churn ↓; share choosing annual; LTV ↑.
- *Failure:* Annual take-rate < ~10% or refund requests spike → keep monthly, drop annual framing.

**P2 — Shareable loss-autopsy + "sharp pass" pages (the referral seed).**
- *Hypothesis:* The most counter-intuitive artifacts (a published loss, a pass on a popular bet) are GSN's most viral proof; a share affordance turns trust into acquisition.
- *Build:* OG-image + share button on `/performance/losses/[pickId]` and on pass-list rows; auto-thread via existing `lib/twitter-bot/templates/post-mortem-thread.ts`.
- *Success:* Referral sessions from shared autopsy URLs; signups attributed to them.
- *Failure:* Shares happen but bounce (no activation) → add an autopsy→methodology→signup path.

**P3 — Give Elite real substance (early access + analytics), then test a decoy.**
- *Hypothesis:* Elite churns/under-converts because its only delta is notifications; adding early-access timing + a personal calibration/CLV dashboard justifies the price and makes Pro the obvious mid-anchor.
- *Build:* Implement early-access publish window and an Elite analytics view; *then* re-price. (Note: CLV capture is already flagged P1 in `COMPETITIVE_INTELLIGENCE.md` §4 — Elite analytics is its natural home.)
- *Success:* Pro→Elite upgrade rate ↑; Elite churn ↓.
- *Failure:* Elite still doesn't move → fold alerts into Pro and make GSN effectively two-tier.

**P3 — Goal-articulation onboarding (ethical commitment-consistency).**
- *Hypothesis:* Asking new users to state their own goal ("disciplined second opinion," sports they follow) raises activation and personalizes the daily trigger — the *ethical* form of commitment.
- *Build:* One post-signup screen feeding `Alert` sport/threshold defaults; explicitly NOT a forced upsell.
- *Success:* D3 activation ↑; alert-set rate ↑.
- *Failure:* Drop-off on the extra step → make it skippable / one-tap defaults ([June.so](https://www.june.so/blog/activation-playbook) "fewer steps").

---

## 8. What NOT to build (anti-patterns, given 2026 litigation)

`recommended`, reinforced by §6 sources and `COMPETITIVE_INTELLIGENCE.md` §3: no loss-triggered win-back, no late-night push, no "your streak is about to break" nags, no countdown/urgency timers on pricing, no fabricated "X people bought this in the last hour," no accuracy % the calibration curve can't defend, and no crippled decoy tier that feels like a trap. Each is now either named in the PHAI complaint's logic or in the dark-pattern regulatory crosshairs. GSN's "No upsell games" promise is a moat — protect it.

---

## 9. The single highest-leverage SAFE change in my domain

**Change:** Make the **Free tier's one daily pick show its full factor trail / reasoning** (the actual aha), while still gating confidence scores, line movement, and all-slate access behind Pro.

**Exact file / line:** `packages/types/src/index.ts`, function `getEntitlements` (L86–98). Today every gated flag is `isPro`; specifically `canSeeFactorBreakdown: isPro` (L93). The change: compute it so FREE also gets `canSeeFactorBreakdown: true` (confidence/line-movement/all-picks stay Pro-gated). Mirror the copy on `apps/web/app/pricing/page.tsx` (the FREE `features` list, L39–49) and the `/picks` paywall + bottom-CTA (`apps/web/app/picks/page.tsx` L362–379, L492–520).

**Why it's the highest-leverage safe move:**
- It fixes the **#1 activation defect** found in code (§2, §5): GSN gates its *commodity* (a lone pick) and hides its *differentiator* (the "why" — the one thing that distinguishes it from a tout). Activation research says delivering true core value fast is the single biggest retention lever ([Appcues](https://www.appcues.com/blog/aha-moment-guide); [Artisan](https://www.artisangrowthstrategies.com/blog/user-activation-rate-find-fix-saas-aha-moment)).
- It is **on-thesis and ethical** — it sells trust by *showing* the work, not by manufacturing urgency, so it can't backfire into the dark-pattern litigation zone (§6).
- It is **safe**: a pure entitlement/copy change. It does NOT touch the server-side paywall's authority (`app/api/picks/route.ts` still enforces field-nulling and tier gating), the calibration/Brier logic, the bootstrap gates, or any pricing/Stripe wiring. No fabricated data, no schema migration, no money path changed.

**Why this beats the obvious alternative (give everyone the daily email):** the email (Exp. P1b) is high-value too, but it requires building a lifecycle sender + deliverability + RG-safe cadence — more surface area, more approval. The entitlement flip delivers the aha to *every* Free visitor immediately with the least code and zero new infrastructure.

**How to verify (no code run here — for the implementer):**
1. **Unit:** `getEntitlements("FREE").canSeeFactorBreakdown === true`; `getEntitlements("FREE").canSeeConfidence === false` and `canSeeLineMovement === false` (confidence/line-movement still gated). Existing entitlement tests in `apps/web` updated accordingly.
2. **Server authority intact:** a FREE request to `/api/picks` returns the factor trail on the 1 allotted pick but still nulls `confidence`/line-movement and still caps to `dailyPickLimit:1` — confirm `app/api/picks/route.ts` field-nulling tests stay green.
3. **UX:** on `/picks` as FREE, the single `PickCard` renders the factor breakdown (`canSeeFactorBreakdown` prop, `picks/page.tsx` L356) while the upgrade CTA now reads "Pro unlocks the confidence rating + every signal" (not "unlocks the reasoning").
4. **Gate/lint/types:** `npm run typecheck` + `npm run test` green; no banned-phrase/pricing-honesty test regressions (`REPO_INTELLIGENCE_REPORT.md` §7).

> Reconcile-before-shipping flag (`verified`): the live price ($9.99/$13.99 weekly) and the documented price ($19/$49 monthly) disagree (§5). Any pricing experiment (P2/P3) must first resolve which is canonical with a human — that decision is out of my read-only scope.

---

### Source appendix
GSN files (`verified`, repo): `CLAUDE.md`; `COMPETITIVE_INTELLIGENCE.md`; `REPO_INTELLIGENCE_REPORT.md`; `apps/web/app/pricing/page.tsx`; `apps/web/components/pricing/subscribe-button.tsx`; `apps/web/app/page.tsx`; `apps/web/app/picks/page.tsx`; `apps/web/app/performance/page.tsx`; `apps/web/components/performance/calibration-panel.tsx`; `apps/web/lib/entitlements.ts`; `packages/types/src/index.ts`; `packages/db/prisma/schema.prisma` (User L18, Subscription L84, LossAutopsy L423, Alert L628, ModelJournalEntry L988).
External (`verified`, URLs cited inline): loss aversion/dopamine — Immunize Nevada, Nature SciRep 2025 (97370-z, 08333-3), Wikipedia. Activation/habit — Appcues, Artisan, June.so, SaaSfactor. Cialdini/ethics — IAW, CXL, Cognitigence. Verified tracking — Pikkit (BettingStartups, Pikkit blog). Microbetting litigation — PHAI/PRNewswire, Sportico, Bloomberg Law, CasinoBeats. Pricing psychology — RevenueCat, Shopify, GrowMeOrganic, DigitalApplied 2026.
