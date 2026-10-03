/**
 * Pathwise calibration monitor for the in-game win-probability model (blown-lead law)
 *
 * Research port: arXiv:2601.18774
 * Normalized lane: calibration | Doctrine: PROPRIETARY_EDGE
 *
 * Pure implementation of the paper's blown-lead diagnostic: for a binary
 * Doob martingale starting at pre-game WP p, the running-maximum law gives
 * P(peak >= h) = p/h. Conditioning on the eventual loss via the strong
 * Markov property at the hitting time of h, the losers' peak-WP CDF is
 * F(h) = 1 - p(1-h)/(h(1-p)) for h in [p, 1). The module tests the empirical
 * CDF of losers' peak WP against this law (one-sample KS per pre-game
 * favorite tier) and measures first-passage overshoot — operationalized here
 * as loser's peak WP exceeding the 90% barrier by more than 5 points
 * (peak > 95) — which must occur in fewer than 25% of games.
 *
 * ACCEPTANCE GATE: ADOPT as the standing in-game WP diagnostic iff on
 * 2023-2024 data the KS statistic is non-significant at alpha=0.05 in at
 * least two of three pre-game favorite tiers AND first-passage overshoot >
 * 5 WP points occurs in fewer than 25% of games.
 */

export interface WpGame {
  /** pre-game win probability of the eventual loser, in (0,1) */
  preGameWpLoser: number;
  /** loser's peak in-game win probability, in [preGameWpLoser, 1] */
  loserPeakWp: number;
}

/** Theoretical CDF of the loser's peak WP under the blown-lead law. */
export function loserPeakCdf(h: number, p0: number): number {
  if (!(p0 > 0 && p0 < 1)) return Number.NaN;
  if (h < p0) return 0;
  if (h >= 1) return 1;
  return 1 - (p0 * (1 - h)) / (h * (1 - p0));
}

/** One-sample Kolmogorov-Smirnov statistic against a CDF. */
export function ksStatistic(samples: number[], cdf: (h: number) => number): number {
  const n = samples.length;
  if (n === 0) return Number.NaN;
  const sorted = [...samples].sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < n; i++) {
    const x = sorted[i] ?? 0;
    const emp = (i + 1) / n;
    const empLeft = i / n;
    d = Math.max(d, Math.abs(emp - cdf(x)), Math.abs(empLeft - cdf(x)));
  }
  return d;
}

/** Approximate KS critical value at alpha=0.05 (Kolmogorov distribution). */
export function ksCritical05(n: number): number {
  if (n <= 0) return Number.NaN;
  return 1.358 / Math.sqrt(n);
}

export type FavoriteTier = "heavy" | "moderate" | "slight";

export function favoriteTier(pFavorite: number): FavoriteTier {
  if (pFavorite >= 0.7) return "heavy";
  if (pFavorite >= 0.6) return "moderate";
  return "slight";
}

export interface TierResult {
  tier: FavoriteTier;
  games: number;
  ks: number;
  critical: number;
  /** KS non-significant at alpha=0.05: paths consistent with the law */
  consistent: boolean;
}

export interface BlownLeadVerdict {
  tiers: TierResult[];
  /** tiers passing the KS consistency check */
  consistentTiers: number;
  /** share of games with loser peak WP > 95 (overshoot > 5pp past 90) */
  overshootShare: number;
  overshootOk: boolean;
  adopt: boolean;
}

/**
 * Full gate: per-tier KS consistency (need >=2 of 3 tiers) and the overshoot
 * condition (<25% of games). pFavorite is the pre-game favorite's WP;
 * games carry the loser's pre-game WP (= 1 - pFavorite for two-team games).
 */
export function blownLeadMonitor(
  games: Array<{ pFavorite: number; loserPeakWp: number }>,
): BlownLeadVerdict {
  const byTier = new Map<FavoriteTier, Array<{ pFavorite: number; loserPeakWp: number }>>();
  for (const g of games) {
    const t = favoriteTier(g.pFavorite);
    const list = byTier.get(t);
    if (list) list.push(g);
    else byTier.set(t, [g]);
  }
  const tiers: TierResult[] = (["heavy", "moderate", "slight"] as FavoriteTier[]).map((tier) => {
    const list = byTier.get(tier) ?? [];
    const peaks = list.map((g) => g.loserPeakWp);
    const p0 = list.length === 0 ? 0.5 : 1 - list.reduce((s, g) => s + g.pFavorite, 0) / list.length;
    const ks = ksStatistic(peaks, (h) => loserPeakCdf(h, p0));
    const critical = ksCritical05(list.length);
    return {
      tier,
      games: list.length,
      ks,
      critical,
      consistent: Number.isFinite(ks) && Number.isFinite(critical) && ks < critical,
    };
  });
  const consistentTiers = tiers.filter((t) => t.consistent).length;
  const overshoot = games.filter((g) => g.loserPeakWp > 0.95).length;
  const overshootShare = games.length === 0 ? Number.NaN : overshoot / games.length;
  const overshootOk = Number.isFinite(overshootShare) && overshootShare < 0.25;
  return {
    tiers,
    consistentTiers,
    overshootShare,
    overshootOk,
    adopt: consistentTiers >= 2 && overshootOk,
  };
}

export const GSE_BLOWN_LEAD_MONITOR_ENABLED = false;
