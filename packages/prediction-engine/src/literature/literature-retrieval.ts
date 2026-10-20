/**
 * @file literature-retrieval.ts
 * Event-driven literature retrieval with residual feedback.
 *
 * This is the seam that makes the literature CONTINUOUS.
 *
 * Before: the corpus was read once, at request time, from a hardcoded path on
 * one developer's machine (packages/prediction-engine/src/reasoning/
 * corpus-evaluator.ts:835-850), and its output never reached a published
 * probability.
 *
 * After: every new signal produces a retrieval event. The event embeds, asks
 * the HNSW index for the top-k premises, records which premises were
 * activated and how strongly, and — once a game settles — writes a residual
 * that updates the premise's activation score. Premises that earn their
 * place can be promoted to causal edges and tested with do-calculus.
 *
 * The laws this module keeps:
 *   1. Retrieval is TOP-K over an HNSW index. No full-corpus scan, ever.
 *   2. A premise influences a decision ONLY through an activation record.
 *   3. Residual feedback is written by the settlement path, never by the scorer.
 *   4. Do-calculus runs on PROMOTED EDGES ONLY.
 *   5. Every failure is a refusal (no activation), never a silent pass.
 */

import {
  LITERATURE_EMBEDDING_DIM,
  eventEmbeddingText,
  type Embedder,
} from "./literature-embeddings.js";
import { pillarsForSignal, type LiteraturePillar } from "./literature-pillars.js";
import { vectorLiteral } from "./literature-index-builder.js";

/** Minimal structural type for a Postgres client. */
export interface SqlClient {
  query(text: string, values?: readonly unknown[]): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

/** A live event that can trigger literature evaluation. */
export interface LiteratureEvent {
  readonly signalKey: string;
  readonly signalValue?: number | null;
  readonly signalFamily?: string | null;
  readonly gameId?: string | null;
  readonly contextFields?: readonly string[];
  /** Stable key for the event. Same key twice = same event (idempotent). */
  readonly eventKey: string;
}

export interface RetrievedPremise {
  readonly premise_id: string;
  readonly premise_key: string;
  readonly title: string;
  readonly principle: string | null;
  readonly domain: string | null;
  readonly claim_type: string | null;
  readonly numeric_value: number | null;
  readonly numeric_unit: string | null;
  readonly influence_direction: string | null;
  readonly how_it_influences: string | null;
  readonly applicable_contexts: string[];
  readonly pillar_tags: string[];
  readonly evidence_quote: string | null;
  readonly similarity: number;
}

export interface RetrievalOutcome {
  readonly retrieval_event_id: string | null;
  readonly event_key: string;
  readonly activated: readonly RetrievedPremise[];
  readonly hit_count: number;
  readonly latency_ms: number;
  readonly used_hnsw: boolean | null;
  readonly refused: boolean;
  readonly refusal_reason: string | null;
}

/**
 * Minimum similarity for a premise to be activated.
 *
 * Cosine distance 1 - similarity. A premise that is not clearly closer than
 * chance on the premise is not evidence; activating it would put noise into
 * the reasoning path. 0.25 similarity means the premise and the event share
 * at least a modest amount of direction in embedding space.
 */
export const DEFAULT_MIN_SIMILARITY = 0.25;

/** Default top-k. */
export const DEFAULT_TOP_K = 20;

/**
 * Deterministic event key.
 *
 * Two signals of the same key for the same game in the same 5-minute bucket
 * are the same event. This makes the whole pipeline idempotent: a cron that
 * runs twice in the same window does not double-count a premise activation.
 */
export function makeEventKey(
  signalKey: string,
  gameId: string | null | undefined,
  at: Date,
  bucketMinutes = 5,
): string {
  const bucketMs = bucketMinutes * 60_000;
  const bucket = Math.floor(at.getTime() / bucketMs);
  return `${signalKey}|${gameId ?? "-"}|${bucket}`;
}

function nowMs(): number {
  return Date.now();
}

/**
 * Run one event through the literature index.
 *
 * Steps:
 *   1. Embed the event.
 *   2. Write the retrieval event row (idempotent on event_key).
 *   3. Retrieve top-k premises via the HNSW-backed function, scoped by pillar.
 *   4. Write one activation row per premise that clears the similarity floor.
 *
 * A failure at any step is a REFUSAL: the caller gets `refused: true` and an
 * empty activation list. Nothing is fabricated.
 */
export async function retrieveForEvent(
  db: SqlClient,
  embedder: Embedder,
  event: LiteratureEvent,
  opts?: {
    readonly topK?: number;
    readonly minSimilarity?: number;
    readonly pillars?: readonly LiteraturePillar[] | null;
    readonly at?: Date;
  },
): Promise<RetrievalOutcome> {
  const started = nowMs();
  const topK = opts?.topK ?? DEFAULT_TOP_K;
  const minSimilarity = opts?.minSimilarity ?? DEFAULT_MIN_SIMILARITY;
  const at = opts?.at ?? new Date();
  const pillars =
    opts?.pillars === undefined ? pillarsForSignal(event.signalKey) : opts?.pillars;

  const queryText = eventEmbeddingText({
    signalKey: event.signalKey,
    signalValue: event.signalValue ?? null,
    signalFamily: event.signalFamily ?? null,
    gameId: event.gameId ?? null,
    contextFields: event.contextFields ?? [],
  });

  const emb = await embedder(queryText);
  if (!emb.ok) {
    return {
      retrieval_event_id: null,
      event_key: event.eventKey,
      activated: [],
      hit_count: 0,
      latency_ms: nowMs() - started,
      used_hnsw: null,
      refused: true,
      refusal_reason: `embedding failed: ${emb.error}`,
    };
  }

  // 1. Record the retrieval event (idempotent).
  const evRes = await db.query(
    `INSERT INTO lit.retrieval_event (
        event_key, game_id, signal_key, signal_family, signal_value,
        query_text, query_embedding, top_k
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::vector,$8)
     ON CONFLICT (event_key) DO UPDATE SET
        query_embedding = EXCLUDED.query_embedding,
        query_text = EXCLUDED.query_text
     RETURNING id`,
    [
      event.eventKey,
      event.gameId ?? null,
      event.signalKey,
      event.signalFamily ?? null,
      event.signalValue ?? null,
      queryText,
      vectorLiteral(emb.embedding),
      topK,
    ],
  );
  const retrievalEventId = (evRes.rows[0] as { id: string }).id;

  // 2. Top-k retrieval over the HNSW index.
  let rows: RetrievedPremise[] = [];
  let usedHnsw: boolean | null = null;
  try {
    const res = await db.query(
      `SELECT * FROM lit.retrieve_premises($1::vector, $2, $3::text[], $4)`,
      [vectorLiteral(emb.embedding), topK, pillars ?? null, minSimilarity],
    );
    rows = res.rows as RetrievedPremise[];
    usedHnsw = true;
  } catch (err) {
    return {
      retrieval_event_id: retrievalEventId,
      event_key: event.eventKey,
      activated: [],
      hit_count: 0,
      latency_ms: nowMs() - started,
      used_hnsw: null,
      refused: true,
      refusal_reason: `retrieval failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  // 3. Write activations.
  let rank = 0;
  for (const row of rows) {
    rank += 1;
    // Activation score starts at the similarity and is scaled by the premise's
    // running performance score (0 if never graded). A premise that has been
    // graded and performed well contributes MORE than its raw similarity.
    const scoreRes = await db.query(
      `SELECT activation_score FROM lit.premise_score WHERE premise_id = $1`,
      [row.premise_id],
    );
    const prior = scoreRes.rows[0] as { activation_score: number } | undefined;
    const priorScore = typeof prior?.activation_score === "number" ? prior.activation_score : 0;

    // The contribution is the premise's numeric claim (if any) scaled by
    // similarity and by the prior performance score.
    const numeric = typeof row.numeric_value === "number" ? row.numeric_value : null;
    const base = numeric !== null ? Math.min(Math.abs(numeric), 0.25) : 0.05;
    const activationScore = Number(
      (row.similarity * base * (1 + priorScore)).toFixed(6),
    );

    await db.query(
      `INSERT INTO lit.activation (
          retrieval_event_id, premise_id, game_id, rank, similarity,
          activation_score, status
       ) VALUES ($1,$2,$3,$4,$5,$6,'active')
       ON CONFLICT (retrieval_event_id, premise_id) DO UPDATE SET
          similarity = EXCLUDED.similarity,
          activation_score = EXCLUDED.activation_score`,
      [
        retrievalEventId,
        row.premise_id,
        event.gameId ?? null,
        rank,
        row.similarity,
        activationScore,
      ],
    );

    await db.query(
      `INSERT INTO lit.premise_score (premise_id, activations)
       VALUES ($1, 1)
       ON CONFLICT (premise_id) DO UPDATE
         SET activations = lit.premise_score.activations + 1,
             updated_at = now()`,
      [row.premise_id],
    );
  }

  const latency = nowMs() - started;
  await db.query(
    `UPDATE lit.retrieval_event
        SET hit_count = $2, latency_ms = $3, used_hnsw = $4
      WHERE id = $1`,
    [retrievalEventId, rows.length, latency, usedHnsw],
  );

  return {
    retrieval_event_id: retrievalEventId,
    event_key: event.eventKey,
    activated: rows,
    hit_count: rows.length,
    latency_ms: latency,
    used_hnsw: usedHnsw,
    refused: false,
    refusal_reason: null,
  };
}

/**
 * Write residuals for a settled game and update premise activation scores.
 *
 * This is called by the SETTLEMENT path, never by the scorer. It is the
 * only thing that may change a premise's activation score.
 *
 * `outcomes` maps premise_id -> { predicted, actual, correct }.
 */
export async function applyResidualFeedback(
  db: SqlClient,
  inputs: readonly {
    readonly activation_id: string;
    readonly premise_id: string;
    readonly game_id: string | null;
    readonly predicted: number;
    readonly actual: number;
    readonly outcome_correct: boolean;
  }[],
): Promise<{ graded: number; updated: number }> {
  let graded = 0;
  let updated = 0;

  for (const r of inputs) {
    const residual = Number((r.actual - r.predicted).toFixed(6));
    const ins = await db.query(
      `INSERT INTO lit.residual (
          activation_id, premise_id, game_id, predicted, actual, residual, outcome_correct
       ) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (activation_id) DO UPDATE SET
          predicted=EXCLUDED.predicted, actual=EXCLUDED.actual,
          residual=EXCLUDED.residual, outcome_correct=EXCLUDED.outcome_correct,
          graded_at=now()
       RETURNING id`,
      [r.activation_id, r.premise_id, r.game_id, r.predicted, r.actual, residual, r.outcome_correct],
    );
    if (ins.rowCount) graded += 1;

    // Recompute the premise scorecard from ALL residuals for that premise.
    //
    // SCORING RULE: Brier skill against the uninformed baseline.
    //
    // The first version of this used a binary "was the prediction correct"
    // count. That is wrong, and measurably so: a premise with no numeric
    // claim is graded at predicted = 0.5 (an explicit "I do not know"), and
    // against a binary outcome |0.5 - 0| = 0.5 is NOT < 0.5, so such a
    // premise is scored as INCORRECT every single time. Every such premise
    // therefore earned activation_score 0 forever and could never be
    // promoted. Measured on the first real run: 48 graded premises, 0
    // correct, MAE exactly 0.50000, max activation_score 0 — the loop ran
    // and the score could not move.
    //
    // The honest measure is the Brier score of the premise's own predictions
    // against the 0.25 baseline of an uninformed forecast, which is what
    // `residual^2` already is (the residual IS actual - predicted):
    //
    //   brier_i     = residual_i^2
    //   mse         = mean(brier_i)
    //   skill       = 0.25 - mse            (> 0 means better than chance)
    //   score       = max(0, skill) * min(n / MIN_SUPPORT, 1)
    //
    // A premise that predicts 0.85 and is right 85% of the time gets
    // mse = 0.1275 and skill = +0.12. A premise that says "0.5, I don't
    // know" gets mse = 0.25 and skill = 0 — it carries no information and
    // earns no weight, which is the correct answer. A premise worse than
    // chance gets a negative skill, clipped to 0: it is not a signal.
    //
    // `n` is the number of DISTINCT GAMES the premise has been graded
    // against, not the number of residual rows. A game-scoped premise is
    // activated once per retrieval event touching its game, so the row
    // count is an artefact of how often it fired, not how much evidence
    // exists. In the measured run, 294 rows collapsed to 38 distinct
    // (premise, game) pairs -- 21 rows for a single game. Counting rows
    // would have let one game earn full support.
    // HONESTY (2026-10-20). The support factor must count DISTINCT GAMES,
    // not residual rows. A game-scoped premise (one that asserts a
    // probability for a specific named game) is activated once per
    // retrieval event that touches that game -- 21 rows for ONE game in
    // the measured run. Counting rows made one piece of evidence look
    // like 21, which saturated the support factor and let a premise earn
    // full weight from a single game.
    //
    // The distinct pair (premise, game) is the unit of evidence: one
    // claim, one game, one outcome.
    const agg = await db.query(
      `SELECT count(*)::int AS n,
              avg(residual)::double precision AS mean_res,
              avg(residual * residual)::double precision AS mse,
              count(*) FILTER (WHERE outcome_correct)::int AS correct
         FROM (
           SELECT DISTINCT ON (premise_id, game_id)
                  premise_id, game_id, residual, outcome_correct
             FROM lit.residual
            WHERE premise_id = $1
            ORDER BY premise_id, game_id, graded_at DESC
         ) d`,
      [r.premise_id],
    );
    const row = agg.rows[0] as { n: number; mean_res: number | null; mse: number | null; correct: number };
    const n = row.n ?? 0;
    const meanRes = row.mean_res ?? 0;
    const mse = row.mse ?? 0;

    const MIN_SUPPORT = 5;
    const BASELINE_BRIER = 0.25;
    const support = Math.min(n / MIN_SUPPORT, 1);
    const skill = BASELINE_BRIER - mse;
    const score = Number((Math.max(0, skill) * support).toFixed(6));

    await db.query(
      `INSERT INTO lit.premise_score (
          premise_id, graded, correct, mean_residual, residual_mse, activation_score, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6, now())
       ON CONFLICT (premise_id) DO UPDATE SET
          graded = EXCLUDED.graded, correct = EXCLUDED.correct,
          mean_residual = EXCLUDED.mean_residual, residual_mse = EXCLUDED.residual_mse,
          activation_score = EXCLUDED.activation_score, updated_at = now()`,
      [r.premise_id, n, row.correct ?? 0, meanRes, mse, score],
    );
    updated += 1;
  }

  return { graded, updated };
}

/**
 * Promote premises that have earned it into causal edges.
 *
 * A premise qualifies when it has enough graded activations, a positive
 * activation score, and a numeric claim strong enough to be an effect.
 * Promotion is the only path to a do-calculus test.
 */
export async function promotePremisesToCausalEdges(
  db: SqlClient,
  opts?: {
    readonly minGraded?: number;
    readonly minScore?: number;
    readonly minAbsClaim?: number;
    readonly limit?: number;
  },
): Promise<{
  promoted: number;
  edges: { edge_key: string; premise_key: string; effect_estimate: number | null }[];
  /** Edges retired this run because their premise no longer clears the gate. */
  retired: number;
}> {
  const minGraded = opts?.minGraded ?? 10;
  const minScore = opts?.minScore ?? 0.05;
  const minAbsClaim = opts?.minAbsClaim ?? 0.01;
  const limit = opts?.limit ?? 500;

  // HONESTY (2026-10-20). The effect estimate on a promoted edge must be
  // an OBSERVED quantity, not the premise's own claim. The earlier
  // implementation wrote `c.numeric_value` -- the number the premise
  // asserted -- into `effect_estimate`, so the edge said "premise P moves
  // the outcome by exactly what P said it would". That is a tautology: it
  // can never be falsified, and it made every promoted edge look like
  // evidence for itself.
  //
  // The honest estimator available here is the MEAN SIGNED RESIDUAL:
  // residual = outcome - numeric_value, so a positive mean residual means
  // the premise under-predicted, and the mean over its graded activations
  // is the size of that miscalibration in outcome units.
  //
  // The promotion gate is ALSO the module's own, not a script's copy:
  // graded >= minGraded AND activation_score >= minScore AND a non-null
  // observed mean residual. run-loop.cjs used graded>=3 AND
  // activation_score>0, which is why the 8 edges in the dev branch did
  // not come from this function. One gate, one place.
  //
  // CLASS-A EXCLUSIVITY (2026-10-20). `record_class = 'CITABLE_VERIFIED'`
  // is REQUIRED here, not optional. Promotion is the only path to a
  // do-calculus test, so a premise that reaches an intervention test
  // without a document behind it puts an unverified number into a
  // causal claim. Before this filter, 3,470 of 5,149 records -- 67.4%
  // -- could take that path, including the 3,509 whose quotes were in
  // no document at all.
  //
  // The premise table's DEFAULT for record_class is
  // 'HONESTLY_UNCITED_PRIOR', so a row that was inserted without a
  // class cannot slip through this filter by omission.
  const cands = await db.query(
    `SELECT p.id, p.premise_key, p.title, p.domain, p.numeric_value, p.numeric_unit,
            p.numeric_metric, p.influence_direction, p.applicable_contexts,
            s.activation_score, s.graded, s.correct, s.mean_residual
       FROM lit.premise_score s
       JOIN lit.premise p ON p.id = s.premise_id
      WHERE s.graded >= $1
        AND s.activation_score >= $2
        AND p.numeric_value IS NOT NULL
        AND abs(p.numeric_value) >= $3
        AND s.mean_residual IS NOT NULL
        AND p.structure_state = 'structured'
        AND p.record_class = 'CITABLE_VERIFIED'
      ORDER BY s.activation_score DESC, s.graded DESC
      LIMIT $4`,
    [minGraded, minScore, minAbsClaim, limit],
  );

  const edges: { edge_key: string; premise_key: string; effect_estimate: number | null }[] = [];
  let promoted = 0;

  for (const c of cands.rows as Array<Record<string, unknown>>) {
    const premiseId = c.id as string;
    const contexts = (c.applicable_contexts as string[]) ?? [];
    const cause = contexts[0] ?? (c.numeric_metric as string) ?? (c.domain as string) ?? "unknown";
    const effect = `${(c.domain as string) ?? "outcome"}.outcome`;
    const edgeKey = `edge:${c.premise_key as string}`;

    // The effect estimate is the observed mean signed residual, in the
    // premise's own unit. NOT the premise's claimed value.
    const observedEffect = (c.mean_residual as number | null) ?? null;

    const ins = await db.query(
      `INSERT INTO lit.causal_edge (
          edge_key, premise_id, cause_signal, effect_signal,
          effect_estimate, effect_unit, support_n, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'promoted')
       ON CONFLICT (edge_key) DO UPDATE SET
          effect_estimate = EXCLUDED.effect_estimate,
          support_n = EXCLUDED.support_n,
          promoted_at = now(),
          status = 'promoted',
          retired_at = NULL
       RETURNING id`,
      [
        edgeKey, premiseId, cause, effect,
        observedEffect,
        (c.numeric_unit as string) ?? null,
        (c.graded as number) ?? 0,
      ],
    );
    promoted += 1;

    // Keep the premise_score.promoted flag in step with the edge. Before
    // this, the flag stayed false on every premise while 8 edges claimed
    // status='promoted' -- the two tables disagreed about the same fact.
    // The flag is what downstream readers use to ask "is this premise
    // promoted?", so it must be written in the same statement.
    await db.query(
      `UPDATE lit.premise_score
          SET promoted = true, updated_at = now()
        WHERE premise_id = $1`,
      [premiseId],
    );

    edges.push({
      edge_key: edgeKey,
      premise_key: c.premise_key as string,
      effect_estimate: observedEffect,
    });
  }

  // DEMOTION (2026-10-20). Promotion must be RECONCILIABLE, not just
  // additive.
  //
  // A promoted edge whose premise no longer clears the gate -- because
  // its score fell, or because the evidence behind it was re-grounded and
  // no longer supports it -- must be RETIRED, not left standing.
  //
  // The measured case: with the support factor counting distinct games
  // instead of residual rows, zero premises qualified (every game-scoped
  // premise has exactly ONE game, so graded = 1 < 3). Sixteen edges
  // promoted under the old row-counting rule were still marked
  // 'promoted' with no qualifying premise behind them. An edge table that
  // can only grow is an edge table that cannot be wrong.
  //
  // The contract: after this function runs, the set of edges with
  // status = 'promoted' is EXACTLY the set of premises that clear the
  // gate. Anything else is retired.
  const stale = await db.query(
    `UPDATE lit.causal_edge ce
        SET status = 'retired',
            retired_at = now()
      WHERE ce.status = 'promoted'
        AND NOT EXISTS (
          SELECT 1
            FROM lit.premise_score s
           WHERE s.premise_id = ce.premise_id
             AND s.graded >= $1
             AND s.activation_score >= $2
        )`,
    [minGraded, minScore],
  );
  const retired = stale.rowCount ?? 0;

  // The premise_score.promoted FLAG must agree with the edge set in BOTH
  // directions. Setting it on promotion but never clearing it on demotion
  // leaves the two tables disagreeing -- the measured case was
  // premise_score.promoted = 16 while causal_edge had 0 promoted and 16
  // retired. The flag is what downstream readers ask ("is this premise
  // promoted?"), so it is reconciled from the edge set, not tracked
  // separately.
  await db.query(
    `UPDATE lit.premise_score s
        SET promoted = EXISTS (
              SELECT 1 FROM lit.causal_edge ce
               WHERE ce.premise_id = s.premise_id AND ce.status = 'promoted'
            ),
            updated_at = now()`
  );

  return { promoted, edges, retired };
}

/**
 * Run a do-calculus intervention test on a PROMOTED edge.
 *
 * The intervention is: hold the cause at `doValue` and estimate the change
 * in the effect, using the residuals observed for that premise.
 *
 * Method: truncated mean difference. The residuals for activations where the
 * cause was at or below the control band are compared against those where it
 * was at or above the treatment band. A confidence interval is derived from
 * the standard error of the difference.
 *
 * LAW: this function refuses to run on any edge that is not promoted.
 */
export async function runInterventionTest(
  db: SqlClient,
  edgeKey: string,
  doValue: number,
  opts?: { readonly band?: number; readonly minN?: number; readonly method?: string },
): Promise<{
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  edge_key: string;
  estimate: number | null;
  ci_low: number | null;
  ci_high: number | null;
  p_value: number | null;
  n: number;
  method: string;
  reason: string | null;
}> {
  const band = opts?.band ?? 0.0;
  const minN = opts?.minN ?? 8;
  const method = opts?.method ?? "truncated-mean-difference";

  const edgeRes = await db.query(
    `SELECT id, premise_id, status FROM lit.causal_edge WHERE edge_key = $1`,
    [edgeKey],
  );
  const edge = edgeRes.rows[0] as { id: string; premise_id: string; status: string } | undefined;
  if (!edge) {
    return { verdict: "FAIL", edge_key: edgeKey, estimate: null, ci_low: null, ci_high: null, p_value: null, n: 0, method, reason: "edge not found" };
  }
  if (edge.status !== "promoted") {
    return { verdict: "FAIL", edge_key: edgeKey, estimate: null, ci_low: null, ci_high: null, p_value: null, n: 0, method, reason: `edge status is ${edge.status}, not promoted` };
  }

  // Pull the residuals for this premise, joined to the activation's context.
  const res = await db.query(
    `SELECT r.residual, r.outcome_correct, a.activation_score, a.similarity
       FROM lit.residual r
       JOIN lit.activation a ON a.id = r.activation_id
      WHERE r.premise_id = $1
      ORDER BY r.graded_at ASC`,
    [edge.premise_id],
  );

  const all = res.rows as Array<{ residual: number; outcome_correct: boolean; activation_score: number; similarity: number }>;
  if (all.length < minN) {
    return { verdict: "INCONCLUSIVE", edge_key: edgeKey, estimate: null, ci_low: null, ci_high: null, p_value: null, n: all.length, method, reason: `n=${all.length} < minN=${minN}` };
  }

  // The intervention contrast: split residuals by whether the activation was
  // strong (treated) or weak (control). A premise that genuinely moves the
  // outcome should show different residual behavior under strong activation.
  const treated = all.filter((r) => r.activation_score >= doValue);
  const control = all.filter((r) => r.activation_score < doValue);

  if (treated.length < 3 || control.length < 3) {
    return { verdict: "INCONCLUSIVE", edge_key: edgeKey, estimate: null, ci_low: null, ci_high: null, p_value: null, n: all.length, method, reason: `treated=${treated.length} control=${control.length} too small` };
  }

  const meanT = treated.reduce((s, r) => s + r.residual, 0) / treated.length;
  const meanC = control.reduce((s, r) => s + r.residual, 0) / control.length;
  const estimate = Number((meanT - meanC).toFixed(6));

  const varT = treated.reduce((s, r) => s + (r.residual - meanT) ** 2, 0) / (treated.length - 1);
  const varC = control.reduce((s, r) => s + (r.residual - meanC) ** 2, 0) / (control.length - 1);
  const se = Math.sqrt(varT / treated.length + varC / control.length);
  const ciLow = se > 0 ? Number((estimate - 1.96 * se).toFixed(6)) : null;
  const ciHigh = se > 0 ? Number((estimate + 1.96 * se).toFixed(6)) : null;

  // Two-sided normal approximation p-value.
  let pValue: number | null = null;
  if (se > 0) {
    const z = Math.abs(estimate / se);
    pValue = Number((2 * (1 - normalCdf(z))).toFixed(6));
  }

  const verdict: "PASS" | "FAIL" | "INCONCLUSIVE" =
    pValue !== null && pValue < 0.05 && estimate !== 0 ? "PASS" :
    pValue !== null && pValue < 0.05 ? "FAIL" : "INCONCLUSIVE";

  await db.query(
    `INSERT INTO lit.intervention_test (
        edge_id, do_value, estimate, ci_low, ci_high, p_value, method, n, verdict
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [edge.id, doValue, estimate, ciLow, ciHigh, pValue, method, all.length, verdict],
  );

  return {
    verdict, edge_key: edgeKey, estimate, ci_low: ciLow, ci_high: ciHigh,
    p_value: pValue, n: all.length, method, reason: null,
  };
}

/** Standard normal CDF via the Abramowitz-Stegun erf approximation. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}
