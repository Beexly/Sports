/**
 * Stream 7: A Tale of Perfect Fit and Phantom Optima in Real-Time Optimization (arXiv:2608.23885)
 * and Error-Calibrated Safety Buffer Separation (OpenAlex W7223018467).
 */

export interface PhantomOptimaAuditInput {
  readonly candidateStepDelta: readonly number[];
  readonly gradientNorm: number;
  readonly hessianEigenvalues: readonly number[];
  readonly mahalanobisDistanceSq: number;
  readonly chiSquareTrustRadius: number;
}

export interface PhantomOptimaAuditResult {
  readonly isPhantomOptimum: boolean;
  readonly curvatureValidConcaveMax: boolean;
  readonly insideTrainingManifold: boolean;
  readonly dampedStepDelta: readonly number[];
  readonly reason: "TRUE_INTERIOR_OPTIMUM" | "PHANTOM_CURVATURE_FAILURE" | "PHANTOM_OUT_OF_MANIFOLD";
}

/**
 * Rejects surrogate optima where the Hessian fails concavity (lambda_max > -eps)
 * or the step leaves the empirical training manifold (Mahalanobis D^2 > chi^2).
 */
export function auditPhantomOptimaRto(
  input: PhantomOptimaAuditInput,
  concavityEpsilon = 1e-4,
): PhantomOptimaAuditResult {
  const maxEig = input.hessianEigenvalues.length > 0 ? Math.max(...input.hessianEigenvalues) : 0;
  const curvatureValidConcaveMax = maxEig <= -concavityEpsilon;
  const insideTrainingManifold = input.mahalanobisDistanceSq <= input.chiSquareTrustRadius;
  const isPhantomOptimum = !curvatureValidConcaveMax || !insideTrainingManifold;

  if (!curvatureValidConcaveMax) {
    return {
      isPhantomOptimum: true,
      curvatureValidConcaveMax: false,
      insideTrainingManifold,
      dampedStepDelta: input.candidateStepDelta.map(() => 0),
      reason: "PHANTOM_CURVATURE_FAILURE",
    };
  }
  if (!insideTrainingManifold) {
    const scale = Math.sqrt(input.chiSquareTrustRadius / Math.max(input.mahalanobisDistanceSq, 1e-9));
    return {
      isPhantomOptimum: true,
      curvatureValidConcaveMax: true,
      insideTrainingManifold: false,
      dampedStepDelta: input.candidateStepDelta.map((x) => Number((x * scale).toFixed(6))),
      reason: "PHANTOM_OUT_OF_MANIFOLD",
    };
  }
  return {
    isPhantomOptimum: false,
    curvatureValidConcaveMax: true,
    insideTrainingManifold: true,
    dampedStepDelta: input.candidateStepDelta.map((x) => Number(x.toFixed(6))),
    reason: "TRUE_INTERIOR_OPTIMUM",
  };
}

/**
 * OpenAlex W7223018467: Error-Calibrated Safety Buffer Separation Gate.
 */
export function evaluateErrorCalibratedSafetyBuffer(input: {
  readonly estimatedEdge: number;
  readonly aleatoricSigma: number;
  readonly epistemicSigma: number;
  readonly confidenceZ?: number;
}): {
  readonly requiredSafetyBuffer: number;
  readonly netEdgeOverBuffer: number;
  readonly clearsSafetyGate: boolean;
} {
  const z = input.confidenceZ ?? 1.645;
  const totalSigma = Math.sqrt(
    Math.max(0, input.aleatoricSigma * input.aleatoricSigma) +
      Math.max(0, input.epistemicSigma * input.epistemicSigma),
  );
  const requiredSafetyBuffer = Number((z * totalSigma).toFixed(4));
  const netEdgeOverBuffer = Number((input.estimatedEdge - requiredSafetyBuffer).toFixed(4));
  return {
    requiredSafetyBuffer,
    netEdgeOverBuffer,
    clearsSafetyGate: netEdgeOverBuffer > 0,
  };
}
