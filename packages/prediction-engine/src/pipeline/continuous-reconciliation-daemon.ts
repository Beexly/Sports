import { xorBitmaskDelta } from "../mcp/mcp-cognitive-router.js";
import type { ContextualBitmaskReceipt } from "../mcp/bitmask-schema.js";
import { runUnifiedAutonomousMindPipeline, type UnifiedSlateExecutionSummary } from "./unified-autonomous-mind-pipeline.js";

export type CheckpointTag = "T-24h" | "T-6h" | "T-3h" | "T-90m" | "T-30m" | "LIVE";

export function planPartialRerun(
  prev: ContextualBitmaskReceipt | null,
  next: ContextualBitmaskReceipt,
): { readonly mode: "resign-only" | "market" | "structural" } {
  if (!prev) return { mode: "structural" };
  const delta = xorBitmaskDelta(prev, next);
  if (delta.words.every((w) => w === 0)) return { mode: "resign-only" };
  if (delta.marketOnly) return { mode: "market" };
  return { mode: "structural" };
}

export async function emitCheckpoint(
  tag: CheckpointTag,
): Promise<UnifiedSlateExecutionSummary> {
  return runUnifiedAutonomousMindPipeline({
    gameId: "2026-10-22-NE-CHI",
    league: "NFL",
    asOf: new Date("2026-10-22T23:45:00.000Z"),
    checkpointTag: tag,
  });
}
