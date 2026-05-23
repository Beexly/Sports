# Galaxy Partnership Evaluation Framework

**Audience:** Garrett. Internal. Used when an unknown party reaches out with a partnership inquiry.

**Why this exists:** Galaxy will receive inbound partnership inquiries — sportsbooks, media companies, B2B data buyers, podcast networks, foreign operators, software vendors. Most are not brand-aligned. A small percentage are worth time. The framework below gives Garrett a 10-minute filter that decides whether to engage.

**Why this matters:** Founder time is the constraint. Bad partnership conversations consume 4-8 hours each. The framework reduces evaluation time to <15 minutes and protects the brand position from misaligned offers.

---

## The 7-question filter

When a partnership inquiry arrives, run these 7 questions before any second response.

### Question 1 — Who is reaching out?

**Required information:**
- Company / organization name (or specific individual + their affiliation)
- The role of the person reaching out (founder? business development? marketing? agency?)
- Their public LinkedIn / website / press history

**Red flags:**
- Anonymous inquiry (no name, no company)
- Generic email address ("partnerships@" with no specific person)
- New company with no public footprint
- Person whose recent role history shows pattern of short-tenure jumping (suggests speculative outreach)

**Green flags:**
- Specific named person with verifiable role
- Company with public track record + brand-aligned reputation
- Inquiry references specific Galaxy surfaces (Loss Room, Pass List, methodology page) — suggests they actually looked

---

### Question 2 — What category of partnership?

Galaxy receives inquiries from 8 known categories. Each gets a different default response.

| Category | Default response |
|---|---|
| **A — Direct competitor** | Decline. No engagement. |
| **B — Sportsbook (US-licensed)** | Decline most. Carve-out: data-licensing only, NEVER affiliate. Requires lawyer review. |
| **C — Sportsbook (offshore / unlicensed)** | Decline. No engagement. |
| **D — Media outlet (analyst, journalist)** | Standard press response per `galaxy-press-kit.md`. |
| **E — Podcast / streamer** | Evaluate per `audit/04-live-pitch-variants.md` if Live track active; otherwise defer to Year 2. |
| **F — Software vendor (CRM, analytics, payment)** | Evaluate on operational merit. Galaxy uses Stripe + Postmark + Vercel; new vendors require specific reason. |
| **G — B2B data buyer (research firm, hedge fund, academic)** | Evaluate carefully. Brand-position must be respected. Galaxy can license data outputs but not source-code or methodology weights. |
| **H — Acquisition / investment outreach** | See `12-acquisition-optionality.md`. Default response: "Galaxy is not currently positioned for that conversation." |

---

### Question 3 — Does this fit Galaxy's brand position?

The brand position filter (per `galaxy-operating-values.md`):

- [ ] Does the partnership protect or threaten the **restraint discipline**?
  - Protect = the partner's audience or use case benefits from Galaxy's restraint posture.
  - Threaten = the partner expects more publication volume, more sports coverage, or more confidence signaling than Galaxy publishes.
- [ ] Does the partnership protect or threaten the **transparency commitment**?
  - Protect = the partner is comfortable with Galaxy's public surfaces (Loss Room, Pass List) being part of the value Galaxy brings.
  - Threaten = the partner wants Galaxy to hide losses, walk back autopsies, or curate the Pass List.
- [ ] Does the partnership protect or threaten **method-not-personality** positioning?
  - Protect = the partner wants Galaxy-the-method, not Garrett-the-personality.
  - Threaten = the partner wants Garrett's face on their marketing, Garrett's voice on their podcast as content-creator-for-hire, Garrett's brand as a personal brand to slot into theirs.

If 2 or more "threaten" answers: decline politely. No further evaluation needed.

If all 3 "protect" or neutral: continue to Question 4.

---

### Question 4 — What does the partner want?

Get a specific answer before the second response. Possible asks:

- **Data licensing** — they want Galaxy's published data feed for their product or research.
- **Content licensing** — they want Galaxy's editorial (autopsies, Almanac excerpts) for their publication.
- **API access** — they want programmatic access to Galaxy data.
- **Promotional partnership** — they want Galaxy to promote their product to Galaxy's audience.
- **Reciprocal promotion** — both parties promote each other.
- **Sponsored content** — they want to sponsor a Galaxy publication.
- **Co-branded product** — they want to build something jointly.
- **Acquisition / investment** — they want to buy or invest in Galaxy.
- **Vendor relationship** — they want Galaxy to use their product or service.

The ask determines the response type. If the ask is unclear after the first email, ask one question: "What specifically are you proposing?"

If they can't answer that question in one paragraph, the inquiry isn't ready. Politely defer: "Happy to circle back when you have a more specific proposal."

---

### Question 5 — What's the cost to Galaxy?

Every partnership has costs beyond the obvious financial ones:

- **Founder time** — every conversation, every meeting, every contract review consumes Garrett's most-limited resource.
- **Brand-position dilution** — every partnership shifts how Galaxy is perceived. Some shifts compound; some erode.
- **Operational complexity** — partnerships create commitments (uptime SLAs, response times, technical integrations).
- **Member trust** — partnerships are visible to subscribers. Subscribers will assess whether the partnership is brand-aligned.

Estimate the costs:

- Founder time over 12 months: <5 hours / 5-20 hours / 20-100 hours / 100+ hours
- Brand impact: positive / neutral / negative / catastrophic
- Operational complexity: low / medium / high
- Member trust impact: neutral / positive / questionable / negative

If founder time exceeds 100 hours/year OR brand impact is negative OR member trust is questionable: decline.

---

### Question 6 — What's the value to Galaxy?

Honestly assess the value:

- **Revenue** — direct or indirect.
- **Brand depth** — does this partnership add credibility, reach, or positioning that Galaxy values?
- **Strategic optionality** — does this open future paths (acquisition discussions, B2B revenue, new market access)?
- **Operational value** — does this make Galaxy's operations easier or more reliable?

Be honest about value. Most partnerships overstate their value in the pitch.

The value calibration: would Galaxy pay for this partnership? If yes, engage. If no, decline.

---

### Question 7 — What's the brand-position risk if this goes sideways?

For every partnership, ask: if it ends badly (the partner misuses Galaxy's content, attributes Galaxy in bad faith, breaches confidentiality, etc.), what's the brand-position cost?

- **Low risk** — partnership ends; both parties move on; no public visibility.
- **Medium risk** — partnership ends with some public visibility; Galaxy can respond per crisis communications playbook.
- **High risk** — partnership failure becomes a story; Galaxy's brand position takes a hit that takes months to recover.

If high risk: decline. The brand position is the moat. Don't compromise it for partnerships.

If medium risk: proceed with explicit contract language addressing failure modes.

If low risk: standard contract suffices.

---

## The decision matrix

After running all 7 questions, score each:

| Question | Pass | Fail |
|---|---|---|
| 1 — Who is reaching out | Clear identity | Anonymous or unverifiable |
| 2 — Category | A-H known + acceptable category | Unclear category or rejected category |
| 3 — Brand fit | All 3 dimensions protect | 2+ threats |
| 4 — Specific ask | Clear in one paragraph | Vague |
| 5 — Cost | Reasonable founder time + low brand risk | High founder time or brand risk |
| 6 — Value | Real to Galaxy | Overstated or unclear |
| 7 — Risk | Low or medium | High |

**Action:**
- 7 passes → engage. Schedule 30-min discovery call.
- 5-6 passes → ask one clarifying question to address the failed dimension(s).
- 3-4 passes → polite decline.
- 0-2 passes → silent no-response is acceptable for low-quality inquiries; polite decline for serious inquiries.

---

## Standard response templates

### Template 1 — Engage (7 passes)

```
Hi [name],

Thanks for the outreach. The [specific partnership category] direction has potential alignment with what Galaxy is built for.

Before a longer conversation, two questions worth answering by email:

1. [Specific question tailored to their proposal — e.g., "What specifically does data licensing look like in your context? Volume, frequency, terms?"]
2. [Specific question about their constraints — e.g., "What's your timeline for activating this if we agree?"]

If those land OK in writing, happy to schedule 30 minutes for a discovery call.

— Garrett
galaxysportsedge.com
```

### Template 2 — Clarifying question (5-6 passes)

```
Hi [name],

Thanks for the outreach. I have one question that affects whether this is a fit:

[Specific question addressing the failed dimension — e.g., "How does the partnership work alongside Galaxy's commitment to publish every losing pick with a public autopsy? Some partnerships I've seen in this category have asked us to mute losses; that's not workable on our side."]

Open to discussing further once that's clarified.

— Garrett
```

### Template 3 — Polite decline (3-4 passes)

```
Hi [name],

Thanks for reaching out. Galaxy is not in a position to engage on this right now. [If they want to know why: one sentence explanation — e.g., "We don't do affiliate-style sponsorships," or "Our partnership bandwidth is fully allocated to [specific track] this year."]

If circumstances change on either side, the door's not closed. For now, no.

— Garrett
```

### Template 4 — Silent no-response (0-2 passes)

Some inquiries don't warrant a response. Spam, scams, low-effort batch outreach, anything misrepresenting itself.

Galaxy's posture: silent.

Do NOT respond. Do NOT engage. Move on.

If the same sender follows up 2+ times: send Template 3 (polite decline) to close the loop.

### Template 5 — Acquisition / investment inquiry (Category H)

```
Hi [name],

Thanks for the outreach. Galaxy is not currently positioned for acquisition or investment conversations.

If circumstances change — likely Year 2 or Year 3, and likely in a specific shape — we'll be in a better position to discuss. For now, the work is the work.

If you want to stay in touch loosely, I'm happy to share semi-annual updates as Galaxy progresses. No expectations of formal engagement.

— Garrett
```

---

## What this framework deliberately doesn't do

1. **No marketing-driven partnership chase.** Galaxy doesn't proactively pursue partnerships during Year 1. The framework is reactive.

2. **No "exploratory" calls without specific asks.** If a partner can't articulate what they want, the meeting won't produce value. Email until clarity surfaces.

3. **No second meetings without progress.** First call surfaces possibility; second call requires written terms. Galaxy doesn't run open-ended meeting cycles.

4. **No affiliate program.** Galaxy doesn't accept affiliate revenue from sportsbooks. This is brand-position non-negotiable.

5. **No co-marketing with brands that compete with Galaxy's restraint posture.** Even high-revenue partnerships are declined if they compromise the brand position.

6. **No "let's stay in touch" calls without specific topics.** If a partner wants to "stay in touch," they can read the public Galaxy surfaces. Galaxy doesn't run quarterly check-ins with non-active partners.

---

## Partnership categories — deeper notes

### Category B (Sportsbook, US-licensed)

Default: decline most.

**Acceptable carve-outs:**
- Data licensing where Galaxy's published feed is purchased on commercial terms. Galaxy doesn't customize the feed for the buyer.
- Joint research projects where Galaxy's methodology is acknowledged + Galaxy's brand position is respected.

**Always decline:**
- Affiliate revenue (per cent or per sign-up).
- Co-branded content where Galaxy appears alongside sportsbook marketing.
- Promotional partnerships where Galaxy promotes specific sportsbook deals.
- Any arrangement where Galaxy's editorial independence becomes conditional on sportsbook commercial interests.

**Why:** Galaxy's brand position is "we don't sell picks to sportsbooks." Affiliate arrangements compromise that publicly even if they generate revenue.

### Category G (B2B data buyer)

Galaxy can license data outputs. Galaxy cannot license:
- Source code
- Factor model weights
- Methodology-as-IP

Acceptable license shapes:
- Galaxy's public published data feed (Ledger, Loss Room metadata, Pass List entries) for research use. Annual fee. Standard usage rights.
- Galaxy's calibration data for academic research. Often free if the research is publishable.

Decline if:
- The buyer wants to embed Galaxy's brand in their product without attribution clarity.
- The buyer wants to remix Galaxy's data into a competing product.
- The buyer wants exclusivity (Galaxy keeps right to license to multiple research firms).

### Category H (Acquisition / investment)

Galaxy is not currently positioned. Template 5 above is the standard response.

If pushed: politely defer. Explain that Galaxy needs more public track record before acquisition conversations make sense.

Per `12-acquisition-optionality.md`, the earliest realistic acquisition discussion is Year 2-3 at $3-10M ARR. Galaxy doesn't discuss acquisition shapes before that.

---

## When to engage a lawyer

Most partnerships don't need lawyer review at the inquiry stage. Lawyer engagement triggers when:

- The partnership has a real specific proposal worth $10k+ to Galaxy.
- The partner's contract template arrives.
- Galaxy needs to sign anything that creates obligation.

Galaxy's lawyer engagement is per `galaxy-contractor-playbook.md`. The lawyer review for a partnership contract is typically $1,000-3,000. Worth it if the partnership commits Galaxy to ongoing obligations.

---

## Tracking partnership inquiries

In `templates/partnership-inquiries.csv`:

```
date,inquirer_name,inquirer_company,inquirer_role,category,decision,framework_score,response_template_used,notes
2026-XX-XX,[Name],[Co],[Role],G,Engaged,7/7,Template 1,Data licensing inquiry — academic research firm
2026-XX-XX,[Name],[Co],[Role],B,Declined,2/7,Template 3,Affiliate offer from sportsbook
```

Track each inquiry. Pattern recognition over months shows what kinds of partnerships Galaxy attracts and which categories produce real value vs noise.

---

## Cross-references

- Operating values (the brand-position filter): `galaxy-operating-values.md`
- Brand voice canonical: `galaxy-brand-voice-canonical.md`
- Contractor playbook (for lawyer engagement on partnership contracts): `galaxy-contractor-playbook.md`
- Press kit (for media partnerships): `galaxy-press-kit.md`
- Live pitch variants (for streamer partnerships): `audit/04-live-pitch-variants.md`
- Live founding partner agreement (template): `copy/live-founding-partner-agreement-template.md`
- Outlier battlecard (competitor positioning context): `copy/outlier-competitive-battlecard.md`
- Acquisition optionality (for Category H): `12-acquisition-optionality.md`
- Crisis communications (for partnerships that go badly): `galaxy-crisis-communications-playbook.md`

---

*Partnerships are the conversations most likely to compromise Galaxy's brand position under commercial pressure. The framework above is the discipline that protects the position. Run the 7 questions; trust the matrix; politely decline what doesn't fit.*
