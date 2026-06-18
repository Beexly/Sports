import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_NAME, BRAND_COLORS, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Creator Network — Contribute to Galaxy Sports Edge",
  description:
    "Contribute to Galaxy Sports Edge as an independent analyst or creator. Eight open lanes — NFL, NBA, MLB, college football, fantasy, DFS, sports-betting education, and Houston local. Honest revenue share, compliance guardrails, real editorial support.",
  alternates: { canonical: "/creator-network" },
  openGraph: {
    title: `Creator Network — ${BRAND_NAME}`,
    description:
      "Partner with Galaxy Sports Edge as a creator contributor. Content templates, brand guide, referral codes, revenue share, and compliance-first editorial standards.",
    type: "website",
  },
};

const LANES = [
  {
    label: "NFL",
    desc: "Week-by-week matchup signals, market reads, and situational analysis. No-guarantee framing required.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "College Football",
    desc: "Line value, situational spots, program-level trends, and public-narrative corrections.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "NBA",
    desc: "Pace, usage, line movement, and rest/travel situational reads across the full slate.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    label: "MLB",
    desc: "Pitching matchups, bullpen signals, run-line situational analysis, and weather/park factors.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Fantasy",
    desc: "Buy-low / sell-high reasoning, waiver analysis, and trade framework — always with the reasoning visible.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    label: "DFS",
    desc: "Salary value, usage signal, pivot plays — without outcome promises or tout language.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    label: "Sports-Betting Education",
    desc: "Concepts — CLV, odds movement, market structure, bankroll discipline, variance — explained for a general audience.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    label: "Houston Local",
    desc: "Texans, Astros, Rockets — local angles, community context, and regional market reads.",
    accent: BRAND_COLORS.softUltraviolet,
  },
] as const;

const WHAT_YOU_GET = [
  {
    eyebrow: "01",
    title: "Content Templates",
    body: "Structured formats for every lane — Market Mirage, No-Bet Watch, Signal vs Noise, Matchup Signal — so your work fits the Galaxy voice from day one.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "02",
    title: "Galaxy Style Guide",
    body: "The editorial playbook: tone, structure, banned language, responsible-play posture, and how to frame confidence without overclaiming. Mandatory for all contributors.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "03",
    title: "Referral / Affiliate Code",
    body: "A personal referral code tied to your contributor account. When your audience converts to a paid Galaxy plan, you share in that revenue.",
    accent: BRAND_COLORS.ionMagenta,
  },
  {
    eyebrow: "04",
    title: "Revenue Share",
    body: "Contributor revenue share terms are disclosed in your partner agreement. Rates reflect traffic, conversions, and content volume — no fabricated numbers here.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    eyebrow: "05",
    title: "Submission Workflow",
    body: "A clear editorial inbox and review cycle. Submissions are reviewed before publishing — not auto-published. Our editorial team checks for compliance, accuracy, and brand alignment.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    eyebrow: "06",
    title: "Compliance Guardrails",
    body: "Anti-hype language standards, responsible-play posture requirements, and plain-language framing rules. No tout language, no outcome promises, no reckless certainty claims.",
    accent: BRAND_COLORS.ionMagenta,
  },
] as const;

const COMPLIANCE_STANDARDS = [
  "No promised-outcome language — outcomes are never presented as certain in any format.",
  "No tout framing — picks are signals with reasoning, not products being sold as winners.",
  "No reckless certainty — confidence is a calibrated score, not an assertion of what will happen.",
  "Responsible-play posture — every piece must be compatible with our responsible-play standards.",
  "Attribution and disclosure — referral codes must be disclosed where FTC guidance applies.",
  "Editorial review before publish — no contributor content goes live without review.",
] as const;

export default function CreatorNetworkPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">

        {/* Hero */}
        <section className="relative px-4 pb-20 pt-28 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[65vh]"
            style={{
              background: `radial-gradient(55% 60% at 50% 0%, ${BRAND_COLORS.softUltraviolet}1a, transparent 70%), radial-gradient(40% 50% at 80% 0%, ${BRAND_COLORS.orbitalCyan}10, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
                style={{
                  color: BRAND_COLORS.softUltraviolet,
                  borderColor: `${BRAND_COLORS.softUltraviolet}30`,
                  backgroundColor: `${BRAND_COLORS.softUltraviolet}0d`,
                }}
              >
                Creator Network — Contributor Partners
              </span>
            </Reveal>

            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{
                  fontSize: "clamp(2.4rem, 6vw, 4.8rem)",
                  lineHeight: 1.0,
                  letterSpacing: "-0.02em",
                }}
              >
                Contribute to{" "}
                <span
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_COLORS.softUltraviolet} 0%, ${BRAND_COLORS.orbitalCyan} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Galaxy.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-ink-300">
                {BRAND_NAME} is building a creator network of independent
                analysts and contributors — one lane at a time. If you write,
                record, or analyze sports with discipline and without hype, we
                want to talk.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mt-4 max-w-xl text-base leading-7 text-ink-300">
                Contributors are not employees. They are independent partners
                who agree to Galaxy's editorial standards, compliance
                guardrails, and responsible-play posture — and in return
                receive templates, a referral code, and revenue share.
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=Creator%20Network%20Application`}
                  className="btn btn-primary"
                >
                  Apply as a contributor →
                </a>
                <Link
                  href="/contact"
                  className="btn btn-ghost"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Other questions →
                </Link>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <p className="mt-4 text-xs text-ink-500">
                All contributor applications are reviewed manually. We will
                respond within 5–7 business days.
              </p>
            </Reveal>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Open lanes */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Open contributor lanes
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Eight lanes looking for contributors.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                Each lane has its own submission cadence and content format.
                Specialists preferred — we are not looking for generalists who
                cover everything.
              </p>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" step={60}>
              {LANES.map((lane) => (
                <div
                  key={lane.label}
                  className="rounded-xl border p-5"
                  style={{
                    borderColor: `${lane.accent}22`,
                    background: `${lane.accent}07`,
                  }}
                >
                  <div
                    className="mb-3 h-0.5 w-10 rounded-full"
                    style={{ background: lane.accent }}
                    aria-hidden="true"
                  />
                  <h3
                    className="font-display text-base font-semibold"
                    style={{ color: lane.accent }}
                  >
                    {lane.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-300">
                    {lane.desc}
                  </p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* What you get */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.orbitalCyan }}
              >
                What contributor partners receive
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Six things the partnership provides.
              </h2>
            </Reveal>

            <Stagger className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
              {WHAT_YOU_GET.map((item) => (
                <article
                  key={item.eyebrow}
                  className="surface-card group relative flex flex-col gap-3 overflow-hidden p-6"
                  style={{ borderColor: `${item.accent}1f` }}
                >
                  <div
                    className="mb-1 h-0.5 w-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${item.accent}, transparent 70%)`,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className="font-display text-3xl tabular-nums"
                    style={{ color: item.accent }}
                  >
                    {item.eyebrow}
                  </span>
                  <h3 className="font-display text-xl text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-300">{item.body}</p>
                </article>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* Compliance standards */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p
                className="eyebrow"
                style={{ color: BRAND_COLORS.ionMagenta }}
              >
                Non-negotiable standards
              </p>
              <h2
                className="mt-3 font-display text-white"
                style={{
                  fontSize: "clamp(1.8rem, 4vw, 3rem)",
                  lineHeight: 1.1,
                  letterSpacing: "-0.01em",
                }}
              >
                Compliance guardrails for every contributor.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                These are not suggestions. All contributor content must meet
                these standards before it publishes. The editorial team checks
                every submission. Anti-hype and responsible-play posture are
                non-negotiable features of the Galaxy brand — not constraints
                we work around.
              </p>
            </Reveal>

            <Stagger className="mt-8 flex flex-col gap-4" step={70}>
              {COMPLIANCE_STANDARDS.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 rounded-xl border p-5"
                  style={{
                    borderColor: `${BRAND_COLORS.ionMagenta}20`,
                    background: `${BRAND_COLORS.ionMagenta}08`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 font-mono text-sm font-bold tabular-nums"
                    style={{ color: BRAND_COLORS.ionMagenta }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-300">{item}</p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* CTA */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <div
                className="rounded-2xl border p-8 text-center"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}08, transparent 70%)`,
                }}
              >
                <p
                  className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Apply now
                </p>
                <h2
                  className="mt-3 font-display text-white"
                  style={{
                    fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
                    lineHeight: 1.15,
                  }}
                >
                  Disciplined voice, open lane?
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-ink-300">
                  If you analyze sports without hype, frame confidence without
                  certainty, and want to reach an audience that has moved past
                  the tout model — send us a note. Include the lane you cover,
                  a sample of your work, and what you want to build.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-4">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Creator%20Network%20Application`}
                    className="btn btn-primary"
                  >
                    Apply via email →
                  </a>
                  <Link href="/contact" className="btn btn-ghost">
                    Contact the team →
                  </Link>
                </div>
                <p className="mt-6 text-xs text-ink-500">
                  Contributors are independent partners, not employees.
                  Revenue share and referral terms are disclosed in the
                  partner agreement.{" "}
                  <Link
                    href="/affiliate-disclosure"
                    className="underline underline-offset-4"
                    style={{ color: BRAND_COLORS.softUltraviolet }}
                  >
                    Affiliate disclosure
                  </Link>
                  .
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
