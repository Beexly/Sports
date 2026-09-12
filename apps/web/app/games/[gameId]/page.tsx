import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { loadBoardState } from "@/lib/board/state";
import { loadGameDetail } from "@/lib/games/game-detail";
import type { BestPrice } from "@/lib/market/best-line";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game reading",
  description: "Our readings for one game: lines, edge, confidence, and held reasons.",
};

function fmtPrice(p: number): string {
  return p > 0 ? `+${p}` : String(p);
}

function LineCell({ label, price }: { label: string; price: BestPrice | null }) {
  if (!price) return null;
  return (
    <div className="border-t border-mineral-hi pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ion-white">
        {fmtPrice(price.price)}
        {price.line !== undefined && (
          <span className="ml-2 text-lg text-ion-1">({price.line > 0 ? `+${price.line}` : price.line})</span>
        )}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2">
        {price.bookmaker}
      </p>
    </div>
  );
}

export default async function GamePage({
  params,
}: {
  params: { gameId: string };
}): Promise<JSX.Element> {
  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;
  const stateResult = await loadBoardState(new Date(), viewerEntitlements);
  const state = stateResult.data;
  const allRows = [...state.scoringNow, ...state.publishedToday, ...state.gatedTodayRows];
  const detail = await loadGameDetail(params.gameId, allRows);
  const game = detail?.game ?? null;

  return (
    <div className="relative min-h-screen w-full bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {!detail ? (
          <Reveal>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
              <Link href="/slate" className="link-underline mr-3 text-ion-2">
                Slate
              </Link>
              Unknown game
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold text-ion-white sm:text-5xl">
              This game is not on a covered slate.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
              Either the id is wrong, the game fell outside a covered league, or the
              board cannot be read right now.{" "}
              <Link href="/board" className="link-underline text-ion-white">
                Back to the board
              </Link>
              .
            </p>
          </Reveal>
        ) : (
          <>
            <Reveal>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
                <Link
                  href={`/slate/${detail.sport.toLowerCase()}`}
                  className="link-underline mr-3 text-ion-2"
                >
                  {detail.sport}
                </Link>
                {detail.status}
                {detail.homeScore !== null && detail.awayScore !== null
                  ? ` · ${detail.awayScore}–${detail.homeScore}`
                  : ""}
              </p>
              <h1 className="mt-4 max-w-5xl font-display font-semibold leading-[0.95] tracking-tight text-ion-white"
                style={{ fontSize: "clamp(2.75rem, 7vw, 5.5rem)" }}
              >
                {detail.matchup}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
                Our readings below are the engine&apos;s, per market. Edge is a ranking
                score, not a probability. Held readings show their reason.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h2 className="mt-14 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
                Best captured lines
                {detail.best?.freshestFetchedAt
                  ? ` · as of ${new Date(detail.best.freshestFetchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`
                  : ""}
              </h2>
              {detail.best ? (
                <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-plasma">Moneyline</p>
                    <div className="mt-2 grid grid-cols-2 gap-6">
                      <LineCell label="Home" price={detail.best.moneyline.home} />
                      <LineCell label="Away" price={detail.best.moneyline.away} />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-plasma">Spread</p>
                    <div className="mt-2 grid grid-cols-2 gap-6">
                      <LineCell label="Home" price={detail.best.spread.home} />
                      <LineCell label="Away" price={detail.best.spread.away} />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-plasma">Total</p>
                    <div className="mt-2 grid grid-cols-2 gap-6">
                      <LineCell label="Over" price={detail.best.total.over} />
                      <LineCell label="Under" price={detail.best.total.under} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-6 border border-mineral bg-eclipse p-6 text-sm leading-6 text-ion-1">
                  No multi-book line captured for this game. Lines appear once at least
                  two books quote it; until then there is nothing to shop.
                </p>
              )}
            </Reveal>

            <Reveal delay={120}>
              <h2 className="mt-14 font-mono text-[10px] uppercase tracking-[0.22em] text-ion-2">
                Our readings · {game?.readings.length ?? 0}
              </h2>
              {!game || game.readings.length === 0 ? (
                <p className="mt-6 border border-mineral bg-eclipse p-6 text-sm leading-6 text-ion-1">
                  No readings posted for this game. The engine evaluated nothing here,
                  cleared or held.
                </p>
              ) : (
                <div className="mt-6 overflow-hidden border border-mineral">
                  {game.readings.map((r) => (
                    <div
                      key={r.id}
                      className="grid gap-3 border-b border-mineral bg-eclipse p-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
                    >
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2">
                          {r.market} · {r.status === "GATED_TODAY" ? "held" : r.status === "SCORING_NOW" ? "scoring" : "cleared"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-ion-1">
                          {r.gateReason ? (
                            <>
                              <span className="font-semibold text-plasma">Held. </span>
                              {r.gateReason}
                            </>
                          ) : (
                            "Cleared the gates with its reasoning attached."
                          )}
                        </p>
                        {r.rankingSource && (
                          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2">
                            {r.rankingSource}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-8 sm:text-right">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Edge</p>
                          <p className="font-display text-2xl font-semibold tabular-nums text-ion-white">
                            {r.edgeIndex ?? "n/a"}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">Conf</p>
                          <p className="font-display text-2xl font-semibold tabular-nums text-ion-white">
                            {r.confidence ?? (r.rankingP !== null ? r.rankingP.toFixed(2) : "n/a")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                <Link href="/verify" className="link-underline text-sm font-semibold text-ion-1 hover:text-ion-white">
                  Check a receipt
                </Link>
                <Link href="/calibration" className="link-underline text-sm font-semibold text-ion-1 hover:text-ion-white">
                  Full record
                </Link>
                <Link href="/fantasy/props" className="link-underline text-sm font-semibold text-ion-1 hover:text-ion-white">
                  Player props desk
                </Link>
              </div>
            </Reveal>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
