/**
 * Adapter contract and runner.
 *
 * Shape follows packages/data-ingestion: same tier vocabulary as the RoE, same "fetch then
 * normalize then validate" order, same refusal to coerce. Differences on purpose:
 *  - normalize is pure and takes a RawArtifact, never a live response, so it is replayable.
 *  - validate fails the whole batch on one bad row. A partial harvest is a lie by omission.
 *  - provenance is produced by the adapter from the artifact, so a caller cannot stamp a row
 *    with a URL it did not fetch.
 */

import type { ZodType } from "zod";
import type { Provenance, RawArtifact, RivalAssetType } from "./types.js";
import { provenanceOf, stableHash } from "./types.js";
import type { LicenseClass } from "./types.js";

export interface RivalAdapter<T> {
  readonly orgSlug: string;
  readonly assetType: RivalAssetType;
  readonly tier: 0 | 1 | 2 | 3 | 4;
  /** Registry source_id, checked against the source-rights registry before the fetch. */
  readonly sourceId: string;
  readonly licenseClass: LicenseClass;
  readonly commercialOk: boolean;
  readonly url: string;
  /** Zod schema, strict. Used by validate. */
  readonly schema: ZodType<T>;
  normalize(raw: RawArtifact): T[];
}

export interface AdapterRun<T> {
  readonly orgSlug: string;
  readonly assetType: RivalAssetType;
  readonly rows: readonly T[];
  readonly provenance: Provenance;
  readonly warnings: readonly string[];
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: "FETCH" | "NORMALIZE" | "VALIDATE",
    public readonly detail?: unknown,
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export const DEFAULT_UA = "GSE-CompetitiveIntel/1.0 (+https://github.com/Beexly/Sports)";

/** Fetch one artifact. No retries here on purpose: the caller owns backoff policy. */
export async function fetchArtifact(
  url: string,
  tier: 0 | 1 | 2 | 3 | 4,
  fetchImpl: typeof globalThis.fetch = globalThis.fetch,
  now: () => Date = () => new Date(),
): Promise<RawArtifact> {
  const res = await fetchImpl(url, {
    headers: { "user-agent": DEFAULT_UA, accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.text();
  if (!res.ok) {
    throw new AdapterError(`fetch failed ${res.status} for ${url}`, "FETCH", { status: res.status });
  }
  return {
    url,
    retrievedAt: now().toISOString(),
    tier,
    body,
    httpStatus: res.status,
    contentHash: stableHash(body),
  };
}

/**
 * Run an adapter end to end. Any invalid row rejects the batch: `AdapterError` with code
 * VALIDATE carries the zod issues and the row index.
 */
export async function runAdapter<T>(
  adapter: RivalAdapter<T>,
  raw: RawArtifact,
  warnings: string[] = [],
): Promise<AdapterRun<T>> {
  let rows: T[];
  try {
    rows = adapter.normalize(raw);
  } catch (err) {
    throw new AdapterError(`normalize threw for ${adapter.orgSlug}`, "NORMALIZE", err);
  }
  if (rows.length === 0) {
    warnings.push("normalize produced zero rows");
    return { orgSlug: adapter.orgSlug, assetType: adapter.assetType, rows, provenance: provenanceOf(raw, adapter.licenseClass, adapter.commercialOk), warnings };
  }
  const parsed = adapter.schema.array().safeParse(rows);
  if (!parsed.success) {
    throw new AdapterError(`validate failed for ${adapter.orgSlug}`, "VALIDATE", parsed.error.issues);
  }
  return {
    orgSlug: adapter.orgSlug,
    assetType: adapter.assetType,
    rows: parsed.data,
    provenance: provenanceOf(raw, adapter.licenseClass, adapter.commercialOk),
    warnings,
  };
}
