# Vault Weekly Digest — Week 2 sample

**Status:** Claude-drafted template. Garrett edits specifics before send.
**Length:** 821 words.
**Format note:** Week 2 covers a loss (vs Week 1's pass). Loss-format digests are the highest-value content for the Vault audience.

---

**Subject:** Vault digest, week 2 — the loss we should have seen, and the assumption that hid it
**Preheader:** A 64% confidence call that closed at -6.5 and lost on the back-door cover. What the autopsy found.

---

**The publication.**

This week's digest is a loss. [Specific game and side — e.g., "Sunday afternoon's Atlanta -3 publication, settled as a back-door cover for Tampa Bay 24-21."]

Confidence at publication: 64%. Pre-game line: -3. Closing line: -3.5. Final: 21-point Tampa Bay margin with 11 seconds left, before a 47-yard touchdown drive ended in a Tampa Bay endzone score with 4 seconds.

The loss is in the Loss Room with the full autopsy. This digest is the internal version of that autopsy — the reasoning I couldn't fit on the public page.

**The factor.**

The factor that drove the 64% was [specific factor — e.g., "Atlanta's rushing-EPA-when-leading metric, weighted against Tampa Bay's pass-rush pressure rate without their starting interior defender, who was downgraded to OUT on the Saturday injury report"].

In plain language: Atlanta runs the ball well when they're ahead, and Tampa Bay's defensive line was compromised. The factor read suggested Atlanta would run out the clock late, and the line at -3 was undervaluing how much that ground-game dominance would shrink the variance window for the cover.

Specifically: the model put a 73% probability on Atlanta leading by ≥4 in the fourth quarter, AND a 89% probability of "lead protection successfully running out the clock" conditional on leading by ≥4. The compound (73% × 89% = 65%) plus the model's small additional weight on Tampa Bay's struggles converting in must-score situations got us to 64% Atlanta covers.

**The assumption.**

The factor relies on an assumption I didn't articulate clearly enough at the time: that "lead protection running out the clock" is a binary outcome.

In retrospect, it's not binary. It's a distribution. The 89% probability assumes "successful clock-management" includes outcomes like "Atlanta leads by 7 with 90 seconds, kneels twice, kicks a punt, game over." But the actual range of outcomes inside that 89% includes "Atlanta leads by 4 with 90 seconds, can't quite kneel out the clock, has to punt with 30 seconds, Tampa Bay drives 47 yards in 30 seconds for a backdoor touchdown."

That second scenario doesn't "fail" the lead-protection assumption — Atlanta successfully avoided giving up the win. It just fails the cover.

I knew about the back-door cover risk in general. I didn't tag it specifically as the failure mode in this game. The factor weighting treated the 89% as "you're protected from the loss" without separately surfacing "you're not protected from the cover."

**What we were watching.**

This is the part of the autopsy I want to be precise about. Pre-game, I was watching:

1. Inactives lists, especially Tampa Bay's interior defensive line. (Confirmed — Tampa Bay's starter was OUT. Factor stayed in.)
2. Line movement between Friday evening and Sunday morning. (Line moved -3 → -3.5. Mild support for our side.)
3. Public/sharp money split. (Approximately 60/40 public/sharp on Atlanta — not a sharp-side red flag.)
4. Weather. (Dry, indoor. No factor.)

What I was NOT watching but should have been:

5. Recent backdoor-cover frequency for the underdog in similar game-script situations. The data exists; I didn't pull it. If I had, I would have seen Tampa Bay's offense ranked 6th in points-per-drive in the final 5 minutes of one-score games (this season). That's not a cherry-pick stat — it's a category my factor model already tracks, in a different factor.

The factor I was using cared about "Atlanta runs out the clock." The factor I should have ALSO been weighting was "Tampa Bay scores fast late in close games." Those two factors interact in the back-door scenario, and the model didn't compose them in this case.

**What we'd do differently.**

The honest answer:

1. Factor interaction. The lead-protection factor and the underdog-rapid-scoring factor need to be cross-weighted for one-score-game-script publications. This is a model-level change, not a publication-level change. Spec going to the engineering log this week.

2. Autopsy taxonomy. The Loss Room has a "root cause" tag on every autopsy. Right now my tag for this loss is "factor underweighted." That's accurate but vague. A more useful tag would be "factor-interaction blind spot." If I add the more specific tag, the Loss Room becomes a searchable database for patterns we haven't fully named yet. Spec for the cockpit.

3. Confidence threshold for one-score-game-script publications. The 64% confidence on this game might still be the right number after the factor-interaction fix, but the publication threshold (60% floor / 65% mid-series) might need a one-score-script-specific carve-out. Open question for office hours.

What I'm NOT doing:

- I'm not adding "always avoid Atlanta -3 in primetime" or any single-data-point heuristic. The autopsy is about a class of errors, not an instance.
- I'm not retroactively second-guessing the publication. The factor was strong. The publication was honest. The loss is real, and the autopsy is the work.

**Office hours next Tuesday at 8pm Eastern.** I want to walk through the proposed factor-interaction fix in detail and hear pushback. The room knows this stuff better than my Saturday-night brainstorm session.

— G

---

## Garrett's edit checklist

Before sending Week 2:

- [ ] Replace specific game + final score with actual loss from the week.
- [ ] Replace factor names with the actual factors from the model's reasoning trace.
- [ ] Replace specific percentages (73%, 89%, 64%) with actual model output.
- [ ] Confirm the autopsy in the public Loss Room aligns with this internal version.
- [ ] Confirm office hours date.
- [ ] Run compliance scanner.

## Why this digest works

- **A loss-format digest is brand-aligned content at maximum strength** — Galaxy's restraint is shown most clearly when losing.
- **The autopsy is more honest than the public Loss Room** — names a specific factor-interaction blind spot rather than the generic "factor underweighted" tag.
- **The proposed fix is operational, not aspirational** — three specific changes, two of which become engineering specs.
- **The "what I was NOT watching" section is the part Vault members will discuss** — surfaces the meta-level skill of knowing which factors to watch.
- **Closes with explicit invitation for pushback** — office hours framing makes the digest part of a conversation.

---

*Send Wednesday 9:00 AM Eastern. After 4–6 hours, post a discussion thread in #vault-lounge: "Curious if any members have run into the same factor-interaction blind spot in their own analysis — what factors do you find consistently miss the cross-interaction?"*
