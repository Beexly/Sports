import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal, Stagger } from "@/components/motion/reveal";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { WorldSection } from "@/components/world/world-section";
import { RevenueHero } from "@/components/revenue/revenue-hero";
import { CountUp } from "@/components/ui/count-up";
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

/** Honest structural anchors — real numbers, no fabricated audience. */
const NETWORK_ANCHORS = [
  {
    value: 8,
    label: "Open lanes",
    body: "NFL, college football, NBA, MLB, fantasy, DFS, sports-betting education, and Houston local.",
    accent: BRAND_COLORS.orbitalCyan,
  },
  {
    value: 6,
    label: "Things you receive",
    body: "Templates, style guide, referral code, revenue share, submission workflow, and compliance guardrails.",
    accent: BRAND_COLORS.softUltraviolet,
  },
  {
    value: 6,
    label: "Compliance standards",
    body: "Non-negotiable. Every contributor content submission is reviewed against all six before it publishes.",
    accent: BRAND_COLORS.ionMagenta,
  },
] as const;

export default function CreatorNetworkPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />

      <main id="main-content" className="relative flex-1 overflow-hidden">
        <ShootingStars />

        {/* ── Hero — chrome + editorial-serif, violet chrome tone */}
        <RevenueHero
          chip="Creator Network · Contributor Partners"
          chipTone="plasma"
          headline={
            <>
              <span className="gw-chrome-violet">Contribute</span> to{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                Galaxy
              </span>
              .
            </>
          }
          lede={
            <>
              <span className="font-display text-xl text-white">
                Specialists preferred. Generalists need not apply.
              </span>
              <span className="mt-3 block">
                {BRAND_NAME} is building a creator network of independent
                analysts and contributors — one lane at a time. If you write,
                record, or analyze sports with discipline and without hype, we
                want to talk. Contributors are independent partners who agree to
                Galaxy&apos;s editorial standards, compliance guardrails, and
                responsible-play posture — and in return receive templates, a
                referral code, and revenue share.
              </span>
            </>
          }
        >
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Creator%20Network%20Application`}
              className="btn btn-primary"
            >
              Apply as a contributor →
            </a>
            <Link href="/contact" className="btn btn-ghost">
              Other questions →
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">
            All contributor applications are reviewed manually. We will respond
            within 5–7 business days.
          </p>
        </RevenueHero>

        {/* ── Network anchors — real structural counts, no fake audience */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="gw-chapter-index">
                <span className="text-orbital-cyan">01</span>
                The network at a glance
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-display-lg font-semibold text-balance text-white">
                Built on{" "}
                <span className="gse-editorial gw-chrome-ice">discipline</span>,
                not volume.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-300">
                We are early-stage and selective by design. We do not publish
                fabricated contributor counts or audience numbers — what we offer
                is a structured, compliance-first network with real editorial
                support and a genuine revenue share.
              </p>
            </Reveal>
            <Stagger className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3" step={80}>
              {NETWORK_ANCHORS.map((anchor) => (
                <div
                  key={anchor.label}
                  className="surface-card gw-card-hover flex flex-col gap-3 p-6"
                >
                  <p
                    className="font-display text-5xl font-bold tabular-nums"
                    style={{ color: anchor.accent }}
                  >
                    <CountUp value={anchor.value} />
                  </p>
                  <p
                    className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
                    style={{ color: anchor.accent }}
                  >
                    {anchor.label}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {anchor.body}
                  </p>
                </div>
              ))}
            </Stagger>
          </div>
        </section>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Open lanes */}
        <WorldSection
          index="02"
          eyebrow="Open contributor lanes"
          title={
            <>
              Eight lanes{" "}
              <span className="gse-editorial gw-chrome-plasma">
                looking for contributors
              </span>
              .
            </>
          }
          lede="Each lane has its own submission cadence and content format. Specialists preferred — we are not looking for generalists who cover everything."
          tone="nebula"
        >
          <Stagger
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
            step={60}
          >
            {LANES.map((lane) => (
              <div
                key={lane.label}
                className="surface-card gw-card-hover flex flex-col gap-2.5 p-5"
              >
                <div
                  className="mb-1 h-0.5 w-10 rounded-full"
                  style={{ background: lane.accent }}
                  aria-hidden="true"
                />
                <h3
                  className="font-display text-base font-semibold"
                  style={{ color: lane.accent }}
                >
                  {lane.label}
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">
                  {lane.desc}
                </p>
              </div>
            ))}
          </Stagger>
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── What contributors receive */}
        <WorldSection
          index="03"
          eyebrow="What contributor partners receive"
          title={
            <>
              Six things the{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                partnership
              </span>{" "}
              provides.
            </>
          }
          tone="void"
        >
          <Stagger className="grid grid-cols-1 gap-5 md:grid-cols-2" step={70}>
            {WHAT_YOU_GET.map((item) => (
              <article
                key={item.eyebrow}
                className="surface-card gw-card-hover relative flex flex-col gap-3 overflow-hidden p-6"
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
        </WorldSection>

        <SignalRule className="mx-auto max-w-5xl px-4" />

        {/* ── Compliance standards */}
        <WorldSection
          index="04"
          eyebrow="Non-negotiable standards"
          title={
            <>
              Compliance guardrails for{" "}
              <span className="gse-editorial gw-chrome-violet">
                every contributor
              </span>
              .
            </>
          }
          lede="These are not suggestions. All contributor content must meet these standards before it publishes. The editorial team checks every submission. Anti-hype and responsible-play posture are non-negotiable features of the Galaxy brand — not constraints we work around."
          tone="deep"
        >
          <Stagger className="flex flex-col gap-4" step={70}>
            {COMPLIANCE_STANDARDS.map((item, i) => (
              <div
                key={i}
                className="surface-card gw-card-hover flex items-start gap-4 p-5"
                style={{ borderColor: `${BRAND_COLORS.ionMagenta}20` }}
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
        </WorldSection>

        {/* ── CTA — nebula-deep */}
        <section className="gw-nebula-deep relative isolate overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[60vh]"
            style={{
              background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${BRAND_COLORS.softUltraviolet}14, transparent 70%)`,
            }}
          />
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="gw-chip-plasma">Apply now</span>
              <h2 className="mt-6 font-display text-display-lg font-semibold leading-[1.05] text-balance text-white">
                Disciplined voice,{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  open lane?
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-ink-300">
                If you analyze sports without hype, frame confidence without
                certainty, and want to reach an audience that has moved past
                the tout model — send us a note. Include the lane you cover,
                a sample of your work, and what you want to build.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-9 flex flex-wrap justify-center gap-4">
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
                Contributors are independent partners, not employees. Revenue
                share and referral terms are disclosed in the partner
                agreement.{" "}
                <Link
                  href="/affiliate-disclosure"
                  className="underline underline-offset-4 transition-colors hover:text-ink-300"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Affiliate disclosure
                </Link>
                .
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
