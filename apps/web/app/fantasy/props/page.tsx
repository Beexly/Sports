import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { PropsEdge } from "@/components/fantasy/props-edge";
import { PickemRanker } from "@/components/fantasy/pickem-ranker";
import { activePickemLines, isLivePickem } from "@/lib/integrations/pickem";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pick'em Edge · Our number vs their line",
  description:
    "Where our Projection disagrees with the posted Underdog / DK Pick6 line. Every prop shows the side, its hit chance, the Edge, and the most valuable alt line. Build a Power-Play entry and see the chance every leg hits and the value per $1.",
  alternates: { canonical: "/fantasy/props" },
  robots: { index: false, follow: true },
};

/**
 * Page-local footer copy. Carries the same two facts as PROPS_DISCLAIMER in
 * lib/fantasy/props.ts (advisory only; we operate no pick'em product; live
 * lines not yet connected) in the suite's customer vocabulary. The sample
 * state is marked by the Practice slate tag in the hero and on the board.
 */
const ADVISORY_NOTE = "We advise on third-party pick'em lines. We do not operate a pick'em product.";

export default function PropsPage() {
  const lines = activePickemLines();
  const note = isLivePickem()
    ? `${ADVISORY_NOTE} Lines: live feed connected.`
    : `Practice lines and sample projections, not live data. ${ADVISORY_NOTE} Live lines are coming soon.`;
  return (
    <FantasyShell
      eyebrow="Pick'em Edge"
      accent="ultraviolet"
      title="Props"
      intro="Their line. Our number. Your edge. Every prop shows our Projection, the side we would take with its hit chance, and the one alt line that pays best. Build a 2-to-6 leg entry and see its combined odds and value per $1 before you stake a dollar."
      note={note}
      wide
      // The illustrative badge was suppressed on the ONE page that most needs
      // it. Every prop row here is a fictional player (lib/fantasy/players.ts:
      // "~40 illustrative players") on a real team code, carrying a conviction
      // percentage and an EV figure in the same visual language the real board
      // uses. The only honesty text was PROPS_DISCLAIMER, rendered 11px mist
      // grey below the fold. FantasyShell already defaults the badge ON with
      // pool "illustrative"; letting the default stand puts the claim in the
      // hero where a visitor actually reads it.
      projectionsPool={isLivePickem() ? "real" : "illustrative"}
    >
      <PropsEdge lines={lines} live={isLivePickem()} />

      <section aria-label="Ranked board" className="mt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-ultraviolet">The ranked board</p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ion-white sm:text-3xl">
          Every line, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>strongest edge first.</span>
        </h2>
        <div className="mt-4">
          <PickemRanker lines={lines} live={isLivePickem()} />
        </div>
      </section>
    </FantasyShell>
  );
}
