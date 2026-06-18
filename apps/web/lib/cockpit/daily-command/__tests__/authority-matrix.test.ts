import { describe, it, expect } from "vitest";
import { AUTHORITY_LADDER, buildAuthorityMatrix } from "../authority-matrix";
import { AGENT_OS_REGISTRY } from "@/lib/agents/agent-registry";

describe("buildAuthorityMatrix — L0–L5 ladder", () => {
  const matrix = buildAuthorityMatrix();

  it("declares six rungs L0..L5 in order", () => {
    expect(matrix.rungs.map((r) => r.level)).toEqual(["L0", "L1", "L2", "L3", "L4", "L5"]);
  });

  it("places every registry agent on exactly one rung (no drops, no dupes)", () => {
    const placed = matrix.rungs.flatMap((r) => r.agents.map((a) => a.id));
    // Every agent that maps to a real authority level is placed once.
    const mapped = AGENT_OS_REGISTRY.filter((a) =>
      AUTHORITY_LADDER.some((rung) => rung.authorityLevels.includes(a.authorityLevel))
    );
    expect(placed.length).toBe(mapped.length);
    expect(new Set(placed).size).toBe(placed.length);
  });

  it("L5 is declared empty by design", () => {
    const l5 = matrix.rungs.find((r) => r.level === "L5");
    expect(l5).toBeDefined();
    expect(l5?.agents).toHaveLength(0);
    expect(l5?.externalActionsAllowed).toBe(false);
  });

  it("no rung permits external action", () => {
    for (const rung of matrix.rungs) {
      expect(rung.externalActionsAllowed).toBe(false);
    }
  });

  it("zero agents are external-action capable (the honesty invariant)", () => {
    expect(matrix.externalActionCapableCount).toBe(0);
    expect(matrix.note).toMatch(/empty by design/i);
  });

  it("maps OWNER_ONLY agents onto L4 and OBSERVE agents onto L0", () => {
    const l0 = matrix.rungs.find((r) => r.level === "L0");
    for (const a of l0?.agents ?? []) {
      const def = AGENT_OS_REGISTRY.find((d) => d.id === a.id);
      expect(def?.authorityLevel).toBe("OBSERVE");
    }
  });
});
