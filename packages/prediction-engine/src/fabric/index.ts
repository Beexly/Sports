export {
  INV_2_POW_32,
  PHILOX_M0,
  PHILOX_M1,
  PHILOX_W0,
  PHILOX_W1,
  campaignKeyFromSeed,
  drawNormalPairBoxMuller,
  drawRawQuad,
  drawUniformQuad,
  encodeUtf8Bytes,
  fnv1a32Utf8,
  generatePhilox4x32WgslShader,
  philox4x32_10,
  sampleCategoricalMarkovStep,
  umul32Hi,
  umul32Lo,
  uniform01FromU32,
} from "./philox";
export type { FloatQuad, PhiloxCounter, PhiloxKey, PhiloxWords } from "./philox";

export {
  verifyFrechetHoeffdingBounds,
  verifyMarkovRowStochastic,
  verifyProperScoringAndConformal,
  verifySinkhornMarginals,
} from "./invariants";
export type { InvariantVerdict } from "./invariants";

export { SequentialEProcessGate, boundedScoreTransform } from "./e-process";
export type { EProcessObservation } from "./e-process";

export {
  HotSwapInferenceEngine,
  buildChampionBundle,
  computeBundleSha256,
  defaultChampionBundle,
  sha256HexUtf8,
  verifyChampionBundle,
} from "./hot-swap-registry";
export type { ChampionBundle, HotSwapQueryResult } from "./hot-swap-registry";

export {
  computeAdaptiveSliceQuantum,
  executeTsMicrotaskKernel,
  throttlePolicyFromLoad,
} from "./hybrid-worker";
export type { EdgeMicrotaskInput, EdgeMicrotaskOutput } from "./hybrid-worker";
