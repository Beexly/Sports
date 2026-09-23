/**
 * arXiv 1403.7642: The sensitivity of college football rankings to several modeling choices
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * Ratings published as EBLUPs with 95% prediction intervals instead of bare
point estimates: team pairs whose intervals overlap by more than 50% are
flagged statistically tied. sigma_t^2 is exposed as the win-loss vs
strength-of-schedule dial, and every release runs a specification-sensitivity
protocol ({PQL, LA, FE} x {probit, logit} x {FCS variants}) publishing each
team's rank range across all defensible specifications.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Wrap GSE's college football rankings in the paper's sensitivity and uncertainty apparatus: fit the consolidated-FCS multi-membership GLMM, publish ratings as EBLUPs with 95% prediction intervals (flag interval-overlap >50% team pairs as statistically tied), expose sigma_t^2 as the win-loss <-> strength-of-schedule dial, and run a {PQL, LA, FE} x {probit, logit} x {FCS variants} sensitivity protocol on every release publishing each team's rank-range (e.g., 'Alabama: #2-#3 across all defensible specifications').
 *
 * ACCEPTANCE GATE (verbatim):
 * Gate (ADAPT stays ADAPT): Tests A and B pass (PQL ranks Oklahoma St. #2, FE ranks Alabama #2 in 2011, with sigma_t^2 in expected bands) and Test C shows the rank-range protocol flags >= 1 non-robust top-10 team in a typical week.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Mimo | bucket: MODEL | lane: team_ratings | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2011 replication data (Tests A/B/C).

export interface TeamRating {
  team: string;
  /** Empirical BLUP of the team strength random effect. */
  eblup: number;
  /** Standard error of the EBLUP. */
  se: number;
}

/** 95% prediction interval for a team's strength. */
export function predictionInterval(r: TeamRating, z = 1.96): [number, number] {
  return [r.eblup - z * r.se, r.eblup + z * r.se];
}

/** Overlap of two 95% PIs as a fraction of the narrower interval width. */
export function intervalOverlap(a: TeamRating, b: TeamRating): number {
  const [a0, a1] = predictionInterval(a);
  const [b0, b1] = predictionInterval(b);
  const overlap = Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const minWidth = Math.min(a1 - a0, b1 - b0);
  return minWidth <= 0 ? 0 : overlap / minWidth;
}

/** Flag team pairs with >50% PI overlap as statistically tied. */
export function flagTies(ratings: TeamRating[], threshold = 0.5): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < ratings.length; i++) {
    for (let j = i + 1; j < ratings.length; j++) {
      if (intervalOverlap(ratings[i]!, ratings[j]!) > threshold) {
        out.push([ratings[i]!.team, ratings[j]!.team]);
      }
    }
  }
  return out;
}

/**
 * sigma_t^2 dial: blend between pure win-loss record (sigma_t^2 = 0) and
 * pure strength-of-schedule (sigma_t^2 -> inf).
 */
export function sosDial(winPct: number, sos: number, sigmaT2: number): number {
  const w = sigmaT2 / (sigmaT2 + 1);
  return (1 - w) * winPct + w * sos;
}

export interface RankRange {
  team: string;
  lo: number;
  hi: number;
  specs: number;
}

/** Per-team rank range across specifications; specRanks[spec][team] = 1-based rank. */
export function rankRanges(teamNames: string[], specRanks: number[][]): RankRange[] {
  return teamNames.map((team, t) => {
    const ranks = specRanks.map((s) => s[t]!);
    return {
      team,
      lo: Math.min(...ranks),
      hi: Math.max(...ranks),
      specs: specRanks.length,
    };
  });
}

/** Flag top-10 (by median rank) teams whose rank range spans >= widthThreshold. */
export function flagNonRobust(
  teamNames: string[],
  specRanks: number[][],
  widthThreshold = 3,
): string[] {
  const rr = rankRanges(teamNames, specRanks);
  const median = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y);
    return s[Math.floor(s.length / 2)]!;
  };
  return rr
    .filter((r) => {
      const t = teamNames.indexOf(r.team);
      return median(specRanks.map((s) => s[t]!)) <= 10 && r.hi - r.lo >= widthThreshold;
    })
    .map((r) => r.team);
}
