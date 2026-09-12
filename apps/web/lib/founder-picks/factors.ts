/**
 * Founder Picks factor engine.
 *
 * Composes every signal that should move a founder pick: depth chart,
 * injury cascade, OL availability, matchup splits, underlying metrics,
 * and public consensus. Pure functions — the caller supplies the inputs;
 * this module never fetches and never fabricates a missing factor.
 *
 * Doctrine: a factor with no data is ABSENT, never zero. A founder pick
 * with no written reason is refused upstream. Every factor that fires
 * carries a plain-language note so the record can show WHY.
 */

export type Sport = "NFL" | "MLB" | "NBA" | "NHL" | "CFB";

export type FactorDirection = "boost" | "drag" | "neutral";

export interface FounderFactor {
  readonly key: string;
  readonly label: string;
  readonly direction: FactorDirection;
  /** Weight 0–100. Higher = this factor should move the pick more. */
  readonly weight: number;
  /** Plain-language note. Required — a factor with no note does not ship. */
  readonly note: string;
  /** Where the number came from. */
  readonly source: string;
}

export interface FounderPickContext {
  readonly sport: Sport;
  readonly player: string;
  readonly team: string;
  readonly opponent: string;
  readonly market: string;
  /** Our projection mean for the market (yards, points, etc.). */
  readonly ourNumber: number;
  /** The posted line. */
  readonly postedLine: number;
  // ── optional inputs; absent = factor does not fire ──
  readonly depthRank?: number | null;
  readonly priorDepthRank?: number | null;
  readonly injuryStatus?: "healthy" | "questionable" | "doubtful" | "out" | null;
  /** Teammate OUT at the same position group — vacated opportunity. */
  readonly teammateOutSameGroup?: { readonly name: string; readonly vacatedPerGame: number } | null;
  /** Offensive lineman OUT — QB/RB/WR volume and efficiency drag. */
  readonly olOut?: { readonly name: string; readonly position: string } | null;
  /** Matchup split: player's rate vs this defensive look. */
  readonly matchupSplit?: {
    readonly label: string;
    readonly playerRate: number;
    readonly leagueAvg: number;
    readonly sample: number;
  } | null;
  /** Underlying quality metric (hard-hit, barrel, spin, speed, etc.). */
  readonly underlying?: {
    readonly label: string;
    readonly value: number;
    readonly leagueAvg: number;
    readonly higherIsBetter: boolean;
  } | null;
  /** Public consensus: how the crowd is betting this prop. */
  readonly consensus?: {
    readonly overCount: number;
    readonly underCount: number;
  } | null;
  /** Rest / schedule (NBA b2b, NFL short week, etc.). */
  readonly rest?: {
    readonly label: string;
    readonly gamesInLastDays: number;
    readonly daysRest: number;
  } | null;
}

export interface FounderPickRead {
  readonly factors: readonly FounderFactor[];
  /** −100..+100. Positive = factors favor the OVER / the side our number implies. */
  readonly netSignal: number;
  /** 0–100. How strongly the factors agree. */
  readonly conviction: number;
  /** Side our number implies, before factors. */
  readonly leanSide: "over" | "under";
  /** Plain-language summary for the pick card. */
  readonly summary: string;
}

const W = {
  depthChange: 35,
  teammateOut: 55,
  olOut: 30,
  injurySelf: 70,
  matchup: 40,
  underlying: 25,
  consensus: 20,
  rest: 25,
} as const;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Compose the factor read for one founder pick.
 * Pure. Never invents a factor the inputs do not support.
 */
export function readFounderPick(ctx: FounderPickContext): FounderPickRead {
  const factors: FounderFactor[] = [];
  const leanSide: "over" | "under" = ctx.ourNumber >= ctx.postedLine ? "over" : "under";
  // Positive netSignal favors the OVER.
  const sign = leanSide === "over" ? 1 : -1;

  // ── Depth chart change ──────────────────────────────────────────────────
  if (
    typeof ctx.depthRank === "number" &&
    typeof ctx.priorDepthRank === "number" &&
    ctx.depthRank !== ctx.priorDepthRank
  ) {
    const movedUp = ctx.depthRank < ctx.priorDepthRank;
    factors.push({
      key: "depth-change",
      label: "Depth chart",
      direction: movedUp ? "boost" : "drag",
      weight: W.depthChange,
      note: movedUp
        ? `Moved up the depth chart: ${ctx.priorDepthRank} → ${ctx.depthRank}. More work coming.`
        : `Moved down the depth chart: ${ctx.priorDepthRank} → ${ctx.depthRank}. Role shrinking.`,
      source: "nflverse depth_charts",
    });
  }

  // ── Teammate OUT, same position group ───────────────────────────────────
  if (ctx.teammateOutSameGroup && ctx.teammateOutSameGroup.vacatedPerGame > 0) {
    factors.push({
      key: "teammate-out",
      label: "Vacated opportunity",
      direction: "boost",
      weight: W.teammateOut,
      note: `${ctx.teammateOutSameGroup.name} is OUT — about ${ctx.teammateOutSameGroup.vacatedPerGame.toFixed(1)} looks per game open up.`,
      source: "nflverse injuries + opportunity-transfer",
    });
  }

  // ── Offensive lineman OUT ────────────────────────────────────────────────
  if (ctx.olOut) {
    // RB/QB markets feel OL loss hardest: rush yards, rush+rec, pass yards, pass TD.
    const olSensitive = /rush|pass|reception|rec |qb|rb/i.test(ctx.market);
    factors.push({
      key: "ol-out",
      label: "Offensive line",
      direction: "drag",
      weight: olSensitive ? W.olOut : Math.round(W.olOut * 0.6),
      note: `${ctx.olOut.name} (${ctx.olOut.position}) is OUT. Run lanes and pass protection both take a hit.`,
      source: "nflverse injuries",
    });
  }

  // ── Player's own injury ──────────────────────────────────────────────────
  if (ctx.injuryStatus && ctx.injuryStatus !== "healthy") {
    const dir: FactorDirection =
      ctx.injuryStatus === "out" ? "drag" : ctx.injuryStatus === "doubtful" ? "drag" : "drag";
    factors.push({
      key: "self-injury",
      label: "Availability",
      direction: dir,
      weight: ctx.injuryStatus === "out" ? W.injurySelf : ctx.injuryStatus === "doubtful" ? 50 : 25,
      note: `Listed ${ctx.injuryStatus.toUpperCase()}. Volume and efficiency both at risk.`,
      source: "nflverse injuries",
    });
  }

  // ── Matchup split ────────────────────────────────────────────────────────
  if (ctx.matchupSplit && ctx.matchupSplit.sample >= 20) {
    const delta = ctx.matchupSplit.playerRate - ctx.matchupSplit.leagueAvg;
    if (Math.abs(delta) >= 0.03) {
      factors.push({
        key: "matchup-split",
        label: "Matchup",
        direction: delta > 0 ? "boost" : "drag",
        weight: W.matchup,
        note: `${ctx.matchupSplit.label}: ${(ctx.matchupSplit.playerRate * 100).toFixed(1)}% vs league ${(
          ctx.matchupSplit.leagueAvg * 100
        ).toFixed(1)}% (n=${ctx.matchupSplit.sample}).`,
        source: "play-by-play splits",
      });
    }
  }

  // ── Underlying quality metric ────────────────────────────────────────────
  if (ctx.underlying) {
    const better = ctx.underlying.higherIsBetter
      ? ctx.underlying.value > ctx.underlying.leagueAvg
      : ctx.underlying.value < ctx.underlying.leagueAvg;
    const gap = Math.abs(ctx.underlying.value - ctx.underlying.leagueAvg);
    if (gap > 0) {
      factors.push({
        key: "underlying",
        label: ctx.underlying.label,
        direction: better ? "boost" : "drag",
        weight: W.underlying,
        note: `${ctx.underlying.label} ${ctx.underlying.value.toFixed(1)} vs league ${ctx.underlying.leagueAvg.toFixed(
          1,
        )}. ${better ? "Process says more is coming." : "Results are outrunning the process."}`,
        source: "statcast / next-gen",
      });
    }
  }

  // ── Public consensus ─────────────────────────────────────────────────────
  if (ctx.consensus) {
    const total = ctx.consensus.overCount + ctx.consensus.underCount;
    if (total >= 100) {
      const overShare = ctx.consensus.overCount / total;
      // Heavy crowd on OUR side is a mild boost; heavy crowd AGAINST us is a
      // mild contrarian boost (we fade the public when the number is right).
      const crowdWithUs =
        (leanSide === "over" && overShare > 0.6) || (leanSide === "under" && overShare < 0.4);
      const crowdAgainstUs =
        (leanSide === "over" && overShare < 0.4) || (leanSide === "under" && overShare > 0.6);
      factors.push({
        key: "consensus",
        label: "Public consensus",
        direction: crowdWithUs ? "boost" : crowdAgainstUs ? "boost" : "neutral",
        weight: W.consensus,
        note: `${ctx.consensus.overCount.toLocaleString()} over / ${ctx.consensus.underCount.toLocaleString()} under (${
          (overShare * 100).toFixed(0)
        }% over). ${crowdWithUs ? "Crowd agrees with our number." : crowdAgainstUs ? "Crowd is heavy the other way — we fade it." : "Crowd is split."}`,
        source: "public pick percentages",
      });
    }
  }

  // ── Rest / schedule ──────────────────────────────────────────────────────
  if (ctx.rest) {
    const tired = ctx.rest.gamesInLastDays >= 3 || ctx.rest.daysRest <= 1;
    if (tired) {
      factors.push({
        key: "rest",
        label: "Rest",
        direction: "drag",
        weight: W.rest,
        note: `${ctx.rest.label}: ${ctx.rest.gamesInLastDays} games in the last ${
          ctx.rest.daysRest <= 1 ? "few days" : "week"
        }, ${ctx.rest.daysRest} day(s) rest.`,
        source: "schedule",
      });
    }
  }

  // ── Net signal + conviction ──────────────────────────────────────────────
  let net = 0;
  let weightSum = 0;
  for (const f of factors) {
    const s = f.direction === "boost" ? 1 : f.direction === "drag" ? -1 : 0;
    net += s * f.weight;
    weightSum += f.weight;
  }
  // Flip by lean: positive net favors OVER, so a boost on an UNDER lean should
  // read negative on the over-scale.
  const netSignal = clamp(Math.round(net * sign), -100, 100);
  const conviction = clamp(Math.round((weightSum / 250) * 100), 0, 100);

  const boosts = factors.filter((f) => f.direction === "boost");
  const drags = factors.filter((f) => f.direction === "drag");
  const summary =
    factors.length === 0
      ? "No supporting factors fired. This is a pure number call."
      : `${boosts.length} boost · ${drags.length} drag. Strongest: ${
          factors.slice().sort((a, b) => b.weight - a.weight)[0]!.note
        }`;

  return { factors, netSignal, conviction, leanSide, summary };
}
