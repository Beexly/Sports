import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { AIRWAVE_SPREADSHEET_CONTRACT } from "./control-plane";

type Env = Record<string, string | undefined>;

export type AirwaveIntakeStatus =
  | "not-configured"
  | "unreachable"
  | "invalid-contract"
  | "held"
  | "review-ready";

export type AirwaveIntakeReadiness = {
  readonly generatedAt: string;
  readonly source: {
    readonly kind: "local-file";
    readonly envVar: "AIRWAVE_TRANSCRIPT_FILE_PATH";
    readonly configured: boolean;
    readonly fileKind: string | null;
    readonly status: AirwaveIntakeStatus;
    readonly reason: string;
    readonly rowCount: number | "UNKNOWN";
  };
  readonly contract: {
    readonly requiredColumns: readonly string[];
    readonly optionalColumns: readonly string[];
    readonly presentColumns: readonly string[];
    readonly missingRequiredColumns: readonly string[];
  };
  readonly rows: {
    readonly total: number | "UNKNOWN";
    readonly requiredComplete: number;
    readonly reviewReady: number;
    readonly approved: number;
    readonly rightsHeld: number;
    readonly operatorDraft: number;
    readonly entityTagged: number;
    readonly breakingNews: number;
  };
  readonly gates: {
    readonly airwaveEnabled: boolean;
    readonly transcriptImportEnabled: boolean;
    readonly canStageForReview: boolean;
    readonly canWriteRows: false;
    readonly canPublish: false;
  };
  readonly policy: {
    readonly exposesFilePath: false;
    readonly exposesTranscriptText: false;
    readonly storesRows: false;
    readonly writesDatabase: false;
    readonly autoPublishes: false;
  };
};

type ParsedTable = {
  readonly headers: readonly string[];
  readonly rows: readonly Record<string, string>[];
};

const FILE_ENV = "AIRWAVE_TRANSCRIPT_FILE_PATH" as const;
const ALLOWED_RIGHTS = new Set(["owned", "public", "licensed"]);
const OPERATOR_REVIEW_STATES = new Set(["review", "approved"]);

function envOn(env: Env, key: string): boolean {
  return env[key] === "true";
}

function envValue(env: Env, key: string): string {
  return env[key]?.trim() ?? "";
}

function normalizeCell(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizeKey(value: string | undefined): string {
  return normalizeCell(value).toLowerCase();
}

function splitDelimitedLine(line: string, delimiter: "," | "\t"): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? "";
    const next = line[index + 1] ?? "";

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(header: string): "," | "\t" {
  const tabCount = header.split("\t").length - 1;
  const commaCount = header.split(",").length - 1;
  return tabCount > commaCount ? "\t" : ",";
}

export function parseAirwaveDelimitedTable(raw: string): ParsedTable {
  const cleaned = raw.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  const headerLine = lines[0] ?? "";
  const delimiter = detectDelimiter(headerLine);
  const headers = splitDelimitedLine(headerLine, delimiter).map(normalizeKey).filter(Boolean);

  const rows = lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = normalizeCell(cells[index]);
      return row;
    }, {});
  });

  return { headers, rows };
}

function requiredColumns(): string[] {
  return AIRWAVE_SPREADSHEET_CONTRACT.filter((field) => field.required).map((field) => field.column);
}

function optionalColumns(): string[] {
  return AIRWAVE_SPREADSHEET_CONTRACT.filter((field) => !field.required).map((field) => field.column);
}

function emptyReadiness(
  env: Env,
  now: Date,
  source: AirwaveIntakeReadiness["source"],
): AirwaveIntakeReadiness {
  return {
    generatedAt: now.toISOString(),
    source,
    contract: {
      requiredColumns: requiredColumns(),
      optionalColumns: optionalColumns(),
      presentColumns: [],
      missingRequiredColumns: requiredColumns(),
    },
    rows: {
      total: "UNKNOWN",
      requiredComplete: 0,
      reviewReady: 0,
      approved: 0,
      rightsHeld: 0,
      operatorDraft: 0,
      entityTagged: 0,
      breakingNews: 0,
    },
    gates: {
      airwaveEnabled: envOn(env, "AIRWAVE_ENABLED"),
      transcriptImportEnabled: envOn(env, "AIRWAVE_TRANSCRIPT_IMPORT_ENABLED"),
      canStageForReview: false,
      canWriteRows: false,
      canPublish: false,
    },
    policy: {
      exposesFilePath: false,
      exposesTranscriptText: false,
      storesRows: false,
      writesDatabase: false,
      autoPublishes: false,
    },
  };
}

function classifyClaimType(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("injury") ||
    normalized.includes("breaking") ||
    normalized.includes("role") ||
    normalized.includes("depth") ||
    normalized.includes("news")
  );
}

export async function readAirwaveIntakeReadiness(
  env: Env = process.env,
  now = new Date(),
): Promise<AirwaveIntakeReadiness> {
  const configuredPath = envValue(env, FILE_ENV);
  const fileKind = configuredPath ? extname(configuredPath).toLowerCase() || "unknown" : null;

  if (!configuredPath) {
    return emptyReadiness(env, now, {
      kind: "local-file",
      envVar: FILE_ENV,
      configured: false,
      fileKind: null,
      status: "not-configured",
      reason: "No local transcript CSV/TSV path is configured.",
      rowCount: "UNKNOWN",
    });
  }

  let raw: string;
  try {
    raw = await readFile(configuredPath, "utf8");
  } catch {
    return emptyReadiness(env, now, {
      kind: "local-file",
      envVar: FILE_ENV,
      configured: true,
      fileKind,
      status: "unreachable",
      reason: "Configured local transcript file is not reachable from this environment.",
      rowCount: "UNKNOWN",
    });
  }

  const parsed = parseAirwaveDelimitedTable(raw);
  const required = requiredColumns();
  const optional = optionalColumns();
  const missingRequiredColumns = required.filter((column) => !parsed.headers.includes(column));

  const base = emptyReadiness(env, now, {
    kind: "local-file",
    envVar: FILE_ENV,
    configured: true,
    fileKind,
    status: missingRequiredColumns.length > 0 ? "invalid-contract" : "held",
    reason:
      missingRequiredColumns.length > 0
        ? "Transcript file is reachable but missing required contract columns."
        : "Transcript file is reachable but no row has passed rights and operator review gates.",
    rowCount: parsed.rows.length,
  });

  if (missingRequiredColumns.length > 0) {
    return {
      ...base,
      contract: {
        requiredColumns: required,
        optionalColumns: optional,
        presentColumns: parsed.headers,
        missingRequiredColumns,
      },
      rows: {
        ...base.rows,
        total: parsed.rows.length,
      },
    };
  }

  const requiredCompleteRows = parsed.rows.filter((row) =>
    required.every((column) => normalizeCell(row[column]).length > 0),
  );
  const rightsHeldRows = parsed.rows.filter((row) => !ALLOWED_RIGHTS.has(normalizeKey(row["rights_status"])));
  const operatorDraftRows = parsed.rows.filter((row) => !OPERATOR_REVIEW_STATES.has(normalizeKey(row["operator_status"])));
  const reviewReadyRows = requiredCompleteRows.filter((row) => {
    return (
      ALLOWED_RIGHTS.has(normalizeKey(row["rights_status"])) &&
      OPERATOR_REVIEW_STATES.has(normalizeKey(row["operator_status"]))
    );
  });
  const approvedRows = reviewReadyRows.filter((row) => normalizeKey(row["operator_status"]) === "approved");
  const entityTaggedRows = parsed.rows.filter((row) => normalizeCell(row["entity"]).length > 0);
  const breakingNewsRows = parsed.rows.filter((row) => classifyClaimType(normalizeCell(row["claim_type"])));
  const canStageForReview =
    envOn(env, "AIRWAVE_ENABLED") &&
    envOn(env, "AIRWAVE_TRANSCRIPT_IMPORT_ENABLED") &&
    reviewReadyRows.length > 0;

  return {
    ...base,
    source: {
      ...base.source,
      status: reviewReadyRows.length > 0 ? "review-ready" : "held",
      reason:
        reviewReadyRows.length > 0
          ? "Transcript file has rows that pass the required-column, rights, and operator-status gates."
          : "Transcript file is reachable but all rows are held by rights, required-column, or operator-status gates.",
    },
    contract: {
      requiredColumns: required,
      optionalColumns: optional,
      presentColumns: parsed.headers,
      missingRequiredColumns: [],
    },
    rows: {
      total: parsed.rows.length,
      requiredComplete: requiredCompleteRows.length,
      reviewReady: reviewReadyRows.length,
      approved: approvedRows.length,
      rightsHeld: rightsHeldRows.length,
      operatorDraft: operatorDraftRows.length,
      entityTagged: entityTaggedRows.length,
      breakingNews: breakingNewsRows.length,
    },
    gates: {
      ...base.gates,
      canStageForReview,
    },
  };
}
