/**
 * The association trace the signal slate requires.
 *
 * `SignalSlateOptions.trace` is a gate: the slate will not mint from a
 * withheld or empty trace. This module builds that trace from the ONE
 * association that is actually measured and stored — the pregame bridge
 * (`pregame_context_logit`, logistic-irls, trained on pre-2025 seasons,
 * holdout-scored on 2025). Its mean holdout probability is a real computed
 * number from sealed data on disk, and it is labeled as exactly that: an
 * association summary, not a published probability and not an edge.
 *
 * Fail-closed: if the bridge file is missing, unreadable, or `reasonAbout`
 * withholds, this throws with the exact reason and the slate mints nothing.
 */
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, resolve, dirname } from "node:path";
import { reasonAbout, type ReasoningEval } from "./reasoning-trace.js";
import type { SlateAcceptedTrace } from "./signal-slate-options.js";

/**
 * Resolve the repo-root data directory WITHOUT assuming a bundler layout.
 *
 * WHY THIS EXISTS. This module previously did `resolve(__dirname, "..", "..",
 * "..")` and joined `data/gse-dataset/`. That arithmetic is only correct when
 * the compiled module sits at `<root>/packages/ingestion-pipeline/dist`. On
 * Vercel the package is bundled under `apps/web`, so three levels up is
 * `/var/task/apps/web` and the lookup missed the tracked data file. The
 * fail-closed guard then did its job perfectly and took the whole board with
 * it: `/api/cron/board-fill` and `/api/cron/generate-signal-slate` returned
 * 500 for every run (measured 16x and 8x on deployment
 * dpl_5w9WsXUHtYq3KbMiX58gTZzKZjZR) with "bridge-premises.jsonl is missing at
 * /var/task/apps/web/data/gse-dataset/...".
 *
 * The file was never the problem — `data/gse-dataset/bridge-premises.jsonl` is
 * tracked in git (85,924 bytes, 285 measured `pregame_context_logit` holdout
 * rows, mean probability 0.560244). Only the PATH was wrong.
 *
 * So: walk UP from this module until a directory that actually contains
 * `data/gse-dataset` is found. The env override wins when set. If nothing
 * contains it, we return the conventional path anyway so the caller throws the
 * SAME honest fail-closed error naming the real location — the guard's
 * behaviour is unchanged, only the path we look in is now correct.
 */
function resolveDataRoot(): string {
  const override = process.env["GSE_DATA_ROOT"];
  if (override && override.trim().length > 0) return resolve(override.trim());

  let dir = __dirname;
  for (let hop = 0; hop < 8; hop += 1) {
    const candidate = join(dir, "data", "gse-dataset");
    if (existsSync(candidate)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break; // filesystem root reached
    dir = parent;
  }
  // Nothing found. Fall back to the conventional repo root so the caller's
  // error message names the path a reader can actually go look for.
  return process.cwd();
}

const BRIDGE_PREMISES_PATH = join(
  resolveDataRoot(),
  "data",
  "gse-dataset",
  "bridge-premises.jsonl",
);

async function meanHoldoutAssociation(): Promise<{ mean: number; rows: number }> {
  if (!existsSync(BRIDGE_PREMISES_PATH)) {
    throw new Error(
      `slate association: bridge-premises.jsonl is missing at ${BRIDGE_PREMISES_PATH} — no association on disk, slate refuses`,
    );
  }
  let count = 0;
  let sum = 0;
  const stream = createReadStream(BRIDGE_PREMISES_PATH, { encoding: "utf8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim().length === 0) continue;
    const row = JSON.parse(line) as {
      probability?: unknown;
      signal_id?: unknown;
    };
    if (row.signal_id !== "pregame_context_logit") continue;
    if (typeof row.probability !== "number" || !Number.isFinite(row.probability)) continue;
    sum += row.probability;
    count += 1;
  }
  if (count === 0) {
    throw new Error("slate association: bridge-premises.jsonl holds zero readable association rows");
  }
  return { mean: sum / count, rows: count };
}

export async function slateAssociationTrace(): Promise<SlateAcceptedTrace> {
  const association = await meanHoldoutAssociation();
  const evalResult: ReasoningEval = reasonAbout(
    {
      question:
        "Does the stored pregame bridge association justify the model-signal moneyline slate?",
      unit: "slate",
      interference: "UNKNOWN",
      targetFitOnQuestionSample: false,
    },
    [
      {
        id: "pregame_context_logit",
        readingKind: "PROBABILITY",
        probability: association.mean,
        sampleCount: association.rows,
        outcome: "home",
        claim:
          "pregame_context_logit (logistic-irls): mean association probability across the stored 2025 holdout, an association summary — not a published probability and not an edge",
      },
    ],
  );
  if (!evalResult.ok || evalResult.data.conclusion !== "ASSOCIATION_ONLY") {
    const conclusion = evalResult.ok ? evalResult.data.conclusion : "not-ok";
    const reason = evalResult.ok ? evalResult.data.reason : evalResult.reason;
    throw new Error(
      `slate association: the stored bridge premise does not yield an association (${conclusion}: ${reason}) — the slate mints nothing`,
    );
  }
  // The guard above just verified the conclusion at runtime; the type-level
  // narrowing mirrors that verified fact.
  return { ...evalResult.data, conclusion: "ASSOCIATION_ONLY" };
}
