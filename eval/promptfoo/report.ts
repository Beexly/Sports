/**
 * Offline eval report CLI — the deterministic half of `npm run eval:prompts`.
 *
 *   npx tsx eval/promptfoo/report.ts
 *
 * Writes reports/eval-prompts/eval-prompts-YYYY-MM-DD.md (static cost+quality
 * analysis; no network, no API keys). The live parity gate stays in
 * promptfooconfig.yaml (`npm run eval:prompts`, needs keys).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildReportMarkdown, reportFileName, scoreAllSurfaces } from "./scorer";

const REPORTS_DIR = join(process.cwd(), "reports", "eval-prompts");

async function main(): Promise<void> {
  const report = scoreAllSurfaces();
  const markdown = buildReportMarkdown(report);
  const fileName = reportFileName(report.generatedAt);
  const filePath = join(REPORTS_DIR, fileName);

  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(filePath, markdown, "utf8");

  process.stdout.write(`Wrote ${filePath}\n`);
  process.stdout.write(
    `Surfaces: ${report.surfaces.length} · quality pass ${report.qualityPassCount} / fail ${report.qualityFailCount}\n`
  );
  process.stdout.write(
    "Static analysis only — no live inference. Cost from vendored models.dev snapshot.\n"
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`eval-prompts report failed: ${message}\n`);
  process.exitCode = 1;
});
