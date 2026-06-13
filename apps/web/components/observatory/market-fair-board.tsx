import type { MarketGravity } from "@sports/prediction-engine";
import { loadMarketFairBoard } from "@/lib/market/load-market-fair-board";
import {
  NUMERIC_TEXT_CLASS,
  formatCount,
  formatPercent,
  formatRatioAsPercent,
} from "@/lib/format/stat";

const GRAVITY_LABEL: Record<MarketGravity["band"], string> = {
  strong: "Strong pull",
  moderate: "Moderate pull",
  slight: "Slight lean",
  balanced: "Balanced",
};

/**
 * Market Gravity Index badge — how hard the market is pulling, and which way.
 * Magenta (market heat) for a strong pull; cooler tones as it weakens. The
 * index measures the market's CONVICTION, not whether it is right.
 */
function GravityBadge({ gravity }: { gravity: MarketGravity }) {
  const tone =
    gravity.band === "strong"
      ? "border-plasma/40 text-plasma"
      : gravity.band === "moderate"
        ? "border-ultraviolet/40 text-ion-1"
        : "border-titanium text-ion-2";
  const dir = gravity.side === "none" ? "" : ` → ${gravity.side}`;
  return (
    <span
      data-testid="gravity-badge"
      title="Market Gravity Index (0–100): conviction × book agreement × coverage. Measures how hard the market pulls — not whether it's right."
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${tone} ${NUMERIC_TEXT_CLASS}`}
    >
      Gravity {gravity.index}
      {dir} · {GRAVITY_LABEL[gravity.band]}
    </span>
  );
}

/**
 * Market Fair Board — the market's own price with the margin removed.
 *
 * Per game: each book's latest H2H quote is de-vigged (Shin), the median
 * across books becomes the consensus, and the book hold is shown so the
 * reader sees what the juice actually costs. This is market description —
 * what the books are charging — never a model claim, projection, or pick.
 * Games without a real multi-book quote are omitted, not padded.
 */

export async function MarketFairBoard() {
  let board: Awaited<ReturnType<typeof loadMarketFairBoard>>;
  try {
    board = await loadMarketFairBoard();
  } catch {
    return null;
  }

  return (
    <section
      data-testid="market-fair-board"
      className="overflow-hidden rounded-2xl border border-titanium bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-titanium px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            Market fair board — vig removed
          </h2>
          <p className="mt-1 text-[11px] text-ion-2">
            What the books are charging, margin stripped (Shin de-vig, median
            across books). The market&apos;s opinion — not ours.
          </p>
        </div>
        <span className={`text-[11px] uppercase tracking-widest text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
          {board.rows.length > 0
            ? `${formatCount(board.rows.length)} games quoted`
            : "Awaiting quotes"}
        </span>
      </div>

      {board.rows.length === 0 ? (
        <p className="px-6 py-8 text-sm text-ion-1">
          No upcoming game carries a two-sided quote from at least two books in
          the capture window. The board renders only from real captured odds —
          it stays empty rather than inventing a market.
        </p>
      ) : (
        <ul className="divide-y divide-titanium/60">
          {board.rows.map((row) => {
            const c = row.read.consensus;
            const homeLeads = c.fairHomeProb >= c.fairAwayProb;
            return (
              <li
                key={row.gameId}
                data-testid="market-fair-row"
                className="grid gap-2 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-ion-white">
                    {row.awayTeamName}{" "}
                    <span className="text-ion-3">@</span> {row.homeTeamName}
                  </p>
                  <p className={`mt-1 text-[11px] uppercase tracking-wider text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                    {row.sport} ·{" "}
                    {new Date(row.commenceTime).toISOString().slice(5, 16).replace("T", " ")}{" "}
                    UTC · {formatCount(c.bookCount)} books · hold{" "}
                    {formatPercent(c.medianHoldPct)}
                    {row.read.homeDriftPp !== null && (
                      <span
                        className={
                          Math.abs(row.read.homeDriftPp) >= 1.5
                            ? " text-plasma"
                            : " text-ion-2"
                        }
                      >
                        {" "}· drift {row.read.homeDriftPp > 0 ? "+" : ""}
                        {row.read.homeDriftPp}pp → {row.read.homeDriftPp >= 0 ? "home" : "away"}{" "}
                        in window
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                  <div className={`flex items-center gap-3 text-sm ${NUMERIC_TEXT_CLASS}`}>
                    <span className={homeLeads ? "font-semibold text-orbital-cyan" : "text-ion-1"}>
                      Home {formatRatioAsPercent(c.fairHomeProb)}
                    </span>
                    {c.fairDrawProb !== null && (
                      <span className="text-ion-2">
                        Draw {formatRatioAsPercent(c.fairDrawProb)}
                      </span>
                    )}
                    <span className={!homeLeads ? "font-semibold text-orbital-cyan" : "text-ion-1"}>
                      Away {formatRatioAsPercent(c.fairAwayProb)}
                    </span>
                  </div>
                  <GravityBadge gravity={row.read.gravity} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          Drift = fair-price movement across the capture window (earliest vs latest quote per book, vig removed) — the direction an edge bleeds. De-vigged prices describe the market, not the outcome. They are not
          picks, projections, or advice — the engine&apos;s own reads live on
          the board and carry their full evidence trail.
        </p>
      </div>
    </section>
  );
}
