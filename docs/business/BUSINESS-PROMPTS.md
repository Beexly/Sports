# GSE Business Prompt Library

Ten prompts for the side of this business that has never been measured.

The framing is deliberate. Your own NORTHSTAR names blind-spot #4 as *"Revenue
reality went unexamined — today produced zero sentences about paying users,
funnel, or churn."* Meanwhile the entire fleet is pointed at an edge that, by
the plan's own admission, may never arrive. Under R2 ("the product never waits on
the edge") the business questions are not a side quest — they are the track that
has to work regardless of what the falsifier says.

Every prompt below is built to the same standard the engineering prompts are:
name the artifact and its path, state the required evidence format, forbid
fabrication explicitly, one task per prompt.

That standard applies to this document too. Every path and artifact these ten
prompts ask you to paste has been resolved against this repository — see
[**Path index**](#path-index--verified-against-this-repo) at the bottom. Two of
them do not exist here, and the index says which and what to paste instead.

---

## How these are structured, and why

Four things make a business prompt produce something you can act on rather than
something that reads well:

1. **State the deliverable, not the topic.** "Write three paragraphs about X"
   beats "tell me about X" by a wide margin — Anthropic's own eval on this exact
   rewrite moved 2.32 → 3.92 on a 10-point scale. Adding output constraints on
   top of that moved it 3.92 → 7.86. Specificity is the single largest quality
   lever available, and it costs nothing.

2. **Put the data above the question.** Long inputs first, the query last.
   Anthropic measured up to 30% better responses from queries placed at the end
   on complex multi-document inputs. Every prompt below follows that shape.

3. **Grant permission to say "I don't know."** This is the cheapest hallucination
   control there is, and it matters more here than almost anywhere, because the
   failure mode you cannot afford is a confident fabricated revenue number.

4. **Demand reasoning before the score.** When you ask for a rating without
   forcing justification first, models regress to the middle — Anthropic's own
   observation is that graders "default to middling scores around 6." Strengths,
   weaknesses, reasoning, *then* the number.

---

## 1 · The weekly funnel question

This is the one measurement this repo has never taken. NORTHSTAR puts it in the
founder queue as a recurring item and defines 12 weekly answers on record as part
of winning at 90 days. Run it every Monday.

```
<data>
[Paste: Stripe weekly summary — new subscriptions, cancellations, MRR,
failed payments. Analytics: unique visitors, signups, activation events.
Any support or feedback messages received this week.]
</data>

<prior_weeks>
[Paste the previous 2-3 weeks of this same answer, if they exist.]
</prior_weeks>

Answer the funnel question for the week above. Produce exactly these sections:

**The number.** Signups this week, paying conversions this week, churn this week,
net MRR change. If a figure is not present in the data above, write
MISSING: <figure> — never estimate, never interpolate, never carry forward last
week's number as if it were this week's.

**The delta.** How each number moved versus the prior weeks provided. If no
prior weeks were provided, say so and note that this is week 1 of the record.

**The one-sentence read.** What this week actually says about whether the door
exists. Not encouragement — a finding.

**Signal or noise.** Given the sample size, state explicitly whether this week's
movement is distinguishable from noise. Small numbers move a lot for no reason;
say so when that is the honest answer.

**What I'd need to answer better.** The specific measurement, event, or field
that is missing and would make next week's answer sharper.

Do not offer growth tactics. This prompt measures; it does not advise.
```

**The stop-loss that goes with it:** NORTHSTAR pre-commits that eight consecutive
"no signal" weeks triggers a 20,000-foot session on product-market fit — the
honest one, not a feature discussion. Put that trigger in the same file as the
answers so it fires on its own rather than needing someone to notice.

---

## 2 · Pricing a tier that may never get a performance claim

Your ladder gates PROVEN on ≥100 settled picks plus published calibration, and
ESTABLISHED on verified CLV ≥52.4%. Current evidence says the second may never
trigger. R2 says that is survivable *only if it is planned for*.

```
<pricing_current>
[Paste apps/web/lib/pricing/pricing-phases.ts]
</pricing_current>

<value_delivered_today>
[List what a paying user actually gets right now: the truth layer, the kill
ledger, calibration tooling, CLV tooling, the public record of what does not
work. Be concrete and be honest about what is shipped versus planned.]
</value_delivered_today>

Assume the ESTABLISHED tier never unlocks — no verified CLV threshold is ever
crossed, on any sport, ever. The FOUNDING tier must be viable forever on
tool-and-transparency value alone.

Produce:

**Is the current FOUNDING price defensible under that assumption?** Yes or no,
with the reasoning stated before the verdict.

**What a buyer is actually purchasing.** In their words, not ours. One paragraph.

**The three strongest objections** a prospective subscriber would raise, and
whether each has an honest answer available today. Where the honest answer is
"no," say "no."

**What would have to be true** for this price to feel obviously fair rather than
arguable.

**Where the pricing copy currently over-promises.** Quote the exact line and say
what it implies that the product does not deliver.

Do not propose a price change. Do not write marketing copy. Assess only.
```

---

## 3 · The launch narrative nobody can copy

Season start is the audience's moment of maximum attention, and the truth-layer
story is genuinely uncopyable — a competitor cannot start publishing their
failures without destroying their own product. That is a real moat and it is
being left on the table.

```
<the_honest_position>
- No edge has ever been demonstrated on real data.
- The instrument for finding one was broken four ways and has been repaired.
- Certification is a 2027 event on every sport, by our own arithmetic.
- The 2026 season is capture and shadow. We claim nothing.
- We publish what does not work, including our own dead hypotheses.
</the_honest_position>

Write the launch narrative for NFL Week 1 from the position above. Constraints,
all binding:

- Zero performance claims. No accuracy figures, no ROI, no win rates, no implied
  edge. Not hedged versions of those — none of them.
- The honesty is the pitch, not a disclaimer attached to a different pitch.
- A reader who bets should finish it understanding what they get and why it is
  worth money before any edge exists.
- Prose, not bullets. Three to five paragraphs.
- No hype vocabulary: no "revolutionary", "game-changing", "unprecedented",
  "cutting-edge".

Then, separately: list the three sentences in your own draft most likely to be
read as an implied performance claim, and rewrite each to remove the implication.
```

---

## 4 · Delegation triage for the founder queue

NORTHSTAR is explicit that the constraint is attention economics, and caps the
founder at ≤15 min/day from one queue of ≤3 items. Anthropic's own framework
gives you the sorting test: decide whether AI *should* do a task, not whether it
*can*, and sort into AI-appropriate (standardized, documented, repeatable),
AI-assisted (AI drafts, human reviews and owns), and human-led (high-stakes,
judgment-bearing, relationship-bearing).

```
<everything_on_my_plate>
[Dump the full list. Do not pre-filter it — pre-filtering is the judgment this
prompt is meant to apply.]
</everything_on_my_plate>

<constraint>
The founder has 15 minutes per day. The queue holds a maximum of 3 items.
Anything not in the queue does not get founder attention.
</constraint>

Sort every item into exactly one bucket:

**HUMAN-LED** — requires founder judgment, credentials, relationships, or
accountability that cannot be delegated. Database credentials, merges, signups,
arming a live track, any founder-YES flip, anything with legal or financial
exposure.

**AI-ASSISTED** — an agent seat drafts, the founder reviews and owns the result.
Say what the review step actually is and roughly how long it takes.

**AI-APPROPRIATE** — standardized and repeatable enough to hand over entirely.
Name the verification that proves it was done right, since nobody is watching.

Then:

**THE QUEUE.** The 3 human-led items with the highest information-per-minute —
where "information" means it changes what the operation does next. A 30-second
SQL query that reveals whether the archive is silently dead outranks an hour of
analysis that confirms something already believed.

**WHAT I'M DROPPING.** Everything not in the queue, with one line each on the
cost of dropping it. Be specific about what breaks.

For each queue item state the time cost. If the three exceed 15 minutes, cut to
fit and say what you cut.
```

---

## 5 · Cohort and churn read

Run once there are enough paying users for the question to mean anything. Running
it earlier produces confident noise, which is worse than no answer.

```
<subscription_data>
[Paste: signup date, plan, status, cancellation date if any, per user.
Anonymized — no emails, no names, no payment identifiers.]
</subscription_data>

Analyze retention. Required sections:

**Sample adequacy.** State n and whether it supports any conclusion at all.
If it does not, say so and stop — do not produce a retention curve from twelve
users and let its shape imply meaning it cannot carry.

**Retention by signup cohort.** Month over month, with n per cohort shown.

**Where people leave.** The specific point in the lifecycle, if it is visible.
If it is not visible in this data, name the event you would need to instrument.

**What this cannot tell us.** Explicit. Every question a reader will want
answered that this data does not answer.

Never fabricate a data point to complete a curve. A gap shown as a gap is more
useful than a smooth line that is partly invented.
```

---

## 6 · The competitive honesty audit

```
<our_public_surface>
[Paste the landing page, pricing page, and any published performance language.]
</our_public_surface>

<competitor_surfaces>
[Paste 2-3 competitors' equivalent pages.]
</competitor_surfaces>

Compare on one axis only: what each party claims versus what each party could
actually prove if asked.

**Their claims.** For each competitor, list the performance claims made and note
whether any evidence is offered. Do not speculate about whether they are lying —
report only what is claimed and what is shown.

**Our claims.** Same treatment, applied to us. Be harder on us than on them.

**Where we look weaker but are actually stronger.** Places our honesty reads as
a lack of results to a casual visitor.

**Where we are quietly making a claim we have not earned.** Quote the line.

**The one sentence** that would make our position legible to someone comparing
tabs — without adding a claim.
```

---

## 7 · Capture-readiness review

The moat is an un-buyable start date. A week of season not captured cleanly is
gone forever and cannot be re-bought at any price. This is the highest-stakes
business question in the next eight days, and it is disguised as an engineering
question.

```
<capture_checklist>
[Paste NORTHSTAR §4's "By Sept 3" list with current status per item.]
</capture_checklist>

<evidence>
[Paste actual query output, command output, or committed artifacts proving
status. Where an item has no evidence, leave it blank rather than describing it.]
</evidence>

For each item: `VERIFIED` / `CLAIMED BUT UNVERIFIED` / `NOT DONE` / `UNKNOWN`.

An item is VERIFIED only if the evidence block above contains output that
demonstrates it. A status reported in prose with no output is CLAIMED BUT
UNVERIFIED — that distinction is the whole point of this prompt, so apply it
strictly even where it feels pedantic.

Then:

**What breaks if Week 1 is captured dirty.** Concretely, per unverified item.

**The single item most likely to be silently broken right now.** Silently means
it would not announce its own failure. Justify the pick.

**Minimum viable capture.** If only 48 hours remained, the shortest list that
still produces a clean, un-reconstructible archive start.
```

---

## 8 · Turning a KILLED result into publishable content

Your kill ledger is a content engine that no competitor can run. Every dead
hypothesis is an article they cannot write, because writing it would cost them
their own credibility.

```
<killed_hypothesis>
[Paste the full record: what was tested, the preregistration, n, the result,
the verdict, the e-value.]
</killed_hypothesis>

Write a public post about this null result. Constraints:

- The finding is that it does not work. That is the whole story; do not rescue it
  with "but this suggests..." or "further research may show..."
- A reader should finish it better calibrated about sports betting generally.
- Show the method plainly enough that a skeptical reader could attempt to
  replicate it.
- No implication that our other work is therefore validated.
- Prose. 400-700 words. No bullets except where listing actual test parameters.

Then list every sentence that could be quoted out of context as a performance
claim, and rewrite each.
```

---

## 9 · Pre-mortem on the season

Run before Week 1, not after.

```
<the_plan>
[Paste NORTHSTAR §4 (calendar), §5 (two live tracks), and §6 (definition of
winning at 90 days).]
</the_plan>

It is January 2027. The season went badly — not catastrophically, just clearly
worse than the plan assumed. Nothing external caused it.

Write the retrospective from that future. Required:

**What went wrong, most to least likely.** Be specific and mechanical. "Capture
broke in week 3 and nobody noticed for eleven days" is useful; "execution
challenges" is not.

**Which failure was visible in August 2026.** For each, state whether the warning
sign existed at the time of writing and what it looked like.

**The cheapest thing that would have prevented each.** In hours, not in principle.

**The one that would be hardest to detect while it was happening.** This is the
most valuable line in the document.

Do not write an optimistic version. Do not balance it. The pre-mortem's value is
entirely in its pessimism.
```

---

## 10 · The Monday 15-minute brief

The recurring rhythm NORTHSTAR specifies. This one is meant to be fired by a
scheduled task rather than typed.

```
<state>
[Paste docs/ops/CURRENT_STATE.md — and docs/ops/OPEN_LEDGER.md for the queue.
The source library said `docs/ops/STATE.md`; that path does not exist here.
See the path index below.]
</state>

<week>
[Paste: commits landed, PRs opened/merged, ledger rows moved, funnel answer
from prompt #1.]
</week>

Produce a founder brief readable in under 3 minutes.

**The one thing that changed.** Single most consequential development. One
sentence.

**Queue status.** Each of the ≤3 founder items: done, blocked, or still waiting.
For blocked, the exact blocker.

**What is quarantined.** Anything from an agent handoff not yet verified against
the ledger and the truth surface. Name it; do not summarize its claims as if
they were established.

**The funnel answer.** One line, from the data.

**The next 3 queue items.** With time cost each, totaling ≤15 minutes.

**What I am not telling you.** Anything ambiguous, unverified, or that you had
to guess at. Never omit this section — an empty version of it is itself a claim,
so if it is genuinely empty, say "nothing ambiguous this week" explicitly.

No encouragement. No summary of things that did not change.
```

---

## Path index — verified against this repo

Resolved against `bb0e7df` (main at the time this library landed). The library's
own first standard is *"name the artifact and its path"*; this section applies that
standard to the library itself, so nobody pastes a file that is not there and nobody
treats a missing document as a present one.

| Asked for by | Artifact | Status |
|---|---|---|
| #2 | `apps/web/lib/pricing/pricing-phases.ts` | **VERIFIED.** Exists. Phase ids `FOUNDING` / `PROVEN` / `ESTABLISHED` / `AUTHORITY` confirmed in the file. PROVEN trigger reads "≥100 canonical settled picks AND a published calibration curve"; ESTABLISHED reads "≥500 settled picks AND a verified closing-line-value beat rate ≥52.4%". Prompt #2's premise matches the code. |
| #6 | Landing + pricing surface | **VERIFIED.** `apps/web/app/page.tsx`, `apps/web/app/pricing/page.tsx`, `apps/web/components/pricing/` (the pricing page imports its plan copy rather than containing it — paste both). |
| #8 | Kill ledger | **VERIFIED.** Public surface at `apps/web/app/kill-ledger/page.tsx`. |
| #10 | Truth surface | **VERIFIED.** `apps/web/app/api/ops/public-surface-truth/`, `apps/web/app/api/ops/daily-truth/`. |
| #10 | Ledger | **VERIFIED.** `docs/ops/AGENT_LEDGER.md`, checked by `npm run check:ledger` → `scripts/ops/check-agent-ledger.mjs`. |
| #1 | The answer log and its stop-loss | **CREATED.** `docs/business/FUNNEL-ANSWERS.md`. Prompt #1's own note asks for the trigger to live in the same file as the answers; it now does. |
| #10 | `docs/ops/STATE.md` | **ABSENT.** No such file, tracked or untracked. The live equivalent per `docs/ops/CANONICAL.md` is `docs/ops/CURRENT_STATE.md` (ground truth) plus `docs/ops/OPEN_LEDGER.md` (the queue). Prompt #10 has been repointed at those two. |
| #1, #4, #7, #9, #10 | NORTHSTAR — §4 calendar, §5 two live tracks, §6 winning at 90 days, the "By Sept 3" list, blind-spot #4, R2 | **ABSENT.** `git grep -i northstar` over the whole tree returns two hits, both about a Titanfall 2 mod in an old resource dump. The operating document itself is founder-held and is not in version control. |

### What the NORTHSTAR gap actually costs

Five of the ten prompts open by asking the founder to paste a section of a document
git does not hold. Those prompts still work — the founder has the document — but two
properties the rest of this repo takes for granted do not hold for them:

- **The paste cannot be diffed against a commit.** There is no way to check later
  which version of §4 produced a given answer, so a capture-readiness review (#7) or
  a pre-mortem (#9) cannot be re-derived from the record.
- **A wrong paste is undetectable.** Every other artifact in the table above can be
  re-read from the tree if an answer looks off. NORTHSTAR cannot.

This is a finding, not a task. Committing NORTHSTAR is a founder call — it is the
operating document, it may hold things that should not be in a repo, and nothing in
this library requires it. But the prompts that depend on it are, until then, the only
ones here whose inputs are unverifiable, and that is worth knowing before acting on
their output at fifteen minutes a day.

The same applies to `SONNET-MAX-LEVERAGE-PROMPT.md`, which the accompanying kit cites
for its §5 never-modify list and §7.3 verify block. It is not in this repo either.

---

## The pattern worth stealing

Every prompt above ends with something that forces the model to surface its own
weak points — `MISSING:`, "what I'd need", "what this cannot tell us", "what I am
not telling you". That is not politeness. It is the business-side version of the
honesty laws already governing the engineering side, and it is what makes an
answer safe to act on at 15 minutes a day.

The failure mode these guard against is specific: a fluent, well-formatted,
confident answer built partly on numbers that were never in the data. That
failure is invisible precisely when you are moving fastest.
