import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { loadBoardState } from "@/lib/board/state";
import { groupGame } from "@/lib/slate/slate";
import { loadGamesMeta } from "@/lib/games/game-detail";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { sport: string } }): Metadata {
  const league = SUPPORTED_SPORTS.find((s) => s.name.toLowerCase() === params.sport.toLowerCase());
  return {
    title: league ? `${league.displayName} slate` : "League slate",
    description: league
      ? `Today's ${league.displayName} games with our readings, cleared and held.`
      : "League slate.",
  };
}

function kickLabel(commenceTime: string | null): string {
  if (!commenceTime) return "Kickoff unlisted";
  const d = new Date(commenceTime);
  if (Number.isNaN(d.getTime())) return "Kickoff unlisted";
  return d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export default async function LeagueSlatePage({
  params,
}: {
  params: { sport: string };
}): Promise<JSX.Element> {
  const league = SUPPORTED_SPORTS.find(
    (s) => s.name.toLowerCase() === params.sport.toLowerCase(),
  );
  if (!league) notFound();

  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;
  const stateResult = await loadBoardState(new Date(), viewerEntitlements);
  const state = stateResult.data;
  const dbUnreachable = stateResult.meta.dataError === "DB_UNREACHABLE";

  const allRows = [...state.scoringNow, ...state.publishedToday, ...state.gatedTodayRows];
  const mine = allRows.filter((r) => r.sport === league!.name);
  const byGame = new Map<string, typeof mine>();
  for (const row of mine) {
    const list = byGame.get(row.gameId) ?? [];
    list.push(row);
    byGame.set(row.gameId, list);
  }
  const games = [...byGame.entries()]
    .map(([id, rows]) => groupGame(id, rows))
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => (b.bestEdge ?? -1) - (a.bestEdge ?? -1));
  const meta = await loadGamesMeta(games.map((g) => g.gameId));

  return (
    <div className="relative min-h-screen w-full bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
            <Link href="/slate" className="link-underline mr-3 text-ion-2">
              Slate
            </Link>
            {league!.name}
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            {league!.displayName}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
            {games.length === 0
              ? "Nothing on the board for this league right now. That is the whole story; there is no hidden slate."
              : `${games.length} game${games.length === 1 ? "" : "s"} with readings. Held games show their reason. Open one for lines and the full reading.`}
          </p>
        </Reveal>

        {dbUnreachable ? (
          <p className="mt-10 border border-mineral bg-eclipse p-6 text-sm text-ion-1">
            Slate data is temporarily unavailable. No games are hidden; the board
            cannot be read right now.
          </p>
        ) : (
          <div className="mt-12 overflow-hidden border border-mineral">
            {games.map((game, i) => {
              const m = meta.get(game.gameId);
              return (
                <Reveal key={game.gameId} delay={Math.min(i, 8) * 40}>
                  <Link
                    href={`/games/${game.gameId}`}
                    className="group flex flex-col gap-2 border-b border-mineral bg-eclipse p-5 transition-colors last:border-b-0 hover:bg-carbon sm:flex-row sm:items-center sm:gap-6 sm:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl font-semibold tracking-tight text-ion-white">
                        {game.matchup}
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2 tabular-nums">
                        {kickLabel(m?.commenceTime ?? null)}
                        {m?.status && m.status !== "SCHEDULED" ? ` · ${m.status}` : ""}
                        {` · ${game.markets.join(" / ")}`}
                      </p>
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.12em] tabular-nums">
                      {game.bestEdge !== null ? (
                        <span className="text-plasma">edge {game.bestEdge}</span>
                      ) : game.heldCount > 0 ? (
                        <span className="text-caution">held · {game.heldCount}</span>
                      ) : (
                        <span className="text-ion-2">no edge posted</span>
                      )}
                    </p>
                    <span
                      aria-hidden
                      className="hidden font-mono text-sm text-ion-2 transition-all group-hover:translate-x-1 group-hover:text-ion-white sm:block"
                    >
                      →
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
