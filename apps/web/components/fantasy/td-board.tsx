"use client";

/**
 * TdBoard — anytime-touchdown board (wave4 intel: TD-Board productization brief).
 *
 * Cinematic presentation of the glass-box TD model in lib/fantasy/td-model.ts.
 * What this surface refuses to do:
 *   - It never shows an "edge" it cannot price. With no licensed odds feed every
 *     row renders edge as an em-dash with the reason, not a zero.
 *   - It never presents proxy-derived red-zone shares as measured data; the
 *     caveat strip states the basis and the source badge flips on live data.
 *   - It never claims a hit rate. The model's weights are published; its
 *     accuracy is not yet proven on GSE data and the panel says so.
 */

import { useMemo } from "react";
import { gradeTdScorers, illustrativeTdInputs, rankByEdge, PROXY_BASIS_NOTE, TD_WEIGHTS, TD_LOGISTIC, type TdGrade } from "@/lib/fantasy/td-model";
import { isLiveProjections } from "@/lib/integrations/projections";

function posColor(pos: string): string {
  switch (pos) {
    case "RB":
      return "bg-plasma/20 text-plasma";
    case "WR":
      return "bg-orbital-cyan/20 text-orbital-cyan";
    case "TE":
      return "bg-ultraviolet/20 text-ultraviolet";
    default:
      return "bg-ion-1/20 text-ion-2";
  }
}

function probPct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function TdBoard({ live }: { live?: boolean }) {
  const isLive = live ?? isLiveProjections();
  const grades = useMemo(() => rankByEdge(gradeTdScorers(illustrativeTdInputs())), []);
  const priced = grades.filter((g) => g.edge !== null);
  const headline = grades.slice(0, 3);

  return (
    <div className="space-y-4" data-testid="td-board">
      {/* Hero — the slate frame, not a spreadsheet header. */}
      <section className="surface-card relative overflow-hidden p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-plasma/10 via-transparent to-orbital-cyan/10"
        />
        <div className="relative flex flex-wrap items-start gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-ion-3">
              Goal-line intelligence
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ion-white">
              Anytime TD board
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-ion-2">
              Every score below is recomputable by hand: a weighted composite of the four
              published factors, pushed through a stated logistic.
            </p>
          </div>
          <span
            data-testid="td-board-source"
            className={`ml-auto rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${
              isLive ? "bg-orbital-cyan/20 text-orbital-cyan" : "bg-caution/20 text-caution"
            }`}
          >
            {isLive ? "Source: live feed" : "Source: fictional (illustrative)"}
          </span>
        </div>

        {/* The published formula, in the open. */}
        <dl className="relative mt-5 grid gap-2 sm:grid-cols-4" data-testid="td-board-formula">
          {(
            [
              ["Season TD rate", TD_WEIGHTS.seasonHit],
              ["Red-zone volume", TD_WEIGHTS.redZone],
              ["Goal-line volume", TD_WEIGHTS.goalLine],
              ["Vegas team total", TD_WEIGHTS.teamTotal],
            ] as const
          ).map(([label, w]) => (
            <div key={label} className="rounded-lg border border-ion-1/20 bg-ion-1/5 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-[0.16em] text-ion-3">{label}</dt>
              <dd className="mt-0.5 font-mono text-lg text-ion-white">{(w * 100).toFixed(0)}%</dd>
            </div>
          ))}
        </dl>
        <p className="relative mt-3 font-mono text-[11px] text-ion-3">
          prob = logistic((score − {TD_LOGISTIC.center}) × {TD_LOGISTIC.slope})
        </p>
      </section>

      {/* Caveat strip — stated once, plainly, above the numbers. */}
      <div
        data-testid="td-board-basis"
        className="rounded-lg border border-caution/30 bg-caution/10 px-4 py-3 text-xs text-ion-2"
      >
        <span className="font-semibold text-caution">Basis: </span>
        {PROXY_BASIS_NOTE}
      </div>

      {/* Headline three — the cinematic flare. */}
      {headline.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3" data-testid="td-board-headline">
          {headline.map((g, i) => (
            <article
              key={g.playerId}
              className="surface-card group relative overflow-hidden p-4 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -top-16 h-32 bg-gradient-to-b from-plasma/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <p className="relative text-[10px] uppercase tracking-[0.2em] text-ion-3">
                Model rank {i + 1}
              </p>
              <p className="relative mt-1 truncate text-lg font-semibold text-ion-white">{g.name}</p>
              <div className="relative mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${posColor(g.pos)}`}>
                  {g.pos}
                </span>
                <span className="text-xs text-ion-3">{g.team}</span>
              </div>
              <p className="relative mt-3 font-mono text-3xl text-ion-white">{probPct(g.prob)}</p>
              <p className="relative text-[11px] text-ion-3">anytime-TD probability</p>
            </article>
          ))}
        </div>
      )}

      {/* Ranked board. */}
      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ion-3">Full board</span>
          <span className="text-xs text-ion-3">
            {grades.length} players · {priced.length} priced
          </span>
        </div>

        {grades.length === 0 ? (
          <p className="px-4 py-8 text-sm text-ion-2">
            The goal line is empty on this frequency — no eligible players on the slate.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-ion-1/10">
            {grades.map((g: TdGrade, i) => (
              <div
                key={g.playerId}
                data-testid="td-board-row"
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm hover:bg-ion-1/5"
              >
                <span className="w-6 font-mono text-xs text-ion-3">{i + 1}</span>
                <span className="min-w-[9rem] flex-1 truncate text-ion-white">{g.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${posColor(g.pos)}`}>
                  {g.pos}
                </span>
                <span className="w-10 text-xs text-ion-3">{g.team}</span>
                <span className="w-16 text-right font-mono text-ion-white">{probPct(g.prob)}</span>
                <span
                  data-testid="td-board-edge"
                  className={`w-20 text-right font-mono text-xs ${
                    g.edge === null
                      ? "text-ion-3"
                      : g.edge > 0
                        ? "text-verify"
                        : "text-caution"
                  }`}
                >
                  {g.edge === null ? "—" : `${g.edge > 0 ? "+" : ""}${(g.edge * 100).toFixed(1)}p`}
                </span>
                {g.partial && (
                  <span
                    data-testid="td-board-missing"
                    title={`Missing inputs: ${g.missing.join(", ")} — weight renormalized, not backfilled`}
                    className="rounded border border-caution/40 px-1.5 py-0.5 text-[10px] text-caution"
                  >
                    {g.missing.length} missing
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="px-4 py-3 text-[11px] text-ion-3">
          Edge is model probability minus the vig-stripped market probability. Rows without a
          market price show an em-dash — an unpriceable board is reported, never dressed up.
        </p>
      </section>
    </div>
  );
}

export default TdBoard;