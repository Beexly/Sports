import { loadPublicCalibrationReport } from "@/lib/calibration/report";

/**
 * Calibration & Discrimination panel — the public "proof, not promises" surface.
 *
 * The /performance page is titled "Calibration Report" but historically only
 * rendered win/loss tables. This panel renders what the title promises:
 *   1. Discrimination — does observed win rate RISE as confidence rises? This is
 *      the honest headline even for spread/total markets (priced ~50%), where an
 *      absolute "X% win rate" is the wrong lens. (Powered by computeDiscrimination.)
 *   2. The reliability curve — observed vs. expected win rate per confidence bucket.
 *   3. The Brier score — the single calibration number, with a plain-English read.
 *
 * Honesty rules this panel obeys:
 *   - Every number is rendered from `loadPublicCalibrationReport()` at request time;
 *     nothing is hardcoded. In bootstrap mode the report returns a collecting state
 *     and we show the methodology, never an invented record.
 *   - No win-rate math lives here — the engine computed it; we only display it.
 */

type CalibrationData = Awaited<ReturnType<typeof loadPublicCalibrationReport>>["data"];
type Bucket = CalibrationData["buckets"][number];
type Discrimination = CalibrationData["discrimination"];

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

// Brier score reads better with a plain-English band. Lower is better; 0.25 is
// the coin-flip baseline for a binary outcome, so under it is meaningfully sharp.
function brierRead(brier: number | null): string {
  if (brier === null) return "Not enough settled picks yet.";
  if (brier <= 0.18) return "Sharp — confidence tracks outcomes closely.";
  if (brier <= 0.25) return "Better than a coin flip — calibration is holding.";
  return "Above the coin-flip baseline — calibration needs work.";
}

const VERDICT_META: Record<
  Discrimination["trend"],
  { label: string; tone: string; ring: string }
> = {
  improving: {
    label: "Confidence ranks picks correctly",
    tone: "text-green-400",
    ring: "border-green-500/40 bg-green-500/5",
  },
  inverted: {
    label: "Higher confidence is winning less — under review",
    tone: "text-red-400",
    ring: "border-red-500/40 bg-red-500/5",
  },
  flat: {
    label: "Confidence is not separating outcomes yet",
    tone: "text-yellow-400",
    ring: "border-yellow-500/40 bg-yellow-500/5",
  },
  "insufficient-data": {
    label: "Building discrimination history",
    tone: "text-gray-400",
    ring: "border-gray-700 bg-gray-900/40",
  },
};

function ReliabilityRow({ bucket }: { bucket: Bucket }) {
  const observedWidth = `${Math.round(bucket.observedWinRate * 100)}%`;
  const expectedLeft = `${Math.round(bucket.expectedWinRate * 100)}%`;
  const empty = bucket.sampleSize === 0;
  return (
    <div className="flex items-center gap-3 py-2" data-testid="reliability-row">
      <span className="w-14 shrink-0 font-mono text-xs text-gray-400">
        {bucket.label}
      </span>
      <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-gray-800">
        {!empty && (
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
            style={{ width: observedWidth }}
          />
        )}
        {/* Expected marker — where a perfectly calibrated bucket would land. */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white/70"
          style={{ left: expectedLeft }}
          aria-hidden="true"
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-200">
        {empty ? "—" : pct(bucket.observedWinRate)}
      </span>
      <span className="w-16 shrink-0 text-right text-[11px] text-gray-600">
        {empty ? "no data" : `n=${bucket.sampleSize}`}
      </span>
    </div>
  );
}

export async function CalibrationPanel() {
  const report = await loadPublicCalibrationReport();
  const data = report.data;
  const d = data.discrimination;
  const meta = VERDICT_META[d.trend];
  const collecting = data.isCollecting || data.sampleSize === 0;

  return (
    <section
      data-testid="calibration-panel"
      className="mb-12 overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-900/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500">
          Calibration &amp; discrimination
        </h2>
        <span className="text-[11px] uppercase tracking-widest text-gray-600">
          {collecting ? "Collecting" : `${data.sampleSize} settled picks`}
        </span>
      </div>

      {/* Discrimination verdict — the honest headline. */}
      <div className="px-6 pt-6">
        <div className={`rounded-xl border ${meta.ring} p-5`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Does higher confidence win more?
          </p>
          <p className={`mt-2 text-xl font-bold ${meta.tone}`}>{meta.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">{d.note}</p>
          {d.spread !== null &&
            d.lowestBucketWinRate !== null &&
            d.highestBucketWinRate !== null && (
              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                <span className="font-mono">
                  {d.lowestBucketLabel}: {pct(d.lowestBucketWinRate)}
                </span>
                <span className="flex-1 border-t border-dashed border-gray-700" />
                <span className="font-mono">
                  {d.highestBucketLabel}: {pct(d.highestBucketWinRate)}
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Reliability curve. */}
      <div className="px-6 py-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Reliability by confidence bucket
          </h3>
          <span className="text-[11px] text-gray-600">
            bar = observed · marker = expected
          </span>
        </div>
        <div className="divide-y divide-gray-800/60">
          {data.buckets.map((b) => (
            <ReliabilityRow key={b.label} bucket={b} />
          ))}
        </div>
      </div>

      {/* Brier score footer. */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 px-6 py-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-gray-600">
            Brier score
          </span>{" "}
          <span className="ml-1 font-mono text-sm font-semibold text-gray-200">
            {data.brierScore !== null ? data.brierScore.toFixed(3) : "—"}
          </span>
        </div>
        <p className="text-xs text-gray-500">{brierRead(data.brierScore)}</p>
      </div>

      <div className="border-t border-gray-800 px-6 py-3">
        <p className="text-[11px] leading-relaxed text-gray-600">
          {data.publicMessage} Calibration is evidence only — it never auto-adjusts
          the model. Past performance does not guarantee future results.
        </p>
      </div>
    </section>
  );
}
