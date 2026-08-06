import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { getCurrentContestWeek } from "@/lib/contests/week";
import { leaderboard } from "@/lib/contests/store";
import { ContestEntryForm } from "@/components/contests/contest-entry-form";
import { notFound } from "next/navigation";
import { isContestsPublic } from "@/lib/launch/public-surface-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contest Bay · Free Paper Board | Galaxy Sports Edge",
  description:
    "Free skill-only paper contest: pick the board, lock before kickoff, climb the accuracy leaderboard. No entry fee, no prize pool, no real money.",
  alternates: { canonical: "/fantasy/contests" },
};

export default async function ContestBayPage() {
  if (!isContestsPublic()) notFound();
  const week = getCurrentContestWeek();
  const board = await leaderboard(week.weekId);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow text-orbital-cyan">Contest Bay · free skill</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              {week.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">
              Pick home or away on every game. Lock before first kickoff. Climb a pure accuracy
              leaderboard. This is a completed free paper product — no entry fee, no prize pool,
              no wagering. Process practice with receipts.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-ion-2">
              <span className="rounded-full border border-mineral px-3 py-1">
                Status · {week.status}
              </span>
              <span className="rounded-full border border-mineral px-3 py-1">
                Locks · {new Date(week.locksAt).toLocaleString()}
              </span>
              <span className="rounded-full border border-mineral px-3 py-1">
                {week.games.length} games
              </span>
              <span className="rounded-full border border-mineral px-3 py-1">
                {board.length} entries
              </span>
            </div>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-2xl text-ion-white">This week's slate</h2>
              <ul className="mt-6 space-y-3">
                {week.games.map((g) => (
                  <li
                    key={g.gameId}
                    className="flex items-center justify-between border border-mineral bg-eclipse/50 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-ion-white">{g.label}</p>
                      <p className="text-xs text-ion-2">
                        Kickoff {new Date(g.kickoff).toLocaleString()}
                      </p>
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-ion-2">
                      {g.result ?? "open"}
                    </span>
                  </li>
                ))}
              </ul>

              <h2 className="mt-10 font-display text-2xl text-ion-white">Rules</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ion-1">
                {week.rules.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-display text-2xl text-ion-white">Enter this week</h2>
              {week.status === "open" ? (
                <div className="mt-6">
                  <ContestEntryForm week={week} />
                </div>
              ) : (
                <p className="mt-6 border border-mineral bg-eclipse/40 p-6 text-ion-1">
                  Entries are locked for this week. Browse the leaderboard and come back next open
                  window.
                </p>
              )}

              <h2 className="mt-12 font-display text-2xl text-ion-white">Leaderboard</h2>
              {board.length === 0 ? (
                <p className="mt-4 text-sm text-ion-2">No entries yet — be first.</p>
              ) : (
                <div className="mt-4 overflow-x-auto border border-mineral">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-eclipse text-ion-2">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Entered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.map((row) => (
                        <tr key={`${row.rank}-${row.displayName}`} className="border-t border-mineral/60">
                          <td className="px-3 py-2 font-mono text-ion-2">{row.rank}</td>
                          <td className="px-3 py-2 text-ion-white">{row.displayName}</td>
                          <td className="px-3 py-2 font-mono text-orbital-cyan">
                            {row.score === null
                              ? "—"
                              : `${row.correct}/${row.total}`}
                          </td>
                          <td className="px-3 py-2 text-xs text-ion-2">
                            {new Date(row.enteredAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto mt-14 max-w-3xl text-center text-sm text-ion-2">
            Prefer picks with reasoning attached?{" "}
            <Link href="/board" className="text-orbital-cyan underline-offset-4 hover:underline">
              Today's Board
            </Link>{" "}
            ·{" "}
            <Link href="/academy" className="text-orbital-cyan underline-offset-4 hover:underline">
              Academy
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
