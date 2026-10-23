/**
 * Real-data run of the reasoning benchmark over stored production picks.
 *
 * READ-ONLY. Neon hermes_ro. Scores published reasoning against the surfaces the
 * engine actually had loaded (the factorBreakdown keys), with a citation
 * vocabulary drawn from those keys plus the situational registry — so a phrase
 * naming a surface the engine never loaded counts as a hallucination instead of
 * being invisible.
 *
 * Usage: NODE_PATH=<repo>/node_modules tsx scripts/bench-reasoning.mts [limit]
 */
import { Client } from "pg";
import { recalibrateProbability } from "../../../packages/prediction-engine/src/engine/probability-recalibration.ts";
import { runSuite, type BenchmarkCase, type ReasonArtifact } from "../../../packages/prediction-engine/src/engine/reasoning-benchmark.ts";

const LIMIT = Number(process.argv[2] ?? 300);
// RECAL=1 scores the math that will actually ship (0.15 engine / 0.85 market)
// against the raw stored number, so the effect is visible through the same
// scorecard rather than in a side calculation.
const USE_RECAL = process.env.RECAL === "1";

/** jsonb nulls are common in these columns; Number(null) is 0 and slips guards. */
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

const HUMANISE = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").toLowerCase();

async function main() {
  const cs = process.env.DATABASE_URL;
  if (!cs) throw new Error("DATABASE_URL not set");
  const client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows } = await client.query<{
    id: string;
    selection: string | null;
    reasoning: string;
    factorBreakdown: Record<string, unknown>;
    result: string;
    homeTeamName: string | null;
    bookmakerCount: number | null;
    consensusPct: number | null;
    confidence: number | null;
    edgeScore: number | null;
  }>(
    `select p.id, p.selection, p.reasoning, p."factorBreakdown", p.result, g."homeTeamName",
              p."bookmakerCount", p."consensusPct", p.confidence, p."edgeScore"
       from picks p
       left join games g on g.id = p."gameId"
      where p.result in ('WIN','LOSS')
        and p.reasoning is not null and length(p.reasoning) > 20
        and p."factorBreakdown" ? 'fairProbability'
      order by p."generatedAt" desc
      limit $1`,
    [LIMIT],
  );
  await client.end();

  // Vocabulary: every surface key the engine has ever loaded, humanised, plus the
  // templated phrases the current reasoning actually uses. A phrase the engine
  // never loaded still reads as a citation and lands in grounding as a miss.
  const vocab = new Map<string, string>();
  for (const r of rows) for (const k of Object.keys(r.factorBreakdown)) vocab.set(HUMANISE(k), k);
  for (const [phrase, key] of [
    ["bookmakers", "bookmakerCount"],
    ["line moving", "lineMovementScore"],
    ["market depth", "marketDepthScore"],
    ["consensus", "consensusScore"],
    ["data quality", "dataQualityScore"],
    ["volatility", "volatilityPenalty"],
  ] as const) {
    if (!vocab.has(phrase)) vocab.set(phrase, key);
  }
  const patterns = [...vocab.entries()].sort((a, b) => b[0].length - a[0].length);

  const cases: BenchmarkCase[] = [];
  const artifacts: ReasonArtifact[] = [];
  let unpriced = 0;

  for (const r of rows) {
    const fb = r.factorBreakdown;
    // The ARTIFACT probability is the engine's own fairProbability. Scoring
    // marketFairProb here makes the Brier comparison vacuous (the artifact and
    // the baseline become the same number).
    const prob = num(fb["fairProbability"]);
    const mfp = num(fb["marketFairProb"]);
    if (prob === null || prob <= 0 || prob >= 1 || mfp === null || mfp <= 0 || mfp >= 1) {
      unpriced += 1;
      continue;
    }
    const sel = (r.selection ?? "").toUpperCase();
    const side: ReasonArtifact["side"] = sel.startsWith("OVER")
      ? "OVER"
      : sel.startsWith("UNDER")
        ? "UNDER"
        : r.homeTeamName && sel.startsWith(r.homeTeamName.toUpperCase())
          ? "HOME"
          : "AWAY";
    const text = r.reasoning.toLowerCase();
    const cited = patterns.filter(([phrase]) => text.includes(phrase)).map(([, key]) => key);
    const facts: Record<string, number | string | null> = {};
    for (const [k, v] of Object.entries(fb)) {
      if (typeof v === "number" || typeof v === "string") facts[k] = v;
    }

    // Loaded = the breakdown keys PLUS the pick's own populated market columns.
    // The templated reasoning cites those columns ("2 bookmakers", "line moving"),
    // which are real inputs; scoring them as hallucinations was an artefact of
    // looking only inside factorBreakdown.
    const loaded = [...Object.keys(fb)];
    if (r.bookmakerCount !== null) loaded.push("bookmakerCount");
    if (r.consensusPct !== null) loaded.push("consensusPct");
    if (r.confidence !== null) loaded.push("confidence");
    if (r.edgeScore !== null) loaded.push("edgeScore");

    cases.push({
      id: r.id,
      loadedSurfaces: loaded,
      // WIN/LOSS only in the query, so the cast is safe.
      outcome: r.result === "WIN" ? 1 : 0,
      marketProb: mfp,
      facts,
    });
    const scored = USE_RECAL ? (recalibrateProbability(prob, mfp)?.prob ?? prob) : prob;
    if (scored !== prob) {
      facts["fairProbability"] = scored;
      facts["marketFairProb"] = mfp;
    }
    artifacts.push({ caseId: r.id, reasonText: r.reasoning, prob: scored, side, citedSurfaces: cited });
  }

  const card = runSuite(cases, artifacts);
  const failCounts = new Map<string, number>();
  for (const c of card.cases) {
    for (const f of c.failures) failCounts.set(f.replace(/: .*/, ""), (failCounts.get(f.replace(/: .*/, "")) ?? 0) + 1);
  }

  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        scored: card.n,
        settled: card.settled,
        unpriced,
        meanGrounding: +card.meanGrounding.toFixed(4),
        meanConsistency: +card.meanConsistency.toFixed(4),
        meanSpecificity: +card.meanSpecificity.toFixed(4),
        meanFalsifier: +card.meanFalsifier.toFixed(4),
        meanRubric: +card.meanRubric.toFixed(2),
        brier: card.brier === null ? null : +card.brier.toFixed(4),
        marketBrier: card.marketBrier === null ? null : +card.marketBrier.toFixed(4),
        leaderboardReady: card.leaderboardReady,
        blockers: card.blockers,
        failureCounts: Object.fromEntries([...failCounts.entries()].sort((a, b) => b[1] - a[1])),
        worst: card.cases.sort((a, b) => a.rubric - b.rubric).slice(0, 5).map((c) => ({ id: c.caseId, rubric: +c.rubric.toFixed(1), f: c.failures })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
