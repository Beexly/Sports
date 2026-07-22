import inventoryData from "../../../../data/nova/ai-capability-inventory-2026-07-21.json";
import additionData from "../../../../data/nova/ai-capability-inventory-additions-2026-07-21.json";
import {
  computeCapabilityProvenanceHash,
  isWellFormedCapabilityProvenanceHash,
  type CapabilityProvenanceSourceDocument,
} from "./capability-provenance";

export type CapabilityInventorySurface =
  | "CLAUDE_PLUGIN"
  | "CLAUDE_CONNECTOR"
  | "CLAUDE_SKILL"
  | "CHATGPT_APP"
  | "CHATGPT_SKILL";
export type CapabilityConnectionState =
  | "USER_REPORTED_CONNECTED"
  | "RECONNECT_REQUIRED"
  | "NOT_CONNECTED"
  | "RUNTIME_VISIBLE";
export type CapabilityCaptureBatch =
  | "INITIAL_USER_CAPTURE"
  | "ADDITIONAL_USER_CAPTURE"
  | "CHATGPT_RUNTIME_CAPTURE";

type CapturedPluginTuple = readonly [
  name: string,
  author: string,
  skillCount: number,
  lastUpdated: string,
];

const INITIAL_CLAUDE_PLUGINS = inventoryData.claude.plugins as unknown as readonly CapturedPluginTuple[];
const ADDITIONAL_CLAUDE_PLUGINS = additionData.plugins as unknown as readonly CapturedPluginTuple[];

/** Capture-document identities used as provenance-hash source material. */
const INITIAL_CAPTURE_DOCUMENT: CapabilityProvenanceSourceDocument = {
  schemaVersion: inventoryData.schemaVersion,
  capturedAt: inventoryData.capturedAt,
};
const ADDITIONAL_CAPTURE_DOCUMENT: CapabilityProvenanceSourceDocument = {
  schemaVersion: additionData.schemaVersion,
  capturedAt: additionData.capturedAt,
};

export interface CapabilityInventoryEntry {
  readonly id: string;
  readonly name: string;
  readonly surface: CapabilityInventorySurface;
  readonly state: CapabilityConnectionState;
  readonly captureBatch: CapabilityCaptureBatch;
  readonly author?: string;
  readonly skillCount?: number;
  readonly lastUpdated?: string;
  readonly verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED" | "RUNTIME_VISIBLE_2026_07_21";
  /**
   * Deterministic hash of this record's exact captured source material
   * (capability-provenance.ts). Governance records pin this value; a
   * mismatch means the capture drifted and the governor fails closed.
   */
  readonly provenanceHash: string;
  readonly executionAuthority: false;
}

type CapabilityInventoryEntrySeed = Omit<CapabilityInventoryEntry, "provenanceHash">;

function captureDocumentFor(
  captureBatch: CapabilityCaptureBatch,
): CapabilityProvenanceSourceDocument {
  return captureBatch === "ADDITIONAL_USER_CAPTURE"
    ? ADDITIONAL_CAPTURE_DOCUMENT
    : INITIAL_CAPTURE_DOCUMENT;
}

/** Seals a captured record with the provenance hash of its source material. */
function sealEntry(seed: CapabilityInventoryEntrySeed): CapabilityInventoryEntry {
  return {
    ...seed,
    provenanceHash: computeCapabilityProvenanceHash(seed, captureDocumentFor(seed.captureBatch)),
  };
}

export interface CapabilityInventorySummary {
  readonly total: number;
  readonly claudePlugins: number;
  readonly claudePluginSkills: number;
  readonly additionalClaudePlugins: number;
  readonly largeClaudePluginBundles: number;
  readonly claudeConnectors: number;
  readonly claudeSkills: number;
  readonly chatgptApps: number;
  readonly chatgptSkills: number;
  readonly reconnectRequired: number;
  readonly runtimeVisible: number;
}

function stableId(surface: CapabilityInventorySurface, name: string): string {
  return `${surface.toLowerCase()}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function addClaudePlugin(
  entries: CapabilityInventoryEntry[],
  tuple: CapturedPluginTuple,
  captureBatch: Extract<CapabilityCaptureBatch, "INITIAL_USER_CAPTURE" | "ADDITIONAL_USER_CAPTURE">,
): void {
  const [name, author, skillCount, lastUpdated] = tuple;
  entries.push(
    sealEntry({
      id: stableId("CLAUDE_PLUGIN", name),
      name,
      surface: "CLAUDE_PLUGIN",
      state: "USER_REPORTED_CONNECTED",
      captureBatch,
      author,
      skillCount,
      lastUpdated,
      verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
      executionAuthority: false,
    }),
  );
}

export function getCapabilityInventory(): readonly CapabilityInventoryEntry[] {
  const entries: CapabilityInventoryEntry[] = [];

  for (const tuple of INITIAL_CLAUDE_PLUGINS) {
    addClaudePlugin(entries, tuple, "INITIAL_USER_CAPTURE");
  }
  for (const tuple of ADDITIONAL_CLAUDE_PLUGINS) {
    addClaudePlugin(entries, tuple, "ADDITIONAL_USER_CAPTURE");
  }

  const addClaudeConnectors = (names: readonly string[], state: CapabilityConnectionState): void => {
    for (const name of names) {
      entries.push(
        sealEntry({
          id: stableId("CLAUDE_CONNECTOR", name),
          name,
          surface: "CLAUDE_CONNECTOR",
          state,
          captureBatch: "INITIAL_USER_CAPTURE",
          verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
          executionAuthority: false,
        }),
      );
    }
  };
  addClaudeConnectors(inventoryData.claude.connectors.connected, "USER_REPORTED_CONNECTED");
  addClaudeConnectors(inventoryData.claude.connectors.reconnectRequired, "RECONNECT_REQUIRED");
  addClaudeConnectors(inventoryData.claude.connectors.notConnectedOrUnavailable, "NOT_CONNECTED");

  for (const name of inventoryData.claude.personalSkills) {
    entries.push(
      sealEntry({
        id: stableId("CLAUDE_SKILL", name),
        name,
        surface: "CLAUDE_SKILL",
        state: "USER_REPORTED_CONNECTED",
        captureBatch: "INITIAL_USER_CAPTURE",
        verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
        executionAuthority: false,
      }),
    );
  }

  for (const name of inventoryData.chatgpt.appsAndConnectors) {
    entries.push(
      sealEntry({
        id: stableId("CHATGPT_APP", name),
        name,
        surface: "CHATGPT_APP",
        state: "RUNTIME_VISIBLE",
        captureBatch: "CHATGPT_RUNTIME_CAPTURE",
        verificationState: "RUNTIME_VISIBLE_2026_07_21",
        executionAuthority: false,
      }),
    );
  }
  for (const names of Object.values(inventoryData.chatgpt.installedSkillPacks)) {
    for (const name of names) {
      entries.push(
        sealEntry({
          id: stableId("CHATGPT_SKILL", name),
          name,
          surface: "CHATGPT_SKILL",
          state: "RUNTIME_VISIBLE",
          captureBatch: "CHATGPT_RUNTIME_CAPTURE",
          verificationState: "RUNTIME_VISIBLE_2026_07_21",
          executionAuthority: false,
        }),
      );
    }
  }

  return entries;
}

export function summarizeCapabilityInventory(
  entries: readonly CapabilityInventoryEntry[] = getCapabilityInventory(),
): CapabilityInventorySummary {
  const count = (surface: CapabilityInventorySurface): number =>
    entries.filter((entry) => entry.surface === surface).length;
  const claudePlugins = entries.filter((entry) => entry.surface === "CLAUDE_PLUGIN");
  return {
    total: entries.length,
    claudePlugins: claudePlugins.length,
    claudePluginSkills: claudePlugins.reduce((total, entry) => total + (entry.skillCount ?? 0), 0),
    additionalClaudePlugins: claudePlugins.filter(
      (entry) => entry.captureBatch === "ADDITIONAL_USER_CAPTURE",
    ).length,
    largeClaudePluginBundles: claudePlugins.filter((entry) => (entry.skillCount ?? 0) >= 50).length,
    claudeConnectors: count("CLAUDE_CONNECTOR"),
    claudeSkills: count("CLAUDE_SKILL"),
    chatgptApps: count("CHATGPT_APP"),
    chatgptSkills: count("CHATGPT_SKILL"),
    reconnectRequired: entries.filter((entry) => entry.state === "RECONNECT_REQUIRED").length,
    runtimeVisible: entries.filter((entry) => entry.state === "RUNTIME_VISIBLE").length,
  };
}

export function validateCapabilityInventory(
  entries: readonly CapabilityInventoryEntry[] = getCapabilityInventory(),
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const provenanceHashes = new Set<string>();
  for (const entry of entries) {
    if (!entry.name.trim()) errors.push(`${entry.id} has no name.`);
    if (ids.has(entry.id)) errors.push(`Duplicate capability id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.executionAuthority !== false) errors.push(`${entry.id} cannot grant execution authority.`);
    if (entry.surface === "CLAUDE_PLUGIN" && (!entry.lastUpdated || entry.skillCount === undefined)) {
      errors.push(`${entry.id} is missing the captured plugin metadata.`);
    }
    if (!isWellFormedCapabilityProvenanceHash(entry.provenanceHash)) {
      errors.push(`${entry.id} has a malformed provenance hash.`);
    } else {
      const expectedHash = computeCapabilityProvenanceHash(
        entry,
        captureDocumentFor(entry.captureBatch),
      );
      if (entry.provenanceHash !== expectedHash) {
        errors.push(`${entry.id} provenance hash does not match its captured source material.`);
      }
      if (provenanceHashes.has(entry.provenanceHash)) {
        errors.push(`${entry.id} provenance hash collides with another capability record.`);
      }
      provenanceHashes.add(entry.provenanceHash);
    }
  }

  const summary = summarizeCapabilityInventory(entries);
  const expectedClaudePlugins = inventoryData.counts.claudePlugins + additionData.counts.plugins;
  if (summary.claudePlugins !== expectedClaudePlugins) {
    errors.push("Claude plugin count drifted from captured inventory.");
  }
  if (summary.additionalClaudePlugins !== additionData.counts.plugins) {
    errors.push("Additional Claude plugin count drifted from the latest capture.");
  }
  if (
    summary.claudeConnectors !==
    inventoryData.counts.claudeConnectedConnectors +
      inventoryData.counts.claudeReconnectRequired +
      inventoryData.counts.claudeNotConnectedOrUnavailable
  ) {
    errors.push("Claude connector count drifted from captured inventory.");
  }
  if (summary.claudeSkills !== inventoryData.counts.claudePersonalSkills) {
    errors.push("Claude skill count drifted from captured inventory.");
  }
  if (summary.chatgptApps !== inventoryData.counts.chatgptAppsAndConnectors) {
    errors.push("ChatGPT app count drifted from runtime capture.");
  }
  if (summary.chatgptSkills !== inventoryData.counts.chatgptInstalledSkills) {
    errors.push("ChatGPT skill count drifted from runtime capture.");
  }
  return errors;
}

export function findCapabilitiesByName(query: string): readonly CapabilityInventoryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return getCapabilityInventory().filter((entry) => entry.name.toLowerCase().includes(needle));
}

export function getAdditionalClaudePlugins(): readonly CapabilityInventoryEntry[] {
  return getCapabilityInventory().filter(
    (entry) => entry.surface === "CLAUDE_PLUGIN" && entry.captureBatch === "ADDITIONAL_USER_CAPTURE",
  );
}
