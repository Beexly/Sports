import { describe, it, expect } from "vitest";
import {
  AGENT_COUNCIL,
  getAgentCouncil,
  getCouncilMember,
  getCouncilByStatus,
  getCapabilityOwner,
  getCouncilSeatCounts,
  getOwnedCapabilities,
  GUARDRAILS,
  DEPARTMENT_HEADS,
  getDepartmentHeads,
  getDepartmentHead,
  isDepartmentHead,
  getReportingChain,
  getDirectReports,
  type CouncilSeatStatus,
  type AgentSeat,
} from "@/lib/jarvis/agent-council";
import {
  CAPABILITY_REGISTRY,
  getCapability,
} from "@/lib/jarvis/capability-registry";
import { AGENTS } from "@/lib/cockpit/agents";
import { ROUTING_RULES, routeForTaskType } from "@/lib/jarvis/routing-rules";
import { buildLedgerStatus } from "@/lib/jarvis/ledger-types";

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

  it("registered cockpit agents are DRAFT_ONLY; unregistered seats may be MANUAL, NOT_WIRED, or DRAFT_ONLY (partial wire)", () => {
    for (const m of AGENT_COUNCIL) {
      if (m.isRegisteredCockpitAgent) {
        expect(m.status, `${m.id} registered seat`).toBe("DRAFT_ONLY");
      } else {
        expect(["MANUAL", "NOT_WIRED", "DRAFT_ONLY"]).toContain(m.status);
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

// ─── Spec §12 acceptance criteria ────────────────────────────────────────────

describe("spec §12 acceptance criteria", () => {
  it("AC1: all 23 seats registered", () => {
    expect(AGENT_COUNCIL.length).toBe(23);
  });

  it("AC2-3: exact status counts 7 draft_only / 3 manual / 13 not_wired (DELTA partial wire)", () => {
    const counts = getCouncilSeatCounts();
    expect(counts.draftOnly).toBe(7);
    expect(counts.manual).toBe(3);
    expect(counts.notWired).toBe(13);
  });

  it("AC5-9: every seat has department, reportsTo, escalatesTo, authorityTier, externalActionsAllowed=false", () => {
    for (const seat of AGENT_COUNCIL as readonly AgentSeat[]) {
      expect(seat.department, `${seat.id} department`).toBeTruthy();
      expect(seat.reportsTo.length, `${seat.id} reportsTo`).toBeGreaterThan(0);
      expect(seat.escalatesTo.length, `${seat.id} escalatesTo`).toBeGreaterThan(0);
      expect(typeof seat.authorityTier, `${seat.id} tier`).toBe("number");
      expect(seat.externalActionsAllowed, `${seat.id} externalActionsAllowed`).toBe(false);
    }
  });

  it("AC10: ASCEND is standing subagent under PRISM with AUDIT review", () => {
    const ascend = AGENT_COUNCIL.find((s) => s.codename === "ASCEND") as AgentSeat | undefined;
    expect(ascend).toBeDefined();
    expect(ascend!.standingSubagent).toBe(true);
    expect(ascend!.reportsTo).toContain("PRISM");
    expect(ascend!.reviewedBy).toContain("AUDIT");
    const prism = AGENT_COUNCIL.find((s) => s.codename === "PRISM") as AgentSeat | undefined;
    expect(prism!.subagentTemplates?.some((t) => t.parentSeatId === prism!.id)).toBe(true);
  });

  it("AC11: AUDIT independent — not reporting to or reviewed by SCOUT/DELTA/PRISM/ASCEND", () => {
    const audit = AGENT_COUNCIL.find((s) => s.codename === "AUDIT") as AgentSeat | undefined;
    const forbidden = ["SCOUT", "DELTA", "PRISM", "ASCEND"];
    for (const f of forbidden) {
      expect(audit!.reportsTo, `AUDIT reportsTo ${f}`).not.toContain(f);
      expect(audit!.reviewedBy ?? [], `AUDIT reviewedBy ${f}`).not.toContain(f);
    }
  });

  it("AC17: routing rules exist for all 13 spec routes and end at JARVIS or Owner", () => {
    const TASK_TYPES = [
      "pick-research",
      "settlement",
      "public-content",
      "customer-dashboard",
      "data-incident",
      "memory-decision",
      "tool-browser",
      "workflow-automation",
      "marketing",
      "community-launch",
      "revenue-pricing",
      "forecasting",
      "stat-rd",
    ];
    expect(ROUTING_RULES.length).toBe(13);
    for (const type of TASK_TYPES) {
      const rule = routeForTaskType(type as Parameters<typeof routeForTaskType>[0]);
      expect(rule, `route for ${type}`).toBeDefined();
      expect(["JARVIS", "Owner"]).toContain(rule!.endsAt);
    }
  });

  it("AC20: ledger posture is not_connected, nothing simulated", () => {
    const status = buildLedgerStatus();
    expect(status.handoffLedger).toBe("not_connected");
    expect(status.subagentRunLedger).toBe("not_connected");
    expect(status.storeAvailable).toBe(false);
  });

  it("guardrails list present with at least 8 entries", () => {
    expect(GUARDRAILS.length).toBeGreaterThanOrEqual(8);
    expect(GUARDRAILS.every((g) => g.length > 0)).toBe(true);
  });
});

// ─── Department-head reporting hierarchy ──────────────────────────────────────

describe("department head reporting hierarchy", () => {
  it("every department has exactly one head, resolving to a seat in that department", () => {
    const departments = new Set(AGENT_COUNCIL.map((s) => s.department));
    for (const dept of departments) {
      expect(DEPARTMENT_HEADS[dept], `department '${dept}' has no head`).toBeTruthy();
    }
    for (const [dept, codename] of Object.entries(DEPARTMENT_HEADS)) {
      const head = getDepartmentHead(dept);
      expect(head, `head ${codename} missing`).toBeDefined();
      expect(head!.codename).toBe(codename);
      expect(head!.department, `${codename} not in ${dept}`).toBe(dept);
    }
    expect(getDepartmentHeads().length).toBe(departments.size);
  });

  it("every department head reports to JARVIS (JARVIS itself reports to the Owner)", () => {
    for (const head of getDepartmentHeads()) {
      if (head.codename === "JARVIS") {
        expect(head.reportsTo).toContain("Owner");
      } else {
        expect(head.reportsTo, `${head.codename} must report to JARVIS`).toContain("JARVIS");
      }
    }
  });

  it("every non-head seat reports to a seat inside its own department", () => {
    for (const seat of AGENT_COUNCIL) {
      if (isDepartmentHead(seat)) continue;
      const manager = AGENT_COUNCIL.find((s) => s.codename === seat.reportsTo[0]);
      expect(manager, `${seat.codename} reports to unknown ${seat.reportsTo[0]}`).toBeDefined();
      expect(manager!.department, `${seat.codename} reports outside its department`).toBe(
        seat.department,
      );
    }
  });

  it("every seat's reporting chain terminates at the Owner", () => {
    for (const seat of AGENT_COUNCIL) {
      const chain = getReportingChain(seat.id);
      expect(chain[chain.length - 1], `${seat.codename}: ${chain.join("→")}`).toBe("Owner");
    }
  });

  it("every non-head chain passes through its department head before reaching the Owner", () => {
    for (const seat of AGENT_COUNCIL) {
      if (isDepartmentHead(seat)) continue;
      const head = DEPARTMENT_HEADS[seat.department]!;
      const chain = getReportingChain(seat.id);
      expect(chain, `${seat.codename} chain ${chain.join("→")} skips head ${head}`).toContain(head);
    }
  });

  it("JARVIS is the direct manager of every department head except itself", () => {
    const reports = getDirectReports("JARVIS").map((s) => s.codename);
    for (const head of getDepartmentHeads()) {
      if (head.codename === "JARVIS") continue;
      expect(reports, `${head.codename} not a direct report of JARVIS`).toContain(head.codename);
    }
  });

  it("AUDIT independence is preserved under the hierarchy (AC11 still holds)", () => {
    const audit = getDepartmentHead("Results & Calibration")!;
    for (const f of ["SCOUT", "DELTA", "PRISM", "ASCEND"]) {
      expect(audit.reportsTo).not.toContain(f);
      expect(audit.reviewedBy ?? []).not.toContain(f);
    }
  });
});
