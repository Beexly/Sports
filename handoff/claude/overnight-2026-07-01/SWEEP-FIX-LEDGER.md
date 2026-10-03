# Sweep Fix Ledger — session max-value audit (2026-07-02)

An adversarial multi-agent sweep re-checked every deliverable from the overnight session. **29 findings CONFIRMED** by independent verifiers (each tried to refute the finding against the real code before it was kept). Items marked DONE were fixed in the same pass; the rest carry their exact, verifier-revised fix for a focused follow-up.

**Crypto branch (claude/crypto-payments) is NOT merge-ready** until its remaining money items close. The critical never-expire bug and the pricing-copy contradictions ARE fixed.


### 1. [CRITICAL] ✅ DONE Crypto passes never expire — one $99/$179 payment grants perpetual PRO/ELITE
- **branch:** claude/crypto-payments
- **file:** `apps/web/lib/entitlements.ts`
- **fix:** In apps/web/lib/entitlements.ts, make the ACTIVE/TRIALING branch term-aware for crypto rows while leaving Stripe (lifecycle-webhook-managed) and PAST_DUE grace behavior untouched: replace { status: { in: ["ACTIVE","TRIALING"] } } with { status: { in: ["ACTIVE","TRIALING"] }, OR: [ { paymentProvider: { not: "COINBASE_COMMERCE" } }, { currentPeriodEnd: { gt: new Date() } } ] }. (Nesting the provider/expiry OR inside the status branch — rather than the flat OR sketched in the original finding — preserves TRIALING and the PAST_DUE grace branch exactly as-is.) Since lib/pricing/tier-access.ts resolves tier through getUserEntitlements, this one cha

### 2. [HIGH] Stripe lifecycle events can destroy a freshly paid crypto pass (row clobber, Stripe→crypto)
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/webhooks/coinbase-commerce/route.ts`
- **fix:** Minimal fix, in priority order (2 and 3 alone eliminate the clobber; 1 is defense-in-depth): (1) In apps/web/app/api/webhooks/coinbase-commerce/route.ts, add to the upsert's `update` block: `stripeSubscriptionId: null, stripePriceId: null, pastDueSince: null, trialStart: null, trialEnd: null, canceledAt: null` — with stripeSubscriptionId nulled, the Stripe deleted/payment_failed updateMany-by-subscription-id no longer matches the row. Keep stripeCustomerId (needed if they later return to card billing), which is why step 2 is also required. (2) In apps/web/app/api/webhooks/stripe/route.ts syncSubscription, before applying updateData, load the 

### 3. [HIGH] Charge-code idempotency lives on a mutable column — replayed confirmed webhooks can re-grant, and a double payment silently vanishes
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/webhooks/coinbase-commerce/route.ts`
- **fix:** Add an append-only processed-charge ledger with a unique constraint — either a new CommerceWebhookEvent table or generalize WebhookEvent (make stripeEventId nullable-unique, add nullable-unique chargeCode column) plus a Prisma migration on the branch. In the webhook: insert the charge code into the ledger BEFORE granting and treat P2002 as duplicate → 200 (drop the findFirst check-then-act). Key the ledger on the CHARGE CODE (grantFromCommerceEvent doesn't extract the Commerce event id today; charge code alone kills both the replay re-grant and the vanishing double payment — extracting event.id as a second recorded field is optional). In the 

### 4. [HIGH] Stripe checkout has no guard against an active crypto pass — card signup silently discards remaining pass months (crypto→Stripe clobber / double-charge)
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/subscriptions/checkout/route.ts`
- **fix:** In apps/web/app/api/subscriptions/checkout/route.ts (branch claude/crypto-payments), before calling getOrCreateStripeCustomer, mirror the crypto route's guard: `const existing = await db.subscription.findUnique({ where: { userId: session.user.id }, select: { status: true, tier: true, currentPeriodEnd: true } }).catch(() => null);` and if existing is ACTIVE, tier !== "FREE", and currentPeriodEnd > now, return 409 with a message like "You already have an active subscription/pass — it must expire or be canceled before starting a card subscription." (matches apps/web/app/api/billing/crypto-checkout/route.ts:49-63). Additionally, in apps/web/app/a

### 5. [HIGH] Verified verdict displays committed fields from unhashed DB columns — tamper check does not cover what is shown
- **branch:** claude/night-shift
- **file:** `apps/web/app/api/verify/route.ts`
- **fix:** In apps/web/app/api/verify/route.ts: after the hash check passes, parse receipt.payload (split on '|', then on the first '=' per pair — the format from canonicalPickPayload is sorted k=v pairs; note modelProb is the literal string "none" when absent, entryOdds/confidence are integers, line/edgeScore/marketFairProb are decimals). Build the response's `committed` object, `modelVersion`, and `frozenAt` (the committed `asOf` key) from the PARSED payload values so everything displayed is covered by contentHash. Then cross-check the parsed values against the DB columns (line, entryOdds, marketFairProb, confidence, edgeScore, modelProb, modelVersion

### 6. [HIGH] ✅ DONE Crypto annual pass never expires — entitlements ignore currentPeriodEnd, so a one-year pass grants PRO/ELITE forever
- **branch:** claude/crypto-payments
- **file:** `apps/web/lib/entitlements.ts`
- **fix:** In apps/web/lib/entitlements.ts getUserEntitlements, replace the `{ status: { in: ["ACTIVE", "TRIALING"] } }` OR-arm with two arms: `{ status: { in: ["ACTIVE", "TRIALING"] }, paymentProvider: "STRIPE" }` (unchanged Stripe behavior — Stripe webhooks own status transitions) and `{ status: "ACTIVE", paymentProvider: "COINBASE_COMMERCE", currentPeriodEnd: { gt: new Date() } }` (fixed-term passes fail closed at expiry; also naturally excludes TRIALING/PAST_DUE, which cannot occur for crypto). Keep the existing PAST_DUE grace arm Stripe-only by adding paymentProvider: "STRIPE" to it as well, since crypto has no dunning. Add regression tests in apps

### 7. [HIGH] ✅ DONE Crypto refund copy contradicts the 3-day money-back promise directly below it
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/pricing/page.tsx`
- **fix:** Pick one policy and state it everywhere. Recommended (keeps the existing page-wide promise): in apps/web/app/pricing/page.tsx replace the crypto paragraph's last sentence with copy stating the 3-day money-back window applies to crypto too, with the honest caveat that on-chain payments cannot be auto-reversed so a refund inside the window is processed manually and returned at the USD price paid (e.g. "The 3-day money-back window applies here too — on-chain payments can't be reversed automatically, so a refund inside the window is handled manually and returned at the USD price you paid."). Leave the refund note and both FAQs unchanged. Also add

### 8. [HIGH] ✅ DONE Live RSS mode still renders the "fictional sources" disclaimer under real headlines
- **branch:** claude/night-shift
- **file:** `apps/web/app/the-beat/page.tsx`
- **fix:** In apps/web/app/the-beat/page.tsx, make the footer disclaimer conditional on liveWire: render WIRE_DISCLAIMER only when liveWire === null; when liveWire !== null render an honest live-mode disclaimer instead, e.g. "Live wire: headlines come from public RSS feeds (titles and timestamps only) and are attributed to their sources. Tier, impact, and urgency are our model's read of each report, not the source's claim." Optionally export that string as WIRE_LIVE_DISCLAIMER from apps/web/lib/news/wire.ts next to WIRE_DISCLAIMER so the copy lives beside its sibling. Note fetchLiveWire fails soft and may return a non-null (possibly sparse) array when f

### 9. [HIGH] ✅ DONE Live wire can fabricate a "Confirmed · 2 sources" badge for two unrelated stories
- **branch:** claude/night-shift
- **file:** `apps/web/lib/news/impact.ts`
- **fix:** In apps/web/lib/news/impact.ts corroborate(), do not group player-less items: for items where `it.player` is undefined/empty, emit `{ sources: 1, confirmed: false, sourceNames: [it.source] }` directly instead of adding them to a group key (i.e., only build group keys when a real player is present). This fixes both the badge and the score inflation at the source, so no the-beat.tsx change is needed. Add a test in apps/web/__tests__/news-rss-wire.test.ts: two items with the same team+signal, no player, different sources → both get sources:1/confirmed:false; and a positive control with matching player across two sources → confirmed:true.

### 10. [HIGH] Methodology promises a line-age badge that only exists on the unmerged claude/freshness-badge branch
- **branch:** claude/night-shift
- **file:** `apps/web/app/methodology/page.tsx`
- **fix:** Cherry-pick 72bc78ac onto claude/night-shift (confirmed conflict-free: both branches sit on base a7bd5639 and the picks page is identical between them). Files added/changed: apps/web/components/picks/line-freshness-badge.tsx (new), apps/web/app/picks/page.tsx (+16), apps/web/__tests__/line-freshness-badge.test.ts (new, 59 lines). Then run the badge test file to verify green. If for some reason the branches must not merge together, instead delete the "Shown, not claimed" article block (~lines 188-196) from apps/web/app/methodology/page.tsx on night-shift until the badge lands.

### 11. [MEDIUM] ⚠️ CORRECTED 2026-07-02: previously marked DONE — the notice CODE was never built (ledger overclaim caught by continuity audit). Only #22's copy-side fix (deleting the promise from pricing copy) actually landed, which removes the broken PROMISE but means crypto passes still expire silently. The PASS_ENDING notice below remains an open build on claude/crypto-payments. Pricing copy promises 'a reminder before your year ends' — no reminder mechanism exists anywhere
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/pricing/page.tsx`
- **fix:** In apps/web/lib/billing/notice.ts: add "PASS_ENDING" to the BillingNotice kind union, add an optional periodEnd: Date | null field, and extend the Prisma select to include paymentProvider, cancelAtPeriodEnd, and currentPeriodEnd. After the existing PAST_DUE branch, add: if status === "ACTIVE" && paymentProvider === "COINBASE_COMMERCE" && cancelAtPeriodEnd && currentPeriodEnd && currentPeriodEnd within the next 30 days, return { kind: "PASS_ENDING", tier, graceEndsAt: null, periodEnd: currentPeriodEnd }. Then in apps/web/components/ui/billing-notice-banner.tsx add a PASS_ENDING case rendering "Your annual {tier} pass ends on {date}. Renew from

### 12. [MEDIUM] ✅ DONE Pricing page now contradicts itself: '3-day money-back window' on 'every paid plan' vs 'crypto payments are final'; founding price-lock vs unlocked pass renewals
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/pricing/page.tsx`
- **fix:** Copy-only, in apps/web/app/pricing/page.tsx on claude/crypto-payments: (a) change the bottom refund note and the FAQ answer from "Every paid plan has a 3-day money-back window" to something like "Card plans have a 3-day money-back window. Crypto passes are final once confirmed on-chain — see the crypto section." (b) In the crypto blurb, add one plain sentence that renewals are a fresh purchase at the rate current when you renew (e.g. "When your year ends you renew deliberately, at whatever the rate is then."). Do NOT build a per-user phase lock tonight — honoring founding pricing on pass renewals is a product decision (owner-gated). Keep word

### 13. [MEDIUM] charge:delayed / charge:resolved are silently swallowed — a customer whose crypto confirms after the charge window pays real money and gets nothing
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/webhooks/coinbase-commerce/route.ts`
- **fix:** Scope the tonight fix to observability, not grant policy. In apps/web/app/api/webhooks/coinbase-commerce/route.ts, in the `if (!grant)` branch, parse event.type + data.code + data.metadata.userId and: (a) for charge:delayed, charge:failed, and charge:resolved, emit a structured console.warn (e.g. "[coinbase-commerce] non-granting payment event" with type, chargeCode, userId) and fire the existing env-gated owner alert (export sendOwnerAlert from packages/ingestion-pipeline/src/index.ts — currently not exported — and call it; it is already a safe no-op without TELEGRAM_* env vars and apps/web already depends on @sports/ingestion-pipeline); (b)

### 14. [MEDIUM] /verify page 500-crashes on repeated ?hash= query params (Next 14 searchParams is string[] at runtime)
- **branch:** claude/night-shift
- **file:** `apps/web/app/verify/page.tsx`
- **fix:** In apps/web/app/verify/page.tsx, widen the prop type and normalize before use: searchParams: { hash?: string | string[] }; ... const raw = Array.isArray(searchParams.hash) ? searchParams.hash[0] : searchParams.hash; const candidate = raw?.toLowerCase() ?? ""; const initialHash = /^[0-9a-f]{64}$/.test(candidate) ? candidate : ""; This also removes the existing non-null assertion (`searchParams.hash!.toLowerCase()`). Server- and client-side validation already re-checks the hash, so taking the first value of a duplicated param is safe.

### 15. [MEDIUM] DB failure on /api/verify masquerades as 'no receipt matches that hash' (false non-existence on the honesty surface)
- **branch:** claude/night-shift
- **file:** `apps/web/app/api/verify/route.ts`
- **fix:** In apps/web/app/api/verify/route.ts (branch claude/night-shift), replace the `.catch(() => null)` on the db.pickProofReceipt.findFirst(...) call with an error-distinguishing wrapper, e.g.: `let receipt; try { receipt = await db.pickProofReceipt.findFirst({...}); } catch { return NextResponse.json({ found: false, error: "The verifier could not reach the record store. This is a temporary outage on our side, not a missing receipt — try again in a minute." }, { status: 503 }); }` and keep the existing `if (!receipt) return NextResponse.json({ found: false });` for the true not-found case. No change needed in verify-console.tsx: its fetch handler 

### 16. [MEDIUM] /verify is undiscoverable — no nav, footer, methodology, or accountability surface links to it (only pick cards)
- **branch:** claude/night-shift
- **file:** `apps/web/components/ui/footer.tsx`
- **fix:** In apps/web/components/ui/footer.tsx, add `{ label: "Verify a Pick", href: "/verify" }` to COMPANY_LINKS (e.g. right after the Accountability entry at line 22). In apps/web/app/accountability/page.tsx, turn the existing Merkle-receipt card (line ~142) into (or append to it) a link to /verify — this is the strongest placement since the page already describes the receipt system. Optionally add one short "tamper-evident receipts" line on apps/web/app/methodology's page linking to /verify. Copy-plus-link only; no data-path changes.

### 17. [MEDIUM] SlateCommitment freeze-once is never wired into the cron — the anti-cherry-pick Merkle commitment is built, tested, schema'd, and never minted
- **branch:** claude/night-shift
- **file:** `packages/ingestion-pipeline/src/process-sport.ts`
- **fix:** In packages/ingestion-pipeline/src/process-sport.ts, after the per-pick upsert loop (same non-fatal try/catch pattern as the receipt mint at ~451-505): compute slateKey = dailySlateKey(sport, earliestCommenceIso) (use the exported helper, not a hand-rolled `${sport}:${utcDay}` — it uppercases sport and slices the ISO day, keeping keys consistent); load the day's frozen PickProofReceipt rows (id/pickId + payload) for that slate; check existing = await db.slateCommitment.findUnique({ where: { slateKey } }); call planSlateCommitment({ slateKey, receipts, earliestKickoff: earliest commence time of the slate's games, now: new Date().toISOString(),

### 18. [MEDIUM] No public slate Merkle-root publication surface — /verify only verifies single receipts
- **branch:** claude/night-shift
- **file:** `apps/web/app/api/verify/route.ts`
- **fix:** Extend GET /api/verify (apps/web/app/api/verify/route.ts) with a second mode: if ?slate=<KEY> matches /^[A-Z]+:\d{4}-\d{2}-\d{2}$/, return db.slateCommitment.findUnique({ where: { slateKey } }) as { slateKey, root, count, committedAt } (404-style { found: false } if absent); if ?slates=recent, return db.slateCommitment.findMany({ orderBy: { committedAt: 'desc' }, take: 30 }). Keep the existing ?hash= path untouched. Then add a 'Slate commitments' section to apps/web/app/verify/page.tsx rendering the recent list (slateKey, root, count, committedAt). Note in the section copy that commitments begin appearing once slate minting is live (finding #

### 19. [MEDIUM] Crypto spec safety rail #3 unmet: refund/terms page has no crypto-specific refund language
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/terms/page.tsx`
- **fix:** On claude/crypto-payments, add a crypto-payments paragraph to section 5 ('Subscriptions and billing') of apps/web/app/terms/page.tsx: crypto annual passes are fixed-term and do not auto-renew (no card on file); crypto payments are final once confirmed on-chain; refunds are handled manually on request and processed at the then-current USD value via the payment processor; contact route for refund requests. Also qualify the terms wording 'Paid plans renew automatically' to exclude fixed-term crypto passes. Optionally (same session) qualify the pricing page's 'Refund note' ('3-day money-back window... cancel from your dashboard') so it doesn't mi

### 20. [MEDIUM] Promised crypto renewal reminder doesn't exist — billing-notice banner never fires for expiring passes, and the webhook comment claiming it does is false
- **branch:** claude/crypto-payments
- **file:** `apps/web/lib/billing/notice.ts`
- **fix:** On claude/crypto-payments: (1) In apps/web/lib/billing/notice.ts add "PASS_EXPIRING" to BillingNotice.kind, widen the findUnique select to include paymentProvider and currentPeriodEnd, and after the PAST_DUE branch return { kind: "PASS_EXPIRING", tier, graceEndsAt: currentPeriodEnd } when paymentProvider === "COINBASE_COMMERCE", status === "ACTIVE", and currentPeriodEnd is non-null and within 14 days of now (and in the future). (2) In apps/web/components/ui/billing-notice-banner.tsx add a PASS_EXPIRING branch with renew copy linking to /pricing. (3) Extend apps/web/__tests__/billing-notice.test.ts with cases: crypto ACTIVE pass 10 days out → 

### 21. [MEDIUM] Sliding-scale freshness claim describes an env-gated mode that is off by default
- **branch:** claude/night-shift
- **file:** `apps/web/app/methodology/page.tsx`
- **fix:** In apps/web/app/methodology/page.tsx, in the "Checked per game" card, keep the first sentence and replace "The closer a game is to starting, the fresher its lines must be: lineups, injuries, and late market moves change prices fastest in the final hours." with wording that is unconditionally true, e.g.: "Every game's lines must beat a hard maximum age before its pick can publish — and the gate is built to tighten as kickoff approaches, because lineups, injuries, and late market moves change prices fastest in the final hours." Do NOT change the freshnessMode() default in packages/data-ingestion/src/freshness-schedule.ts tonight (owner-gated pr

### 22. [MEDIUM] ✅ DONE "A reminder before your year ends" has zero code behind it
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/pricing/page.tsx`
- **fix:** Cheapest honest fix (one-line, zero risk): in apps/web/app/pricing/page.tsx on claude/crypto-payments, change "no card on file, no auto-renew, and a reminder before your year ends." to "no card on file, no auto-renew." Alternatively, to keep the promise, add a small client-safe banner component (e.g. apps/web/components/billing/crypto-pass-expiry-notice.tsx) rendered in the signed-in dashboard layout when subscription.paymentProvider === 'COINBASE_COMMERCE' && cancelAtPeriodEnd && currentPeriodEnd is within 14 days of now, showing "Your annual pass ends on {date}. Renew from the pricing page to keep {tier}." with a unit test for the date-wind

### 23. [MEDIUM] Verify page claims "every pick is frozen into a receipt" but minting is conditional and best-effort
- **branch:** claude/night-shift
- **file:** `apps/web/app/verify/page.tsx`
- **fix:** In apps/web/app/verify/page.tsx: (1) change meta description to "Picks are frozen into SHA-256 receipts before kickoff and never rewritten. Paste a receipt hash and check the commitment yourself: the integrity check runs live against the stored record." (2) change body copy from "Before kickoff, every pick is frozen into a receipt:" to "Before kickoff, each published pick with a full market quote is frozen into a receipt:" and append one honest sentence, e.g. "A pick without a receipt link either predates the receipt system or lacked a complete market quote at freeze time." No UI changes needed — pick cards already render the verify link only

### 24. [MEDIUM] Live-wire Fantasy/Market/Reliability numbers are heuristic constants presented as data
- **branch:** claude/night-shift
- **file:** `apps/web/components/news/the-beat.tsx`
- **fix:** In apps/web/components/news/the-beat.tsx, TheBeat already has the isLive flag in scope: when isLive, render the impact row labels as "Est. fantasy" / "Est. market" (or add a small "model read" chip beside the row) and add title tooltips noting these are the impact engine's read of the report, not measured line/projection movement; label the urgency dial the same way. In apps/web/lib/news/wire.ts add a LIVE_WIRE_DISCLAIMER ("Headlines are real and source-attributed via public feeds; impact and urgency numbers are our model's read of each report — source tier × signal type × freshness — not measured line movement.") and in apps/web/app/the-beat

### 25. [LOW] No rate limit on POST /api/billing/crypto-checkout — signed-in users can spam Coinbase charge creation
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/billing/crypto-checkout/route.ts`
- **fix:** In apps/web/app/api/billing/crypto-checkout/route.ts (branch claude/crypto-payments): add `import { consumeRateLimit } from "@/lib/api/rate-limit";` and, immediately after the `if (!userId)` 401 check, add: `const limit = consumeRateLimit("crypto-checkout", userId, 5, 5 * 60 * 1000); if (!limit.ok) { return NextResponse.json({ error: "Too many checkout attempts. Try again in a few minutes." }, { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }); }` — mirror the exact response shape used in apps/web/app/api/picks/[id]/explain/route.ts (check whether that route sets a Retry-After header / uses limit.retryA

### 26. [LOW] Public /api/verify has no rate limit despite the repo's existing per-IP limiter pattern
- **branch:** claude/night-shift
- **file:** `apps/web/app/api/verify/route.ts`
- **fix:** In apps/web/app/api/verify/route.ts: (1) change the import to `import { NextResponse, type NextRequest } from "next/server";` and the handler signature to `export async function GET(request: NextRequest)`; (2) add `import { consumeRateLimit, clientIp } from "@/lib/api/rate-limit";`; (3) at the top of GET, before parsing the hash, add: `const rl = consumeRateLimit("proof-verify", clientIp(request), 30, 60_000); if (!rl.ok) { return NextResponse.json({ found: false, error: "Too many checks — retry shortly." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }); }`. Note `new URL(request.url)` continues to work unchanged sinc

### 27. [LOW] Crypto pass renewal is impossible before expiry — checkout 409s while the pass is active, and the webhook would clip remaining days anyway
- **branch:** claude/crypto-payments
- **file:** `apps/web/app/api/billing/crypto-checkout/route.ts`
- **fix:** In apps/web/app/api/billing/crypto-checkout/route.ts, add paymentProvider to the findUnique select and let checkout proceed when the existing subscription is paymentProvider === "COINBASE_COMMERCE" and currentPeriodEnd is within a renewal window (e.g. 14 days) — keep the 409 for card (Stripe) subscriptions and for crypto passes outside the window. In apps/web/app/api/webhooks/coinbase-commerce/route.ts, before the upsert read the existing subscription; when it is a COINBASE_COMMERCE pass for the SAME tier with currentPeriodEnd in the future, compute the period as start=now, end=new Date(existing.currentPeriodEnd.getTime() + CRYPTO_PASS_DAYS*2

### 28. [LOW] schema.prisma committed with CRLF line endings on the crypto branch — violates the repo's .gitattributes and inflates the diff into a merge-conflict magnet
- **branch:** claude/crypto-payments
- **file:** `packages/db/prisma/schema.prisma`
- **fix:** On claude/crypto-payments, do NOT run `git add --renormalize` (main's blob is itself mostly CRLF; renormalizing creates a ~2400-line diff). Instead, restore main's exact bytes for all untouched lines: `git show origin/main:packages/db/prisma/schema.prisma > packages/db/prisma/schema.prisma`, then re-apply only the semantic change (make stripeCustomerId optional, add paymentProvider/externalChargeId fields and the PaymentProvider enum — recover it with `git diff -w origin/main...claude/crypto-payments -- packages/db/prisma/schema.prisma`), matching the CRLF endings of the surrounding Subscriber-model lines, and commit. Verify with `git diff or

### 29. [LOW] Six new operator env keys shipped dark are undocumented in .env.example, breaking the repo's own documentation convention
- **branch:** claude/night-shift
- **file:** `.env.example`
- **fix:** Add commented entries for the six keys to .env.example on claude/night-shift, grouped with existing sections: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID (ops alerts, no-op unless BOTH set), NEWS_RSS_FEEDS (semicolon-separated feeds, pipe-separated fields per rss.ts header comment), ODDS_FRESHNESS_MODE (fixed|dynamic, default fixed), ODDS_FRESHNESS_MAX_HOURS (default 4), NEON_SERVERLESS_DRIVER (true opts into Neon HTTP/WebSocket driver). Mirror the production-relevant ones (all six are prod-relevant) in .env.production.example with the same one-line comments and empty/default values.
