/**
 * Local as-of tripwire. Mirrors AsOfFeatureStore.assertNoLookahead
 * (asof-store.ts:184) for sources that never go through FeatureStore.get:
 * fetchMlbStandings (season-only, no date) and the NFL EPA whole-season
 * aggregate. Throws rather than returning a number.
 */

export class ObservedAfterDecisionError extends Error {
  readonly source: string;
  constructor(source: string, observedAt: Date, decisionAt: Date) {
    super(
      `${source}: observedAt ${observedAt.toISOString()} is after decisionAt ${decisionAt.toISOString()}`,
    );
    this.name = "ObservedAfterDecisionError";
    this.source = source;
  }
}

export class SourceCannotSpeakAsOfError extends Error {
  readonly source: string;
  constructor(source: string) {
    super(`${source} has no observation time and cannot answer as-of`);
    this.name = "SourceCannotSpeakAsOfError";
    this.source = source;
  }
}

/**
 * Season-only sources pass observedAt = null and always throw.
 * A dated source throws when observedAt > decisionAt.
 * Do not catch this to return a fabricated probability.
 */
export function assertObservedAtOrBefore(args: {
  readonly source: string;
  readonly decisionAt: Date;
  readonly observedAt: Date | null;
}): void {
  const { source, decisionAt, observedAt } = args;
  if (observedAt == null) {
    throw new SourceCannotSpeakAsOfError(source);
  }
  if (observedAt.getTime() > decisionAt.getTime()) {
    throw new ObservedAfterDecisionError(source, observedAt, decisionAt);
  }
}
