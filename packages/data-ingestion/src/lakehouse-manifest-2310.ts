/**
 * Lakehouse layout (bronze/silver/gold) with time-travel + branch corruption gate
 *
 * Research port: arXiv:2310.08697
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Adopts the lakehouse pattern at GSE scale: bronze (raw nflverse pulls, odds snapshots, NGS dumps), silver (cleaned play-by-play), gold (feature tables). Manifests carry content hashes for time-travel reproduction and a branch gate that refuses to promote corrupted commits.
 *
 * ACCEPTANCE GATE: ADOPT iff (i) time-travel reproduction is byte-identical on the 2024 replay and (ii) the branch gate catches injected corruption (no promotion of bad commits).
 */

export type LakeLayer = "bronze" | "silver" | "gold";

export interface LakeManifest {
  layer: LakeLayer;
  dataset: string;
  /** content hash of the exact bytes written */
  contentHash: string;
  /** hash of the parent commit's manifest (chain of custody) */
  parentHash: string | null;
  createdAt: string; // ISO
  rowCount: number;
}

const BRONZE_DATASETS = ["nflverse_raw", "odds_snapshots", "ngs_dumps"] as const;
const SILVER_DATASETS = ["pbp_clean"] as const;
const GOLD_DATASETS = ["feature_tables"] as const;

export function layerFor(dataset: string): LakeLayer | null {
  if ((BRONZE_DATASETS as readonly string[]).includes(dataset)) return "bronze";
  if ((SILVER_DATASETS as readonly string[]).includes(dataset)) return "silver";
  if ((GOLD_DATASETS as readonly string[]).includes(dataset)) return "gold";
  return null;
}

/** Pure manifest builder (hashing is done by the storage layer; we only record). */
export function writeManifest(args: {
  dataset: string;
  contentHash: string;
  parentHash: string | null;
  createdAt: string;
  rowCount: number;
}): LakeManifest {
  const layer = layerFor(args.dataset);
  if (!layer) throw new Error(`unknown dataset for lakehouse layout: ${args.dataset}`);
  return { layer, ...args };
}

/** Time-travel: latest manifest for a dataset at or before asOf. */
export function timeTravel(manifests: LakeManifest[], dataset: string, asOf: string): LakeManifest | null {
  const hits = manifests
    .filter((m) => m.dataset === dataset && m.createdAt <= asOf)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return hits[0] ?? null;
}

/**
 * Branch gate: a commit may promote only if its content hash matches the bytes
 * actually written (expectedHash) and its parent chain is intact.
 */
export function branchGate(m: LakeManifest, expectedHash: string, parentExists: boolean): { promote: boolean; reason: string } {
  if (m.contentHash !== expectedHash) {
    return { promote: false, reason: "corruption: content hash mismatch — refusing promotion" };
  }
  if (m.parentHash !== null && !parentExists) {
    return { promote: false, reason: "broken parent chain — refusing promotion" };
  }
  return { promote: true, reason: "hashes verified" };
}


/** Live-data gate: stays off until lakehouse manifest adopted for GSE tables. */
export const GSE_LAKEHOUSE_MANIFEST_ENABLED = false;
