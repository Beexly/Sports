/**
 * cv-dataset-ingest.ts — K4: licensed dataset ingestion for detector v2.
 *
 * Two licensed sources feed the v2 training mix:
 *  - Roboflow NFL helmet competition set: 9,947 images, 193,736 helmet
 *    boxes, Public Domain (verified on the dataset page). The 33%
 *    hard-label mass (Blurred/Difficult/Partial) is the occlusion subset
 *    our 57-frame eval lacks. Helmet-Sideline (7.76%) = sideline
 *    personnel, NOT players — EXCLUDED (the documented trap).
 *  - the-playmakers / wr-finder (Roboflow): 443 images, 8 position
 *    classes, CC BY 4.0 (explicit on the page; attribution required).
 *    The repo's CODE is RESEARCH-ONLY (dead MIT badge); the DATASET
 *    is usable with attribution.
 *
 * License gate: every ingest path checks DATASET_LICENSES.json first.
 * A missing or mismatched license throws — never silently ingest.
 *
 * Batch sampler: stratified 40% ours / 30% wr-finder / 30% helmets,
 * with 3:1 hard-class oversampling inside helmets. Seeded RNG for
 * reproducible mixes.
 *
 * NOTE: datasets are NEVER downloaded into the repo. Pull commands are
 * documented in docs/dataset-pull-commands.md; images live outside
 * version control.
 */

import type { BoundingBox } from "./cv-detector-contract.js";

/* ------------------------------------------------------------------ */
/* License gate                                                        */
/* ------------------------------------------------------------------ */

export type DatasetLicenses = Record<string, string>;

/**
 * Assert a dataset's recorded license matches the expected value.
 * Throws on missing key or mismatch — the ingest gate.
 */
export function assertLicense(
  licenses: DatasetLicenses,
  datasetKey: string,
  expectedLicense: string,
): void {
  const actual = licenses[datasetKey];
  if (actual == null) {
    throw new Error(
      `license gate: no license recorded for "${datasetKey}" in DATASET_LICENSES.json — refusing ingest`,
    );
  }
  if (actual !== expectedLicense) {
    throw new Error(
      `license gate: "${datasetKey}" recorded as "${actual}", expected "${expectedLicense}" — refusing ingest`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* COCO ingest (Roboflow helmet competition set)                       */
/* ------------------------------------------------------------------ */

export interface CocoAnnotation {
  readonly id: number;
  readonly image_id: number;
  readonly category_id: number;
  /** [left, top, width, height] (COCO / Roboflow export). */
  readonly bbox: readonly [number, number, number, number];
}

export interface CocoCategory {
  readonly id: number;
  readonly name: string;
}

export interface PersonPositive {
  readonly box: BoundingBox;
  /** Blurred / Difficult / Partial — the occlusion hard subset. */
  readonly hard: boolean;
  readonly source: "roboflow-nfl-competition";
  readonly license: "Public Domain";
  readonly annotationId: number;
}

export interface HelmetIngestResult {
  readonly positives: readonly PersonPositive[];
  /** Annotation ids excluded as sideline personnel. */
  readonly excludedSideline: readonly number[];
  readonly hardCount: number;
}

export const HELMET_DATASET_KEY = "nfl-competition";
export const HELMET_LICENSE = "Public Domain";
const HELMET_PERSON_CATEGORIES = new Set([
  "Helmet",
  "Helmet-Blurred",
  "Helmet-Difficult",
  "Helmet-Partial",
]);
const HELMET_SIDELINE_CATEGORY = "Helmet-Sideline";

/**
 * Ingest a COCO-format Roboflow helmet export into person positives.
 * Excludes Helmet-Sideline (non-player personnel). License-gated.
 */
export function ingestRoboflowHelmet(
  annotations: readonly CocoAnnotation[],
  categories: readonly CocoCategory[],
  licenses: DatasetLicenses,
): HelmetIngestResult {
  assertLicense(licenses, HELMET_DATASET_KEY, HELMET_LICENSE);
  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const positives: PersonPositive[] = [];
  const excludedSideline: number[] = [];
  for (const ann of annotations) {
    const name = catById.get(ann.category_id);
    if (name === HELMET_SIDELINE_CATEGORY) {
      excludedSideline.push(ann.id);
      continue;
    }
    if (name == null || !HELMET_PERSON_CATEGORIES.has(name)) continue;
    const [x, y, width, height] = ann.bbox;
    positives.push({
      box: { x, y, width, height },
      hard: name !== "Helmet",
      source: "roboflow-nfl-competition",
      license: "Public Domain",
      annotationId: ann.id,
    });
  }
  return {
    positives,
    excludedSideline,
    hardCount: positives.filter((p) => p.hard).length,
  };
}

/* ------------------------------------------------------------------ */
/* the-playmakers / wr-finder loader (CC BY 4.0, attribution required) */
/* ------------------------------------------------------------------ */

export const PLAYMAKERS_DATASET_KEY = "the-playmakers";
export const PLAYMAKERS_LICENSE = "CC BY 4.0";
export const PLAYMAKERS_ATTRIBUTION =
  "WR Finder dataset by ruidazeng (Roboflow Universe, cs-1430/wr-finder), CC BY 4.0";

export interface PlaymakersItem {
  readonly imageId: number;
  readonly box: BoundingBox;
  /** One of the 8 position classes. */
  readonly positionClass: string;
  readonly source: "the-playmakers";
  readonly license: "CC BY 4.0";
  readonly attribution: string;
}

/**
 * Load a COCO-format wr-finder export. License-gated (CC BY 4.0);
 * every item carries the attribution string.
 */
export function loadPlaymakers(
  annotations: readonly CocoAnnotation[],
  categories: readonly CocoCategory[],
  licenses: DatasetLicenses,
): PlaymakersItem[] {
  assertLicense(licenses, PLAYMAKERS_DATASET_KEY, PLAYMAKERS_LICENSE);
  const catById = new Map(categories.map((c) => [c.id, c.name]));
  const items: PlaymakersItem[] = [];
  for (const ann of annotations) {
    const name = catById.get(ann.category_id);
    if (name == null) continue;
    const [x, y, width, height] = ann.bbox;
    items.push({
      imageId: ann.image_id,
      box: { x, y, width, height },
      positionClass: name,
      source: "the-playmakers",
      license: "CC BY 4.0",
      attribution: PLAYMAKERS_ATTRIBUTION,
    });
  }
  return items;
}

/* ------------------------------------------------------------------ */
/* Seeded RNG + stratified batch sampler                               */
/* ------------------------------------------------------------------ */

/** mulberry32 — small seeded PRNG for reproducible training mixes. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TrainingItem {
  readonly id: string;
  readonly source: "ours" | "wr-finder" | "helmet";
  readonly hard: boolean;
}

export interface TrainingPools {
  readonly ours: readonly TrainingItem[];
  readonly wrFinder: readonly TrainingItem[];
  readonly helmets: readonly TrainingItem[];
}

/** Hard-class oversample ratio inside the helmet pool (3:1 hard:easy). */
export const HELMET_HARD_OVERSAMPLE = 3;

function pickUniform<T>(pool: readonly T[], rng: () => number): T {
  if (pool.length === 0) throw new Error("batch sampler: empty pool");
  return pool[Math.floor(rng() * pool.length)]!;
}

/** Helmet pick with 3:1 hard-class oversampling. */
export function sampleHelmet(
  helmets: readonly TrainingItem[],
  rng: () => number,
): TrainingItem {
  const hard = helmets.filter((h) => h.hard);
  const easy = helmets.filter((h) => !h.hard);
  const hardWeight = HELMET_HARD_OVERSAMPLE;
  const total = hard.length * hardWeight + easy.length;
  if (total === 0) throw new Error("batch sampler: empty helmet pool");
  const r = rng() * total;
  const pool = r < hard.length * hardWeight ? hard : easy;
  const src = pool.length > 0 ? pool : helmets;
  return pickUniform(src, rng);
}

export interface BatchSampler {
  sampleBatch(batchSize: number): TrainingItem[];
}

/**
 * Stratified sampler: 40% ours / 30% wr-finder / 30% helmets per slot.
 * Deterministic given the seed.
 */
export function createBatchSampler(pools: TrainingPools, seed: number): BatchSampler {
  const rng = mulberry32(seed);
  return {
    sampleBatch(batchSize: number): TrainingItem[] {
      const batch: TrainingItem[] = [];
      for (let i = 0; i < batchSize; i++) {
        const r = rng();
        if (r < 0.4) batch.push(pickUniform(pools.ours, rng));
        else if (r < 0.7) batch.push(pickUniform(pools.wrFinder, rng));
        else batch.push(sampleHelmet(pools.helmets, rng));
      }
      return batch;
    },
  };
}
