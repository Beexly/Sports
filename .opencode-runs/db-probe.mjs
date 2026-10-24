// Probe every DB URL variant in .env.local, report which one authenticates.
// READ-ONLY. Prints host/db/user only — never the password.
import { readFileSync } from "node:fs";
import pg from "pg";

const env = readFileSync("C:/Users/Garrett/Sports/.env.local", "utf8");
const map = new Map();
for (const line of env.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_]+)=(.*)$/);
  if (!m) continue;
  map.set(m[1], m[2].trim().replace(/^["']|["']$/g, ""));
}
const candidates = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "DIRECT_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_URL_NO_SSL",
  "storage_DATABASE_URL",
  "storage_DATABASE_URL_UNPOOLED",
  "storage_POSTGRES_URL",
];
for (const k of candidates) {
  const url = map.get(k);
  if (!url) { console.log(`${k.padEnd(28)} (absent)`); continue; }
  let label = k;
  try {
    const u = new URL(url);
    label += `  [${u.username}@${u.hostname}/${u.pathname.replace("/", "")}]`;
    const c = new pg.Client({ connectionString: url, connectionTimeoutMillis: 12000 });
    await c.connect();
    const r = await c.query("select current_user as usr, current_database() as db, count(*)::int as signals from signals");
    console.log(`${k.padEnd(28)} OK  -> user=${r.rows[0].usr} db=${r.rows[0].db} signals=${r.rows[0].signals}`);
    await c.end();
  } catch (e) {
    console.log(`${label.padEnd(28)} FAIL ${String(e.message).slice(0, 70)}`);
  }
}
