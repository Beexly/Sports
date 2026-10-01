import { describe, expect, it } from "vitest";
import { scoreGame } from "../scoring.js";
import { buildReasoningTrace, type ReasoningTrace } from "../reasoning-trace.js";
import { renderReasoningTrace } from "../reasoning-trace-render.js";
import { SKELLAM_COVER_SOURCE } from "../skellam.js";
import type {
  GameContextInput,
  IndependentMarketFairValue,
  OddsInput,
  ScoredPick,
} from "@sports/types";

// ============================================================
// Fixtures — the established repo pattern (scoring-independent-edge.test.ts,
// skellam-spread-rank.test.ts): TEN_BOOKS / BOOKS arrays, bookmakerOdds rows,
// context with bookmakerCoverageMax and independentFairValues.
//
// Unlike the upstream fixtures these DELIBERATELY populate every context
// signal — rest, ATS form, venue form, H2H, schedule density, line movement,
// cross-market — so most of them get GATED. That is the point: a trace built
// only from signals that fire proves nothing about the half that does not.
// ============================================================

const TEN_BOOKS = [
  "fanduel", "draftkings", "betmgm", "caesars", "pointsbet",
  "betrivers", "wynn", "bet365", "espnbet", "fanatics",
];
const FIVE_BOOKS = TEN_BOOKS.slice(0, 5);

const AT = new Date("2026-04-15T12:00:00Z");

/** MONEYLINE: heavy home favourite, 10 books, two agreeing independents. */
function moneylineInput(
  context: Partial<GameContextInput> = {},
): OddsInput {
  return {
    gameId: "trace-ml-1",
    homeTeam: "Chiefs",
    awayTeam: "Eagles",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NFL",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -800,
      awayPrice: 650,
    })),
    context: {
      bookmakerCoverageMax: 10,
      independentFairValues: [
        { source: "kalshi", homeFairProb: 0.93, awayFairProb: 0.07 },
        { source: "poisson", homeFairProb: 0.92, awayFairProb: 0.08 },
      ],
      ...context,
    },
  };
}

/** SPREAD: 5 books at -1.5, Skellam cover fair value, rich context. */
function spreadInput(context: Partial<GameContextInput> = {}): OddsInput {
  return {
    gameId: "trace-nhl-1",
    homeTeam: "Bruins",
    awayTeam: "Leafs",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NHL",
    bookmakerOdds: FIVE_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    })),
    context: {
      bookmakerCoverageMax: FIVE_BOOKS.length,
      independentFairValues: [
        {
          source: SKELLAM_COVER_SOURCE,
          homeFairProb: 0.71,
          awayFairProb: 0.29,
        },
      ],
      ...context,
    },
  };
}

/** TOTAL: 10 books at 224.5, a 2pt line move, plus an independent value the
 *  TOTAL scorer structurally cannot read. */
function totalInput(context: Partial<GameContextInput> = {}): OddsInput {
  return {
    gameId: "trace-nba-1",
    homeTeam: "Celtics",
    awayTeam: "Heat",
    commenceTime: new Date("2026-04-15T18:00:00Z"),
    sport: "NBA",
    bookmakerOdds: TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "TOTALS" as const,
      total: 224.5,
      overPrice: -110,
      underPrice: -110,
    })),
    context: {
      bookmakerCoverageMax: TEN_BOOKS.length,
      openingTotal: 223.5,
      currentTotal: 225.5,
      independentFairValues: [
        { source: "kalshi", homeFairProb: 0.5, awayFairProb: 0.5 },
      ],
      ...context,
    },
  };
}

function pickOf(input: OddsInput, pickType: ScoredPick["pickType"]): ScoredPick {
  const picks = scoreGame(input, AT);
  const pick = picks.find((p) => p.pickType === pickType);
  expect(
    pick,
    `fixture produced no ${pickType} pick (got ${picks.map((p) => p.pickType).join(", ") || "none"})`,
  ).toBeTruthy();
  return pick!;
}

function traceOf(input: OddsInput, pickType: ScoredPick["pickType"]): ReasoningTrace {
  return buildReasoningTrace(pickOf(input, pickType), input);
}

/** Every context field this package's scorer actually reads. Used to prove
 *  coverage: a field present in the input must appear as FIRED or SUPPRESSED. */
const READ_SIGNAL_FIELDS = [
  "restDaysHome", "restDaysAway", "isBackToBackHome", "isBackToBackAway",
  "homeAtsForm", "awayAtsForm", "homeAtsFormAtHome", "awayAtsFormAway",
  "headToHeadForm", "mlFairProbHome",
  "scheduleDensityHome", "scheduleDensityAway",
  "openingSpread", "currentSpread", "openingTotal", "currentTotal",
  "independentFairValues", "probabilityCalibrator",
] as const;

/** Field names surfaced by the trace, from BOTH halves. */
function surfacedFields(trace: ReasoningTrace): string[] {
  return [
    ...trace.fired.flatMap((f) => f.fedBy),
    ...trace.suppressed.map((s) => s.field),
  ].join(" | ");
}

// ============================================================

describe("buildReasoningTrace — fires for every market type", () => {
  it("emits a complete trace for a MONEYLINE pick", () => {
    const input = moneylineInput({
      restDaysHome: 3, restDaysAway: 3,
      homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
      awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
    });
    const t = traceOf(input, "MONEYLINE");

    expect(t.schema).toBe("sports.reasoning-trace.v1");
    expect(t.pickType).toBe("MONEYLINE");
    expect(t.pickedSide).toBe("HOME");
    expect(t.selection).toBe("Chiefs ML (-800)");
    expect(t.modelVersion).toBe(pickOf(input, "MONEYLINE").modelVersion);
    // Fired, suppressed, arithmetic, seam, ranking, final pick: all present.
    expect(t.fired.length).toBeGreaterThan(0);
    expect(t.arithmetic.reconciles).toBe(true);
    expect(t.independentEdge.assessed).toBe(true);
    expect(t.calibrationSeam.present).toBe(false);
    expect(t.ranking.rankingScore).toBeGreaterThan(0);
    expect(t.pick.tier).toBeTruthy();
    expect(t.unresolved).toEqual([]);
  });

  it("emits a complete trace for a SPREAD pick", () => {
    const t = traceOf(spreadInput({
      restDaysHome: 3, restDaysAway: 3,
      homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
      awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
      homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
      headToHeadForm: { wins: 6, losses: 4, pushes: 0, sampleSize: 10 },
      scheduleDensityHome: 2, scheduleDensityAway: 2,
    }), "SPREAD");

    expect(t.pickType).toBe("SPREAD");
    expect(t.pickedSide).toBe("HOME");
    expect(t.line).toBe(-1.5);
    expect(t.arithmetic.reconciles).toBe(true);
    expect(t.independentEdge.assessed).toBe(true);
    expect(t.independentEdge.sourcesConsulted).toEqual([SKELLAM_COVER_SOURCE]);
    expect(t.ranking.rankingSource).not.toBe("confidence");
    expect(t.unresolved).toEqual([]);
  });

  it("emits a complete trace for a TOTAL pick", () => {
    const t = traceOf(totalInput(), "TOTAL");

    expect(t.pickType).toBe("TOTAL");
    expect(t.pickedSide).toBe("OVER");
    expect(t.line).toBe(224.5);
    expect(t.arithmetic.reconciles).toBe(true);
    // The TOTAL scorer never reads independent fair values. The trace says so
    // rather than leaving the supplied kalshi value silently unused.
    expect(t.independentEdge.assessed).toBe(false);
    expect(t.independentEdge.sourcesNotConsulted).toEqual(["kalshi"]);
    expect(t.suppressed.map((s) => s.field)).toContain("independentFairValues[kalshi]");
    expect(t.unresolved).toEqual([]);
  });

  it("reports side-specific signals as structurally unread for a TOTAL", () => {
    // Rest, ATS form, H2H and schedule density are all side-agnostic problems
    // on a total. The engine reads none of them; the trace must say NOT_APPLICABLE.
    const t = traceOf(
      totalInput({
        restDaysHome: 3, restDaysAway: 1,
        homeAtsForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
        headToHeadForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
        scheduleDensityHome: 5, scheduleDensityAway: 1,
      }),
      "TOTAL",
    );
    const bySignal = Object.fromEntries(t.suppressed.map((s) => [s.signal, s]));
    expect(bySignal["Rest Advantage"]?.reason).toBe("NOT_APPLICABLE_TO_MARKET");
    expect(bySignal["Head-to-Head Form"]?.reason).toBe("NOT_APPLICABLE_TO_MARKET");
    expect(bySignal["Schedule Density"]?.reason).toBe("NOT_APPLICABLE_TO_MARKET");
    // And none of them leaked into the confidence sum.
    for (const label of ["Rest Advantage", "Head-to-Head Form", "Schedule Density"]) {
      const term = t.arithmetic.terms.find((x) => x.label.startsWith(label));
      expect(term?.enteredSum, `${label} must not enter a TOTAL sum`).toBe(false);
      expect(term?.exclusionReason).toBeTruthy();
    }
  });
});

describe("buildReasoningTrace — every input signal is FIRED or SUPPRESSED", () => {
  const richContext: Partial<GameContextInput> = {
    restDaysHome: 3,
    restDaysAway: 3,
    isBackToBackHome: false,
    isBackToBackAway: false,
    homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
    awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
    homeAtsFormAtHome: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
    awayAtsFormAway: { wins: 3, losses: 7, pushes: 0, sampleSize: 10 },
    headToHeadForm: { wins: 6, losses: 4, pushes: 0, sampleSize: 10 },
    mlFairProbHome: 0.82,
    scheduleDensityHome: 4,
    scheduleDensityAway: 1,
    openingSpread: -1.0,
    currentSpread: -1.5,
  };

  it("surfaces every present context signal on a SPREAD pick", () => {
    const t = traceOf(spreadInput(richContext), "SPREAD");
    const surface = surfacedFields(t);

    // Each of these fields was present in the input. Every one must be visible
    // in the trace either as a factor that fired (via fedBy) or as a suppressed
    // signal — there is no third possibility, and no silent drop.
    for (const field of READ_SIGNAL_FIELDS) {
      if ((richContext as Record<string, unknown>)[field] === undefined) continue;
      expect(surface, `${field} vanished from the trace`).toContain(field);
    }
  });

  it("surfaces every present context signal on a MONEYLINE pick", () => {
    const t = traceOf(
      moneylineInput({
        restDaysHome: 2,
        restDaysAway: 4,
        awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
        headToHeadForm: { wins: 6, losses: 4, pushes: 0, sampleSize: 10 },
      }),
      "MONEYLINE",
    );
    const surface = surfacedFields(t);
    // rest reads 2 vs 4 for a HOME pick → fires with a real weight.
    expect(t.fired.map((f) => f.name)).toContain("Rest Advantage");
    expect(surface).toContain("restDaysHome");
    // Only the unpicked side's ATS bucket is read; it is named, not silent.
    expect(surface).toContain("awayAtsForm");
    expect(surface).toContain("headToHeadForm");
  });

  it("gives every suppressed signal a real reason and a non-empty explanation", () => {
    for (const [input, type] of [
      [spreadInput(richContext), "SPREAD"],
      [moneylineInput({ restDaysHome: 2, restDaysAway: 2 }), "MONEYLINE"],
      [totalInput(), "TOTAL"],
    ] as const) {
      const t = traceOf(input, type);
      for (const s of t.suppressed) {
        expect(s.reason).toBeTruthy();
        expect(s.explanation.length).toBeGreaterThan(20);
        expect(s.inputValue.length).toBeGreaterThan(0);
        // The explanation must cite the engine gate, not just assert silence.
        expect(
          /game-context\.ts|scoring\.ts|scorer/i.test(s.explanation),
          `explanation for ${s.signal} must cite its engine gate`,
        ).toBe(true);
      }
    }
  });

  it("records the unpicked side's signal as never read, not as zero", () => {
    const t = traceOf(spreadInput(richContext), "SPREAD");
    const awayForm = t.suppressed.find((s) => s.field === "awayAtsForm");
    expect(awayForm?.reason).toBe("WRONG_SIDE_NOT_READ");
    expect(awayForm?.explanation).toMatch(/only the PICKED side/i);
    expect(awayForm?.computedScore).toBeNull();
  });

  it("distinguishes a sub-threshold sample from an unread signal", () => {
    // 3 decided games fails the 5-game minimum; a real but sub-threshold score
    // of 0. These are different engine decisions and the trace must say which.
    const t = traceOf(
      spreadInput({
        homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
      }),
      "SPREAD",
    );
    const venue = t.suppressed.find((s) => s.signal === "Home Venue Form");
    expect(venue?.reason).toBe("GATED_NO_SCORE");
    expect(venue?.explanation).toMatch(/3 DECIDED games/);
  });
});

describe("buildReasoningTrace — the confidence arithmetic reconciles EXACTLY", () => {
  // This is the load-bearing honesty assertion. If the trace's term set did not
  // actually produce the published number, the trace would be lying about how
  // the confidence was made. A failure here is a real engine finding and is
  // reported by `arithmetic.reconciles === false`, never absorbed.

  it("reconciles MONEYLINE to the published confidence", () => {
    const input = moneylineInput({ restDaysHome: 4, restDaysAway: 1 });
    const pick = pickOf(input, "MONEYLINE");
    const t = buildReasoningTrace(pick, input);

    expect(t.arithmetic.reconciles).toBe(true);
    expect(t.arithmetic.residual).toBe(0);
    expect(Math.round(t.arithmetic.clampedSum)).toBe(pick.confidence);
    expect(t.unresolved).toEqual([]);
  });

  it("reconciles SPREAD to the published confidence", () => {
    const input = spreadInput({
      restDaysHome: 4,
      restDaysAway: 1,
      isBackToBackAway: true,
      homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
      awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
      headToHeadForm: { wins: 6, losses: 4, pushes: 0, sampleSize: 10 },
      scheduleDensityHome: 4,
      scheduleDensityAway: 1,
    });
    const pick = pickOf(input, "SPREAD");
    const t = buildReasoningTrace(pick, input);

    expect(t.arithmetic.reconciles).toBe(true);
    expect(t.arithmetic.residual).toBe(0);
    expect(Math.round(t.arithmetic.clampedSum)).toBe(pick.confidence);
  });

  it("reconciles TOTAL to the published confidence", () => {
    const input = totalInput({ openingTotal: 220, currentTotal: 226 });
    const pick = pickOf(input, "TOTAL");
    const t = buildReasoningTrace(pick, input);

    expect(t.arithmetic.reconciles).toBe(true);
    expect(t.arithmetic.residual).toBe(0);
    expect(Math.round(t.arithmetic.clampedSum)).toBe(pick.confidence);
  });

  it("reconciles across a matrix of market/economy variants", () => {
    const variants: Array<[string, OddsInput, ScoredPick["pickType"]]> = [
      ["ml-heavy", moneylineInput(), "MONEYLINE"],
      ["ml-no-indep", moneylineInput({ independentFairValues: [] }), "MONEYLINE"],
      ["ml-stale", moneylineInput({ dataFreshnessMinutes: 6000 }), "MONEYLINE"],
      ["spread-lean", spreadInput(), "SPREAD"],
      ["spread-b2b", spreadInput({ isBackToBackHome: true, restDaysHome: 0 }), "SPREAD"],
      [
        "spread-rich",
        spreadInput({
          homeAtsForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
          homeAtsFormAtHome: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
          headToHeadForm: { wins: 8, losses: 2, pushes: 0, sampleSize: 10 },
          scheduleDensityHome: 4,
          scheduleDensityAway: 1,
          openingSpread: -1.0,
          currentSpread: -1.5,
        }),
        "SPREAD",
      ],
      ["total-flat", totalInput({ openingTotal: 224.5, currentTotal: 224.5 }), "TOTAL"],
      ["total-move", totalInput(), "TOTAL"],
    ];

    for (const [name, input, type] of variants) {
      const pick = picksOf(input, type);
      if (!pick) continue; // some variants legitimately withhold a pick
      const t = buildReasoningTrace(pick, input);
      expect(
        t.arithmetic.reconciles,
        `${name}: trace rebuilt ${Math.round(t.arithmetic.clampedSum)} but pick published ${pick.confidence}`,
      ).toBe(true);
      expect(t.arithmetic.residual, name).toBe(0);
    }
  });

  it("excludes the deliberately zeroed market-echo factors from the sum", () => {
    // Cross-market needs real H2H rows: every scorer OVERWRITES the supplied
    // `context.mlFairProbHome` with one derived from the input's H2H books
    // (scoring.ts:571-586), so a supplied value alone produces no factor.
    const input: OddsInput = {
      ...spreadInput(),
      bookmakerOdds: [
        ...FIVE_BOOKS.map((bookmaker) => ({
          bookmaker,
          market: "SPREADS" as const,
          spread: -1.5,
          homeSpreadPrice: -110,
          awaySpreadPrice: -110,
        })),
        ...TEN_BOOKS.map((bookmaker) => ({
          bookmaker,
          market: "H2H" as const,
          homePrice: -500,
          awayPrice: 450,
        })),
      ],
    };
    const t = traceOf(input, "SPREAD");

    const edge = t.arithmetic.terms.find((x) => x.label.startsWith("Pricing Edge"));
    expect(edge?.enteredSum).toBe(false);
    expect(edge?.exclusionReason).toMatch(/market-echo guard/i);

    // Cross-market agreement fired (+4) yet is excluded from the sum. The
    // market-echo guard (scoring.ts:616-655) removes it from the arithmetic.
    const cm = t.arithmetic.terms.find((x) => x.label.startsWith("Cross-Market"));
    expect(cm).toBeTruthy();
    expect(cm!.enteredSum).toBe(false);
    expect(cm!.exclusionReason).toMatch(/market-echo guard/i);
    // It scored +4 and still moved no confidence — that is the guard working.
    expect(cm!.value).toBe(4);
    expect(t.arithmetic.reconciles).toBe(true);
  });

  it("GUARD HELD: SPREAD zeroes the cross-market weight MONEYLINE zeroes", () => {
    // HISTORY, because the line numbers moved when this was fixed. Both scorers
    // call zeroMarketEchoFactorWeights. MONEYLINE spread the ZEROED array; SPREAD
    // spread the UN-zeroed ...contextFactors and DISCARDED the zeroed copy it had
    // already computed. So a SPREAD pick advertised "Cross-Market Alignment" at
    // weight 4 / impact "positive" while crossMarketScore entered neither sum —
    // a claim the published number did not support.
    //
    // Confidence was never affected (the term is in neither sum), so this was a
    // factor-claim bug, not a wrong probability. It was found by two
    // independent audits, confirmed by reading both call sites, and pinned RED
    // before the fix in market-echo-factor-weight-spread.test.ts.
    //
    // This test now asserts the FIXED behaviour. A test that asserts a defect
    // persists is a test that must be inverted the moment the defect is
    // repaired — otherwise the repair itself becomes the failing suite.
    const h2hRows = TEN_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "H2H" as const,
      homePrice: -500,
      awayPrice: 450,
    }));
    const spreadRows = FIVE_BOOKS.map((bookmaker) => ({
      bookmaker,
      market: "SPREADS" as const,
      spread: -1.5,
      homeSpreadPrice: -110,
      awaySpreadPrice: -110,
    }));

    const spreadTrace = traceOf(
      {
        ...spreadInput({
          homeAtsForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
        }),
        bookmakerOdds: [...spreadRows, ...h2hRows],
      },
      "SPREAD",
    );
    const spreadFactor = spreadTrace.fired.find((f) => f.name.startsWith("Cross-Market"));
    expect(spreadFactor, "fixture must make cross-market fire").toBeTruthy();

    // The guard's law: a term that contributes 0 must publish weight 0 and read
    // neutral. Anything else tells the customer it drove the number.
    expect(spreadFactor!.weight).toBe(0);
    expect(spreadFactor!.impact).toBe("neutral");

    // The trace must now name the term as EXCLUDED rather than describing the
    // old broken behaviour.
    const cmTerm = spreadTrace.arithmetic.terms.find((x) =>
      x.label.startsWith("Cross-Market"),
    )!;
    expect(cmTerm.exclusionReason).not.toMatch(/FINDING/);
    expect(cmTerm.exclusionReason).toMatch(/EXCLUDED/);
    expect(cmTerm.enteredSum).toBe(false);
  });

  it("reports a supplied mlFairProbHome the scorer discarded", () => {
    // FINDING: context.mlFairProbHome is dead input — every scorer overwrites
    // it from the input's own H2H rows. The trace says so rather than
    // pretending the supplied value was used.
    const t = traceOf(spreadInput({ mlFairProbHome: 0.9 }), "SPREAD");
    const discarded = t.suppressed.find(
      (s) => s.field === "context.mlFairProbHome (supplied)",
    );
    expect(discarded).toBeTruthy();
    expect(discarded!.reason).toBe("FACTOR_DROPPED");
    expect(discarded!.explanation).toMatch(/OVERWRITES that field/);
    expect(discarded!.explanation).toMatch(/never entered the decision/);
    // No cross-market factor could fire without H2H rows.
    expect(t.fired.some((f) => f.name.startsWith("Cross-Market"))).toBe(false);
  });

  it("reports the missing-H2H-rows case when no moneyline is derivable", () => {
    const t = traceOf(spreadInput(), "SPREAD");
    const gated = t.suppressed.find(
      (s) => s.field === "derived mlFairProbHome (H2H book rows)",
    );
    expect(gated?.reason).toBe("GATED_NO_SCORE");
    expect(gated?.explanation).toMatch(/at least 2 complete two-sided H2H rows/);
  });

  it("classifies the Independent Edge factor as a ranking delta, not a confidence term", () => {
    const t = traceOf(moneylineInput(), "MONEYLINE");
    const ieFactor = t.fired.find((f) => f.name.startsWith("Independent Edge"));
    expect(ieFactor).toBeTruthy();
    expect(ieFactor!.enteredConfidenceSum).toBe(false);
    expect(ieFactor!.exclusionReason).toMatch(/rankingScore − confidence/);
  });

  it("surfaces a failure to reconcile instead of hiding it", () => {
    // Corrupt the pick's published confidence. The trace must report the
    // mismatch — this is the assertion that the trace cannot be made to agree
    // with a number it did not produce.
    const input = moneylineInput();
    const pick = pickOf(input, "MONEYLINE");
    const tampered: ScoredPick = { ...pick, confidence: pick.confidence + 7 };
    const t = buildReasoningTrace(tampered, input);

    expect(t.arithmetic.reconciles).toBe(false);
    // residual = published − recomputed, so tampering UP makes it positive.
    expect(t.arithmetic.residual).toBe(7);
    expect(t.unresolved.join(" ")).toMatch(/DID NOT RECONCILE/);
  });
});

describe("buildReasoningTrace — the calibration seam is shown, never fitted", () => {
  it("reports seam ABSENT and proves the two values are identical", () => {
    const input = moneylineInput();
    const t = traceOf(input, "MONEYLINE");

    expect(t.calibrationSeam.present).toBe(false);
    expect(t.calibrationSeam.fittedAtRuntime).toBe(false);
    expect(t.calibrationSeam.beforeSeam).not.toBeNull();
    expect(t.calibrationSeam.afterSeam).not.toBeNull();
    // The LAW: absent means unchanged. Nothing was applied, so the values match.
    expect(t.calibrationSeam.beforeSeam).toBe(t.calibrationSeam.afterSeam);
    expect(t.calibrationSeam.delta).toBe(0);
    expect(t.calibrationSeam.changedValue).toBe(false);
    expect(t.calibrationSeam.note).toMatch(/nothing was fitted at runtime/i);
  });

  it("shows a SUPPLIED seam's effect without ever fitting one", () => {
    // A calibrator that would map every probability to 0.5. If the engine
    // applied it, the published trueProb collapses; the trace must show that
    // move — and must still report fittedAtRuntime === false.
    const input = moneylineInput({
      probabilityCalibrator: { predict: () => 0.5 },
    });
    const t = traceOf(input, "MONEYLINE");

    expect(t.calibrationSeam.present).toBe(true);
    expect(t.calibrationSeam.fittedAtRuntime).toBe(false);
    expect(t.calibrationSeam.note).toMatch(/SEAM PRESENT/);
    // The supplied map dragged the value down; the trace reports the delta.
    expect(t.calibrationSeam.changedValue).toBe(true);
    expect(t.calibrationSeam.afterSeam).toBe(0.5);
    expect(t.calibrationSeam.delta).toBeLessThan(0);
    // And the seam is state, not signal: it appears as a suppressed input.
    expect(t.suppressed.map((s) => s.field)).toContain("probabilityCalibrator");
  });

  it("never reports Brier / ECE / Kelly / calibration scores", () => {
    const traces: ReasoningTrace[] = [
      traceOf(moneylineInput(), "MONEYLINE"),
      traceOf(spreadInput(), "SPREAD"),
      traceOf(totalInput(), "TOTAL"),
      traceOf(moneylineInput({ probabilityCalibrator: { predict: (p) => p * 0.9 } }), "MONEYLINE"),
    ];
    for (const t of traces) {
      const text = JSON.stringify(t);
      // Those are inputs and objectives, not per-pick trace fields.
      expect(text).not.toMatch(/brier/i);
      expect(text).not.toMatch(/"\s*ece\s*"/i);
      expect(text).not.toMatch(/kelly/i);
      expect(text).not.toMatch(/calibrationScore/i);
      // The only calibration content is seam state and seam effect.
      expect(text).toMatch(/"calibrationSeam"/);
      expect(text).toMatch(/"fittedAtRuntime":false/);
    }
  });

  it("fits nothing even when the trace is built repeatedly", () => {
    // Determinism: the same input twice yields byte-identical trace output, so
    // no state accumulates and no map is fitted behind the caller's back.
    const input = moneylineInput();
    const pick = pickOf(input, "MONEYLINE");
    const a = JSON.stringify(buildReasoningTrace(pick, input));
    const b = JSON.stringify(buildReasoningTrace(pick, input));
    expect(a).toBe(b);
  });
});

describe("buildReasoningTrace — independent edge and ranking path", () => {
  it("shows sources, the blend, and the market fair value", () => {
    const t = traceOf(moneylineInput(), "MONEYLINE");
    const ie = t.independentEdge;

    expect(ie.assessed).toBe(true);
    expect(ie.sourcesConsulted).toEqual(["kalshi", "poisson"]);
    expect(ie.sourceProbabilities).toHaveLength(2);
    // Both supplied HOME probs (0.93, 0.92) blended by equal weight.
    expect(ie.blendedProbability).toBeCloseTo(0.925, 6);
    // The edge summary rounds marketFairProb to 4dp (edge-engine.ts: round()),
    // while factorBreakdown carries it unrounded — so compare at that precision.
    expect(ie.marketFairProbability).toBeCloseTo(t.market.marketFairProb!, 3);
    expect(ie.rawEdge).not.toBeNull();
    expect(ie.shrunkEdge).not.toBeNull();
    expect(ie.rawEdge!).toBeGreaterThan(ie.shrunkEdge!); // the shrink is visible
    expect(ie.rationale).toBeTruthy();
  });

  it("shows the ranking blend terms, not just the result", () => {
    const t = traceOf(moneylineInput(), "MONEYLINE");
    const r = t.ranking;

    expect(r.source).toBe("blend_indep_conf");
    expect(r.priced).toBe(true);
    expect(r.independentTrueProb).not.toBeNull();
    expect(r.confidenceAsProbability).toBeCloseTo(t.pick.confidence / 100, 6);
    expect(r.independentWeight).toBe(0.7);
    expect(r.blendedFormula).toContain("0.3·");
    expect(r.blendedFormula).toContain("0.7·");
    // The blend reproduces the published rankingP.
    const w = r.independentWeight;
    const expected =
      (1 - w) * r.confidenceAsProbability + w * r.independentTrueProb!;
    expect(r.rankingP).toBeCloseTo(expected, 6);
    expect(r.rankingScore).toBe(Math.round(expected * 100));
  });

  it("shows the confidence-only ranking path when no independents exist", () => {
    const t = traceOf(moneylineInput({ independentFairValues: [] }), "MONEYLINE");
    expect(t.independentEdge.assessed).toBe(false);
    expect(t.ranking.source).toBe("confidence");
    expect(t.ranking.priced).toBe(false);
    expect(t.ranking.blendedFormula).toBeNull();
    expect(t.ranking.rankingScore).toBe(t.pick.confidence);
  });

  it("names the source a SPREAD pick refuses to blend", () => {
    // SPREAD consults ONLY skellam_cover (scoring.ts:669-671). Kalshi is
    // filtered out, and the trace says so instead of hiding the supplied value.
    const t = traceOf(
      spreadInput({
        independentFairValues: [
          { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.71, awayFairProb: 0.29 },
          { source: "kalshi", homeFairProb: 0.95, awayFairProb: 0.05 },
        ],
      }),
      "SPREAD",
    );
    expect(t.independentEdge.sourcesConsulted).toEqual([SKELLAM_COVER_SOURCE]);
    expect(t.independentEdge.sourcesNotConsulted).toEqual(["kalshi"]);
    const entry = t.suppressed.find((s) => s.field === "independentFairValues[kalshi]");
    expect(entry?.reason).toBe("WRONG_SIDE_NOT_READ");
    expect(entry?.explanation).toMatch(/ONLY the Skellam cover source/);
  });
});

describe("buildReasoningTrace — no synthetic values", () => {
  it("sources every arithmetic term from the pick or a real engine primitive", () => {
    for (const [input, type] of [
      [moneylineInput({ restDaysHome: 3 }), "MONEYLINE"],
      // Away is the congested side, so the HOME pick takes the +5 and publishes.
      // (home=4/away=1 would score −5 for a HOME pick and withhold it.)
      [spreadInput({ scheduleDensityHome: 1, scheduleDensityAway: 4 }), "SPREAD"],
      [totalInput(), "TOTAL"],
    ] as const) {
      const pick = pickOf(input, type);
      const t = buildReasoningTrace(pick, input);
      for (const term of t.arithmetic.terms) {
        expect(term.source.length).toBeGreaterThan(0);
        expect(Number.isFinite(term.value)).toBe(true);
      }
      // The scalars the trace leans on must be the pick's own values.
      const fb = pick.factorBreakdown;
      expect(t.arithmetic.terms.find((x) => x.label === "Bookmaker Consensus")!.value).toBe(
        fb.consensusScore,
      );
      expect(t.arithmetic.terms.find((x) => x.label === "Market Coverage")!.value).toBe(
        fb.marketDepthScore,
      );
      expect(t.market.consensusPct).toBe(pick.consensusPct);
      expect(t.market.edgeScore).toBe(pick.edgeScore);
      expect(t.market.bookmakerCount).toBe(pick.bookmakerCount);
      expect(t.market.entryPrice).toBe(pick.entryPrice);
    }
  });

  it("reports the market read from the real book rows in the input", () => {
    const input = spreadInput();
    const t = traceOf(input, "SPREAD");
    expect(t.market.books).toHaveLength(FIVE_BOOKS.length);
    expect(t.market.books.map((b) => b.bookmaker)).toEqual(FIVE_BOOKS);
    // -110/-110 at every book → overround = 2 × (110/220) > 1 → CONSISTENT.
    expect(t.market.twoSidedImpliedSum).toBeGreaterThan(1);
    expect(t.market.marketConsistent).toBe(true);
  });

  it("marks a sub-vig market inconsistent rather than crediting an edge", () => {
    // SPREAD at -105/+120: implied 0.5122 + 0.4545 = 0.9667 < 1, the engine's
    // own sub-vig guard (scoring.ts:369). The pick still publishes on its other
    // signals; the trace must not describe the market as consistent.
    const input: OddsInput = {
      gameId: "trace-subvig",
      homeTeam: "Bruins",
      awayTeam: "Leafs",
      commenceTime: new Date("2026-04-15T18:00:00Z"),
      sport: "NHL",
      bookmakerOdds: FIVE_BOOKS.map((bookmaker) => ({
        bookmaker,
        market: "SPREADS" as const,
        spread: -1.5,
        homeSpreadPrice: -105,
        awaySpreadPrice: 120,
      })),
      context: {
        bookmakerCoverageMax: FIVE_BOOKS.length,
        homeAtsForm: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
        homeAtsFormAtHome: { wins: 9, losses: 1, pushes: 0, sampleSize: 10 },
        independentFairValues: [
          { source: SKELLAM_COVER_SOURCE, homeFairProb: 0.71, awayFairProb: 0.29 },
        ],
      },
    };
    const t = traceOf(input, "SPREAD");
    expect(t.market.twoSidedImpliedSum).toBeLessThan(1);
    expect(t.market.marketConsistent).toBe(false);
    // And the arithmetic still reconciles — consistency is not what confidence
    // is built from, which is the whole point of the market-echo guard.
    expect(t.arithmetic.reconciles).toBe(true);
  });
});

describe("renderReasoningTrace — renders the full trace honestly", () => {
  it("renders every required section for a scored pick", () => {
    const input = spreadInput({
      restDaysHome: 3,
      restDaysAway: 3,
      homeAtsForm: { wins: 7, losses: 3, pushes: 0, sampleSize: 10 },
      awayAtsForm: { wins: 5, losses: 5, pushes: 0, sampleSize: 10 },
      homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 },
      scheduleDensityHome: 2,
      scheduleDensityAway: 2,
    });
    const text = renderReasoningTrace(traceOf(input, "SPREAD"));

    expect(text).toContain("REASONING TRACE");
    expect(text).toContain("MARKET READ");
    expect(text).toContain("SIGNALS THAT FIRED");
    expect(text).toContain("SIGNALS THAT DID NOT FIRE");
    expect(text).toContain("CONFIDENCE ARITHMETIC");
    expect(text).toContain("INDEPENDENT EDGE");
    expect(text).toContain("CALIBRATION SEAM");
    expect(text).toContain("RANKING PATH");
    expect(text).toContain("FINAL PICK");
    expect(text).toContain("RECONCILES");
    expect(text).toContain("fitted here     : NO");
  });

  it("names suppressed signals in the rendered output, not just in the object", () => {
    const t = traceOf(
      spreadInput({ homeAtsFormAtHome: { wins: 2, losses: 1, pushes: 0, sampleSize: 3 } }),
      "SPREAD",
    );
    const text = renderReasoningTrace(t);
    expect(text).toContain("Home Venue Form");
    expect(text).toContain("GATED_NO_SCORE");
    expect(text).toContain("5-game minimum");
  });

  it("shows the absent seam as unchanged rather than omitting it", () => {
    const text = renderReasoningTrace(traceOf(moneylineInput(), "MONEYLINE"));
    expect(text).toContain("seam present    : NO");
    expect(text).toContain("NO SEAM");
    expect(text).toContain("unchanged");
  });

  it("prints a loud FAIL banner when the arithmetic does not reconcile", () => {
    const input = moneylineInput();
    const pick = pickOf(input, "MONEYLINE");
    const text = renderReasoningTrace(buildReasoningTrace({ ...pick, confidence: 99 }, input));
    expect(text).toContain("DOES NOT RECONCILE");
    expect(text).toContain("UNRESOLVED");
    expect(text).not.toContain("RECONCILES ✓");
  });

  it("never prints a fabricated number for an absent signal", () => {
    const t = traceOf(totalInput(), "TOTAL");
    const text = renderReasoningTrace(t);
    // TOTAL has no independent edge; the render must say so, not print 0.0000.
    expect(text).toContain("NOT ASSESSED");
    expect(t.independentEdge.rawEdge).toBeNull();
    expect(t.independentEdge.blendedProbability).toBeNull();
  });
});

/** Local helper: score and return a pick, or undefined if withheld. */
function picksOf(input: OddsInput, type: ScoredPick["pickType"]): ScoredPick | undefined {
  return scoreGame(input, AT).find((p) => p.pickType === type);
}