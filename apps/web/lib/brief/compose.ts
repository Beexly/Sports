/**
 * Daily brief composer — the operator's morning packet, rebuilt.
 *
 * Pure function: real rows in → structured brief out. No DB access here
 * (callers fetch; this stays unit-testable), no Claude calls, no publish
 * path. Every sentence is derived from the data handed in — if a section
 * has no data it says so instead of inventing color.
 *
 * Invariants:
 *  - status is ALWAYS "DRAFT" — there is no publish transition in code.
 *  - responsibleGamingText rides every brief.
 *  - No fabricated stats: every number in the copy comes from the inputs.
 */

export const BRIEF_RESPONSIBLE_GAMING_NOTE =
  "Bet responsibly. Past performance does not guarantee future results.";

export interface BriefSection {
  readonly title: string;
  readonly body: string;
  readonly type: string;
}

export interface BriefPickInput {
  readonly selection: string;
  readonly sport: string;
  readonly pickGrade: string;
  readonly tier: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly riskLevel: string;
}

export interface BriefSettledInput {
  readonly selection: string;
  readonly sport: string;
  readonly result: "WIN" | "LOSS" | "PUSH" | "VOID";
}

export interface BriefLineMoveInput {
  readonly matchup: string;
  readonly sport: string;
  readonly moveSpread: number | null;
  readonly moveTotal: number | null;
}

export interface BriefPromotionInput {
  readonly headline: string;
  readonly operatorName: string;
  readonly complianceStatus: string;
}

export interface BriefTaskInput {
  readonly title: string;
  readonly assignedAgent: string;
  readonly priority: number;
}

export interface ComposedBrief {
  readonly date: string;
  readonly summary: string;
  readonly sections: readonly BriefSection[];
  readonly responsibleGamingText: string;
  readonly status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  readonly slateOverview: { readonly text: string };
  readonly promotions: { readonly count: number; readonly items: readonly BriefPromotionInput[] };
  readonly whatChanged: { readonly items: readonly BriefLineMoveInput[] };
  readonly contentIdeas: { readonly items: readonly string[] };
  readonly manualReview: { readonly items: readonly BriefTaskInput[] };
}

export interface ComposeBriefInput {
  readonly date: Date;
  readonly picks?: readonly BriefPickInput[];
  readonly settled?: readonly BriefSettledInput[];
  readonly lineMoves?: readonly BriefLineMoveInput[];
  readonly promotions?: readonly BriefPromotionInput[];
  readonly reviewTasks?: readonly BriefTaskInput[];
}

/** A line move only earns a mention when it's big enough to mean something. */
const SIGNIFICANT_MOVE = 1.0;

export function composeDailyBrief(input: { date: Date }): ComposedBrief {
  return composeBrief({ date: input.date });
}

export function composeBrief(input: ComposeBriefInput): ComposedBrief {
  const picks = input.picks ?? [];
  const settled = input.settled ?? [];
  const promotions = input.promotions ?? [];
  const reviewTasks = input.reviewTasks ?? [];
  const lineMoves = (input.lineMoves ?? []).filter(
    (m) =>
      Math.abs(m.moveSpread ?? 0) >= SIGNIFICANT_MOVE ||
      Math.abs(m.moveTotal ?? 0) >= SIGNIFICANT_MOVE,
  );

  // ── Slate overview ────────────────────────────────────────────────
  const bySport = new Map<string, number>();
  for (const p of picks) bySport.set(p.sport, (bySport.get(p.sport) ?? 0) + 1);
  const sportLine = Array.from(bySport.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `${s} ×${n}`)
    .join(" · ");
  const premium = picks.filter((p) => p.tier !== "FREE").length;
  const topGrades = picks.filter(
    (p) => p.pickGrade === "ELITE_PLAY" || p.pickGrade === "STRONG_PLAY",
  ).length;
  const slateText =
    picks.length === 0
      ? "No picks cleared the gate today. A quiet board is a position, not a failure — the no-bet engine held."
      : `${picks.length} pick${picks.length === 1 ? "" : "s"} cleared the gate (${sportLine}). ` +
        `${topGrades} graded STRONG or better · ${premium} premium-tier.`;

  // ── Yesterday's settlement ────────────────────────────────────────
  const wins = settled.filter((s) => s.result === "WIN").length;
  const losses = settled.filter((s) => s.result === "LOSS").length;
  const pushes = settled.filter((s) => s.result === "PUSH").length;
  const settledText =
    settled.length === 0
      ? "Nothing settled since the last brief."
      : `Settled ${settled.length}: ${wins}W–${losses}L${pushes ? `–${pushes}P` : ""}.`;

  // ── Content ideas — only angles the data actually supports ───────
  const ideas: string[] = [];
  const sharpest = [...picks].sort((a, b) => b.edgeScore - a.edgeScore)[0];
  if (sharpest && sharpest.edgeScore > 0) {
    ideas.push(
      `Factor-trail walkthrough: ${sharpest.selection} (${sharpest.sport}) — today's highest edge score (${Math.round(sharpest.edgeScore)}).`,
    );
  }
  if (lineMoves[0]) {
    ideas.push(
      `Line-movement explainer: ${lineMoves[0].matchup} (${lineMoves[0].sport}) moved ${formatMove(lineMoves[0])} since open.`,
    );
  }
  if (picks.length === 0) {
    ideas.push("No-bet doctrine piece: why the gate held today and what would have changed its mind.");
  }

  const sections: BriefSection[] = [
    { title: "Slate overview", body: slateText, type: "slate" },
    { title: "Settlement", body: settledText, type: "settlement" },
    {
      title: "What changed",
      body:
        lineMoves.length === 0
          ? "No significant line movement (≥1.0) since open."
          : lineMoves
              .slice(0, 6)
              .map((m) => `${m.matchup} (${m.sport}): ${formatMove(m)}`)
              .join(" · "),
      type: "line-movement",
    },
    {
      title: "Promotions desk",
      body:
        promotions.length === 0
          ? "No promotions awaiting compliance review."
          : `${promotions.length} promotion${promotions.length === 1 ? "" : "s"} awaiting compliance review.`,
      type: "promotions",
    },
    {
      title: "Manual review queue",
      body:
        reviewTasks.length === 0
          ? "Review queue is clear."
          : `${reviewTasks.length} item${reviewTasks.length === 1 ? "" : "s"} need${reviewTasks.length === 1 ? "s" : ""} an operator decision.`,
      type: "review",
    },
  ];

  return {
    date: input.date.toISOString().slice(0, 10),
    summary: `${slateText} ${settledText}`,
    sections,
    responsibleGamingText: BRIEF_RESPONSIBLE_GAMING_NOTE,
    status: "DRAFT",
    slateOverview: { text: slateText },
    promotions: { count: promotions.length, items: promotions },
    whatChanged: { items: lineMoves },
    contentIdeas: { items: ideas },
    manualReview: { items: reviewTasks },
  };
}

function formatMove(m: BriefLineMoveInput): string {
  const parts: string[] = [];
  if (m.moveSpread != null && Math.abs(m.moveSpread) >= SIGNIFICANT_MOVE) {
    parts.push(`spread ${m.moveSpread > 0 ? "+" : ""}${m.moveSpread.toFixed(1)}`);
  }
  if (m.moveTotal != null && Math.abs(m.moveTotal) >= SIGNIFICANT_MOVE) {
    parts.push(`total ${m.moveTotal > 0 ? "+" : ""}${m.moveTotal.toFixed(1)}`);
  }
  return parts.join(", ") || "—";
}
