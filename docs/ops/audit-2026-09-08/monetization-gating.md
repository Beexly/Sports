# Monetization and gating audit: does the paywall actually exist, end to end?

Read-only audit, 2026-09-08. Dimension: Stripe webhook to subscription row to entitlements
resolution to every gated surface, checked against the Subscription Tiers table in `CLAUDE.md`.

Scope note: nothing in this report proposes flipping a gate, weakening a guard, lowering a
threshold, or disabling a test. Every proposed fix tightens enforcement or corrects a claim.
Where a fix would change a test's stated intent, that is called out explicitly as a founder
product decision, not an agent decision.

---

## What I checked (with commands run)

Every path below was read in full or in the cited range. No production database was touched and
no credential was read.

**Entitlement spine**

- `cat apps/web/lib/entitlements.ts`
- `cat apps/web/lib/api-entitlement.ts`
- `cat apps/web/lib/pricing/tier-access.ts`
- `sed -n '1,215p' packages/types/src/index.ts` (the `Entitlements` interface and `getEntitlements`)
- `grep -rn "<flag>" --include=*.ts --include=*.tsx apps packages workers` for each of the 16
  entitlement flags, to find every enforcement site (and every flag with none)

**Billing path**

- `sed -n '1,811p' apps/web/app/api/webhooks/stripe/route.ts` (whole file, in four reads)
- `grep -n "model Subscription" -A 40 packages/db/prisma/schema.prisma`
- `head -120 apps/web/lib/billing/price-ids.ts`
- `grep -an "getOrCreateStripeCustomer" -A 70 apps/web/lib/stripe.ts`
- `grep -n "..." apps/web/lib/billing/reconcile-entitlements.ts`
- `sed -n '1,60p' apps/web/app/api/cron/reconcile-entitlements/route.ts`
- `grep -rn "subscription.update|subscription.upsert|subscription.create" --include=*.ts apps/web packages/db/src scripts`
  (to enumerate every writer of a tier)
- `grep -n "reconcile-entitlements|deliver-settlement-alerts|repair-checkout-attempts" apps/web/vercel.json vercel.json`
- `cat apps/web/app/api/subscriptions/checkout/route.ts` and `portal/route.ts` (grep of the gate lines)

**Picks surfaces**

- `sed -n '1,381p' apps/web/app/api/picks/route.ts` (whole file)
- `grep -n ... apps/web/app/picks/page.tsx` plus `sed -n '55,160p'`
- `sed -n '1,190p' apps/web/app/api/picks/daily-slate/route.ts`
- `sed -n '225,275p' apps/web/app/api/picks/[id]/audit/route.ts`
- `grep -n ... apps/web/app/api/picks/[id]/explain/route.ts`
- `cat apps/web/lib/picks/public-edge-score.ts`, `cat apps/web/lib/picks/teaser-text.ts`
- `cat apps/web/app/api/board/state/route.ts`; `sed -n '180,200p;440,470p;820,860p;990,1020p' apps/web/lib/board/state.ts`
- `sed -n '1,40p' apps/web/app/api/board/passes/route.ts`
- `sed -n '1,430p' apps/web/app/preview/[sport]/[slug]/page.tsx` (in four reads)
- `sed -n '95,130p' apps/web/app/sitemap.ts`
- `sed -n '1,80p' apps/web/app/room/[gameId]/page.tsx`
- `sed -n '30,90p' apps/web/lib/embed/edge-index.ts`
- `sed -n '1,114p' apps/web/app/api/v1/probabilities/route.ts`; grep of `v1/signals/route.ts`
- `sed -n '1,140p' apps/web/lib/b2b/api-key-auth.ts`
- `sed -n '1,169p' apps/web/app/api/proof/receipts/route.ts`; `sed -n '1,120p' apps/web/app/api/verify/route.ts`

**Fantasy surfaces (the specific question asked)**

- `for d in */; do ... grep -n "getViewerEntitlements|poolForViewer|canUseFantasy|auth()" ...; done`
  across all 16 `apps/web/app/fantasy/*/page.tsx`
- `cat apps/web/lib/fantasy/free-trial.ts`
- `sed -n '1,120p;230,280p' apps/web/lib/integrations/projections-server.ts`
- `grep -n "export function resolveToolPool" -A 25 apps/web/lib/integrations/projections.ts`
- `grep -n "projections" -B2 -A 12 apps/web/lib/integrations/providers.ts`
- `grep -rn "activePlayerPool" lib components --include=*.ts --include=*.tsx`
- `cat apps/web/app/fantasy/studio/page.tsx`
- `sed -n '1,80p' apps/web/__tests__/fantasy-pool-gating.test.ts`
- `grep -n "requireFantasyApi|requireFantasyApiRateLimited" --include=*.ts apps/web/app`

**Other paid surfaces**

- `sed -n '50,75p' apps/web/app/trends/page.tsx`; `sed -n '15,45p' apps/web/app/parlay-mri/page.tsx`;
  `sed -n '15,45p' apps/web/app/track/page.tsx`; grep of `app/track/platform/page.tsx`
- `cat apps/web/app/api/clv/route.ts`
- `sed -n '145,185p' apps/web/app/intelligence/engines/page.tsx`; `sed -n '55,80p' apps/web/app/observatory/page.tsx`
- `sed -n '1,80p' apps/web/lib/watchlist/eligibility.ts`, `alert-eligibility.ts`, `sed -n '120,200p' alert-dispatch.ts`,
  `sed -n '1,45p' settlement-hook.ts`
- `grep -rn "notifyWatchlistFollowersForGradedPick" --include=*.ts apps packages workers`
- `grep -n ... apps/web/lib/settlement-outbox/worker.ts`
- `sed -n '30,80p' apps/web/app/blog/[slug]/page.tsx`; `sed -n '1,80p' apps/web/app/api/blog/route.ts`
- `cat apps/web/lib/gse-stats/session-tier.ts`; `head -40 apps/web/app/api/gse/v1/values/[metricId]/route.ts`
- `sed -n '1,255p' apps/web/lib/pricing/feature-gates.ts`; grep of `app/pricing/page.tsx`
- `sed -n '1,45p' packages/data-ingestion/src/config.ts` (the seven sports)

**Coverage sweeps**

- `for f in $(find . -name route.ts); do grep -q "<any gate>" ... done` over `apps/web/app/api`,
  to list every route handler with no auth, entitlement, cron or B2B key check
- `for f in $(find intelligence nflverse projections scoring -name route.ts); do ... done`
  (result: 0 ungated of 20 intelligence plus 12 nflverse plus 2)
- `ls scripts/guardrails` and `grep -rln "entitle|paywall|premium" scripts/guardrails/*.mjs`
- `ls apps/web/__tests__ | grep -iE "entitle|gate|paywall|tier|fantasy|premium"`

I did not run `npm run test`, `npm run typecheck` or `npm run guardrails`. This is a read-only
audit and none of my conclusions depend on a test run.

---

## Findings

### 1. BLOCKER: the "full board" is already free on `/preview/[sport]/[slug]`, un-capped, including PREMIUM-tier picks

`apps/web/app/preview/[sport]/[slug]/page.tsx:93-108` fetches published picks with **no tier
filter**, and the file says so in its own comment: "NOTE: tier is NOT filtered here." Line 314
then renders `{pick.selection}` to every viewer, anonymous included. Line 339 renders
`pick.reasoningShort`. The only gated values on this page are the confidence number
(`:319`) and the line-movement delta (`:406`).

`apps/web/app/sitemap.ts:100-123` emits one `/preview/...` URL per SCHEDULED or LIVE game in a
window from 3 days back to 21 days forward, capped by `SITEMAP_PREVIEW_CAP`. So the full set of
per-game pick selections is enumerable from a public sitemap with no session at all.

Against the tier table this is a direct contradiction:

| Claim (`CLAUDE.md`, and `app/pricing/page.tsx:84`) | What `/preview` does |
|---|---|
| Free: "2 picks/day teaser" | one selection per game, unbounded across games |
| Pro: "Full board (all picks)" | every game's best published selection is already free |

The daily cap and the tier filter that `/api/picks` applies
(`apps/web/app/api/picks/route.ts:133` tier gate, `:210-214` `dailyPickLimit` slice) have no
counterpart here.

This is not an oversight that someone forgot. `apps/web/__tests__/preview-page-paywall.test.tsx`
asserts as an invariant that for anonymous, FREE and FANTASY viewers "the free-visible facts
(selection, line, opening spread, short reasoning teaser) still render", and the page comment at
`:31-37` explains the P7-10 decision to stop filtering premium rows. So the behaviour is
deliberate and test-locked.

**Why it matters:** the single largest advertised Pro benefit is bought and paid for by
subscribers while being served for free on an SEO surface the sitemap advertises. A Pro member
who notices has a refund argument, and the free tier's "2 picks a day" framing on
`app/picks/page.tsx:546-548` is not true of the site as a whole.

**Proposed fix (founder decision, because it trades SEO reach against the paywall):** decide
explicitly which of these two is the product, and make the code and the copy agree.
Option A, keep the paywall: restore a viewer-scoped gate on `/preview` so an un-entitled viewer
sees the matchup, the opening line and an honest "the model's read on this game is part of Pro"
panel rather than the selection, and reword `pricing/page.tsx:84` only if that is not done.
Option B, keep the SEO: drop "Full board (all picks)" from the Pro bullet and from the CLAUDE.md
table, and re-describe the free teaser as "2 fully-detailed picks a day" so the claim matches.
Either way the `preview-page-paywall` test's stated invariant has to be re-scoped, which is a
change of product intent and must be signed off, not made in passing.

**Risk of fix:** Option A removes indexable pick content from every preview page and will cost
organic traffic; it also needs care not to reintroduce the P7-10 false-absence bug (a premium-only
game rendering "Model pick not yet available"). Option B costs nothing technically but weakens the
paid pitch.

---

### 2. BLOCKER: `/preview` also bypasses every honesty gate that `/api/picks` enforces

Separate from the paywall, the same page consults **none** of the gates the picks API applies.
Verified by grep returning nothing for all of the following in
`apps/web/app/preview/[sport]/[slug]/page.tsx`: `getReadinessGates`, `canExposePublicPicks`,
`freshPickWhere`, `passesPublicSelectiveFilter`, `MIN_PUBLIC_PICK_DATA_QUALITY_SCORE`,
`isPublicPicksSurfaceStale`.

`apps/web/app/api/picks/route.ts` applies all six: the public-picks readiness gate (`:46-49`),
the stale-data kill switch (`:57-63`), the minimum data-quality score and the `mergedIntoGameId`
tombstone filter (`:93-106`), the fresh-pick window (`:132`), and the selective-publish filter
(`:174-201`).

Consequence, stated precisely: with `PUBLIC_PICKS_ENABLED` off, `/api/picks` returns 503 and the
board goes dark while `/preview/...` keeps rendering the model lean for every game. Same for the
stale-data kill switch. Picks that the selective filter refuses to publish, picks on a game row
below the data-quality floor, and picks on a game row that has been merged away all still render
there.

This is the same class of defect the daily-slate route already fixed and documented at
`apps/web/app/api/picks/daily-slate/route.ts:44-58`: "Two public pick endpoints must not disagree
about whether picks are public." `/preview` is the third public pick endpoint and it was never
brought into line.

**Why it matters:** these gates are the honesty boundary. A kill switch that does not reach every
public surface is not a kill switch. Given the C-247 score-integrity finding already on record,
a surface that publishes model leans while the operator believes the board is dark is a
meaningful liability.

**Proposed fix:** have `/preview` call the same readiness and freshness gates and the same
row filters as `/api/picks` before it renders a pick, degrading to the existing "Model pick not
yet available for this matchup" panel when they refuse. This is strictly a tightening.

**Risk of fix:** more preview pages will render without a pick, which reduces their SEO value;
and the selective-publish filter is an async call, so the page becomes slightly more expensive.

---

### 3. MAJOR: the confidence-scrub guard is missing on the two surfaces that render `reasoningShort` outside `/api/picks`

`apps/web/lib/picks/teaser-text.ts` exists specifically because the signal slate used to write
"... @ 68% ..." into `reasoningShort`, handing a FREE viewer the gated confidence number in prose
while `confidence` itself was null. Its header says it is "the read-side guard for rows written
before that fix and for any future writer".

`grep -rn "teaserForViewer"` finds exactly two call sites, both in
`apps/web/app/api/picks/route.ts:328-329`. The other two renderers of the same column apply no
scrub:

- `apps/web/app/preview/[sport]/[slug]/page.tsx:339` renders `pick.reasoningShort` raw to
  anonymous viewers
- `apps/web/app/dashboard/page.tsx:675` renders `pick.reasoningShort` raw inside `PickRow`, which
  is rendered for FREE viewers (`:554` passes `showConfidence={entitlements.canSeeConfidence}`,
  so the number is gated but the prose is not)

**Why it matters:** the gate on `confidence` is only as strong as the weakest surface that
renders text derived from it. A single legacy row, or one future writer that reintroduces a
percentage, leaks the paid number on a public SEO page.

**Proposed fix:** apply `teaserForViewer(pick.reasoningShort, viewer.canSeeConfidence)` at both
render sites. Two-line change, no behaviour change for entitled viewers.

**Risk of fix:** none identified; the function is pure and already covers the entitled case
verbatim.

---

### 4. MAJOR: `/fantasy/studio` resolves the live paid pool with no entitlement check, and the invariant test cannot see it

`apps/web/app/fantasy/studio/page.tsx:47` calls `await resolveToolPoolAsync()` and then calls
`generateWeeklyBrief()` and `buildBroadcast()`. The page's own comment at `:37-45` states that
those helpers "read `activePlayerPool()` transitively (through `buildLeagueTwin`, `waiverTargets`
and `applyScheme`)" and that awaiting the resolver first "is what makes those defaults resolve
live". There is no `getViewerEntitlements()` and no `poolForViewer()` on this page.

Confirmed transitive defaults: `apps/web/lib/fantasy/waivers.ts:41,65`,
`apps/web/lib/fantasy/league-twin.ts:66`, `apps/web/lib/fantasy/scheme.ts:93` all default their
pool parameter to `activePlayerPool()`.

The regression test that exists for exactly this leak,
`apps/web/__tests__/fantasy-pool-gating.test.ts:18-24`, enumerates a hand-maintained list of five
pages (`lineup`, `waivers`, `trade`, `draft`, `optimizer`). It omits `bestball` (which does gate)
and `studio` (which does not). Its own docstring says the leak "would activate the moment
PROJECTIONS_PROVIDER went live".

**Why it matters:** this is the precise hole `poolForViewer` was written to close, reopened on a
page added later, on a surface with no test coverage.

**Proposed fix:** two parts. (a) Gate `/fantasy/studio` the same way its five siblings are gated,
which for a page whose helpers read a process-global registry means threading the gated pool
through `generateWeeklyBrief` and `buildBroadcast` explicitly, or refusing the live pool on the
page until that threading exists. (b) Change the test from a hand-maintained list to a discovery
sweep: every `apps/web/app/**/page.tsx` that contains `resolveToolPoolAsync` must also contain
`getViewerEntitlements` and `poolForViewer`. That is a strengthening of the guard, not a
weakening.

**Risk of fix:** (a) is a signature change across the fantasy library, which the page's own
comment flags as a refactor rather than a correction. (b) may fail immediately on `studio`, which
is the point; it should be landed together with (a) or as a recorded ledger row.

---

### 5. MAJOR: the FANTASY tier's advertised value is a depth trim that is inert on the current configuration, and 11 of 16 fantasy pages have no entitlement check at all

This is the direct answer to "is the FANTASY tier gate enforced on the SSR fantasy pages or only
on JSON routes?"

**JSON routes: a hard 403.** `apps/web/app/api/tools/lineup/route.ts:13` and
`apps/web/app/api/dfs/salaries/route.ts:14` call `requireFantasyApiRateLimited` /
`requireFantasyApi`, which return a ready-made 401/403 (`apps/web/lib/api-entitlement.ts:193-198`).

**SSR pages: no access gate, only a depth trim, and only on 5 of 16.** Of the sixteen
`apps/web/app/fantasy/*/page.tsx`, exactly five (`bestball`, `draft`, `lineup`, `trade`,
`waivers`) call `getViewerEntitlements` plus `poolForViewer`; `/optimizer`, which lives outside
`/fantasy`, is the sixth. The other eleven (`academy`, `autopilot`, `baseline`, `connect`,
`contests`, `dfs`, `gm-ledger`, `league-twin`, `props`, `scheme`, `studio`) resolve no
entitlement. None of the six that do gate ever denies access; `poolForViewer`
(`apps/web/lib/fantasy/free-trial.ts:44-53`) returns the top 12 players per position instead of
the whole pool, which is a depth trim by design ("not a hard gate", per its own comment).

**And the trim is currently a no-op.** `poolForViewer` line 51: `if (!pool || canUseFantasyFull)
return pool;`. `resolveToolPool` (`apps/web/lib/integrations/projections.ts:135-136`) returns
`undefined` unless `isLiveProjections(env)`, which requires the `PROJECTIONS_PROVIDER` env var
(`apps/web/lib/integrations/providers.ts:29`, whose own note reads: "Until set, all fantasy tools
use the illustrative pool"). With that variable unset, a paying FANTASY subscriber and a
logged-out visitor receive byte-identical illustrative pools on every fantasy page.

The advertised claim is `app/pricing/page.tsx:142`: "The fantasy suite: the Draft Assistant and
Best Ball board on real, cleared data."

**Why it matters:** if `PROJECTIONS_PROVIDER` is unset in production, the FANTASY tier at
$4.99/mo delivers nothing a logged-out visitor does not already have, and the description
promises "real, cleared data" that the code cannot supply. I could not read the production
environment (see "What I could not check"), so I state the conditional, not the verdict.

**Proposed fix:** two independent items. (a) Establish and record whether `PROJECTIONS_PROVIDER`
is set in production. If it is not, the honest move is to say so on the Fantasy card, in the same
register the fantasy pages already use ("Illustrative player universe"), rather than promising
"real, cleared data"; the pages themselves already carry that disclosure, so the pricing card is
the one surface out of step. (b) If the fantasy suite is meant to be a paid product, the five
gated pages need a decision recorded on whether a 12-deep board is the intended free trial (it is
a defensible product choice, but it is not what "unlocks the fantasy suite" says).

**Risk of fix:** (a) is copy only. (b) is a product decision that could reduce free-tier
engagement, which the `free-trial.ts` comment says was deliberately protected
("the tools were free, so a takeaway is off the table").

---

### 6. MAJOR: the paid blog gate keys on `tier !== "FREE"`, so FANTASY receives it, and it rests on a comment that is now false

`apps/web/app/blog/[slug]/page.tsx:57` and `apps/web/app/api/blog/route.ts:71` both gate the full
article body on `entitlements.tier !== "FREE"`. Both carry the same justification comment: keyed
this way "not `canSeePremiumPicks`, which is now true for all tiers since picks are free
(ENTITLEMENT_REMAP_SPEC.md)".

That premise is stale. `packages/types/src/index.ts:186` now reads `canSeePremiumPicks: isPro`,
under a comment at `:177-185` that says "Thread 1 REVERSED ... the picks are the paid product
again". So the reason the code gives for not using `canSeePremiumPicks` no longer holds, and the
`tier !== "FREE"` key is exactly the anti-pattern `.claude/rules/api-gating.md` rule 5 warns
about: "keying on `tier !== "FREE"` has previously leaked paid analytics to the FANTASY tier by
accident." `apps/web/lib/api-entitlement.ts:33-37` records the same lesson.

Effect: a FANTASY subscriber, whom `CLAUDE.md` describes as seeing "the same free teaser, not the
full board" on the betting side, receives the full paid blog body.

Second problem with the same code: the blog paywall is advertised nowhere. `grep -in "blog"` over
`app/pricing/page.tsx` and `lib/pricing/feature-gates.ts` returns nothing. So there is a live
paywall on a surface no plan promises, which means neither a FREE reader nor a paying member can
tell from the pricing page what they are buying.

**Proposed fix:** decide which entitlement the blog belongs to and key on that flag by name
(`canSeeFactorBreakdown` / `canSeePremiumPicks` for a Pro-line benefit, or a new explicit flag),
then add the corresponding row to `FEATURE_GATES` and the pricing comparison so the enforcement
and the promise match. Delete the stale ENTITLEMENT_REMAP justification comment in both files
while doing it.

**Risk of fix:** if the blog is meant to be a FANTASY benefit too, keying on a Pro flag removes
access from existing FANTASY subscribers; that is a customer-visible change and needs the founder
to pick the intended tier first.

---

### 7. MAJOR: an unhandled unique-constraint collision in `syncSubscription` can strand a paying member on FREE forever

`packages/db/prisma/schema.prisma:94-95` makes both `userId` and `stripeCustomerId` unique on
`Subscription`. There is at most one row per user and one per Stripe customer.

`apps/web/app/api/webhooks/stripe/route.ts:754-762` upserts **keyed on `stripeCustomerId`** with
`create: { userId, stripeCustomerId, ...updateData }`. If the user already has a row carrying a
*different* `stripeCustomerId` (a customer recreated in Stripe, a Dashboard-created subscription
against a second customer object for the same person, a restored test-to-live migration), the
`where` misses, the create fires, and Postgres rejects it on the `userId` unique index. The error
propagates out of `handleStripeEvent`, the route returns 500 (`:82-88`), the event is never
recorded, and Stripe retries the same failing event on its backoff schedule until it gives up.
The member is charged and never entitled.

`apps/web/lib/billing/reconcile-entitlements.ts:259-266` has the same shape, so the hourly
self-healing backstop fails the same way rather than repairing it.

Related but distinct, in the same function: `:766-773` is the no-metadata fallback. When
`stripeSubscription.metadata.userId` is absent and no row matches the customer id, it
`console.warn`s, returns normally, the route answers 200, and the event is recorded as processed.
Stripe will not redeliver. The entitlement is lost silently. `reconcile-entitlements.ts:326-333`
covers part of this (it can fall back to an existing DB row) but skips the same case for the same
reason, honestly logged as "no metadata userId and no existing DB row; skipping grant."

**Why it matters:** these are the two failure modes that produce "charged, no access", which is
the worst customer outcome the billing path can produce and the one that generates chargebacks.

**Proposed fix:** in `syncSubscription`, resolve the row by `userId` when the `stripeCustomerId`
lookup misses and the incoming subscription carries a metadata `userId`, then update that row's
`stripeCustomerId` in place instead of attempting a create that cannot succeed. Alternatively,
catch P2002 on `userId` specifically and fall through to an update keyed on `userId`, with a loud
operator log naming both customer ids. The same treatment applies to `upsertGrant`. For the
no-metadata case, the honest minimum is to make the reconcile cron's skip visible in the ops
surface rather than only in logs, so an operator can spot a stranded customer.

**Risk of fix:** any code that rebinds a subscription row from one Stripe customer to another is
on the money path and can, if wrong, hand one person's entitlement to another. It needs the same
adversarial review the existing out-of-order, superseded-subscription and no-downgrade guards in
this file got, and tests for the collision case specifically.

---

### 8. MAJOR: Elite's "real-time email and push alerts" is not what ships

`CLAUDE.md` sells Elite as "All Pro + real-time email & push alerts + CLV/line-value ledger".
What is implemented:

- `apps/web/lib/watchlist/alert-eligibility.ts:38-40` (`isGradedEvent`) makes an alert eligible
  only when the pick has left PENDING **and** carries a `settledAt` stamp. The module docstring
  is explicit: "a watchlist alert may fire for a GRADED (settled) pick only ... that would be
  exactly the 'hot tip' behavior this platform explicitly refuses to ship."
- `apps/web/lib/watchlist/alert-dispatch.ts:95` gates the whole path behind
  `WATCHLIST_ALERTS_ENABLED === "true"`, default off, founder-controlled.

So the only alert that exists fires *after* a game settles, telling the member how a pick they
follow finished. The pricing page states this correctly at `app/pricing/page.tsx:97`: "Email +
push alerts when a pick you follow settles." `CLAUDE.md`'s tier table does not.

I am not proposing the flag be flipped; that is a founder gate and law 3 forbids it.

**Proposed fix:** correct the `CLAUDE.md` tier table to match the pricing page and the code, for
example "settled-pick email and push alerts". One line, and it removes a claim the product cannot
currently support.

**Risk of fix:** none technically; it narrows a marketing claim.

---

### 9. MINOR: `apps/web/lib/watchlist/settlement-hook.ts` is dead code whose docstring asserts a wiring that does not exist

`grep -rn "notifyWatchlistFollowersForGradedPick" --include=*.ts apps packages workers` returns
exactly two hits, both inside `settlement-hook.ts` itself (`:10` in prose, `:139` the definition).
It has no callers.

Its docstring at `:10-13` states it "is invoked by the settlement OUTBOX WORKER
(apps/web/lib/settlement-outbox/worker.ts, driven by the deliver-settlement-alerts cron)". The
worker does exist and does perform the fan-out, but it does so with its own inline entitlement
resolution (`apps/web/lib/settlement-outbox/worker.ts:294`, `:313`, `:951`) and never imports
this module.

So the Elite alert benefit **is** wired, through the worker, and this finding is not a broken
feature. The problem is a second, unreferenced copy of the eligibility fan-out whose comment
tells the next reader it is the live path. That is precisely how a future change gets made in the
wrong file.

**Proposed fix:** either delete the module, or (if it is intended as the shared implementation)
have the worker call it so there is one fan-out. Until then, correct the docstring so it does not
claim a call site it does not have.

**Risk of fix:** deleting it removes its tests; making the worker use it is a refactor of a
durable-outbox code path and deserves its own review.

---

### 10. MINOR: four entitlement flags are declared, tested for existence, and read by nothing

`grep -rn` across `apps`, `packages` and `workers` for each flag finds hits only in
`packages/types/src/index.ts` and in `packages/types/src/__tests__/entitlements.test.ts`:

| Flag | Declared | Enforcement sites |
|---|---|---|
| `canSeeMultiprob` | `packages/types/src/index.ts:167`, set at `:206` | none |
| `canSeeGlassLedger` | `:169`, set at `:208` | none |
| `canSeeRecompute` | `:170`, set at `:209` | none |
| `canUseFantasyDraftSuite` | `:153`, set at `:200` | none |

These sit under a long comment at `:155-166` describing them as the deliberate free/paid split on
the honesty surfaces, "the differentiator". `apps/web/app/glass-ledger/page.tsx` exists and
resolves no entitlement at all (grep for `entitle`, `auth()`, `getViewerEntitlements` returns
nothing in that file).

Related, self-documented: `apps/web/app/api/board/passes/route.ts:29-36` records that
`includeNoBetDetail` is always false on that route, so the paid No-Bet forensic detail is never
served through the JSON sibling of `/board`. The comment is candid that this "FAILS CLOSED, it is
a dead paid feature, not a leak" and points at ledger row C-181.

**Why it matters:** these are enforcement without benefit. A flag that nothing reads is either a
paid feature nobody can buy the effect of, or an unfinished design that reads as shipped.

**Proposed fix:** for each of the four, decide: wire it to the surface it names, or delete it from
the interface and the accompanying comment. Leaving a documented paid split that no code consults
is the option that misleads.

**Risk of fix:** wiring `canSeeGlassLedger` to `/glass-ledger` would remove a currently-public
transparency surface from free viewers, which cuts against the stated positioning; that is a
founder call, not a mechanical fix.

---

### 11. MINOR: a `free`-scoped B2B key reads the whole FREE board with a confidence-derived probability and no daily cap

`apps/web/app/api/v1/probabilities/route.ts:51` applies `tier: "FREE"` for a non-premium key,
which is a real gate and a documented fix. But the same route then returns
`pModel = confidence / 100` for those rows (`:86-92`), takes 80 of them (`:53`), and applies no
`dailyPickLimit` equivalent. `/api/v1/signals/route.ts:63,70,113` has the same shape with
`modelConfidence`.

Keys are operator-issued from `GSE_B2B_API_KEYS` (`apps/web/lib/b2b/api-key-auth.ts:66-77`), so
this is not a public bypass and not self-serve. It is a scope mismatch: a bare B2B key sees a
number (`canSeeConfidence`) and a volume (`dailyPickLimit`) that no consumer FREE account can
reach.

**Proposed fix:** state the intended contract in one place. If a bare key is meant to be a
FREE-consumer-equivalent, it should carry the same daily cap and withhold the confidence-derived
`pModel`; if it is meant to be a partner-grade free tier, that difference should be written down
in the route docstring so nobody later "fixes" it in the wrong direction.

**Risk of fix:** tightening breaks any partner already consuming `pModel` on a bare key.

---

### 12. MINOR: `/board` shows a FREE viewer up to 12 published-pick rows, which is more than the advertised 2

`apps/web/lib/board/state.ts:832-834` slices `publishedToday` to 12 for every viewer. Line 841
redacts `market` to the literal `"ALL_MARKETS"` for non-premium viewers, `:847` withholds the
Edge Index on book-less rows via `publicEdgeScore`, `:850` nulls `rankingP`, and
`:1009-1010` strips `confidence`. So the *selection* is genuinely withheld. What a FREE viewer
does receive is the matchup, sport, pick id and Edge Index for up to 12 rows.

The loader comment at `:186-193` explains this is intentional: counts must be tier-invariant.
That is a good reason. I record it because "you see 2 picks a day" and "you can see that we
published 12 today, on these games" are different statements, and the second is the one the
product actually makes.

**Proposed fix:** none required to the code. Worth one sentence in the free-tier copy so the
`/picks` banner ("up to 2 picks with the public Edge Index") and the `/board` rows do not read as
contradicting each other.

**Risk of fix:** none.

---

### 13. MINOR: the anonymous entitlement fallback is hand-rolled in two blog files with a wrong `dailyPickLimit`

`apps/web/app/blog/[slug]/page.tsx:47` and `apps/web/app/api/blog/route.ts:38-45` construct an
inline object literal for the anonymous case with `dailyPickLimit: 1`. The canonical FREE value is
`2` (`packages/types/src/index.ts:194`, `dailyPickLimit: isPro ? null : 2`).

Neither file reads `dailyPickLimit`, so there is no live impact today. It is the exact drift
`apps/web/app/api/picks/route.ts:66-71` warns against by name: "A hand-rolled fallback here is
exactly how the two FREE definitions drifted apart (anon limited vs signed-in over-granted); never
re-inline it."

**Proposed fix:** replace both literals with `getEntitlements("FREE")`.

**Risk of fix:** none; it is the same values plus the fields the literal omits.

---

### 14. MINOR: no CI guardrail enforces CLAUDE.md rule 3; the paywall rests entirely on unit tests

`ls scripts/guardrails` shows 26 guard scripts plus the bash hook.
`grep -rln "entitle|paywall|premium" scripts/guardrails/*.mjs` matches only
`agent-bash-guard.mjs` and `dependency-audit.mjs`, neither of which checks gating.

There are many good tests (`api-entitlement.test.ts`, `entitlements-enforcement.test.ts`,
`audit-route-paywall.test.ts`, `game-room-paywall.test.ts`, `preview-page-paywall.test.tsx`,
`fantasy-pool-gating.test.ts`, `board-state-confidence-gate.test.ts`, `get-slate-twin-paywall.test.ts`,
`track-platform-gate.test.tsx` and others), but they are per-surface and enumerate their targets by
hand. Finding 4 is what that costs: a new page that resolves the paid pool was added and no
existing test could notice.

**Proposed fix:** add a structural guardrail that discovers rather than enumerates. Two cheap,
high-value invariants: (a) every `apps/web/app/**/page.tsx` containing `resolveToolPoolAsync` must
also contain `getViewerEntitlements` and `poolForViewer`; (b) every route under
`apps/web/app/api/intelligence/**` and `apps/web/app/api/nflverse/**` must contain one of the
gate helper names. Both are additive guards and consistent with law 9.

**Risk of fix:** guardrails live under `scripts/guardrails/**`, which AGENTS.md law 2 freezes for
agents, so this has to be founder-applied.

---

### 15. MINOR: "all 7 sports" is sold as a Pro unlock but no per-sport entitlement exists

`app/pricing/page.tsx:84` and `:101` sell "The full board unlocked: every signal, every day, all 7
sports". `packages/data-ingestion/src/config.ts:2-38` does define exactly seven
(`SUPPORTED_SPORTS`: NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS), so the number is accurate.

But there is no sport dimension anywhere in `Entitlements`, and `/api/picks` applies the sport
filter from the query string to every viewer identically
(`apps/web/app/api/picks/route.ts:103-110`). A FREE viewer's two teaser picks can come from any of
the seven. The bullet is a restatement of "full board", not a separate gate.

**Proposed fix:** none needed if the bullet is understood as coverage. If it is meant to read as
an unlock, say "the full board across all 7 sports" so it does not imply a per-sport restriction
that does not exist.

**Risk of fix:** copy only.

---

## What I checked and found CORRECT

These held up under direct reading; I am recording them so the report is not read as a blanket
condemnation.

**Entitlement resolution**

- `getUserEntitlements` (`apps/web/lib/entitlements.ts:59-98`) reads only ACTIVE, TRIALING, or
  PAST_DUE-within-grace rows, with the grace window anchored to `pastDueSince` (`:71`, `:81`) so a
  retry cannot slide it. Unreachable-database errors return FREE and are logged (`:86-93`); every
  other error rethrows rather than silently resolving a tier.
- The dev-admin escalation is hard-gated to non-production at the call site (`:63-69`) *and*
  refuses to load the module in a production process that sets `DEV_FAKE_ADMIN=true`
  (`:32-43`). Defence in depth, correctly done.
- `gateApi`'s `evaluateGate` (`apps/web/lib/api-entitlement.ts:66-115`) runs `auth()` once, fails
  closed to FREE on any entitlement error with an audible log, returns 401 unauthenticated and 403
  under-tier, and the rate limiter runs strictly *after* the entitlement check so a 429 can never
  mask the paywall (`:147-152`, `:206-211`).
- `isPremium` is PRO-or-ELITE by name (`:37`) rather than `tier !== "FREE"`, with the FANTASY leak
  recorded in the comment above it.

**Picks paywall on `/api/picks`** (`apps/web/app/api/picks/route.ts`)

- Tier filter in the query for non-premium viewers (`:133`), grade filter only for premium (`:135`).
- The daily cap is applied *after* the selective filter and re-ranking (`:210-214`), with a bounded
  over-fetch (`:166`) so a FREE viewer reliably gets their full allowance instead of 0 or 1.
- `confidence` nulled by entitlement for every viewer including on FREE-tier rows (`:245`),
  `factorBreakdown` parsed only past the gate (`:226-229`), `lineMovement` gated (`:292-306`),
  `marketImplied` gated (`:270-276`), reasoning downgraded to a scrubbed teaser (`:327-329`).
- `publicEdgeScore` (`apps/web/lib/picks/public-edge-score.ts:14-21`) closes the derivation leak:
  on a book-less signal-slate row `edgeScore === confidence - 50` exactly, so it withholds the
  Edge Index from viewers who cannot see confidence. This is a genuinely subtle catch, correctly
  handled.
- Anonymous viewers resolve through the same `getEntitlements("FREE")` as signed-in ones
  (`:69-72`), with a comment explaining why a hand-rolled fallback is forbidden.

**Board**

- `loadBoardState` redacts inside the loader (`apps/web/lib/board/state.ts:1013-1017`) so no caller
  can forget; `market` becomes `ALL_MARKETS` (`:841`), `rankingP` is nulled (`:850`), confidence is
  stripped (`:247-259`).
- `app/page.tsx:42` and `app/house/page.tsx:141` call it with no entitlements at all, which
  resolves to the most restrictive view. Fail-closed by construction.
- `/api/board/state` uses `jsonNoStore` with an explicit comment (`:38-47`) about a URL-keyed shared
  cache serving a PRO viewer's confidence to an anonymous one. That is the right threat model.

**Other paid surfaces**

- Trend Lab (`app/trends/page.tsx:56`), Parlay MRI (`app/parlay-mri/page.tsx:23`), CLV ledger
  (`app/track/page.tsx:22`, `app/track/platform/page.tsx:37`) all resolve entitlements server-side
  and return a tier panel *before* loading the gated data.
- `lib/clv/user-clv-ledger.ts:72-74` and `:110-112` re-check `canUseClvLedger` inside the loader,
  not only at the page, and return `{ locked: true, rows: [] }`.
- The game room (`app/room/[gameId]/page.tsx:26-30`) passes entitlements into the loader so the
  paid factor trail and line movement are never built for un-entitled callers.
- `/api/picks/[id]/audit` builds the premium forensic objects only inside the entitled branch
  (`:230-263`), so nothing premium is in scope on the FREE path.
- `/api/picks/[id]/explain` requires `canSeeFactorBreakdown` before any work (`:71-77`).
- All 20 `/api/intelligence/*`, all 12 `/api/nflverse/*`, `/api/projections` and
  `/api/scoring/player-index` call a gate helper. My sweep found zero ungated routes in those trees.
- The embed surface hardcodes un-entitled loading (`lib/embed/edge-index.ts:56-58`).
- `/api/proof/receipts` filters to settled **and** kicked-off picks (`:80-86`) so a committed
  pre-kickoff field cannot be free-ridden; `/api/verify` seals unopened receipts (`:112-118`).
- `resolveStatsBillingTier` (`lib/gse-stats/session-tier.ts`) makes the session authoritative and
  refuses `?tier=` elevation outside non-production, reporting `spoofBlocked`.
- `/api/picks/daily-slate` returns counts only, `topEdgePick: null`, `recentRecord: null` with a
  comment forbidding a placeholder record, and it now enforces the same public-picks gate as
  `/api/picks` (`:44-58`).

**Billing**

- Signature verification precedes everything, with a distinct 503 for a missing
  `STRIPE_SECRET_KEY` so a config fault is not misreported as a bad signature
  (`webhooks/stripe/route.ts:22-52`).
- A durable write store is a hard precondition, returning 503 so Stripe retries rather than acking
  a write that persisted nothing (`:54-73`).
- Event idempotency via `webhookEvent`, with the concurrent-duplicate P2002 treated as benign
  (`:75-121`).
- `customer.subscription.created/updated` re-retrieve by id rather than trusting the embedded
  snapshot, precisely because Stripe does not guarantee ordering (`:170-183`).
- The out-of-order resurrection guard (`:614-627`), the superseded-subscription guard
  (`:629-668`), and the grandfathering no-downgrade guard (`:676-692`) are all present, all
  explained, and the read they depend on deliberately rethrows rather than silently returning null
  (`:592-611`) with a comment enumerating the four guards a swallowed error would disable.
- `invoice.payment_failed` stamps `pastDueSince` and sets PAST_DUE atomically, excluding CANCELED
  and INCOMPLETE with a clear rationale for each (`:243-276`).
- Refund-driven revocation is default-off log-only, makes zero Stripe API calls when disabled,
  never revokes on a partial refund, never guesses a subscription, and refuses to revoke while the
  subscription is still live in Stripe (`:280-477`).
- `revokeSubscriptionAccess` is the single canonical downgrade path (`:302-325`).
- Price-id resolution supports comma-separated historical ids so grandfathered members are not
  downgraded on renewal (`lib/billing/price-ids.ts:1-19`), and the advertised amount, currency and
  recurring interval are all verified against Stripe (`:74-125`).
- `mapStripeStatus` fails closed to INCOMPLETE on an unknown future Stripe status (`:794-808`).
- Only three code paths write a tier: the webhook, the reconcile job, and
  `getOrCreateStripeCustomer` (which writes FREE). I found no promo, admin, contest, affiliate or
  waitlist path that mints a paid tier.
- The hourly reconcile cron is authenticated with `cronAuthError`, never grants without positive
  Stripe confirmation, and only downgrades on confirmation.
- All three billing and alert crons are actually scheduled in both `vercel.json` files.

**Elite alerts**

- The delivery path exists and is gated: `settlement-outbox/worker.ts:951` requires
  `alertsEnabled && entitlements.canGetAlerts`, and an entitlements lookup failure *defers* the
  delivery rather than marking it SUPPRESSED (`:290-294`, `:1007-1013`), which is the correct
  fail-safe direction for a paid feature.

---

## What I could not check and why

- **Production environment variables.** `PROJECTIONS_PROVIDER`, `WATCHLIST_ALERTS_ENABLED`,
  `PUBLIC_PICKS_ENABLED`, `GSE_B2B_API_KEYS`, `STRIPE_*_PRICE_ID` and `REFUND_REVOKES_ACCESS` all
  change what these findings mean in practice. `.env*` files are Read-denied for agent sessions
  (CLAUDE.md), and AGENTS.md law 3 forbids searching for credentials. So findings 5, 8 and 11 are
  stated as conditionals on the configuration, not as verdicts. **NOT VERIFIED: whether
  `PROJECTIONS_PROVIDER` is set in production.** **NOT VERIFIED: whether
  `WATCHLIST_ALERTS_ENABLED` is set in production.**
- **Whether any real subscription rows exist, and in what states.** That needs a database read.
  I made no claim about how many members are on any tier, or whether the collision in finding 7
  has actually occurred. **NOT VERIFIED: whether any user currently has a mismatched
  `userId`/`stripeCustomerId` pair.**
- **Live HTTP behaviour.** I did not fetch `/preview/...`, `/api/picks`, or any production URL, so
  every statement above is a reading of the code, not an observation of a response. The `/preview`
  findings in particular are derived from the query at `page.tsx:93-108`, the render at `:314` and
  `:339`, and the test's own stated invariants; I did not see a rendered page.
- **Test and guardrail results.** I did not run `npm run test`, `npm run typecheck`,
  `npm run lint` or `npm run guardrails`. **NOT RUN.** No finding depends on their output; where I
  cite a test I cite its source text, not a pass or fail.
- **The Stripe account configuration.** Whether the live Price objects carry the `lookup_key`
  values `price-ids.ts` expects, and whether historical price ids are actually listed in the
  comma-separated env vars, can only be seen in the Stripe Dashboard.
- **Client bundle contents.** I read the server components and the props they pass, which is where
  rule 3 is decided, but I did not build the app and inspect the serialized RSC payload to confirm
  that no gated value crosses the boundary by another route.
- **`packages/stats-api` value provider depth.** `/api/gse/v1/values/[metricId]` uses
  `demoValueProvider`; I confirmed the tier is resolved anti-spoof but did not trace what that
  provider returns per tier.
- **The `/fantasy` age gate and contest surfaces.** Out of scope for this dimension; I noted only
  that `/fantasy/contests` and `/fantasy/connect` resolve no entitlement, without judging whether
  they should.
