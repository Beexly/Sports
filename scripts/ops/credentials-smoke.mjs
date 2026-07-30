#!/usr/bin/env node
/**
 * Credentials presence smoke — never prints secret values.
 * Exit 0 always for local/dev; prints founder blockers for missing prod vars.
 *
 *   node scripts/ops/credentials-smoke.mjs
 *   EXPECT_PROD=1 node scripts/ops/credentials-smoke.mjs  # exit 1 if critical missing
 */
const expectProd = process.env.EXPECT_PROD === "1";

const checks = [
  { key: "CRON_SECRET", critical: true, note: "Vercel cron primary" },
  { key: "CRON_SECRET_PREVIOUS", critical: false, note: "optional rotation twin" },
  { key: "DATABASE_URL", critical: true, note: "Neon" },
  { key: "DIRECT_URL", critical: false, note: "Neon direct migrations" },
  { key: "THE_ODDS_API_KEY", critical: false, note: "enrichment only — not required for Gamma" },
  { key: "STRIPE_SECRET_KEY", critical: false, note: "billing founder" },
  { key: "UPSTASH_REDIS_REST_URL", critical: false, note: "optional online store" },
  { key: "CLOSING_ARCHIVE_PATH", critical: false, note: "durable archive path" },
];

const founderBlockers = [
  "LIVE_BOARD flip (founder YES)",
  "PUBLISH_LEDGER / reveal (founder YES)",
  "Phase C (5b) remeasure with paid Odds",
  "#226 HEOS merge YES",
  "Production CRON_SECRET + Neon + Stripe live values in Vercel",
];

let missingCritical = 0;
console.log("== credentials presence (values never echoed) ==");
for (const c of checks) {
  const v = process.env[c.key];
  const present = typeof v === "string" && v.length > 0;
  const mark = present ? "SET" : c.critical ? "MISSING*" : "unset";
  if (!present && c.critical) missingCritical++;
  console.log(`${mark.padEnd(9)} ${c.key} — ${c.note}`);
}
console.log("");
console.log("oddsApiRequired on free Gamma path: false (by law)");
console.log("LIVE_BOARD: must remain off until founder YES");
console.log("");
console.log("Founder blockers (agent IDLE):");
for (const b of founderBlockers) console.log(`  - ${b}`);

if (expectProd && missingCritical > 0) {
  console.error(`\nFAIL: ${missingCritical} critical env(s) missing under EXPECT_PROD=1`);
  process.exit(1);
}
console.log("\nPASS: checklist printed; no secrets leaked");
process.exit(0);
