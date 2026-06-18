import Link from "next/link";
import { db } from "@sports/db";
import {
  readMediaControlPlane,
  type MediaLane,
  type MediaLaneStatus,
} from "@/lib/media/control-plane";

export const dynamic = "force-dynamic";

type LegacyMediaItem = {
  readonly id: string;
  readonly briefTitle: string;
  readonly briefBody: string;
  readonly channel: string;
  readonly qaStatus: string;
  readonly complianceStatus: string;
  readonly approved: boolean;
  readonly scheduledFor: Date | null;
  readonly updatedAt: Date;
};

type LegacyMediaResult =
  | { readonly status: "reachable"; readonly rowCount: number; readonly items: readonly LegacyMediaItem[] }
  | { readonly status: "unreachable"; readonly rowCount: "UNKNOWN"; readonly items: readonly LegacyMediaItem[] };

const STATUS_TONE: Record<MediaLaneStatus, string> = {
  ready: "border-emerald-500/30 bg-emerald-950/30 text-emerald-200",
  "draft-only": "border-cyan-500/30 bg-cyan-950/30 text-cyan-200",
  "db-dependent": "border-blue-500/30 bg-blue-950/30 text-blue-200",
  "founder-gated": "border-yellow-500/30 bg-yellow-950/30 text-yellow-200",
  blocked: "border-red-500/30 bg-red-950/30 text-red-200",
  "manual-export": "border-violet-500/30 bg-violet-950/30 text-violet-200",
};

async function loadLegacyMediaItems(): Promise<LegacyMediaResult> {
  try {
    const [rowCount, items] = await Promise.all([
      db.cockpitMediaItem.count(),
      db.cockpitMediaItem.findMany({
        orderBy: [{ updatedAt: "desc" }],
        take: 60,
      }),
    ]);

    return { status: "reachable", rowCount, items };
  } catch {
    return { status: "unreachable", rowCount: "UNKNOWN", items: [] };
  }
}

function statusLabel(status: MediaLaneStatus): string {
  switch (status) {
    case "ready":
      return "ready";
    case "draft-only":
      return "draft only";
    case "db-dependent":
      return "DB dependent";
    case "founder-gated":
      return "founder gated";
    case "blocked":
      return "blocked";
    case "manual-export":
      return "manual export";
  }
}

export default async function CockpitMediaPage(): Promise<JSX.Element> {
  const [control, legacy] = await Promise.all([
    Promise.resolve(readMediaControlPlane(process.env as Record<string, string | undefined>)),
    loadLegacyMediaItems(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-300">
              Media intelligence
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">Media Operating Room</h1>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link href="/api/media/readiness" className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-ink-300 hover:bg-white/[0.03]">
              JSON readiness
            </Link>
            <Link href="/cockpit/airwave" className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-ink-300 hover:bg-white/[0.03]">
              Airwave
            </Link>
            <Link href="/cockpit/studio" className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-ink-300 hover:bg-white/[0.03]">
              Studio
            </Link>
            <Link href="/cockpit/content" className="rounded-lg border border-white/[0.06] px-3 py-1.5 text-ink-300 hover:bg-white/[0.03]">
              Content
            </Link>
          </div>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-ink-400">
          Read-only command view for the full media loop: Airwave context, The Beat source mesh,
          Ava drafts, Studio exports, public blog gating, and the legacy media item queue.
          This page does not publish, post, send, scrape, or generate external side effects.
        </p>
      </header>

      <p
        data-testid="media-no-publish-banner"
        className="rounded-lg border border-yellow-900/40 bg-yellow-950/20 p-4 text-xs leading-relaxed text-yellow-200"
      >
        Draft-only. No auto-publish. No social posting. No user communications. No automated
        betting. `scheduledFor` is metadata only; no worker reads it to publish.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Media lanes" value={String(control.summary.lanes)} detail="Airwave, Beat, Content, Studio, Blog, DB." />
        <Metric label="Draft-only lanes" value={String(control.summary.draftOnly)} detail="Can create review work, not public output." />
        <Metric label="Founder gated" value={String(control.summary.founderGated)} detail="Needs owner/config/legal gate." />
        <Metric label="Public blog" value={control.summary.publicBlogEnabled ? "ON" : "OFF"} detail="Platform readiness gate." />
        <Metric
          label="Legacy DB rows"
          value={legacy.status === "reachable" ? String(legacy.rowCount) : "UNKNOWN"}
          detail={legacy.status === "reachable" ? "Local DB reachable." : "No DB reachable."}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-500">Workflow lanes</h2>
          <div className="mt-4 grid gap-3">
            {control.lanes.map((lane) => (
              <LaneCard key={lane.key} lane={lane} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-500">Template coverage</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Templates" value={String(control.templateSummary.total)} detail="Approved emit shapes." />
              <Metric label="Public default" value={String(control.templateSummary.publicDefault)} detail="Still review-gated." />
              <Metric label="Internal default" value={String(control.templateSummary.internalDefault)} detail="Never public by default." />
              <Metric label="Perf gated" value={String(control.templateSummary.requiresPerformanceGate)} detail="Needs performance gate." />
              <Metric label="RG required" value={String(control.templateSummary.requiresResponsibleGaming)} detail="Responsible-play copy." />
              <Metric label="Disclosure" value={String(control.templateSummary.requiresAffiliateDisclosure)} detail="Promo/affiliate only." />
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-500">Source mesh</h2>
            <dl className="mt-4 grid gap-3 text-sm">
              <Fact label="National insiders seeded" value={String(control.sourceSummary.nationalInsidersSeeded)} />
              <Fact label="Team beat desks" value={String(control.sourceSummary.teamBeatDesks)} />
              <Fact label="Beat source slots" value={String(control.sourceSummary.teamBeatSlots)} />
              <Fact label="Airwave lanes open" value={`${control.sourceSummary.airwaveOpen}/${control.sourceSummary.airwaveLanes}`} />
              <Fact label="Provider slots configured" value={`${control.sourceSummary.configuredProviders}/${control.sourceSummary.totalProviders}`} />
            </dl>
          </section>

          <section className="rounded-2xl border border-red-900/50 bg-red-950/20 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-300">Hard boundary</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-red-100/80">
              <li>No external publishing path from Media.</li>
              <li>No social posting API from Studio.</li>
              <li>No fabricated beat reports or sourced claims.</li>
              <li>No secret values in readiness JSON.</li>
              <li>No public blog while the platform gate is closed.</li>
            </ul>
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-500">
              Legacy media queue
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-400">
              The legacy queue is real only when the local database is reachable. If it is not,
              this surface reports UNKNOWN instead of inventing rows.
            </p>
          </div>
          <span
            data-testid="media-db-status"
            className={legacy.status === "reachable" ? "rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-xs text-emerald-200" : "rounded border border-yellow-500/30 bg-yellow-950/30 px-2 py-1 text-xs text-yellow-200"}
          >
            {legacy.status === "reachable" ? `${legacy.rowCount} rows` : "UNKNOWN (no DB reachable)"}
          </span>
        </div>

        {legacy.status === "unreachable" ? (
          <p
            data-testid="media-empty"
            className="mt-4 rounded-xl border border-white/[0.06] bg-obsidian/70 p-4 text-sm leading-6 text-ink-500"
          >
            Legacy media rows are unavailable because the local/dev database is not reachable.
            The workflow lanes above remain real configuration and code-state, not demo rows.
          </p>
        ) : legacy.items.length === 0 ? (
          <p
            data-testid="media-empty"
            className="mt-4 rounded-xl border border-white/[0.06] bg-obsidian/70 p-4 text-sm leading-6 text-ink-500"
          >
            No legacy media items exist in the local database. This is a real empty queue, not a prompt to seed demo content.
          </p>
        ) : (
          <ul data-testid="media-list" className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {legacy.items.map((item) => (
              <li key={item.id} className="rounded-2xl border border-white/[0.06] bg-obsidian/60 p-4">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{item.briefTitle}</h3>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      channel: <code className="rounded bg-obsidian/70 px-1 text-ink-300">{item.channel}</code>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-semibold text-ink-300">
                      QA: {item.qaStatus}
                    </span>
                    <span className={complianceClass(item.complianceStatus)}>
                      {item.complianceStatus}
                    </span>
                  </div>
                </header>
                <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-400">
                  {item.briefBody}
                </p>
                <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-500">
                  <span>{item.approved ? "Approved / ready for editor" : "Draft / unapproved"}</span>
                  {item.scheduledFor ? <span>scheduled metadata: {item.scheduledFor.toUTCString()}</span> : null}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }): JSX.Element {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-2 font-numerals text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-500">{detail}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-obsidian/70 px-3 py-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-mono text-xs text-ink-300">{value}</dd>
    </div>
  );
}

function LaneCard({ lane }: { lane: MediaLane }): JSX.Element {
  return (
    <article className="rounded-xl border border-white/[0.06] bg-obsidian/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{lane.name}</h3>
          <p className="mt-1 text-xs text-ink-500">{lane.source}</p>
        </div>
        <span className={`rounded border px-2 py-1 text-[11px] ${STATUS_TONE[lane.status]}`}>
          {statusLabel(lane.status)}
        </span>
      </div>
      <dl className="mt-3 grid gap-3 text-xs md:grid-cols-3">
        <div>
          <dt className="text-ink-500">Output</dt>
          <dd className="mt-1 text-ink-300">{lane.output}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Gate</dt>
          <dd className="mt-1 font-mono text-[11px] text-ink-400">{lane.gate}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Operator action</dt>
          <dd className="mt-1 text-ink-300">{lane.operatorAction}</dd>
        </div>
      </dl>
      <p className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-xs leading-5 text-ink-500">
        {lane.riskBoundary}
      </p>
    </article>
  );
}

function complianceClass(status: string): string {
  if (status === "CLEAR") {
    return "rounded-full bg-green-900/40 px-2 py-0.5 text-[10px] font-semibold text-green-200";
  }
  if (status === "REVIEW_REQUIRED") {
    return "rounded-full bg-yellow-900/40 px-2 py-0.5 text-[10px] font-semibold text-yellow-200";
  }
  if (status === "HOLD") {
    return "rounded-full bg-red-900/40 px-2 py-0.5 text-[10px] font-semibold text-red-200";
  }
  return "rounded-full bg-obsidian/70 px-2 py-0.5 text-[10px] font-semibold text-ink-300";
}
