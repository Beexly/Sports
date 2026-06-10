# BREATHTAKING AUDIT — Galaxy Sports Edge (static source pass)

**Date:** 2026-06-10
**Method:** Three persona walks through source at `C:/Users/Garrett/Sports` (deploy clone) — the Skeptical Bettor (every public surface + empty/degraded branch), the Paying Pro Subscriber (pricing promise → checkout → picks → dashboard → billing), and the Journalist (methodology, legal, responsible-gaming, metadata, every place a percentage could hide). All findings deduped and grounded to file:line. Key blocker evidence spot-verified against source on 2026-06-10 (`page.tsx:33-40` LEDGER constant, `page.tsx:234-252` hardcoded calibration points, `page.tsx:363-364` hidden attestation div, `pricing/page.tsx:67` Pro alerts row vs `packages/types/src/index.ts:97` ELITE-only grant, `picks/page.tsx:64` cookieless cached fetch — all confirmed as described).

---

## 1. THE VERDICT

### Where it is already breathtaking

This is the rare site in the category where the grep for dishonest accuracy claims comes back **empty**. No "70% win rate," no "locks," no fabricated testimonials anywhere in public copy. The anti-tout architecture is real and unusually deep:

- **The Pass List** — "evaluated, then withheld" (`apps/web/app/page.tsx:264-288`). No tout shows you what they didn't bet.
- **A DB-driven Loss Room** with operator-written autopsies (`apps/web/app/performance/losses/page.tsx`).
- **A Public Ledger that excludes bootstrap/seed data** and honestly renders "Building ledger history" when empty (`apps/web/app/ledger/page.tsx:114-120`).
- **A Trust Claim Registry** where every public assertion needs evidence and a review date (`apps/web/lib/trust-claims.ts`).
- **A three-layer banned-phrase compliance scanner** blocking win-rate claims, EV claims, tout slang, and hype-emoji ladders (`apps/web/lib/compliance-scanner/rules.ts`) — enforced by eight CI test files (public-copy-scan-strong, metadata-banned-phrases, snapshots-banned-phrases, etc.).
- **A hard performance gate** that refuses to publish a number until the sample is honest (`packages/prediction-engine/src/readiness.ts`).
- **Helpline in the global footer** and a real self-exclusion resources page.

### Where it is cheap — honestly

The site that built a machine to catch dishonest copy got caught by the sentences the machine wasn't pointed at. Four lapses violate the product's own stated standard, on its most visible surfaces:

1. **The homepage fakes a settlement ledger** — six hardcoded W/L rows (a flattering 3W/2L/1P) labeled "Six recent settlements," directly above a hidden DOM element that swears "No picks are fabricated for the homepage."
2. **The homepage fakes a calibration chart** — four hardcoded dots under a "LIVE CALIBRATION" eyebrow, beside a caption that can read "Sample: 0 canonical settled picks."
3. **The pricing page sells features the code doesn't grant** — Pro is sold "Line-movement alerts" that only ELITE's entitlement flag covers, and no alert-sending infrastructure exists for any tier.
4. **The legal pages fabricate freshness** — "Last updated: {today}" computed at request time on a self-admitted unreviewed-placeholder ToS, while live Stripe subscribe buttons ship.

Separately, the **paying Pro experience is broken at the moment of value**: the server-side `/picks` fetch never forwards the session cookie and caches one anonymous payload for all users — a $19/mo subscriber sees padlocks on the page their money was supposed to unlock, while the free dashboard leaks the very fields Pro is sold on. That is the inverse of the pricing page.

Net: the bones are genuinely anti-tout and would impress in print. The skin, in roughly a dozen places, performs the exact moves the bones were built to prevent. Every one of them is fixable, and most are copy or single-file code changes.

---

## 2. TICKETS

Owner key: **CODEX** = code/implementation fix. **DIRECTOR** = copy/IA/editorial decision + execution. **GARRETT** = founder decision required (money, legal, product definition, brand identity) before execution.

Source tags: [B] Skeptical Bettor, [P] Paying Pro Subscriber, [J] Journalist.

---

### BLOCKERS (9)

#### BA-B01 — Homepage fabricates a settlement ledger, beside a claim that it doesn't `[B][J]` — **CODEX**
- **Moment:** Six hardcoded W/L/PUSH settlements ("SEA -1.5 WIN"…) render under meta "Six recent settlements"; "Open the full ledger" lands on a /ledger that says "Building ledger history… No settled canonical picks are available yet." A hidden test div on the same page asserts "No picks are fabricated for the homepage" while the LEDGER constant fabricates six. The implied 60% record (3W/2L/1P) is the classic tout move on the front door of an anti-tout brand.
- **Evidence:** `apps/web/app/page.tsx:33-40` (hardcoded `const LEDGER`), `:211-231` + `:215` (meta "Six recent settlements"), `:225` ("Open the full ledger"), `:361-367` (hidden div "No picks are fabricated for the homepage"); contradicted by `apps/web/app/ledger/page.tsx:116-120` (honest empty state). *(Verified 2026-06-10.)*
- **Fix:** Delete the hardcoded LEDGER constant. Drive LedgerPreview from the same `loadLedgerRows()` query as /ledger; when empty, show the same honest "Building ledger history" state (or one explicitly-labeled annotated example row with **no** W/L results). Never pair invented results with the word "settlements." Delete or invert the hidden attestation div — as written it is a falsifiable claim sitting in the DOM.

#### BA-B02 — Homepage "LIVE CALIBRATION" chart plots hardcoded dots over a "Sample: 0" caption `[B][J]` — **CODEX**
- **Moment:** Four static pink dots always render under an eyebrow that always reads "LIVE CALIBRATION," even when the gate is closed and the meta line on the same card reads "Sample: 0 canonical settled picks." Unlike GateCam (`page.tsx:175`) and PassList (`:269`), this eyebrow never switches to PREVIEW MODE.
- **Evidence:** `apps/web/app/page.tsx:234-239` (`const points = [[20,72],[42,55],[64,39],[84,23]]`), `:244` (eyebrow "LIVE CALIBRATION" unconditional), `:246` (`Sample: ${calibration.sampleSize}`); gated path returns sampleSize 0 with "Building calibration history…" per `apps/web/lib/calibration/report.ts:22-33`. *(Verified 2026-06-10.)*
- **Fix:** Plot dots only from real calibration buckets. When gated/collecting, render an empty axis + "Building calibration history" state (the /board page already does this honestly) and switch the eyebrow to "CALIBRATION — COLLECTING." Never render decorative data points under a "LIVE" label.

#### BA-B03 — Alerts are sold (Pro and Elite) but unbuilt and misgranted `[B][P]` — **GARRETT**
- **Moment:** Pro ($19/mo) is sold "Line-movement alerts ✓" while the entitlement code grants alerts only to ELITE (`canGetAlerts: tier === "ELITE"`), and the same Pro card marks "Email + push notifications ✗" — no delivery channel for the alerts being charged for. Elite's entire $30/mo premium ("real-time alerts on every published signal," "Email + push") has zero implementation: the flag is computed but consumed nowhere, and no email/push sending code exists in apps/ or workers/.
- **Evidence:** `apps/web/app/pricing/page.tsx:67-68` (PRO "Line-movement alerts" included:true + notifications included:false), `:88`, `:104`, `:111` (comparison cells), `:15` ("$49/mo for full alerts on every published signal"); `apps/web/app/faq/page.tsx:87,91`; vs `packages/types/src/index.ts:97` (`canGetAlerts: tier === "ELITE"`), `packages/types/src/__tests__/entitlements.test.ts:27` ("PRO cannot get alerts"); grep for sendEmail/sendPush/webPush/nodemailer/resend/sendgrid across apps/ and workers/ finds no sending infrastructure. *(Entitlement mismatch verified 2026-06-10.)*
- **Fix:** Founder decision first: (a) pull "alerts" and "Email + push notifications" rows from pricing/FAQ (or mark "shipping soon") until a notification pipeline exists — the cheapest honest fix; or (b) grant a real in-app line-movement alert to PRO in getEntitlements and build the Elite dispatch (founder-gated) before selling the $49 tier on it. The page, FAQ, and entitlement code must agree before a dollar is charged.

#### BA-B04 — Paid checkout is live while the public-picks gate is closed, with no warning `[B]` — **GARRETT**
- **Moment:** FAQ promises "Pro and Elite unlock immediately — every signal with full reasoning," but when `canExposePublicPicks` is false the /api/picks route 503s and a paying Pro lands on "The board is live. Public picks are still gated." A customer can be billed $19–$49/mo today for a board that, by design, may publish nothing — and nothing on the pricing page warns them.
- **Evidence:** `apps/web/app/pricing/page.tsx:137-139` ("Pro and Elite unlock immediately…"); `apps/web/app/picks/page.tsx:289-299` (bootstrap empty state); `packages/prediction-engine/src/readiness.ts:43-47` (`canExposePublicPicks` false → 503).
- **Fix:** While the gate is closed, either disable paid checkout (waitlist + notify), or add an explicit pre-purchase notice on the pricing cards: "Public picks are currently gated while live history accumulates — paid plans activate when the gate opens, and your 7-day refund window starts then." Update the FAQ answer to match.

#### BA-B05 — /picks never forwards the session: paying Pro sees the anonymous free-tier payload, cached for all users `[P]` — **CODEX**
- **Moment:** The server-side fetch to /api/picks forwards no cookie/header, so `auth()` in the route sees no session and applies anonymous defaults: FREE tier filter, take 1, confidence/factorBreakdown nulled. Page-level entitlements ARE computed correctly, so PickCard receives `canSeeConfidence=true` but `pick.confidence` is null → renders the LockedValue padlock. `revalidate: 1800` additionally stores that anonymous response in the shared data cache for 30 minutes across all users. A $19/mo Pro sees one pick with padlocks on the page they were sold.
- **Evidence:** `apps/web/app/picks/page.tsx:64` (`fetch(url, { next: { revalidate: 1800 } })` — no cookie forwarding; verified 2026-06-10); `apps/web/app/api/picks/route.ts:17` (`await auth()`), `:21-30` (anonymous defaults), `:51` (`{ tier: "FREE" }`), `:76` (take 1), `:105,138` (nulled fields); `apps/web/app/picks/page.tsx:115-116` (entitlements computed correctly page-side); `apps/web/components/picks/pick-card.tsx:105-109` (LockedValue padlock).
- **Fix:** Stop proxying through HTTP: query the DB directly in the server component with the session's entitlements (the dashboard already does this), or forward `cookies()` into the fetch with `cache: 'no-store'`. Add a regression test: a PRO session on /picks must receive >1 pick with non-null confidence.

#### BA-B06 — "Cancel any time from your dashboard" — the dashboard has no billing UI; the working button is orphaned `[P]` — **CODEX**
- **Moment:** Pricing says "Cancel any time from your dashboard" four times and the FAQ says "Your dashboard has a Manage Billing button that opens the Stripe customer portal." The dashboard renders no billing UI at all; `ManageSubscriptionButton` exists and works but is imported nowhere. The backing portal API is functional — just unreachable from any UI.
- **Evidence:** Promises: `apps/web/app/pricing/page.tsx:15,122,180-181,368-369`; `apps/web/app/faq/page.tsx:112`. Reality: grep for ManageSubscriptionButton matches only its own definition at `apps/web/components/ui/manage-subscription-button.tsx:5`; `apps/web/app/dashboard/page.tsx` imports nothing billing-related; working API at `apps/web/app/api/subscriptions/portal/route.ts`.
- **Fix:** Render `<ManageSubscriptionButton />` on the dashboard (next to the Tier StatCard or in Quick Links). One import + one JSX line makes four pieces of copy true.

#### BA-B07 — Dashboard leaks paid fields (confidence, edge, reasoning) to free members — the gate is inverted vs /picks `[P]` — **CODEX**
- **Moment:** Any free signed-in member sees confidence %, edge score, and short reasoning for up to 6 of today's picks — including premium ones — on the dashboard, while (per BA-B05) the actual paying Pro sees padlocks on /picks. Pricing sells "Confidence rating on every signal" as Pro-only.
- **Evidence:** `apps/web/app/dashboard/page.tsx:73-84` (`db.pick.findMany` with no tier filter and no getUserEntitlements call), `:349-351` (`{pick.confidence}% conf`), `:352-359` (`+{pick.edgeScore.toFixed(1)} edge`), `:333-335` (reasoningShort); `apps/web/app/pricing/page.tsx:43` (confidence sold Pro-only).
- **Fix:** Call `getUserEntitlements(session.user.id)` in the dashboard and mask confidence/edge/reasoning for FREE tier (reuse the LockedValue pattern from pick-card.tsx), or restrict the query to tier "FREE" picks for free members.

#### BA-B08 — Legal pages fabricate freshness; unreviewed-placeholder ToS ships with live Stripe checkout `[J]` — **GARRETT**
- **Moment:** Both Terms and Privacy render "Last updated: {today's date}" computed at request time — the documents appear freshly revised whichever day you load them. The terms file's own comment admits it is an unreviewed placeholder that "must be reviewed by counsel before paid checkout is enabled," while /pricing renders live `<SubscribeButton>` components.
- **Evidence:** `apps/web/app/terms/page.tsx:30` and `apps/web/app/privacy/page.tsx:25-31` (`Last updated: {new Date().toLocaleDateString(…)}`); `apps/web/app/terms/page.tsx:12-16` (placeholder comment); `apps/web/app/pricing/page.tsx:263-267` (live SubscribeButton).
- **Fix:** Hardcode the actual last-revision date as a constant updated only when the text changes (CODEX-executable today). Complete counsel review before checkout is enabled, or gate SubscribeButton on the same founder flag; remove the placeholder comment once reviewed. The counsel-review/checkout-gating call is Garrett's.

#### BA-B09 — "Calibrated" is the brand's favorite adjective on surfaces the calibration report cannot yet support `[J]` — **DIRECTOR**
- **Moment:** "Calibrated" appears in press soundbites, About principles, FAQ, and the vs-page ("calibrated, fully-reasoned signal," "a calibrated 0–100 confidence rating," "64% calibrated confidence") while the site's own Calibration Report is gated precisely because there are not yet enough settled outcomes to calibrate against. The trust-claims registry itself says numeric scores show "only once calibrated against settled outcomes."
- **Evidence:** `apps/web/app/press/page.tsx:22`; `apps/web/app/about/page.tsx:81,87`; `apps/web/app/faq/page.tsx:62`; `apps/web/app/vs/tout-services/page.tsx:103-104`; vs `apps/web/lib/trust-claims.ts:133-141` (methodology.confidence-presentation) and `apps/web/lib/calibration/report.ts:29` ("Building calibration history…").
- **Fix:** Until `canExposePerformanceStats` is true, sweep to "confidence-rated" / "deterministically scored" — `APPROVED_LANGUAGE` in `apps/web/lib/brand.ts:253` already prescribes "confidence-rated signal." Reserve "calibrated" for surfaces that can cite the settled sample backing it.

---

### SHOULD (17)

#### BA-S01 — Degraded (DB-down) state silently masquerades as live `[B]` — **CODEX**
- **Moment:** When live data errors out, the loader returns dataStatus "degraded" with `isSampleData: false` — so no banner renders, the GateCam eyebrow still says "LIVE BOARD," and the state strip shows "Sports watched 0 / Books polled 0 / Model: unavailable." The site banners sample data but says nothing when real data is missing; it reads as a dead product pretending to be live.
- **Evidence:** `apps/web/lib/board/state.ts:98-118` (degradedBoardState: zeros, modelVersion "unavailable", `meta.isSampleData: false`); `apps/web/app/page.tsx:69-78` (banner keyed only on isSampleData), `:175` (eyebrow ternary); same gap on `apps/web/app/board/page.tsx:35-53`.
- **Fix:** Branch on `meta.dataStatus === "degraded"`: honest "Live feed temporarily unavailable — board data is being restored" banner, eyebrow off "LIVE BOARD," hide the zeroed tiles (a dash beats a fake zero).

#### BA-S02 — Book count: "14 books" vs "dozens of sportsbooks," neither sourced from data `[B][J]` — **DIRECTOR**
- **Moment:** The homepage asserts "14 books" as a static fact while FAQ, About, and the tout-comparison table all say "dozens of sportsbooks" — 14 is not "dozens," and the real number is a live DB value (`bookmakerCoverageMax`). A skeptic diffing pages catches the inflated word immediately; it's the exact "vague confidence" tell the site teaches readers to spot.
- **Evidence:** `apps/web/app/page.tsx:294` ("10+ factors, 14 books, 30-minute refresh cycle" — hardcoded); `apps/web/lib/board/state.ts:129-130` (`booksPolled: 14` hardcoded in sample mode), `:183` (live value from bookmakerCoverageMax); vs `apps/web/app/faq/page.tsx:37`, `apps/web/app/about/page.tsx:75,130`, `apps/web/components/home/tout-comparison.tsx:39` ("dozens of sportsbooks").
- **Fix:** One truthful formulation sourced from data: "up to N books per market" rendered from booksPolled, or the registry's safe phrasing "multiple sportsbooks" (`apps/web/lib/trust-claims.ts:96-105`) via a shared brand constant. Remove "dozens" unless ingestion genuinely covers 24+.

#### BA-S03 — Three surfaces, three answers about what the Free pick is — and the FAQ promise is the opposite of the engine `[B][P]` — **GARRETT**
- **Moment:** FAQ says Free gets "the highest-Edge-Index signal of the slate"; the pricing card and comparison table mark "Highest-Edge-Index signals ✗" for Free; the picks page says "Edge Index is public"; and the engine gives Free only the sub-threshold-confidence picks. The free tier is the trust on-ramp and no two surfaces agree.
- **Evidence:** `apps/web/app/faq/page.tsx:83`; `apps/web/app/pricing/page.tsx:44,110`; `apps/web/app/picks/page.tsx:366-367`; `packages/prediction-engine/src/scoring.ts:357` (`tier = confidence >= PREMIUM_CONFIDENCE_THRESHOLD ? "PREMIUM" : "FREE"`); `apps/web/app/api/picks/route.ts:51` (free filtered to tier FREE).
- **Fix:** Founder decides the actual rule (is the free daily pick the top-Edge-Index signal or not?), then state it identically everywhere — e.g. FAQ: "One free signal per day — premium-grade signals are reserved for Pro and Elite." If the pricing row means something else, rename it so it can't be read as contradicting the FAQ.

#### BA-S04 — Grade ladder: FAQ/brand teach "Eclipse Gate," the product renders "Elite Play" — and /eclipse-gate doesn't exist `[B]` — **DIRECTOR**
- **Moment:** FAQ teaches "Eclipse Gate / Strong / Solid / Lean," but the picks UI filters and badges use "Elite Play / Strong Play / Solid Play / Lean." "Eclipse Gate" never appears on a pick card, and the brand registry routes it to a page that doesn't exist. A skeptic asking "show me one Eclipse Gate signal" can't.
- **Evidence:** `apps/web/app/faq/page.tsx:65-66`; `apps/web/lib/brand.ts:147` (label "Eclipse Gate", route "/eclipse-gate" — no such page in app/); vs `apps/web/app/picks/page.tsx:162-167` (GRADES: "Elite Play"…) and `packages/types/src/index.ts:116-121` (PICK_GRADE_LABELS).
- **Fix:** Unify: either rename ELITE_PLAY's display label to "Eclipse Gate" everywhere (PICK_GRADE_LABELS + picks filter), or strip "Eclipse Gate" from FAQ/brand until it's a real, visible grade. Remove the dead /eclipse-gate route from SURFACES.

#### BA-S05 — FAQ Edge Index definition contradicts itself in one breath `[B][J]` — **DIRECTOR**
- **Moment:** The answer says the Edge Index is "Not a probability the pick wins" and then immediately computes it as exactly that: "A 71 Edge Index still loses ~29 times in 100." Self-contradictory math in the trust section reads like the writer doesn't understand their own metric — or hopes the reader doesn't.
- **Evidence:** `apps/web/app/faq/page.tsx:62`.
- **Fix:** Pick one: if Edge Index is calibrated win probability, say so and keep the 71/29 illustration; if it's a market-vs-model value score, replace the illustration ("a high Edge Index pick can and does still lose — the score measures the size of the offered edge, not the chance of winning").

#### BA-S06 — Hero "We're not AI. We're math you can read." vs an AI-powered feature and an AI-named handle `[B][J]` — **DIRECTOR**
- **Moment:** The H1 stakes the brand on a negation the product contradicts twice: the PRO pick card ships "Ask the model why" explicitly powered by a Claude key, and the brand's canonical X handle — wired into twitter:site/creator metadata and JSON-LD sameAs — is @GalaxySportsAI. A journalist screenshots the hero next to the handle.
- **Evidence:** `apps/web/app/page.tsx:145`; `apps/web/components/picks/pick-card.tsx:154-157` ("Ask the model why — PRO+ grounded explainer… inert without the Claude key"); `apps/web/lib/brand.ts:75` (`x: "https://x.com/GalaxySportsAI"`); `apps/web/app/layout.tsx:89` (`ORG_HANDLE = "@GalaxySportsAI"`).
- **Fix:** Soften the claim to what's true: "The picks are deterministic math, not a black box" (disclosing the optional explainer uses AI to narrate already-computed factors). Handle migration to @galaxysportsedge is Garrett's call (brand.ts notes the AI handle was just the original reservation) — or be ready with the one-line explanation.

#### BA-S07 — The Vault vs the Public Ledger: two receipts, two names, no cross-link `[B]` — **DIRECTOR**
- **Moment:** FAQ crowns The Vault as "the receipt," but /vault is a static "Status: Collecting" placeholder that never links to /ledger — the page that actually is the live settled-pick receipt. A skeptic hunting for the record gets bounced between two archive concepts, which feels like the record is being hidden.
- **Evidence:** `apps/web/app/faq/page.tsx:137`; `apps/web/app/vault/page.tsx:33-39` (links only to /methodology and /performance); real receipt at `apps/web/app/ledger/page.tsx`, reachable from footer but never from /vault.
- **Fix:** Make /vault link prominently to /ledger and /performance/losses as the live receipts ("The settled record so far lives in the Public Ledger"), or merge the surfaces. One archive, one name.

#### BA-S08 — Hero quantifies a publish cadence ("fewer than five picks most days") with zero published history `[B]` — **DIRECTOR**
- **Moment:** "We post when the model finds edge. Most days that is fewer than five picks" is a quantified cadence claim made before any public publishing history exists — exactly the unverifiable number the site's own /vs/tout-services page tells readers to demand receipts for.
- **Evidence:** `apps/web/app/page.tsx:148-149`; no published history per `apps/web/app/ledger/page.tsx:116-120` and the closed performance gate (`packages/prediction-engine/src/readiness.ts:63`).
- **Fix:** Reframe as policy, not history: "The gate is built to publish few picks — a slate that doesn't earn confidence publishes zero." Reintroduce the "<5 most days" number once the ledger can prove it.

#### BA-S09 — Paywall banner upsells $19/mo directly above "Public picks are still gated" `[B]` — **CODEX**
- **Moment:** The Free-tier paywall banner ("You're on Free — one signal a day… See plans") renders unconditionally — including when the bootstrap state says zero picks are published. Being asked for money above an empty board is the cheapest moment on the site.
- **Evidence:** `apps/web/app/picks/page.tsx:201` (`{isFreeTier && <PaywallBanner …/>}` — no picks.length/bootstrap check) vs `:271-299` (bootstrap empty state).
- **Fix:** Suppress PaywallBanner when bootstrapState is set or `picks.length === 0`; replace with a notify-me/waitlist CTA so the page asks for an email, not money, while it has nothing to sell.

#### BA-S10 — Post-checkout: ?upgraded=true is ignored; tier card shows "Member" identical to free `[P]` — **CODEX**
- **Moment:** A customer who just paid $19 lands on a dashboard that ignores the `?upgraded=true` param and shows tier as "Member" — indistinguishable from a free account, with no confirmation anything changed.
- **Evidence:** `apps/web/app/api/subscriptions/checkout/route.ts:41` (successUrl `/dashboard?upgraded=true`); grep shows that is the only occurrence of "upgraded" in the app; `apps/web/app/dashboard/page.tsx:192` (`<StatCard label="Tier" value={user.role === "ADMIN" ? "Admin" : "Member"} />` — role, not subscription).
- **Fix:** Read `searchParams.upgraded` and show a success banner; fetch the Subscription row and display FREE/PRO/ELITE in the Tier card. Both are small server-component changes.

#### BA-S11 — The page the subscription unlocks (/picks) is not linked from nav, mobile nav, or footer `[P]` — **CODEX**
- **Moment:** /picks — the only surface rendering full PickCards — is unreachable from main navigation. Nav's "Today's Board" goes to /board, an ops-status page with no pick details and no tier-gated content. The only routes to /picks are a dashboard quick-link and the /brief stub.
- **Evidence:** `apps/web/components/ui/nav.tsx:7-12` (NAV_LINKS: /board, /observatory, /methodology, /pricing); `apps/web/components/ui/mobile-nav.tsx:7-11`; `apps/web/components/ui/footer.tsx:5-20` (omits /picks); /board has zero entitlement/PickCard usage; routes to /picks only at `apps/web/app/dashboard/page.tsx:245` and `apps/web/app/brief/page.tsx:60`.
- **Fix:** Add "Signals" (/picks) to NAV_LINKS, mobile LINKS, and the footer Product column — or merge /picks into /board so the nav's flagship link carries the paid value.

#### BA-S12 — Elite upsell teaser invents features ("early access… advanced analytics") that exist nowhere `[P]` — **DIRECTOR**
- **Moment:** Pro users are pitched "early access, daily alerts, and advanced analytics" to justify $49 Elite — none of the three exist, and the pricing page doesn't even claim two of them. "Early access" and "advanced analytics" appear exactly once in the entire web app: this line.
- **Evidence:** `apps/web/app/picks/page.tsx:380-387`; pricing defines Elite only as Pro + notifications (`apps/web/app/pricing/page.tsx:77-91`), themselves unbuilt (see BA-B03).
- **Fix:** Rewrite the teaser to match the pricing page's actual Elite definition, or remove it until Elite has a real differentiator. Never invent features in upsell copy.

#### BA-S13 — Marketing promises an unconditional 7-day refund; the Terms reserve "occasional refunds at our discretion" `[J]` — **GARRETT**
- **Moment:** Pricing and FAQ promise a "7-day refund window… no questions" on every paid plan, while the ToS never mentions a 7-day window and reserves discretionary refunds — the classic gap a consumer-protection story leads with.
- **Evidence:** `apps/web/app/pricing/page.tsx:15,20,122,368`; `apps/web/app/faq/page.tsx:95`; vs `apps/web/app/terms/page.tsx:73-76`; `apps/web/lib/trust-claims.ts:216-227` approves the 7-day window as BILLING_POLICY but the legal doc doesn't state it.
- **Fix:** State the 7-day refund window explicitly in Terms §5 (or soften the marketing to match the terms). One of the two documents must move — legal language is Garrett's/counsel's call (pairs with BA-B08).

#### BA-S14 — FAQ "That's it" data-collection claim is contradicted by the site's own privacy policy `[J]` — **DIRECTOR**
- **Moment:** FAQ: "Email, Google OAuth identifier, and your subscription status. That's it. No browsing history, no behavioral profiling." Privacy policy on the same site: name, Google profile image, IP address, user agent, referrer logs, aggregate analytics — and an analytics stack (PostHog et al.) is wired in the codebase, keyed off env.
- **Evidence:** `apps/web/app/faq/page.tsx:115-117` vs `apps/web/app/privacy/page.tsx:34-44`.
- **Fix:** Rewrite the FAQ answer to match the privacy policy's actual scope ("account basics plus standard security logs — full list on the privacy page") and drop "That's it."

#### BA-S15 — Homepage meta + llms.txt claim "a record graded against the close" in present tense; no record exists `[J]` — **DIRECTOR**
- **Moment:** Metadata written for search and AI answer engines asserts every pick ships with "a record graded against the close[ing line]" while the performance page is in Collecting state with zero published record and CLV capture was only just scaffolded. llms.txt itself admits no win-rate is presented yet.
- **Evidence:** `apps/web/app/page.tsx:16,21,29`; `apps/web/public/llms.txt:3` vs `:12`; `apps/web/app/performance/page.tsx:104-147` (gate-closed bootstrap state).
- **Fix:** Future-tense or design-tense until real: "every pick is snapshotted for closing-line grading" — the same honesty standard the rest of the site applies.

#### BA-S16 — 21+ posture asserted to robots (llms.txt) but absent for humans (footer/board/picks) `[J]` — **GARRETT**
- **Moment:** llms.txt declares "GSE is 21+ where applicable" but the only human-facing 21+ language lives on promotions/affiliate surfaces. No age statement in the global footer or on board/picks pages — the compliance posture is stronger in the machine-readable file than on the site itself.
- **Evidence:** `apps/web/public/llms.txt:13`; '21+' renders only at `apps/web/app/promotions/page.tsx:17,22,72`, `apps/web/lib/promotions/public-payload.ts:50`, `apps/web/lib/content-engine/build-draft.ts:34`; footer (`apps/web/components/ui/footer.tsx`) carries the helpline but no age line; `apps/web/app/terms/page.tsx:60-67` only says "legal age to wager in your jurisdiction."
- **Fix:** Add a one-line age/eligibility statement to the global footer ("21+/legal wagering age where applicable") so the human surface matches what llms.txt tells the answer engines. Compliance posture wording is Garrett's sign-off; the edit itself is trivial.

#### BA-S17 — Footer "Variance guide" links to an anchor that doesn't exist — on the responsible-gaming surface `[B][J]` — **CODEX**
- **Moment:** The footer's Responsible column links to /responsible-play#variance, but no element with id="variance" exists on that page — the one responsible-gaming deep link silently drops users at the top of the page. (Bettor rated POLISH, Journalist SHOULD; higher severity kept because it's the responsibility surface.)
- **Evidence:** `apps/web/components/ui/footer.tsx:24`; `apps/web/app/responsible-play/page.tsx` contains no id="variance" (the word appears only at line 51).
- **Fix:** Add an id="variance" section that actually explains variance (the 64%-still-loses-36 framing already written on /about), or relabel the footer link to "Responsible play."

---

### POLISH (12)

#### BA-P01 — Pricing FAQ dodges the free-trial question `[B]` — **DIRECTOR**
- **Moment:** Q: "Is there a free trial on Pro or Elite?" A: "Every paid plan ships with a 7-day refund window." The question is never answered — a refund window is not a trial, and dodging a yes/no money question is tout behavior in miniature.
- **Evidence:** `apps/web/app/pricing/page.tsx:121-123`.
- **Fix:** Answer straight: "No free trial. Instead, every paid plan has a 7-day refund window — if it's not for you in the first week, you get your money back."

#### BA-P02 — Changelog promises "every… update logged publicly" but is hardcoded, three weeks stale, and describes a removed feature `[B]` — **DIRECTOR**
- **Moment:** "Every model version, gate flip, and calibration update logged publicly" — but entries are hardcoded, the newest is 2026-05-21 (three weeks stale as of 2026-06-10), and one entry describes a homepage sample-signal card the current homepage no longer renders. A transparency feed that stops updating reads as a product that stopped.
- **Evidence:** `apps/web/app/changelog/page.tsx:16-17`, `:44-80` (hardcoded ENTRIES); AnnotatedSampleSignal defined but imported nowhere (`apps/web/components/home/annotated-sample-signal.tsx:43` self-reference only).
- **Fix:** Keep the log current (June entries: CLV scaffold, board surfaces, etc.) or soften the promise to "Major ships and gate flips, logged when they happen." Remove/update the entry describing the removed card.

#### BA-P03 — FAQ cites "the four readiness gates"; the readiness module defines six+ `[B]` — **DIRECTOR**
- **Moment:** A wrong count stated as architectural fact in the trust copy invites "what else is approximate?"
- **Evidence:** `apps/web/app/faq/page.tsx:74`; `packages/prediction-engine/src/readiness.ts:20-69` (canPersistCanonicalHistory, canUseDerivedHistory, canExposePublicPicks, canPromoteFeaturedPicks, canPublishContent, canExposePerformanceStats).
- **Fix:** Drop the number ("the readiness gates exist to…") or state the real count and name them — naming the gates is stronger trust copy than counting them.

#### BA-P04 — Permanent "Live Board" pulse chip in the nav, regardless of actual state `[B]` — **CODEX**
- **Moment:** The header renders a glowing "Live Board" chip with a pulse dot on every page unconditionally — including stub/demo mode and the degraded all-zeros state. Decorative liveness reflecting no live check is certainty theater in the chrome.
- **Evidence:** `apps/web/components/ui/nav.tsx:34-37` (static, no data dependency).
- **Fix:** Drive the chip from board state (live → "Live Board", sample → "Preview", degraded → hide), or make it a plain link to /board without the pulsing dot.

#### BA-P05 — "More than 10 deterministic factors" vs a methodology inventory of exactly ten `[B]` — **DIRECTOR**
- **Moment:** Off-by-one inflation on a countable claim, on the page that invites counting.
- **Evidence:** `apps/web/app/page.tsx:44,294`; `apps/web/app/methodology/page.tsx:15-26` (FACTORS — exactly 10 items).
- **Fix:** Say "ten deterministic factors" everywhere, or list the additional factors in the methodology inventory if more genuinely exist.

#### BA-P06 — /board and /picks are both titled "Today's Board" with different layouts and data sources `[B]` — **DIRECTOR**
- **Moment:** Nav's "Today's Board" goes to /board (gate-cam view) while /picks carries the page title and eyebrow "Today's Board" — two pages with the same name showing different numbers is exactly how record-shuffling services confuse subscribers.
- **Evidence:** `apps/web/components/ui/nav.tsx:8`; `apps/web/app/picks/page.tsx:13,185-186`; /board pulls gateDecision rows (`apps/web/lib/board/state.ts`) while /picks pulls /api/picks.
- **Fix:** Distinct names — keep /board as "Today's Board" (the gate cam), retitle /picks "Signal Feed" or "Published Picks," and cross-link so totals reconcile at a glance. (Pairs with BA-S11.)

#### BA-P07 — FAQ answers "Can I see the factor trail on every signal?" with an unconditional "Yes" `[P]` — **DIRECTOR**
- **Moment:** "Yes — that's the whole product… You read what the model read," with no mention that the factor trail is Pro-gated until a different answer 13 lines later.
- **Evidence:** `apps/web/app/faq/page.tsx:69-70` vs `:83`; gating at `packages/types/src/index.ts:95` (canSeeFactorBreakdown PRO+).
- **Fix:** Amend: "Yes, on Pro and Elite — every published signal exposes its full factor breakdown."

#### BA-P08 — One failed renewal charge instantly drops a paying customer to FREE mid-retry, with no warning surface `[P]` — **GARRETT**
- **Moment:** Entitlements honor only ACTIVE/TRIALING; the webhook maps past_due/unpaid → PAST_DUE, which immediately fails the check. No PAST_DUE grace, no "payment failed" banner, and (per BA-B03) no email infra to tell the customer why their padlocks came back.
- **Evidence:** `apps/web/lib/entitlements.ts:29-37` (`status: { in: ["ACTIVE", "TRIALING"] }`); `apps/web/app/api/webhooks/stripe/route.ts:105-114,198-208`; grep PAST_DUE in apps/web/lib and app pages: only the webhook.
- **Fix:** Treat PAST_DUE as entitled within currentPeriodEnd (Stripe's retry window) and show a "payment failed — update card" banner on dashboard linking to the billing portal. Billing-policy change → founder sign-off; implementation is small.

#### BA-P09 — No daily-return mechanic, and the /brief stub leaks scaffolding copy to paying customers `[P]` — **CODEX**
- **Moment:** No engineered reason to return daily: alerts unbuilt, no digest — and the reachable "Daily brief" page openly says "The daily brief composer is being rebuilt," which reads as scaffolding a paying customer was never meant to see.
- **Evidence:** `apps/web/app/brief/page.tsx:33-36`; no notification/email send code anywhere in apps/ or workers/ (grep); the only fresh-daily surface is manually visiting /picks.
- **Fix:** Short term: noindex or remove /brief from prod routing until the composer ships (CODEX). Medium term: a morning slate email for Pro+ is the cheapest daily-return mechanic and would make the alert promises partially true (founder-gated send — pairs with BA-B03).

#### BA-P10 — Trust-claims registry cites a different helpline number than every rendered surface `[J]` — **CODEX**
- **Moment:** The registry's approved responsible-gambling copy cites 1-800-522-4700 while every rendered surface uses 1-800-GAMBLER. Both reach NCPG, but the registry that claims to be the single source of truth disagrees with the site it governs.
- **Evidence:** `apps/web/lib/trust-claims.ts:252-261` vs `apps/web/lib/brand.ts:60-65` (HELPLINE "1-800-GAMBLER") and `apps/web/components/ui/risk-disclosure.tsx:21-24`.
- **Fix:** Update the risk.gamble-responsibly claim copy to 1-800-GAMBLER so the registry matches the rendered disclosure.

#### BA-P11 — First-person voice slip on the responsible-play page — banned by the site's own scanner elsewhere `[J]` — **CODEX**
- **Moment:** A page otherwise in brand third-person says "I list them as the standard starting points" — on the page where consistent, considered voice matters most; the compliance scanner's L1-FIRST-PERSON-ALGORITHM bans first-person framing elsewhere.
- **Evidence:** `apps/web/app/responsible-play/page.tsx:117-120`; cf. `apps/web/lib/compliance-scanner/rules.ts:79-85`.
- **Fix:** Change to "they're listed as the standard starting points" (or "we list them").

#### BA-P12 — Dormant brand pillar "Results — Consistent long-term edge" is a loaded gun `[J]` — **DIRECTOR**
- **Moment:** An exported pillar promises "Consistent long-term edge" (a performance claim with zero settled record behind it); its docstring claims it's "Used in About, Press, footer, marketing prose." It isn't imported anywhere today — but any future surface can render it without tripping the banned-phrase scanner.
- **Evidence:** `apps/web/lib/brand.ts:87-108` (BRAND_PILLARS); grep shows zero imports of BRAND_PILLARS outside brand.ts.
- **Fix:** Reword to a process claim ("Results — graded in public, win or lose") or gate it behind canExposePerformanceStats, and fix the stale docstring.

---

## 3. STATIC-PASS CAVEAT

**This pass read SOURCE, not the running app.** Every finding above is grounded in the rendered-copy and code paths as written at `C:/Users/Garrett/Sports` on 2026-06-10; the key blocker evidence was spot-verified against the files directly. What this pass **cannot** assess:

- **Visual quality and motion** — typography rhythm, spacing, animation feel, the actual look of the GateCam/Pass List/calibration surfaces in a browser.
- **Performance** — LCP/CLS/INP, bundle weight, cache behavior in practice (including whether BA-B05's shared-cache contamination manifests as described under real sessions).
- **Runtime behavior of gated/degraded branches** — which empty states actually render with the current DB contents, what the Stripe checkout → dashboard round-trip really feels like, whether middleware or headers alter any of the above.

The **visual/motion/performance pass needs the running app** and is queued behind **B-01** (the runtime audit currently in progress). Findings here that depend on runtime state (BA-B05, BA-S01, BA-S10) should be re-confirmed live before being marked closed.

---

## Counts

| Severity | Count |
|---|---|
| BLOCKER | 9 |
| SHOULD | 17 |
| POLISH | 12 |
| **Total (deduped from 3 personas, 49 raw findings)** | **38** |

Owners: CODEX 14 · DIRECTOR 17 · GARRETT 7
