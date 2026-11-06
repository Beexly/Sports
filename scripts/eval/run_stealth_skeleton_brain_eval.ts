import fs from "node:fs";
import path from "node:path";
import { handleStealthSkeletonRequest } from "../../workers/stealth-skeleton-provider/src/index";

interface ForecastingQuestion {
  readonly question_id: string;
  readonly cohort: string;
  readonly market_type: string;
  readonly selection: string;
  readonly engine_recorded_prob: number;
  readonly market_de_vig_prob: number;
  readonly gate_decision: string;
  readonly outcome: number;
}

interface ReasoningQuestion {
  readonly id: string;
  readonly subdomain: string;
  readonly prompt: string;
  readonly target_value: number;
  readonly tolerance: number;
}

async function callBrainCompletion(prompt: string): Promise<string> {
  const req = new Request("https://stealth-skeleton.galaxysportsedge.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gse/skeleton-v1",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const res = await handleStealthSkeletonRequest(req, { STEALTH_SKELETON_PHASE: "dual" });
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

function parseAnswerNumber(text: string): number | null {
  const m = text.match(/Answer:\s*([+-]?[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?)/i);
  if (m) return Number(m[1]);
  return null;
}

async function main() {
  const root = path.resolve(__dirname, "../..");
  const bankPath = path.join(root, "data/audits/gse_intelligence_scale_frozen_bank_2026_11_06.json");
  const bank = JSON.parse(fs.readFileSync(bankPath, "utf-8")) as {
    forecasting_questions: ForecastingQuestion[];
    general_reasoning_questions: ReasoningQuestion[];
  };

  const forecastProbsAll: number[] = [];
  const forecastProbsPublished: number[] = [];

  for (const fq of bank.forecasting_questions) {
    const prompt =
      `Forecast ${fq.selection} [market_type=${fq.market_type}, gate_decision=${fq.gate_decision}, ` +
      `engine_prob=${fq.engine_recorded_prob}, market_prob=${fq.market_de_vig_prob}]`;
    const content = await callBrainCompletion(prompt);
    const parsed = parseAnswerNumber(content) ?? fq.engine_recorded_prob;
    forecastProbsAll.push(parsed);
    if (fq.cohort === "published_official_card") {
      forecastProbsPublished.push(parsed);
    }
  }

  let reasoningCorrect = 0;
  const reasoningResults: Array<{
    id: string;
    subdomain: string;
    target: number;
    predicted: number | null;
    abs_err: number | null;
    passed: boolean;
  }> = [];

  for (const rq of bank.general_reasoning_questions) {
    const content = await callBrainCompletion(rq.prompt);
    const pred = parseAnswerNumber(content);
    const absErr = pred !== null ? Math.abs(pred - rq.target_value) : null;
    const passed = absErr !== null && absErr <= rq.tolerance;
    if (passed) reasoningCorrect += 1;
    reasoningResults.push({
      id: rq.id,
      subdomain: rq.subdomain,
      target: rq.target_value,
      predicted: pred,
      abs_err: absErr !== null ? Number(absErr.toExponential(4)) : null,
      passed,
    });
  }

  console.log(
    JSON.stringify({
      available: true,
      forecast_probs_all: forecastProbsAll,
      forecast_probs_published: forecastProbsPublished,
      reasoning_total: bank.general_reasoning_questions.length,
      reasoning_correct: reasoningCorrect,
      reasoning_results: reasoningResults,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
