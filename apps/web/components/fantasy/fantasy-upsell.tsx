/**
 * FantasyUpsell — a compact, honest inline CTA shown to FREE viewers inside the
 * fantasy tools. The tools stay usable for everyone (a real free trial — capped
 * board depth + a single recommendation); this surfaces what the paid Fantasy tier
 * unlocks and links to /pricing. Trust-gate-safe copy (no hype claims).
 */

import Link from "next/link";
import { BRAND_COLORS } from "@/lib/brand";

export function FantasyUpsell({
  fantasyAnnual,
  message = "You're on the free preview: the top of the board and one recommendation. The full board, every recommendation, and the complete roster analysis are part of the Fantasy suite.",
}: {
  /**
   * Current-phase Fantasy annual price, resolved SERVER-SIDE from
   * pricing-phases.ts (single source of truth) and threaded down. REQUIRED —
   * the compiler enforces every call site (M-F13 lesson). It cannot be
   * resolved here: this renders inside client components, where the
   * server-only PRICING_PHASE env var is invisible and the phase would
   * silently fall back to FOUNDING — advertising a rate checkout won't honor
   * after the ladder advances (the exact drift this parameter exists to kill;
   * the old hardcoded founding-price literal had the same failure through
   * the front door).
   */
  fantasyAnnual: number;
  message?: string;
}) {
  return (
    <div
      className="surface-card p-5"
      style={{ boxShadow: `inset 0 0 0 1px ${BRAND_COLORS.orbitalCyan}33` }}
    >
      <p className="text-xs uppercase tracking-[0.16em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
        Fantasy suite
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{message}</p>
      <Link href="/pricing" className="btn btn-primary mt-4 inline-block">
        Unlock the full suite · from ${fantasyAnnual}/yr →
      </Link>
    </div>
  );
}
