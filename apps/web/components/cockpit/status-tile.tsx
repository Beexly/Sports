import Link from "next/link";

/**
 * StatusTile — a reusable, runnable/linkable cockpit status tile.
 *
 * The building block for an attention-first, command-first cockpit: a compact
 * tile that shows a label + value/state, optionally tinted by a brand tone, and
 * — when given an `href` — renders as a link so the tile itself is the action
 * ("everything runnable" / command-first). With no `href` it is a calm static
 * readout. An optional one-line caption carries brand-voice context.
 *
 * Pure presentation. No data fetching, no client state — safe to render on the
 * server. It NEVER invents a value; callers pass real, already-derived state.
 */

export type StatusTone = "good" | "warn" | "bad" | "info" | "neutral";

export interface StatusTileProps {
  /** Short uppercase label for what this tile measures. */
  readonly label: string;
  /** The real value or state to display (already derived by the caller). */
  readonly value: string;
  /** Brand-tone tint. Defaults to a calm neutral so nothing reads fake-green. */
  readonly tone?: StatusTone;
  /**
   * When present, the whole tile becomes a link to act on this item — the
   * "everything runnable" affordance. When absent, the tile is a static readout.
   */
  readonly href?: string;
  /** Optional one-line, brand-voice caption rendered beneath the value. */
  readonly caption?: string;
  /** Optional extra classes for layout composition by the parent. */
  readonly className?: string;
}

const TONE_STYLES: Record<StatusTone, string> = {
  good: "border-accent-800/50 bg-accent-950/20 text-accent-400",
  warn: "border-yellow-900/50 bg-yellow-950/20 text-yellow-300",
  bad: "border-red-900/60 bg-red-950/20 text-red-300",
  info: "border-ultraviolet/30 bg-obsidian/50 text-ion-1",
  neutral: "border-titanium/40 bg-obsidian/50 text-ion-2",
};

export function StatusTile({
  label,
  value,
  tone = "neutral",
  href,
  caption,
  className,
}: StatusTileProps) {
  const interactive = href != null && href !== "";

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] opacity-80">
          {label}
        </p>
        {interactive && (
          <span aria-hidden="true" className="text-[11px] opacity-60">
            →
          </span>
        )}
      </div>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums leading-tight">
        {value}
      </p>
      {caption && (
        <p className="mt-1 text-[10px] leading-snug text-ion-3">{caption}</p>
      )}
    </>
  );

  const baseClass = [
    "block rounded-xl border px-3 py-2",
    TONE_STYLES[tone],
    className ?? "",
  ].join(" ");

  if (interactive) {
    return (
      <Link
        href={href}
        data-testid="status-tile"
        data-runnable="true"
        className={[
          baseClass,
          "transition-colors hover:border-titanium/70 hover:bg-carbon/60",
        ].join(" ")}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div data-testid="status-tile" data-runnable="false" className={baseClass}>
      {inner}
    </div>
  );
}
