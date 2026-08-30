import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildForensicDemoReport } from "../apps/web/lib/fable/evidence/forensic-demo";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const fixturePath = resolve(repoRoot, "docs/fable/demo/fixture-public-forensic.json");
const rawFixture: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
const report = buildForensicDemoReport(rawFixture);

console.log(JSON.stringify(report, null, 2));
