# Galaxy Vault — Edge Case Protocols

**Audience:** Garrett. Internal.
**Purpose:** Vault operations will surface edge cases the standard member-support playbook doesn't cover. The protocols below catalog the rare-but-real situations + the operational response.

**Note:** These protocols are referenced when situations arise; they aren't part of standard daily ops.

---

## Edge Case 1: Member disputes a Stripe charge via their bank

**Surface:** Stripe notifies Galaxy that a member has filed a chargeback dispute with their card-issuing bank. The dispute alleges: unauthorized charge, didn't receive product, or similar.

**Default response shape:**

1. **Don't fight a Vault chargeback automatically.** The brand-position calculus differs from typical SaaS.
2. **Reach out to the member first.** Personal email within 24h of the chargeback notification.

```
Subject: Re: Vault subscription

Hey [first name],

I noticed your bank filed a chargeback against Galaxy for your Vault subscription. Before this becomes a longer process, I wanted to reach out personally.

If the charge was unexpected — say, your card was used without authorization, or you didn't recognize the charge — let me know and I'll cancel + refund immediately. No questions.

If the charge was authorized but Vault didn't meet expectations, I'd rather refund you directly than dispute through the bank. The refund process is cleaner for both of us. Just reply and let me know what would help.

Either way, the goal is to make this easy.

— Garrett
```

3. **Outcome routing:**
   - Member confirms unauthorized → cancel + refund immediately; no further dispute.
   - Member confirms authorized but unhappy → refund directly; ask them to withdraw the dispute.
   - No member reply within 7 days → submit minimal evidence to Stripe (subscription record + welcome email + no cancellation request received). Don't fight aggressively.

**What Galaxy doesn't do:**

- Submit elaborate dispute evidence (screenshots of Discord posts, member activity logs, etc.) — the cost in time + relationship is higher than the value.
- Pursue the member legally for the disputed amount.
- Tag the member's email in any spam list or block list.

**Operational tracking:** Log in `templates/incidents.csv` with shape `chargeback_dispute`.

---

## Edge Case 2: Member's Discord behavior violates community standards but is non-Vault-related

**Surface:** A Vault member posts something in a Galaxy-adjacent space (different Discord server, Twitter, etc.) that Galaxy wouldn't tolerate in #vault-lounge — racial slur, harassment of another member, sportsbook promotion, etc.

**Default response shape:**

1. **The behavior happened outside Galaxy.** Galaxy doesn't directly police external behavior.
2. **The Vault membership is conditional on Galaxy community standards.** If external behavior crosses serious lines, the membership can be revoked.

**Severity-based response:**

| Severity | Behavior example | Response |
|---|---|---|
| Low | Tactical sports-betting talk on external surface | None. Galaxy doesn't police external Vault-unrelated activity |
| Medium | Promoting another sportsbook or outcome-promise service while being a Vault member | DM the member; ask them to not represent Galaxy in those contexts |
| High | Harassment of another Vault member in another space | Investigate; if substantiated, revoke Vault membership per `galaxy-discord-moderation-escalation.md` |
| Critical | Hate speech or threats against another member or Galaxy | Revoke immediately; document; notify if necessary per legal counsel |

**Sample DM (Medium severity):**

```
Hey [first name],

Quick note. I came across [external context] where you were [behavior]. No problem with the activity itself — that's your business — but I want to mention it because of the implicit association.

Galaxy's brand position is built on the absence of [the offending posture]. When a Vault member visibly does [the behavior] elsewhere, members + outsiders sometimes assume Galaxy has the same posture.

Could you avoid [behavior] in any context where you're identifiable as a Vault member? Not a rule — Galaxy doesn't have rules about your other activities — but a request for the brand-position reason above.

— Garrett
```

**Operational tracking:** Log in `templates/incidents.csv` with shape `external_conduct_concern`.

---

## Edge Case 3: Member shares Vault content publicly without permission

**Surface:** A Vault member screenshots a digest, Loss Room autopsy, or Pass List entry and posts it publicly (Twitter, Reddit, Discord servers) without permission. The brand integrity isn't damaged but the gated-content model is.

**Default response shape:**

1. **First instance:** Reach out personally. Educate, don't punish.
2. **Repeat:** Stronger conversation. Membership conditional on respecting gated-content boundary.
3. **Systematic resharing:** Membership revocation per `copy/vault-member-support-playbook.md`.

**Sample DM (first instance):**

```
Hey [first name],

I saw you shared [content] publicly. I want to mention it because Vault content is gated — members pay for access, and that gating is what keeps Vault working economically.

Couple options:
1. If you want to share the principle (e.g., what the Pass List concept means), the methodology page is publicly available — link there.
2. If you want to share specific picks or autopsies publicly, that goes outside the Vault model.

Could you take that down + use the methodology link instead? Not a punishment — just a brand-position thing.

Best,
Garrett
```

**Operational tracking:** Log in `templates/incidents.csv` with shape `content_resharing`.

---

## Edge Case 4: Member asks Garrett a personal question (life advice, career, etc.)

**Surface:** A member, often in DMs or email, asks Garrett something that isn't methodology-related: "Should I take this new job?" "How do you handle X in your relationship?" "I'm struggling with [personal issue]."

**Default response shape:**

1. **Galaxy isn't the right surface for this.** Garrett is operating a sports forecasting business, not a coaching practice.
2. **Respond warmly but redirect.** Acknowledge the trust; clarify the boundary.

```
Subject: Re: [their question]

Hey [first name],

Thanks for trusting me enough to ask. To be honest, I'm not the right person — I run Galaxy as a sports-forecasting business + member-community, but I'm not equipped to give [career / life / relationship] advice in any kind of structured way.

A few things I'd suggest:
- For [specific topic], [reputable resource or framework].
- If it's a heavy lift, a coach or therapist is the right path.
- If you just need to think out loud, the #vault-lounge is welcoming + lots of members have been there.

I appreciate the question + glad you're in Vault.

— Garrett
```

**Why this matters:**

- Garrett can't sustain personal-advice volume across a member base of any size.
- Galaxy's brand position is "method-led," not "guru-led." The personal-advice posture compromises it.
- Boundaries protect the member relationship long-term.

**Operational tracking:** No log needed. These DMs are conversational.

---

## Edge Case 5: Member offers Galaxy a partnership or business opportunity

**Surface:** A member emails or DMs Garrett with a partnership pitch: "I'd like to partner with Galaxy on [thing]" or "I run [business]; can we discuss collaboration?"

**Default response shape:**

1. **The member-relationship is the constraint.** Pursuing business deals with members complicates the trust dynamic.
2. **Default decline; allow rare exceptions.**

```
Subject: Re: Partnership idea

Hey [first name],

Thanks for the proposal about [thing].

To be honest, Galaxy has a hard time pursuing business partnerships with Vault members — the relationship dynamic gets muddied. You're a member; that's a relationship I want to protect from the awkwardness of also being a business counterparty.

I'd rather we stay member-to-operator on the Vault side + you build [your business] independently of Galaxy.

If there's a future state where [your business] needs Galaxy data or content at commercial scale + we're past Year-1, we can revisit. For now: hold + protect the simpler relationship.

— Garrett
```

**Exceptions:** Per `galaxy-partnership-evaluation-framework.md`, very rare partnerships might pass the criteria. Decline default applies; exceptions require decision-log entry.

**Operational tracking:** Log in `templates/incidents.csv` with shape `member_partnership_pitch`.

---

## Edge Case 6: Stripe processes a duplicate charge

**Surface:** Stripe edge case fires a duplicate subscription charge for a single billing cycle. Member sees two identical charges on their card.

**Default response shape:**

1. **Catch it as soon as the daily Stripe ops surfaces the duplicate.** Daily ops includes a Stripe charge review.
2. **Refund the duplicate immediately + email the member.**

```
Subject: Re: Vault subscription — duplicate charge

Hey [first name],

Quick note. Stripe processed a duplicate charge for your Vault subscription on [date]. I caught it in this morning's review + refunded the duplicate. The refund will land on your card within 3-5 business days.

The mistake was on the platform side — your subscription is otherwise normal.

Apologies for the confusion. If you don't see the refund within a week, just reply + I'll chase it.

— Garrett
```

**Operational tracking:** Log in `templates/incidents.csv` with shape `duplicate_charge`. Pattern-check if duplicates happen more than once per quarter.

---

## Edge Case 7: Discord server hits Stripe-Discord-role linking failure

**Surface:** Member completes Stripe checkout but the automation linking Stripe subscription to Discord role fails. Member is paying but can't see Vault channels.

**Default response shape:**

1. **Garrett's daily ops includes a role-assignment check.** Reconcile Stripe-paid-but-no-Discord-role members within 24h.
2. **Manual role assignment + apology + status update.**

```
Subject: Re: Vault — Discord access

Hey [first name],

Apologies for the slow Discord access. The automated role-assignment for new Vault members ran into [issue]. I've manually granted you the Vault role; you should now see all gated channels.

If you can't see the channels by tomorrow, reply + I'll dig deeper.

Thanks for the patience.

— Garrett
```

**Operational tracking:** Log in `templates/incidents.csv` with shape `discord_role_failure`. Document the underlying technical cause.

---

## Edge Case 8: Member's email auto-replies indicate extended absence

**Surface:** A Vault member's email auto-replies with "out of office until [date]" or similar. Galaxy may have time-sensitive communications (renewal reminders, etc.).

**Default response shape:**

1. **Don't escalate or send follow-up communications.** Wait for the absence window to end.
2. **Tag the member's account internally** as "delayed-communications until [date]."
3. **If renewal falls during the absence:** auto-renew per Stripe; member catches up after their return.

**No member-facing communication needed.** Galaxy doesn't acknowledge auto-replies as a normal course.

---

## Edge Case 9: Member's account compromised (account-takeover signal)

**Surface:** Activity suggests a member's email or Discord account has been compromised — posts unlike their voice, suspicious login patterns, member reports they didn't make recent communications.

**Default response shape:**

1. **Pause the account.** Suspend Discord role temporarily. Don't auto-renew next billing cycle.
2. **Contact member through a different channel.** If their Galaxy email is compromised, try their Twitter handle (if known) or any alternate contact.
3. **Resume access only after member confirms identity.**

**Sample contact (alternate channel):**

```
[Subject line varies by channel]

Hey [first name],

This is Garrett from Galaxy. I noticed some activity on your Vault account that may indicate it's been compromised. I've paused the Discord role + held the renewal as a precaution.

If this is in fact you + everything is fine: reply + I'll restore access.
If your account was compromised: let me know + I'll guide you through securing it.

— Garrett
```

**Operational tracking:** Log in `templates/incidents.csv` with shape `account_compromised`.

---

## Edge Case 10: Member's Discord activity in #vault-lounge crosses into sportsbook promotion

**Surface:** A Vault member starts posting affiliate links to sportsbooks or "use my code" promotional content in the Vault Discord.

**Default response shape:**

1. **The Vault Discord is a sportsbook-free zone.** Brand-position core requires it.
2. **First instance:** Delete the post + DM the member.

```
Hey [first name],

Quick note. I deleted your post about [sportsbook / affiliate]. Galaxy's brand position is that Vault is a sportsbook-affiliate-free space — that's the whole point of the brand position, structurally.

No problem with you running affiliate stuff on your own surfaces. Just not inside Vault.

A repeat would lead to membership revocation, so wanted to flag it now rather than later.

— Garrett
```

**Repeat:** Revoke membership per `copy/vault-member-support-playbook.md` Scenario 11.

**Operational tracking:** Log in `templates/incidents.csv` with shape `affiliate_promotion`.

---

## Edge Case 11: Vault digest email gets reported as spam by a critical mass

**Surface:** A Vault digest gets reported as spam by >2% of recipients in a single send. Email reputation could be at risk.

**Default response shape:**

1. **Pause subsequent automated sends.** Manual review of digest content + send list.
2. **Investigate root cause:** template change? list hygiene issue? digest content felt promotional?
3. **Fix before resuming.** Resume automation only after cause is identified.

**Operational tracking:** Email reputation logged in monthly KPI ritual per `audit/kpi-operator-ritual.md`. Spam-report rates above 0.5% trigger investigation.

---

## Edge Case 12: Member dies (handled separately)

See `copy/galaxy-deceased-member-protocol.md`. The deceased-member protocol is its own document because of the emotional + legal complexity.

---

## Edge Case 13: Member's account is associated with multiple cancellations / refund attempts (potential abuse)

**Surface:** A member signs up, cancels for refund within the 14-day window, signs up again with a slightly different email, repeats. This is rare but possible.

**Default response shape:**

1. **Galaxy honors the refund policy.** The 14-day refund is a real commitment.
2. **Flag the email pattern internally.** After the 2nd cycle, block future signups from that payment method or address pattern.
3. **Don't accuse publicly.** Just block + don't engage further.

**Operational tracking:** Log in `templates/incidents.csv` with shape `refund_abuse_pattern`. Documented but not escalated to formal action.

---

## When edge cases require lawyer engagement

Per `galaxy-contractor-playbook.md`, lawyer engagement for:

- Member legal threats (chargeback escalating to litigation).
- Account compromise that suggests platform-level breach.
- Defamation or threat in member communication.
- Estate / deceased-member complex refund routing.
- Any regulatory inquiry (gaming commission, state AG, etc.).

---

## Cross-references

- Vault member support playbook (the 12 standard scenarios): `copy/vault-member-support-playbook.md`
- Deceased member protocol: `copy/galaxy-deceased-member-protocol.md`
- Discord moderation escalation: `galaxy-discord-moderation-escalation.md`
- Crisis communications playbook: `galaxy-crisis-communications-playbook.md`
- Daily operations checklist: `galaxy-daily-operations-checklist.md`
- Contractor playbook (lawyer engagement): `galaxy-contractor-playbook.md`
- Partnership evaluation framework: `galaxy-partnership-evaluation-framework.md`
- KPI operator ritual: `audit/kpi-operator-ritual.md`

---

*Edge cases concentrate the operational complexity of running Vault. The protocols above keep Garrett from inventing the response each time + ensure consistency across rare-but-real situations.*
