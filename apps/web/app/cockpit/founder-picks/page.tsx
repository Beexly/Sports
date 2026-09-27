import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@sports/db";
import { loadFounderPickRecord } from "@/lib/founder-picks/record";
import type { FounderPickRecord } from "@/lib/founder-picks/types";
import {
  FounderPicksForm,
  type FounderPickGame,
} from "@/components/cockpit/founder-picks-form";

/**
 * /cockpit/founder-picks — the owner's own board, and the form to write it.
 *
 * WHY THIS PAGE IS NEW. The founder-picks write path (`POST
 * /api/admin/founder-picks`) and the public read page (`/founder-picks`) both
 * shipped earlier, but there was NO entry form anywhere and no nav link in
 * either the public nav or the cockpit sidebar — the feature was reachable only
 * by hand-writing JSON against the route. The founder asked for a place to give
 * input and analysis on picks; this is it.
 *
 * Deliberately placed under /cockpit rather than as a public page:
 *   - the cockpit layout already gates on `auth()` and re-checks the operator
 *     allow-list, so entry is admin-only without new auth code;
 *   - the RECORD stays public and honest at /founder-picks — the win rate is the
 *     founder's accountable number and hiding it behind login would be the wrong
 *     instinct. This page is the private half; that one is the public half.
 *
 * Read-only apart from the form's own POST, which the existing admin route
 * re-authorizes and re-validates server-side. This page adds no write path.
 */

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** How far ahead the game picker looks. Beyond this the form is a calendar. */
const HORIZON_HOURS = 36;

export default async function CockpitFounderPicksPage() {
  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_HOURS * 60 * 60 * 1000);

  // Defensive: a DB failure renders an empty picker and an empty record rather
  // than a 500 — an operator page that is down is worse than one that is honest
  // about having nothing to show.
  let games: FounderPickGame[] = [];
  // Type the fallback explicitly: an inline `picks: []` infers `never[]`, which
  // makes every property access below a compile error and forces a cast.
  let record: FounderPickRecord = {
    wins: 0,
    losses: 0,
    pushes: 0,
    pending: 0,
    decided: 0,
    winRatePct: null,
    picks: [],
  };
  try {
    const rows = await db.game.findMany({
      where: {
        commenceTime: { gte: now, lte: horizon },
        mergedIntoGameId: null,
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        commenceTime: true,
        sport: { select: { name: true } },
      },
      orderBy: { commenceTime: "asc" },
      take: 40,
    });
    games = rows.map((g) => ({
      id: g.id,
      label: `${g.awayTeamName} @ ${g.homeTeamName}`,
      commenceTime: g.commenceTime.toISOString().slice(0, 16).replace("T", " "),
    }));
  } catch {
    games = [];
  }

  try {
    record = await loadFounderPickRecord(25);
  } catch {
    // Leave the zeroed record: absence is silence, never a fabricated number.
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-3">
          Founder picks
        </p>
        <h1 className="mt-2 font-display text-2xl text-ion-white">
          Your call, on the record
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ion-1">
          Entered by you, not the model. Sealed at publish and graded by the same
          settlement path as every engine pick. No auto-generation, no invented
          confidence, no silent edits.{" "}
          <Link href="/founder-picks" className="text-orbital-cyan underline">
            See the public record
          </Link>
          .
        </p>
      </header>

      <section aria-labelledby="enter-heading">
        <h2 id="enter-heading" className="font-display text-lg text-ion-white">
          Enter a call
        </h2>
        <div className="mt-3">
          <FounderPicksForm games={games} />
        </div>
      </section>

      <section aria-labelledby="record-heading">
        <h2 id="record-heading" className="font-display text-lg text-ion-white">
          Your record
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ["Record", `${record.wins}-${record.losses}`],
              ["Win rate", record.winRatePct === null ? "—" : `${record.winRatePct}%`],
              ["Decided", String(record.decided)],
              ["Pending", String(record.pending)],
              ["Pushes", String(record.pushes)],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="surface-card p-4">
              <p className="font-numerals text-[10px] uppercase tracking-[0.16em] text-ion-3">
                {label}
              </p>
              <p className="mt-1 font-display text-2xl text-ion-white">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ion-2">
          Win rate is decided picks only. Pushes count in the population, not the
          rate. Past performance does not guarantee future results.
        </p>

        {record.picks.length === 0 ? (
          <p className="mt-4 text-sm text-ion-2">
            No calls yet. The first one you record starts the record.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {record.picks.map((p) => (
              <li key={p.id} className="surface-card p-3">
                <p className="text-sm font-semibold text-ion-white">
                  {p.selection}
                  <span className="ml-2 text-xs font-normal text-ion-3">
                    {p.pickType} · conf {p.confidence} · {p.result}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-ion-1">{p.reasoning}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
