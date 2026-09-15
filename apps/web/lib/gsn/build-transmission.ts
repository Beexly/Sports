/**
 * Build a GSN daily transmission from loadBoardState().
 * Always returns a complete Transmission — never a teaser.
 *
 * Board-sourced: uses publishedToday / gatedTodayRows / scoringNow labels only.
 * Methodology: full structure when board is empty/suppressed/unreachable.
 * Never invents edge %, ROI, or win-rate claims.
 */

import { loadBoardState, type BoardStatePayload, type BoardStateRow } from "@/lib/board/state";
import type {
  Transmission,
  TransmissionSegment,
  TransmissionUnavailableReason,
} from "./transmission";

function codeFromDate(d = new Date()): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${mm} · ${dd} · ${yy}`;
}

/**
 * Honest empty/error state — zero invented counts, never SAMPLE_TRANSMISSION.
 * SAMPLE_TRANSMISSION remains only for lib/gsn/beex-weekly.ts.
 */
export function unavailableTransmission(
  now: Date,
  reason: TransmissionUnavailableReason,
): Transmission {
  return {
    code: codeFromDate(now),
    source: "unavailable",
    unavailableReason: reason,
    illustrative: false,
    summary: [],
    segments: [],
  };
}

function rowLabel(row: BoardStateRow): string {
  const market = row.market ? ` · ${row.market}` : "";
  const gate = row.gateReason ? ` · ${row.gateReason}` : "";
  return `${row.matchup}${market}${gate}`;
}

export async function buildDailyTransmission(
  now = new Date(),
): Promise<Transmission> {
  try {
    const board: BoardStatePayload = await loadBoardState(now);
    const { publishedToday, gatedTodayRows, scoringNow } = board.data;
    const pubN = publishedToday.length;
    const passN = gatedTodayRows.length;
    const scoringN = scoringNow.length;
    const total = pubN + passN + scoringN;

    if (board.meta.dataError) {
      return unavailableTransmission(now, "data-error");
    }
    if (board.meta.suppressedDemoData) {
      return unavailableTransmission(now, "suppressed-demo");
    }
    if (total === 0) {
      return unavailableTransmission(now, "empty-board");
    }

    const segments: TransmissionSegment[] = [
      {
        type: "Galaxy Brief",
        tone: "ion",
        title: "The board, read at a glance.",
        dek: `${pubN} published · ${passN} gated/No-Bet · ${scoringN} scoring-now on this snapshot.`,
        points: [
          pubN > 0
            ? `${pubN} published read(s) cleared the public lane.`
            : "No published fires on this snapshot — silence is a valid board state.",
          passN > 0
            ? `${passN} gated row(s) held — No-Bet / gate reasons are first-class.`
            : "Gate lane is quiet on this snapshot.",
          scoringN > 0
            ? `${scoringN} row(s) still scoring — not yet in a public fire lane.`
            : "Nothing currently in scoring-now.",
        ],
      },
      {
        type: "No-Bet Warnings",
        tone: "ion",
        title: "Where the governor held fire.",
        dek: "Gated rows protect bankroll and brand when evidence fails readiness.",
        points:
          passN > 0
            ? gatedTodayRows.slice(0, 4).map(rowLabel)
            : [
                "No-Bet when freshness, rights, calibration, or agreement fail.",
                "A pass is logged with the same audit posture as a fire.",
                "We do not invent action to fill a content calendar.",
              ],
      },
      {
        type: "Market Mirage",
        tone: "anomaly",
        title: "Price vs tickets discipline.",
        dek: "When public heat and price disagree, read the divergence — don't chase the story.",
        points: [
          "Edge is model probability minus no-vig price — never confidence alone.",
          "Crowd tickets without price confirmation is a mirage pattern.",
          "The board refuses to dress mirage as signal.",
        ],
      },
    ];

    if (pubN > 0) {
      segments.push({
        type: "Line-Movement Autopsy",
        tone: "deep",
        title: "Published reads on this transmission.",
        dek: "Matchup labels only — full reasoning lives on the board and pick pages. No edge % invented here.",
        points: publishedToday.slice(0, 5).map(rowLabel),
      });
    }

    if (scoringN > 0) {
      segments.push({
        type: "Roster Shock",
        tone: "anomaly",
        title: "Still under evaluation.",
        dek: "Scoring-now rows are not public fires. Treat them as in-progress only.",
        points: scoringNow.slice(0, 4).map(rowLabel),
      });
    }

    return {
      illustrative: board.meta.isSampleData,
      source: "board",
      code: codeFromDate(now),
      summary: [
        { label: "Published", count: pubN, tone: "ion" },
        { label: "Gated / No-Bet", count: passN, tone: "anomaly" },
        { label: "Scoring now", count: scoringN, tone: "deep" },
        { label: "Segments", count: segments.length, tone: "ion" },
      ],
      segments,
    };
  } catch {
    return unavailableTransmission(now, "load-failed");
  }
}
