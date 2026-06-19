/**
 * ReliabilityDiagram — the honest accuracy-proof centerpiece.
 *
 * Renders the research-grade reliability diagram (538 / Metaculus / Good Judgment
 * conventions) from the pure, unit-tested presentation engine:
 *   - x = stated confidence, y = actual win rate, one dot per populated bin
 *   - the 45° perfect-calibration diagonal
 *   - per-bin CONSISTENCY BAND (the interval the observed rate would fall in IF the
 *     model were perfectly calibrated, given that bin's n) — so small-sample wobble
 *     is never over-read
 *   - per-bin plain-language tooltip ("We rated N picks ~70%; they won 71%")
 *   - the Brier score + Brier-SKILL vs the 0.25 always-50% baseline
 *   - the overall hit-rate with a 95% Wilson interval (never a bare stat)
 *   - the honest GATED state below 100 settled picks (displayReady:false)
 *
 * Honesty + a11y rules:
 *   - Every value comes from `buildReliabilityPresentation(realSamples)`; nothing
 *     is hardcoded or fabricated. Below the sample floor it draws no curve.
 *   - The SVG carries role="img" + aria-label, and a visually-hidden data list
 *     enumerates every bin's readout so the proof is fully available to screen
 *     readers (not hover-only). Verdict also carries a glyph, never color alone.
 *   - Colors use GSE tokens (cyan = on-calibration signal, ultraviolet = cautiously
 *     underconfident, caution-amber = overconfident) — never casino green/red.
 */

import {
  SAMPLE_FLOOR_BUILDING,
  type ReliabilityPresentation,
  type ReliabilityBin,
} from "@/lib/calibration/reliability-presentation";
import { BRAND_COLORS } from "@/lib/brand";
import {
  NUMERIC_TEXT_CLASS,
  formatBrier,
  formatCount,
  formatRatioAsPercent,
} from "@/lib/format/stat";

// Single source of truth for the display floor lives in the engine; mirror it
// here only as a local alias so the gated-state copy and the engine never drift.
const SAMPLE_FLOOR = SAMPLE_FLOOR_BUILDING;
const CAUTION_AMBER = "#FFB454";

// Plot geometry (SVG user units). Square plot with room for axis labels.
const W = 360;
const H = 360;
const PAD_L = 44;
const PAD_B = 40;
const PAD_T = 14;
const PAD_R = 16;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

const xPos = (p: number) => PAD_L + p * PLOT_W;
const yPos = (p: number) => PAD_T + (1 - p) * PLOT_H;

type Verdict = ReliabilityBin["verdict"];

function verdictColor(v: Verdict): string {
  switch (v) {
    case "consistent":
      return BRAND_COLORS.orbitalCyan;
    case "overconfident":
      return CAUTION_AMBER;
    case "underconfident":
      return BRAND_COLORS.softUltraviolet;
    default:
      return "rgba(255,255,255,0.35)";
  }
}

function verdictLabel(v: Verdict): string {
  switch (v) {
    case "consistent":
      return "On calibration";
    case "overconfident":
      return "Overconfident";
    case "underconfident":
      return "Underconfident";
    default:
      return "Too few to judge";
  }
}

// ── Gated "building the record" state ─────────────────────────────────────────

function GatedState({ presentation }: { presentation: ReliabilityPresentation }) {
  const pct = Math.min(100, Math.round((presentation.sampleSize / SAMPLE_FLOOR) * 100));
  return (
    <div
      data-testid="reliability-diagram-gated"
      className="rounded-2xl border p-6"
      style={{
        borderColor: "rgba(255,180,84,0.25)",
        background:
          "linear-gradient(135deg, rgba(255,180,84,0.05) 0%, rgba(26,18,48,0.6) 100%)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-caution animate-live-pulse" aria-hidden="true" />
        <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
          Building the record
        </h3>
      </div>
      <p className="text-sm leading-7 text-ink-300">{presentation.verdictLine}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
          <span>Settled picks behind the curve</span>
          <span className={`tabular-nums text-ink-300 ${NUMERIC_TEXT_CLASS}`}>
            {formatCount(presentation.sampleSize)} / {formatCount(SAMPLE_FLOOR)}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: BRAND_COLORS.orbitalCyan }}
          />
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-ink-500">
        We don&apos;t draw a calibration curve on a thin sample — a few dozen picks
        can look brilliant or broken by luck alone. The diagram appears once the
        settled record can honestly support it, and never before.
      </p>
    </div>
  );
}

// ── The diagram ───────────────────────────────────────────────────────────────

export function ReliabilityDiagram({
  presentation,
}: {
  presentation: ReliabilityPresentation;
}) {
  if (!presentation.displayReady) {
    return <GatedState presentation={presentation} />;
  }

  const populated = presentation.bins.filter((b) => b.count > 0);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const maxCount = Math.max(1, ...populated.map((b) => b.count));
  const skill = presentation.brierSkillVsBaseline;
  const hit = presentation.hitRate;

  return (
    <section
      data-testid="reliability-diagram"
      className="overflow-hidden rounded-2xl border border-white/[0.10] bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.10] px-6 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400">
          Reliability diagram
        </h2>
        <span className={`text-[11px] uppercase tracking-widest text-ink-400 ${NUMERIC_TEXT_CLASS}`}>
          {formatCount(presentation.sampleSize)} settled picks
        </span>
      </div>

      {/* Truth-in-advertising promise (538). */}
      <div className="px-6 pt-6">
        <p className="text-sm leading-7 text-ink-200">
          <span className="font-semibold text-white">The promise:</span> when we call
          a pick a 70% favorite, it should win about 70% of the time over the long run.
          This is the test — predicted confidence across the bottom, the rate it
          actually won up the side. The closer the dots track the diagonal, the more
          honest the number on every pick.
        </p>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[auto,1fr] lg:items-start">
        {/* Plot */}
        <div className="mx-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ maxWidth: W }}
            role="img"
            aria-label={`Reliability diagram across ${formatCount(
              presentation.sampleSize,
            )} settled picks. ${presentation.verdictLine}`}
          >
            {/* Grid + ticks */}
            {ticks.map((t) => (
              <g key={`grid-${t}`}>
                <line
                  x1={xPos(t)}
                  y1={yPos(0)}
                  x2={xPos(t)}
                  y2={yPos(1)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <line
                  x1={xPos(0)}
                  y1={yPos(t)}
                  x2={xPos(1)}
                  y2={yPos(t)}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <text
                  x={xPos(t)}
                  y={H - PAD_B + 16}
                  fill="rgba(255,255,255,0.45)"
                  fontSize={10}
                  textAnchor="middle"
                >
                  {Math.round(t * 100)}%
                </text>
                <text
                  x={PAD_L - 8}
                  y={yPos(t) + 3}
                  fill="rgba(255,255,255,0.45)"
                  fontSize={10}
                  textAnchor="end"
                >
                  {Math.round(t * 100)}%
                </text>
              </g>
            ))}

            {/* 45° perfect-calibration diagonal */}
            <line
              x1={xPos(0)}
              y1={yPos(0)}
              x2={xPos(1)}
              y2={yPos(1)}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={xPos(0.82) + 4}
              y={yPos(0.82) - 6}
              fill="rgba(255,255,255,0.5)"
              fontSize={9}
              textAnchor="start"
            >
              perfect
            </text>

            {/* Per-bin consistency bands + dots */}
            {populated.map((b, i) => {
              const color = verdictColor(b.verdict);
              const cx = xPos(b.predicted);
              const cy = yPos(b.observed);
              // Dot radius scales gently with sample weight (3–7px).
              const r = 3 + 4 * Math.sqrt(b.count / maxCount);
              return (
                <g key={`bin-${i}`}>
                  {/* consistency band: vertical whisker at x=predicted */}
                  <line
                    x1={cx}
                    y1={yPos(b.bandLo)}
                    x2={cx}
                    y2={yPos(b.bandHi)}
                    stroke={color}
                    strokeOpacity={0.35}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.9}>
                    <title>{`${b.readout} (${verdictLabel(b.verdict)}; perfectly-calibrated band ${formatRatioAsPercent(
                      b.bandLo,
                    )}–${formatRatioAsPercent(b.bandHi)})`}</title>
                  </circle>
                </g>
              );
            })}

            {/* Axis titles */}
            <text
              x={PAD_L + PLOT_W / 2}
              y={H - 4}
              fill="rgba(255,255,255,0.6)"
              fontSize={11}
              textAnchor="middle"
            >
              Predicted (stated confidence)
            </text>
            <text
              x={14}
              y={PAD_T + PLOT_H / 2}
              fill="rgba(255,255,255,0.6)"
              fontSize={11}
              textAnchor="middle"
              transform={`rotate(-90 14 ${PAD_T + PLOT_H / 2})`}
            >
              Observed (actual win rate)
            </text>
          </svg>

          {/* Legend */}
          <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11px] text-ink-400">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" style={{ color: BRAND_COLORS.orbitalCyan }}>
                ●
              </span>
              On calibration
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" style={{ color: CAUTION_AMBER }}>
                ▼
              </span>
              Overconfident
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" style={{ color: BRAND_COLORS.softUltraviolet }}>
                ▲
              </span>
              Underconfident
            </li>
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-3 rounded-full"
                style={{ background: "rgba(255,255,255,0.25)" }}
              />
              Perfectly-calibrated band
            </li>
          </ul>
        </div>

        {/* Stats column */}
        <div className="flex flex-col gap-4">
          {/* Verdict line */}
          <div
            className="rounded-xl border p-4"
            style={{
              borderColor: `${BRAND_COLORS.orbitalCyan}22`,
              background: `${BRAND_COLORS.orbitalCyan}06`,
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
              The verdict
            </p>
            <p data-testid="reliability-verdict" className="mt-1.5 text-sm leading-6 text-ink-200">
              {presentation.verdictLine}
            </p>
          </div>

          {/* Two numbers, never one: Brier skill + hit rate with CI */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.08] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
                Brier skill vs coin flip
              </p>
              <p
                data-testid="reliability-brier-skill"
                className={`mt-1 text-2xl font-bold ${NUMERIC_TEXT_CLASS}`}
                style={{ color: skill > 0 ? BRAND_COLORS.orbitalCyan : CAUTION_AMBER }}
              >
                {skill > 0 ? "+" : ""}
                {formatRatioAsPercent(skill)}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-ink-400">
                Brier {formatBrier(presentation.brier)} vs the always-50% baseline of
                0.250.{" "}
                {skill > 0
                  ? "Above zero beats a coin flip."
                  : "Not yet beating a coin flip."}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.08] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-500">
                Hit rate (with interval)
              </p>
              <p
                data-testid="reliability-hit-rate"
                className={`mt-1 text-2xl font-bold text-ion ${NUMERIC_TEXT_CLASS}`}
              >
                {hit ? formatRatioAsPercent(hit.point) : "—"}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-ink-400">
                {hit
                  ? `True rate sits in ${formatRatioAsPercent(hit.lo)}–${formatRatioAsPercent(
                      hit.hi,
                    )} with 95% confidence — never a bare number.`
                  : "Opens once picks settle."}
              </p>
            </div>
          </div>

          {/* Pre-empt binary thinking (538). */}
          <p className="text-[11px] leading-relaxed text-ink-500">
            A 30% pick still hits sometimes — and it&apos;s supposed to. Losing a 70%
            pick doesn&apos;t make it a bad pick; what matters is whether 70% picks win
            ~70% of the time across the whole record. That is exactly what the band
            tests, bin by bin.
          </p>
        </div>
      </div>

      {/* Visually-hidden, fully accessible per-bin readout (not hover-only). */}
      <div className="sr-only">
        <h3>Per-bin calibration readout</h3>
        <ul data-testid="reliability-readouts">
          {populated.map((b, i) => (
            <li key={`readout-${i}`}>
              {b.readout} {verdictLabel(b.verdict)}. Perfectly-calibrated band{" "}
              {formatRatioAsPercent(b.bandLo)} to {formatRatioAsPercent(b.bandHi)}.
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/[0.10] px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ink-300">
          Built only from settled canonical picks, against the 0.25 coin-flip
          baseline. Calibration is evidence — it never auto-adjusts the model, and
          past performance does not guarantee future results.
        </p>
      </div>
    </section>
  );
}
