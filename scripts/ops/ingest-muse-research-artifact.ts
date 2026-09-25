import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { persistResearchArtifact } from "../../packages/ingestion-pipeline/src/research-artifact.js";

async function main(): Promise<void> {
  const source = resolve(process.argv[2] ?? "C:/Users/Garrett/Downloads/nfl-analytics-reverse-engineering.md");
  const repoPath = "docs/research/2026-09-24-muse/nfl-analytics-reverse-engineering.md";
  const raw = await readFile(source);
  const sha256 = createHash("sha256").update(raw).digest("hex");
  const result = await persistResearchArtifact({
    provider: "muse",
    sourceKind: "RESEARCH_ARTIFACT",
    externalId: "nfl-analytics-reverse-engineering-2026-09-24",
    repoPath,
    title: "NFL analytics reverse engineering — Muse",
    summary: "Checksum-verified research artifact; not a live signal.",
    sourceRef: repoPath,
    fetchedAt: new Date(),
    raw,
    tags: ["research", "muse", "internal", "checksum-verified"],
  });
  console.log(JSON.stringify({ source, repoPath, bytes: raw.byteLength, sha256, isFile: (await stat(source)).isFile(), result }, null, 2));
  if (result.status === "error") process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
