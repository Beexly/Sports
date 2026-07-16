/**
 * Display-only-substantiated-results guard (handoff §1 honesty rules,
 * REAL CODE not convention): no performance number may render unless it
 * carries ALL FOUR statutory legs —
 *
 *   (a) coverage denominator (n fired / n eligible),
 *   (b) a Wilson or Clopper-Pearson LOWER bound,
 *   (c) CLV backing,
 *   (d) walk-forward provenance.
 *
 * A number missing any leg is fabrication by omission — the guard throws
 * (never warns, never renders a partial). Surfaces call
 * `renderableMetricOrNull` and show an honest "no substantiated result
 * yet" state on null. NOTHING in this build renders yet: publishing is
 * founder-gated (handoff Process rules); this module exists so the flip
 * is safe when it comes.
 */

export interface SubstantiatedMetric {
  /** What the number claims to be, e.g. "selective realized rate". */
  readonly label: string;
  /** The point value in [0,1] for rates, or bps for CLV-denominated metrics. */
  readonly value: number;
  readonly coverage: {
    readonly fired: number;
    readonly eligible: number;
  };
  /** Wilson or Clopper-Pearson LOWER bound backing the value. */
  readonly lowerBound: {
    readonly method: "wilson" | "clopper-pearson";
    readonly value: number;
  };
  /** CLV backing: realized mean CLV (bps) and how many settled plays back it. */
  readonly clv: {
    readonly meanBps: number;
    readonly settledCount: number;
  };
  /** Walk-forward provenance: which harness produced it, verifiably. */
  readonly provenance: {
    readonly walkForward: true;
    readonly modelVersion: string;
    /** SHA-256 stamp hash from the producing run (edge-lab provenance). */
    readonly stampHash: string;
    readonly generatedAt: string;
  };
}

export class DisplayGuardError extends Error {
  constructor(readonly missing: readonly string[], label: string) {
    super(
      `Refusing to render "${label}": missing/invalid substantiation legs [${missing.join(", ")}]. ` +
        "A performance number without coverage + lower bound + CLV + walk-forward provenance is " +
        "fabrication by omission (handoff §1).",
    );
    this.name = "DisplayGuardError";
  }
}

function collectDefects(metric: SubstantiatedMetric): string[] {
  const missing: string[] = [];
  if (!Number.isFinite(metric.value)) missing.push("value");
  const cov = metric.coverage;
  if (
    !cov ||
    !Number.isInteger(cov.fired) ||
    !Number.isInteger(cov.eligible) ||
    cov.fired < 0 ||
    cov.eligible <= 0 ||
    cov.fired > cov.eligible
  ) {
    missing.push("coverage(fired/eligible)");
  }
  const lb = metric.lowerBound;
  if (!lb || (lb.method !== "wilson" && lb.method !== "clopper-pearson") || !Number.isFinite(lb.value)) {
    missing.push("lowerBound(wilson|clopper-pearson)");
  }
  const clv = metric.clv;
  if (!clv || !Number.isFinite(clv.meanBps) || !Number.isInteger(clv.settledCount) || clv.settledCount <= 0) {
    missing.push("clv(meanBps,settledCount)");
  }
  const prov = metric.provenance;
  if (
    !prov ||
    prov.walkForward !== true ||
    typeof prov.modelVersion !== "string" ||
    prov.modelVersion.length === 0 ||
    typeof prov.stampHash !== "string" ||
    !/^[0-9a-f]{64}$/i.test(prov.stampHash) ||
    !Number.isFinite(Date.parse(prov.generatedAt))
  ) {
    missing.push("provenance(walkForward,modelVersion,stampHash,generatedAt)");
  }
  return missing;
}

/** Throws DisplayGuardError unless every statutory leg is present and valid. */
export function assertSubstantiated(metric: SubstantiatedMetric): void {
  const missing = collectDefects(metric);
  if (missing.length > 0) throw new DisplayGuardError(missing, metric.label ?? "(unlabeled)");
}

/**
 * The render-path entry: returns the metric when fully substantiated, null
 * otherwise — callers MUST branch to an honest empty state on null. Use
 * `assertSubstantiated` in tests/CI to get the loud version.
 */
export function renderableMetricOrNull(metric: SubstantiatedMetric): SubstantiatedMetric | null {
  return collectDefects(metric).length === 0 ? metric : null;
}
