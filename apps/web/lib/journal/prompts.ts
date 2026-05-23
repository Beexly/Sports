import type { JournalWeekData } from "./week-data";

/**
 * Model Journal - drafting prompt.
 *
 * Codex's Friday pipeline collects the week's settled-pick data, loss
 * autopsies, pre-mortem hit/miss tags, factor weight changes, and notable
 * gates into a JournalWeekData object. This file holds the canonical
 * drafting prompt the Claude API receives on Saturday.
 *
 * Spec: docs/product/model-journal-spec.md
 * Voice rules locked; modify only via decision-log entry.
 */

export const JOURNAL_DRAFTING_SYSTEM_PROMPT = `You are drafting the weekly Model Journal for Galaxy Sports Edge.

The Journal is a research blog about a deterministic sports-betting scoring
engine. The audience is the skeptic - technically literate, suspicious of
hype, allergic to marketing language.

Your job is to draft one essay (800-1500 words) about the previous ISO week.

STRUCTURE
1. Cold open. One sentence that says what the week was about. No "this week
   we..." constructions. Cold = direct.
2. The week in numbers. Settled picks, hits, misses (no aggregate win rate -
   we don't publish that). The numbers are the data, not the marketing.
3. What the model got right. Pick one or two settled wins where a specific
   factor read was the heaviest contributor. Walk through what the model saw
   and why.
4. What the model got wrong. Pick one or two losses. Reference the autopsy.
   Be specific about which factor misread and whether it was variance or a
   real signal-drift issue.
5. Pre-mortem performance. Of the pre-mortems published this week, how many
   bullets "called" the actual loss reason? Be honest - sometimes the answer
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
Markdown. Headings use ## (not #). Paragraphs are 3-6 sentences. Lists
sparingly. Code blocks for any signal score or factor name reference is
fine.

LENGTH
800-1500 words. Aim for 1000.

INPUT
You will receive a JournalWeekData object with:
- picks[]
- lossAutopsies[]
- counts
- rangeStart/rangeEnd`;

export function buildJournalDraftPromptUser(weekData: JournalWeekData): string {
  return `Week data for the draft:

ISO week: ${weekData.isoWeek}, year ${weekData.isoYear}
Evidence window: ${weekData.rangeStart} to ${weekData.rangeEnd}

Settled picks (${weekData.counts.settledPicks}):
${formatPicks(weekData)}

Loss autopsies (${weekData.counts.publicLossAutopsies}):
${formatAutopsies(weekData)}

Pre-mortem hit/miss tags:
Not available in this evidence bundle yet.

Factor weight changes (pending or shipped):
Not available in this evidence bundle yet.

Notable gates:
Not available in this evidence bundle yet.

Next week's slate stress tests:
Not available in this evidence bundle yet.

Draft the essay now. Markdown output. Adhere to all voice rules.`;
}

function formatPicks(weekData: JournalWeekData): string {
  if (weekData.picks.length === 0) return "No settled canonical picks found for this ISO week.";

  return weekData.picks
    .slice(0, 20)
    .map((pick) => [
      `${pick.id}: ${pick.matchup}`,
      pick.selection,
      pick.result,
      `confidence ${pick.confidence}`,
      `edge ${pick.edgeScore.toFixed(1)}`,
      `consensus ${Math.round(pick.consensusPct * 100)}%`,
      `${pick.bookmakerCount} books`,
      `model ${pick.modelVersion}`,
      `snapshot ${pick.signalSnapshot?.id ?? "none"}`,
    ].join(" | "))
    .join("\n");
}

function formatAutopsies(weekData: JournalWeekData): string {
  if (weekData.lossAutopsies.length === 0) {
    return "No public loss autopsies found for this ISO week.";
  }

  return weekData.lossAutopsies
    .slice(0, 12)
    .map((autopsy) => [
      `${autopsy.id}: ${autopsy.headline}`,
      `pick ${autopsy.pickId}`,
      `root cause ${autopsy.rootCause}`,
      `lesson tags ${autopsy.lessonTags.join(", ") || "none"}`,
      `learned: ${autopsy.whatWeLearned}`,
    ].join(" | "))
    .join("\n");
}
