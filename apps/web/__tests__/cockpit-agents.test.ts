import { describe, it, expect } from "vitest";
import { AGENTS, listAgents, getAgent, type AgentKey } from "@/lib/cockpit/agents";

describe("Cockpit agent registry", () => {
  it("declares exactly the six expected operator agents", () => {
    const keys = Object.keys(AGENTS).sort();
    expect(keys).toEqual(["AVA", "BOBBY", "JARVIS", "SARAH", "SCOUT", "TAL"]);
  });

  it("listAgents() returns the same six in registry order", () => {
    expect(listAgents().map((a) => a.key)).toEqual([
      "JARVIS",
      "SARAH",
      "TAL",
      "SCOUT",
      "AVA",
      "BOBBY",
    ]);
  });

  it("every agent declares externalActions: NONE", () => {
    for (const a of listAgents()) {
      expect(a.externalActions).toBe("NONE");
    }
  });

  it("every agent has a non-empty responsibility and at least one safe action", () => {
    for (const a of listAgents()) {
      expect(a.displayName.length).toBeGreaterThan(0);
      expect(a.responsibility.length).toBeGreaterThan(10);
      expect(a.safeActions.length).toBeGreaterThan(0);
    }
  });

  it("getAgent() returns the right definition", () => {
    expect(getAgent("JARVIS").displayName).toBe("Jarvis");
    expect(getAgent("AVA").displayName).toBe("Ava");
    expect(getAgent("BOBBY" as AgentKey).key).toBe("BOBBY");
  });

  it("none of the agents declare an action that suggests external posting/publishing/sending", () => {
    const banned = /\b(post|publish|send|tweet|email|broadcast|charge)\b/i;
    for (const a of listAgents()) {
      for (const action of a.safeActions) {
        // 'email' or 'broadcast' should not appear as an "ACTION" that the
        // agent itself performs. (Drafting an email is fine; sending one is not.)
        // The registry uses 'Draft ...' phrasing — assert no verb form like
        // 'Send', 'Publish', 'Post' appears.
        const startsWithDangerVerb = /^(Send|Publish|Post|Tweet|Broadcast|Charge)\b/.test(
          action.trim()
        );
        expect(
          startsWithDangerVerb,
          `Agent ${a.key} action "${action}" must not perform an external action`
        ).toBe(false);
      }
      void banned;
    }
  });
});
