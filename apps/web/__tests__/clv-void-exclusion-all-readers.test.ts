import { describe, expect, it } from "vitest";
import {
  CLV_SAMPLE_RESULT_FILTER,
  CLV_WITHDRAWN_RESULT,
  carriesLiveClvClaim,
  withdrawnClvStripped,
} from "@/lib/clv/clv-sample-policy";
import { loadPublicClvPolicy } from "@/lib/performance/public-clv-policy";
import { loadUserClvLedger } from "@/lib/clv/user-clv-ledger";
import { buildGroundedContext } from "@/lib/pick-explainer/grounding";

/**
 * C-279 (ledger C-197 / C-278; Devin Review #733 round 6).
 *
 * Round 4 fixed the public policy and the grading drain, and round 6 found the
 * SAME defect still live on the Elite member ledger — because the rule lived in
 * two files instead of one. This file exists so the rule cannot be half-applied
 * again: one test per reader of `clvVerdict`, each proving a VOID pick carrying
 * a preserved BEAT_CLOSE never surfaces as a live claim.
 *
 * Every reader found by `git grep -l clvVerdict`, and its status. Stated
 * precisely, because "audited" and "unit-tested here" are not the same claim:
 *
 *   UNIT-TESTED IN THIS FILE
 *     public-clv-policy.ts        query filter
 *     user-clv-ledger.ts          query filter   <- the round-6 red
 *     pick-explainer/grounding.ts already correct — pinned, not changed
 *
 *   UNIT-TESTED ELSEWHERE
 *     free-path-clv.ts            query filter   (line-integrity-void-clv-exclusion)
 *
 *   CHANGED, VERIFIED BY INSPECTION AND TYPECHECK ONLY — neither is cheaply
 *   unit-testable: `loadProofOfRecord` imports `db` directly rather than
 *   taking it, and admin/clv is a server component.
 *     load-proof-of-record.ts     shaping: VOID rows are KEPT (withdrawal is
 *                                 part of the record) with the CLV claim blanked
 *     app/admin/clv/page.tsx      query filter on the aggregate
 *
 *   AUDITED, NO CHANGE NEEDED
 *     clv-coverage.ts             already narrower: `in: [WIN, LOSS, PUSH]`
 *     proof/page.tsx, track/platform/page.tsx, api/picks/[id]/explain,
 *       api/admin/losses/[pickId]/draft — renderers over the loaders above,
 *       so they inherit the fix rather than needing their own
 *     packages/prediction-engine/historical-replay.ts — offline replay harness
 *       that grades its own synthetic picks; no withdrawal concept, no surface
 *     packages/ingestion-pipeline/settle-sport.ts — a WRITER, not a reader
 *
 * No scores or win rates below — pick states, lines and verdict labels only.
 */

describe("the shared predicate", () => {
  it("names VOID as the withdrawal and exposes both boundaries", () => {
    expect(CLV_WITHDRAWN_RESULT).toBe("VOID");
    expect(CLV_SAMPLE_RESULT_FILTER).toEqual({ not: "VOID" });
    expect(carriesLiveClvClaim("WIN")).toBe(true);
    expect(carriesLiveClvClaim("PUSH")).toBe(true);
    expect(carriesLiveClvClaim("VOID")).toBe(false);
  });

  it("blanks only the CLV fields of a withdrawn row, leaving the row itself", () => {
    const row = { result: "VOID", clvVerdict: "BEAT_CLOSE", clvValue: 1.5, id: "p1" };
    expect(withdrawnClvStripped(row)).toEqual({
      result: "VOID",
      clvVerdict: null,
      clvValue: null,
      id: "p1",
    });
    const kept = { result: "WIN", clvVerdict: "BEAT_CLOSE", clvValue: 1.5, id: "p2" };
    expect(withdrawnClvStripped(kept)).toBe(kept);
  });
});

describe("reader: loadPublicClvPolicy", () => {
  it("excludes VOID from every count", async () => {
    const wheres: Array<Record<string, unknown>> = [];
    const db = {
      pick: {
        count: async (args: { where: Record<string, unknown> }) => {
          wheres.push(args.where);
          return 0;
        },
      },
    };
    await loadPublicClvPolicy(db, { canExposePerformanceStats: true, minGradedForPublic: 10 });
    expect(wheres).toHaveLength(4);
    for (const w of wheres) expect(w["result"]).toEqual({ not: "VOID" });
  });
});

describe("reader: loadUserClvLedger (the round-6 red)", () => {
  function ledgerDb(rows: Array<Record<string, unknown>>) {
    let where: Record<string, unknown> = {};
    return {
      where: () => where,
      db: {
        pick: {
          findMany: async (args: { where: Record<string, unknown> }) => {
            where = args.where;
            const filter = args.where["result"] as { notIn?: string[] } | undefined;
            const blocked = filter?.notIn ?? [];
            return rows.filter((r) => !blocked.includes(r["result"] as string));
          },
        },
      },
    };
  }

  const voided = {
    id: "voided",
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.2",
    line: -3.25,
    result: "VOID",
    settledAt: new Date("2026-09-01T23:00:00Z"),
    clvValue: 1.5,
    clvKind: "POINTS",
    clvVerdict: "BEAT_CLOSE",
    clvCloseLine: -1.5,
    clvClosePrice: null,
    clvLockLine: -3.25,
    clvLockPrice: null,
    game: { sport: { name: "NFL" } },
  };

  it("asks the database to exclude PENDING and VOID", async () => {
    const h = ledgerDb([voided]);
    await loadUserClvLedger(h.db as never, true);
    expect(h.where()["result"]).toEqual({ notIn: ["PENDING", "VOID"] });
  });

  it("a withdrawn pick with a preserved BEAT_CLOSE never reaches a member row", async () => {
    const h = ledgerDb([voided]);
    const out = await loadUserClvLedger(h.db as never, true);
    expect(out.locked).toBe(false);
    expect(out.rows).toEqual([]);
  });

  it("still returns nothing when the member cannot use the ledger", async () => {
    const h = ledgerDb([voided]);
    const out = await loadUserClvLedger(h.db as never, false);
    expect(out).toEqual({ locked: true, rows: [] });
  });
});

describe("reader: pick-explainer grounding", () => {
  const game = {
    homeTeamName: "Fixture Home Bears",
    awayTeamName: "Fixture Away Hawks",
    sport: "NFL",
    commenceTime: new Date("2026-09-01T20:00:00Z"),
  };
  const basePick = {
    pickType: "SPREAD",
    selection: "Fixture Home Bears -3.5",
    line: -3.5,
    confidence: 70,
    edgeScore: 10,
    modelVersion: "v5.2.7",
    generatedAt: new Date("2026-09-01T12:00:00Z"),
    factorBreakdown: null,
    clvKind: "POINTS",
    clvValue: 1.5,
    clvVerdict: "BEAT_CLOSE",
  };
  const ground = (result: string): string =>
    buildGroundedContext({
      game,
      pick: { ...basePick, result },
      snapshot: null,
    } as never).context;

  // This reader was ALREADY correct and the audit changed nothing: the CLV
  // block sits inside `decisiveResult` (WIN | LOSS | PUSH), which excludes VOID
  // one level up. An earlier revision of this sweep added a redundant guard
  // here; the test could not fail, which is how the redundancy was found. What
  // is pinned now is the real protection, so widening `decisiveResult` breaks.
  it("grounds neither the outcome nor the CLV claim for a withdrawn pick", () => {
    const voided = ground("VOID");
    expect(voided).not.toContain("CLOSING-LINE VALUE");
    expect(voided).not.toContain("OUTCOME:");
  });

  it("still includes both for a pick that stood", () => {
    const stood = ground("LOSS");
    expect(stood).toContain("CLOSING-LINE VALUE");
    expect(stood).toContain("OUTCOME: LOSS");
  });
});
