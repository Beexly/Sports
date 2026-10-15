import { readWalkForwardGate } from "./packages/ingestion-pipeline/src/walk-forward-gate.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "gate-probe-"));
const mk = (n, body) => {
  const p = join(dir, n);
  writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body));
  return p;
};
const NOW = new Date("2026-10-15T12:00:00Z");
const cases = {
  "real committed file": { path: "dfs/walk_forward/walk_forward.json" },
  missing: { path: join(dir, "nope.json") },
  garbage: { path: mk("g.json", "{not json") },
  "passed=false fresh": { path: mk("f.json", { passed: false, generated_at: "2026-10-14T21:54:09Z" }) },
  "passed='true' string": { path: mk("s.json", { passed: "true", generated_at: "2026-10-14T21:54:09Z" }) },
  stale: { path: mk("st.json", { passed: true, generated_at: "2026-09-01T00:00:00Z" }) },
  "no generated_at": { path: mk("ng.json", { passed: true }) },
};
for (const [name, o] of Object.entries(cases)) {
  const d = readWalkForwardGate({ ...o, now: NOW });
  console.log(name.padEnd(24), "open=" + d.open, d.reason);
}
