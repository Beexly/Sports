/**
 * SV3.3B: A Sports Video Understanding Model for Action Recognition
 *
 * arXiv:2507.17844v1 · lane:tracking · verdict:ADAPT · owner:Hermes · doctrine:PROPRIETARY_EDGE
 *
 * Improvement (record): Provide a disabled-by-default keyframe-sampling scaffold using DWT motion energy, supplied appearance features, nearest-to-center LDA-style scoring, and phase coverage. The module does not decode video or call a VGG16 model.
 *
 * ACCEPTANCE GATE:
 * Adopt the sampler if on 50 NFL clips the editor-preference test shows >=60% preference over uniform sampling AND mean phase coverage improves by >=1 phase per clip, with runtime <30s per 10s clip on CPU.
 *
 * ADDITIVE utility. Not wired into any live ingestion path (wiring changes production data flow and is a NEEDS HUMAN CALL).
 * Pure module: no video decode, I/O, network, or credentials. Feature extraction remains an offline harness responsibility.
 */

export const ARXIV_ID = "2507.17844v1" as const;
export const LANE = "tracking" as const;
export const VERDICT = "ADAPT" as const;
export const ENABLED = false;

export const ACCEPTANCE_GATE = `Adopt the sampler if on 50 NFL clips the editor-preference test shows >=60% preference over uniform sampling AND mean phase coverage improves by >=1 phase per clip, with runtime <30s per 10s clip on CPU.`;

export interface KeyframeObservation {
  readonly id: string;
  readonly timestampMs: number;
  readonly motionSignal: readonly number[];
  readonly appearance: readonly number[];
  readonly phase: string;
}

export interface KeyframeSelection {
  readonly id: string;
  readonly timestampMs: number;
  readonly phase: string;
  readonly score: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function dwtDetailEnergy(signal: readonly number[]): number | null {
  if (signal.length < 2 || !signal.every(isFiniteNumber)) return null;
  const differences: number[] = [];
  for (let index = 0; index + 1 < signal.length; index += 2) differences.push((signal[index] as number) - (signal[index + 1] as number));
  return mean(differences.map((difference) => difference ** 2));
}

function appearanceDistance(left: readonly number[], right: readonly number[]): number | null {
  if (left.length === 0 || left.length !== right.length || !left.every(isFiniteNumber) || !right.every(isFiniteNumber)) return null;
  return Math.sqrt(mean(left.map((value, index) => (value - (right[index] as number)) ** 2)));
}

export function selectKeyframes(
  observations: readonly KeyframeObservation[],
  count: number,
): KeyframeSelection[] | null {
  if (!Number.isInteger(count) || count < 8 || count > 16 || observations.length < count) return null;
  if (!observations.every((observation) => observation.id.length > 0 && isFiniteNumber(observation.timestampMs) && observation.timestampMs >= 0 && observation.phase.length > 0 && observation.motionSignal.length > 0 && observation.appearance.length > 0 && observation.motionSignal.every(isFiniteNumber) && observation.appearance.every(isFiniteNumber))) return null;
  if (new Set(observations.map((observation) => observation.id)).size !== observations.length) return null;
  const appearanceCenter = mean(observations.map((observation) => observation.appearance).map((appearance) => mean(appearance)));
  const scored = observations.map((observation) => {
    const motionEnergy = dwtDetailEnergy(observation.motionSignal) ?? 0;
    const distance = appearanceDistance(observation.appearance, [appearanceCenter]) ?? Number.POSITIVE_INFINITY;
    return { observation, score: motionEnergy / (1 + distance) };
  }).sort((a, b) => b.score - a.score);
  const phases = new Set(observations.map((observation) => observation.phase));
  if (phases.size > count) return null;
  const selected: typeof scored = [];
  const used = new Set<string>();
  for (const phase of phases) {
    const representative = scored.find((candidate) => candidate.observation.phase === phase && !used.has(candidate.observation.id));
    if (!representative) return null;
    selected.push(representative);
    used.add(representative.observation.id);
  }
  for (const candidate of scored) {
    if (selected.length >= count) break;
    if (!used.has(candidate.observation.id)) {
      selected.push(candidate);
      used.add(candidate.observation.id);
    }
  }
  return selected
    .sort((a, b) => a.observation.timestampMs - b.observation.timestampMs)
    .map((candidate) => ({ id: candidate.observation.id, timestampMs: candidate.observation.timestampMs, phase: candidate.observation.phase, score: candidate.score }));
}

export function evaluateKeyframeGate(
  clipCount: number,
  editorPreferredCount: number,
  meanPhaseCoverageGain: number,
  runtimeMsPer10sClip: number,
): boolean {
  return Number.isInteger(clipCount)
    && clipCount > 0
    && Number.isInteger(editorPreferredCount)
    && editorPreferredCount >= 0
    && editorPreferredCount <= clipCount
    && isFiniteNumber(meanPhaseCoverageGain)
    && isFiniteNumber(runtimeMsPer10sClip)
    && editorPreferredCount / clipCount >= 0.6
    && meanPhaseCoverageGain >= 1
    && runtimeMsPer10sClip < 30000;
}
