/**
 * Airwave Intelligence Intake — CH87 Show Block CSV Importer.
 *
 * Parses operator-provided CSV/TSV schedule data into validated ShowBlock[].
 * This is a read-only, pure parsing module — it does not capture audio,
 * access any stream, write to any database, or publish anything.
 *
 * USAGE:
 *   1. Operator creates a CSV with columns matching SHOW_BLOCK_CSV_CONTRACT.
 *   2. Parse with parseShowBlocksFromCsv(rawCsv).
 *   3. Replace SAMPLE_PLACEHOLDER entries in createChannel87ScheduleContract().
 *
 * ENV:
 *   AIRWAVE_CH87_SCHEDULE_FILE — optional local path to the schedule CSV/TSV.
 */

import {
  parseAirwaveDelimitedTable,
} from "./intake-readiness";
import {
  validateShowBlock,
  type ShowBlock,
  type ShowRightsStatus,
  type ShowSourceConfidence,
} from "./channel-87-schedule";

// ─── CSV Contract ─────────────────────────────────────────────────────────────

export type ShowBlockCsvColumn = {
  readonly column: string;
  readonly required: boolean;
  readonly description: string;
  readonly example: string;
};

export const SHOW_BLOCK_CSV_CONTRACT: readonly ShowBlockCsvColumn[] = [
  {
    column: "show_id",
    required: true,
    description: "Unique internal slug (no spaces, kebab-case).",
    example: "ch87-morning-drive",
  },
  {
    column: "show_name",
    required: true,
    description: "Display name for the show.",
    example: "Morning Drive",
  },
  {
    column: "starts_at_ct",
    required: true,
    description: "Start time in CT as HH:MM (24-hour).",
    example: "06:00",
  },
  {
    column: "ends_at_ct",
    required: true,
    description: "End time in CT as HH:MM (24-hour).",
    example: "10:00",
  },
  {
    column: "expected_hosts",
    required: false,
    description: "Pipe-separated list of known host names.",
    example: "Alex Smith|Jordan Lee",
  },
  {
    column: "sport_focus",
    required: false,
    description: "Pipe-separated list of sports covered.",
    example: "NFL|NBA|MLB",
  },
  {
    column: "fantasy_focus",
    required: false,
    description: "true or false — whether the show focuses on fantasy sports.",
    example: "true",
  },
  {
    column: "betting_relevance",
    required: false,
    description: "true or false — whether the show covers betting lines.",
    example: "false",
  },
  {
    column: "source_confidence",
    required: false,
    description:
      "OPERATOR_PROVIDED | MANUALLY_VERIFIED | SAMPLE_PLACEHOLDER | UNVERIFIED",
    example: "OPERATOR_PROVIDED",
  },
  {
    column: "manual_review_required",
    required: false,
    description: "true or false — whether operator review is required.",
    example: "true",
  },
  {
    column: "rights_status",
    required: false,
    description:
      "OPERATOR_NOTED | MANUAL_IMPORT_ONLY | HELD | LEGAL_REVIEW_REQUIRED",
    example: "MANUAL_IMPORT_ONLY",
  },
  {
    column: "operator_notes",
    required: false,
    description: "Free-text operator notes for this show block.",
    example: "Verified from SiriusXM schedule page 2026-06-11.",
  },
];

const REQUIRED_COLUMNS = SHOW_BLOCK_CSV_CONTRACT
  .filter((c) => c.required)
  .map((c) => c.column);

const VALID_SOURCE_CONFIDENCE: ReadonlySet<string> = new Set<ShowSourceConfidence>([
  "OPERATOR_PROVIDED",
  "MANUALLY_VERIFIED",
  "SAMPLE_PLACEHOLDER",
  "UNVERIFIED",
]);

const VALID_RIGHTS_STATUS: ReadonlySet<string> = new Set<ShowRightsStatus>([
  "OPERATOR_NOTED",
  "MANUAL_IMPORT_ONLY",
  "HELD",
  "LEGAL_REVIEW_REQUIRED",
]);

// ─── Types ────────────────────────────────────────────────────────────────────

export type ShowBlockImportRowError = {
  readonly rowIndex: number;
  readonly showId: string;
  readonly errors: readonly string[];
};

export type ShowBlockImportResult = {
  readonly generatedAt: string;
  readonly totalRows: number;
  readonly validBlocks: readonly ShowBlock[];
  readonly errors: readonly ShowBlockImportRowError[];
  readonly requiredColumns: readonly string[];
  readonly presentColumns: readonly string[];
  readonly missingRequiredColumns: readonly string[];
  readonly policy: {
    readonly parsesOnly: true;
    readonly writesDatabase: false;
    readonly capturesAudio: false;
    readonly publishesOutput: false;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeCell(value: string | undefined): string {
  return (value ?? "").trim();
}

function normalizeBool(value: string, fieldName: string): { value: boolean; error?: string } {
  const v = value.toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return { value: true };
  if (v === "false" || v === "0" || v === "no" || v === "") return { value: false };
  return { value: false, error: `${fieldName} must be true/false (got "${value}").` };
}

function parseHourFromTime(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0] ?? "0", 10);
}

function parsePipeSeparated(value: string): readonly string[] {
  if (!value.trim()) return [];
  return value.split("|").map((s) => s.trim()).filter((s) => s.length > 0);
}

// ─── Row parser ───────────────────────────────────────────────────────────────

function parseRowToShowBlock(
  row: Record<string, string>,
  rowIndex: number,
): { block: ShowBlock | null; errors: readonly string[] } {
  const errors: string[] = [];

  const showId = normalizeCell(row["show_id"]);
  const showName = normalizeCell(row["show_name"]);
  const startsAtCt = normalizeCell(row["starts_at_ct"]);
  const endsAtCt = normalizeCell(row["ends_at_ct"]);

  if (!showId) errors.push("show_id is required.");
  if (!showName) errors.push("show_name is required.");
  if (!startsAtCt) errors.push("starts_at_ct is required.");
  if (!endsAtCt) errors.push("ends_at_ct is required.");

  if (errors.length > 0) return { block: null, errors };

  if (!/^\d{2}:\d{2}$/.test(startsAtCt)) {
    errors.push(`starts_at_ct must be HH:MM format (got "${startsAtCt}").`);
  }
  if (!/^\d{2}:\d{2}$/.test(endsAtCt)) {
    errors.push(`ends_at_ct must be HH:MM format (got "${endsAtCt}").`);
  }

  if (errors.length > 0) return { block: null, errors };

  const startHour = parseHourFromTime(startsAtCt);
  const endHour = parseHourFromTime(endsAtCt);

  const fantasyRaw = normalizeCell(row["fantasy_focus"]);
  const fantasyParsed = normalizeBool(fantasyRaw || "false", "fantasy_focus");
  if (fantasyParsed.error) errors.push(fantasyParsed.error);

  const bettingRaw = normalizeCell(row["betting_relevance"]);
  const bettingParsed = normalizeBool(bettingRaw || "false", "betting_relevance");
  if (bettingParsed.error) errors.push(bettingParsed.error);

  const reviewRaw = normalizeCell(row["manual_review_required"]);
  const reviewParsed = normalizeBool(reviewRaw || "true", "manual_review_required");
  if (reviewParsed.error) errors.push(reviewParsed.error);

  const rawConfidence = normalizeCell(row["source_confidence"]) || "OPERATOR_PROVIDED";
  if (!VALID_SOURCE_CONFIDENCE.has(rawConfidence)) {
    errors.push(
      `source_confidence must be one of OPERATOR_PROVIDED|MANUALLY_VERIFIED|SAMPLE_PLACEHOLDER|UNVERIFIED (got "${rawConfidence}").`,
    );
  }

  const rawRights = normalizeCell(row["rights_status"]) || "MANUAL_IMPORT_ONLY";
  if (!VALID_RIGHTS_STATUS.has(rawRights)) {
    errors.push(
      `rights_status must be one of OPERATOR_NOTED|MANUAL_IMPORT_ONLY|HELD|LEGAL_REVIEW_REQUIRED (got "${rawRights}").`,
    );
  }

  if (errors.length > 0) return { block: null, errors };

  const block: ShowBlock = {
    showId,
    showName,
    startsAtCt,
    endsAtCt,
    startHour,
    endHour,
    expectedHosts: parsePipeSeparated(normalizeCell(row["expected_hosts"])),
    sportFocus: parsePipeSeparated(normalizeCell(row["sport_focus"])),
    fantasyFocus: fantasyParsed.value,
    bettingRelevance: bettingParsed.value,
    sourceConfidence: rawConfidence as ShowSourceConfidence,
    manualReviewRequired: reviewParsed.value,
    rightsStatus: rawRights as ShowRightsStatus,
    operatorNotes: normalizeCell(row["operator_notes"]),
  };

  const validationErrors = validateShowBlock(block);
  if (validationErrors.length > 0) {
    return { block: null, errors: validationErrors };
  }

  return { block, errors: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse a raw CSV/TSV string of operator-provided show schedule data.
 * Returns validated ShowBlock[] plus any row-level errors.
 *
 * This function is pure and has no side effects.
 * It does not read files, write to a database, or capture audio.
 */
export function parseShowBlocksFromCsv(rawCsv: string, now = new Date()): ShowBlockImportResult {
  const parsed = parseAirwaveDelimitedTable(rawCsv);
  const presentColumns = [...parsed.headers];
  const missingRequiredColumns = REQUIRED_COLUMNS.filter(
    (col) => !presentColumns.includes(col),
  );

  if (missingRequiredColumns.length > 0) {
    return {
      generatedAt: now.toISOString(),
      totalRows: parsed.rows.length,
      validBlocks: [],
      errors: [
        {
          rowIndex: 0,
          showId: "(schema)",
          errors: missingRequiredColumns.map(
            (col) => `Missing required column: "${col}".`,
          ),
        },
      ],
      requiredColumns: REQUIRED_COLUMNS,
      presentColumns,
      missingRequiredColumns,
      policy: {
        parsesOnly: true,
        writesDatabase: false,
        capturesAudio: false,
        publishesOutput: false,
      },
    };
  }

  const validBlocks: ShowBlock[] = [];
  const errors: ShowBlockImportRowError[] = [];

  parsed.rows.forEach((row, index) => {
    const result = parseRowToShowBlock(row, index);
    if (result.block) {
      validBlocks.push(result.block);
    } else if (result.errors.length > 0) {
      errors.push({
        rowIndex: index + 1,
        showId: normalizeCell(row["show_id"]) || "(unknown)",
        errors: result.errors,
      });
    }
  });

  return {
    generatedAt: now.toISOString(),
    totalRows: parsed.rows.length,
    validBlocks,
    errors,
    requiredColumns: REQUIRED_COLUMNS,
    presentColumns,
    missingRequiredColumns: [],
    policy: {
      parsesOnly: true,
      writesDatabase: false,
      capturesAudio: false,
      publishesOutput: false,
    },
  };
}

/**
 * Read show blocks from a local file path (async, Node.js only).
 * Returns an import result. Does not write to any database.
 *
 * @param filePath — absolute path to the CSV/TSV file.
 */
export async function readShowBlocksFromFile(
  filePath: string,
  now = new Date(),
): Promise<ShowBlockImportResult & { readonly fileStatus: "ok" | "unreadable" }> {
  let raw: string;
  try {
    const { readFile } = await import("node:fs/promises");
    raw = await readFile(filePath, "utf8");
  } catch {
    return {
      generatedAt: now.toISOString(),
      totalRows: 0,
      validBlocks: [],
      errors: [
        {
          rowIndex: 0,
          showId: "(file)",
          errors: ["File is not reachable or not readable."],
        },
      ],
      requiredColumns: REQUIRED_COLUMNS,
      presentColumns: [],
      missingRequiredColumns: REQUIRED_COLUMNS,
      policy: {
        parsesOnly: true,
        writesDatabase: false,
        capturesAudio: false,
        publishesOutput: false,
      },
      fileStatus: "unreadable",
    };
  }

  return { ...parseShowBlocksFromCsv(raw, now), fileStatus: "ok" };
}

/**
 * Read show blocks from the path configured in AIRWAVE_CH87_SCHEDULE_FILE.
 * Returns undefined if the env var is not set.
 */
export async function readShowBlocksFromEnv(
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<
  (ShowBlockImportResult & { readonly fileStatus: "ok" | "unreadable" }) | undefined
> {
  const path = env["AIRWAVE_CH87_SCHEDULE_FILE"]?.trim();
  if (!path) return undefined;
  return readShowBlocksFromFile(path, now);
}
