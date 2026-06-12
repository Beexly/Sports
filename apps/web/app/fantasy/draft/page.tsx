import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { DraftAssistant } from "@/components/fantasy/draft-assistant";
import { DraftPageTabs } from "@/components/fantasy/draft-page-tabs";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { FANTASY_COACH } from "@/lib/fantasy/coach";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Draft Assistant — Galaxy Fantasy",
  description:
    "A glass-box draft board: VOR, tiers, best-available, and live pick recommendations with the reasoning — need, tier cliffs, value, and bye stacking. Includes a mock draft simulator.",
  alternates: { canonical: "/fantasy/draft" },
};

// Render per-request so the live-projections status is reflected at runtime.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function DraftPage() {
  const pool = await resolveToolPoolAsync();
  const note = pool
    ? "Live graded pool — real players with model-derived projections. Value over replacement, tiers, and recommendations are computed from real grades."
    : "Illustrative player universe — fictional players, illustrative projections. Value over replacement, tiers, and recommendations are computed live from this sample pool.";

  return (
    <FantasyShell
      eyebrow="Draft Assistant"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Draft the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>value</span>, not the name.</>}
      intro="Mark players off the board, get live recommendations, then take a mock draft for a full practice run."
      coach={FANTASY_COACH.draft}
      note={note}
      wide
    >
      <DraftPageTabs pool={pool} />
    </FantasyShell>
  );
}
