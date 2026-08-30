# Component Handoff — Galaxy Sports Edge launch components

Design and engineering intent for every new component built during the launch
pass. For future contributors (or future me) — this is what each piece is
for, what it depends on, and what to NOT change without thinking.

---

## SignalPreviewQueue
**File:** `apps/web/components/hero/signal-preview-queue.tsx`
**Slot:** Homepage, below the picks grid heading, replaces the static
EmptyPicksState during silent-collection.

**Purpose.** Make the abstract "we score every matchup" claim visible. The
queue materializes 8 anonymized rows on mount, then cycles each row's state
between SCORING / GATED / PUBLISHED on a 1s tick. The motion is the message:
"this is what the engine is doing in the background."

**Brand-safety rules locked in:**
- Every row labeled "Preview · not a live pick"
- No team names, no scores, no real betting odds
- Sport pool matches `SUPPORTED_SPORTS` (NFL/NCAAF/NBA/NCAAB/MLB/NHL/MLS)
- Reduced-motion: renders a static snapshot, no animation loop
- ARIA region label flags it as "illustrative animation, not real picks"

**When to change.** When live picks ship and the empty state will rarely
appear, this component can become an opt-in "demo mode" rather than the
default fallback. Don't kill it — the visual continues to do real work for
new visitors.

---

## AnnotatedSampleSignal
**File:** `apps/web/components/home/annotated-sample-signal.tsx`
**Slot:** Homepage, between Methodology and ToutComparison.

**Purpose.** Show what a real published signal looks like, with six labeled
callouts (sport+matchup code, grade chip, selection+line, factor trail,
Edge Index, variance line). This is the Stripe/Linear pattern of annotating
a real product surface so the abstract becomes legible.

**Brand-safety rules locked in:**
- Visible "Preview · not a live pick" stamp on the card
- Anonymized matchup ("Away · 06" vs "Home · 18") — no team names
- Variance line ("A 71-confidence signal still loses ~29 of 100. Treat as
  one input.") is required — never strip it

**When to change.** When the real published signal-card schema evolves,
update the sample to match — but keep the callouts. The callouts are the
educational surface.

---

## ToutComparison
**File:** `apps/web/components/home/tout-comparison.tsx`
**Slot:** Homepage, between AnnotatedSampleSignal and MethodologySection.
Also reused on `/vs/tout-services`.

**Purpose.** Make the anti-tout positioning visible as data, not assertion.
Six rows × three columns (Dimension / Galaxy / Typical tout).

**Brand-safety rules locked in:**
- Never names a specific competitor (legal-safe and brand-correct)
- All rows describe categorical patterns, not specific brand claims
- Negative state CheckMark uses `--alert` color, not muted gray (WCAG 1.4.1)

**Accessibility:** rendered as a real `<table>` with `<thead>`, `<tbody>`,
`<th scope="col">`, `<th scope="row">`. Screen readers programmatically
associate header with cell. Mobile collapses headers into per-cell
pseudo-prefixes via CSS `::before`.

---

## StartInSixty
**File:** `apps/web/components/home/start-in-sixty.tsx`
**Slot:** Homepage, between hero and the slate bar.

**Purpose.** Conversion-funnel reassurance — three explicit promises that
lower signup friction (no credit card for free, 7-day refund window, founder
reads every reply). Each promise maps to a fact already enforced in the
codebase, not a marketing claim.

**Brand-safety rules locked in:**
- Every promise is auditable in code: free entitlements, Stripe refund
  config, hq@ inbox routing
- No "guarantee" language; refund window is described as policy, not promise

---

## InteractiveGalaxy (Orbital Edge)
**File:** `apps/web/components/hero/interactive-galaxy.tsx`
**Slot:** Inside `<section className="hero hero-galaxy">` on the homepage.

**Purpose.** Atmospheric hero canvas. Replaces an earlier 3,600-particle
Three.js galaxy that read as generic AI-startup template. Current
composition: one primary cyan orbit, one secondary ultraviolet orbit, a
single bright signal traveler on a 28-second lap, a magenta pulse beat
every 7 seconds, three fixed reference stars, horizon hairline, vignette.

**Why so restrained.** Cinematic = breathing room. The brand voice is
"calibrated, precise, on frequency" — that calls for one disciplined motion,
not a particle storm.

**Reduced motion:** renders a static composition.

---

## SubscribeButton
**File:** `apps/web/components/pricing/subscribe-button.tsx`
**Slot:** Inside each paid plan card on `/pricing`.

**Purpose.** Isolates the Stripe checkout side-effect (the only client-side
piece) so `/pricing/page.tsx` can stay a server component. SSR pricing means
search engines index every plan, FAQ, and feature without JavaScript.

**Brand-safety rules locked in:**
- Error strings in founder voice ("Network blip on my end…")
- 401 → redirects to `/auth/signin?callbackUrl=/pricing` (preserves intent)
- Errors get `role="alert"` for screen readers
- Loading state described in text + visual spinner

---

## ToutComparison reused on /vs/tout-services
**File:** `apps/web/app/vs/tout-services/page.tsx`
**Purpose.** Standalone SEO landing page that targets "transparent sports
picks vs tout services" intent. Reuses ToutComparison as the centerpiece +
adds a 4-watchlist section + transparency-moat copy.

**Don't change without thinking about SEO.** Per-page metadata + canonical
+ keyword-rich H1/H2 are tuned for search intent. If you rewrite, preserve
"tout services" / "transparent sports picks" / "anti-tout" in headings.

---

## FAQ page (separate from pricing FAQ)
**File:** `apps/web/app/faq/page.tsx`
**Purpose.** Comprehensive long-tail FAQ with FAQPage JSON-LD covering 5
sections (Product / Trust & transparency / Pricing & billing / Account &
data / Responsibility). Separate from the checkout-focused FAQ on pricing.

**SEO leverage.** Each Q/A is a potential rich-result featured snippet.
Don't bury answers in marketing fluff — first sentence answers the question.

---

## Changelog
**File:** `apps/web/app/changelog/page.tsx`
**Purpose.** Linear-style ship log. For prospects who don't yet have a
track record to evaluate, this is a trust artifact they CAN read.

**Cadence target.** Add an entry every ship of substance. When weekly
cadence is sustained, swap from the hardcoded `ENTRIES` array to a DB-backed
content collection (e.g., `ContentDraft` with `category: 'changelog'`).

---

## Footer wordmark moment
**File:** `apps/web/styles/pickpilot-kit.css` (`.footer-wordmark`) +
`apps/web/components/ui/footer.tsx`.

**Purpose.** Ambient 240px outlined "GALAXY SPORTS EDGE" wordmark behind the
footer columns. Closing brand statement. Reference: linear.app, vercel.com.

**Don't fade it more than ~18% opacity** or it disappears entirely.

---

## .pick:hover lift
**File:** `apps/web/styles/pickpilot-kit.css`

**Purpose.** -2px lift + cyan glow + `:focus-visible` outline on every
pick card. Reduced-motion safe (no transform on motion-reduce). Same lift
applies for keyboard focus — accessibility parity with hover.

---

## Color tokens (Brand Use Pack §4 aligned)
**File:** `apps/web/styles/design-tokens.css` + `apps/web/tailwind.config.ts`

The two color systems were reconciled to the Brand Use Pack §4 spec:
- `--carbon` `#0D1117` (matches Tailwind)
- `--obsidian` `#050608`
- `--ion-blue` `#00E5FF` (Orbital Cyan — was a true blue before, drift)
- `--ultraviolet` `#7A5CFF` (Soft Ultraviolet — was lavender, drift)
- `--ion-white` `#F6F7FA`
- `--plasma-glow` `#FF66E0`

**`--fg-muted`** is now `--ion-1` (`#98A3B5`) instead of `--ion-2`
(`#5E6878`), restoring WCAG AA contrast across every meta label site-wide.

---

## What NOT to do without thinking

- Don't reintroduce magenta as a decorative wash. The brand reserves it for
  live state, Eclipse Gate callouts, and one hero vignette.
- Don't add a public win-rate before `PERFORMANCE_STATS_ENABLED=true`.
- Don't add "lock", "guaranteed", "sure thing" or any other banned phrase
  to customer copy. The `apps/web/lib/trust-claims.ts` registry is enforced
  by tests in CI.
- Don't make the SignalPreviewQueue display real picks. It's intentionally
  anonymized.
- Don't strip the variance line from any signal-card variant.
- Don't change the Performance H1 from "Calibration Report" — that's the
  canonical surface name.
- Don't change `hq@galaxysportsedge.com` to `support@` or `legal@` —
  consolidating to one inbox is intentional.

---

## File map (TL;DR)

```
apps/web/
├── app/
│   ├── layout.tsx ··················· JSON-LD + Twitter + canonical
│   ├── page.tsx ····················· Homepage composition
│   ├── pricing/page.tsx ············· Server, FAQ JSON-LD, founder voice
│   ├── methodology/page.tsx ········· Per-page metadata, first-person
│   ├── vs/tout-services/page.tsx ···· SEO landing (NEW)
│   ├── faq/page.tsx ················· Long-tail FAQ + JSON-LD (NEW)
│   ├── changelog/page.tsx ··········· Ship log (NEW)
│   ├── not-found.tsx ··············· Brand-voice 404 (NEW)
│   ├── opengraph-image.tsx ········· Founder-signed OG card
│   ├── {admin,cockpit,dashboard,brief,auth}/layout.tsx — noindex (NEW)
│   └── ... (about, contact, press, vault, observatory, performance,
│             picks, blog, promotions, responsible-play, error)
├── components/
│   ├── hero/
│   │   ├── interactive-galaxy.tsx ··· Orbital Edge composition
│   │   └── signal-preview-queue.tsx · Live anonymized queue (NEW)
│   ├── home/
│   │   ├── annotated-sample-signal.tsx ·· Anatomy callouts (NEW)
│   │   ├── tout-comparison.tsx ······· Vs tout service table (NEW)
│   │   └── start-in-sixty.tsx ······· Conversion reassurance (NEW)
│   ├── pricing/
│   │   └── subscribe-button.tsx ····· Isolated client (NEW)
│   └── ui/
│       ├── footer.tsx ··············· Wordmark moment + first-person
│       ├── nav.tsx ················· (unchanged)
│       ├── risk-disclosure.tsx ····· Tightened language
│       ├── methodology-section.tsx · First-person
│       └── manage-subscription-button.tsx — error voice + role=alert
├── lib/
│   ├── brand.ts ····················· hq@ inbox, real social handles
│   └── trust-claims.ts ············· (unchanged — guards CI)
└── styles/
    ├── pickpilot-kit.css ··········· Mobile breakpoints, footer wordmark,
    │                                  .pick hover, focus-visible, reduced
    │                                  motion guards
    └── design-tokens.css ··········· Brand Use Pack §4 colors,
                                       --fg-muted bumped to AA pass

docs/
├── brand/
│   ├── brand-guidelines.md ········· SSoT brand spec
│   └── component-handoff.md ········ This file
├── email-sequences/
│   └── welcome-flow.md ············· 5-email founder welcome
└── launch-prep/
    ├── 30-day-campaign-plan.md ····· Week-by-week launch
    └── founder-outreach-onepager.md  DM templates, soundbites

social/
└── round-1-launch-card.svg ········ Round 1 IG/FB asset (1080x1080)

CODEX_HANDOFF_2.md ··················· Codex prompt + manual checklist
```
