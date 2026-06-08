import type { ReactNode } from "react";

/**
 * Honest empty / error state card. The product never fabricates data: when a
 * source is unavailable the board says so plainly ("this board is intentionally
 * empty") and shows the real reason. Every page hand-rolled this; here it is
 * once. Server-safe, unified-dark surface.
 *
 * Both variants render on the dark canvas: the `paper` variant is a legacy
 * alias (callers on data boards pass it) and resolves to the same dark surface
 * so nothing flips light. The kicker uses the dark-safe rose signal text
 * (rose-300, AA on dark); body text is AA ion-white / ion-1.
 */

export type SourceErrorVariant = "paper" | "dark";

export interface SourceErrorProps {
  /** Kicker label. */
  kicker?: string;
  title?: string;
  /** The honest reason (error string / boundary explanation). */
  reason?: ReactNode;
  /** Optional extra detail / source URL slot. */
  children?: ReactNode;
  variant?: SourceErrorVariant;
  className?: string;
}

const DARK_VARIANT = {
  wrap: "border-surface-line bg-surface-raised",
  kicker: "text-data-bad-text",
  title: "text-ion-white",
  reason: "text-ion-1",
} as const;

const VARIANTS: Record<
  SourceErrorVariant,
  { wrap: string; kicker: string; title: string; reason: string }
> = {
  // `paper` is a legacy alias → dark, so error cards stay on the unified canvas.
  paper: DARK_VARIANT,
  dark: DARK_VARIANT,
};

export function SourceError({
  kicker = "Source error",
  title = "This board is intentionally empty.",
  reason = "UNKNOWN",
  children,
  variant = "paper",
  className = "",
}: SourceErrorProps): JSX.Element {
  const v = VARIANTS[variant];
  return (
    <section className={`rounded-ds-md border p-5 ${v.wrap} ${className}`}>
      <p className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${v.kicker}`}>
        {kicker}
      </p>
      <h2 className={`mt-2 text-2xl font-semibold ${v.title}`}>{title}</h2>
      <div className={`mt-3 text-sm leading-6 ${v.reason}`}>{reason}</div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
