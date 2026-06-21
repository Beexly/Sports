import Image from "next/image";

/**
 * ResultCard — a brand-styled, shareable receipt for a settled pick.
 *
 * Real data only: the matchup, the pick, the line, the settled result, and the
 * closing-line-value read are all passed in from the real settled-pick record.
 * It states the outcome honestly (WIN / LOSS / PUSH / PENDING) and never frames
 * a result as a guarantee — confidence is shown as a calibrated label, never a
 * promise. Built at a social-friendly footprint for screenshot / opengraph use.
 */

export type CardResult = "WIN" | "LOSS" | "PUSH" | "PENDING";

export interface ResultCardProps {
  /** e.g. "BUF @ KC". */
  readonly matchup: string;
  /** The pick, e.g. "Bills +2.5". */
  readonly pick: string;
  /** Optional line/price detail, e.g. "-110". */
  readonly line?: string;
  readonly result: CardResult;
  /** A calibrated confidence label (never a guarantee). */
  readonly confidenceLabel?: string;
  /** Closing-line-value read, e.g. "+1.2 pts CLV". */
  readonly clvLabel?: string;
  /** Provenance line, e.g. "NFL · settled 2026-01-12 · v6.1.0". */
  readonly meta?: string;
  /** Optional Higgsfield plate behind the chrome. */
  readonly plateSrc?: string;
  readonly className?: string;
}

const RESULT_STYLE: Record<CardResult, { label: string; text: string; ring: string; chip: string }> = {
  WIN: { label: "Win", text: "text-verify", ring: "border-verify/40", chip: "bg-verify/10 text-verify" },
  LOSS: { label: "Loss", text: "text-alert", ring: "border-alert/40", chip: "bg-alert/10 text-alert" },
  PUSH: { label: "Push", text: "text-ion-1", ring: "border-mineral", chip: "bg-titanium/50 text-ion-1" },
  PENDING: { label: "Pending", text: "text-ultraviolet", ring: "border-ultraviolet/40", chip: "bg-ultraviolet/10 text-ultraviolet" },
};

export function ResultCard({
  matchup,
  pick,
  line,
  result,
  confidenceLabel,
  clvLabel,
  meta,
  plateSrc,
  className = "",
}: ResultCardProps): JSX.Element {
  const r = RESULT_STYLE[result];
  return (
    <article
      className={`relative isolate w-full max-w-sm overflow-hidden rounded-ds-lg border bg-obsidian ${r.ring} ${className}`}
      data-testid="result-card"
    >
      {plateSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={plateSrc} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" loading="lazy" decoding="async" />
      )}
      <div aria-hidden className="h-1.5 w-full bg-signal-fade" />

      <div className="flex items-center justify-between gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">{matchup}</p>
        <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${r.chip}`}>
          {r.label}
        </span>
      </div>

      <div className="px-5">
        <h3 className="font-display text-2xl font-bold text-ion-white">{pick}</h3>
        {line && (
          <p className="mt-1 font-numerals text-sm tabular-nums text-ion-1">{line}</p>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-px border-t border-mineral bg-mineral">
        <div className="bg-obsidian px-4 py-3">
          <p className={`font-numerals text-lg font-bold tabular-nums ${r.text}`}>{r.label}</p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">Settled result</p>
        </div>
        <div className="bg-obsidian px-4 py-3">
          <p className="font-numerals text-lg font-bold tabular-nums text-orbital-cyan">
            {clvLabel ?? "—"}
          </p>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">Closing line value</p>
        </div>
      </div>

      {confidenceLabel && (
        <p className="px-5 pt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-1">
          Confidence · {confidenceLabel}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-mineral px-5 py-3">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          {meta ?? "Real, settled pick"}
        </p>
        <Image src="/brand/gse-emblem.png" alt="Galaxy Sports Edge" width={22} height={22} className="shrink-0 opacity-90" />
      </div>
    </article>
  );
}
