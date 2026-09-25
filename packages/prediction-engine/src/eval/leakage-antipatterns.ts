/**
 * Leakage anti-pattern test library (V1).
 *
 * Source: GreenCode, "I Trained AI to Predict Sports" — the honest retraction
 * of an 85% accuracy Elo-leakage model. Learn-only; no code copied.
 *
 * Three canonical leakage probes, each taking a feature-builder function and
 * a fixture dataset and returning { leaked: boolean, detail: string }.
 *
 * COMPOSES WITH: prereg-eval.ts (run probes as a prereg gate),
 * sealed-split.mjs (split discipline).
 */

export interface LeakageProbeResult {
  readonly name: string;
  readonly leaked: boolean;
  readonly detail: string;
}

export interface ProbeSuiteResult {
  readonly probes: readonly LeakageProbeResult[];
  readonly allClean: boolean;
}

// ── Fixture types ───────────────────────────────────────────────────────────

export interface FixtureGame {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly team: string;
  readonly opponent: string;
  readonly isHome: boolean;
  /** Team Elo/rating AFTER this game (used for future-Elo probe). */
  readonly ratingAfter: number;
  /** Team Elo/rating BEFORE this game (clean feature). */
  readonly ratingBefore: number;
  /** Snap share for the target week (must be computable from prior weeks only). */
  readonly snapShareCurrentWeek: number | null;
  /** Snap share from weeks strictly before target. */
  readonly snapSharePriorWeeks: number | null;
  /** Market spread sign convention: negative = home favored. */
  readonly marketSpread: number;
  /** Model's predicted margin (positive = home wins). */
  readonly predictedMargin: number;
  readonly label: 0 | 1;
}

export type FeatureBuilder = (games: readonly FixtureGame[]) => Record<string, number[]>;

// ── Probe 1: Future-Elo contamination ───────────────────────────────────────

/**
 * Future-Elo probe: feed a fixture where a team's rating is computed with and
 * without post-game information. Flags any feature whose value changes when
 * future games are included.
 */
export function futureEloProbe(
  featureBuilder: FeatureBuilder,
  cleanFixture: readonly FixtureGame[],
  contaminatedFixture: readonly FixtureGame[],
): LeakageProbeResult {
  const name = "future-elo-contamination";
  try {
    const cleanFeatures = featureBuilder(cleanFixture);
    const contaminatedFeatures = featureBuilder(contaminatedFixture);

    for (const key of Object.keys(cleanFeatures)) {
      const clean = cleanFeatures[key];
      const contaminated = contaminatedFeatures[key];
      if (!clean || !contaminated || clean.length !== contaminated.length) continue;
      for (let i = 0; i < clean.length; i++) {
        if (Math.abs(clean[i] - contaminated[i]) > 1e-9) {
          return {
            name,
            leaked: true,
            detail: `Feature "${key}"[${i}] changes (${clean[i]} → ${contaminated[i]}) when future games are included — future-Elo contamination.`,
          };
        }
      }
    }
    return { name, leaked: false, detail: "No feature changes when future games are included." };
  } catch (err) {
    return { name, leaked: true, detail: `Probe error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Probe 2: Current-week snap-share leakage ────────────────────────────────

/**
 * Current-week snap-share probe (TreMatt03 pattern):
 * availability/snap features must be computable from weeks strictly before
 * the target week. Any feature that uses current-week snap share is leaked.
 */
export function currentWeekSnapShareProbe(
  featureBuilder: FeatureBuilder,
  fixture: readonly FixtureGame[],
): LeakageProbeResult {
  const name = "current-week-snap-share";
  try {
    // Build features twice: once with current-week data, once without
    const withCurrent = featureBuilder(fixture);
    const withoutCurrent = featureBuilder(
      fixture.map((g) => ({ ...g, snapShareCurrentWeek: null })),
    );

    for (const key of Object.keys(withCurrent)) {
      const withC = withCurrent[key];
      const withoutC = withoutCurrent[key];
      if (!withC || !withoutC || withC.length !== withoutC.length) continue;
      for (let i = 0; i < withC.length; i++) {
        if (Math.abs(withC[i] - withoutC[i]) > 1e-9) {
          return {
            name,
            leaked: true,
            detail: `Feature "${key}"[${i}] changes (${withC[i]} → ${withoutC[i]}) when current-week snap share is removed — snap-share leakage.`,
          };
        }
      }
    }
    return { name, leaked: false, detail: "No feature depends on current-week snap share." };
  } catch (err) {
    return { name, leaked: true, detail: `Probe error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Probe 3: Sign-convention ────────────────────────────────────────────────

/**
 * Sign-convention probe (urwishpatel2003 lesson):
 * a fixture with a known spread-sign bug that falsely produced 86% backtest
 * accuracy. Asserts predicted sign matches the market's sign convention.
 *
 * Market convention: negative spread = home favored.
 * Model convention: positive predictedMargin = home wins.
 * The probe checks that predictedMargin and marketSpread have OPPOSITE signs
 * when both indicate the same winner (home favored by market AND model
 * predicts home win → spread < 0 AND margin > 0).
 */
export function signConventionProbe(fixture: readonly FixtureGame[]): LeakageProbeResult {
  const name = "sign-convention";
  try {
    for (const g of fixture) {
      // Convention: marketSpread < 0 = home favored. predictedMargin > 0 = home wins.
      // A sign-convention bug exists when predictedMargin and marketSpread share
      // the SAME sign despite representing the same directional expectation.
      // Example: model says home wins by 5 (margin=+5) but spread=+3 means
      // market has home as underdog — if the model "accurately" predicted this,
      // the signs are flipped somewhere.
      //
      // The simplest check: if |margin| and |spread| are both significant and
      // have the same sign, and the label matches the margin sign, the accuracy
      // is an artifact of a flipped convention.
      const sameSign = (g.predictedMargin > 0 && g.marketSpread > 0) ||
                       (g.predictedMargin < 0 && g.marketSpread < 0);
      const bothSignificant = Math.abs(g.predictedMargin) > 1 && Math.abs(g.marketSpread) > 1;

      if (sameSign && bothSignificant) {
        // Check if the "accuracy" is suspiciously high on same-sign games
        const modelSaysHome = g.predictedMargin > 0;
        const labelSaysHome = g.label === 1;
        if (modelSaysHome === labelSaysHome) {
          // Model is "right" AND signs match — this is the 86%-accuracy artifact
          return {
            name,
            leaked: true,
            detail: `Game ${g.gameId}: predictedMargin (${g.predictedMargin}) and marketSpread (${g.marketSpread}) share the same sign while the model appears accurate — spread-sign convention bug produces falsely high backtest accuracy.`,
          };
        }
      }
    }
    return { name, leaked: false, detail: "Sign convention is consistent across all fixture games." };
  } catch (err) {
    return { name, leaked: true, detail: `Probe error: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ── Run all probes ──────────────────────────────────────────────────────────

export function runAllProbes(
  featureBuilder: FeatureBuilder,
  cleanFixture: readonly FixtureGame[],
  contaminatedFixture: readonly FixtureGame[],
  signFixture: readonly FixtureGame[],
): ProbeSuiteResult {
  const probes = [
    futureEloProbe(featureBuilder, cleanFixture, contaminatedFixture),
    currentWeekSnapShareProbe(featureBuilder, cleanFixture),
    signConventionProbe(signFixture),
  ];
  const allClean = probes.every((p) => !p.leaked);
  return { probes, allClean };
}

/**
 * Fail loudly if any probe detects leakage. Call this as a prereg gate.
 */
export function assertNoLeakage(suite: ProbeSuiteResult): void {
  const leaked = suite.probes.filter((p) => p.leaked);
  if (leaked.length > 0) {
    const messages = leaked.map((p) => `${p.name}: ${p.detail}`).join("\n  ");
    throw new Error(`LEAKAGE DETECTED — ${leaked.length} probe(s) failed:\n  ${messages}`);
  }
}
