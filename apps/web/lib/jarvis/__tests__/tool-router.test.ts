import { describe, it, expect } from "vitest";
import {
  TOOL_REGISTRY,
  getToolById,
  getToolsByCategory,
  getWiredTools,
  getApprovalRequiredTools,
  buildToolRouterStatus,
} from "../tool-router";

describe("tool registry — approval invariants", () => {
  it("every write tool has approvalRequired: true", () => {
    for (const tool of TOOL_REGISTRY.filter((t) => t.writeAllowed)) {
      expect(tool.approvalRequired, `${tool.id} must require approval`).toBe(true);
    }
  });

  it("every write tool has canRunNow: false — no approval mechanism is wired", () => {
    for (const tool of TOOL_REGISTRY.filter((t) => t.writeAllowed)) {
      expect(tool.canRunNow, `${tool.id} must not run now`).toBe(false);
    }
  });

  it("honest statuses: gmail/calendar/vercel NOT_WIRED, github DESIGNED, gse-data WIRED", () => {
    expect(getToolById("gmail")?.status).toBe("NOT_WIRED");
    expect(getToolById("calendar")?.status).toBe("NOT_WIRED");
    expect(getToolById("vercel")?.status).toBe("NOT_WIRED");
    expect(getToolById("github")?.status).toBe("DESIGNED");
    expect(getToolById("gse-data")?.status).toBe("WIRED");
    expect(getToolById("vault")?.status).toBe("WIRED");
    expect(getToolById("web-search")?.status).toBe("PARTIAL");
    expect(getToolById("file-search")?.status).toBe("PARTIAL");
  });
});

describe("getWiredTools", () => {
  it("returns only WIRED/ACTIVE tools", () => {
    const wired = getWiredTools();
    expect(wired.length).toBeGreaterThan(0);
    for (const tool of wired) {
      expect(["WIRED", "ACTIVE"]).toContain(tool.status);
    }
  });
});

describe("accessors", () => {
  it("getToolById returns undefined for unknown ids", () => {
    expect(getToolById("nonexistent")).toBeUndefined();
  });

  it("getToolsByCategory filters correctly", () => {
    const voice = getToolsByCategory("VOICE");
    expect(voice.map((t) => t.id).sort()).toEqual(["voice-stt", "voice-tts"]);
  });

  it("getApprovalRequiredTools matches the approvalRequired flag", () => {
    const gated = getApprovalRequiredTools();
    expect(gated.every((t) => t.approvalRequired)).toBe(true);
    expect(gated.length).toBe(TOOL_REGISTRY.filter((t) => t.approvalRequired).length);
  });
});

describe("buildToolRouterStatus", () => {
  it("totals are consistent: wired + partial + notWired = total", () => {
    const status = buildToolRouterStatus();
    expect(status.totalTools).toBe(TOOL_REGISTRY.length);
    expect(status.wiredCount + status.partialCount + status.notWiredCount).toBe(
      status.totalTools
    );
  });

  it("readyToUseNow contains only canRunNow tools (all read-only)", () => {
    const status = buildToolRouterStatus();
    for (const name of status.readyToUseNow) {
      const tool = TOOL_REGISTRY.find((t) => t.name === name);
      expect(tool?.canRunNow).toBe(true);
      expect(tool?.writeAllowed).toBe(false);
    }
  });
});
