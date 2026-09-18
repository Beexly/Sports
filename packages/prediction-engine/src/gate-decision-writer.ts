/**
 * Writer for gate_decisions. The table has had no production writer.
 * Schema already complete (status, reason, reasonCode, edgeIndex,
 * confidence, modelVersion, evaluatedAt, evidenceRefs, isBootstrap).
 * isBootstrap defaults to true in Prisma; omitting it writes rows the
 * readers (isBootstrap: false) never show. Set it explicitly every time.
 *
 * Retention rule: founder decision — escalated, not chosen here.
 */

export const GATE_DECISION_STATUSES = ["SCORING", "PUBLISHED", "GATED"] as const;
export type GateDecisionStatus = (typeof GATE_DECISION_STATUSES)[number];

export interface GateDecisionInput {
  readonly gameId: string;
  readonly pickId?: string | null;
  readonly status: GateDecisionStatus;
  readonly reason: string;
  readonly reasonCode: string;
  readonly edgeIndex?: number | null;
  readonly confidence?: number | null;
  readonly modelVersion: string;
  readonly evaluatedAt: Date;
  readonly evidenceRefs?: unknown;
  /** Required. Callers that omit this field fail closed. */
  readonly isBootstrap: boolean;
}

export interface GateDecisionRecord extends GateDecisionInput {
  readonly isBootstrap: boolean;
}

export class GateDecisionWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateDecisionWriteError";
  }
}

const STATUS_SET = new Set<string>(GATE_DECISION_STATUSES);

export function buildGateDecisionRecord(input: GateDecisionInput): GateDecisionRecord {
  if (!STATUS_SET.has(input.status)) {
    throw new GateDecisionWriteError(`unknown_status:${String(input.status)}`);
  }
  if (typeof input.isBootstrap !== "boolean") {
    throw new GateDecisionWriteError("isBootstrap_required");
  }
  if (!input.gameId) throw new GateDecisionWriteError("gameId_required");
  if (!input.reasonCode || typeof input.reasonCode !== "string") {
    throw new GateDecisionWriteError("reasonCode_required");
  }
  if (!input.reason) throw new GateDecisionWriteError("reason_required");
  if (!input.modelVersion) throw new GateDecisionWriteError("modelVersion_required");
  return { ...input, isBootstrap: input.isBootstrap };
}

export type GateDecisionSink = (row: GateDecisionRecord) => Promise<void> | void;

/** Decide-path hook. Persist is injected; this module does not touch a database. */
export async function recordGateDecision(
  input: GateDecisionInput,
  sink: GateDecisionSink,
): Promise<GateDecisionRecord> {
  const row = buildGateDecisionRecord(input);
  await sink(row);
  return row;
}

/** Reader: no row → null. Never a default that looks like a decision. */
export function readGateDecisionOrNull<T>(row: T | null | undefined): T | null {
  return row ?? null;
}
