/**
 * Univer-compatible IWorkbookData builder for DraftKings 2-TE exposure sheets
 * and 360-degree slate matrices with automatic formula-injection sanitization
 * and paywall redaction for FREE viewers.
 */

export type UniverCellValue = string | number | boolean;

export interface UniverCellData {
  readonly v: UniverCellValue;
  readonly t?: 1 | 2 | 3 | 4;
}

export interface UniverFreezeConfig {
  readonly xSplit: number;
  readonly ySplit: number;
  readonly startRow: number;
  readonly startColumn: number;
}

export interface UniverWorksheetData {
  readonly id: string;
  readonly name: string;
  readonly rowCount: number;
  readonly columnCount: number;
  readonly freeze: UniverFreezeConfig;
  readonly cellData: Readonly<Record<number, Readonly<Record<number, UniverCellData>>>>;
}

export interface UniverWorkbookData {
  readonly id: string;
  readonly name: string;
  readonly appVersion: string;
  readonly sheetOrder: readonly string[];
  readonly sheets: Readonly<Record<string, UniverWorksheetData>>;
}

export interface DfsExposureRowInput {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: string;
  readonly salary: number;
  readonly exposurePct: number;
  readonly projPoints: number;
  readonly isLateWindowFlexEligible: boolean;
}

export type WorkbookViewerTier = "FREE" | "PRO";

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]+/;

/**
 * Neutralizes spreadsheet formula-injection prefixes in untrusted text fields.
 */
export function sanitizeSpreadsheetText(raw: string): string {
  return raw.replace(FORMULA_PREFIX_RE, "").replace(/\s+/g, " ").trim();
}

function makeTextCell(value: string): UniverCellData {
  return { v: sanitizeSpreadsheetText(value), t: 1 };
}

function makeNumberCell(value: number): UniverCellData {
  const safeValue = Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
  return { v: safeValue, t: 2 };
}

const EXPOSURE_HEADERS: readonly string[] = [
  "Player ID",
  "Player",
  "Team",
  "Pos",
  "Salary",
  "Exposure %",
  "Proj Pts",
  "Late Window FLEX",
];

/**
 * Constructs a Univer workbook payload for a DFS slate exposure matrix.
 * Numeric point projections and top-level exposure guidance are redacted to
 * `"PRO_ONLY"` whenever `viewerTier === "FREE"`.
 */
export function buildUniverDfsExposureWorkbook(
  slateId: string,
  rows: readonly DfsExposureRowInput[],
  viewerTier: WorkbookViewerTier,
): UniverWorkbookData {
  const safeSlateId = sanitizeSpreadsheetText(slateId) || "slate";
  const sheetId = "exposure_matrix";
  const cellData: Record<number, Record<number, UniverCellData>> = {};

  const headerRow: Record<number, UniverCellData> = {};
  EXPOSURE_HEADERS.forEach((label, colIdx) => {
    headerRow[colIdx] = makeTextCell(label);
  });
  cellData[0] = headerRow;

  const sortedRows = [...rows].sort((a, b) => b.exposurePct - a.exposurePct);
  let totalExposurePct = 0;

  sortedRows.forEach((row, idx) => {
    const rowIdx = idx + 1;
    const boundedExposure = Math.max(0, Math.min(100, row.exposurePct));
    totalExposurePct += boundedExposure;

    cellData[rowIdx] = {
      0: makeTextCell(row.playerId),
      1: makeTextCell(row.playerName),
      2: makeTextCell(row.team.toUpperCase()),
      3: makeTextCell(row.position.toUpperCase()),
      4: makeNumberCell(row.salary),
      5: viewerTier === "FREE" ? { v: "PRO_ONLY", t: 1 } : makeNumberCell(boundedExposure),
      6: viewerTier === "FREE" ? { v: "PRO_ONLY", t: 1 } : makeNumberCell(row.projPoints),
      7: { v: row.isLateWindowFlexEligible ? "YES" : "NO", t: 1 },
    };
  });

  const summaryRowIdx = sortedRows.length + 1;
  cellData[summaryRowIdx] = {
    0: makeTextCell("SUMMARY"),
    1: makeTextCell(`Players: ${sortedRows.length}`),
    5: viewerTier === "FREE" ? { v: "PRO_ONLY", t: 1 } : makeNumberCell(totalExposurePct),
  };

  return {
    id: `gse-dfs-${safeSlateId}`,
    name: `GSE DFS Exposure (${safeSlateId})`,
    appVersion: "0.6.0",
    sheetOrder: [sheetId],
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: "2-TE Exposure",
        rowCount: Math.max(summaryRowIdx + 2, 20),
        columnCount: EXPOSURE_HEADERS.length,
        freeze: {
          xSplit: 1,
          ySplit: 1,
          startRow: 1,
          startColumn: 1,
        },
        cellData,
      },
    },
  };
}
