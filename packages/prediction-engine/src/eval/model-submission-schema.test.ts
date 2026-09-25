import { describe, expect, it } from "vitest";
import {
  parseSubmissionCsv,
  validateSubmission,
  writeSubmissionCsv,
  REQUIRED_SUBMISSION_COLUMNS,
  type SubmissionPackage,
  type SubmissionRow,
} from "./model-submission-schema.js";

function row(over: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    event_id: "evt-1",
    market: "spread",
    selection: "HOME",
    probability: 0.62,
    fair_price: 1.55,
    model_id: "gse-v1",
    generated_at: "2026-09-25T12:00:00.000Z",
    ...over,
  };
}

function pkg(over: Partial<SubmissionPackage> = {}): SubmissionPackage {
  return {
    rows: [row()],
    thesis: {
      thesis: "Home cover driven by rest advantage and QB continuity.",
      features_used: ["rest_days", "qb_continuity"],
      training_window: "2022-01-01..2026-08-01",
      known_limitations: "No in-game injury model.",
    },
    eventStarts: { "evt-1": "2026-09-25T20:00:00.000Z" },
    ...over,
  };
}

describe("V5 model-submission-schema", () => {
  it("exports the canonical required columns", () => {
    expect([...REQUIRED_SUBMISSION_COLUMNS]).toEqual([
      "event_id",
      "market",
      "selection",
      "probability",
      "fair_price",
      "model_id",
      "generated_at",
    ]);
  });

  it("accepts a valid package", () => {
    const r = validateSubmission(pkg());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rowCount).toBe(1);
  });

  it("rejects missing columns", () => {
    const bad = { ...row() } as Record<string, unknown>;
    delete bad.model_id;
    const r = validateSubmission(pkg({ rows: [bad as unknown as SubmissionRow] }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failures.some((f) => f.code === "MISSING_COLUMN" && f.column === "model_id")).toBe(
        true,
      );
    }
  });

  it("rejects probability outside (0,1)", () => {
    for (const p of [0, 1, -0.1, 1.2]) {
      const r = validateSubmission(pkg({ rows: [row({ probability: p })] }));
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.failures.some((f) => f.code === "PROBABILITY_OUT_OF_RANGE")).toBe(true);
      }
    }
  });

  it("accepts probability strictly inside (0,1)", () => {
    for (const p of [0.01, 0.5, 0.99]) {
      expect(validateSubmission(pkg({ rows: [row({ probability: p })] })).ok).toBe(true);
    }
  });

  it("rejects duplicate event_ids", () => {
    const r = validateSubmission(
      pkg({ rows: [row(), row({ market: "moneyline", selection: "AWAY" })] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failures.some((f) => f.code === "DUPLICATE_EVENT_ID")).toBe(true);
    }
  });

  it("rejects generated_at after event start", () => {
    const r = validateSubmission(
      pkg({
        rows: [row({ generated_at: "2026-09-25T21:00:00.000Z" })],
        eventStarts: { "evt-1": "2026-09-25T20:00:00.000Z" },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failures.some((f) => f.code === "GENERATED_AT_AFTER_EVENT_START")).toBe(true);
    }
  });

  it("accepts generated_at equal to event start", () => {
    const r = validateSubmission(
      pkg({
        rows: [row({ generated_at: "2026-09-25T20:00:00.000Z" })],
        eventStarts: { "evt-1": "2026-09-25T20:00:00.000Z" },
      }),
    );
    expect(r.ok).toBe(true);
  });

  it("rejects empty thesis fields", () => {
    const r = validateSubmission(
      pkg({
        thesis: {
          thesis: "",
          features_used: [],
          training_window: "",
          known_limitations: "",
        },
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.failures.every((f) => f.code === "EMPTY_THESIS_FIELD")).toBe(true);
    }
  });

  it("rejects empty submissions", () => {
    const r = validateSubmission(pkg({ rows: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.failures.some((f) => f.code === "NO_ROWS")).toBe(true);
  });

  it("writes canonical CSV and round-trips", () => {
    const p = pkg({
      rows: [
        row(),
        row({ event_id: "evt-2", selection: "AWAY", probability: 0.41, fair_price: 2.2 }),
      ],
      eventStarts: {
        "evt-1": "2026-09-25T20:00:00.000Z",
        "evt-2": "2026-09-26T20:00:00.000Z",
      },
    });
    const csv = writeSubmissionCsv(p);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe(REQUIRED_SUBMISSION_COLUMNS.join(","));
    expect(lines).toHaveLength(3);

    const parsed = parseSubmissionCsv(csv);
    expect(parsed.missingColumns).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]!.event_id).toBe("evt-1");
    expect(parsed.rows[1]!.probability).toBeCloseTo(0.41, 6);
  });

  it("throws when writing an invalid package", () => {
    expect(() => writeSubmissionCsv(pkg({ rows: [row({ probability: 1.5 })] }))).toThrow(
      /PROBABILITY_OUT_OF_RANGE/,
    );
  });

  it("reports missing columns on parse", () => {
    const parsed = parseSubmissionCsv("event_id,market\nevt-1,spread");
    expect(parsed.missingColumns).toContain("probability");
    expect(parsed.rows).toEqual([]);
  });
});
