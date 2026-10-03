/**
 * FantasyUpsell — a compact, honest inline CTA shown to FREE viewers inside the
 * fantasy tools. The tools stay usable for everyone (a real free trial — capped
 * board depth + a single recommendation); this surfaces what the paid Fantasy tier
 * unlocks and links to /pricing. Trust-gate-safe copy (no hype claims).
 */

import Link from "next/link";

export function FantasyUpsell({
  message = "You're on the free preview: the top of the board and one recommendation. The full board, every recommendation, and the complete roster analysis are part of the Fantasy suite.",
}: { message?: string } = {}) {
  return (
    <div className="surface-card border-ultraviolet/30 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ultraviolet">
        Fantasy suite
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-ion-1">{message}</p>
      <Link href="/pricing" className="btn btn-primary mt-4 inline-block">
        Unlock the full suite · from $49/yr →
      </Link>
    </div>
  );
}
