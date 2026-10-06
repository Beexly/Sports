/**
 * FlorDB-style incremental context logging + content-addressed run manifests
 *
 * Research port: arXiv:2408.02498
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Adopts FlorDB-style incremental context logging for the GSE pipeline, extended with content-addressed run manifests: code SHA plus content hashes of every input dataset snapshot, so any past pick is reproducible as (code, inputs) -> outputs. Manifest builder + reproducibility verifier; pure.
 *
 * ACCEPTANCE GATE: ADOPT only if the retroactive-question test scores 5/5 within the time bound AND logging overhead adds <2% to pipeline wall-clock (measured over a week).
 */

export interface InputSnapshot {
  dataset: string;
  contentHash: string;
  capturedAt: string;
}

export interface RunManifest {
  runId: string;
  codeSha: string;
  inputs: InputSnapshot[];
  /** manifest id = hash of (codeSha + sorted input hashes); computed by the store */
  manifestId: string;
  createdAt: string;
}

/** Build a run manifest (manifestId left for the content-addressed store to fill). */
export function buildRunManifest(runId: string, codeSha: string, inputs: InputSnapshot[], createdAt: string): RunManifest {
  const sorted = [...inputs].sort((a, b) => a.dataset.localeCompare(b.dataset));
  return { runId, codeSha, inputs: sorted, manifestId: "", createdAt };
}

/** Verify reproducibility: the rerun's manifest must match the original exactly. */
export function verifyReproduction(
  original: RunManifest,
  rerun: RunManifest,
): { reproducible: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  if (original.codeSha !== rerun.codeSha) mismatches.push(`codeSha ${original.codeSha} != ${rerun.codeSha}`);
  const oInputs = new Map(original.inputs.map((i) => [i.dataset, i.contentHash]));
  for (const i of rerun.inputs) {
    const h = oInputs.get(i.dataset);
    if (h === undefined) mismatches.push(`extra input ${i.dataset}`);
    else if (h !== i.contentHash) mismatches.push(`input ${i.dataset} hash changed`);
  }
  for (const i of original.inputs) {
    if (!rerun.inputs.some((r) => r.dataset === i.dataset)) mismatches.push(`missing input ${i.dataset}`);
  }
  return { reproducible: mismatches.length === 0, mismatches };
}

/** Retroactive-question scoring helper: fraction of questions answered from manifests. */
export function retroScore(answered: number, total: number): number {
  return total === 0 ? 0 : answered / total;
}

/** Gate: 5/5 retroactive questions AND <2% logging overhead. */
export function contextLogGatePasses(answered: number, total: number, overheadFrac: number): boolean {
  return answered === 5 && total === 5 && overheadFrac < 0.02;
}


/** Live-data gate: stays off until context-log manifest validated on GSE runs. */
export const GSE_CONTEXT_LOG_MANIFEST_ENABLED = false;
