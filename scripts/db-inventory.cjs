/**
 * Inventory the live Neon Postgres database (read-only).
 * Run: node scripts/db-inventory.cjs
 * Never writes. Connection string comes from DATABASE_URL env.
 */
const { Client } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // List tables + row counts (estimated + exact for small ones)
  const tables = await client.query(`
    SELECT c.relname AS table,
           c.reltuples::bigint AS est_rows,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
           obj_description(c.oid) AS comment
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.reltuples DESC;
  `);

  console.log("=== TABLES ===");
  console.log("table".padEnd(48), "est_rows".padStart(10), "size".padStart(10));
  for (const t of tables.rows) {
    console.log(String(t.table).padEnd(48), String(t.est_rows).padStart(10), String(t.total_size).padStart(10));
  }

  // Column inventory for the top data tables
  const interesting = tables.rows
    .filter((t) => Number(t.est_rows) > 0)
    .slice(0, 25)
    .map((t) => t.table);

  console.log("\n=== COLUMNS (top tables by est_rows) ===");
  for (const tbl of interesting) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1
       ORDER BY ordinal_position`,
      [tbl],
    );
    console.log(`\n-- ${tbl} (${cols.rows.length} cols)`);
    console.log(cols.rows.map((c) => `${c.column_name}:${c.data_type}`).join(", "));
  }

  // Calibration-relevant quick stats
  const pickTables = tables.rows.filter((t) => /pick|grade|settled|result|calib|signal|feature|odds|line|game/i.test(t.table));
  console.log("\n=== CALIBRATION-RELEVANT TABLES ===");
  for (const t of pickTables) {
    const count = await client.query(`SELECT COUNT(*)::int AS n FROM "${t.table}"`);
    console.log(`  ${t.table.padEnd(48)} exact=${count.rows[0].n}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
