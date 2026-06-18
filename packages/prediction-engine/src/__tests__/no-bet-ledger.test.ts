import { describe, it, expect } from "vitest";
import {
  analyzeNoBetDecisions,
  MIN_PUBLISH_CONFIDENCE,
  type NoBetCandidate,
} from "../no-bet-ledger.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const published = (overrides: Partial<NoBetCandidate> = {}): NoBetCandidate => ({
  confidence: MIN_PUBLISH_CONFIDENCE + 10,
  edgeDecision: "SPEAK",
  agreement: "CONFIRMS",
  calibrated: true,
  ...overrides,
});

const belowFloor = (overrides: Partial<NoBetCandidate> = {}): NoBetCandidate => ({
  confidence: MIN_PUBLISH_CONFIDENCE - 1,
  edgeDecision: "SPEAK",
  agreement: "CONFIRMS",
  ...overrides,
});

// ── Structural invariants ─────────────────────────────────────────────────────

describe("analyzeNoBetDecisions — structural invariants", () => {
  it("is always weight 0 (inert, never priced)", () => {
    expect(analyzeNoBetDecisions([]).weight).toBe(0);
    expect(analyzeNoBetDecisions([published()]).weight).toBe(0);
  });

  it("always returns non-empty caveats", () => {
    expect(analyzeNoBetDecisions([]).caveats.length).toBeGreaterThan(0);
    expect(analyzeNoBetDecisions([published()]).caveats.length).toBeGreaterThan(0);
  });

  it("caveats mention that outcomes of rejected markets are unknown", () => {
    const caveats = analyzeNoBetDecisions([belowFloor()]).caveats.join(" ");
    expect(caveats).toMatch(/cannot|CANNOT/);
    expect(caveats).toMatch(/saved|cost|settled|settlement/i);
  });

  it("caveats contain the critical discipline-as-alpha statement", () => {
    const caveats = analyzeNoBetDecisions([]).caveats.join(" ");
    expect(caveats).toMatch(/discipline|alpha|settlement/i);
    expect(caveats).toMatch(/No-Bet Ledger|K3/i);
  });

  it("same input → same output (pure function)", () => {
    const candidates = [published(), belowFloor(), published({ edgeDecision: "PASS" })];
    expect(analyzeNoBetDecisions(candidates)).toEqual(analyzeNoBetDecisions(candidates));
  });
});

// ── Empty input ───────────────────────────────────────────────────────────────

describe("analyzeNoBetDecisions — empty input", () => {
  it("empty array → zeroed totals", () => {
    const r = analyzeNoBetDecisions([]);
    expect(r.total).toBe(0);
    expect(r.published).toBe(0);
    expect(r.noBet).toBe(0);
    expect(r.noBetRate).toBe(0);
  });

  it("byReason contains all four reasons even for empty input", () => {
    const r = analyzeNoBetDecisions([]);
    const reasons = r.byReason.map((b) => b.reason);
    expect(reasons).toContain("published");
    expect(reasons).toContain("below-min-confidence");
    expect(reasons).toContain("edge-pass");
    expect(reasons).toContain("edge-contradicts");
  });

  it("all byReason counts are 0 for empty input", () => {
    const r = analyzeNoBetDecisions([]);
    for (const { count } of r.byReason) {
      expect(count).toBe(0);
    }
  });
});

// ── Math invariants ───────────────────────────────────────────────────────────

describe("analyzeNoBetDecisions — math invariants", () => {
  it("total = published + noBet", () => {
    const candidates = [published(), belowFloor(), published(), belowFloor(), belowFloor()];
    const r = analyzeNoBetDecisions(candidates);
    expect(r.total).toBe(5);
    expect(r.published + r.noBet).toBe(r.total);
  });

  it("noBetRate = noBet / total in [0, 1]", () => {
    const all = analyzeNoBetDecisions([belowFloor(), belowFloor(), belowFloor()]);
    expect(all.noBetRate).toBe(1);

    const none = analyzeNoBetDecisions([published(), published()]);
    expect(none.noBetRate).toBe(0);

    const half = analyzeNoBetDecisions([published(), belowFloor()]);
    expect(half.noBetRate).toBeCloseTo(0.5, 6);
  });

  it("byReason counts sum to total", () => {
    const candidates = [published(), belowFloor(), published({ edgeDecision: "PASS" })];
    const r = analyzeNoBetDecisions(candidates);
    const sum = r.byReason.reduce((s, { count }) => s + count, 0);
    expect(sum).toBe(r.total);
  });
});

// ── Reason classification — confidence floor (highest precedence) ─────────────

describe("analyzeNoBetDecisions — below-min-confidence (primary gate)", () => {
  it("confidence exactly at MIN_PUBLISH_CONFIDENCE − 1 → below-min-confidence", () => {
    const r = analyzeNoBetDecisions([belowFloor()]);
    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    expect(bc.count).toBe(1);
    expect(r.published).toBe(0);
  });

  it("confidence = 0 → below-min-confidence", () => {
    const r = analyzeNoBetDecisions([{ confidence: 0 }]);
    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    expect(bc.count).toBe(1);
  });

  it("non-finite confidence → below-min-confidence (treated as invalid)", () => {
    const r = analyzeNoBetDecisions([{ confidence: NaN }]);
    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    expect(bc.count).toBe(1);
  });

  it("below-min-confidence takes precedence over CONTRADICTS", () => {
    // Even if agreement is CONTRADICTS, the confidence floor fires first
    const r = analyzeNoBetDecisions([
      belowFloor({ agreement: "CONTRADICTS" }),
    ]);
    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    const ec = r.byReason.find((b) => b.reason === "edge-contradicts")!;
    expect(bc.count).toBe(1);
    expect(ec.count).toBe(0);
  });

  it("below-min-confidence takes precedence over PASS edge", () => {
    const r = analyzeNoBetDecisions([
      belowFloor({ edgeDecision: "PASS" }),
    ]);
    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    const ep = r.byReason.find((b) => b.reason === "edge-pass")!;
    expect(bc.count).toBe(1);
    expect(ep.count).toBe(0);
  });
});

// ── Reason classification — edge-contradicts ──────────────────────────────────

describe("analyzeNoBetDecisions — edge-contradicts", () => {
  it("confidence above floor + CONTRADICTS → edge-contradicts", () => {
    const r = analyzeNoBetDecisions([
      published({ agreement: "CONTRADICTS" }),
    ]);
    const ec = r.byReason.find((b) => b.reason === "edge-contradicts")!;
    expect(ec.count).toBe(1);
    expect(r.noBet).toBe(1);
  });

  it("CONTRADICTS takes precedence over PASS edge when confidence clears floor", () => {
    const r = analyzeNoBetDecisions([
      published({ agreement: "CONTRADICTS", edgeDecision: "PASS" }),
    ]);
    const ec = r.byReason.find((b) => b.reason === "edge-contradicts")!;
    const ep = r.byReason.find((b) => b.reason === "edge-pass")!;
    expect(ec.count).toBe(1);
    expect(ep.count).toBe(0);
  });
});

// ── Reason classification — edge-pass ─────────────────────────────────────────

describe("analyzeNoBetDecisions — edge-pass", () => {
  it("confidence above floor + CONFIRMS + PASS → edge-pass", () => {
    const r = analyzeNoBetDecisions([
      published({ edgeDecision: "PASS", agreement: "CONFIRMS" }),
    ]);
    const ep = r.byReason.find((b) => b.reason === "edge-pass")!;
    expect(ep.count).toBe(1);
    expect(r.noBet).toBe(1);
  });

  it("LEAN edge above floor does not trigger edge-pass", () => {
    const r = analyzeNoBetDecisions([
      published({ edgeDecision: "LEAN" }),
    ]);
    const ep = r.byReason.find((b) => b.reason === "edge-pass")!;
    expect(ep.count).toBe(0);
    expect(r.published).toBe(1);
  });
});

// ── Reason classification — published ─────────────────────────────────────────

describe("analyzeNoBetDecisions — published", () => {
  it("confidence at MIN_PUBLISH_CONFIDENCE exactly → published", () => {
    const r = analyzeNoBetDecisions([{ confidence: MIN_PUBLISH_CONFIDENCE }]);
    expect(r.published).toBe(1);
    expect(r.noBet).toBe(0);
  });

  it("confidence well above floor, SPEAK, CONFIRMS → published", () => {
    const r = analyzeNoBetDecisions([published()]);
    expect(r.published).toBe(1);
    expect(r.noBet).toBe(0);
  });

  it("missing optional fields do not suppress a confident pick", () => {
    // Only confidence provided; no edge info
    const r = analyzeNoBetDecisions([{ confidence: MIN_PUBLISH_CONFIDENCE + 5 }]);
    expect(r.published).toBe(1);
  });
});

// ── Mixed batch ───────────────────────────────────────────────────────────────

describe("analyzeNoBetDecisions — mixed batch", () => {
  it("mixed reasons are counted correctly", () => {
    const candidates: NoBetCandidate[] = [
      published(),
      published(),
      belowFloor(),
      published({ agreement: "CONTRADICTS" }),
      published({ edgeDecision: "PASS", agreement: "CONFIRMS" }),
      belowFloor(),
    ];
    const r = analyzeNoBetDecisions(candidates);
    expect(r.total).toBe(6);
    expect(r.published).toBe(2);
    expect(r.noBet).toBe(4);
    expect(r.noBetRate).toBeCloseTo(4 / 6, 6);

    const bc = r.byReason.find((b) => b.reason === "below-min-confidence")!;
    const ec = r.byReason.find((b) => b.reason === "edge-contradicts")!;
    const ep = r.byReason.find((b) => b.reason === "edge-pass")!;
    const pub = r.byReason.find((b) => b.reason === "published")!;

    expect(bc.count).toBe(2);
    expect(ec.count).toBe(1);
    expect(ep.count).toBe(1);
    expect(pub.count).toBe(2);
  });

  it("byReason is sorted by count descending", () => {
    const candidates: NoBetCandidate[] = [
      belowFloor(), belowFloor(), belowFloor(),   // 3× below-min-confidence
      published(),                                  // 1× published
    ];
    const r = analyzeNoBetDecisions(candidates);
    // First entry should be the highest count
    expect(r.byReason[0]!.count).toBeGreaterThanOrEqual(r.byReason[1]!.count);
  });
});

// ── Re-exported constant ──────────────────────────────────────────────────────

describe("analyzeNoBetDecisions — MIN_PUBLISH_CONFIDENCE re-export", () => {
  it("MIN_PUBLISH_CONFIDENCE is a positive number", () => {
    expect(typeof MIN_PUBLISH_CONFIDENCE).toBe("number");
    expect(MIN_PUBLISH_CONFIDENCE).toBeGreaterThan(0);
  });

  it("the re-exported value matches the gate used in classification", () => {
    // Pick at exactly MIN_PUBLISH_CONFIDENCE − 1 should be suppressed.
    const r = analyzeNoBetDecisions([{ confidence: MIN_PUBLISH_CONFIDENCE - 1 }]);
    expect(r.noBet).toBe(1);
    // Pick at exactly MIN_PUBLISH_CONFIDENCE should pass.
    const r2 = analyzeNoBetDecisions([{ confidence: MIN_PUBLISH_CONFIDENCE }]);
    expect(r2.published).toBe(1);
  });
});
