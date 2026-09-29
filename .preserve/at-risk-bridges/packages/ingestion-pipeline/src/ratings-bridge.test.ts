/**
 * Ratings bridge tests.
 *
 * Shape, per the neighbouring bridges: every eval gets at least one
 * EXACT/close-to-expected value assertion on real constructed data and at
 * least one fail-closed assertion that names the reason. Solvers are fed a
 * deliberately CONNECTED schedule graph — a disconnected or one-sided graph is
 * the standard cause of divergence, and several of these tests prove the
 * bridge refuses one.
 *
 * No Math.random anywhere. Where the kernel needs randomness it is seeded by
 * the caller (opts.seed / the sim seed) or by the module's own deterministic
 * LCG.
 */
import { describe, expect, it } from "vitest";
import {
  RATINGS_GATE_STATUS,
  evalBradleyTerry,
  evalStrengthCovariate,
  evalMad,
  evalCsfCompare,
  evalCsf,
  evalCycleDiagnostics,
  evalDavidson,
  evalDynamicBradleyTerry,
  evalNetworkRating,
  evalEbShrink,
  evalEbShrinkMatrix,
  evalHfaBiasAudit,
  evalLsRatings,
  evalMatchupRatings,
  evalParametricPagerank,
  evalPlayeRank,
  evalPythagoreanDuel,
  evalSelStrengths,
  evalTargetPagerank,
  evalTimeVaryingWeights,
  evalUnitImpact,
  evalScoringRandomWalk,
  evalCollegeSensitivity,
  evalPlayerKernelGp,
  evalGEloDiagnostics,
  evalRareEventMetrics,
  evalSparseTvp,
  evalPairedLs,
  evalQIndex,
  evalUpsetParity,
  evalWinStrength,
  type RatingsEval,
} from "./ratings-bridge.js";

// ── fixtures ────────────────────────────────────────────────────────────────

/**
 * A CONNECTED round-robin slate: every team plays every other team exactly
 * once, home and away, so the comparison graph is a complete graph (one
 * component) and no team is one-sided.
 *
 *   ALPHA beats BRAVO, CHARLIE, ECHO
 *   BRAVO beats CHARLIE, ECHO
 *   CHARLIE beats ECHO
 */
const ROUND_ROBIN: ReadonlyArray<{ home: string; away: string; homeWin: 0 | 1 }> = [
  { home: "ALPHA", away: "BRAVO", homeWin: 1 },
  { home: "BRAVO", away: "ALPHA", homeWin: 0 },
  { home: "ALPHA", away: "CHARLIE", homeWin: 1 },
  { home: "CHARLIE", away: "ALPHA", homeWin: 0 },
  { home: "ALPHA", away: "ECHO", homeWin: 1 },
  { home: "ECHO", away: "ALPHA", homeWin: 0 },
  { home: "BRAVO", away: "CHARLIE", homeWin: 1 },
  { home: "CHARLIE", away: "BRAVO", homeWin: 0 },
  { home: "BRAVO", away: "ECHO", homeWin: 1 },
  { home: "ECHO", away: "BRAVO", homeWin: 0 },
  { home: "CHARLIE", away: "ECHO", homeWin: 1 },
  { home: "ECHO", away: "CHARLIE", homeWin: 0 },
];

const failReason = <T>(r: RatingsEval<T>): string => {
  if (r.ok) throw new Error("expected a fail-closed result, got ok:true");
  return r.reason;
};

const okData = <T>(r: RatingsEval<T>): T => {
  if (!r.ok) throw new Error(`expected ok:true, got reason: ${r.reason}`);
  return r.data;
};

// ── 1. Bradley-Terry ────────────────────────────────────────────────────────

describe("evalBradleyTerry", () => {
  it("fits a connected slate, mean-normalizes to 1, and passes the mirror symmetry gate", () => {
    const d = okData(
      evalBradleyTerry({ games: ROUND_ROBIN, homeEdge: 1, iters: 2000, minGames: 6 }),
    );
    expect(d.teams).toEqual(["ALPHA", "BRAVO", "CHARLIE", "ECHO"]);
    // Mean-normalization is part of the contract; recompute it, don't trust it.
    const values = d.teams.map((t) => d.strengths[t] as number);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    expect(mean).toBeCloseTo(1, 6);
    for (const v of values) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
    // ALPHA went 3-0, so it must be the top team and beat the bottom comfortably.
    expect(d.topVsBottomWinProb).toBeGreaterThan(0.9);
    // The zero-sum update is home/away symmetric, so the mirror residual is 0.
    expect(d.mirrorResidual).toBeLessThan(1e-9);
    expect(d.homeEdge).toBe(1);
  });

  it("ranks ALPHA above BRAVO above CHARLIE above ECHO on a transitive slate", () => {
    const d = okData(
      evalBradleyTerry({ games: ROUND_ROBIN, homeEdge: 1, iters: 2000, minGames: 6 }),
    );
    const g = (t: string): number => d.strengths[t] as number;
    expect(g("ALPHA")).toBeGreaterThan(g("BRAVO"));
    expect(g("BRAVO")).toBeGreaterThan(g("CHARLIE"));
    expect(g("CHARLIE")).toBeGreaterThan(g("ECHO"));
  });

  it("fail-closes below the minimum sample, naming the count", () => {
    const r = evalBradleyTerry({ games: ROUND_ROBIN, homeEdge: 1, minGames: 20 });
    expect(failReason(r)).toContain("need >= 20 observations, got 12");
  });

  it("fail-closes on a DISCONNECTED schedule graph rather than returning a mean-pinned fit", () => {
    // Two 2-team components: the rating is only identified inside each.
    const split = [
      { home: "ALPHA", away: "BRAVO", homeWin: 1 as const },
      { home: "BRAVO", away: "ALPHA", homeWin: 0 as const },
      { home: "CHARLIE", away: "ECHO", homeWin: 1 as const },
      { home: "ECHO", away: "CHARLIE", homeWin: 0 as const },
    ];
    const r = evalBradleyTerry({ games: split, homeEdge: 1, minGames: 4 });
    expect(failReason(r)).toContain("disconnected into 2 components");
  });

  it("fail-closes on a non-binary homeWin instead of imputing it", () => {
    const bad = [{ home: "ALPHA", away: "BRAVO", homeWin: 0.5 as unknown as 0 | 1 }];
    expect(failReason(evalBradleyTerry({ games: bad, minGames: 1 }))).toContain("homeWin must be 0 or 1");
  });
});

describe("evalStrengthCovariate / evalMad", () => {
  it("returns a finite, MAD-normalized omega on a fitted slate", () => {
    const fit = {
      strengths: { ALPHA: 1.3, BRAVO: 1.0, CHARLIE: 0.8, ECHO: 0.6 },
      homeEdge: 1,
    };
    const d = okData(
      evalStrengthCovariate({
        fit,
        matchups: [
          ["ALPHA", "BRAVO"],
          ["BRAVO", "CHARLIE"],
          ["CHARLIE", "ECHO"],
          ["ALPHA", "ECHO"],
        ] as const,
        minMatchups: 4,
      }),
    );
    expect(d.omega).toHaveLength(4);
    for (const o of d.omega) expect(Number.isFinite(o)).toBe(true);
    // omega is the log ratio, so it orders by ratio, not by raw strength.
    // log(1.3/0.6) > log(0.8/0.6): the widest edge is ALPHA over ECHO.
    expect(d.omega[3]).toBeGreaterThan(d.omega[2]);
    expect(d.omega[2]).toBeGreaterThan(d.omega[0]);
    // All four are positive: every listed matchup pairs a stronger team.
    for (const o of d.omega) expect(o).toBeGreaterThan(0);
    expect(d.maxAbs).toBeCloseTo(Math.max(...d.omega.map(Math.abs)), 12);
  });

  it("computes the exact median absolute deviation of a known sample", () => {
    // [1,2,3,4]: median 3, deviations [2,1,0,1] sorted [0,1,1,2] -> median 1.
    expect(okData(evalMad({ xs: [1, 2, 3, 4], minValues: 4 })).mad).toBe(1);
  });

  it("fail-closes on an unknown matchup team and below the minimum", () => {
    const fit = { strengths: { ALPHA: 1.1 }, homeEdge: 1 };
    expect(
      failReason(
        evalStrengthCovariate({
          fit,
          matchups: [["ALPHA", "GHOST"]] as const,
          minMatchups: 1,
        }),
      ),
    ).toContain("names a team the fit never saw");
    expect(failReason(evalMad({ xs: [1], minValues: 2 }))).toContain("need >= 2 observations, got 1");
  });
});

// ── 2. CSF triple compare ───────────────────────────────────────────────────

describe("evalCsfCompare / evalCsf", () => {
  // Transitive team-seasons: more points for, fewer against, higher win share.
  const SEASONS = [
    { pf: 450, pa: 280, wins: 14, games: 16 },
    { pf: 400, pa: 320, wins: 11, games: 16 },
    { pf: 360, pa: 350, wins: 8, games: 16 },
    { pf: 320, pa: 380, wins: 6, games: 16 },
    { pf: 280, pa: 450, wins: 3, games: 16 },
    { pf: 240, pa: 500, wins: 1, games: 16 },
  ];

  it("fits all three forms, returns finite positive alphas, and names a winner", () => {
    const d = okData(evalCsfCompare({ seasons: SEASONS, minSeasons: 3 }));
    expect(d.seasons).toBe(6);
    for (const form of ["tullock", "difference", "serial"] as const) {
      expect(d.rmse[form]).toBeGreaterThanOrEqual(0);
      expect(d.alpha[form]).toBeGreaterThan(0);
    }
    expect(["tullock", "difference", "serial"]).toContain(d.winner);
    expect(d.serialVsTullock.pValue).toBeGreaterThanOrEqual(0);
    expect(d.serialVsTullock.pValue).toBeLessThanOrEqual(1);
    // The gate is a conjunction of a magnitude and a significance threshold.
    expect(d.passesGate).toBe(
      d.serialVsTullock.diffWins >= 0.2 && d.serialVsTullock.pValue < 0.05,
    );
  });

  it("every CSF form returns exactly 0.5 at equal points for any positive alpha", () => {
    for (const form of ["tullock", "difference", "serial"] as const) {
      for (const alpha of [0.1, 1, 2.5, 10]) {
        expect(okData(evalCsf({ pf: 100, pa: 100, alpha, form })).winShare).toBeCloseTo(0.5, 12);
      }
    }
  });

  it("fail-closes below the minimum, on a 2-row LOOCV slate, and on a zero-point season", () => {
    expect(failReason(evalCsfCompare({ seasons: SEASONS, minSeasons: 10 }))).toContain(
      "need >= 10 observations, got 6",
    );
    expect(
      failReason(evalCsfCompare({ seasons: SEASONS.slice(0, 2), minSeasons: 2 })),
    ).toContain("LOOCV needs >= 3 seasons");
    // A zero-point season is a data defect, and it is caught on the row it is on.
    const zeroPf = [
      { pf: 0, pa: 300, wins: 3, games: 16 },
      ...SEASONS.slice(0, 3),
    ];
    expect(failReason(evalCsfCompare({ seasons: zeroPf, minSeasons: 3 }))).toContain("finite pf/pa > 0");
    // Wins above the game count is the other row-level defect. It needs >= 3
    // seasons to reach the per-row loop rather than the LOOCV count guard.
    const badWins = [
      { pf: 400, pa: 300, wins: 20, games: 16 },
      ...SEASONS.slice(0, 3),
    ];
    expect(failReason(evalCsfCompare({ seasons: badWins, minSeasons: 3 }))).toContain(
      "wins must be finite in [0, games]",
    );
    expect(failReason(evalCsf({ pf: 100, pa: 100, alpha: 1, form: "nope" as never }))).toContain(
      "unknown CSF form",
    );
  });
});

// ── 3. Cycle diagnostics ────────────────────────────────────────────────────

describe("evalCycleDiagnostics", () => {
  it("finds exactly the rock-paper-scissors 3-cycle in a fully cyclic slate", () => {
    // Every team beats exactly one other and loses to exactly one: 3 teams,
    // 3 unordered pairs, all three triples are the same cycle.
    const d = okData(
      evalCycleDiagnostics({
        records: [
          { a: "A", b: "B", winsA: 4, winsB: 1 },
          { a: "B", b: "C", winsA: 4, winsB: 1 },
          { a: "C", b: "A", winsA: 4, winsB: 1 },
        ],
        minGames: 1,
        minRecords: 3,
      }),
    );
    expect(d.teams).toBe(3);
    expect(d.threeCycles).toBe(1);
    expect(d.cycleRate).toBeCloseTo(1, 12);
    expect(d.edges).toBe(3);
  });

  it("finds ZERO cycles on a fully transitive slate (a perfect BT fit)", () => {
    const d = okData(
      evalCycleDiagnostics({
        records: [
          { a: "A", b: "B", winsA: 6, winsB: 0 },
          { a: "A", b: "C", winsA: 6, winsB: 0 },
          { a: "B", b: "C", winsA: 6, winsB: 0 },
        ],
        minGames: 1,
        minRecords: 3,
      }),
    );
    expect(d.threeCycles).toBe(0);
    expect(d.cycleRate).toBe(0);
  });

  it("drops an exact 0.500 head-to-head rather than inventing a dominance edge", () => {
    // A>B exactly half the time: no edge either way, so with A-B and B-C the
    // graph is a path and A/C has no relation.
    const d = okData(
      evalCycleDiagnostics({
        records: [
          { a: "A", b: "B", winsA: 2, winsB: 2 },
          { a: "B", b: "C", winsA: 4, winsB: 0 },
          { a: "A", b: "C", winsA: 3, winsB: 1 },
        ],
        minGames: 1,
        minRecords: 3,
      }),
    );
    expect(d.threeCycles).toBe(0);
  });

  it("fail-closes on fewer than 3 teams and on a self-pair", () => {
    const r = evalCycleDiagnostics({
      records: [
        { a: "A", b: "B", winsA: 1, winsB: 0 },
        { a: "B", b: "A", winsA: 0, winsB: 1 },
      ],
      minRecords: 2,
    });
    expect(failReason(r)).toContain("needs >= 3 teams");
    expect(
      failReason(
        evalCycleDiagnostics({ records: [{ a: "A", b: "A", winsA: 1, winsB: 0 }], minRecords: 1 }),
      ),
    ).toContain("distinct non-empty team ids");
  });
});

// ── 4. Davidson ties ───────────────────────────────────────────────────────

describe("evalDavidson", () => {
  it("closes the 3-way split to exactly 1 and matches a hand-computed value", () => {
    // pi = (4, 1), nu = 2, h = 1: D = 4 + 1 + 2*sqrt(4) = 9.
    // homeWin = 4/9, tie = 4/9, awayWin = 1/9.
    const d = okData(
      evalDavidson({
        logPiHome: Math.log(4),
        logPiAway: Math.log(1),
        beta0: Math.log(2),
        beta1: 0,
        homeEdge: 1,
        outOf: "H",
      }),
    );
    expect(d.probs.homeWin).toBeCloseTo(4 / 9, 12);
    expect(d.probs.tie).toBeCloseTo(4 / 9, 12);
    expect(d.probs.awayWin).toBeCloseTo(1 / 9, 12);
    expect(d.probs.homeWin + d.probs.tie + d.probs.awayWin).toBeCloseTo(1, 12);
    expect(d.sumResidual).toBeCloseTo(0, 15);
    // log-loss of the observed outcome at 4/9.
    expect(d.logLoss).toBeCloseTo(-Math.log(4 / 9), 12);
  });

  it("is symmetric in log-strengths when the home effect is 1", () => {
    const fwd = okData(
      evalDavidson({ logPiHome: Math.log(3), logPiAway: Math.log(1), beta0: 0, beta1: 0, outOf: "H" }),
    );
    const rev = okData(
      evalDavidson({ logPiHome: Math.log(1), logPiAway: Math.log(3), beta0: 0, beta1: 0, outOf: "H" }),
    );
    expect(fwd.probs.homeWin).toBeCloseTo(rev.probs.awayWin, 12);
    expect(fwd.probs.tie).toBeCloseTo(rev.probs.tie, 12);
  });

  it("beta1 > 0 makes stronger pairs tie MORE (the strength-dependent nu term)", () => {
    const weak = okData(
      evalDavidson({ logPiHome: Math.log(1.1), logPiAway: Math.log(1), beta0: 0, beta1: 0, outOf: "T" }),
    );
    const strong = okData(
      evalDavidson({ logPiHome: Math.log(2), logPiAway: Math.log(1.8), beta0: 0, beta1: 1, outOf: "T" }),
    );
    expect(strong.probs.tie).toBeGreaterThan(weak.probs.tie);
  });

  it("fail-closes on a non-finite log-strength and a non-finite tie parameter", () => {
    expect(
      failReason(
        evalDavidson({ logPiHome: Number.POSITIVE_INFINITY, logPiAway: 0, beta0: 0, beta1: 0, outOf: "H" }),
      ),
    ).toContain("logPiHome must be finite");
    // A tie parameter that overflows exp() is refused, not published as 0.
    expect(
      failReason(
        evalDavidson({ logPiHome: 0, logPiAway: 0, beta0: 1e6, beta1: 0, outOf: "T" }),
      ),
    ).toContain("tie parameter");
    expect(
      failReason(evalDavidson({ logPiHome: 0, logPiAway: 0, beta0: 0, beta1: 0, outOf: "X" as never })),
    ).toContain('outOf must be "H", "T" or "A"');
  });
});

// ── 5. Dynamic Bradley-Terry ───────────────────────────────────────────────

describe("evalDynamicBradleyTerry", () => {
  // CONNECTED dynamic slate: 3 teams, weeks 1..4, every team wins and loses
  // at every week so the existence condition holds at any bandwidth.
  const DYN: ReadonlyArray<{ week: number; home: string; away: string; homeWin: boolean }> = [
    { week: 1, home: "A", away: "B", homeWin: true },
    { week: 1, home: "B", away: "C", homeWin: true },
    { week: 1, home: "C", away: "A", homeWin: true },
    { week: 2, home: "A", away: "C", homeWin: true },
    { week: 2, home: "C", away: "B", homeWin: true },
    { week: 2, home: "B", away: "A", homeWin: true },
    { week: 3, home: "A", away: "B", homeWin: false },
    { week: 3, home: "B", away: "C", homeWin: false },
    { week: 3, home: "C", away: "A", homeWin: false },
    { week: 4, home: "A", away: "C", homeWin: false },
    { week: 4, home: "C", away: "B", homeWin: false },
    { week: 4, home: "B", away: "A", homeWin: false },
  ];

  it("fits sum-to-zero ratings with a positive effective sample and no existence violations", () => {
    const d = okData(
      evalDynamicBradleyTerry({ games: DYN, week: 3, bandwidth: 2, minGames: 6, minEffN: 1 }),
    );
    expect(d.week).toBe(3);
    expect(d.bandwidth).toBe(2);
    const values = Object.values(d.ratings);
    expect(values).toHaveLength(3);
    for (const v of values) expect(Number.isFinite(v)).toBe(true);
    expect(values.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 9);
    expect(d.effN).toBeGreaterThan(0);
    expect(d.existenceViolations).toEqual([]);
    expect(d.bandwidthScores.length).toBeGreaterThan(0);
    // A calendar of candidate bandwidths must surface at least one scored one.
    expect(d.bandwidthScores.every((s) => Number.isFinite(s.loo))).toBe(true);
  });

  it("fails closed when a team is ONE-SIDED: no finite MLE, and the last iterate is not returned", () => {
    // D wins every game it plays: it has weighted wins but no weighted losses.
    const oneSided = [
      { week: 1, home: "D", away: "A", homeWin: true },
      { week: 1, home: "D", away: "B", homeWin: true },
      { week: 1, home: "D", away: "C", homeWin: true },
      { week: 2, home: "A", away: "D", homeWin: false },
      { week: 2, home: "B", away: "D", homeWin: false },
      { week: 2, home: "C", away: "D", homeWin: false },
    ];
    const r = evalDynamicBradleyTerry({ games: oneSided, week: 2, bandwidth: 2, minGames: 4 });
    expect(failReason(r)).toContain("did not converge");
    expect(failReason(r)).toContain("D");
  });

  it("fail-closes below the minimum, on a zero bandwidth, and on a disconnected graph", () => {
    expect(failReason(evalDynamicBradleyTerry({ games: DYN, week: 3, bandwidth: 2, minGames: 50 }))).toContain(
      "need >= 50 observations, got 12",
    );
    expect(failReason(evalDynamicBradleyTerry({ games: DYN, week: 3, bandwidth: 0, minGames: 6 }))).toContain(
      "bandwidth must be finite and > 0",
    );
    // A-B and C-D: two components, no edge between them.
    const split = [
      { week: 1, home: "A", away: "B", homeWin: true },
      { week: 1, home: "B", away: "A", homeWin: false },
      { week: 1, home: "C", away: "D", homeWin: true },
      { week: 1, home: "D", away: "C", homeWin: false },
    ];
    expect(failReason(evalDynamicBradleyTerry({ games: split, week: 1, bandwidth: 2, minGames: 4 }))).toContain(
      "disconnected into 2 components",
    );
  });
});

// ── 6. Network rating ───────────────────────────────────────────────────────

describe("evalNetworkRating", () => {
  // 3-node connected weekly adjacency (row i -> row j weight).
  const ADJ = [
    [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
  ];

  it("updates prestige and returns a PageRank that sums to 1", () => {
    const d = okData(
      evalNetworkRating({
        ratings: [1, 0.5, 0.25],
        weekGames: [
          { winner: 0, loser: 1, margin: 7 },
          { winner: 1, loser: 2, margin: 3 },
          { winner: 2, loser: 0, margin: 14 },
        ],
        weeklyAdjacency: ADJ,
        minGames: 3,
      }),
    );
    expect(d.ratings).toHaveLength(3);
    for (const v of d.ratings) expect(Number.isFinite(v)).toBe(true);
    // log(1 + 7) for the probe margin.
    expect(d.marginWeight).toBeCloseTo(Math.log(8), 12);
    const psum = d.prestige.reduce((a, b) => a + b, 0);
    expect(psum).toBeCloseTo(1, 9);
    for (const p of d.prestige) expect(p).toBeGreaterThanOrEqual(0);
    // ratingToWinProb(0) is exactly a coin flip.
    expect(d.winProbAtDiff).toBeCloseTo(0.5, 12);
    // The prestige-flow update is not asserted zero-sum; its residual is published.
    expect(Number.isFinite(d.mirrorResidual)).toBe(true);
  });

  it("REPORTS a non-zero mirror residual: prestige flow is not a zero-sum operator", () => {
    const d = okData(
      evalNetworkRating({
        ratings: [2, 1, 0.5],
        weekGames: [
          { winner: 0, loser: 1, margin: 10 },
          { winner: 0, loser: 2, margin: 4 },
        ],
        weeklyAdjacency: ADJ,
        minGames: 2,
      }),
    );
    // The winner gains (loser_rating * w) while the loser only loses what the
    // WINNER is rated, so the update is not sign-symmetric. That is the reason
    // the residual is reported instead of gated.
    expect(d.mirrorResidual).toBeGreaterThan(0);
  });

  it("fail-closes on a tied margin, a bad index, and a ragged adjacency", () => {
    expect(
      failReason(
        evalNetworkRating({
          ratings: [1, 0.5],
          weekGames: [{ winner: 0, loser: 1, margin: 0 }],
          weeklyAdjacency: [
            [
              [0, 1],
              [1, 0],
            ],
          ],
          minGames: 1,
        }),
      ),
    ).toContain("margin must be finite and > 0");
    expect(
      failReason(
        evalNetworkRating({
          ratings: [1, 0.5],
          weekGames: [{ winner: 0, loser: 9, margin: 3 }],
          weeklyAdjacency: [
            [
              [0, 1],
              [1, 0],
            ],
          ],
          minGames: 1,
        }),
      ),
    ).toContain("outside the 2-node network");
    expect(
      failReason(
        evalNetworkRating({
          ratings: [1, 0.5],
          weekGames: [{ winner: 0, loser: 1, margin: 3 }],
          weeklyAdjacency: [[[0, 1, 0]]],
          minGames: 1,
        }),
      ),
    ).toContain("must be a 2x2 matrix");
  });
});

// ── 7. EB shrinkage ─────────────────────────────────────────────────────────

describe("evalEbShrink / evalEbShrinkMatrix", () => {
  it("shrinks a low-information team harder than a high-information one", () => {
    const d = okData(
      evalEbShrink({
        mle: { A: 1.2, B: 0.4, C: -0.6 },
        information: { A: 2, B: 0.5, C: 0.01 },
        totalGames: 16,
        strength: 1,
        minTeams: 3,
      }),
    );
    const f = d.diagonal.factors;
    // R_ii = 1 / (1 + A*N*info_i): more information -> smaller factor.
    expect(f.A).toBeLessThan(f.B as number);
    expect(f.B).toBeLessThan(f.C as number);
    // Verify the closed form exactly.
    expect(f.A).toBeCloseTo(1 / (1 + 1 * 16 * 2), 12);
    expect(f.C).toBeCloseTo(1 / (1 + 1 * 16 * 0.01), 12);
    for (const t of ["A", "B", "C"]) {
      expect(f[t]).toBeGreaterThanOrEqual(0);
      expect(f[t]).toBeLessThanOrEqual(1);
    }
    // The size of the correction is published, not hidden.
    expect(d.maxShift).toBeGreaterThan(0);
    expect(Number.isFinite(d.maxShift)).toBe(true);
  });

  it("a zero-information team lands exactly on the target (fully shrunk, not left at MLE)", () => {
    const d = okData(
      evalEbShrink({
        mle: { A: 2, B: 0 },
        information: { A: 0, B: 0 },
        totalGames: 8,
        minTeams: 2,
      }),
    );
    // R = 1/(1 + 0) = 1, so every team is the mean of the MLE vector = 1.
    expect(d.diagonal.shrunk.A).toBeCloseTo(1, 12);
    expect(d.diagonal.shrunk.B).toBeCloseTo(1, 12);
    expect(d.diagonal.target).toBeCloseTo(1, 12);
  });

  it("the full-matrix form reduces to the diagonal form on a diagonal Fisher block", () => {
    const mle = { A: 1.2, B: 0.4, C: -0.6 };
    const info = { A: 2, B: 0.5, C: 0.01 };
    const diag = okData(
      evalEbShrink({ mle, information: info, totalGames: 16, strength: 1, minTeams: 3 }),
    );
    const mat = okData(
      evalEbShrinkMatrix({
        mle,
        fisher: {
          A: { A: 2, B: 0, C: 0 },
          B: { A: 0, B: 0.5, C: 0 },
          C: { A: 0, B: 0, C: 0.01 },
        },
        totalGames: 16,
        strength: 1,
        minTeams: 3,
      }),
    );
    for (const t of ["A", "B", "C"]) {
      expect(mat.shrunk[t]).toBeCloseTo(diag.diagonal.shrunk[t] as number, 9);
    }
  });

  it("fail-closes on a NaN input rating, a missing information entry, and a singular Fisher block", () => {
    expect(
      failReason(
        evalEbShrink({ mle: { A: Number.NaN }, information: { A: 1 }, totalGames: 4, minTeams: 1 }),
      ),
    ).toContain("must be finite");
    expect(
      failReason(
        evalEbShrink({ mle: { A: 1, B: 1 }, information: { A: 1 }, totalGames: 4, minTeams: 2 }),
      ),
    ).toContain('information["B"]');
    expect(
      failReason(
        evalEbShrink({
          mle: { A: 1, B: 1 },
          information: { A: 1, B: 1 },
          totalGames: 0,
          minTeams: 2,
        }),
      ),
    ).toContain("totalGames must be a positive integer");
    // A rank-deficient Fisher block: M = I + A*N*S is made exactly singular by
    // choosing S = -I/(A*N), so invert() throws and no pinv is substituted.
    const r = evalEbShrinkMatrix({
      mle: { A: 1, B: 1 },
      fisher: { A: { A: -1, B: 0 }, B: { A: 0, B: -1 } },
      totalGames: 1,
      strength: 1,
      minTeams: 2,
    });
    const reason = failReason(r);
    expect(reason).toContain("singular");
    expect(reason).toContain("a pinv is not substituted");
  });
});
// ── 8. HFA bias audit ───────────────────────────────────────────────────────

describe("evalHfaBiasAudit", () => {
  // A CONNECTED slate where ALPHA is clearly strongest and the schedule is
  // deliberately unbalanced: strong teams host more.
  const HFA_GAMES = [
    { homeTeam: "A", awayTeam: "B", homeMargin: 20 },
    { homeTeam: "A", awayTeam: "C", homeMargin: 17 },
    { homeTeam: "A", awayTeam: "D", homeMargin: 25 },
    { homeTeam: "B", awayTeam: "A", homeMargin: -7 },
    { homeTeam: "B", awayTeam: "C", homeMargin: 9 },
    { homeTeam: "B", awayTeam: "D", homeMargin: 6 },
    { homeTeam: "C", awayTeam: "A", homeMargin: -12 },
    { homeTeam: "C", awayTeam: "B", homeMargin: -3 },
    { homeTeam: "C", awayTeam: "D", homeMargin: 8 },
    { homeTeam: "D", awayTeam: "A", homeMargin: -18 },
    { homeTeam: "D", awayTeam: "B", homeMargin: -4 },
    { homeTeam: "D", awayTeam: "C", homeMargin: -5 },
  ];

  it("runs all three estimators and the gap equals mixed minus unadjusted exactly", () => {
    const d = okData(evalHfaBiasAudit({ games: HFA_GAMES, minGames: 8 }));
    expect(d.games).toBe(12);
    expect(Number.isFinite(d.unadjusted)).toBe(true);
    expect(Number.isFinite(d.teamFixedEffectsGamma)).toBe(true);
    expect(Number.isFinite(d.mixedGamma)).toBe(true);
    expect(d.gap).toBeCloseTo(d.mixedGamma - d.unadjusted, 12);
    expect(d.sigmaE).toBeGreaterThan(0);
    expect(d.sigmaT).toBeGreaterThanOrEqual(0);
    expect(d.material).toBe(Math.abs(d.gap) >= 0.5);
  });

  it("unadjusted HFA on this unbalanced slate is biased ABOVE the team-FE estimate (paper's direction)", () => {
    const d = okData(evalHfaBiasAudit({ games: HFA_GAMES, minGames: 8 }));
    // A hosts 3 of 6 games and is the strongest team, so the fixed-HFA
    // specification absorbs E[theta_home - theta_away] and overstates.
    expect(d.unadjusted).toBeGreaterThan(d.teamFixedEffectsGamma);
  });

  it("the seeded simulator reproduces exactly for the same seed (no Math.random)", () => {
    const a = okData(
      evalHfaBiasAudit({ games: HFA_GAMES, minGames: 8, simulate: { seed: 12345 } }),
    );
    const b = okData(
      evalHfaBiasAudit({ games: HFA_GAMES, minGames: 8, simulate: { seed: 12345 } }),
    );
    expect(a.simulatedTrueGamma).toBe(b.simulatedTrueGamma);
    expect(a.simulatedUnadjusted).toBe(b.simulatedUnadjusted);
    expect(a.simulatedMixedGamma).toBe(b.simulatedMixedGamma);
    expect(a.simulatedGap).toBe(b.simulatedGap);
    // A DIFFERENT seed must give a different draw, or the "randomness" is fake.
    const c = okData(
      evalHfaBiasAudit({ games: HFA_GAMES, minGames: 8, simulate: { seed: 999 } }),
    );
    expect(c.simulatedUnadjusted).not.toBe(a.simulatedUnadjusted);
  });

  it("fail-closes below the minimum, on a non-finite margin, and on a disconnected slate", () => {
    expect(failReason(evalHfaBiasAudit({ games: HFA_GAMES, minGames: 20 }))).toContain(
      "need >= 20 observations, got 12",
    );
    const bad = HFA_GAMES.map((g, i) => (i === 0 ? { ...g, homeMargin: Number.NaN } : g));
    expect(failReason(evalHfaBiasAudit({ games: bad, minGames: 8 }))).toContain("homeMargin must be finite");
    // A-B and C-D: two components, so team strengths are not jointly identified.
    const split = [
      { homeTeam: "A", awayTeam: "B", homeMargin: 10 },
      { homeTeam: "B", awayTeam: "A", homeMargin: -10 },
      { homeTeam: "C", awayTeam: "D", homeMargin: 7 },
      { homeTeam: "D", awayTeam: "C", homeMargin: -7 },
    ];
    expect(failReason(evalHfaBiasAudit({ games: split, minGames: 4 }))).toContain(
      "disconnected into 2 components",
    );
  });
});

// ── 9. Least-squares ratings ────────────────────────────────────────────────

describe("evalLsRatings", () => {
  /**
   * CONNECTED round robin on point differentials.
   *
   * BUG NOTE (measured, not assumed): the module's `buildDesign` misfolds the
   * pinned-team row, so this solver does NOT reproduce the least-squares
   * solution of the model it documents. On the margin-antisymmetric slate
   * `LS_GAMES` below, where the true model has HFA exactly 0 and zero
   * residual, the module returns hfa = -1.0526315789473681 and
   * spreadMae = 1.3333333333333333. These tests therefore pin the OBSERVED
   * behaviour (and the residual asymmetry that exposes the defect) rather than
   * the behaviour the model implies. See the bug report; the bridge re-validates
   * but must not silently paper over a wrong kernel.
   */
  const LS_GAMES = [
    { home: "A", away: "B", homePoints: 27, awayPoints: 17 },
    { home: "B", away: "A", homePoints: 17, awayPoints: 27 },
    { home: "A", away: "C", homePoints: 30, awayPoints: 17 },
    { home: "C", away: "A", homePoints: 17, awayPoints: 30 },
    { home: "B", away: "C", homePoints: 23, awayPoints: 20 },
    { home: "C", away: "B", homePoints: 20, awayPoints: 23 },
  ];

  it("fits a connected slate: ratings are zero-sum, finite, and the spread is exact", () => {
    const d = okData(evalLsRatings({ games: LS_GAMES, minGames: 6, probe: ["A", "C"] }));
    expect(d.ols.teams).toEqual(["A", "B", "C"]);
    // Zero-sum identification is verified from the returned values.
    expect(d.sumRatings).toBeCloseTo(0, 9);
    const ia = d.ols.teams.indexOf("A");
    const ib = d.ols.teams.indexOf("B");
    const ic = d.ols.teams.indexOf("C");
    for (const v of d.ols.ratings) expect(Number.isFinite(v)).toBe(true);
    // Measured values of the shipped solver on this slate.
    expect(d.ols.ratings[ia] as number).toBeCloseTo(8.157894736842104, 9);
    expect(d.ols.ratings[ib] as number).toBeCloseTo(-1.8421052631578942, 9);
    expect(d.ols.ratings[ic] as number).toBeCloseTo(-6.315789473684211, 9);
    expect(d.ols.hfa).toBeCloseTo(-1.0526315789473681, 9);
    // predictSpread(A, C) = rA - rC + hfa, recomputed from the three numbers.
    const expectSpread =
      (d.ols.ratings[ia] as number) - (d.ols.ratings[ic] as number) + d.ols.hfa;
    expect(d.probeSpread).toBeCloseTo(expectSpread, 12);
    expect(d.probeSpread).toBeCloseTo(13.421052631578947, 9);
    // MEASURED BUG SIGNAL: this slate is margin-antisymmetric, so a correct LS
    // fit has spread MAE exactly 0. The solver leaves 1.3333, which is the
    // defect made visible. If the module is ever fixed this test must fail.
    expect(d.olsMae).toBeCloseTo(1.3333333333333333, 9);
    expect(d.olsMae).toBeGreaterThan(0);
    expect(d.olsViolationRate).toBeGreaterThanOrEqual(0);
    expect(d.olsViolationRate).toBeLessThanOrEqual(1);
  });

  it("residual asymmetry exposes the pinned-team design fold (C@A and C@B are worse)", () => {
    // Per-game residual: predictSpread - actual.
    const resid = (h: string, a: string, actual: number): number => {
      const d = okData(evalLsRatings({ games: LS_GAMES, minGames: 6, probe: [h, a] }));
      const ih = d.ols.teams.indexOf(h);
      const ia = d.ols.teams.indexOf(a);
      const pred = (d.ols.ratings[ih] as number) - (d.ols.ratings[ia] as number) + d.ols.hfa;
      return pred - actual;
    };
    // Measured: A@B -1.0526, B@A -1.0526, A@C +0.4211, C@A -2.5263.
    expect(resid("A", "B", 10)).toBeCloseTo(-1.0526315789473681, 9);
    expect(resid("B", "A", -10)).toBeCloseTo(-1.0526315789473681, 9);
    expect(resid("A", "C", 13)).toBeCloseTo(0.421052631578947, 9);
    // The pinned team is C (last in sorted order). Games where C is AWAY carry
    // a much larger residual than the mirrored game, which is the signature of
    // the row[ia] = -1 assignment overwriting the pinned-away fold.
    expect(Math.abs(resid("C", "A", -13))).toBeGreaterThan(Math.abs(resid("A", "C", 13)));
  });

  it("L1 ratings differ from OLS once a blowout enters the slate", () => {
    const withBlowout = [
      ...LS_GAMES,
      { home: "C", away: "A", homePoints: 59, awayPoints: 0 },
    ];
    const d = okData(evalLsRatings({ games: withBlowout, minGames: 6, probe: ["A", "C"] }));
    const ia = d.ols.teams.indexOf("A");
    const ic = d.ols.teams.indexOf("C");
    // Measured on this slate: OLS gap 1.2, L1 gap 12.42 — the blowout moves
    // the two estimators in opposite directions. Recorded, not asserted as a
    // robustness claim, because the solver defect confounds any such reading.
    const olsGap = (d.ols.ratings[ia] as number) - (d.ols.ratings[ic] as number);
    const l1Gap = (d.l1.ratings[ia] as number) - (d.l1.ratings[ic] as number);
    expect(olsGap).toBeCloseTo(1.1999999999999993, 9);
    expect(l1Gap).toBeCloseTo(12.416665485544254, 9);
    // The blowout is a real home-margin signal, so HFA moves off zero.
    expect(d.ols.hfa).toBeCloseTo(8.428571428571429, 9);
  });

  it("fail-closes on a disconnected slate, an unknown probe, and an HFA out of bounds", () => {
    // A-B and C-D are two components with no edge between them.
    const split = [
      { home: "A", away: "B", homePoints: 20, awayPoints: 10 },
      { home: "B", away: "A", homePoints: 10, awayPoints: 20 },
      { home: "C", away: "D", homePoints: 24, awayPoints: 14 },
      { home: "D", away: "C", homePoints: 14, awayPoints: 24 },
    ];
    expect(failReason(evalLsRatings({ games: split, minGames: 4, probe: ["A", "B"] }))).toContain(
      "disconnected into 2 components",
    );
    expect(
      failReason(evalLsRatings({ games: LS_GAMES, minGames: 6, probe: ["A", "GHOST"] })),
    ).toContain("not in the fitted team set");
    // The blowout slate carries a positive HFA of 8.43, so a 0.01 bound must
    // refuse it rather than clamp the coefficient back into range.
    const blowout = [
      ...LS_GAMES,
      { home: "C", away: "A", homePoints: 59, awayPoints: 0 },
    ];
    expect(
      failReason(evalLsRatings({ games: blowout, minGames: 6, probe: ["A", "C"], hfaBound: 0.01 })),
    ).toContain("exceeds the caller bound");
    // The antisymmetric slate has a NEGATIVE hfa, so a positive-only bound also refuses.
    expect(
      failReason(evalLsRatings({ games: LS_GAMES, minGames: 6, probe: ["A", "C"], hfaBound: 0.01 })),
    ).toContain("exceeds the caller bound");
  });
});

// ── 10. Matchup ratings ─────────────────────────────────────────────────────

describe("evalMatchupRatings", () => {
  // Deterministic fixture: two attackers, two defenders, weeks 1..4.
  const OBS = [
    { i: "WR1", j: "CB1", s: 1.2, t: 1 },
    { i: "WR1", j: "CB2", s: 0.4, t: 1 },
    { i: "WR2", j: "CB1", s: 0.5, t: 2 },
    { i: "WR2", j: "CB2", s: -0.3, t: 2 },
    { i: "WR1", j: "CB1", s: 1.5, t: 3 },
    { i: "WR2", j: "CB2", s: -0.1, t: 3 },
  ];

  it("fits a seeded, reproducible attack/defense decomposition with a bounded MAE", () => {
    const a = okData(
      evalMatchupRatings({
        obs: OBS,
        opts: { seed: 42, epochs: 300, lr: 0.05, lambda: 0.7 },
        minObs: 6,
        probe: ["WR1", "CB1"],
        maxMae: 5,
      }),
    );
    const b = okData(
      evalMatchupRatings({
        obs: OBS,
        opts: { seed: 42, epochs: 300, lr: 0.05, lambda: 0.7 },
        minObs: 6,
        probe: ["WR1", "CB1"],
        maxMae: 5,
      }),
    );
    // Same seed, same fit: no Math.random anywhere in the path.
    expect(a.intercept).toBe(b.intercept);
    expect(a.attack.WR1).toBe(b.attack.WR1);
    expect(a.inSampleMae).toBe(b.inSampleMae);
    expect(a.attackCount).toBe(2);
    expect(a.defenseCount).toBe(2);
    expect(Number.isFinite(a.probe)).toBe(true);
    for (const k of Object.keys(a.attack)) {
      expect(Number.isFinite(a.attack[k] as number)).toBe(true);
    }
  });

  it("a DIFFERENT seed must move the fit, or the seed is not wired through", () => {
    const a = okData(
      evalMatchupRatings({ obs: OBS, opts: { seed: 1, epochs: 300 }, minObs: 6, probe: ["WR1", "CB1"] }),
    );
    const b = okData(
      evalMatchupRatings({ obs: OBS, opts: { seed: 999, epochs: 300 }, minObs: 6, probe: ["WR1", "CB1"] }),
    );
    expect(a.attack.WR1).not.toBe(b.attack.WR1);
  });

  it("runs the strictly time-ordered backtest against the expanding-mean baseline", () => {
    const d = okData(
      evalMatchupRatings({
        obs: OBS,
        opts: { seed: 7, epochs: 200 },
        minObs: 6,
        probe: ["WR1", "CB1"],
        splitWeeks: [3],
      }),
    );
    expect(d.timeOrdered).toBeDefined();
    expect(d.timeOrdered?.model).toBeGreaterThanOrEqual(0);
    expect(d.timeOrdered?.baseline).toBeGreaterThanOrEqual(0);
  });

  it("fail-closes below the minimum, on a non-finite outcome, and on an unreachable MAE bound", () => {
    expect(failReason(evalMatchupRatings({ obs: OBS, minObs: 20, probe: ["WR1", "CB1"] }))).toContain(
      "need >= 20 observations, got 6",
    );
    const bad = OBS.map((o, i) => (i === 0 ? { ...o, s: Number.NaN } : o));
    expect(failReason(evalMatchupRatings({ obs: bad, minObs: 6, probe: ["WR1", "CB1"] }))).toContain(
      "must be finite",
    );
    expect(
      failReason(evalMatchupRatings({ obs: OBS, minObs: 6, probe: ["WR1", "CB1"], maxMae: 1e-9 })),
    ).toContain("exceeds the caller bound");
  });
});

// __APPEND__
