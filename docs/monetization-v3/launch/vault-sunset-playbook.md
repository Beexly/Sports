# Vault Sunset Playbook

**Audience:** Garrett. Use when Vault hits a kill criterion or Plan E fires from customer dev.

**Why this playbook exists:** Galaxy's brand position depends on honoring commitments under stress. The hardest stress test is sunset — closing down a product that paying members rely on. If Galaxy handles sunset poorly, the brand position collapses across every other surface. If Galaxy handles sunset well, the brand position survives the loss.

**Trigger scenarios:**
1. Plan E from customer dev (≤4 qualified yes of 30) → Vault never launches; sunset is pre-emptive.
2. Month-6 kill criterion (<150 members) → Vault sunsets after partial year of operation.
3. Month-12 kill criterion (<70% renewal rate) → Vault sunsets at end of founding-1000's first year.
4. Founder kill criterion (per `founder-resilience-playbook.md`) → Vault may sunset for founder-health reasons.
5. Catastrophic methodology failure → if Galaxy's factor model is structurally broken, Vault sunsets pending fix.

Each scenario has the same operating principles + slightly different specific actions.

---

## Operating principles for sunset

Three rules govern every sunset action:

### 1. Members made a commitment in good faith. Galaxy honors that commitment.

Vault members paid for a 12-month subscription. If sunset happens before their 12 months expire, they receive prorated refunds. No prorated language about "value delivered" — Galaxy refunds the unused portion of the year regardless.

### 2. Sunset is announced honestly, not euphemistically.

No "pivoting Vault to align with the broader Galaxy strategy" language. No "transitioning members to other tiers" framing. Sunset is sunset; Galaxy says so.

### 3. Members keep what they earned during membership.

Anything published to Vault during their membership stays accessible to them in some form. The Discord archives, the digest archive, the quarterly data reviews — all remain available even after the role is removed.

---

## Sunset Scenario A — Pre-emptive (Plan E from customer dev)

This is the cleanest sunset. Vault never launched publicly. Only the 30 customer dev interviewees know about the proposed Vault tier.

### Day 0 (decision day)

- Garrett writes DEC-NEXT-002 → NO-GO outcome in `templates/decision-log.md`.
- Decision memo published under `reviews/`.

### Day 1

Send the following email to all 30 customer dev interviewees:

```
Subject: Vault decision — and what's next

Hey [first name],

Thanks again for the 30 minutes you gave Galaxy last week.

After all 30 conversations, the honest read is: Vault as I described it doesn't have enough product-market fit to justify building. The qualified yes-count came in below threshold, and the reasons-to-decline cluster pointed at issues I can't address without restructuring the offer.

What this means for you:

1. Vault is not launching. There won't be a separate $200/year premium tier.

2. The benefits I described are being repositioned into Galaxy Elite. Specifically, the weekly internal-rationale digest moves to Elite ($49/month). Monthly office hours move to Elite. The quarterly data review folds into the public Galaxy Almanac annual.

3. If you offered specific feedback that shaped this decision, I've added 30 days of Elite to your subscription as a thank-you. The credit shows up automatically on your next renewal.

4. If you said yes to being a founding member, I'm sorry the offer doesn't materialize. You're invited to be a founding member of the Elite tier expansion. Same restraint, different tier mechanics.

If you want to talk about anything in this — reply to this email. It goes to me directly.

Garrett
```

Email is honest about the no-go. Doesn't soften.

### Subsequent actions

- Vault content reposition into Elite tier (per the customer dev synthesis):
  - Weekly digest becomes Elite-tier email perk.
  - Monthly office hours become Elite-tier monthly Discord stage.
  - Quarterly data review folds into the public Almanac.
  - Model Journal early access → Elite-tier benefit.
  - Vault-only Discord channel → renamed Elite-tier Discord channel.
- Almanac becomes year-1 anchor product (per master plan v3).
- Decision-log entry DEC-NEXT-VAULT-REPOSITION captures the strategic shift.

### Brand-position check

Did Galaxy say "we tried; the data said no"? Yes.
Did Galaxy reposition value into existing tiers honestly? Yes.
Did Galaxy avoid blaming customers ("you didn't want what we built")? Yes.

Brand position survives Plan E. The 30 customer dev interviewees become Elite advocates, not bitter ex-prospects.

---

## Sunset Scenario B — Month-6 kill (Vault has <150 members)

Vault has been operating for 6 months. ~100-150 paid members. Kill criterion fires at the last-Friday KPI ritual.

### Day 0 (decision day, last Friday of month 6)

- DEC-NEXT-VAULT-SUNSET written in `templates/decision-log.md`.
- Owner-override protocol considered (and rejected, per anti-rationalization rule).

### Day 1 (Monday after kill decision)

Send the following email to all active Vault members:

```
Subject: Vault is sunsetting. What this means for you.

Hey [first name],

Hard email. After 6 months of Vault operations, the data says it isn't working at the scale it needs to. Member count is below the threshold I committed to publicly, and continuing to operate Vault past this point would either compromise the discipline I built it on or burn through founder capacity Galaxy needs elsewhere.

So: Vault is sunsetting. Here are the specifics:

1. **Your access continues until [last day of your prepaid year].** Discord role stays, gated pages stay accessible, weekly digest keeps shipping through that date.

2. **Your refund.** Vault was $200/year. I'm refunding the unused portion of your year based on your subscription start date. The refund hits your card 5-7 business days after [last day of your prepaid year].

3. **What stays available to you.** Every weekly digest you received during your membership remains accessible on your member dashboard indefinitely. Quarterly data reviews you received stay accessible. Discord archive is exported and made available to you as a downloadable PDF/JSON if you want it.

4. **Your founding rate.** Honored on any future Galaxy product if I ever build something similar to Vault again. I'll grandfather you in at the same price.

5. **What I'm not doing.** Not transitioning you to a "Vault Lite" or some half-version. Not pushing you toward Elite as an upsell. Not pretending this is "Vault evolving." It's Vault sunsetting.

Why this is the right call for Galaxy:

If I keep Vault running below threshold, the math is bad: founder capacity that should go to Almanac production gets eaten by office hours for too few members. Members notice the operator is stretched. The discipline collapses.

The discipline is the product. If I can't operate the discipline at this scale, the brand position requires sunsetting rather than degrading.

This is hard. I built Vault around the founding-50 cohort and you've been more important to Galaxy than I can probably articulate. I'm sorry the data didn't get us where we needed to go.

If you want to talk about anything — reply to this email. I read every one.

Garrett
```

### Subsequent actions over 30 days

**Day 1-7:**
- Respond to every member reply within 24 business hours.
- Some members will offer to pay more / want to keep Vault going. Galaxy's position: thank them, but the decision stands. Brand discipline.
- Some members will be hurt or angry. Galaxy's position: acknowledge, don't argue, don't apologize beyond the substance of what's being apologized for.
- Discord channel mood will shift. Garrett posts a single longer message in #vault-lounge re-explaining the decision and acknowledging it.

**Day 8-30:**
- Process pro-rated refunds via Stripe. Codex's admin cockpit handles batch refund.
- Send members their personal Discord archive (PDF + JSON export) via email.
- Update Galaxy public surfaces: `/vault` landing page changes to a sunset-notice page (see below). The Vault FAQ updates to reflect the sunset.

**Day 30-60:**
- Member dashboards continue functioning for active term holders.
- Quarterly data review for Q[final] is delivered on schedule even after the sunset announcement.
- Office hours continue on schedule until last term expires.

**Day 60+:**
- After last member term expires: Discord channels archive (read-only access for prior members continues for 90 days), then archive freeze.
- Public surface (`/vault`) becomes "Vault — discontinued [year]" with a brief explanation.

### Public sunset notice on `/vault`

After last paid member term ends, the landing page becomes:

```
Vault — discontinued in [year]

Galaxy operated Vault between [month] [year] and [month] [year] as a premium tier above Elite.

Why it was discontinued: Vault required member count above an operational threshold to justify the founder time the product consumed. The threshold wasn't reached, so Vault was sunset rather than allowed to degrade in quality below what members paid for.

Vault's content survives in two places:
- The Galaxy Almanac — the year-end annual continues to include the quarterly data review material that was previously Vault-only.
- Public Galaxy surfaces — many digest-style explanations that originated in Vault have been re-released on the public site.

Members who participated in Vault have founding-rate priority on any future Galaxy premium product.

The decision-log entry documenting Vault's sunset is at [link to decision log] for the operator-discipline interested.

Pro and Elite subscriptions are at /pricing.

— Galaxy Sports Edge
```

The sunset page stays up indefinitely. It's a brand-position asset, not just an operational artifact.

---

## Sunset Scenario C — Month-12 kill (renewal rate <70%)

Vault has been operating for 12 months. Renewal rate is <70% of founding-1000. Most active members are at their renewal decision point.

### Decision day

Same DEC-NEXT-VAULT-SUNSET decision-log entry. Override protocol considered + rejected.

### Member communication

Similar email to Scenario B but with a different opening:

```
Subject: Vault — Year 2 decision

Hey [first name],

Quick context first: Vault has been operating for 12 months. Renewal rate came in at [N%], below the 70% threshold I committed to publicly as Vault's continuation criterion.

So: Vault doesn't continue into Year 2.

What this means for you specifically:

[If renewing] - Your Year-1 access continues through [date]. You will not be charged for Year-2. The renewal that would normally have processed has been canceled.

[If non-renewing] - Your access already ends at term-end per your earlier cancellation. Nothing changes from what was already scheduled.

What stays available to you (regardless of renewal status):
[same as Scenario B]

Your founding rate: same as Scenario B.

What I'm not doing: same as Scenario B.

Why this is the right call:

70% renewal at the founding-1000 size means about 700 members would have continued into Year 2. That's below the operational threshold Vault needs to justify the founder capacity it requires. Continuing below threshold means either degrading the product (more members per office hour, fewer digests, less personal touch) or compromising other Galaxy work.

The math went the way it went. I'm not happy about it, but the discipline is what made Vault meaningful in Year 1, and the same discipline says don't continue Year 2 at the projected scale.

If you want to talk about anything — reply to this email.

Garrett
```

### Subsequent actions

Same operational rollup as Scenario B, but timed to the 12-month boundary rather than mid-year sunset.

---

## Sunset Scenario D — Founder kill criterion fires

Per `founder-resilience-playbook.md`, founder-state kill criteria can trigger Vault sunset for reasons that aren't about Vault performance.

Examples:
- Garrett needs to step back for health / family / personal reasons for >2 months.
- The founder-resilience playbook's specific triggers (14+ days of <6 hours sleep, multiple anti-spiral protocol invocations, "I don't believe this anymore" reads) fire repeatedly.

### Day 0 considerations

This is the hardest sunset scenario because the trigger isn't about Vault data — it's about operator capacity. The honest framing is:

```
Subject: Vault is pausing — and what that means

Hey [first name],

Hard email. Galaxy is pausing Vault operations effective [date]. This is not about Vault's performance — Vault has been healthy. This is about me, the founder.

[Brief, honest explanation. Doesn't need to be detailed. "I need to step back from operations" is enough.]

What this means for you specifically:

1. **Your access continues for [period].** The Discord stays open. Past digests remain accessible. Office hours pause but past recordings remain available.

2. **Your refund or extension.** Two options — you pick:
   - Prorated refund for the remaining months of your prepaid year.
   - Extended access for the same period at no additional charge (the subscription pauses with credit applied to a future restart if Galaxy ever reopens Vault).

3. **The founding rate.** Honored when/if I restart Vault under any name or restructure.

4. **What I'm not doing.** Not promising "back soon." Not pretending this is a marketing reposition. Not asking for forbearance.

The honest read: I don't know yet if Vault restarts. The product is real and the founding-1000 is the most important cohort Galaxy has ever had. But I can't honor what Vault requires from me right now. Galaxy's discipline says: stop, rather than degrade.

If you want to talk — reply to this email. It might be a few days before I respond.

Garrett
```

This scenario is exceptional. It requires more grace from members than the other scenarios. Most members will respond with kindness. Some will be angry. The brand-position discipline says: receive the anger honestly, don't defend, don't promise more than Galaxy can deliver.

### Subsequent actions

- Member-choice between prorated refund and extended access. Default: prorated refund unless member opts in to extension.
- Vault Discord channels go read-only after 30 days. Archive remains accessible.
- Public surface (`/vault`) becomes a "Vault — paused, possible restart" page.

---

## Sunset Scenario E — Catastrophic methodology failure

Specific to: Galaxy discovers a fundamental issue with the factor model (e.g., calibration drift across all confidence bands; structural flaw that wasn't visible at deployment).

This is the highest-stakes sunset scenario. It implicates everything Galaxy publishes — not just Vault.

### Day 0

- Vault sunsets immediately. Member access ends within 7 days.
- Public Galaxy operations pause (Board doesn't publish new picks).
- DEC-NEXT-METHODOLOGY-FAILURE entry written publicly. Methodology page gets a banner explaining the pause.

### Member communication

```
Subject: Galaxy is pausing publications — what's happening

Hey [first name],

Galaxy is pausing all publications effective [date]. This includes the Board, the Wednesday digest, the Model Journal, and Vault office hours.

The reason: we identified a structural issue with the factor model. [Brief specific explanation. No spin.]

This isn't a known weakness we were working around. It's a methodology flaw that affects what's already been published. We don't want to ship new publications while we don't fully trust the model.

What happens next:

1. Galaxy operates in audit mode for [N weeks] while the methodology is reviewed.
2. The Loss Room and Pass List autopsies for the affected publications get updated to reflect the new understanding.
3. Vault members get prorated refunds for the unused portion of their year.
4. The Pro/Elite subscriptions are paused — no charge during the audit period.

After the audit:

- If the methodology can be fixed: Galaxy restarts publications under a new model version with the fix documented. Vault may restart with members who choose to return.
- If the methodology can't be fixed cleanly: Galaxy sunsets entirely.

What this means for you specifically:

[Detailed account-by-account explanation of refunds, access, and the path forward.]

This is the kind of email I hoped never to write. I'm writing it because the brand position requires it. The honest read of the methodology problem matters more than the operational disruption.

Garrett
```

### Public surfaces

All Galaxy public surfaces get a banner explaining the pause. The methodology page is updated to flag which factors are under review. The Loss Room gets a banner explaining that autopsies for affected publications are being re-examined.

This scenario is rare but possible. Galaxy's brand position depends on the response being credible.

---

## What sunset playbook deliberately does NOT include

1. **No "save Vault" campaigns.** Galaxy doesn't run "renewal pushes" or "founders-only retention sales." The decision is the decision.

2. **No silent sunset.** Galaxy doesn't quietly let Vault die. Every member gets an honest email at the moment of decision.

3. **No upsell to other tiers via sunset.** Members who held Vault may renew Elite or Pro independently — but the sunset email doesn't push them there.

4. **No marketing of the sunset.** Galaxy doesn't publish a press release about Vault's sunset. The sunset is a quiet artifact. Press coverage, if it happens organically, is fine.

5. **No "lessons learned" essay during the immediate sunset.** Reflection happens later, in the year-end annual report and the Galaxy Almanac. Immediate sunset is operational, not editorial.

6. **No member-cohort segmentation.** Every Vault member receives the same sunset email. Founding-50 don't get a different version from later joiners. Equality of treatment is brand-aligned.

7. **No competing tiers as substitution.** Galaxy doesn't say "Vault sunsets, but Vault Pro is launching at $300/year." A sunset is a sunset.

---

## Discord channel sunset specifically

The Vault Discord channels require special handling:

### Day 0-7 (immediately after sunset announcement)

- All channels remain functional and members can post.
- Garrett's presence is heightened — members will use the channels to process the news.
- No member is muted or removed unless they violate community rules.

### Day 7-30

- Office hours that were already scheduled within the term continue on schedule.
- Garrett posts a single longer message in #vault-lounge re-explaining the decision and answering common questions.
- Discord stays interactive for any member with active term remaining.

### Day 30-90

- Channels move to read-only mode (no new posts; existing posts remain).
- Members can still read the archive.
- Garrett posts a final message acknowledging the close.

### Day 90+

- Channels archive (only accessible to members who held Vault).
- After 1 year: channels removed from Discord entirely; downloadable archive sent to all former members.

---

## Engineering work required for sunset (Codex tasks)

Codex's admin operations spec already covers most of this. The sunset-specific items:

- [ ] Batch refund processing in admin cockpit (per-member prorated refund).
- [ ] Discord archive export tool (member's personal interactions exported to PDF/JSON).
- [ ] Vault landing page sunset-notice variant (toggle-able).
- [ ] Stripe subscription cancellation in bulk + cancel-renewal notifications.
- [ ] Vault Discord channel state machine: active → read-only → archived.
- [ ] Decision-log entry templates for VAULT-SUNSET / VAULT-PAUSE / METHODOLOGY-FAILURE variants.

These should be specified in Codex's pre-engineering handoff so they're ready BEFORE sunset is needed. Galaxy never wants to be building these tools mid-sunset.

---

## What members owe Galaxy at sunset

Members owe nothing. The honest framing: members already paid; they fulfilled their commitment. Galaxy's commitment was the product they paid for, and Galaxy is now adjusting that commitment.

If a member shares the sunset on social media in a way Garrett finds objectionable: Galaxy does not respond. The brand-position discipline says: receive the public criticism without defending. The Loss Room exists for the same reason — public records matter even when they're unflattering.

---

## Sunset retrospective (90 days after the sunset is complete)

Once all Vault terms have expired and the operational sunset is complete, Garrett writes a retrospective:

- What worked about Vault's launch.
- What the data showed about why it didn't scale.
- What lessons feed into future Galaxy products.
- What the founding-1000 (or actual member count) taught Galaxy.

The retrospective is published in the year-end annual report + the Galaxy Almanac. Members who held Vault are credited (anonymously by default; named if they opt in).

The retrospective is the brand-position salvage. Even if Vault sunsets, the discipline of writing the retrospective publicly is what makes Galaxy's brand survive the loss.

---

## Cross-references

- KPI rules (which determine kill criteria): `04-kpi-decision-rules.md`
- Founder resilience (founder-state kill criteria): `founder-resilience-playbook.md`
- Member support playbook (refund flow): `copy/vault-member-support-playbook.md`
- Decision log templates: `week-minus-1/06-decision-log-entry-templates.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Vault PRD (engineering data model): `product/vault-prd.md`
- Admin operations (refund + archive tooling): `product/admin-operations-spec.md`

---

*Sunset is the brand position's hardest test. Galaxy that handles sunset well survives the loss. Galaxy that handles sunset poorly loses the brand position for every product that follows. The playbook above isn't optional — it's the pre-committed honesty that makes the eventual sunset (if it happens) survive Galaxy's commitments.*
