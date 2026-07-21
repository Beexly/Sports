import { describe, expect, it } from "vitest";

import {
  getTracedRequirement,
  getTracedRequirements,
  summarizeRequirementsTraceability,
  validateRequirementsTraceability,
} from "@/lib/opportunity-engine/requirements-traceability";

describe("NOVA end-to-end requirements traceability", () => {
  it("accounts for every requirement in an implemented or coding-ready state", () => {
    const requirements = getTracedRequirements();
    expect(requirements).toHaveLength(22);
    expect(validateRequirementsTraceability(requirements)).toEqual([]);
    expect(summarizeRequirementsTraceability(requirements)).toEqual({
      total: 22,
      implemented: 14,
      partial: 4,
      ready: 4,
      ownerGated: 0,
      planned: 0,
      implementationCoverage: 14 / 22,
      codingReadyCoverage: 1,
    });
  });

  it("ties website integration, personal efficiency, source intake, plugins, revenue, credits, and the coding agent to concrete files", () => {
    const expected: Readonly<Record<string, string>> = {
      "REQ-001": "apps/web/app/cockpit/nova/founder/page.tsx",
      "REQ-003": "apps/web/lib/opportunity-engine/founder-work-seed.ts",
      "REQ-004": "apps/web/lib/opportunity-engine/founder-command.ts",
      "REQ-006": "apps/web/lib/opportunity-engine/personal-ai-income.ts",
      "REQ-008": "data/nova/user-supplied-source-intake.json",
      "REQ-009": "data/nova/ai-capability-inventory-additions-2026-07-21.json",
      "REQ-011": "apps/web/lib/opportunity-engine/capability-governor.ts",
      "REQ-013": "apps/web/lib/opportunity-engine/lifecycle.ts",
      "REQ-020": ".github/workflows/nova-verification.yml",
    };

    for (const [id, ref] of Object.entries(expected)) {
      expect(getTracedRequirement(id)?.codeRefs, id).toContain(ref);
    }
  });

  it("requires every traced item to state the next action rather than ending as a concept", () => {
    for (const requirement of getTracedRequirements()) {
      expect(requirement.next.length, requirement.id).toBeGreaterThan(20);
      expect(requirement.codeRefs.length, requirement.id).toBeGreaterThan(0);
    }
  });
});
