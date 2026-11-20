#!/usr/bin/env node
/**
 * qwen4-corpus-intelligence-worker.mjs
 * Autonomous corpus and textbook intelligence extraction worker for Sports OS.
 *
 * Uses multi-brain-router.mjs with bounded parallel workers (default concurrency=6)
 * and Nous SSE stream=true + reasoning_effort=low (~5.5s per request):
 *   Stage A (Primary Extraction): nous-portal-free-promo (qwen/qwen4-max:free -> Alibaba qwen4-max)
 *   Stage B (Adversarial Audit):  nvidia-nim (ising-calibration / nemotron-ultra -> Explabs -> OpenCode Zen)
 *   Stage C (Doctrine Filing):    dated markdown in docs/{arxiv-program,engine}/research/2026-11-19/
 *                                 + trainer-ready staging JSONL in reports/autonomous/mind-staging-2026-11-19.jsonl
 *
 * Strictly obeys Single-Writer Mind Rule (never writes brain/mind.jsonl directly) and GSE Brand Law.
 */

import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { DEFAULT_PARALLEL_CONCURRENCY, dispatchBatchParallel, dispatchMultiBrain, loadEnvFromDisk } from "./multi-brain-router.mjs";

const REPO_ROOT = resolve(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "../..");
const CURSOR_PATH = resolve(REPO_ROOT, "reports/autonomous/corpus-surge-cursor.json");
const ARXIV_OUT_PATH = resolve(REPO_ROOT, "docs/arxiv-program/research/2026-11-19/qwen4-max-corpus-extractions.md");
const ENGINE_OUT_PATH = resolve(REPO_ROOT, "docs/engine/research/2026-11-19/qwen4-max-operator-audit.md");
const STAGING_JSONL_PATH = resolve(REPO_ROOT, "reports/autonomous/mind-staging-2026-11-19.jsonl");

function parseArgs(argv) {
  let limit = 2;
  let concurrency = DEFAULT_PARALLEL_CONCURRENCY;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) {
      limit = Math.max(1, Math.min(24, Number(argv[i + 1]) || 2));
      i++;
    } else if (argv[i] === "--concurrency" && argv[i + 1]) {
      concurrency = Math.max(1, Math.min(12, Number(argv[i + 1]) || DEFAULT_PARALLEL_CONCURRENCY));
      i++;
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }
  return { limit, concurrency, dryRun };
}

function sanitizeOutputText(text) {
  return String(text || "")
    .replace(/[—–]/g, "; ")
    .replace(/\bartificial intelligence\b/gi, "mathematical modeling")
    .replace(/\bAI[- ]powered\b/gi, "model-driven")
    .replace(/\bAI engine\b/gi, "mathematical engine")
    .replace(/\bas an AI\b/gi, "as a quantitative analyzer")
    .trim();
}

function collectCandidateFiles() {
  const priorityExplicit = [
    "docs/data-sources/research/2026-11-07/google-drive-mega-sweep/mega-sweep-primary/books-c-systems/INDEX-BOOKS-C.md",
    "docs/data-sources/research/2026-11-07/google-drive-mega-sweep/mega-sweep-primary/books-a-sports/INDEX-BOOKS-A.md",
    "docs/data-sources/research/2026-11-07/google-drive-mega-sweep/mega-sweep-primary/books-b-medical/INDEX-BOOKS-B.md",
    "docs/engine/LOOP-REASONING-LAYERS.md",
    "docs/engine/EQUATION-SERVER-GAP.md",
    "packages/mcp-equations-server/src/mcp-cognitive-router.ts",
    "packages/mcp-equations-server/src/thousand-equation-registry.ts",
    "packages/mcp-equations-server/src/seal-pot-cognitive-router.ts",
  ];

  const found = [];
  const seen = new Set();

  const addIfExists = (absPath) => {
    const norm = resolve(absPath);
    if (seen.has(norm) || !existsSync(norm)) return;
    if (!statSync(norm).isFile()) return;
    seen.add(norm);
    found.push(norm);
  };

  for (const rel of priorityExplicit) {
    addIfExists(resolve(REPO_ROOT, rel));
  }

  const walkDirs = [
    resolve(REPO_ROOT, "docs/arxiv-program/research/2026-09-21/arxiv-deep"),
    resolve(REPO_ROOT, "docs/engine"),
    resolve(REPO_ROOT, "packages/mcp-equations-server/src"),
  ];

  for (const dir of walkDirs) {
    if (!existsSync(dir)) continue;
    const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const ent of entries) {
      if (ent.isFile() && /\.(md|ts|py)$/i.test(ent.name) && !ent.name.endsWith(".test.ts")) {
        addIfExists(resolve(dir, ent.name));
      }
    }
  }

  return found;
}

function loadCursor() {
  if (!existsSync(CURSOR_PATH)) {
    return { processed: {}, totalRuns: 0, lastRunAt: null };
  }
  try {
    return JSON.parse(readFileSync(CURSOR_PATH, "utf8"));
  } catch {
    return { processed: {}, totalRuns: 0, lastRunAt: null };
  }
}

function saveCursor(cursor) {
  mkdirSync(dirname(CURSOR_PATH), { recursive: true });
  writeFileSync(CURSOR_PATH, JSON.stringify(cursor, null, 2) + "\n", "utf8");
}

function ensureHeader(filePath, title, subtitle) {
  mkdirSync(dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) {
    writeFileSync(
      filePath,
      `# ${title}\n\n${subtitle}\n\n`,
      "utf8"
    );
  }
}

async function main() {
  const { limit, concurrency, dryRun } = parseArgs(process.argv.slice(2));
  const env = loadEnvFromDisk(REPO_ROOT);
  const cursor = loadCursor();
  const candidates = collectCandidateFiles();

  const queue = [];
  for (const absPath of candidates) {
    const rel = relative(REPO_ROOT, absPath).replace(/\\/g, "/");
    const raw = readFileSync(absPath, "utf8");
    const sha256 = createHash("sha256").update(raw).digest("hex");
    if (cursor.processed[rel]?.sha256 === sha256) continue;
    queue.push({ absPath, rel, raw, sha256 });
    if (queue.length >= limit) break;
  }

  if (queue.length === 0) {
    console.log(`[corpus-surge] OK - all ${candidates.length} indexed corpus artifacts up to date.`);
    return;
  }

  if (dryRun) {
    console.log(`[corpus-surge] DRY-RUN queued ${queue.length} file(s) (concurrency=${concurrency}): ${queue.map((q) => q.rel).join(", ")}`);
    return;
  }

  ensureHeader(
    ARXIV_OUT_PATH,
    "Qwen4-Max Free Promo Corpus Extractions (2026-11-19)",
    "Dated mathematical operator and textbook extractions routed via Nous Portal free promo (failover to Alibaba TokenPlan, NVIDIA NIM, Experiential Labs, OpenCode Zen). Engine framing: deterministic mathematical computation."
  );
  ensureHeader(
    ENGINE_OUT_PATH,
    "Cross-Model Mathematical Operator Audit (2026-11-19)",
    "Independent adversarial verification of extracted corpus operators, failure regimes, and 5-stage GSE gating invariants."
  );
  mkdirSync(dirname(STAGING_JSONL_PATH), { recursive: true });

  // Stage A: Parallel Deep Extraction across bounded pool (default 6x with SSE reasoning_effort=low)
  const stageAJobs = queue.map((item) => ({
    taskType: "reasoning",
    maxTokens: 4096,
    temperature: 0.15,
    reasoningEffort: "low",
    allowCliFallback: false,
    env,
    repoRoot: REPO_ROOT,
    messages: [
      {
        role: "system",
        content:
          "You are a senior quantitative researcher for a mathematical sports probability and distributed systems engine. Describe every system strictly in terms of formal mathematics, statistical operators, and software architecture (do not use em-dashes, and never call the engine AI). Extract concrete equations, invariants, failure regimes, and direct wiring targets for the 5-stage situational -> Sinkhorn-Knopp -> conformal calibration -> market de-vig pipeline.",
      },
      {
        role: "user",
        content: `Artifact path: ${item.rel}\n\nKeep total response concise (300 to 450 words).\nProvide a concise, high-signal technical extraction with 4 headings:\n1. Core Mathematical / Systems Operators\n2. Key Assumptions & Breakdown / Singularity Regimes\n3. Situational / Sinkhorn / Conformal Wiring Hooks\n4. Actionable Engine Checklist Items\n\nContent excerpt:\n${item.raw.slice(0, 7000)}`,
      },
    ],
  }));

  const stageAResults = await dispatchBatchParallel(stageAJobs, { concurrency });

  // Stage B: Parallel Cross-Model Adversarial Audit for successful extractions
  const auditTargets = [];
  for (let i = 0; i < queue.length; i++) {
    const resA = stageAResults[i];
    if (!resA?.ok) {
      console.warn(`[corpus-surge] Stage A skipped/failed for ${queue[i].rel}: ${resA?.error}`);
      continue;
    }
    const cleanExtraction = sanitizeOutputText(resA.result.text);
    auditTargets.push({
      item: queue[i],
      stageA: resA.result,
      cleanExtraction,
      job: {
        taskType: "adversarial_audit",
        maxTokens: 2048,
        temperature: 0.1,
        allowCliFallback: false,
        env,
        repoRoot: REPO_ROOT,
        messages: [
          {
            role: "system",
            content:
              "You are an adversarial mathematical auditor. Verify whether the extracted operators and assumptions follow cleanly from the source excerpt, flag any overclaims, check independence/sample-size/calibration hazards, and output Verdict: APPROVED or REVISED plus up to 5 crisp bullets. Avoid em-dashes.",
          },
          {
            role: "user",
            content: `Source (${queue[i].rel}) excerpt (first 5000 chars):\n${queue[i].raw.slice(0, 5000)}\n\nStage A extraction (${resA.result.provider}/${resA.result.model}):\n${cleanExtraction.slice(0, 5000)}`,
          },
        ],
      },
    });
  }

  const stageBResults = auditTargets.length > 0
    ? await dispatchBatchParallel(auditTargets.map((t) => t.job), { concurrency })
    : [];

  let completed = 0;
  for (let i = 0; i < auditTargets.length; i++) {
    const { item, stageA, cleanExtraction } = auditTargets[i];
    const resB = stageBResults[i];
    if (!resB?.ok) {
      console.warn(`[corpus-surge] Stage B failed for ${item.rel}: ${resB?.error}`);
      continue;
    }
    const stageB = resB.result;
    const cleanAudit = sanitizeOutputText(stageB.text);
    const ts = new Date().toISOString();

    const extractEntry =
      `## ${item.rel}\n` +
      `- ExtractedAt: ${ts}\n` +
      `- PrimaryLane: ${stageA.provider} / ${stageA.model} (${stageA.latencyMs}ms, hops=${stageA.fallbackHopCount}, cost=$${(stageA.estimatedCostUsd ?? 0).toFixed(4)})\n` +
      `- AuditLane: ${stageB.provider} / ${stageB.model} (${stageB.latencyMs}ms, hops=${stageB.fallbackHopCount})\n\n` +
      `${cleanExtraction}\n\n---\n\n`;

    const auditEntry =
      `## ${item.rel}\n` +
      `- AuditedAt: ${ts}\n` +
      `- PrimaryLane: ${stageA.provider} / ${stageA.model}\n` +
      `- AuditLane: ${stageB.provider} / ${stageB.model}\n\n` +
      `${cleanAudit}\n\n---\n\n`;

    appendFileSync(ARXIV_OUT_PATH, extractEntry, "utf8");
    appendFileSync(ENGINE_OUT_PATH, auditEntry, "utf8");

    // Trainer-ready staging feed ONLY (never touches brain/mind.jsonl directly)
    const stagingRecord = {
      schemaVersion: "gse.mind.staging.v1",
      sourcePath: item.rel,
      sourceSha256: item.sha256,
      extractedAt: ts,
      primaryProvider: stageA.provider,
      primaryModel: stageA.model,
      auditProvider: stageB.provider,
      auditModel: stageB.model,
      extractionMarkdown: cleanExtraction,
      adversarialAuditMarkdown: cleanAudit,
    };
    appendFileSync(STAGING_JSONL_PATH, JSON.stringify(stagingRecord) + "\n", "utf8");

    cursor.processed[item.rel] = {
      sha256: item.sha256,
      extractedAt: ts,
      primaryLane: `${stageA.provider}/${stageA.model}`,
      auditLane: `${stageB.provider}/${stageB.model}`,
    };
    completed++;
    console.log(
      `[corpus-surge] (${completed}/${queue.length}) ${item.rel} | Primary=${stageA.provider}/${stageA.model} (${stageA.latencyMs}ms) | Audit=${stageB.provider}/${stageB.model}`
    );
  }

  cursor.totalRuns = (cursor.totalRuns || 0) + 1;
  cursor.lastRunAt = new Date().toISOString();
  saveCursor(cursor);
  console.log(`[corpus-surge] DONE - processed ${completed} artifact(s) with concurrency=${concurrency}; total indexed=${Object.keys(cursor.processed).length}.`);
}

main().catch((err) => {
  console.error("[corpus-surge] FAIL:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
