import { loadLineShopBoard } from "@/lib/market/load-line-shop-board";
import { formatAmerican, formatLine, type BestPrice } from "@/lib/market/best-line";
import { NUMERIC_TEXT_CLASS, formatCount } from "@/lib/format/stat";

/**
 * Line Shop Board — the best AVAILABLE price for each side across captured books.
 *
 * Transparency, not advice: "here's where the price is best right now," from
 * odds we already ingest. It complements the Market Fair Board (the no-vig
 * consensus) — consensus is what the market thinks; the shop is where to get the
 * best of it. Never a pick or a recommendation to bet both sides. Games without
 * a real multi-book quote are omitted, not padded.
 */

function PriceCell({
  label,
  best,
  kind,
}: {
  label: string;
  best: BestPrice | null;
  kind: "moneyline" | "spread" | "total";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-ion-3">{label}</span>
      {best ? (
        <span className={`text-sm text-ion-white ${NUMERIC_TEXT_CLASS}`}>
          {best.line !== undefined && kind !== "moneyline" && (
            <span className="text-ion-1">{formatLine(best.line, kind === "spread" ? "spread" : "total")} </span>
          )}
          <span className="font-semibold text-orbital-cyan">{formatAmerican(best.price)}</span>
          <span className="ml-1 text-[11px] text-ion-3">{best.bookmaker}</span>
        </span>
      ) : (
        <span className="text-sm text-ion-3">—</span>
      )}
    </div>
  );
}

export async function LineShopBoard() {
  let board: Awaited<ReturnType<typeof loadLineShopBoard>>;
  try {
    board = await loadLineShopBoard();
  } catch {
    return null;
  }

  return (
    <section
      data-testid="line-shop-board"
      className="overflow-hidden rounded-2xl border border-titanium bg-gradient-to-br from-eclipse to-carbon"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-titanium px-6 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            Line shop: best available price
          </h2>
          <p className="mt-1 text-[11px] text-ion-2">
            Where the price is best right now, per side, across the books we
            capture. Shop the number. It&apos;s your money.
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
          No upcoming game carries a real quote from at least two books in the
          capture window. The shop renders only from captured odds. It stays
          empty rather than inventing a price.
        </p>
      ) : (
        <ul className="divide-y divide-titanium/60">
          {board.rows.map((row) => (
            <li
              key={row.gameId}
              data-testid="line-shop-row"
              className="px-6 py-4"
            >
              <p className="text-sm font-semibold text-ion-white">
                {row.awayTeamName} <span className="text-ion-3">@</span> {row.homeTeamName}
              </p>
              <p className={`mt-0.5 text-[11px] uppercase tracking-wider text-ion-2 ${NUMERIC_TEXT_CLASS}`}>
                {row.sport} ·{" "}
                {new Date(row.commenceTime).toISOString().slice(5, 16).replace("T", " ")} UTC ·{" "}
                {formatCount(row.best.bookCount)} books
              </p>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <PriceCell label="Best home ML" best={row.best.moneyline.home} kind="moneyline" />
                <PriceCell label="Best away ML" best={row.best.moneyline.away} kind="moneyline" />
                <span className="hidden sm:block" />
                <PriceCell label="Best home spread" best={row.best.spread.home} kind="spread" />
                <PriceCell label="Best away spread" best={row.best.spread.away} kind="spread" />
                <span className="hidden sm:block" />
                <PriceCell label="Best over" best={row.best.total.over} kind="total" />
                <PriceCell label="Best under" best={row.best.total.under} kind="total" />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-titanium px-6 py-3">
        <p className="text-[11px] leading-relaxed text-ion-2">
          The best price shown is each book&apos;s latest captured quote for that
          side: a transparency read, not a pick and not a prompt to bet both
          sides. Prices move; confirm at the book before you act.
        </p>
      </div>
    </section>
  );
}
