/**
 * Clearance gate for the MLB fantasy-engine data plane (statsapi + Savant).
 *
 * Same contract as nflverse-gate.ts: a denied result MUST stop the job
 * (CLAUDE.md invariant). The difference is the intent set — both MLB sources
 * are registered STORAGE_NOT_ALLOWED (MLBAM's notice permits only individual,
 * non-commercial, non-bulk use of raw data), so the only intent requested is
 * derived_analytics: fetch → compute engine scores → discard the raw payload.
 * Persisting a raw MLB payload would need the "storage" intent, which the
 * registry correctly refuses — that refusal is the design, not a bug.
 *
 * The adapters in @sports/data-ingestion cannot import this engine (package →
 * app dependency is the wrong direction), so each gate converts the granted
 * ClearanceResult into the structural SourceClearanceProof the adapter fetchers
 * REQUIRE as a parameter. The compiler makes ungated fetching unrepresentable
 * (the M-F13 lesson: optional safety parameters are fail-open).
 */
import { checkClearance } from "@/lib/scraping/clearance-engine";
import type { SourceClearanceProof } from "@sports/data-ingestion";

export type FantasyMlbGate =
  | { readonly ok: true; readonly proof: SourceClearanceProof }
  | { readonly ok: false; readonly blocks: readonly string[] };

function gateFor(sourceId: "mlb-statsapi" | "baseball-savant", now: Date): FantasyMlbGate {
  const clearance = checkClearance(
    {
      source_id: sourceId,
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["derived_analytics"],
    },
    now,
  );
  if (!clearance.allowed || !clearance.rightsSnapshot) {
    return { ok: false, blocks: clearance.blocks.map((b) => b.code) };
  }
  return {
    ok: true,
    proof: {
      sourceId,
      allowed: true,
      checkedAt: clearance.checkedAt,
      attributionText: clearance.rightsSnapshot.attribution_text,
    },
  };
}

export function mlbStatsApiGate(now = new Date()): FantasyMlbGate {
  return gateFor("mlb-statsapi", now);
}

export function baseballSavantGate(now = new Date()): FantasyMlbGate {
  return gateFor("baseball-savant", now);
}
