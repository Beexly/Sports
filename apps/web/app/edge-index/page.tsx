import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { buildEmbedSnippet } from "@/lib/embed/edge-index";
import { MODEL_VERSION } from "@sports/prediction-engine";

export const metadata: Metadata = {
  title: "Edge Index — Free Public Badge",
  description:
    "Galaxy Edge Index is a free public composite read on a game. Embed the badge anywhere — no auth, no confidence leak.",
  alternates: { canonical: "/edge-index" },
};

export const dynamic = "force-dynamic";

const EXAMPLE_ID = "example-game-id";

export default function EdgeIndexMarketingPage(): JSX.Element {
  const snippet = buildEmbedSnippet(EXAMPLE_ID);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-carbon">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-orbital-cyan">
            Free distribution
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            Edge Index
          </h1>
          <p className="mt-5 text-lg text-ion-1">
            A public, free composite score for a game. Media sites and partners can embed the badge
            with no API key. Confidence and factor trails stay paid — this badge never includes them.
          </p>

          <section className="mt-10 rounded-2xl border border-mineral bg-eclipse/60 p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
              Laws
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-ion-1">
              <li>Free for every visitor and every iframe host</li>
              <li>Edge Index only — never confidence or pre-mortem factors</li>
              <li>Honest empty when bootstrap-gated or game missing</li>
              <li>Always branded with link to galaxysportsedge.com</li>
              <li>Model version stamped ({MODEL_VERSION})</li>
            </ul>
          </section>

          <section className="mt-8 rounded-2xl border border-mineral bg-eclipse/60 p-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ion-2">
              Embed
            </h2>
            <p className="mt-3 text-sm text-ion-1">
              Replace <code className="font-mono text-orbital-cyan">{EXAMPLE_ID}</code> with a real
              game id from the board or game room URL.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-mineral bg-obsidian p-4 font-mono text-[11px] leading-relaxed text-ion-1">
              {snippet}
            </pre>
            <p className="mt-4 text-sm text-ion-2">
              Route:{" "}
              <code className="font-mono text-ion-1">/embed/edge-index/[gameId]</code>
            </p>
          </section>

          <p className="mt-8 text-sm text-ion-2">
            See also{" "}
            <Link href="/board" className="text-orbital-cyan hover:text-ion-white">
              Today's Board
            </Link>{" "}
            and{" "}
            <Link href="/methodology" className="text-orbital-cyan hover:text-ion-white">
              Methodology
            </Link>
            .
          </p>
        </div>
      </main>
      <RiskDisclosure />
      <Footer />
    </div>
  );
}
