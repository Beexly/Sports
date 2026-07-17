import type { ReactNode } from "react";

/**
 * HonestyNote — the one-line "here's what this math does and doesn't
 * account for" caveat every /tools calculator shows next to its result
 * (parlay correlation, no-vig method choice, etc). Purely presentational,
 * server-safe.
 */

export interface HonestyNoteProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export function HonestyNote({ children, className = "" }: HonestyNoteProps): JSX.Element {
  return (
    <p data-testid="honesty-note" className={`text-xs leading-5 text-ink-300 ${className}`}>
      <span className="font-semibold text-white">Honest note: </span>
      {children}
    </p>
  );
}
