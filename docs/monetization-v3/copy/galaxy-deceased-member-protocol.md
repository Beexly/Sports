# Galaxy Deceased Member Protocol

**Audience:** Garrett. Internal.
**Why this exists:** Subscription businesses inevitably face member-death scenarios — a Vault member passes away during their subscription term. Galaxy's brand position requires honoring this with care + restraint. The protocol below is the operational + emotional framework.

**Note:** This is the protocol for the rare-but-real case. Most years, this protocol won't fire. When it does, Garrett needs it.

---

## How the situation typically surfaces

Galaxy may learn of a member's death through:

1. **Family or friend notification.** Someone in the member's life emails `garrett@galaxysportsedge.com` to inform Galaxy.
2. **Stripe payment failure.** Member's card is canceled (deceased's accounts are often closed); renewal charges fail.
3. **Indirect signal.** Member's Discord account goes inactive + email bounces.
4. **Public notification.** Galaxy sees member's obituary or social-media memorial.

Method (1) is most common + most actionable.

---

## Immediate response (within 24 hours of learning)

If Galaxy learns through family/friend notification:

### Response email

```
Subject: Re: [original subject]

Dear [first name of notifier],

Thank you for letting me know. I'm sorry for your loss.

I'm Garrett, founder of Galaxy. [Member's first name] was one of our Vault members, and the fact that someone is reaching out on their behalf tells me they were the kind of person we hoped Vault would attract.

Practically, here's what I'd like to do:

1. Cancel [member's first name]'s Vault subscription effective immediately. The Stripe card on file will not be charged again.

2. Refund the prorated unused portion of the current year. The refund will land on the original card within 5-7 business days. If the card is closed, Stripe routes the refund per their standard process; if there's an issue, please let me know and we'll find an alternative.

3. Preserve [member's first name]'s Discord history if you would like a copy. I can export their public posts in #vault-lounge and the digest archives they had access to, in PDF or JSON format. This is optional and at your discretion; it's also fine if you'd rather not.

4. Remove [member's first name]'s Discord role at term-end (or sooner if you'd prefer). The Vault channels will no longer show for their account.

If you have specific wishes about what happens to [member's first name]'s Galaxy account, please let me know. The default is the above; everything is adjustable.

If there's anything else I can do — within what's possible from Galaxy's side — please reply.

With sincere condolences,
Garrett
```

### Operational steps within 24 hours

- Cancel the subscription in Stripe.
- Mark VaultMember status as "deceased" (internal tag for analytics; not visible publicly).
- Process the prorated refund.
- Note in `templates/incidents.csv` for reference.
- Discord role removed at term-end (or earlier if family requested).

### What Galaxy does NOT do

- Post publicly about the member's death (unless family explicitly requests + Galaxy verifies the family's wishes).
- Send the standard cancel-flow email (per `copy/vault-retention-checkins.md` § Cancel-flow). The deceased-member response is different.
- Send the standard re-engagement email (Day-90 post-cancel) to the deceased's address.
- Tag the deceased's account for marketing follow-up of any kind.
- Tell other Vault members about the situation unless family explicitly permits.

---

## If Galaxy learns through indirect signal

If Galaxy detects payment failure + bounce-back email + Discord inactivity, but no family notification:

### Initial reach-out

After 14 days of failed payment + bounced emails:

```
Subject: Re: Vault subscription

Hey [first name],

I noticed your Vault subscription's renewal payment didn't go through, and the emails I've sent in the past 14 days have bounced. I wanted to make sure everything's OK on your end.

If you've decided to step away from Vault — no problem. Stripe will stop retrying after [N attempts] and the subscription will lapse.

If you're seeing this email and didn't intend to cancel — let me know how to reach you and we'll get things sorted.

If there's something I should know about that I'd not be aware of — also reply, even just a few words.

— Garrett
```

If no response within 30 days of the original failed payment + the bounce: Galaxy assumes the relationship has ended (could be death, could be other reasons; Galaxy doesn't assume). Subscription auto-cancels per Stripe's standard flow.

### What Galaxy does NOT do

- Cold-call or text the member.
- Reach out to family members through public records.
- Speculate about why the member is unreachable.
- Add the member to any re-engagement campaign.

The default posture is: respect the member's apparent decision. Galaxy doesn't chase.

---

## If Galaxy learns through public signal (obituary, etc.)

If Galaxy sees public notice that a member passed away:

- Do NOT publicly acknowledge in Galaxy channels unless family explicitly requests.
- Reach out to the family if there's a clear contact path — express condolences + offer the practical steps above.
- If no contact path exists: process the subscription per indirect-signal protocol.
- Do not name the member in any Galaxy public surface unless family explicitly consents.

---

## Member memorial requests

If family asks Galaxy to acknowledge the member publicly:

- Galaxy can post a brief note in #vault-lounge (Vault-only) if the deceased was a Vault member with public Vault posts. The note is restrained, names the member only if family permits, and respects member privacy.
- Galaxy does NOT post on @GalaxySportsAI Twitter (public surface) without family explicit written consent + a specific request.
- Galaxy may include the member in a year-end annual report acknowledgment IF the family explicitly opts in.

### Sample Vault-only memorial post

```
A quiet note for the room.

A Vault member passed away. [If family approves naming: their name was [name]; otherwise: the family has asked we keep details private.]

They were part of the founding cohort and their posts in #vault-lounge contributed to the conversations many of us continued. The family has asked we acknowledge them here, briefly, and that's what this post is.

If you knew them and want to share something, this thread is the place. Otherwise: a quiet moment.

— Garrett
```

The post is restrained. No flowers. No sentimentality beyond what the situation deserves. Galaxy honors the loss without performing grief.

---

## Privacy + practical considerations

### Member data

The deceased member's data is retained per `galaxy-data-retention-privacy-policy.md`:
- Subscription record retained for 7 years per tax/legal requirements (Stripe).
- Personal data deleted within 12 months of subscription end (if family doesn't request specific retention).
- If family requests data export: Galaxy provides per the standard portability protocol.

### Refund logistics

Stripe handles refunds to closed cards via their standard reverse-routing process. If the original card is genuinely uncloseable to refund:
- Galaxy can issue a check to the family if they provide a forwarding address + name.
- Galaxy can route the refund to a designated executor or estate per family's documentation.
- Lawyer consulted per `galaxy-contractor-playbook.md` if estate processing becomes complex.

### Founding-50 status

If a founding-50 member passes away during Year-1: their founding number is preserved in Galaxy's historical record. The next available founding number is NOT reassigned to a new member; the founding-50 numbering remains 1-50 with the deceased's number permanently held.

This is brand-aligned. The founding cohort is a fixed reference point in Galaxy's history; deceased members remain part of that history.

---

## What this protocol deliberately doesn't do

1. **No required disclosure.** Galaxy doesn't require family to provide a death certificate or any documentation to process the response above.

2. **No marketing-tone language.** The deceased-member response is somber, not corporate.

3. **No public communication unless family explicitly approves.** Member privacy continues posthumously.

4. **No "celebration of life" pages on Galaxy.** Galaxy is not a memorial platform.

5. **No financial discount or extension offered to family.** The refund is the refund.

---

## Operational tracking

Galaxy logs deceased-member incidents in `templates/incidents.csv`:

```
date,incident_type,member_id_hashed,status,family_communication,refund_processed,decision-log
2026-XX-XX,deceased_member,[hash],resolved,family responded with thanks,Yes,DEC-NEXT-DECEASED-001
```

The log is private. Year-end annual report may reference the count of deceased-member incidents (anonymized aggregate) if Galaxy wishes to be honest about the full member experience.

---

## When to consult the lawyer

- Estate processing for refunds that exceed simple Stripe reverse-routing.
- Family disputes about member data access (rare but possible).
- Member's social media posts about Galaxy that the family wants removed.
- Any legal claim arising from the deceased's membership.

Lawyer engagement per `galaxy-contractor-playbook.md`.

---

## When to consult member support

The protocol above is Garrett-handled. The community manager (Year-2+ hire) inherits this protocol when hired but does NOT handle the family-communication step alone — Garrett remains the primary respondent for deceased-member situations.

---

## Cross-references

- Member support playbook: `copy/vault-member-support-playbook.md`
- Retention check-ins (the standard cancel-flow that this protocol REPLACES for deceased members): `copy/vault-retention-checkins.md`
- Data retention + privacy policy: `galaxy-data-retention-privacy-policy.md`
- Contractor playbook (lawyer engagement context): `galaxy-contractor-playbook.md`
- Founder resilience (this protocol involves Garrett's emotional handling): `founder-resilience-playbook.md`

---

*Member loss is the rarest + saddest situation Galaxy will face. The protocol above is the operating + emotional discipline that turns the situation into one Garrett can honor with restraint. Honor the loss; honor the family; honor the brand position.*
