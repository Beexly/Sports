import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { WaiverBoard } from "@/components/fantasy/waiver-board";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Waiver & FAAB — Galaxy Fantasy",
  description:
    "Ranked waiver adds and FAAB bids that re-price to your remaining budget — each with the rationale — plus the weakest rostered players surfaced as drop candidates.",
  alternates: { canonical: "/fantasy/waivers" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";

const LIVE_NOTE =
  "Live graded pool — real nflverse players with model-derived projections. Targets, FAAB tiers, and drop candidates are computed from real grades.";

export default async function WaiversPage() {
  const pool = await resolveToolPoolAsync();
  return (
    <FantasyShell
      eyebrow="Waiver & FAAB"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Spend the budget where the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>upside</span> is.</>}
      intro="Targets ranked on ceiling, trend, usage, and scheme fit — tiered from Priority to Dart — with a FAAB bid that re-prices the moment you set your remaining budget. And the part most tools skip: who to drop, judged on the floor of your bench, not last week's points."
      note={pool ? LIVE_NOTE : ILLUSTRATIVE_NOTE}
      wide
    >
      <WaiverBoard pool={pool} />
    </FantasyShell>
  );
}
