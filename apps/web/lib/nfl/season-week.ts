export function isSettledHistoricalSeason(season: number, currentSeason: number): boolean {
  return Number.isInteger(season) && season < currentSeason;
}

export function assertSettledHistoricalSeason(season: number, currentSeason: number): void {
  if (!isSettledHistoricalSeason(season, currentSeason)) {
    throw new Error(`Season ${season} is not a settled historical season relative to ${currentSeason}.`);
  }
}
