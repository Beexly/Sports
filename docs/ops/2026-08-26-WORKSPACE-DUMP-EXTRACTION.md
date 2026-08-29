# WORKSPACE DUMP EXTRACTION — 2026-08-26

**What this is.** The mining pass over the founder workspace dump on
`origin/garrett/resource-dump-2026-06-15` (June-2026 strategy/psychology/growth/research
docs), calibrated against today's state (`2026-08-26-PATH-FORWARD.md`,
`2026-08-26-EDGE-PATH.md`, live repo cross-checks). Every claim below was verified
against main's active tree this session — file paths cited.

**Meta-finding (read first).** The dump's root docs are **already in main, byte-identical,
at `docs/ops/archive/root-museum/`** (diff-verified this session for all nine priority
docs), and `docs/ops/decision-log.md` / `handoff.md` are archived at
`docs/ops/archive/dated/`. Nothing needs rescuing from the branch. But the museum is
explicitly **non-canonical** (`docs/ops/archive/README.md`: "Do not update files here as
if they were current law"), and `docs/strategy/RESEARCH_MAP.md` (2026-06-22) only
indexed these docs at thesis level — the **operational detail below never made it into
the active canon**. This document is the extraction the museum never got.

Citation convention: `[MUSEUM/<file> §n]` = `docs/ops/archive/root-museum/<file>`.

---

## 1. STILL-ACTIONABLE GOLD

Ordered by leverage inside the 14-day window (NFL kickoff Sept 9). Each item was
grep-verified as **absent from the active canon and the codebase** today.

### 1.1 The honest daily digest — "the board is set / yesterday settled" (all tiers)
- **Source:** [MUSEUM/CUSTOMER_PSYCHOLOGY_AND_GROWTH_REPORT §2, §6, §7 exp-P1b];
  [MUSEUM/SALES_CONVERSION_AND_CRM §5].
- **The insight:** GSE's retention loop is the Hook model with an *epistemic* variable
  reward — "did the gate fire? did yesterday settle? is there an autopsy?" — not
  win/loss dopamine. One send/day, never loss-triggered, never late-night (that cadence
  is simultaneously the ethical line the PHAI litigation drew AND the correct cadence
  for a calibration product). Trigger → open board → information reward → set an alert
  threshold (investment).
- **Why it still applies (verified today):** `canGetAlerts: tier === "ELITE"`
  (`packages/types/src/index.ts:192`) — **Free and Pro users still have zero return
  trigger**. Email infra now exists (Resend wired in
  `apps/web/lib/watchlist/channels/email-channel.ts`), the welcome flow is drafted
  (`docs/email-sequences/welcome-flow.md`) but no digest, and 1,470 settled picks +
  the kill-ledger give the digest real content the June doc could only promise.
  Founding members arriving at kickoff will churn silently without a ritual.
- **Lands in:** `docs/email-sequences/` (new `daily-digest.md` spec, draft-only,
  founder-approved sender per the ORGANIC_PLAYBOOK guardrail) + PATH-FORWARD Horizon 0
  agent lane "organic execution". Owner gate: sender approval.

### 1.2 Winback + dunning emails that use the record as the asset
- **Source:** [MUSEUM/SALES_CONVERSION_AND_CRM §4.2–4.3, §5, exp #7/#9].
- **The insight:** the winback email is *"here's what the model went 12–7 on since you
  left"* — proof, not plea; no other picks brand can send that honestly. Dunning:
  in-app PAST_DUE banner + a 3-email fix-your-card sequence (recovery benchmarks:
  passive ~15% vs sequenced ~32–70%). Also: enable Stripe Smart Retries + portal
  cancel-reason capture + pause-instead-of-cancel (dashboard config, founder click).
- **Why it still applies (verified today):** the in-app banner shipped
  (`apps/web/components/ui/billing-notice-banner.tsx`) but **no dunning email, no
  winback sequence, no cancel-save flow exists** (`docs/email-sequences/` holds only
  `welcome-flow.md`; no Smart-Retries note in `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md`).
  With Stripe going LIVE this week, involuntary churn machinery should exist before
  the founding cohort's first renewals.
- **Lands in:** subscriptions-billing lane; `docs/email-sequences/` (dunning + winback
  specs); one line in `STRIPE_GO_LIVE_CHECKLIST.md` for Smart Retries/portal config.

### 1.3 Shareable proof cards — per-entity OG images for the receipt surfaces (Loop B)
- **Source:** [MUSEUM/MARKETING_AND_GROWTH_BLUEPRINT §3 Loop B, §10];
  [MUSEUM/MEDIA_AND_CONTENT_QUALITY §10 — full implementation spec, incl. the
  "calibration scoreboard" card design and the never-invent-a-stat fallback state].
- **The insight:** GSE's only category-unique viral loop is *proof → share → click-back
  → signup*; the shared unit must be a verifiable receipt (loss autopsy, calibration
  card, kill-ledger entry), and today a shared loss-autopsy link renders a generic
  brand card. The loss autopsy is "the most viral asset GSN owns and it has no share
  affordance."
- **Why it still applies (verified today):** only three OG files exist
  (`apps/web/app/{opengraph-image,fantasy/opengraph-image,performance/opengraph-image}.tsx`).
  **No OG card for `/performance/losses/[id]`, `/journal/[slug]`, `/kill-ledger`,
  `/calibration`, `/blog/[slug]`** — and loss-autopsy pages are absent from
  `sitemap.ts` (verified: sitemap covers preview/podcast/newsletter/journal only).
  The MVE INSTRUMENT-FAILURE story and the kill-ledger are precisely the shareable
  honesty artifacts this loop was designed for. Note `RESEARCH_MAP.md` §9/§C.8 still
  says "only one static OG image exists" — stale; update it when this ships.
- **Lands in:** frontend-app lane (the `next/og` pattern already proven in the three
  existing files); kickoff-week organic push per ORGANIC_PLAYBOOK.

### 1.4 Free-tier tease decision: show the "why," gate the number
- **Source:** [MUSEUM/CUSTOMER_PSYCHOLOGY_AND_GROWTH_REPORT §2, §5, §9 — its single
  highest-leverage change, with a full falsifiable A/B design: success = Free→Pro ↑,
  kill = factor trail cannibalizes Pro → revert to 1/day preview].
- **The insight:** the activation "aha" is the factor trail + pass list (the thing no
  tout shows), not the pick count. Free currently gates the differentiator and gives
  away the commodity; a confidence-stripped teaser "looks like every other free tease."
- **Why it still applies (verified today):** `canSeeFactorBreakdown: isPro`
  (`packages/types/src/index.ts:188`) — unchanged since June. `RESEARCH_MAP.md`
  Part 2.B #8 flagged this as an **unresolved contradiction** (psych report vs
  value-ladder doctrine) and it is still unresolved 2 months later, with kickoff
  traffic 14 days out. This is a decision, not a build: ~1-line entitlement change +
  copy mirror, fully reversible, server gate stays authoritative.
- **Lands in:** `docs/DECISIONS_TO_RATIFY.md` (founder call before the kickoff traffic
  spike); if ratified, frontend-app lane same day.

### 1.5 Pro→Elite "felt gap" upgrade trigger
- **Source:** [MUSEUM/SALES_CONVERSION_AND_CRM §1, §5 — "a pick's line moved after
  they viewed it → 'Elite would have alerted you when this line moved'"].
- **The insight:** expansion fires on a *felt* gap, not a price step. The June doc
  couldn't ship this because Elite was "Pro + a toggle"; now Elite has real substance
  (real-time alerts + CLV ledger per CLAUDE.md), so the trigger is honest.
- **Why it still applies (verified today):** the event taxonomy exists
  (`apps/web/lib/analytics/events.ts` — `locked_pick_click`, `elite_feature_view`) and
  line-movement data is first-class, but no surface connects "line moved since your
  view" to an Elite prompt. In-season (post-Sept 9) line movement is constant — this is
  the highest-yield expansion tactic of the season's first weeks.
- **Lands in:** frontend-app lane + monetization docs; instrument via existing events.

### 1.6 Tier-aware upgrade banner on `/dashboard`
- **Source:** [MUSEUM/SALES_CONVERSION_AND_CRM §1 funnel-leak table, exp #3].
- **Why it still applies (verified today):** `apps/web/app/dashboard/page.tsx` still
  renders only a generic Pricing quick-link and the one-time `?upgraded=true`
  confirmation — **no FREE-user upgrade surface on the highest-intent logged-in page**.
  Small build, direct revenue path during the founding push.
- **Lands in:** frontend-app lane.

### 1.7 The conversion guardrail metric (one governance line)
- **Source:** [MUSEUM/SALES_CONVERSION_AND_CRM §8 "Global guardrail metric"].
- **The insight:** refund rate, unsubscribe rate, and complaint rate must stay flat
  through any conversion experiment — a "win" that raises them violates the trust
  wedge and is recorded as a kill, not a win. This is the growth-side twin of the
  edge-lab's kill discipline and belongs in the weekly scoreboard.
- **Lands in:** PATH-FORWARD §8 scoreboard / `docs/ops/OPERATOR.md`.

### 1.8 Honest-urgency inventory for the kickoff push
- **Source:** [MUSEUM/SALES_CONVERSION_AND_CRM §7]; [MUSEUM/CUSTOMER_PSYCHOLOGY §5].
- **The insight:** the only ethically available scarcity: (a) time-bound slates —
  "the board locks at kickoff" is real and expires on its own; (b) the founding-rate
  grandfathering (already live). Never countdown timers, never fake activity. The June
  framing of annual billing as *pro-consumer* for a variance product ("judge us over a
  season, not a cold week" — pre-commits through the losing streak the model warns
  about) is a ready-made annual-plan pitch line that no current doc carries.
- **Lands in:** ORGANIC_PLAYBOOK / pricing-page copy pass (draft-only).

### 1.9 Measurement definitions the funnel still lacks
- **Source:** [MUSEUM/MARKETING_AND_GROWTH_BLUEPRINT §7]; [MUSEUM/SALES §5–6].
- **Still missing today (events taxonomy exists, these definitions don't):**
  the north-star — *verified-record-driven activated signups* (free users who viewed
  ≥1 proof page then opted in or upgraded); an explicit activation event (June:
  "opened ≥1 evidence audit drawer in first session" — no aha/audit-drawer event in
  `apps/web/lib/analytics/events.ts`); attribution stance (first-party + UTM +
  self-reported "how did you hear," no third-party pixels). Cheap to adopt, makes the
  14-day push measurable.
- **Lands in:** analytics events + PATH-FORWARD scoreboard.

### 1.10 Referral loop — design ready, correctly sequenced for right-after-PROVEN
- **Source:** [MUSEUM/MARKETING_AND_GROWTH_BLUEPRINT §3 Loop C, §9 days 61–90];
  [MUSEUM/CUSTOMER_PSYCHOLOGY §3].
- **The design (not in any active doc):** double-sided (referrer: free Pro month;
  referee: 50% first month), fired at the aha moment (after N settled picks viewed),
  instrumented on **K-factor and cycle time** (K 1.2 at 1-day cycle ≫ same K at 30
  days). Trust brands spread by vouching, not promo codes.
- **Why not top-of-list:** the June doc itself sequences referral *after* a record
  worth sharing + a conversion baseline — i.e. at the PROVEN rung (Horizon 1), not in
  the next 14 days. Verified still greenfield: `User` model has no referral fields
  (`packages/db/prisma/schema.prisma` — only unrelated `REFERRAL` enum values).
- **Lands in:** Horizon 1 backlog; schema work in packages/db when scheduled.

### 1.11 Web-quality punch list still open (from the June production audit)
- **Source:** [MUSEUM/PRODUCTION_QUALITY_AUDIT §1, §3, §4, §6].
- **Verified still missing:** RUM web-vitals beacon (zero `web-vitals`/`onINP` hits);
  `app/global-error.tsx`; skip-link in `layout.tsx`; `jest-axe` and Lighthouse-CI/
  bundle budgets in `.github/workflows/ci.yml`. (CSP/HSTS, SITE_URL unification,
  `loading.tsx` skeletons, homepage metadata — all since shipped; see §3.)
- **Why it matters now:** kickoff is the year's traffic peak on mid-tier mobile; CWV
  is unmeasured in the field. Not revenue-critical, but each item is under a day.
- **Lands in:** testing-qa / perf lanes.

---

## 2. RESEARCH SEEDS (feeds EDGE-PATH E2/E3)

1. **Thin-consensus floor: `MIN_BOOKMAKERS = 2` is still live**
   ([MUSEUM/REPO_INTELLIGENCE_REPORT §4, §9-R5]; [MUSEUM/RISK_AND_FAILURE_REGISTER #10]).
   Verified unchanged (`packages/prediction-engine/src/constants.ts:105`). Two agreeing
   books read as 100% consensus with no real price discovery — a plausible contributor
   to the SPREAD/TOTAL "tout-grade noise" EDGE-PATH §0.1 measured on real data. Seed:
   test a raised floor / <4-book down-weighting as an E2 covariate-era experiment
   (MODEL_VERSION-gated, walk-forward admission like any other candidate).
2. **The sharp-anchor decision** ([MUSEUM/FRONTIER_RESEARCH_ADDITIONS §1]). The June
   provider table's durable residue: a Pinnacle-anchored feed (SportsGameOdds free
   tier) as an external sharp q to grade CLV against, instead of self-consensus.
   Canon already holds the alternative (Kalshi anchor — built, inert, per
   `RESEARCH_MAP.md` §3/Part 3 Phase 2). Seed: E3's CLV denominator quality — decide
   Kalshi vs Pinnacle-feed vs self-consensus *before* the ESTABLISHED sample
   accumulates, so the ≥52.4% claim is graded against a defensible close.
   (The rest of the provider landscape is superseded — see §3.)
3. **Behavioral calibration of the product loop** ([MUSEUM/CUSTOMER_PSYCHOLOGY §1–2]).
   The cited mechanism set — loss-aversion ~2×, recency bias, striatal
   inhibition-on-loss, activation-within-3-days ≈ +90% retention — is the *user-side*
   science the E-program has no analogue for. Seed for the Academy/retention lane:
   the product should measurably shift users' judgment window from "yesterday's
   result" to "calibration over n≥30" (a testable claim about user behavior — e.g.
   post-loss churn hazard vs autopsy-viewed cohorts, once events exist).
4. **Studio scanner over pixel-borne text** ([MUSEUM/MEDIA_AND_CONTENT_QUALITY §4
   hardening A]). Any burned-in caption/overlay on generated image/video assets should
   pass `scanStudioContent()` before operator review — the same code that guards X/
   TikTok text. Verified absent: no overlay-text path through the scanner in
   `apps/web/lib/studio/` or `docs/media/media-studio-workflow.md` (provenance,
   hardening B, is covered by `docs/media/content-provenance-and-review.md`). Small
   ops seed for the content lane before any MCP-generated media ships.
5. **Adversarial numeric-fidelity evals for the content layer** — already named in
   EDGE-PATH §3 (SportsMetrics, arXiv 2402.10979); the June media doc's compliance
   architecture ([MUSEUM/MEDIA §2, §5]) is the enforcement surface those evals should
   attach to. No new work item; noted so the two docs get linked when E-ops lands it.

---

## 3. SUPERSEDED (one line each — do not re-mine)

- **Weekly $9.99/$13.99 pricing critique + spec-vs-shipped reconciliation**
  [SALES §0, PSYCH §5] → founding monthly/annual ladder live in
  `apps/web/lib/pricing/pricing-phases.ts`; annual already positioned as the LTV lever.
- **"Elite is only +alerts" packaging gap** [SALES §2.2, RISK #13] → Elite = alerts +
  CLV/line-value ledger (CLAUDE.md); only the *early-access* third remains unbuilt (see §4.4).
- **Inert LockedValue padlock** [SALES §9 — its #1 safe change] → shipped:
  `pick-card.tsx:619` links to `/pricing` with aria-label and "· Pro" label.
- **"Funnel is blind — no analytics events"** [SALES §1, §6; RISK #8] → event taxonomy
  live in `apps/web/lib/analytics/events.ts` (checkout, paywall, cancellation events).
- **Homepage `metadata` export missing** [MARKETING §11 — its #1 safe change] → shipped
  (`apps/web/app/page.tsx:29`).
- **CSP/HSTS missing; www/apex SITE_URL mismatch** [PQA §2, §5; RISK #11] → shipped
  (`next.config.mjs`, `vercel.json`, `apps/web/lib/seo/site-url.ts`).
- **`loading.tsx` skeletons absent** [PQA §4] → shipped across ~10 routes.
- **CLV capture recommendation** [COMPETITIVE_INTELLIGENCE §4-P1] → built end-to-end:
  37,402 line snapshots, CLOSE stamps proven writing (PATH-FORWARD evening update).
- **Discrimination-metric-as-headline / bootstrap n≥30 framing** [PSYCH §4.4;
  REPO_INTEL §5] → the calibration program (PAVA fit, ECE/Brier floors, eligibility
  gates) is generations past this; 1,470 settled.
- **Confidence-is-not-probability finding** [REPO_INTEL §1, §5] → the entire edge-lab/
  E-program is its descendant; EDGE-PATH §0.1 confirmed it on real data.
- **Settlement SPOF + away-favored spread mis-grade** [RISK P0 #1–2] → fixed June;
  today's settlement issue is the *different* identity-fragmentation bug (PR #675).
- **Sonnet-only, no caching / no model routing** [REPO_INTEL §6; RISK #6] →
  `model-router.ts` + the JYNX cost-stack docs supersede.
- **Odds-provider failover (R5)** [FRONTIER §1] → dual/tri-path live (Odds API +
  Rundown + ESPN, PATH-FORWARD item 7); the provider comparison table is reference
  material only (except the sharp-anchor seed, §2.2).
- **PHAI/dark-pattern anti-list as compliance doctrine** [PSYCH §6, §8] → captured in
  `COMPLIANCE_AND_RESPONSIBLE_GAMING.md` (the *digest cadence application* is not — §1.1).
- **Competitive landscape (Kalshi, Pikkit, OddsJam, venue-vs-intelligence split,
  fair-value API, "ask why" agent)** [COMPETITIVE_INTELLIGENCE all] → superseded by
  `docs/strategy/COMPETITIVE_LANDSCAPE_2026-07.md`, `docs/ops/edge/2026-08-19-competitive-intel-brief.md`,
  `docs/ops/B2B_API.md`, and Model Court (shipped).
- **Short-form formats ("The Pass List," "Autopsy in 30s") + channel rankings**
  [MARKETING §2; MEDIA §6] → media-revenue pillars (`no_bet_clinic`, `loss_autopsy` in
  `apps/web/lib/media-revenue/content-pillars.ts`) + `docs/media/FIRST_90_DAYS_MEDIA_PLAN.md`
  + fantasy `ORGANIC_PLAYBOOK.md` carry richer, current versions.
- **Programmatic-SEO page map** [MARKETING §4] → largely built differently: `/preview`
  matchup pages (in sitemap, capped for crawl budget), `/mlb` `/nhl` `/stats` hubs,
  `/academy`, `/how-to-verify-a-record`, newsletter/podcast archives with JSON-LD.
  Residue captured in §1.3 (losses/blog sitemap + OG) only.
- **`docs/ops/decision-log.md` (46KB)** → pure May-2026 build-slice history; every
  decision shipped and long since restated in canon; archived at
  `docs/ops/archive/dated/decision-log.md`.
- **`handoff.md` (73KB)** → Phase 1–9 session mechanics, zero unique strategy;
  archived at root-museum.
- **REPO_INTELLIGENCE_REPORT verified-state inventory** (1,855 tests, v5.0.0 baseline,
  48 routes) → historical snapshot; today ~11.5k web tests. Its §8 "strengths to
  preserve" list remains true and is enforced by CI guards.
- **PRODUCTION_QUALITY_AUDIT overall** → majority shipped; the open residue is §1.11.
- **CODEX_* handoffs, logs, code files on the branch** → session mechanics; skipped
  per brief.

---

## 4. CONTRADICTIONS (flagged, not resolved)

1. **Free-tier factor-trail tease vs value-ladder doctrine.**
   [PSYCH §9] says show the free pick's full reasoning (its highest-leverage change);
   the value-ladder doctrine (`RESEARCH_MAP.md` Part 2.B #8: "forbids leaking the paid
   product") says don't. Flagged unresolved on 2026-06-22; **still unresolved in code
   today** (`canSeeFactorBreakdown: isPro`). Needs a founder ruling either way before
   kickoff traffic (§1.4).
2. **Reverse trial / "promote the 7-day guarantee hard" vs locked no-trial, 3-day
   window.** [SALES §2.3, exp #4–5] recommends a 7-day reverse trial and heavy
   guarantee promotion; current locked pricing copy is "No free trial … 3-day
   money-back window" (`apps/web/app/pricing/page.tsx:208`). The June *numbers* are
   dead; whether the *mechanisms* (reverse trial; guarantee-at-every-CTA) are wanted
   under the founding ladder is an unresolved money decision — do not implement from
   the June doc.
3. **"Verified, not self-reported" hero copy vs banned vocabulary.** [PSYCH §4.1]
   recommends the Pikkit-style frame as literal copy; the brand scanner bans
   "verified track record"-class phrasing (RESEARCH_MAP §8; honored in
   `apps/web/app/how-to-verify-a-record/page.tsx`). The *frame* (records that can't be
   edited vs records that are claimed) survives; the literal phrase likely fails the
   scanner. Any adoption goes through the compliance scanner, not around it.
4. **Elite early-access publish window vs current locked packaging.** [SALES §2.2;
   PSYCH exp-P3] propose `earlyAccessMinutes` as Elite substance. Current locked
   ladder (CLAUDE.md) defines Elite as alerts + CLV ledger — no timing tier. Tiered
   pick-timing also interacts with the "public picks with stale auto-suppression"
   gate-flip ladder (PATH-FORWARD §5.2). Founder packaging decision; flag only.
5. **June marketing's "wire the newsletter now (zero-CAC)" vs the draft-only guardrail.**
   [MARKETING §2-P0, §9] assumes sending; the standing law (ORGANIC_PLAYBOOK: sending
   blocked by `draft-only.mjs`, "capture now, wire a sender later, behind owner
   approval") gates it. Not a true contradiction — a sequencing gate — but any agent
   acting on the June doc verbatim would violate the guardrail. All §1.1/§1.2 email
   work is spec + draft until the founder approves a sender.
6. **Docs hygiene, same family:** CLAUDE.md still points at
   `COMPETITIVE_PRICING_AND_PACKAGING.md` as pricing's companion doc, but that file
   now lives only in the museum — the root reference dangles. One-line fix when
   CLAUDE.md is next touched (canonical source is `pricing-phases.ts`, which CLAUDE.md
   already names).

---

*Extraction performed 2026-08-26 against `origin/garrett/resource-dump-2026-06-15`
(diff-verified identical to the root-museum copies) and the live main tree. Not
committed; founder/lane owners route items per the "Lands in" pointers above.*
