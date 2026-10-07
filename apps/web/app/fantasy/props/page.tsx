import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { PropsEdge } from "@/components/fantasy/props-edge";
import { PickemRanker } from "@/components/fantasy/pickem-ranker";
import { PROPS, PROPS_DISCLAIMER } from "@/lib/fantasy/props";
import { activePickemLines, isLivePickem } from "@/lib/integrations/pickem";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Edge · Our number vs their line",
  description:
    "Where our model disagrees with the posted Underdog / DK Pick6 line. Every prop shows the side, the conviction, and the most valuable alt line. Build a Power-Play entry and see its true odds and EV before you stake a dollar.",
  alternates: { canonical: "/fantasy/props" },
  robots: { index: false, follow: true },
};

export default async function PropsPage() {
  const viewer = await getViewerEntitlements();
  // Server-side paywall enforcement (CLAUDE.md rule 3). The gate is evaluated BEFORE
  // `activePickemLines()` is ever called, not after: the live provider is a LICENSED,
  // metered third-party feed, so calling it for an unentitled visitor would spend the
  // licence on a request whose result we then throw away (denial-of-wallet — the same
  // reasoning written out in app/api/dfs/salaries/route.ts). An unentitled viewer
  // therefore never triggers the provider at all; they get the illustrative slate.
  const live = viewer.canUseFantasyFull && isLivePickem();
  const lines = live ? activePickemLines() : PROPS;
  // The note must describe the slate ACTUALLY served, per branch — never the feed's
  // global status. Claiming a live feed to a viewer holding illustrative lines is a
  // false data-provenance claim.
  const note = live ? `${PROPS_DISCLAIMER} Lines: LIVE feed connected.` : PROPS_DISCLAIMER;
  return (
    <FantasyShell
      eyebrow="Pick'em Edge"
      accent="ultraviolet"
      title={<>Their line. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>Our number</span>. Your edge.</>}
      intro="Filter by market or team. Every prop shows the side we'd take, how strongly, and the single alt line where edge times payout pays best. Build a 2-to-6 leg entry and see its real combined odds and expected value before you stake a dollar. We advise on these lines; we don't operate a pick'em product."
      note={note}
      wide
      // The illustrative badge was suppressed on the ONE page that most needs
      // it. Every prop row here is a fictional player (lib/fantasy/players.ts:
      // "~40 illustrative players") on a real team code, carrying a conviction
      // percentage and an EV figure in the same visual language the real board
      // uses. The only honesty text was PROPS_DISCLAIMER, rendered 11px mist
      // grey below the fold. FantasyShell already defaults the badge ON with
      // pool "illustrative"; letting the default stand puts the claim in the
      // hero where a visitor actually reads it.
      projectionsPool={isLivePickem() ? "real" : "illustrative"}
    >
      <PropsEdge lines={lines} live={isLivePickem()} />

      <section aria-label="Ranked board" className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ultraviolet">The ranked board</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
          Every line, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>strongest edge first.</span>
        </h2>
        <div className="mt-4">
          <PickemRanker lines={lines} live={isLivePickem()} />
        </div>
      </section>
    </FantasyShell>
  );
}
