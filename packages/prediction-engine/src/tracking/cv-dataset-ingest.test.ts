import { describe, expect, it } from "vitest";
import {
  assertLicense,
  createBatchSampler,
  ingestRoboflowHelmet,
  loadPlaymakers,
  sampleHelmet,
  mulberry32,
  type CocoAnnotation,
  type CocoCategory,
  type DatasetLicenses,
  type TrainingItem,
} from "./cv-dataset-ingest.js";
import licensesJson from "../../../../DATASET_LICENSES.json";

const licenses = licensesJson as DatasetLicenses;

const categories: CocoCategory[] = [
  { id: 1, name: "Helmet" },
  { id: 2, name: "Helmet-Blurred" },
  { id: 3, name: "Helmet-Difficult" },
  { id: 4, name: "Helmet-Partial" },
  { id: 5, name: "Helmet-Sideline" },
];

function ann(id: number, cat: number): CocoAnnotation {
  return {
    id,
    image_id: 1,
    category_id: cat,
    bbox: [10 * id, 10, 30, 30],
  };
}

describe("cv-dataset-ingest (K4)", () => {
  it("ingestion fixture: 10 annotations → 8 positives, 4 hard, 2 sideline excluded", () => {
    const annotations = [
      ann(1, 1),
      ann(2, 1),
      ann(3, 1),
      ann(4, 1), // 4× Helmet
      ann(5, 2),
      ann(6, 2), // 2× Helmet-Blurred
      ann(7, 3), // 1× Helmet-Difficult
      ann(8, 4), // 1× Helmet-Partial
      ann(9, 5),
      ann(10, 5), // 2× Helmet-Sideline
    ];
    const result = ingestRoboflowHelmet(annotations, categories, licenses);
    expect(result.positives).toHaveLength(8);
    expect(result.hardCount).toBe(4);
    expect(result.excludedSideline).toEqual([9, 10]);
    expect(result.excludedSideline).toContain(9);
    expect(
      result.positives.every((p) => p.license === "Public Domain"),
    ).toBe(true);
  });

  it("playmakers loader: CC BY 4.0 with attribution on every item", () => {
    const pmCats: CocoCategory[] = [
      { id: 1, name: "QB" },
      { id: 2, name: "WR" },
    ];
    const items = loadPlaymakers([ann(1, 1), ann(2, 2)], pmCats, licenses);
    expect(items).toHaveLength(2);
    expect(items[0]!.positionClass).toBe("QB");
    expect(
      items.every(
        (i) => i.license === "CC BY 4.0" && i.attribution.length > 0,
      ),
    ).toBe(true);
  });

  it("license gate: refuses on missing or mismatched license", () => {
    expect(() =>
      assertLicense({}, "nfl-competition", "Public Domain"),
    ).toThrow(/no license recorded/);
    expect(() =>
      assertLicense({ "nfl-competition": "CC BY 4.0" }, "nfl-competition", "Public Domain"),
    ).toThrow(/refusing ingest/);
    expect(() =>
      ingestRoboflowHelmet([], categories, { "nfl-competition": "MIT" }),
    ).toThrow(/refusing ingest/);
  });

  it("license sidecar: nfl-competition is Public Domain, playmakers CC BY 4.0", () => {
    expect(licenses["nfl-competition"]).toBe("Public Domain");
    expect(licenses["the-playmakers"]).toBe("CC BY 4.0");
    // The gate passes on the real sidecar — ingest proceeds.
    expect(() =>
      assertLicense(licenses, "nfl-competition", "Public Domain"),
    ).not.toThrow();
  });

  it("batch sampler: seeded 3:1 hard oversample gives exact pinned count", () => {
    // 100 items, 30 helmets (15 hard / 15 easy), 70 others.
    const helmets: TrainingItem[] = [];
    for (let i = 0; i < 15; i++)
      helmets.push({ id: `h-hard-${i}`, source: "helmet", hard: true });
    for (let i = 0; i < 15; i++)
      helmets.push({ id: `h-easy-${i}`, source: "helmet", hard: false });
    const pools = {
      ours: Array.from({ length: 40 }, (_, i) => ({
        id: `o-${i}`,
        source: "ours" as const,
        hard: false,
      })),
      wrFinder: Array.from({ length: 30 }, (_, i) => ({
        id: `w-${i}`,
        source: "wr-finder" as const,
        hard: false,
      })),
      helmets,
    };
    // Direct helmet draws: 10,000 samples, seed 42 → exact hard count pinned.
    const rng = mulberry32(42);
    let hardCount = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      if (sampleHelmet(helmets, rng).hard) hardCount++;
    }
    // 3:1 oversample on a 50/50 pool → ~75% hard; exact value pinned by seed.
    expect(hardCount / N).toBeGreaterThan(0.7);
    expect(hardCount / N).toBeLessThan(0.8);
    expect(hardCount).toBe(7549);
  });

  it("stratified sampler honors 40/30/30 pool ratios", () => {
    const mk = (n: number, source: TrainingItem["source"]): TrainingItem[] =>
      Array.from({ length: n }, (_, i) => ({ id: `${source}-${i}`, source, hard: false }));
    const sampler = createBatchSampler(
      { ours: mk(40, "ours"), wrFinder: mk(30, "wr-finder"), helmets: mk(30, "helmet") },
      7,
    );
    const batch = sampler.sampleBatch(1000);
    const counts = { ours: 0, "wr-finder": 0, helmet: 0 };
    for (const item of batch) counts[item.source]++;
    expect(counts.ours / 1000).toBeCloseTo(0.4, 1);
    expect(counts["wr-finder"] / 1000).toBeCloseTo(0.3, 1);
    expect(counts.helmet / 1000).toBeCloseTo(0.3, 1);
  });
});
