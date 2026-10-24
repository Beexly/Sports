import { createHash } from "node:crypto";
import { db } from "@sports/db";
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

export function stableStringify(value: unknown): string {
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

export async function recordSourceSnapshot(input: SourceSnapshotInput): Promise<void> {
  const payloadText = stableStringify(input.payload);
  const payloadHash = createHash("sha256").update(payloadText).digest("hex");

  await db.sourceSnapshot.create({
    data: {
      provider: input.provider,
      sourceKind: input.sourceKind,
      sport: input.sport ?? null,
      externalId: input.externalId ?? null,
      ingestionRunId: input.ingestionRunId ?? null,
      fetchedAt: input.fetchedAt,
      payload: JSON.parse(payloadText),
      payloadHash,
      payloadBytes: Buffer.byteLength(payloadText, "utf8"),
    },
  });
}
