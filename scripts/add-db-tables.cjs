/**
 * Add database tables to inventory.json via pg.
 * Run: DATABASE_URL=... node scripts/add-db-tables.cjs
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const invPath = path.join(__dirname, "..", "packages", "prediction-engine", "src", "engine", "inventory.json");
const inv = JSON.parse(fs.readFileSync(invPath, "utf-8"));
const seen = new Set(inv.entries.map((e) => e.id));

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const r = await client.query(
    "SELECT table_name, table_type FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
  );
  let added = 0;
  for (const row of r.rows) {
    const sym = row.table_name;
    const id = crypto.createHash("sha256").update(`db://public/${sym}:${sym}`).digest("hex").slice(0, 16);
    if (seen.has(id)) continue;
    seen.add(id);
    inv.entries.push({
      id,
      path: `db://public/${sym}`,
      kind: "table",
      symbol: sym,
      signal_family: "DB_TABLE",
      wired: false,
      wired_via: null,
    });
    added++;
  }
  inv.total = inv.entries.length;
  fs.writeFileSync(invPath, JSON.stringify(inv, indent=2));
  // rewrite gaps
  const gaps = inv.entries.filter((e) => !e.wired);
  fs.writeFileSync(
    path.join(__dirname, "..", "packages", "prediction-engine", "src", "engine", "gaps.json"),
    JSON.stringify({ total: gaps.length, entries: gaps }, null, 2)
  );
  console.log(`Added ${added} DB tables. Total: ${inv.total}. Gaps: ${gaps.length}`);
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
