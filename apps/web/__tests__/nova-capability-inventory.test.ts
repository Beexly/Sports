import { describe, expect, it } from "vitest";

import {
  findCapabilitiesByName,
  getAdditionalClaudePlugins,
  getCapabilityInventory,
  summarizeCapabilityInventory,
  validateCapabilityInventory,
} from "@/lib/opportunity-engine/capability-inventory";

describe("NOVA Claude and ChatGPT capability inventory", () => {
  it("accounts for every captured Claude and ChatGPT capability without granting authority", () => {
    const entries = getCapabilityInventory();
    const summary = summarizeCapabilityInventory(entries);
    expect(summary).toEqual({
      total: 293,
      claudePlugins: 195,
      claudePluginSkills: 1925,
      additionalClaudePlugins: 110,
      largeClaudePluginBundles: 4,
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

  it("preserves all 110 additional plugin records and their metadata", () => {
    const additions = getAdditionalClaudePlugins();
    expect(additions).toHaveLength(110);
    expect(additions.reduce((total, entry) => total + (entry.skillCount ?? 0), 0)).toBe(1243);
    expect(additions.every((entry) => entry.captureBatch === "ADDITIONAL_USER_CAPTURE")).toBe(true);
    expect(additions.every((entry) => entry.lastUpdated?.startsWith("2026-"))).toBe(true);
    expect(additions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Ecc", author: "Affaan Mustafa", skillCount: 363 }),
        expect.objectContaining({ name: "Posthog", author: "PostHog", skillCount: 129 }),
        expect.objectContaining({ name: "AWS Startup Advisor", author: "Amazon Web Services", skillCount: 5 }),
        expect.objectContaining({ name: "Prompt governance", author: "Alireza Rezvani", skillCount: 1 }),
        expect.objectContaining({ name: "Finance skills", author: "Alireza Rezvani", skillCount: 3 }),
      ]),
    );
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
    const canva = findCapabilitiesByName("Canva").filter(
      (entry) => entry.name.toLowerCase() === "canva",
    );
    expect(canva.map((entry) => entry.surface).sort()).toEqual([
      "CHATGPT_APP",
      "CLAUDE_CONNECTOR",
      "CLAUDE_PLUGIN",
    ]);

    const linear = findCapabilitiesByName("Linear").filter(
      (entry) => entry.name.toLowerCase() === "linear",
    );
    expect(linear.some((entry) => entry.surface === "CLAUDE_PLUGIN")).toBe(true);
    expect(linear.some((entry) => entry.surface === "CHATGPT_APP")).toBe(true);

    const vercel = findCapabilitiesByName("Vercel").filter(
      (entry) => entry.name.toLowerCase() === "vercel",
    );
    expect(vercel.some((entry) => entry.surface === "CLAUDE_PLUGIN")).toBe(true);
    expect(vercel.some((entry) => entry.surface === "CLAUDE_CONNECTOR")).toBe(true);
    expect(vercel.some((entry) => entry.surface === "CHATGPT_APP")).toBe(true);
  });
});
