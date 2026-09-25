/**
 * V5 — Model-output CSV contract.
 *
 * Canonical submission schema for model outputs evaluated against holdouts
 * and closing lines. Fail-closed on any contract violation.
 *
 * COMPOSES WITH: prereg-eval (leakage-antipatterns probes as prereg gate),
 * V4 deterministic-replay.
 */

export const REQUIRED_SUBMISSION_COLUMNS = [
  "event_id",
  "market",
  "selection",
  "probability",
  "fair_price",
  "model_id",
  "generated_at",
] as const;

export type RequiredSubmissionColumn = (typeof REQUIRED_SUBMISSION_COLUMNS)[number];

export interface ThesisBlock {
  readonly thesis: string;
  readonly features_used: readonly string[];
  readonly training_window: string;
  readonly known_limitations: string;
}

export interface SubmissionRow {
  readonly event_id: string;
  readonly market: string;
  readonly selection: string;
  readonly probability: number;
  readonly fair_price: number;
  readonly model_id: string;
  readonly generated_at: string;
}

export interface SubmissionPackage {
  readonly rows: readonly SubmissionRow[];
  readonly thesis: ThesisBlock;
  /** Event start times keyed by event_id — used to reject post-start generation. */
  readonly eventStarts: Readonly<Record<string, string>>;
}

export type SubmissionValidationFailureCode =
  | "MISSING_COLUMN"
  | "EMPTY_REQUIRED_FIELD"
  | "PROBABILITY_OUT_OF_RANGE"
  | "FAIR_PRICE_NOT_FINITE"
  | "DUPLICATE_EVENT_ID"
  | "GENERATED_AT_AFTER_EVENT_START"
  | "INVALID_TIMESTAMP"
  | "EMPTY_THESIS_FIELD"
  | "NO_ROWS";

export interface SubmissionValidationFailure {
  readonly code: SubmissionValidationFailureCode;
  readonly message: string;
  readonly rowIndex?: number;
  readonly column?: string;
}

export type SubmissionValidationResult =
  | { readonly ok: true; readonly rowCount: number }
  | { readonly ok: false; readonly failures: readonly SubmissionValidationFailure[] };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseIsoMs(v: string): number | null {
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : null;
}

/**
 * Validate a submission package against the V5 contract.
 * Rejects missing columns, probabilities outside (0,1), duplicate event_ids,
 * and generated_at after event start. Missing data is never imputed.
 */
export function validateSubmission(pkg: SubmissionPackage): SubmissionValidationResult {
  const failures: SubmissionValidationFailure[] = [];

  if (!pkg || !Array.isArray(pkg.rows)) {
    return {
      ok: false,
      failures: [{ code: "NO_ROWS", message: "submission rows must be an array" }],
    };
  }

  if (pkg.rows.length === 0) {
    failures.push({ code: "NO_ROWS", message: "submission has zero rows" });
  }

  const thesis = pkg.thesis;
  if (!thesis || !isNonEmptyString(thesis.thesis)) {
    failures.push({ code: "EMPTY_THESIS_FIELD", message: "thesis.thesis is required" });
  }
  if (!thesis || !isNonEmptyString(thesis.training_window)) {
    failures.push({ code: "EMPTY_THESIS_FIELD", message: "thesis.training_window is required" });
  }
  if (!thesis || !isNonEmptyString(thesis.known_limitations)) {
    failures.push({ code: "EMPTY_THESIS_FIELD", message: "thesis.known_limitations is required" });
  }
  if (!thesis || !Array.isArray(thesis.features_used) || thesis.features_used.length === 0) {
    failures.push({ code: "EMPTY_THESIS_FIELD", message: "thesis.features_used must be non-empty" });
  } else {
    for (let i = 0; i < thesis.features_used.length; i++) {
      if (!isNonEmptyString(thesis.features_used[i])) {
        failures.push({
          code: "EMPTY_THESIS_FIELD",
          message: `thesis.features_used[${i}] is empty`,
        });
      }
    }
  }

  const seenEventIds = new Set<string>();

  for (let i = 0; i < pkg.rows.length; i++) {
    const row = pkg.rows[i] as SubmissionRow;

    for (const col of REQUIRED_SUBMISSION_COLUMNS) {
      const raw = (row as unknown as Record<string, unknown>)[col];
      if (raw === undefined || raw === null) {
        failures.push({
          code: "MISSING_COLUMN",
          message: `row ${i} missing required column ${col}`,
          rowIndex: i,
          column: col,
        });
      } else if (typeof raw === "string" && raw.trim().length === 0) {
        failures.push({
          code: "EMPTY_REQUIRED_FIELD",
          message: `row ${i} has empty value for ${col}`,
          rowIndex: i,
          column: col,
        });
      }
    }

    if (isNonEmptyString(row.event_id)) {
      if (seenEventIds.has(row.event_id)) {
        failures.push({
          code: "DUPLICATE_EVENT_ID",
          message: `duplicate event_id ${row.event_id}`,
          rowIndex: i,
          column: "event_id",
        });
      }
      seenEventIds.add(row.event_id);
    }

    if (typeof row.probability !== "number" || !Number.isFinite(row.probability)) {
      failures.push({
        code: "MISSING_COLUMN",
        message: `row ${i} probability must be a finite number`,
        rowIndex: i,
        column: "probability",
      });
    } else if (row.probability <= 0 || row.probability >= 1) {
      failures.push({
        code: "PROBABILITY_OUT_OF_RANGE",
        message: `row ${i} probability ${row.probability} outside (0,1)`,
        rowIndex: i,
        column: "probability",
      });
    }

    if (typeof row.fair_price !== "number" || !Number.isFinite(row.fair_price)) {
      failures.push({
        code: "FAIR_PRICE_NOT_FINITE",
        message: `row ${i} fair_price must be a finite number`,
        rowIndex: i,
        column: "fair_price",
      });
    }

    if (isNonEmptyString(row.generated_at)) {
      const genMs = parseIsoMs(row.generated_at);
      if (genMs === null) {
        failures.push({
          code: "INVALID_TIMESTAMP",
          message: `row ${i} generated_at is not a valid timestamp`,
          rowIndex: i,
          column: "generated_at",
        });
      } else {
        const startRaw = isNonEmptyString(row.event_id) ? pkg.eventStarts[row.event_id] : undefined;
        if (isNonEmptyString(startRaw)) {
          const startMs = parseIsoMs(startRaw);
          if (startMs !== null && genMs > startMs) {
            failures.push({
              code: "GENERATED_AT_AFTER_EVENT_START",
              message: `row ${i} generated_at ${row.generated_at} after event start ${startRaw}`,
              rowIndex: i,
              column: "generated_at",
            });
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    return { ok: false, failures };
  }
  return { ok: true, rowCount: pkg.rows.length };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Canonical CSV writer. Emits the V5 header then one row per submission entry.
 * Throws if the package fails validation — never write an invalid contract.
 */
export function writeSubmissionCsv(pkg: SubmissionPackage): string {
  const result = validateSubmission(pkg);
  if (!result.ok) {
    const codes = result.failures.map((f) => f.code).join(", ");
    throw new Error(`submission package failed V5 contract: ${codes}`);
  }

  const header = REQUIRED_SUBMISSION_COLUMNS.join(",");
  const lines = pkg.rows.map((row) =>
    [
      csvEscape(String(row.event_id)),
      csvEscape(String(row.market)),
      csvEscape(String(row.selection)),
      String(row.probability),
      String(row.fair_price),
      csvEscape(String(row.model_id)),
      csvEscape(String(row.generated_at)),
    ].join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

/**
 * Parse a V5 CSV into a SubmissionPackage skeleton (thesis must be supplied
 * by the caller — it is not embedded in the CSV). Fail-closed on malformed rows.
 */
export function parseSubmissionCsv(csv: string): {
  readonly rows: SubmissionRow[];
  readonly missingColumns: string[];
} {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { rows: [], missingColumns: [...REQUIRED_SUBMISSION_COLUMNS] };
  }

  const headerCells = lines[0]!.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const missingColumns = REQUIRED_SUBMISSION_COLUMNS.filter((c) => !headerCells.includes(c));
  if (missingColumns.length > 0) {
    return { rows: [], missingColumns };
  }

  const idx = Object.fromEntries(
    REQUIRED_SUBMISSION_COLUMNS.map((c) => [c, headerCells.indexOf(c)]),
  ) as Record<RequiredSubmissionColumn, number>;

  const rows: SubmissionRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = lines[li]!.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const prob = Number(cells[idx.probability]);
    const fair = Number(cells[idx.fair_price]);
    rows.push({
      event_id: cells[idx.event_id] ?? "",
      market: cells[idx.market] ?? "",
      selection: cells[idx.selection] ?? "",
      probability: prob,
      fair_price: fair,
      model_id: cells[idx.model_id] ?? "",
      generated_at: cells[idx.generated_at] ?? "",
    });
  }
  return { rows, missingColumns: [] };
}
