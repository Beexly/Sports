/**
 * The corroboration gate — one interface, many signals, fail-safe by construction.
 *
 * WHAT THIS IS. A second, tougher gate that runs AFTER the engine has already
 * decided what it likes. It reads independent evidence about a candidate pick —
 * rest and travel, market movement, beat/coach reporting, prop alignment,
 * scheme matchup, narrative and contract incentives — and answers one question:
 * does the evidence CORROBORATE the side the engine chose, or not?
 *
 * WHAT IT IS NOT, and this is the load-bearing part.
 *
 *   It does not score. It does not rank. It does not change a selection, a
 *   line, a confidence, or a probability. It cannot turn a pick into a
 *   different pick. MODEL_VERSION is untouched and the scoring math in
 *   packages/prediction-engine is untouched, because nothing here feeds it.
 *
 *   Its ONLY power is to withhold publication. A gate that can only remove is
 *   a gate whose worst failure is silence: a noisy signal costs us picks we
 *   would have published, never a pick we would not have. That asymmetry is
 *   deliberate and must survive every future edit to this module. If someone
 *   later wants a signal to ADD conviction, that is a scoring change, it needs
 *   a MODEL_VERSION bump and a calibration pass, and it does not belong here.
 *
 * ABSENT DATA IS NOT EVIDENCE. Every signal returns `null` when it has nothing
 * real to say, and `null` is never read as agreement, never as disagreement,
 * and never as zero. A signal that cannot see the data does not get a vote.
 * This is the same contract lib/nba/rest.ts uses ("null, never 0") and it is
 * the reason this module can ship before its data sources do: an unwired
 * signal is inert, not wrong.
 *
 * NOTHING HERE MAY FABRICATE. No signal may estimate, impute, average, or
 * default a value it did not read from a real source. A narrative signal with
 * no narrative feed returns null forever until someone wires a real one.
 *
 * HOW THE VERDICT IS REACHED. Conjunction over the signals that actually fired:
 *
 *   - Any signal returning CONTRADICTS holds the pick. One credible piece of
 *     evidence against our side is enough; we are not looking for a majority.
 *   - Otherwise the pick needs at least `minCorroborations` signals returning
 *     CONFIRMS to publish.
 *   - A pick with no signals firing at all is HELD when `requireEvidence` is
 *     on, and passed through untouched when it is off. Off is the default so
 *     that wiring this module changes nothing until an operator turns the
 *     requirement on deliberately.
 *
 * Every verdict carries its reasons in plain language, because a held pick has
 * to be able to tell a reader why — "a held row is not a blank, it is the
 * finding".
 */

/** One signal's read on whether the evidence backs the engine's side. */
export type SignalVerdict = "CONFIRMS" | "CONTRADICTS" | "NEUTRAL";

/** Every signal this gate knows how to consult. */
export type SignalKey =
  | "rest-travel"
  | "market-movement"
  | "book-agreement"
  | "beat-report"
  | "prop-alignment"
  | "scheme-matchup"
  | "narrative-incentive";

/**
 * A signal's answer. `null` from a signal function means "I have no real data",
 * which is different from NEUTRAL ("I looked and it is a wash").
 */
export type SignalRead = {
  readonly key: SignalKey;
  readonly verdict: SignalVerdict;
  /**
   * Plain-language reason a reader could act on. Required: a verdict with no
   * statable reason is not evidence, it is an assertion.
   */
  readonly reason: string;
  /**
   * What this read was computed from, so a claim can be traced. Free text but
   * must name a real source (e.g. "ESPN schedule", "odds_line_snapshots").
   */
  readonly basis: string;
  /**
   * 0-1. How much of the signal's own ideal evidence was actually present.
   * A partial read still votes, but it is recorded as partial.
   */
  readonly completeness: number;
};

/** The candidate the gate is asked about. Read-only; the gate never mutates it. */
export type GateCandidate = {
  readonly gameId: string;
  readonly sportKey: string;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly commenceTime: Date;
  readonly pickType: "MONEYLINE" | "SPREAD" | "TOTAL";
  /** The engine's chosen selection text, verbatim. */
  readonly selection: string;
  /**
   * Which side the engine took, normalised so signals do not have to parse
   * selection text. "home"/"away" for moneyline and spread; "over"/"under" for
   * totals. Null when it cannot be determined — signals that need a side then
   * return null rather than guessing.
   */
  readonly side: "home" | "away" | "over" | "under" | null;
  /** The posted line, when the market has one. Null on a model-signal row. */
  readonly line: number | null;
};

/**
 * A signal function: candidate in, read out, or null when it has no data.
 *
 * `signalKey` is optional and exists so a SILENT signal can still be named. A
 * read carries its own key, but a null does not, so without this a blind
 * signal would vanish from the verdict entirely and a held pick could not tell
 * a reader which evidence was missing rather than absent. A signal that does
 * not declare its key still works; it simply cannot be listed in `silent`.
 */
export type SignalFn = ((
  candidate: GateCandidate,
) => Promise<SignalRead | null> | SignalRead | null) & {
  readonly signalKey?: SignalKey;
};

/** Attach a key to a signal function so the gate can name it when it is silent. */
export function withSignalKey(key: SignalKey, fn: SignalFn): SignalFn {
  return Object.assign(fn.bind(null) as SignalFn, { signalKey: key });
}

export type GateOptions = {
  /**
   * How many CONFIRMS are needed to publish. Default 1 — a single piece of real
   * corroborating evidence. Raise it as signals come online.
   */
  readonly minCorroborations?: number;
  /**
   * When true, a candidate no signal could read is HELD. Default FALSE, so
   * wiring this gate is a no-op until an operator asks for the stricter
   * posture. Turning it on is a product decision, not a code decision.
   */
  readonly requireEvidence?: boolean;
};

export type GateVerdict = {
  readonly publish: boolean;
  /** Every read that fired, in the order the signals were consulted. */
  readonly reads: readonly SignalRead[];
  /** Signals that returned null, i.e. had no real data. Named, never hidden. */
  readonly silent: readonly SignalKey[];
  readonly confirmations: number;
  readonly contradictions: number;
  /** One plain sentence a reader can be shown when a pick is held. */
  readonly summary: string;
};

export const DEFAULT_MIN_CORROBORATIONS = 1;

/**
 * Run the signals and reach a verdict.
 *
 * Signals are consulted independently and a throw is treated as silence, not
 * as evidence: a broken signal must never be able to publish a pick, and must
 * never be able to hold the whole board either. It simply does not vote.
 */
export async function evaluateGate(
  candidate: GateCandidate,
  signals: readonly SignalFn[],
  options: GateOptions = {},
): Promise<GateVerdict> {
  const minCorroborations = options.minCorroborations ?? DEFAULT_MIN_CORROBORATIONS;
  const requireEvidence = options.requireEvidence ?? false;

  const reads: SignalRead[] = [];
  const silent: SignalKey[] = [];

  for (const signal of signals) {
    let read: SignalRead | null = null;
    try {
      read = await signal(candidate);
    } catch {
      read = null; // a broken signal is silent, never evidence
    }
    if (read === null) {
      // Name it when it declared a key. A signal that could not see its data is
      // part of the finding — a held pick has to be able to say what was blind,
      // not just what spoke.
      if (signal.signalKey) silent.push(signal.signalKey);
      continue;
    }
    reads.push(read);
  }

  const contradictions = reads.filter((r) => r.verdict === "CONTRADICTS").length;
  const confirmations = reads.filter((r) => r.verdict === "CONFIRMS").length;

  if (contradictions > 0) {
    const against = reads.filter((r) => r.verdict === "CONTRADICTS");
    return {
      publish: false,
      reads,
      silent,
      confirmations,
      contradictions,
      summary: against.map((r) => r.reason).join(" "),
    };
  }

  if (reads.length === 0) {
    return {
      publish: !requireEvidence,
      reads,
      silent,
      confirmations: 0,
      contradictions: 0,
      summary: requireEvidence
        ? "No independent evidence was available for this game, so we are not publishing a read on it."
        : "No independent evidence was available for this game.",
    };
  }

  if (confirmations >= minCorroborations) {
    return {
      publish: true,
      reads,
      silent,
      confirmations,
      contradictions: 0,
      summary: reads
        .filter((r) => r.verdict === "CONFIRMS")
        .map((r) => r.reason)
        .join(" "),
    };
  }

  return {
    publish: false,
    reads,
    silent,
    confirmations,
    contradictions: 0,
    summary: `We looked but nothing independent backed this side (${confirmations} of ${minCorroborations} needed).`,
  };
}
