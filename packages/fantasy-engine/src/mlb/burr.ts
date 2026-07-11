/**
 * GSE Bullpen Rating (BURR) — 14 bullpen categories, league-normalized into
 * ONE matchup number. Glass-box: unlike the sealed incumbent equivalent, all
 * 14 component indices are returned, so a reader sees WHY a pen rates where
 * it does.
 *
 * Convention: 1.00 = league average; >1.00 = STRONG pen (bad for opposing
 * hitters); <1.00 = weak pen (a late-inning edge for hitters). Each category
 * is expressed as a ratio to the league mean, sign-aligned so higher is
 * always stronger (value/league when more is better, league/value when less
 * is better), then weight-averaged.
 *
 * Port of the validated clean-room reference implementation; verified against
 * its live-season team table in the test suite. Statcast expected-contact
 * categories (xwOBA/barrel/hard-hit allowed) carry the highest weights —
 * skills over results, resistant to small-sample luck.
 */

export interface TeamBullpenCategories {
  /** Team identifier (display key; not used in math). */
  readonly team: string;
  readonly era: number;
  readonly fip: number;
  /** K per batter faced (fraction). */
  readonly kPct: number;
  readonly bbPct: number;
  /** K% − BB% (fraction). */
  readonly kMinusBb: number;
  readonly hrPer9: number;
  readonly whip: number;
  /** Left-on-base rate (fraction). */
  readonly lob: number;
  /** Inherited-runner strand rate (fraction). Null when no inherited runners. */
  readonly inheritedStrandRate: number | null;
  /** Save-conversion rate SV/(SV+BS). Null when no chances. */
  readonly saveConversion: number | null;
  /** Ground-out to air-out ratio. */
  readonly goAo: number;
  /** Statcast xwOBA allowed. */
  readonly xwobaAllowed: number;
  /** Statcast barrel rate allowed (%). */
  readonly barrelAllowed: number;
  /** Statcast hard-hit rate allowed (%). */
  readonly hardHitAllowed: number;
}

type CategoryKey = Exclude<keyof TeamBullpenCategories, "team">;

export interface BurrCategory {
  readonly key: CategoryKey;
  /** +1 when a higher raw value means a STRONGER pen, −1 when lower does. */
  readonly direction: 1 | -1;
  readonly weight: number;
}

/** The 14 categories and weights (public, pinned by tests). */
export const BURR_CATEGORIES: readonly BurrCategory[] = [
  { key: "era", direction: -1, weight: 1.3 },
  { key: "fip", direction: -1, weight: 1.4 },
  { key: "kPct", direction: 1, weight: 1.2 },
  { key: "bbPct", direction: -1, weight: 1.0 },
  { key: "kMinusBb", direction: 1, weight: 1.3 },
  { key: "hrPer9", direction: -1, weight: 1.0 },
  { key: "whip", direction: -1, weight: 1.1 },
  { key: "lob", direction: 1, weight: 0.8 },
  { key: "inheritedStrandRate", direction: 1, weight: 0.9 },
  { key: "saveConversion", direction: 1, weight: 0.7 },
  { key: "goAo", direction: 1, weight: 0.4 },
  { key: "xwobaAllowed", direction: -1, weight: 1.4 },
  { key: "barrelAllowed", direction: -1, weight: 1.1 },
  { key: "hardHitAllowed", direction: -1, weight: 0.9 },
];

export interface BurrScore {
  readonly team: string;
  /** The single matchup number: 1.00 = league average, higher = stronger pen. */
  readonly burr: number;
  /** 1 = strongest pen. Ties share the smaller rank ordinal deterministically. */
  readonly rank: number;
  /** Every component index (same convention) — the glass-box breakdown. */
  readonly components: Readonly<Record<CategoryKey, number>>;
}

/**
 * Compute BURR for a league of team bullpens. League means are taken over the
 * FINITE values of each category (a team with no inherited runners does not
 * drag the strand-rate mean); a team's missing category contributes a NEUTRAL
 * 1.0 index — absence of evidence never rewards or punishes.
 */
export function computeBurr(teams: readonly TeamBullpenCategories[]): BurrScore[] {
  const totalWeight = BURR_CATEGORIES.reduce((s, c) => s + c.weight, 0);

  // League mean per category over finite values only.
  const leagueMean = new Map<CategoryKey, number>();
  for (const c of BURR_CATEGORIES) {
    let sum = 0;
    let n = 0;
    for (const t of teams) {
      const v = t[c.key];
      if (v !== null && Number.isFinite(v)) {
        sum += v;
        n++;
      }
    }
    leagueMean.set(c.key, n === 0 ? Number.NaN : sum / n);
  }

  const scored = teams.map((t) => {
    const components = {} as Record<CategoryKey, number>;
    let acc = 0;
    for (const c of BURR_CATEGORIES) {
      const v = t[c.key];
      const lg = leagueMean.get(c.key)!;
      let idx = 1.0; // neutral when the category is missing for this team
      if (v !== null && Number.isFinite(v) && Number.isFinite(lg) && lg !== 0 && v !== 0) {
        idx = c.direction > 0 ? v / lg : lg / v;
      }
      components[c.key] = idx;
      acc += idx * c.weight;
    }
    return { team: t.team, burr: acc / totalWeight, components };
  });

  // Dense-stable ranking: 1 = strongest. Sort copy for rank lookup; input
  // order is preserved in the returned array.
  const order = [...scored].sort((a, b) => b.burr - a.burr || a.team.localeCompare(b.team));
  const rankByTeam = new Map(order.map((s, i) => [s.team, i + 1]));

  return scored.map((s) => ({ ...s, rank: rankByTeam.get(s.team)! }));
}
