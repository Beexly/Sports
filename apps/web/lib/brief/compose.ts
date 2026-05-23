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
import {
  actionableRisks,
  composePreMortem,
} from "./pre-mortem.js";
import { composeWhatChanged } from "./what-changed.js";
import { composeContentIdeas } from "./content-ideas.js";
import {
  composePromotions,
  type PromotionOffer,
} from "./promotions.js";

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
  /** Operator-supplied free-form changes for the WHAT_CHANGED section. */
  readonly changesContext?: string;
  /** Operator-supplied promotional offers for the PROMOTIONS section. */
  readonly promotionOffers?: readonly PromotionOffer[];
  /** Whether to generate content ideas from the slate (default false — opt in). */
  readonly includeContentIdeas?: boolean;
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

  // Build the parallel-call list. Slate-overview + pre-mortem always run
  // when picks are present. The other three composers only run when their
  // optional input is supplied — no spend on empty inputs.
  const wantIdeas = input.includeContentIdeas === true;
  const wantChanges = typeof input.changesContext === "string" && input.changesContext.trim().length > 0;
  const wantPromos = Array.isArray(input.promotionOffers) && input.promotionOffers.length > 0;

  const [overview, preMortem, contentIdeas, whatChanged, promotions] = await Promise.all([
    composeSlateOverview({ date: dateIso, picks: input.picks }),
    composePreMortem({ date: dateIso, picks: input.picks }),
    wantIdeas
      ? composeContentIdeas({ picks: input.picks })
      : Promise.resolve(null),
    wantChanges
      ? composeWhatChanged({ changesContext: input.changesContext as string })
      : Promise.resolve(null),
    wantPromos
      ? composePromotions({ offers: input.promotionOffers as readonly PromotionOffer[] })
      : Promise.resolve(null),
  ]);

  const sections: BriefSection[] = [
    {
      title: "Tonight's slate",
      body: overview.text,
      type: "SLATE_OVERVIEW",
    },
  ];

  // Pre-mortem → MANUAL_REVIEW section when anything actionable is present.
  const actionable = actionableRisks(preMortem);
  const manualReviewItems = actionable.map((r) => ({
    kind: r.kind,
    severity: r.severity,
    observation: r.observation,
    affectedCount: r.affectedCount,
  }));
  if (actionable.length > 0) {
    sections.push({
      title: "Pre-mortem (operator review)",
      body: preMortem.summary,
      type: "MANUAL_REVIEW",
    });
  }

  // What-changed → WHAT_CHANGED section when the operator supplied context.
  const whatChangedItems = whatChanged ? whatChanged.items : [];
  if (whatChanged) {
    sections.push({
      title: "What changed",
      body: whatChanged.summary,
      type: "WHAT_CHANGED",
    });
  }

  // Promotions → PROMOTIONS section when offers were supplied.
  const promotionItems = promotions ? promotions.items : [];
  if (promotions) {
    sections.push({
      title: "Promotions",
      body: promotions.summary,
      type: "PROMOTIONS",
    });
  }

  // Content ideas → CONTENT_IDEAS section when generated.
  const contentIdeaItems = contentIdeas ? contentIdeas.ideas : [];
  if (contentIdeas) {
    sections.push({
      title: "Content ideas",
      body: `${contentIdeas.ideas.length} angle${contentIdeas.ideas.length === 1 ? "" : "s"} surfaced from tonight's slate.`,
      type: "CONTENT_IDEAS",
    });
  }

  return {
    date: dateIso,
    summary: overview.text,
    sections,
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
    status: "DRAFT",
    slateOverview: { text: overview.text },
    promotions: { count: promotionItems.length, items: promotionItems as unknown[] },
    whatChanged: { items: whatChangedItems as unknown[] },
    contentIdeas: { items: contentIdeaItems as unknown[] },
    manualReview: { items: manualReviewItems },
  };
}
