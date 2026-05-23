# Vault Member Experience Map — First 30 Days

**Audience:** Garrett. Internal. Helps Garrett see Vault from the member's POV across the first 30 days.

**Why this exists:** Galaxy ships individual surfaces (welcome emails, digests, Discord, office hours). What's harder to see is how those surfaces compose into a member's actual lived experience. This map walks through what a Vault member sees, feels, and does day-by-day for the first 30 days.

**Use:** Read this once before launching Vault. Re-read after Day 30 of operations. Compare expected vs actual member experience to surface drift.

---

## The member's mental model entering Day 0

By the time a new member reaches Stripe Checkout, they've:

- Read galaxysportsedge.com/vault (the landing page).
- Considered the $200/year commitment for at least a few minutes.
- Either come from a founding-50 invitation, a public Vault opening, or a referral.
- Already believed enough of Galaxy's brand position to convert.

Their mental model: "I'm joining a small community that's serious about sports research. I'll get content I can't get elsewhere. The founder will be present. The pace will be thoughtful."

The first 30 days either confirm or invalidate this mental model.

---

## Day 0 (the moment of conversion) — minute by minute

### Minute 0: Stripe Checkout submits

- Stripe processes payment.
- Webhook fires to Galaxy.
- VaultMember row created with founding number assigned.
- Discord role assignment triggered.
- Welcome page renders at `/vault/welcome`.

**Member experience:** they see the welcome page within 2 seconds. Page reads (per `copy/vault-checkout-copy.md`):

> "You're in Vault.
>
> [First name],
>
> A few things are happening right now: [Stripe done] / [Discord assigning in 5 min] / [Welcome email arriving in 5 min] ..."

**Member feeling:** confirmation that this is real. The personalization ("[First name]") lands. The transparency about what's happening operationally is unusual — most subscription products skip this. Galaxy's brand position is already showing.

### Minute 1-5: Discord role assigns

- Discord bot DM arrives: the welcome message from `copy/vault-discord-launch-pack.md`.
- Vault-only channels become visible to the member.

**Member experience:** they get a notification on Discord. The DM is from "Garrett" (display name configured on the bot), not from a generic "Galaxy Bot" handle. Personal feeling.

The DM message tells them about the four channels (#vault-lounge, #vault-office-hours, #vault-digest-archive, #vault-feedback). It sets expectations clearly: "The pace here is slow. Days can go quiet. That's by design."

**Member feeling:** the operating discipline is visible immediately. The "no tout-trading" framing in the welcome DM reinforces what they bought into.

### Minute 5-10: Welcome email arrives

Email 1 from the welcome sequence (per `copy/vault-welcome-emails.md`):

> "Subject: You're in.
>
> Hey [first name],
>
> You're in. Welcome to Vault.
>
> A couple of things, in order of when you'll need them.
>
> Your Discord invite is below..."

The email reinforces the Discord welcome + previews what's coming (Wednesday digest, monthly office hours).

**Member feeling:** consistent voice across surfaces. The same person wrote the landing page, the Discord welcome, and the email. Galaxy's brand-position discipline is detectable.

### Minute 10-60: Member explores

The new member typically does one of three things:

**Path A (~40% of members):** Opens Discord. Joins #vault-lounge. Reads the pinned channel rules. Maybe lurks for a while.

**Path B (~35% of members):** Goes to `/vault/member` dashboard. Sees their founding number. Sees the empty digest archive (they haven't received any yet). Closes the browser.

**Path C (~25% of members):** Reads everything. Opens public Galaxy surfaces (Loss Room, Pass List, methodology) in additional tabs. Spends 30-60 minutes orienting.

All three paths are fine. Galaxy doesn't require Day-0 engagement.

---

## Day 1 — The "is this real?" check

The new member wakes up Day 1. Their mind asks: "Is Vault real, or did I just give $200 to a marketing-led platform?"

### Email 2 arrives (Day 1)

> "Subject: Why Vault exists.
>
> [First name],
>
> Quick note while it's fresh.
>
> Vault exists because the public site can't carry the whole conversation..."

The email reinforces what Vault isn't (not extra picks, not insider info, not a Discord trading room).

**Member feeling:** the discipline is real. The brand-position framing in Email 2 makes the member's earlier instinct ("this seems different") feel verified.

### Discord experience (Day 1)

Garrett has posted Thread 1 of 8 from `copy/vault-discord-launch-pack.md`:

> "Quick intro from me, as the channel opens.
>
> Vault Lounge isn't a chat firehose by design..."

If the member is one of the first 50 to join (founding-50), they're likely seeing this thread immediately. They may reply.

**Member feeling:** Garrett is real. He's there. The community is forming in front of them.

If the member is part of the public founding-1000 (joining after the founding-50 window), Thread 1 has been up for 14+ days and has 30+ replies. The member reads through the existing conversation and either contributes or lurks.

### What the member does not see on Day 1

- No upsell email.
- No "complete your profile" prompt.
- No suggestion to invite friends.
- No social-media-share-this prompt.
- No "review us" or "rate Vault" request.

This absence is itself a brand-position signal. Galaxy doesn't optimize Day-1 engagement.

---

## Days 2-3 — Setting expectations

### Email 3 arrives (Day 3)

> "Subject: What's in the digest.
>
> [First name],
>
> The first weekly digest lands Wednesday. So you know what to expect:
>
> Structure. Each digest covers one publication...
>
> Five sections, every time..."

The email pre-loads the Wednesday digest's structure. Member knows what to expect.

**Member feeling:** the structure is operational, not marketing. The 500-900 word target + 5-section format reads as discipline.

### Discord experience (Days 2-3)

Threads 2 and 3 from the Discord launch pack land in #vault-lounge:

- Day 2: "Which Galaxy publication has been the most uncomfortable for you?"
- Day 3: "What's the single factor YOU think matters most for [sport]?"

These threads invite engagement on substantive questions, not promotional engagement.

**Member feeling:** the room is becoming familiar. Garrett is asking real questions, not generic onboarding prompts. Other members are responding with substance.

---

## Days 4-6 — First touch from peers

By Day 4-6, the new member has likely interacted with at least one other Vault member in Discord. This is the most fragile moment of the member experience.

**If peer interactions are brand-aligned:**
The new member sees others taking the discipline seriously. Replies are thoughtful. Disagreements are substantive. The community feels real.

**If peer interactions drift:**
A member posts a betslip in #vault-lounge. Garrett moderates per `copy/vault-discord-launch-pack.md`. The new member sees the moderation happen — and sees that the rules are enforced, not just posted.

Either way, the member's mental model crystalizes around Day 4-6. The founder is present, the rules are real, the community is forming.

### Discord experience (Days 4-6)

Threads 4, 5, 6 land:
- Day 4 (Thursday): Digest format options + member input.
- Day 5 (Friday): Garrett's own Loss Room post (modeling vulnerability).
- Day 6 (Saturday): "What's the single thing Galaxy DOES that you think we shouldn't?"

Saturday's thread is unusual. Most products don't ask "what should we stop doing?" on Day 6 of the customer experience. Galaxy does because the brand position depends on member advisory.

**Member feeling:** Garrett is treating them like an advisor, not a customer.

---

## Day 7 — First digest delivers

### Wednesday morning, ~9am

Email arrives. Subject: "Vault digest, week 1 — [topic]."

The digest is 700-800 words. Five sections (the publication, the factor, the assumption, what we were watching, what we'd do differently).

**Member experience:** they read it during their morning routine. 4-6 minutes of reading.

**Member feeling:** "This is the product." The digest delivers on what Email 3 promised. The structure is consistent. The voice is Garrett's.

### Day 7 Discord post

Garrett posts a discussion thread 6-12 hours after the digest publishes, linking back to the digest with a question:

```
Anyone else have a take on whether the Pass List annotation idea would help or just add noise?
```

**Member experience:** the digest isn't a broadcast — it's a conversation. The community discussion forms.

### Email 4 arrives (Day 7)

> "Subject: First digest landed. Next: office hours.
>
> [First name],
>
> Two things.
>
> The first digest hit your inbox Wednesday..."

The email confirms the digest happened + previews the upcoming office hours.

**Member feeling:** rhythm is forming. The cadence is real. The next thing they're looking forward to is office hours.

---

## Days 8-13 — Steady cadence

The first week's intensity quiets into a sustainable rhythm.

### Day 7 Thread (one-week check-in)

Garrett's last seeded Discord thread:

```
One week in. Quick check-in.

What's working? What isn't? What do you wish Vault did that it currently doesn't?

Reply here or in #vault-feedback if you'd rather it not be public. Either's fine.
```

**Member experience:** Garrett is asking for feedback. Most members reply with something (positive, critical, or curious). The room hears each other.

### Days 8-13 — Discord quiet

The room quiets after the first week's intensity. This is by design.

**Member feeling:** the slow pace matches what Discord welcome promised. Members start to settle into "I check in once or twice a week" rhythm. Some lurk, some post; both are fine.

---

## Day 14 — Founding-50 window closes (if applicable)

If the member is a founding-50 invitee: Day 14 marks the close of the founding-50 window. Public Vault opens.

The member doesn't experience this directly — they're already a member. But they see Vault expanding around them.

### Email 5 arrives (Day 14)

> "Subject: Two weeks in.
>
> [First name],
>
> Two weeks since you joined Vault. Wanted to check in.
>
> The pace from here is steady, not heavy..."

The email summarizes the operating rhythm + reinforces "this is the whole product."

**Member feeling:** clear expectations. They know what Year 1 of Vault looks like operationally.

---

## Days 15-20 — Pre-office-hours

The first office hours is approaching. Members start preparing mentally.

### Discord experience (Days 15-20)

The room is quieter than the first week but consistent. Members post occasionally. Garrett replies thoughtfully when he posts.

The pinned post about the upcoming office hours (Thread 7 from launch pack) reminds members:

```
First office hours: this coming Tuesday, 8pm Eastern, right here in #vault-office-hours.

Topics on the table: ...

If there's something specific you want covered, reply below and I'll make sure it gets to it.
```

**Member experience:** they think about whether they'll attend. They draft a question in their head or in #vault-feedback.

---

## Day 21 — First office hours

Tuesday, 8pm Eastern. The first Vault office hours.

Garrett opens the Discord stage. Members join. Garrett's voice + camera on; member camera optional.

### What members experience

Per `copy/vault-office-hours-playbook.md`:

- Garrett opens with 5 minutes of ground rules.
- Q&A flows for ~40 minutes.
- Garrett wraps with 10 minutes (one methodology note + one commitment + calendar).
- Soft close.

**Member feeling:** the office hours feels real. Garrett doesn't read from a script. Members ask substantive questions; Garrett answers honestly. When Garrett doesn't know something, he says so.

This is the highest-leverage moment in the first 30 days. Members compare their mental model ("Garrett is present") against the actual reality. If reality matches, retention is locked. If reality disappoints, churn risk spikes.

### What members typically take away

After the first office hours, members typically:

- Re-engage in Discord with more substance (the office hours raised their conviction).
- Reply to the digest discussion thread the following Wednesday.
- Tell at least one friend about Vault (if the office hours felt real).

**Garrett's experience:** the first office hours feels exposed. He's running unscripted Q&A for 60 minutes in front of 30-100 members. The vulnerability is real. The brand-position discipline is what makes it sustainable across years.

---

## Days 22-28 — Settle into rhythm

By Day 22, most members are in the steady-state Vault experience:

- Weekly digest Wednesday morning.
- Vault Discord posts they engage with occasionally.
- Awareness of upcoming office hours.
- Awareness that Garrett is present + replying.

### Day 23-25 — Sub-period

This is the quietest sub-period in the first 30 days. The first month's excitement has settled. The second month's office hours is still 2 weeks away.

**Member feeling:** they're now committed members, not new members. They're forming the patterns they'll have for Year 1.

### Day 28 — Last Friday of month 1

If Galaxy's first Vault month ends on a last-Friday-of-the-month: Garrett runs the first monthly KPI ritual per `audit/kpi-operator-ritual.md`.

Members don't see this directly. But the ritual produces decisions that show up in next month's product (digest topic choices, methodology updates, Discord engagement).

---

## Days 29-30 — Retention check-in

### Day 30 email arrives

Per `copy/vault-retention-checkins.md`:

> "Subject: One month in.
>
> Hey [first name],
>
> One month in Vault. Quick note from me.
>
> Four things on the table that you can react to or ignore:
>
> 1. Anything in the digests landing differently than you expected?
> 2. Office hours work for your schedule?
> 3. The Discord pace feel right?
> 4. Sport coverage gap?
>
> You don't have to reply. The check-in is here so you know I'm reading.
>
> — G"

**Member feeling:** Garrett actually paid attention. He's checking in personally at Day 30. Most subscriptions don't do this; the ones that do typically use generic templates. This email is specific to Vault's actual operating rhythm.

Members are roughly 60/40 split:
- 60% don't reply (no feedback to offer).
- 40% reply with something (suggestion, observation, question).

Garrett reads every reply within 48 hours.

### The Day-30 mental model

By Day 30, the member has formed a stable mental model of Vault:

- Vault is real.
- Garrett is real.
- The discipline is real.
- The community is small but real.
- The cadence is sustainable.
- $200/year felt fair for what they got.

If all five are true → 12-month retention is highly likely.
If any are uncertain → Garrett's Day-30 email + ongoing rhythm aims to convert uncertainty to confidence.
If any are false → the member is at churn risk. Day-60 conditional check-in fires.

---

## What members deliberately do NOT experience in the first 30 days

1. **No upsell offers.** Vault is the top tier. No "upgrade to Plus" prompts.
2. **No invasive analytics.** Member's reading habits are tracked privately (for operator metrics) but never surface in member-facing content.
3. **No "complete your profile" pressure.** Galaxy doesn't require profile completion or photo uploads.
4. **No referral pressure.** Day-30 email mentions referral link once; no further mention until Day 90.
5. **No "limited time bonus" offers.** Vault doesn't run urgency-driven add-ons.
6. **No competing-platform mentions.** Galaxy doesn't tell members about other Galaxy products (Almanac) in onboarding emails. Almanac stands on its own; cross-product marketing is deferred until Day 90+.
7. **No "rate us" prompts.** Galaxy doesn't solicit reviews.
8. **No daily emails.** The cadence is intentional. Members get 5 welcome emails over 14 days + the weekly digest. That's it.

The absence of these patterns is part of the brand position. Most subscription products do all of them. Galaxy's restraint is the differentiator.

---

## What this map tells Garrett

After reading this experience map, Garrett can assess Vault by comparing actual member experience to expected:

- Are members engaging in Discord at the expected rate? (Compare to the "40% Path A" estimate.)
- Is the first office hours achieving expected attendance? (Per `copy/vault-office-hours-playbook.md`, target ≥40%.)
- Are Day-30 email replies producing expected qualitative data? (~40% reply rate is target.)
- Is the digest cadence holding? (52 weeks of Wednesdays is the year-1 contract.)

If actual member experience drifts from this map, the operating discipline has drifted somewhere. Re-run the relevant playbook sections.

---

## Refresh cadence for this document

Update this experience map:

- After 100 Vault members have completed Day-30: compare expected experience to actual.
- After 6 months of operations: refresh based on patterns observed.
- After 12 months: rewrite based on annual data. This becomes the input to the year-end annual report's "what Year 1 taught us" section.

---

## Cross-references

- Welcome email sequence: `copy/vault-welcome-emails.md`
- Discord launch pack: `copy/vault-discord-launch-pack.md`
- Office hours playbook: `copy/vault-office-hours-playbook.md`
- Retention check-ins: `copy/vault-retention-checkins.md`
- Member support playbook: `copy/vault-member-support-playbook.md`
- 90-day operating runbook: `launch/vault-first-90-day-runbook.md`
- KPI ritual: `audit/kpi-operator-ritual.md`
- Pricing page: `copy/pricing-page-copy.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`

---

*The member experience map is Galaxy's way of seeing Vault from outside the founder's POV. Re-read it monthly during the first 6 months. If actual experience diverges from this map, the operating discipline has drifted. Re-anchor.*
