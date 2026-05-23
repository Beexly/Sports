# Vault Member Support Playbook

**Audience:** Garrett (V1 — sole operator). Eventually: Vault community manager (V2, if hired).

**Scope:** Every member-facing support interaction Galaxy will face in the first 12 months of Vault. Each scenario has a triage step, a response script template, and an escalation rule.

**Pairs with:** Codex's `product/admin-operations-spec.md` (admin tooling) + `launch/vault-launch-runbook.md` (Days 0–7 operations) + `copy/vault-retention-checkins.md` (proactive outreach cadence).

---

## Foundational principles

Three rules that govern every support interaction:

### 1. Galaxy's response time commitment

- **Billing issues (Stripe-related):** same business day.
- **Access issues (Discord role, gated content not loading):** within 4 business hours.
- **Content questions (digest, methodology):** within 1–2 business days.
- **Refund requests:** acknowledge same day; resolve within 2 business days.
- **General feedback / complaints:** acknowledge within 2 business days.

These commitments are operator-tier when Vault has 50 members. They scale down (1-tier slower) automatically when Vault hits 1,000. Past 5,000, a dedicated community manager handles intake.

### 2. Response register — same Galaxy voice

Member support is a Galaxy public surface. Voice rules from `galaxy-brand-voice-canonical.md` apply:
- Personal but not casual.
- No exclamation marks.
- No banned vocabulary.
- "I" pronoun (Garrett is the support voice in V1).
- Plain language. Sentences end.

### 3. Honest by default

Galaxy's brand position depends on honesty under stress. When something goes wrong, the response that protects brand position is:
- Acknowledge what went wrong (specifically).
- Explain what we did about it (specifically).
- Don't promise what we can't deliver.
- Apologize without padding.

Do NOT:
- Blame the member.
- Pretend nothing happened.
- Over-promise to recover the situation.
- Use customer-service-template language ("We sincerely apologize for any inconvenience caused").

---

## Scenario catalog

### Scenario 1: Billing issue — Stripe declined card

**Triage:** Member emails or DMs about a failed payment. Confirm in admin cockpit: Stripe shows declined attempt. Subscription status = past_due.

**Response (within same business day):**

```
Subject: Re: [original subject]

Hey [first name],

Your Vault subscription showed a declined card attempt this morning. Stripe's note: [specific error — e.g., "insufficient funds" / "card expired" / "issuer declined"].

Quick fix: update the card on file in your member dashboard:
[direct link to billing settings]

Until the card updates, you keep Vault access through [date — Stripe retry window typically 3-7 days]. After that, the role drops automatically. If the card gets fixed before then, no interruption.

If you'd like to switch to a different payment method or pause your subscription rather than fix the card, just reply and let me know.

— Garrett
```

**Escalation:** If member doesn't update card within 5 days, send a single follow-up. After that, accept the lapse and re-engage per the cancel-flow message (per `copy/vault-retention-checkins.md`).

---

### Scenario 2: Access issue — Discord role not assigned after payment

**Triage:** Member confirms paid via Stripe but doesn't have Vault role in Discord. Check admin cockpit:
- Stripe shows charge success.
- VaultMember table shows member created.
- Discord bot logs show role-assignment attempt + result.

**Common causes:**
- Discord bot intermittent failure (most common).
- Member's Discord account uses different email than Stripe.
- Member hasn't joined the Galaxy Discord server yet.

**Response (within 4 business hours):**

```
Subject: Re: Vault Discord access

Hey [first name],

Sorry — looks like the Discord role didn't auto-assign. I've manually granted it now; you should see the new channels (#vault-lounge, etc.) within 5 minutes.

If you're not seeing them: confirm you're using the Discord account linked to [their Stripe email]. If those are different, let me know which Discord handle to grant.

This shouldn't have failed in the first place. We're checking the auto-assignment flow.

— Garrett
```

**Action:** manually assign role via Discord. Log incident in `templates/incidents.csv` for engineering investigation.

**Escalation:** If 3+ members report the same auto-assignment failure within a week, treat as P1 engineering issue; Codex investigates Stripe-Discord webhook flow.

---

### Scenario 3: Refund request — within 30-day window

**Triage:** Member requests refund within 30 days of subscription start. Per Vault terms, this is a no-questions-asked refund.

**Response (acknowledge same day, resolve within 2 business days):**

```
Subject: Re: Refund

Hey [first name],

Confirmed. I've processed the refund — $200 will land back on your card within 5-7 business days, depending on your bank.

Your Vault access ends today; Discord role removed, gated pages stop showing.

A couple of things if you have a moment:

1. If there was a specific reason Vault didn't work for you, I'd value the read. Reply to this email — it goes to me directly.

2. If you ever want to come back, the door's open. Founding-rate re-entry is reviewed case by case.

No follow-up after this. Thanks for trying it.

— Garrett
```

**Action:** Process refund in Stripe. Remove Discord role. Log in admin cockpit. Tag member as `refunded` for analytics.

**Escalation:** If refund volume in a month exceeds 5% of monthly subscriptions, treat as KPI signal — investigate root cause (price too high? Wrong audience? Bad expectations?).

---

### Scenario 4: Refund request — outside 30-day window

**Triage:** Member requests refund after 30 days. Per Vault terms, refunds outside 30 days are case-by-case at Garrett's discretion.

**Response (acknowledge same day, decide within 2 business days):**

Default policy: do NOT refund outside 30 days. Vault is an annual product; the discipline matters.

Exception circumstances where refund is honorable:
- Genuine technical issue (member couldn't access Vault for ≥7 cumulative days due to Galaxy's fault).
- Genuine personal hardship (member died, member's health, etc.).
- Vault sunset scenarios (Plan E from validation thresholds).

**Response template (default no-refund):**

```
Subject: Re: Refund request

Hey [first name],

I read your request. The 30-day refund window has passed, so I have to handle this case-by-case — Galaxy's policy is the annual subscription is for the year.

A few options:

1. Cancel renewal — easy and immediate. Access continues through your current term-end ([date]). Won't auto-renew.

2. Pause and resume later — if you tell me there's a specific reason this isn't working for you right now (busy season, content fit, etc.), I can pause the subscription for up to 60 days and resume at no charge after.

3. Partial refund consideration — if there's a specific Galaxy issue I should know about (technical access failure, broken commitment from my side), tell me and I'll evaluate.

Which fits your situation? Reply and we'll work it out.

— Garrett
```

**Response template (refund granted for exception):**

```
Subject: Re: Refund — processed

Hey [first name],

I'm processing a [partial / full] refund — $[amount] back to your card in 5-7 business days.

Refunding outside the 30-day window because: [specific reason]. This is exceptional, not standard policy.

Your Vault access [continues through paid term / ends today depending on circumstance].

If you ever return to Vault, founding-rate re-entry is reviewed case by case.

— Garrett
```

**Escalation:** Outside-window refunds get a decision log entry (DEC-NEXT-NNN-VAULT-REFUND) with the reason. Pattern check quarterly: if 3+ exception refunds for the same root cause, the policy may need adjustment.

---

### Scenario 5: Complaint about digest content (no concrete fix requested)

**Triage:** Member emails or posts in #vault-feedback that the digest isn't what they expected, isn't deep enough, is too long, etc.

**Response (within 2 business days):**

```
Subject: Re: [their subject]

Hey [first name],

Thanks for the read. Couple of things.

[Specific response to their specific complaint. Examples:

"You mentioned the digest is running long. That's fair feedback — I've been running on the 800-word end of the 500-900 target. I'll experiment with tighter versions over the next 4 weeks and see whether the room prefers it."

OR

"You mentioned the methodology references are too dense without context. That's signal. I'm thinking about adding a 'methodology refresher' section once a quarter that re-establishes the factor framework for readers who joined later."]

If you have a specific factor or topic you'd want more depth on, drop it in #vault-feedback. I'll read it and consider for upcoming digests.

— Garrett
```

**Action:** Log feedback in `templates/vault-feedback-themes.csv`. If pattern emerges (3+ members raise same concern), it becomes a digest topic or office hours discussion.

**Escalation:** None. This is what #vault-feedback exists for.

---

### Scenario 6: Complaint that Galaxy "promised picks" and didn't deliver

**Triage:** Rare. Member misinterpreted Vault as a picks tier. Either the landing copy failed (real Galaxy issue) or the member didn't read it (their issue).

**Response (within 2 business days):**

```
Subject: Re: [their subject]

Hey [first name],

I want to be clear about Vault, because if there's misunderstanding on what it includes, that's important to surface.

Vault does not include additional picks beyond what the public Galaxy site publishes. The public site publishes ~5 picks per day at Pro and Elite tiers. Vault membership doesn't unlock more picks or earlier picks.

What Vault DOES include:
- Weekly internal-rationale digest (the reasoning behind a publication).
- Monthly group office hours.
- Quarterly private data review.
- Early access to the Model Journal draft.
- Vault-only Discord channel.

If you joined Vault expecting more picks, that's a misunderstanding I want to fix. Two options:

1. If Vault as actually structured isn't a fit, I'll process a full refund regardless of window. Just say the word.

2. If you'd like to give it a fair shake now that you know exactly what's in it — totally fine. Reply and let me know.

— Garrett
```

**Action:** If the misunderstanding pattern shows up 2+ times, the landing page copy isn't doing its job. Run the voice deck audit using `week-minus-1/08-voice-deck-template.md` against `copy/vault-landing-page.md`.

**Escalation:** None unless the pattern compounds.

---

### Scenario 7: Member wants to upgrade from another tier (Pro → Vault, Elite → Vault)

**Triage:** Stripe upgrade flow handles this in admin cockpit. Member-facing flow may be unclear in V1.

**Response (within 4 business hours):**

```
Subject: Re: Upgrade to Vault

Hey [first name],

Easy. Two ways to handle this:

1. Cancel your current [Pro / Elite] subscription, then sign up for Vault separately. You'll get pro-rated credit for the remaining time on your current tier.

2. I can do it manually from my admin side. If you reply confirming, I'll move you to Vault directly. The pro-rated credit from your current tier applies. You'll see one final charge for the difference, then renewals from there are $200/year.

Either way, your Discord role updates within 5 minutes of the change.

— Garrett
```

**Action:** Stripe upgrade flow. Confirm Discord role updates. Send welcome sequence Email 1 (per `vault-welcome-emails.md`) if member hasn't seen it before.

**Escalation:** None.

---

### Scenario 8: Member wants to downgrade from Vault

**Triage:** Stripe handles downgrade. Confirm what tier they want.

**Response (within 4 business hours):**

```
Subject: Re: Downgrade

Hey [first name],

Confirmed. A few notes:

1. I can switch you to [Pro / Elite] effective at your current term-end. The Vault Discord role drops at that point; you keep your standard subscriber access at the new tier.

2. If you'd prefer to leave Vault now (with refund for the unused portion of the year), I can do that instead. You'd return to whatever tier you were on before Vault, or to free if you came in fresh.

3. If there's a specific reason Vault didn't work for you, I'd value the read.

Reply with which approach fits. I'll handle it from there.

— Garrett
```

**Action:** Either schedule downgrade for term-end or process partial refund + downgrade. Log in admin cockpit.

**Escalation:** None.

---

### Scenario 9: Member complains about Discord moderation

**Triage:** Member feels they were moderated unfairly. Possibly:
- Garrett deleted their post.
- Garrett DM'd them about a rule violation.
- Another member reported them.

**Response (within 2 business days):**

```
Subject: Re: Discord

Hey [first name],

Thanks for raising this directly. Let me walk through what happened on my end:

[Specific, honest description of the moderation action and reason. Examples:

"You posted a betslip image in #vault-lounge yesterday. The channel rule against tail-trading is the easiest one to forget, and I deleted the post without flagging it to you first — that was a misstep on my side. I should have DM'd you with the heads-up rather than just deleting. Sorry about that."

OR

"Your reply to [other member] crossed into personal territory rather than substantive disagreement. I asked you to rephrase via DM. I stand by that ask, but I want to make sure you felt heard — your underlying point about the methodology was valid. Would you rephrase and repost?"]

If you think I got this wrong, push back. The Vault Discord rules are public (pinned in #vault-lounge) and I'm not infallible. I'll reconsider.

— Garrett
```

**Action:** Log in moderation log. If pattern emerges (e.g., Garrett over-moderating), audit the moderation playbook from `vault-discord-launch-pack.md`.

**Escalation:** Repeated moderation issues with same member → consider whether Vault is the right fit. Honest conversation, not removal.

---

### Scenario 10: Member raises competitive intelligence ("I saw Outlier do X")

**Triage:** Member is volunteering competitive observation. Not a support issue, but a brand-position moment.

**Response (within 2 business days):**

```
Subject: Re: [their subject]

Hey [first name],

Appreciated. I track competitor moves in the same way you do — public surfaces. I won't comment specifically on [competitor]'s product decisions because I don't know their internal reasoning.

What I can say:

[Brand-aligned counter-position, NOT competitor-dismissive. Example:

"Galaxy's bet is that publication restraint + transparency compound differently over time than feature breadth does. Whether that's right won't be clear for another 18-24 months. In the meantime, the work is the work."]

If competitor moves change your read of Galaxy's positioning, the Vault Discord is the right place to argue it. I'm wrong sometimes.

— Garrett
```

**Action:** Cross-reference with `copy/outlier-competitive-battlecard.md`. If member's observation surfaces a real competitive threat (e.g., Outlier launched a Loss Room equivalent), update the battlecard and flag for strategic re-evaluation.

---

### Scenario 11: Member tries to use Vault for picks they're sharing externally

**Triage:** Member is screenshotting Vault digests, posting Vault-only content to public Twitter/Discord. Breach of confidentiality.

**Response (within 24 hours):**

```
Subject: Re: Vault content sharing

Hey [first name],

Quick note. I saw the [tweet / Discord post / Substack mention] where you shared the [specific Vault content — e.g., this week's digest analysis].

Vault content is members-only by design. The whole product depends on the room being able to discuss things that wouldn't be appropriate in public — internal rationale, methodology specifics that aren't on the public site, members' own honest losses.

Would you mind taking down the [tweet / post]? No public conversation needed; I'm asking directly, member to operator.

If there's something in Vault content that you think DOES belong on Galaxy's public surfaces, that's a real question. Drop it in #vault-feedback. Some material does graduate from Vault to public (that's how the methodology page gets updated, for example).

— Garrett
```

**Action:** If member complies → no further action. If member doesn't comply within 7 days → second DM with explicit notice. If still no compliance → remove Vault role + prorated refund. Decision-log entry.

**Escalation:** Pattern matters. First instance → soft. Second instance → strict. Third instance → role removal.

---

### Scenario 12: Member receives renewal charge without expected pre-warning

**Triage:** Member surprised by $200 renewal charge. Galaxy committed to 30-day pre-warning per `copy/vault-retention-checkins.md` Day 335 email.

**Response (within same business day):**

```
Subject: Re: Vault renewal

Hey [first name],

You're right — you should have received a renewal heads-up email 30 days before the charge. If you didn't, that's a Galaxy operational miss, not yours.

A couple of options:

1. If you want to continue Vault: nothing more required. Your Year-2 subscription is active.

2. If you want to cancel (because the renewal caught you off guard): I'll refund the full $200 and convert you to month-to-month at a $20/month rate so you can decide whether to continue at your own pace. Cancel any month, no questions.

3. If you want to step away entirely: full refund, role removed at end of current term, founding rate honored if you return within 12 months.

Reply with which fits. Sorry about the missed heads-up — I'm checking why the Day-335 email didn't fire for you.

— Garrett
```

**Action:** Audit Day-335 send log. If genuine system failure → engineering ticket. If member opted out of emails (rare) → note exception in member profile.

**Escalation:** If 2+ members report missed Day-335 emails in a month, treat as P1 — the retention check-in system is failing.

---

## Triage decision tree (when an inquiry arrives)

```
1. Is it a billing issue affecting access?
   YES → respond same business day (Scenarios 1, 2, 12)
   NO → continue

2. Is it a refund request?
   YES → acknowledge same day, resolve within 2 days (Scenarios 3, 4)
   NO → continue

3. Is it a tier change (up/down)?
   YES → respond within 4 hours (Scenarios 7, 8)
   NO → continue

4. Is it content-related or feedback?
   YES → respond within 2 business days (Scenarios 5, 6, 9, 10)
   NO → continue

5. Is it a brand-position issue (sharing content, moderation, etc.)?
   YES → respond within 24 hours (Scenarios 9, 11)
   NO → escalate to Garrett's discretion
```

---

## What support tools Garrett uses

V1 (operator-tier):
- Stripe dashboard for billing.
- Discord admin tools for role management.
- Galaxy admin cockpit (per `product/admin-operations-spec.md`) for member lookup + cancellation + entitlement.
- Email inbox (garrett@galaxysportsedge.com) — primary intake channel.
- `#vault-feedback` Discord channel — secondary intake channel.

V2 (community-manager-tier, if Vault hits 1,000):
- Shared inbox between Garrett + community manager.
- Helpdesk tool (Zendesk Essential / Help Scout) for ticket routing.
- Decision-tier escalation matrix.

---

## Tracking + analytics

Garrett's monthly KPI review (per `audit/kpi-operator-ritual.md`) adds a support-volume check:

| Metric | Target |
|---|---|
| Refund rate | <5% of monthly subscriptions |
| Average response time (billing) | <8 hours |
| Average response time (content/feedback) | <48 hours |
| Member-reported access failures | <2 per month |
| Repeat support requests from same member | <5% of members |
| Members who churn after support interaction | <10% |
| Refunds outside 30-day window | <1 per quarter |
| Decision-log entries triggered by support | tracked but not capped |

Above thresholds → investigate root cause.

---

## What this playbook deliberately doesn't include

1. **No automated chatbot responses.** Galaxy is small enough that human responses are the brand standard.
2. **No tiered support based on member spend.** Founding-50 don't get faster response than Day-180 members.
3. **No formal SLA contracts.** Galaxy's response time commitments are operational, not contractual.
4. **No outsourced support.** V1 + V2 are operator + community-manager-only. No call center.
5. **No "loyalty" tier discounts for long-term members.** Vault doesn't discount over time. Founding rate is the only enduring price benefit.

---

## Cross-references

- Admin cockpit: `product/admin-operations-spec.md`
- Stripe webhook handling: `product/webhook-and-integrations-spec.md`
- Discord moderation playbook: `copy/vault-discord-launch-pack.md` § moderation
- Retention check-ins (proactive outreach): `copy/vault-retention-checkins.md`
- Voice rules: `galaxy-brand-voice-canonical.md`
- KPI thresholds: `04-kpi-decision-rules.md` + `audit/kpi-operator-ritual.md`

---

*Support is a brand surface. Every interaction either reinforces Galaxy's restraint + honesty position or weakens it. Galaxy doesn't have "customer support best practices"; it has the same operating discipline applied to support that applies to publication. Read this playbook before answering when stressed.*
