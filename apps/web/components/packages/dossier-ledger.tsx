import Link from "next/link";
import {
  formatWindowSlotLabel,
  sanitizePlainFootballText,
  type CoachGameWriteup,
} from "@/lib/writeups/coach-writeup-engine";

interface DossierLedgerProps {
  writeups: readonly CoachGameWriteup[];
  /** Quiet one-line entries after the featured matchup. */
  entries?: number;
  /** Where "Unlock official picks" points: the storefront, or the bands above. */
  unlockHref: string;
}

function lockedLine(w: CoachGameWriteup): string {
  const parts = ["Spread call", "Over/Under call"];
  if (w.topProps.length > 0) {
    parts.push(`${w.topProps.length} player prop ${w.topProps.length === 1 ? "read" : "reads"}`);
  }
  if (w.correlatedSgpTicket && w.correlatedSgpTicket.fairOdds !== "n/a") {
    parts.push(`${w.correlatedSgpTicket.legs.length}-leg parlay`);
  }
  return parts.join(" · ");
}

/**
 * DossierLedger — one featured matchup set large, then restrained entries.
 * Free storyline only; every call stays locked inside the packs.
 */
export function DossierLedger({ writeups, entries = 3, unlockHref }: DossierLedgerProps): JSX.Element {
  const [featured, ...rest] = writeups;

  if (!featured) {
    return (
      <div className="mt-12 border-t border-mineral pt-10" data-od-id="dossier-empty">
        <p className="rl-display text-4xl sm:text-5xl">No upcoming kickoffs on the board.</p>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-ion-1 sm:text-[17px]">
          Every game on this slate has kicked off. Dossiers return when the next slate is posted.
        </p>
      </div>
    );
  }

  const shown = rest.slice(0, entries);
  const remaining = rest.length - shown.length;

  return (
    <div className="mt-12">
      <article
        data-od-id="dossier-featured"
        className="grid gap-10 border-t border-mineral pt-10 lg:grid-cols-12 lg:gap-12 lg:pt-14"
      >
        <header className="lg:col-span-7">
          <p className="rl-eyebrow rl-figure">
            {formatWindowSlotLabel(featured.windowSlot, featured.matchup)}
          </p>
          <h3 className="rl-display mt-6 text-[length:clamp(2.75rem,8vw,6rem)]">
            <span className="block">{featured.awayTeam}</span>{" "}
            <span className="block">
              <span className="rl-eyebrow mr-4 align-middle">at</span> {featured.homeTeam}
            </span>
          </h3>
        </header>

        <div className="lg:col-span-5 lg:pt-12">
          <p className="text-base leading-relaxed text-ion-white sm:text-[17px]">
            {sanitizePlainFootballText(featured.schemeMatchup.coverageShell)}
          </p>
          <p className="mt-4 text-base leading-relaxed text-ion-1">
            {sanitizePlainFootballText(featured.paceOfPlay.notes)}
          </p>

          <dl className="mt-8 text-sm">
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-t border-mineral py-3">
              <dt className="rl-eyebrow">Free</dt>
              <dd className="leading-relaxed text-ion-1">This storyline and the full matchup preview</dd>
            </div>
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-y border-mineral py-3">
              <dt className="rl-eyebrow">Locked</dt>
              <dd className="rl-figure leading-relaxed text-ion-white">{lockedLine(featured)}</dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
            <Link href={`/games/${featured.gameId}`} className="rl-link">
              Read the matchup preview
            </Link>
            <Link href={unlockHref} className="rl-link">
              Unlock official picks
            </Link>
          </div>
        </div>
      </article>

      {shown.length > 0 && (
        <ol className="mt-16 border-t border-mineral" aria-label="More matchups">
          {shown.map((w) => (
            <li key={w.id} className="border-b border-mineral">
              <Link
                href={`/games/${w.gameId}`}
                data-od-id={`dossier-entry-${w.gameId}`}
                className="group grid gap-x-8 gap-y-2 py-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ion-white sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-baseline"
              >
                <span className="rl-eyebrow rl-figure">{formatWindowSlotLabel(w.windowSlot, w.matchup)}</span>
                <span className="rl-display text-2xl sm:text-3xl">{w.matchup}</span>
                <span className="text-sm font-semibold text-ion-1 underline decoration-ion-2 underline-offset-[6px] transition-colors group-hover:text-ion-white group-hover:decoration-plasma">
                  Read preview
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      {remaining > 0 && (
        <p className="rl-figure mt-6 text-sm text-ion-1">
          {remaining} more {remaining === 1 ? "matchup" : "matchups"} on this slate
        </p>
      )}
    </div>
  );
}
