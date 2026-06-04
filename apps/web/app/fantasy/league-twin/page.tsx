import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { LeagueTwinLazy } from "@/components/fantasy/league-twin-lazy";
import { ILLUSTRATIVE_NOTE } from "@/lib/fantasy/players";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The League Twin — Galaxy Fantasy",
  description:
    "Your roster as a navigable galaxy: players are star systems whose brightness, size, halo, and shocks encode projection, usage, volatility, byes, and injuries — and your stacks are orbital ties. Nobody renders a roster this way.",
  alternates: { canonical: "/fantasy/league-twin" },
};

export default function LeagueTwinPage() {
  return (
    <FantasyShell
      eyebrow="The League Twin · First of its kind"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Your roster, as a <span className="gse-editorial" style={{ fontSize: "1.08em" }}>galaxy</span>.</>}
      intro="Every fantasy app shows your roster as a list. The League Twin shows it as a living system: each player is a star whose brightness is its projection, size is its usage, halo is its volatility, and rings mark byes and injuries — while same-team stacks bind as orbital ties. See your whole team's shape at a glance: where the light is, where the risk pulses, and which week your byes eclipse you. Click any star to read its encoding."
      note={`${ILLUSTRATIVE_NOTE} The galaxy is decorative and aria-hidden; the roster manifest and inspector beside it are the accessible source of truth.`}
      wide
    >
      <LeagueTwinLazy />
    </FantasyShell>
  );
}
