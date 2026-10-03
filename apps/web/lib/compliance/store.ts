/**
 * Prisma-backed adapters wiring @sports/compliance's injected persistence
 * seams (PersistEvidenceFn / SaveRunFn / OpenExceptionFn) to the
 * ComplianceEvidence / ComplianceCheckRun / ComplianceException tables.
 *
 * Follows this repo's convention for non-ai-control-plane lib modules
 * (see apps/web/lib/tasks/agent-task-store.ts, apps/web/lib/entitlements.ts):
 * import the shared `db` Prisma client directly rather than the
 * ControlSqlClient raw-SQL seam used by apps/web/lib/ai-control-plane — that
 * seam exists there for the atomic-claim invariants of the invocation
 * pipeline, which this monitoring-only package has no analog of.
 */
import { db } from "@sports/db";
import type { EvidenceObject, CcmRunResult } from "@sports/compliance";

export async function persistEvidence(evidence: Omit<EvidenceObject, "id">): Promise<string> {
  const row = await db.complianceEvidence.create({
    data: {
      controlId: evidence.controlId,
      source: evidence.source,
      collectedAt: new Date(evidence.collectedAt),
      contentHash: evidence.contentHash,
      uri: evidence.uri ?? null,
      meta: (evidence.meta ?? {}) as object,
    },
  });
  return row.id;
}

export async function saveRun(run: CcmRunResult): Promise<void> {
  await db.complianceCheckRun.create({
    data: {
      at: new Date(run.at),
      ok: run.ok,
      results: run.results as unknown as object,
    },
  });
}

export async function openException(controlId: string, detail: string): Promise<void> {
  await db.complianceException.create({
    data: { controlId, detail, status: "open" },
  });
}

export type OpenExceptionRow = {
  id: string;
  controlId: string;
  detail: string;
  status: string;
  createdAt: Date;
  closedAt: Date | null;
};

export async function listOpenExceptions(limit = 100): Promise<OpenExceptionRow[]> {
  return db.complianceException.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export type LastRunRow = {
  id: string;
  at: Date;
  ok: boolean;
  results: unknown;
};

export async function loadLastRun(): Promise<LastRunRow | null> {
  return db.complianceCheckRun.findFirst({ orderBy: { at: "desc" } });
}

export async function sampleEvidence(limit = 20): Promise<EvidenceObject[]> {
  const rows = await db.complianceEvidence.findMany({
    orderBy: { collectedAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    controlId: row.controlId,
    source: row.source,
    collectedAt: row.collectedAt.toISOString(),
    contentHash: row.contentHash,
    uri: row.uri ?? undefined,
    meta: (row.meta as Record<string, unknown> | null) ?? undefined,
  }));
}
