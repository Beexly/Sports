/**
 * Live smoke test: call the corpus grounding layer against Neon for the TNF
 * WSH @ NYG situational facets and print what the corpus actually returns.
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/literature/corpus-grounding-smoke.ts
 *
 * Uses Neon's SQL-over-HTTP endpoint (parameterised), so it works where raw
 * Postgres TCP is blocked. READ-ONLY. Exits non-zero if any facet layer errors
 * or overall coverage is below 0.5 — that is the "reasoning actually gets
 * evidence" gate, not a probability claim.
 */
import { groundGame, type GroundingFacet } from "../../packages/prediction-engine/src/literature/corpus-grounding.js";
import { runMasterSituationalReasoningOverlay } from "../../packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.js";
import { facetsForGame } from "../../packages/prediction-engine/src/literature/situational-facets.js";
import type { SqlClient } from "../../packages/prediction-engine/src/literature/literature-retrieval.js";

function neonHttpClient(databaseUrl: string): SqlClient {
  const u = new URL(databaseUrl);
  const endpoint = `https://${u.hostname}/sql`;
  return {
    async query(text, values) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Neon-Connection-String": databaseUrl, "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, params: values ?? [] }),
      });
      const body = (await res.json()) as { rows?: unknown[]; rowCount?: number; message?: string };
      if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
      return { rows: body.rows ?? [], rowCount: body.rowCount ?? null };
    },
  };
}

// WSH @ NYG, Thursday Night Football, MetLife (outdoor), divisional (NFC East).
export const TNF_WSH_NYG_FACETS: readonly GroundingFacet[] = facetsForGame({
  isIndoor: false,
  windMph: 12,
  tempF: 46,
  isDivisional: true,
  window: "Thursday Night Football",
});

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");
  const db = neonHttpClient(url.replace(/[?&]channel_binding=[^&]*/, ""));
  const g = await groundGame(db, "2026_10_WAS_NYG", TNF_WSH_NYG_FACETS);
  for (const f of g.facets) {
    const by = (l: string) => f.evidence.filter((e) => e.layer === l).length;
    console.log(`\n[${f.family}] support=${f.support.toFixed(3)} chunks=${f.chunkMode} sit=${by("situation")} stmt=${by("statement")} chunk=${by("chunk")} ${f.layerErrors.length ? "ERR " + f.layerErrors.join("; ") : ""}`);
    console.log(`  q: ${f.query}`);
    for (const e of f.evidence.slice(0, 3)) console.log(`  - (${e.layer} w=${e.weight.toFixed(3)}) ${e.citation} ${e.title ? "[" + e.title + "] " : ""}${e.text.slice(0, 220)}`);
  }
  console.log(`\noverallSupport=${g.overallSupport} coverage=${g.coverage} latencyMs=${g.latencyMs}`);
  // Exercise the real Stage-2 overlay with the live grounding. Family deltas here are
  // ILLUSTRATIVE fixtures (not tonight's engine output) — this proves the wiring, not a pick.
  const fixture = { pressure: 0.03, weather: -0.01, restFatigue: -0.02, coveragePersonnel: 0.025, qbSkillScript: 0.035, marketMicrostructure: 0.015 };
  const overlay = runMasterSituationalReasoningOverlay({ familyDeltas: fixture, marketAnchorProb: 0.56, independentEdgeDecision: "PASS", corpusGrounding: g });
  console.log("\noverlay call:", overlay.streamCalls.find((c) => c.stream.startsWith("corpus:"))?.detail);
  for (const a of overlay.corpusGrounding?.adjustments ?? []) console.log(`  ${a.family}: support=${a.support.toFixed(3)} x${a.multiplier} ${a.before} -> ${a.after.toFixed(5)}`);
  console.log("publishAllowed (fixture PASS):", overlay.publishAllowed);
  const errs = g.facets.flatMap((f) => f.layerErrors);
  if (errs.length || g.coverage < 0.5) { console.error("SMOKE FAIL", errs); process.exit(1); }
  console.log("SMOKE PASS");
}

main().catch((e) => { console.error(e); process.exit(1); });
