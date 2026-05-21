import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SURFACES } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Vault — Every Published Pick, Reasoning Attached",
  description:
    "The published-pick archive opens once enough canonical results have settled. Methodology and gates are live now. No curated highlights, no scrubbed losses.",
  alternates: { canonical: "/vault" },
};

export default function VaultPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">{SURFACES.vault.label}</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              Every pick. Every reason. Every outcome.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ink-300">
              {SURFACES.vault.blurb} It is the receipt: every published pick,
              the factor trail behind it, and the final result when the game is
              settled.
            </p>

            <div className="mt-10 surface-card flex flex-col gap-3 p-6">
              <p className="eyebrow">Status: Collecting</p>
              <p className="text-sm leading-relaxed text-ink-300">
                The Vault opens once enough canonical picks have settled to
                render a calibrated record. I don&apos;t publish a Vault built on
                a handful of games — selective history is exactly what this
                product is built to avoid.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <Link href="/methodology" className="btn btn-primary">
                  How the calibration works
                </Link>
                <Link href="/performance" className="btn btn-ghost">
                  See the gate
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
