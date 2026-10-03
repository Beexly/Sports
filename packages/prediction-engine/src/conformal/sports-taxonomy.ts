/**
 * Sports Subgroup Taxonomy for Mondrian conformal & multicalibration.
 *
 * Concrete Tier-1 / Tier-2 group functions (home/away, favorite/underdog,
 * rest buckets, intersections). Diagnostics helpers (size, coverage, width).
 *
 * Pure functions; no mutable global state.
 */

export type TaxonomyCategory = string;

export interface SportsGameContext {
  readonly isHome: boolean;
  /** True when market-implied or model prior favors this side (prob > 0.5). */
  readonly isFavorite: boolean;
  /** Days of rest for the side of interest. */
  readonly restDays: number;
  readonly position?: string;
  readonly conference?: string;
  readonly isDivisional?: boolean;
  readonly isPrimetime?: boolean;
  /** Optional free-form tags already computed upstream. */
  readonly extraTags?: readonly string[];
}

export type RestBucket = "rest_short" | "rest_normal" | "rest_long";

export function restBucket(restDays: number): RestBucket {
  if (restDays <= 3) return "rest_short";
  if (restDays <= 7) return "rest_normal";
  return "rest_long";
}

/**
 * Tier-1 atomic categories (mutually exclusive within each axis).
 */
export function tier1Categories(ctx: SportsGameContext): readonly TaxonomyCategory[] {
  const cats: TaxonomyCategory[] = [];
  cats.push(ctx.isHome ? "home" : "away");
  cats.push(ctx.isFavorite ? "favorite" : "underdog");
  cats.push(restBucket(ctx.restDays));
  if (ctx.position) cats.push(`pos:${ctx.position}`);
  if (ctx.isDivisional !== undefined) cats.push(ctx.isDivisional ? "divisional" : "non_divisional");
  if (ctx.isPrimetime) cats.push("primetime");
  if (ctx.extraTags) {
    for (const t of ctx.extraTags) cats.push(t);
  }
  return cats;
}

/**
 * Tier-2 pairwise intersections of the primary axes (home×fav, home×rest, fav×rest).
 * Useful for finer Mondrian partitions when sample sizes allow.
 */
export function tier2Intersections(ctx: SportsGameContext): readonly TaxonomyCategory[] {
  const home = ctx.isHome ? "home" : "away";
  const fav = ctx.isFavorite ? "favorite" : "underdog";
  const rest = restBucket(ctx.restDays);
  return [
    `${home}|${fav}`,
    `${home}|${rest}`,
    `${fav}|${rest}`,
    `${home}|${fav}|${rest}`,
  ];
}

/**
 * Primary Mondrian category string used as residual-store key.
 * level=1 → joined Tier-1 primary axes; level=2 → full Tier-2 triple.
 */
export function assignMondrianCategory(
  ctx: SportsGameContext,
  level: 1 | 2 = 1,
): TaxonomyCategory {
  const home = ctx.isHome ? "home" : "away";
  const fav = ctx.isFavorite ? "favorite" : "underdog";
  const rest = restBucket(ctx.restDays);
  if (level === 2) {
    return `${home}|${fav}|${rest}`;
  }
  // Level 1 default: home|fav (most common sports conditioning axes)
  return `${home}|${fav}`;
}

/** Parent category for hierarchical fallback (drop the last segment). */
export function parentCategory(cat: TaxonomyCategory): TaxonomyCategory | null {
  const idx = cat.lastIndexOf("|");
  if (idx <= 0) return null;
  return cat.slice(0, idx);
}

export interface CategoryDiagnostics {
  readonly category: TaxonomyCategory;
  readonly sampleSize: number;
  readonly coverage?: number;
  readonly meanWidth?: number;
  readonly meanResidual?: number;
}

/** Aggregate simple diagnostics from per-category counts / metrics. */
export function summarizeCategoryDiagnostics(
  entries: readonly {
    category: TaxonomyCategory;
    covered?: boolean;
    width?: number;
    residual?: number;
  }[],
): readonly CategoryDiagnostics[] {
  const map = new Map<
    TaxonomyCategory,
    { n: number; covered: number; widthSum: number; residualSum: number }
  >();

  for (const e of entries) {
    const cur = map.get(e.category) ?? { n: 0, covered: 0, widthSum: 0, residualSum: 0 };
    cur.n += 1;
    if (e.covered) cur.covered += 1;
    if (e.width !== undefined) cur.widthSum += e.width;
    if (e.residual !== undefined) cur.residualSum += e.residual;
    map.set(e.category, cur);
  }

  return Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      sampleSize: v.n,
      coverage: v.n > 0 ? v.covered / v.n : undefined,
      meanWidth: v.n > 0 ? v.widthSum / v.n : undefined,
      meanResidual: v.n > 0 ? v.residualSum / v.n : undefined,
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}
