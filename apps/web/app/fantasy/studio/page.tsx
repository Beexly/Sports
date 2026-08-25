import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { StudioBrief } from "@/components/fantasy/studio-brief";
import { StudioHost } from "@/components/fantasy/studio-host";
import { generateWeeklyBrief } from "@/lib/fantasy/studio";
import { buildBroadcast } from "@/lib/fantasy/host";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const STUDIO_SCOPE =
  "Studios generates broadcast scripts and draft text only: no synthetic-likeness video, no autonomous posting, and it does not publish to any external channel.";
const LIVE_NOTE =
  `Live graded pool: the waiver, scheme, and roster-risk sections are computed from real players and model-derived projections (the roster is a labelled sample drawn from that pool). The DFS and pick'em sections remain illustrative. ${STUDIO_SCOPE}`;

export const metadata: Metadata = {
  title: "Galaxy Studios · Galaxy Fantasy",
  description:
    "The weekly Galaxy Brief, generated from the whole OS (waivers, scheme moves, roster risk, and the sharpest DFS and pick'em edges) as a production-ready draft for review. Never auto-published.",
  alternates: { canonical: "/fantasy/studio" },
};

export default async function StudioPage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE/anon viewer never
  // receives the paid rows of the live pool — only the trial subset reaches the brief.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  const brief = generateWeeklyBrief(gatedPool);
  const broadcast = buildBroadcast();
  return (
    <FantasyShell
      eyebrow="Galaxy Studios"
      accent="ultraviolet"
      title={<>The week, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>on air</span>.</>}
      intro="Galaxy Studios fronts the week with Nova, our brand presenter, reporting the edge from the field, the clubhouse, and the desk, then hands you the written Galaxy Brief beneath the broadcast. Studios reads every surface of the OS and turns it into a production-ready show and script. You review and publish; it never ships on its own, and every broadcast carries a clear synthetic-presenter disclosure."
      // The note must describe the pool ACTUALLY served. ILLUSTRATIVE_NOTE asserts
      // "fictional players … not live data" — affirmatively FALSE when the brief is
      // built from real graded players, so it may only print on the illustrative branch.
      note={gatedPool ? LIVE_NOTE : `${ILLUSTRATIVE_NOTE} ${STUDIO_SCOPE}`}
      wide
    >
      <div className="space-y-12">
        <StudioHost broadcast={broadcast} />
        <div>
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">The written brief</p>
          <StudioBrief brief={brief} />
        </div>
      </div>
    </FantasyShell>
  );
}
