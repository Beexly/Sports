/**
 * Founder / Owner picks — "Beak's picks".
 *
 * The owner personally enters a pick. It is stored as a real Pick row
 * (modelVersion = founder-v1), sealed with the same proof-receipt machinery
 * when one is mintable, graded by the same settlement path, and counted in
 * the same public record. Never fabricated, never auto-generated.
 *
 * Schema constraint: Pick has @@unique([gameId, pickType]), so a founder pick
 * either (a) fills a game the engine held, or (b) OVERRIDES an engine pick on
 * that game/type. The override is recorded in factorBreakdown so the ledger
 * can show who said what.
 *
 * No schema change. No flag flip. No floor change.
 */

export const FOUNDER_MODEL_VERSION = "founder-v1";

export type FounderPickType = "MONEYLINE" | "SPREAD" | "TOTAL";

export interface FounderPickInput {
  readonly gameId: string;
  readonly pickType: FounderPickType;
  /** Customer-facing selection string, e.g. "Chiefs -3.5" or "OVER 48.5". */
  readonly selection: string;
  /** Home-perspective points line for SPREAD/TOTAL; American price for MONEYLINE. */
  readonly line: number;
  /** Owner's confidence 0–100. Honest — the owner states it, we do not invent it. */
  readonly confidence: number;
  /** Short plain-English why. Required — a founder pick without a reason is a tout. */
  readonly reasoning: string;
  /** Optional: was this taken against an engine hold or an engine pick? */
  readonly override?: "engine_hold" | "engine_pick";
  /** Optional consensus notes the owner wants on the record (source + lean). */
  readonly consensusNotes?: readonly {
    readonly source: string;
    readonly lean: string;
  }[];
}

export interface FounderPickRecord {
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly pending: number;
  readonly decided: number;
  /** Decided-only win rate in percent, or null when nothing is decided. */
  readonly winRatePct: number | null;
  readonly picks: readonly {
    readonly id: string;
    readonly gameId: string;
    readonly sport: string;
    readonly matchup: string;
    readonly pickType: FounderPickType;
    readonly selection: string;
    readonly line: number;
    readonly confidence: number;
    readonly result: "PENDING" | "WIN" | "LOSS" | "PUSH" | "VOID";
    readonly generatedAt: string;
    readonly settledAt: string | null;
    readonly reasoning: string;
    readonly clvVerdict: string | null;
  }[];
}

/** Validation. Fail closed — a bad founder pick is never published. */
export function validateFounderPick(
  input: FounderPickInput,
  opts: { readonly kickoff: Date | null; readonly now?: Date },
): { ok: true } | { ok: false; error: string } {
  const now = opts.now ?? new Date();
  if (!input.gameId || input.gameId.trim().length === 0) {
    return { ok: false, error: "gameId is required." };
  }
  if (
    input.pickType !== "MONEYLINE" &&
    input.pickType !== "SPREAD" &&
    input.pickType !== "TOTAL"
  ) {
    return { ok: false, error: "pickType must be MONEYLINE, SPREAD, or TOTAL." };
  }
  if (!input.selection || input.selection.trim().length < 3) {
    return { ok: false, error: "selection is required (e.g. \"Chiefs -3.5\")." };
  }
  if (!Number.isFinite(input.line)) {
    return { ok: false, error: "line must be a finite number." };
  }
  if (
    !Number.isInteger(input.confidence) ||
    input.confidence < 1 ||
    input.confidence > 100
  ) {
    return { ok: false, error: "confidence must be an integer 1–100." };
  }
  if (!input.reasoning || input.reasoning.trim().length < 10) {
    return {
      ok: false,
      error: "reasoning is required (at least 10 characters). A founder pick without a reason is a tout.",
    };
  }
  // Never publish a pick on a game that has already started — same rule as the
  // engine (hasKickedOff, C-299). Unparseable kickoff fails CLOSED.
  if (opts.kickoff) {
    if (opts.kickoff.getTime() <= now.getTime()) {
      return { ok: false, error: "Game has already kicked off. Founder picks freeze at kickoff." };
    }
  } else {
    return { ok: false, error: "Game kickoff time is unknown. Refusing to publish." };
  }
  return { ok: true };
}

/**
 * factorBreakdown payload for a founder pick. Carries provenance so the
 * record can show owner intent without inventing engine factors.
 */
export function founderFactorBreakdown(input: FounderPickInput): Record<string, unknown> {
  return {
    source: "founder",
    founderModelVersion: FOUNDER_MODEL_VERSION,
    override: input.override ?? "engine_hold",
    consensusNotes: input.consensusNotes ?? [],
    factors: [
      {
        name: "Owner call",
        impact: "neutral" as const,
        description: input.reasoning.slice(0, 280),
        weight: 0,
      },
    ],
    // Explicit: a founder pick carries no engine factor scores. The confidence
    // is the owner's stated conviction, not a model output.
    rankingP: null,
    rankingSource: "founder",
  };
}
