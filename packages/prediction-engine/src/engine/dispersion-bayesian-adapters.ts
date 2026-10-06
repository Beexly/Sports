/**
 * Dispersion / bayesian adapters — real computation from dispersion and
 * bayesian modules.
 *
 * Each adapter invokes the real exported function. Fail-closed on
 * missing input. No fake data.
 */

import type { AdapterResult } from "./universal-adapter.js";
import {
  estimatePhi,
  impliedVmr,
} from "../dispersion/estimate-phi.js";
import {
  shrinkEstimate,
  fitVarianceComponents,
  hierarchicalGate,
} from "../bayesian/1812-05170-hierarchical-ar1-shrinkage.js";
import {
  gaussCopulaJoint,
  normalCdf,
} from "../bayesian/2002-01193-copula-hmm-momentum.js";

const NOW_ISO = (): string => new Date().toISOString();

// ── Dispersion: phi ────────────────────────────────────────────────────────

export function estimatePhiAdapter(
  input: { readonly samples: readonly number[] } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.samples) ||
    input.samples.length < 2 ||
    input.samples.some((s) => !Number.isFinite(s))
  ) {
    return {
      failClosed: true,
      reason: "samples must be finite, length >= 2",
      source: "dispersion:estimate-phi",
    };
  }
  try {
    const r = estimatePhi([...input.samples]);
    return {
      source: "dispersion:estimate-phi",
      asOf: NOW_ISO(),
      value: r.phi, // may be null when verdict is not overdispersed — never imputed
      confidence: r.phi === null ? 0.3 : 0.8,
      provenance: "packages/prediction-engine/src/dispersion/estimate-phi.ts#estimatePhi",
      family: "CALIBRATION_HISTORY",
      raw: {
        verdict: r.verdict,
        phi: r.phi,
        mean: r.mean,
        variance: r.variance,
        vmr: r.vmr,
        n: r.n,
        reason: r.reason,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "estimatePhi threw",
      source: "dispersion:estimate-phi",
    };
  }
}

export function impliedVmrAdapter(
  input: { readonly mean: number; readonly phi: number } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.mean) ||
    !Number.isFinite(input.phi) ||
    input.mean < 0
  ) {
    return {
      failClosed: true,
      reason: "mean >= 0 and finite phi required",
      source: "dispersion:implied-vmr",
    };
  }
  const v = impliedVmr(input.mean, input.phi);
  return {
    source: "dispersion:implied-vmr",
    asOf: NOW_ISO(),
    value: Number(v.toFixed(6)),
    confidence: 1,
    provenance: "packages/prediction-engine/src/dispersion/estimate-phi.ts#impliedVmr",
    family: "CALIBRATION_HISTORY",
    raw: { mean: input.mean, phi: input.phi, vmr: Number(v.toFixed(6)) },
  };
}

// ── Bayesian shrinkage ─────────────────────────────────────────────────────

export function shrinkEstimateAdapter(
  input: {
    readonly x: number;
    readonly groupMean: number;
    readonly varWithin: number;
    readonly varBetween: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.x) ||
    !Number.isFinite(input.groupMean) ||
    !Number.isFinite(input.varWithin) ||
    input.varWithin < 0 ||
    !Number.isFinite(input.varBetween) ||
    input.varBetween < 0
  ) {
    return {
      failClosed: true,
      reason:
        "x/groupMean finite, varWithin >= 0, varBetween >= 0 required",
      source: "bayesian:shrink-estimate",
    };
  }
  try {
    const r = shrinkEstimate(
      input.x,
      input.groupMean,
      input.varWithin,
      input.varBetween,
    );
    return {
      source: "bayesian:shrink-estimate",
      asOf: NOW_ISO(),
      value: Number(r.toFixed(6)),
      confidence: 0.85,
      provenance:
        "packages/prediction-engine/src/bayesian/1812-05170-hierarchical-ar1-shrinkage.ts#shrinkEstimate",
      family: "CALIBRATION_HISTORY",
      raw: {
        x: input.x,
        groupMean: input.groupMean,
        varWithin: input.varWithin,
        varBetween: input.varBetween,
        shrunk: Number(r.toFixed(6)),
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "shrinkEstimate threw",
      source: "bayesian:shrink-estimate",
    };
  }
}

export function varianceComponentsAdapter(
  input: { readonly groups: readonly (readonly number[])[] } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Array.isArray(input.groups) ||
    input.groups.length < 2 ||
    input.groups.some((g) => !Array.isArray(g) || g.length === 0)
  ) {
    return {
      failClosed: true,
      reason: "groups must have >= 2 non-empty arrays",
      source: "bayesian:variance-components",
    };
  }
  try {
    const r = fitVarianceComponents(input.groups.map((g) => [...g]));
    return {
      source: "bayesian:variance-components",
      asOf: NOW_ISO(),
      value: Number(r.varBetween.toFixed(6)),
      confidence: 0.8,
      provenance:
        "packages/prediction-engine/src/bayesian/1812-05170-hierarchical-ar1-shrinkage.ts#fitVarianceComponents",
      family: "CALIBRATION_HISTORY",
      raw: {
        varWithin: r.varWithin,
        varBetween: r.varBetween,
        grandMean: r.grandMean,
      },
    };
  } catch {
    return {
      failClosed: true,
      reason: "fitVarianceComponents threw",
      source: "bayesian:variance-components",
    };
  }
}

export function hierarchicalGateAdapter(
  input: {
    readonly brierGain: number;
    readonly phi: number;
    readonly phiPosteriorMass: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.brierGain) ||
    !Number.isFinite(input.phi) ||
    !Number.isFinite(input.phiPosteriorMass) ||
    input.phiPosteriorMass < 0 ||
    input.phiPosteriorMass > 1
  ) {
    return {
      failClosed: true,
      reason: "brierGain/phi finite and phiPosteriorMass in [0,1] required",
      source: "bayesian:hierarchical-gate",
    };
  }
  const verdict = hierarchicalGate(
    input.brierGain,
    input.phi,
    input.phiPosteriorMass,
  );
  return {
    source: "bayesian:hierarchical-gate",
    asOf: NOW_ISO(),
    value: verdict,
    confidence: 0.9,
    provenance:
      "packages/prediction-engine/src/bayesian/1812-05170-hierarchical-ar1-shrinkage.ts#hierarchicalGate",
    family: "CALIBRATION_HISTORY",
    raw: {
      verdict,
      brierGain: input.brierGain,
      phi: input.phi,
      phiPosteriorMass: input.phiPosteriorMass,
    },
  };
}

// ── Copula / normal CDF ────────────────────────────────────────────────────

export function gaussCopulaJointAdapter(
  input: {
    readonly p1: number;
    readonly p2: number;
    readonly rho: number;
  } | null | undefined,
): AdapterResult {
  if (
    !input ||
    !Number.isFinite(input.p1) ||
    !Number.isFinite(input.p2) ||
    input.p1 <= 0 ||
    input.p1 >= 1 ||
    input.p2 <= 0 ||
    input.p2 >= 1 ||
    !Number.isFinite(input.rho) ||
    input.rho <= -1 ||
    input.rho >= 1
  ) {
    return {
      failClosed: true,
      reason: "p1/p2 in (0,1) and rho in (-1,1) required",
      source: "bayesian:gauss-copula-joint",
    };
  }
  try {
    const j = gaussCopulaJoint(input.p1, input.p2, input.rho);
    return {
      source: "bayesian:gauss-copula-joint",
      asOf: NOW_ISO(),
      value: Number(j.toFixed(6)),
      confidence: 0.85,
      provenance:
        "packages/prediction-engine/src/bayesian/2002-01193-copula-hmm-momentum.ts#gaussCopulaJoint",
      family: "CALIBRATION_HISTORY",
      raw: { p1: input.p1, p2: input.p2, rho: input.rho, joint: Number(j.toFixed(6)) },
    };
  } catch {
    return {
      failClosed: true,
      reason: "gaussCopulaJoint threw",
      source: "bayesian:gauss-copula-joint",
    };
  }
}

export function normalCdfAdapter(
  input: { readonly x: number } | null | undefined,
): AdapterResult {
  if (!input || !Number.isFinite(input.x)) {
    return {
      failClosed: true,
      reason: "finite x required",
      source: "bayesian:normal-cdf",
    };
  }
  const p = normalCdf(input.x);
  return {
    source: "bayesian:normal-cdf",
    asOf: NOW_ISO(),
    value: Number(p.toFixed(6)),
    confidence: 1,
    provenance:
      "packages/prediction-engine/src/bayesian/2002-01193-copula-hmm-momentum.ts#normalCdf",
    family: "CALIBRATION_HISTORY",
    raw: { x: input.x, p: Number(p.toFixed(6)) },
  };
}

// ── Registry ───────────────────────────────────────────────────────────────

export const DISPERSION_BAYESIAN_ADAPTERS = {
  estimatePhi: estimatePhiAdapter,
  impliedVmr: impliedVmrAdapter,
  shrinkEstimate: shrinkEstimateAdapter,
  varianceComponents: varianceComponentsAdapter,
  hierarchicalGate: hierarchicalGateAdapter,
  gaussCopulaJoint: gaussCopulaJointAdapter,
  normalCdf: normalCdfAdapter,
} as const;

export type DispersionBayesianAdapterName =
  keyof typeof DISPERSION_BAYESIAN_ADAPTERS;
