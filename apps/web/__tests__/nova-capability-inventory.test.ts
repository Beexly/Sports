import { describe, expect, it } from "vitest";

import {
  findCapabilitiesByName,
  getCapabilityInventory,
  summarizeCapabilityInventory,
  validateCapabilityInventory,
} from "@/lib/opportunity-engine/capability-inventory";

describe("NOVA Claude and ChatGPT capability inventory", () => {
  it("accounts for every captured Claude and ChatGPT capability without granting authority", () => {
    const entries = getCapabilityInventory();
    const summary = summarizeCapabilityInventory(entries);
    expect(summary).toEqual({
      total: 183,
      claudePlugins: 85,
      claudeConnectors: 46,
      claudeSkills: 12,
      chatgptApps: 26,
      chatgptSkills: 14,
      reconnectRequired: 3,
      runtimeVisible: 40,
    });
    expect(validateCapabilityInventory(entries)).toEqual([]);
    expect(entries.every((entry) => entry.executionAuthority === false)).toBe(true);
  });

  it("preserves verification differences between user-reported Claude inventory and runtime-visible ChatGPT tools", () => {
    const entries = getCapabilityInventory();
    expect(
      entries
        .filter((entry) => entry.surface.startsWith("CLAUDE"))
        .every((entry) => entry.verificationState === "CAPTURED_NOT_RUNTIME_VERIFIED"),
    ).toBe(true);
    expect(
      entries
        .filter((entry) => entry.surface.startsWith("CHATGPT"))
        .every((entry) => entry.verificationState === "RUNTIME_VISIBLE_2026_07_21"),
    ).toBe(true);
  });

  it("finds overlapping capabilities across surfaces without conflating them", () => {
    const canva = findCapabilitiesByName("Canva");
    expect(canva.map((entry) => entry.surface).sort()).toEqual([
      "CHATGPT_APP",
      "CLAUDE_CONNECTOR",
      "CLAUDE_PLUGIN",
    ]);

    const linear = findCapabilitiesByName("Linear");
    expect(linear.some((entry) => entry.surface === "CLAUDE_PLUGIN")).toBe(true);
    expect(linear.some((entry) => entry.surface === "CHATGPT_APP")).toBe(true);
  });
});
