# Galaxy Twitter Incident Response Protocol

**Audience:** Garrett. Internal.
**Purpose:** Galaxy's Twitter presence (@GalaxySportsAI) will eventually face incidents — viral pile-ons, factual disputes, impersonation attempts, account compromises, platform-policy actions. The protocol below sequences the response so Galaxy can react with discipline rather than panic.

**Note:** Twitter is Galaxy's highest-friction surface. Most days require no incident response. The protocol applies on the rare day an incident fires.

---

## Why Twitter is the highest-friction surface

- Real-time. No 24-hour reflection buffer.
- High visibility. A single tweet can reach 10,000+ people in an hour.
- Adversarial environment. Sports Twitter rewards heat over substance.
- Asymmetric stakes. A 30-second mistake can produce a 30-day brand-position dent.

Galaxy's Twitter content discipline (per `copy/galaxy-twitter-content-discipline.md`) is restrained by design. The incident response protocol below covers what happens when the system gets stressed despite the discipline.

---

## Incident severity tiers

| Tier | Definition | Response window | Decision authority |
|---|---|---|---|
| Tier 1 | Account compromise / impersonation / platform action | <1 hour | Garrett solo |
| Tier 2 | Factual dispute about a Galaxy call or methodology | <24 hours (with reflection buffer) | Garrett, with optional advisory check |
| Tier 3 | Viral negative engagement / pile-on | <48 hours (often: don't respond at all) | Garrett solo, after 24-hour buffer |
| Tier 4 | Background sentiment shift / sustained criticism | Weeks-to-months | Quarterly audit per `galaxy-quarterly-deep-audit-protocol.md` |

---

## Tier 1: Account compromise / impersonation / platform action

### Sub-incident 1A: Twitter account compromised

**Surface:** Garrett notices unauthorized tweets, password change emails Garrett didn't trigger, login alerts from unknown locations.

**Response (within 1 hour):**

1. Change Twitter password from a clean device.
2. Revoke all active sessions in Twitter security settings.
3. Enable 2FA if not already enabled. (Should already be on.)
4. Check authorized apps; revoke any that look unfamiliar.
5. Post a brief acknowledgment after secure (if compromise was public):

```
A note: the @GalaxySportsAI account was briefly compromised earlier today. The account is secured + I've reviewed everything posted during that window. If anything was tweeted from this account that didn't sound like Galaxy, that's why.

Will continue monitoring. Thanks to the folks who flagged it.
```

6. Log in `templates/incidents.csv` with shape `twitter_compromise`.

### Sub-incident 1B: Galaxy account impersonated

**Surface:** Someone has created a Twitter account using Galaxy's name, logo, or close variant.

**Response (within 24 hours):**

1. File impersonation report via Twitter's reporting system.
2. Tweet from @GalaxySportsAI publicly noting the impersonator:

```
A note: someone has created a Twitter account impersonating Galaxy. The only real account is @GalaxySportsAI. Anything from a similar-sounding handle isn't us.

I've reported the impersonator to Twitter; their action may take a few days. Until then, verify the handle before engaging.
```

3. Don't engage with the impersonator account directly.
4. Log in `templates/incidents.csv` with shape `twitter_impersonation`.

### Sub-incident 1C: Platform action (suspension, restriction, label)

**Surface:** Twitter applies a label, restricts the account, or suspends.

**Response (within 24 hours):**

1. Review Twitter's stated reason.
2. If suspension appears in error: file appeal via Twitter's appeals process.
3. While appeal is pending: communicate via other channels (Vault Discord, email digest, galaxysportsedge.com) about the situation.

```
Email to Vault members:
Subject: A note about our Twitter account

Hey [first name],

Quick note. Our Twitter account (@GalaxySportsAI) is currently [restricted / suspended] per Twitter's process. I've filed an appeal and expect resolution within [their stated window].

Galaxy continues to operate normally — digests, Vault Discord, all other channels are unaffected. If you want updates, the website is the authoritative source.

— Garrett
```

4. If suspension stands: assess the reason + treat as decision-log entry per `galaxy-crisis-communications-playbook.md`.

5. Log in `templates/incidents.csv` with shape `twitter_platform_action`.

---

## Tier 2: Factual dispute about a Galaxy call or methodology

### The scenario

Someone publicly disputes a Galaxy call, methodology claim, calibration number, or autopsy. The dispute may be:

- Substantive (the person has a real argument).
- Bad-faith (the person is performing for engagement).
- Errant (the person misunderstood Galaxy's actual position).

### Default response: 24-hour buffer

Per `founder-resilience-playbook.md` anti-spiral protocol, Galaxy doesn't respond within the first 24 hours to a substantive critique. The reflection buffer separates the response from the reflex.

### After the 24-hour buffer

Three response shapes:

**Response A: Substantive critique with merit.**

Galaxy acknowledges publicly, then addresses the substance.

```
Worth engaging with this. [Specific point being responded to.]

A few honest reactions:
- [Point of agreement]
- [Point of disagreement with reasoning]
- [What Galaxy will check or revise]

Thread continues if needed. Otherwise, we'll incorporate this into the next methodology page revision + the next Model Journal.
```

Then publish a more detailed response in the Model Journal per `copy/model-journal-template.md` — the appropriate substrate for substance.

**Response B: Bad-faith engagement / pile-on.**

Galaxy doesn't engage. Silence is the discipline.

If pile-on escalates substantially: a single statement acknowledging the noise without engaging.

```
Aware of the conversation. Galaxy's position on [X] is documented at galaxysportsedge.com/methodology. The Loss Room covers calls that didn't work. The Pass List covers games where we held our fire. Engaging beyond that doesn't change the documented evidence.
```

No replies, no quote-tweets, no follow-up thread.

**Response C: Errant critique based on misunderstanding.**

Galaxy clarifies once, then disengages.

```
Quick clarification: Galaxy's [specific claim] is [actual position]. Documented at [link]. Happy to dig further in the Vault if anyone wants the long version.
```

If the person continues to misrepresent after the clarification: treat as Response B.

### What Galaxy doesn't do

- Engage in extended thread arguments.
- Subtweet or vague-tweet about the critic.
- Block prematurely (unless harassment).
- DM the critic privately to "discuss off-line."

### Logging

All Tier 2 incidents logged in `templates/incidents.csv` with shape `twitter_factual_dispute` + severity assessment.

---

## Tier 3: Viral negative engagement / pile-on

### The scenario

A specific Galaxy tweet, methodology claim, or Loss Room autopsy goes viral negatively. Hundreds or thousands of replies, mostly negative.

### Response framework

**Step 1: 24-hour buffer (mandatory).**

Per anti-spiral protocol. No exceptions during the first 24 hours.

**Step 2: Assess the substance.**

What is the core critique? Three possibilities:
- A specific factual error Galaxy made.
- A brand-position challenge Galaxy needs to address structurally.
- Pure adversarial noise.

**Step 3: Response by substance category.**

- **Factual error:** Acknowledge specifically. Correct. Apologize. Don't repeat the error in the correction. Log per `templates/critique-log.md`.

```
A correction. The tweet about [topic] yesterday contained an error: [specific factual point]. The actual situation is [correction]. The original tweet has been deleted.

Apologies. Future calls will note this correction.
```

- **Brand-position challenge:** Sit with it for the full 24 hours. If the critique surfaces a real position drift: write a decision-log entry. If not: respond once acknowledging the disagreement, then disengage.

- **Pure noise:** No response. Galaxy's Twitter cadence continues as normal.

**Step 4: Communication to Vault members.**

If the incident is highly visible, communicate with Vault members proactively:

```
Subject: A note about today's Twitter situation

Hey [first name],

You may have seen the [thread / pile-on / criticism] about Galaxy today.

Brief context:
- [What happened]
- [Galaxy's reading of the substance]
- [What Galaxy is doing about it, if anything]
- [What Galaxy isn't doing, if relevant]

The Vault digest cadence continues as normal. The Twitter situation doesn't change anything about how we operate or what we publish.

— Garrett
```

**Step 5: Logging + quarterly review.**

Log in `templates/incidents.csv` with shape `twitter_viral_negative`. Quarterly deep audit reviews patterns.

---

## Tier 4: Background sentiment shift / sustained criticism

### The scenario

No single incident, but Galaxy notices over weeks or months that:
- Engagement on @GalaxySportsAI is shifting from substantive to dismissive.
- Replies are increasingly hostile.
- A specific critique is recurring across multiple sources.
- Galaxy's brand position is being framed in ways Galaxy didn't intend.

### Response framework

**Quarterly deep audit reviews the pattern.**

Per `galaxy-quarterly-deep-audit-protocol.md`, Section 3 of the audit reviews Twitter sentiment + engagement trends.

**Three response shapes:**

- **Trend is a brand-position validation problem:** Adjust the methodology page or the about page to clarify the actual position. Don't apologize for the position; clarify it.

- **Trend is real brand drift:** Decision-log entry. Address the drift through product/content changes, not just communication.

- **Trend is platform-level (Twitter culture shift) rather than Galaxy-specific:** Continue cadence; monitor without reacting. Twitter's culture shifts independently of Galaxy.

**No Twitter-public acknowledgment of Tier 4 patterns.** These are operator-level concerns, not surface-level communication moments.

---

## Common mistakes to avoid

1. **Responding within the first hour of seeing the critique.** The 24-hour buffer protects against reactive damage.

2. **Engaging in extended thread arguments.** Brand position is documented at galaxysportsedge.com. Twitter is for distribution, not debate.

3. **Subtweeting or vague-tweeting the critic.** This is the lowest-status response Galaxy can make. Don't do it.

4. **Blocking critics who are substantive.** Galaxy can disagree without blocking. Block only for harassment or sustained bad faith.

5. **Pretending the incident didn't happen.** If Vault members are aware of the incident, communicate proactively. Silence to a primary audience reads as weakness.

6. **Apologizing for the methodology.** Galaxy can apologize for specific factual errors. Galaxy doesn't apologize for the methodology itself; the methodology is the bet.

7. **Letting the incident change content cadence.** Don't post 3 tweets in a row to "make up for" the incident. Don't post less because of fear of follow-up. Cadence is independent.

---

## Specific scenarios from the brand-position playbook

### Scenario: Galaxy is accused of "AI grift" because of the brand position

Surface: Someone tweets "Galaxy claims they're not AI but it's obviously just AI. This is the same scam."

Response (after 24-hour buffer):

```
Worth addressing once. Galaxy's methodology page is at galaxysportsedge.com/methodology. The factor model is documented; the factor weights are listed; the calibration data is published; the autopsies are public.

A reader who reviews the documentation + concludes "this is AI" — that's a reading I disagree with. A reader who hasn't reviewed it + concludes the same — that's a different conversation.

For folks who want to dig in: the methodology page is the substrate. Twitter isn't the right format for this.
```

One reply, then disengage.

### Scenario: Galaxy is accused of being a betting service masquerading as a forecasting service

Surface: Someone tweets "Galaxy publishes 'picks' — it's a betting service. The 'we're math' positioning is marketing cover."

Response (after 24-hour buffer):

```
Worth a brief clarification. Galaxy publishes calls — directional + confidence-tagged + factor-cited. Readers do what they want with the calls.

If "publishing calls" makes Galaxy a betting service, the same is true of every analytics platform, sports column, and prediction model in the space. The distinction Galaxy makes — methodology published, losses published, Pass List as discipline — is documented at galaxysportsedge.com/methodology.

Disagree with the methodology? Engage with the methodology. Brand-position framing doesn't move the methodology.
```

Disengage after one reply.

### Scenario: A specific Galaxy call gets ratio'd

Surface: A pick that turned out wrong gets a 10x ratio (more quote-tweets than likes), most of them mocking.

Response (after 24-hour buffer):

```
The autopsy is in the Loss Room.

[Link]
```

That's it. Don't argue. Don't explain. The Loss Room is the response.

---

## Cross-references

- Twitter content discipline: `copy/galaxy-twitter-content-discipline.md`
- Twitter launch thread: `copy/galaxy-twitter-launch-thread.md`
- Crisis communications playbook: `galaxy-crisis-communications-playbook.md`
- Founder resilience playbook (anti-spiral protocol): `founder-resilience-playbook.md`
- Decision rights matrix: `galaxy-decision-rights-matrix.md`
- Quarterly deep audit protocol: `galaxy-quarterly-deep-audit-protocol.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Methodology page copy: `copy/methodology-page-copy.md`
- Model Journal template: `copy/model-journal-template.md`

---

*Twitter is the highest-friction surface Galaxy operates. The protocol above is the discipline that keeps Galaxy from reacting tweet-by-tweet to a medium that rewards reactivity. Restraint compounds.*
