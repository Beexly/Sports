import { describe, expect, it } from "vitest";

import inventoryData from "../../../data/nova/ai-capability-inventory-2026-07-21.json";
import additionData from "../../../data/nova/ai-capability-inventory-additions-2026-07-21.json";
import {
  validateCapabilityAdditionsDocument,
  validateCapabilityCaptureDocument,
} from "@/lib/opportunity-engine/capability-source-schema";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type MutableDocument = Record<string, unknown> & {
  claude: {
    plugins: unknown[];
    connectors: { connected: string[] };
    personalSkills: string[];
  };
  chatgpt: Record<string, unknown>;
  counts: Record<string, unknown>;
  truthPolicy: Record<string, unknown>;
};

type MutableAdditions = Record<string, unknown> & {
  plugins: unknown[];
  counts: Record<string, unknown>;
  policy: Record<string, unknown>;
};

describe("NOVA capability capture-document schema validator", () => {
  it("accepts both shipped capture documents exactly as committed", () => {
    expect(validateCapabilityCaptureDocument(inventoryData)).toEqual([]);
    expect(validateCapabilityAdditionsDocument(additionData)).toEqual([]);
  });

  it("fails closed on non-object documents", () => {
    for (const bad of [null, undefined, 42, "doc", [1, 2]]) {
      expect(validateCapabilityCaptureDocument(bad)).toEqual(["document: must be a JSON object."]);
      expect(validateCapabilityAdditionsDocument(bad)).toEqual(["document: must be a JSON object."]);
    }
  });

  it("rejects unknown top-level keys so unvalidated content cannot ride along", () => {
    const doc = clone(inventoryData) as MutableDocument;
    doc.smuggledSection = { anything: true };
    expect(validateCapabilityCaptureDocument(doc)).toEqual([
      "document.smuggledSection: unexpected key — captured documents may not carry unvalidated content.",
    ]);
  });

  it("rejects a wrong schema version and a malformed capture timestamp", () => {
    const doc = clone(inventoryData) as MutableDocument;
    doc.schemaVersion = 2;
    doc.capturedAt = "not-a-timestamp";
    const errors = validateCapabilityCaptureDocument(doc);
    expect(errors).toContain("schemaVersion: must be 1.");
    expect(errors).toContain("capturedAt: must be an ISO timestamp.");
  });

  it("rejects a truth policy that no longer denies approval or execution", () => {
    const doc = clone(inventoryData) as MutableDocument;
    doc.truthPolicy.inventoryIsNotApproval = false;
    doc.truthPolicy.discoveryDoesNotGrantExecution = "yes";
    const errors = validateCapabilityCaptureDocument(doc);
    expect(errors).toContain("truthPolicy.inventoryIsNotApproval: must be exactly true.");
    expect(errors).toContain("truthPolicy.discoveryDoesNotGrantExecution: must be exactly true.");
  });

  it("rejects malformed plugin tuples with exact positions", () => {
    const doc = clone(inventoryData) as MutableDocument;
    doc.claude.plugins[0] = ["OnlyName"];
    doc.claude.plugins[1] = ["Name", "Author", -3, "2026-07-20"];
    doc.claude.plugins[2] = ["Name2", "Author", 2, "July 20"];
    const errors = validateCapabilityCaptureDocument(doc);
    expect(errors).toContain(
      "claude.plugins[0]: must be a 4-item [name, author, skillCount, lastUpdated] tuple.",
    );
    expect(errors).toContain("claude.plugins[1][2]: skillCount must be a non-negative integer.");
    expect(errors).toContain("claude.plugins[2][3]: lastUpdated must be a YYYY-MM-DD date string.");
  });

  it("rejects count drift between the counts block and the document body", () => {
    const doc = clone(inventoryData) as MutableDocument;
    doc.claude.connectors.connected.push("Phantom Connector");
    const errors = validateCapabilityCaptureDocument(doc);
    expect(errors).toEqual([
      "counts.claudeConnectedConnectors: declares 32 but the document contains 33 connected Claude connectors.",
    ]);
  });

  it("rejects removed capture sections instead of skipping them", () => {
    const doc = clone(inventoryData) as Record<string, unknown>;
    delete doc.claude;
    delete doc.counts;
    const errors = validateCapabilityCaptureDocument(doc);
    expect(errors).toContain("claude: must be an object.");
    expect(errors).toContain("counts: must be an object.");
  });

  it("rejects an additions policy that weakens the activation and inspection stance", () => {
    const doc = clone(additionData) as MutableAdditions;
    doc.policy.autoActivationAllowed = true;
    doc.policy.thirdPartyCodeExecutionAllowed = true;
    doc.policy.maxActivePluginsPerTask = 10;
    const errors = validateCapabilityAdditionsDocument(doc);
    expect(errors).toContain("policy.autoActivationAllowed: must be exactly false.");
    expect(errors).toContain("policy.thirdPartyCodeExecutionAllowed: must be exactly false.");
    expect(errors).toContain("policy.maxActivePluginsPerTask: must be an integer between 1 and 3.");
  });

  it("rejects additions count drift for every derived count", () => {
    const doc = clone(additionData) as MutableAdditions;
    doc.plugins.push(["Phantom", "Nobody", 7, "2026-07-21"]);
    const errors = validateCapabilityAdditionsDocument(doc);
    expect(errors).toContain("counts.plugins: declares 110 but the document contains 111 captured plugins.");
    expect(errors).toContain("counts.skills: declares 1243 but the document contains 1250 captured skills.");
    expect(errors).toContain(
      "counts.updated20260721: declares 24 but the document contains 25 plugins updated on 2026-07-21.",
    );
  });

  it("cross-checks author-derived counts so authorship claims cannot silently drift", () => {
    const doc = clone(additionData) as MutableAdditions;
    const firstAlireza = doc.plugins.findIndex(
      (tuple) => Array.isArray(tuple) && tuple[1] === "Alireza Rezvani",
    );
    expect(firstAlireza).toBeGreaterThanOrEqual(0);
    (doc.plugins[firstAlireza] as unknown[])[1] = "Anthropic";
    const errors = validateCapabilityAdditionsDocument(doc);
    expect(errors).toContain(
      "counts.officialAnthropic: declares 10 but the document contains 11 Anthropic-authored plugins.",
    );
    expect(errors).toContain(
      "counts.thirdPartyAlirezaRezvani: declares 60 but the document contains 59 Alireza Rezvani plugins.",
    );
  });
});
