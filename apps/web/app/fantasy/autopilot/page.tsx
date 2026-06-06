import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { GmAutopilot } from "@/components/fantasy/gm-autopilot";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "GM Autopilot — Galaxy Fantasy",
  description:
    "A delegation dial from waiver suggestions to a fully remote GM — where every autonomous move is explained before it happens, committed to your tamper-evident GM Ledger, reversible, and teaches you. Sync ESPN, Yahoo, and Sleeper.",
  alternates: { canonical: "/fantasy/autopilot" },
};

export default function AutopilotPage() {
  return (
    <FantasyShell
      eyebrow="GM Autopilot · First of its kind"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Delegate as much as you <span className="gse-editorial" style={{ fontSize: "1.08em" }}>trust</span>.</>}
      intro="Sync your leagues and choose your level — from pure advisor to a fully remote GM that runs the team to your strategy. The difference from every other tool and every concierge service: nothing happens in the dark. Every move is explained before it's made, committed to your tamper-evident GM Ledger and graded on process, fully reversible where it can be — and it teaches you, so your GM IQ climbs even when the AI is driving. Control and proof, not one or the other."
      note="Illustrative. The Autopilot proposes and records; executing on a real ESPN/Yahoo/Sleeper account is gated behind your explicit consent, OAuth, and compliance review — there are no autonomous account actions or payments."
      wide
    >
      <GmAutopilot />
    </FantasyShell>
  );
}
