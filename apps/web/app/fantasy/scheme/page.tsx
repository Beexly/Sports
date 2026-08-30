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
    >
      <SchemeIntel />
    </FantasyShell>
  );
}
