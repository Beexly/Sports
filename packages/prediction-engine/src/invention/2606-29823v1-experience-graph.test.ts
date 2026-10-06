import { describe, expect, it } from "vitest";
import {
  ExperienceGraph,
  makeArtifact,
  makeAttempt,
  makeReflection,
  passesExperienceGate,
} from "./2606-29823v1-experience-graph";

const NIGHTS = [{ date: "2026-09-19" }, { date: "2026-09-20" }, { date: "2026-09-21" }];

describe("experience graph (Trellis)", () => {
  it("dedups addNode on idempotencyKey (crash-safety)", () => {
    const g = new ExperienceGraph();
    const a = makeAttempt("weather", "backtest-abc-123");
    const b = makeAttempt("weather", "backtest-abc-123");
    g.addNode(a);
    const returned = g.addNode(b);
    expect(returned.id).toBe(a.id);
    expect(g.nodeCount()).toBe(1);
  });

  it("frontier returns the newest attempt/artifact per lane before a time", () => {
    const g = new ExperienceGraph();
    g.addNode(makeAttempt("weather", "w1", {}, "2026-09-20T01:00:00Z"));
    g.addNode(makeAttempt("weather", "w2", {}, "2026-09-21T01:00:00Z"));
    g.addNode(makeAttempt("market", "m1", {}, "2026-09-20T02:00:00Z"));
    const frontier = g.frontier("2026-09-22T00:00:00Z");
    expect(frontier.length).toBe(2);
    const weather = frontier.find((n) => n.lane === "weather")!;
    expect(weather.idempotencyKey).toBe("w2"); // newest
    const market = frontier.find((n) => n.lane === "market")!;
    expect(market.idempotencyKey).toBe("m1");
  });

  it("crash recovery: pendingAttempts resume with zero duplicates", () => {
    const g = new ExperienceGraph();
    const a = makeAttempt("rest", "crash-1");
    const b = makeAttempt("rest", "crash-2");
    g.addNode(a);
    g.addNode(b);
    g.markDone(a.id);
    // Induced crash: resume pending attempts.
    const pending = g.pendingAttempts();
    expect(pending.length).toBe(1);
    expect(pending[0]!.idempotencyKey).toBe("crash-2");
    // Re-submitting is a no-op on idempotencyKey: zero duplicate backtests.
    g.addNode(makeAttempt("rest", "crash-2"));
    expect(g.nodeCount()).toBe(2);
  });

  it("export/import round-trips with full replay fidelity", () => {
    const g = new ExperienceGraph();
    const a = g.addNode(makeAttempt("injuries", "i1"));
    const art = g.addNode(makeArtifact("injuries", "i1-art", 0.7));
    g.addEdge({ from: art.id, to: a.id, kind: "derived_from" });
    const g2 = ExperienceGraph.importGraph(g.exportGraph());
    expect(g2.exportGraph()).toBe(g.exportGraph());
    expect(g2.nodeCount()).toBe(2);
  });

  it("edges reject unknown node references", () => {
    const g = new ExperienceGraph();
    expect(() =>
      g.addEdge({ from: "nope", to: "alsono", kind: "supersedes" }),
    ).toThrow();
  });

  it("mines sibling underperformers, dead lanes, recurring themes", () => {
    const g = new ExperienceGraph();
    // Lane weather: two old artifacts, one worse than its sibling, none
    // gate-passing recently -> dead lane.
    const weak = g.addNode(makeArtifact("weather", "w-art-1", 0.4, {}, "2026-09-18T01:00:00Z"));
    const strong = g.addNode(makeArtifact("weather", "w-art-2", 0.8, {}, "2026-09-18T02:00:00Z"));
    g.addEdge({ from: strong.id, to: weak.id, kind: "supersedes" });
    // Lane referees: one old artifact below gate -> dead lane.
    g.addNode(
      makeArtifact("referees", "r-art-1", 0.2, {}, "2026-09-18T01:00:00Z"),
    );
    // Lane injuries: recent gate passer -> not dead.
    g.addNode(
      makeArtifact("injuries", "j-art-1", 0.75, {}, "2026-09-21T01:00:00Z"),
    );
    // Three reflections on the same failure theme.
    for (let i = 0; i < 3; i++) {
      g.addNode(makeReflection("weather", "lookahead-bias", {}, `2026-09-2${i}T00:00:00Z`));
    }
    const report = g.mineExperiences(0.6, NIGHTS, 3);
    expect(report.siblingUnderperformers).toContain(weak.id);
    expect(report.siblingUnderperformers).not.toContain(strong.id);
    expect(report.deadLanes).toContain("referees");
    expect(report.deadLanes).toContain("weather"); // nothing above 0.6
    expect(report.deadLanes).not.toContain("injuries");
    expect(report.recurringFailureThemes).toEqual([
      { theme: "lookahead-bias", count: 3 },
    ]);
  });

  it("storage estimate is small for nightly workloads", () => {
    const g = new ExperienceGraph();
    for (let i = 0; i < 100; i++) {
      g.addNode(makeAttempt("market", `m-${i}`));
      g.addNode(makeArtifact("market", `m-art-${i}`, 0.5));
    }
    expect(g.estimatedBytes()).toBeLessThan(10 * 1024 * 1024 * 1024);
  });

  it("passesExperienceGate encodes the record's acceptance rule", () => {
    const good = {
      querySeconds: 30,
      recoverySeconds: 120,
      duplicateBacktests: 0,
      replayFidelity: 5,
      storageBytes: 5 * 1024 * 1024 * 1024,
    };
    expect(passesExperienceGate(good)).toBe(true);
    expect(passesExperienceGate({ ...good, querySeconds: 130 })).toBe(false);
    expect(passesExperienceGate({ ...good, duplicateBacktests: 1 })).toBe(false);
    expect(passesExperienceGate({ ...good, replayFidelity: 4 })).toBe(false);
    expect(
      passesExperienceGate({ ...good, storageBytes: 11 * 1024 * 1024 * 1024 }),
    ).toBe(false);
  });
});
