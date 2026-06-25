import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { runProductIntelligenceLoop, settledTrapCard, settledUnluckyCard } from "@sports/decision-factory";

export const metadata: Metadata = {
  title: "What we learned",
  description: "The traps we're avoiding and the losses we didn't overreact to. A lab notebook, not a highlight reel.",
};

/**
 * "What we learned" — the public face of the learning loop + process-over-outcome discipline. A settled
 * trap becomes a remembered pattern that suppresses its twin next time; a sound call that loses to
 * variance teaches NOTHING (one week never moves a weight). Loop fixtures; clearly illustrative.
 * (Internal names — scar ledger, ghost, conscience — stay in code/admin/docs, never in public copy.)
 */

export default function MemoryPage() {
  const trap = runProductIntelligenceLoop(settledTrapCard); // process_error → a ghost (a scar)
  const unlucky = runProductIntelligenceLoop(settledUnluckyCard); // unlucky_loss → no lesson

  return (
    <>
      <Nav />
      <main className="container flex flex-col gap-14 py-12">
        <header className="max-w-2xl">
          <p className="eyebrow">Proof · What we learned</p>
          <h1 className="mt-2 text-3xl font-semibold text-ion-white">We keep what fooled us.</h1>
          <p className="mt-3 text-ion-1">
            Most systems forget their mistakes. We keep them. When a call fails on a bad process, it becomes a pattern we
            actively avoid next time. When a sound call loses to variance, we change nothing — a single week never moves a
            weight. This is a lab notebook, not a highlight reel.
          </p>
          <p className="mt-2 text-xs text-ion-2">Illustrative preview — built from fixtures, not live results.</p>
        </header>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">Traps we&apos;re now avoiding</h2>
          <article className="surface-card flex flex-col gap-2 p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-plasma">Lesson logged</p>
            <h3 className="text-lg font-semibold text-ion-white">{settledTrapCard.subject}: a role-rise chase that didn&apos;t deserve confidence</h3>
            <p className="text-sm text-ion-1">
              The process was unsound and the result confirmed it ({trap.verdict.replace(/_/g, " ")}). We filed it as a
              pattern — so a card that resembles it next time is suppressed before it ever reaches you.
            </p>
          </article>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-ion-white">Losses we did <em>not</em> overreact to</h2>
          <article className="surface-card flex flex-col gap-2 p-5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--verify)]">Process held</p>
            <h3 className="text-lg font-semibold text-ion-white">{settledUnluckyCard.subject}: a sound call that lost to variance</h3>
            <p className="text-sm text-ion-1">
              The read was right and the loss was inside the normal range ({unlucky.verdict.replace(/_/g, " ")}). It taught
              us nothing, so we changed nothing. Overreacting to one week is how most systems fool themselves.
            </p>
          </article>
        </section>

        <p className="text-sm text-ion-2">
          See the rest of the record on the <Link href="/calibration" className="text-ion-blue hover:underline">track record</Link>.
        </p>
      </main>
    </>
  );
}
