import { describe, it, expect } from "vitest";
import { legalAllowsLive, isForbidden } from "../source-genome.js";
import { sourceReliability, reliabilityFromGenome } from "../source-quality-score.js";
import { computeSourceCost } from "../source-cost-model.js";
import { findCollisions, resolveToGse, gseEntityId } from "../entity-spine.js";
import { knowableAt, pointInTimeFacts } from "../temporal-fact.js";
import { GENOME_NFLVERSE, GENOME_ODDS_API, MAPPINGS_FIXTURE, FACTS_FIXTURE } from "../source-mesh-fixtures.js";

describe("Source legal gate", () => {
  it("permits live use only for licensed/free-open verdicts", () => {
    expect(legalAllowsLive("LICENSED")).toBe(true);
    expect(legalAllowsLive("FREE_OPEN")).toBe(true);
    expect(legalAllowsLive("FREE_CAUTION")).toBe(false);
    expect(legalAllowsLive("PAID_REQUIRED")).toBe(false);
    expect(legalAllowsLive("RIGHTS_REVIEW")).toBe(false);
    expect(legalAllowsLive("DO_NOT_USE")).toBe(false);
  });
  it("flags forbidden sources", () => {
    expect(isForbidden("DO_NOT_USE")).toBe(true);
    expect(isForbidden("FREE_OPEN")).toBe(false);
  });
});

describe("Source quality score", () => {
  it("is multiplicative and names the weakest dimension", () => {
    const r = sourceReliability({ historicalAccuracy: 0.9, schemaStability: 0.9, freshnessSlaHitRate: 0.9, entityMappingConfidence: 0.5, correctionTransparency: 0.9 });
    expect(r.reliability).toBeCloseTo(0.9 * 0.9 * 0.9 * 0.5 * 0.9, 4);
    expect(r.weakestDimension).toBe("entityMappingConfidence");
  });
  it("derives a reliability from a genome", () => {
    expect(reliabilityFromGenome(GENOME_NFLVERSE).reliability).toBeGreaterThan(0);
  });
});

describe("Source cost model", () => {
  it("rates a free source with leverage as maximally efficient", () => {
    const free = computeSourceCost({ costPerMonth: 0, usefulFactsPerMonth: 1000, decisionLeverageTotal: 5 });
    const paid = computeSourceCost({ costPerMonth: 500, usefulFactsPerMonth: 1000, decisionLeverageTotal: 5 });
    expect(free.costEfficiency).toBeGreaterThan(paid.costEfficiency);
    expect(paid.costPerUsefulFact).toBeCloseTo(0.5, 4);
  });
});

describe("Entity spine", () => {
  it("builds canonical ids and resolves a provider id", () => {
    expect(gseEntityId("player", "CeeDee Lamb")).toBe("player:ceedee_lamb");
    expect(resolveToGse(MAPPINGS_FIXTURE, "nflverse", "00-0036322")!.gseId).toBe("player:ceedee_lamb");
  });
  it("detects an entity-mapping collision (one provider id → two canonical entities)", () => {
    const collisions = findCollisions(MAPPINGS_FIXTURE);
    expect(collisions.some((c) => c.key === "trivia:MP-1" && c.gseIds.length === 2)).toBe(true);
  });
});

describe("Temporal fact knowability (fails closed)", () => {
  it("a fact first-seen AFTER the decision is not knowable / not creditable", () => {
    const r = knowableAt(FACTS_FIXTURE[0]!, "2026-01-04T18:00:00Z"); // first-seen 2026-01-06
    expect(r.verdict).toBe("NOT_YET_KNOWABLE");
    expect(r.creditable).toBe(false);
  });
  it("a rights-blocked (review/forbidden) fact is never creditable", () => {
    const blocked = { ...FACTS_FIXTURE[1]!, rightsStatus: "RIGHTS_REVIEW" as const };
    expect(knowableAt(blocked, "2030-01-01T00:00:00Z").verdict).toBe("RIGHTS_BLOCKED");
  });
  it("an unparseable timestamp fails closed as SOURCE_UNCLEAR", () => {
    expect(knowableAt(FACTS_FIXTURE[0]!, "not-a-date").verdict).toBe("SOURCE_UNCLEAR");
  });
  it("point-in-time filter excludes facts not yet knowable at the decision time", () => {
    // At 2026-01-05 the inactive fact (first-seen 01-04) is visible; the snap fact (first-seen 01-06) is not.
    expect(pointInTimeFacts(FACTS_FIXTURE, "2026-01-05T00:00:00Z").map((f) => f.factId)).toEqual(["f-inactive-leak"]);
  });
  it("genome metadata is available for downstream scoring", () => {
    expect(GENOME_ODDS_API.legalVerdict).toBe("LICENSED");
  });
});
