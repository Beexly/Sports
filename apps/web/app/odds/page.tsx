import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { loadLineRoom, type GameBoard } from "@/lib/odds/board-loader";
import { formatAmerican, type MarketBoard } from "@/lib/odds/comparison";
import { BRAND_COLORS } from "@/lib/brand";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Line Room — Odds Comparison & Best Price",
  description:
    "Compare moneyline, spread, and total prices across every connected sportsbook. Best price highlighted per side, median consensus line, and no-vig implied probability — facts from stored bookmaker data, never projections.",
  alternates: { canonical: "/odds" },
};

const MARKET_LABEL: Record<string, string> = {
  H2H: "Moneyline",
  SPREADS: "Spread",
  TOTALS: "Total",
};

function sideLabels(market: string, g: GameBoard): readonly [string, string] {
  if (market === "TOTALS") return ["Over", "Under"];
  return [g.homeTeam, g.awayTeam];
}

function MarketTable({ board, game }: { board: MarketBoard; game: GameBoard }) {
  const [homeLabel, awayLabel] = sideLabels(board.market, game);
  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
          {MARKET_LABEL[board.market]} · {board.bookCount} book{board.bookCount === 1 ? "" : "s"}
        </p>
        {board.consensusLine !== null && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
            consensus {board.market === "SPREADS" && board.consensusLine > 0 ? "+" : ""}
            {board.consensusLine}
          </p>
        )}
        {board.noVigHomeProb !== null && (
          <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: BRAND_COLORS.orbitalCyan }}>
            no-vig {homeLabel} {(board.noVigHomeProb * 100).toFixed(1)}%
          </p>
        )}
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
              <th className="py-1 pr-4 font-medium">Book</th>
              <th className="py-1 pr-4 font-medium">{homeLabel}</th>
              <th className="py-1 font-medium">{awayLabel}</th>
            </tr>
          </thead>
          <tbody className="text-ink-200 [font-variant-numeric:tabular-nums]">
            {board.lines.map((l) => {
              const home =
                board.market === "H2H"
                  ? { line: null, price: l.homePrice }
                  : board.market === "SPREADS"
                    ? { line: l.spread, price: l.homeSpreadPrice }
                    : { line: l.total, price: l.overPrice };
              const away =
                board.market === "H2H"
                  ? { line: null, price: l.awayPrice }
                  : board.market === "SPREADS"
                    ? { line: l.spread === null ? null : -l.spread, price: l.awaySpreadPrice }
                    : { line: l.total, price: l.underPrice };
              const isBestHome = board.bestHome?.bookmaker === l.bookmaker && home.price === board.bestHome?.price;
              const isBestAway = board.bestAway?.bookmaker === l.bookmaker && away.price === board.bestAway?.price;
              return (
                <tr key={l.bookmaker} className="border-t border-mineral/50">
                  <td className="py-1.5 pr-4 capitalize text-white">{l.bookmaker.replace(/_/g, " ")}</td>
                  {[
                    { v: home, best: isBestHome },
                    { v: away, best: isBestAway },
                  ].map(({ v, best }, i) => (
                    <td key={i} className="py-1.5 pr-4 font-mono">
                      {v.price === null ? (
                        <span className="text-ink-500">—</span>
                      ) : (
                        <span
                          className={best ? "rounded px-1.5 py-0.5 font-semibold" : ""}
                          style={best ? { backgroundColor: `${BRAND_COLORS.orbitalCyan}22`, color: BRAND_COLORS.orbitalCyan } : undefined}
                        >
                          {v.line !== null && (
                            <span className="mr-1 text-ink-300">
                              {board.market === "SPREADS" && v.line > 0 ? "+" : ""}
                              {v.line}
                            </span>
                          )}
                          {formatAmerican(v.price)}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function LineRoomPage() {
  const data = await loadLineRoom();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1 px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
            Line Room · odds comparison
          </p>
          <h1 className="mt-4 font-display text-white" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05 }}>
            Every book. Best price highlighted.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-300">
            Moneyline, spread, and total across every connected sportsbook — the best price per
            side marked, the consensus line computed, the vig stripped. Half a point and five
            cents of juice are real money over a season.
          </p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
            {data.games.length} games · {data.bookCount} books · facts from stored bookmaker data — never projections
          </p>

          {data.arbs.length > 0 && (
            <section className="mt-8 rounded-ds-md border border-emerald-500/40 bg-emerald-500/5 p-5">
              <h2 className="font-display text-lg font-semibold text-white">Arbitrage detected</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-ink-200 [font-variant-numeric:tabular-nums]">
                {data.arbs.map((a, i) => (
                  <li key={i}>
                    <span className="font-mono font-semibold text-emerald-300">
                      +{(a.profitPct * 100).toFixed(2)}% locked
                    </span>{" "}
                    · {a.matchup} {MARKET_LABEL[a.market]} —{" "}
                    <span className="capitalize">{a.homeBook.replace(/_/g, " ")}</span>{" "}
                    {formatAmerican(a.homePrice)} /{" "}
                    <span className="capitalize">{a.awayBook.replace(/_/g, " ")}</span>{" "}
                    {formatAmerican(a.awayPrice)}. Books re-price fast — verify both legs before staking.
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.topEdges.length > 0 && (
            <section className="mt-8 rounded-ds-md border p-5" style={{ borderColor: `${BRAND_COLORS.orbitalCyan}44`, backgroundColor: `${BRAND_COLORS.orbitalCyan}0a` }}>
              <h2 className="font-display text-lg font-semibold text-white">Today&apos;s edges</h2>
              <p className="mt-1 text-sm text-ink-300">
                Prices beating the no-vig consensus of the full market by ≥1% expected value.
                Math, not a model — and lines move, so confirm at the book.
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-200 [font-variant-numeric:tabular-nums]">
                {data.topEdges.map((e, i) => (
                  <li key={i} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono font-semibold" style={{ color: BRAND_COLORS.orbitalCyan }}>
                      +{(e.evPerUnit * 100).toFixed(1)}% EV
                    </span>
                    <span className="text-white">{e.sideLabel}</span>
                    <span className="font-mono">{formatAmerican(e.price)}</span>
                    <span className="capitalize text-ink-300">at {e.bookmaker.replace(/_/g, " ")}</span>
                    <span className="text-ink-400">· {e.matchup} · {MARKET_LABEL[e.market]}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.games.length === 0 ? (
            <div className="mt-10 rounded-ds-md border border-mineral/70 bg-eclipse/60 p-6">
              <p className="text-sm text-ink-300">
                No upcoming games with stored odds right now. The board fills automatically as the
                ingestion pipeline runs (every cron cycle). No sample rows, no placeholders — this
                page only ever shows real bookmaker prices.
              </p>
            </div>
          ) : (
            <div className="mt-10 space-y-8">
              {data.games.map((g) => (
                <section key={g.gameId} className="surface-card p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-display text-lg font-semibold text-white">
                      {g.awayTeam} @ {g.homeTeam}
                    </h2>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                      {g.sport} · {new Date(g.commenceTime).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" })} ET
                    </p>
                  </div>
                  {g.markets.map((m) => (
                    <MarketTable key={m.market} board={m} game={g} />
                  ))}
                </section>
              ))}
            </div>
          )}

          <p className="mt-10 max-w-2xl text-xs leading-relaxed text-ink-500">
            Odds are facts captured from licensed bookmaker data at ingestion time and can move at
            any moment — always confirm at the book. 21+ where applicable. Gambling problem?
            1-800-GAMBLER.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
