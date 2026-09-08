import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyAgainstEvidence,
  evidenceFrom,
  formatEvidenceRow,
  formatEvidenceTally,
  tallyEvidence,
  type EvidenceClassifyInput,
} from "../../../scripts/ops/lib/settlement-evidence-classify";
import {
  CLASSIFY_SELECT,
  classifyWhere,
  parseClassifyArgs,
} from "../../../scripts/ops/lib/classify-settlement-evidence-args";
import { settledWithFrom } from "@/lib/settlement-outbox/worker";

/**
 * Ledger C-115 evidence tool, built on C-120's settle-time record. The
 * classifier must attribute a contradiction to a MIS-GRADE or to a later
 * GAME-ROW OVERWRITE from the recorded inputs alone, and must refuse to guess
 * wherever the record is missing. The CLI must have no write path.
 */

const CLI_SRC = readFileSync(resolve(__dirname, "../../../scripts/ops/classify-settlement-evidence.ts"), "utf8");
const LIB_SRC = readFileSync(resolve(__dirname, "../../../scripts/ops/lib/settlement-evidence-classify.ts"), "utf8");
const ARGS_SRC = readFileSync(
  resolve(__dirname, "../../../scripts/ops/lib/classify-settlement-evidence-args.ts"),
  "utf8",
);
const ROOT_PKG = JSON.parse(readFileSync(resolve(__dirname, "../../../package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const MLB = { sportKey: "baseball_mlb", homeTeamName: "Seattle Mariners", awayTeamName: "Athletics" };

function totalInput(overrides: {
  readonly selection: string;
  readonly line: number;
  readonly clvLockLine: number | null;
  readonly result: string;
  readonly row: { home: number | null; away: number | null };
  readonly eventPayload: unknown;
  readonly id?: string;
}): EvidenceClassifyInput {
  return {
    pick: {
      id: overrides.id ?? "pick-total",
      pickType: "TOTAL",
      selection: overrides.selection,
      line: overrides.line,
      clvLockLine: overrides.clvLockLine,
      result: overrides.result,
    },
    game: { ...MLB, homeScore: overrides.row.home, awayScore: overrides.row.away },
    eventPayload: overrides.eventPayload,
  };
}

function settledWith(e: Record<string, unknown>): unknown {
  return { settledWith: { sources: ["espn-public-api"], path: "free", ...e } };
}

describe("evidenceFrom agrees with the outbox worker's settledWithFrom on every shape", () => {
  const shapes: readonly unknown[] = [
    settledWith({ homeScore: 2, awayScore: 0, gradedLine: 8.375 }),
    settledWith({ homeScore: 2, awayScore: 0 }),
    settledWith({ homeScore: null, awayScore: null, gradedLine: null, path: "zero-sit", sources: [] }),
    settledWith({ homeScore: 2, awayScore: 0, gradedLine: 0 }),
    settledWith({ homeScore: 2, awayScore: 0, gradedLine: "8.375" }),
    settledWith({ homeScore: "two", awayScore: 0 }),
    settledWith({ homeScore: 2, awayScore: 0, sources: [1] }),
    settledWith({ homeScore: 2, awayScore: 0, path: undefined }),
    { pickReceipt: { line: 6.6, clvLockLine: 8.375 } },
    null,
    "string",
  ];
  it.each(shapes.map((s, i) => [i, s] as const))("shape %i", (_i, shape) => {
    expect(evidenceFrom(shape)).toEqual(settledWithFrom(shape));
  });
});

describe("classifyAgainstEvidence", () => {
  it("GAME_ROW_OVERWRITTEN: the recorded inputs produce the stored result and the row now holds a different score", () => {
    // Ledger C-115's verified example: OVER 6.6 graded LOSS against the true
    // 2-0 (total 2, lock line 8.375); the row was later stamped 6-7 (13),
    // against which the LOSS reads as a contradiction.
    const r = classifyAgainstEvidence(
      totalInput({
        selection: "OVER 6.6",
        line: 6.6,
        clvLockLine: 8.375,
        result: "LOSS",
        row: { home: 6, away: 7 },
        eventPayload: settledWith({ homeScore: 2, awayScore: 0, gradedLine: 8.375 }),
      }),
    );
    expect(r.cls).toBe("GAME_ROW_OVERWRITTEN");
    expect(r.recomputed).toBe("LOSS");
    expect(r.scoreDiffers).toBe(true);
    expect(r.lineDiffers).toBe(true);
    expect(r.gradedLineUsed).toBe(8.375);
    expect(r.gradedLineSource).toBe("evidence");
    expect(r.why).toContain("graded correctly against 2-0");
    expect(r.why).toContain("now reads 6-7");
  });

  it("MIS_GRADED: the recorded score and line do not produce the stored result", () => {
    // Ledger C-115's worked example shape: UNDER 46.3 stored WIN on a 52-0
    // final. With the grade recorded at 46.3 the arithmetic says LOSS, so the
    // grade itself is wrong, whatever the row says today.
    const r = classifyAgainstEvidence(
      totalInput({
        selection: "UNDER 46.3",
        line: 46.3,
        clvLockLine: 53,
        result: "WIN",
        row: { home: 52, away: 0 },
        eventPayload: settledWith({ homeScore: 52, awayScore: 0, gradedLine: 46.3 }),
      }),
    );
    expect(r.cls).toBe("MIS_GRADED");
    expect(r.recomputed).toBe("LOSS");
    expect(r.scoreDiffers).toBe(false);
    expect(r.why).toContain("produces LOSS, not the stored WIN");
  });

  it("CONSISTENT with lineDiffers: the same row is explained once the recorded line is the lock (ledger C-143 population A)", () => {
    const r = classifyAgainstEvidence(
      totalInput({
        selection: "UNDER 46.3",
        line: 46.3,
        clvLockLine: 53,
        result: "WIN",
        row: { home: 52, away: 0 },
        eventPayload: settledWith({ homeScore: 52, awayScore: 0, gradedLine: 53 }),
      }),
    );
    expect(r.cls).toBe("CONSISTENT");
    expect(r.lineDiffers).toBe(true);
    expect(r.why).toContain("C-143");
  });

  it("falls back to the row's clvLockLine ?? line, and says so, when the event predates the graded-line key", () => {
    const locked = classifyAgainstEvidence(
      totalInput({
        selection: "UNDER 46.3",
        line: 46.3,
        clvLockLine: 53,
        result: "WIN",
        row: { home: 52, away: 0 },
        eventPayload: settledWith({ homeScore: 52, awayScore: 0 }),
      }),
    );
    expect(locked.gradedLineUsed).toBe(53);
    expect(locked.gradedLineSource).toBe("row");
    expect(locked.cls).toBe("CONSISTENT");

    const legacy = classifyAgainstEvidence(
      totalInput({
        selection: "UNDER 46.3",
        line: 46.3,
        clvLockLine: null,
        result: "WIN",
        row: { home: 52, away: 0 },
        eventPayload: settledWith({ homeScore: 52, awayScore: 0 }),
      }),
    );
    expect(legacy.gradedLineUsed).toBe(46.3);
    expect(legacy.gradedLineSource).toBe("row");
    expect(legacy.cls).toBe("MIS_GRADED");
  });

  it("NO_EVIDENCE: a missing event, or an expanded payload with no settledWith, is unattributable rather than guessed", () => {
    const base = {
      selection: "OVER 6.6",
      line: 6.6,
      clvLockLine: 8.375,
      result: "LOSS",
      row: { home: 6, away: 7 },
    };
    expect(classifyAgainstEvidence(totalInput({ ...base, eventPayload: null })).cls).toBe("NO_EVIDENCE");
    expect(
      classifyAgainstEvidence(
        totalInput({ ...base, eventPayload: { pickReceipt: { line: 6.6, clvLockLine: 8.375 }, result: "LOSS" } }),
      ).cls,
    ).toBe("NO_EVIDENCE");
  });

  it("VOID_EVIDENCE and UNGRADEABLE are their own classes, never MIS_GRADED", () => {
    const voided = classifyAgainstEvidence(
      totalInput({
        selection: "OVER 6.6",
        line: 6.6,
        clvLockLine: null,
        result: "WIN",
        row: { home: 6, away: 7 },
        eventPayload: settledWith({ homeScore: null, awayScore: null, gradedLine: null, path: "zero-sit", sources: [] }),
      }),
    );
    expect(voided.cls).toBe("VOID_EVIDENCE");

    const pending = classifyAgainstEvidence(
      totalInput({
        selection: "OVER 6.6",
        line: 6.6,
        clvLockLine: null,
        result: "PENDING",
        row: { home: 6, away: 7 },
        eventPayload: settledWith({ homeScore: 2, awayScore: 0 }),
      }),
    );
    expect(pending.cls).toBe("UNGRADEABLE");

    const unreadable = classifyAgainstEvidence(
      totalInput({
        selection: "OVERDUE 7",
        line: 7,
        clvLockLine: null,
        result: "WIN",
        row: { home: 6, away: 7 },
        eventPayload: settledWith({ homeScore: 2, awayScore: 0, gradedLine: 7 }),
      }),
    );
    expect(unreadable.cls).toBe("UNGRADEABLE");
    expect(unreadable.why).toContain("no fuzzy matching");
  });

  it("MONEYLINE grades with no line: the C-115 counter-example Mariners ML stored LOSS on a recorded 2-0 home win is MIS_GRADED", () => {
    const r = classifyAgainstEvidence({
      pick: {
        id: "cmtp1qor6",
        pickType: "MONEYLINE",
        selection: "Seattle Mariners ML",
        line: -120,
        clvLockLine: null,
        result: "LOSS",
      },
      game: { ...MLB, homeScore: 6, awayScore: 7 },
      eventPayload: settledWith({ homeScore: 2, awayScore: 0 }),
    });
    expect(r.cls).toBe("MIS_GRADED");
    expect(r.recomputed).toBe("WIN");
    expect(r.gradedLineUsed).toBeNull();
    expect(r.lineDiffers).toBe(false);
  });

  it("tallies every class and formats the rows a human should read", () => {
    const rows = [
      classifyAgainstEvidence(
        totalInput({
          id: "a",
          selection: "OVER 6.6",
          line: 6.6,
          clvLockLine: 8.375,
          result: "LOSS",
          row: { home: 6, away: 7 },
          eventPayload: settledWith({ homeScore: 2, awayScore: 0, gradedLine: 8.375 }),
        }),
      ),
      classifyAgainstEvidence(
        totalInput({ id: "b", selection: "OVER 6.6", line: 6.6, clvLockLine: null, result: "WIN", row: { home: 6, away: 7 }, eventPayload: null }),
      ),
    ];
    const t = tallyEvidence(rows);
    expect(t).toEqual({
      MIS_GRADED: 0,
      GAME_ROW_OVERWRITTEN: 1,
      CONSISTENT: 0,
      NO_EVIDENCE: 1,
      VOID_EVIDENCE: 0,
      UNGRADEABLE: 0,
      total: 2,
    });
    expect(formatEvidenceTally(t)[0]).toBe("2 settled pick(s) classified against their settle-time evidence:");
    expect(formatEvidenceTally(t).join("\n")).toMatch(/GAME_ROW_OVERWRITTEN\s+1/);
    const line = formatEvidenceRow(rows[0]!);
    expect(line).toContain("a  GAME_ROW_OVERWRITTEN");
    expect(line).toContain("evidence 2-0 via free");
    expect(line).toContain("line 8.375 (evidence) differs from card");
  });
});

describe("the CLI is read-only by construction", () => {
  it("has no write call in any of its three files", () => {
    for (const src of [CLI_SRC, LIB_SRC, ARGS_SRC]) {
      expect(stripComments(src)).not.toMatch(
        /updateMany|\.update\(|deleteMany|\.delete\(|upsert|\$executeRaw|\$queryRaw|\.create\(|createMany|\$transaction/,
      );
    }
    expect(stripComments(CLI_SRC)).not.toMatch(/--execute/);
  });

  it("refuses to run without a real DATABASE_URL and never invents one", () => {
    expect(CLI_SRC).toMatch(/process\.env\["DATABASE_URL"\]/);
    expect(CLI_SRC).toMatch(/url === "stub"/);
    expect(CLI_SRC).not.toMatch(/postgres(ql)?:\/\//);
  });

  it("is wired as an npm script that runs the CLI under the apps/web tsconfig", () => {
    expect(ROOT_PKG.scripts["ops:classify-settlement-evidence"]).toBe(
      "TSX_TSCONFIG_PATH=apps/web/tsconfig.json tsx scripts/ops/classify-settlement-evidence.ts",
    );
  });

  it("parses its flags and rejects anything it does not know", () => {
    expect(parseClassifyArgs([])).toEqual({ ok: true, args: { type: "TOTAL", json: false, allRows: false, pickIds: [] } });
    expect(parseClassifyArgs(["--type", "spread", "--json", "--all-rows", "--pick", "a", "--pick=b", "--pick", "a"])).toEqual({
      ok: true,
      args: { type: "SPREAD", json: true, allRows: true, pickIds: ["a", "b"] },
    });
    expect(parseClassifyArgs(["--type=all"])).toMatchObject({ ok: true, args: { type: "all" } });
    expect(parseClassifyArgs(["--type", "PROP"])).toMatchObject({ ok: false });
    expect(parseClassifyArgs(["--type"])).toEqual({ ok: false, error: "--type requires a value" });
    expect(parseClassifyArgs(["--pick", "--json"])).toEqual({ ok: false, error: "--pick requires a pick id" });
    expect(parseClassifyArgs(["--json=1"])).toEqual({ ok: false, error: "--json takes no value" });
    expect(parseClassifyArgs(["--execute"])).toEqual({ ok: false, error: 'unknown argument "--execute"' });
  });

  it("selects only published, settled, non-bootstrap rows of the requested market, and reads the event payload", () => {
    expect(classifyWhere({ type: "TOTAL", pickIds: [] })).toEqual({
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      pickType: "TOTAL",
    });
    expect(classifyWhere({ type: "all", pickIds: ["x"] })).toEqual({
      isPublished: true,
      isBootstrap: false,
      result: { in: ["WIN", "LOSS", "PUSH"] },
      id: { in: ["x"] },
    });
    expect(CLASSIFY_SELECT.settlementEvent.select.payload).toBe(true);
    expect(CLASSIFY_SELECT.clvLockLine).toBe(true);
    expect(CLASSIFY_SELECT.game.select.homeScore).toBe(true);
  });
});
