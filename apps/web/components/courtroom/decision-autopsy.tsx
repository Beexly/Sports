/**
 * DecisionAutopsy — the process×outcome grading matrix.
 *
 * The brand's sharpest differentiator made visible: after a result we grade the
 * THINKING, not the scoreboard. A win on a bad read is flagged, not framed; a
 * loss on a correct read is respected, not buried. Pure methodology — no
 * fabricated track record. Presentational, server-renderable.
 */

import { BRAND_COLORS } from "@/lib/brand";

type Cell = {
  readonly key: string;
  readonly verdict: string;
  readonly process: "good" | "bad";
  readonly outcome: "good" | "bad";
  readonly body: string;
};

const CELLS: readonly Cell[] = [
  {
    key: "earned",
    verdict: "Earned",
    process: "good",
    outcome: "good",
    body: "Right read, right result. The standard — not the highlight reel.",
  },
  {
    key: "respected",
    verdict: "Respected",
    process: "good",
    outcome: "bad",
    body: "Right read, wrong bounce. We keep the process; variance owes us nothing.",
  },
  {
    key: "lucky",
    verdict: "Lucky",
    process: "bad",
    outcome: "good",
    body: "Wrong read, right result. The most dangerous square — we flag it, never frame it.",
  },
  {
    key: "corrected",
    verdict: "Corrected",
    process: "bad",
    outcome: "bad",
    body: "Wrong read, wrong result. Logged, learned, fed back into calibration.",
  },
];

const HONEST_VERDICTS = [
  "Correct no-bet",
  "Missed no-bet",
  "Lucky win · bad read",
  "Unlucky loss · correct read",
  "Stale-data failure",
  "Variance event",
] as const;

export function DecisionAutopsy() {
  const cyan = BRAND_COLORS.orbitalCyan;
  const mag = BRAND_COLORS.ionMagenta;
  const cellColor = (c: Cell) => (c.process === "good" ? cyan : mag);

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      {/* axis labels */}
      <div className="relative grid grid-cols-[auto_1fr] gap-4">
        <div />
        <div className="grid grid-cols-2 gap-4 pb-1">
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">Good outcome</p>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">Bad outcome</p>
        </div>

        {/* row 1: good process */}
        <div className="flex items-center">
          <p className="rotate-180 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 [writing-mode:vertical-rl]">
            Good process
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CELLS.filter((c) => c.process === "good").map((c) => (
            <AutopsyCell key={c.key} cell={c} color={cellColor(c)} />
          ))}
        </div>

        {/* row 2: bad process */}
        <div className="flex items-center">
          <p className="rotate-180 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 [writing-mode:vertical-rl]">
            Bad process
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CELLS.filter((c) => c.process === "bad").map((c) => (
            <AutopsyCell key={c.key} cell={c} color={cellColor(c)} />
          ))}
        </div>
      </div>

      {/* honest verdicts strip */}
      <div className="relative mt-7 border-t pt-5" style={{ borderColor: BRAND_COLORS.steelGray }}>
        <p className="mb-3 text-xs uppercase tracking-[0.16em] text-ink-500">Verdicts most sites won&apos;t publish</p>
        <div className="flex flex-wrap gap-2">
          {HONEST_VERDICTS.map((v) => (
            <span
              key={v}
              className="rounded-full px-3 py-1 text-xs font-medium text-ink-200"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BRAND_COLORS.steelGray}` }}
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function AutopsyCell({ cell, color }: { cell: Cell; color: string }) {
  return (
    <div
      className="rounded-xl p-4 transition-transform duration-300 hover:-translate-y-0.5"
      style={{ background: `${color}0c`, border: `1px solid ${color}3a` }}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
        <p className="font-display text-base font-semibold" style={{ color }}>
          {cell.verdict}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-300">{cell.body}</p>
    </div>
  );
}
