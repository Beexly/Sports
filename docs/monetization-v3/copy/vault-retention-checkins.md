# Vault Retention Check-ins — 30 / 60 / 90 / 180-Day Scripts

**Pairs with:** Codex's `launch/vault-launch-runbook.md` (covers Days 0–7 + 14) + welcome email sequence (covers Days 0, 1, 3, 7, 14). This file extends to Day 30 through Day 365.

**Purpose:** Founding-member retention check-ins from Garrett, calibrated to be present without being needy. Each touch is a single email, under 250 words. The cadence is deliberately sparse — Vault members don't want a chatty founder.

**Trigger logic:** Each check-in fires on the corresponding absolute day from `subscription_started_at`. If member cancels before a check-in day, the rest of the sequence pauses.

---

## Day 30 — "One month in"

This is the only Day-30 communication. Sent regardless of engagement level. Pairs with the optional referral mention (which lives in `copy/vault-referral-program.md`).

**Subject:** One month in.
**Preheader:** A short note. Reply if anything's off.

```
Hey [first name],

One month in Vault. Quick note from me.

Four things on the table that you can react to or ignore:

1. Anything in the digests landing differently than you expected? Format, length, depth — I'd rather hear it month one than month twelve.

2. Office hours work for your schedule? If second Tuesday at 8pm is hard, I'm tracking what alternative time would help if we add a second monthly session.

3. The Discord pace feel right? Some members find it too quiet; others find it just right. Both are valid signals.

4. Sport coverage gap? If there's a sport you wish Galaxy covered, drop it in #vault-feedback. Year-2 roadmap surfaces these.

You don't have to reply. The check-in is here so you know I'm reading.

— G
```

---

## Day 60 — Conditional (only if engagement is low)

Sent only if member has:
- Not posted in #vault-lounge OR
- Not attended at least 1 office hours OR
- Not opened ≥50% of digests since joining

Otherwise: skip. Don't send unsolicited check-ins to engaged members.

**Subject:** Quick check.
**Preheader:** Nothing required from you.

```
Hey [first name],

Light-touch check-in.

I noticed you haven't engaged much in the Vault Discord or office hours since you joined. That's totally fine — some members read the digest and that's the whole product for them. No expectations either way.

But just in case: is there something specifically NOT working that I could fix? Format, timing, content, anything?

If yes, reply or drop in #vault-feedback. If no, ignore this email — I'll loop back at Day 180 with the annual reset.

— G
```

---

## Day 90 — "Three months in"

Sent regardless of engagement.

**Subject:** Three months in. A favor to ask.
**Preheader:** A specific request.

```
Hey [first name],

Three months in Vault. Quick note + one specific favor.

The note: I'm starting to plan the year-end Almanac. The quarterly data review you got at Day 75 (or are about to get) covers the formal metrics. The Almanac will cover the year more broadly — losses, autopsies, methodology evolution, supporting essays.

The favor: as a founding-member, what's the SINGLE Galaxy publication or pass from the last 90 days that you think deserves the longest write-up in the Almanac? Could be a win, a loss, a pass, or a methodology shift.

Drop it in #vault-feedback or reply to this email. I'll be reading every response. The top-cited entries become Almanac section candidates.

That's it. Three sentences. No big ask.

— G
```

---

## Day 180 — Half-year reflection

The most substantive check-in. Sent regardless of engagement. Goal: surface anything that should affect Year-2 Vault direction.

**Subject:** Six months in. Honest pushback time.
**Preheader:** What I'm thinking about for Year 2.

```
Hey [first name],

Six months in. The longest message I'll send you all year.

I'm starting to think about what Year-2 Vault looks like — what stays, what changes, what we add or drop. Before I commit to anything, I want your honest read.

Three specific questions, three minutes each if you have time:

1. If Year-2 Vault dropped one of the current benefits (digest, office hours, quarterly review, Model Journal early access, Discord) — which would you drop? Genuinely none is OK as an answer. But if you had to pick.

2. If Year-2 Vault added one benefit, what would you want? "Nothing" is also a valid answer here.

3. The Vault cap stays at 1,000 in V1. Year-2 we're considering lifting to 5,000 (which means office hours splits across multiple sessions and Discord gets louder). Yes / no / it depends on what?

Reply or drop in #vault-feedback. The answers feed directly into Year-2 planning + decision-log entries.

If you have nothing to add, that's also signal — it means current Vault is roughly right. Either way I'm glad you're here.

— G
```

---

## Day 270 — Quiet

Intentionally no check-in at Day 270. Garrett's quarterly data review (Q3) fires around this time. Don't stack communications.

---

## Day 335 — Renewal pre-warning

30 days before subscription renewal. Reduces "surprise charge" complaints which are the dominant churn driver for annual subscriptions.

**Subject:** Heads-up — your Vault renewal is in 30 days.
**Preheader:** No action needed. Just a heads-up so the charge isn't a surprise.

```
Hey [first name],

Quick heads-up: your Vault subscription renews on [date], 30 days from now.

$200 will charge to the card on file. Your founding-member rate is locked, so the charge stays at $200 even if the public Vault price has moved by then.

Nothing required from you. This email exists so the charge isn't a surprise — that's a Galaxy operating commitment.

If you want to cancel before renewal, the cancel flow is in your member dashboard, and access continues to the current term-end. We won't fight the cancel button.

If you want to upgrade or change anything (e.g., switch to a cash referral payout, change email on file), drop a reply or update in the dashboard.

If everything's fine, ignore this email. The charge will go through, and you'll roll into Year 2.

— G
```

---

## Day 365 — Anniversary

Sent on the 1-year anniversary of subscription. Lighter than Day 180; serves as a brand-position reinforcement.

**Subject:** One year in Vault.
**Preheader:** A short thanks and what Year 2 looks like.

```
Hey [first name],

You've been in Vault for a year. That's notable.

A quick year-in-review from where I sit:

- You read ____ digests (out of ~52). [auto-pulled from open data]
- You attended ____ office hours. [auto-pulled]
- You posted ____ times in #vault-lounge. [auto-pulled]

None of those numbers is a benchmark. They're just the texture of the year.

Year-2 Vault stays mostly the same as Year-1 — the digest cadence, the monthly office hours, the quarterly review, the Discord. The changes are minor: [specific Year-2 changes, e.g., "the digest length budget is going up to 700-1000 words" or "office hours moves to second Tuesday + first Saturday"].

Your founding-member rate is locked for another year regardless of whether public Vault pricing moves.

If you want to renew silently, you already have. If you've already canceled or are about to, no hard feelings.

Thanks for being in the founding cohort. The seed of Vault culture is your first-year posts.

— G
```

---

## Cancel-flow message

Triggered when a member initiates cancellation in their dashboard.

**Subject:** Confirming your Vault cancellation
**Preheader:** A short note + access details.

```
Hey [first name],

Cancellation confirmed. Three quick notes:

1. Access continues through [current term-end date]. After that, your Vault role in Discord is removed and the gated pages stop showing for your account.

2. If you canceled because of a specific reason that Galaxy could fix, I'd value the read — reply to this email or drop in #vault-feedback before your access expires.

3. If you ever want to come back, the door's open. Public Vault pricing may differ from your founding rate, but founding-50 members get re-instated at the founding rate if you return within 12 months of cancel.

That's it. Thanks for the year.

— G
```

---

## Re-engagement (90 days after cancel)

Conditional. Only sent if:
- Cancellation was at term-end (not mid-term refund), AND
- Member did NOT cancel after expressing brand-position-incompatible feedback (e.g., "Galaxy doesn't publish enough picks"), AND
- 90 days have passed since cancel.

**Subject:** Vault year 2 — quiet check-in
**Preheader:** No urgency. Just a single update.

```
Hey [first name],

Quick note — wanted to share where Vault is 90 days after your subscription ended.

Year-2 of Vault now has:
- [Specific 2-3 changes that have happened since the member canceled]

If any of that lands as more interesting than what you experienced in Year-1, the door's open and your founding rate is honored for one more year if you return by [date].

If not — totally fine. Won't send another check-in.

— G
```

---

## Send rules + automation

| Day | Trigger | Conditional? | Garrett involvement |
|---|---|---|---|
| 30 | Absolute Day 30 from subscription start | No | None (auto-send from template) |
| 60 | Absolute Day 60 | Yes (engagement-gated) | None (auto-determines + auto-send) |
| 90 | Absolute Day 90 | No | None (auto-send) |
| 180 | Absolute Day 180 | No | Garrett reviews response inbox manually |
| 270 | (no send) | n/a | n/a |
| 335 | 30 days before renewal | No (always send) | None |
| 365 | Anniversary | No | Garrett can personalize manually for highest-engagement members |
| Cancel-confirm | Cancel triggered | No | Auto-fire on Stripe cancel webhook |
| Re-engage-90 | 90 days post-cancel | Yes (compatible-reason cancels only) | None |

---

## What these check-ins deliberately don't do

1. **Don't ask for testimonials.** Galaxy doesn't run public ratings or testimonial programs. The retention check-ins shouldn't either.
2. **Don't drive to a CTA.** Each check-in is informational + invitational. No "click here to upgrade" or "share this with a friend" pressure.
3. **Don't include referral CTAs in the same email.** Referral mentions live in their own dedicated communications (Day 30 + Day 90 referral notes per `vault-referral-program.md`). Keeping retention separate preserves the "I'm checking in because I care, not because I want something" frame.
4. **Don't include marketing about other Galaxy products.** No Almanac pre-order push, no Galaxy Live cross-sell. Vault retention is Vault retention.
5. **Don't quote Galaxy metrics or growth numbers.** Brand position: results speak through the work, not through marketing.

---

## Garrett's monthly retention review

Once Vault has >100 members, Garrett's last-Friday KPI review (see `audit/kpi-operator-ritual.md`) adds a 5-minute retention audit:

- Cancellations in the prior month (count + reason if surfaced).
- Members at Day 30 / 60 / 90 / 180 / 365 inflection points in the upcoming month — auto-listed in the cockpit.
- Engagement-gated Day 60 fires that fired in the prior month — review whether the email format works.

The retention audit produces signal that feeds back into:
- Voice deck refreshes.
- Decision log entries about Year-2 product direction.
- Welcome email sequence calibration (if Day-30 surfaces patterns indicating new members are surprised by something the welcome sequence should have prepared them for).

---

## Cross-references

- Codex's launch runbook (Days 0–7): `launch/vault-launch-runbook.md`
- Welcome email sequence (Days 0, 1, 3, 7, 14): `copy/vault-welcome-emails.md`
- Office hours playbook: `copy/vault-office-hours-playbook.md`
- Referral program: `copy/vault-referral-program.md`
- KPI ritual (monthly retention audit): `audit/kpi-operator-ritual.md`

---

*Retention is not won at month 12 when the renewal charge fires. It's won at month 1 when the member decides whether Vault is paying attention to them. These check-ins are calibrated to be present, not needy. Galaxy's brand can hold the discipline.*
