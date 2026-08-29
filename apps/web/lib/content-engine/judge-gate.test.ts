import { describe, it, expect } from "vitest";
import {
  parseJudgeVerdict,
  draftRefIds,
  decideJudgeVerdict,
  initJudgeLoop,
  recordJudgeAttempt,
  nextJudgeStep,
  buildRetryFeedback,
  judgeBlockerStrings,
  DEFAULT_JUDGE_GATE_POLICY,
  type JudgeVerdict,
  type JudgeLoopState,
} from "./judge-gate";
import type { ContentDraftRecord } from "./types";

const REF_IDS = new Set(["section:daily-slate-brief", "source:odds-snapshot", "pick:p1"]);

const VALID_RAW = {
  confidence: 85,
  justification: "Prose matches the payload.",
  contradictions: [],
};

const CONTRADICTION = {
  tag: "NUMERIC_CONTRADICTION",
  severity: "HIGH",
  refId: "section:daily-slate-brief",
  detail: "Prose says 7-3 ATS; payload records 5-5.",
};

describe("parseJudgeVerdict — fail-closed reject table", () => {
  const cases: Array<[string, unknown, string, string]> = [
    ["raw JSON string (module never parses)", JSON.stringify(VALID_RAW), "NOT_AN_OBJECT", ""],
    ["null", null, "NOT_AN_OBJECT", ""],
    ["number", 42, "NOT_AN_OBJECT", ""],
    ["array", [], "NOT_AN_OBJECT", ""],
    ["missing confidence", { justification: "x", contradictions: [] }, "MISSING_FIELD", "confidence"],
    ["string confidence", { ...VALID_RAW, confidence: "85" }, "WRONG_TYPE", "confidence"],
    ["NaN confidence", { ...VALID_RAW, confidence: NaN }, "CONFIDENCE_NOT_FINITE", "confidence"],
    ["Infinity confidence", { ...VALID_RAW, confidence: Infinity }, "CONFIDENCE_NOT_FINITE", "confidence"],
    ["negative confidence", { ...VALID_RAW, confidence: -0.001 }, "CONFIDENCE_OUT_OF_RANGE", "confidence"],
    ["over-100 confidence", { ...VALID_RAW, confidence: 100.001 }, "CONFIDENCE_OUT_OF_RANGE", "confidence"],
    ["whitespace justification", { ...VALID_RAW, justification: "   " }, "EMPTY_JUSTIFICATION", "justification"],
    ["non-array contradictions", { ...VALID_RAW, contradictions: {} }, "WRONG_TYPE", "contradictions"],
    ["unknown tag", { ...VALID_RAW, contradictions: [{ ...CONTRADICTION, tag: "VIBES" }] }, "UNKNOWN_TAG", "contradictions[0].tag"],
    ["unknown severity", { ...VALID_RAW, contradictions: [{ ...CONTRADICTION, severity: "FATAL" }] }, "UNKNOWN_SEVERITY", "contradictions[0].severity"],
    ["empty detail", { ...VALID_RAW, contradictions: [{ ...CONTRADICTION, detail: " " }] }, "EMPTY_DETAIL", "contradictions[0].detail"],
    [
      "fabricated refId — the cross-reference check (schema-perfect verdict, nonexistent section)",
      { ...VALID_RAW, contradictions: [{ ...CONTRADICTION, refId: "section:nonexistent" }] },
      "UNKNOWN_REF_ID",
      "contradictions[0].refId",
    ],
  ];

  for (const [name, raw, reason, path] of cases) {
    it(`rejects ${name} as ${reason}`, () => {
      const result = parseJudgeVerdict(raw, REF_IDS);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe(reason);
        expect(result.path).toBe(path);
      }
    });
  }

  it("accepts boundary confidences 0 and 100, and a real-refId contradiction", () => {
    expect(parseJudgeVerdict({ ...VALID_RAW, confidence: 0 }, REF_IDS).ok).toBe(true);
    expect(parseJudgeVerdict({ ...VALID_RAW, confidence: 100 }, REF_IDS).ok).toBe(true);
    const withC = parseJudgeVerdict({ ...VALID_RAW, contradictions: [CONTRADICTION] }, REF_IDS);
    expect(withC.ok).toBe(true);
  });
});

describe("decideJudgeVerdict", () => {
  it("passes at exactly the threshold (>=), fails just under it", () => {
    const at = { confidence: 70, justification: "j", contradictions: [] };
    const under = { confidence: 69.999, justification: "j", contradictions: [] };
    expect(decideJudgeVerdict(at, DEFAULT_JUDGE_GATE_POLICY).pass).toBe(true);
    expect(decideJudgeVerdict(under, DEFAULT_JUDGE_GATE_POLICY).pass).toBe(false);
  });

  it("a CRITICAL contradiction vetoes even confidence 100 — severity is not laundered through the scalar", () => {
    const verdict: JudgeVerdict = {
      confidence: 100,
      justification: "j",
      contradictions: [{ tag: "UNSUPPORTED_CLAIM", severity: "CRITICAL", refId: "pick:p1", detail: "d" }],
    };
    const d = decideJudgeVerdict(verdict, DEFAULT_JUDGE_GATE_POLICY);
    expect(d.pass).toBe(false);
    expect(d.blocking).toHaveLength(1);
  });

  it("a LOW contradiction at passing confidence passes (surfaces as a note downstream)", () => {
    const verdict: JudgeVerdict = {
      confidence: 71,
      justification: "j",
      contradictions: [{ tag: "OMITTED_CAVEAT", severity: "LOW", refId: "pick:p1", detail: "d" }],
    };
    expect(decideJudgeVerdict(verdict, DEFAULT_JUDGE_GATE_POLICY).pass).toBe(true);
  });
});

function drive(state: JudgeLoopState, reports: Array<Parameters<typeof recordJudgeAttempt>[1]>): JudgeLoopState {
  let s = state;
  for (const r of reports) s = recordJudgeAttempt(s, r, REF_IDS);
  return s;
}

describe("judge loop — the extraction's three gate fixtures, hand-traced", () => {
  it("(i) judge timeout twice => BLOCK with cause JUDGE_UNAVAILABLE and exact accounting", () => {
    let s = initJudgeLoop({ maxRetries: 1 });
    s = recordJudgeAttempt(s, { kind: "TIMEOUT" }, REF_IDS);
    expect(s.outcome).toBeNull();
    expect(nextJudgeStep(s)).toEqual({ kind: "CALL_JUDGE", attempt: 2 });
    s = recordJudgeAttempt(s, { kind: "TIMEOUT" }, REF_IDS);
    expect(s.outcome?.kind).toBe("BLOCK_MANUAL_REVIEW");
    if (s.outcome?.kind === "BLOCK_MANUAL_REVIEW") {
      expect(s.outcome.cause).toBe("JUDGE_UNAVAILABLE");
      expect(s.outcome.accounting).toEqual({ attemptsUsed: 2, invalidVerdicts: 0, timeouts: 2, refusals: 0, transportErrors: 0 });
    }
  });

  it("(ii) failing contradiction verdict => RETRY_WITH_FEEDBACK carrying the justification verbatim; second failure => BLOCK with the tag in the blockers", () => {
    let s = initJudgeLoop({ maxRetries: 1 });
    const failing = { confidence: 40, justification: "The ATS record is wrong.", contradictions: [CONTRADICTION] };
    s = recordJudgeAttempt(s, { kind: "VERDICT", raw: failing }, REF_IDS);
    const step = nextJudgeStep(s);
    expect(step.kind).toBe("RETRY_WITH_FEEDBACK");
    if (step.kind === "RETRY_WITH_FEEDBACK") {
      expect(step.feedback).toContain("The ATS record is wrong.");
      expect(step.feedback).toContain("[NUMERIC_CONTRADICTION/HIGH] section:daily-slate-brief");
    }
    s = recordJudgeAttempt(s, { kind: "VERDICT", raw: { ...failing, confidence: 45 } }, REF_IDS);
    expect(s.outcome?.kind).toBe("BLOCK_MANUAL_REVIEW");
    if (s.outcome?.kind === "BLOCK_MANUAL_REVIEW") {
      expect(s.outcome.cause).toBe("BLOCKING_CONTRADICTION");
      expect(judgeBlockerStrings(s.outcome).join("\n")).toContain("NUMERIC_CONTRADICTION");
    }
  });

  it("(iii) retry cap honored: maxRetries=1 consumes exactly 2 attempts and a terminal state refuses more; maxRetries=0 blocks after one failure", () => {
    const s2 = drive(initJudgeLoop({ maxRetries: 1 }), [{ kind: "REFUSAL" }, { kind: "REFUSAL" }]);
    expect(s2.accounting.attemptsUsed).toBe(2);
    expect(() => recordJudgeAttempt(s2, { kind: "REFUSAL" }, REF_IDS)).toThrow();
    const s1 = drive(initJudgeLoop({ maxRetries: 0 }), [{ kind: "TIMEOUT" }]);
    expect(s1.outcome?.kind).toBe("BLOCK_MANUAL_REVIEW");
  });
});

describe("judge loop — never-default-approve and recovery paths", () => {
  it("an invalid verdict claiming confidence 100 never PROCEEDs", () => {
    const s = drive(initJudgeLoop({ maxRetries: 0 }), [
      { kind: "VERDICT", raw: { confidence: 100, justification: "j", contradictions: [{ tag: "BOGUS", severity: "LOW", refId: "pick:p1", detail: "d" }] } },
    ]);
    expect(s.outcome?.kind).toBe("BLOCK_MANUAL_REVIEW");
    if (s.outcome?.kind === "BLOCK_MANUAL_REVIEW") expect(s.outcome.cause).toBe("INVALID_VERDICT");
  });

  it("mixed failure accounting: invalid verdict then refusal => exact counters, cause reflects the LAST failure mode", () => {
    const s = drive(initJudgeLoop({ maxRetries: 1 }), [
      { kind: "VERDICT", raw: { confidence: "bad" } },
      { kind: "REFUSAL" },
    ]);
    expect(s.accounting).toEqual({ attemptsUsed: 2, invalidVerdicts: 1, timeouts: 0, refusals: 1, transportErrors: 0 });
    if (s.outcome?.kind === "BLOCK_MANUAL_REVIEW") expect(s.outcome.cause).toBe("RETRY_EXHAUSTED");
  });

  it("recovery: below-threshold then passing => PROCEED with LOW/MEDIUM contradictions as notes", () => {
    let s = initJudgeLoop({ maxRetries: 1 });
    s = recordJudgeAttempt(s, { kind: "VERDICT", raw: { confidence: 40, justification: "weak", contradictions: [] } }, REF_IDS);
    s = recordJudgeAttempt(
      s,
      {
        kind: "VERDICT",
        raw: {
          confidence: 85,
          justification: "fixed",
          contradictions: [{ tag: "OMITTED_CAVEAT", severity: "LOW", refId: "pick:p1", detail: "minor" }],
        },
      },
      REF_IDS,
    );
    expect(s.outcome?.kind).toBe("PROCEED");
    if (s.outcome?.kind === "PROCEED") {
      expect(s.outcome.accounting.attemptsUsed).toBe(2);
      expect(s.outcome.notes[0]).toContain("OMITTED_CAVEAT");
    }
    expect(judgeBlockerStrings(s.outcome!)).toEqual([]);
  });

  it("initJudgeLoop policy validation throws RangeError", () => {
    expect(() => initJudgeLoop({ confidenceThreshold: NaN })).toThrow(RangeError);
    expect(() => initJudgeLoop({ confidenceThreshold: -1 })).toThrow(RangeError);
    expect(() => initJudgeLoop({ confidenceThreshold: 101 })).toThrow(RangeError);
    expect(() => initJudgeLoop({ maxRetries: -1 })).toThrow(RangeError);
    expect(() => initJudgeLoop({ maxRetries: 1.5 })).toThrow(RangeError);
  });

  it("is deterministic: replaying an identical loop yields deeply-equal states", () => {
    const reports: Array<Parameters<typeof recordJudgeAttempt>[1]> = [
      { kind: "VERDICT", raw: { confidence: 40, justification: "weak", contradictions: [] } },
      { kind: "VERDICT", raw: VALID_RAW },
    ];
    expect(drive(initJudgeLoop(), reports)).toEqual(drive(initJudgeLoop(), reports));
  });
});

describe("draftRefIds", () => {
  const draft: ContentDraftRecord = {
    title: "Daily Brief",
    slug: "daily-brief",
    contentType: "DAILY_BRIEF",
    status: "DRAFT",
    visibility: "INTERNAL",
    relatedPickIds: ["p1"],
    relatedPromotionIds: ["promoA"],
    relatedBriefIds: ["b9"],
    sourceCoverageStatus: "COVERED",
    complianceStatus: "CLEAR",
    responsibleGamingIncluded: true,
    affiliateDisclosureIncluded: true,
    performanceGateStatus: "NOT_APPLICABLE",
    bannedPhraseScanClean: true,
    draftBody: "# Daily Slate Brief\nBody text.\n## Line Movement Watch!\nMore text.\n### not-an-h1-h2\n",
    generatedBy: "test",
    sources: [
      {
        sourceType: "ODDS",
        sourceLabel: "odds-snapshot",
        sourceStatus: "FRESH",
        trustLevel: "PLATFORM",
      },
    ],
  };

  it("derives the exact id inventory: H1/H2 section slugs, sources, picks, promos, briefs", () => {
    expect(draftRefIds(draft)).toEqual(
      new Set([
        "section:daily-slate-brief",
        "section:line-movement-watch",
        "source:odds-snapshot",
        "pick:p1",
        "promo:promoA",
        "brief:b9",
      ]),
    );
  });

  it("is deterministic across calls", () => {
    expect(draftRefIds(draft)).toEqual(draftRefIds(draft));
  });
});

describe("buildRetryFeedback", () => {
  it("assembles justification + one line per contradiction, exactly", () => {
    const verdict: JudgeVerdict = {
      confidence: 40,
      justification: "Two problems.",
      contradictions: [
        { tag: "NUMERIC_CONTRADICTION", severity: "HIGH", refId: "pick:p1", detail: "a" },
        { tag: "TONE_VS_RECORD", severity: "MEDIUM", refId: "source:odds-snapshot", detail: "b" },
      ],
    };
    expect(buildRetryFeedback(verdict)).toBe(
      "Two problems.\n[NUMERIC_CONTRADICTION/HIGH] pick:p1: a\n[TONE_VS_RECORD/MEDIUM] source:odds-snapshot: b",
    );
  });
});
