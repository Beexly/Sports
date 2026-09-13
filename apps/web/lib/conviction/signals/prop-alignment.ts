/**
 * PROP ALIGNMENT — do the day's player props agree with the side we took?
 *
 * WIRED BUT INERT TODAY. This signal returns `null` on every candidate until a
 * founder flips `EVENT_ODDS_INGEST_ENABLED=true` (AGENTS.md records it as an
 * open founder env action, NOT flipped) so that real prop lines persist in
 * `OddsLineSnapshot`, and a caller then constructs it with `live: true`. Until
 * both of those are true it is a no-op: it cannot hold a pick and it cannot
 * publish one.
 *
 * THE IDEA. A game total, a team total and a spread all imply a scoring level.
 * The player props for that same game imply one too: if every passing, rushing
 * and receiving line is set BELOW that player's recent baseline, the prop
 * market is pricing a low-scoring game. If we took the OVER on the total, the
 * props contradict us. If they skew above baseline, they corroborate us. The
 * same read, split by team, says whether one offence is being priced up
 * relative to the other, which is what a spread is about.
 *
 * WHAT IT MAY NEVER DO (gate-contract.ts, verbatim obligations):
 *   - It may only help WITHHOLD publication. It never adds conviction, never
 *     changes a selection, a line, a probability or MODEL_VERSION.
 *   - It returns `null` whenever it has nothing real to say. `null` is not
 *     agreement, not disagreement and not zero.
 *   - It NEVER estimates a missing value. A prop whose `baseline` is null is
 *     EXCLUDED from the aggregate — not treated as 0, not treated as "matches
 *     the line". A baseline we did not read is a baseline we do not have.
 *
 * NEVER LET ILLUSTRATIVE PROPS REACH THIS SIGNAL. `apps/web/lib/fantasy/props.ts`
 * carries a sample pool with fictional players (e.g. "Silas Hart") for UI
 * demonstration. Those rows are NOT market data and must never be passed to
 * `loadProps`. The `live` flag exists precisely so that a wiring mistake fails
 * closed: with `live:false` this signal returns null no matter what facts are
 * handed to it. A caller that wires the sample pool into the live path is
 * fabricating product data (AGENTS.md law 8), not configuring a feature.
 *
 * WHAT TURNS IT LIVE (both, in order):
 *   1. Founder sets `EVENT_ODDS_INGEST_ENABLED=true` (and `LINE_ARCHIVE_ENABLED=true`
 *      so the lines are archived) in Vercel Production.
 *   2. A caller loads real persisted prop lines plus each player's recent
 *      per-market average and constructs this signal with `live: true`.
 *
 * No network and no database access lives in this module: the caller injects
 * `loadProps`, which keeps the signal unit-testable and keeps the data-source
 * decision (and its clearance) with the code that owns it.
 */

import type { GateCandidate, SignalFn, SignalRead } from "../gate-contract";

/**
 * One player prop line for a game.
 *
 * `baseline` is the player's recent average for THAT market (e.g. receiving
 * yards over their last games). It is `number | null`: null means we could not
 * read a baseline, and a prop with no baseline cannot be compared to anything.
 */
export type GameProp = {
  readonly player: string;
  readonly team: string;
  readonly market: string;
  readonly line: number;
  readonly baseline: number | null;
  readonly source: string;
};

export type PropAlignmentDeps = {
  /** Injected loader. No network, no database inside this module. */
  readonly loadProps: (gameId: string) => Promise<readonly GameProp[]>;
  /**
   * FALSE by default. Real prop lines only persist once the founder flips
   * `EVENT_ODDS_INGEST_ENABLED`; until then there is nothing honest to read and
   * this signal returns null unconditionally.
   */
  readonly live?: boolean;
};

/**
 * A prop must sit at least this far from its baseline (relative) to count as
 * pointing UP or DOWN. A receiving line 0.3% off a 68-yard baseline is the book
 * agreeing with the baseline, not a lean — counting it as "above" would turn
 * rounding into evidence. Props inside the band are dropped from the tally
 * entirely rather than being assigned to a side, because assigning them would
 * be inventing a direction the market did not express.
 */
export const MIN_RELATIVE_DEVIATION = 0.02;

/**
 * Minimum directional props before the aggregate is allowed to speak at all.
 * One prop is one player's projected role, not a read on the game: a single
 * elevated rushing line can mean a backfield injury, not a high-scoring script.
 * Four separate props are typically at least two positions across both teams,
 * which is the smallest set where "the props imply a scoring level" is a claim
 * about the GAME. Below this the signal returns null, never NEUTRAL — we did
 * not look at enough to call it a wash.
 */
export const MIN_DIRECTIONAL_PROPS = 4;

/**
 * Minimum directional props on ONE team before that team's own share may be
 * compared with the other's. A team's props concentrate in few roles (QB
 * passing, lead RB rushing, WR1 receiving), so three distinct props is the
 * floor at which the share describes an offence rather than one player.
 */
export const MIN_TEAM_DIRECTIONAL_PROPS = 3;

/**
 * Share of directional props set ABOVE baseline at or above which the prop
 * market is read as pricing a HIGH-scoring game. 0.65 means roughly two in
 * three lines lean up; at the MIN_DIRECTIONAL_PROPS floor of 4 that requires
 * 3 of 4, which is a visible skew rather than a coin flip.
 */
export const HIGH_SCORING_SHARE = 0.65;

/**
 * Mirror of HIGH_SCORING_SHARE: at or below this the props are read as pricing
 * a LOW-scoring game. The band BETWEEN the two (0.35 < share < 0.65) is
 * genuinely mixed and yields NEUTRAL — we looked and it is a wash.
 */
export const LOW_SCORING_SHARE = 0.35;

/**
 * How much higher one team's above-baseline share must be than the other's
 * before a SPREAD read is called. 0.20 is a five-prop-per-side difference of
 * one full prop, i.e. the smallest gap that is not a single line's noise.
 */
export const TEAM_SEPARATION_BAND = 0.2;

/**
 * MONEYLINE demands a wider gap than a spread, and returns null (not NEUTRAL)
 * below it. Props price VOLUME, not who wins: a team can be priced for yards
 * and lose. So a moneyline read is only taken when the props separate the two
 * offences unmistakably, and otherwise this signal declines to vote. Prefer
 * null over a stretch — an unread signal costs nothing, a stretched one
 * withholds a pick for a reason we cannot state honestly.
 */
export const MONEYLINE_SEPARATION_BAND = 0.3;

type Directional = { readonly prop: GameProp; readonly above: boolean };

function normaliseTeam(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Tolerant team match: "KC Chiefs" vs "Chiefs" vs "Kansas City Chiefs". */
function teamMatches(a: string, b: string): boolean {
  const x = normaliseTeam(a);
  const y = normaliseTeam(b);
  if (x.length === 0 || y.length === 0) return false;
  return x === y || x.includes(y) || y.includes(x);
}

/**
 * Keep only props that can actually point somewhere.
 *
 * Dropped, in every case WITHOUT being counted on either side:
 *   - `baseline === null`  — nothing to compare against (the honesty rule)
 *   - non-finite line or baseline, or a non-positive baseline (no relative scale)
 *   - a line inside MIN_RELATIVE_DEVIATION of its baseline (level, not a lean)
 */
function directionalProps(props: readonly GameProp[]): readonly Directional[] {
  const out: Directional[] = [];
  for (const prop of props) {
    const baseline = prop.baseline;
    if (baseline === null) continue;
    if (!Number.isFinite(baseline) || !Number.isFinite(prop.line)) continue;
    if (baseline <= 0) continue;
    const deviation = (prop.line - baseline) / baseline;
    if (Math.abs(deviation) < MIN_RELATIVE_DEVIATION) continue;
    out.push({ prop, above: deviation > 0 });
  }
  return out;
}

function aboveShare(rows: readonly Directional[]): number {
  if (rows.length === 0) return 0;
  return rows.filter((r) => r.above).length / rows.length;
}

function describeSources(props: readonly GameProp[]): string {
  const seen = Array.from(new Set(props.map((p) => p.source).filter((s) => s.length > 0)));
  return seen.length > 0 ? seen.join(", ") : "prop line feed";
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function read(
  verdict: SignalRead["verdict"],
  reason: string,
  basis: string,
  completeness: number,
): SignalRead {
  return { key: "prop-alignment", verdict, reason, basis, completeness };
}

/**
 * Build the prop-alignment signal.
 *
 * Returns null (no vote) when: not live, no props, too few comparable props,
 * the engine's side is unknown, or a moneyline the props do not separate.
 */
export function createPropAlignmentSignal(deps: PropAlignmentDeps): SignalFn {
  const live = deps.live ?? false;

  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    // Hard honesty gate. Nothing below this line runs until real prop lines
    // exist. This is deliberately unconditional: it must fail closed even when
    // a caller hands over a perfectly-shaped array of facts.
    if (!live) return null;

    if (candidate.side === null) return null;

    const props = await deps.loadProps(candidate.gameId);
    if (props.length === 0) return null;

    const directional = directionalProps(props);
    const basis = `player prop lines (${describeSources(props)}) compared with each player's recent per-market baseline`;

    if (candidate.pickType === "TOTAL") {
      if (directional.length < MIN_DIRECTIONAL_PROPS) return null;
      if (candidate.side !== "over" && candidate.side !== "under") return null;

      const share = aboveShare(directional);
      const completeness = directional.length / props.length;
      const tookOver = candidate.side === "over";

      if (share >= HIGH_SCORING_SHARE) {
        const detail = `${pct(share)} of ${directional.length} player props are set above the player's recent baseline, so the prop market is pricing a high-scoring game`;
        return tookOver
          ? read("CONFIRMS", `${detail} — same direction as our over.`, basis, completeness)
          : read("CONTRADICTS", `${detail}, which cuts against our under.`, basis, completeness);
      }

      if (share <= LOW_SCORING_SHARE) {
        const detail = `only ${pct(share)} of ${directional.length} player props are set above the player's recent baseline, so the prop market is pricing a low-scoring game`;
        return tookOver
          ? read("CONTRADICTS", `${detail}, which cuts against our over.`, basis, completeness)
          : read("CONFIRMS", `${detail} — same direction as our under.`, basis, completeness);
      }

      return read(
        "NEUTRAL",
        `The player props are split (${pct(share)} of ${directional.length} above baseline), so they do not lean either way on the total.`,
        basis,
        completeness,
      );
    }

    // SPREAD and MONEYLINE both need the props to be team-separable.
    if (candidate.side !== "home" && candidate.side !== "away") return null;
    const ourTeam = candidate.side === "home" ? candidate.homeTeamName : candidate.awayTeamName;
    const theirTeam = candidate.side === "home" ? candidate.awayTeamName : candidate.homeTeamName;

    const ours = directional.filter((d) => teamMatches(d.prop.team, ourTeam));
    const theirs = directional.filter((d) => teamMatches(d.prop.team, theirTeam));
    if (ours.length < MIN_TEAM_DIRECTIONAL_PROPS) return null;
    if (theirs.length < MIN_TEAM_DIRECTIONAL_PROPS) return null;

    const ourShare = aboveShare(ours);
    const theirShare = aboveShare(theirs);
    const gap = ourShare - theirShare;
    const completeness = (ours.length + theirs.length) / props.length;
    const band =
      candidate.pickType === "MONEYLINE" ? MONEYLINE_SEPARATION_BAND : TEAM_SEPARATION_BAND;

    if (gap >= band) {
      return read(
        "CONFIRMS",
        `${ourTeam}'s props are being set up (${pct(ourShare)} of ${ours.length} above baseline) while ${theirTeam}'s are not (${pct(theirShare)} of ${theirs.length}) — the prop market is pricing our side's offence higher.`,
        basis,
        completeness,
      );
    }

    if (gap <= -band) {
      return read(
        "CONTRADICTS",
        `${theirTeam}'s props are being set up (${pct(theirShare)} of ${theirs.length} above baseline) while ${ourTeam}'s are not (${pct(ourShare)} of ${ours.length}) — the prop market is pricing the other side's offence higher.`,
        basis,
        completeness,
      );
    }

    // Inside the band. A spread is a scoring-margin question the props can
    // reasonably call a wash; a moneyline is not — props price volume, not who
    // wins, so we decline to vote rather than stretch a thin gap into a verdict.
    if (candidate.pickType === "MONEYLINE") return null;

    return read(
      "NEUTRAL",
      `Both offences are being priced about the same in the props (${pct(ourShare)} vs ${pct(theirShare)} above baseline), so they do not lean either way.`,
      basis,
      completeness,
    );
  };
}
