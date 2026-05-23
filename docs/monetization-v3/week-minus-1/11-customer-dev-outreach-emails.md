# Customer Dev Outreach Emails — Source-Specific Templates

**Audience:** Garrett. Internal.
**Purpose:** The customer dev sprint requires reaching 80-110 candidates to convert 30 interviews. Different candidate sources need different opener language. The templates below cover the 5 main outreach channels.

**Status:** Pre-sprint artifact. Use during Days -7 to -1.

---

## Universal opener constraints

Across all templates:

- Subject line ≤50 characters.
- Opening sentence references the specific reason Galaxy reached out to *this* person.
- Asks for 30 minutes, not "a quick chat" or "your thoughts."
- Offers Calendly link in the first email.
- No mention of Vault price.
- No mention of founding-50 status.
- No pitch in the outreach — the conversation is for listening.

---

## Template 1: Twitter follower with substantive engagement history

**Candidate signal:** Person who has replied substantively to Galaxy tweets, retweeted methodology threads, or posted their own model-related sports content.

**Subject:** Quick question about your sports forecasting

**Body:**

```
Hey [first name],

I've noticed your replies on [specific Galaxy thread or topic] — your read on [specific point they made] was substantive in a way that's rare on Twitter.

I'm running 30 short conversations this week with people thinking carefully about sports forecasting. Not pitching anything. I'm building something at Galaxy Sports Edge + want to understand how serious sports-forecasting readers actually evaluate what they pay for.

If you have 30 minutes this week, here's my Calendly: [link]

If not, no problem — appreciate the engagement either way.

— Garrett
```

### Why this works

- Specific reference to their actual engagement.
- "Substantive in a way that's rare on Twitter" is a real compliment + signals you read what they wrote.
- "Not pitching anything" lowers the bar.
- 30 minutes is precise.

---

## Template 2: Warm intro from network

**Candidate signal:** Someone in Garrett's network connected him to this person specifically because they thought the person would be a good Vault candidate.

**Subject:** [Mutual connection] suggested I reach out

**Body:**

```
Hey [first name],

[Mutual connection name] mentioned you'd be a useful person for me to talk to about sports forecasting. Specifically [mentioned context — "your work at X" or "your interest in deterministic models" or "your skepticism of AI prediction tools"].

I'm running 30 short conversations this week with people thinking seriously about how sports prediction content gets built + paid for. I'm building something at Galaxy Sports Edge — not pitching during the call; I want to understand the read from people whose judgment [mutual connection] respects.

30 minutes, Calendly: [link]

If the topic's not interesting, no problem at all. And feel free to ignore the email entirely if [mutual connection] caught you at a busy moment.

Thanks,
Garrett
```

### Why this works

- Names the mutual connection (warm intro is highest-conversion source).
- References the specific context the mutual connection mentioned.
- Honors the busyness reality without sounding apologetic.

---

## Template 3: Public sportsbook critic / skeptic

**Candidate signal:** Twitter or blog author who publicly critiques tout-certainty content, black-box prediction marketing, or sportsbook practices.

**Subject:** Your take on AI-prediction marketing

**Body:**

```
Hey [first name],

Your [specific tweet / blog post / Reddit comment] about [specific critique of AI prediction or sportsbook marketing] — that argument should be more common than it is. Most readers buy the marketing; you saw through it.

I'm building Galaxy Sports Edge — a deterministic factor model platform that publishes its losses + holds the methodology page transparent. Brand position is "we're not AI, we're math you can read." If you'd be open to a 30-minute conversation, I'd value your honest critique of what I'm building.

Not pitching. Want the skeptic's read.

Calendly: [link]

— Garrett
```

### Why this works

- Validates their public position without flattering.
- Surfaces Galaxy's brand position in a way that's substantive, not marketing-toned.
- Explicitly invites critique.
- Skeptics convert higher than enthusiasts to substantive interviews.

---

## Template 4: Vault landing page email signup

**Candidate signal:** Person who entered email on Galaxy's pre-launch landing page interest list.

**Subject:** Following up on your Galaxy signup

**Body:**

```
Hey [first name],

You signed up for Galaxy Sports Edge updates [N days/weeks ago]. Thanks for that.

Before Vault opens to subscribers, I'm running 30 short conversations with people who've shown interest in what I'm building. Goal isn't to pitch — I want to understand what drew you in + what would make Vault actually useful for you (or what would make it a no).

30 minutes, Calendly: [link]

If you're not interested in a call, no problem. The updates list continues regardless.

— Garrett
```

### Why this works

- Acknowledges the existing interest signal.
- Doesn't pressure the signup into commitment.
- Explicit "no problem" if they decline preserves the email relationship.

---

## Template 5: Cold email to identified sport-following list

**Candidate signal:** Person identified through publicly available signals — newsletter subscriber lists exchanged with peer operators, podcast listener communities, sports analytics forum participants.

**Subject:** Quick research call on sports forecasting

**Body:**

```
Hey [first name],

I came across your [specific context — newsletter signup, forum post, podcast comment]. You're thinking about sports forecasting in a way that's more careful than the average reader.

I'm running 30 short research conversations this week. Building something at Galaxy Sports Edge + want to understand how serious sports-forecasting readers think about value, trust, and what's missing. Not pitching during the call.

30 minutes, Calendly: [link]

Easy to decline if not interesting.

— Garrett
```

### Why this works

- Specific context that proves the email isn't fully cold.
- "More careful than the average reader" without flattery.
- Light close that respects their time.

---

## Follow-up sequence (for non-responders)

### Follow-up 1 — 4 days after original (only if Days -3+)

**Subject:** Re: [original subject]

**Body:**

```
Hey [first name],

Following up on the note from earlier this week. I have a few interview slots still open this week + value the perspective from readers like you.

Same Calendly link if interesting: [link]

If the timing's wrong or it's not interesting, no worries — this is the last follow-up.

— Garrett
```

### What we don't do

- Don't send more than one follow-up. Two messages with no response = move on.
- Don't use "bumping this up" or "did this slip your inbox" language.
- Don't increase pressure with each follow-up.
- Don't add anyone to a follow-up email sequence beyond the one above.

---

## Subject line A/B (informal)

If response rate is below 20% by Day -5, try variants in subsequent outreach:

| Variant | Source |
|---|---|
| "Quick question about your sports forecasting" | Original Template 1 |
| "Thinking about how sports prediction gets built" | Higher signal |
| "Your read on [specific topic]" | Personalization |
| "Galaxy Sports Edge — 30-minute conversation" | Direct |
| "Research call on sports forecasting" | Generic backup |

Track in `templates/outreach-tracker.csv` which variant landed.

---

## Channel sequencing (within a single day's outreach)

Don't send all 30 outreach emails at once. Stagger:

- Morning (09:00-10:00): 10 emails to Source 1 (Twitter substantive engagers).
- Late morning (10:30-11:30): 10 emails to Source 2 (warm intros).
- Early afternoon (13:00-14:00): 10 emails to Source 3 (skeptics).

Staggering allows for early-replier interviews while later emails are still landing.

---

## What this outreach does NOT include

1. **No Vault pricing.** $200/year isn't mentioned until the interview itself (and even then, only at Q25-26).

2. **No Vault landing page link.** The interview is the conversation, not the landing page.

3. **No "founding member" framing.** Founding-50 status is a separate concept that comes later.

4. **No fake urgency.** No "I have 3 slots this week" pressure.

5. **No celebrity dropping.** Galaxy isn't a personality-led brand; outreach doesn't reference Garrett's prior work or affiliations.

6. **No reference to the Almanac, Live, or Year-2 roadmap.** Focus is Vault.

---

## Tracking + tagging

Each outreach email logged in `templates/outreach-tracker.csv`:

```
date,source,candidate_name,template_used,response,interview_scheduled,notes
2026-XX-XX,twitter-substantive,Jane Doe,template-1,Yes - replied 4h later,Yes - Day -5 10am,Has been engaging since March
2026-XX-XX,warm-intro,John Smith,template-2,No response,No,Following up Day -3
2026-XX-XX,skeptic,Alex Lee,template-3,Replied - too busy,No,Polite decline
```

After the sprint, run a conversion analysis: which sources converted best? Use the data for future customer dev rounds.

---

## Cross-references

- Customer dev sprint day-by-day: `week-minus-1/10-customer-dev-sprint-day-by-day.md`
- Interview tracker: `week-minus-1/01-vault-interview-tracker-template.csv`
- Calendly setup notes: `week-minus-1/05-calendly-setup-notes.md`
- Post-interview thank-you: `week-minus-1/12-post-interview-thank-you-templates.md`
- Founding-50 outreach: `week-minus-1/13-founding-50-outreach-by-source.md`
- Galaxy brand voice canonical: `galaxy-brand-voice-canonical.md`

---

*Outreach is the gate to the interview. The templates above maximize response rate while preserving brand position. Personalization beats volume; honesty beats cleverness.*
