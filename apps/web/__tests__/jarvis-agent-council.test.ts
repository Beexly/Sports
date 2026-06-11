import { describe, it, expect } from "vitest";
import {
  AGENT_COUNCIL,
  getAgentCouncil,
  getCouncilMember,
  getCouncilByStatus,
  getCapabilityOwner,
  getCouncilSeatCounts,
  getOwnedCapabilities,
  type CouncilSeatStatus,
} from "@/lib/jarvis/agent-council";
import {
  CAPABILITY_REGISTRY,
  getCapability,
} from "@/lib/jarvis/capability-registry";
import { AGENTS } from "@/lib/cockpit/agents";

/**
 * Agent council contract.
 *
 * The council is the governance roster: 15 seats, each owning at least one
 * capability-registry entry. These tests pin the cross-registry integrity
 * (every capability has exactly one owner) and the trust rules (no seat is
 * autonomous, no seat takes external actions).
 */

const VALID_STATUSES: ReadonlySet<CouncilSeatStatus> = new Set([
  "DRAFT_ONLY",
  "MANUAL",
  "NOT_WIRED",
]);

describe("council structure", () => {
  it("seats exactly 23 members", () => {
    expect(AGENT_COUNCIL.length).toBe(23);
  });

  it("has globally unique ids and codenames", () => {
    const ids = AGENT_COUNCIL.map((m) => m.id);
    const codenames = AGENT_COUNCIL.map((m) => m.codename);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(codenames).size).toBe(codenames.length);
  });

  it("every seat carries a charter, current truth, and forbidden actions", () => {
    for (const m of AGENT_COUNCIL) {
      expect(m.charter.length, `${m.id} charter`).toBeGreaterThan(0);
      expect(m.currentTruth.length, `${m.id} currentTruth`).toBeGreaterThan(0);
      expect(m.safeActions.length, `${m.id} safeActions`).toBeGreaterThan(0);
      expect(m.forbiddenActions.length, `${m.id} forbiddenActions`).toBeGreaterThan(0);
    }
  });
});

describe("council trust rules", () => {
  it("no seat claims a status outside DRAFT_ONLY / MANUAL / NOT_WIRED", () => {
    for (const m of AGENT_COUNCIL) {
      expect(VALID_STATUSES.has(m.status), `${m.id} status ${m.status}`).toBe(true);
    }
  });

  it("every seat forbids external actions (externalActions is NONE)", () => {
    for (const m of AGENT_COUNCIL) {
      expect(m.externalActions).toBe("NONE");
    }
  });

  it("registered cockpit agents are DRAFT_ONLY; unregistered seats are MANUAL or NOT_WIRED", () => {
    for (const m of AGENT_COUNCIL) {
      if (m.isRegisteredCockpitAgent) {
        expect(m.status, `${m.id} registered seat`).toBe("DRAFT_ONLY");
      } else {
        expect(["MANUAL", "NOT_WIRED"]).toContain(m.status);
      }
    }
  });

  it("registered seats match the cockpit agent registry exactly", () => {
    const registered = AGENT_COUNCIL.filter((m) => m.isRegisteredCockpitAgent).map(
      (m) => m.codename
    );
    const cockpitKeys = Object.keys(AGENTS);
    expect(registered.sort()).toEqual(cockpitKeys.sort());
  });
});

describe("council ↔ capability registry integrity", () => {
  it("every ownsCapabilities id resolves in the capability registry", () => {
    for (const m of AGENT_COUNCIL) {
      for (const capId of m.ownsCapabilities) {
        expect(getCapability(capId), `${m.id} owns unknown capability ${capId}`).toBeDefined();
      }
    }
  });

  it("every capability has exactly one owning seat", () => {
    const ownership = new Map<string, string[]>();
    for (const m of AGENT_COUNCIL) {
      for (const capId of m.ownsCapabilities) {
        ownership.set(capId, [...(ownership.get(capId) ?? []), m.id]);
      }
    }
    for (const c of CAPABILITY_REGISTRY) {
      const owners = ownership.get(c.id) ?? [];
      expect(owners.length, `${c.id} owners: ${owners.join(", ") || "none"}`).toBe(1);
    }
  });

  it("getOwnedCapabilities resolves to full registry entries", () => {
    for (const m of AGENT_COUNCIL) {
      const owned = getOwnedCapabilities(m);
      expect(owned.length).toBe(m.ownsCapabilities.length);
    }
  });

  it("getCapabilityOwner finds the owning seat for every capability", () => {
    for (const c of CAPABILITY_REGISTRY) {
      expect(getCapabilityOwner(c.id), `${c.id} has no owner`).toBeDefined();
    }
  });
});

describe("council accessors", () => {
  it("getAgentCouncil returns the full roster", () => {
    expect(getAgentCouncil()).toBe(AGENT_COUNCIL);
  });

  it("getCouncilMember resolves known ids and rejects unknown ones", () => {
    expect(getCouncilMember("jarvis")?.codename).toBe("JARVIS");
    expect(getCouncilMember("nope")).toBeUndefined();
  });

  it("getCouncilByStatus partitions the roster completely", () => {
    const total = Array.from(VALID_STATUSES).reduce(
      (sum, s) => sum + getCouncilByStatus(s).length,
      0
    );
    expect(total).toBe(AGENT_COUNCIL.length);
  });

  it("seat counts add up and report 6 registered cockpit agents", () => {
    const counts = getCouncilSeatCounts();
    expect(counts.total).toBe(23);
    expect(counts.draftOnly + counts.manual + counts.notWired).toBe(counts.total);
    expect(counts.registeredCockpitAgents).toBe(6);
  });
});
