import inventoryData from "../../../../../data/nova/ai-capability-inventory-2026-07-21.json";

export type CapabilityInventorySurface = "CLAUDE_PLUGIN" | "CLAUDE_CONNECTOR" | "CLAUDE_SKILL" | "CHATGPT_APP" | "CHATGPT_SKILL";
export type CapabilityConnectionState = "USER_REPORTED_CONNECTED" | "RECONNECT_REQUIRED" | "NOT_CONNECTED" | "RUNTIME_VISIBLE";

export interface CapabilityInventoryEntry {
  readonly id: string;
  readonly name: string;
  readonly surface: CapabilityInventorySurface;
  readonly state: CapabilityConnectionState;
  readonly author?: string;
  readonly skillCount?: number;
  readonly lastUpdated?: string;
  readonly verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED" | "RUNTIME_VISIBLE_2026_07_21";
  readonly executionAuthority: false;
}

export interface CapabilityInventorySummary {
  readonly total: number;
  readonly claudePlugins: number;
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

export function getCapabilityInventory(): readonly CapabilityInventoryEntry[] {
  const entries: CapabilityInventoryEntry[] = [];

  for (const tuple of inventoryData.claude.plugins) {
    const [name, author, skillCount, lastUpdated] = tuple;
    entries.push({
      id: stableId("CLAUDE_PLUGIN", name),
      name,
      surface: "CLAUDE_PLUGIN",
      state: "USER_REPORTED_CONNECTED",
      author,
      skillCount,
      lastUpdated,
      verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
      executionAuthority: false,
    });
  }

  const addClaudeConnectors = (names: readonly string[], state: CapabilityConnectionState): void => {
    for (const name of names) {
      entries.push({
        id: stableId("CLAUDE_CONNECTOR", name),
        name,
        surface: "CLAUDE_CONNECTOR",
        state,
        verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
        executionAuthority: false,
      });
    }
  };
  addClaudeConnectors(inventoryData.claude.connectors.connected, "USER_REPORTED_CONNECTED");
  addClaudeConnectors(inventoryData.claude.connectors.reconnectRequired, "RECONNECT_REQUIRED");
  addClaudeConnectors(inventoryData.claude.connectors.notConnectedOrUnavailable, "NOT_CONNECTED");

  for (const name of inventoryData.claude.personalSkills) {
    entries.push({
      id: stableId("CLAUDE_SKILL", name),
      name,
      surface: "CLAUDE_SKILL",
      state: "USER_REPORTED_CONNECTED",
      verificationState: "CAPTURED_NOT_RUNTIME_VERIFIED",
      executionAuthority: false,
    });
  }

  for (const name of inventoryData.chatgpt.appsAndConnectors) {
    entries.push({
      id: stableId("CHATGPT_APP", name),
      name,
      surface: "CHATGPT_APP",
      state: "RUNTIME_VISIBLE",
      verificationState: "RUNTIME_VISIBLE_2026_07_21",
      executionAuthority: false,
    });
  }
  for (const names of Object.values(inventoryData.chatgpt.installedSkillPacks)) {
    for (const name of names) {
      entries.push({
        id: stableId("CHATGPT_SKILL", name),
        name,
        surface: "CHATGPT_SKILL",
        state: "RUNTIME_VISIBLE",
        verificationState: "RUNTIME_VISIBLE_2026_07_21",
        executionAuthority: false,
      });
    }
  }

  return entries;
}

export function summarizeCapabilityInventory(
  entries: readonly CapabilityInventoryEntry[] = getCapabilityInventory(),
): CapabilityInventorySummary {
  const count = (surface: CapabilityInventorySurface): number => entries.filter((entry) => entry.surface === surface).length;
  return {
    total: entries.length,
    claudePlugins: count("CLAUDE_PLUGIN"),
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
  for (const entry of entries) {
    if (!entry.name.trim()) errors.push(`${entry.id} has no name.`);
    if (ids.has(entry.id)) errors.push(`Duplicate capability id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.executionAuthority !== false) errors.push(`${entry.id} cannot grant execution authority.`);
    if (entry.surface === "CLAUDE_PLUGIN" && (!entry.lastUpdated || entry.skillCount === undefined)) {
      errors.push(`${entry.id} is missing the captured plugin metadata.`);
    }
  }

  const summary = summarizeCapabilityInventory(entries);
  if (summary.claudePlugins !== inventoryData.counts.claudePlugins) errors.push("Claude plugin count drifted from captured inventory.");
  if (summary.claudeConnectors !== inventoryData.counts.claudeConnectedConnectors + inventoryData.counts.claudeReconnectRequired + inventoryData.counts.claudeNotConnectedOrUnavailable) {
    errors.push("Claude connector count drifted from captured inventory.");
  }
  if (summary.claudeSkills !== inventoryData.counts.claudePersonalSkills) errors.push("Claude skill count drifted from captured inventory.");
  if (summary.chatgptApps !== inventoryData.counts.chatgptAppsAndConnectors) errors.push("ChatGPT app count drifted from runtime capture.");
  if (summary.chatgptSkills !== inventoryData.counts.chatgptInstalledSkills) errors.push("ChatGPT skill count drifted from runtime capture.");
  return errors;
}

export function findCapabilitiesByName(query: string): readonly CapabilityInventoryEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return getCapabilityInventory().filter((entry) => entry.name.toLowerCase().includes(needle));
}
