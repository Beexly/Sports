import { createHash } from "node:crypto";
import { db, type Prisma } from "@sports/db";
import type { SourceSnapshotKind } from "@sports/types";

export interface SourceSnapshotInput {
  provider: string;
  sourceKind: SourceSnapshotKind;
  sport?: string | null;
  externalId?: string | null;
  ingestionRunId?: string | null;
  fetchedAt: Date;
  payload: unknown;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, nested) => {
    if (!nested || typeof nested !== "object" || Array.isArray(nested)) {
      return nested;
    }
    return Object.keys(nested as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = (nested as Record<string, unknown>)[key];
        return acc;
      }, {});
  });
}

export type SourceSnapshotMode = "hash-only" | "db-full";

/**
 * Storage mode for the raw provider payload. `SourceSnapshot` keeps the SHA-256
 * hash + byte count + metadata ALWAYS (the forensic proof chain); this only governs
 * whether the multi-KB/MB raw JSON payload is also persisted. Default: `hash-only`
 * in production (the audit found raw payloads stored in Neon forever — a real cost
 * bleed), `db-full` elsewhere for local debugging. Pure (env-injectable).
 */
export function resolveSnapshotMode(env: Record<string, string | undefined> = process.env): SourceSnapshotMode {
  const raw = env["SOURCE_SNAPSHOT_MODE"];
  if (raw === "hash-only" || raw === "db-full") return raw;
  return env["NODE_ENV"] === "production" ? "hash-only" : "db-full";
}

/** The value to persist in the `payload` Json column for the given mode. Pure. */
export function snapshotPayloadFor(mode: SourceSnapshotMode, parsedPayload: unknown): unknown {
  if (mode === "db-full") return parsedPayload;
  return {
    _mode: "hash-only",
    _note: "Raw payload omitted to protect storage; SHA-256 hash + byte count are retained for audit.",
  };
}

export async function recordSourceSnapshot(input: SourceSnapshotInput): Promise<void> {
  const payloadText = stableStringify(input.payload);
  // Hash + byte count are ALWAYS computed from the full payload — integrity is
  // independent of whether we also store the raw JSON.
  const payloadHash = createHash("sha256").update(payloadText).digest("hex");
  const mode = resolveSnapshotMode();

  await db.sourceSnapshot.create({
    data: {
      provider: input.provider,
      sourceKind: input.sourceKind,
      sport: input.sport ?? null,
      externalId: input.externalId ?? null,
      ingestionRunId: input.ingestionRunId ?? null,
      fetchedAt: input.fetchedAt,
      payload: snapshotPayloadFor(mode, JSON.parse(payloadText)) as Prisma.InputJsonValue,
      payloadHash,
      payloadBytes: Buffer.byteLength(payloadText, "utf8"),
    },
  });
}
