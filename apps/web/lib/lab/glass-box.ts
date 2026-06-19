/**
 * Glass-Box Pick Explainer — data loader.
 *
 * Surfaces the full scoring trail behind REAL published picks for the Galaxy
 * Lab. Radical transparency: every factor that moved the score, shown in the
 * open. NOTHING here is fabricated.
 *
 * Doctrine, enforced here:
 *  1. Picks come from the SAME canonical filter the public picks surface uses
 *     (isPublished && !isBootstrap && not the dev seed). Bootstrap-era and
 *     synthetic seed rows are never explained.
 *  2. The factor trail is parsed through the shared, never-throw
 *     `parseFactorBreakdown` guard — a malformed/legacy JSON blob degrades to a
 *     `factorBreakdown: null` row, not a crash.
 *  3. Any failure (stubbed/unreachable DB, query error) returns an honest empty
 *     result. We never invent picks to fill the frame.
 *
 * This module performs pure mapping over one reused query. Per-tier REDACTION
 * of the numeric factor contributions happens server-side in the rendering
 * component (glass-box-explainer.tsx), never here — this loader returns the
 * public edge score and the full breakdown; the component decides what a FREE
 * viewer is allowed to see.
 *
 * Server-only: imports the db client.
 */

import { db, Prisma } from "@sports/db";
import type {
  FactorBreakdown,
  PickGrade,
  PickResult,
  PickType,
} from "@sports/types";
import { parseFactorBreakdown } from "@/lib/picks/parse-factor-breakdown";

/** Compact view-model for one explained pick. Public fields only. */
export interface GlassBoxPick {
  id: string;
  matchup: string;            // "Away @ Home"
  sport: string;
  market: string;             // the human selection, e.g. "Lakers -3.5"
  pickType: PickType;
  line: number;
  pickGrade: PickGrade;
  result: PickResult;
  /** Public Edge Index input — null only if the row stored no edge. */
  edgeScore: number | null;
  /** The full factor trail; null when the stored JSON is absent/malformed. */
  factorBreakdown: FactorBreakdown | null;
  generatedAt: string;        // ISO
}

export interface GlassBoxResult {
  picks: GlassBoxPick[];
  isEmpty: boolean;
  /** True only when the dev seed produced the rows (never in production). */
  isSampleData: boolean;
  generatedAt: string;        // ISO; when this snapshot was assembled
}

const DEFAULT_LIMIT = 6;
const MAX_LIMIT = 24;

/** Mirror of load-settled-picks.ts: treat an unreachable DB as "no rows". */
function isDatabaseUnreachable(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return code === "P1001" || message.includes("Can't reach database server");
}

const glassBoxPickSelect = Prisma.validator<Prisma.PickSelect>()({
  id: true,
  pickType: true,
  selection: true,
  line: true,
  edgeScore: true,
  pickGrade: true,
  riskLevel: true,
  result: true,
  modelVersion: true,
  factorBreakdown: true,
  generatedAt: true,
  game: {
    select: {
      homeTeamName: true,
      awayTeamName: true,
      sport: { select: { name: true, key: true } },
    },
  },
});

type GlassBoxRow = Prisma.PickGetPayload<{ select: typeof glassBoxPickSelect }>;

function mapRow(row: GlassBoxRow): GlassBoxPick {
  return {
    id: row.id,
    matchup: `${row.game.awayTeamName} @ ${row.game.homeTeamName}`,
    sport: row.game.sport.name || row.game.sport.key,
    market: row.selection,
    pickType: row.pickType as PickType,
    line: row.line,
    pickGrade: (row.pickGrade ?? "LEAN") as PickGrade,
    result: row.result as PickResult,
    // Prisma types edgeScore as a number column; guard for finite anyway so a
    // legacy NaN can never reach the client as a number.
    edgeScore: Number.isFinite(row.edgeScore) ? row.edgeScore : null,
    // Never-throw parse — null is a handled "no factor trail" state.
    factorBreakdown: parseFactorBreakdown(row.factorBreakdown),
    generatedAt: row.generatedAt.toISOString(),
  };
}

/**
 * Load recent PUBLISHED, non-bootstrap, non-seed picks mapped to the compact
 * Glass-Box view-model. Never throws — degrades to an honest empty result.
 */
export async function loadGlassBoxPicks(limit = DEFAULT_LIMIT): Promise<GlassBoxResult> {
  const generatedAt = new Date().toISOString();
  const take = Math.min(Math.max(Math.round(limit), 1), MAX_LIMIT);

  // Production seed-row exclusion (defense-in-depth), identical to the public
  // picks surface: the dev seed tags rows modelVersion="v5.0.0-seed". In
  // dev/test this spread is empty, so behavior is unchanged.
  const excludeSeedInProd =
    process.env.NODE_ENV === "production"
      ? { NOT: { modelVersion: "v5.0.0-seed" } }
      : {};

  let rows: GlassBoxRow[];
  try {
    rows = await db.pick.findMany({
      where: {
        isPublished: true,
        isBootstrap: false, // never explain bootstrap-era picks
        ...excludeSeedInProd,
      },
      orderBy: { generatedAt: "desc" },
      take,
      select: glassBoxPickSelect,
    });
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return { picks: [], isEmpty: true, isSampleData: false, generatedAt };
    }
    // Any other failure also degrades honestly rather than crashing the page.
    return { picks: [], isEmpty: true, isSampleData: false, generatedAt };
  }

  const picks = rows.map(mapRow);
  // The dev seed is the only producer of this model version; in production the
  // filter above already drops it, so this is only ever true in dev/test.
  const isSampleData = rows.some((row) => row.modelVersion === "v5.0.0-seed");

  return {
    picks,
    isEmpty: picks.length === 0,
    isSampleData,
    generatedAt,
  };
}
