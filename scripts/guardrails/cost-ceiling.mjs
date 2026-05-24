import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

/** @type {Record<string, { in: number, out: number }>} */
const RATES = {
  "claude-3-5-haiku-20241022":  { in: 0.80,  out: 4.00  },
  "claude-3-5-sonnet-20241022": { in: 3.00,  out: 15.00 },
  "claude-opus-4-5":            { in: 15.00, out: 75.00 },
  "claude-opus-4-20250514":     { in: 15.00, out: 75.00 },
};

const DEFAULT_RATE = { in: 3.00, out: 15.00 };

const WINDOW_MS = 86_400_000;

/**
 * @param {string} logPath
 * @returns {Promise<number>} rolling 24h cost in USD
 */
export async function computeDailyCost(logPath) {
  if (!existsSync(logPath)) {
    return 0;
  }

  const raw = await readFile(logPath, "utf8");
  const now = Date.now();
  let total = 0;

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let entry;
    try {
      entry = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const { model, inputTokens, outputTokens, timestamp } = entry;
    if (
      typeof model !== "string" ||
      typeof inputTokens !== "number" ||
      typeof outputTokens !== "number" ||
      typeof timestamp !== "string"
    ) {
      continue;
    }

    const entryTime = new Date(timestamp).getTime();
    if (isNaN(entryTime) || now - entryTime >= WINDOW_MS) {
      continue;
    }

    const rate = RATES[model] ?? DEFAULT_RATE;
    const cost = (inputTokens / 1_000_000) * rate.in + (outputTokens / 1_000_000) * rate.out;
    total += cost;
  }

  return total;
}

/**
 * @param {string} logPath
 * @param {number} ceilingUsd
 * @returns {Promise<boolean>}
 */
export async function isOverCeiling(logPath, ceilingUsd) {
  const cost = await computeDailyCost(logPath);
  return cost > ceilingUsd;
}

// Run as main module
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const __dirname = dirname(__filename);
  const repoRoot = resolve(__dirname, "..", "..");
  const logPath = resolve(repoRoot, "_logs", "telemetry.jsonl");
  const ceiling = parseFloat(process.env.AI_DAILY_COST_CEILING_USD ?? "5.00");

  const cost = await computeDailyCost(logPath);
  const fmt = (n) => n.toFixed(2);

  if (cost > ceiling) {
    process.stderr.write(
      `COST_CEILING_EXCEEDED: $${fmt(cost)} spent of $${fmt(ceiling)} ceiling (24h rolling)\n`
    );
    process.exit(1);
  } else {
    process.stdout.write(
      `COST_OK: $${fmt(cost)} of $${fmt(ceiling)} (24h rolling)\n`
    );
    process.exit(0);
  }
}
