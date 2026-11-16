import { db, isStubMode } from "@sports/db";
import {
  evaluateCagePublicationPolicy,
  type CandidateSlateItem,
} from "@sports/governed";
import type { SealedBoard, SealedRow } from "@/lib/week8/types";
import bundledSlate from "./current-sealed-slate.json";

export interface LoadedSealedSlate {
  readonly board: SealedBoard;
  readonly source: "sealed_slate_packet" | "source_snapshot" | "bundled_slate";
  readonly policyAdmitted: boolean;
  readonly policyReasons: readonly string[];
}

function isSealedBoardShape(value: unknown): value is SealedBoard {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.generated_at === "string" &&
    Array.isArray(v.main) &&
    Array.isArray(v.props) &&
    Array.isArray(v.passes) &&
    v.watch !== null &&
    typeof v.watch === "object"
  );
}

function toCandidateItems(board: SealedBoard): CandidateSlateItem[] {
  const allRows: SealedRow[] = [
    ...board.main,
    ...board.props,
    ...board.passes,
    ...(board.watch?.one_q ?? []),
    ...(board.watch?.kicking ?? []),
    ...(board.watch?.idp ?? []),
    ...(board.watch?.atd ?? []),
  ];
  return allRows.map((row, idx) => ({
    id: `${row.matchup}:${row.category}:${idx}`,
    matchup: row.matchup,
    market: undefined,
    selection: row.selection,
    decision: row.decision,
    publishAllowed: row.publishAllowed,
    confidenceDisplay:
      row.confidence_display ?? `${Math.round(Math.min(100, Math.max(0, row.model_p * 100)))}/100`,
    expectedClv: row.edge,
    publicCopy: row.rationale,
  }));
}

/**
 * Loads the active SealedSlatePacket from Neon (`sealed_slate_packets` or
 * `SourceSnapshot` provider `gse-sealed-slate-packet`), falling back cleanly to
 * the current verified bundled slate rather than stale Week 8 fixtures.
 */
export async function loadActiveSealedSlate(): Promise<LoadedSealedSlate> {
  let candidate: SealedBoard | null = null;
  let source: LoadedSealedSlate["source"] = "bundled_slate";

  if (!isStubMode()) {
    try {
      const sealedDelegate = (
        db as unknown as {
          sealedSlatePacket?: {
            findFirst?: (args: {
              where: { status: string };
              orderBy: { sealedAt: "desc" };
              select: { payloadJson: true };
            }) => Promise<{ payloadJson: unknown } | null>;
          };
        }
      ).sealedSlatePacket;

      if (typeof sealedDelegate?.findFirst === "function") {
        const row = await sealedDelegate.findFirst({
          where: { status: "SEALED" },
          orderBy: { sealedAt: "desc" },
          select: { payloadJson: true },
        });
        if (row && isSealedBoardShape(row.payloadJson)) {
          candidate = row.payloadJson;
          source = "sealed_slate_packet";
        }
      }

      if (!candidate && typeof db?.sourceSnapshot?.findFirst === "function") {
        const snap = await db.sourceSnapshot.findFirst({
          where: { provider: "gse-sealed-slate-packet", sport: "NFL" },
          orderBy: { fetchedAt: "desc" },
          select: { payload: true },
        });
        if (snap && isSealedBoardShape(snap.payload)) {
          candidate = snap.payload;
          source = "source_snapshot";
        }
      }
    } catch {
      // Fall back cleanly to bundled current slate if DB is unavailable.
    }
  }

  const resolvedBoard = candidate ?? (bundledSlate as unknown as SealedBoard);
  const gate = evaluateCagePublicationPolicy({
    season: 2026,
    week: 10,
    windowSlot: "ALL",
    lockVersion: "v3.5",
    items: toCandidateItems(resolvedBoard),
  });

  if (gate.decision === "REFUSE" && candidate) {
    const fallbackBoard = bundledSlate as unknown as SealedBoard;
    const fallbackGate = evaluateCagePublicationPolicy({
      season: 2026,
      week: 10,
      windowSlot: "ALL",
      lockVersion: "v3.5",
      items: toCandidateItems(fallbackBoard),
    });
    return {
      board: fallbackBoard,
      source: "bundled_slate",
      policyAdmitted: fallbackGate.decision === "ADMIT",
      policyReasons: fallbackGate.reasons,
    };
  }

  return {
    board: resolvedBoard,
    source,
    policyAdmitted: gate.decision === "ADMIT",
    policyReasons: gate.reasons,
  };
}
