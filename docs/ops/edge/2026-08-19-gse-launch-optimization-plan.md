# GSE Launch Optimization Plan — 2026-08-19

Read-only audit. Every code claim below was verified by opening the file at HEAD (`39c1cb90`), diffing the deployed SHA where liveness mattered, and fetching the live site anonymously. No gate or environment variable was flipped, evaluated, or is recommended for flipping. No metric, conversion number, or user behaviour is invented; inference is labelled as inference.

---

## Headline finding

**Production is running a 112-commit-old build, and three surfaces are serving premium content to anonymous visitors.**

`/api/ops/public-surface-truth` reports `deployment_sha: b71f7e28569c9a263389c64362ca85d88482f5c8`. `git rev-list --count b71f7e28..HEAD` returns **112**. At that deployed SHA:

| Surface | Deployed behaviour | HEAD behaviour |
|---|---|---|
| `/board` | `apps/web/lib/board/state.ts` renders `market: decision.pick?.selection ?? "ALL_MARKETS"` unconditionally; `extractRankingFromFb` returns `rankingP` with no viewer argument | `state.ts:112` returns `{ rankingP: null, rankingSource: null }` for non-premium viewers (GSE-SEC-026); `state.ts:314-316` redacts `market` |
| `/intelligence/engines` | `page.tsx:147` calls `active.load()`; zero occurrences of `getViewerEntitlements` or `TierGatePanel` in the file | imports both at `page.tsx:12-13`, gates at `:159-178` |
| `/observatory` | `page.tsx:58` calls `getSlateTwin()` with no entitlements; deployed `lib/slate-twin/get-slate-twin.ts` contains zero occurrences of `canSeeConfidence` / `canSeePremiumPicks` | `page.tsx:62-63` resolves entitlements and passes them; loader enforces at `:109`, `:214-225` |

Live confirmation: an anonymous fetch of `/intelligence/engines?engine=player-model` returned the full player-model analytics tables (row 1 verbatim: `Jared Goff | DET | 97 | 88 | +0.29 | 0.20 | 1.55 | In-line`) with no gate panel anywhere on the view.

The fixes are already merged. **The highest-value action available this week is a redeploy, not a code change.** It involves no gate change.

A consequence for anyone reading the five source audits: production is running a materially different, less-safe codebase than the one those audits read. Any HEAD line-number claim about *live* behaviour in them is unverified unless separately fetched.

---

## Ship this week

Ranked strictly by (revenue or trust impact) / (hours of solo effort). Total ≈ 11–14 focused hours.

| # | Item | Effort | Files |
|---|---|---|---|
| 1 | Deploy main — closes three live anonymous premium leaks | 1–2h | `apps/web/lib/board/state.ts`, `apps/web/app/intelligence/engines/page.tsx`, `apps/web/app/observatory/page.tsx`, `apps/web/lib/slate-twin/get-slate-twin.ts` |
| 2 | Free teaser delivers 2, not 1 (truncate after the filter) | 1–2h | `apps/web/app/api/picks/route.ts`, `packages/types/src/index.ts` |
| 3 | Correct `/faq` "Every pick, free" (live, false, in JSON-LD) | 30m | `apps/web/app/faq/page.tsx` |
| 4 | Risk disclosure on `/pricing` | 30m | `apps/web/app/pricing/page.tsx`, `apps/web/components/ui/risk-disclosure.tsx` |
| 5 | Checkout works without `crypto.randomUUID` | 30m | `apps/web/components/pricing/subscribe-button.tsx`, `apps/web/lib/billing/checkout-attempt.ts` |
| 6 | Date-bound the daily-slate counts | 1–2h | `apps/web/app/api/picks/daily-slate/route.ts`, `apps/web/app/api/picks/route.ts` |
| 7 | Delete the `/clv` profit clause; publish the scope limit | 1–2h | `apps/web/app/clv/page.tsx`, `packages/prediction-engine/src/clv.ts` |
| 8 | Tier-branch the post-checkout success banner | 30m | `apps/web/app/dashboard/page.tsx` |
| 9 | Billing/cancel reachable for lapsed payers | 1h | `apps/web/app/dashboard/page.tsx`, `apps/web/lib/entitlements.ts` |
| 10 | Edge Index renders `/100` with a visible caption | 30m | `apps/web/components/picks/pick-card.tsx` |
| 11 | Remove unsourced public-split framing from `/observatory` | 20m | `apps/web/app/observatory/page.tsx` |
| 12 | Replace brand tagline + footer claim | 30m | `apps/web/lib/brand.ts`, `apps/web/components/ui/footer.tsx` |

---

## The items in detail

### 1. Deploy main
Evidence above. Redeploy of already-merged code; **no gate or env change**. Smoke-test the money path afterwards — 112 commits land at once. Follow with the regression tests listed in *Next up*: no test currently asserts anonymous redaction on any of the three surfaces, which is why the leaks shipped.

### 2. Free teaser truncation order
`apps/web/app/api/picks/route.ts:128` applies `take: entitlements.dailyPickLimit ?? 200` at the DB layer; the per-pick selective-publish filter runs afterwards (`:135` onward), so survivors can only be fewer than the cap. `packages/types/src/index.ts:180` sets `dailyPickLimit: isPro ? null : 2`. Live anonymous `/picks` rendered **1** card. Fix: over-fetch a bounded pool for the non-premium path, then slice to the limit after the filter and the ranking sort. The cap stays server-side — never a client slice. Land this before or with item 3 so the corrected copy is true.

### 3. `/faq` free-tier answers
`apps/web/app/faq/page.tsx:89` — "Every pick, free: the matchup and pick type on every signal…". `:43` — "Free gets every pick… on all of them." The enforced limit is 2. Both answers ship inside FAQPage JSON-LD. Rewrite to the enforced truth, sourcing the number from the entitlement constant, keeping "up to N" so a thin day cannot re-break it. Add a test asserting no Free answer contains "every pick"/"all of them" and that the stated count equals `FREE.dailyPickLimit`.

### 4. Risk disclosure at the point of sale
`grep RiskDisclosure apps/web/app/pricing/page.tsx` → 0. Twenty-nine other `page.tsx` files under `apps/web/app` render it. Add it above the closing footnote. **Do not** pass `includePastPerformance` — that sentence implies a track record on a page that publishes none. **Do not** hardcode "21+": `apps/web/app/terms/page.tsx:64-72` says "at least the legal age to wager in your jurisdiction" and `apps/web/lib/promotions/public-payload.ts:48` uses "21+ where applicable". Add the missing "publishes research and analysis; nothing here is financial, investment, or betting advice" line, currently present only in Terms.

### 5. Checkout intent-id 400
`apps/web/components/pricing/subscribe-button.tsx:65-69` returns `ci_<base36>_<base36>` when `crypto.randomUUID` is missing. `apps/web/lib/billing/checkout-attempt.ts:174-175` is UUID-only. `apps/web/app/api/subscriptions/checkout/route.ts:74-82` hard-400s with `"clientIntentId must be a UUID."`, rendered verbatim to the buyer. The docstring above `newIntentId` asserting "a non-UUID fallback is safe" is wrong. Return `null` and omit the field — `checkout-attempt.ts:417-421` has an explicit token-less branch. **Do not widen the server regex.** Update `apps/web/__tests__/subscribe-button-intent-id.test.ts:47` with a *stricter* assertion (feed the output through `isValidClientIntentId`), never a relaxed one.

### 6. Daily-slate date window
`apps/web/app/api/picks/daily-slate/route.ts:78-85` builds `baseWhere` with no date bound at all, then stamps `date: new Date()...` at `:143`. The in-file comment at `:77` claiming it "matches /api/picks" is false — `/api/picks` bounds `generatedAt` at `route.ts:103-106`. Live `/picks`: "Games Today 155 · Total Picks 253 · Premium Picks 61" inches from "115 picks published for this date". (Precision: these are *open* pick counts across all dates, not all-time — `result: "PENDING"` bounds them.) Extract one shared predicate imported by both routes.

### 7. `/clv` profit clause and scope limit
`apps/web/app/clv/page.tsx:79-84` — "…the strongest leading indicator that an edge is real… Beat it consistently and profit tends to follow." The graders cannot support it: `packages/prediction-engine/src/clv.ts:80-84` `computeSpreadClv(pickHomeLine, closeHomeLine, side)` and `:98-102` `computeTotalClv(pickTotal, closeTotal, side)` take **no price argument**; only `computeMoneylineClv` (`:114-119`) reads American prices. Delete the profit clause, keep the mechanism, and add a permanent scope-limit block from a shared constant so `/clv` and `/vs/tout-services` cannot drift. Separately: the page withholds the beat-close rate on a sample-size rationale its own display falsifies — `:200-203` renders graded/minGraded (live "923 / 100") beside "not large enough" copy at `:213-214`. State the real methodological reason instead. Disclosing the limit is a stronger trust artifact than the number would be.

### 8. Post-checkout banner
`apps/web/app/dashboard/page.tsx:252` renders for **any** tier on `?upgraded=true`; `:264-266` promises confidence scores, factor trail and line movement. `packages/types/src/index.ts:159-180` grants FANTASY none of those (`isPro` only) and the same `dailyPickLimit: 2`. Build the unlocked list from the entitlement flags so it cannot drift.

### 9. Cancellation reachability (missed by all five audits)
`apps/web/app/terms/page.tsx:76-78` promises cancel-from-dashboard at any time. `apps/web/app/dashboard/page.tsx:282` gates the billing section on `entitlements.tier !== "FREE"`, and `apps/web/lib/entitlements.ts:50, :73-80` resolve PAST_DUE to FREE once the 7-day grace anchored on `pastDueSince` lapses. A member whose card failed loses the only in-app cancellation path while Stripe keeps retrying. Gate on `stripeCustomerId` instead — `apps/web/app/api/subscriptions/portal/route.ts:23-32` already requires exactly that. Widen `apps/web/lib/billing/notice.ts:15, :38` to include FANTASY in the same pass.

### 10. Edge Index legibility
`apps/web/components/picks/pick-card.tsx:570-583` renders the bare integer; the explanation lives only in a `title=` tooltip (`:147`) that does not exist on touch. Live free pick: "Edge Score: 26". The same file sets the correct precedent at `:506-514`, rendering uncalibrated confidence as `72/100` with the comment that `%` would read as a win probability. Render `26/100` plus one visible sentence: the gap between our number and the de-vigged market price — not a win probability, not a proven edge.

### 11. `/observatory` public-split framing
Live and ungated (fetched). `page.tsx:48` "Where money and tickets disagree…", `:107` "…sharp/public splits…", `:27` in the metadata description. Money-vs-tickets *is* the public betting split — the factor class `scripts/guardrails/trust-gate.mjs:90-91` bans as BS-023 ("claims a factor we do not source yet"). The rule matches only the literal strings "sharp money" / "smart money", so these pass CI. Fix the copy now; the guardrail's coverage gap is a sealed-path change (see *Next up*).

### 12. Tagline and footer
`apps/web/lib/brand.ts:22` `BRAND_TAGLINE = "Find the signal before the market moves."` propagates into every page title via `BRAND_META.defaultTitle` (`:209`), the OG/Twitter descriptions, the OG image and the press kit; `:220` `HERO_KICKER` repeats it. "Before the market moves" promises information ahead of the market. The right replacement already exists at `brand.ts:217`: **"We detect. You decide."** Separately `apps/web/components/ui/footer.tsx:108` asserts "delivers calibrated market signals" on every route — including `/pricing` and `/promotions`, where it sits beside commissioned gambling referrals. Neither file is scanned: `scripts/guardrails/no-unsupported-performance-claims.mjs:16-25` lists nine directories, and neither `apps/web/lib/brand.ts` nor `apps/web/components` is among them.

---

## What was falsified, and why it must not come back

Three findings from the source audits are **wrong** and are permanently retired:

1. **"Receipt minting has silently stopped."** False. `/api/proof/receipts` is not an enumeration of mints — `route.ts:79-85` documents a leak-safety invariant filtering to settled, already-kicked-off picks, so its newest `frozenAt` says nothing about mint recency. A pick generated `2026-08-19T07:45:27` carries a receipt frozen `07:45:01.956Z` that `/api/verify` confirms found/verified/sealed. What is real is narrower and is in *Next up*: `packages/ingestion-pipeline/src/process-sport.ts:846-853` skips the mint when `entryOdds === 0`, so model-signal moneylines publish uncommitted.
2. **"'Check a receipt yourself' is a dead end."** False. Live anonymous `/picks` renders, on the free card: *"This pick was frozen into a SHA-256 receipt before kickoff. Click to verify it was never edited."* linking to `/verify?hash=`. The 30-second demo already works for every free visitor. Only the standalone `/verify` page lacks an example hash — a minor nicety.
3. **"GET on `/api/picks/[id]/explain` returns 405 instead of 404."** Correct App Router behaviour for a POST-only route. Not a defect.

Downgraded rather than dropped: the tagline (major, not blocker — aspirational positioning with no number attached, unlike the `/faq` falsehood); the missing in-app upgrade path (major, not blocker — it blocks expansion revenue from a subscriber base of zero); the `LIVE_BOARD` env-var string on `/picks:413` (latent, not live — that branch is unreachable while public picks are enabled).

Two precision corrections carried forward: the `/board` leak exposes `market`/`selection` and `rankingP`, **not** confidence — "the Pro tier's entire headline value" overstates it. And the daily-slate counts are open-pick counts across all dates, not all-time.

Also verified as **latent, not live**: the `/promotions` geo gap. `apps/web/lib/promotions/guards.ts:212-229` skips all state filtering when `options.state` is null, and `apps/web/app/promotions/page.tsx:34` derives state only from a user-supplied `?state=` param, while `apps/web/lib/revenue/responsible-gaming-policy.ts:28-30` (which *does* fail closed) is never called on this path. But live `/promotions` renders an empty state ("We do not have any reviewed promotions cleared for public display at the moment"), and `apps/web/lib/cockpit/operator-registry.ts:213-215` blocks any operator that is not `APPROVED_PARTNER`. This must be closed **before** the first partner approval, not after — but it is not a launch-week blocker.

---

## Do not do

These are permanently retired. Do not re-propose them in a future session.

- **Never write universal "every pick is sealed with a receipt before kickoff" copy** — not as tagline, hero, or paywall text. Three separate audits proposed it; `process-sport.ts:846-853` makes it false. Any receipt claim must be scope-qualified and backed by a passing coverage check.
- **Never publish a win rate, ROI, hit rate, or beat-close rate.** Holdout Brier 0.2556 sits above base-rate uncertainty 0.2499. This includes wiring `recentRecord` without a sample size and Wilson band, and any "Eclipse Gate outperforms" comparison.
- **Never re-select the free teaser to "our best pick"** on the theory free picks are the weak ones. The split is `confidence >= 70` (`packages/prediction-engine/src/constants.ts:28`); with resolution near zero that is itself an unproven discrimination claim.
- **Never add `allow_promotion_codes`** (`apps/web/lib/stripe.ts:292-316`). It bypasses the entire `apps/web/lib/pricing/promo-codes.ts` state machine (`active: false`, owner approval, kill-switch metric, mandatory compliance copy) and decouples the charged amount from the advertised price. Founder pricing decision.
- **Never pass `flow_data` / `subscription_update` to `createPortalSession`** (`stripe.ts:446-455`). `stripePriceAmountMatchesAd` (`price-ids.ts:74-81`) is called from exactly one site — the checkout path at `stripe.ts:166`. A portal plan switch has no fail-closed price check, threatening the lifetime-rate promise at `terms/page.tsx:86-91`.
- **Never auto-fire checkout on mount from URL params.** Link-triggerable payment initiation is a consent defect and is self-defeating for this brand.
- **Never reorder `classify-board-state.ts` branches or thread a real gate value into `buildBoardMeta`.** The `!liveBoardOn` branch returns `refusePublicFire: true`; reordering flips a gate-derived flag. Gate semantics are founder-only.
- **Never widen `CLIENT_INTENT_ID_RE`.** Use the token-less branch.
- **Never default the pricing toggle to Annual.** Show the math; do not choose for the buyer.
- **Never give free accounts per-pick settlement emails.** Cannibalises Elite and is de-facto results marketing.
- **Never surface a settled count on a surface the performance gate darkens.** Remove the fabricated `0`; do not replace it with a number.
- **Never snap published lines without recording the source book and price** — two semantics in one immutable ledger.
- **Never add `includePastPerformance` to the `/pricing` disclosure; never hardcode "21+".**
- **Never add a second read path for picks** bypassing the gates in `api/picks/route.ts`.
- **Never wire a client-side third-party analytics vendor.**
- **Never edit `scripts/guardrails/**` or `.github/**` directly** — sealed paths, founder process only, and no new per-file allowlists alongside a scope widening.

---

## Strategic note

Verifiable honesty is a real differentiator but it is a **tie-breaker, not a demand generator**. Nobody wakes up wanting to verify a hash; they want picks that win. Honesty converts the subset of buyers already burned by a tout and now shopping for a reason to trust anyone — a genuinely real segment, but a small one that arrives via content and word of mouth, not paid acquisition. It also caps price. $14.99/mo for "we will tell you what we do not know" is a hard sell against free Twitter models; near-term revenue is more likely from Fantasy at $4.99 (a concrete deliverable, not a performance promise) and from the affiliate surface once a partner clears, than from Pro. Plan for that mix.

The strongest honest pitch is already written and currently appears once, mid-page, on `/pricing`: `apps/web/lib/competitive/honesty-contrast.ts` `WHY_PAY_FOR_HONESTY_LEAD` — *"A subscription does not buy a promise about results. It buys access to the reasoning behind each refusal, and to a record built so that you — not us — can check whether what we published matches what happened."* Substantiable, differentiated, no performance claim. It should be the paywall's argument (`apps/web/app/picks/page.tsx:451-464` currently sells volume plus a confidence number — the weakest available pitch) and the homepage's. The concrete asset behind it already ships free: the working receipt link on the free pick card.

**The biggest risk is not that the pitch is unpersuasive — it is that it is currently falsifiable by the exact audience it targets.** Honesty positioning carries a higher internal-consistency bar than tout positioning: a tout with a broken number loses nothing; one screenshot of `/faq` promising "every pick, free" beside a one-pick teaser, or `155/253/61` inches from `115`, or three premium surfaces readable while logged out, destroys the whole proposition at once. The skeptics who respond to verifiability are precisely the people who enumerate endpoints and diff pages. That is why items 1–3 and 6–7 outrank every growth idea here: consistency is not polish, it is the product.

Second, quieter risk: `apps/web/lib/analytics/events.ts:89-96` is inert, so there is no way to tell whether the funnel fails at the pitch or at the payment path. Every decision this month is inference, and I have labelled it as such throughout — no ranking above rests on a conversion number, because none exists.

Scope realism: the twelve ship items are ~11–14 focused hours, about two working days. Almost everything in *Next up* is not achievable this week. Content marketing, SEO, magic-link auth, a redesigned homepage funnel and an affiliate launch are each multi-week efforts. Treating them as this week's work is how the two days that matter get lost.

---

## Open questions (founder decisions, not engineering)

1. Should a model-signal pick with no real book quote publish at all, given it cannot carry a receipt (`process-sport.ts:846-853`)? This is a product decision that determines whether the coverage gap is fixed by minting more or by publishing less.
2. Is `REFUND_REVOKES_ACCESS` set in production? Commit `53200c5c` (undeployed) describes a `charge.refunded` handler revoking access on a subscription still ACTIVE in Stripe, with the resurrection guard then swallowing the next renewal. Flagged for the owner to check — **not** for this fleet to evaluate or flip.
3. The live board shows 12 published picks while the classifier reports the public-fire gate held. Which is the intended state? The mismatch should be resolved at the source, not by re-ranking classifier branches.
4. `calibrationEligibility.generatedAt` is ~39 hours stale (six missed runs of `40 */6 * * *` per `vercel.json`) while `schedulerLiveness` reads healthy off `lastAnyIngestionSuccessAt`. Its snapshot ECE (0.0699) also disagrees with the post-sweep 0.0044 cited this session; staleness would explain it. Worth reconciling before anyone trusts either number.
5. Which alerts does the Elite worker actually send — every signal (`pricing/page.tsx:94`) or high-Edge-Index only (`faq/page.tsx:97`)? Both strings should quote one exported constant.
6. Timing of the first affiliate partner approval, since the `/promotions` unknown-state gap must close before it.
