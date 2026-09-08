import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { resolveToolPoolAsync } from "@/lib/integrations/projections-server";
import { StudioBrief } from "@/components/fantasy/studio-brief";
import { StudioHost } from "@/components/fantasy/studio-host";
import { generateWeeklyBrief } from "@/lib/fantasy/studio";
import { buildBroadcast } from "@/lib/fantasy/host";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";

export const metadata: Metadata = {
  title: "Galaxy Studios · Galaxy Fantasy",
  description:
    "The weekly Galaxy Brief, generated from the whole OS (waivers, scheme moves, roster risk, and the sharpest DFS and pick'em edges) as a production-ready draft for review. Never auto-published.",
  alternates: { canonical: "/fantasy/studio" },
};

/**
 * C-251, Devin. This page had no `dynamic` and a SYNCHRONOUS component, so Next
 * prerendered it at BUILD time: `generateWeeklyBrief()` ran against whatever
 * pool existed during the build, and the badge was baked from an
 * `isLiveProjections()` evaluated before the runtime registration that
 * instrumentation performs. Activating the provider could never change either
 * one, because the page never rendered again.
 *
 * Every sibling that can claim "real" already resolves at request time through
 * `resolveToolPoolAsync` (lineup, trade, waivers, draft, bestball). Studio was
 * the only one asking `isLiveProjections()` directly, and the only conditional
 * page missing `force-dynamic` and `async`. It now matches them.
 *
 * The badge is derived from the SAME resolution that precedes the generation,
 * rather than from a second independent call, so the claim and the content
 * cannot disagree.
 */
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  // Await BEFORE generating: generateWeeklyBrief and buildBroadcast read
  // activePlayerPool() transitively (through buildLeagueTwin, waiverTargets and
  // applyScheme), and the registry is process-global, so ensuring registration
  // first is what makes those defaults resolve live. Devin also proposed
  // threading the resolved pool through both helpers explicitly. That is a
  // signature change across the fantasy library and everything those two call
  // transitively - a refactor rather than a correction - so it is not smuggled
  // into a bug fix. `resolveToolPoolAsync` swallows a source error and falls
  // back to the illustrative pool, so an outage degrades the badge instead of
  // failing the render.
  const pool = await resolveToolPoolAsync();
  const brief = generateWeeklyBrief();
  const broadcast = buildBroadcast();
  return (
    <FantasyShell
      eyebrow="Galaxy Studios"
      accent="ultraviolet"
      title={<>The week, <span className="gse-editorial" style={{ fontSize: "1.08em" }}>on air</span>.</>}
      intro="Galaxy Studios fronts the week with Nova, our brand presenter, reporting the edge from the field, the clubhouse, and the desk, then hands you the written Galaxy Brief beneath the broadcast. Studios reads every surface of the OS and turns it into a production-ready show and script. You review and publish; it never ships on its own, and every broadcast carries a clear synthetic-presenter disclosure."
      note={`${ILLUSTRATIVE_NOTE} Studios generates broadcast scripts and draft text only: no synthetic-likeness video, no autonomous posting, and it does not publish to any external channel.`}
      wide
      // C-236 established that generateWeeklyBrief() is called in this server
      // component and reaches waiverTargets(), buildLeagueTwin() and
      // applyScheme(), all of which default to activePlayerPool(). That is
      // still true and it was not the whole story: C-251 found the component
      // was rendering at BUILD time, so the claim was frozen there.
      projectionsPool={pool ? "real" : "illustrative"}
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
