import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GSNTransmission } from "@/components/gsn/transmission";
import { buildDailyTransmission } from "@/lib/gsn/build-transmission";

export const metadata: Metadata = {
  title: "GSN · Galaxy Sports Network",
  description:
    "Not a blog, a daily intelligence transmission. The whole slate read as a mission-control briefing: Galaxy Brief, Market Mirages, Roster Shocks, Coaching Edges, and Line-Movement Autopsies.",
  alternates: { canonical: "/gsn" },
};

export default async function GSNPage() {
  const transmission = await buildDailyTransmission();
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{
              background:
                "radial-gradient(60% 80% at 50% 0%, rgba(0, 229, 255, 0.09), transparent 70%), radial-gradient(40% 60% at 74% 8%, rgba(123, 97, 255, 0.07), transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2 text-orbital-cyan">
                <span className="live-dot" />
                Galaxy Sports Network
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-ion-white"
                style={{ fontSize: "clamp(2.5rem, 8vw, 5.5rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
              >
                GSN: the{" "}
                <span className="gse-editorial" style={{ fontSize: "1.08em" }}>transmission</span>, not the blog.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                Every day the engine reads the whole board and files an intelligence briefing:
                the mirages the crowd is walking into, the roster shocks re-pricing the slate, the
                coaching edges the market underweights, and last night&apos;s autopsies. Content
                becomes an event.
              </p>
            </Reveal>
          </div>
        </section>

        {/* The transmission */}
        <section className="px-4 pb-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <GSNTransmission transmission={transmission} />
              <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">
                Source · {transmission.source === "board" ? "board snapshot" : "methodology structure"}
                {transmission.illustrative ? " · no fabricated track-record numbers" : ""}
              </p>
            </Reveal>
          </div>
        </section>

        {/* Note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-2xl border border-titanium bg-gradient-to-b from-titanium/35 to-transparent p-8 text-center">
              <p className="eyebrow text-orbital-cyan">
                Daily transmission
              </p>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ion-1">
                This transmission is built from the current board state when published reads exist;
                otherwise it ships the full methodology structure so the product never goes empty.
              </p>
              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/observatory" className="btn btn-primary">
                  Enter the slate
                </Link>
                <Link href="/academy" className="btn btn-ghost">
                  Train in the Academy
                </Link>
                <Link href="/intelligence" className="btn btn-ghost">
                  Inside the engine
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
