# The Odds API affiliate widget — integration design

Design doc only. No app code changed in this pass. Read-only research against
the repo as of 2026-08-19. All paths absolute under `/home/user/Sports` unless
noted.

---

## Executive summary

`THE_ODDS_WIDGET_KEY` is a **new, second secret** from The Odds API — not the
same thing as `THE_ODDS_API_KEY` (the raw odds feed that already backs the
prediction engine). The widget is a vendor-hosted, vendor-branded embed:
a `<script>` tag plus a config `<div>`/data-attributes that render one
bookmaker's odds with the site's own affiliate link baked in, click-through to
the bookmaker. It is a **revenue placement**, not a data source, and it must
be modeled through the existing `apps/web/lib/revenue/` partner/offer system
— the same system that already gates sportsbook-category affiliate content —
rather than wired directly into any page. Three things make this launchable
safely: (1) `RevenueSurface` needs one new enum value for "a live on-site odds
placement," because none of the eight existing surfaces describe an embed on
a picks/board page and the sealed guards enumerate every valid surface
explicitly; (2) the widget must be treated as `category: "sportsbook"` (not
`sports_data`) because it terminates in a bookmaker click-through with money
downstream, which is exactly what `HIGH_RISK_PARTNER_CATEGORIES` exists to
catch — that classification alone pulls in the full high-risk compliance
bundle (terms URL, responsible-gaming text, 21+ age policy, state
eligibility/restriction lists) that `partner-offer-compliance-scan.mjs`
enforces; and (3) the widget's DOM must sit in a visually and structurally
distinct container, never inside or adjacent-without-separation to a
`PickCard`, so a bookmaker's price is never mistaken for this platform's own
confidence score or pick grade — the same non-negotiable the affiliate
structural-separation guard machine-checks at the import-graph level. Several
vendor-mechanics questions (exact script host/domain, whether the key is a
server-rendered config value or a pure client-side data attribute, what CSP
origins it needs) cannot be verified from this sandboxed, read-only pass and
are flagged below as **needs a live check against real widget docs before
implementation** — nothing about vendor behavior in this doc should be taken
as confirmed.

---

## 1. Where the widget should live, and the `RevenueSurface` question

### Candidate placements

| Candidate | Verdict | Why |
|---|---|---|
| **Picks page footer** (`apps/web/app/picks/page.tsx`, below the pick grid, above `<Footer />`) | **Recommended** | Highest-intent traffic (someone already reading picks) without being inside/beside a `PickCard`. A footer-region placement is the easiest to keep structurally isolated: it can sit in its own `<section>` after the picks grid and CTA blocks, with its own heading, border, and disclosure — never inside the `grid grid-cols-1 gap-5 sm:grid-cols-2` pick grid at `apps/web/app/picks/page.tsx:525`. |
| **Dedicated `/odds` page** | Good complementary option, not a replacement | Cleanly separates "our predictions" (`/picks`) from "bookmaker odds" (`/odds`) at the URL/route level — the strongest possible structural separation, since it isn't even the same page. Lower intent/traffic than the picks page footer, so treat as additive, not the sole placement. |
| **Dashboard sidebar** | Not recommended for v1 | The dashboard is where authenticated Pro/Elite users manage their subscription and see confidence-scored content most densely; a bookmaker widget in a persistent sidebar sits closest to confidence UI on every view, which is the placement most likely to blur into "our" numbers. Revisit only after the footer placement has shipped and the separation pattern is proven. |

**Recommendation:** ship the picks-page-footer placement first (below the
existing bottom upgrade CTAs, still above `<Footer />`), and treat the
dedicated `/odds` page as a fast v1.1 follow-up once the RevenueSurface value
and RevenueOffer record exist — both placements can share the same server
component and RevenueOffer record, just different `surface` values.

### Does `RevenueSurface` need a new value?

**Yes.** `apps/web/lib/revenue/partner-types.ts:17-26` enumerates exactly:

```
"media_kit" | "partners_page" | "newsletter" | "youtube" | "short_form"
| "podcast" | "blog" | "api_docs" | "internal_only"
```

None of these describe a live, on-page embed next to product content — they
are all off-site or asynchronous distribution channels (a kit sent to
partners, a newsletter issue, a video, a blog post). A widget rendered inside
`/picks` or a new `/odds` route is categorically different: it renders on the
same page the product's own predictions render on, live, for every visitor.
Reusing an existing value (e.g. `"blog"`) would be a lie in the data model —
the eligibility check (`evaluateOfferEligibility`,
`apps/web/lib/revenue/offer-eligibility.ts:59-61`) and the compliance guard
fixture (`scripts/guardrails/partner-offer-compliance-scan.mjs:17-27`,
`VALID_SURFACES`) both gate strictly on named surface strings, so the surface
value is also the audit trail for "where was this bookmaker's name allowed to
appear."

Proposed name: **`"odds_widget"`** (or `"picks_board_widget"` if the team
wants the name to travel with future non-Odds-API widgets too — recommend
`"odds_widget"` for now since it's the concrete, named thing being approved).

**What adding it requires** (owner-delegated — the guard files below are
sealed and this pass does not touch them):

1. `apps/web/lib/revenue/partner-types.ts:17-26` — add `"odds_widget"` to the
   `RevenueSurface` union. This file is **not** sealed (it's plain app code),
   so this edit is safe engineering work.
2. `scripts/guardrails/partner-offer-compliance-scan.mjs:17-27`
   (`VALID_SURFACES` Set) — **sealed, read-only per this task's instructions.**
   The guard's own fixture-driven test suite
   (`scripts/guardrails/fixtures/partner-offer-compliance.json`) would need a
   new surface value recognized here or every eligibility case that names
   `"odds_widget"` fails `SURFACE_NOT_ALLOWED` by construction. **This is the
   one hard dependency that blocks shipping the widget end-to-end** — flagged
   under founder/owner review below.
3. `apps/web/lib/fences/affiliate-disclosure-fence.ts:41-55` — its own local
   `surfaces` array (a second, independent copy of the `RevenueSurface`
   union, not imported from `partner-types.ts`) would also need
   `"odds_widget"` added or the disclosure fence silently treats an
   `odds_widget` mention as an unrecognized surface. This file is **not**
   sealed — safe engineering work, but must be remembered since it's a
   second source of truth for the same enum.
4. Any RevenuePartner/RevenueOffer registry data (once one exists — see §3)
   needs `"odds_widget"` in its `allowedSurfaces` array.

---

## 2. How `THE_ODDS_WIDGET_KEY` is consumed

**This section is the least certain part of the design and should be
verified against the vendor's actual widget docs (https://the-odds-api.com/widget/)
before implementation — everything below is inferred from the publicly
described shape ("an HTML tag showing one bookmaker's odds ... click-through
to the bookmaker") and from how this repo already handles the analogous
`THE_ODDS_API_KEY`, not confirmed against a live fetch of vendor docs (this
sandboxed pass cannot make outbound calls to the-odds-api.com).**

Two plausible mechanics, both consistent with "an embeddable widget ... an
HTML tag":

- **(a) Client-side config value.** The widget is a `<script src="https://…">`
  tag plus a container `<div data-key="…" data-bookmaker="…">` (or similar),
  and the vendor's script reads the key straight out of the DOM at render
  time in the visitor's browser. In this shape the "key" is functionally a
  **publishable identifier**, not a secret in the traditional sense — it is
  sent to every visitor's browser and to the vendor's script by design,
  similar to a Stripe *publishable* key or a Google Analytics measurement ID.
- **(b) Server-fetched config.** The app calls a vendor config/init endpoint
  server-side using the key (as a bearer credential) to fetch a
  pre-authorized embed payload or short-lived token, then renders only the
  resulting markup/token to the client. In this shape the raw key never
  reaches the browser.

**Needs a live check before implementation:** which of (a) or (b) the actual
widget uses, the exact script host/domain (for CSP allow-listing — see
below), and whether the "key" the founder pasted into Vercel is a per-site
publishable identifier or a rotate-on-leak secret credential.

**Design posture regardless of which mechanic is confirmed**, to satisfy
CLAUDE.md's "no secrets in code" rule and this repo's existing pattern for
the sibling `THE_ODDS_API_KEY` (`packages/data-ingestion/src/odds-api-key.ts`
resolves it server-side only, from `process.env`, never inlined):

- `THE_ODDS_WIDGET_KEY` is read **only** via `process.env["THE_ODDS_WIDGET_KEY"]`
  inside a **server component**, never given a `NEXT_PUBLIC_` prefix, never
  hardcoded, never logged. This holds even under interpretation (a): the
  value must still not be committed to source or exposed via any *other*
  channel than the one narrow purpose the vendor's own script requires
  (rendered once into the widget's own config attribute on that one server
  component's output) — CLAUDE.md's wording ("never exposed as a client
  bundle secret **beyond what the vendor's own widget script requires**")
  draws exactly this line.
- The server component fetches/derives whatever the vendor's script tag
  needs and renders the resulting `<script>`/`<div data-*>` markup. This
  keeps the key out of the JS bundle (it would never appear in any `.js`
  chunk shipped to the client) even under interpretation (a) — it appears
  only in the server-rendered HTML attribute of that one component, which is
  the minimum exposure the vendor's own mechanism allows.
- If interpretation (b) is confirmed, add the widget key to
  `packages/data-ingestion/src/odds-api-key.ts`'s sibling pattern (a small,
  dedicated `odds-widget-key.ts` resolver) rather than inlining
  `process.env` reads at call sites — mirrors the existing convention and
  keeps one canonical resolution point to audit.
- **CSP is a real, concrete blocker, not a hypothetical.** The site-wide CSP
  header at `apps/web/next.config.mjs:103` currently allow-lists
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.clarity.ms
  https://scripts.clarity.ms https://js.stripe.com` — no the-odds-api.com (or
  whatever the actual widget-script host is) origin is present. Any vendor
  `<script src="https://…">` tag will be silently blocked by the browser
  until that host is added to `script-src` (and possibly `connect-src` if the
  script makes its own XHR/fetch calls for live odds, and `frame-src` if the
  widget itself is an iframe rather than inline-rendered DOM — `img-src`
  already allows `https:` broadly so bookmaker logos should be fine as-is).
  **The exact host(s) to add are unconfirmed** — needs the live vendor docs
  check. This CSP edit is scoped and low-risk engineering work once the host
  is known, but it cannot be written correctly without that confirmation.

  *Checked 2026-08-19 night, negative result:* the-odds-api's public GitHub
  org (`github.com/the-odds-api`) holds only 4 repos — `samples-nodejs`,
  `samples-python`, `samples-php` (raw REST API client examples) and
  `apps-script` (a Google Sheets guide). No widget-related code exists there.
  The embed mechanism and script host must come from `the-odds-api.com/widget/`
  itself (a live page, not fetchable from this read-only design pass) — this
  does not change the open item, it rules out GitHub as a shortcut to it.

---

## 3. The `RevenueOffer` record

### Category: `sportsbook`, not `sports_data`

`RevenuePartnerCategory` (`partner-types.ts:1-13`) offers both `"sportsbook"`
and `"sports_data"`. The widget is **`sportsbook`**, not `sports_data`,
because:

- The stated mechanic is "the site's own affiliate link baked in, click-through
  to the bookmaker" — the commercial event this widget exists to drive is a
  visitor clicking through to open/fund a sportsbook account. That is a
  sportsbook affiliate placement by function, regardless of the vendor's own
  product category (The Odds API's *raw data API* is legitimately
  `sports_data`-shaped — that's the existing, separate, `approved_api`
  relationship recorded in
  `apps/web/lib/scraping/source-rights-registry.ts:401-428` — but the
  *widget* product is a different commercial instrument from the same
  vendor).
- `HIGH_RISK_PARTNER_CATEGORIES` (`partner-types.ts:64`) is `["sportsbook",
  "dfs"]`. Classifying as `sports_data` instead would be a compliance
  bypass: `isHighRiskOffer()` (`partner-types.ts:70-77`) would no longer fire
  on category, `evaluateOfferEligibility` would no longer demand a terms URL
  / responsible-gaming text / 21+ age policy / state lists
  (`offer-eligibility.ts:62-64`, delegated to
  `responsible-gaming-policy.ts:15-38`), and `partner-offer-compliance-scan.mjs`
  (`HIGH_RISK_CATEGORIES` at line 16) would pass a fixture that should fail.
  Given the widget shows real bookmaker prices with a real click-through to
  wagering, under-classifying it would defeat the entire point of the
  existing high-risk gate. Classify as `sportsbook`.

### Proposed `RevenuePartner`

```ts
{
  id: "partner_the_odds_api_widget",
  displayName: "The Odds API Widget",
  category: "sportsbook",
  approvalStatus: "unreviewed",   // founder must flip to "approved" — see §6
  allowedSurfaces: ["odds_widget"],  // requires the new surface value, §1
  disclosureRequired: true,
}
```

### Proposed `RevenueOffer`

```ts
{
  id: "offer_the_odds_api_widget_v1",
  partnerId: "partner_the_odds_api_widget",
  publicName: "Live odds widget",
  category: "sportsbook",
  approvalStatus: "unreviewed",   // founder must flip to "approved"
  riskClass: "high",              // belt-and-suspenders with the category check
  allowedSurfaces: ["odds_widget"],
  termsUrl: "<the specific bookmaker's terms URL — vendor confirms which book per placement; NOT the-odds-api.com's own terms>",
  disclosureText: "Affiliate disclosure: Galaxy Sports Edge may earn a commission if you sign up through this odds widget.",
  responsibleGamingText: "Must be 21+ and physically located in an eligible state. Gambling problem? Call 1-800-GAMBLER.",
  minimumAge: 21,
  eligibleStates: [ /* per bookmaker licensing — founder/legal confirms */ ],
  restrictedStates: [ /* per bookmaker licensing — founder/legal confirms */ ],
  containsDepositLanguage: true,  // odds widgets routinely surface deposit/bonus copy on the bookmaker's own rendered content
}
```

Notes on each required field, cross-checked against what the guards actually
enforce (not assumed):

- **`disclosureText`** — must satisfy `hasUsableDisclosure()`
  (`disclosure-policy.ts:39-43`, mirrored in
  `offer-copy-builder.ts:17-22` and the guard's `hasDisclosure()` at
  `partner-offer-compliance-scan.mjs:44-53`): the text must contain one of
  `sponsor`, `affiliate`, `commission`, or `paid` (case-insensitive substring
  match). The proposed text above contains "Affiliate" and "commission" —
  passes on either keyword alone.
- **`termsUrl`** — required by `evaluateOfferEligibility` (`offer-eligibility.ts:62-64`)
  and the guard (`MISSING_TERMS_URL`, `partner-offer-compliance-scan.mjs:76`)
  whenever `isHighRiskOffer()` is true, which it will be here on category
  alone. **The actual URL is vendor/bookmaker-specific and unconfirmed** —
  needs the live widget docs check to know which bookmaker(s) the widget key
  activates and pull each one's real terms URL.
- **`responsibleGamingText`** — required, and the guard enforces a **minimum
  length of 12 characters** after trimming
  (`partner-offer-compliance-scan.mjs:77`, mirrored in
  `responsible-gaming-policy.ts:20`). The site already has a canonical
  responsible-gaming string — `RiskDisclosure`'s `BODY` constant
  (`apps/web/components/ui/risk-disclosure.tsx:21-24`: "Sports wagering is
  real risk... If you or someone you know has a gambling problem, call
  1-800-GAMBLER.") — reuse that exact copy (or a close variant) for
  `responsibleGamingText` so the widget's disclosure doesn't invent new
  wording that could drift from the site's existing risk-disclosure
  language.
- **`minimumAge`** — must be `>= 21`
  (`responsible-gaming-policy.ts:23`, guard line 80). `21` is the correct
  floor value, not just "truthy."
- **`eligibleStates` / `restrictedStates`** — high-risk offers **fail closed**
  on unknown state (`responsible-gaming-policy.ts:26-28`, guard lines 85-95):
  if the viewer's state can't be determined, or `eligibleStates` is empty,
  the offer is blocked. This means the widget will not render for a visitor
  with no resolvable state, by design — the design must plan for a
  legitimate default-hidden state, not treat it as a bug. **The actual
  eligible/restricted state lists depend entirely on which bookmaker the
  widget serves and that bookmaker's state licensing — this is a founder/
  legal input, not something inferable from this repo.**
- **`containsDepositLanguage`** — set `true` defensively. Odds-comparison
  widgets from affiliate networks routinely render "Bet $5 get $200" /
  deposit-bonus style copy as part of the bookmaker's own creative, which
  `isHighRiskOffer()` treats as an independent high-risk trigger
  (`partner-types.ts:70-77`) regardless of category. This can be confirmed
  and adjusted once the actual rendered widget markup is inspected against
  live vendor docs.

### Who determines the *user's* state for the eligibility check?

`evaluateOfferEligibility` takes `userState` as an input
(`offer-eligibility.ts:29`) — this repo's eligibility engine does not itself
geolocate anyone. **Open question for implementation, not answered by
anything in this repo**: what existing signal (account profile state field,
IP-based geolocation service, a self-attested state selector) would feed
`userState` for an anonymous /picks visitor. Flag this as a real gap: without
a `userState` source, the high-risk fail-closed rule
(`responsible-gaming-policy.ts:26-28`) means the widget **cannot legally
render for anonymous traffic at all** under this repo's own eligibility
model, unless a state signal is wired up. This is a scope decision for the
founder, not an engineering default to invent silently.

---

## 4. Structural separation from pick cards and confidence scores

The platform's binding rule here is broader than the one machine-checked
guard: `scripts/guardrails/affiliate-structural-separation.mjs` enforces
**import-graph** separation (the prediction engine / ingestion / worker
layer must never import `apps/web/lib/affiliate/`, `apps/web/lib/revenue/`,
or the operator registry, and vice versa — see the file's header comment,
lines 1-36, and the two directional target lists at lines 51-93). That guard
does **not** look at rendered UI at all — it is a static import-specifier
scan (`SPECIFIER_RE`, line 49) over source files. So passing that guard is
necessary but not sufficient for the actual product requirement stated in
this task: *a reader must not mistake bookmaker odds for our
prediction/confidence output.* That is a UI/copy requirement this design doc
must specify explicitly, since no automated guard checks it today.

Concrete rules for the implementation:

1. **Never render the widget inside a `PickCard`.** `apps/web/components/picks/pick-card.tsx`
   is the one place confidence scores, pick grades (`GradeBadge`), and the
   `selection`/`line` box render (lines 87-118+). The widget must not be a
   child of, or visually nested inside, this component's DOM subtree under
   any prop combination.
2. **Never render the widget inside the picks grid.** The picks grid is the
   `<div className="grid grid-cols-1 gap-5 sm:grid-cols-2">` block at
   `apps/web/app/picks/page.tsx:525-535`. The widget's `<section>` must be a
   sibling **after** this grid closes (and after the existing "Bottom
   upgrade CTA" / "PRO conversion teaser" blocks), not interleaved with pick
   cards, so it can never visually read as "one more card in the grid."
3. **Distinct visual container with its own frame.** Every other on-page
   block in this codebase that carries commercial/compliance content already
   uses a bordered `surface-card`/`rounded-xl border ...` block with its own
   heading (see `PicksTrustStrip`, `apps/web/app/picks/page.tsx:746-781`, and
   `RiskDisclosure`'s `"card"` variant, `risk-disclosure.tsx:35-49`). The
   widget section should follow the same pattern: its own bordered card, its
   own heading (e.g. "Live odds" or "Compare live lines"), never sharing a
   card border/background with a `PickCard` or the `SlateBar`.
4. **A visible, adjacent disclosure — not a footnote.** The disclosure text
   satisfying `hasUsableDisclosure()` (§3) must render in the same visual
   block as the widget, not only exist as metadata in the `RevenueOffer`
   record. `affiliateDisclosureFence`
   (`apps/web/lib/fences/affiliate-disclosure-fence.ts:22-31`) models this
   exact requirement for generated copy ("disclosure near the partner or
   offer mention") — the UI should mirror that: disclosure text inside the
   widget's own card, immediately below or above the embed, not relegated to
   the page footer alone.
5. **No shared iconography, color, or label with confidence/grade UI.** The
   existing pick-grade palette (`PICK_GRADE_STYLES`, `pick-card.tsx:25-30` —
   plasma/verify/ion-blue) and confidence-score presentation are the site's
   visual vocabulary for "our proprietary output." The widget's card should
   use a visually distinct treatment (e.g. neutral/titanium framing, an
   explicit "Bookmaker odds — not a Galaxy Sports Edge pick" label) so that
   even a user skimming color/shape, not reading text, cannot conflate the
   two. This is a copy/design instruction for implementation, not something
   enforceable by the existing guards.
6. **Labeling should state the source plainly.** Given the vendor widget
   shows one bookmaker's line, a one-line label near the embed — something
   like "Live odds from [bookmaker], via The Odds API · not a Galaxy Sports
   Edge prediction" — makes the boundary legible without relying on layout
   alone. Exact bookmaker name is vendor/config-dependent and unconfirmed
   (§2).
7. **The prediction engine must never read this widget's presence, key, or
   config.** This falls directly out of the existing forward-direction rule
   the sealed guard already enforces (`packages/prediction-engine/`,
   `packages/data-ingestion/`, `packages/ingestion-pipeline/`, `workers/*`
   must never import `apps/web/lib/revenue/` or `apps/web/lib/affiliate/` —
   `affiliate-structural-separation.mjs:51-74`). Any widget-key resolver
   (§2) must live under `apps/web/lib/` (e.g. alongside the revenue library
   or as its own `apps/web/lib/odds-widget/` module), never under
   `packages/data-ingestion/` or `packages/prediction-engine/`, so it can
   never be imported by the engine even by accident, and the existing guard
   continues to catch any future violation automatically.

---

## 5. Requires founder review before shipping (compliance/legal)

These are not engineering decisions — they need the founder (and likely
counsel, given the sportsbook/gambling compliance surface) to resolve before
any of this goes live:

1. **Which bookmaker(s) does this specific widget key activate?** The
   widget shows "one bookmaker's odds" per the task description — which one,
   and is it fixed per site or configurable per placement? Determines the
   real `termsUrl`, `eligibleStates`, `restrictedStates`.
2. **State eligibility/restriction lists for that bookmaker** — real
   licensing data, not inferable from this repo. Required before
   `evaluateOfferEligibility`/the guard will ever pass.
3. **User-state signal source** (§3, "Who determines the user's state") — is
   there budget/appetite to add IP geolocation or an account-state field, or
   does the widget only render post-signin with a profile state? Without
   this, the widget is blocked for all anonymous traffic by the platform's
   own fail-closed rule — which may be the intended, conservative posture,
   but it's a product decision either way, and the founder should confirm
   that's acceptable for the initial launch rather than discover it as an
   accidental bug.
4. **Approve the `RevenuePartner`/`RevenueOffer` records.** Both are
   `approvalStatus: "unreviewed"` by default in this design; nothing renders
   until the founder (or whoever owns partner approval) flips them to
   `"approved"` — this is enforced by `PARTNER_NOT_APPROVED` /
   `OFFER_NOT_APPROVED` blockers (`offer-eligibility.ts:47-55`), not
   optional.
5. **Confirm the exact vendor script host and mechanism** (§2) directly
   against https://the-odds-api.com/widget/ (live, outside this sandbox) —
   needed to write a correct, minimal CSP change and to know whether the key
   is safe-by-design to render server-side into a public HTML attribute or
   needs to be treated as a rotate-on-leak secret.
6. **Add `"odds_widget"` to the sealed guard's `VALID_SURFACES`**
   (`scripts/guardrails/partner-offer-compliance-scan.mjs:17-27`). This file
   is explicitly out of scope for this design pass and for any PR that
   doesn't have separate sign-off — flag as owner-delegated work. Until this
   lands, no `RevenueOffer` naming `"odds_widget"` as an allowed surface can
   pass the compliance guard's own fixture-style checks in CI.
7. **Legal review of the disclosure/responsible-gaming copy** proposed in
   §3 — drafted here to satisfy the mechanical `hasUsableDisclosure()` /
   length checks, not reviewed by counsel for actual regulatory sufficiency
   in every state the widget might render in.
8. **Placement decision**: confirm picks-page-footer (and/or a dedicated
   `/odds` page) is the desired v1 surface, and whether dashboard-sidebar
   should be ruled out entirely or just deferred (§1).

---

## 6. Safe to build in a PR without further review

Pure engineering scaffolding, no live compliance risk, no rendering of any
bookmaker content or affiliate link yet — these can proceed once §5 items are
in motion but do not themselves require waiting on legal/founder sign-off on
the *content*:

1. Add `"odds_widget"` to the `RevenueSurface` union in
   `apps/web/lib/revenue/partner-types.ts` (not the sealed guard file — that
   stays owner-delegated per §5.6).
2. Add `"odds_widget"` to the local `surfaces` array in
   `apps/web/lib/fences/affiliate-disclosure-fence.ts:41-55` so the fence
   layer recognizes the new surface consistently with `partner-types.ts`.
3. Create a small, dedicated server-only env resolver for
   `THE_ODDS_WIDGET_KEY` (mirroring
   `packages/data-ingestion/src/odds-api-key.ts`'s pattern — presence-check
   helper, no logging of the raw value), placed under `apps/web/lib/`
   (never under `packages/data-ingestion/` or `packages/prediction-engine/`,
   per §4.7). Ship it wired to return `""`/absent until the real mechanism
   is confirmed — a safe no-op.
4. Scaffold the `RevenuePartner`/`RevenueOffer` records from §3 in whatever
   registry module holds partner data today (`apps/web/lib/revenue/partner-registry.ts`
   currently only has lookup/summary helpers, not a data file — locate or
   create the actual data source consistently with how other partners are
   registered) with `approvalStatus: "unreviewed"` — inert until a human
   approves them, so committing the shape carries no live risk.
5. Scaffold the widget's server component and its container `<section>` in
   `/picks` (per §4's placement/isolation rules) rendering a clearly-labeled
   **placeholder** ("Live odds widget — pending approval") instead of the
   real vendor script, gated behind the (currently-unapproved) offer's
   eligibility check via `evaluateOfferEligibility`. This proves the
   separation, gating, and disclosure wiring end-to-end without emitting any
   real bookmaker content, real affiliate link, or real CSP change.
6. Add/extend tests mirroring `apps/web/__tests__/affiliate-compliance.test.ts`
   and `apps/web/lib/revenue/offer-eligibility.test.ts` for the new
   `"odds_widget"` surface and the sportsbook-category offer shape from §3
   (disclosure-keyword pass/fail, high-risk blockers, state fail-closed).
7. **Do not** add the CSP `script-src`/`connect-src` origin, and **do not**
   render any real vendor script tag or real bookmaker terms/state data,
   until §5 items 1, 2, 5 are resolved — those are the parts with actual
   compliance and vendor-fidelity risk.

**Estimated effort for the next day** (the safe-to-build list above): roughly
a half day for an engineer already familiar with `apps/web/lib/revenue/` —
items 1-2 are one-line-each enum edits, item 3 is a ~20-line file modeled
directly on an existing one, item 4 is small typed data, item 5 is one new
server component plus one edit to `apps/web/app/picks/page.tsx` to place it,
item 6 is test-writing against an already-well-modeled pattern. The
remaining, larger effort (real vendor script, real CSP origin, real
state/terms data, sealed-guard surface addition) is explicitly gated on the
founder-review list in §5 and is not part of the following-day estimate.

---

## 9. Adjacent gap surfaced while researching this doc (not this feature)

Nothing in `apps/web/lib/revenue/` currently records whether a click-through
to a partner actually converted (signup, first deposit, etc.) — the model
stops at "offer was shown/disclosed." Server-to-server (S2S) postback
tracking — the affiliate network pings our server when a referred user
converts, so we can attribute revenue back to a specific offer/surface — is
the standard mechanism for that, and it's a real, separate gap from the
widget itself: the widget only *shows* odds and links out; postback
tracking is how we'd later know if it worked. Flagging for a future ledger
row, not scoping into C-17 — it applies to every affiliate partner, not
just this one, and needs its own design pass (webhook endpoint, HMAC/shared-
secret verification, idempotency, which network(s) actually support it).
