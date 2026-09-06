/**
 * Durable ledger for the credit governor (C-109). Append-only JarvisMemoryEvent
 * rows, latest row wins: the same pattern apps/web/lib/ops uses for the
 * ops.calibration.drift marker, chosen over a SettlementRun because the
 * marker must be visible to refresh-odds and the truth surface as well as to
 * settlement, and a paid ODDS call has no settlement run to hang off. No
 * schema change: three scopes on the existing table.
 *
 *   ops.odds.credits     {remaining, used, observedAt, source}   after every paid call
 *   ops.odds.paidScores  {sport, purpose, at}  (source_ref = sport) before a paid scores call
 *   ops.odds.paidOdds    {sport, purpose, at}  (source_ref = sport) before a paid odds call
 *
 * The db is a structural interface so this package keeps zero runtime
 * dependency on @sports/db; callers pass the Prisma client through
 * `db as unknown as OddsCreditLedgerDb`, as the settlement-run helpers do.
 * Every function is failure-isolated: a ledger outage never blocks a
 * settlement or a refresh, it only removes the pacing signal.
 */

import {
  buildOddsCreditTruth,
  type OddsCreditObservation,
  type OddsCreditTruth,
  type PaidCallPurpose,
} from "./odds-credit-governor.js";

export const ODDS_CREDITS_SCOPE = "ops.odds.credits";
export const ODDS_PAID_CALL_SCOPE: Readonly<Record<PaidCallPurpose, string>> = {
  scores: "ops.odds.paidScores",
  odds: "ops.odds.paidOdds",
};

export interface PaidCallMarker {
  readonly sport: string;
  readonly purpose: PaidCallPurpose;
  /** ISO timestamp of the paid call. */
  readonly at: string;
}

interface LedgerRow {
  readonly full_text: string | null;
  readonly metadata: unknown;
}

export interface OddsCreditLedgerDb {
  readonly jarvisMemoryEvent: {
    findFirst(args: {
      where: { scope: string; memory_type: "episodic"; source_ref?: string };
      orderBy: { created_at: "desc" };
      select: { full_text: true; metadata: true };
    }): Promise<LedgerRow | null>;
    findMany(args: {
      where: { scope: string; memory_type: "episodic"; created_at: { gte: Date } };
      orderBy: { created_at: "asc" };
      select: { full_text: true; metadata: true };
      take: number;
    }): Promise<LedgerRow[]>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
}

function parseRow(row: LedgerRow): unknown {
  if (typeof row.metadata === "object" && row.metadata !== null) return row.metadata;
  if (row.full_text) {
    try {
      return JSON.parse(row.full_text);
    } catch {
      return null;
    }
  }
  return null;
}

function isObservation(raw: unknown): raw is OddsCreditObservation {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o["remaining"] === "number" && typeof o["observedAt"] === "string";
}

function isMarker(raw: unknown): raw is PaidCallMarker {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return typeof o["sport"] === "string" && typeof o["at"] === "string";
}

export async function recordCreditObservation(
  db: OddsCreditLedgerDb,
  obs: OddsCreditObservation,
): Promise<"ok" | "skipped" | "error"> {
  // odds-api-client parses a MISSING x-requests-* header as 0. A real post-call
  // response never reads remaining 0 AND used 0, so that pair is a header-less
  // response (proxy or CDN edge), not an observation: recording it would hold
  // every paid call on a zero the vendor never reported.
  if (obs.remaining === 0 && obs.used === 0) return "skipped";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: ODDS_CREDITS_SCOPE,
        title: `Odds API credits remaining=${obs.remaining}`,
        summary: `remaining=${obs.remaining} used=${obs.used ?? "n/a"} via ${obs.source}`,
        full_text: JSON.stringify(obs),
        source_type: `ops.odds.${obs.source}`,
        source_timestamp: new Date(obs.observedAt),
        actor: "system",
        owner: "system",
        confidence: 95,
        tags: ["odds-api", "credits"],
        metadata: obs as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function loadLatestCreditObservation(
  db: OddsCreditLedgerDb,
): Promise<OddsCreditObservation | null> {
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: ODDS_CREDITS_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseRow(row);
    return isObservation(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** Observations written since `since`, oldest first (bounded). */
export async function loadCreditObservationsSince(
  db: OddsCreditLedgerDb,
  since: Date,
): Promise<OddsCreditObservation[]> {
  try {
    const rows = await db.jarvisMemoryEvent.findMany({
      where: { scope: ODDS_CREDITS_SCOPE, memory_type: "episodic", created_at: { gte: since } },
      orderBy: { created_at: "asc" },
      select: { full_text: true, metadata: true },
      take: 500,
    });
    return rows.map(parseRow).filter(isObservation);
  } catch {
    return [];
  }
}

export async function recordPaidCall(
  db: OddsCreditLedgerDb,
  marker: PaidCallMarker,
): Promise<"ok" | "error"> {
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: ODDS_PAID_CALL_SCOPE[marker.purpose],
        title: `Paid ${marker.purpose} call ${marker.sport}`,
        summary: `${marker.sport} ${marker.purpose} at ${marker.at}`,
        full_text: JSON.stringify(marker),
        source_type: "ops.odds.paid-call",
        source_ref: marker.sport,
        source_timestamp: new Date(marker.at),
        actor: "system",
        owner: "system",
        confidence: 95,
        tags: ["odds-api", "paid-call", marker.purpose],
        metadata: marker as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

/** Latest paid call for (purpose, sport); null when none was ever recorded. */
export async function loadLatestPaidCallAt(
  db: OddsCreditLedgerDb,
  purpose: PaidCallPurpose,
  sport: string,
): Promise<Date | null> {
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: ODDS_PAID_CALL_SCOPE[purpose], memory_type: "episodic", source_ref: sport },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw = parseRow(row);
    if (!isMarker(raw)) return null;
    const at = new Date(raw.at);
    return Number.isNaN(at.getTime()) ? null : at;
  } catch {
    return null;
  }
}

/**
 * Truth-surface block (oddsInserting.dualPath.credits): latest reading plus a
 * projection from the last 24 hours of observations. Read-only; never throws.
 */
export async function loadOddsCreditTruth(
  db: OddsCreditLedgerDb,
  now: Date = new Date(),
): Promise<OddsCreditTruth> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [latest, last24h] = await Promise.all([
    loadLatestCreditObservation(db),
    loadCreditObservationsSince(db, since),
  ]);
  return buildOddsCreditTruth({ latest, last24h, now });
}
