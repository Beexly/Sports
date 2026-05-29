/**
 * Daily Brief — pure composition of 'what changed, what to ignore,
 * what's waiting' for the user.
 *
 * Used in-product (rendered on /command) and as the future email
 * brief template. Email delivery is owner-gated; this module only
 * composes the brief.
 *
 * Pure function: takes a board snapshot + user since-last-visit + a
 * Date; returns a structured brief. No DB, no fetch.
 */

export interface DailyBriefInput {
  readonly publishedToday: number;
  readonly gatedToday: number;
  readonly scoringNow: number;
  readonly autopsiesWaiting: number;
  readonly topSignalMatchup: string | null;
  readonly topPassMatchup: string | null;
  readonly modelVersion: string | null;
  readonly now: Date;
}

export interface DailyBriefSection {
  readonly title: string;
  readonly body: string;
  readonly link?: { readonly href: string; readonly label: string };
}

export interface DailyBrief {
  readonly title: string;
  readonly subtitle: string;
  readonly sections: ReadonlyArray<DailyBriefSection>;
  readonly closing: string;
  readonly composedAt: string;
}

function pluralize(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : plural ?? `${singular}s`;
}

export function composeDailyBrief(input: DailyBriefInput): DailyBrief {
  const sections: DailyBriefSection[] = [];

  // What changed
  if (input.publishedToday > 0 || input.scoringNow > 0) {
    const parts: string[] = [];
    if (input.publishedToday > 0) {
      parts.push(
        `${input.publishedToday} ${pluralize(input.publishedToday, "pick")} published`,
      );
    }
    if (input.scoringNow > 0) {
      parts.push(
        `${input.scoringNow} ${pluralize(input.scoringNow, "game")} scoring now`,
      );
    }
    sections.push({
      title: "What changed",
      body: `${parts.join("; ")}. ${input.topSignalMatchup ? `Top signal: ${input.topSignalMatchup}.` : "Read the board for matchup detail."}`,
      link: { href: "/today", label: "Open the board" },
    });
  } else {
    sections.push({
      title: "What changed",
      body: "Nothing published since you were last here. The model is conservative when evidence health is low.",
      link: { href: "/today", label: "Open the board" },
    });
  }

  // What to ignore
  if (input.gatedToday > 0) {
    sections.push({
      title: "What to ignore",
      body: `${input.gatedToday} ${pluralize(input.gatedToday, "game")} the model passed on today. ${input.topPassMatchup ? `Top pass: ${input.topPassMatchup}.` : "Read the pass list."}`,
      link: { href: "/no-bet", label: "Today's pass list" },
    });
  }

  // What's waiting
  if (input.autopsiesWaiting > 0) {
    sections.push({
      title: "What's waiting",
      body: `${input.autopsiesWaiting} settled ${pluralize(input.autopsiesWaiting, "pick")} need autopsy grades. Grade the process, not the outcome.`,
      link: { href: "/autopsy", label: "Open the autopsy queue" },
    });
  }

  // Always-present: read the record
  sections.push({
    title: "Read the record",
    body: "Every published pick, every pass, every settled outcome.",
    link: { href: "/ledger/canonical", label: "Open the canonical ledger" },
  });

  const closing = input.modelVersion
    ? `Model version ${input.modelVersion} · brief composed ${input.now.toISOString().slice(0, 19).replace("T", " ")}Z`
    : `Brief composed ${input.now.toISOString().slice(0, 19).replace("T", " ")}Z`;

  return {
    title: "Today's brief",
    subtitle: "What changed, what to ignore, what's waiting.",
    sections,
    closing,
    composedAt: input.now.toISOString(),
  };
}
