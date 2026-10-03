import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCodebaseTwin } from "../codebase-twin";
import { REPO_EVIDENCE } from "../repo-evidence";
import type { GenesisCapability } from "../contracts";

describe("Codebase Twin v0", () => {
  it("1. identical evidence produces an identical twinHash", () => {
    const a = buildCodebaseTwin(REPO_EVIDENCE);
    const b = buildCodebaseTwin(REPO_EVIDENCE);
    expect(a.twinHash).toBe(b.twinHash);
    expect(a.twinHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("2. capability state is derived from supplied evidence, never an optimistic default", () => {
    const noEvidence: GenesisCapability = {
      ...REPO_EVIDENCE[0]!,
      id: "unevidenced-capability",
      implementationState: "LIVE_PUBLIC", // declared optimistically...
      provenance: { evidence: [], verifiedAt: "2026-07-17T00:00:00.000Z" }, // ...but cites nothing
    };
    const twin = buildCodebaseTwin([noEvidence]);
    const row = twin.capabilities.find((c) => c.id === "unevidenced-capability")!;
    expect(row.declaredState).toBe("LIVE_PUBLIC");
    expect(row.effectiveState).toBe("UNKNOWN"); // forced fail-closed, the declaration is not proof
  });

  it("3. a STRANDED_BRANCH capability is non-executable for every audience", () => {
    const twin = buildCodebaseTwin(REPO_EVIDENCE);
    const stranded = twin.capabilities.find((c) => c.effectiveState === "STRANDED_BRANCH");
    expect(stranded).toBeDefined();
    expect(stranded!.id).toBe("agent-foundry-resource-radar-shadow-router");
  });

  it("4. the collision report reproduces the named verdicts, each with supporting evidence", () => {
    const twin = buildCodebaseTwin(REPO_EVIDENCE);
    const ids = twin.collisions.map((c) => c.collisionId);
    expect(ids).toEqual(
      expect.arrayContaining(["routing-decision-overlap", "duplicate-source-rights-registry", "canonical-extension-point"]),
    );
    for (const c of twin.collisions) {
      expect(c.supportingEvidence.length).toBeGreaterThan(0);
      expect(c.safeDisposition.length).toBeGreaterThan(0);
    }
  });

  describe("5. secrets and environment values are never captured", () => {
    it("5a. repo-evidence.ts and codebase-twin.ts contain zero process.env references", () => {
      const evidenceSrc = readFileSync(resolve(__dirname, "../repo-evidence.ts"), "utf8");
      const twinSrc = readFileSync(resolve(__dirname, "../codebase-twin.ts"), "utf8");
      expect(evidenceSrc).not.toContain("process.env");
      expect(twinSrc).not.toContain("process.env");
    });

    it("5b. the serialized snapshot contains no live process.env value (length >= 8)", () => {
      const twin = buildCodebaseTwin(REPO_EVIDENCE);
      const serialized = JSON.stringify(twin);
      for (const value of Object.values(process.env)) {
        if (typeof value === "string" && value.length >= 8) {
          expect(serialized).not.toContain(value);
        }
      }
    });

    it("5c. no snapshot key resembles a secret/credential field", () => {
      const twin = buildCodebaseTwin(REPO_EVIDENCE);
      const serialized = JSON.stringify(twin);
      const parsed = JSON.parse(serialized) as unknown;
      const forbidden = /(secret|token|password|api[_-]?key|authorization|credential)/i;
      const walk = (value: unknown): void => {
        if (Array.isArray(value)) {
          value.forEach(walk);
          return;
        }
        if (value && typeof value === "object") {
          for (const [key, v] of Object.entries(value)) {
            expect(forbidden.test(key)).toBe(false);
            walk(v);
          }
        }
      };
      walk(parsed);
    });
  });
});
