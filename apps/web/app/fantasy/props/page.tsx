import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { PropsEdge } from "@/components/fantasy/props-edge";
import { PROPS_DISCLAIMER } from "@/lib/fantasy/props";
import { activePickemLines, isLivePickem } from "@/lib/integrations/pickem";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Edge · Our number vs their line",
  description:
    "Where our model disagrees with the posted Underdog / DK Pick6 line. Every prop shows the side, the conviction, and the most valuable alt line. Build a Power-Play entry and see its true odds and EV before you stake a dollar.",
  alternates: { canonical: "/fantasy/props" },
  robots: { index: false, follow: true },
};

export default function PropsPage() {
  const lines = activePickemLines();
  const note = isLivePickem()
    ? `${PROPS_DISCLAIMER} Lines: LIVE feed connected.`
    : PROPS_DISCLAIMER;
  return (
    <FantasyShell
      eyebrow="Pick'em Edge"
      accent="ultraviolet"
      title={<>Their line. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>Our number</span>. Your edge.</>}
      intro="Filter by market or team. Every prop shows the side we'd take, how strongly, and the single alt line where edge times payout pays best. Build a 2-to-6 leg entry and see its real combined odds and expected value before you stake a dollar. We advise on these lines; we don't operate a pick'em product."
      note={note}
      wide
      projectionsBadge={false}
    >
      <PropsEdge lines={lines} />
    </FantasyShell>
  );
}
