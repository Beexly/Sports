/**
 * Cockpit · Live Command Center — the flagship "watch it happen" surface.
 *
 * Admin-only by virtue of the cockpit layout's ADMIN gate; INTERNAL, not public.
 * A cinematic, motion-rich, auto-refreshing console: the company-health hero,
 * Ask Jarvis front-and-center (voice-capable), the live vital gauges, the agent-
 * activity theater, the signals ticker, the agent fleet, and the multi-provider
 * model pool.
 *
 * HONESTY (non-negotiable):
 * - Every figure is REAL or an explicit honest "—" / empty state. No fabricated
 *   activity, metrics, or motion-as-data.
 * - loadDailyCommand() and loadGoLiveReadiness() are never-throw, read-only
 *   loaders; this page composes their output and adds no new source of truth.
 * - The model pool reports env-var PRESENCE only — never a key value.
 * - JarvisChat is advisory-only: it triggers no transitions, publishing, or spend.
 */

import Link from "next/link";
import { JarvisChat } from "@/components/cockpit/jarvis-chat";
import { loadDailyCommand } from "@/lib/cockpit/daily-command/loader";
import { loadGoLiveReadiness } from "@/lib/go-live/readiness";
import { buildJarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";
import { summarizeAgentHealth } from "@/lib/agents/agent-health";
import { Reveal } from "@/components/motion/reveal";
import { LiveHero } from "@/components/cockpit/live/hero";
import { LivePulse } from "@/components/cockpit/live/live-pulse";
import { VitalGauges } from "@/components/cockpit/live/vital-gauges";
import { AgentTheater } from "@/components/cockpit/live/agent-theater";
import { SignalsTicker } from "@/components/cockpit/live/signals-ticker";
import { AgentFleet } from "@/components/cockpit/live/agent-fleet";
import { ModelPool } from "@/components/cockpit/live/model-pool";
import { JarvisStatusVoice } from "@/components/cockpit/live/jarvis-status-voice";

export const dynamic = "force-dynamic";

export default async function CockpitLivePage(): Promise<JSX.Element> {
  // Never-throw, read-only loaders. The page renders even if a loader degrades.
  const [command, readiness] = await Promise.all([
    loadDailyCommand(),
    loadGoLiveReadiness(),
  ]);
  const assessment = buildJarvisOperatingAssessment();
  const agentHealth = summarizeAgentHealth();

  const readinessOpen = readiness.readyCount;
  const readinessTotal = readiness.totalCount;

  // The theater streams the Agent-Activity + Approval-Queue lanes; the ticker
  // takes the Signals lane. All come straight from loadDailyCommand().
  const theaterLanes = command.lanes.filter(
    (l) => l.key === "agent_activity" || l.key === "approval_queue"
  );
  const signalsLane = command.lanes.find((l) => l.key === "signals");

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header strip ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Command · Live
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Live Command Center</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            ← Back to Overview
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          The operation, running — Jarvis, gauges, agents, signals. Cinematic but honest: every
          figure is real or shown as an explicit &ldquo;—&rdquo;. This deck auto-refreshes so the
          loaders re-run and the stream re-renders.
        </p>
        <LivePulse generatedAtIso={command.generatedAt} />
      </header>

      {/* ── 0. Hear it — one tap and Jarvis reads the live status aloud ──── */}
      <JarvisStatusVoice
        health={assessment.companyHealth}
        ownerDecisionCount={assessment.ownerDecisions.length}
        staleWarningCount={assessment.staleDataWarnings.length}
        nextBestAction={assessment.nextBestAction}
      />

      {/* ── 1. Hero — company-health posture + counts + next action ──────── */}
      <Reveal direction="up">
        <LiveHero
          assessment={assessment}
          agentCount={agentHealth.total}
          readinessOpen={readinessOpen}
          readinessTotal={readinessTotal}
        />
      </Reveal>

      {/* ── 2. Talk to Jarvis — front and center ─────────────────────────── */}
      <Reveal direction="up">
        <section aria-label="Ask Jarvis" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">
              Ask Jarvis — out loud if you want
            </h2>
            <p className="text-[11px] text-ink-500">
              Grounded in live state · advisory only · takes no actions
            </p>
          </div>
          <JarvisChat />
        </section>
      </Reveal>

      {/* ── 3. Vital gauges row ──────────────────────────────────────────── */}
      <Reveal direction="up">
        <section aria-label="Vital gauges" className="flex flex-col gap-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">Vitals</h2>
          <VitalGauges
            readinessOpen={readinessOpen}
            readinessTotal={readinessTotal}
            signalGauges={command.signalGauges}
          />
        </section>
      </Reveal>

      {/* ── 4. Live agent-activity theater ───────────────────────────────── */}
      <section aria-label="Agent activity theater" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white">
            Agent activity — live stream
          </h2>
          <p className="text-[11px] text-ink-500">{command.headline}</p>
        </div>
        <AgentTheater lanes={theaterLanes} />
      </section>

      {/* ── 5. Signals ticker ────────────────────────────────────────────── */}
      <section aria-label="Signals ticker" className="flex flex-col gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Signals</h2>
        <SignalsTicker lane={signalsLane} />
      </section>

      {/* ── 6. Agent fleet ───────────────────────────────────────────────── */}
      <Reveal direction="up">
        <section aria-label="Agent fleet" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Agent fleet</h2>
            <p className="text-[11px] text-ink-500">
              {agentHealth.total} roles · {agentHealth.operationalCapacity} running processes ·
              roles, not always-on bots
            </p>
          </div>
          <AgentFleet />
        </section>
      </Reveal>

      {/* ── 7. Model-pool status strip ───────────────────────────────────── */}
      <Reveal direction="up">
        <ModelPool />
      </Reveal>

      <p className="text-[11px] text-ink-600">
        Internal operator surface — admin-gated, display-only. No fabricated numbers or activity:
        every figure is read from a never-throw loader or shown as an explicit empty state. The model
        pool reports env-var presence only, never any key value. Ask Jarvis is advisory and takes no
        actions.
      </p>
    </div>
  );
}
