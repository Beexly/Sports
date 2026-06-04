import { bannedBrandClaims, pickGrades, type PickGradeKey } from "@sports/brand";

export interface SocialPickInput {
  matchup: string;
  selection: string;
  grade: PickGradeKey;
  reasoning: string;
}

function scrub(input: string): string {
  let output = input;
  for (const banned of bannedBrandClaims) {
    output = output.replace(new RegExp(banned, "gi"), "");
  }
  return output.replace(/\s+/g, " ").trim();
}

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function formatPickForTwitter(pick: SocialPickInput): string {
  const grade = pickGrades[pick.grade].shortLabel;
  return truncate(
    scrub(`${pick.matchup}\n${grade}: ${pick.selection}\nWhy: ${pick.reasoning}\nEvidence first. Confidence second.`),
    280
  );
}

export function formatLossAcknowledgmentForTwitter({
  record,
  lesson,
}: {
  record: string;
  lesson: string;
}): string {
  return truncate(
    scrub(`We were ${record}. The miss stays on the board.\nWhat we learned: ${lesson}\nNo rewrite from one result. Process first.`),
    280
  );
}

export function formatPickForDiscord(pick: SocialPickInput) {
  const grade = pickGrades[pick.grade];
  return {
    title: `${grade.label}: ${pick.matchup}`,
    description: scrub(`${pick.selection}\n${pick.reasoning}`),
    color: Number.parseInt(grade.color.slice(1), 16),
  };
}

export function formatPickForPush(pick: SocialPickInput) {
  return {
    title: truncate(`${pickGrades[pick.grade].shortLabel}: ${pick.selection}`, 30),
    body: truncate(scrub(`${pick.matchup} - ${pick.reasoning}`), 90),
  };
}
