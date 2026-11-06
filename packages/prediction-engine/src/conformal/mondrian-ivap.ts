/**
 * Mondrian x Inductive Venn-Abers fusion
 *
 * Group-conditional multiprobability: run IVAP inside a Mondrian category
 * (and fall back up the taxonomy hierarchy when the leaf is too thin).
 *
 * WHY THIS EXISTS
 * ---------------
 * Marginal IVAP gives a valid multiprobability under exchangeability of the
 * whole calibration set. Sports data is not exchangeable across regimes
 * (home favorite != road underdog). Mondrian residual quantiles give
 * group-conditional interval width control but not multiprobability
 * calibration. This module is the product of both:
 *
 *   - Validity claim (when it holds): under within-category exchangeability,
 *     the multiprobability from the category that actually supplied the fit
 *     inherits IVAP's finite-sample guarantee for that category.
 *   - Fallback: if the leaf has fewer than minSamples points, walk parents
 *     (same hierarchy as MondrianResidualManager). The guarantee attaches to
 *     the category that was used — never silently claimed for the leaf.
 *
 * Pure functions / pure class. No mutable module state beyond the instance.
 */

import {
  InductiveVennAbers,
  type IvapCalibrationPoint,
  type IvapPrediction,
} from "../calibration/ivap.js";
import {
  parentCategory,
  type TaxonomyCategory,
} from "./sports-taxonomy.js";

export interface MondrianIvapOptions {
  /** Minimum calibration points before trusting a category's IVAP. Default 30. */
  readonly minSamples?: number;
  /** Fall back to global "*" pool when hierarchy exhausted. Default true. */
  readonly useGlobalFallback?: boolean;
}

export interface MondrianIvapPoint extends IvapCalibrationPoint {
  readonly category: TaxonomyCategory;
}

export interface MondrianIvapPrediction extends IvapPrediction {
  /** Category whose calibration set produced this multiprobability. */
  readonly categoryUsed: TaxonomyCategory;
  /** True when categoryUsed differs from the requested leaf. */
  readonly usedFallback: boolean;
  /** Leaf -> ... -> categoryUsed chain (inclusive). */
  readonly fallbackChain: readonly TaxonomyCategory[];
  /** Sample size of the category that was actually fit. */
  readonly sampleSize: number;
}

/**
 * Fit-once, predict-many store: calibration points bucketed by category,
 * with lazy IVAP construction per category on first use.
 */
export class MondrianIvap {
  private readonly byCategory = new Map<TaxonomyCategory, IvapCalibrationPoint[]>();
  private readonly fitted = new Map<TaxonomyCategory, InductiveVennAbers>();
  private readonly minSamples: number;
  private readonly useGlobalFallback: boolean;

  constructor(options: MondrianIvapOptions = {}) {
    this.minSamples = options.minSamples ?? 30;
    this.useGlobalFallback = options.useGlobalFallback ?? true;
  }

  /** Add one labeled score to its category (and optionally the global pool). */
  add(point: MondrianIvapPoint): void {
    this.push(point.category, { score: point.score, label: point.label });
    if (this.useGlobalFallback) {
      this.push("*", { score: point.score, label: point.label });
    }
    this.fitted.delete(point.category);
    if (this.useGlobalFallback) this.fitted.delete("*");
  }

  addMany(points: readonly MondrianIvapPoint[]): void {
    for (const p of points) this.add(p);
  }

  size(category: TaxonomyCategory): number {
    return this.byCategory.get(category)?.length ?? 0;
  }

  categories(): readonly TaxonomyCategory[] {
    return Array.from(this.byCategory.keys()).sort();
  }

  /**
   * Predict multiprobability for testScore under the Mondrian cell of
   * category, falling back up the parent chain when under-powered.
   */
  predict(category: TaxonomyCategory, testScore: number): MondrianIvapPrediction {
    const chain: TaxonomyCategory[] = [];
    let current: TaxonomyCategory | null = category;

    while (current !== null) {
      chain.push(current);
      const pts = this.byCategory.get(current);
      if (pts && pts.length >= this.minSamples) {
        const ivap = this.getOrFit(current, pts);
        const pred = ivap.predict(testScore);
        return {
          ...pred,
          categoryUsed: current,
          usedFallback: current !== category,
          fallbackChain: chain,
          sampleSize: pts.length,
        };
      }
      current = parentCategory(current);
    }

    if (this.useGlobalFallback) {
      chain.push("*");
      const global = this.byCategory.get("*") ?? [];
      if (global.length > 0) {
        const ivap = this.getOrFit("*", global);
        const pred = ivap.predict(testScore);
        return {
          ...pred,
          categoryUsed: "*",
          usedFallback: true,
          fallbackChain: chain,
          sampleSize: global.length,
        };
      }
    }

    return {
      p0: 0.5,
      p1: 0.5,
      pMid: 0.5,
      width: 0,
      categoryUsed: category,
      usedFallback: false,
      fallbackChain: chain,
      sampleSize: 0,
    };
  }

  private push(category: TaxonomyCategory, point: IvapCalibrationPoint): void {
    const list = this.byCategory.get(category) ?? [];
    list.push(point);
    this.byCategory.set(category, list);
  }

  private getOrFit(
    category: TaxonomyCategory,
    pts: readonly IvapCalibrationPoint[],
  ): InductiveVennAbers {
    let ivap = this.fitted.get(category);
    if (!ivap) {
      ivap = new InductiveVennAbers(pts);
      this.fitted.set(category, ivap);
    }
    return ivap;
  }
}

/** One-shot: build from points and predict. */
export function mondrianIvapPredict(
  points: readonly MondrianIvapPoint[],
  category: TaxonomyCategory,
  testScore: number,
  options: MondrianIvapOptions = {},
): MondrianIvapPrediction {
  const model = new MondrianIvap(options);
  model.addMany(points);
  return model.predict(category, testScore);
}
