import { describe, expect, it } from "vitest";
import {
  auditHops,
  classifyIncident,
  MECHANISM_SIGNATURES,
  type IncidentReport,
} from "./failure-atlas-2607.js";

function incident(over: Partial<IncidentReport> = {}): IncidentReport {
  return {
    hop: "omniroute/route-7",
    mechanism: "shared-state-turn-loss",
    persistence: "persistent",
    origin: "client-side",
    observedAt: "2026-09-20T10:00:00Z",
    ...over,
  };
}

describe("failure atlas", () => {
  it("classifies the three released reproduction mechanisms", () => {
    const a = classifyIncident(incident({ mechanism: "shared-state-turn-loss" }));
    expect(a?.cell.mechanism).toBe("shared-state-turn-loss");
    expect(a?.signatureMatch).toBe(true);

    const b = classifyIncident(
      incident({
        hop: "odds-polling",
        mechanism: "synchronized-retry-saturation",
        persistence: "transient",
        origin: "client-side",
      }),
    );
    expect(b?.cell.mechanism).toBe("synchronized-retry-saturation");
    expect(b?.signatureMatch).toBe(true);

    const c = classifyIncident(
      incident({
        hop: "agent-bus",
        mechanism: "index-zero-emission",
        persistence: "persistent",
        origin: "provider-side",
      }),
    );
    expect(c?.cell.mechanism).toBe("index-zero-emission");
    expect(c?.signatureMatch).toBe(true);
  });

  it("flags signature mismatches without dropping the classification", () => {
    // synchronized-retry-saturation is canonically transient/client-side
    const c = classifyIncident(
      incident({
        mechanism: "synchronized-retry-saturation",
        persistence: "persistent",
        origin: "provider-side",
      }),
    );
    expect(c).not.toBeNull();
    expect(c?.signatureMatch).toBe(false);
  });

  it("audits every hop and reports clean when nothing is forced", () => {
    const report = auditHops([
      incident({ hop: "omniroute/route-7" }),
      incident({
        hop: "odds-polling",
        mechanism: "credential-quota-exhaustion",
        persistence: "transient",
        origin: "provider-side",
      }),
      incident({
        hop: "agent-bus",
        mechanism: "schema-contract-drift",
        persistence: "persistent",
        origin: "provider-side",
      }),
    ]);
    expect(report.totalIncidents).toBe(3);
    expect(report.classified).toBe(3);
    expect(report.unclassified).toBe(0);
    expect(report.clean).toBe(true);
    expect(report.hops.map((h) => h.hop)).toEqual([
      "agent-bus",
      "odds-polling",
      "omniroute/route-7",
    ]);
  });

  it("never forces an unknown mechanism into a cell", () => {
    const report = auditHops([
      incident({ hop: "odds-polling" }),
      incident({ hop: "odds-polling", mechanism: "mystery-gremlin-event" }),
    ]);
    expect(report.classified).toBe(1);
    expect(report.unclassified).toBe(1);
    expect(report.clean).toBe(false);
  });

  it("handles empty input", () => {
    const report = auditHops([]);
    expect(report.hops).toEqual([]);
    expect(report.totalIncidents).toBe(0);
    expect(report.clean).toBe(true);
  });

  it("handles malformed input without crashing", () => {
    expect(classifyIncident(incident({ hop: "" }))).toBeNull();
    expect(
      classifyIncident(incident({ persistence: "sometimes" })),
    ).toBeNull();
    expect(classifyIncident(incident({ origin: "the-cloud" }))).toBeNull();
    expect(classifyIncident(null as unknown as IncidentReport)).toBeNull();
    const report = auditHops([
      incident({ hop: "" }),
      null as unknown as IncidentReport,
    ]);
    expect(report.totalIncidents).toBe(2);
    expect(report.unclassified).toBe(2);
    expect(report.clean).toBe(false);
  });

  it("exposes all five mechanism families", () => {
    expect(Object.keys(MECHANISM_SIGNATURES).sort()).toEqual([
      "credential-quota-exhaustion",
      "index-zero-emission",
      "schema-contract-drift",
      "shared-state-turn-loss",
      "synchronized-retry-saturation",
    ]);
  });
});
