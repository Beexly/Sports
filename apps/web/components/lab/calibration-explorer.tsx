import Link from "next/link";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { loadPublicCalibrationReport } from "@/lib/calibration/report";
import {
  NUMERIC_TEXT_CLASS,
  STAT_PLACEHOLDER,
  formatBrier,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

/**
 * Calibration Explorer — the fifth Galaxy Lab tool.
 *
 * Renders the reliability picture from REAL settled canonical picks. Every
 * number comes from `loadPublicCalibrationReport()`; nothing is invented.
 *
 * Honesty contract:
 *   - When the honesty gate is closed, the report is collecting, or the sample
 *     is empty, this renders the "building the record" panel — the truthful
 *     state today. No bars, no numbers fabricated.
 *   - When real settled data exists, it renders a compact reliability view:
 *     per-bucket predicted-vs-observed bars (CSS, like the simulator histogram),
 *     the Brier score, and the discrimination trend verdict.
 *   - It always links out to /performance for the full public surface and
 *     captions that calibration is computed from settled canonical picks only.
 */

type CalibrationData = Awaited<
  ReturnType<typeof loadPublicCalibrationReport>
>["data"];
type CalibrationReportPayload = Awaited<
  ReturnType<typeof loadPublicCalibrationReport>
>;
type Bucket = CalibrationData["buckets"][number];
type Discrimination = CalibrationData["discrimination"];

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";

// Plain-English read on the Brier score. Lower is better; 0.25 is the coin-flip
// baseline for a binary outcome. Mirrors the public calibration panel's framing.
function brierRead(brier: number | null): string {
  if (brier === null) return "Not enough settled picks yet.";
  if (brier <= 0.18) return "Sharp — confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip — calibration is holding.";
  return "Above the coin-flip baseline — calibration needs work.";
}

const VERDICT_META: Record<
  Discrimination["trend"],
  { label: string; color: string; glyph: string }
> = {
  improving: {
    label: "Confidence ranks picks correctly",
    color: BRAND_COLORS.orbitalCyan,
    glyph: "▲",
  },
  inverted: {
    label: "Higher confidence is winning less — under review",
    color: BRAND_COLORS.ionMagenta,
    glyph: "▼",
  },
  flat: {
    label: "Confidence is not separating outcomes yet",
    color: BRAND_COLORS.softUltravioletText,
    glyph: "→",
  },
  "insufficient-data": {
    label: "Building discrimination history",
    color: BRAND_COLORS.softUltravioletText,
    glyph: "◴",
  },
};

function HonestCaption(): JSX.Element {
  return (
    <p className="mt-4 font-mono text-[10px] leading-relaxed text-ink-500">
      Calibration is computed from settled canonical picks only — evidence, not a
      projection. See the full public surface on{" "}
      <Link
        href="/performance"
        className="underline"
        style={{ color: BRAND_COLORS.orbitalCyan }}
      >
        the calibration report
      </Link>
      .
    </p>
  );
}

function CollectingPanel({
  message,
}: {
  message: string;
}): JSX.Element {
  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div
        className="rounded-xl border px-4 py-8 text-center"
        style={{
          borderColor: `${BRAND_COLORS.orbitalCyan}22`,
          background: `${BRAND_COLORS.orbitalCyan}06`,
        }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
          Building the record
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-300">
          {message}
        </p>
        <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-ink-500">
          A confidence bucket only counts here once its picks actually settle. No
          curve is drawn until enough settled canonical picks accumulate to make
          the number honest — so this is the correct state right now, not a
          placeholder for figures we have not earned.
        </p>
      </div>
      <HonestCaption />
    </div>
  );
}

function ReliabilityRow({ bucket }: { bucket: Bucket }): JSX.Element {
  const empty = bucket.sampleSize === 0;
  const observedWidth = `${Math.round(bucket.observedWinRate * 100)}%`;
  const expectedLeft = `${Math.round(bucket.expectedWinRate * 100)}%`;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={cn("w-14 shrink-0 text-xs text-ink-300", NUMERIC_TEXT_CLASS)}>
        {bucket.label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        {!empty ? (
          <div
            className="h-full rounded-full"
            style={{
              width: observedWidth,
              background: BRAND_COLORS.orbitalCyan,
            }}
          />
        ) : null}
        {/* Expected marker — where a perfectly calibrated bucket would land. */}
        <div
          className="absolute top-0 h-full w-0.5"
          style={{ left: expectedLeft, background: `${BRAND_COLORS.ionWhite}b3` }}
          aria-hidden="true"
        />
      </div>
      <span
        className={cn(
          "w-14 shrink-0 text-right text-xs font-semibold",
          NUMERIC_TEXT_CLASS,
        )}
        style={{ color: BRAND_COLORS.orbitalCyan }}
      >
        {empty ? STAT_PLACEHOLDER : formatRatioAsPercent(bucket.observedWinRate)}
      </span>
      <span
        className={cn("w-16 shrink-0 text-right text-[11px] text-ink-400", NUMERIC_TEXT_CLASS)}
      >
        {empty ? "no data" : `n=${formatCount(bucket.sampleSize)}`}
      </span>
    </div>
  );
}

function ReliabilityView({ data }: { data: CalibrationData }): JSX.Element {
  const d = data.discrimination;
  const verdict = VERDICT_META[d.trend];
  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
          Reliability by confidence bucket
        </h3>
        <span className={cn("text-[11px] uppercase tracking-widest text-ink-400", NUMERIC_TEXT_CLASS)}>
          {formatCount(data.sampleSize)} settled picks
        </span>
      </div>

      {/* Discrimination verdict — does higher confidence win more often? */}
      <div
        className="mt-4 rounded-xl border p-4"
        style={{ borderColor: `${verdict.color}40`, background: `${verdict.color}0d` }}
      >
        <p className={FIELD_LABEL}>Does higher confidence win more?</p>
        <p
          className="mt-2 flex items-center gap-2 text-base font-bold"
          style={{ color: verdict.color }}
        >
          <span aria-hidden="true">{verdict.glyph}</span>
          {verdict.label}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-ink-300">{d.note}</p>
      </div>

      {/* Reliability bars — observed vs. expected per bucket. */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className={FIELD_LABEL}>Predicted range vs. observed win rate</p>
          <span className="text-[10px] text-ink-500">bar = observed · marker = expected</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {data.buckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
      </div>

      {/* Brier score footer. */}
      <div
        className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-3"
        style={{ borderColor: "rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.03)" }}
      >
        <div>
          <span className={FIELD_LABEL}>Brier score</span>{" "}
          <span
            className={cn("ml-1 text-sm font-semibold", NUMERIC_TEXT_CLASS)}
            style={{ color: BRAND_COLORS.orbitalCyan }}
          >
            {formatBrier(data.brierScore)}
          </span>
        </div>
        <p className="text-xs text-ink-300">{brierRead(data.brierScore)}</p>
      </div>

      <HonestCaption />
    </div>
  );
}

export function CalibrationExplorer({
  report,
}: {
  report: CalibrationReportPayload;
}): JSX.Element {
  const { data, meta } = report;
  const collecting = meta.gated || data.isCollecting || data.sampleSize === 0;

  if (collecting) {
    return <CollectingPanel message={data.publicMessage} />;
  }

  return <ReliabilityView data={data} />;
}
