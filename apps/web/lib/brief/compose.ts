/**
 * Daily brief composer.
 *
 * Two callable surfaces:
 *   - composeBrief / composeDailyBrief — sync stub kept for existing
 *     server-component and test callers that don't await
 *   - composeBriefAsync — populated path that calls composeSlateOverview
 *     under the hood to produce a real brief
 *
 * The sync stub returns shell defaults; the async path is opt-in.
 * Cycle 15 starts the restoration: slate-overview + summary are real;
 * promotions / whatChanged / contentIdeas / manualReview remain empty
 * arrays until a follow-on cycle gives them inputs.
 */

import {
  composeSlateOverview,
  type SlatePickSnippet,
} from "./slate-overview.js";

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

export interface ComposeBriefAsyncInput {
  readonly date: Date | string;
  readonly picks: readonly SlatePickSnippet[];
}

/**
 * Async restoration path. With picks, populates the brief via
 * composeSlateOverview; without picks, falls back to the same shell
 * shape the sync stub returns.
 *
 * Always returns status: "DRAFT". Never sets publishedAt.
 */
export async function composeBriefAsync(
  input: ComposeBriefAsyncInput
): Promise<ComposedBrief> {
  const dateIso =
    typeof input.date === "string"
      ? input.date
      : input.date.toISOString().slice(0, 10);

  if (input.picks.length === 0) {
    return {
      date: dateIso,
      summary:
        "Daily brief composer is being rebuilt. No public brief is published " +
        "until launch-night verification is complete.",
      sections: [],
      responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
      status: "DRAFT",
      slateOverview: {
        text: "Slate overview unavailable while the composer is being rebuilt.",
      },
      promotions: { count: 0, items: [] },
      whatChanged: { items: [] },
      contentIdeas: { items: [] },
      manualReview: { items: [] },
    };
  }

  const overview = await composeSlateOverview({
    date: dateIso,
    picks: input.picks,
  });

  const sections: BriefSection[] = [
    {
      title: "Tonight's slate",
      body: overview.text,
      type: "SLATE_OVERVIEW",
    },
  ];

  return {
    date: dateIso,
    summary: overview.text,
    sections,
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
    status: "DRAFT",
    slateOverview: { text: overview.text },
    promotions: { count: 0, items: [] },
    whatChanged: { items: [] },
    contentIdeas: { items: [] },
    manualReview: { items: [] },
  };
}
