import Image from "next/image";

/**
 * PlayerCard, a brand-styled, shareable "scored" player card.
 *
 * Real data only: every value is passed in from a real loader (nflverse season
 * lines, etc.). The card never invents a stat. It is built at a fixed, social-
 * friendly footprint so it can be screenshotted or wired to an opengraph-image
 * route. An optional Higgsfield plate (`plateSrc`) sits behind the chrome at low
 * opacity; with no plate it renders fully code-native on the signal gradient.
 */

export interface PlayerCardStat {
  readonly label: string;
  readonly value: string;
  /**
   * cyan = data liveness, plasma = earned emphasis (never a negative),
   * uv = depth/premium, ion = neutral, alert = a genuinely negative signal.
   */
  readonly tone?: "cyan" | "plasma" | "uv" | "ion" | "alert";
}

export interface PlayerCardProps {
  readonly name: string;
  readonly team: string;
  readonly position: string;
  /** The big number (e.g. "21.4"). */
  readonly headlineValue: string;
  /** What the big number is (e.g. "PPR / game"). */
  readonly headlineLabel: string;
  /** Up to four supporting figures. */
  readonly stats: ReadonlyArray<PlayerCardStat>;
  /** Source + window line (e.g. "Season 2025 · settled nflverse"). */
  readonly footnote?: string;
  /** Optional rank badge (e.g. 1). */
  readonly rank?: number;
  /** Optional Higgsfield plate behind the chrome. */
  readonly plateSrc?: string;
  readonly className?: string;
}

const TONE_TEXT: Record<NonNullable<PlayerCardStat["tone"]>, string> = {
  cyan: "text-orbital-cyan",
  plasma: "text-plasma",
  uv: "text-ultraviolet",
  ion: "text-ion-white",
  alert: "text-alert",
};

export function PlayerCard({
  name,
  team,
  position,
  headlineValue,
  headlineLabel,
  stats,
  footnote,
  rank,
  plateSrc,
  className = "",
}: PlayerCardProps): JSX.Element {
  return (
    <article
      className={`relative isolate w-full max-w-sm overflow-hidden rounded-ds-lg border border-mineral bg-obsidian ${className}`}
      data-testid="player-card"
    >
      {/* Optional generated plate, low opacity behind the chrome. */}
      {plateSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={plateSrc} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25" loading="lazy" decoding="async" />
      )}
      {/* Signal-fade crown. */}
      <div aria-hidden className="h-1.5 w-full bg-signal-fade" />

      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
            {team} · {position}
          </p>
          <h3 className="mt-1 truncate font-display text-2xl font-bold text-ion-white">{name}</h3>
        </div>
        {rank != null && (
          <span className="shrink-0 rounded-full border border-orbital-cyan/40 bg-orbital-cyan/[0.08] px-2.5 py-1 font-mono text-xs font-bold tabular-nums text-orbital-cyan">
            #{rank}
          </span>
        )}
      </div>

      {/* Headline figure. */}
      <div className="px-5">
        <p className="font-numerals text-5xl font-bold leading-none tabular-nums text-ion-white">
          {headlineValue}
        </p>
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-orbital-cyan">
          {headlineLabel}
        </p>
      </div>

      {/* Supporting stats. */}
      {stats.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-px border-t border-mineral bg-mineral sm:grid-cols-4">
          {stats.slice(0, 4).map((s) => (
            <div key={s.label} className="bg-obsidian px-3 py-3">
              <p className={`font-numerals text-lg font-bold tabular-nums ${TONE_TEXT[s.tone ?? "ion"]}`}>
                {s.value}
              </p>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ion-2">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer: source line + emblem. */}
      <div className="flex items-center justify-between gap-3 border-t border-mineral px-5 py-3">
        <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
          {footnote ?? "Real, settled data"}
        </p>
        <Image src="/brand/gse-emblem.png" alt="Galaxy Sports Edge" width={22} height={22} className="shrink-0 opacity-90" />
      </div>
    </article>
  );
}
