import {
  loadModelAccuracyBoard,
  DEFAULT_MINIMUM_SAMPLE,
  type ModelAccuracyBoard,
} from "@/lib/cockpit/model-accuracy-board";
import { requireCockpitAdmin } from "@/lib/cockpit/require-admin";
import type { LeaderboardEntry } from "@sports/fantasy-engine";

/**
 * Cockpit Model Accuracy — the platform's OWN model versions ranked by
 * calibrated accuracy over EXISTING settled picks, scored through the honest
 * accuracy engine (proper scoring rules + the seam-closed leaderboard).
 *
 * Founder-gated (ADMIN): the cockpit layout gates the tree and this page calls
 * requireCockpitAdmin() as its first statement (defense-in-depth for G-1).
 *
 * Method-opacity safe: the board shows model-version labels and outcome /
 * calibration numbers ONLY — never a betting factor name, weight, threshold, or
 * gate. Outcomes are the public-provable layer; the surface stays ADMIN-gated.
 *
 * Honesty: a DB failure renders UNAVAILABLE with the reason; a window with no
 * settled scoreable picks renders the honest empty state. The board is never
 * populated with fabricated rows.
 */
export const dynamic = "force-dynamic";

/** Format a metric, surfacing the engine's honest non-finite sentinels. */
function fmt(value: number, digits: number): string {
  if (Number.isNaN(value)) return "—";
  if (value === Number.POSITIVE_INFINITY) return "∞";
  if (value === Number.NEGATIVE_INFINITY) return "−∞";
  return value.toFixed(digits);
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

function UnavailableState({ reason }: { reason: string }) {
  return (
    <p className="rounded-lg border border-amber-900 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
      Board unavailable — withheld rather than fabricated. {reason}
    </p>
  );
}

function EmptyState() {
  return (
    <p className="rounded-lg border border-titanium/40 bg-eclipse/40 px-3 py-2 text-[11px] text-ion-2">
      No settled picks yet — the board fills as picks settle. Nothing is fabricated.
    </p>
  );
}

function RankableBadge({ rankable }: { rankable: boolean }) {
  return rankable ? (
    <span className="text-emerald-300">Rankable</span>
  ) : (
    <span className="text-ion-3" title={`Below the ${DEFAULT_MINIMUM_SAMPLE}-forecast rankable floor`}>
      Small sample
    </span>
  );
}

function LeaderboardTable({ entries }: { entries: readonly LeaderboardEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] uppercase tracking-widest text-ion-3">
            <th scope="col" className="py-1 pr-4 font-medium">#</th>
            <th scope="col" className="py-1 pr-4 font-medium">Model version</th>
            <th scope="col" className="py-1 pr-4 font-medium">Forecasts</th>
            <th scope="col" className="py-1 pr-4 font-medium">Coverage</th>
            <th scope="col" className="py-1 pr-4 font-medium">Brier</th>
            <th scope="col" className="py-1 pr-4 font-medium">Log loss</th>
            <th scope="col" className="py-1 pr-4 font-medium">Skill vs base</th>
            <th scope="col" className="py-1 pr-4 font-medium">Calib. error</th>
            <th scope="col" className="py-1 pr-4 font-medium">Cov-adj skill</th>
            <th scope="col" className="py-1 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-ion-1">
          {entries.map((e, i) => (
            <tr key={e.forecasterId} className="border-t border-titanium/20">
              <td className="py-1 pr-4 text-ion-3">{i + 1}</td>
              <td className="py-1 pr-4 font-mono">{e.forecasterId}</td>
              <td className="py-1 pr-4 font-mono">{e.forecastCount}</td>
              <td className="py-1 pr-4 font-mono">{pct(e.coverage)}</td>
              <td className="py-1 pr-4 font-mono">{fmt(e.brier, 4)}</td>
              <td className="py-1 pr-4 font-mono">{fmt(e.logLoss, 4)}</td>
              <td className="py-1 pr-4 font-mono">{fmt(e.skillVsBaseRate, 3)}</td>
              <td className="py-1 pr-4 font-mono">{fmt(e.calibrationError, 4)}</td>
              <td className="py-1 pr-4 font-mono">{fmt(e.coverageAdjustedSkill, 3)}</td>
              <td className="py-1">
                <RankableBadge rankable={e.meetsMinimumSample} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function CockpitModelAccuracyPage() {
  await requireCockpitAdmin();
  const board: ModelAccuracyBoard = await loadModelAccuracyBoard();

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-ion-1">Model Accuracy — version leaderboard</h1>
        <p className="text-[11px] text-ion-3">
          {board.status === "ok" ? (
            <>
              Computed {board.computedAt} · {board.scoredForecasters} model version
              {board.scoredForecasters === 1 ? "" : "s"} · {board.totalForecasts} scored forecast
              {board.totalForecasts === 1 ? "" : "s"} · rankable floor {board.minimumSample}. Our own
              model versions, ranked by calibrated accuracy over settled picks.
            </>
          ) : (
            <>Our own model versions, ranked by calibrated accuracy over settled picks.</>
          )}
        </p>
      </header>

      <section className="rounded-2xl border border-titanium/40 bg-eclipse/40 p-4 text-xs">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Version accuracy board
        </h2>
        <p className="mb-3 text-[11px] leading-relaxed text-ion-2">
          Each row is a distinct model version — the version FROZEN in each pick&apos;s immutable
          proof receipt at publish, never the value the refresh cycle later rewrites. A pick is
          scored as a win probability only when that is honest: a genuinely calibrated model
          probability (any pick type) or, absent one, confidence ÷ 100 for MONEYLINE picks, where
          confidence is the vig-free fair probability. Spread/total picks are priced to ~50% by
          construction, so they settle as unscored (lowering coverage) rather than being dressed up
          as probabilities — today that makes this a MONEYLINE calibration board. Ranking is
          coverage-adjusted skill — proven skill on the full board, never a cherry-picked slice.
        </p>
        {board.status === "unavailable" ? (
          <UnavailableState reason={board.reason} />
        ) : board.status === "empty" ? (
          <EmptyState />
        ) : (
          <LeaderboardTable entries={board.entries} />
        )}
      </section>

      <footer className="rounded-lg border border-titanium/40 bg-eclipse/40 px-3 py-2 text-[10px] leading-relaxed text-ion-3">
        <p>
          Metrics are proper scoring rules over settled picks: Brier and log loss are absolute
          (measured against reality, not a field of rivals) and reward calibrated conviction; skill
          vs base rate anchors to each version&apos;s own settled base rate; calibration error is the
          coverage-weighted gap between stated and realized rates. Every settled decision we can
          attribute to a frozen model version counts — including the highest-conviction 0% and 100%
          forecasts — and coverage below 100% marks decisions we settled but could not score as a
          win probability without fabricating one.
        </p>
        <p>
          Internal founder tooling. Outcomes and calibration only — no model internals are shown.
          Rows below the {DEFAULT_MINIMUM_SAMPLE}-forecast floor are reported but never ranked above
          it. Nothing on this board is fabricated.
        </p>
      </footer>
    </div>
  );
}
