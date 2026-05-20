/**
 * Daily brief composer — stub.
 * Original implementation was truncated. This stub exposes the same
 * named exports the callers expect, returning empty defaults.
 */

export const BRIEF_RESPONSIBLE_GAMING_NOTE =
  "Bet responsibly. Past performance does not guarantee future results.";

export interface BriefSection {
  readonly title: string;
  readonly body: string;
  readonly type: string;
}

export interface ComposedBrief {
  readonly date: string;
  readonly summary: string;
  readonly sections: readonly BriefSection[];
  readonly responsibleGamingText: string;
  readonly status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly slateOverview: { readonly text: string };
  readonly promotions: { readonly count: number; readonly items: readonly unknown[] };
  readonly whatChanged: { readonly items: readonly unknown[] };
  readonly contentIdeas: { readonly items: readonly unknown[] };
  readonly manualReview: { readonly items: readonly unknown[] };
}

export function composeDailyBrief(input: { date: Date }): ComposedBrief {
  return composeBrief({ date: input.date });
}

export function composeBrief(input: { date: Date; picks?: unknown; promotions?: unknown; gameSportMap?: unknown }): ComposedBrief {
  return {
    date: input.date.toISOString().slice(0, 10),
    summary:
      "Daily brief composer is being rebuilt. No public brief is published " +
      "until launch-night verification is complete.",
    sections: [],
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
    status: "DRAFT",
    slateOverview: { text: "Slate overview unavailable while the composer is being rebuilt." },
    promotions: { count: 0, items: [] },
    whatChanged: { items: [] },
    contentIdeas: { items: [] },
    manualReview: { items: [] },
  };
}
