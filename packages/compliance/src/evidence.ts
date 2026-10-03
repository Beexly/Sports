import { createHash } from "crypto";
import type { EvidenceObject } from "./types";

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function makeEvidence(
  controlId: string,
  source: string,
  payload: unknown,
  uri?: string,
): Omit<EvidenceObject, "id"> {
  return {
    controlId,
    source,
    collectedAt: new Date().toISOString(),
    contentHash: hashPayload(payload),
    uri,
    meta: typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : { value: payload },
  };
}
