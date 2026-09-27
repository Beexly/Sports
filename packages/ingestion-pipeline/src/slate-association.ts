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
import { join, resolve } from "node:path";
import { reasonAbout, type ReasoningEval } from "./reasoning-trace.js";
import type { SlateAcceptedTrace } from "./signal-slate-options.js";

// This package compiles to CommonJS, so __dirname is the module's own
// directory; the data root is the repo root three levels up.
const BRIDGE_PREMISES_PATH = join(
  resolve(__dirname, "..", "..", ".."),
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
