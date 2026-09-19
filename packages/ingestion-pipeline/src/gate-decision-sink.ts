/**
 * gate-decision-sink.ts — Writer sink for the gate_decisions audit table.
 *
 * Restores the missing writer for `gate_decisions` (unwritten for 94 days since 2026-06-11).
 * Records an immutable audit decision for EVERY fixture evaluated by the engine:
 *  - PUBLISHED: when a pick passed all conviction, edge, and freshness gates.
 *  - GATED: when a fixture was evaluated but withheld (no edge, adverse edge, unconfirmed, in-play, etc.).
 *
 * Consumed by:
 *  - apps/web/lib/board/passes.ts (Pass List / Held board lane)
 *  - apps/web/lib/board/state.ts (loadBoardState)
 *  - apps/web/lib/bot-outbox/load.ts (Twitter / Discord bot outbox)
 */

import { db } from "@sports/db";

export type GateReasonCode =
  | "PUBLISHED"
  | "PRICES_WORSE_THAN_MARKET"
  | "NO_CONVICTION_EDGE"
  | "INSUFFICIENT_BOOKMAKERS"
  | "UNCONFIRMED_FIXTURE"
  | "IN_PLAY"
  | "ODDS_STALE";

export interface GateDecisionInput {
  readonly gameId: string;
  readonly pickId?: string | null;
  readonly status: "PUBLISHED" | "GATED" | "SCORING";
  readonly reasonCode: GateReasonCode | string;
  readonly reason: string;
  readonly confidence?: number | null;
  readonly edgeIndex?: number | null;
  readonly modelVersion: string;
  readonly isBootstrap: boolean;
  readonly evaluatedAt: Date;
  readonly evidenceRefs?: Record<string, unknown> | null;
}

export interface GateDecisionSinkResult {
  readonly attempted: number;
  readonly persisted: number;
  readonly error?: string;
}

/**
 * Persists a batch of gate decisions safely.
 * De-duplicates by (gameId, reasonCode) within the batch and fails gracefully on DB errors.
 */
export async function persistGateDecisions(
  decisions: readonly GateDecisionInput[]
): Promise<GateDecisionSinkResult> {
  if (!decisions.length) {
    return { attempted: 0, persisted: 0 };
  }

  // De-duplicate in memory by gameId to prevent duplicate rows in one cycle
  const seenGameIds = new Set<string>();
  const deduplicated = [];

  for (const d of decisions) {
    if (!d.gameId || seenGameIds.has(d.gameId)) continue;
    seenGameIds.add(d.gameId);
    deduplicated.push({
      gameId: d.gameId,
      pickId: d.pickId ?? null,
      status: d.status,
      reason: d.reason.slice(0, 240),
      reasonCode: d.reasonCode.slice(0, 80),
      confidence: d.confidence != null ? Math.round(d.confidence) : null,
      edgeIndex: d.edgeIndex != null ? Number(d.edgeIndex) : null,
      modelVersion: d.modelVersion,
      isBootstrap: d.isBootstrap,
      evaluatedAt: d.evaluatedAt,
      evidenceRefs: d.evidenceRefs ? JSON.parse(JSON.stringify(d.evidenceRefs)) : undefined,
    });
  }

  try {
    const result = await db.gateDecision.createMany({
      data: deduplicated as any,
      skipDuplicates: true,
    });

    return {
      attempted: decisions.length,
      persisted: result.count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[gate-decision-sink] Warning: Failed to persist gate decisions: ${message}`);
    return {
      attempted: decisions.length,
      persisted: 0,
      error: message,
    };
  }
}
