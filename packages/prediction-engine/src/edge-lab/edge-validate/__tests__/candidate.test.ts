import { describe, expect, it } from "vitest";

import type { DiscreteDistribution, Probability, Rng } from "../../kernel/contract.js";
import type { Trainer } from "../../logistic.js";
import {
  EDGE_VALIDATE_METHOD_TAG,
  REFUSAL_PRECEDENCE,
  validateCandidateSpec,
  type BinaryRow,
  type CandidateSpec,
  type CountRow,
  type CountTrainer,
  type SpecCheck,
  type SpecRefusalReason,
} from "../candidate.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures — pure, deterministic, no Math.random, no clock.
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function isoAt(dayOffset: number, hour: number): string {
  return new Date(Date.UTC(2024, 8, 8) + dayOffset * DAY_MS + hour * 3_600_000).toISOString();
}

function binRow(over: Partial<BinaryRow> & { readonly id: string }): BinaryRow {
  return {
    decisionAt: isoAt(0, 12),
    eventEndAt: isoAt(0, 16),
    features: new Map<string, number>([["elo_diff", 0.2]]),
    y: 1,
    qClose: 0.55,
    family: "game_h2h",
    ...over,
  };
}

function countRow(over: Partial<CountRow> & { readonly id: string }): CountRow {
  return {
    decisionAt: isoAt(0, 12),
    eventEndAt: isoAt(0, 16),
    features: new Map<string, number>([["target_share", 0.24]]),
    observed: 5,
    family: "receptions",
    ...over,
  };
}

/** Canonical binary baseline: a Trainer that IGNORES features (market-only). */
const binaryBaseline: Trainer = (train) => {
  const wins = train.filter((e) => e.y === 1).length;
  const base = train.length > 0 ? wins / train.length : 0.5;
  return () => base;
};

const binaryTrainer: Trainer = (train) => {
  const base = train.length > 0 ? train.filter((e) => e.y === 1).length / train.length : 0.5;
  return (features) => {
    const x = features.get("elo_diff") ?? 0;
    const p = base + 0.1 * x;
    return Math.min(0.999, Math.max(0.001, p));
  };
};

/** Empirical (climatology) count distribution over the training fold. */
function empiricalCounts(values: readonly number[]): DiscreteDistribution {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const min = n > 0 ? (sorted[0] as number) : 0;
  const max = n > 0 ? (sorted[n - 1] as number) : 0;
  const cdf = (k: number): Probability => {
    if (n === 0) return k >= 0 ? 1 : 0;
    return sorted.filter((v) => v <= k).length / n;
  };
  const quantile = (p: Probability): number => {
    if (n === 0) return 0;
    for (const v of sorted) if (cdf(v) >= p) return v;
    return max;
  };
  const mean = (): number => (n === 0 ? 0 : sorted.reduce((a, b) => a + b, 0) / n);
  return {
    kind: "discrete",
    pmf: (k) => (n === 0 ? (k === 0 ? 1 : 0) : sorted.filter((v) => v === k).length / n),
    cdf,
    quantile,
    sample: (rng: Rng) => quantile(rng()),
    mean,
    variance: () => {
      if (n === 0) return 0;
      const m = mean();
      return sorted.reduce((a, b) => a + (b - m) * (b - m), 0) / n;
    },
    support: () => ({ min, max }),
  };
}

/** Canonical count baseline: climatology from the train-fold counts. */
const countBaseline: CountTrainer = (train) => {
  const dist = empiricalCounts(train.map((r) => r.observed));
  return () => dist;
};

const countTrainer: CountTrainer = (train) => {
  const dist = empiricalCounts(train.map((r) => r.observed));
  return () => dist;
};

function binarySpec(rows: readonly BinaryRow[], id = "cand_binary"): CandidateSpec {
  return {
    kind: "binary",
    id,
    rows,
    trainer: binaryTrainer,
    baseline: binaryBaseline,
    seasonOf: () => "2024",
    priced: false,
  };
}

function countSpec(rows: readonly CountRow[], id = "cand_count"): CandidateSpec {
  return {
    kind: "count",
    id,
    rows,
    trainer: countTrainer,
    baseline: countBaseline,
    seasonOf: () => "2024",
    priced: false,
  };
}

function expectRefusal(check: SpecCheck, reason: SpecRefusalReason, rowIds: readonly string[]): void {
  expect(check.ok).toBe(false);
  if (check.ok) return;
  expect(check.refuse).toBe(reason);
  expect(check.rowIds).toEqual(rowIds);
  expect(check.priced).toBe(false);
}

/** 200 deterministically-generated valid rows of each kind. */
function validBinaryCorpus(n = 200): BinaryRow[] {
  const rows: BinaryRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push(
      binRow({
        id: `bin-${i}`,
        decisionAt: isoAt(i, 12),
        eventEndAt: isoAt(i, 16),
        y: i % 2 === 0 ? 1 : 0,
        qClose: 0.2 + ((i * 7) % 60) / 100,
        kickoffWeek: (i % 17) + 2,
        cells: [
          {
            field: "avgSeparation",
            cell: { value: 2.5 + (i % 5) / 10, layer: "L1", knownAtWeek: (i % 17) + 1 },
          },
        ],
      }),
    );
  }
  return rows;
}

function validCountCorpus(n = 200): CountRow[] {
  const rows: CountRow[] = [];
  for (let i = 0; i < n; i++) {
    rows.push(
      countRow({
        id: `cnt-${i}`,
        decisionAt: isoAt(i, 12),
        eventEndAt: isoAt(i, 16),
        observed: i % 11,
        line: 4.5,
        qClose: 0.3 + ((i * 3) % 40) / 100,
        kickoffWeek: (i % 17) + 2,
        cells: [{ field: "avgYac", cell: { value: 4.1, layer: "L1", knownAtWeek: (i % 17) + 1 } }],
      }),
    );
  }
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────

describe("EV2 candidate contract — happy path", () => {
  it("stamps the method tag", () => {
    expect(EDGE_VALIDATE_METHOD_TAG).toBe("edge_validate_v1");
  });

  it("accepts a minimal binary spec with priced:false and the exact row count", () => {
    const check = validateCandidateSpec(binarySpec([binRow({ id: "a" }), binRow({ id: "b" })]));
    expect(check).toEqual({ ok: true, rowCount: 2, priced: false });
  });

  it("accepts a minimal count spec (qClose absent today, per EV1)", () => {
    const check = validateCandidateSpec(countSpec([countRow({ id: "c1" }), countRow({ id: "c2", observed: 0 })]));
    expect(check).toEqual({ ok: true, rowCount: 2, priced: false });
  });

  it("accepts a count spec with a paired line + qClose", () => {
    const check = validateCandidateSpec(countSpec([countRow({ id: "c1", line: 4.5, qClose: 0.52 })]));
    expect(check).toEqual({ ok: true, rowCount: 1, priced: false });
  });

  it("accepts cells that are strictly prior to kickoff", () => {
    const row = binRow({
      id: "a",
      kickoffWeek: 5,
      cells: [
        { field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 4 } },
        { field: "avgCushion", cell: { value: 5.1, layer: "L1", knownAtWeek: 1 } },
      ],
    });
    expect(validateCandidateSpec(binarySpec([row])).ok).toBe(true);
  });

  it("accepts a line with no qClose (line unused without a close)", () => {
    expect(validateCandidateSpec(countSpec([countRow({ id: "c1", line: 4.5 })])).ok).toBe(true);
  });

  it("the canonical baselines type-check and run (market-only / climatology)", () => {
    // Binary baseline ignores features entirely.
    const predict = binaryBaseline([
      { features: new Map([["elo_diff", 99]]), y: 1 },
      { features: new Map([["elo_diff", -99]]), y: 0 },
    ]);
    expect(predict(new Map([["elo_diff", 12345]]))).toBe(0.5);
    expect(predict(new Map())).toBe(0.5);

    // Count baseline is the train-fold empirical distribution: counts 1,1,3.
    const dist = countBaseline([
      countRow({ id: "t1", observed: 1 }),
      countRow({ id: "t2", observed: 1 }),
      countRow({ id: "t3", observed: 3 }),
    ])(new Map());
    expect(dist.kind).toBe("discrete");
    expect(dist.pmf(1)).toBeCloseTo(2 / 3, 12);
    expect(dist.pmf(3)).toBeCloseTo(1 / 3, 12);
    expect(dist.pmf(2)).toBe(0);
    expect(dist.cdf(1)).toBeCloseTo(2 / 3, 12);
    expect(dist.mean()).toBeCloseTo(5 / 3, 12);
    expect(dist.support()).toEqual({ min: 1, max: 3 });
  });
});

describe("EV2 — every refusal reason fires", () => {
  it("bad_id: blank spec id", () => {
    expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a" })], "   ")), "bad_id", []);
    expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a" })], "")), "bad_id", []);
  });

  it("bad_id: a row whose own id is blank (report joins key on it)", () => {
    const check = validateCandidateSpec(binarySpec([binRow({ id: "a" }), binRow({ id: "" }), binRow({ id: "  " })]));
    expectRefusal(check, "bad_id", ["", "  "]);
  });

  it("empty_rows", () => {
    expectRefusal(validateCandidateSpec(binarySpec([])), "empty_rows", []);
    expectRefusal(validateCandidateSpec(countSpec([])), "empty_rows", []);
  });

  it("duplicate_row_id: fold accounting and report joins key on id", () => {
    const check = validateCandidateSpec(
      binarySpec([binRow({ id: "a" }), binRow({ id: "b" }), binRow({ id: "b" }), binRow({ id: "c" })]),
    );
    expectRefusal(check, "duplicate_row_id", ["b"]);
  });

  it("duplicate_row_id: each repeated id reported once, in first-repeat order", () => {
    const check = validateCandidateSpec(
      binarySpec([
        binRow({ id: "z" }),
        binRow({ id: "y" }),
        binRow({ id: "y" }),
        binRow({ id: "z" }),
        binRow({ id: "y" }),
      ]),
    );
    expectRefusal(check, "duplicate_row_id", ["y", "z"]);
  });

  it("bad_family: must match /^[a-z0-9_]+$/", () => {
    for (const family of ["Game_H2H", "game h2h", "game-h2h", "", "game.h2h", "gameH2H"]) {
      expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", family })])), "bad_family", ["a"]);
    }
    expect(validateCandidateSpec(binarySpec([binRow({ id: "a", family: "game_h2h_2024" })])).ok).toBe(true);
  });

  it("bad_decision_time: Date.parse non-finite on either instant", () => {
    expectRefusal(
      validateCandidateSpec(binarySpec([binRow({ id: "a", decisionAt: "not-a-date" })])),
      "bad_decision_time",
      ["a"],
    );
    expectRefusal(
      validateCandidateSpec(binarySpec([binRow({ id: "a", eventEndAt: "2024-13-45T99:00:00Z" })])),
      "bad_decision_time",
      ["a"],
    );
  });

  it("event_before_decision: caught HERE, before walkForwardSplits throws mid-loop", () => {
    const row = binRow({ id: "a", decisionAt: isoAt(1, 12), eventEndAt: isoAt(0, 16) });
    expectRefusal(validateCandidateSpec(binarySpec([row])), "event_before_decision", ["a"]);
  });

  it("event_before_decision: equal instants are allowed (only strictly-before refuses)", () => {
    const same = isoAt(0, 12);
    expect(validateCandidateSpec(binarySpec([binRow({ id: "a", decisionAt: same, eventEndAt: same })])).ok).toBe(true);
  });

  it("non_integer_observed", () => {
    for (const observed of [2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectRefusal(validateCandidateSpec(countSpec([countRow({ id: "c", observed })])), "non_integer_observed", ["c"]);
    }
  });

  it("non_integer_observed: a missing observed is missing data, not a zero", () => {
    const row = { ...countRow({ id: "c" }), observed: undefined } as unknown as CountRow;
    expectRefusal(validateCandidateSpec(countSpec([row])), "non_integer_observed", ["c"]);
  });

  it("negative_observed", () => {
    expectRefusal(validateCandidateSpec(countSpec([countRow({ id: "c", observed: -1 })])), "negative_observed", ["c"]);
    expect(validateCandidateSpec(countSpec([countRow({ id: "c", observed: 0 })])).ok).toBe(true);
  });

  it("bad_qclose: closed endpoints 0 and 1 refuse (evVsClose divides by qSide)", () => {
    expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", qClose: 0 })])), "bad_qclose", ["a"]);
    expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", qClose: 1 })])), "bad_qclose", ["a"]);
    expectRefusal(validateCandidateSpec(countSpec([countRow({ id: "c", line: 4.5, qClose: 0 })])), "bad_qclose", ["c"]);
    expectRefusal(validateCandidateSpec(countSpec([countRow({ id: "c", line: 4.5, qClose: 1 })])), "bad_qclose", ["c"]);
  });

  it("bad_qclose: out of range / non-finite", () => {
    for (const qClose of [-0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", qClose })])), "bad_qclose", ["a"]);
    }
  });

  it("bad_qclose: binary rows REQUIRE a close (missing is not imputed)", () => {
    const row = { ...binRow({ id: "a" }), qClose: undefined } as unknown as BinaryRow;
    expectRefusal(validateCandidateSpec(binarySpec([row])), "bad_qclose", ["a"]);
  });

  it("qclose_without_line: a close with no usable line cannot be settled", () => {
    expectRefusal(validateCandidateSpec(countSpec([countRow({ id: "c", qClose: 0.52 })])), "qclose_without_line", ["c"]);
    expectRefusal(
      validateCandidateSpec(countSpec([countRow({ id: "c", qClose: 0.52, line: Number.NaN })])),
      "qclose_without_line",
      ["c"],
    );
  });

  it("cells_without_kickoff_week (an empty cells array still requires the week)", () => {
    const withCell = binRow({
      id: "a",
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 1 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([withCell])), "cells_without_kickoff_week", ["a"]);
    expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", cells: [] })])), "cells_without_kickoff_week", [
      "a",
    ]);
  });

  it("bad_kickoff_week: present but not an integer >= 1", () => {
    for (const kickoffWeek of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectRefusal(validateCandidateSpec(binarySpec([binRow({ id: "a", kickoffWeek })])), "bad_kickoff_week", ["a"]);
    }
    expect(validateCandidateSpec(binarySpec([binRow({ id: "a", kickoffWeek: 1 })])).ok).toBe(true);
  });

  it("bad_cell: knownAtWeek === kickoffWeek is a same-week leak (strictly prior is the law)", () => {
    const row = binRow({
      id: "a",
      kickoffWeek: 5,
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 5 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([row])), "bad_cell", ["a"]);

    const future = binRow({
      id: "a",
      kickoffWeek: 5,
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 6 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([future])), "bad_cell", ["a"]);
  });

  it("bad_cell: non-finite value / non-integer knownAtWeek", () => {
    const nanValue = binRow({
      id: "a",
      kickoffWeek: 5,
      cells: [{ field: "avgSeparation", cell: { value: Number.NaN, layer: "L1", knownAtWeek: 4 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([nanValue])), "bad_cell", ["a"]);

    const fracWeek = binRow({
      id: "a",
      kickoffWeek: 5,
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 3.5 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([fracWeek])), "bad_cell", ["a"]);
  });

  it("bad_cell: a MARKET_PROP layer may never reach the p-side", () => {
    const row = countRow({
      id: "c",
      kickoffWeek: 5,
      cells: [{ field: "avgYac", cell: { value: 4.1, layer: "MARKET_PROP", knownAtWeek: 4 } }],
    });
    expectRefusal(validateCandidateSpec(countSpec([row])), "bad_cell", ["c"]);
  });

  it("bad_cell: malformed cell containers refuse rather than pass", () => {
    const cases: readonly unknown[] = [
      "not-an-array",
      [null],
      [{ field: "", cell: { value: 1, layer: "L1", knownAtWeek: 1 } }],
      [{ field: "avgYac", cell: null }],
      [{ field: "avgYac", cell: { value: 1, layer: "", knownAtWeek: 1 } }],
      [{ field: "avgYac", cell: { value: 1, layer: "L1" } }],
    ];
    for (const cells of cases) {
      const row = { ...binRow({ id: "a" }), kickoffWeek: 5, cells } as unknown as BinaryRow;
      expectRefusal(validateCandidateSpec(binarySpec([row])), "bad_cell", ["a"]);
    }
  });

  it("every reason in REFUSAL_PRECEDENCE is reachable and unique", () => {
    expect(new Set(REFUSAL_PRECEDENCE).size).toBe(REFUSAL_PRECEDENCE.length);
    expect(REFUSAL_PRECEDENCE).toEqual([
      "bad_id",
      "empty_rows",
      "duplicate_row_id",
      "bad_family",
      "bad_decision_time",
      "event_before_decision",
      "non_integer_observed",
      "negative_observed",
      "bad_qclose",
      "qclose_without_line",
      "cells_without_kickoff_week",
      "bad_kickoff_week",
      "bad_cell",
    ]);
  });
});

describe("EV2 — the validator scans EVERY row (no early exit)", () => {
  it("ATTACK: one row with observed 2.5 among valid rows names exactly that rowId", () => {
    const rows = validCountCorpus();
    rows[42] = countRow({ ...(rows[42] as CountRow), observed: 2.5 });
    expectRefusal(validateCandidateSpec(countSpec(rows)), "non_integer_observed", ["cnt-42"]);
  });

  it("ATTACK: it must not stop at the first offender — all same-reason rows are reported", () => {
    const rows = validCountCorpus();
    for (const i of [3, 17, 199]) {
      rows[i] = countRow({ ...(rows[i] as CountRow), observed: 2.5 });
    }
    expectRefusal(validateCandidateSpec(countSpec(rows)), "non_integer_observed", ["cnt-3", "cnt-17", "cnt-199"]);
  });

  it("reports offenders in INPUT order, not sorted order", () => {
    const rows = [
      binRow({ id: "zzz", qClose: 0 }),
      binRow({ id: "mmm" }),
      binRow({ id: "aaa", qClose: 1 }),
      binRow({ id: "kkk", qClose: 2 }),
    ];
    expectRefusal(validateCandidateSpec(binarySpec(rows)), "bad_qclose", ["zzz", "aaa", "kkk"]);
  });

  it("first-hit reason wins when a spec violates several rules at once", () => {
    // Same row: bad family AND a bad close AND a leaking cell. bad_family is first.
    const row = binRow({
      id: "a",
      family: "BAD",
      qClose: 0,
      kickoffWeek: 5,
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 9 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([row])), "bad_family", ["a"]);
  });

  it("duplicate ids are settled before any field-level reason", () => {
    const rows = [binRow({ id: "a", qClose: 0 }), binRow({ id: "a" })];
    expectRefusal(validateCandidateSpec(binarySpec(rows)), "duplicate_row_id", ["a"]);
  });

  it("a bad kickoff week is reported before the cells it would be compared against", () => {
    const row = binRow({
      id: "a",
      kickoffWeek: 0,
      cells: [{ field: "avgSeparation", cell: { value: 2.7, layer: "L1", knownAtWeek: 4 } }],
    });
    expectRefusal(validateCandidateSpec(binarySpec([row])), "bad_kickoff_week", ["a"]);
  });
});

describe("EV2 — validateCandidateSpec is TOTAL (returns refusals, never throws)", () => {
  const junk: readonly unknown[] = [
    null,
    undefined,
    {},
    { kind: "binary", id: "x" },
    { kind: "binary", id: "x", rows: "nope" },
    { kind: "count", id: "x", rows: [null] },
    { kind: "count", id: "x", rows: [42] },
    { kind: "weird", id: "x", rows: [{ id: "a" }] },
    { kind: "binary", id: 7, rows: [{ id: "a" }] },
    { kind: "binary", id: "x", rows: [{ id: "a", family: "f", decisionAt: 5, eventEndAt: 6, qClose: 0.5 }] },
  ];

  it("never throws on hostile input, and always stamps priced:false", () => {
    for (const bad of junk) {
      const call = (): SpecCheck => validateCandidateSpec(bad as unknown as CandidateSpec);
      expect(call).not.toThrow();
      const check = call();
      expect(check.priced).toBe(false);
      expect(check.ok).toBe(false);
    }
  });

  it("classifies the hostile shapes to the expected reasons", () => {
    expectRefusal(validateCandidateSpec(null as unknown as CandidateSpec), "empty_rows", []);
    expectRefusal(validateCandidateSpec({} as unknown as CandidateSpec), "bad_id", []);
    expectRefusal(
      validateCandidateSpec({ kind: "binary", id: "x", rows: "nope" } as unknown as CandidateSpec),
      "empty_rows",
      [],
    );
    expectRefusal(
      validateCandidateSpec({ kind: "count", id: "x", rows: [null] } as unknown as CandidateSpec),
      "bad_id",
      [""],
    );
    expectRefusal(
      validateCandidateSpec({
        kind: "binary",
        id: "x",
        rows: [{ id: "a", family: "f", decisionAt: 5, eventEndAt: 6, qClose: 0.5 }],
      } as unknown as CandidateSpec),
      "bad_decision_time",
      ["a"],
    );
  });

  it("does not call trainer or baseline (a throwing trainer cannot break validation)", () => {
    const explode = (): never => {
      throw new Error("trainer must not be invoked by the validator");
    };
    const spec = {
      kind: "binary",
      id: "cand",
      rows: [binRow({ id: "a" })],
      trainer: explode as unknown as Trainer,
      baseline: explode as unknown as Trainer,
      seasonOf: explode as unknown as (row: BinaryRow) => string,
      priced: false,
    } as CandidateSpec;
    expect(validateCandidateSpec(spec)).toEqual({ ok: true, rowCount: 1, priced: false });
  });
});

describe("EV2 — property: 200 valid rows pass; any single guarded flip refuses", () => {
  it("a generated valid binary spec of 200 rows passes", () => {
    const check = validateCandidateSpec(binarySpec(validBinaryCorpus()));
    expect(check).toEqual({ ok: true, rowCount: 200, priced: false });
  });

  it("a generated valid count spec of 200 rows passes", () => {
    const check = validateCandidateSpec(countSpec(validCountCorpus()));
    expect(check).toEqual({ ok: true, rowCount: 200, priced: false });
  });

  it("flipping any single guarded BINARY field flips the result to the matching refusal", () => {
    const mutations: readonly { readonly reason: SpecRefusalReason; readonly mutate: (r: BinaryRow) => BinaryRow }[] = [
      { reason: "bad_family", mutate: (r) => ({ ...r, family: "Bad Family" }) },
      { reason: "bad_decision_time", mutate: (r) => ({ ...r, decisionAt: "whenever" }) },
      { reason: "bad_decision_time", mutate: (r) => ({ ...r, eventEndAt: "whenever" }) },
      { reason: "event_before_decision", mutate: (r) => ({ ...r, eventEndAt: isoAt(-1, 0) }) },
      { reason: "bad_qclose", mutate: (r) => ({ ...r, qClose: 0 }) },
      { reason: "bad_qclose", mutate: (r) => ({ ...r, qClose: 1 }) },
      { reason: "bad_qclose", mutate: (r) => ({ ...r, qClose: Number.NaN }) },
      { reason: "bad_kickoff_week", mutate: (r) => ({ ...r, kickoffWeek: 0 }) },
      { reason: "bad_kickoff_week", mutate: (r) => ({ ...r, kickoffWeek: 2.5 }) },
      {
        reason: "bad_cell",
        mutate: (r) => ({
          ...r,
          cells: [{ field: "avgSeparation", cell: { value: 1, layer: "L1", knownAtWeek: r.kickoffWeek ?? 1 } }],
        }),
      },
      {
        reason: "bad_cell",
        mutate: (r) => ({
          ...r,
          cells: [{ field: "avgSeparation", cell: { value: 1, layer: "MARKET_PROP", knownAtWeek: 1 } }],
        }),
      },
      {
        reason: "cells_without_kickoff_week",
        mutate: (r) => {
          const { kickoffWeek: _drop, ...rest } = r;
          return rest as BinaryRow;
        },
      },
      { reason: "duplicate_row_id", mutate: (r) => ({ ...r, id: "bin-0" }) },
      { reason: "bad_id", mutate: (r) => ({ ...r, id: "" }) },
    ];

    let idx = 0;
    for (const { reason, mutate } of mutations) {
      // Rotate the offending index so no mutation shares a position with another.
      const target = 1 + ((idx * 13) % 199);
      idx++;
      const rows = validBinaryCorpus();
      const original = rows[target] as BinaryRow;
      rows[target] = mutate(original);
      const expectedId = reason === "duplicate_row_id" ? "bin-0" : reason === "bad_id" ? "" : original.id;
      expectRefusal(validateCandidateSpec(binarySpec(rows)), reason, [expectedId]);
      // ...and the unmutated corpus still passes, so the flip is what did it.
      expect(validateCandidateSpec(binarySpec(validBinaryCorpus())).ok).toBe(true);
    }
  });

  it("flipping any single guarded COUNT field flips the result to the matching refusal", () => {
    const mutations: readonly { readonly reason: SpecRefusalReason; readonly mutate: (r: CountRow) => CountRow }[] = [
      { reason: "bad_family", mutate: (r) => ({ ...r, family: "Receptions" }) },
      { reason: "bad_decision_time", mutate: (r) => ({ ...r, decisionAt: "" }) },
      { reason: "event_before_decision", mutate: (r) => ({ ...r, eventEndAt: isoAt(-2, 0) }) },
      { reason: "non_integer_observed", mutate: (r) => ({ ...r, observed: 2.5 }) },
      { reason: "non_integer_observed", mutate: (r) => ({ ...r, observed: Number.NaN }) },
      { reason: "negative_observed", mutate: (r) => ({ ...r, observed: -2 }) },
      { reason: "bad_qclose", mutate: (r) => ({ ...r, qClose: 0 }) },
      { reason: "bad_qclose", mutate: (r) => ({ ...r, qClose: 1 }) },
      {
        reason: "qclose_without_line",
        mutate: (r) => {
          const { line: _drop, ...rest } = r;
          return rest as CountRow;
        },
      },
      { reason: "bad_kickoff_week", mutate: (r) => ({ ...r, kickoffWeek: -1 }) },
      {
        reason: "bad_cell",
        mutate: (r) => ({
          ...r,
          cells: [{ field: "avgYac", cell: { value: Number.POSITIVE_INFINITY, layer: "L1", knownAtWeek: 1 } }],
        }),
      },
      { reason: "duplicate_row_id", mutate: (r) => ({ ...r, id: "cnt-7" }) },
    ];

    let idx = 0;
    for (const { reason, mutate } of mutations) {
      const target = 1 + ((idx * 17) % 199);
      idx++;
      const rows = validCountCorpus();
      const original = rows[target] as CountRow;
      rows[target] = mutate(original);
      const expectedId = reason === "duplicate_row_id" ? "cnt-7" : original.id;
      expectRefusal(validateCandidateSpec(countSpec(rows)), reason, [expectedId]);
    }
  });
});
