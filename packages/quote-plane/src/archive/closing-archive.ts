/**
 * Self-owned closing archive — P3.
 * Persist every quote we see → free CLV forever.
 * No paid Odds API required for history.
 *
 * methodTag/modelVersion ride with each row so open→close continuous CLV
 * can call sameMethodOrRefuse (missing tags → refuse continuous path).
 */

import type { QuoteLine, QuoteSourceKind } from "../types";
import {
  computeContinuousClv,
  type ContinuousClvResult,
} from "../clv/method-continuity";

export interface ArchivedQuote {
  readonly archiveId: string;
  readonly eventId: string;
  readonly sport: string;
  readonly market: string;
  readonly selection: string;
  readonly q: number;
  readonly quoteAsOf: string;
  readonly archivedAt: string;
  readonly sourceId: string;
  readonly sourceKind: QuoteSourceKind;
  readonly bookId?: string;
  readonly phase: "open" | "live" | "closing" | "settled";
  readonly kickoffIso?: string;
  /** Fair-method stamp for continuous CLV (optional on legacy rows) */
  readonly methodTag?: string;
  readonly modelVersion?: string;
}

export interface ClvObservation {
  readonly eventId: string;
  readonly selection: string;
  readonly openQ: number;
  readonly closeQ: number;
  readonly openAsOf: string;
  readonly closeAsOf: string;
  readonly clv: number; // open - close for favorite path; signed beat of close
  readonly sourceKindOpen: QuoteSourceKind;
  readonly sourceKindClose: QuoteSourceKind;
  readonly methodTag?: string;
  readonly modelVersion?: string;
  /** true only when open/close tags match via sameMethodOrRefuse */
  readonly continuous: boolean;
  readonly continuityCode?: string;
}

/** Durable snapshot for multi-instance / revive — JSON-serializable. */
export interface ClosingArchiveSnapshot {
  readonly version: 1;
  readonly seq: number;
  readonly rows: ArchivedQuote[];
  readonly exportedAt: string;
}

function archiveKey(l: Pick<QuoteLine, "eventId" | "market" | "selection" | "sourceId" | "quoteAsOf">): string {
  return `${l.eventId}|${l.market}|${l.selection}|${l.sourceId}|${l.quoteAsOf}`;
}

export class ClosingArchive {
  private readonly byKey = new Map<string, ArchivedQuote>();
  private seq = 0;

  constructor(private readonly clock: () => Date = () => new Date()) {}

  size(): number {
    return this.byKey.size;
  }

  clear(): void {
    this.byKey.clear();
  }

  /**
   * Ingest lines. Dedupes on event|market|selection|source|quoteAsOf.
   * Returns count newly stored.
   */
  ingestLines(
    lines: readonly QuoteLine[],
    now = this.clock(),
    opts: { kickoffIso?: string; phase?: ArchivedQuote["phase"] } = {},
  ): number {
    let n = 0;
    const archivedAt = now.toISOString();
    for (const l of lines) {
      if (!Number.isFinite(l.q) || l.q <= 0 || l.q >= 1) continue;
      const k = archiveKey(l);
      if (this.byKey.has(k)) continue;
      this.seq++;
      const phase =
        opts.phase ??
        inferPhase(l.quoteAsOf, opts.kickoffIso, archivedAt);
      this.byKey.set(k, {
        archiveId: `arch_${this.seq}`,
        eventId: l.eventId,
        sport: l.sport,
        market: l.market,
        selection: l.selection,
        q: l.q,
        quoteAsOf: l.quoteAsOf,
        archivedAt,
        sourceId: l.sourceId,
        sourceKind: l.sourceKind,
        bookId: l.bookId,
        phase,
        kickoffIso: opts.kickoffIso,
        methodTag: l.methodTag?.trim() || undefined,
        modelVersion: l.modelVersion?.trim() || undefined,
      });
      n++;
    }
    return n;
  }

  list(filter?: {
    eventId?: string;
    selection?: string;
    phase?: ArchivedQuote["phase"];
  }): ArchivedQuote[] {
    let rows = [...this.byKey.values()];
    if (filter?.eventId) rows = rows.filter((r) => r.eventId === filter.eventId);
    if (filter?.selection)
      rows = rows.filter((r) => r.selection === filter.selection);
    if (filter?.phase) rows = rows.filter((r) => r.phase === filter.phase);
    return rows.sort(
      (a, b) => Date.parse(a.quoteAsOf) - Date.parse(b.quoteAsOf),
    );
  }

  /** Earliest quote for event+selection (open) */
  openLine(eventId: string, selection: string): ArchivedQuote | null {
    const rows = this.list({ eventId, selection });
    return rows[0] ?? null;
  }

  /** Latest quote before kickoff (closing) */
  closeLine(
    eventId: string,
    selection: string,
    kickoffIso?: string,
  ): ArchivedQuote | null {
    const rows = this.list({ eventId, selection });
    if (!rows.length) return null;
    if (!kickoffIso) return rows[rows.length - 1]!;
    const ko = Date.parse(kickoffIso);
    const before = rows.filter((r) => Date.parse(r.quoteAsOf) <= ko);
    return before[before.length - 1] ?? rows[rows.length - 1]!;
  }

  /**
   * Raw CLV arithmetic openQ - closeQ (research / internal).
   * Prefer computeContinuousClvObservation for honesty-gated self-CLV.
   */
  computeClv(
    eventId: string,
    selection: string,
    kickoffIso?: string,
  ): ClvObservation | null {
    const open = this.openLine(eventId, selection);
    const close = this.closeLine(eventId, selection, kickoffIso);
    if (!open || !close) return null;
    if (open.archiveId === close.archiveId && this.list({ eventId, selection }).length < 2) {
      return null; // need two distinct observations
    }
    const cont = this.continuousResult(open, close);
    return {
      eventId,
      selection,
      openQ: open.q,
      closeQ: close.q,
      openAsOf: open.quoteAsOf,
      closeAsOf: close.quoteAsOf,
      clv: open.q - close.q,
      sourceKindOpen: open.sourceKind,
      sourceKindClose: close.sourceKind,
      methodTag: cont.ok ? cont.methodTag : undefined,
      modelVersion: cont.ok ? cont.modelVersion : undefined,
      continuous: cont.ok,
      continuityCode: cont.ok ? undefined : cont.code,
    };
  }

  /**
   * Honesty-gated self-CLV: sameMethodOrRefuse on open/close tags.
   * Missing tags → refuse (ok:false missing_method_tag).
   */
  computeContinuousClvObservation(
    eventId: string,
    selection: string,
    kickoffIso?: string,
    side: "long" | "short" = "long",
  ): ContinuousClvResult | { ok: false; code: "insufficient_history"; error: string } {
    const open = this.openLine(eventId, selection);
    const close = this.closeLine(eventId, selection, kickoffIso);
    if (!open || !close) {
      return {
        ok: false,
        code: "insufficient_history",
        error: "need open and close archive rows",
      };
    }
    if (
      open.archiveId === close.archiveId &&
      this.list({ eventId, selection }).length < 2
    ) {
      return {
        ok: false,
        code: "insufficient_history",
        error: "need two distinct observations",
      };
    }
    return computeContinuousClv({
      open: {
        q: open.q,
        methodTag: open.methodTag ?? "",
        modelVersion: open.modelVersion ?? "",
        asOf: open.quoteAsOf,
        sourceId: open.sourceId,
      },
      close: {
        q: close.q,
        methodTag: close.methodTag ?? "",
        modelVersion: close.modelVersion ?? "",
        asOf: close.quoteAsOf,
        sourceId: close.sourceId,
      },
      side,
    });
  }

  private continuousResult(
    open: ArchivedQuote,
    close: ArchivedQuote,
  ): ContinuousClvResult {
    return computeContinuousClv({
      open: {
        q: open.q,
        methodTag: open.methodTag ?? "",
        modelVersion: open.modelVersion ?? "",
      },
      close: {
        q: close.q,
        methodTag: close.methodTag ?? "",
        modelVersion: close.modelVersion ?? "",
      },
      side: "long",
    });
  }

  /** Export durable snapshot — wire to Prisma/blob in monorepo multi-instance. */
  toSnapshot(): ClosingArchiveSnapshot {
    return {
      version: 1,
      seq: this.seq,
      rows: [...this.byKey.values()],
      exportedAt: this.clock().toISOString(),
    };
  }

  /** Hydrate from durable snapshot (merge, prefer existing keys). */
  loadSnapshot(snap: ClosingArchiveSnapshot, mode: "replace" | "merge" = "replace"): number {
    if (snap.version !== 1) return 0;
    if (mode === "replace") {
      this.byKey.clear();
      this.seq = 0;
    }
    let n = 0;
    for (const r of snap.rows) {
      const k = `${r.eventId}|${r.market}|${r.selection}|${r.sourceId}|${r.quoteAsOf}`;
      if (this.byKey.has(k)) continue;
      this.byKey.set(k, r);
      n++;
      const num = Number(String(r.archiveId).replace(/\D/g, "")) || 0;
      if (num > this.seq) this.seq = num;
    }
    if (snap.seq > this.seq) this.seq = snap.seq;
    return n;
  }

  /** Provider adapter: serve historical closes as quote lines */
  asClosingProvider(): {
    id: "gse.closing_archive";
    kind: "closing_archive";
    rights: "internal_synthetic";
    requiresApiKey: false;
    phaseOutRole: "primary_candidate";
    fetchQuotes: (req: {
      sport: string;
      eventId?: string;
      asOf?: string;
    }) => Promise<QuoteLine[]>;
  } {
    const self = this;
    return {
      id: "gse.closing_archive",
      kind: "closing_archive",
      rights: "internal_synthetic",
      requiresApiKey: false,
      phaseOutRole: "primary_candidate",
      async fetchQuotes(req) {
        let rows = self.list(
          req.eventId ? { eventId: req.eventId } : undefined,
        );
        if (req.sport && req.sport !== "MULTI") {
          rows = rows.filter((r) => r.sport === req.sport || r.sport === "MULTI");
        }
        // Prefer closing phase when available
        const bySel = new Map<string, ArchivedQuote>();
        for (const r of rows) {
          const k = `${r.eventId}|${r.selection}`;
          const prev = bySel.get(k);
          if (!prev || Date.parse(r.quoteAsOf) > Date.parse(prev.quoteAsOf)) {
            bySel.set(k, r);
          }
        }
        return [...bySel.values()].map((r) => ({
          eventId: r.eventId,
          sport: r.sport,
          market: r.market as QuoteLine["market"],
          selection: r.selection,
          q: r.q,
          quoteAsOf: r.quoteAsOf,
          sourceId: "gse.closing_archive",
          sourceKind: "closing_archive" as const,
          rights: "internal_synthetic" as const,
          bookId: r.bookId,
          confidence: 0.85,
          notes: `archived phase=${r.phase}`,
          methodTag: r.methodTag,
          modelVersion: r.modelVersion,
        }));
      },
    };
  }

  stats() {
    const rows = [...this.byKey.values()];
    const byPhase: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let tagged = 0;
    for (const r of rows) {
      byPhase[r.phase] = (byPhase[r.phase] ?? 0) + 1;
      byKind[r.sourceKind] = (byKind[r.sourceKind] ?? 0) + 1;
      if (r.methodTag?.trim() && r.modelVersion?.trim()) tagged++;
    }
    return {
      total: rows.length,
      byPhase,
      byKind,
      tagged,
      uniqueEvents: new Set(rows.map((r) => r.eventId)).size,
      oddsApiRequired: false as const,
    };
  }
}

function inferPhase(
  quoteAsOf: string,
  kickoffIso: string | undefined,
  archivedAt: string,
): ArchivedQuote["phase"] {
  if (!kickoffIso) return "open";
  const q = Date.parse(quoteAsOf);
  const ko = Date.parse(kickoffIso);
  if (!Number.isFinite(q) || !Number.isFinite(ko)) return "open";
  const hoursBefore = (ko - q) / 3600_000;
  if (hoursBefore > 24) return "open";
  if (hoursBefore > 0.05) return "closing";
  if (hoursBefore > -3) return "live";
  return "settled";
}

/** Seed demo archive for UI / tests — stamps PM method tags for continuous CLV. */
export function seedDemoClosingArchive(
  archive: ClosingArchive,
  now = new Date(),
): void {
  const t0 = new Date(now.getTime() - 48 * 3600_000).toISOString();
  const t1 = new Date(now.getTime() - 2 * 3600_000).toISOString();
  const t2 = new Date(now.getTime() - 30 * 60_000).toISOString();
  const kickoff = new Date(now.getTime() + 90 * 60_000).toISOString();
  const base = (eventId: string, selection: string, qs: number[], times: string[]) =>
    qs.map((q, i) => ({
      eventId,
      sport: "NFL",
      market: "h2h" as const,
      selection,
      q,
      quoteAsOf: times[i]!,
      sourceId: "polymarket.gamma",
      sourceKind: "prediction_market" as const,
      rights: "public_market" as const,
      bookId: "polymarket",
      confidence: 0.7,
      methodTag: "prediction_market_raw_v1",
      modelVersion: "quote.gamma.v1",
    }));

  archive.ingestLines(
    base("nfl-kc-buf", "KC", [0.55, 0.57, 0.58], [t0, t1, t2]),
    now,
    { kickoffIso: kickoff },
  );
  archive.ingestLines(
    base("nfl-phi-dal", "PHI", [0.5, 0.51, 0.52], [t0, t1, t2]),
    now,
    { kickoffIso: kickoff },
  );
}
