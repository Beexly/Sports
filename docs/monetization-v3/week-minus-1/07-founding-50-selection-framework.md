# Founding-50 Cohort Selection Framework

**Goal:** Pick 50 invitees from a pool of ~50–60 candidates (30 customer dev interviewees + ~20–30 strongest Galaxy Elite subscribers). Convert ~40 of the 50 invited into actual founding members during the 14-day pre-launch window.

**Why the founding-50 matters:** The first 50 set the culture of the Vault community. If the first 50 are tout-traders, Vault becomes a tout-trading channel. If the first 50 are research-skeptics, Vault becomes a research-skeptic channel. The selection bias is the brand bias.

---

## The candidate pool

### Pool A — Customer dev interviewees with `early_commit = yes`

From the 30-interview tracking sheet, filter:

- `early_commit = yes`
- `intent_to_join` in (`definitely`, `likely`)
- `politeness_suspected = FALSE`

Expected pool size: 15–25 (out of 30 interviewees).

### Pool B — Galaxy Elite subscribers (engagement-ranked)

From Stripe + Galaxy database, filter:

- Active Elite subscription ≥ 60 days
- Site interaction ≥ 5 times in last 30 days
- Has engaged with Loss Room OR Pass List at least once
- NOT already in Pool A (don't double-count if an Elite subscriber was also interviewed)

Rank by:
- Recency of last login (most recent first)
- Frequency of /board + /ledger + /loss-room visits
- Email reply history (engaged with Galaxy communications)
- Discord engagement (if in Galaxy Discord)

Expected pool size: 20–30.

### Pool C — Strong-signal referrals from interviewees

Interviewees often surface referrals (`referrals_offered` column). If a referral is:
- Mentioned by 2+ interviewees independently, OR
- Vouched-for with specific reasoning ("they'd love this — they care about the same things I do"), OR
- A specific named name with handle/email

Add to Pool C. Cold-outreach Template 9 from `CODEX_MONETIZATION_V3_MASTER_BRIEF.md` Part 4.3.

Expected pool size: 5–10. Quality varies — many referrals don't engage; the ones who do are unusually high-conviction.

---

## The scoring rubric (per candidate)

Score each candidate on 5 dimensions. 1–5 each. Total 5–25.

### Dimension 1 — Brand-alignment signal (1–5)

How well does the candidate's stated values match Galaxy's restraint posture?

- 5: Explicitly cited Loss Room or Pass List in interview / engagement as a reason for liking Galaxy.
- 4: Talked about transparency / accountability / not trusting touts in their own words.
- 3: Generally aligned but didn't surface the specific brand-position elements.
- 2: Neutral — likes Galaxy for its content but indifferent to positioning.
- 1: Misaligned — wants picks, wants more volume, wants Galaxy to be more like Outlier.

Founding-50 cohort needs majority 4–5 on this dimension to set culture correctly.

### Dimension 2 — Engagement depth (1–5)

How deeply does the candidate engage with Galaxy already?

- 5: Daily site visits + Discord active + email replies + responded to multiple Galaxy publications.
- 4: Weekly site visits + occasional Discord + email open + reply history.
- 3: Monthly site visits + occasional email open.
- 2: Sporadic site visits.
- 1: Subscribed but rarely interacts.

Engagement depth predicts Vault retention. The founding-50 should be the most engaged Galaxy users.

### Dimension 3 — Conviction signal (1–5)

How certain is the candidate they want Vault?

- 5: "Definitely" intent + specific reasoning + already asked when Vault opens.
- 4: "Likely" intent + clear reasoning + said yes to founding-50 prompt.
- 3: "Likely" intent + general enthusiasm but reasoning was thin.
- 2: "Maybe" intent + cautious.
- 1: "Maybe" or below intent.

Below 3 should not be in the founding-50 — they'll churn fast.

### Dimension 4 — Network signal (1–5)

How visible / influential is the candidate in adjacent communities?

- 5: 50k+ followers on Twitter, hosts a podcast, regular Substack publisher in sports analytics, or runs a Discord community.
- 4: 10–50k followers, active in multiple sports-analytics communities, posts research publicly.
- 3: 1–10k followers, occasionally posts publicly.
- 2: Has presence but quiet.
- 1: No public presence.

Network signal isn't required for founding-50 — but if 5–8 of the 50 are 4–5 on this dimension, they become organic advocates post-launch.

### Dimension 5 — Diversity-of-perspective (1–5)

Does adding this candidate increase or decrease the cohort's perspective diversity?

- 5: Brings a perspective unrepresented in current founding-50 selections (different sport, different bettor type, different demographic, different geography).
- 4: Adds modest diversity.
- 3: Similar to other selections but not redundant.
- 2: Redundant with 3+ already-selected candidates.
- 1: Very redundant.

This dimension is computed RELATIVE to candidates already selected. Score iteratively.

### Total score interpretation

| Total score | Action |
|---|---|
| 22–25 | First wave invitees (1–10 of 50) |
| 18–21 | Second wave invitees (11–25) |
| 14–17 | Third wave invitees (26–50) |
| Below 14 | Do not invite to founding-50; consider for general Vault launch waitlist |

---

## The selection process

### Step 1 — Score all candidates (4 hours)

Score every candidate in Pool A, Pool B, Pool C on all 5 dimensions. Tracking sheet column: `founding_50_score` (1–25).

This takes ~5 minutes per candidate × ~60 candidates = ~5 hours. Block calendar.

### Step 2 — Diversity audit (1 hour)

Once scored, review the top-50 by score against diversity criteria:

- Sport coverage spread (no more than 60% NFL)
- Frequency tier mix (not all daily bettors)
- Spend tier mix
- Geographic spread (US-centric is OK, but ideally some non-US)
- Tenure mix (mix of new and veteran Galaxy users)

If top-50 over-indexes on one dimension, swap in candidates from positions 51–55 who add diversity. Use Dimension 5 scoring to guide swaps.

### Step 3 — Lock the list (30 min)

Final founding-50 list. Save to:
- Tracking sheet `founding_50_status = INVITED`
- Separate private, owner-only roster file under `reviews/`

### Step 4 — Decision-log entry (15 min)

DEC-NEXT-004 from `06-decision-log-entry-templates.md`. Include scoring methodology + key trade-offs.

---

## The invitation

### Invitation email (Template — sent to all 50 simultaneously)

```
Subject: Founding-50 — Vault opens to you first

Hey [first name],

You're on the founding-50 list for Vault — the premium Galaxy tier we've been validating.

You're getting this because [one specific reason — pulled from interview notes or engagement history]:

[Example: "Your Loss Room engagement told me you'd want to be in the room where we talk about how that data gets made."]
[Example: "Your call last week made it clear Vault was built for readers like you."]
[Example: "[Mutual contact] vouched for the kind of reader you are."]

Vault opens publicly on [date]. The founding-50 window opens 14 days before — that's why you're hearing first.

Here's what to expect:

- $200/year, locked at founding rate for life.
- Weekly internal-rationale digest (Wednesdays).
- Monthly group office hours (second Tuesdays, live Discord).
- Quarterly private data review.
- Early access to the Model Journal draft.
- Vault-only Discord channel.
- Founding badge (custom Discord role).

If you want in: [signup URL — bypasses public landing, goes direct to founding-50 checkout]

If you want to think about it: no pressure. The window is open through [date 14 days from send].

If you want to ask questions before deciding: just hit reply. I'll be in your inbox same-day.

Glad to have you in the founding cohort.

— Garrett
```

### What to expect from the invite

- 60–80% conversion in the first 72 hours. The strongest candidates click and pay.
- 10–15% convert in days 3–14 after follow-up nudge.
- 5–15% don't convert. That's fine — some interviewees overestimated their commitment in the moment.

Target: 40+ of 50 invited become founding members within the 14-day window.

If <30 convert: investigate. Likely causes: (a) pricing landed wrong in customer dev synthesis, (b) timing collision with NFL playoffs / NBA Finals / etc., (c) invitation copy didn't feel personal enough.

### Follow-up cadence

**Day 3 (no signup yet):** Soft follow-up DM or email (Template 4 adapted for founding-50).

**Day 7 (still no signup):** Personal note from Garrett — 2 sentences, "checking in if anything's off, happy to answer questions."

**Day 13 (no signup):** Last touch — "founding window closes tomorrow, no pressure either way, public window opens after."

**Day 14:** No further touches. Public Vault opens.

---

## The badge mechanics

Founding-50 members get a permanent `vault-founding-member` role in Discord. This is in addition to the standard `vault-member` role.

Visual: founding members get a small star icon next to their name in Discord. (Custom emoji-as-role-icon if Discord allows; otherwise role color slightly different.)

Founding mention in V2: if Vault hits V2 cap-lift, founding-50 members get first priority on V2 conference seats, signed Almanac copies (if hardcover edition gets a signed tier), and any other founding-member benefits added post-launch.

**Founding price guarantee:** $200/year locked for life of continuous subscription. If Vault price ever rises (e.g., V2 cap-lift includes price bump to $300), founding-50 stays at $200. Documented in terms-of-service so it's contractually binding.

**Founding membership transferability:** NOT transferable. If a founding member cancels their subscription, the founding rate doesn't transfer to a new account. (Prevents abuse where founding members sell their slot.)

---

## What NOT to do with the founding-50

1. **Don't announce the founding-50 list publicly.** Member identities stay private unless they self-disclose.
2. **Don't offer founding-50 members anything beyond what they signed up for.** Resist the temptation to "sweeten the deal" mid-window. Sweetening signals lack of confidence and devalues the founding status.
3. **Don't extend the 14-day window if conversion is lagging.** The deadline is part of the offer. Extending it teaches members that Galaxy doesn't mean what it says.
4. **Don't let any founding-50 invitee jump the queue if they refer others.** Their invite is theirs. Referrals get the public-launch window.
5. **Don't make founding-50 a "VIP" tier with separate channels.** They're in the same Vault Discord as everyone else, just with a small visual badge. Brand-aligned restraint.

---

## What to do for the founding-50 ongoing

Post-launch, Garrett gives founding-50 members one additional touchpoint per quarter:

- A short personal email (under 200 words) from Garrett, summarizing where Vault is + thanking them for being early.
- Sent quarterly, not on a fixed cadence (varies by ±2 weeks to feel personal not transactional).
- Replies to these emails get same-day response from Garrett.

The 4-email-per-year founder touch is what makes founding-50 status feel real over time. Without it, founding-50 fades into general Vault membership.

---

## Cross-references

- Tracking sheet: `docs/monetization-v3/week-minus-1/01-vault-interview-tracker-template.csv`
- Decision log entry: `06-decision-log-entry-templates.md` § DEC-NEXT-004
- Discord launch pack: `copy/vault-discord-launch-pack.md`
- Welcome email sequence: `copy/vault-welcome-emails.md`

---

*The founding-50 is the cultural seed of Vault. Pick well, treat them well, and they become the loudest advocates for everything else Galaxy ships. Pick poorly, and the Vault culture takes 12 months to recover.*
