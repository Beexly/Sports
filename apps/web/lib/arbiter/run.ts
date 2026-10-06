/**
 * Arbiter runner: the wired path from two persisted claims to a recorded ruling.
 *
 * This is the module production code calls. It is NOT a library with no caller:
 * `apps/web/app/api/cron/arbiter-adjudication/route.ts` invokes it, and that
 * route is registered in `vercel.json` and in `CRON_MANIFEST`. A detector and a
 * parser that nothing imports would prove nothing, so the runner and the cron
 * are the same commit.
 *
 * THE FOUR STEPS, IN ORDER, AND WHY
 * ---------------------------------
 *   1. `loadDisagreementPairs`   read the two paths' rows for a window
 *   2. `detectDisagreement`      pure: is this actually a disagreement
 *   3. `adjudicateOne`           budget check, Opus-tier call, fail-closed parse
 *   4. `recordArbiterDecision`   append the ruling, gradable later
 *
 * Step 2 runs BEFORE any money is spent. A window with no disagreements costs
 * zero model calls, and an arbiter that called the model to be told "there is no
 * disagreement" would be both wasteful and a source of fabricated rulings.
 *
 * BUDGET. The call is gated on the same `MODEL_COURT_ANSWER` monthly budget the
 * Model Court surface already uses, and every attempt (success, policy failure,
 * HTTP error) is recorded against it, because a call that is not recorded is a
 * call whose cost nobody can see. When the budget refuses, the runner returns
 * `budget_refused` and adjudicates nothing. It does not retry, does not fall
 * back to a cheaper tier, and does not route around the cap: silently dropping
 * to Sonnet because Opus was unaffordable would make the recorded `modelName` a
 * lie, and the whole point of recording it is that it is not.
 *
 * FAIL-OPEN ON INFRASTRUCTURE, FAIL-CLOSED ON CONTENT. A missing API key, a
 * database error, or a transport failure produces a recorded REJECTED row (or a
 * `persisted: false` result the caller logs), never a ruling. The arbiter has no
 * path that invents a verdict: there is no default branch that picks a winner
 * when the model is unavailable.
 */

import { resolveModelCatalog } from "@/lib/claude-api/model-router";
import { callClaude } from "@/lib/claude-api/provider-dispatch";
import {
  evaluateClaudeBudgetUsage,
  estimateClaudeCostUsd,
  type ClaudeApiBudgetPolicy,
} from "@/lib/claude-api/cost-monitor";
import { loadClaudeBudgetPolicy } from "@/lib/claude-api/budget-store";
import {
  getCurrentMonthClaudeSpendUsd,
  recordClaudeApiCall,
} from "@/lib/claude-api/usage-store";
import { db, type PickType, type Prisma } from "@sports/db";
import { selectionIsHomeSide } from "@sports/prediction-engine";
import {
  detectDisagreement,
  isReasoningPathRow,
  type Disagreement,
  type PathClaim,
  type SideResolver,
} from "./disagreement";
import {
  buildArbiterPrompt,
  parseRuling,
  SYSTEM_PROMPT,
  type RulingOutcome,
} from "./verdict";
import { ARBITER_DECISION_TYPE, recordArbiterDecision, terminalArbiterPairKey } from "./ledger";

/**
 * The budget surface the arbiter spends against.
 *
 * Reuses `MODEL_COURT_ANSWER` rather than adding a surface. `ClaudeApiSurface` is
 * a closed union and `claude-api-cost-monitor.test.ts` pins its exact contents,
 * so introducing a new member would mean editing a test that exists to catch
 * exactly that. The arbiter is doing the same work the Model Court surface does
 * (a deep, cited adjudication of a fixture), so charging it there is also the
 * honest accounting rather than a workaround.
 */
const ARBITER_BUDGET_SURFACE = "MODEL_COURT_ANSWER" as const;

/**
 * Max tokens for one ruling. A verdict is a three-key JSON object; 700 leaves
 * generous room for a two-sentence rationale while bounding the worst case, and
 * the number is a CONSTANT rather than a default so the cost ceiling per call
 * does not drift with a library upgrade.
 */
const ARBITER_MAX_TOKENS = 700;

/** Temperature 0: a tie-break between two recorded claims is not a creative act. */
const ARBITER_TEMPERATURE = 0;

type Env = Record<string, string | undefined>;

type PickRow = {
  readonly id: string;
  readonly gameId: string;
  readonly pickType: string;
  readonly selection: string;
  readonly confidence: number;
  readonly bookmakerCount: number;
  readonly edgeScore: number;
  readonly pickGrade: string;
  readonly modelVersion: string;
  readonly game: {
    readonly id: string;
    readonly homeTeamName: string;
    readonly awayTeamName: string;
  };
};

/** What the cron reports back. Every field is a count, never a narrative. */
export type ArbiterPassResult = {
  /** Pairs examined, before any disagreement test. */
  readonly pairsExamined: number;
  /**
   * PAIRS found, not disagreements. Named for what it is: the number of
   * (reasoning, legacy) pairs the scan put side by side, whether or not the
   * detector then called them a disagreement. A field called
   * `disagreementsFound` that counts pairs would report a healthy board as full
   * of disputes, so the pair count and the disagreement count are separate
   * numbers and neither borrows the other's name.
   */
  readonly pairsFound: number;
  /** Pairs the detector actually called SIDE_CONFLICT or CONFIDENCE_CLASH. */
  readonly disagreementsFound: number;
  /** Disagreements skipped because a terminal ruling is already on the ledger. */
  readonly alreadyRecorded: number;
  /** Model calls actually issued. Zero when the budget refused. */
  readonly modelCalls: number;
  /** Rulings that parsed and validated. */
  readonly rulingsAccepted: number;
  /** Outputs the parser refused. Recorded, never retried into a verdict. */
  readonly rulingsRejected: number;
  /** Rulings (accepted, undecided, or rejected) that reached the ledger. */
  readonly recorded: number;
  /** Rulings that were reached but could NOT be written. Surfaced, not hidden. */
  readonly recordFailures: number;
  /** Set when the monthly budget refused every call in this pass. */
  readonly budgetRefused: boolean;
  /** The model id every ruling in this pass was issued against. */
  readonly modelName: string;
  readonly notes: readonly string[];
};

/**
 * The Opus tier, resolved through the one auditable place that decides it.
 *
 * `resolveModelCatalog(env).opus` honors `MODEL_OPUS` / `CLAUDE_MODEL_OPUS`, so
 * promoting the arbiter to a verified Opus 5.5 id is an env change plus a
 * verified cloud map, exactly as `JYNX_MARKET_TIER_MAP.md` requires. No model
 * id is written into this file.
 */
export function resolveArbiterModel(env: Env = process.env): string {
  return resolveModelCatalog(env).opus;
}

/**
 * One claim, as persisted. The path is derived from the row's own defining
 * facts, never from a column that could be set wrongly: a model-signal row is a
 * `(model signal)` selection with zero books behind it.
 */
function toClaim(row: PickRow, path: PathClaim["path"]): PathClaim {
  return {
    path,
    pickId: row.id,
    pickType: row.pickType,
    selection: row.selection,
    confidence: row.confidence,
    bookmakerCount: row.bookmakerCount,
    edgeScore: Number.isFinite(row.edgeScore) ? row.edgeScore : null,
    pickGrade: row.pickGrade ?? null,
    modelVersion: row.modelVersion,
    isModelSignal: isReasoningPathRow(row),
  };
}

/**
 * The pairs worth adjudicating in a window.
 *
 * `picks` carries `@@unique([gameId, pickType])`, so for one fixture and one
 * market only one row can survive, and a window of published picks yields pairs
 * only where DUPLICATE game rows for the same real contest each carry a row from
 * a different producer. That is the collision `model-signal-coherence.ts`
 * suppresses at display time; this is where it becomes visible and gradable.
 *
 * The `mergedIntoGameId: null` filter is the database's own canonicity marker
 * (C-117), so an alias row never contributes a pair here. `limit` caps how many
 * disagreements one pass will pay to adjudicate. The read is sized from that
 * cap and then backfilled: `take` on the ordered scan can land between the two
 * rows of one pair, and dropping that pair without saying so is how a collision
 * disappears. A partner that shares the orphan's game and market is fetched
 * before pairing. The cap is applied to complete disagreements afterwards.
 */
function windowWhere(from: Date, to: Date): Prisma.PickWhereInput {
  return {
    generatedAt: { gte: from, lt: to },
    isPublished: true,
    game: { mergedIntoGameId: null },
  };
}

function scanPicks(where: Prisma.PickWhereInput, take?: number): Promise<PickRow[]> {
  return db.pick.findMany({
    where,
    select: {
      id: true,
      gameId: true,
      pickType: true,
      selection: true,
      confidence: true,
      bookmakerCount: true,
      edgeScore: true,
      pickGrade: true,
      modelVersion: true,
      game: { select: { id: true, homeTeamName: true, awayTeamName: true } },
    },
    orderBy: { generatedAt: "desc" },
    ...(take === undefined ? {} : { take }),
  });
}

/** One-sided groups. Their partner may have sorted past the row ceiling. */
function orphanedPairSlots(
  rows: readonly PickRow[],
): ReadonlyArray<{ readonly gameId: string; readonly pickType: PickType; readonly presentId: string }> {
  const groups = new Map<
    string,
    { gameId: string; pickType: string; reasoning?: PickRow; legacy?: PickRow }
  >();
  for (const row of rows) {
    const key = `${row.gameId}|${row.pickType}`;
    const bucket = groups.get(key) ?? { gameId: row.gameId, pickType: row.pickType };
    if (isReasoningPathRow(row)) bucket.reasoning ??= row;
    else bucket.legacy ??= row;
    groups.set(key, bucket);
  }
  const orphans: Array<{ gameId: string; pickType: PickType; presentId: string }> = [];
  for (const bucket of groups.values()) {
    const present = bucket.reasoning ?? bucket.legacy;
    if (!present || (bucket.reasoning && bucket.legacy)) continue;
    orphans.push({
      gameId: bucket.gameId,
      pickType: present.pickType as PickType,
      presentId: present.id,
    });
  }
  return orphans;
}

export type DisagreementScan = {
  readonly rows: readonly PickRow[];
  /** True when the ordered read hit its ceiling and a partner backfill ran. */
  readonly saturated: boolean;
  readonly readCeiling: number;
};

export async function loadDisagreementPairs(
  from: Date,
  to: Date,
  limit: number,
): Promise<DisagreementScan> {
  const readCeiling = Math.max(1, limit) * 2;
  const first = await scanPicks(windowWhere(from, to), readCeiling);
  if (first.length < readCeiling) {
    return { rows: first, saturated: false, readCeiling };
  }

  const orphans = orphanedPairSlots(first);
  if (orphans.length === 0) {
    return { rows: first, saturated: true, readCeiling };
  }

  const partners = await scanPicks({
    ...windowWhere(from, to),
    OR: orphans.map((slot) => ({
      gameId: slot.gameId,
      pickType: slot.pickType,
      id: { not: slot.presentId },
    })),
  });
  const seen = new Set(first.map((row) => row.id));
  const rows = [...first];
  for (const row of partners) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    rows.push(row);
  }
  return { rows, saturated: true, readCeiling };
}

/**
 * Pair keys that already have a terminal ruling inside this window.
 *
 * `decision_date >= from` is enough: a pick only stays in the scan while
 * `generatedAt >= from`, and a ruling is written after that pick exists, so
 * the earlier hourly pass's row is still inside the window.
 */
async function loadTerminalPairKeys(since: Date): Promise<Set<string>> {
  const stored = await db.jarvisDecision.findMany({
    where: {
      decision_type: ARBITER_DECISION_TYPE,
      decision_date: { gte: since },
    },
    select: { source_refs: true, status: true, rationale: true },
  });
  const keys = new Set<string>();
  for (const row of stored) {
    const key = terminalArbiterPairKey(row);
    if (key) keys.add(key);
  }
  return keys;
}

/** Group rows by fixture + market, keeping the two producers apart. */
export function pairByFixtureAndMarket(
  rows: readonly PickRow[],
): ReadonlyArray<{ readonly reasoning: PickRow; readonly legacy: PickRow }> {
  const groups = new Map<string, { reasoning?: PickRow; legacy?: PickRow }>();
  for (const row of rows) {
    const key = `${row.gameId}|${row.pickType}`;
    const bucket = groups.get(key) ?? {};
    if (isReasoningPathRow(row)) {
      // Keep the FIRST reasoning row per key: rows are newest-first, so this is
      // the most recent claim from that path, which is the one a reader saw.
      bucket.reasoning ??= row;
    } else {
      bucket.legacy ??= row;
    }
    groups.set(key, bucket);
  }
  const pairs: Array<{ reasoning: PickRow; legacy: PickRow }> = [];
  for (const bucket of groups.values()) {
    if (bucket.reasoning && bucket.legacy) {
      pairs.push({ reasoning: bucket.reasoning, legacy: bucket.legacy });
    }
  }
  return pairs;
}

/**
 * Side resolution for one fixture, delegating to the engine's boundary-aware
 * matcher so this module cannot reintroduce the prefix-collision side bug.
 */
function sideResolverFor(row: PickRow): SideResolver {
  return (selection: string) => {
    const isHome = selectionIsHomeSide(
      selection,
      row.game.homeTeamName,
      row.game.awayTeamName,
    );
    if (isHome) return "HOME";
    const isAway = selectionIsHomeSide(
      selection,
      row.game.awayTeamName,
      row.game.homeTeamName,
    );
    return isAway ? "AWAY" : null;
  };
}

export type AdjudicateOneResult = {
  readonly ruling: RulingOutcome;
  readonly modelName: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
  /** True when the call failed for infrastructure reasons, not content reasons. */
  readonly transportFailed: boolean;
};

/**
 * Adjudicate one disagreement: budget check, one Opus-tier call, fail-closed
 * parse. Never throws. Every terminal condition returns a `RulingOutcome`, and
 * the rejection reason distinguishes "declined" from "emitted something we
 * refused", because those two mean very different things about the arbiter.
 */
export async function adjudicateOne(
  gameId: string,
  disagreement: Disagreement,
  options: {
    readonly env?: Env;
    readonly fetchImpl?: typeof fetch;
    readonly monthlySpendUsd?: number;
    readonly budgetPolicy?: ClaudeApiBudgetPolicy;
    readonly budgetOverrideActive?: boolean;
  } = {},
): Promise<AdjudicateOneResult> {
  const env = options.env ?? process.env;
  const modelName = resolveArbiterModel(env);
  const empty = {
    modelName,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
    durationMs: 0,
    transportFailed: false,
  };

  const [spend, loaded] =
    typeof options.monthlySpendUsd === "number" && options.budgetPolicy
      ? [
          options.monthlySpendUsd,
          { policy: options.budgetPolicy, overrideActive: options.budgetOverrideActive ?? false },
        ]
      : await Promise.all([
          getCurrentMonthClaudeSpendUsd(ARBITER_BUDGET_SURFACE),
          loadClaudeBudgetPolicy(ARBITER_BUDGET_SURFACE),
        ]);

  if (!loaded.overrideActive) {
    const usage = evaluateClaudeBudgetUsage(ARBITER_BUDGET_SURFACE, spend, loaded.policy);
    if (!usage.requestAllowed) {
      return {
        ...empty,
        ruling: {
          verdict: null,
          confidence: null,
          reasoning: null,
          rejection: "BUDGET_REFUSED",
        },
        transportFailed: true,
      };
    }
  }

  const apiKey = env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return {
      ...empty,
      ruling: {
        verdict: null,
        confidence: null,
        reasoning: null,
        rejection: "NO_API_KEY",
      },
      transportFailed: true,
    };
  }

  try {
    const result = await callClaude({
      apiKey,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
      model: modelName,
      maxTokens: ARBITER_MAX_TOKENS,
      temperature: ARBITER_TEMPERATURE,
      system: SYSTEM_PROMPT,
      user: buildArbiterPrompt(disagreement),
      cache: { system: true },
    });

    const ruling = parseRuling(result.text, disagreement);
    const costUsd = estimateClaudeCostUsd(result.inputTokens, result.outputTokens);

    // Recorded on EVERY terminal path, including a rejected parse. A call whose
    // cost is not written down is spend nobody can attribute.
    await recordClaudeApiCall({
      surface: ARBITER_BUDGET_SURFACE,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      estimatedCostUsd: costUsd,
      userId: null,
      gameId,
      templateKind: "arbiter-adjudication",
      durationMs: result.durationMs,
      success: ruling.verdict !== null,
      errorKind: ruling.verdict === null ? `POLICY_${ruling.rejection}` : null,
    });

    return {
      ruling,
      modelName: result.modelName,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd,
      durationMs: result.durationMs,
      transportFailed: false,
    };
  } catch (error) {
    // Infrastructure failure. Recorded as a rejection with a transport code, so
    // the ledger shows the arbiter did not rule rather than showing a ruling
    // that was never made. Never rethrown: one dead call must not end a pass.
    const code = error instanceof Error ? error.name : "UNKNOWN_ERROR";
    return {
      ...empty,
      ruling: {
        verdict: null,
        confidence: null,
        reasoning: null,
        rejection: `TRANSPORT_${code}`,
      },
      transportFailed: true,
    };
  }
}

/**
 * One full pass over a window: detect, adjudicate, record.
 *
 * Never throws. The caller's primary job (the ingestion cron this runs beside)
 * must not be endangered by arbitration work, so every failure is counted and
 * reported instead of propagated.
 */
export async function runArbiterPass(
  options: {
    readonly from: Date;
    readonly to?: Date;
    readonly limit?: number;
    readonly env?: Env;
    readonly fetchImpl?: typeof fetch;
  },
): Promise<ArbiterPassResult> {
  const to = options.to ?? new Date();
  const limit = options.limit ?? 500;
  const env = options.env ?? process.env;
  const notes: string[] = [];

  const scan = await loadDisagreementPairs(options.from, to, limit);
  if (scan.saturated) {
    notes.push(
      `Pair scan hit its ${scan.readCeiling}-row read ceiling. Partners of a ` +
        "split pair were backfilled; a pair whose both rows sat past the ceiling was not.",
    );
  }

  const pairs = pairByFixtureAndMarket(scan.rows);
  const recordedKeys = await loadTerminalPairKeys(options.from);
  let modelCalls = 0;
  let accepted = 0;
  let rejected = 0;
  let recorded = 0;
  let recordFailures = 0;
  let budgetRefused = false;
  let disagreementsFound = 0;
  let alreadyRecorded = 0;
  let adjudicated = 0;

  for (const pair of pairs) {
    const verdict = detectDisagreement(
      toClaim(pair.reasoning, "REASONING"),
      toClaim(pair.legacy, "LEGACY"),
      sideResolverFor(pair.reasoning),
    );
    if (verdict.kind !== "SIDE_CONFLICT" && verdict.kind !== "CONFIDENCE_CLASH") {
      continue;
    }
    disagreementsFound += 1;

    const pairKey = `${pair.reasoning.id}|${pair.legacy.id}`;
    if (recordedKeys.has(pairKey)) {
      alreadyRecorded += 1;
      continue;
    }
    if (adjudicated >= limit) {
      continue;
    }
    adjudicated += 1;

    const result = await adjudicateOne(pair.reasoning.gameId, verdict, {
      env,
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    });
    modelCalls += 1;
    if (result.ruling.verdict === null) {
      rejected += 1;
      if (result.ruling.rejection === "BUDGET_REFUSED") budgetRefused = true;
    } else {
      accepted += 1;
    }

    const stored = await recordArbiterDecision({
      gameId: pair.reasoning.gameId,
      disagreement: verdict,
      outcome: result.ruling,
      modelName: result.modelName,
      decidedAt: new Date(),
    });
    if (stored.persisted) {
      recorded += 1;
    } else {
      recordFailures += 1;
      notes.push(
        `Ruling for game ${pair.reasoning.gameId} was NOT recorded: ${stored.error ?? "unknown"}`,
      );
    }
  }

  if (disagreementsFound - alreadyRecorded > limit) {
    notes.push(
      `Adjudication cap of ${limit} held. ${disagreementsFound - alreadyRecorded - limit} ` +
        "new disagreement(s) were left for the next pass.",
    );
  }

  return {
    pairsExamined: scan.rows.length,
    pairsFound: pairs.length,
    disagreementsFound,
    alreadyRecorded,
    modelCalls,
    rulingsAccepted: accepted,
    rulingsRejected: rejected,
    recorded,
    recordFailures,
    budgetRefused,
    modelName: resolveArbiterModel(env),
    notes,
  };
}
