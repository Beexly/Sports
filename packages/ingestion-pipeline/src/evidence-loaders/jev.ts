/**
 * JEV spine loader.
 *
 * A spine is JEV's classification of a game's situational buckets. It is an
 * LLM's opinion about a game that has not been played, so it is DERIVED, it is
 * labelled, and its emission weight is zero. It informs the reasoning trace and
 * nothing else.
 *
 * The loader re-derives the content hash from the file body and refuses a file
 * whose hash does not match. A spine that cannot prove it is the spine that was
 * generated is not evidence.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

import type { Evidence, JevSpineRecord } from "@sports/prediction-engine/src/evidence/types.js";
import { derived, missing } from "@sports/prediction-engine/src/evidence/types.js";

export interface JevSpineFile {
  readonly schema: string;
  readonly gameId: string;
  readonly generatedAt: string;
  readonly label: string;
  readonly emissionWeight: number;
  readonly diagnosticDelta: number;
  readonly snapCount: number;
  readonly contentHash: string;
  readonly [key: string]: unknown;
}

export const JEV_SPINE_SCHEMA = "gse.jev.spine.v1";

function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const src = obj as Record<string, unknown>;
  const keys = Object.keys(src).sort();
  const parts: string[] = [];
  for (const k of keys) {
    if (src[k] === undefined) continue;
    parts.push(`${JSON.stringify(k)}:${canonical(src[k])}`);
  }
  return `{${parts.join(",")}}`;
}

/** Re-derive the hash the generator wrote. */
export function spineContentHash(file: JevSpineFile): string {
  const { contentHash: _ignored, ...body } = file;
  return createHash("sha256").update(canonical(body), "utf8").digest("hex");
}

export function loadJevSpine(
  gameId: string,
  path: string | null,
): Evidence<JevSpineRecord> {
  if (path === null) {
    return missing("no JEV spine file supplied for this game", "jev:spine");
  }
  let raw: JevSpineFile;
  try {
    raw = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as JevSpineFile;
  } catch (err) {
    return missing(`JEV spine unreadable: ${(err as Error).message}`, "jev:spine");
  }

  if (raw.schema !== JEV_SPINE_SCHEMA) {
    return missing(`JEV spine schema is "${String(raw.schema)}", expected "${JEV_SPINE_SCHEMA}"`, "jev:spine");
  }
  if (raw.gameId !== gameId) {
    return missing(`JEV spine is for game ${String(raw.gameId)}, not ${gameId}`, "jev:spine");
  }
  const rederived = spineContentHash(raw);
  if (rederived !== raw.contentHash) {
    return missing(
      `JEV spine contentHash does not match its body (file ${String(raw.contentHash)}, re-derived ${rederived})`,
      "jev:spine",
    );
  }

  return derived(
    {
      gameId: raw.gameId,
      generatedAt: raw.generatedAt,
      contentHash: raw.contentHash,
      snapCount: raw.snapCount,
      label: raw.label,
      // The file may claim a weight; the loader does not honour it. A spine is
      // unvalidated classifier output and its weight is zero by construction.
      emissionWeight: 0,
      diagnosticDelta: raw.diagnosticDelta,
    },
    "jev:spine",
    raw.generatedAt,
    "unvalidated classifier shadow output; emission weight 0",
  );
}
