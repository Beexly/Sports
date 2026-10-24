// READ-ONLY prod audit of the signals ledger: counts, weight distribution,
// value scale per key. Never writes. Uses DATABASE_URL from .env.local.
import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync("C:/Users/Garrett/Sports/.env.local", "utf8");
const url = env.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="))?.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
if (!url) { console.error("no DATABASE_URL"); process.exit(1); }

const client = new pg.Client({ connectionString: url });
await client.connect();

const q = async (label, sql) => {
  const r = await client.query(sql);
  console.log(`\n=== ${label} ===`);
  console.table(r.rows);
};

await q("total signals", `select count(*)::int as rows, min(capturedAt)::date as oldest, max(capturedAt)::date as newest from signals`);

await q("weight distribution", `select weight, count(*)::int as rows from signals group by weight order by rows desc`);

await q("weight by key (flat-1.0 check)", `
  select key,
         count(*)::int as rows,
         round(avg(weight)::numeric,4) as avg_weight,
         min(weight) as min_w, max(weight) as max_w,
         count(distinct weight)::int as distinct_weights
  from signals group by key order by rows desc`);

await q("value scale per key (post-#979 check)", `
  select key,
         count(*)::int as rows,
         round(avg(value)::numeric,3) as avg_v,
         round(min(value)::numeric,3) as min_v,
         round(max(value)::numeric,3) as max_v,
         round(stddev_pop(value)::numeric,3) as sd_v
  from signals group by key order by rows desc`);

await q("entity type / category mix", `select "entityType", category, count(*)::int as rows, round(avg(weight)::numeric,3) as avg_w from signals group by 1,2 order by rows desc`);

await client.end();
