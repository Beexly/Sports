import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { PropsEdge } from "@/components/fantasy/props-edge";
import { PROPS, PROPS_DISCLAIMER } from "@/lib/fantasy/props";
import { activePickemLines, isLivePickem } from "@/lib/integrations/pickem";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Edge · Galaxy Fantasy",
  description:
    "An edge advisor on Underdog / DK Pick6-style lines: where our model disagrees with the posted line, the conviction behind every call, the most valuable alt line, and the true odds and EV of any Power-Play entry.",
  alternates: { canonical: "/fantasy/props" },
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
      intro="We read the lines Underdog, DK Pick6, and PrizePicks post, and tell you where our model disagrees. Every prop shows the side, the conviction, and the single most valuable alt line: the line and multiplier where edge × payout pays best. Build a Power-Play entry and see its real combined odds and expected value before you stake a dollar. We advise on these lines; we don't operate a pick'em product."
      note={note}
      wide
      projectionsBadge={false}
    >
      <PropsEdge lines={lines} />
    </FantasyShell>
  );
}
