import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_EXPLAIN_REGISTER,
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
  PICK_EXPLAINER_SYSTEM,
  buildExplainSystem,
  isExplainRegister,
} from "@/lib/pick-explainer/prompts";

/**
 * Reader registers — "same data, different doorway" (NFL House doctrine).
 * One grounded answer renders for three audiences. The register may change
 * vocabulary and depth ONLY; grounding, no-advice, and citation rules must be
 * present verbatim in every register. These tests pin that invariant plus the
 * API and client wiring.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("register prompt variants", () => {
  it("offers exactly teach / plain / math", () => {
    expect(EXPLAIN_REGISTERS).toEqual(["teach", "plain", "math"]);
    expect(DEFAULT_EXPLAIN_REGISTER).toBe("plain");
    expect(Object.keys(EXPLAIN_REGISTER_LABELS).sort()).toEqual(
      ["math", "plain", "teach"],
    );
  });

  it("every register keeps the full safety core — registers never weaken rules", () => {
    for (const register of EXPLAIN_REGISTERS) {
      const system = buildExplainSystem(register);
      expect(system).toContain("Strictly grounded");
      expect(system).toContain("NOT advice");
      expect(system).toContain("Cite your grounding at least once");
      expect(system).toContain("the desk, not a bot");
    }
  });

  it("teach register defines terms; math register leads with numbers", () => {
    expect(buildExplainSystem("teach")).toContain("Define every market term");
    expect(buildExplainSystem("teach")).toContain("never condescending");
    expect(buildExplainSystem("math")).toContain("signed weight");
    expect(buildExplainSystem("math")).toContain("Lead with the numbers");
  });

  it("the back-compat constant is the plain register", () => {
    expect(PICK_EXPLAINER_SYSTEM).toBe(buildExplainSystem("plain"));
  });

  it("validates register values strictly", () => {
    expect(isExplainRegister("teach")).toBe(true);
    expect(isExplainRegister("math")).toBe(true);
    expect(isExplainRegister("expert")).toBe(false);
    expect(isExplainRegister(null)).toBe(false);
    expect(isExplainRegister(1)).toBe(false);
  });
});

describe("API wiring", () => {
  const route = read("app/api/picks/[id]/explain/route.ts");

  it("rejects invalid registers with 400 instead of coercing", () => {
    expect(route).toContain("isExplainRegister(body.register)");
    expect(route).toMatch(/invalid register[\s\S]*?status: 400/);
  });

  it("threads the register into explainPick and echoes it back", () => {
    expect(route).toMatch(/explainPick\(\{[\s\S]*?register,/);
    expect(route).toMatch(/success: true,[\s\S]*?register,/);
  });
});

describe("client wiring", () => {
  const client = read("components/picks/ask-why.tsx");
  // Storage logic lives in the shared hook; ask-why delegates to it.
  const hook = read("lib/reader-register/use-reader-register.ts");

  it("renders all three doorway labels with pressed-state accessibility", () => {
    expect(client).toContain("EXPLAIN_REGISTER_LABELS");
    expect(client).toContain("aria-pressed");
    expect(client).toContain('aria-label="Explanation depth"');
  });

  it("ask-why uses the shared reader-register hook", () => {
    expect(client).toContain("useReaderRegister");
  });

  it("shared hook persists the reader's choice under the canonical key", () => {
    expect(hook).toContain("gse-reader-register");
    expect(hook).toContain("localStorage");
  });

  it("uses world tokens, not raw palette classes", () => {
    const raw = client.match(
      /(?:text|bg|border)-(?:gray|green|red|yellow|cyan|blue|slate|zinc)-\d+/g,
    );
    expect(raw ?? []).toEqual([]);
  });
});
