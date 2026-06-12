import { describe, it, expect } from "vitest";
import {
  PROMPT_LIBRARY,
  getPromptById,
  getPromptsByType,
  buildPromptFromTemplate,
  suggestNextPrompt,
} from "../prompt-library";

describe("PROMPT_LIBRARY shape", () => {
  it("registers at least 8 templates with unique ids", () => {
    expect(PROMPT_LIBRARY.length).toBeGreaterThanOrEqual(8);
    const ids = PROMPT_LIBRARY.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all prompts have acceptanceCriteria", () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(
        prompt.acceptanceCriteria.length,
        `${prompt.id} must declare acceptance criteria`
      ).toBeGreaterThan(0);
    }
  });

  it("all prompts declare forbidden actions, validation commands, and an approval boundary", () => {
    for (const prompt of PROMPT_LIBRARY) {
      expect(prompt.forbiddenActions.length).toBeGreaterThan(0);
      expect(prompt.validationCommands.length).toBeGreaterThan(0);
      expect(prompt.approvalBoundary.length).toBeGreaterThan(0);
      expect(prompt.scribeInstructions.length).toBeGreaterThan(0);
    }
  });
});

describe("accessors", () => {
  it("getPromptById finds registered templates", () => {
    expect(getPromptById("jarvis-os-build")?.type).toBe("CLAUDE_CODE_TASK");
    expect(getPromptById("nope")).toBeUndefined();
  });

  it("getPromptsByType filters correctly", () => {
    const overnight = getPromptsByType("OVERNIGHT_RUN");
    expect(overnight.length).toBeGreaterThanOrEqual(1);
    expect(overnight.every((p) => p.type === "OVERNIGHT_RUN")).toBe(true);
  });
});

describe("buildPromptFromTemplate", () => {
  it("fills placeholders from context", () => {
    const template = getPromptById("jarvis-os-build")!;
    const filled = buildPromptFromTemplate(template, {
      layer: "MEMORY",
      branch: "jarvis/os-foundation-fable5-v1",
    });
    expect(filled).toContain("MEMORY");
    expect(filled).toContain("jarvis/os-foundation-fable5-v1");
    expect(filled).not.toContain("{{layer}}");
    expect(filled).not.toContain("{{branch}}");
  });

  it("leaves unknown placeholders visible so gaps are obvious", () => {
    const template = getPromptById("gse-feature-build")!;
    const filled = buildPromptFromTemplate(template, { feature: "line alerts" });
    expect(filled).toContain("line alerts");
    expect(filled).toContain("{{branch}}");
  });
});

describe("suggestNextPrompt", () => {
  it("returns a prompt", () => {
    const suggestion = suggestNextPrompt("operations", []);
    expect(suggestion).not.toBeNull();
    expect(PROMPT_LIBRARY.some((p) => p.id === suggestion!.id)).toBe(true);
  });

  it("matches blockers to the relevant template deterministically", () => {
    expect(suggestNextPrompt("any", ["tests are failing in CI"])?.id).toBe(
      "overnight-test-run"
    );
    expect(suggestNextPrompt("any", ["ingestion is stale"])?.id).toBe(
      "data-reliability-check"
    );
    expect(suggestNextPrompt("any", ["calibration drift suspected"])?.id).toBe(
      "calibration-review"
    );
  });
});
