import { describe, expect, it } from "vitest";
import { NOVA_SUBAGENTS, getNovaSubagent } from "@/lib/opportunity-engine";

describe("NOVA governed subagents", () => {
  it("defines distinct discovery, terms, monetization, mapping, prototyping, and proof lanes", () => {
    expect(NOVA_SUBAGENTS.map((item) => item.codename)).toEqual(["RADAR", "TERMS", "YIELD", "ATLAS", "FORGE", "PROOF"]);
  });

  it("grants no subagent external or persistent authority", () => {
    for (const subagent of NOVA_SUBAGENTS) {
      expect(subagent.externalActionsAllowed).toBe(false);
      expect(subagent.persistentAuthority).toBe(false);
      expect(subagent.prohibitedActions.length).toBeGreaterThan(0);
    }
  });

  it("keeps code production isolated and review-gated", () => {
    expect(getNovaSubagent("FORGE")?.prohibitedActions).toEqual(expect.arrayContaining(["Merge", "Deploy", "Use production credentials"]));
    expect(getNovaSubagent("PROOF")?.prohibitedActions).toContain("Approve its own generated prototype");
  });
});
