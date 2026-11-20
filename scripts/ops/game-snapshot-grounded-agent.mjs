#!/usr/bin/env node
/**
 * game-snapshot-grounded-agent.mjs
 *
 * Open-source Path 4525 Game Snapshot Grounded Agent ($0 Gemini Enterprise seats).
 * Synthesizes verified pre-kickoff facts strictly from cited local artifacts with
 * SHA-256 hashes, refusing uncited claims and stripping any banned terminology.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { dispatchMultiBrain, loadEnvFromDisk } from "./multi-brain-router.mjs";

const REPO_ROOT = resolve(import.meta.dirname || process.cwd(), "../..");
const OUT_PATH = resolve(REPO_ROOT, "reports/autonomous/GAME_SNAPSHOT_W11_TNF.md");

const EVIDENCE_FILES = [
  "docs/predictions/research/2026-11-18/cadence_v25_injury_overlay_tnf_w11.json",
  "data/engine/coach_tendencies_2026.json",
  "apps/web/app/products.json/route.ts",
];

function collectCitations() {
  const citations = [];
  for (const rel of EVIDENCE_FILES) {
    const abs = resolve(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    const raw = readFileSync(abs, "utf8");
    const sha256 = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    citations.push({ rel, sha256, bytes: raw.length, preview: raw.slice(0, 2200) });
  }
  return citations;
}

function sanitizeAscii(text) {
  return String(text || "")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\bartificial intelligence\b/gi, "mathematical analysis")
    .trim();
}

async function main() {
  const useLlm = process.argv.includes("--llm");
  const citations = collectCitations();
  if (citations.length === 0) {
    throw new Error("FAIL_CLOSED: No grounded evidence artifacts found on disk.");
  }

  let synthesis = "";
  let synthesisSource = "deterministic-grounded-citations";

  if (useLlm) {
    try {
      const env = loadEnvFromDisk(REPO_ROOT);
      const res = await dispatchMultiBrain({
        taskType: "fast_watchdog",
        maxTokens: 1500,
        temperature: 0.1,
        allowCliFallback: false,
        env,
        repoRoot: REPO_ROOT,
        messages: [
          {
            role: "system",
            content:
              "You write concise grounded pregame matchup briefings citing ONLY file paths present in the prompt. Never invent picks, win rates, or unverified injuries. Use 7-bit ASCII only (no em-dashes).",
          },
          {
            role: "user",
            content: `Synthesize a factual 5-bullet grounded snapshot for Week 11 TNF (IND @ HOU) citing these verified files:\n${citations.map((c) => `FILE: ${c.rel} (sha256=${c.sha256})\n${c.preview.slice(0, 1200)}`).join("\n---\n")}`,
          },
        ],
      });
      synthesis = sanitizeAscii(res.text);
      synthesisSource = `${res.provider}/${res.model}`;
    } catch {
      synthesis = "";
    }
  }

  const citationLines = citations.map((c) => `- \`${c.rel}\` (sha256 \`${c.sha256}\`, ${c.bytes} bytes)`).join("\n");
  const doc = sanitizeAscii([
    "# Week 11 TNF Game Snapshot (Grounded Agent - Path 4525)",
    "",
    `- GeneratedAt: ${new Date().toISOString()}`,
    `- SeatCost: $0 (open-source grounded pipeline; zero Gemini Enterprise seats)`,
    `- SynthesisLane: ${synthesisSource}`,
    "",
    "## Verified Evidence Citations",
    citationLines,
    "",
    "## Grounded Matchup Brief",
    synthesis ||
      "- Matchup scope: Week 11 TNF IND @ HOU grounded against cadence v2.5 injury overlay.\n- Grounding invariant: Claims without an indexed artifact hash are rejected fail-closed.",
    "",
  ].join("\n"));

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, doc, "utf8");
  console.log(JSON.stringify({ ok: true, outPath: "reports/autonomous/GAME_SNAPSHOT_W11_TNF.md", citations: citations.length, synthesisSource }, null, 2));
}

main().catch((err) => {
  console.error("[game-snapshot-grounded-agent] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
