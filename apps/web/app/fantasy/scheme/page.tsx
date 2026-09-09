import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { SchemeIntel } from "@/components/fantasy/scheme-intel";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";

export const metadata: Metadata = {
  title: "Scheme Intelligence · Galaxy Fantasy",
  description:
    "How one coaching or scheme change cascades through a whole offense: the gainers, the faders, the projection delta, the reasoning, and the confidence from the source's reliability tier.",
  alternates: { canonical: "/fantasy/scheme" },
};

export default function SchemePage() {
  return (
    <FantasyShell
      eyebrow="Scheme Intelligence"
      accent="cyan"
      title={<>One change. The whole <span className="gse-editorial" style={{ fontSize: "1.08em" }}>ripple</span>.</>}
      intro="A new coordinator doesn't move one player; it re-prices an entire offense. Pick a coaching or scheme change and see the full cascade: who gains, who fades, by how much, and why, weighted by how reliable the source is, on the same tiering The Beat uses for breaking news."
      note={`${ILLUSTRATIVE_NOTE} Scenarios are illustrative coaching changes; reliability tiers mirror The Beat.`}
      wide
      // CORRECTED (C-239, Devin). C-236 declared this live-dependent because a
      // client component IS server-rendered for the first paint, where
      // activePlayerPool() reads the live registry. True, and the wrong thing to
      // key the badge on: SchemeIntel recomputes applyScheme() on every scenario
      // change in the BROWSER, where the registry is empty and the pool falls
      // back to the fictional one. So the page shows real players for one paint
      // and illustrative players from hydration onward, under a badge still
      // reading "live" - a false claim for the entire time a customer is
      // actually using it.
      //
      // The page's own `note` is ILLUSTRATIVE_NOTE unconditionally, so declaring
      // "real" also put the badge in direct contradiction with the sentence
      // beside it: precisely the defect C-231 fixed on the tool pages, which I
      // reintroduced here in the opposite direction.
      //
      // What the customer interacts with is illustrative, so that is what this
      // says. Making scheme genuinely live is a different piece of work
      // (resolve on the server, gate it, pass the pool in) and a feature change
      // rather than a correction, so it is not smuggled in here.
      projectionsPool="illustrative"
    >
      <SchemeIntel />
    </FantasyShell>
  );
}
