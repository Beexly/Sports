import { describe, expect, it } from "vitest";

import {
  findCapabilitiesByName,
  getAdditionalClaudePlugins,
  getCapabilityInventory,
  summarizeCapabilityInventory,
  validateCapabilityInventory,
} from "@/lib/opportunity-engine/capability-inventory";
import {
  CAPABILITY_PROVENANCE_HASH_PATTERN,
  capabilityProvenanceMaterial,
  computeCapabilityProvenanceHash,
  fnv1a64Hex,
  isWellFormedCapabilityProvenanceHash,
} from "@/lib/opportunity-engine/capability-provenance";

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

describe("NOVA capability provenance hashes", () => {
  const SOURCE_DOCUMENT = { schemaVersion: 1, capturedAt: "2026-07-21T21:00:00.000Z" };
  const SAMPLE_RECORD = {
    surface: "CLAUDE_PLUGIN",
    captureBatch: "INITIAL_USER_CAPTURE",
    state: "USER_REPORTED_CONNECTED",
    verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
    name: "SigNoz",
    author: "SigNoz",
    skillCount: 13,
    lastUpdated: "2026-07-20",
  };

  it("seals every inventory entry with a well-formed, unique provenance hash", () => {
    const entries = getCapabilityInventory();
    const hashes = new Set<string>();
    for (const entry of entries) {
      expect(entry.provenanceHash).toMatch(CAPABILITY_PROVENANCE_HASH_PATTERN);
      hashes.add(entry.provenanceHash);
    }
    expect(hashes.size).toBe(entries.length);
  });

  it("derives the hash deterministically from the record's exact source material", () => {
    const first = computeCapabilityProvenanceHash(SAMPLE_RECORD, SOURCE_DOCUMENT);
    const second = computeCapabilityProvenanceHash(SAMPLE_RECORD, SOURCE_DOCUMENT);
    expect(first).toBe(second);
    expect(isWellFormedCapabilityProvenanceHash(first)).toBe(true);

    const sealed = getCapabilityInventory().find((entry) => entry.id === "claude_plugin:signoz");
    expect(sealed?.provenanceHash).toBe(first);
  });

  it("changes the hash when any source-material field changes", () => {
    const baseline = computeCapabilityProvenanceHash(SAMPLE_RECORD, SOURCE_DOCUMENT);
    expect(computeCapabilityProvenanceHash({ ...SAMPLE_RECORD, skillCount: 14 }, SOURCE_DOCUMENT)).not.toBe(baseline);
    expect(computeCapabilityProvenanceHash({ ...SAMPLE_RECORD, author: "Someone Else" }, SOURCE_DOCUMENT)).not.toBe(baseline);
    expect(computeCapabilityProvenanceHash({ ...SAMPLE_RECORD, lastUpdated: "2026-07-21" }, SOURCE_DOCUMENT)).not.toBe(baseline);
    expect(
      computeCapabilityProvenanceHash(SAMPLE_RECORD, { ...SOURCE_DOCUMENT, capturedAt: "2026-07-22T00:00:00.000Z" }),
    ).not.toBe(baseline);
  });

  it("length-prefixes material fields so boundary injection cannot collide", () => {
    const material = capabilityProvenanceMaterial(SAMPLE_RECORD, SOURCE_DOCUMENT);
    expect(material).toContain("6:SigNoz");
    const injected = capabilityProvenanceMaterial(
      { ...SAMPLE_RECORD, name: "SigNoz|6", author: "SigNoz".slice(0, 4) },
      SOURCE_DOCUMENT,
    );
    expect(injected).not.toBe(material);
  });

  it("matches the FNV-1a 64-bit reference vectors", () => {
    // Independently computable: FNV-1a 64 of "" is the offset basis; "a" is a
    // published reference vector.
    expect(fnv1a64Hex("")).toBe("cbf29ce484222325");
    expect(fnv1a64Hex("a")).toBe("af63dc4c8601ec8c");
  });

  it("flags a tampered provenance hash through validateCapabilityInventory", () => {
    const entries = getCapabilityInventory();
    const first = entries[0]!;
    const tampered = [{ ...first, provenanceHash: "fnv1a64:0000000000000000" }, ...entries.slice(1)];
    const errors = validateCapabilityInventory(tampered);
    expect(errors).toContain(`${first.id} provenance hash does not match its captured source material.`);

    const malformed = [{ ...first, provenanceHash: "not-a-hash" }, ...entries.slice(1)];
    expect(validateCapabilityInventory(malformed)).toContain(`${first.id} has a malformed provenance hash.`);
  });
});
