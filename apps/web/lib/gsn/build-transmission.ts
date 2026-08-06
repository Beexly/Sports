/**
 * Build a GSN daily transmission from live board state when available.
 * Always returns a complete Transmission — never a teaser.
 */

import { loadBoardState } from "@/lib/board/state";
import type { Transmission, TransmissionSegment } from "./transmission";
import { SAMPLE_TRANSMISSION } from "./transmission";

function codeFromDate(d = new Date()): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const yy = String(d.getUTCFullYear()).slice(-2);
  return `${mm} · ${dd} · ${yy}`;
}

export async function buildDailyTransmission(): Promise<Transmission & { source: "board" | "methodology" }> {
  try {
    const board = await loadBoardState();
    // BoardStatePayload shape may vary — use defensive extraction
    const anyBoard = board as unknown as {
      publishedPicks?: Array<{ label?: string; side?: string; grade?: string }>;
      picks?: Array<{ label?: string; side?: string; grade?: string }>;
      passes?: Array<{ reason?: string }>;
      health?: { publishedCount?: number; passCount?: number };
      mode?: string;
    };

    const published =
      anyBoard.publishedPicks ??
      anyBoard.picks ??
      [];
    const passes = anyBoard.passes ?? [];
    const pubN = anyBoard.health?.publishedCount ?? published.length;
    const passN = anyBoard.health?.passCount ?? passes.length;

    if (pubN + passN === 0) {
      return { ...SAMPLE_TRANSMISSION, code: codeFromDate(), source: "methodology" };
    }

    const segments: TransmissionSegment[] = [
      {
        type: "Galaxy Brief",
        tone: "ion",
        title: "The board, read at a glance.",
        dek: `${pubN} published reads · ${passN} No-Bet / pass decisions on the current slate.`,
        points: [
          pubN > 0
            ? `Published concentration: ${pubN} fire(s) cleared honesty and readiness gates.`
            : "No fires cleared the gate — silence is a valid board state.",
          passN > 0
            ? `${passN} pass(es) recorded with reasons — No-Bet is first-class.`
            : "Pass lane is quiet on this snapshot.",
          "Every published row carries reasoning; nothing ships as a naked pick.",
        ],
      },
      {
        type: "No-Bet Warnings",
        tone: "ion",
        title: "Where the governor held fire.",
        dek: "Passes protect bankroll and brand when evidence is thin, stale, or rights-blocked.",
        points: (passes.length
          ? passes.slice(0, 3).map((p) => p.reason ?? "Pass recorded with structured reason.")
          : [
              "No-Bet fires when freshness, rights, calibration, or agreement fail.",
              "A pass is logged with the same audit posture as a fire.",
              "We do not invent action to fill a content calendar.",
            ]),
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

    // Include up to 2 published pick labels if present
    if (published.length > 0) {
      segments.push({
        type: "Line-Movement Autopsy",
        tone: "deep",
        title: "Published reads on this transmission.",
        dek: "Labels only — full reasoning lives on the board and pick pages.",
        points: published.slice(0, 4).map((p) => {
          const label = p.label ?? "Published read";
          const grade = p.grade ? ` · ${p.grade}` : "";
          return `${label}${grade}`;
        }),
      });
    }

    return {
      illustrative: true,
      code: codeFromDate(),
      summary: [
        { label: "Published", count: pubN, tone: "ion" },
        { label: "No-Bet / Pass", count: passN, tone: "anomaly" },
        { label: "Segments", count: segments.length, tone: "deep" },
      ],
      segments,
      source: "board",
    };
  } catch {
    return { ...SAMPLE_TRANSMISSION, code: codeFromDate(), source: "methodology" };
  }
}
