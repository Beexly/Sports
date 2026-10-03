/**
 * Lane C — simulated / unaudited feature-column denylist.
 *
 * The audit named 62 np.random-simulated columns (46.6% of a 133-wide store):
 * fake WHOOP/Oura recovery+HRV, fabricated chemistry/leadership/toughness, and
 * unreachable PFF/Understat/Statcast fields. Those columns are NOT present as
 * generators in this repository today (only seeded test RNGs in gse-ml-service).
 * This module is the durable guard: any registry, projection feature list, or
 * feature-store definition that reintroduces a banned source fails closed.
 *
 * Verified sources stay free: nflverse, ESPN free scoreboard, The Odds API,
 * open-meteo / NWS, MLB Stats API, historical games/snaps/injuries.
 */

/** Source ids / vendor names that must never appear as a feature source. */
export const BANNED_FEATURE_SOURCES: readonly string[] = [
  "whoop",
  "oura",
  "pff",
  "understat",
  "statcast",
  "leadership",
  "toughness",
  "chemistry",
  "morale",
  "locker_room",
  "locker-room",
  "simulated_recovery",
  "simulated_hrv",
];

/** Column-name / key patterns that mark a simulated or unreachable field. */
export const BANNED_FEATURE_KEY_PATTERNS: readonly RegExp[] = [
  /whoop/i,
  /oura/i,
  /\bhrv\b/i,
  /recovery.*sim|sim.*recovery/i,
  /leadership/i,
  /toughness/i,
  /chemistry/i,
  /np[._]?random/i,
  /^pff_/i,
  /^understat_/i,
  /^statcast_/i,
];

export type FeatureIntegrityScanResult = {
  readonly clean: boolean;
  readonly hits: readonly string[];
};

export function isBannedFeatureSource(source: string | null | undefined): boolean {
  if (!source) return false;
  const s = source.trim().toLowerCase();
  return BANNED_FEATURE_SOURCES.some((banned) => s === banned || s.includes(banned));
}

export function isBannedFeatureKey(key: string | null | undefined): boolean {
  if (!key) return false;
  return BANNED_FEATURE_KEY_PATTERNS.some((re) => re.test(key));
}

/** Scan free-form feature descriptors (id/source/label). Fail-closed on any hit. */
export function scanFeatureDescriptors(
  entries: readonly { readonly id?: string; readonly source?: string; readonly label?: string }[],
): FeatureIntegrityScanResult {
  const hits: string[] = [];
  for (const entry of entries) {
    const id = entry.id ?? "";
    const source = entry.source ?? "";
    const label = entry.label ?? "";
    if (isBannedFeatureKey(id) || isBannedFeatureKey(label) || isBannedFeatureSource(source)) {
      hits.push(`${id || label || "?"}:${source || "n/a"}`);
    }
  }
  return { clean: hits.length === 0, hits };
}

/**
 * Keep only verified column names. Anything matching a banned pattern is
 * dropped — use at dataset/feature-store ingest so simulated columns cannot
 * re-enter the training surface.
 */
export function filterVerifiedFeatureColumns(columns: readonly string[]): string[] {
  return columns.filter((c) => !isBannedFeatureKey(c) && !isBannedFeatureSource(c));
}
