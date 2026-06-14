import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { AcademySimulator } from "@/components/academy/academy-simulator";
import { CoursePlayer } from "@/components/academy/course-player";
import { ReaderDoorway } from "@/components/house/reader-doorway";
import { BeatTheClose } from "@/components/academy/beat-the-close";
import { FilmRoom } from "@/components/academy/film-room";
import {
  AcademyRegisterToggle,
  AcademyHeroBody,
  AcademyCourseSectionBody,
  AcademyLiveFireBody,
  AcademyBeatTheCloseBody,
} from "@/components/academy/academy-register-toggle";
import { HoloTilt } from "@/components/motion/holo-tilt";
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "The Academy — Courses, Live Fire, and Beat the Close",
  description:
    "Interactive courses with graded quizzes, a live-fire decision simulator, the Beat the Close training game, and the GM Academy — train process, calibration, and restraint.",
  alternates: { canonical: "/academy" },
};

const cyan = BRAND_COLORS.orbitalCyan;
const uv = BRAND_COLORS.softUltraviolet;
const mag = BRAND_COLORS.ionMagenta;

/**
 * The wings of the Academy — every door on this floor is real. Each carries a
 * `mode` tag so the trainee knows what kind of activity waits behind it before
 * they arrive: read+quiz, simulate, play, or watch.
 */
const WINGS = [
  { id: "courses", label: "Course Floor", mode: "Read + Quiz", desc: "Interactive lessons, then graded quizzes", hex: cyan },
  { id: "live-fire", label: "Live Fire", mode: "Simulate", desc: "Decide blind, graded on process", hex: mag },
  { id: "beat-the-close", label: "Beat the Close", mode: "Arcade", desc: "The line-trading game", hex: uv },
  { id: "film-room", label: "Film Room", mode: "Watch", desc: "Filmed lessons — in production", hex: "#8b93a8" },
] as const;

/**
 * WingHeader — one consistent chapter header for every wing, so the four
 * sections read as distinct, evenly-spaced chapters. Wayfinding ("Wing N of
 * 4"), the activity mode, the title, and an optional kicker line, in a fixed
 * rhythm. Server-rendered; the register-aware body paragraph is slotted in by
 * the caller as `children`.
 */
function WingHeader({
  index,
  hex,
  mode,
  eyebrow,
  title,
  children,
}: {
  index: number;
  hex: string;
  mode: string;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: hex }}>
          {eyebrow}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
          Wing {index} of 4
        </span>
        <span
          className="rounded-full px-2.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: hex, background: `${hex}14`, border: `1px solid ${hex}3a` }}
        >
          {mode}
        </span>
      </div>
      <h2 className="mt-4 font-display text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
      {children}
    </header>
  );
}

export default function AcademyPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <GeneratedPlate assetId="academy-path" className="-z-20 opacity-60" />
          <ShootingStars />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${uv}18, transparent 70%), radial-gradient(40% 60% at 72% 8%, ${cyan}12, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow inline-flex items-center gap-2" style={{ color: cyan }}>
                <span className="live-dot" />
                The Academy
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-5 font-display text-balance text-white"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)", lineHeight: 1.0, letterSpacing: "-0.02em" }}
              >
                Train on the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>process</span>, not the luck.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <AcademyHeroBody />
            </Reveal>

            <Reveal delay={210}>
              <div className="mt-4">
                <AcademyRegisterToggle />
              </div>
            </Reveal>

            {/* wing map — the four doors, each labeled by what you'll DO inside */}
            <Reveal delay={240}>
              <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-500">
                Four wings · pick where to start
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                {WINGS.map((w, i) => (
                  <HoloTilt key={w.id} className="h-full">
                    <a
                      href={`#${w.id}`}
                      className="group block h-full rounded-xl border p-4 transition-shadow hover:shadow-[0_0_0_1px_var(--tw-shadow-color)]"
                      style={{ borderColor: `${w.hex}33`, background: `radial-gradient(100% 100% at 50% 0%, ${w.hex}0d, transparent 75%)` }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-ink-500">0{i + 1}</span>
                        <span
                          className="rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
                          style={{ color: w.hex, background: `${w.hex}14`, border: `1px solid ${w.hex}3a` }}
                        >
                          {w.mode}
                        </span>
                      </span>
                      <p className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: w.hex }}>
                        {w.label}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ink-300">{w.desc}</p>
                    </a>
                  </HoloTilt>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── WING 01 · COURSE FLOOR — interactive lessons + quizzes ───── */}
        <section id="courses" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <WingHeader index={1} hex={cyan} mode="Read + Quiz" eyebrow="course floor" title="Lessons that quiz back.">
                <AcademyCourseSectionBody />
              </WingHeader>
            </Reveal>
            <Reveal delay={90}>
              <div className="mt-7 rounded-2xl border border-mineral bg-eclipse/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
                  Before you start — how should we explain things?
                </p>
                <p className="mt-1 text-sm text-ink-300">
                  Set your register — every &ldquo;ask the model why&rdquo; across
                  Galaxy meets you here. New to this? Choose &ldquo;Teach me.&rdquo;
                </p>
                <div className="mt-4">
                  <ReaderDoorway />
                </div>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <CoursePlayer />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule />

        {/* ── WING 02 · LIVE FIRE — the decision simulator ─────────────── */}
        <section id="live-fire" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <WingHeader index={2} hex={mag} mode="Simulate" eyebrow="live fire" title="Decide blind. Get graded on the decision.">
                <AcademyLiveFireBody />
              </WingHeader>
            </Reveal>
            <Reveal delay={120}>
              <div className="mx-auto mt-8 max-w-3xl">
                <AcademySimulator />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule />

        {/* ── WING 03 · BEAT THE CLOSE — the arcade ────────────────────── */}
        <section id="beat-the-close" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <WingHeader index={3} hex={uv} mode="Arcade" eyebrow="the arcade" title="Beat the Close.">
                <AcademyBeatTheCloseBody />
              </WingHeader>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <BeatTheClose />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule />

        {/* ── WING 04 · FILM ROOM — in production, honestly ────────────── */}
        <section id="film-room" className="scroll-mt-28 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <WingHeader index={4} hex="#8b93a8" mode="Watch" eyebrow="film room" title="The filmed curriculum — in production.">
                <p className="mt-3 max-w-2xl text-ink-300">
                  Six episodes pairing with the course floor — the real production order, no
                  placeholders. Every lesson is already trainable above.
                </p>
              </WingHeader>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <FilmRoom />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule />

        {/* GM Academy + closing note */}
        <section className="px-4 pb-24 pt-16 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm leading-relaxed text-ink-500">
                Training content is illustrative and educational. Every floor rewards calibration
                and restraint, never streaks — the same standard the engine holds itself to.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/fantasy/academy" className="btn btn-ghost">GM Academy — fantasy drills</Link>
                <Link href="/intelligence" className="btn btn-ghost">Inside the engine</Link>
                <Link href="/parlay-mri" className="btn btn-ghost">Parlay MRI</Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
