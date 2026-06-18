import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { BRAND_NAME, LEGAL_EMAIL, SUPPORT_EMAIL, BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${BRAND_NAME} team.`,
  alternates: { canonical: "/contact" },
};

const INBOXES = [
  {
    title: "Support",
    description: "Account access, subscription issues, bug reports.",
    email: SUPPORT_EMAIL,
    accent: BRAND_COLORS.orbitalCyan,
    icon: "◆",
  },
  {
    title: "Legal & privacy",
    description: "Data requests, account deletion, compliance questions, DMCA.",
    email: LEGAL_EMAIL,
    accent: BRAND_COLORS.softUltraviolet,
    icon: "◈",
  },
  {
    title: "Press",
    description: "Media requests, interview availability, embargoed coverage.",
    email: SUPPORT_EMAIL,
    accent: BRAND_COLORS.ionMagenta,
    icon: "◇",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />

      <main id="main-content" className="flex-1">
        {/* Cinematic hero */}
        <section className="relative isolate overflow-hidden px-4 pb-14 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem]"
            style={{
              background: `radial-gradient(50% 65% at 50% 0%, ${BRAND_COLORS.orbitalCyan}12, transparent 65%)`,
            }}
          />
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.orbitalCyan,
                  borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                  backgroundColor: `${BRAND_COLORS.orbitalCyan}0d`,
                }}
              >
                Get in touch
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
                I answer{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.orbitalCyan} 0%, ${BRAND_COLORS.softUltraviolet} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  real people,
                </span>{" "}
                not bots.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-xl text-lg leading-8 text-ink-300">
                I aim to reply within one business day. Faster on weekday
                afternoons, slower around major slates.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Inbox cards */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2" step={80}>
              {INBOXES.map((box) => (
                <a
                  key={box.title}
                  href={`mailto:${box.email}`}
                  className="group flex flex-col gap-3 overflow-hidden rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    borderColor: `${box.accent}22`,
                    background: `linear-gradient(135deg, ${box.accent}06 0%, rgba(18,14,36,0.8) 100%)`,
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="mb-1 h-0.5 w-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${box.accent}, transparent 70%)` }}
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-2xl leading-none"
                      style={{ color: `${box.accent}60` }}
                      aria-hidden="true"
                    >
                      {box.icon}
                    </span>
                  </div>
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: box.accent }}
                  >
                    {box.title}
                  </p>
                  <p className="text-sm leading-6 text-ink-300">{box.description}</p>
                  <p
                    className="mt-auto font-mono text-sm font-semibold transition-colors group-hover:underline"
                    style={{ color: box.accent }}
                  >
                    {box.email} →
                  </p>
                </a>
              ))}
            </Stagger>

            <Reveal delay={200}>
              <div
                className="mt-6 rounded-xl border p-5 text-sm text-ink-400"
                style={{
                  borderColor: "rgba(255,255,255,0.06)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span
                  className="mr-2 font-semibold"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Note:
                </span>
                All three inboxes route to the same team. Use the one that best describes your message — it helps us route faster.
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
