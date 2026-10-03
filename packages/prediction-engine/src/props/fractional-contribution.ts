
/** Era normalization: nf = <league scoring>_all / <league scoring>_season. */
export function eraNormalize(value: number, leagueAvgAll: number, leagueAvgSeason: number): number {
  if (!(leagueAvgSeason > 0)) throw new Error("fractional-contribution: leagueAvgSeason must be positive");
  return value * (leagueAvgAll / leagueAvgSeason);
}

/** Fractional contribution: fc = 1/2 (playerYards/teamYards + playerEPA/teamEPA). */
export function fractionalContribution(
  playerYards: number,
  teamYards: number,
  playerEpa: number,
  teamEpa: number,
): number {
  if (!(teamYards > 0)) throw new Error("fractional-contribution: teamYards must be positive");
  const epaShare = Math.abs(teamEpa) < 1e-9 ? 0 : playerEpa / teamEpa;
  return 0.5 * (playerYards / teamYards + epaShare);
}

/** Effective team size S_eff = 1 / sum(s_i^2): low = concentrated = injury-vulnerable. */
export function effectiveTeamSize(shares: readonly number[]): number {
  if (shares.length === 0) throw new Error("fractional-contribution: shares must be non-empty");
  const hhi = shares.reduce((s, x) => s + x * x, 0);
  if (!(hhi > 0)) throw new Error("fractional-contribution: shares must have positive mass");
  return 1 / hhi;
}

/**
 * S_eff x star-OUT interaction term for line-move models: positive when a concentrated
 * team (low S_eff) loses its star. Expected sign: low S_eff -> bigger line move.
 */
export function sEffStarOutInteraction(sEff: number, starOut: boolean, leagueAvgSEff: number): number {
  if (!(sEff > 0 && leagueAvgSEff > 0)) throw new Error("fractional-contribution: S_eff must be positive");
  return starOut ? leagueAvgSEff / sEff - 1 : 0;
}
