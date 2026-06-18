/**
 * LiveHero — the cinematic top of the Live Command Center.
 *
 * A big animated company-health RingGauge, a CountUp of the live agent-role
 * count, the honest launch posture, and the single next-best-action — all on a
 * gw-nebula-deep canvas with a drifting starfield.
 *
 * HONESTY: the health ring is NOT a fabricated score. It is a coarse posture
 * reading derived from the real operating assessment's companyHealth
 * ("CRITICAL" | "CAUTION" | "UNKNOWN") and labeled as a posture, not a metric.
 * The agent count is the real registry size. The next-best-action is the
 * assessment's own string. Nothing here invents a number.
 */

import { CountUp } from "@/components/ui/count-up";
import { RingGauge } from "@/components/ui/ring-gauge";
import type { JarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";

interface LiveHeroProps {
  readonly assessment: JarvisOperatingAssessment;
  readonly agentCount: number;
  readonly readinessOpen: number;
  readonly readinessTotal: number;
}

const HEALTH_META: Record<
  JarvisOperatingAssessment["companyHealth"],
  { label: string; color: string; posture: number }
> = {
  // posture is a coarse arc fill for the ring — a visual posture, NOT a metric.
  CRITICAL: { label: "Critical", color: "#fb7185", posture: 30 },
  CAUTION: { label: "Holding", color: "#fbbf24", posture: 62 },
  UNKNOWN: { label: "Unknown", color: "#7a5cff", posture: 50 },
};

export function LiveHero({ assessment, agentCount, readinessOpen, readinessTotal }: LiveHeroProps) {
  const meta = HEALTH_META[assessment.companyHealth];

  return (
    <section className="gw-nebula-deep relative overflow-hidden rounded-3xl border border-white/[0.08] shadow-2xl shadow-black/40">
      <div className="gw-starfield" aria-hidden />
      <div className="relative flex flex-col gap-6 px-6 py-7 sm:flex-row sm:items-center sm:gap-10">
        {/* Company-health posture ring */}
        <div className="flex shrink-0 flex-col items-center gap-2">
          <RingGauge
            value={meta.posture}
            display={meta.label}
            caption="Company posture"
            color={meta.color}
            size={156}
          />
          <span className="rounded-full border border-white/[0.10] bg-obsidian/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink-500">
            posture, not a score
          </span>
        </div>

        {/* Headline + counts + next action */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent-300">
            Galaxy Sports Edge · Live Command Center
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
            Watch the operation run.
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div>
              <p className="font-display text-3xl font-bold tabular-nums text-white">
                <CountUp value={agentCount} durationMs={1100} />
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                agent roles · governed
              </p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold tabular-nums text-white">
                <CountUp value={readinessOpen} durationMs={1100} />
                <span className="text-lg font-normal text-ink-500">/{readinessTotal}</span>
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-ink-500">
                readiness gates open
              </p>
            </div>
          </div>

          {/* Single next-best-action — the one thing to do next. */}
          <div className="mt-5 rounded-xl border border-accent-500/30 bg-accent-950/20 px-4 py-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-accent-300">
              Next best action
            </p>
            <p className="mt-1 text-sm leading-relaxed text-white/95">{assessment.nextBestAction}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
