import Link from "next/link";
import type { ToolCoach } from "@/lib/fantasy/coach";
import { BRAND_COLORS } from "@/lib/brand";

/**
 * FantasyCoach — the inline teaching card every fantasy tool carries.
 *
 * Collapsed by default (native <details>, zero JS) so it costs one line
 * of vertical space until the player wants it. Open: every metric the
 * tool shows, defined in one line each, plus the move it should trigger
 * and a path into the Academy lesson for the full why.
 */
export function FantasyCoach({ coach }: { coach: ToolCoach }): JSX.Element {
  return (
    <details className="group mb-6 rounded-ds-md border border-mineral/70 bg-eclipse/60">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: BRAND_COLORS.orbitalCyan }}
        >
          Coach
        </span>
        <span className="text-sm text-ink-300">{coach.quickStart}</span>
        <span
          aria-hidden="true"
          className="ml-auto text-ink-500 transition-transform group-open:rotate-90"
        >
          ›
        </span>
      </summary>
      <div className="border-t border-mineral/60 px-4 py-4">
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {coach.terms.map((t) => (
            <div key={t.term}>
              <dt className="text-sm font-semibold text-white">{t.term}</dt>
              <dd className="text-sm leading-6 text-ink-300">
                {t.meaning}{" "}
                <span style={{ color: BRAND_COLORS.orbitalCyan }}>{t.move}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-ink-500">
          Want the full why?{" "}
          <Link
            href="/academy"
            className="underline decoration-mineral underline-offset-4 hover:text-ink-300"
          >
            Take the 2-minute Academy lesson →
          </Link>
        </p>
      </div>
    </details>
  );
}
