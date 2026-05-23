# Vault Founding-50 Invitation Email Templates

**Audience:** Garrett. Internal.
**Used at:** Day 0 of Vault launch (per `launch/vault-pre-launch-checklist.md`).
**Purpose:** The single most important email Galaxy sends in Year 1. Templates here are personalized variants — Garrett selects the variant per invitee + fills personalization fields.

**Pairs with:** `week-minus-1/07-founding-50-selection-framework.md` (who gets which template) + `copy/vault-checkout-copy.md` (the signup flow they land on).

---

## Variant selection logic

Of the 50 founding invitees, three categories:

| Category | Count target | Template variant |
|---|---|---|
| **Customer dev interviewees who said `early_commit = yes`** | 30 | Template A (interview-rooted personalization) |
| **Galaxy Elite subscribers with high engagement (no interview)** | 15 | Template B (engagement-rooted personalization) |
| **Strong-signal referrals from interviewees** | 5 | Template C (referral-rooted personalization) |

Each invitee gets ONE template, selected by their category. Garrett personalizes the specific "Why I'm reaching out to you" line.

---

## Template A — Customer dev interviewee

**Subject:** Founding-50 — Vault opens to you first

**Body:**

```
Hey [first name],

You're on the founding-50 list for Vault — the premium Galaxy tier we've been validating.

You spent [X minutes] with me last [date range] talking through what Vault would and wouldn't be. You said [one specific thing they said, lifted from the interview tracker]. That conversation is part of why this version of Vault exists.

The founding-50 window opens 14 days before Vault opens publicly. That's why you're hearing first.

The offer:
- $200/year, founding rate locked for as long as your subscription stays active.
- Weekly internal-rationale digest (Wednesdays).
- Monthly group office hours (second Tuesdays, 8pm Eastern).
- Quarterly private data review.
- Early access to the Model Journal weekly draft (Saturday before Sunday's public publish).
- Vault-only Discord channel.
- Founding-member Discord role.

If you want in:
[ Apply for a founding-50 seat — direct link ]

If you're thinking about it:
No rush. The 14-day window stays open. The founding rate is held for you specifically.

If you want to ask questions before deciding:
Reply to this email. I'll be in your inbox same-day.

If it's a no:
Totally fine. Galaxy's not going to chase. The rest of Vault opens publicly in 2 weeks; you can decide later if circumstances change.

Glad to have you in the founding cohort.

— Garrett
```

### Garrett's customization checklist before sending Template A:

- [ ] Replace `[first name]` with the respondent's first name from the interview tracker.
- [ ] Replace `[X minutes]` with the actual interview duration (typically 30 min).
- [ ] Replace `[date range]` with the actual interview date.
- [ ] Replace `[one specific thing they said, lifted from the interview tracker]` with a verbatim quote or close paraphrase from `templates/vault-interview-tracker.csv` quote columns. Specific. Not generic.
- [ ] Replace `[direct link]` with their member-specific signup URL.
- [ ] Confirm the founding-rate language matches the customer dev decision memo.

---

## Template B — Elite subscriber, no interview

**Subject:** Founding-50 — Vault opens to you first

**Body:**

```
Hey [first name],

You're on the founding-50 list for Vault.

You've been on Galaxy [Pro/Elite] for [N months]. Your activity on Galaxy specifically — [one specific observation: high engagement on /loss-room, regular activity on /ledger, replies to digest emails, etc.] — is why you're on the founding list before public launch.

The founding-50 window opens 14 days before Vault opens publicly. That's why you're hearing first.

The offer:
- $200/year, founding rate locked for as long as your subscription stays active.
- Weekly internal-rationale digest (Wednesdays).
- Monthly group office hours (second Tuesdays, 8pm Eastern).
- Quarterly private data review.
- Early access to the Model Journal weekly draft.
- Vault-only Discord channel.
- Founding-member Discord role.

If you want in:
[ Apply for a founding-50 seat — direct link ]

If you're thinking about it:
No rush. The 14-day window stays open. The founding rate is held for you specifically.

If you want to ask questions before deciding:
Reply to this email. I'll be in your inbox same-day.

If it's a no:
Totally fine. Your [Pro/Elite] subscription continues unchanged. The rest of Vault opens publicly in 2 weeks if circumstances change.

Glad to have you in the founding cohort.

— Garrett
```

### Garrett's customization checklist for Template B:

- [ ] Replace `[first name]` with the subscriber's first name from Stripe.
- [ ] Replace `[Pro/Elite]` with their current tier.
- [ ] Replace `[N months]` with the actual subscription duration.
- [ ] Replace `[one specific observation]` with a specific observable behavior. Examples:
  - "Your consistent engagement on the Loss Room — visiting almost every settled-loss page within 24 hours of publication"
  - "Your replies to the weekly digest, especially the [date] thread where you raised [specific topic]"
  - "Your Discord engagement in the [channel name] — particularly the [specific contribution]"
- [ ] If no specific observation comes to mind: revise to be more general ("Your sustained engagement on Galaxy") but still personalized to a category.
- [ ] Replace `[direct link]` with their member-specific signup URL.

The "one specific observation" line is what separates a personalized invitation from a generic one. If Garrett can't fill it specifically, the invitation is weaker. Either find the specific signal in Galaxy data, or revise the invitee selection.

---

## Template C — Referral

**Subject:** Founding-50 — invited by [referrer's first name]

**Body:**

```
Hey [first name],

[Referrer's first name] suggested I reach out about Vault — the premium Galaxy tier launching in 2 weeks.

When [referrer's first name] mentioned you, [specific thing they said about you — e.g., "they said you read Loss Room more carefully than most"]. That's the kind of reader Vault is for, so you're on the founding-50 list.

The founding-50 window opens 14 days before Vault opens publicly. That's why you're hearing first.

[Same offer block as Templates A + B]

If you want in:
[ Apply for a founding-50 seat — direct link ]

If you're thinking about it:
No rush. The 14-day window stays open.

If you want to ask questions before deciding:
Reply to this email. I'll be in your inbox same-day.

If it's a no:
Totally fine. No follow-up from me. The rest of Vault opens publicly in 2 weeks.

— Garrett
```

### Garrett's customization checklist for Template C:

- [ ] Replace `[first name]` with the referred person's first name.
- [ ] Replace `[Referrer's first name]` with the referrer's first name (both instances).
- [ ] Replace `[specific thing they said about you]` with a near-verbatim quote from the referrer.
- [ ] Replace `[direct link]` with their member-specific signup URL.
- [ ] Confirm the referrer is OK with being named in the email (most are; double-check anyway).

---

## Follow-up cadence (per founding-50 invitee)

Per `week-minus-1/07-founding-50-selection-framework.md`:

### Day 3 (if no signup yet) — Soft follow-up

```
Subject: Re: Founding-50

Hey [first name],

Quick bump on this. The founding-50 window is open for 11 more days. Your seat is held; the founding rate is reserved.

If you want to talk through anything before deciding, reply to this. If you decided no, no reply needed — your seat releases at Day 14.

— G
```

### Day 7 (still no signup) — Personal note

```
Subject: Re: Founding-50 — checking in

Hey [first name],

Personal note from me. Halfway through the founding-50 window. You're one of the 50; I haven't heard from you either way.

If you have a specific question or concern, reply. If you're thinking it through, no rush. If it's a no, totally fine — I won't follow up after Day 13.

— G
```

### Day 13 (no signup) — Last touch

```
Subject: Re: Founding-50 — last note

Hey [first name],

Last note from me. Founding-50 window closes tomorrow. After Day 14, Vault opens publicly at the same $200/year (founding rate stays available through the founding-1000 launch, not just the founding-50 window).

If you want in: [direct link]
If you want to think about it longer: public window stays open until the 1,000-member cap fills.
If no: appreciate you reading. No further follow-up.

— G
```

### Day 14 — No further touches

After Day 14, the founding-50 window closes. Public founding-1000 launch begins. No additional invitations are sent to specific founding-50 invitees beyond their initial cohort outreach.

---

## What founding-50 emails deliberately DON'T do

1. **No high-pressure scarcity language.** "Only 12 seats left — act fast!" Galaxy's brand position rejects this.

2. **No artificial deadline acceleration.** The 14-day window is the 14-day window. Don't change it mid-window.

3. **No "exclusive access" framing.** Galaxy says "founding-50" because that's literally what it is. Doesn't dramatize "exclusivity."

4. **No upsell to higher tier within the email.** Vault is the offer. No "Founding-50 PLUS for $400/year!"

5. **No testimonials in the founding-50 email.** Other people's enthusiasm isn't the founding-member's decision basis.

6. **No competitor name-dropping in the email.** Galaxy doesn't say "unlike Outlier..." Brand-position violation.

7. **No emoji.** Founding-50 emails are restrained.

8. **No "tell your friends!"** The referral program exists, but founding-50 invitations don't push it.

---

## Testing before send

Before sending the 50 emails on Day 0:

- [ ] Personalize 5 emails (one per category sample) completely.
- [ ] Read each aloud — does it sound like Garrett writing personally?
- [ ] Brand-safety scanner pass.
- [ ] Verify each direct link works for the test account.
- [ ] Confirm send-time formatting (no timezone surprises).
- [ ] Verify reply-to is `garrett@galaxysportsedge.com`.

When the test 5 read clean: send the full 50 in a single batch via transactional email tool with personalization merge.

---

## Cross-references

- Pre-launch checklist (when these emails are queued): `launch/vault-pre-launch-checklist.md`
- Founding-50 selection framework (who gets which template): `week-minus-1/07-founding-50-selection-framework.md`
- Checkout flow (where invitees land): `copy/vault-checkout-copy.md`
- Welcome email sequence (what they receive after subscribing): `copy/vault-welcome-emails.md`
- Discord launch pack (channels they enter): `copy/vault-discord-launch-pack.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Member experience map (what they experience next): `copy/vault-member-experience-map.md`

---

*The founding-50 email is the moment of conversion for Galaxy's most important early cohort. Personalize specifically. Don't dramatize. Trust the offer. The right buyer reads the email and clicks; the wrong buyer reads and pauses — both are correct outcomes.*
