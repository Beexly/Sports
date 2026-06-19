import Link from "next/link";
import {
  AUTONOMY_MAP,
  summarizeAutonomy,
  entriesByLevel,
  type AutonomyEntry,
  type AutonomyLevel,
} from "@/lib/autonomy/autonomy-map";

/**
 * Cockpit · Autonomy Map (what runs itself).
 *
 * Read-only. The honest answer to "is this system running itself?" — every
 * recurring operation and gated lever, classified into self-driving vs. the few
 * owner-parked decisions and one-time activation steps. Nothing here executes or
 * changes anything; it reports the autonomy posture defined in autonomy-map.ts.
 */
export const dynamic = "force-dynamic";

const LEVEL_META: Readonly<
  Record<AutonomyLevel, { label: string; styles: string; blurb: string }>
> = {
  autonomous: {
    label: "Runs itself",
    styles: "border-emerald-500/30 bg-emerald-950/40 text-emerald-200",
    blurb: "Self-driving on a schedule or on demand — no owner input.",
  },
  autonomous_within_budget: {
    label: "Self-driving · budgeted",
    styles: "border-sky-500/30 bg-sky-950/40 text-sky-200",
    blurb: "Runs itself inside a hard resource/cost budget that can throttle it to zero.",
  },
  owner_parked: {
    label: "Owner lever",
    styles: "border-yellow-500/30 bg-yellow-950/40 text-yellow-200",
    blurb: "Deliberately waits for you — money-out, publish, model change, or legal weight.",
  },
  owner_activation: {
    label: "One-time setup",
    styles: "border-violet-500/30 bg-violet-950/40 text-violet-200",
    blurb: "A single step to go live. Once done, the loop self-runs.",
  },
};

const LEVEL_ORDER: readonly AutonomyLevel[] = [
  "autonomous",
  "autonomous_within_budget",
  "owner_parked",
  "owner_activation",
];

export default function CockpitAutonomyPage(): JSX.Element {
  const summary = summarizeAutonomy();
  const sharePct = Math.round(summary.recurringAutonomyShare * 100);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-yellow-300">
              Autonomous Operating System
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Autonomy Map</h1>
          </div>
          <Link
            href="/cockpit"
            className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-xs text-ink-300 hover:bg-white/[0.03]"
          >
            Back to Jarvis
          </Link>
        </div>
        <p className="max-w-3xl text-sm text-ink-400">
          What the platform runs by itself, and the few levers it parks for you. This is a
          read-only map — <span className="text-ink-200">nothing here executes anything.</span>{" "}
          Parked items are parked <span className="text-ink-200">by design</span>: each names the
          guardrail that holds it (a MODEL_VERSION bump, the Spend Governor, the human-gated publish
          switch). Autonomy never means bypassing those bars.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Recurring ops self-driving" value={`${sharePct}%`} tone="good" />
        <Metric label="Runs itself" value={String(summary.autonomous)} tone="good" />
        <Metric label="Owner levers" value={String(summary.ownerParked)} tone="warn" />
        <Metric label="One-time setup" value={String(summary.ownerActivation)} />
      </section>

      {LEVEL_ORDER.map((level) => {
        const entries = entriesByLevel(level);
        if (entries.length === 0) return null;
        const meta = LEVEL_META[level];
        return (
          <section key={level} className="rounded-lg border border-white/[0.06] bg-obsidian/60">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">{meta.label}</h2>
                <p className="mt-0.5 text-xs text-ink-500">{meta.blurb}</p>
              </div>
              <span
                className={`rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${meta.styles}`}
              >
                {entries.length}
              </span>
            </div>
            <div className="divide-y divide-titanium/30">
              {entries.map((e) => (
                <AutonomyRow key={e.id} entry={e} levelStyles={meta.styles} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="text-[11px] text-ink-600">
        Source of truth: <code className="font-mono">lib/autonomy/autonomy-map.ts</code>. A test
        asserts the money-out / publish / model-change levers can never silently be reclassified as
        self-driving. The total map has {AUTONOMY_MAP.length} entries.
      </p>
    </div>
  );
}

function AutonomyRow({
  entry,
  levelStyles,
}: {
  entry: AutonomyEntry;
  levelStyles: string;
}): JSX.Element {
  return (
    <div className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">{entry.name}</span>
            <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-400">
              {entry.domain}
            </span>
            <span className="rounded-md border border-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-500">
              {entry.cadence}
            </span>
          </div>
          <p className="mt-1.5 max-w-3xl text-xs text-ink-300">{entry.what}</p>
          <p className="mt-1 max-w-3xl text-[11px] text-ink-500">
            <span className="font-semibold text-ink-400">Guard:</span> {entry.gate}
          </p>
          <p className="mt-1 font-mono text-[10px] text-ink-600">{entry.ref}</p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${levelStyles}`}
        >
          {LEVEL_META[entry.level].label}
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn";
}): JSX.Element {
  const valueClass =
    tone === "good" ? "text-emerald-200" : tone === "warn" ? "text-yellow-200" : "text-white";
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
