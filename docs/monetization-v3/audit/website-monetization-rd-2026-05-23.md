# Website Monetization R&D Map

Date: 2026-05-23
Status: Internal R&D only
Related decision: DEC-NEXT-019

---

## Decision log entry

### DEC-NEXT-019 - Expand website monetization R&D without activating a fourth track

**Decision:** Galaxy should continue researching website monetization beyond Vault, Almanac, and Live, but no new revenue lane becomes active until it has a gate, owner, validation plan, and kill criterion.

**Rationale:** There are more ways to monetize the site than the current v3 active tracks. The danger is not lack of ideas; it is letting new ideas dilute Vault launch focus. This document captures viable options and rejects misaligned ones so they stop floating around as unstructured temptation.

**Guardrail:** Vault remains first. Any R&D lane below must route through the existing active-track discipline before implementation.

---

## The website monetization principle

Galaxy's public website should monetize by making the record more useful, not by making the reader more reactive.

Good monetization:

- Deepens the reader's understanding of the record.
- Routes to Vault, Almanac, or Live.
- Creates lead capture for B2B or partner conversations.
- Preserves restraint.

Bad monetization:

- Adds ads that reward pageviews over trust.
- Routes readers to sportsbooks.
- Promotes more picks.
- Turns Galaxy into a creator-personality channel.
- Hides synthetic or assisted media.

---

## Opportunity map

| Opportunity | Revenue path | Fit | Activation timing | Verdict |
|---|---|---:|---|---|
| Artifact-to-Vault funnel | Public pages -> Vault application | High | Now, after Vault GO | Build into Vault launch |
| Email capture on proof surfaces | Public pages -> newsletter -> Vault/Almanac | High | After landing pages stable | Strong R&D |
| Short-form artifact clips | Social -> proof surface -> email/Vault | Medium-high | After Vault stability | R&D only now |
| Synthetic host explainers | Clips -> proof surface -> email/Vault | Medium | After policy + private test | R&D only now |
| Almanac pre-order widgets | Public record pages -> Almanac | High | When Almanac activates | Build later |
| B2B data inquiry page | Public methodology -> licensing inquiry | Medium-high | After data model stable | R&D now, build later |
| Live partner inquiry page | Creator/streamer route -> Live partner lead | High | When Live activates | Build later |
| Merch | Artifact-based objects -> margin | Low-medium | After brand demand exists | Defer |
| Public API preview | Developer/data buyers -> paid API | Medium | Year 2+ | Defer behind B2B gate |
| Certification waitlist | Methodology readers -> cert waitlist | Medium | After Almanac authority | Defer |
| Paid ads on site | Pageviews -> ad revenue | Low | Never in V1 | Reject |
| Sportsbook affiliate | Signups -> commission | Negative | Never | Reject |
| Sponsored picks/content | Sponsor pays for visibility | Negative | Never | Reject |

---

## Near-term site changes worth building

These are compatible with Vault-first execution if done lightly.

### 1. Proof-surface email capture

Add quiet email capture modules to:

- `/loss-room`
- `/passes`
- `/methodology`
- `/ledger`

Copy frame:

```
Get the weekly Model Journal.
One note on what the methodology did, passed, lost, or changed.
```

No urgency. No conversion claims.

Metric:

- Visitor-to-email capture rate.
- Email-to-Vault application rate.

Kill criterion:

- If capture module hurts page trust or gets ignored after 60 days, remove or move lower.

### 2. Vault contextual CTA modules

Add one restrained contextual CTA per proof surface:

- Loss Room -> "Vault is where Garrett walks through the internal rationale."
- Pass List -> "Vault discusses the holds worth revisiting."
- Methodology -> "Vault office hours handles methodology questions."
- Ledger -> "Vault members get the weekly rationale digest."

No banners. No pop-ups. No countdowns.

Metric:

- CTA click-through to `/vault`.
- Vault application starts.

Kill criterion:

- If CTA click-through is weak but page engagement drops, remove.

### 3. Almanac waitlist module

Once Almanac activates, add:

- "The annual record" module on Loss Room and Pass List archive pages.
- Email waitlist before pre-order opens.
- Pre-order CTA after launch.

Metric:

- Waitlist signups.
- Waitlist-to-preorder conversion.

Kill criterion:

- If pre-order conversion is below Almanac customer-dev threshold, revise price/offer before adding more modules.

### 4. B2B licensing inquiry page

Create a quiet `/data` or `/licensing` page only after the data contracts stabilize.

Allowed:

- Published data feed inquiry.
- Academic research inquiry.
- Media/research licensing inquiry.

Not allowed:

- Source-code licensing.
- Factor-weight licensing.
- Sportsbook affiliate or promotional integration.
- Exclusive arrangement by default.

Metric:

- Qualified inbound inquiries.
- Contract value.
- Founder time per inquiry.

Kill criterion:

- If average inquiry quality is low or founder time exceeds value, hide page and return to referral-only B2B.

---

## Short-form website loop

If the short-form R&D lane runs, every clip needs a website destination.

| Clip series | Destination | Monetization event |
|---|---|---|
| Loss Room in 30 seconds | `/loss-room/[slug]` | Email capture or Vault click |
| Why We Passed | `/passes/[slug]` | Email capture or Vault click |
| Methodology Minute | `/methodology#[anchor]` | Email capture |
| Almanac Desk | `/almanac` | Waitlist or preorder |
| Live Overlay Demo | `/live` or partner inquiry page | Partner lead |

Do not send short-form traffic directly to checkout.

The reader should meet the record first.

---

## Synthetic host website loop

Synthetic hosts should appear on social first, not on core trust pages.

Allowed on website:

- A clearly labeled media-library page, if the test works.
- Embedded clips inside a future "Learn" section.
- Internal docs and draft review.

Not allowed on website:

- Hero section host image.
- Methodology page host image.
- Loss Room host image.
- Checkout page host image.

Reason: the trust surfaces should remain method-led. The host can help with discovery, but the host does not belong on the proof surface itself.

---

## Website monetization backlog

### MZ-RD-001 - Email capture module spec

Scope:

- Draft copy.
- Define placements.
- Define analytics events.
- Define privacy note.

Owner: Codex.
Activation: After Vault runway/customer-dev GO.

### MZ-RD-002 - Contextual Vault CTA spec

Scope:

- One CTA per proof surface.
- No pop-up.
- No countdown.
- No social proof.

Owner: Codex.
Activation: After Vault landing page final.

### MZ-RD-003 - Almanac proof-surface module

Scope:

- Waitlist module before pre-order.
- Pre-order module after activation.

Owner: Codex + Garrett.
Activation: Almanac customer-dev GO.

### MZ-RD-004 - B2B licensing page concept

Scope:

- Draft `/data` or `/licensing` outline.
- Define accepted and rejected inquiry categories.
- Add partnership framework link.

Owner: Codex.
Activation: Data model stable + Garrett approves B2B exploration.

### MZ-RD-005 - Short-form destination map

Scope:

- Create URL map for every content series.
- Define UTM conventions.
- Define click/conversion metrics.

Owner: Codex.
Activation: Short-form private visual tests approved.

---

## Rejected monetization options

### Display ads

Rejected for V1.

Reason: pageview incentives damage trust surfaces. A Loss Room with ads reads wrong.

### Sportsbook affiliate links

Rejected permanently under current brand position.

Reason: affiliate economics compromise the method-led position.

### Sponsored picks or sponsored methodology pages

Rejected permanently.

Reason: the reader must believe the record is not commercially shaped by a sponsor.

### Paid social growth blitz

Rejected for launch.

Reason: social velocity is not the Vault validation mechanism. Customer dev and founding-50 conversion are.

### Host-led checkout funnels

Rejected for V1.

Reason: synthetic hosts can help explain artifacts. They should not sell directly.

---

## Recommended next build sequence

After the current Vault engineering/validation lane is stable:

1. Specify email capture module.
2. Specify contextual Vault CTA modules.
3. Add UTM taxonomy for short-form R&D.
4. Run short-form private visual test.
5. Only then consider public clip testing.

Do not build `/data`, `/licensing`, `/learn`, or synthetic-host website embeds until Vault launch has cleared its first stability window.

---

*Galaxy can monetize the website more. It should monetize trust, not attention.*
