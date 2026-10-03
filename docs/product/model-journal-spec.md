# Model Journal — Weekly Essay Specification

**Status:** Phase 3 build. Weekly research blog on the model itself.
**Owner of code:** Codex (data pipe + editor UI + publish flow).
**Owner of essays:** Claude (drafts) → product owner (reviews + publishes).
**Location:** `apps/web/app/journal/`, `apps/web/lib/journal/`, surfaces on the public site + `/cockpit/journal/` for authoring.

---

## TL;DR

Every Sunday, a Model Journal essay ships. It is a research blog post about what the model learned the previous week, what it got wrong, and what's changing in the next version. Tone: research blog, not marketing. No betting product publishes research posts. This is SEO + authority moat.

The pipeline: Codex pipes settled-pick data Friday → Claude drafts Saturday → owner reviews + publishes Sunday morning.

---

## What it is

- A weekly essay. 800–1500 words.
- Tone: Stripe documentation. Linear release notes. PFF methodology page. Terse, technical, specific.
- Subject: the model's behavior the previous week. What it saw. What it missed. What's changing.
- Audience: the skeptic. The technically-literate sports bettor who's earned by transparency, not by hype.
- Distribution: public on `/journal/[slug]`, RSS feed, email digest to Elite subscribers Sunday morning, optional Twitter thread teaser by the bot (Monday).
- Cadence: weekly. One per ISO week.
- Length: 800–1500 words. Long enough to be substantive, short enough to be read in a sitting.

---

## What it is NOT

- Not a "pick of the week" newsletter.
- Not a "here's what's hot this week" sports column.
- Not a recap of who won what — that's the Ledger.
- Not a marketing newsletter — no "sign up for Pro" CTAs in the body. Footer link only.
- Not a generic AI blog post. Reads as if it were written by someone who knows the engine intimately, because it is.

---

## Workflow

### Friday data pipe (Codex)

Friday afternoon, the pipeline collects:

1. All settled picks from the previous ISO week.
2. All `LossAutopsy` rows authored that week.
3. The pre-mortem hit/miss tagging from `Pick.preMortemContent` against actual outcomes.
4. Aggregate calibration deltas vs the prior 8-week trailing average (computed internally — not published as a number).
5. Any factor weight changes pending or shipped in the past week.
6. Notable gate decisions (games we considered and didn't publish).

The output is a structured `JournalWeekData` object passed to the drafting step.

### Saturday drafting (Claude)

Saturday morning, Claude generates a draft essay from the `JournalWeekData`.

The drafting prompt is held in `apps/web/lib/journal/prompts.ts`. Claude owns the prompt; Codex runs the inference.

Output is a markdown draft attached to a `ModelJournalEntry` row with `status: 'DRAFT'`.

### Sunday review + publish (owner)

Sunday morning, the owner opens `/cockpit/journal/[entryId]`, reviews the draft, edits as needed, and publishes.

Publish flow:

1. Compliance scanner runs on the final text. Hard refuse on banned vocabulary, unsupported claims, comparisons to competitors.
2. On green, the entry is set to `status: 'PUBLISHED'` and `publishedAt: now()`.
3. The entry surfaces on the public site at `/journal/[slug]`.
4. Email digest queues for Elite subscribers (delivered Sunday by 10am ET).
5. Twitter bot schedules a thread teaser for Monday morning.

---

## Drafting prompt (canonical, lives at `apps/web/lib/journal/prompts.ts`)

```
You are drafting the weekly Model Journal for Galaxy Sports Edge.

The Journal is a research blog about a deterministic sports-betting scoring
engine. The audience is the skeptic — technically literate, suspicious of
hype, allergic to marketing language.

Your job is to draft one essay (800–1500 words) about the previous ISO week.

STRUCTURE
1. Cold open. One sentence that says what the week was about. No "this week
   we..." constructions. Cold = direct.
2. The week in numbers. Settled picks, hits, misses (no aggregate win rate —
   we don't publish that). The numbers are the data, not the marketing.
3. What the model got right. Pick one or two settled wins where a specific
   factor read was the heaviest contributor. Walk through what the model saw
   and why.
4. What the model got wrong. Pick one or two losses. Reference the autopsy.
   Be specific about which factor misread and whether it was variance or a
   real signal-drift issue.
5. Pre-mortem performance. Of the pre-mortems published this week, how many
   bullets "called" the actual loss reason? Be honest — sometimes the answer
   is "the actual cause wasn't in any pre-mortem and that's a coverage
   problem."
6. What's changing. Any factor weight changes shipping in the next model
   version. Or a note that the changes are still being evaluated.
7. Forward look. One or two specific things the next week's slate is going
   to stress-test.

VOICE
- Stripe documentation. PFF methodology. Linear release notes.
- Active voice. Present and past tense, not future-conditional.
- No first-person singular ("I"). Use "the model," "the engine," "we" only
  when referring to the operator team (autopsy author voice).
- No marketing-style adjectives ("powerful," "robust," "sophisticated").
- No hedging language ("might," "could possibly," "we'll see"). Either
  commit to a read or refuse to.
- Cite specific factor names, specific game IDs, specific signal scores.
- Numbers are formatted as numbers, not "a significant number" or "a lot."

PROHIBITED
- No banned vocabulary from docs/positioning.md.
- No aggregate win-rate claim.
- No comparison to other operators.
- No "you should bet" or "tail this" language.
- No anthropomorphizing the engine.
- No marketing CTAs in the body.
- No emoji.

OUTPUT
Markdown. Headings use ## (not #). Paragraphs are 3–6 sentences. Lists
sparingly. Code blocks for any signal score or factor name reference is
fine.

LENGTH
800–1500 words. Aim for 1000.

INPUT
You will receive a JournalWeekData object with:
- settledPicks[]
- lossAutopsies[]
- preMortemTags[]
- factorWeightChanges[]
- notableGates[]
- nextWeekSlate[]
```

This prompt is durable. Append to expand scope; do not delete from it.

---

## Public surface

### `/journal` index page

Lists all published entries. Latest at top. Each entry shows:

- Headline (from `ModelJournalEntry.title`).
- ISO week tag (e.g. "Week 21, 2026").
- Cold open (first paragraph).
- Read time estimate.
- Link to full entry.

Pagination: 20 entries per page.

### `/journal/[slug]` detail page

The full essay. Plus:

- Cross-references to picks discussed (each pick is a link to its Game Room).
- Cross-references to autopsies discussed (link to the Loss Room entry).
- Cross-reference to factor weight changelog if mentioned.
- Email signup for the weekly digest (Elite tier or free email signup with one-pick-a-week teaser).
- RSS feed link.

### RSS feed

Standard RSS feed at `/journal/rss.xml`. Updated when an entry publishes.

### Email digest

Elite subscribers get the full essay via email Sunday morning. Free subscribers can opt into a "highlights" version with the cold open + a teaser.

Delivery via the existing transactional email provider (Resend recommended per master plan Part 2.E queue).

---

## Schema additions

Codex adds the migration when Phase 3 fires.

```prisma
model ModelJournalEntry {
  id              String                   @id @default(cuid())
  isoWeek         Int                      // 1..53
  isoYear         Int
  status          ModelJournalEntryStatus  @default(DRAFT)
  title           String
  slug            String                   @unique
  body            String                   @db.Text
  bodyMarkdown    String                   @db.Text
  modelVersion    String

  // Cross-references — JSON for now, normalize if it becomes structured
  referencedPickIds        String[]
  referencedAutopsyIds     String[]
  referencedFactorChanges  Json?

  // Authoring
  authorEmail     String
  draftedAt       DateTime                 @default(now())
  reviewedAt      DateTime?
  publishedAt     DateTime?

  // Distribution
  emailedAt       DateTime?
  twitterTeasedAt DateTime?

  createdAt       DateTime                 @default(now())
  updatedAt       DateTime                 @updatedAt

  @@unique([isoYear, isoWeek])
  @@index([status])
  @@index([publishedAt])
}

enum ModelJournalEntryStatus {
  DRAFT
  REVIEW_PENDING
  PUBLISHED
  RETRACTED
}
```

---

## Compliance scanner

Every entry runs through the platform compliance scanner before publish. Hard refuse on:

- Banned vocabulary.
- Aggregate win-rate claims.
- Competitor comparisons.
- "Best book" or "sharpest" language.
- Personal betting advice.
- Anthropomorphic engine framing.

The scanner is the same one used by Galaxy Studio + Twitter bot. Consistent enforcement.

---

## Eval coverage

Required evals at `docs/ops/evals/model-journal-*.md`:

- One eval per structural section confirming the section appears.
- One eval per banned-vocabulary trigger.
- One eval per voice violation (first-person singular, hedging language, marketing adjective).
- One eval on an "average" week (mostly wins, some losses).
- One eval on a "tough" week (mostly losses, autopsy-heavy).
- One eval on a "quiet" week (few publications, mostly gates).

Eval runner fires against the prompt with synthetic `JournalWeekData` inputs to verify the output respects all rules.

---

## Acceptance criteria (Phase 3 Journal v0 → green)

1. `ModelJournalEntry` schema shipped + migration applied.
2. Friday data-pipe scheduled job collects the week's data.
3. Saturday drafting job runs Claude API inference, persists draft.
4. `/cockpit/journal/[id]` review UI lets the owner edit + publish.
5. Compliance scanner runs on publish.
6. `/journal` index + `/journal/[slug]` detail pages render.
7. RSS feed published.
8. Sunday email digest delivers to Elite subscribers.
9. Monday Twitter thread teaser fires from the bot.
10. All eval files pass.
11. Banned-vocabulary scan on 8 weeks of synthetic input + drafted output returns zero hits.

When all 11 hold, the Journal is v0-live.

---

## Open items

- **OPEN-JOURNAL-1:** Should the cold open be auto-generated, or always owner-written? Default: auto-generated as a draft; owner has full edit rights. Confirm.
- **OPEN-JOURNAL-2:** What happens on a week with zero settled picks (very thin slate, mid-summer)? Default: the Journal entry still publishes, with content acknowledging the quiet week and explaining why the model gated everything. Codex confirms the data-pipe handles empty input gracefully.
- **OPEN-JOURNAL-3:** Should past entries be tagged + searchable by factor? Default: yes, Phase 4 add. Phase 3 ships without tags.
- **OPEN-JOURNAL-4:** Translation / multi-language support? Default: no, English only through Phase 6+.

---

*Spec authored by Claude. Codex implements pipeline + surfaces. Owner reviews + publishes. Voice locked.*
