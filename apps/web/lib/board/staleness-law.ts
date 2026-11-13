/**
 * STALENESS_LAW + the two-doctrines board (Zone 1 / Zone 2).
 *
 * One law governs every public board surface (/, /board, /picks, /api/board):
 * a game is EITHER a PLAY with an integer confidence XX/100, OR a transparent
 * PASS with a plain-language reason. There is no third state. "Board
 * temporarily unavailable" and "Today's picks n/a" are banned: an empty slate
 * is the PASS doctrine rendered proudly, never an error page.
 *
 * This module is PURE so the doctrine can be unit-tested without a database.
 * Loaders (lib/board/state.ts, lib/board/passes.ts) feed it; pages and the
 * /api/board route render exactly what it composes.
 */

import type { BoardStatePayload, BoardStateRow } from "./state";
import type { BoardPassesPayload } from "./passes";

/** The public doctrine, in plain football language. */
export const STALENESS_LAW = [
  "Every game on the board is either a PLAY or a PASS. Never a maybe, never an error page.",
  "A PLAY carries its confidence as a whole number out of 100, and it cleared every publish gate before kickoff.",
  "A PASS carries the reason in plain language. Passing is a decision we are proud to show, not a gap we hide.",
  "Stale data is never rendered as live. If a row is past its freshness window it leaves the board; the game still shows as a PASS.",
  "When no plays qualify, the board shows the PASS doctrine. An empty slate is honesty, not an outage.",
] as const;

export interface DoctrinePlayRow {
  readonly gameId: string;
  readonly matchup: string;
  readonly market: string;
  /** The side/total. Null for viewers without the premium entitlement. */
  readonly selection: string | null;
  /** Integer 0-100. Always present on a Zone 1 row. */
  readonly confidence: number;
  /** "74/100" - never a percentage. */
  readonly confidenceLabel: string;
  readonly lane: BoardStateRow["status"];
}

export interface DoctrinePassRow {
  readonly gameId: string;
  readonly matchup: string;
  readonly reason: string;
}

export type DoctrinePosture = "PLAYS" | "PASS_ONLY";

export interface DoctrineBoard {
  readonly posture: DoctrinePosture;
  readonly zone1: readonly DoctrinePlayRow[];
  readonly zone2: readonly DoctrinePassRow[];
  readonly headline: string;
  readonly subline: string;
  /** Honest-empty classifier name from the loader, for ops truth. */
  readonly boardClass: string;
  readonly generatedAt: string;
}

/** Confidence is a bounded integer index: XX/100, never a percent sign. */
export function formatConfidence(confidence: number): string {
  const bounded = Math.max(0, Math.min(100, Math.round(confidence)));
  return `${bounded}/100`;
}

export interface ComposeDoctrineInput {
  /** Loader output, or null when the load failed (still never an error page). */
  readonly state: BoardStatePayload | null;
  readonly passes: BoardPassesPayload | null;
  /**
   * Whether the viewer may see the premium selection. The board itself is
   * public and Zone 1 confidences are public doctrine; the paid side/line
   * stays behind the entitlement, redacted SERVER-SIDE here.
   */
  readonly viewerCanSeeSelection: boolean;
  readonly now?: Date;
}

const PASS_ONLY_HEADLINE = "No official plays qualify right now.";
const PASS_ONLY_SUBLINE =
  "That is a decision, not an outage. Every game below was evaluated or is waiting on data, and each carries its reason. When a play clears every gate, it appears here with its confidence. Until then, passing is the honest call.";
const REST_HEADLINE = "The board is resting between slates.";
const REST_SUBLINE =
  "No plays are published at this moment. The PASS doctrine still holds: nothing is forced, nothing is invented, and the next qualified play will show its confidence out of 100.";

/**
 * Compose the two-doctrines board. Zone 1 wins any game that appears in both
 * lanes (a published play is the strongest statement we make about a game).
 */
export function composeDoctrineBoard(input: ComposeDoctrineInput): DoctrineBoard {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const zone1: DoctrinePlayRow[] = [];
  const zone1Games = new Set<string>();

  const published = input.state?.data.publishedToday ?? [];
  for (const row of published) {
    if (row.confidence === null || !Number.isFinite(row.confidence)) continue;
    const confidence = Math.max(0, Math.min(100, Math.round(row.confidence)));
    zone1.push({
      gameId: row.gameId,
      matchup: row.matchup,
      market: row.market,
      // `market` carries the selection string ("Chiefs -3.5"); the loader
      // redacts it to ALL_MARKETS for non-premium viewers. Either way the
      // paid side/line never reaches a viewer without the entitlement.
      selection:
        input.viewerCanSeeSelection && row.market !== "ALL_MARKETS" ? row.market : null,
      confidence,
      confidenceLabel: formatConfidence(confidence),
      lane: row.status,
    });
    zone1Games.add(row.gameId);
  }

  // Zone 2: gated rows from the state loader + the pass list, deduped by game.
  const zone2: DoctrinePassRow[] = [];
  const zone2Games = new Set<string>();
  const pushPass = (gameId: string, matchup: string, reason: string): void => {
    if (zone1Games.has(gameId) || zone2Games.has(gameId)) return;
    zone2Games.add(gameId);
    zone2.push({ gameId, matchup, reason });
  };
  for (const row of input.state?.data.gatedTodayRows ?? []) {
    pushPass(row.gameId, row.matchup, row.gateReason ?? "We haven't scored this game yet.");
  }
  for (const row of input.passes?.data.passes ?? []) {
    pushPass(row.gameId, row.matchup, row.reason);
  }

  const boardClass = input.state?.meta.boardClass.state ?? "PASS_DOCTRINE";
  if (zone1.length > 0) {
    return {
      posture: "PLAYS",
      zone1,
      zone2,
      headline:
        zone1.length === 1
          ? "1 official play cleared every gate."
          : `${zone1.length} official plays cleared every gate.`,
      subline:
        "Each play below carries its confidence out of 100. Everything else on the slate is a PASS with a reason; the two doctrines share one board.",
      boardClass,
      generatedAt,
    };
  }
  return {
    posture: "PASS_ONLY",
    zone1,
    zone2,
    headline: input.state === null ? REST_HEADLINE : PASS_ONLY_HEADLINE,
    subline: input.state === null ? REST_SUBLINE : PASS_ONLY_SUBLINE,
    boardClass,
    generatedAt,
  };
}