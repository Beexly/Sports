import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { auth } from "@/lib/auth";
import { getUserEntitlements } from "@/lib/entitlements";
import { loadDoctrineBoard } from "@/lib/board/doctrine-loader";
import { DoctrineBoardView } from "@/components/board/doctrine-board";
import {
  formatUnits,
  formatWlp,
  verifiedLedger,
} from "@/lib/ledger/verified-ledger-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Official NFL Picks | Galaxy Sports Edge",
  description:
    "Official plays with confidence out of 100, transparent passes with reasons, and a verified record recomputed from the settlement database. No hardcoded win rates.",
  alternates: { canonical: "/picks" },
};

export default async function PicksPage(): Promise<JSX.Element> {
  let viewerEntitlements: Awaited<ReturnType<typeof getUserEntitlements>> | undefined;
  try {
    const session = await auth();
    if (session?.user?.id) {
      viewerEntitlements = await getUserEntitlements(session.user.id);
    }
  } catch {
    viewerEntitlements = undefined;
  }

  const board = await loadDoctrineBoard(viewerEntitlements);
  const ledger = verifiedLedger;
  const gate = ledger.official.gate;

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <p className="eyebrow">Official plays · verified record</p>
        <h1 className="mt-4 font-display text-5xl uppercase tracking-tight sm:text-6xl">
          The Picks
        </h1>

        {/* Verified record strip - every number from the recomputed artifact */}
        <section className="mt-8 surface-card p-6" data-testid="verified-record-strip">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
                Official settled record · recomputed from the database
              </div>
              <div className="mt-1 font-display text-3xl text-emerald-300">
                {formatWlp(ledger.official.wlp)}{" "}
                <span className="text-xl text-ion-1">{formatUnits(ledger.official.units.total)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
                Calibration progress
              </div>
              <div className="mt-1 font-display text-3xl text-ion-white">
                {gate.clvBackedSettled}/{gate.target}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ion-2">
            No win-rate percentage is published until {gate.target} official plays are settled and
            graded against the closing line. The full ledger, commitment hashes and the
            verification script live at /record.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/record" className="btn btn-ghost">
              Verify the record
            </Link>
            <Link href="/calibration" className="btn btn-ghost">
              Calibration progress
            </Link>
          </div>
        </section>

        {/* Today's two-doctrines board */}
        <div className="mt-10">
          <DoctrineBoardView board={board} />
        </div>

        <section className="mt-10 flex flex-wrap gap-3">
          <Link href="/packages" className="btn btn-primary">
            Plans and packs
          </Link>
          <Link href="/props" className="btn btn-ghost">
            Props and watchlist
          </Link>
          <Link href="/board" className="btn btn-ghost">
            The full board
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
}