import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SealedTable } from "@/components/week8/sealed-table";
import { CardStaleNotice } from "@/components/week8/card-stale-notice";
import { cardFreshness } from "@/lib/week8/card-freshness";
import { loadActiveSealedSlate, type LoadedSealedSlate } from "@/lib/slate/sealed-slate-store";
import { PUBLIC_RECORD_COUNTS, PUBLIC_RECORD_LINE } from "@/lib/ledger/public-record";

export const revalidate = 60;

const BOUNDED_CACHE_MAX_ENTRIES = 8;
const PROPS_CACHE_TTL_MS = 60_000;
const boundedPropsSlateCache = new Map<
  string,
  { expiresAt: number; payload: LoadedSealedSlate }
>();

async function loadPropsSlateCached(): Promise<LoadedSealedSlate> {
  const now = Date.now();
  const cached = boundedPropsSlateCache.get("active");
  if (cached && cached.expiresAt > now) {
    return cached.payload;
  }

  const [freshPayload] = await Promise.all([loadActiveSealedSlate()]);
  if (boundedPropsSlateCache.size >= BOUNDED_CACHE_MAX_ENTRIES) {
    const oldestKey = boundedPropsSlateCache.keys().next().value;
    if (oldestKey !== undefined) {
      boundedPropsSlateCache.delete(oldestKey);
    }
  }
  boundedPropsSlateCache.set("active", {
    expiresAt: now + PROPS_CACHE_TTL_MS,
    payload: freshPayload,
  });
  return freshPayload;
}

export const metadata: Metadata = {
  title: { absolute: "NFL Player Props | Galaxy Sports Edge" },
  description: `Official settled record ${PUBLIC_RECORD_COUNTS}, recomputed from the settlement database. Sealed player props and the 360-degree watchlist from the active slate.`,
};

export default async function PropsPage(): Promise<JSX.Element> {
  const [{ board: card, policyAdmitted }] = await Promise.all([loadPropsSlateCached()]);
  const eligibleProps = policyAdmitted
    ? card.props.filter((row) => row.publishAllowed && row.decision === "PUBLISH")
    : [];
  const freeProps = eligibleProps.slice(0, 2);
  const lockedPlaceholders = eligibleProps.slice(2).map((row) => ({
    matchup: row.matchup,
    confidence_display: row.confidence_display ?? "Sealed",
  }));
  const watch = [
    ...(card.watch?.one_q ?? []),
    ...(card.watch?.kicking ?? []),
    ...(card.watch?.idp ?? []),
    ...(card.watch?.atd ?? []),
  ].filter((row) => row.decision === "ABSTAIN" && row.publishAllowed === false);
  const fresh = cardFreshness(card.generated_at);

  if (fresh.stale) {
    return (
      <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
        <Nav />
        <main id="main-content" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">Sealed props</p>
          <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">Props withheld</h1>
          <div className="mt-10">
            <CardStaleNotice ageDays={fresh.ageDays} generatedAt={fresh.generatedAt} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <p className="text-xs uppercase tracking-[0.16em] text-[#FF4D2E]">{PUBLIC_RECORD_LINE}</p>
        <h1 className="mt-3 font-display text-5xl uppercase sm:text-7xl">Sealed props</h1>
        <div className="mt-10">
          {freeProps.length > 0 ? (
            <SealedTable rows={freeProps} lockedPlaceholders={lockedPlaceholders} />
          ) : (
            <p className="border-y border-[#31353F] py-6 text-sm text-[#C4BFB6]">
              No standalone player prop cleared our public release gate for the active primetime window. Pass discipline holds bankroll; paid member props remain sealed behind /packages, and watchlist triggers and passed markets are shown below.
            </p>
          )}
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">360-degree watchlist</h2>
        <p className="mt-3 max-w-2xl text-[#C4BFB6]">
          Bet only at or better than the trigger. These are monitored watchlist candidates, not released official plays.
        </p>
        <div className="mt-6">
          <SealedTable rows={watch} watch />
        </div>
        <h2 className="mt-16 font-display text-4xl uppercase">Pass - do not bet</h2>
        <div className="mt-6">
          <SealedTable rows={card.passes} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
