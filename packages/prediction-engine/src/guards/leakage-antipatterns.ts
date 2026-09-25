/**
 * Leakage Anti-Pattern Probe Library (BUILD V1, agent-bus handoff v3 8221adb)
 *
 * Three executable probes for the leakage classes that produced real, retracted
 * false edges in public sports models:
 *
 *   1. FUTURE-ELO          — a rating computed with post-game information folded
 *                             into its own inputs. GreenCode's classifier reached
 *                             "insane 85% accuracy" this way and retracted it on
 *                             camera with corrected code.
 *   2. CURRENT-WEEK SNAP   — availability / snap-share features computed from
 *                             games inside the target week. The TreMatt03 pattern:
 *                             those features must be derivable from weeks strictly
 *                             before the target week.
 *   3. SIGN-CONVENTION     — a spread-sign bug that fabricates backtest accuracy.
 *                             The urwishpatel2003 lesson: a flipped sign produced
 *                             ~86% accuracy, which is the tell, not the feature.
 *
 * These are PROBES, not a pass/fail on a model's quality. A probe answers one
 * question — "could this feature have been computed without the future?" — and
 * the caller decides. `runAllProbes` exists so a prereg gate can run the whole
 * set in one call and fail loudly rather than silently.
 *
 * Learn-only. No upstream code was ported: the retracted classifier's source was
 * never published, and the other two patterns are described rather than coded.
 * New file — composes with nothing, so nothing regresses.
 *
 * Honest limits, stated up front:
 *  - These probes can only see what a caller declares. A feature built from
 *    leaked data and presented as clean passes these probes; nothing here can
 *    detect a lie, only a structural mistake.
 *  - The sign-convention probe compares against a caller-supplied market
 *    convention. It cannot know which convention is right, only whether the
 *    model agrees with the one it was told to use.
 */

export type ProbeResult = {
  readonly name: string;
  readonly leaked: boolean;
  readonly detail: string;
};

export type ProbeOutcome = { readonly probes: readonly ProbeResult[] };

/* ------------------------------------------------------------------ *
 * 1. Future-Elo probe
 * ------------------------------------------------------------------ */

/** A single game's identity and temporal position, as the probe needs it. */
export type EloGame = {
  readonly id: string;
  readonly season: number;
  readonly week: number;
  /** Season, week, and absolute game index, so "after this game" is decidable. */
  readonly playedAt: number;
};

export type FutureEloFixture = {
  /**
   * A feature builder. Given a list of games it MUST return ratings computed
   * from the games passed in and nothing else.
   */
  readonly buildRatings: (games: readonly EloGame[]) => Readonly<Record<string, number>>;
  /** Every game in the dataset, ordered by `playedAt`. */
  readonly games: readonly EloGame[];
  /** The game whose features are being checked. */
  readonly targetGameId: string;
  /**
   * Games that occurred at or before the target. The clean build gets these.
   * The contaminated build gets everything.
   */
  readonly historyBefore: readonly EloGame[];
};

export function futureEloProbe(fixture: FutureEloFixture): ProbeResult {
  const name = "future-elo";
  const { buildRatings, games, targetGameId, historyBefore } = fixture;

  if (games.length === 0) {
    return { name, leaked: false, detail: "no games in fixture; nothing to test" };
  }

  const target = games.find((g) => g.id === targetGameId);
  if (!target) {
    return { name, leaked: false, detail: `target game ${targetGameId} not in fixture; nothing to test` };
  }

  const futureGames = games.filter((g) => g.playedAt > target.playedAt);
  if (futureGames.length === 0) {
    return {
      name,
      leaked: false,
      detail: `no games after ${targetGameId}; a rating cannot leak forward info that does not exist`,
    };
  }

  // A builder that honours its contract returns IDENTICAL ratings for the
  // entities present in both calls, because the extra games are not inputs it
  // can see.
  //
  // Only keys present in BOTH results are compared. A prefix legitimately
  // contains fewer entities than the full set, so a key that appears in one
  // result and not the other is not evidence of anything — a builder that rates
  // a team from its history has no rating for a team with no history. Comparing
  // key SETS instead would flag every well-behaved per-entity builder and train
  // callers to ignore the probe.
  const fromHistory = buildRatings(historyBefore);
  const fromAll = buildRatings(games);

  const drifted: string[] = [];
  for (const team of Object.keys(fromHistory)) {
    if (!(team in fromAll)) continue;
    const before = fromHistory[team];
    const after = fromAll[team];
    if (before !== after) {
      drifted.push(`${team}(${fmt(before)}->${fmt(after)})`);
    }
  }

  if (drifted.length > 0) {
    return {
      name,
      leaked: true,
      detail:
        `ratings for ${targetGameId} changed when ${futureGames.length} post-game ` +
        `record(s) were present, so the feature saw the future: ${drifted.join(", ")}`,
    };
  }

  return {
    name,
    leaked: false,
    detail: `ratings identical with and without ${futureGames.length} post-game record(s)`,
  };
}

/* ------------------------------------------------------------------ *
 * 2. Current-week snap-share probe
 * ------------------------------------------------------------------ */

export type SnapWeek = {
  readonly season: number;
  readonly week: number;
  readonly availability: Readonly<Record<string, number>>;
};

export type SnapShareFixture = {
  /**
   * A feature builder. Given the full timeline and a target week, it MUST build
   * snap/availability features from weeks STRICTLY BEFORE the target. The probe
   * never withholds the target week from the input — withholding it would only
   * prove the builder is deterministic. Instead it perturbs the target week's
   * data and checks the output does not move.
   */
  readonly buildFeatures: (weeks: readonly SnapWeek[], target: { season: number; week: number }) => Readonly<
    Record<string, number>
  >;
  readonly weeks: readonly SnapWeek[];
  readonly targetSeason: number;
  readonly targetWeek: number;
};

export function currentWeekSnapShareProbe(fixture: SnapShareFixture): ProbeResult {
  const name = "current-week-snap-share";
  const { buildFeatures, weeks, targetSeason, targetWeek } = fixture;

  if (weeks.length === 0) {
    return { name, leaked: false, detail: "no weeks in fixture; nothing to test" };
  }

  const targetWeeks = weeks.filter((w) => isAtOrBefore(w, targetSeason, targetWeek) && !isStrictlyBefore(w, targetSeason, targetWeek));
  if (targetWeeks.length === 0) {
    return {
      name,
      leaked: false,
      detail: `no week exists at ${targetSeason} week ${targetWeek}; nothing to test`,
    };
  }

  // Perturbation, not truncation. Change the target week's own availability and
  // see whether the features move. A builder reading only prior weeks cannot
  // see the change; one reading the target week must.
  const perturbed = weeks.map((w) =>
    isStrictlyBefore(w, targetSeason, targetWeek) || !isAtOrBefore(w, targetSeason, targetWeek)
      ? w
      : { ...w, availability: perturbAvailability(w.availability) },
  );

  const base = buildFeatures(weeks, { season: targetSeason, week: targetWeek });
  const after = buildFeatures(perturbed, { season: targetSeason, week: targetWeek });

  const moved: string[] = [];
  for (const key of Object.keys(base)) {
    if (after[key] !== base[key]) {
      moved.push(`${key}(${fmt(base[key])}->${fmt(after[key])})`);
    }
  }
  // A feature that only appears once the target week is perturbed is also a
  // dependency on data the builder should not have read.
  for (const key of Object.keys(after)) {
    if (!(key in base)) moved.push(`${key}(absent->${fmt(after[key])})`);
  }

  if (moved.length > 0) {
    return {
      name,
      leaked: true,
      detail:
        `snap/availability features for ${targetSeason} week ${targetWeek} changed when ONLY the target ` +
        `week's data was altered, so they are not computable from prior weeks: ${moved.join(", ")}`,
    };
  }

  return {
    name,
    leaked: false,
    detail: `features for ${targetSeason} week ${targetWeek} unaffected by target-week-only changes`,
  };
}

/* ------------------------------------------------------------------ *
 * 3. Sign-convention probe
 * ------------------------------------------------------------------ */

export type SignFixture = {
  readonly home: string;
  readonly away: string;
  /**
   * Market spread under the convention the model claims to use. Positive means
   * the HOME team is favoured by that many points.
   */
  readonly marketSpreadHome: number;
  /** The model's own predicted spread, in the same declared convention. */
  readonly modelSpreadHome: number;
  /** The convention the model says it follows. */
  readonly declaredConvention: "home-positive" | "home-negative";
  /** How close two spreads must be to count as the same sign. */
  readonly tolerance?: number;
};

export function signConventionProbe(fixture: SignFixture): ProbeResult {
  const name = "sign-convention";
  const {
    home,
    away,
    marketSpreadHome,
    modelSpreadHome,
    declaredConvention,
    tolerance = 1e-9,
  } = fixture;

  if (!Number.isFinite(marketSpreadHome) || !Number.isFinite(modelSpreadHome)) {
    return { name, leaked: true, detail: `non-finite spread for ${home} vs ${away}` };
  }

  if (Math.abs(modelSpreadHome) <= tolerance) {
    // A zero spread has no sign to get wrong; not a violation, but worth naming.
    return { name, leaked: false, detail: `model spread is exactly 0 for ${home} vs ${away}; sign check not applicable` };
  }

  const expectedSign = declaredConvention === "home-positive" ? 1 : -1;
  const actualSign = Math.sign(modelSpreadHome);
  const marketSign = Math.sign(marketSpreadHome);

  if (actualSign !== expectedSign) {
    return {
      name,
      leaked: true,
      detail:
        `model spread ${fmt(modelSpreadHome)} contradicts its declared ${declaredConvention} convention ` +
        `(expected sign ${expectedSign > 0 ? "+" : "-"}); a flipped sign is the classic false-accuracy bug`,
    };
  }

  if (marketSign !== 0 && marketSign !== actualSign) {
    return {
      name,
      leaked: true,
      detail:
        `model spread ${fmt(modelSpreadHome)} and market spread ${fmt(marketSpreadHome)} for ` +
        `${home} vs ${away} have opposite signs, so grading against this market would be inverted`,
    };
  }

  return {
    name,
    leaked: false,
    detail: `model and market agree on sign for ${home} vs ${away} under ${declaredConvention}`,
  };
}

/* ------------------------------------------------------------------ *
 * Runner
 * ------------------------------------------------------------------ */

/**
 * Run every probe over the fixtures supplied and return all results. Probes
 * with no fixture are reported as not-leaked, so the returned list always
 * covers the full set and a caller can assert on it.
 */
export function runAllProbes(fixtures: {
  readonly futureElo?: FutureEloFixture;
  readonly snapShare?: SnapShareFixture;
  readonly sign?: SignFixture;
}): ProbeOutcome {
  const probes: ProbeResult[] = [
    fixtures.futureElo
      ? futureEloProbe(fixtures.futureElo)
      : skipped("future-elo", "no fixture supplied"),
    fixtures.snapShare
      ? currentWeekSnapShareProbe(fixtures.snapShare)
      : skipped("current-week-snap-share", "no fixture supplied"),
    fixtures.sign ? signConventionProbe(fixtures.sign) : skipped("sign-convention", "no fixture supplied"),
  ];
  return { probes };
}

/**
 * Run every probe and throw if any of them found leakage. For use as a prereg
 * gate: a leak is a hard stop, not a warning, because a leaky backtest number
 * is worse than no number at all.
 */
export function assertNoLeakage(fixtures: Parameters<typeof runAllProbes>[0]): ProbeOutcome {
  const outcome = runAllProbes(fixtures);
  const leaks = outcome.probes.filter((p) => p.leaked);
  if (leaks.length > 0) {
    const lines = leaks.map((p) => `  [${p.name}] ${p.detail}`).join("\n");
    throw new Error(`leakage detected in ${leaks.length} probe(s):\n${lines}`);
  }
  return outcome;
}

export function leakedProbes(outcome: ProbeOutcome): readonly ProbeResult[] {
  return outcome.probes.filter((p) => p.leaked);
}

/* ------------------------------------------------------------------ *
 * Internals
 * ------------------------------------------------------------------ */

function skipped(name: string, detail: string): ProbeResult {
  return { name, leaked: false, detail };
}

function isStrictlyBefore(w: SnapWeek, season: number, week: number): boolean {
  if (w.season < season) return true;
  if (w.season > season) return false;
  return w.week < week;
}

function isAtOrBefore(w: SnapWeek, season: number, week: number): boolean {
  if (w.season < season) return true;
  if (w.season > season) return false;
  return w.week <= week;
}

/**
 * Deterministically alter every availability value, staying inside [0, 1] so a
 * perturbed fixture stays physically plausible. Uses a fixed transform rather
 * than a random one so a failing probe is reproducible.
 */
function perturbAvailability(availability: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [player, share] of Object.entries(availability)) {
    out[player] = share >= 0.5 ? Math.max(0, share - 0.25) : Math.min(1, share + 0.25);
  }
  return out;
}

function fmt(n: number | undefined): string {
  return n === undefined ? "undefined" : String(Number(n.toFixed(6)));
}
