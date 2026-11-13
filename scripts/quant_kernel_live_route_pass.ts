/**
 * WP-2 live persistence verification pass.
 *
 * Runs routeFullFourStage against the LIVE Neon literature view
 * (lit.v_class_a_literature_premises, 1,098 trust-tiered premises) and writes
 * one lit.retrieval_event row plus one lit.activation row per selected
 * premise. The query vector is grounded in a real premise embedding from the
 * corpus; the signal is a DECLARED verification input (this pass verifies
 * wiring, it is not a game prediction).
 *
 * Usage:
 *   DATABASE_URL="$(neonctl connection-string main --project-id summer-brook-99380762 --role-name neondb_owner)" \
 *   TSX_TSCONFIG_PATH=packages/prediction-engine/tsconfig.json \
 *   node node_modules/tsx/dist/cli.mjs scripts/quant_kernel_live_route_pass.ts
 *
 * Never prints the connection string.
 */
import pg from "pg";
import {
  routeFullFourStage,
  LIVE_LITERATURE_VIEW,
} from "../packages/mcp-equations-server/src/mcp-cognitive-router.js";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required (neondb_owner role for lit writes)");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const db = {
    query: async (sql: string, params?: unknown[]) => {
      const r = await client.query(sql, params);
      return { rows: r.rows };
    },
  };
  try {
    const seed = await client.query<{ id: string; emb: string }>(
      `SELECT id, embedding::text AS emb
       FROM lit.v_class_a_literature_premises
       WHERE embedding IS NOT NULL LIMIT 1`,
    );
    if (seed.rows.length === 0) throw new Error("live literature view has no embedded premise");
    const queryEmbedding = JSON.parse(seed.rows[0]!.emb) as number[];

    // Declared verification inputs — labeled as such in the persisted event.
    const signals = [{ family: 12, displacement: 0.2, n: 100 }];
    const res = await routeFullFourStage(db, signals, queryEmbedding, {
      view: LIVE_LITERATURE_VIEW,
      queryText: "WP-2 live wiring verification: trench weak-link context",
      stageBLimit: 50,
      stageCLimit: 10,
    });

    const counts = await client.query<{ ev: number; ac: number }>(
      `SELECT (SELECT count(*)::int FROM lit.retrieval_event) AS ev,
              (SELECT count(*)::int FROM lit.activation) AS ac`,
    );
    console.log(
      JSON.stringify(
        {
          view: LIVE_LITERATURE_VIEW,
          retrievalEventId: res.retrievalEventId,
          selectedPremises: res.selectedPremises.length,
          clampedTotalLogOddsDelta: res.clampedTotalLogOddsDelta,
          tableCounts: counts.rows[0],
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});