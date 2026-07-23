import Link from "next/link";
import { loadCommandCenterFeed } from "@/lib/command-center/feed";
import type {
  AttentionUrgency,
  CommandCenterFeed,
  CommandCenterLane,
  DataMode,
  OwnerAttentionItem,
} from "@/lib/command-center/types";

/**
 * Cockpit → Command Center.
 *
 * One ranked owner-attention queue + operating narrative, composed from the
 * live Jarvis + Owner Summary synthesis. A dashboard reports; a command center
 * directs — this surface answers "what should I look at first, and why."
 *
 * Honesty markers (pinned by tests):
 *   - data-testid="command-center-page"
 *   - data-testid="owner-attention-queue"
 *   - data-testid="operating-narrative"
 *   - data-testid="command-center-lanes"
 *   - the noFakeLiveData badge is always rendered
 */
export const dynamic = "force-dynamic";

const URGENCY_STYLES: Record<AttentionUrgency, string> = {
  CRITICAL: "bg-alert/50 text-alert border-alert/60",
  HIGH: "bg-caution/50 text-caution border-caution/50",
  NORMAL: "bg-obsidian/70 text-ion-2 border-titanium/40",
  LOW: "bg-obsidian/50 text-ion-3 border-titanium/30",
};

const DATA_MODE_STYLES: Record<DataMode, string> = {
  live: "border-accent-800/50 bg-accent-950/30 text-accent-400",
  labeled_fallback: "border-caution/50 bg-caution/20 text-caution",
  unavailable: "border-alert/60 bg-alert/20 text-alert",
};

export default async function CommandCenterPage() {
  const feed = await loadCommandCenterFeed();

  const shell =
    feed.overallColor === "RED"
      ? "border-alert/60 shadow-glow-plasma"
      : feed.overallColor === "GREEN"
        ? "border-accent-900/40"
        : "border-titanium/60";

  return (
    <div data-testid="command-center-page" className="flex flex-col gap-4 pb-8">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className={["relative overflow-hidden rounded-3xl border bg-carbon/90 px-6 py-5 shadow-2xl shadow-black/30", shell].join(" ")}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="relative h-2 w-2">
              <span className="absolute inset-0 animate-live-pulse rounded-full bg-accent-500" />
              <span className="absolute inset-0 rounded-full bg-accent-500" />
            </span>
            <h1 className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">
              Command Center · ranked owner attention
            </h1>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span
              data-testid="no-fake-live-data-badge"
              className="rounded border border-accent-800/40 bg-accent-950/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-accent-400"
              title="The feed never presents fallback or sample content as live data."
            >
              noFakeLiveData
            </span>
            <span className="rounded bg-obsidian/80 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ion-2">
              feed: {feed.dataMode.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
              Jarvis {feed.jarvisVersion}
            </span>
          </div>
        </div>

        <p className="text-xl font-medium leading-snug text-ion-white/95 sm:text-2xl">
          {feed.headline}
        </p>

        <div data-testid="attention-counts" className="mt-5 grid grid-cols-2 gap-3 border-t border-titanium/30 pt-5 sm:grid-cols-4">
          <CountCell label="Critical" value={feed.counts.critical} accent="red" />
          <CountCell label="High" value={feed.counts.high} accent="amber" />
          <CountCell label="Normal" value={feed.counts.normal} />
          <CountCell label="Low / FYI" value={feed.counts.low} />
        </div>
      </header>

      {/* ── Always-on health / telemetry strip ─────────────────────────────
           A Grafana-style strip that is ALWAYS visible (even on the all-clear
           path), built only from signals the feed already computes: overall
           posture, the feed-level data mode, and each source lane's honest
           data-mode + item count. No new data source — these are the same
           readiness/source-health signals the lanes section renders in full
           below; the strip just keeps them glanceable at the top. */}
      <HealthStrip feed={feed} />

      {!feed.success && feed.error && (
        <section className="rounded-xl border border-alert bg-alert/30 p-4 text-sm text-alert">
          <p className="font-semibold">Synthesis unavailable.</p>
          <p className="mt-1 text-alert/80">{feed.error}</p>
          <p className="mt-2 text-xs text-alert/60">
            The surface still renders. Check the DB connection and worker logs.
          </p>
        </section>
      )}

      {/* ── Operating narrative ───────────────────────────────────────── */}
      <section data-testid="operating-narrative" className="rounded-2xl border border-titanium/40 bg-carbon/80 p-5">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-ion-2">
          Operating narrative
        </h2>
        <p className="mb-4 text-sm text-ion-white/90">{feed.narrative.headline}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <NarrativeBlock title="What changed" items={feed.narrative.whatChanged} tone="neutral" />
          <NarrativeBlock title="What's blocked" items={feed.narrative.whatsBlocked} tone="red" />
          <NarrativeBlock title="Needs you" items={feed.narrative.needsYou} tone="amber" />
          <NarrativeBlock title="Can wait" items={feed.narrative.canWait} tone="neutral" />
          {feed.narrative.canIgnore.length > 0 && (
            <NarrativeBlock title="Can ignore (FYI)" items={feed.narrative.canIgnore} tone="dim" />
          )}
        </div>
      </section>

      {/* ── Ranked attention queue ────────────────────────────────────── */}
      <section data-testid="owner-attention-queue" className="rounded-2xl border border-titanium/40 bg-carbon/80">
        <div className="flex items-center justify-between border-b border-titanium/30 px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-ion-2">
            Owner attention — ranked
          </h2>
          <span className="font-mono text-[10px] text-ion-3">
            {feed.counts.attentionTotal} item{feed.counts.attentionTotal === 1 ? "" : "s"}
          </span>
        </div>
        {feed.attention.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ion-3">
            Queue clear — no decisions are waiting. Hold the cadence.
          </p>
        ) : (
          <ol className="divide-y divide-titanium/20">
            {feed.attention.map((item) => (
              <AttentionRow key={item.id} item={item} />
            ))}
          </ol>
        )}
      </section>

      {/* ── Source lanes (honesty contract) ───────────────────────────── */}
      <section data-testid="command-center-lanes" className="rounded-2xl border border-titanium/40 bg-carbon/80 p-5">
        <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-ion-2">
          Source lanes
        </h2>
        <p className="mb-4 text-[11px] text-ion-3">
          Every lane declares how its data was sourced. Fallbacks are labeled — never shown as live.
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {feed.lanes.map((lane) => (
            <LaneCard key={lane.key} lane={lane} />
          ))}
        </div>
      </section>

      <p data-testid="command-center-generated-at" className="text-[10px] uppercase tracking-widest text-ion-3">
        Generated {new Date(feed.generatedAt).toLocaleString()} · Jarvis {feed.jarvisVersion} ·{" "}
        <Link href="/cockpit/command-center" prefetch={false} className="text-brand-400 hover:text-brand-300">
          refresh
        </Link>
      </p>

      <nav aria-label="Command center cross-links" className="flex flex-wrap gap-2 text-xs">
        <Link href="/cockpit" className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60">
          ← Cockpit overview
        </Link>
        <Link href="/cockpit/tasks" className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60">
          Tasks →
        </Link>
        <Link href="/cockpit/calibration" className="rounded-lg border border-titanium/40 px-3 py-2 text-ion-2 hover:border-titanium/70 hover:bg-carbon/60">
          Calibration →
        </Link>
      </nav>
    </div>
  );
}

function CountCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "red" | "amber";
}) {
  const valueClass =
    accent === "red" && value > 0
      ? "text-alert"
      : accent === "amber" && value > 0
        ? "text-caution"
        : "text-ion-white";
  return (
    <div className="rounded-2xl border border-titanium/40 bg-obsidian/40 p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ion-3">{label}</p>
      <p className={["mt-1 font-mono text-2xl font-semibold tabular-nums", valueClass].join(" ")}>
        {value}
      </p>
    </div>
  );
}

/** Brand-tone color for a health state. */
type HealthTone = "good" | "warn" | "bad" | "neutral";

const HEALTH_TONE_STYLES: Record<HealthTone, string> = {
  good: "border-accent-800/50 bg-accent-950/20 text-accent-400",
  warn: "border-caution/50 bg-caution/20 text-caution",
  bad: "border-alert/60 bg-alert/20 text-alert",
  neutral: "border-titanium/40 bg-obsidian/50 text-ion-2",
};

/** Map a lane's honest data mode to a brand-tone health state. */
function dataModeTone(mode: DataMode): HealthTone {
  return mode === "live" ? "good" : mode === "labeled_fallback" ? "warn" : "bad";
}

function HealthChip({
  label,
  state,
  tone,
  detail,
}: {
  label: string;
  state: string;
  tone: HealthTone;
  detail?: string;
}) {
  return (
    <div
      role="status"
      aria-label={`${label}: ${state}`}
      className={["rounded-xl border px-3 py-2", HEALTH_TONE_STYLES[tone]].join(" ")}
    >
      <p className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] opacity-80">
        {label}
      </p>
      <p className="mt-1 font-mono text-[11px] font-semibold uppercase tracking-widest">
        {state}
      </p>
      {detail && <p className="mt-0.5 text-[9px] leading-snug opacity-70">{detail}</p>}
    </div>
  );
}

/**
 * Always-on health/telemetry strip — Grafana-style at-a-glance state, composed
 * only from signals the feed already produces. Never fabricates: the lane tiles
 * inherit each lane's declared data mode (live / labeled fallback / unavailable),
 * so a fallback strip reads honestly amber/red rather than fake-green.
 */
function HealthStrip({ feed }: { feed: CommandCenterFeed }) {
  const postureTone: HealthTone =
    feed.overallColor === "GREEN" ? "good" : feed.overallColor === "RED" ? "bad" : "warn";
  const feedModeTone: HealthTone =
    feed.dataMode === "live" ? "good" : feed.dataMode === "unavailable" ? "bad" : "warn";

  return (
    <section
      data-testid="command-center-health-strip"
      aria-label="System health telemetry"
      className="rounded-2xl border border-titanium/40 bg-carbon/80 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-ion-2">
          System health · always-on
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-widest text-ion-3">
          Jarvis {feed.jarvisVersion}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        <HealthChip
          label="Posture"
          state={feed.overallColor}
          tone={postureTone}
        />
        <HealthChip
          label="Feed mode"
          state={feed.dataMode.replace(/_/g, " ")}
          tone={feedModeTone}
        />
        {feed.lanes.map((lane) => (
          <HealthChip
            key={lane.key}
            label={lane.label}
            state={lane.dataMode.replace(/_/g, " ")}
            tone={dataModeTone(lane.dataMode)}
            detail={`${lane.itemCount} item${lane.itemCount === 1 ? "" : "s"}`}
          />
        ))}
      </div>
    </section>
  );
}

function NarrativeBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: readonly string[];
  tone: "neutral" | "red" | "amber" | "dim";
}) {
  const titleClass =
    tone === "red"
      ? "text-alert"
      : tone === "amber"
        ? "text-caution"
        : tone === "dim"
          ? "text-ion-3"
          : "text-ion-2";
  return (
    <div className="rounded-xl border border-titanium/40 bg-obsidian/40 p-3">
      <p className={["mb-2 text-[10px] font-bold uppercase tracking-widest", titleClass].join(" ")}>
        {title}
      </p>
      <ul className="space-y-1 text-[12px] leading-snug text-ion-1">
        {items.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-ion-3/50" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AttentionRow({ item }: { item: OwnerAttentionItem }) {
  const body = (
    <div className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-titanium/10">
      <span
        className={[
          "mt-0.5 flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
          URGENCY_STYLES[item.urgency],
        ].join(" ")}
      >
        {item.urgency}
      </span>
      <span className="mt-0.5 hidden w-14 flex-shrink-0 font-mono text-sm tabular-nums text-ion-white sm:block">
        {item.score}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ion-white">
          {item.title}
          <span className="rounded bg-obsidian/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ion-3">
            {item.decisionType.replace(/_/g, " ").toLowerCase()}
          </span>
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-ion-2">{item.detail}</p>
        <p className="mt-1 text-[11px] text-ion-3">
          <span className="text-ion-2">Do:</span> {item.recommendedAction}
        </p>
        <p className="mt-0.5 text-[10px] text-ion-3/70">{item.scoreExplanation}</p>
      </div>
      {item.link && (
        <span className="mt-0.5 flex-shrink-0 self-center text-[11px] text-ion-3/40">→</span>
      )}
    </div>
  );

  if (item.link) {
    return (
      <li>
        <Link href={item.link} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function LaneCard({ lane }: { lane: CommandCenterLane }) {
  return (
    <div className="rounded-xl border border-titanium/40 bg-obsidian/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-ion-1">{lane.label}</p>
        <span
          className={[
            "rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest",
            DATA_MODE_STYLES[lane.dataMode],
          ].join(" ")}
        >
          {lane.dataMode.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-ion-white">
        {lane.itemCount}
      </p>
      {lane.fallbackReason && (
        <p className="mt-1 text-[10px] leading-snug text-caution/80">{lane.fallbackReason}</p>
      )}
    </div>
  );
}
