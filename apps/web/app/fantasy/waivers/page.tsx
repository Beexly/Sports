import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { WaiverBoard } from "@/components/fantasy/waiver-board";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { FANTASY_COACH } from "@/lib/fantasy/coach";
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
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const LIVE_NOTE =
  "Live graded pool — real players with model-derived projections. Targets, FAAB tiers, and drop candidates are computed from real grades.";

export default async function WaiversPage() {
  const pool = await resolveToolPoolAsync();
  return (
    <FantasyShell
      eyebrow="Waiver & FAAB"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Spend the budget where the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>upside</span> is.</>}
      intro="The wire ranked on ceiling, usage, and scheme fit — with a FAAB bid sized to your budget and honest drop candidates."
      coach={FANTASY_COACH.waivers}
      note={pool ? LIVE_NOTE : ILLUSTRATIVE_NOTE}
      wide
    >
      <WaiverBoard pool={pool} />
    </FantasyShell>
  );
}
