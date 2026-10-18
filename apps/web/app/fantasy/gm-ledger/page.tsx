import type { Metadata } from "next";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { GmLedgerView } from "@/components/fantasy/gm-ledger-view";
import { buildGmLedger } from "@/lib/fantasy/gm-ledger";
import { PracticeSlateTag } from "@/components/fantasy/practice-slate-tag";

/**
 * Page-local footer copy: the same facts as GM_LEDGER_DISCLAIMER in
 * lib/fantasy/gm-ledger.ts (sample decisions; the commitment machinery is
 * computed live) in the suite's customer vocabulary, with the Practice slate
 * tag marking the sample history.
 */
const LEDGER_NOTE =
  "Sample decisions. The SHA-256 Merkle commitment, inclusion proof, accuracy check, and tamper detection are computed live; the decisions themselves are a demonstration.";

export const metadata: Metadata = {
  title: "The GM Ledger · Galaxy Fantasy",
  description:
    "Every roster decision committed before the games to a tamper-evident Merkle record, then graded on process, not luck. A GM Rating graded on your decisions that can't be cherry-picked after the fact.",
  alternates: { canonical: "/fantasy/gm-ledger" },
  robots: { index: false, follow: true },
};

export default function GmLedgerPage() {
  const data = buildGmLedger();
  return (
    <FantasyShell
      eyebrow="The GM Ledger · First of its kind"
      accent="cyan"
      title={<>Graded on the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>decision</span>, not the dice.</>}
      intro="Every fantasy manager remembers the times they were right and forgets the times they got lucky. The GM Ledger commits each decision, and the reasoning behind it, to a real SHA-256 Merkle record before the games, then grades it on whether it was the right call given what was knowable. Good process that lost is rewarded; a lucky win isn't. The result is a GM Rating you earned, provably."
      note={<><PracticeSlateTag /> {LEDGER_NOTE}</>}
      wide
      projectionsBadge={false}
    >
      <GmLedgerView data={data} />
    </FantasyShell>
  );
}
