import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { loadBoardState } from "@/lib/board/state";
import { loadGameDetail } from "@/lib/games/game-detail";
import type { BestPrice } from "@/lib/market/best-line";
import type { BoardStateRow } from "@/lib/board/state";
import { boardMarketLabel } from "@/lib/board/market-label";
import { CENTRAL_TZ } from "@/lib/time/central";
import { PICK_TYPE, PickStat, PickStatRow } from "@/components/picks/pick-stat";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game reading",
  description: "Our readings for one game: lines, edge, confidence, and held reasons.",
};

function fmtPrice(p: number): string {
  return p > 0 ? `+${p}` : String(p);
}

const STATUS_LABEL: Record<BoardStateRow["status"], string> = {
  GATED_TODAY: "Held",
  SCORING_NOW: "Scoring",
  PUBLISHED_TODAY: "Cleared",
};

/** One best captured price: side label, the price at stat size, the book. */
function LineCell({ label, price }: { label: string; price: BestPrice | null }) {
  if (!price) return null;
  return (
    <div className="min-w-0">
      <dt className={PICK_TYPE.label}>{label}</dt>
      <dd className={`mt-1.5 text-ion-white ${PICK_TYPE.value}`}>
        {fmtPrice(price.price)}
        {price.line !== undefined && (
          <span className="ml-1.5 text-base text-ion-1">({price.line > 0 ? `+${price.line}` : price.line})</span>
        )}
      </dd>
      <dd className={`mt-1.5 truncate ${PICK_TYPE.meta}`}>{price.bookmaker}</dd>
    </div>
  );
}

function LineGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-mineral bg-eclipse p-5">
      <p className={`${PICK_TYPE.meta} text-ion-1`}>{title}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4">{children}</dl>
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
                Edge is a strength score, not a win chance. Held readings show their reason.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h2 className={`mt-14 ${PICK_TYPE.meta}`}>
                Best captured lines
                {detail.best?.freshestFetchedAt
                  ? ` · as of ${new Date(detail.best.freshestFetchedAt).toLocaleString("en-US", { timeZone: CENTRAL_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}`
                  : ""}
              </h2>
              {detail.best ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <LineGroup title="Moneyline">
                    <LineCell label="Home" price={detail.best.moneyline.home} />
                    <LineCell label="Away" price={detail.best.moneyline.away} />
                  </LineGroup>
                  <LineGroup title="Spread">
                    <LineCell label="Home" price={detail.best.spread.home} />
                    <LineCell label="Away" price={detail.best.spread.away} />
                  </LineGroup>
                  <LineGroup title="Total">
                    <LineCell label="Over" price={detail.best.total.over} />
                    <LineCell label="Under" price={detail.best.total.under} />
                  </LineGroup>
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ion-2">
                  Lines show here once at least two books quote this game.
                </p>
              )}
            </Reveal>

            <Reveal delay={120}>
              <h2 className={`mt-14 ${PICK_TYPE.meta}`}>
                Our readings · {game?.readings.length ?? 0}
              </h2>
              {!game || game.readings.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-ion-2">
                  No readings posted for this game.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-mineral border-y border-mineral">
                  {game.readings.map((r) => {
                    const held = r.status === "GATED_TODAY";
                    // Premium viewers get the selection here; everyone else gets the
                    // loader's redaction sentinel, which boardMarketLabel turns into
                    // "" so nothing is printed rather than a token or a guess.
                    const market = boardMarketLabel(r.market);
                    return (
                      <li
                        key={r.id}
                        className="grid gap-5 py-6 sm:grid-cols-[1fr_minmax(0,18rem)] sm:items-start sm:gap-10"
                      >
                        <div className="min-w-0">
                          <p className={PICK_TYPE.meta}>{STATUS_LABEL[r.status]}</p>
                          {market && (
                            <p className={`mt-1.5 break-words ${PICK_TYPE.pick} ${held ? "text-ion-3" : "text-ion-white"}`}>
                              {market}
                            </p>
                          )}
                          <p className="mt-2 text-sm leading-6 text-ion-1">
                            {r.gateReason ? (
                              <>
                                <span className="font-semibold text-plasma">Held. </span>
                                {r.gateReason}
                              </>
                            ) : (
                              "Posted with its Analysis attached."
                            )}
                          </p>
                        </div>
                        <PickStatRow>
                          <PickStat
                            label="Edge"
                            tone={held ? "muted" : r.status === "PUBLISHED_TODAY" ? "accent" : "default"}
                          >
                            {r.edgeIndex ?? "—"}
                          </PickStat>
                          <PickStat label="Confidence" tone={held ? "muted" : "default"}>
                            {typeof r.confidence === "number" ? `${r.confidence}/100` : "—"}
                          </PickStat>
                        </PickStatRow>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
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
