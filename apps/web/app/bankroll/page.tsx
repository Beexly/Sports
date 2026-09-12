import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { BankrollLedger } from "@/components/tracker/bankroll-ledger";

export const metadata: Metadata = {
  title: "Bankroll Ledger: Know Where the Bankroll Stands",
  description:
    "A local-first bankroll ledger: log settled results against a starting bankroll and watch the running total, peak, and drawdown. Educational record-keeping — past results do not predict future results.",
  alternates: { canonical: "/bankroll" },
};

export default function BankrollPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80"
            style={{ background: "radial-gradient(55% 80% at 50% 0%, rgba(95,217,163,0.10), transparent 70%)" }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-ion-1"><span className="live-dot" /> Bankroll ledger</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-5 max-w-3xl font-display text-balance text-ion-white" style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                Know where the bankroll <span className="gse-editorial" style={{ fontSize: "1.08em" }}>stands.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                One ledger for every settled result: the running total against your starting
                bankroll, the peak it reached, and how far it has drawn down since. A record
                of what happened — never a forecast of what happens next.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <p className="mt-5 max-w-2xl rounded-xl border border-mineral bg-eclipse/40 p-4 text-sm text-ion-1">
                <span className="font-semibold text-ion-white">On-device by design.</span> Every
                entry lives in your browser&apos;s local storage and never leaves your device.
                Pending entries wait on the tape without moving the count; only settled results
                move a single unit.
              </p>
            </Reveal>
          </div>
        </section>
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl space-y-8">
            <Reveal>
              <BankrollLedger />
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 text-xs leading-relaxed text-ion-2">
                A personal record keeper: no books, no money, no advice. Past results do not
                predict future results. Sizing the next stake? See the Kelly calculator on the{" "}
                <a href="/track" className="font-semibold text-orbital-cyan hover:text-ion-white">CLV tracker</a>,
                or learn how closing lines grade edge on our public{" "}
                <a href="/clv" className="font-semibold text-orbital-cyan hover:text-ion-white">CLV report</a>.
              </p>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
