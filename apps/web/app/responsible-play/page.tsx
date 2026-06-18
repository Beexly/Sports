import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BiasMirror } from "@/components/bias-mirror/bias-mirror";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { BRAND_NAME, HELPLINE, BRAND_COLORS } from "@/lib/brand";
import { QuoteCallout } from "@/components/ui/quote-callout";

export const metadata: Metadata = {
  title: "Responsible play",
  description:
    "Sports betting carries real risk. Resources, helplines, and self-exclusion options for anyone who wants to slow down or stop.",
  alternates: { canonical: "/responsible-play" },
};

const RESOURCES = [
  {
    name: "National Council on Problem Gambling",
    href: "https://www.ncpgambling.org/",
    body: "Free confidential helpline, chat, and text — 24/7, all 50 US states.",
  },
  {
    name: "GamTalk",
    href: "https://www.gamtalk.org/",
    body: "Anonymous peer-support community for anyone affected by gambling.",
  },
  {
    name: "Gamblers Anonymous",
    href: "https://www.gamblersanonymous.org/",
    body: "In-person and online support groups based on a twelve-step program.",
  },
  {
    name: "Self-exclusion (state-by-state)",
    href: "https://www.ncpgambling.org/state-resources/",
    body: "Many US states maintain self-exclusion lists you can join to block yourself from sportsbooks for a fixed term.",
  },
] as const;

const WARNING_SIGNS = [
  "Wagering more than you planned to, or chasing losses.",
  "Borrowing money or lying about how much has been wagered.",
  "Feeling restless or irritable when not betting.",
  "Betting interfering with work, sleep, family, or financial obligations.",
  "Hiding the activity from people who care about you.",
  "Believing the next pick will fix the previous one.",
] as const;

export default function ResponsiblePlayPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="no-bet-stillness" className="-z-20 opacity-35" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem]"
            style={{
              background: `radial-gradient(50% 65% at 50% 0%, rgba(255,180,84,0.10), transparent 65%), radial-gradient(30% 40% at 85% 15%, rgba(255,100,112,0.08), transparent 60%)`,
            }}
          />
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: "#FFB454",
                  borderColor: "rgba(255,180,84,0.30)",
                  backgroundColor: "rgba(255,180,84,0.08)",
                }}
              >
                Responsible play
              </span>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.2rem, 6vw, 4rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Sports betting carries{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #FFB454 0%, #FF6470 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  real risk.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 text-lg leading-8 text-ink-300">
                {BRAND_NAME} is an informational service. Outcomes are never
                certain — no model eliminates variance. Wager only what you
                can afford to lose, and stop immediately if it stops feeling
                like a hobby.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Helpline call-out */}
        <section className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div
                className="overflow-hidden rounded-2xl border p-7"
                style={{
                  borderColor: "rgba(255,100,112,0.30)",
                  background: "linear-gradient(135deg, rgba(255,100,112,0.08) 0%, rgba(18,14,36,0.9) 100%)",
                }}
              >
                <div
                  className="mb-4 h-0.5 w-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #FF6470, transparent 70%)" }}
                  aria-hidden="true"
                />
                <p
                  className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: "#FF6470" }}
                >
                  If you need help right now
                </p>
                <p className="font-display text-2xl font-semibold text-white">
                  {HELPLINE.name}
                </p>
                <a
                  href={HELPLINE.href}
                  className="mt-1 block font-display text-3xl font-bold underline-offset-4 hover:underline"
                  style={{ color: "#FFB454" }}
                >
                  {HELPLINE.number}
                </a>
                <p className="mt-3 text-sm leading-6 text-ink-300">
                  24/7. Free. Confidential. Available in English and Spanish.
                  Text and chat options as well.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* The Bias Mirror */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                The Bias Mirror
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.01em" }}
              >
                A private check on how you decide.
              </h2>
              <p className="mt-4 max-w-2xl text-ink-300">
                Most products exploit bias. This one reflects it back — privately. Rate a few honest
                tendencies and the Mirror surfaces the patterns worth watching, your real strengths,
                and calm, protective moves. It&apos;s computed on your device from your own answers —
                nothing is sent or stored.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9">
                <BiasMirror />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Warning signs */}
        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2
                className="font-display text-white"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.15 }}
              >
                Warning signs to take seriously
              </h2>
            </Reveal>
            <Stagger className="mt-6 flex flex-col gap-2.5" step={60}>
              {WARNING_SIGNS.map((line) => (
                <div
                  key={line}
                  className="flex items-start gap-3 rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "rgba(255,100,112,0.15)",
                    background: "rgba(255,100,112,0.04)",
                  }}
                >
                  <span
                    className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: "#FF6470" }}
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-6 text-ink-300">{line}</span>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Quote break */}
        <QuoteCallout cite="Galaxy Sports Edge, Responsible Play">
          The model does not publish when it is not confident. The gate stays closed —
          and honest silence is the most responsible pick of all.
        </QuoteCallout>

        {/* Resources */}
        <section className="px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2
                className="font-display text-white"
                style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)", lineHeight: 1.15 }}
              >
                Resources and self-exclusion
              </h2>
              <p className="mt-3 text-ink-300">
                External programs and organizations you can reach out to. None
                of them are affiliated with {BRAND_NAME}; listed as the
                standard starting points for anyone who wants to slow down or
                stop.
              </p>
            </Reveal>
            <Stagger className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2" step={80}>
              {RESOURCES.map((res) => (
                <a
                  key={res.name}
                  href={res.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 overflow-hidden rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: "rgba(255,180,84,0.18)",
                    background: "rgba(255,180,84,0.04)",
                  }}
                >
                  <p className="text-sm font-semibold text-white transition-colors group-hover:text-orbital-cyan">
                    {res.name}
                    <span aria-hidden className="ml-1.5 text-ink-500">↗</span>
                  </p>
                  <p className="text-xs leading-5 text-ink-400">{res.body}</p>
                </a>
              ))}
            </Stagger>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
