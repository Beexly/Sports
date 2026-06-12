import { describe, expect, it } from "vitest";
import {
  buildSelfModel,
  getKnowledgeForDomain,
  isKnowledgeStale,
  recordSelfCorrection,
  summarizeSelfModelForOwner,
} from "../self-knowledge";
import { makeSummary } from "./fixtures";

const NOW = "2026-06-12T07:00:00.000Z";

describe("self-knowledge model", () => {
  it("cannotDoList names voice and external tools as NOT wired", () => {
    const model = buildSelfModel(makeSummary(), NOW);
    const text = model.cannotDoList.join(" ");
    expect(text).toContain("voice interface is NOT_WIRED");
    expect(text).toContain("external tool layer is NOT_WIRED");
  });

  it("MEMORY_STORE is honestly unknown — file-backed only, no recall", () => {
    const model = buildSelfModel(makeSummary(), NOW);
    const memory = getKnowledgeForDomain(model, "MEMORY_STORE");
    expect(memory.isKnown).toBe(false);
    expect(memory.gapDescription).toContain("no recall across sessions");
  });

  it("performance knowledge tracks the gate, not optimism", () => {
    const model = buildSelfModel(makeSummary(), NOW);
    const perf = getKnowledgeForDomain(model, "PERFORMANCE_STATS");
    expect(perf.isKnown).toBe(false); // displaySafe=false in fixture
    expect(perf.howToFill).toContain("7 more settled");
  });

  it("staleness is computed, not asserted", () => {
    const model = buildSelfModel(makeSummary(), NOW);
    const platform = getKnowledgeForDomain(model, "PLATFORM_STATE");
    expect(platform.freshnessStatus).toBe("FRESH"); // assessed 1h before NOW
    expect(isKnowledgeStale(platform, "2026-06-14T07:00:00.000Z")).toBe(true);
    expect(
      isKnowledgeStale(getKnowledgeForDomain(model, "VOICE_INTERFACE"), NOW)
    ).toBe(true); // never updated → stale by definition
  });

  it("recordSelfCorrection appends without mutating", () => {
    const model = buildSelfModel(makeSummary(), NOW);
    const corrected = recordSelfCorrection(
      model,
      "Correction from earlier: settled count was 17, not 18."
    );
    expect(corrected.selfCorrectionLog).toHaveLength(1);
    expect(model.selfCorrectionLog).toHaveLength(0);
  });

  it("owner summary of self-knowledge admits the unknowns", () => {
    const text = summarizeSelfModelForOwner(buildSelfModel(makeSummary(), NOW));
    expect(text).toContain("I do not know");
    expect(text).toContain("VOICE_INTERFACE");
  });
});
