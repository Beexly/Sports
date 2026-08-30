/**
 * Daily honest-record draft (H-F4).
 *
 * Pure builders. No DB, no LLM, no fabrication:
 *   - yesterday's settled W/L/Push counts, or the honest empty sentence
 *   - one Kill Ledger rotation feature (catalog, not invented)
 *   - one BookGrade/PulseScore highlight plus the frozen interpretation line
 *
 * Status is always DRAFT. Publishing stays founder-gated.
 */

import { BOOKGRADE_V1, PULSE_SCORE_V1 } from "@/lib/truthmetrics/bookgrade-v1";
import { buildContentDraft } from "./build-draft";
import type { ContentDraftRecord, ContentSourceRecord } from "./types";

export const HONEST_RECORD_EMPTY_LINE = "No settled picks yesterday.";

export const KILL_LEDGER_CLOSING_LINE =
  "These are things we tested and found not to work. We publish them so you do not pay for the same mistakes.";

export const BOOKGRADE_INTERPRETATION_LINE =
  "A quality score, not a betting signal. It tells you what a price historically cost at a book, not which side to take.";

export const PULSESCORE_INTERPRETATION_LINE =
  "PulseScore measures how live each book's prices actually are. Neither is a betting signal.";

export interface KillLedgerRotationFeature {
  readonly id: string;
  readonly label: string;
  readonly title: string;
  readonly verdict: string;
  readonly href: string;
}

export const KILL_LEDGER_ROTATION: readonly KillLedgerRotationFeature[] = [
  {
    id: "l15",
    label: "L-15",
    title: "Market-level close-prediction",
    verdict:
      "Killed. The totals grouped-CV correlation was a measurement artifact, not forecast skill.",
    href: "/kill-ledger#l15",
  },
  {
    id: "l16a",
    label: "L-16A",
    title: "Per-book shading",
    verdict:
      "Dead. No book cleared the pre-registered t-statistic gate on this corpus.",
    href: "/kill-ledger#l16a",
  },
  {
    id: "l16b",
    label: "L-16B",
    title: "Cross-book lead-lag",
    verdict:
      "Dead. No book leads another at this cadence in a way that survives the pre-registered gate.",
    href: "/kill-ledger#l16b",
  },
  {
    id: "l17",
    label: "L-17",
    title: "Price-path geometry",
    verdict:
      "Stopped. The pre-registered rule fired: grouped-CV r below 0.10. The research program ends on this corpus.",
    href: "/kill-ledger#l17",
  },
];

export interface YesterdaySettledRecord {
  readonly dateIso: string;
  readonly winCount: number;
  readonly lossCount: number;
  readonly pushCount: number;
}

export interface BookGradeHighlight {
  readonly book: string;
  readonly bpqi: number;
  readonly clusteredT: number;
  readonly burs: number | null;
}

export function utcDayIndex(day: Date): number {
  const start = Date.UTC(day.getUTCFullYear(), 0, 1);
  const today = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  return Math.floor((today - start) / 86_400_000);
}

export function rotateKillLedgerFeature(day: Date): KillLedgerRotationFeature {
  const feature = KILL_LEDGER_ROTATION[utcDayIndex(day) % KILL_LEDGER_ROTATION.length];
  if (!feature) {
    return KILL_LEDGER_ROTATION[0]!;
  }
  return feature;
}

export function rotateBookGradeHighlight(day: Date): BookGradeHighlight {
  const row = BOOKGRADE_V1[utcDayIndex(day) % BOOKGRADE_V1.length] ?? BOOKGRADE_V1[0]!;
  const pulse = PULSE_SCORE_V1.find((p) => p.book === row.book) ?? null;
  return {
    book: row.book,
    bpqi: row.bpqi,
    clusteredT: row.clusteredT,
    burs: pulse?.burs ?? null,
  };
}

export function formatYesterdayRecordLine(record: YesterdaySettledRecord): string {
  const settledCount = record.winCount + record.lossCount + record.pushCount;
  if (settledCount <= 0) {
    return HONEST_RECORD_EMPTY_LINE;
  }
  return `Settled picks yesterday: ${settledCount} (W ${record.winCount} · L ${record.lossCount} · Push ${record.pushCount}). Counts only — not a win rate.`;
}

function formatBpqi(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}pp`;
}

export function buildHonestRecordDraft(input: {
  readonly yesterday: YesterdaySettledRecord;
  readonly killLedger: KillLedgerRotationFeature;
  readonly bookGrade: BookGradeHighlight;
  readonly generatedBy: string;
  readonly slug: string;
  readonly sources: readonly ContentSourceRecord[];
}): ContentDraftRecord {
  const { yesterday, killLedger, bookGrade } = input;
  const bursLine =
    bookGrade.burs == null
      ? "PulseScore BURS was not listed for this book."
      : `PulseScore BURS ${bookGrade.burs.toFixed(3)}.`;

  const lines: string[] = [
    `# Honest record: ${yesterday.dateIso}`,
    "",
    "## Yesterday's settled picks",
    formatYesterdayRecordLine(yesterday),
    "",
    "## Kill Ledger rotation",
    `${killLedger.label} ${killLedger.title}: ${killLedger.verdict}`,
    KILL_LEDGER_CLOSING_LINE,
    `Read the entry: ${killLedger.href}`,
    "",
    "## BookGrade / PulseScore",
    `${bookGrade.book} BookGrade BPQI ${formatBpqi(bookGrade.bpqi)} (clustered t ${bookGrade.clusteredT.toFixed(2)}). ${bursLine}`,
    BOOKGRADE_INTERPRETATION_LINE,
    PULSESCORE_INTERPRETATION_LINE,
  ];

  return buildContentDraft({
    templateKey: "HONEST_RECORD_DAILY",
    slug: input.slug,
    bodyLines: lines,
    sources: input.sources,
    generatedBy: input.generatedBy,
    visibilityOverride: "INTERNAL",
    metadata: {
      dateIso: yesterday.dateIso,
      winCount: yesterday.winCount,
      lossCount: yesterday.lossCount,
      pushCount: yesterday.pushCount,
      settledCount: yesterday.winCount + yesterday.lossCount + yesterday.pushCount,
      killLedgerId: killLedger.id,
      book: bookGrade.book,
    },
  });
}
