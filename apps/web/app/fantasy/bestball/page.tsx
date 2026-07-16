import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { BestBallBoard } from "@/components/fantasy/bestball-board";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getLiveProjectionsMeta } from "@/lib/integrations/projections";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";
import { FANTASY_DATA_ATTRIBUTION, FANTASY_VALUE_BASIS_NOTE } from "@/lib/fantasy/attribution";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Best Ball · Galaxy Fantasy",
  description:
    "A glass-box best-ball draft board: roster ceiling and spike upside, QB-to-catcher stack correlation, bye fragility, and a next-pick recommender tuned for draft-only formats.",
  alternates: { canonical: "/fantasy/bestball" },
};

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time). The ISR
// caching conversion is a Phase-0 cost task that should convert the whole fantasy
// tool family together.
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (graded pool) needs headroom beyond the default

export default async function BestBallPage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement: a FREE viewer never receives the paid rows of the
  // live pool (CLAUDE.md rule 3) — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="Best Ball"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Draft for the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>spike</span>, build the stack.</>}
      intro="Best ball is won at the draft: no waivers, no start/sit: the optimal lineup is banked for you every week. So the engine grades what actually matters (weekly ceiling, QB-to-catcher correlation, and bye structure) and tells you what your roster needs next, and why."
      note={pool
        ? `Live graded pool: real players with model-derived values. ${FANTASY_VALUE_BASIS_NOTE} Ceiling, stack, and structure are computed from real grades.`
        : "Illustrative player universe: fictional players, illustrative projections. Ceiling, stack, and structure are computed live from this sample pool."}
      // Dynamic attribution: the provider composes its line from the sources
      // ACTUALLY joined this load (a day with failed FFC/Sleeper joins must not
      // over-credit). The static constant is only the fallback.
      attribution={pool ? getLiveProjectionsMeta().attribution ?? FANTASY_DATA_ATTRIBUTION : undefined}
      wide
    >
      <BestBallBoard pool={gatedPool} canUseFantasyFull={viewer.canUseFantasyFull} />
    </FantasyShell>
  );
}
