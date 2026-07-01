import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BiasMirror } from "@/components/bias-mirror/bias-mirror";
import { BRAND_NAME, HELPLINE, BRAND_COLORS } from "@/lib/brand";

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
];

export default function ResponsiblePlayPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Hero — also the #variance target for the footer "Variance guide" link. */}
        <section id="variance" className="border-b border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Responsible play</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              Sports betting carries real risk.
            </h1>
            <p className="mt-5 text-lg text-ink-300">
              {BRAND_NAME} is an informational service. Outcomes are never
              certain — no model eliminates variance. Wager only what you
              can afford to lose, and stop immediately if it stops feeling
              like a hobby.
            </p>
          </div>
        </section>

        {/* Helpline call-out */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="surface-lifted flex flex-col gap-3 p-6 sm:p-8">
              <p className="eyebrow">If you need help right now</p>
              <p className="font-display text-2xl font-semibold text-white">
                {HELPLINE.name}
              </p>
              <a
                href={HELPLINE.href}
                className="font-display text-3xl font-bold text-accent-300 underline-offset-4 hover:underline"
              >
                {HELPLINE.number}
              </a>
              <p className="text-sm text-ink-300">
                24/7. Free. Confidential. Available in English and Spanish.
                Text and chat options as well.
              </p>
            </div>
          </div>
        </section>

        {/* The Bias Mirror — responsible play as a living, protective layer */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <p className="eyebrow" style={{ color: BRAND_COLORS.softUltraviolet }}>The Bias Mirror</p>
            <h2 className="mt-3 font-display text-display-lg text-white">A private check on how you decide.</h2>
            <p className="mt-4 max-w-2xl text-ink-300">
              Most products exploit bias. This one reflects it back — privately. Rate a few honest
              tendencies and the Mirror surfaces the patterns worth watching, your real strengths,
              and calm, protective moves. It&apos;s computed on your device from your own answers —
              nothing is sent or stored.
            </p>
            <div className="mt-9">
              <BiasMirror />
            </div>
          </div>
        </section>

        {/* Warning signs */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-display-lg text-white">
              Warning signs to take seriously
            </h2>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-ink-300">
              {[
                "Wagering more than you planned to, or chasing losses.",
                "Borrowing money or lying about how much has been wagered.",
                "Feeling restless or irritable when not betting.",
                "Betting interfering with work, sleep, family, or financial obligations.",
                "Hiding the activity from people who care about you.",
                "Believing the next pick will fix the previous one.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/50 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-risk-high"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Resources */}
        <section className="px-4 pb-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-display text-display-lg text-white">
              Resources and self-exclusion
            </h2>
            <p className="mt-3 text-ink-300">
              External programs and organizations you can reach out to. None
              of them are affiliated with {BRAND_NAME}; I list them as the
              standard starting points for anyone who wants to slow down or
              stop.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {RESOURCES.map((res) => (
                <a
                  key={res.name}
                  href={res.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-card group flex flex-col gap-2 p-5 transition-colors hover:border-accent-700"
                >
                  <p className="text-sm font-semibold text-white group-hover:text-accent-200">
                    {res.name}
                    <span aria-hidden className="ml-1.5 text-ink-500">
                      ↗
                    </span>
                  </p>
                  <p className="text-xs leading-relaxed text-ink-400">
                    {res.body}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
