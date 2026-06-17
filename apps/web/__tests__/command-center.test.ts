import { describe, it, expect } from "vitest";
import {
  scoreFactors,
  scoreToUrgency,
  rankAttention,
  collectAttentionSignals,
} from "@/lib/command-center/attention";
import { buildOperatingNarrative } from "@/lib/command-center/narrative";
import type {
  AttentionFactors,
  AttentionSourceInput,
  RawAttentionSignal,
} from "@/lib/command-center/types";

const NEUTRAL: AttentionFactors = {
  costOfDelay: 0.5,
  severity: 0.5,
  reversibility: 0.5,
  ownerEffort: 0.5,
  sourceConfidence: 1,
};

function signal(id: string, factors: Partial<AttentionFactors>, overrides: Partial<RawAttentionSignal> = {}): RawAttentionSignal {
  return {
    id,
    title: id,
    detail: `detail ${id}`,
    source: "recommended_action",
    decisionType: "ROUTINE",
    factors: { ...NEUTRAL, ...factors },
    urgencyFloor: "LOW",
    recommendedAction: "do it",
    link: null,
    ...overrides,
  };
}

describe("scoreFactors", () => {
  it("returns 0..100", () => {
    expect(scoreFactors(NEUTRAL)).toBeGreaterThanOrEqual(0);
    expect(scoreFactors(NEUTRAL)).toBeLessThanOrEqual(100);
  });

  it("a maximal-priority item scores 100 (high cost, high severity, irreversible, zero effort)", () => {
    expect(
      scoreFactors({ costOfDelay: 1, severity: 1, reversibility: 0, ownerEffort: 0, sourceConfidence: 1 })
    ).toBe(100);
  });

  it("a minimal item scores 0", () => {
    expect(
      scoreFactors({ costOfDelay: 0, severity: 0, reversibility: 1, ownerEffort: 1, sourceConfidence: 1 })
    ).toBe(0);
  });

  it("low source confidence damps, never amplifies", () => {
    const full = scoreFactors({ costOfDelay: 1, severity: 1, reversibility: 0, ownerEffort: 0, sourceConfidence: 1 });
    const half = scoreFactors({ costOfDelay: 1, severity: 1, reversibility: 0, ownerEffort: 0, sourceConfidence: 0.5 });
    expect(half).toBeLessThan(full);
    expect(half).toBe(50);
  });

  it("cost of delay and severity outweigh effort", () => {
    const urgent = scoreFactors({ costOfDelay: 1, severity: 1, reversibility: 0.5, ownerEffort: 1, sourceConfidence: 1 });
    const quickButTrivial = scoreFactors({ costOfDelay: 0, severity: 0, reversibility: 0.5, ownerEffort: 0, sourceConfidence: 1 });
    expect(urgent).toBeGreaterThan(quickButTrivial);
  });

  it("clamps out-of-range / NaN inputs", () => {
    expect(scoreFactors({ costOfDelay: 5, severity: -3, reversibility: 2, ownerEffort: -1, sourceConfidence: 9 })).toBeGreaterThanOrEqual(0);
    expect(scoreFactors({ ...NEUTRAL, sourceConfidence: Number.NaN })).toBe(0);
  });
});

describe("scoreToUrgency", () => {
  it("bands correctly", () => {
    expect(scoreToUrgency(80)).toBe("CRITICAL");
    expect(scoreToUrgency(60)).toBe("HIGH");
    expect(scoreToUrgency(30)).toBe("NORMAL");
    expect(scoreToUrgency(10)).toBe("LOW");
  });
});

describe("rankAttention", () => {
  it("sorts by score descending", () => {
    const items = rankAttention([
      signal("low", { costOfDelay: 0.1, severity: 0.1 }),
      signal("high", { costOfDelay: 1, severity: 1, reversibility: 0 }),
      signal("mid", { costOfDelay: 0.5, severity: 0.5 }),
    ]);
    expect(items.map((i) => i.id)).toEqual(["high", "mid", "low"]);
  });

  it("is deterministic for equal scores (stable by id)", () => {
    const a = rankAttention([signal("b", {}), signal("a", {}), signal("c", {})]);
    expect(a.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("honors an urgency floor above the score-derived band", () => {
    // Low score, but the source guarantees CRITICAL (e.g. a safety warning).
    const [item] = rankAttention([
      signal("safety", { costOfDelay: 0, severity: 0, reversibility: 1, ownerEffort: 1 }, { urgencyFloor: "CRITICAL" }),
    ]);
    expect(item?.urgency).toBe("CRITICAL");
  });

  it("every item carries an explanation", () => {
    const items = rankAttention([signal("x", { costOfDelay: 0.9, severity: 0.8, reversibility: 0.2 })]);
    expect(items[0]?.scoreExplanation).toMatch(/Score \d+:/);
  });
});

describe("collectAttentionSignals", () => {
  const base: AttentionSourceInput = {
    safetyWarnings: [],
    externalConfigWarnings: [],
    missingPhaseWarnings: [],
    recommendedNextActions: [],
    advisoryWarnings: [],
    decisions: [],
    departments: [],
  };

  it("maps a safety warning to a CRITICAL-floored SAFETY signal that ranks first", () => {
    const signals = collectAttentionSignals({
      ...base,
      safetyWarnings: ["Public picks live but performance gated."],
      recommendedNextActions: ["Run the daily checklist."],
    });
    const ranked = rankAttention(signals);
    expect(ranked[0]?.decisionType).toBe("SAFETY");
    expect(ranked[0]?.urgency).toBe("CRITICAL");
  });

  it("only emits department signals for action-required RED/AMBER departments", () => {
    const signals = collectAttentionSignals({
      ...base,
      departments: [
        { id: "green-ok", name: "Green", status: "GREEN", actionRequired: false, actionDescription: null, drilldownHref: null },
        { id: "amber-act", name: "Amber", status: "AMBER", actionRequired: true, actionDescription: "Review drafts", drilldownHref: "/cockpit/media" },
        { id: "red-noact", name: "RedNoAct", status: "RED", actionRequired: false, actionDescription: null, drilldownHref: null },
      ],
    });
    const deptIds = signals.filter((s) => s.source === "department").map((s) => s.id);
    expect(deptIds).toEqual(["dept-amber-act"]);
  });

  it("maps owner decisions preserving urgency and link", () => {
    const signals = collectAttentionSignals({
      ...base,
      decisions: [{ urgency: "CRITICAL", description: "Flip the gate", link: "/cockpit" }],
    });
    const d = signals.find((s) => s.source === "owner_decision");
    expect(d?.urgencyFloor).toBe("CRITICAL");
    expect(d?.link).toBe("/cockpit");
  });

  it("advisories floor at LOW so they never crowd out decisions", () => {
    const signals = collectAttentionSignals({ ...base, advisoryWarnings: ["FYI: cache warm"] });
    const ranked = rankAttention(signals);
    expect(ranked[0]?.urgency).toBe("LOW");
  });

  it("produces stable, unique ids", () => {
    const signals = collectAttentionSignals({
      ...base,
      recommendedNextActions: ["Do A", "Do B"],
      externalConfigWarnings: ["STRIPE_SECRET_KEY"],
    });
    const ids = signals.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("collapses exact-duplicate details (safety net against double-feeding)", () => {
    // The same string arriving as both a safety warning and a recommended action
    // must surface once — keeping the first (higher-priority) occurrence.
    const signals = collectAttentionSignals({
      ...base,
      safetyWarnings: ["Resolve the trust gate."],
      recommendedNextActions: ["Resolve the trust gate.", "Something else."],
    });
    const matching = signals.filter((s) => s.detail === "Resolve the trust gate.");
    expect(matching).toHaveLength(1);
    expect(matching[0]?.source).toBe("jarvis_safety");
    // The distinct recommended action still survives.
    expect(signals.some((s) => s.detail === "Something else.")).toBe(true);
  });
});

describe("buildOperatingNarrative", () => {
  const baseInput = {
    launchStatus: "LAUNCH_READY",
    overallColor: "GREEN" as const,
    todayPickCount: 7,
    gatesOpen: 7,
    gatesTotal: 7,
    publicGateOpen: false,
    attention: [],
  };

  it("reports a steady deck when nothing is queued", () => {
    const n = buildOperatingNarrative(baseInput);
    expect(n.whatsBlocked[0]).toMatch(/Nothing is blocked/);
    expect(n.needsYou[0]).toMatch(/Nothing requires an owner decision/);
  });

  it("surfaces blocked items from SAFETY/CRITICAL attention", () => {
    const attention = rankAttention(
      collectAttentionSignals({
        safetyWarnings: ["Trust gate risk."],
        externalConfigWarnings: [],
        missingPhaseWarnings: [],
        recommendedNextActions: [],
        advisoryWarnings: [],
        decisions: [],
        departments: [],
      })
    );
    const n = buildOperatingNarrative({ ...baseInput, overallColor: "RED", attention });
    expect(n.whatsBlocked.some((l) => /Trust gate risk/.test(l))).toBe(true);
    expect(n.headline).toMatch(/blocking item/);
  });

  it("always reports launch posture, readiness, and today's picks in whatChanged", () => {
    const n = buildOperatingNarrative(baseInput);
    expect(n.whatChanged.join(" ")).toMatch(/Launch posture/);
    expect(n.whatChanged.join(" ")).toMatch(/7\/7/);
    expect(n.whatChanged.join(" ")).toMatch(/7 picks/);
  });
});
