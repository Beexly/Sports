import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { WaiverBoard } from "@/components/fantasy/waiver-board";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";

export const metadata: Metadata = {
  title: "Waiver & FAAB · Galaxy Fantasy",
  description:
    "Ranked waiver adds and FAAB bids that re-price to your remaining budget, each with the rationale, plus the weakest rostered players surfaced as drop candidates.",
  alternates: { canonical: "/fantasy/waivers" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const LIVE_NOTE =
  "Live graded pool: real players with model-derived projections. Targets, FAAB tiers, and drop candidates are computed from real grades.";

export default async function WaiversPage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE viewer never receives the
  // paid rows of the live pool — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="Waiver & FAAB"
      accent="cyan"
      title={<>Spend the budget where the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>upside</span> is.</>}
      intro="Targets ranked on ceiling, trend, usage, and scheme fit, tiered from Priority to Dart, with a FAAB bid that re-prices the moment you set your remaining budget. And the part most tools skip: who to drop, judged on the floor of your bench, not last week's points."
      note={pool ? LIVE_NOTE : ILLUSTRATIVE_NOTE}
      wide
    >
      <WaiverBoard pool={gatedPool} />
    </FantasyShell>
  );
}
