import type { JournalWeekData, JournalWeekPickEvidence } from "./week-data";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function pickLine(pick: JournalWeekPickEvidence): string {
  return [
    `- ${pick.matchup}: ${pick.selection}`,
    `${pick.result}`,
    `confidence ${pick.confidence}`,
    `edge ${pick.edgeScore.toFixed(1)}`,
    `consensus ${formatPercent(pick.consensusPct)}`,
    `${pick.bookmakerCount} books`,
    `pick ${pick.id}`,
  ].join(" - ");
}

function sectionLines(title: string, picks: readonly JournalWeekPickEvidence[]): string {
  if (picks.length === 0) {
    return [`## ${title}`, "", "No settled picks in this category for the selected week."].join("\n");
  }

  return [`## ${title}`, "", ...picks.slice(0, 6).map(pickLine)].join("\n");
}

export function composeJournalDraftMarkdown(
  title: string,
  weekData: JournalWeekData
): string {
  const wins = weekData.picks.filter((pick) => pick.result === "WIN");
  const losses = weekData.picks.filter((pick) => pick.result === "LOSS");
  const pushes = weekData.picks.filter((pick) => pick.result === "PUSH");
  const rangeStart = weekData.rangeStart.slice(0, 10);
  const rangeEnd = weekData.rangeEnd.slice(0, 10);

  return [
    `# ${title}`,
    "",
    `ISO week ${weekData.isoWeek}, ${weekData.isoYear}. Evidence window: ${rangeStart} to ${rangeEnd}.`,
    "",
    "## Week In Numbers",
    "",
    [
      `Settled picks: ${weekData.counts.settledPicks}`,
      `Wins: ${weekData.counts.wins}`,
      `Losses: ${weekData.counts.losses}`,
      `Pushes: ${weekData.counts.pushes}`,
      `Public loss autopsies: ${weekData.counts.publicLossAutopsies}`,
    ].map((line) => `- ${line}`).join("\n"),
    "",
    sectionLines("Signals That Held", wins),
    "",
    sectionLines("Signals That Missed", losses),
    "",
    sectionLines("Pushes", pushes),
    "",
    "## Loss Autopsies",
    "",
    weekData.lossAutopsies.length === 0
      ? "No public loss autopsies are attached to this week yet."
      : weekData.lossAutopsies
        .slice(0, 6)
        .map((autopsy) => [
          `- ${autopsy.headline}`,
          `root cause ${autopsy.rootCause}`,
          `pick ${autopsy.pickId}`,
          `lesson tags ${autopsy.lessonTags.join(", ") || "none"}`,
        ].join(" - "))
        .join("\n"),
    "",
    "## What Changes Next",
    "",
    "Draft the operator-reviewed model note here. Cite factor names, pick IDs, and autopsy IDs before submitting for review.",
  ].join("\n");
}
