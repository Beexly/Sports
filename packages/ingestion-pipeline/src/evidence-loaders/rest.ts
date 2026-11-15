/**
 * Rest loader — scheduling/fatigue context straight off the games row.
 *
 * restDaysHome/restDaysAway are nullable: they are computed by the context
 * pass, and until it runs they are NULL. A NULL rest day is MISSING — never
 * 0, never the "default 7" that used to fabricate a well-rested team.
 *
 * Stamped with contextComputedAt (when the context pass actually ran),
 * falling back to updatedAt / commenceTime. SELECT only.
 */
import type { SqlClient } from "@sports/prediction-engine/src/literature/literature-retrieval.js";
import type { Evidence, RestRecord } from "@sports/prediction-engine/src/evidence/types.js";
import { missing, real } from "@sports/prediction-engine/src/evidence/types.js";

const REST_SELECT = `SELECT "restDaysHome", "restDaysAway", "isBackToBackHome", "isBackToBackAway", "contextComputedAt", "updatedAt", "commenceTime" FROM games WHERE id = $1`;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function field(row: Record<string, unknown>, key: string): unknown {
  return row[key];
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asDateIso(v: unknown): string | null {
  if (v instanceof Date) {
    return Number.isFinite(v.getTime()) ? v.toISOString() : null;
  }
  if (typeof v !== "string" || v.trim().length === 0) return null;
  const raw = v.trim();
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const d = new Date(hasZone ? iso : `${iso}Z`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

export async function loadRest(db: SqlClient, gameId: string): Promise<Evidence<RestRecord>> {
  const result = await db.query(REST_SELECT, [gameId]);
  const row = result.rows[0];
  if (!isRecord(row)) {
    return missing(`no games row for id ${gameId}`, "games");
  }

  const asOf =
    asDateIso(field(row, "contextComputedAt")) ??
    asDateIso(field(row, "updatedAt")) ??
    asDateIso(field(row, "commenceTime"));

  const homeRestDays = asNumber(field(row, "restDaysHome"));
  const awayRestDays = asNumber(field(row, "restDaysAway"));
  if (homeRestDays === null || awayRestDays === null) {
    return missing("restDays not computed for this game", "games", asOf ?? undefined);
  }

  const homeBackToBack = field(row, "isBackToBackHome");
  const awayBackToBack = field(row, "isBackToBackAway");
  if (typeof homeBackToBack !== "boolean" || typeof awayBackToBack !== "boolean") {
    return missing("back-to-back flags not computed for this game", "games", asOf ?? undefined);
  }

  if (asOf === null) {
    return missing("games row has no timestamp to stamp rest evidence", "games");
  }

  const record: RestRecord = {
    homeRestDays,
    awayRestDays,
    homeBackToBack,
    awayBackToBack,
  };
  return real(record, "games", asOf);
}
