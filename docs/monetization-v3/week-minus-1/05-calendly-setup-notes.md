# Calendly Setup for Vault Customer Dev Sprint

**Goal:** Single Calendly event type that captures 30-minute interview slots with the right qualification + minimal friction.

---

## Event setup

**Event name:** `Vault customer research call — 30 min with Garrett`

**Description (shown to invitee when booking):**

```
30 minutes with Garrett (founder, Galaxy Sports Edge) for research before I commit to building the next Galaxy tier.

This isn't a sales call. I want your honest reaction to what I'm thinking. No prep needed.

As a thank-you: 30-day extension on your current Galaxy subscription, or a 30-day Elite trial if you're not subscribed.

Bring whatever you want me to know. I'll listen more than I talk.
```

**Duration:** 30 minutes

**Buffer time:**
- Before event: 5 minutes
- After event: 25 minutes (total 30-min buffer after each call)

**Availability window:** Tue–Sat of customer dev week, 9:00 AM – 5:00 PM Eastern. 4 slots per day max.

**Daily availability blocks (recommended):**
- 9:00 AM – 9:30 AM
- 11:00 AM – 11:30 AM
- 1:00 PM – 1:30 PM
- 3:00 PM – 3:30 PM

That's 4 slots/day × 5 days = 20 slot capacity. Plus 5 reserves for reschedules/makeups. Total: 25 capacity. Need 30 interviews → over-book by 5 in expectation that 5 will no-show or cancel.

**Time zone:** Eastern. Respondents see in their local zone automatically.

## Booking form questions

Keep this short. Every question added drops conversion by ~5%.

**Required questions:**

1. **First name** (required, single line)
2. **Email** (required, prefilled if from Calendly account)
3. **How did we connect?** (multiple choice — single answer)
   - Galaxy Elite subscription
   - Twitter (@GalaxySportsAI follower)
   - Sports betting Discord community
   - Referral from another interviewee
   - Other

**Optional questions:**

4. **Anything specific you want to make sure we cover?** (optional, freeform — helps Garrett tailor each call)

That's it. Don't ask about betting frequency, spend, sport — those go in the interview itself.

## Confirmation email customization

**Subject line:** `Confirmed — 30 min with Garrett, Galaxy Sports Edge`

**Body (auto-sent on booking):**

```
Hey [first name],

Confirmed for [day] at [time] [time zone].

Quick context so the call is high-signal:

- This is 30 minutes of research. No pitch.
- I'll share my screen at some point and walk you through the Galaxy site.
- If you want to come in cold, that's fine. If you want to look at galaxysportsedge.com beforehand, also fine — particularly the Loss Room page (/loss-room).
- I'll send a Zoom link 15 min before the call.

Looking forward to it.

— Garrett
```

## Reminder email

24 hours before:

```
Hey [first name],

Quick reminder that we're talking tomorrow at [time].

Zoom link: [link]

If anything's come up and you need to reschedule, just hit reply.

— Garrett
```

## Cancellation / reschedule auto-response

```
Hey [first name],

No problem. If you want to grab another slot this week, here's the link: [Calendly URL]

If now isn't the right time, just hit reply and I'll loop back in 3–4 weeks.

— Garrett
```

## Zoom integration

- Use Calendly's native Zoom integration so each booking auto-creates a Zoom meeting.
- Default to cloud recording with audio + video.
- Set Zoom to require consent for recording in the meeting settings (so the recording-consent question is asked twice — once by Zoom, once by Garrett at start of call).
- Transcript: enable Zoom's auto-transcript (Zoom + Otter integration if available).

## Post-call automation (optional)

If Calendly is connected to Galaxy's CRM (likely HubSpot per memory):

- Create a contact in HubSpot with source = `Vault customer dev — [pool]`.
- Tag with `customer-dev-vault-2026-05` for cohort retrieval later.
- After call: webhook fires "interview completed" → if Garrett tags the booking as `completed`, auto-send the thank-you email from Template 5.

If no CRM integration: Garrett manually logs in the tracking sheet within 1 hour of call.

## What to NOT do in Calendly

- Don't add a "what's your annual betting spend?" question pre-booking. Surfaces friction; the question belongs in the interview itself.
- Don't add a "do you currently use Outlier?" question pre-booking. Biases the conversation.
- Don't make booking require a paid Galaxy subscription. Cuts the cold-Twitter recruit pool.
- Don't auto-send promotional content after booking. Brand discipline.

## Quick deployment checklist

- [ ] Calendly account ready (use Garrett's existing or create new)
- [ ] Event type created with above settings
- [ ] Zoom integration connected
- [ ] Booking form fields configured per above
- [ ] Confirmation email + reminder email + cancellation auto-response customized
- [ ] Tested booking flow (book a slot from a different account, confirm everything fires)
- [ ] Calendly URL ready to paste into outreach templates

Total setup time: ~30 minutes.

---

## Calendly URL for outreach templates

Once configured, the URL pattern looks like:
`https://calendly.com/garrett-galaxysportsedge/vault-customer-research`

Drop this into the placeholder `[Calendly URL]` in outreach templates 1, 2, 3, 4, 6, 7, 9 from `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 4.3.

---

*Calendly is the lowest-friction scheduling tool in this category. Setup is ~30 minutes. Don't over-engineer it; the goal is "respondent clicks link → 90 seconds later they have a slot."*
