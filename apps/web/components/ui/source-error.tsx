import type { ReactNode } from "react";

/**
 * Honest empty / error state card. The product never fabricates data: when a
 * source is unavailable the board says so plainly ("this board is intentionally
 * empty") and shows the real reason. Every page hand-rolled this; here it is
 * once. Server-safe, paper-surface by default.
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

const VARIANTS: Record<
  SourceErrorVariant,
  { wrap: string; kicker: string; title: string; reason: string }
> = {
  paper: {
    wrap: "border-paper-border bg-paper-raised",
    kicker: "text-rose-700",
    title: "text-ink",
    reason: "text-ink-1",
  },
  dark: {
    wrap: "border-white/[0.08] bg-white/[0.04]",
    kicker: "text-alert",
    title: "text-white",
    reason: "text-ink-300",
  },
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
