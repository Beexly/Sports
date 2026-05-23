# Galaxy Crisis Communications Playbook

**Audience:** Garrett. Internal. Used when something goes wrong publicly or operationally.

**Why this exists:** Low-probability events have high-stakes outcomes. A single mishandled crisis can erase years of brand depth. The playbook below pre-scripts the response to the most likely categories so Garrett doesn't have to invent under stress.

**Reading time:** 8 minutes the first time. <2 minutes per scenario lookup after that.

---

## Foundational principles

Four rules govern every crisis response:

### 1. Speed matters less than honesty

In a crisis, the urge is to respond fast. Resist that for 60 minutes. The first response will be re-read and quoted for months; the 60 minutes spent making it right is the highest-leverage 60 minutes Galaxy will spend that month.

The exception: clear safety / legal issues (data breach, court-ordered disclosure) require notification within specific timeframes by law. Those override the 60-minute rule.

### 2. Acknowledge what's specifically wrong, not what's generally concerning

"We hear your concerns about Galaxy" is not an acknowledgment. "We published a 64% confidence call that lost on a back-door cover, and the autopsy is in the Loss Room" is an acknowledgment.

The crisis communication discipline is the same as the Loss Room discipline: specific, factual, no hedging.

### 3. Don't argue with critics. Demonstrate.

When Galaxy is criticized publicly, the temptation is to respond with arguments. The brand position rejects this. Galaxy responds by pointing to artifacts (the methodology page, the Loss Room, the Pass List) rather than by constructing counter-arguments.

The reader assesses by looking at what Galaxy did, not by reading what Galaxy says.

### 4. The brand position survives one crisis. It doesn't survive a pattern of bad responses.

A single crisis handled poorly is recoverable if Galaxy publicly acknowledges what went wrong with the response. A pattern of crises handled poorly is the brand position collapsing.

Each crisis response is also brand-discipline data. Garrett tracks crisis responses in `templates/crisis-log.md` so patterns become visible.

---

## Crisis Category 1 — Production outage

**Definition:** Galaxy's public site is down. Or the Vault Discord bot fails to assign roles. Or the Stripe webhook misses signal. Or the Loss Room shows stale data.

**Severity tier:**
- **P1 — full site down** for >30 minutes during business hours, or for >2 hours overnight.
- **P2 — major feature down** (Discord role assignment failing, Stripe webhook lagging) for >2 hours during business hours.
- **P3 — minor issue** (a single page rendering wrong, a single member's role missing).

### P1 outage protocol

**Within 5 minutes of detection (Garrett or Codex monitoring):**
- Codex (or hosting platform) is alerted via existing monitoring.
- Garrett is paged via existing on-call system.

**Within 30 minutes (Garrett's first response):**
- Post in #vault-lounge: short status update + acknowledgment.
- Tweet from @GalaxySportsAI: same status update.
- Email all paid subscribers: same status update.

**Status update template (P1):**

```
Quick note: Galaxy's [specific surface] is currently down. We saw the issue at [time]. We're investigating.

This isn't a known issue we were waiting on. It's a real outage and we don't yet know how long the fix will take.

I'll post an update within 60 minutes. If we don't have a clear ETA by then, I'll say so directly.

— Garrett
```

**Within 60-90 minutes — second update:**

Either an "all clear" with details, or "still working on it, here's what we know."

```
Update on the outage from [earlier time]:

What we found: [specific technical explanation in plain language].
What we're doing: [specific recovery steps].
What's affected: [specific list of impacted surfaces].
What's not affected: [specific list].

Next update: by [time].

— Garrett
```

**Within 24 hours of resolution — post-mortem:**

A short retrospective published in the Galaxy Discord + Twitter + member email:

```
Subject: Yesterday's outage — what happened, what we're changing

Hey [first name],

Yesterday's outage on [surface] lasted [N minutes]. Here's the honest version:

What happened: [specific cause].
Why it happened: [root cause analysis].
What we changed: [specific changes shipped to prevent recurrence].
What stays the same: [acknowledge that some causes can't be prevented; explain why].

If your Vault access was affected during the outage — sorry. Refunds for outage time are processed automatically; you don't have to ask.

If you noticed something during the outage I should know — reply to this email.

— Garrett
```

The outage post-mortem is brand-aligned. Members appreciate the transparency more than they're frustrated by the outage.

### P2 outage protocol

- Within 15 minutes: Codex (or platform) is alerted; Garrett receives notification.
- Within 1 hour: status update via Discord + Twitter + email.
- Within 4 hours: resolution or second update.
- Within 24 hours of resolution: post-mortem (lighter than P1 — single tweet + Discord post).

### P3 outage protocol

- Codex investigates within 8 business hours.
- No public communication unless members complain.
- If members complain: Garrett's email response acknowledges, fixes, and follows up.

---

## Crisis Category 2 — Major loss backlash

**Definition:** Galaxy publishes a call at high confidence (≥70%). The call loses. Member backlash + social media pile-on follows.

Most losses don't trigger backlash. The triggering combination is: high confidence + clean loss + member feeling betrayed.

### The 24-hour protocol after a high-stakes loss

**Hour 0-2 (game settles, loss confirmed):**
- Ledger updates automatically.
- Autopsy queued for publication within 24-48 hours per `loss-room-page-copy.md`.

**Hour 2-12 (member sentiment forms):**
- Garrett monitors Vault Discord. Some members will be upset.
- Garrett does NOT post a defensive response. The autopsy will do the explaining.

**Hour 12-24 (autopsy publishes):**
- The autopsy is the response. Specific factor breakdown. Honest assessment of process vs variance.
- Garrett also posts a single short note in #vault-lounge linking to the autopsy:

```
The autopsy for [game] is up: [link]. Tagged [root cause].

If you want to walk through it in office hours next Tuesday, drop questions in #vault-feedback before then.

If you took a position on this and want to talk through what happened: this isn't customer support; this is the conversation Vault is for. Discord lounge is the place.

— G
```

**Hour 24-72 (member responses):**
- Garrett engages with member responses individually.
- For brand-aligned criticism: acknowledge + reference autopsy + invite continued conversation.
- For non-brand-aligned criticism ("you should have known," "this is a tout-shop pattern"): redirect to the autopsy. Don't argue.

### When backlash spreads beyond Vault

If the loss becomes a public conversation (Twitter, sports betting Discords, podcast mentions) within 7 days:

**Day 1-3:**
- Garrett does NOT defend Galaxy on the public stage. The autopsy is the defense.
- Garrett does NOT engage critics by name in tweet threads.
- Garrett's only public communication is a single tweet linking to the autopsy:

```
Autopsy for this week's [game] loss: [URL]

If the loss is reasonable from the autopsy's reasoning, the publication discipline worked. If the loss reveals a structural issue, the next model version ships with the fix. The autopsy explains which.

— Garrett
```

**Day 3-7:**
- If the public conversation continues, Garrett may write a longer Model Journal entry that addresses the backlash thematically (without naming specific critics).
- If a journalist reaches out: Garrett responds per `galaxy-press-kit.md` protocols.

**Day 7+:**
- The conversation either fades (most cases) or escalates to a hit-piece.

### Brand-position discipline during backlash

The temptation during backlash: defend, explain, counter-argue. Galaxy's discipline rejects all three.

What Galaxy does during backlash:
- Publish the autopsy.
- Acknowledge member-specific concerns in Discord.
- Continue normal publication cadence.
- Track the autopsy's reception in `templates/crisis-log.md`.

What Galaxy does NOT do:
- Issue a public defense.
- Argue with critics on social media.
- Promise the loss won't recur.
- Refund members who weren't refunded under standard policy.

---

## Crisis Category 3 — Hit-piece / negative press

**Definition:** A journalist publishes a piece critical of Galaxy. The piece may be factually correct, factually incorrect, or somewhere in between.

### The 48-hour response protocol

**Hour 0-2 (piece published):**
- Garrett reads the piece in full. Twice.
- Does NOT respond on social media immediately. Does NOT email the journalist.

**Hour 2-6:**
- Garrett identifies which claims in the piece are:
  - Factually correct (must be acknowledged).
  - Factually incorrect (must be corrected — but politely).
  - Opinion / interpretation Galaxy disagrees with (do not respond).

**Hour 6-24:**
- Garrett drafts the response. Three possible response paths:

**Path A — Substantive correction (only if factual error).**

Email the journalist:

```
Hi [name],

I read your piece on Galaxy with interest. One factual point worth noting:

[Specific factual error] — [the actual fact, with reference].

Otherwise, I respect the perspective you took. Galaxy's brand position invites criticism, and your piece raises [X / Y] which are worth thinking about even where I'd interpret them differently.

If you'd like to do a follow-up that engages those questions directly, I'm available.

— Garrett
```

**Path B — Public response (only if the error is material and uncorrected).**

A single tweet from @GalaxySportsAI:

```
The recent piece on Galaxy at [outlet] includes [specific factual claim that's incorrect]. The actual data is at [Galaxy URL]. We're working with the outlet on a correction.

Our public methodology, Loss Room, and Pass List answer most of the substantive questions in the piece. If you have specific concerns, the methodology page is the first place to look.

— Garrett
```

**Path C — No response (most common).**

If the piece is opinion-driven and doesn't contain factual errors: Galaxy does nothing publicly.

Galaxy's brand-position discipline: silence in the face of opinion criticism is the most honest response. The Loss Room + Pass List + methodology page are Galaxy's evidence.

If members ask about the piece in Vault Discord: Garrett responds with one sentence linking to the relevant Galaxy surface (Loss Room or methodology), then doesn't elaborate.

### What Galaxy does NOT do

- Mass-email members about the piece.
- Issue a public press release responding to the piece.
- Engage in extended Twitter thread debate with the journalist.
- Threaten legal action (except in egregious defamation cases, which would require lawyer engagement first).
- Take down or alter Galaxy's existing public surfaces in response.

### When the piece warrants legal review

The lawyer engagement triggers when:
- The piece contains explicitly false statements presented as fact.
- The piece misrepresents Galaxy's brand position in a way that could affect subscriber decisions or partner relationships.
- The piece contains personal accusations about Garrett that go beyond business critique.

Galaxy's lawyer (per `galaxy-contractor-playbook.md`) advises on whether legal response is warranted. Most cases: no. The brand discipline is to absorb critique rather than escalate.

---

## Crisis Category 4 — Member-data breach

**Definition:** Member data (email addresses, subscription information, Discord IDs) is exposed beyond Galaxy's intended access.

This is the highest-stakes crisis category. Mishandling breach response is grounds for regulatory action and existential brand damage.

### The 72-hour breach protocol

**Hour 0-2 (breach detected or reported):**
- Codex (or Garrett, depending on detection path) immediately isolates the affected systems.
- Garrett notifies the lawyer per `galaxy-contractor-playbook.md`.
- Galaxy stops processing new member data until breach is contained.

**Hour 2-12:**
- Galaxy assesses the scope of the breach:
  - What data was exposed?
  - How many members are affected?
  - How was the breach detected (and could it have been detected earlier)?
  - Is it ongoing or contained?

**Hour 12-48:**
- Galaxy notifies affected members via email:

```
Subject: Galaxy security incident — what happened

Hey [first name],

I have to write a hard email. Galaxy experienced a security incident affecting member data. I want to be specific about what happened and what it means for you.

What happened: [specific incident description].
What data was affected: [specific list].
What data was NOT affected: [specific list].
When it happened: [date / window].
When we detected it: [time / how].

What we've done:
- [Specific containment actions].
- [Specific notification to affected members].
- [Specific changes to prevent recurrence].

What you should do:
- [Specific actions — e.g., reset password, check Discord settings].
- [Watch for specific signs of misuse].

What this means for your subscription:
- [Specific implications for billing, access, refund eligibility].

I'm working with our lawyer on the formal regulatory notifications. If you need to talk to me about this, reply to this email — it's the most direct line.

I'm sorry this happened. This isn't a case where I can claim "we did everything right." Galaxy's responsibility is to handle member data with discipline; that discipline failed in this case.

— Garrett
```

**Hour 48-72:**
- Galaxy files regulatory notifications per jurisdiction (US: depends on which state; CCPA for California members; etc.).
- Galaxy publishes a public post explaining the breach (without naming specific affected members).
- Garrett engages with member responses individually.

### Brand-position discipline during a breach

The temptation during a breach: minimize, blame third parties, claim "no data was accessed" without verification.

Galaxy's discipline:
- Acknowledge what happened factually.
- Don't minimize. Use the language a forensic auditor would use.
- Don't promise things that can't be verified ("no data was misused" → can only be verified over time).
- Take ownership of the security posture as Galaxy's responsibility.

What Galaxy does NOT do during a breach:
- Issue marketing-style "we take security seriously" statements.
- Promise specific compensation before legal review.
- Engage critics on social media.
- Block public conversation about the breach.

---

## Crisis Category 5 — Regulatory inquiry

**Definition:** A regulator (SEC, FTC, state gaming commission, etc.) contacts Galaxy with questions about operations.

Most regulatory inquiries are routine. Some are not. The protocol is the same regardless.

### Hour 0-4 (inquiry received):

- Garrett does NOT respond directly to the regulator without lawyer review.
- Garrett notifies the lawyer immediately.
- Garrett preserves all relevant Galaxy data (no deletions, no edits to historical surfaces).

### Hour 4-72:

- Lawyer responds to the regulator within the deadline specified in the inquiry.
- Galaxy provides requested information through lawyer.
- Galaxy makes NO public statements about the inquiry unless legally required.

### Public communication during regulatory inquiry

Galaxy's default: no public communication. Regulatory inquiries are private; the regulator typically prefers privacy.

The exception: if the regulator publicly announces the inquiry (which happens for some categories), Galaxy may need to respond:

```
[If publicly required] We've received an inquiry from [regulator]. We're responding through legal counsel and providing the requested information. We can't comment further on the substance while the inquiry is active.

The Galaxy Loss Room, Pass List, and methodology pages — which are public on galaxysportsedge.com — represent the operating discipline we've maintained throughout. We welcome the regulator's review.

— Garrett
```

### Brand-position discipline during regulatory inquiry

Galaxy's default posture toward regulators is cooperative + transparent. Galaxy's public surfaces are already designed to be auditable. A regulatory inquiry should require minimal additional disclosure beyond what's already public.

What Galaxy does NOT do:
- Resist legitimate regulatory inquiries.
- Hide historical data from regulators.
- Issue public statements that contradict the inquiry's framing.
- Trash-talk the regulator publicly.

---

## Crisis Category 6 — Competitor accusation

**Definition:** A competitor (or competitor's user / employee) makes a public accusation about Galaxy — that Galaxy fakes data, that Galaxy's methodology is misrepresented, that Galaxy hides losses, etc.

### Response posture

Galaxy's brand position INVITES competitive engagement on substance. If a competitor accuses Galaxy of something specific (e.g., "Galaxy's claimed calibration band is wrong"), Galaxy responds by pointing to public data.

### Day 1-3:

- Read the accusation carefully.
- Identify whether the accusation is factually verifiable, opinion-based, or attack-based.

### Response paths:

**Path A — Factually verifiable accusation:**

If the accusation can be tested against Galaxy's public surfaces:

```
[Competitor's specific accusation] is verifiable against Galaxy's public surfaces. The relevant data is at [specific URL — Loss Room, Pass List, or calibration page].

[If the accusation is correct] — [Specific acknowledgment of the factual point. Don't argue.]
[If the accusation is incorrect] — [Reference to the specific data that refutes it. Don't editorialize.]

— Garrett
```

**Path B — Opinion-based accusation:**

Same as press criticism (Crisis Category 3 Path C). Galaxy does not respond. The brand-position discipline is silence.

**Path C — Attack-based (no specific claim, just hostility):**

Galaxy does not respond publicly. If members ask about it: "Galaxy doesn't engage with [name]. The work speaks. Look at the public surfaces."

### Brand-position discipline

Galaxy's brand position is built on what Galaxy does, not what competitors don't do. Engaging in competitive attacks compromises the position.

What Galaxy does NOT do:
- Attack the competitor in return.
- Subtweet the competitor.
- Mass-email subscribers about the competitor.
- Create comparison content that frames Galaxy as "better than" the competitor.

---

## Crisis Category 7 — Founder personal crisis

**Definition:** Something happens to Garrett that affects Galaxy operations — health, family, legal, mental health, personal accident.

### The principle

Galaxy operates with single-operator risk. The founder-resilience playbook protects against gradual deterioration. The crisis playbook covers acute events.

### Immediate response (hours):

- Galaxy operations may need to pause depending on severity.
- Member-facing surfaces may need to display a temporary banner.
- Vault Discord may need to be set to read-only.
- Vault office hours may need to be canceled.

### Within 48 hours:

If Garrett can communicate, single email:

```
Subject: Galaxy is pausing briefly

Hey [first name],

Short note. Something personal came up that requires me to step back from Galaxy operations for [estimated duration].

What's continuing:
- Your subscription remains active. Stripe doesn't charge until the next renewal.
- Past digests + autopsies + ledger remain accessible.
- Your data is safe.

What's paused:
- Wednesday digest [duration].
- Vault office hours scheduled in [period].
- Real-time Discord engagement from me.

What's already in motion:
- [Specific operational continuity — e.g., a contractor is monitoring the platform; Codex's monitoring is active].

This is a temporary pause, not a permanent one. I expect to be back within [estimated time]. If something material changes about that estimate, I'll send another email.

If you have questions: [emergency contact email or designated contractor].

Garrett
```

If Garrett cannot communicate: a designated contractor or someone in Garrett's network sends a similar email per Galaxy's business continuity plan.

### Business continuity plan summary

Galaxy needs to have, before any crisis:
- A designated emergency contact who can post to Discord and reply to member emails for up to 14 days.
- A documented operational handoff: where the admin cockpit credentials are, how to pause/resume billing, how to set the public site to maintenance mode.
- A pre-written "Galaxy is pausing" template that designate can send.

This continuity work belongs in `06-continuity-risk.md` (Codex's document).

---

## Crisis Category 8 — Vault Discord moderation crisis

**Definition:** Multiple members are in conflict in Vault Discord. The community is splitting or members are leaving angrily.

This is the most operational crisis category — happens in normal community operations, not in extraordinary events.

### Response

The Discord launch pack (`copy/vault-discord-launch-pack.md`) covers individual member moderation. The crisis is when the issue is community-wide:

**If 3+ members are in active conflict:**
- Garrett pauses the affected channel(s) for 24 hours.
- Posts in #vault-lounge a single longer message acknowledging the conflict + the resolution:

```
A community moment.

Over the last 24 hours, multiple members have been in conflict in [channel]. I've paused the channel temporarily to reset.

What I observed: [specific account of the conflict, without naming individuals].

What I'm asking: when the channel reopens in 24 hours, the standard applies: disagreement is welcome, hostility isn't. If members feel pulled in either direction by the conflict, please use the time to step back from the channel rather than re-engage.

The room is small enough that one bad cycle of escalation damages the trust that makes Vault valuable. I'm trusting that the room can reset together.

— Garrett
```

After the 24-hour pause: channel reopens. Garrett monitors for the first 48 hours. Repeat offenders receive private DMs per `copy/vault-member-support-playbook.md`.

---

## What this playbook deliberately does NOT include

1. **No "crisis communication consultant" engagement.** Galaxy operates brand discipline in-house. External communications consultants would compromise the voice.

2. **No formal PR firm relationship.** Crisis press response goes through Garrett + lawyer; press kit (`galaxy-press-kit.md`) handles routine inquiries.

3. **No social media monitoring tools beyond what Codex tracks.** Galaxy doesn't run sentiment-analysis dashboards or alerts. Crisis detection is human + monitoring layer.

4. **No "war room" protocol.** Galaxy is single-operator. A war room implies a team that doesn't exist yet.

5. **No "we sincerely apologize" templates.** Galaxy's discipline is to apologize for what specifically went wrong, not for generic concern.

6. **No competitive-response templates beyond Category 6.** Galaxy doesn't have a "go on the offensive" playbook. Galaxy's offense is the daily work.

---

## Crisis log structure

Garrett maintains `templates/crisis-log.md` (private once copied into the live review archive):

```
Date | Category | Brief description | Response action | Public visibility | Resolution time | What I'd do differently
2026-XX-XX | P1 outage | Galaxy site down 47 min after Vercel deploy | Status updates Discord + Twitter + email; post-mortem at +24h | Vault Discord + Twitter (limited) | 60 min | Pre-deploy checklist needs validation step
[continue]
```

The log feeds into the year-end annual report's "what went wrong this year" section (if substantive incidents occurred).

---

## Cross-references

- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Press kit (routine press response): `galaxy-press-kit.md`
- Member support playbook (individual member crises): `copy/vault-member-support-playbook.md`
- Discord launch pack (community moderation): `copy/vault-discord-launch-pack.md`
- Founder resilience (Category 7 context): `founder-resilience-playbook.md`
- Contractor playbook (lawyer engagement for breach/regulatory crises): `galaxy-contractor-playbook.md`
- Operating values (foundation for all crisis discipline): `galaxy-operating-values.md`

---

*A crisis tested correctly compounds Galaxy's brand position more than a year of normal operations does. A crisis tested poorly erases that same year. The playbook above is the pre-commitment to handling crises well — written when there's no crisis, used when there is one.*
