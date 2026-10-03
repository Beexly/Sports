import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { loadBoardState } from "@/lib/board/state";
import { buildSlate } from "@/lib/slate/slate";
import { SUPPORTED_SPORTS } from "@sports/data-ingestion";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "League slates",
  description:
    "Every covered league on one slate. Open a league for its games, open a game for our readings.",
  alternates: { canonical: "/slate" },
};

export default async function SlatePage(): Promise<JSX.Element> {
  const session = await auth();
  const viewerEntitlements = session?.user?.id
    ? await getUserEntitlements(session.user.id)
    : undefined;
  const stateResult = await loadBoardState(new Date(), viewerEntitlements);
  const state = stateResult.data;
  const dbUnreachable = stateResult.meta.dataError === "DB_UNREACHABLE";

  const allRows = [...state.scoringNow, ...state.publishedToday, ...state.gatedTodayRows];
  const leagues = buildSlate(allRows);
  const bySport = new Map(leagues.map((l) => [l.sport, l]));

  return (
    <div className="relative min-h-screen w-full bg-carbon text-ion">
      <Nav />
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <Reveal>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-plasma">
            <span className="mr-3 text-ion-2">Slate</span>Leagues
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-ion-white sm:text-6xl">
            Pick a league. Open a game. See the reading.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-ion-1">
            Every league we track, with today&apos;s scored and held games. Leagues with
            nothing on the board say so plainly instead of showing an empty room.
          </p>
        </Reveal>

        {dbUnreachable ? (
          <p className="mt-10 border border-mineral bg-eclipse p-6 text-sm text-ion-1">
            Slate data is temporarily unavailable. No leagues are hidden; the board
            cannot be read right now.
          </p>
        ) : (
          <div className="mt-12 grid gap-px overflow-hidden border border-mineral bg-mineral sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTED_SPORTS.map((league, i) => {
              const slate = bySport.get(league.name);
              const games = slate?.games.length ?? 0;
              return (
                <Reveal key={league.key} delay={Math.min(i, 6) * 60} className="flex">
                  <Link
                    href={`/slate/${league.name.toLowerCase()}`}
                    className="group relative flex w-full flex-col gap-4 overflow-hidden bg-eclipse p-6 transition-colors duration-300 hover:bg-carbon"
                  >
                    <span
                      aria-hidden
                      className="ghost-numeral pointer-events-none absolute -bottom-3 right-3 select-none text-[5.5rem]"
                    >
                      {String(games).padStart(2, "0")}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ion-2">
                        {league.key}
                      </span>
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${games > 0 ? "bg-plasma" : "bg-mineral-hi"}`}
                      />
                    </div>
                    <p className="relative font-display text-[2rem] font-semibold leading-[1.02] tracking-tight text-ion-white">
                      {league.displayName}
                    </p>
                    <p className="relative flex-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ion-2 tabular-nums">
                      {games === 0
                        ? "No games on the board"
                        : `${games} game${games === 1 ? "" : "s"} · ${slate!.clearedCount} cleared · ${slate!.heldCount} held`}
                    </p>
                    <p className="relative flex items-center gap-1.5 border-t border-mineral/70 pt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ion-2 transition-colors group-hover:text-ion-white">
                      Open the slate
                      <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </p>
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
