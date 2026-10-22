/**
 * Online gradient descent ensemble on binary Brier score — R&D / offline.
 *
 * From Murphy + online convex optimization (Cesa-Bianchi & Lugosi):
 *   p_ens = w · p_vec
 *   ∇_w (p − y)² = 2(p − y) p_vec
 *   w ← Π_Δ (w − η ∇)
 *
 * Strictly proper scoring → asymptotic weights maximize skill / resolution
 * subject to the information in the member forecasts. Does NOT invent RES
 * from noise; does NOT wire into live scoring or flip gates.
 *
 * Fantasy earned-weight ensemble (MAE hedge) lives in earned-weight-ensemble.ts;
 * this module is the binary-probability analogue for Brier minimization.
 */

export type BrierOgdMemberProbs = Readonly<Record<string, number>>;

export type BrierOgdSample = {
  readonly sampleId: string;
  /** Member probabilities in (0,1). Missing keys skipped for that step. */
  readonly members: BrierOgdMemberProbs;
  readonly y: 0 | 1;
  /** Optional chronological key for ordering (ISO date or epoch ms). */
  readonly t?: string | number;
};

export type BrierOgdOptions = {
  readonly learningRate?: number;
  readonly etaSchedule?: "constant" | "one_over_sqrt_t";
  readonly initialWeights?: Readonly<Record<string, number>>;
  readonly eps?: number;
};

export type BrierOgdStep = {
  readonly sampleId: string;
  readonly ensembleP: number;
  readonly equalWeightP: number;
  readonly y: 0 | 1;
  readonly brierEnsemble: number;
  readonly brierEqual: number;
  readonly weightsBefore: Readonly<Record<string, number>>;
};

export type BrierOgdReport = {
  readonly n: number;
  readonly modelIds: readonly string[];
  readonly finalWeights: Readonly<Record<string, number>>;
  readonly meanBrierEnsemble: number;
  readonly meanBrierEqual: number;
  readonly meanBrierBestFixed: number;
  readonly bestFixedModelId: string | null;
  readonly beatsEqualWeight: boolean;
  readonly beatsBestFixed: boolean;
  readonly steps: readonly BrierOgdStep[];
  readonly priced: false;
  readonly status: "shadow";
  readonly note: string;
};

function clampUnit(p: number, eps = 1e-9): number {
  return Math.min(1 - eps, Math.max(eps, p));
}

function projectSimplex(raw: ReadonlyMap<string, number>, ids: readonly string[]): Record<string, number> {
  // Euclidean projection onto probability simplex (Duchi et al. style, sorted).
  const v = ids.map((id) => Math.max(0, raw.get(id) ?? 0));
  const n = v.length;
  if (n === 0) return {};
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  for (let i = 0; i < n; i++) {
    css += u[i]!;
    const t = (css - 1) / (i + 1);
    if (u[i]! - t > 0) rho = i;
  }
  let cssRho = 0;
  for (let i = 0; i <= rho; i++) cssRho += u[i]!;
  const theta = (cssRho - 1) / (rho + 1);
  const out: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    out[ids[i]!] = Math.max(0, v[i]! - theta);
  }
  // Renormalize for numerical safety
  const s = ids.reduce((a, id) => a + out[id]!, 0);
  if (s <= 0) {
    const eq = 1 / n;
    for (const id of ids) out[id] = eq;
  } else {
    for (const id of ids) out[id] = out[id]! / s;
  }
  return out;
}

function normalizeEqual(ids: readonly string[]): Record<string, number> {
  const eq = ids.length === 0 ? 0 : 1 / ids.length;
  return Object.fromEntries(ids.map((id) => [id, eq]));
}

/**
 * Chronological online Brier OGD over convex combinations of member probs.
 */
export function runBrierOgdEnsemble(
  samples: readonly BrierOgdSample[],
  options: BrierOgdOptions = {},
): BrierOgdReport {
  const eps = options.eps ?? 1e-9;
  const baseEta = options.learningRate ?? 0.25;
  const schedule = options.etaSchedule ?? "one_over_sqrt_t";

  const ordered = [...samples].sort((a, b) => {
    const ta = a.t ?? a.sampleId;
    const tb = b.t ?? b.sampleId;
    if (typeof ta === "number" && typeof tb === "number") return ta - tb;
    return String(ta).localeCompare(String(tb));
  });

  const allIds = new Set<string>();
  for (const s of ordered) {
    for (const [k, v] of Object.entries(s.members)) {
      if (Number.isFinite(v) && v > 0 && v < 1) allIds.add(k);
    }
  }
  const modelIds = [...allIds].sort();
  let wMap = new Map<string, number>();
  if (options.initialWeights) {
    for (const id of modelIds) {
      wMap.set(id, Math.max(0, options.initialWeights[id] ?? 0));
    }
  } else {
    for (const id of modelIds) wMap.set(id, 1);
  }
  // Project initial
  let weights = projectSimplex(wMap, modelIds);

  const steps: BrierOgdStep[] = [];
  const memberBrierSum: Record<string, number> = Object.fromEntries(modelIds.map((id) => [id, 0]));
  const memberCount: Record<string, number> = Object.fromEntries(modelIds.map((id) => [id, 0]));
  let t = 0;

  for (const sample of ordered) {
    const active = modelIds.filter((id) => {
      const p = sample.members[id];
      return p != null && Number.isFinite(p) && p > 0 && p < 1;
    });
    if (active.length === 0) continue;
    t += 1;

    // Restrict + renorm weights on active members
    const activeW = projectSimplex(
      new Map(active.map((id) => [id, weights[id] ?? 0])),
      active,
    );
    let ens = 0;
    let eq = 0;
    for (const id of active) {
      const p = clampUnit(sample.members[id]!, eps);
      ens += activeW[id]! * p;
      eq += p / active.length;
    }
    ens = clampUnit(ens, eps);
    eq = clampUnit(eq, eps);
    const y = sample.y;
    const brierEns = (ens - y) ** 2;
    const brierEq = (eq - y) ** 2;

    steps.push({
      sampleId: sample.sampleId,
      ensembleP: ens,
      equalWeightP: eq,
      y,
      brierEnsemble: brierEns,
      brierEqual: brierEq,
      weightsBefore: { ...activeW },
    });

    for (const id of active) {
      const p = clampUnit(sample.members[id]!, eps);
      memberBrierSum[id] = (memberBrierSum[id] ?? 0) + (p - y) ** 2;
      memberCount[id] = (memberCount[id] ?? 0) + 1;
    }

    // ∇_w Brier = 2(p−y) p_vec ; step only on active, then project full simplex
    const eta = schedule === "one_over_sqrt_t" ? baseEta / Math.sqrt(t) : baseEta;
    const gradScale = 2 * (ens - y);
    const next = new Map<string, number>();
    for (const id of modelIds) {
      const prior = weights[id] ?? 0;
      if (active.includes(id)) {
        const p = clampUnit(sample.members[id]!, eps);
        next.set(id, prior - eta * gradScale * p);
      } else {
        next.set(id, prior);
      }
    }
    weights = projectSimplex(next, modelIds);
  }

  const n = steps.length;
  const meanBrierEnsemble =
    n === 0 ? NaN : steps.reduce((s, x) => s + x.brierEnsemble, 0) / n;
  const meanBrierEqual =
    n === 0 ? NaN : steps.reduce((s, x) => s + x.brierEqual, 0) / n;

  let bestFixedModelId: string | null = null;
  let meanBrierBestFixed = Infinity;
  for (const id of modelIds) {
    const c = memberCount[id] ?? 0;
    if (c < Math.max(10, Math.floor(n * 0.5))) continue;
    const m = (memberBrierSum[id] ?? 0) / c;
    if (m < meanBrierBestFixed) {
      meanBrierBestFixed = m;
      bestFixedModelId = id;
    }
  }
  if (!Number.isFinite(meanBrierBestFixed)) meanBrierBestFixed = NaN;

  const beatsEqualWeight =
    n >= 30 && Number.isFinite(meanBrierEnsemble) && meanBrierEnsemble < meanBrierEqual - 1e-6;
  const beatsBestFixed =
    n >= 30 &&
    Number.isFinite(meanBrierEnsemble) &&
    Number.isFinite(meanBrierBestFixed) &&
    meanBrierEnsemble < meanBrierBestFixed - 1e-6;

  return {
    n,
    modelIds,
    finalWeights: weights,
    meanBrierEnsemble,
    meanBrierEqual,
    meanBrierBestFixed,
    bestFixedModelId,
    beatsEqualWeight,
    beatsBestFixed,
    steps,
    priced: false,
    status: "shadow",
    note:
      "Shadow Brier-OGD ensemble only. Does not flip CALIBRATION_ADJUSTMENTS or PERFORMANCE_STATS. " +
      "Raises skill only when member forecasts carry diverse ranking signal.",
  };
}

/** Equal-weight convex combination (baseline for OGD). */
export function equalWeightBlend(
  members: BrierOgdMemberProbs,
  eps = 1e-9,
): number | null {
  const vals = Object.values(members).filter(
    (p) => Number.isFinite(p) && p > 0 && p < 1,
  );
  if (vals.length === 0) return null;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  return clampUnit(m, eps);
}

export { projectSimplex as projectProbabilitySimplex, normalizeEqual as equalSimplexWeights };
