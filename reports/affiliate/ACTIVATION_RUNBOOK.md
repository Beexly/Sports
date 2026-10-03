# Affiliate Activation Runbook — founder go-live sequence

**Status: not started.** Zero `APPROVED_PARTNER` rows exist in the operator
registry (`apps/web/lib/cockpit/operator-registry.ts`) as of this writing, and
this runbook does not change that — approving a partner is a founder action
via code review, not something an agent does. Source of truth for programs,
commission shapes, and the state-licensing matrix:
`reports/affiliate/PROGRAM_LANDSCAPE.md`. Founder ruling that authorized this
work at all: `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`, "FOUNDER RULINGS
2026-07-16" — affiliate revenue is **ON under a disclosed-conflict model**,
never "no affiliate ever," and never without the trust layer this runbook
gates on.

## The trust layer this runbook assumes already exists

Before step 1 can matter, the following must be true (all shipped ahead of
any live partner, so activation literally cannot skip them):

| Piece | Where |
|---|---|
| Public trust page explaining the revenue model | `apps/web/app/how-we-make-money/page.tsx` |
| Per-link disclosure primitive (adjacent, non-dismissible, FTC-2023 wording) | `apps/web/components/ui/partner-link-disclosure.tsx` (`PartnerLink` / `PartnerLinkDisclosure`) |
| Structural-separation guardrail (fails CI if the engine/ingestion/worker layer and the affiliate/revenue layer ever import each other) | `scripts/guardrails/affiliate-structural-separation.mjs`, wired into `npm run guardrails` |
| Partner-offer compliance guard (fail-closed on missing terms/disclosure/RG/age/state metadata for high-risk offers) | `scripts/guardrails/partner-offer-compliance-scan.mjs` |
| Click-time compliance re-check + attribution | `apps/web/app/go/[slug]/route.ts` |
| Double-entry payout ledger (commission accrual, hold window, clawback, payout) | `apps/web/lib/affiliate/ledger.ts` |
| Publish-time compliance gate (disclosure, RG text, terms URL, expiry, eligible states, banned hype language, operator approval) | `apps/web/lib/promotions/guards.ts` (`evaluatePromotionForPublish`) |

If any of these is missing or has regressed, stop and fix it before
proceeding — none of the steps below are a substitute for it.

## The sequence

### 1. Apply to operators — Caesars + FanDuel first, BetMGM third

Per `PROGRAM_LANDSCAPE.md` §"Best first applications": Caesars
(`partners.caesarsinteractive.com`) and FanDuel (self-serve via Income
Access, `affiliates.fanduel.com`) both have open, moderate-to-high-openness
application intake. BetMGM (via CJ Affiliate, `betmgmpartners.com`) is the
third application, not first — same tier of openness but no reason to lead
with it over the first two. DraftKings is explicitly the hardest gate for a
new small site and is not part of this first wave. **ESPN BET no longer
exists as an operator** (ESPN/Penn terminated 2025-12-01; do not apply to it
under any name).

**Explicitly request CPA-only terms on every application.** Per the
landscape doc, CPA is the cheap regulatory tier in every state that
distinguishes comp models (e.g., NJ free vendor registration vs. ~$2,000
ancillary license; NC bans rev-share for affiliates outright), and
rev-share is deferred until PROVEN-tier volume justifies the heavier
CO/MI/PA license tiers. Do not accept a rev-share deal shape at this stage
even if offered.

### 2. State registrations — per operator, per state

Every operator/state pair needs its own compliance check before it can earn.
Reference the full matrix in `PROGRAM_LANDSCAPE.md` §"State matrix." Key
points:

- **NJ and PA are operator-initiated filings.** NJ is a free vendor
  registration the operator files (a supplemental affiliate filing is due
  within 30 days); PA's gaming-service-provider tier is likewise something
  the operator initiates on your behalf. Treat both as a joint task with
  each signed program, not something to file solo.
- **Zero-license states** (affiliate marketing only, no registration): NY
  (operator reports the affiliate list; compensation disclosure required),
  OH (explicit exemption), IL, NC (rev-share banned here — CPA only, no
  registration needed), IN (deregulated 2025-07-01), LA (below $500k/yr from
  LA operators).
- **Registration-tier states**: MI ($200), CO ($350 minor tier), VA
  ($500/3yr), MD ($100), AZ ($1,500 ancillary supplier flat fee regardless
  of comp model).
- **KY, TN, MA are UNRESOLVED.** Do not accept commissions from users in
  these states until written confirmation is obtained:
  - KY — email KHRC. The general service-provider tier ($50,000) is clearly
    aimed at platform suppliers, not affiliates, but this needs an explicit
    exemption confirmation before relying on it.
  - TN — email `SWC.Licensing@tn.gov` to resolve the ambiguous affiliate
    treatment.
  - MA — email `mgcvendorlicensing@massgaming.gov`; the sports-wagering
    registrant fee is unverified and the MGC may escalate large affiliates
    to a heavier tier.

Track each operator/state pair's registration status somewhere durable
(a founder-owned tracker, not code) before that state's traffic is allowed
to earn.

### 3. FTC disclosure checklist

Every surface that will carry a partner link must satisfy 16 CFR Part 255
(rev. June 2023) before the link goes live:

- [ ] Disclosure is **adjacent** to the link — not in a footer, not on a
      separate terms page. (`PartnerLink` renders it inline, wired via
      `aria-describedby`, so this is structural, not a copy-editing step.)
- [ ] Disclosure is **clear and conspicuous** — a reader scanning the page
      cannot miss it, and it isn't hidden behind a tooltip, accordion, or
      "learn more" interaction.
- [ ] Disclosure uses **plain language** — "Paid partner link," not the bare
      word "affiliate," which the FTC's guide calls out as inadequate on its
      own (`apps/web/components/ui/partner-link-disclosure.tsx` ships this
      exact wording; do not substitute weaker copy per-partner).
- [ ] Disclosure is **not buried** — no burying it below the fold, in tiny
      type, or in a color that fails contrast against its background.
- [ ] The disclosure links back to `/how-we-make-money`, so anyone who wants
      the full policy can get it in one click.

Both the publisher (this site) and the operator share FTC liability — this
checklist is not optional paperwork.

### 4. 21+ / responsible-gambling / state-eligibility elements

Every page that will carry a partner link needs, in addition to the FTC
disclosure:

- [ ] An explicit 21+ (or higher, per state) age statement.
- [ ] Responsible-gambling messaging plus the 1-800-GAMBLER hotline
      (already the sitewide standard — see `apps/web/lib/brand.ts`
      `HELPLINE` and `apps/web/components/ui/risk-disclosure.tsx`).
- [ ] State-eligibility language — never implying a promo is available
      everywhere. `evaluatePromotionForPublish`
      (`apps/web/lib/promotions/guards.ts`) already refuses to publish a
      promotion with an empty `eligibleStates` list or one whose current
      viewer state is restricted; do not bypass that gate at the page level.

This mirrors the AGA Responsible Marketing Code referenced in
`PROGRAM_LANDSCAPE.md`: 21+, majority-adult-audience placement,
responsible-gambling messaging, state-eligibility qualifiers, and no
guaranteed-win/risk-free/loss-chasing framing (already machine-enforced by
`scripts/guardrails/trust-gate.mjs` and
`scripts/guardrails/commercial-copy-scan.mjs`).

### 5. Add the `APPROVED_PARTNER` row — code review only

Once an operator's agreement is signed and its state registrations for the
states you intend to earn from are confirmed:

1. Open `apps/web/lib/cockpit/operator-registry.ts`.
2. Flip that operator's entry from `KNOWN_NOT_PARTNERED` to
   `APPROVED_PARTNER`.
3. Set `licensedStates` from the **signed agreement plus the operator's
   current state licensing** — never fabricated, never copied from the
   landscape doc's directional figures. If a state's status is still
   unresolved (KY/TN/MA until written confirmation lands), leave it out of
   `licensedStates`.
4. Update `registeredAt`/`reviewedAt`/`reviewer` to reflect the real review.
5. This is a founder-reviewed pull request, not an autonomous-agent commit —
   the registry's own doc comment says new `APPROVED_PARTNER` rows are
   code-review only, and no agent working this runbook approves an operator
   on its own authority.

### 6. Verify disclosure surfaces actually render

Before announcing anything is live:

- [ ] Load the live page carrying the new `/go/[slug]` link in a browser and
      confirm the "Paid partner link" label renders immediately next to it
      and links to `/how-we-make-money`.
- [ ] Confirm `npm run guard:affiliate-structural-separation` still passes
      (it will — the guard doesn't look at data, only imports — but this is
      the last chance to catch a code change that snuck a coupling in).
- [ ] Confirm `npm run guard:partner-offers` and the promotions-guards test
      suite still pass with the new promotion row's real data (real
      `disclosureText`, real `termsUrl`, real `eligibleStates`).
- [ ] Click through `/go/<slug>` once in a staging/preview environment and
      confirm the redirect lands on the real operator page with the `subid`
      attribution param attached.

### 7. Founder merge + env

- [ ] Set `AFFILIATE_SUBID` if the default (`gse`) should change.
- [ ] Merge the registry change through the normal founder-reviewed PR flow.
- [ ] Confirm the deploy went out and re-run step 6's live checks against
      production, not just preview.

## Standing invariants (true before step 1 and true forever after)

These do not get relaxed by "we're live now" — they are the condition the
founder ruling put on turning affiliate revenue on at all:

- **No partner is ever a pick input.** The structural-separation guardrail
  (`scripts/guardrails/affiliate-structural-separation.mjs`) fails the build
  if `packages/prediction-engine/`, `packages/data-ingestion/`,
  `packages/ingestion-pipeline/`, or any `workers/*` package imports from
  `apps/web/lib/affiliate/`, `apps/web/lib/revenue/`, or the operator
  registry — or the reverse. This runs on every change, not just at launch.
- **Disclosure is adjacent to every partner link, always.** Use `PartnerLink`
  / `PartnerLinkDisclosure`; a bare `<a href="/go/...">` is never
  acceptable, launch day or year three.
- **The absolute claim is retired.** Do not write or approve copy that
  frames the disclosed conflict as proof of anything ("we only make money
  when our number is right," or similar). The honest position is that a
  disclosed conflict is still a conflict, kept structurally away from
  scoring — not a claim that it doesn't exist.
