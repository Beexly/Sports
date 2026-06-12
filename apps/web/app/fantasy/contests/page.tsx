import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { ContestSimulator } from "@/components/fantasy/contest-simulator";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contest Simulator — Galaxy Fantasy",
  description:
    "Monte Carlo GPP contest simulation: pick a lineup strategy, run 500+ simulations against a random field, and read your cash probability, win rate, finish distribution, and expected ROI — the analytics FTN charges for.",
  alternates: { canonical: "/fantasy/contests" },
};

export const dynamic = "force-dynamic";

export default function ContestSimPage() {
  return (
    <FantasyShell
      eyebrow="Contest Simulator"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Know your <span className="gse-editorial" style={{ fontSize: "1.08em" }}>edge</span> before you enter.</>}
      intro="Monte Carlo simulation against a random field: cash rate, win rate, finish distribution, and expected ROI — in your browser, no black box."
      note="Runs on the sample slate until you import a real DraftKings CSV in the optimizer. Strategy, format, and simulation count are all yours to control."
      wide
    >
      <ContestSimulator />
    </FantasyShell>
  );
}
