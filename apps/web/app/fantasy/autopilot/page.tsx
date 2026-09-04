import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { GmAutopilot } from "@/components/fantasy/gm-autopilot";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";
import { poolForViewer } from "@/lib/fantasy/free-trial";

// Render per-request so the founder-gated live-projections status is reflected at
// runtime (the provider is registered at server startup, not build time).
export const dynamic = "force-dynamic";
export const maxDuration = 60; // heavy nflverse load (pbp / graded pool) needs headroom beyond the default

const EXECUTION_NOTE =
  "The Autopilot proposes and records; executing on a real ESPN/Yahoo/Sleeper account is gated behind your explicit consent, OAuth, and compliance review; there are no autonomous account actions or payments.";
const LIVE_NOTE =
  `Live graded pool: proposals are computed from real players and model-derived projections (the roster shown is a labelled sample drawn from that pool — no league connection yet). ${EXECUTION_NOTE}`;

export const metadata: Metadata = {
  title: "GM Autopilot · Galaxy Fantasy",
  description:
    "A delegation dial from waiver suggestions to a fully remote GM, where every autonomous move is explained before it happens, committed to your tamper-evident GM Ledger, reversible, and teaches you. Sync ESPN, Yahoo, and Sleeper.",
  alternates: { canonical: "/fantasy/autopilot" },
};

export default async function AutopilotPage() {
  const [pool, viewer] = await Promise.all([resolveToolPoolAsync(), getViewerEntitlements()]);
  // Server-side paywall enforcement (CLAUDE.md rule 3): a FREE/anon viewer never
  // receives the paid rows of the live pool — only the trial subset crosses to the client.
  const gatedPool = poolForViewer(pool, viewer.canUseFantasyFull);
  return (
    <FantasyShell
      eyebrow="GM Autopilot · First of its kind"
      accent="cyan"
      title={<>Delegate as much as you <span className="gse-editorial" style={{ fontSize: "1.08em" }}>trust</span>.</>}
      intro="Sync your leagues and choose your level, from pure advisor to a fully remote GM that runs the team to your strategy. The difference from every other tool and every concierge service: nothing happens in the dark. Every move is explained before it's made, committed to your tamper-evident GM Ledger and graded on process, fully reversible where it can be. And it teaches you, so your GM IQ climbs even when the engine is driving. Control and proof, not one or the other."
      // The note must describe the pool ACTUALLY served: "Illustrative." is false
      // when proposals are computed off real graded players.
      note={gatedPool ? LIVE_NOTE : `Illustrative. ${EXECUTION_NOTE}`}
      wide
    >
      <GmAutopilot pool={gatedPool} />
    </FantasyShell>
  );
}
