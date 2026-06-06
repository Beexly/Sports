import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { GmLedgerView } from "@/components/fantasy/gm-ledger-view";
import { buildGmLedger, GM_LEDGER_DISCLAIMER } from "@/lib/fantasy/gm-ledger";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The GM Ledger — Galaxy Fantasy",
  description:
    "Every roster decision committed before the games to a tamper-evident Merkle record, then graded on process — not luck. A calibrated GM Rating that can't be cherry-picked after the fact.",
  alternates: { canonical: "/fantasy/gm-ledger" },
};

export default function GmLedgerPage() {
  const data = buildGmLedger();
  return (
    <FantasyShell
      eyebrow="The GM Ledger · First of its kind"
      accent={BRAND_COLORS.orbitalCyan}
      title={<>Graded on the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>decision</span>, not the dice.</>}
      intro="Every fantasy manager remembers the times they were right and forgets the times they got lucky. The GM Ledger commits each decision — and the reasoning behind it — to a real SHA-256 Merkle record before the games, then grades it on whether it was the right call given what was knowable. Good process that lost is rewarded; a lucky win isn't. The result is a GM Rating you earned, provably."
      note={GM_LEDGER_DISCLAIMER}
      wide
      projectionsBadge={false}
    >
      <GmLedgerView data={data} />
    </FantasyShell>
  );
}
