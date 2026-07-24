import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
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

export default function StudioPage() {
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
