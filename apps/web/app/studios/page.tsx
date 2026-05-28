import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Galaxy Sports Studios — Creative Intelligence",
  description:
    "The creative production arm of Galaxy Sports Edge. Slate graphics, report covers, video production, and the visual design system behind every Galaxy surface.",
  alternates: { canonical: "/studios" },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CAPABILITIES = [
  {
    id: "slate-graphics",
    eyebrow: "01 · Visual production",
    title: "Slate Graphics",
    body: "Daily and weekly pick slate visuals, custom per sport and branded for social distribution. Ready for Twitter/X, Instagram, and Discord — dimensioned, styled, and on-brand every time.",
    tag: "Social-ready",
  },
  {
    id: "report-design",
    eyebrow: "02 · Editorial design",
    title: "Report Design",
    body: "Orbit Reports, Edge Reports, Market Mirage covers. Print-ready PDF layouts and web-optimized infographics built against the Galaxy design system — carbon backgrounds, ion-blue data layers.",
    tag: "PDF · Web",
  },
  {
    id: "video-production",
    eyebrow: "03 · Motion & video",
    title: "Video Production",
    body: "Weekly slate breakdowns, model explainer series, and the Galaxy Brain Q&A video format. Every episode is structured, sourced from real data, and produced in-house. Galaxy Sports Studios — Episode format TBD.",
    tag: "Series format TBD",
  },
  {
    id: "brand-identity",
    eyebrow: "04 · Visual system",
    title: "Brand Identity",
    body: "The full Galaxy visual language: carbon backgrounds, ion-blue accents, mineral borders, gradient treatments, and a typographic hierarchy that scales from mobile cards to broadcast slates.",
    tag: "Design tokens",
  },
] as const;

const STACK_ITEMS = [
  { label: "Motion design", coming: false },
  { label: "3D visualization", coming: true },
  { label: "Data visualization", coming: false },
  { label: "Social asset production", coming: false },
  { label: "PDF report layout", coming: false },
  { label: "Video editing", coming: false },
  { label: "AI-assisted generation (responsible use only)", coming: false },
] as const;

const SCHEDULE = [
  {
    day: "Sunday",
    label: "Weekly Slate Graphics",
    description: "Full-board visual for the upcoming week's top picks.",
  },
  {
    day: "Monday",
    label: "Orbit Report Cover",
    description: "Branded cover and header block for the weekly Orbit Report.",
  },
  {
    day: "Wednesday",
    label: "Mid-Week Signals Brief",
    description: "Compact visual digest of mid-week market movement.",
  },
  {
    day: "Friday",
    label: "Weekend Board Preview",
    description: "Weekend slate visual — distributed across all channels.",
  },
] as const;

const TOKEN_SWATCHES = [
  { name: "Carbon", hex: "#030712", swatchClass: "bg-[#030712]" },
  { name: "Ion Blue", hex: "#22d3ee", swatchClass: "bg-cyan-400" },
  { name: "Studio Violet", hex: "#7c3aed", swatchClass: "bg-violet-700" },
  { name: "Mineral", hex: "#1f2937", swatchClass: "bg-gray-800" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudiosPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-carbon text-gray-100">
      <Nav />

      <main>
        <HeroSection />
        <CapabilitiesSection />
        <StudioStackSection />
        <ProductionScheduleSection />
        <WordmarkSection />
        <CollabCTA />
      </main>

      <Footer />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection(): JSX.Element {
  return (
    <section
      className="relative isolate overflow-hidden border-b border-mineral px-4 pb-28 pt-24 sm:px-6 sm:pb-36 sm:pt-32 lg:px-8 lg:pb-44 lg:pt-40"
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(139,92,246,0.22), transparent)," +
          "radial-gradient(ellipse 55% 40% at 85% 55%, rgba(99,102,241,0.15), transparent)," +
          "radial-gradient(ellipse 50% 45% at 15% 75%, rgba(168,85,247,0.10), transparent)," +
          "#030712",
      }}
    >
      {/* Dot-grid texture overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Glow ring — violet instead of cyan to differentiate from the picks engine */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-px w-3/4 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
      />

      {/* Ambient glow blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)",
          filter: "blur(48px)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* Eyebrow badge */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-700/50 bg-violet-950/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-violet-300">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-violet-400"
              style={{ boxShadow: "0 0 6px rgba(167,139,250,0.9)" }}
            />
            Galaxy Sports Studios
          </span>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600 sm:inline">
            Creative Production Arm
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-8 max-w-5xl break-words text-5xl font-black leading-[1.04] tracking-tight text-white sm:text-7xl lg:text-8xl">
          Where sports intelligence{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 35%, #818cf8 70%, #6366f1 100%)",
            }}
          >
            becomes visual.
          </span>
        </h1>

        {/* Sub */}
        <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">
          Motion graphics. Slate design. Report covers. Video production.
          The creative layer behind every Galaxy surface.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/studios#work"
            className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white transition-all"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
              boxShadow: "0 4px 24px rgba(124,58,237,0.30)",
            }}
          >
            View the work
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-700 px-6 py-3 text-sm font-bold text-gray-200 transition-colors hover:border-violet-600 hover:text-white"
          >
            Brand kit →
          </Link>
        </div>

        {/* Descriptor trust strip */}
        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-mineral/50 pt-8">
          {(
            [
              "In-house creative studio",
              "Data-backed visuals only",
              "Every surface. Every format.",
            ] as const
          ).map((label) => (
            <span
              key={label}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-500"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Capabilities ─────────────────────────────────────────────────────────────

function CapabilitiesSection(): JSX.Element {
  return (
    <section
      id="work"
      className="border-b border-mineral px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">What the Studios does</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
          Four disciplines.{" "}
          <span className="text-gray-400">One visual system.</span>
        </h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-gray-400">
          Every piece of content that ships under the Galaxy name passes through
          Studios — from a three-second slate card to a 40-page report cover.
        </p>

        {/* 2×2 grid with hairline border treatment */}
        <div className="mt-14 grid grid-cols-1 gap-px border border-mineral bg-mineral sm:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <CapabilityCard key={cap.id} cap={cap} />
          ))}
        </div>
      </div>
    </section>
  );
}

type Capability = (typeof CAPABILITIES)[number];

function CapabilityCard({ cap }: { cap: Capability }): JSX.Element {
  return (
    <article
      className="group relative flex flex-col gap-4 overflow-hidden p-8 transition-colors"
      style={{
        background:
          "linear-gradient(145deg, rgba(15,10,30,0.98) 0%, rgba(9,7,20,1) 100%)",
      }}
    >
      {/* Gradient-border top accent — animates in on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.70) 50%, transparent 100%)",
        }}
      />

      {/* Left edge accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.45) 50%, transparent 100%)",
        }}
      />

      <div className="flex items-start justify-between gap-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-400">
          {cap.eyebrow}
        </p>
        <span className="shrink-0 rounded-full border border-gray-700 bg-gray-900/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-gray-500">
          {cap.tag}
        </span>
      </div>

      <h3 className="text-2xl font-black tracking-tight text-white">
        {cap.title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-400">{cap.body}</p>

      {/* Bottom ambient glow — visible on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(0deg, rgba(139,92,246,0.06) 0%, transparent 100%)",
        }}
      />
    </article>
  );
}

// ─── Studio Stack ─────────────────────────────────────────────────────────────

const GLYPH_MAP = [
  { label: "Motion", glyph: "↗" },
  { label: "3D", glyph: "◈" },
  { label: "Data", glyph: "⌁" },
  { label: "Social", glyph: "◻" },
  { label: "PDF", glyph: "▤" },
  { label: "Video", glyph: "▶" },
] as const;

function StudioStackSection(): JSX.Element {
  return (
    <section className="border-b border-mineral px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">The Studio Stack</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          What we produce with.
        </h2>
        <p className="mt-5 max-w-lg text-base text-gray-400">
          A growing stack of production tools, all aimed at one output: visual
          work that makes the data land.
        </p>

        {/* Capability pills */}
        <div className="mt-12 flex flex-wrap gap-3">
          {STACK_ITEMS.map((item) => (
            <StackPill key={item.label} label={item.label} coming={item.coming} />
          ))}
        </div>

        {/* Visual glyph grid */}
        <div className="mt-16 grid grid-cols-3 gap-px border border-mineral bg-mineral sm:grid-cols-6">
          {GLYPH_MAP.map(({ label, glyph }) => (
            <div
              key={label}
              className="group flex flex-col items-center gap-2 bg-gray-950 py-8 transition-colors hover:bg-gray-900/80"
            >
              <span
                aria-hidden="true"
                className="font-mono text-2xl text-violet-500/50 transition-colors group-hover:text-violet-400/80"
              >
                {glyph}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600 transition-colors group-hover:text-gray-500">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StackPill({
  label,
  coming,
}: {
  label: string;
  coming: boolean;
}): JSX.Element {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs tracking-wide transition-colors",
        coming
          ? "border-gray-800 bg-gray-950 text-gray-600"
          : "border-violet-800/40 bg-violet-950/30 text-violet-300 hover:border-violet-600/60 hover:bg-violet-950/50",
      ].join(" ")}
    >
      {coming && (
        <span aria-hidden="true" className="text-[8px] text-gray-700">
          ◌
        </span>
      )}
      {label}
      {coming && (
        <span className="ml-0.5 text-[9px] uppercase tracking-[0.12em] text-gray-700">
          · coming
        </span>
      )}
    </span>
  );
}

// ─── Production Schedule ──────────────────────────────────────────────────────

function ProductionScheduleSection(): JSX.Element {
  return (
    <section className="border-b border-mineral px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow">Production Schedule</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
              The weekly cadence.
            </h2>
            <p className="mt-4 max-w-md text-base text-gray-400">
              Four production windows per week. Every surface updated on a
              predictable rhythm — no guesswork about when the next visual
              drops.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-800/40 bg-amber-950/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Coming soon
          </span>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SCHEDULE.map((item, i) => (
            <ScheduleCard key={item.day} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

type ScheduleItem = (typeof SCHEDULE)[number];

function ScheduleCard({
  item,
  index,
}: {
  item: ScheduleItem;
  index: number;
}): JSX.Element {
  return (
    <div
      className="relative flex flex-col gap-3 overflow-hidden border border-mineral p-6 transition-colors hover:border-violet-800/40"
      style={{
        background:
          "linear-gradient(160deg, rgba(12,8,28,0.95) 0%, rgba(8,6,18,1) 100%)",
      }}
    >
      {/* Day number watermark */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-4 select-none font-mono text-5xl font-black leading-none text-gray-900"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-500">
        {item.day}
      </p>
      <h3 className="text-base font-bold leading-snug text-white">
        {item.label}
      </h3>
      <p className="text-sm leading-relaxed text-gray-500">{item.description}</p>

      {/* Subtle bottom gradient fill */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{
          background:
            "linear-gradient(0deg, rgba(139,92,246,0.04) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}

// ─── Wordmark Concept ─────────────────────────────────────────────────────────

function WordmarkSection(): JSX.Element {
  return (
    <section className="border-b border-mineral px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Brand Treatment</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
          The Galaxy Studios mark.
        </h2>
        <p className="mt-5 max-w-lg text-base text-gray-400">
          Minimal. Monospaced. Built for screens, slates, and the top of every
          report cover. The rule line is a design token — not a decoration.
        </p>

        {/* Wordmark display panel */}
        <div
          className="mt-12 flex flex-col items-center justify-center border border-mineral py-16 sm:py-24"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.07) 0%, transparent 70%)," +
              "linear-gradient(180deg, rgba(15,10,30,0.85) 0%, rgba(9,7,20,0.95) 100%)",
          }}
        >
          {/* Main wordmark */}
          <div className="px-4 text-center">
            <p
              className="font-mono font-bold uppercase text-white"
              style={{
                fontSize: "clamp(0.75rem, 2.5vw, 1.25rem)",
                letterSpacing: "0.32em",
              }}
            >
              <span className="text-violet-300">GALAXY</span>
              <span
                aria-hidden="true"
                className="mx-3 inline-block align-middle text-violet-600/60 sm:mx-5"
                style={{ letterSpacing: 0 }}
              >
                ━━━━━━━━━━━━━━
              </span>
              <span className="text-white">SPORTS STUDIOS</span>
            </p>

            <p
              className="mt-5 font-mono uppercase text-gray-500"
              style={{ fontSize: "0.68rem", letterSpacing: "0.28em" }}
            >
              Creative Intelligence &middot; Est. 2026
            </p>
          </div>

          {/* Ambient rule below wordmark */}
          <div
            aria-hidden="true"
            className="mt-10 h-px w-56"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.55) 50%, transparent 100%)",
            }}
          />
        </div>

        {/* Design token callouts */}
        <div className="mt-6 grid grid-cols-2 gap-px border border-mineral bg-mineral sm:grid-cols-4">
          {TOKEN_SWATCHES.map(({ name, hex, swatchClass }) => (
            <div
              key={name}
              className="flex items-center gap-3 bg-gray-950 px-5 py-4"
            >
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-sm border border-gray-800 ${swatchClass}`}
              />
              <div>
                <p className="text-xs font-semibold text-white">{name}</p>
                <p className="font-mono text-[10px] text-gray-600">{hex}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Collab CTA ───────────────────────────────────────────────────────────────

function CollabCTA(): JSX.Element {
  return (
    <section className="relative overflow-hidden px-4 py-28 sm:px-6 lg:px-8">
      {/* Ambient glow — positioned relative to section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 opacity-25"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="eyebrow">Work with the Studios</p>
        <h2 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
          Have a creative project?
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-400">
          We&apos;re building the studio. If you have a visual challenge — a
          slate series, a report design, a motion concept — tell us what you
          need.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/contact"
            className="inline-flex min-h-12 items-center justify-center rounded-xl px-8 py-3 text-sm font-bold text-white transition-all hover:brightness-110"
            style={{
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)",
              boxShadow: "0 4px 32px rgba(124,58,237,0.35)",
            }}
          >
            Tell us what you need →
          </Link>
          <Link
            href="/about"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-700 px-8 py-3 text-sm font-bold text-gray-300 transition-colors hover:border-violet-600 hover:text-white"
          >
            Brand overview
          </Link>
        </div>

        {/* Studio footnote */}
        <p className="mt-14 font-mono text-[11px] uppercase tracking-[0.2em] text-gray-700">
          Galaxy Sports Studios — a Galaxy Sports Edge production
        </p>
      </div>
    </section>
  );
}
