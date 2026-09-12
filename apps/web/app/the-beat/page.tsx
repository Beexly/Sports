import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { TheBeat } from "@/components/news/the-beat";
import { GalaxyBroadcast } from "@/components/news/galaxy-broadcast";
import { buildBroadcast } from "@/lib/fantasy/host";
import { WIRE_DISCLAIMER, WIRE_LIVE_DISCLAIMER } from "@/lib/news/wire";
import { fetchLiveWire } from "@/lib/news/rss";

/**
 * The Beat.
 *
 * Governing idea (Unseen Studio method — one idea dictates layout, motion,
 * type and copy together): SPORTS MEDIA IS A MARKET. Every report is a quote.
 * This page is the newsroom that scores every story the instant it lands.
 *
 * Not a card list under a header. A full-bleed place you walk into.
 */

export const metadata: Metadata = {
  title: "The Beat · Sports media, scored",
  description:
    "Sports media is a market too. The Beat weighs every report by source reliability, maps it to the players and lines it moves, and tells you the move before the market prices it in.",
  alternates: { canonical: "/the-beat" },
};

export default async function TheBeatPage() {
  const broadcast = buildBroadcast();
  // Live RSS wire when NEWS_RSS_FEEDS is configured (headlines only,
  // source-attributed, classified into the signal taxonomy); null keeps the
  // clearly-labeled fictional sample. Fails soft: a feed outage falls back
  // to whatever fetched, never fabricates.
  const liveWire = await fetchLiveWire().catch(() => null);

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Nav />

      <main id="main-content" className="flex-1">
        {/* ── FULL-BLEED OPENING · the place, not a header ────────────────── */}
        <section
          className="relative isolate flex min-h-[72vh] flex-col justify-end overflow-hidden px-4 pb-12 pt-28 sm:px-6 lg:px-8"
          aria-labelledby="beat-title"
        >
          {/* Field atmosphere: quiet near-black, one ember crown. No plate. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 55% at 70% 0%, rgba(255,77,46,0.14), transparent 60%)," +
                "radial-gradient(ellipse 50% 40% at 10% 90%, rgba(25,28,35,0.85), transparent 65%)," +
                "linear-gradient(180deg, #08090C 0%, #12141A 55%, #08090C 100%)",
            }}
          />
          {/* Scanline wash — the newsroom, not a stock photo. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(237,232,224,0.4) 2px, rgba(237,232,224,0.4) 3px)",
            }}
          />

          <div className="mx-auto w-full max-w-5xl">
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-orbital-cyan">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-orbital-cyan"
                style={{ boxShadow: "0 0 10px #FF4D2E" }}
              />
              The Beat · On air
            </p>

            <h1
              id="beat-title"
              className="mt-6 max-w-4xl font-display text-balance text-ion-white"
              style={{
                fontSize: "clamp(2.75rem, 9vw, 6.5rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.03em",
              }}
            >
              Breaking news,{" "}
              <span
                className="gse-editorial text-ultraviolet"
                style={{ fontSize: "1.06em" }}
              >
                scored
              </span>
              .
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-ion-1">
              Sports media is a market too. Noisy, and now accountable. Every
              report that lands gets weighed, mapped to the players and lines it
              moves, and handed to you as a move — before the market prices it in.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#ledger" className="btn btn-primary">
                Open the Signal Ledger
              </a>
              <a href="#transmission" className="btn btn-ghost">
                Watch the transmission
              </a>
            </div>
          </div>
        </section>

        {/* ── TRANSMISSION · the always-on broadcast ──────────────────────── */}
        <section
          id="transmission"
          className="border-t border-mineral px-4 py-14 sm:px-6 lg:px-8"
          aria-labelledby="transmission-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
                  GSN Transmission
                </p>
                <h2
                  id="transmission-title"
                  className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl"
                >
                  The week, on air.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-ion-2">
                Nova from the field. Orion at the desk. Segment by segment —
                the script on screen, never a robotic voice in your ear.
              </p>
            </div>
            <GalaxyBroadcast broadcast={broadcast} />
          </div>
        </section>

        {/* ── SIGNAL LEDGER · the scored feed ─────────────────────────────── */}
        <section
          id="ledger"
          className="border-t border-mineral px-4 pb-24 pt-14 sm:px-6 lg:px-8"
          aria-labelledby="ledger-title"
        >
          <div className="mx-auto max-w-5xl">
            <div className="mb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
                The Signal Ledger
              </p>
              <h2
                id="ledger-title"
                className="mt-2 font-display text-2xl font-semibold text-ion-white sm:text-3xl"
              >
                Every report, weighed the instant it lands.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ion-1">
                Source tier. Freshness. Fantasy and market impact. The move to
                make. Sort it, quiet it, open a card for the full read — then
                act before the number moves.
              </p>
            </div>
            <TheBeat liveWire={liveWire} />
            <p className="mt-6 text-xs leading-relaxed text-ion-2">
              {liveWire ? WIRE_LIVE_DISCLAIMER : WIRE_DISCLAIMER}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
