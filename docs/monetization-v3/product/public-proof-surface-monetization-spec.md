# Public Proof Surface Monetization Spec

**Status:** Engineering-ready after Vault GO.
**Related decision:** DEC-NEXT-020
**Source R&D:** `audit/website-monetization-rd-2026-05-23.md`

---

## Decision log entry

### DEC-NEXT-020 - Specify quiet monetization modules for proof surfaces

**Decision:** Galaxy may add email capture and contextual Vault CTA modules to public proof surfaces after Vault customer-development GO, as long as those modules are quiet, artifact-specific, and removable.

**Rationale:** The site can monetize trust without turning proof pages into sales pages. The first implementation should be small, measurable, and reversible.

**Guardrail:** No pop-ups, countdowns, paid-ad pixels, sportsbook affiliate links, social-proof counters, or checkout-first routing.

---

## Scope

Pages in scope:

- `/loss-room`
- `/loss-room/[slug]`
- `/passes`
- `/passes/[slug]`
- `/methodology`
- `/ledger`

Modules:

1. Email capture module.
2. Contextual Vault CTA module.
3. Analytics events.
4. UTM conventions for short-form inbound traffic.

Out of scope:

- Checkout changes.
- Pricing changes.
- Paid ads.
- Synthetic-host website embeds.
- B2B licensing page.
- Almanac module until Almanac activates.

---

## Module 1 - Email capture

### Purpose

Capture readers who value the proof surface but are not ready for Vault.

### Placement

| Page | Placement |
|---|---|
| `/loss-room` | After intro, before archive list. |
| `/loss-room/[slug]` | After autopsy body. |
| `/passes` | After intro, before table. |
| `/passes/[slug]` | After expanded pass entry. |
| `/methodology` | After Section 1 table of contents. |
| `/ledger` | Below settled-picks summary. |

### Copy

Default:

```
Get the weekly Model Journal.

One note on what the methodology did, passed, lost, or changed.

[Email field] [Subscribe]
```

Loss Room variant:

```
Get the weekly Model Journal.

One note on what the methodology lost, changed, or is still watching.

[Email field] [Subscribe]
```

Pass List variant:

```
Get the weekly Model Journal.

One note on what Galaxy published, passed, or held back.

[Email field] [Subscribe]
```

### UX rules

- Inline module only.
- No modal.
- No sticky bar.
- No exit intent.
- One email field.
- Success state replaces form in place.
- No "free picks" language.
- No social-proof copy.

### Success state

```
Subscribed.

The next Model Journal arrives Sunday.
```

### Error state

```
Something failed. Try again or email garrett@galaxysportsedge.com.
```

### Data requirements

Capture:

- email
- source_page
- source_slug nullable
- source_module = `proof_surface_email_capture`
- utm_source nullable
- utm_medium nullable
- utm_campaign nullable
- utm_content nullable
- created_at
- consent_timestamp

### Events

- `proof_email_capture_viewed`
- `proof_email_capture_submitted`
- `proof_email_capture_succeeded`
- `proof_email_capture_failed`

### Kill criterion

Remove or reposition if:

- conversion rate remains below 0.5 percent after 1,000 qualified page views per page type, or
- qualitative feedback says the module weakens the trust surface.

---

## Module 2 - Contextual Vault CTA

### Purpose

Route high-intent proof-surface readers to Vault without making the page feel like an ad.

### Placement

Only one CTA per page.

| Page | Placement |
|---|---|
| `/loss-room/[slug]` | After email capture or after autopsy body if capture disabled. |
| `/passes/[slug]` | After expanded entry body. |
| `/methodology` | After Section 10, not above methodology content. |
| `/ledger` | Below summary and after email capture. |

Do not place Vault CTA above core proof content.

### Copy

Loss Room:

```
Vault is where Garrett walks through the internal rationale behind entries like this.

No additional picks. More context.

[Read about Vault]
```

Pass List:

```
Vault is where the most instructive holds get discussed in more depth.

No additional picks. More context.

[Read about Vault]
```

Methodology:

```
Vault office hours is where members bring methodology questions.

No additional picks. More context.

[Read about Vault]
```

Ledger:

```
The Ledger records the outcome. Vault is where the weekly rationale gets written.

No additional picks. More context.

[Read about Vault]
```

### UX rules

- Inline text block.
- Same typography system as page body.
- No colored marketing card unless existing design system requires framed modules.
- Button label: `Read about Vault`.
- Link target: `/vault?source=[surface]`.

### Events

- `vault_context_cta_viewed`
- `vault_context_cta_clicked`

### Kill criterion

Remove or rewrite if:

- CTA click-through is below 0.25 percent after 1,000 qualified views, or
- readers report that the proof page feels sales-led.

---

## Module 3 - UTM conventions

Every social or short-form clip should route to a proof surface with UTM tags.

Format:

```
utm_source=[platform]
utm_medium=short_form
utm_campaign=[series_slug]
utm_content=[draft_id]
```

Examples:

```
/loss-room/sample-playoff-weighting?utm_source=youtube&utm_medium=short_form&utm_campaign=loss_room_30&utm_content=SFC-001
```

```
/methodology#calibration?utm_source=x&utm_medium=short_form&utm_campaign=methodology_minute&utm_content=SFC-008
```

Allowed `utm_source`:

- `youtube`
- `tiktok`
- `x`
- `instagram`
- `internal`

Allowed `utm_campaign`:

- `loss_room_30`
- `why_we_passed`
- `methodology_minute`
- `model_journal_excerpt`
- `almanac_desk`
- `live_overlay_demo`

---

## Module 4 - Reporting

Weekly report fields:

- page
- page views
- email module views
- email submissions
- email conversion rate
- Vault CTA views
- Vault CTA clicks
- Vault CTA click-through
- short-form inbound sessions
- short-form inbound email captures
- short-form inbound Vault applications
- notes

Monthly decision:

- Keep.
- Rewrite.
- Reposition.
- Remove.

---

## Engineering notes

### Component names

Suggested:

- `ProofSurfaceEmailCapture`
- `ContextualVaultCta`
- `trackProofSurfaceEvent`
- `parseUtmParams`

### Feature flags

Flags:

- `proof_surface_email_capture_enabled`
- `contextual_vault_cta_enabled`

Default:

- disabled in production until Vault GO.
- enabled in preview/staging.

### Privacy

- No social tracking pixels.
- No third-party ad retargeting.
- Store UTM source with consented email capture only.
- Anonymous aggregate click events are acceptable if current privacy policy permits.

---

## Test cases

- Email capture renders on each proof surface when flag enabled.
- Email capture does not render when flag disabled.
- Submission stores source page and UTM params.
- Success state appears after successful subscription.
- Error state appears after failed subscription.
- Contextual Vault CTA renders below proof content only.
- CTA link includes source query param.
- Events fire once per view/click.
- No banned vocabulary appears in module copy.
- Mobile layout does not obscure proof content.

---

## Morning implementation sequence

1. Confirm Vault GO has occurred.
2. Locate app surfaces for proof pages.
3. Add feature flags.
4. Implement email capture component.
5. Implement contextual Vault CTA.
6. Add event tracking.
7. Add tests.
8. Run full validation.

Do not ship until the proof pages still read as proof pages.
