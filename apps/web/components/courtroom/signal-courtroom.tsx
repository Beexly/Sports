/**
 * SignalCourtroom — renders a CourtroomBrief as a three-panel case:
 * Prosecution (evidence for) · Defense (counter-evidence) · Judge (verdict +
 * falsifiers + what would change it). Presentational + server-renderable.
 *
 * Illustrative briefs are explicitly badged so a methodology demo is never
 * mistaken for a live, real-money signal.
 */

import type { Argument, CourtroomBrief, Verdict, Weight } from "@/lib/courtroom/courtroom";
import { VERDICT_META } from "@/lib/courtroom/courtroom";
import { BRAND_COLORS } from "@/lib/brand";

const WEIGHT_DOTS: Record<Weight, number> = { low: 1, moderate: 2, high: 3 };

const VERDICT_COLOR: Record<Verdict, string> = {
  PLAY: BRAND_COLORS.orbitalCyan,
  WATCHLIST: BRAND_COLORS.softUltraviolet,
  "NO-BET": BRAND_COLORS.ionMagenta,
  "FRAGILE EDGE": BRAND_COLORS.softUltraviolet,
};

const RISK_COLOR = {
  low: BRAND_COLORS.orbitalCyan,
  elevated: BRAND_COLORS.softUltraviolet,
  high: BRAND_COLORS.ionMagenta,
} as const;

function WeightPips({ weight, color }: { weight: Weight; color: string }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`weight: ${weight}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          className="h-1 w-1 rounded-full"
          style={{ background: i < WEIGHT_DOTS[weight] ? color : "rgba(255,255,255,0.18)" }}
        />
      ))}
    </span>
  );
}

function ArgList({ items, color }: { items: readonly Argument[]; color: string }) {
  return (
    <ul className="mt-4 space-y-4">
      {items.map((a, i) => (
        <li key={i}>
          <p className="text-sm leading-relaxed text-ink-200">{a.point}</p>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">{a.source}</span>
            <WeightPips weight={a.weight} color={color} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SignalCourtroom({ brief }: { brief: CourtroomBrief }) {
  const cyan = BRAND_COLORS.orbitalCyan;
  const mag = BRAND_COLORS.ionMagenta;
  const uv = BRAND_COLORS.softUltraviolet;
  const verdictColor = VERDICT_COLOR[brief.verdict];
  const meta = VERDICT_META[brief.verdict];

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `${verdictColor}1f` }}
      />

      {/* Header */}
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-500">{brief.matchupLabel}</p>
            {brief.illustrative && (
              <span
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-300"
                style={{ borderColor: BRAND_COLORS.steelGray }}
              >
                Illustrative
              </span>
            )}
          </div>
          <h3 className="mt-3 max-w-2xl font-display text-xl text-white sm:text-2xl">{brief.claim}</h3>
        </div>

        <div className="text-right">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold"
            style={{ color: verdictColor, background: `${verdictColor}14`, border: `1px solid ${verdictColor}55` }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: verdictColor, boxShadow: `0 0 10px ${verdictColor}` }} />
            {brief.verdict}
          </span>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-500">
            Confidence · {brief.confidence}
          </p>
        </div>
      </div>

      <p className="relative mt-2 text-xs italic text-ink-500">{meta.blurb}</p>

      {/* Three panels */}
      <div className="relative mt-7 grid gap-5 lg:grid-cols-3">
        {/* Prosecution */}
        <section className="surface-lifted p-5" aria-label="Prosecution — evidence for">
          <header className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: cyan, boxShadow: `0 0 10px ${cyan}` }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: cyan }}>Prosecution</h4>
          </header>
          <p className="mt-1 text-[11px] text-ink-500">Why the edge exists</p>
          <ArgList items={brief.prosecution} color={cyan} />
        </section>

        {/* Defense */}
        <section className="surface-lifted p-5" aria-label="Defense — counter-evidence">
          <header className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: mag, boxShadow: `0 0 10px ${mag}` }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: mag }}>Defense</h4>
          </header>
          <p className="mt-1 text-[11px] text-ink-500">Why it might be wrong</p>
          <ArgList items={brief.defense} color={mag} />
        </section>

        {/* Judge */}
        <section className="surface-lifted p-5" aria-label="Judge — verdict and falsifiers">
          <header className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: uv, boxShadow: `0 0 10px ${uv}` }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: uv }}>Judge</h4>
          </header>
          <p className="mt-1 text-[11px] text-ink-500">What would flip it</p>
          <ul className="mt-4 space-y-3">
            {brief.falsifiers.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-200">
                <span aria-hidden style={{ color: uv }}>↳</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-lg p-3" style={{ background: `${uv}10`, border: `1px solid ${uv}33` }}>
            <p className="text-xs leading-relaxed text-ink-200">{brief.whatWouldChange}</p>
          </div>
        </section>
      </div>

      {/* Risk + freshness footer */}
      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {brief.risks.map((r) => (
            <span
              key={r.label}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ color: RISK_COLOR[r.level], background: `${RISK_COLOR[r.level]}12`, border: `1px solid ${RISK_COLOR[r.level]}33` }}
            >
              <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: RISK_COLOR[r.level] }} />
              {r.label} · {r.level}
            </span>
          ))}
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-500">{brief.freshness}</p>
      </div>
    </div>
  );
}
