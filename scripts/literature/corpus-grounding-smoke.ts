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

export const TNF_WSH_NYG_FACETS: readonly GroundingFacet[] = [
  { family: "restFatigue", query: "short week Thursday night game rest fatigue recovery", weight: 1 },
  { family: "pressure", query: "pass rush pressure blitz quarterback sacks offensive line protection", weight: 1 },
  { family: "weather", query: "November cold wind outdoor stadium kicking passing", weight: 0.6 },
  { family: "coveragePersonnel", query: "man coverage zone coverage cornerback receiver matchup", weight: 0.8 },
  { family: "qbSkillScript", query: "rookie quarterback opening script play action quick passing", weight: 0.8 },
  { family: "marketMicrostructure", query: "betting line movement public money closing line", weight: 0.5 },
  { family: "other", query: "divisional rivalry familiarity home field crowd", weight: 0.6 },
  { family: "other", query: "fourth down decision short yardage go for it punt", weight: 0.7 },
];

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
  const errs = g.facets.flatMap((f) => f.layerErrors);
  if (errs.length || g.coverage < 0.5) { console.error("SMOKE FAIL", errs); process.exit(1); }
  console.log("SMOKE PASS");
}

main().catch((e) => { console.error(e); process.exit(1); });
