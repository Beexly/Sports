/**
 * Classify a settled pick's stored result against the SETTLE-TIME EVIDENCE its
 * settlement event carries (ledger C-120), so a contradiction between the
 * stored result and the score now on the game row can be attributed
 * (ledger C-115) instead of guessed at.
 *
 * THE QUESTION THIS ANSWERS. When a settled pick's result disagrees with the
 * final on its own game row there are two very different explanations:
 *
 *   MIS_GRADED            the grader's OWN inputs, the score and line it
 *                         recorded at settle time, do not produce the result
 *                         it stored. The grade is wrong.
 *   GAME_ROW_OVERWRITTEN  the recorded inputs DO produce the stored result,
 *                         and the score on the game row today is a different
 *                         score. The grade was right; the row changed later
 *                         (the C-115 root cause: a cross-fixture score bind).
 *
 * Before C-120 nothing recorded what a pick was graded against, so the two
 * were indistinguishable. This module only reads that record; it never
 * decides which score is TRUE (that needs an outside source, see
 * docs/ops/GROUND_TRUTH_AUDIT_2026-09-07.md) and it never writes.
 *
 * FAIL CLOSED. Every gap in the record is its own class, never a guess:
 * NO_EVIDENCE for rows settled before the graders recorded evidence,
 * VOID_EVIDENCE where a void recorded no score, UNGRADEABLE where the
 * selection cannot be read. The arithmetic is expectedResult from
 * apps/web/lib/ops/settlement-contradiction.ts, exact-name matching only.
 *
 * Pure. No Prisma, no I/O; the CLI in scripts/ops/classify-settlement-evidence.ts
 * loads rows and prints what this returns.
 */
import {
  expectedResult,
  type DetectorPickType,
  type FinalScoreInput,
  type GradedOutcome,
  type SettledPickInput,
} from "../../../apps/web/lib/ops/settlement-contradiction";

/**
 * The settle-time evidence record, as the four settlement lanes write it and
 * the outbox worker carries it (apps/web/lib/settlement-outbox/worker.ts,
 * SettledWithEvidence). Re-declared here, with the same narrowing, so this
 * read-only tool does not import the worker and everything the worker
 * imports; a test pins the two readers to the same answers.
 */
export type SettleTimeEvidence = {
  readonly homeScore: number | null;
  readonly awayScore: number | null;
  readonly sources: readonly string[];
  readonly path: string;
  /** Absent on events written before the graded line was recorded; null on a void. */
  readonly gradedLine?: number | null;
};

/** Narrow an unknown event payload to its settle-time evidence, if it has any. */
export function evidenceFrom(payload: unknown): SettleTimeEvidence | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = (payload as { settledWith?: unknown }).settledWith;
  if (typeof raw !== "object" || raw === null) return null;
  const e = raw as Record<string, unknown>;
  const home = e["homeScore"];
  const away = e["awayScore"];
  const sources = e["sources"];
  const path = e["path"];
  if (home !== null && typeof home !== "number") return null;
  if (away !== null && typeof away !== "number") return null;
  if (!Array.isArray(sources) || sources.some((x) => typeof x !== "string")) return null;
  if (typeof path !== "string") return null;
  const gradedLine = e["gradedLine"];
  if (gradedLine !== undefined && gradedLine !== null) {
    if (typeof gradedLine !== "number" || !Number.isFinite(gradedLine)) return null;
  }
  return {
    homeScore: home,
    awayScore: away,
    sources: sources as string[],
    path,
    ...(gradedLine === undefined ? {} : { gradedLine }),
  };
}

export type EvidenceClass =
  | "NO_EVIDENCE"
  | "VOID_EVIDENCE"
  | "UNGRADEABLE"
  | "CONSISTENT"
  | "GAME_ROW_OVERWRITTEN"
  | "MIS_GRADED";

export type EvidenceClassifyInput = {
  readonly pick: {
    readonly id: string;
    readonly pickType: DetectorPickType;
    readonly selection: string;
    /** The line the card displays. */
    readonly line: number | null;
    readonly clvLockLine: number | null;
    readonly result: string;
  };
  /** The game row AS IT IS NOW. */
  readonly game: FinalScoreInput;
  /** The pick's settlement event payload, or null when no event exists. */
  readonly eventPayload: unknown;
};

export type EvidenceClassification = {
  readonly pickId: string;
  readonly cls: EvidenceClass;
  /** What the evidence score and line produce. Null when not computable. */
  readonly recomputed: GradedOutcome | null;
  readonly stored: string;
  readonly evidence: SettleTimeEvidence | null;
  /** The line the classification used, and where it came from. */
  readonly gradedLineUsed: number | null;
  readonly gradedLineSource: "evidence" | "row" | "none";
  /** Evidence score differs from the game row's score today. */
  readonly scoreDiffers: boolean | null;
  /** The line used for grading differs from the displayed line (ledger C-143). */
  readonly lineDiffers: boolean;
  /** A short, human-readable reason for the class. */
  readonly why: string;
};

const GRADED: ReadonlySet<string> = new Set(["WIN", "LOSS", "PUSH"]);

function fin(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/**
 * The grading line to check against: the recorded one when the event has it,
 * else the selectGradingLine rule (clvLockLine ?? line) applied to the row.
 * The reconstruction is reliable for clvLockLine, which is immutable after
 * publish, and only approximate for a legacy no-lock row whose `line` may
 * have moved; the source is reported so a reader can tell the two apart.
 */
function gradingLineFor(
  pick: EvidenceClassifyInput["pick"],
  evidence: SettleTimeEvidence,
): { line: number | null; source: "evidence" | "row" | "none" } {
  if (pick.pickType === "MONEYLINE") return { line: null, source: "none" };
  if (evidence.gradedLine !== undefined) {
    return fin(evidence.gradedLine)
      ? { line: evidence.gradedLine, source: "evidence" }
      : { line: null, source: "none" };
  }
  const fromRow = pick.clvLockLine ?? pick.line;
  return fin(fromRow) ? { line: fromRow, source: "row" } : { line: null, source: "none" };
}

export function classifyAgainstEvidence(input: EvidenceClassifyInput): EvidenceClassification {
  const { pick, game } = input;
  const evidence = evidenceFrom(input.eventPayload);
  const displayed = fin(pick.line) ? pick.line : null;
  const base = {
    pickId: pick.id,
    stored: pick.result,
    evidence,
  };

  if (!GRADED.has(pick.result)) {
    return {
      ...base,
      cls: "UNGRADEABLE",
      recomputed: null,
      gradedLineUsed: null,
      gradedLineSource: "none",
      scoreDiffers: null,
      lineDiffers: false,
      why: `stored result ${pick.result} asserts nothing about a score`,
    };
  }
  if (evidence === null) {
    return {
      ...base,
      cls: "NO_EVIDENCE",
      recomputed: null,
      gradedLineUsed: null,
      gradedLineSource: "none",
      scoreDiffers: null,
      lineDiffers: false,
      why: "no settledWith record on the settlement event (settled before C-120, or the event is missing)",
    };
  }
  if (!fin(evidence.homeScore) || !fin(evidence.awayScore)) {
    return {
      ...base,
      cls: "VOID_EVIDENCE",
      recomputed: null,
      gradedLineUsed: null,
      gradedLineSource: "none",
      scoreDiffers: null,
      lineDiffers: false,
      why: `evidence carries no score (path ${evidence.path}); a void grades against nothing`,
    };
  }

  const { line, source } = gradingLineFor(pick, evidence);
  const lineDiffers =
    pick.pickType !== "MONEYLINE" && line !== null && displayed !== null && line !== displayed;
  const pickInput: SettledPickInput = {
    pickType: pick.pickType,
    selection: pick.selection,
    line: displayed,
    clvLockLine: pick.clvLockLine,
    result: pick.result,
  };
  const evidenceFinal: FinalScoreInput = {
    sportKey: game.sportKey,
    homeTeamName: game.homeTeamName,
    awayTeamName: game.awayTeamName,
    homeScore: evidence.homeScore,
    awayScore: evidence.awayScore,
  };
  const recomputed = expectedResult(pickInput, evidenceFinal, line);
  const scoreDiffers =
    fin(game.homeScore) && fin(game.awayScore)
      ? game.homeScore !== evidence.homeScore || game.awayScore !== evidence.awayScore
      : null;

  if (recomputed === null) {
    return {
      ...base,
      cls: "UNGRADEABLE",
      recomputed,
      gradedLineUsed: line,
      gradedLineSource: source,
      scoreDiffers,
      lineDiffers,
      why:
        line === null && pick.pickType !== "MONEYLINE"
          ? "no finite grading line on the evidence or the row"
          : "selection does not name a side of this fixture exactly (no fuzzy matching, by design)",
    };
  }

  if (recomputed !== pick.result) {
    return {
      ...base,
      cls: "MIS_GRADED",
      recomputed,
      gradedLineUsed: line,
      gradedLineSource: source,
      scoreDiffers,
      lineDiffers,
      why:
        `the recorded score ${evidence.homeScore}-${evidence.awayScore}` +
        (line === null ? "" : ` at line ${line} (${source})`) +
        ` produces ${recomputed}, not the stored ${pick.result}`,
    };
  }

  if (scoreDiffers === true) {
    return {
      ...base,
      cls: "GAME_ROW_OVERWRITTEN",
      recomputed,
      gradedLineUsed: line,
      gradedLineSource: source,
      scoreDiffers,
      lineDiffers,
      why:
        `graded correctly against ${evidence.homeScore}-${evidence.awayScore}; ` +
        `the game row now reads ${game.homeScore}-${game.awayScore}`,
    };
  }

  return {
    ...base,
    cls: "CONSISTENT",
    recomputed,
    gradedLineUsed: line,
    gradedLineSource: source,
    scoreDiffers,
    lineDiffers,
    why:
      scoreDiffers === null
        ? "the recorded inputs produce the stored result; the game row carries no score to compare"
        : lineDiffers
          ? `the recorded inputs produce the stored result; the card shows ${displayed} while the grade used ${line} (C-143)`
          : "the recorded inputs produce the stored result and match the game row",
  };
}

export type EvidenceTally = Readonly<Record<EvidenceClass, number>> & { readonly total: number };

const CLASSES: readonly EvidenceClass[] = [
  "MIS_GRADED",
  "GAME_ROW_OVERWRITTEN",
  "CONSISTENT",
  "NO_EVIDENCE",
  "VOID_EVIDENCE",
  "UNGRADEABLE",
];

export function tallyEvidence(rows: readonly EvidenceClassification[]): EvidenceTally {
  const counts: Record<EvidenceClass, number> = {
    MIS_GRADED: 0,
    GAME_ROW_OVERWRITTEN: 0,
    CONSISTENT: 0,
    NO_EVIDENCE: 0,
    VOID_EVIDENCE: 0,
    UNGRADEABLE: 0,
  };
  for (const r of rows) counts[r.cls] += 1;
  return { ...counts, total: rows.length };
}

/** Plain-text summary lines for the console, one per class, in decision order. */
export function formatEvidenceTally(t: EvidenceTally): string[] {
  const out = [`${t.total} settled pick(s) classified against their settle-time evidence:`];
  for (const c of CLASSES) out.push(`  ${c.padEnd(21)} ${String(t[c]).padStart(5)}`);
  return out;
}

/** One console line per pick, for the rows worth a human's attention. */
export function formatEvidenceRow(r: EvidenceClassification): string {
  const ev = r.evidence
    ? `evidence ${r.evidence.homeScore ?? "-"}-${r.evidence.awayScore ?? "-"} via ${r.evidence.path}`
    : "no evidence";
  const line =
    r.gradedLineUsed === null ? "" : ` line ${r.gradedLineUsed} (${r.gradedLineSource})${r.lineDiffers ? " differs from card" : ""}`;
  return `${r.pickId}  ${r.cls.padEnd(21)} stored ${r.stored.padEnd(4)} recomputed ${(r.recomputed ?? "-").padEnd(4)} ${ev}${line}  ${r.why}`;
}
