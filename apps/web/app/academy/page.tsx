import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Reveal } from "@/components/motion/reveal";
import { Atmosphere } from "@/components/ui/atmosphere";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { AcademySimulator } from "@/components/academy/academy-simulator";
import { AcademyProgress } from "@/components/academy/academy-progress";
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
  title: "The Academy — Tracks, Live Fire, and Beat the Close",
  description:
    "A real curriculum: tracks and modules with saved progress and mastery, interactive courses with graded quizzes, a live-fire decision simulator, the Beat the Close training game, and the GM Academy. Train process, calibration, and restraint.",
  alternates: { canonical: "/academy" },
};

const cyan = BRAND_COLORS.orbitalCyan;
const uv = BRAND_COLORS.softUltraviolet;
const mag = BRAND_COLORS.ionMagenta;

/** The wings of the Academy — every door on this floor is real. */
const WINGS = [
  { id: "courses", label: "Course Floor", desc: "Interactive lessons + graded quizzes", hex: cyan },
  { id: "live-fire", label: "Live Fire", desc: "Decide blind, graded on process", hex: mag },
  { id: "beat-the-close", label: "Beat the Close", desc: "The line-trading arcade", hex: uv },
  { id: "film-room", label: "Film Room", desc: "Filmed lessons — in production", hex: "#8b93a8" },
] as const;

export default function AcademyPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main id="main-content" className="flex-1">
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

            {/* wing map */}
            <Reveal delay={240}>
              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                {WINGS.map((w) => (
                  <HoloTilt key={w.id} className="h-full">
                    <a
                      href={`#${w.id}`}
                      className="group block h-full rounded-xl border p-4"
                      style={{ borderColor: `${w.hex}33`, background: `radial-gradient(100% 100% at 50% 0%, ${w.hex}0d, transparent 75%)` }}
                    >
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: w.hex }}>
                        {w.label}
                      </p>
                      <p className="mt-1.5 text-xs leading-relaxed text-ion-1">{w.desc}</p>
                    </a>
                  </HoloTilt>
                ))}
              </div>
            </Reveal>

            {/* LMS spine — tracks, modules, mastery (saved on-device) */}
            <Reveal delay={300}>
              <div className="mt-8">
                <AcademyProgress />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── COURSE FLOOR — interactive lessons + quizzes ─────────────── */}
        <section id="courses" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: cyan }}>course floor</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Lessons that quiz back.
              </h2>
              <AcademyCourseSectionBody />
            </Reveal>
            <Reveal delay={90}>
              <div className="mt-6 rounded-2xl border border-mineral bg-eclipse/40 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ion-2">
                  How should we explain things?
                </p>
                <p className="mt-1 text-sm text-ion-1">
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

        {/* ── LIVE FIRE — the original simulator ───────────────────────── */}
        <section id="live-fire" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow" style={{ color: mag }}>live fire</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Decide blind. Get graded on the decision.
              </h2>
              <AcademyLiveFireBody />
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <AcademySimulator />
              </div>
            </Reveal>
          </div>
        </section>

        <SignalRule />

        {/* ── BEAT THE CLOSE — the game ────────────────────────────────── */}
        <section id="beat-the-close" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <Reveal>
              <p className="eyebrow" style={{ color: uv }}>the arcade</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Beat the Close.
              </h2>
              <AcademyBeatTheCloseBody />
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <BeatTheClose />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── FILM ROOM — in production, honestly ──────────────────────── */}
        <section id="film-room" className="scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-ion-2">film room</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                The filmed curriculum — in production.
              </h2>
              <p className="mt-3 max-w-2xl text-ion-1">
                Six episodes pairing with the course floor — the real production order, no
                placeholders. Every lesson is already trainable above.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <FilmRoom />
              </div>
            </Reveal>
          </div>
        </section>

        {/* GM Academy + closing note */}
        <section className="px-4 pb-24 pt-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm leading-relaxed text-ion-2">
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
