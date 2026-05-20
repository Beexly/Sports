import Link from "next/link";
import { db, isStubMode } from "@sports/db";
import { getReadinessGates } from "@sports/prediction-engine";
import {
  evaluatePickEligibility,
  type HistoricalPickRow,
} from "@/lib/cockpit/history";
import { ChecklistRow } from "@/components/cockpit/checklist-row";

/**
 * /cockpit/history — forensic pick ledger.
 *
 * Admin-gated by `app/cockpit/layout.tsx`. Shows the last 100 picks with
 * every field the operator needs to answer:
 *   - Did this pick count toward public performance?
 *   - If not, why not?
 *   - Does it have a signal snapshot?
 *   - Is its snapshot eligible for learning?
 *
 * Filters are read from `searchParams` and applied at the DB level so the
 * 100-row cap stays meaningful when slicing by result/sport/bootstrap.
 */

interface HistoryPageProps {
  searchParams: {
    result?: string;
    bootstrap?: string;
    published?: string;
    sport?: string;
    model?: string;
    eligible?: string;
    learning?: string;
  };
}

const RESULT_FILTERS = ["ALL", "PENDING", "WIN", "LOSS", "PUSH", "VOID"] as const;

const TAKE = 100;

export default async function CockpitHistoryPage({ searchParams }: HistoryPageProps) {
  const gates = getReadinessGates();

  const resultParam = (searchParams.result ?? "ALL").toUpperCase();
  const bootstrapParam = searchParams.bootstrap; // "true" | "false" | undefined
  const publishedParam = searchParams.published; // "true" | "false" | undefined
  const sportParam = searchParams.sport;
  const modelParam = searchParams.model;
  const eligibleParam = searchParams.eligible; // "true" | "false" | undefined
  const learningParam = searchParams.learning; // "true" | "false" | undefined

  const where: Record<string, unknown> = {};
  if (RESULT_FILTERS.includes(resultParam as (typeof RESULT_FILTERS)[number]) && resultParam !== "ALL") {
    where["result"] = resultParam;
  }
  if (bootstrapParam === "true") where["isBootstrap"] = true;
  if (bootstrapParam === "false") where["isBootstrap"] = false;
  if (publishedParam === "true") where["isPublished"] = true;
  if (publishedParam === "false") where["isPublished"] = false;
  if (modelParam) where["modelVersion"] = modelParam;
  if (sportParam) {
    where["game"] = {
      sport: { name: { contains: sportParam, mode: "insensitive" } },
    };
  }

  // Defensive: in stub mode or any DB outage the page still renders.
  const picks = await db.pick
    .findMany({
      where,
      include: {
        game: {
          include: { sport: { select: { name: true } } },
        },
        signalSnapshot: {
          select: {
            id: true,
            dataQualityScore: true,
            eligibleForLearning: true,
            isBootstrap: true,
          },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: TAKE,
    })
    .catch(() => [] as Array<{
      id: string;
      result: import("@sports/types").PickResult;
      isBootstrap: boolean;
      isPublished: boolean;
      isFeatured: boolean;
      settledAt: Date | null;
      generatedAt: Date;
      pickType: string;
      selection: string;
      line: number;
      confidence: number;
      pickGrade: string;
      riskLevel: string;
      modelVersion: string;
      bookmakerCount: number;
      edgeScore: number;
      consensusPct: number;
      game: { homeTeamName: string; awayTeamName: string; sport: { name: string } };
      signalSnapshot: { id: string; dataQualityScore: number; eligibleForLearning: boolean; isBootstrap: boolean } | null;
    }>);

  const rows = picks.map((p) => {
    const row: HistoricalPickRow = {
      id: p.id,
      result: p.result,
      isBootstrap: p.isBootstrap,
      isPublished: p.isPublished,
      settledAt: p.settledAt,
      hasSnapshot: p.signalSnapshot !== null,
      snapshotEligibleForLearning: p.signalSnapshot?.eligibleForLearning ?? null,
    };
    const eligibility = evaluatePickEligibility(row, {
      canExposePerformanceStats: gates.canExposePerformanceStats,
    });
    return { p, row, eligibility };
  });

  // Optional post-filter on eligibility (computed, not DB-stored).
  const filteredRows = rows.filter((r) => {
    if (eligibleParam === "true" && !r.eligibility.publicPerformanceEligible) return false;
    if (eligibleParam === "false" && r.eligibility.publicPerformanceEligible) return false;
    if (learningParam === "true" && !r.eligibility.learningEligible) return false;
    if (learningParam === "false" && r.eligibility.learningEligible) return false;
    return true;
  });

  const visibleCount = filteredRows.length;
  const eligibleCount = filteredRows.filter((r) => r.eligibility.publicPerformanceEligible).length;
  const learningCount = filteredRows.filter((r) => r.eligibility.learningEligible).length;
  const snapshotCount = filteredRows.filter((r) => r.row.hasSnapshot).length;

  // Roll-ups (across the filtered window)
  const byResult = {
    WIN: 0,
    LOSS: 0,
    PUSH: 0,
    VOID: 0,
    PENDING: 0,
  };
  for (const r of filteredRows) {
    byResult[r.p.result as keyof typeof byResult] =
      (byResult[r.p.result as keyof typeof byResult] ?? 0) + 1;
  }

  const stubMode = isStubMode();

  return (
    <div className="flex flex-col gap-6">
      {stubMode && (
        <aside
          data-testid="history-stub-mode-banner"
          className="rounded-xl border border-yellow-900/60 bg-yellow-950/30 p-4 text-sm text-yellow-200"
        >
          <p className="font-semibold">Stub mode active — no DB connected.</p>
          <p className="mt-1 text-xs text-yellow-300/80">
            Counts and rows below will all be zero. Set{" "}
            <code className="rounded bg-yellow-950/50 px-1 py-0.5 font-mono text-[10px] text-yellow-100">
              DATABASE_URL
            </code>{" "}
            to a live Postgres connection (see{" "}
            <code className="rounded bg-yellow-950/50 px-1 py-0.5 font-mono text-[10px] text-yellow-100">
              .env.example
            </code>
            ) and restart the server. Raw operational counts are at{" "}
            <Link href="/admin/dashboard" className="underline hover:text-yellow-100">
              /admin/dashboard
            </Link>
            .
          </p>
        </aside>
      )}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Historical pick ledger</h1>
          <p className="mt-1 text-sm text-gray-500">
            Last {TAKE} picks (descending by generatedAt). Filter to inspect
            eligibility, settlement, and snapshot coverage. Use the{" "}
            <span className="text-gray-300">Source</span> filter to isolate
            seed-data picks ({" "}
            <code className="rounded bg-gray-800 px-1 py-0.5 text-[10px]">
              modelVersion = v5.0.0-seed
            </code>
            ). Eligibility rules are deterministic — see{" "}
            <code className="rounded bg-gray-800 px-1 py-0.5 text-xs">
              lib/cockpit/history.ts
            </code>
            .
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <a
            data-testid="history-export-csv"
            href={(() => {
              const qs = new URLSearchParams(searchParams as Record<string, string>);
              return `/api/cockpit/history/export${qs.toString() ? `?${qs.toString()}` : ""}`;
            })()}
            className="self-start rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-1.5 text-xs font-semibold text-gray-200 transition-colors hover:border-brand-700 hover:bg-brand-900/40 hover:text-brand-100 sm:self-end focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950"
            download
            aria-label="Download the current ledger view as CSV (admin only)"
          >
            Export CSV (current filters)
          </a>
          <span className="text-[10px] uppercase tracking-widest text-gray-600">
            Admin only — do not share the export URL
          </span>
        </div>
      </header>

      {/* Roll-up bar */}
      <section
        data-testid="history-rollup"
        className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
      >
        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-6">
          <Stat label="Showing" value={String(visibleCount)} />
          <Stat label="Public-eligible" value={String(eligibleCount)} accent="text-green-400" />
          <Stat label="Learning-eligible" value={String(learningCount)} accent="text-brand-400" />
          <Stat label="With snapshot" value={String(snapshotCount)} accent="text-gray-300" />
          <Stat label="Wins / Losses" value={`${byResult.WIN} / ${byResult.LOSS}`} />
          <Stat label="Push / Void / Pend" value={`${byResult.PUSH} / ${byResult.VOID} / ${byResult.PENDING}`} accent="text-gray-400" />
        </div>
        <p className="mt-3 text-[11px] text-gray-500">
          Performance gate is currently{" "}
          <span className={gates.canExposePerformanceStats ? "text-green-400" : "text-yellow-300"}>
            {gates.canExposePerformanceStats ? "OPEN" : "CLOSED"}
          </span>
          . Eligibility above is computed against the live gate.
        </p>
      </section>

      {/* Publish-readiness checklist */}
      <section
        data-testid="history-publish-readiness"
        className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
      >
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          Publish-readiness checklist
        </h2>
        {(() => {
          const min = Math.max(1, gates.minSettledPicksForLearning);
          const settled = eligibleCount; // public-eligible in the current window
          const gap = Math.max(0, min - settled);
          const ratio = Math.min(1, settled / min);
          const pct = Math.round(ratio * 100);
          const readyForGate =
            gates.canExposePerformanceStats === false && gap === 0 && settled > 0;
          return (
            <div className="mt-3 space-y-3 text-[11px] text-gray-300">
              <ChecklistRow
                ok={gates.canPersistCanonicalHistory}
                label="Canonical history enabled"
                detail="CANONICAL_HISTORY_ENABLED=true"
              />
              <ChecklistRow
                ok={settled > 0}
                label={`Public-eligible canonical picks: ${settled}`}
                detail={settled === 0 ? "Need at least one settled canonical pick" : "Window includes canonical settled picks"}
              />
              <ChecklistRow
                ok={gap === 0}
                label={`Sample meets minimum (${settled} / ${min})`}
                detail={gap === 0 ? "Sample size satisfied" : `${gap} more settled canonical pick(s) needed`}
              />
              <ChecklistRow
                ok={!gates.isBootstrapMode}
                label="Bootstrap mode disabled"
                detail={gates.isBootstrapMode ? "Still writing isBootstrap=true picks" : "All new picks canonical"}
              />
              <div className="rounded bg-gray-950/40 px-3 py-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-gray-500">
                  <span>Progress to sample minimum</span>
                  <span>{pct}%</span>
                </div>
                <div className="mt-1 h-2 rounded bg-gray-800">
                  <div
                    className="h-2 rounded bg-brand-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {readyForGate && (
                <p className="rounded border border-green-700/40 bg-green-900/20 px-3 py-2 text-green-300">
                  Ready: sample meets minimum and bootstrap is off. Operator
                  may flip <code className="rounded bg-gray-900 px-1">PERFORMANCE_STATS_ENABLED=true</code>{" "}
                  when comfortable. The gate flip is the only operator
                  action that changes customer-visible behavior.
                </p>
              )}
              {!readyForGate && !gates.canExposePerformanceStats && (
                <p className="text-gray-500">
                  Continue accumulating canonical settled picks. The
                  performance gate stays closed until every checklist row
                  above is satisfied.
                </p>
              )}
              {gates.canExposePerformanceStats && (
                <p className="rounded border border-yellow-700/40 bg-yellow-900/20 px-3 py-2 text-yellow-300">
                  Performance gate is already OPEN. Monitor canonical
                  history; if the ratio above drops below the minimum,
                  flip the gate closed to hold back customer claims.
                </p>
              )}
            </div>
          );
        })()}
      </section>

      {/* Filter bar */}
      <nav
        data-testid="history-filters"
        aria-label="Pick ledger filters"
        className="flex flex-wrap items-center gap-2 text-[11px]"
      >
        <div role="group" aria-label="Filter by result" className="flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Result:</span>
          {RESULT_FILTERS.map((r) => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (r === "ALL") params.delete("result");
            else params.set("result", r);
            const href = `/cockpit/history${params.toString() ? `?${params.toString()}` : ""}`;
            const active = (searchParams.result ?? "ALL").toUpperCase() === r;
            return (
              <Link
                key={r}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950",
                  active
                    ? "bg-brand-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {r}
              </Link>
            );
          })}
        </div>

        <div role="group" aria-label="Filter by bootstrap flag" className="ml-3 flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Bootstrap:</span>
          {(["any", "true", "false"] as const).map((v) => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (v === "any") params.delete("bootstrap");
            else params.set("bootstrap", v);
            const href = `/cockpit/history${params.toString() ? `?${params.toString()}` : ""}`;
            const active = (searchParams.bootstrap ?? "any") === v;
            return (
              <Link
                key={`b-${v}`}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950",
                  active
                    ? "bg-brand-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {v}
              </Link>
            );
          })}
        </div>

        <div role="group" aria-label="Filter by public-performance eligibility" className="ml-3 flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Eligible:</span>
          {(["any", "true", "false"] as const).map((v) => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (v === "any") params.delete("eligible");
            else params.set("eligible", v);
            const href = `/cockpit/history${params.toString() ? `?${params.toString()}` : ""}`;
            const active = (searchParams.eligible ?? "any") === v;
            return (
              <Link
                key={`e-${v}`}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950",
                  active
                    ? "bg-brand-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {v}
              </Link>
            );
          })}
        </div>

        <div role="group" aria-label="Filter by learning eligibility" className="ml-3 flex flex-wrap items-center gap-2">
          <span className="text-gray-500">Learning:</span>
          {(["any", "true", "false"] as const).map((v) => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (v === "any") params.delete("learning");
            else params.set("learning", v);
            const href = `/cockpit/history${params.toString() ? `?${params.toString()}` : ""}`;
            const active = (searchParams.learning ?? "any") === v;
            return (
              <Link
                key={`l-${v}`}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950",
                  active
                    ? "bg-brand-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {v}
              </Link>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Filter by source: live model vs seed picks"
          className="ml-3 flex flex-wrap items-center gap-2"
        >
          <span className="text-gray-500">Source:</span>
          {(
            [
              { v: "any", label: "any", model: undefined },
              { v: "seed", label: "seed", model: "v5.0.0-seed" },
            ] as const
          ).map((entry) => {
            const params = new URLSearchParams(searchParams as Record<string, string>);
            if (entry.model === undefined) params.delete("model");
            else params.set("model", entry.model);
            const href = `/cockpit/history${params.toString() ? `?${params.toString()}` : ""}`;
            const active = entry.v === "any"
              ? !searchParams.model
              : searchParams.model === entry.model;
            return (
              <Link
                key={`src-${entry.v}`}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded px-2 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-950",
                  active
                    ? "bg-brand-800 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-white",
                ].join(" ")}
              >
                {entry.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Ledger table */}
      <section
        data-testid="history-ledger"
        className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-900/40"
      >
        <table className="w-full min-w-[1200px] text-[11px]">
          <thead className="border-b border-gray-800 bg-gray-950/40 text-left text-[10px] uppercase tracking-widest text-gray-500">
            <tr>
              <th className="px-3 py-2">Generated</th>
              <th className="px-3 py-2">Game</th>
              <th className="px-3 py-2">Sport</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Selection</th>
              <th className="px-3 py-2">Line</th>
              <th className="px-3 py-2">Conf</th>
              <th className="px-3 py-2">Grade</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2">Books</th>
              <th className="px-3 py-2">Edge</th>
              <th className="px-3 py-2">Consensus</th>
              <th className="px-3 py-2">Result</th>
              <th className="px-3 py-2">Settled</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Public</th>
              <th className="px-3 py-2">Learning</th>
              <th className="px-3 py-2">Snapshot</th>
              <th className="px-3 py-2">Exclusion reasons</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={20} className="px-3 py-8 text-center text-gray-500">
                  No picks match the current filters.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ p, eligibility, row }) => (
                <tr
                  key={p.id}
                  data-testid={`history-row-${p.id}`}
                  className="border-b border-gray-800/60 align-top hover:bg-gray-900/30"
                >
                  <td className="px-3 py-2 font-mono text-gray-400">
                    {p.generatedAt.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-3 py-2 text-gray-200">
                    {p.game.awayTeamName} @ {p.game.homeTeamName}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{p.game.sport.name}</td>
                  <td className="px-3 py-2 text-gray-300">{p.pickType}</td>
                  <td className="px-3 py-2 text-white">{p.selection}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.line}</td>
                  <td className="px-3 py-2 font-mono text-gray-300">{p.confidence}</td>
                  <td className="px-3 py-2 text-gray-300">{p.pickGrade}</td>
                  <td className="px-3 py-2 text-gray-400">{p.riskLevel}</td>
                  <td className="px-3 py-2 font-mono text-gray-500">{p.modelVersion}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.bookmakerCount}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{p.edgeScore.toFixed(2)}</td>
                  <td className="px-3 py-2 font-mono text-gray-400">{(p.consensusPct * 100).toFixed(0)}%</td>
                  <td className="px-3 py-2">
                    <ResultBadge result={p.result} />
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-500">
                    {p.settledAt
                      ? p.settledAt.toISOString().replace("T", " ").slice(0, 16)
                      : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-3 py-2 text-[10px]">
                    {p.isBootstrap && <Flag tone="yellow">bootstrap</Flag>}
                    {!p.isPublished && <Flag tone="gray">internal</Flag>}
                    {p.isFeatured && <Flag tone="brand">featured</Flag>}
                    {p.isPublished && !p.isBootstrap && <Flag tone="green">canonical</Flag>}
                  </td>
                  <td className="px-3 py-2">
                    <Yes value={eligibility.publicPerformanceEligible} />
                  </td>
                  <td className="px-3 py-2">
                    <Yes value={eligibility.learningEligible} />
                  </td>
                  <td className="px-3 py-2">
                    {row.hasSnapshot ? (
                      <span className="text-green-400">yes</span>
                    ) : (
                      <span className="text-gray-600">none</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[10px] text-gray-400">
                    {eligibility.exclusionReasons.length === 0
                      ? <span className="text-gray-600">—</span>
                      : eligibility.exclusionReasons.join("; ")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <p className="text-[10px] text-gray-600">
        Sourced live from <code className="rounded bg-gray-800 px-1">db.pick</code> and{" "}
        <code className="rounded bg-gray-800 px-1">db.pickSignalSnapshot</code>. No data is fabricated;
        missing fields render as <span className="text-gray-700">—</span>.
      </p>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-gray-500">{label}</p>
      <p className={["mt-0.5 text-lg font-bold", accent ?? "text-white"].join(" ")}>{value}</p>
    </div>
  );
}

function ResultBadge({ result }: { result: string }) {
  const tone: Record<string, string> = {
    WIN: "bg-green-900/40 text-green-300",
    LOSS: "bg-red-900/40 text-red-300",
    PUSH: "bg-gray-800 text-gray-300",
    VOID: "bg-orange-900/40 text-orange-300",
    PENDING: "bg-yellow-900/30 text-yellow-300",
  };
  return (
    <span
      className={[
        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
        tone[result] ?? "bg-gray-800 text-gray-400",
      ].join(" ")}
    >
      {result}
    </span>
  );
}

function Flag({ tone, children }: { tone: "yellow" | "gray" | "brand" | "green"; children: React.ReactNode }) {
  const cls: Record<typeof tone, string> = {
    yellow: "bg-yellow-900/40 text-yellow-300",
    gray: "bg-gray-800 text-gray-400",
    brand: "bg-brand-900/40 text-brand-300",
    green: "bg-green-900/40 text-green-300",
  };
  return (
    <span className={["mr-1 inline-block rounded px-1 py-0.5 text-[9px] font-semibold uppercase", cls[tone]].join(" ")}>
      {children}
    </span>
  );
}

function Yes({ value }: { value: boolean }) {
  return value ? (
    <span className="rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-300">YES</span>
  ) : (
    <span className="rounded bg-gray-800 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">NO</span>
  );
}
