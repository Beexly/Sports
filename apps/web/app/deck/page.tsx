import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { AgentFleetLazy } from "@/components/hero/agent-fleet-lazy";
import { VoiceWaveform } from "@/components/motion/voice-waveform";
import { HealthRing } from "@/components/motion/health-ring";
import { SignalDecode } from "@/components/motion/signal-decode";
import { SignalSpine } from "@/components/motion/signal-spine";
import { SentientWeather } from "@/components/motion/sentient-weather";
import { getPlate } from "@/lib/visual-production/asset-manifest";

export const metadata: Metadata = {
  title: "The Command Deck",
  description:
    "A single operator's intelligence command deck — the owner watching an entire company run itself. Galaxy Sports Edge.",
  alternates: { canonical: "/deck" },
};

const SYSTEMS = [
  { name: "Data Ingestion", status: "live", health: 0.92, detail: "12 intake lanes active" },
  { name: "Consensus Engine", status: "live", health: 0.85, detail: "3 models in agreement" },
  { name: "Board State", status: "live", health: 0.78, detail: "Telemetry streaming" },
  { name: "Media Pipeline", status: "live", health: 0.91, detail: "Airwave processing" },
  { name: "Trust Ledger", status: "live", health: 0.96, detail: "All receipts signed" },
  { name: "No-Bet Gate", status: "standby", health: 1.0, detail: "Gate closed, watching" },
] as const;

const AGENTS = [
  { name: "Board Watcher", role: "Signal detection", state: "scanning" },
  { name: "Trend Miner", role: "Pattern extraction", state: "mining" },
  { name: "Context Scout", role: "Intake validation", state: "alert", alert: "Source lag detected" },
  { name: "Parlay MRI", role: "Risk analysis", state: "idle" },
  { name: "Beat Grader", role: "Media scoring", state: "processing" },
  { name: "Autopsy Bot", role: "Post-settlement review", state: "idle" },
  { name: "CLV Tracker", role: "Line value monitoring", state: "tracking" },
  { name: "Gate Keeper", role: "No-bet arbitration", state: "standing" },
] as const;

export default function DeckPage(): JSX.Element {
  const plate = getPlate("command-deck");
  const jarvisPlate = getPlate("jarvis-speaking");

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-carbon text-ion">
      <SentientWeather state="active" intensity={0.7} />
      <Nav />
      <SignalSpine />

      {/* ── HERO: The Command Deck ──────────────────────────────────────── */}
      <section className="relative isolate flex min-h-screen items-center overflow-hidden border-b border-mineral">
        {plate && (
          <GeneratedPlate
            className="opacity-90"
            gradient={plate.gradient}
            still={plate.still}
            motion={plate.motion}
          />
        )}
        {/* Agent fleet overlay */}
        <div aria-hidden className="absolute inset-0 z-10 opacity-60">
          <AgentFleetLazy />
        </div>
        {/* Vignette */}
        <div
          aria-hidden
          className="absolute inset-0 z-20"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 40%, transparent 40%, rgba(5,6,8,0.8) 100%)",
          }}
        />
        {/* Content */}
        <div className="relative z-30 mx-auto w-full max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
              <SignalDecode speed={22}>Galaxy Sports Edge · Command Deck</SignalDecode>
            </p>
            <h1 className="mt-6 font-display text-display-xl font-semibold leading-[1.0] text-balance text-ion-white">
              The room where{" "}
              <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                everything
              </span>{" "}
              runs itself.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ion-1">
              A single operator's intelligence command deck. The company breathes
              here — every agent, every signal, every decision. You don't manage
              the noise. You watch the machine manage it.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/board" className="btn-primary min-h-11 px-5 py-3">
                Enter the board
              </Link>
              <Link
                href="#systems"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-mineral px-5 py-3 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white"
              >
                System status
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SYSTEMS HEALTH ─────────────────────────────────────────── */}
      <section id="systems" className="relative border-b border-mineral px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            {/* Health ring */}
            <div className="flex flex-col items-center justify-center">
              <HealthRing size={260} health={0.87} />
              <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">
                Overall system health
              </p>
            </div>

            {/* System grid */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                Active systems
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-ion-white">
                Every engine, accountable.
              </h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {SYSTEMS.map((sys) => (
                  <div
                    key={sys.name}
                    className="rounded-ds-md border border-mineral bg-eclipse p-4 transition-colors hover:border-mineral-hi"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ion-white">{sys.name}</p>
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: sys.status === "live" ? "#00E5FF" : "#FFB454",
                          boxShadow:
                            sys.status === "live"
                              ? "0 0 8px 2px rgba(0,229,255,0.5)"
                              : "0 0 8px 2px rgba(255,180,84,0.4)",
                        }}
                      />
                    </div>
                    <p className="mt-1 text-sm text-ion-1">{sys.detail}</p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-carbon">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${sys.health * 100}%`,
                          background:
                            sys.health > 0.9
                              ? "#00E5FF"
                              : sys.health > 0.75
                                ? "#7A5CFF"
                                : "#FF2DD6",
                          boxShadow: `0 0 8px ${sys.health > 0.9 ? "rgba(0,229,255,0.4)" : sys.health > 0.75 ? "rgba(122,92,255,0.4)" : "rgba(255,45,214,0.4)"}`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── JARVIS IS SPEAKING ──────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden border-b border-mineral px-4 py-24 sm:px-6 lg:px-8">
        {jarvisPlate && (
          <GeneratedPlate
            className="opacity-80"
            gradient={jarvisPlate.gradient}
            still={jarvisPlate.still}
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 60% 50%, transparent 30%, rgba(5,6,8,0.85) 100%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
                <SignalDecode speed={18} delay={200}>Intelligence presence · active</SignalDecode>
              </p>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-ion-white sm:text-5xl">
                Jarvis is{" "}
                <span className="gse-editorial text-orbital-cyan gw-text-glow-cyan">
                  speaking
                </span>
                .
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-ion-1">
                The intelligence doesn't just process — it communicates. Every
                signal is narrated, every contradiction explained, every gate
                decision reasoned. You don't read a dashboard. You have a
                conversation with the system.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/the-beat" className="btn-primary px-5 py-2.5">
                  Hear The Beat
                </Link>
                <Link
                  href="/intelligence"
                  className="inline-flex items-center gap-2 rounded-xl border border-mineral px-5 py-2.5 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white"
                >
                  Intelligence docs
                </Link>
              </div>
            </div>
            <div className="relative h-80 lg:h-96">
              <VoiceWaveform className="absolute inset-0" />
            </div>
          </div>
        </div>
      </section>

      {/* ── AGENT FLEET ────────────────────────────────────────────── */}
      <section className="border-b border-mineral px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
            Agent constellation
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-ion-white">
            A fleet of agents, not a monolith.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-ion-1">
            Each agent has a role, a state, and a heartbeat. They orbit the core,
            signal when they need attention, and rest when the work is done.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTS.map((agent) => (
              <div
                key={agent.name}
                className="group relative overflow-hidden rounded-ds-md border border-mineral bg-eclipse p-4 transition-all duration-300 hover:border-orbital-cyan/40"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ion-white">{agent.name}</p>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        agent.state === "alert"
                          ? "#FF2DD6"
                          : agent.state === "idle"
                            ? "#7A5CFF"
                            : "#00E5FF",
                      boxShadow:
                        agent.state === "alert"
                          ? "0 0 8px 2px rgba(255,45,214,0.5)"
                          : agent.state === "idle"
                            ? "0 0 6px 1px rgba(122,92,255,0.3)"
                            : "0 0 8px 2px rgba(0,229,255,0.4)",
                      animation:
                        agent.state === "alert"
                          ? "pp-live-pulse 1.5s ease-in-out infinite"
                          : agent.state === "processing"
                            ? "pp-live-pulse 3s ease-in-out infinite"
                            : "none",
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-ion-1">{agent.role}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-ion-2">
                  {agent.state}
                </p>
                {agent.alert && (
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-plasma">
                    {agent.alert}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RETURN ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center">
          <p className="font-display text-2xl font-semibold text-ion-white">
            The deck is always on.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary px-5 py-2.5">
              Return to Observatory
            </Link>
            <Link
              href="/board"
              className="inline-flex items-center gap-2 rounded-xl border border-mineral px-5 py-2.5 text-sm font-semibold text-ion-1 transition-colors hover:border-orbital-cyan hover:text-ion-white"
            >
              Today's board
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
