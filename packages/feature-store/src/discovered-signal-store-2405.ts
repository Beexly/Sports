/**
 * Discovered-signal storage layout (FTSF chunking for dense learned signals)
 *
 * Research port: arXiv:2405.03708
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Storage format for the self-learning/self-growing engine mandate: as the engine learns dense matchup embeddings or player-skill matrices, they are stored with FTSF-style chunking (id, chunk index, payload) for fast slice reads. Layout types + chunk addressing + slice reassembly; pure.
 *
 * ACCEPTANCE GATE: ADOPT the layout only if (a) FTSF slice-read latency <= 25% of blob read-slice latency, (b) write overhead <= 2x blob write, and (c) exact numerical round-trip on the season tensor.
 */

export interface SignalChunk {
  /** signal id, e.g. "matchup-embedding-2024" */
  id: string;
  chunkIndex: number;
  chunkCount: number;
  /** row range covered by this chunk: [start, end) */
  rowStart: number;
  rowEnd: number;
  /** content hash of the payload bytes */
  payloadHash: string;
}

export interface DiscoveredSignal {
  id: string;
  kind: "matchup_embedding" | "player_skill_matrix" | "custom";
  rows: number;
  cols: number;
  chunkRows: number;
  createdAt: string;
}

/** Compute the chunk plan for a (rows x cols) tensor. */
export function chunkPlan(sig: DiscoveredSignal): SignalChunk[] {
  const chunkCount = Math.max(1, Math.ceil(sig.rows / sig.chunkRows));
  const chunks: SignalChunk[] = [];
  for (let i = 0; i < chunkCount; i++) {
    chunks.push({
      id: sig.id,
      chunkIndex: i,
      chunkCount,
      rowStart: i * sig.chunkRows,
      rowEnd: Math.min(sig.rows, (i + 1) * sig.chunkRows),
      payloadHash: "",
    });
  }
  return chunks;
}

/** Which chunks does a row slice [start, end) touch? */
export function chunksForSlice(chunks: SignalChunk[], start: number, end: number): SignalChunk[] {
  if (start >= end) return []; // degenerate slice touches nothing
  return chunks.filter((c) => c.rowStart < end && c.rowEnd > start);
}

/** Reassemble a slice from chunk payloads (each payload = rows of numbers). */
export function assembleSlice(
  chunks: SignalChunk[],
  payloads: Map<number, number[][]>,
  start: number,
  end: number,
): number[][] {
  const out: number[][] = [];
  const ordered = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  for (const c of ordered) {
    const rows = payloads.get(c.chunkIndex) ?? [];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const globalRow = c.rowStart + r;
      if (row !== undefined && globalRow >= start && globalRow < end) out.push(row);
    }
  }
  return out;
}


/** Live-data gate: stays off until discovered-signal store validated on GSE signals. */
export const GSE_DISCOVERED_SIGNAL_STORE_ENABLED = false;
