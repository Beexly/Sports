/**
 * Clearance gate shared by every nflverse ingestion path.
 *
 * Returns the point-in-time rights snapshot to stamp on persisted rows, or the
 * block codes when denied. A denied result MUST stop the job (CLAUDE.md
 * invariant). Centralising this keeps every nflverse writer honest and DRY.
 */
import { checkClearance } from "@/lib/scraping/clearance-engine";
import type { Prisma } from "@sports/db";

export type NflverseGate =
  | { readonly ok: true; readonly rightsSnapshot: Prisma.InputJsonValue }
  | { readonly ok: false; readonly blocks: readonly string[] };

export function nflverseIngestionGate(now = new Date()): NflverseGate {
  const clearance = checkClearance(
    {
      source_id: "nflverse",
      mode: "open_dataset_ingest",
      tool_id: "fetch-native",
      intents: ["storage", "derived_analytics"],
    },
    now,
  );
  if (!clearance.allowed || !clearance.rightsSnapshot) {
    return { ok: false, blocks: clearance.blocks.map((b) => b.code) };
  }
  return { ok: true, rightsSnapshot: clearance.rightsSnapshot as unknown as Prisma.InputJsonValue };
}
