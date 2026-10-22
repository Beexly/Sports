/** Kinetic Translation Deficit. MIT formula from usufalbaz/nfl-big-data-bowl-2027-ktd. */

export const KTD_SEPARATION_EPS = 0.01;

export function kineticTranslationDeficit(
  sMax: number,
  sCut: number,
  meanSeparationYards: number,
): number | null {
  const values = [sMax, sCut, meanSeparationYards];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return null;
  const denom = meanSeparationYards + KTD_SEPARATION_EPS;
  if (denom === 0) return null;
  return (sMax - sCut) / denom;
}
