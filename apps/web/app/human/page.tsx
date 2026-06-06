import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { HumanPerformancePanel } from "@/components/human/human-performance-panel";

export const metadata: Metadata = {
  title: "Human Performance — Confidence, Not Claims",
  description:
    "A confidence-band layer that turns public human-performance signals — venue surface, weather, official injury designations — into better questions about uncertainty. It never claims a player's body, never trusts a video-game number, and only ever widens the band or moves a read to watchlist / no-bet.",
  alternates: { canonical: "/human" },
};

const RULES: readonly string[] = [
  "Never claims a player's medical state — only \"availability uncertain per public report.\"",
  "Only ever WIDENS uncertainty or downgrades to watchlist / no-bet. Never manufactures confidence.",
  "Public data only: official injury designations, public weather, public venue facts.",
  "Video-game ratings are priors (weight-capped ≤ 5%), never truth.",
  "Every signal carries a provenance tier; nothing licensed/admin-only is shown publicly.",
];

export default function HumanPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-ion">
      <Nav />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">Human Performance · Black Label</p>
          <h1 className="font-display text-3xl font-semibold leading-tight text-ion-white sm:text-4xl">
            Confidence, not claims.
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-ion-1">
            This layer makes the edge <em>more honest about uncertainty</em>, not more confident. It reads
            public human-performance signals — the venue&apos;s surface and roof, the game-day weather, the
            official injury designation — and turns them into a band that can only widen, plus a clear
            verdict: play, watchlist, or no-bet. It never asserts a body and never trusts a video-game rating.{" "}
            <Link href="/data" className="text-orbital-cyan hover:text-ion-white">How we source data</Link>.
          </p>
        </section>

        <section className="surface-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">The non-negotiables</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {RULES.map((r) => (
              <li key={r} className="flex gap-2 text-xs leading-5 text-ion-1">
                <span className="text-orbital-cyan">▸</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <HumanPerformancePanel />
      </main>
      <Footer />
    </div>
  );
}
