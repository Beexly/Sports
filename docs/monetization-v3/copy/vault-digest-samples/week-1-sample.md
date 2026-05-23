# Vault Weekly Digest — Week 1 sample

**Status:** Claude-drafted template. Garrett edits specifics (named publication, named factor weights, named verbatim outcomes) before send.
**Length:** 743 words.
**Ship cadence:** Wednesday 9:00 AM Eastern, week 1 of Vault launch.

---

**Subject:** Vault digest, week 1 — what happens when high confidence meets late news
**Preheader:** A pass we made on Tuesday, why the model held back, and what the late update would have changed.

---

The first digest, plainly.

This is the first weekly internal-rationale digest. The contract for these is in the welcome email you got last week: each one covers one publication or pass, in five sections, in 500–900 words. This one runs on the longer side because the first one is the only one that has to explain itself a little.

**The publication.**

What I want to walk through this week is a pass — not a publication. The game in question was [specific game from prior week — e.g., "Cleveland-Indianapolis Sunday afternoon"]. The model surfaced it Friday evening at 61% confidence on [specific side]. By Sunday morning, the confidence had walked back to 58% as a late injury update reduced the weight of one factor. We did not publish. The Pass List entry is dated Sunday 9:42 AM.

If you went looking for Galaxy's call on this game over the weekend, you didn't find one. This is why.

**The factor.**

The factor that drove the original 61% was [specific factor — e.g., "defensive line health-adjusted EPA differential"]. It's a category-three factor in our weighting (medium-high) for primetime games where one defense has a meaningful health-adjusted advantage and the betting market hasn't fully priced it in. By Friday evening, the model was reading a ~6-point differential between the two defenses on this measure, with the line sitting at 3.5.

That gap — model implied edge of ~2.5 points on the line — is what drove the 61%.

**The assumption.**

The factor relies on one assumption I want to name explicitly: that pre-game injury reports filed by Friday evening are stable enough by Sunday morning to use as predictive inputs.

Most of the time, they are. The NFL's injury-report cadence is structured by league rules — Friday is the "designation day" where probable/questionable/doubtful gets finalized for most games. For ~80% of games, Friday's designations hold through Sunday kickoff.

But this is a probability claim, not a certainty. Roughly 20% of games see a meaningful Friday → Sunday injury status change. When that happens, factors built on Friday's data become unreliable.

This week's game was in that 20%.

**What we were watching.**

Three signals would have kept the publication live:

1. Saturday afternoon practice report confirming no further status updates on the player in question. (Did not happen — the team's afternoon update flagged limited practice availability.)
2. Sharp money holding the line at 3.5 or moving it our direction. (Did not happen — line drifted to 4 by Saturday evening, suggesting the market saw the same injury signal and was pricing it in.)
3. Our internal reverse-check against two external models landing within 2% of our 61%. (Partial — one external landed at 59%, one at 56%. The 5-point spread between them was itself a warning that the input data was noisy.)

The model recomputed Sunday morning with the updated injury status. New confidence: 58%. Below the 60% publication floor for primetime games. Pass List entry filed automatically.

**What we'd do differently.**

This is the section I want to be most honest about, because the answer is "less than you'd think."

If we ran this publication cycle again with hindsight — knowing the player was a game-time decision and ultimately played at reduced minutes — the call to pass was correct in process. The factor would still have walked back. The publication floor would still have caught it. Pass List would still have been the right outcome.

The thing we MIGHT do differently: publish a "Pass List highlight" annotation flagging this specific factor's volatility. Right now the Pass List shows the bare facts (game, confidence at time of pass, factor that drove it). It doesn't surface "this was a closer call than most passes" vs "this was a clean pass." The annotation would help readers calibrate when our pass discipline is doing more work than usual.

I don't know yet if we'll add that annotation. The Vault Discord is the right place to argue it. If 5+ members tell me they'd find the annotation useful, I'll spec it.

**Office hours are next Tuesday at 8pm Eastern in #vault-office-hours.** The conversation I want to have most is the one this digest sets up — when does the model's pass discipline help vs hurt, and is there a way to surface which pass is which without revealing weights?

That's the digest. Replies in #vault-lounge welcome.

— G

---

## Garrett's edit checklist

Before sending Week 1:

- [ ] Replace `[specific game from prior week]` with actual game from the week ending immediately before send date.
- [ ] Replace `[specific factor]` with the actual factor name from the model's reasoning trace.
- [ ] Replace the 61% / 58% / 6-point / 3.5 / 4-point numbers with actual model output values. (If they round to similar shapes, that's fine.)
- [ ] Confirm the Saturday/Sunday timeline matches what actually happened.
- [ ] Confirm office hours date in the closing line.
- [ ] Run compliance scanner — should pass; no banned vocabulary in the draft.
- [ ] Read aloud. If any sentence reads like marketing copy, rewrite.

## Why this digest works

- **Structure follows the five-section contract** — sets the precedent for every future digest.
- **The "pass" framing is more interesting than a publication framing** — Galaxy's restraint is the brand, and the pass is the brand expressing itself.
- **Names the assumption explicitly** — "assumes 80% of injury reports hold from Friday to Sunday" is the kind of specific Galaxy reasoning members will quote in conversations.
- **Doesn't over-explain Vault** — assumes members read the welcome email already.
- **Office hours close ties back to the digest content** — gives the next week's office hours an organic agenda item.
- **The "what we'd do differently" is honest** — answer is "less than you'd think." Galaxy voice rejects easy-lesson framing.

---

*Send Wednesday 9:00 AM Eastern. After 4–6 hours, post a discussion thread in #vault-lounge linking back to the digest with one question: "Anyone else have a take on whether the Pass List annotation idea would help or just add noise?"*
