import { createHash } from "node:crypto";
import { db, isStubMode, type Prisma } from "@sports/db";
import type { SourceSnapshotKind } from "@sports/types";

/** Stable, human-readable identity for a repository research artifact. */
export interface ResearchArtifactInput {
  readonly provider: string;
  readonly sourceKind: SourceSnapshotKind;
  readonly externalId: string;
  readonly repoPath: string;
  readonly title: string;
  readonly summary: string;
  readonly sourceRef?: string | null;
  readonly fetchedAt: Date;
  readonly raw: Uint8Array;
  readonly tags?: readonly string[];
}

export interface ResearchArtifactStore {
  readonly sourceSnapshot: {
    findFirst(args: {
      where: Record<string, unknown>;
      select?: Record<string, unknown>;
    }): Promise<ResearchArtifactRow | null>;
    create(args: {
      data: Record<string, unknown>;
    }): Promise<ResearchArtifactRow>;
  };
}

type ResearchArtifactRow = {
  readonly id: string;
  readonly payloadHash: string;
  readonly payloadBytes: number;
};

function isUniqueConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  if (code === "P2002") return true;
  return error instanceof Error && /unique|duplicate/i.test(error.message);
}

async function findExisting(
  store: ResearchArtifactStore,
  input: ResearchArtifactInput,
): Promise<ResearchArtifactRow | null> {
  return store.sourceSnapshot.findFirst({
    where: {
      provider: input.provider,
      sourceKind: input.sourceKind,
      externalId: input.externalId,
    },
    select: { id: true, payloadHash: true, payloadBytes: true },
  });
}

export type ResearchArtifactResult =
  | { status: "ok"; id: string; sha256: string; bytes: number; deduped: false }
  | { status: "ok"; id: string; sha256: string; bytes: number; deduped: true }
  | { status: "stub" }
  | { status: "error"; error: string };

/** Hash the exact bytes supplied by the caller, not a normalized reserialization. */
export function researchArtifactDigest(raw: Uint8Array): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Persist a repository research artifact in the existing forensic source ledger.
 * The raw markdown remains the tracked source of truth; this row records the
 * immutable identity and lets the database reject duplicate ingestions without
 * storing a second copy of the document.
 */
const defaultStore = db as unknown as ResearchArtifactStore;

export async function persistResearchArtifact(
  input: ResearchArtifactInput,
  store: ResearchArtifactStore = defaultStore,
): Promise<ResearchArtifactResult> {
  // An injected store is an explicit test/operator boundary and must remain
  // usable even when the process-wide Prisma client is in stub mode. The real
  // default path still reports "stub" rather than claiming a durable write.
  if (store === defaultStore && isStubMode()) return { status: "stub" };
  if (!input.externalId.trim() || !input.repoPath.trim() || !input.title.trim()) {
    return { status: "error", error: "artifact identity is incomplete" };
  }
  if (input.raw.byteLength === 0) {
    return { status: "error", error: "artifact is empty" };
  }

  const sha256 = researchArtifactDigest(input.raw);
  const bytes = input.raw.byteLength;
  try {
    const existing = await findExisting(store, input);
    if (existing) {
      if (existing.payloadHash !== sha256 || existing.payloadBytes !== bytes) {
        return { status: "error", error: "research artifact checksum conflict" };
      }
      return { status: "ok", id: existing.id, sha256: existing.payloadHash, bytes: existing.payloadBytes, deduped: true };
    }
    try {
      const created = await store.sourceSnapshot.create({
        data: {
          provider: input.provider,
          sourceKind: input.sourceKind,
          sport: "nfl",
          externalId: input.externalId,
          fetchedAt: input.fetchedAt,
          payload: {
            _mode: "artifact-reference",
            repoPath: input.repoPath,
            title: input.title,
            summary: input.summary,
            sha256,
            payloadBytes: bytes,
            sourceRef: input.sourceRef ?? null,
            tags: [...(input.tags ?? [])],
          } as Prisma.InputJsonValue,
          payloadHash: sha256,
          payloadBytes: bytes,
        },
      });
      return { status: "ok", id: created.id, sha256, bytes, deduped: false };
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const raced = await findExisting(store, input);
      if (!raced) throw error;
      if (raced.payloadHash !== sha256 || raced.payloadBytes !== bytes) {
        return { status: "error", error: "research artifact checksum conflict" };
      }
      return { status: "ok", id: raced.id, sha256: raced.payloadHash, bytes: raced.payloadBytes, deduped: true };
    }
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : "research artifact write failed",
    };
  }
}
