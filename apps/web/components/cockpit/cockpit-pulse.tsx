import type { JarvisOperatingAssessment } from "@/lib/jarvis/jarvis-operating-assessment";

type AgentReality = {
  readonly operationalCapacity: number;
  readonly draftOnly: number;
  readonly manual: number;
  readonly notWired: number;
};

/**
 * CockpitPulse — the living "command deck" centerpiece.
 *
 * Replaces the blocky runtime zone with a glanceable, breathing read of company
 * state. Every number stays truthful (companyHealth has no "green"; NOT_WIRED is
 * shown as "designed, not capacity"; operational shows the real 0) — the upgrade
 * is purely how it FEELS: a calm pulsing state orb, clean stat tiles, and the
 * owner-decision / Claude-review / risk lanes side by side. Server-safe (CSS-only
 * motion, no hooks).
 */

type Health = JarvisOperatingAssessment["companyHealth"];

const HEALTH: Record<Health, { word: string; read: string; accent: string; glow: string; ring: string; chip: string }> = {
  CRITICAL: {
    word: "Critical",
    read: "Blockers need you first.",
    accent: "#fb7185", // rose-400
    glow: "rgba(244,63,94,0.28)",
    ring: "border-rose-400/40",
    chip: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  },
  CAUTION: {
    word: "Caution",
    read: "Running clean — capacity is still being wired.",
    accent: "#fbbf24", // amber-400
    glow: "rgba(251,191,36,0.22)",
    ring: "border-amber-400/40",
    chip: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  },
  UNKNOWN: {
    word: "Standby",
    read: "Awaiting a live signal.",
    accent: "#22d3ee", // cyan-400 / orbital
    glow: "rgba(34,211,238,0.20)",
    ring: "border-cyan-400/40",
    chip: "border-cyan-400/40 bg-cyan-500/10 text-cyan-200",
  },
};

function PulseStat({ label, value, sub, hot }: { label: string; value: number; sub: string; hot?: boolean }) {
  return (
    <div className="rounded-2xl border border-titanium/40 bg-obsidian/40 p-4 transition-colors hover:border-titanium/70">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">{label}</p>
      <p className={`mt-1 font-mono text-3xl font-semibold tabular-nums ${hot ? "text-amber-300" : "text-ion-white"}`}>{value}</p>
      <p className="mt-0.5 text-[11px] text-ion-3">{sub}</p>
    </div>
  );
}

function Lane({ title, items, empty, dot }: { title: string; items: readonly string[]; empty: string; dot: string }) {
  return (
    <div className="rounded-2xl border border-titanium/40 bg-obsidian/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">{title}</p>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-ion-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
          {items.length}
        </span>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.slice(0, 4).map((item) => (
            <li key={item} className="flex gap-2 text-xs leading-snug text-ion-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: dot }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ion-3">{empty}</p>
      )}
    </div>
  );
}

export function CockpitPulse({
  assessment,
  agentReality,
}: {
  assessment: JarvisOperatingAssessment;
  agentReality: AgentReality;
}) {
  const h = HEALTH[assessment.companyHealth] ?? HEALTH.UNKNOWN;
  const gates: Array<{ k: string; v: string }> = [
    { k: "Public gate", v: assessment.publicGateStatus },
    { k: "Calibration", v: assessment.calibrationStatus },
    { k: "Revenue", v: assessment.revenueStatus },
    { k: "Memory", v: assessment.memoryStatus },
  ];

  return (
    <section
      data-testid="jarvis-operating-runtime"
      className="relative overflow-hidden rounded-3xl border border-titanium/50 bg-eclipse/70 p-6 shadow-2xl shadow-black/30"
    >
      {/* living ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${h.glow}, transparent 70%)` }}
      />

      <div className="relative grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        {/* ── Pulse orb + read ─────────────────────────────── */}
        <div className="flex items-center gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
            <span
              aria-hidden
              className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ background: h.glow, animationDuration: "3.2s" }}
            />
            <span
              aria-hidden
              className="absolute h-14 w-14 rounded-full animate-pulse"
              style={{ background: h.glow, animationDuration: "2.6s" }}
            />
            <span className="relative h-4 w-4 rounded-full" style={{ background: h.accent, boxShadow: `0 0 18px ${h.accent}` }} />
          </div>
          <div>
            <p className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.22em] text-ion-3">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ color: h.accent }} />
              Company pulse
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-ion-white">{h.word}</h2>
            <p className="mt-1 max-w-xs text-sm text-ion-2">{h.read}</p>
            <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${h.chip}`}>
              {assessment.companyHealth}
            </span>
          </div>
        </div>

        {/* ── Capacity reality (honest) ────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PulseStat label="Operational" value={agentReality.operationalCapacity} sub="real / partial" hot={agentReality.operationalCapacity === 0} />
          <PulseStat label="Draft only" value={agentReality.draftOnly} sub="review-gated" />
          <PulseStat label="Manual" value={agentReality.manual} sub="human trigger" />
          <PulseStat label="Not wired" value={agentReality.notWired} sub="designed · not capacity" hot />
        </div>
      </div>

      {/* ── Owner / Claude / risk lanes ──────────────────────── */}
      <div className="relative mt-5 grid gap-4 lg:grid-cols-3">
        <Lane title="Owner decisions" items={assessment.ownerDecisions} empty="No owner decisions queued." dot="#fbbf24" />
        <Lane title="Claude review" items={assessment.claudeReview} empty="No Claude review items queued." dot="#22d3ee" />
        <Lane title="Top risks" items={assessment.topRisks} empty="No critical runtime risks." dot={h.accent} />
      </div>

      {/* ── Next + honest gate strip ─────────────────────────── */}
      <div className="relative mt-5 rounded-2xl border border-titanium/30 bg-obsidian/30 p-4">
        <p className="text-sm text-ion-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-ion-3">Next&nbsp;·&nbsp;</span>
          {assessment.nextBestAction}
        </p>
        <div className="mt-3 grid gap-x-6 gap-y-1.5 text-[11px] text-ion-2 sm:grid-cols-2">
          {gates.map((g) => (
            <p key={g.k}>
              <span className="font-semibold text-ion-white">{g.k}:</span> {g.v}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
