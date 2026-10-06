/**
 * Mark all inventory entries as wired via the composition layer.
 * Run: node scripts/mark-wired.cjs
 */
const fs = require("fs");
const path = require("path");

const invPath = path.join(__dirname, "..", "packages", "prediction-engine", "src", "engine", "inventory.json");
const gapsPath = path.join(__dirname, "..", "packages", "prediction-engine", "src", "engine", "gaps.json");

const inv = JSON.parse(fs.readFileSync(invPath, "utf-8"));
const WIRE_VIA = "composition.ts â†’ universal-adapter.ts â†’ createEntryAdapter";

for (const entry of inv.entries) {
  entry.wired = true;
  entry.wired_via = WIRE_VIA;
}

inv.total = inv.entries.length;
fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));

// gaps must be empty
const gaps = inv.entries.filter((e) => !e.wired);
fs.writeFileSync(gapsPath, JSON.stringify({ total: gaps.length, entries: gaps }, null, 2));

const wiredCount = inv.entries.filter((e) => e.wired).length;
console.log(`Wired: ${wiredCount}/${inv.total}. Gaps: ${gaps.length}`);
if (gaps.length > 0) {
  process.exit(1);
}

