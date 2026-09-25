/**
 * Prereg leakage gate — runs V1 leakage anti-pattern probes as a hard
 * gate on model submissions and feature spaces.
 *
 * A submission that leaks future information is REJECTED, not warned.
 * This is the live call site for eval/leakage-antipatterns.
 */

import {
  runAllProbes,
  assertNoLeakage,
  type FeatureBuilder,
  type FixtureGame,
  type ProbeSuiteResult,
} from "@sports/prediction-engine";

export type LeakageGateResult =
  | { readonly ok: true; readonly suite: ProbeSuiteResult }
  | {
      readonly ok: false;
      readonly suite: ProbeSuiteResult;
      readonly failures: readonly string[];
      readonly reason: string;
    };

/**
 * Run the full V1 probe suite. Fail-closed: any leaked probe rejects.
 */
export function runLeakageGate(input: {
  readonly featureBuilder: FeatureBuilder;
  readonly cleanFixture: readonly FixtureGame[];
  readonly contaminatedFixture: readonly FixtureGame[];
  readonly signFixture: readonly FixtureGame[];
}): LeakageGateResult {
  try {
    const suite = runAllProbes(
      input.featureBuilder,
      input.cleanFixture,
      input.contaminatedFixture,
      input.signFixture,
    );
    const failures = suite.probes.filter((p) => p.leaked).map((p) => `${p.name}: ${p.detail}`);
    if (failures.length > 0) {
      return {
        ok: false,
        suite,
        failures,
        reason: `LEAKAGE DETECTED — ${failures.length} probe(s) failed. Submission rejected.`,
      };
    }
    return { ok: true, suite };
  } catch (err) {
    return {
      ok: false,
      suite: { probes: [], allClean: false },
      failures: [err instanceof Error ? err.message : String(err)],
      reason: "leakage gate threw — fail-closed",
    };
  }
}

/**
 * Hard assert used by prereg / submission paths. Throws on any leak.
 */
export function assertLeakageGate(input: {
  readonly featureBuilder: FeatureBuilder;
  readonly cleanFixture: readonly FixtureGame[];
  readonly contaminatedFixture: readonly FixtureGame[];
  readonly signFixture: readonly FixtureGame[];
}): ProbeSuiteResult {
  const suite = runAllProbes(
    input.featureBuilder,
    input.cleanFixture,
    input.contaminatedFixture,
    input.signFixture,
  );
  assertNoLeakage(suite);
  return suite;
}

/**
 * Build a minimal FixtureGame for leakage probes from raw team game rows.
 * Missing fields stay at the safe default — never invented from future data.
 */
export function fixtureFromGameRows(
  rows: readonly {
    readonly gameId: string;
    readonly season: number;
    readonly week: number;
    readonly team: string;
    readonly opponent: string;
    readonly isHome: boolean;
    readonly ratingBefore: number | null;
    readonly ratingAfter: number | null;
    readonly snapSharePriorWeeks: number | null;
    readonly snapShareCurrentWeek: number | null;
    readonly marketSpread: number;
    readonly predictedMargin: number;
    readonly label: 0 | 1;
  }[],
): FixtureGame[] {
  return rows.map((r) => ({
    gameId: r.gameId,
    season: r.season,
    week: r.week,
    team: r.team,
    opponent: r.opponent,
    isHome: r.isHome,
    ratingAfter: r.ratingAfter ?? 1500,
    ratingBefore: r.ratingBefore ?? 1500,
    snapShareCurrentWeek: r.snapShareCurrentWeek,
    snapSharePriorWeeks: r.snapSharePriorWeeks,
    marketSpread: r.marketSpread,
    predictedMargin: r.predictedMargin,
    label: r.label,
  }));
}

export { runAllProbes, assertNoLeakage };
export type { FeatureBuilder, FixtureGame, ProbeSuiteResult };

export type LeakageQualityFactor = {
  readonly name: string;
  readonly impact: "positive" | "negative" | "neutral";
  readonly description: string;
  readonly weight: number;
  readonly ran: boolean;
  readonly clean: boolean | null;
};

/**
 * Slate-level quality factor. Fail-open: when fixtures are missing the gate
 * does not run and the factor says so — never claims clean. When it runs,
 * a leak is a negative factor (never a silent pass).
 */
export function evalLeakageQuality(input: {
  readonly featureBuilder?: FeatureBuilder;
  readonly cleanFixture?: readonly FixtureGame[];
  readonly contaminatedFixture?: readonly FixtureGame[];
  readonly signFixture?: readonly FixtureGame[];
}): LeakageQualityFactor {
  const { featureBuilder, cleanFixture, contaminatedFixture, signFixture } = input;
  if (
    featureBuilder == null ||
    cleanFixture == null ||
    cleanFixture.length === 0 ||
    contaminatedFixture == null ||
    contaminatedFixture.length === 0 ||
    signFixture == null ||
    signFixture.length === 0
  ) {
    return {
      name: "Leakage gate",
      impact: "neutral",
      description: "Leakage gate not run — fixtures unavailable. Not a clean bill.",
      weight: 0,
      ran: false,
      clean: null,
    };
  }
  const r = runLeakageGate({
    featureBuilder,
    cleanFixture,
    contaminatedFixture,
    signFixture,
  });
  if (r.ok) {
    return {
      name: "Leakage gate",
      impact: "positive",
      description: `V1 probes clean (${r.suite.probes.length} probes).`,
      weight: 2,
      ran: true,
      clean: true,
    };
  }
  return {
    name: "Leakage gate",
    impact: "negative",
    description: r.reason,
    weight: 10,
    ran: true,
    clean: false,
  };
}

/**
 * Submission-path hard gate. Throws on any leak. Never used on the live
 * slate — that path fail-opens with a factor via evalLeakageQuality.
 */
export function assertSubmissionLeakage(input: {
  readonly featureBuilder: FeatureBuilder;
  readonly cleanFixture: readonly FixtureGame[];
  readonly contaminatedFixture: readonly FixtureGame[];
  readonly signFixture: readonly FixtureGame[];
}): ProbeSuiteResult {
  return assertLeakageGate(input);
}
