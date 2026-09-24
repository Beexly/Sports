import { describe, expect, it } from "vitest";
import { buildDriveTemporalGraphs, GSE_DRIVE_GRAPH_MODEL_ENABLED } from "./drive-temporal-graph-2308.js";

const plays = [
  { playId: "p1", driveId: "d1", down: 1, distance: 10, yardline: 25, playType: "rush" as const, epa: 0.2 },
  { playId: "p2", driveId: "d1", down: 2, distance: 8, yardline: 27, playType: "pass" as const, epa: 0.5 },
  { playId: "p3", driveId: "d2", down: 1, distance: 10, yardline: 20, playType: "pass" as const, epa: -0.1 },
];

describe("drive temporal graph encoding", () => {
  it("links consecutive plays within a drive and adds a cross-drive edge", () => {
    const [g1, g2] = buildDriveTemporalGraphs(plays);
    expect(g1?.nodes).toHaveLength(2);
    expect(g1?.edges.filter((e) => e.kind === "within_drive")).toHaveLength(1);
    expect(g1?.edges[0]).toMatchObject({ from: "p1", to: "p2" });
    expect(g2?.edges.some((e) => e.kind === "cross_drive" && e.from === "p2" && e.to === "p3")).toBe(true);
  });
  it("handles an empty play list", () => {
    expect(buildDriveTemporalGraphs([])).toEqual([]);
  });
  it("handles a single-play drive (no within-drive edges)", () => {
    const p3 = plays[2];
    expect(p3).toBeDefined();
    const [g] = buildDriveTemporalGraphs(p3 === undefined ? [] : [p3]);
    expect(g?.nodes).toHaveLength(1);
    expect(g?.edges).toHaveLength(0);
  });
  it("keeps the model lane off until the gate clears", () => {
    expect(GSE_DRIVE_GRAPH_MODEL_ENABLED).toBe(false);
  });
});

