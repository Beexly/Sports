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
 *
 * Memory section (§Owner Brief integration):
 *  - Sourced from listMemoryByState results passed in via ComposeBriefInput.
 *  - When memory store is unavailable, the section says so honestly.
 *  - Follows the same section pattern as all other sections.
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

/**
 * A single memory entry for the brief memory section.
 * Passed in by the caller who has already loaded memory rows.
 */
export interface BriefMemoryInput {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly memory_state: string;
  readonly confirmed_at?: Date | null;
  readonly created_at: Date;
}

/**
 * Memory section for the brief.
 *
 * - storeConnected=false → honest not-connected message.
 * - newConfirmed / pendingCandidates / conflicts are sourced from real DB rows.
 */
export interface BriefMemorySection {
  readonly storeConnected: boolean;
  readonly newConfirmed: readonly BriefMemoryInput[];
  readonly pendingCandidates: readonly BriefMemoryInput[];
  readonly conflicts: readonly BriefMemoryInput[];
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
  /** Memory section — present when memory input is provided; null otherwise. */
  readonly memory: BriefMemorySection | null;
}

export interface ComposeBriefInput {
  readonly date: Date;
  readonly picks?: readonly BriefPickInput[];
  readonly settled?: readonly BriefSettledInput[];
  readonly lineMoves?: readonly BriefLineMoveInput[];
  readonly promotions?: readonly BriefPromotionInput[];
  readonly reviewTasks?: readonly BriefTaskInput[];
  /**
   * Memory rows pre-fetched by the caller.
   * When omitted: memory section body says "Memory section not loaded."
   * When storeConnected=false: section body says store not connected.
   */
  readonly memory?: BriefMemorySection;
}

/** A line move only earns a mention when it's big enough to mean something. */
const SIGNIFICANT_MOVE = 1.0;

export function composeDailyBrief(input: {
  date: Date;
  memory?: BriefMemorySection;
}): ComposedBrief {
  return composeBrief({ date: input.date, memory: input.memory });
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

  // ── Memory section ────────────────────────────────────────────────
  let memorySectionBody: string;
  if (!input.memory) {
    memorySectionBody = "Memory section not loaded.";
  } else if (!input.memory.storeConnected) {
    memorySectionBody = "Memory store not connected — memory section unavailable.";
  } else {
    const parts: string[] = [];
    if (input.memory.newConfirmed.length > 0) {
      parts.push(
        `${input.memory.newConfirmed.length} new confirmed memor${input.memory.newConfirmed.length === 1 ? "y" : "ies"}: ` +
          input.memory.newConfirmed.map((m) => m.title).join(", ") +
          ".",
      );
    } else {
      parts.push("No new confirmed memories.");
    }
    if (input.memory.pendingCandidates.length > 0) {
      parts.push(
        `${input.memory.pendingCandidates.length} candidate${input.memory.pendingCandidates.length === 1 ? "" : "s"} awaiting approval.`,
      );
    }
    if (input.memory.conflicts.length > 0) {
      parts.push(
        `${input.memory.conflicts.length} conflict${input.memory.conflicts.length === 1 ? "" : "s"} needing owner review.`,
      );
    }
    memorySectionBody = parts.join(" ");
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
    {
      title: "Memory",
      body: memorySectionBody,
      type: "memory",
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
    memory: input.memory ?? null,
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
