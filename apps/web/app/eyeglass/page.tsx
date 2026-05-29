import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const metadata: Metadata = {
  title: "Galaxy Eyeglass — concept",
  description: "A future Galaxy companion: given any game URL, return Galaxy's read. Concept page only — not deployed.",
};

export default function EyeglassConceptPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-400">
            Concept · not deployed
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Galaxy Eyeglass
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            A future Galaxy companion: paste any game URL from a sportsbook, news site, or social post — get Galaxy&apos;s read on it.
            Evidence chain attached. Confidence band, edge index, decay trajectory, what-would-change-our-mind.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-amber-300/80">
            This is an architecture sketch, not a shipped feature. The contract below tells external partners what to expect.
          </p>
        </header>

        {/* ── Surface forms ──────────────────────────────────────────────── */}
        <section aria-label="Surface forms">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Surface forms
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">Three integration shapes.</h2>
          <ol className="mt-6 space-y-6">
            <Shape
              title="Browser extension"
              body="Adds a 'Read with Galaxy' button to bookmaker game pages. Click to open a side-panel with the model's read of the same game. The panel includes the verdict, the evidence chain, and the link to /room/[gameId]."
            />
            <Shape
              title="Share target"
              body="On mobile, Galaxy Eyeglass appears as a system share-target. Share a game URL from any app; Eyeglass responds with the read in-app or routes to /room/[gameId]."
            />
            <Shape
              title="Public API"
              body="Authenticated POST /api/eyeglass/read with { url } returns the same read structure. Available to partners under explicit ToS — never used to power black-box copy-paste services."
            />
          </ol>
        </section>

        {/* ── Contract ───────────────────────────────────────────────────── */}
        <section aria-label="Response contract" className="rounded-2xl border border-mineral bg-gray-900/55 p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">
            Response contract
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-carbon p-4 font-mono text-[11px] text-gray-300">
{`{
  "verdict": "publish" | "pass" | "watch",
  "edgeIndex": number | null,
  "confidence": number | null,
  "evidenceChain": [
    { "source": "galaxy-model" | "provider" | "aggregate", "freshness": "live"|"fresh"|"today"|"stale" }
  ],
  "failureCase": string,
  "decisionRoomHref": string,
  "modelVersion": string
}`}
          </pre>
          <p className="mt-3 text-xs leading-6 text-gray-500">
            No methodology fields. No weights. No prompt text. No PII. The same trust contract as the Decision Room.
          </p>
        </section>

        {/* ── Refusals ───────────────────────────────────────────────────── */}
        <section aria-label="What Eyeglass will refuse">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
            Refusals
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">What Eyeglass will refuse to do.</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-gray-300">
            <li className="border-l-2 border-amber-700/40 pl-4">
              Place a bet. Eyeglass is read-only. It will never trigger a wager.
            </li>
            <li className="border-l-2 border-amber-700/40 pl-4">
              Power third-party tout services. Public API access is gated on a ToS that bans repackaging Galaxy reads as someone else&apos;s pick.
            </li>
            <li className="border-l-2 border-amber-700/40 pl-4">
              Operate without the evidence chain. Every response includes the source / freshness / failureCase trio.
            </li>
            <li className="border-l-2 border-amber-700/40 pl-4">
              Return a read on a game outside the published surfaces. If Galaxy has not evaluated the game, Eyeglass returns &quot;not in slate.&quot;
            </li>
          </ul>
        </section>

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Read the methodology
            </Link>
            <Link
              href="/decisions"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              See our ADRs
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

function Shape({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <li className="border-l-2 border-violet-700/40 pl-5">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
    </li>
  );
}
