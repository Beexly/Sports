/**
 * Cockpit "needs adjudication" card — READ-ONLY worklist.
 *
 * This is the human-facing flip side of ADR 006 (persisted settlement-hold
 * state). Today the platform settles picks automatically and, on the free path,
 * HOLDS disputed scores instead of guessing — but that hold is never persisted,
 * so "settlement correctly refused to guess" and "settlement is broken" are
 * indistinguishable in `settlement-health.ts`. Until ADR 006 lands, this card
 * surfaces every overdue-PENDING pick so the owner can act in a minute. It does
 * NOT claim to know *why* each is held — the caption says so.
 *
 * Pure presentational component: the page passes already-derived rows. No DB
 * access, no mutation, no settle button. Tested in
 * `__tests__/cockpit-settlement-hold.test.tsx`.
 */

export interface AdjudicationRow {
  readonly id: string;
  readonly sport: string;
  readonly matchup: string;
  readonly commenceTime: string; // ISO
  readonly hoursOverdue: number;
  readonly pickType: string;
  readonly selection: string;
  readonly line: number;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export function NeedsAdjudicationCard({ rows }: { rows: readonly AdjudicationRow[] }) {
  return (
    <div className="rounded-xl border border-titanium bg-carbon/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ion-1">Needs adjudication</h2>
        <span className="rounded-md border border-caution bg-caution/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-caution">
          {rows.length} overdue
        </span>
      </div>

      <p className="mt-2 text-[11px] text-ion-3">
        Picks still <span className="font-semibold text-ion-2">PENDING</span> past the
        settlement grace window ({/* grace hours shown by the page */}). This is a
        worklist, not a failure list — the platform refuses to invent a disputed score,
        and until ADR 006 lands it cannot yet show <em>why</em> each one is held. Review
        and settle each by hand if the source data is now available.
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-[12px] text-verify">
          ✓ No overdue picks. Settlement is current.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-titanium/50">
          {rows.map((r) => (
            <li key={r.id} className="py-2 text-[12px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ion-1">{r.matchup}</span>
                <span className="text-ion-3">{r.sport}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-ion-2">
                <span>
                  {r.pickType} · {r.selection} {r.line}
                </span>
                <span className="text-caution">overdue {formatHours(r.hoursOverdue)}</span>
                <span className="text-ion-3">
                  commenced {new Date(r.commenceTime).toISOString().slice(0, 16).replace("T", " ")}Z
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
