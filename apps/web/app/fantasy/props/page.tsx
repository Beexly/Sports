import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { PropsEdge } from "@/components/fantasy/props-edge";
import { PROPS_DISCLAIMER } from "@/lib/fantasy/props";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Pick'em Edge — Galaxy Fantasy",
  description:
    "An edge advisor on Underdog / DK Pick6-style lines: where our model disagrees with the posted line, the conviction behind every call, the most valuable alt line, and the true odds and EV of any Power-Play entry.",
  alternates: { canonical: "/fantasy/props" },
};

export default function PropsPage() {
  return (
    <FantasyShell
      eyebrow="Pick'em Edge"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Their line. <span className="gse-editorial" style={{ fontSize: "1.08em" }}>Our number</span>. Your edge.</>}
      intro="We read the lines Underdog, DK Pick6, and PrizePicks post — and tell you where our model disagrees. Every prop shows the side, the conviction, and the single most valuable alt line: the line and multiplier where edge × payout pays best. Build a Power-Play entry and see its real combined odds and expected value before you stake a dollar. We advise on these lines; we don't operate a pick'em product."
      note={PROPS_DISCLAIMER}
      wide
    >
      <PropsEdge />
    </FantasyShell>
  );
}
