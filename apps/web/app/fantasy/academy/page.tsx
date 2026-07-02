import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { GmAcademy } from "@/components/fantasy/gm-academy";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "GM Academy · Galaxy Fantasy",
  description:
    "Drills that train the process behind great roster decisions, bias by bias, graded on the quality of your reasoning, building a GM IQ that rewards how you decide, not how the week broke.",
  alternates: { canonical: "/fantasy/academy" },
};

export default function GmAcademyPage() {
  return (
    <FantasyShell
      eyebrow="GM Academy"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Train the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>process</span>.</>}
      intro="The GM Ledger grades your real decisions on process. The Academy is where you build that process: drill by drill, bias by bias: process over outcome, FAAB discipline, recency bias, bye planning, calibration, injury hedging. Each answer is graded on the reasoning, not the result, and your GM IQ rewards how you think."
      note="Illustrative training scenarios. Your GM IQ rewards sound process over lucky guesses, the same standard the GM Ledger holds your real decisions to."
      projectionsBadge={false}
    >
      <GmAcademy />
    </FantasyShell>
  );
}
