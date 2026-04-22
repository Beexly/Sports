"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import type {
  DashboardData,
  DepthLabel,
  PickSummary,
  PerfBand,
} from "@/app/api/admin/dashboard/route";

// ─── Display helpers ──────────────────────────────────────────────────────

function ago(iso: string | null): string {
  if (!iso) return "never";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

function fmtTime(iso: string): string {
  return format(new Date(iso), "EEE MMM d · h:mm a");
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function confColor(c: number): string {
  if (c >= 80) return "text-green-400";
  if (c >= 70) return "text-blue-400";
  if (c >= 60) return "text-yellow-400";
  return "text-gray-400";
}

function gradeColor(g: string): string {
  if (g === "ELITE_PLAY") return "bg-purple-500/15 text-purple-300 border border-purple-500/30";
  if (g === "STRONG_PLAY") return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
  if (g === "SOLID_PLAY") return "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30";
  return "bg-gray-700/50 text-gray-400 border border-gray-600/30";
}

function gradeLabel(g: string): string {
  if (g === "ELITE_PLAY") return "ELITE";
  if (g === "STRONG_PLAY") return "STRONG";
  if (g === "SOLID_PLAY") return "SOLID";
  return "LEAN";
}

function depthColor(d: DepthLabel): string {
  if (d === "DEEP") return "bg-blue-500/15 text-blue-300 border border-blue-500/30";
  if (d === "MEDIUM") return "bg-yellow-500/15 text-yellow-300 border border-yellow-500/30";
  return "bg-red-500/15 text-red-400 border border-red-500/30";
}

function resultColor(r: string): string {
  if (r === "WIN") return "bg-green-500/15 text-green-400 border border-green-500/30";
  if (r === "LOSS") return "bg-red-500/15 text-red-400 border border-red-500/30";
  if (r === "PUSH") return "bg-gray-600/50 text-gray-300 border border-gray-500/30";
  return "bg-gray-800 text-gray-500 border border-gray-700";
}

function statusColor(s: string): string {
  if (s === "SUCCESS") return "text-green-400";
  if (s === "RUNNING") return "text-yellow-400";
  if (s === "FAILED") return "text-red-400";
  return "text-gray-400";
}

function statusDot(s: string): string {
  if (s === "SUCCESS") return "bg-green-500";
  if (s === "RUNNING") return "bg-yellow-500 animate-pulse";
  if (s === "FAILED") return "bg-red-500";
  return "bg-gray-500";
}

function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
        on
          ? "bg-green-500/10 text-green-400 border-green-500/30"
          : "bg-gray-800 text-gray-500 border-gray-700"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-green-400" : "bg-gray-600"}`} />
      {label}
    </span>
  );
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

function SectionCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl ${className}`}>
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function WinRateCell({ band }: { band: PerfBand }) {
  const wr = band.winRate;
  const color = wr === null ? "text-gray-500" : wr >= 55 ? "text-green-400" : wr >= 50 ? "text-yellow-400" : "text-red-400";
  return (
    <tr className="border-b border-gray-800/50">
      <td className="px-3 py-2 text-gray-300 text-xs">{band.label}</td>
      <td className="px-3 py-2 text-gray-400 text-xs text-right">{band.total}</td>
      <td className="px-3 py-2 text-green-400 text-xs text-right">{band.wins}</td>
      <td className="px-3 py-2 text-red-400 text-xs text-right">{band.losses}</td>
      <td className={`px-3 py-2 text-xs text-right font-medium ${color}`}>
        {wr !== null ? `${wr}%` : "—"}
      </td>
    </tr>
  );
}

const FACTOR_LABELS: Record<string, string> = {
  marketConsensus: "Consensus",
  marketDepth: "Market Depth",
  edge: "Edge",
  lineMovement: "Line Movement",
  volatility: "Volatility",
  headToHead: "H2H Form",
  venueSplit: "Venue Split",
  crossMarket: "Cross-Market",
  uncertainty: "Uncertainty",
  restAdvantage: "Rest Advantage",
  scheduleStressScore: "Schedule Stress",
  atsForm: "Home ATS",
  awayAtsForm: "Away ATS",
};

// ─── Pick detail panel ────────────────────────────────────────────────────

function PickDetailPanel({ pick }: { pick: PickSummary }) {
  const snap = pick.snapshot;
  const fb = pick.factorBreakdown;

  const signals = snap
    ? [
        { key: "Odds", active: snap.hadOddsSignal },
        { key: "Line Movement", active: snap.hadLineMovementSignal },
        { key: "Rest Advantage", active: snap.hadRestSignal },
        { key: "Schedule Density", active: snap.hadScheduleSignal },
        { key: "ATS Form", active: snap.hadAtsFormSignal },
        { key: "H2H Form", active: snap.hadH2HSignal },
        { key: "Venue Splits", active: snap.hadVenueSignal },
        { key: "Weather", active: snap.hadWeatherSignal },
        { key: "Injuries", active: snap.hadInjurySignal },
        { key: "Ratings", active: snap.hadRatingsSignal },
      ]
    : [];

  return (
    <div className="bg-gray-950 border-t border-gray-700 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Factor breakdown */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Factor Breakdown</p>
          {fb ? (
            <div className="space-y-1">
              {Object.entries(fb).map(([key, val]) => {
                if (val === 0 || val === undefined || val === null) return null;
                const label = FACTOR_LABELS[key] ?? key;
                const pos = (val as number) > 0;
                const abs = Math.abs(val as number);
                const barW = Math.min(100, (abs / 30) * 100);
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400 w-28 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                      <div
                        className={`h-full rounded-full ${pos ? "bg-green-500" : "bg-red-500"}`}
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                    <span className={`w-10 text-right font-mono ${pos ? "text-green-400" : "text-red-400"}`}>
                      {pos ? "+" : ""}{(val as number).toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-xs">No factor data</p>
          )}
        </div>

        {/* Signal snapshot */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Signal Snapshot</p>
          {snap ? (
            <div className="space-y-1">
              {signals.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.active ? "bg-green-400" : "bg-gray-700"}`} />
                  <span className={s.active ? "text-gray-200" : "text-gray-600"}>{s.key}</span>
                </div>
              ))}
              {snap.usedDerivedHistory && (
                <p className="text-xs text-blue-400 mt-1">✓ Derived history used</p>
              )}
              {!snap.usedDerivedHistory && (
                <p className="text-xs text-gray-600 mt-1">Derived history: OFF</p>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-xs">No snapshot recorded</p>
          )}
        </div>

        {/* Metadata + eligibility */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Metadata</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Model</span>
              <span className="text-gray-300 font-mono">{pick.modelVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Books</span>
              <span className="text-gray-300">{pick.bookmakerCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data Quality</span>
              <span className={pick.dataQualityScore >= 70 ? "text-green-400" : pick.dataQualityScore >= 40 ? "text-yellow-400" : "text-red-400"}>
                {pick.dataQualityScore.toFixed(0)}/100
              </span>
            </div>
            {snap?.lineMovementDelta !== null && snap?.lineMovementDelta !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Line Δ</span>
                <span className={snap.lineMovementDelta > 0 ? "text-red-400" : "text-green-400"}>
                  {snap.lineMovementDelta > 0 ? "+" : ""}{snap.lineMovementDelta.toFixed(1)}
                </span>
              </div>
            )}
            {snap?.restAdvantageNet !== null && snap?.restAdvantageNet !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">Rest Net</span>
                <span className={snap.restAdvantageNet > 0 ? "text-green-400" : snap.restAdvantageNet < 0 ? "text-red-400" : "text-gray-400"}>
                  {snap.restAdvantageNet > 0 ? "+" : ""}{snap.restAdvantageNet}d
                </span>
              </div>
            )}
            {snap?.atsFormSampleSize !== null && snap?.atsFormSampleSize !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-500">ATS Sample</span>
                <span className="text-gray-300">{snap.atsFormSampleSize} games</span>
              </div>
            )}
            <div className="pt-2 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${!pick.isBootstrap ? "bg-green-400" : "bg-yellow-500"}`} />
                <span className={!pick.isBootstrap ? "text-green-400" : "text-yellow-400"}>
                  {pick.isBootstrap ? "Bootstrap (uncalibrated)" : "Canonical"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${pick.isPublicEligible ? "bg-green-400" : "bg-gray-600"}`} />
                <span className={pick.isPublicEligible ? "text-green-400" : "text-gray-500"}>
                  {pick.isPublicEligible ? "Public eligible" : "Not public eligible"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${pick.willBeLearningEligible ? "bg-purple-400" : "bg-gray-600"}`} />
                <span className={pick.willBeLearningEligible ? "text-purple-400" : "text-gray-500"}>
                  {pick.willBeLearningEligible ? "Will be learning eligible" : "Not learning eligible"}
                </span>
              </div>
            </div>
            {pick.generatedAt && (
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">Generated</span>
                <span className="text-gray-400">{ago(pick.generatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reasoning */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Reasoning</p>
        <p className="text-xs text-gray-300 leading-relaxed bg-gray-900 rounded-lg p-3 border border-gray-800">
          {pick.reasoning || pick.reasoningShort || "No reasoning recorded"}
        </p>
      </div>
    </div>
  );
}

// ─── Main dashboard view ──────────────────────────────────────────────────

type RefreshState =
  | { status: "idle" }
  | { status: "running"; elapsedSec: number }
  | {
      status: "done";
      games: number;
      picks: number;
      sportsSucceeded: number;
      sportsFailed: number;
      failedSports: string[];
      elapsedSec: number;
    }
  | { status: "error"; message: string };

type TriggerRefreshResult = {
  success?: boolean;
  error?: string;
  results?: Array<{
    sport?: string;
    status?: "success" | "failed";
    games?: number;
    picks?: number;
    error?: string;
  }>;
};

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPickId, setSelectedPickId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [refresh, setRefresh] = useState<RefreshState>({ status: "idle" });
  const countdownRef = useRef(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as DashboardData;
      setData(json);
      countdownRef.current = 60;
      setCountdown(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    const started = Date.now();
    setRefresh({ status: "running", elapsedSec: 0 });
    refreshTimerRef.current = setInterval(() => {
      setRefresh((prev) =>
        prev.status === "running"
          ? { status: "running", elapsedSec: Math.floor((Date.now() - started) / 1000) }
          : prev
      );
      // Live-refresh the dashboard while the sync runs so rows appear as they land.
      void fetchData();
    }, 3000);

    try {
      const res = await fetch("/api/admin/trigger-refresh", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as TriggerRefreshResult;
      if (!res.ok) {
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const results = body.results ?? [];
      let games = 0;
      let picks = 0;
      let sportsSucceeded = 0;
      let sportsFailed = 0;
      const failedSports: string[] = [];
      for (const r of results) {
        games += r.games ?? 0;
        picks += r.picks ?? 0;
        if (r.status === "success") sportsSucceeded += 1;
        if (r.status === "failed") {
          sportsFailed += 1;
          if (r.sport) failedSports.push(r.sport);
        }
      }
      setRefresh({
        status: "done",
        games,
        picks,
        sportsSucceeded,
        sportsFailed,
        failedSports,
        elapsedSec: Math.floor((Date.now() - started) / 1000),
      });
      await fetchData();
    } catch (e) {
      setRefresh({
        status: "error",
        message: e instanceof Error ? e.message : "Refresh failed",
      });
    } finally {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  }, [fetchData]);

  useEffect(() => {
    void fetchData();
    // countdown tick
    timerRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        countdownRef.current = 60;
        void fetchData();
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading operator dashboard…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { systemHealth: h, recentRuns, upcomingGames, currentPicks, recentlySettled, performance: perf, signalCoverage: sig } = data;

  const gateEntries: Array<{ key: string; label: string; on: boolean }> = [
    { key: "canonical", label: "Canonical History", on: h.gates.canPersistCanonicalHistory },
    { key: "derived", label: "Derived History", on: h.gates.canUseDerivedHistory },
    { key: "public", label: "Public Picks", on: h.gates.canExposePublicPicks },
    { key: "featured", label: "Featured", on: h.gates.canPromoteFeaturedPicks },
    { key: "perf", label: "Perf Stats", on: h.gates.canExposePerformanceStats },
    { key: "blog", label: "Blog", on: h.gates.canPublishContent },
    { key: "learn", label: "Learning", on: h.gates.canLearnFromOutcomes },
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      <div className="max-w-screen-2xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Operator Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Internal monitoring — not for public use
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Updated {ago(data.fetchedAt)} · refreshing in {countdown}s
            </span>
            <button
              onClick={() => void fetchData()}
              disabled={loading}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => void triggerRefresh()}
              disabled={refresh.status === "running"}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg border border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              title="Fetch fresh odds and regenerate picks across all sports"
            >
              {refresh.status === "running"
                ? `⟳ Syncing… ${refresh.elapsedSec}s`
                : "⚡ Trigger Sync"}
            </button>
            <a href="/admin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              ← Admin
            </a>
          </div>
        </div>

        {/* ── Sync status banner ── */}
        {refresh.status !== "idle" && (
          <div
            className={`rounded-lg border px-4 py-2.5 text-xs flex items-center justify-between ${
              refresh.status === "running"
                ? "bg-brand-500/5 border-brand-500/30 text-brand-300"
                : refresh.status === "done"
                ? "bg-green-500/5 border-green-500/30 text-green-300"
                : "bg-red-500/5 border-red-500/30 text-red-300"
            }`}
          >
            {refresh.status === "running" && (
              <>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                  Syncing odds across all sports — live updates every 3s · {refresh.elapsedSec}s elapsed
                </span>
                <span className="text-gray-500">Runs can take 1–2 minutes</span>
              </>
            )}
            {refresh.status === "done" && (
              <>
                <span>
                  ✓ Sync complete in {refresh.elapsedSec}s · {refresh.sportsSucceeded} sport
                  {refresh.sportsSucceeded === 1 ? "" : "s"} ok
                  {refresh.sportsFailed > 0
                    ? `, ${refresh.sportsFailed} failed (${refresh.failedSports.join(", ")})`
                    : ""}
                  {" · "}
                  {refresh.games} games · {refresh.picks} picks
                </span>
                <button
                  onClick={() => setRefresh({ status: "idle" })}
                  className="text-gray-500 hover:text-gray-300 ml-4"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </>
            )}
            {refresh.status === "error" && (
              <>
                <span>✗ Sync failed: {refresh.message}</span>
                <button
                  onClick={() => setRefresh({ status: "idle" })}
                  className="text-gray-500 hover:text-gray-300 ml-4"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        {/* ── System Health ── */}
        <SectionCard title="System Health">
          <div className="p-4 space-y-3">
            {/* Mode + gates */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                h.mode === "BOOTSTRAP"
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                  : "bg-green-500/10 text-green-400 border-green-500/40"
              }`}>
                {h.mode === "BOOTSTRAP" ? "⚠ BOOTSTRAP MODE" : "✓ CANONICAL MODE"}
              </span>
              {gateEntries.map((g) => (
                <Pill key={g.key} on={g.on} label={g.label} />
              ))}
            </div>

            {/* Run / settlement times */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-500 mb-1">Latest Ingestion</p>
                {h.latestRun ? (
                  <>
                    <span className={`font-medium ${statusColor(h.latestRun.status)}`}>
                      {h.latestRun.status}
                    </span>
                    <p className="text-gray-400 mt-0.5">{ago(h.latestRun.startedAt)}</p>
                    {h.latestRun.sport && <p className="text-gray-600">{h.latestRun.sport}</p>}
                  </>
                ) : <p className="text-gray-600">Never</p>}
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-500 mb-1">Last Successful</p>
                <p className={`font-medium ${h.latestSuccessAt ? "text-green-400" : "text-red-400"}`}>
                  {ago(h.latestSuccessAt)}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-500 mb-1">Last Settlement</p>
                <p className="text-gray-300 font-medium">{ago(h.latestSettlementAt)}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-500 mb-1">Pick Counts</p>
                <p className="text-green-400 font-medium">{h.canonicalPickCount} canonical</p>
                <p className="text-yellow-500 text-xs">{h.bootstrapPickCount} bootstrap</p>
              </div>
            </div>

            {/* Warnings */}
            {h.warnings.length > 0 && (
              <div className="space-y-1">
                {h.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-300">
                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── Ingestion Runs + Signal Coverage ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ingestion runs */}
          <SectionCard title={`Recent Ingestion Runs (${recentRuns.length})`}>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 text-left">
                    <th className="px-3 py-2">Sport</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Games</th>
                    <th className="px-3 py-2 text-right">Odds</th>
                    <th className="px-3 py-2 text-right">Dur</th>
                    <th className="px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-gray-600">No runs yet</td>
                    </tr>
                  )}
                  {recentRuns.map((r) => (
                    <tr key={r.id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-gray-400">{r.sport ?? "all"}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot(r.status)}`} />
                          <span className={statusColor(r.status)}>{r.status}</span>
                        </span>
                        {r.errorMessage && (
                          <p className="text-red-400 text-xs mt-0.5 max-w-[180px] truncate" title={r.errorMessage}>
                            {r.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-right">{r.gamesUpserted}</td>
                      <td className="px-3 py-2 text-gray-400 text-right">{r.oddsInserted}</td>
                      <td className="px-3 py-2 text-gray-500 text-right">{fmtDuration(r.durationMs)}</td>
                      <td className="px-3 py-2 text-gray-500">{ago(r.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* Signal coverage */}
          <SectionCard title="Signal Coverage">
            <div className="p-4 space-y-4">
              {/* Depth distribution */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Pick Signal Depth Distribution</p>
                {sig.snapshots.total === 0 ? (
                  <p className="text-gray-600 text-xs">No snapshots yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {(
                      [
                        { label: "DEEP", count: sig.depthDistribution.deep, color: "bg-blue-500" },
                        { label: "MEDIUM", count: sig.depthDistribution.medium, color: "bg-yellow-500" },
                        { label: "THIN", count: sig.depthDistribution.thin, color: "bg-red-500" },
                      ] as const
                    ).map(({ label, count, color }) => {
                      const pct = sig.snapshots.total > 0 ? (count / sig.snapshots.total) * 100 : 0;
                      return (
                        <div key={label} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 w-14">{label}</span>
                          <div className="flex-1 h-2 bg-gray-800 rounded-full">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-400 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Snapshot signal presence */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Signal Presence ({sig.snapshots.total} total · {sig.snapshots.canonical} canonical · {sig.snapshots.learningEligible} learning-eligible)
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {[
                    ["ATS Form", sig.snapshots.withAtsForm],
                    ["H2H Form", sig.snapshots.withH2H],
                    ["Schedule", sig.snapshots.withSchedule],
                    ["Line Movement", sig.snapshots.withLineMovement],
                    ["Rest", sig.snapshots.withRest],
                    ["Venue", sig.snapshots.withVenue],
                  ].map(([label, count]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-gray-500">{label as string}</span>
                      <span className={
                        sig.snapshots.total > 0 && (count as number) / sig.snapshots.total > 0.5
                          ? "text-green-400"
                          : (count as number) > 0
                          ? "text-yellow-400"
                          : "text-gray-600"
                      }>
                        {count as number}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GameSignal categories */}
              {sig.totalGameSignals > 0 && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">GameSignal Records ({sig.totalGameSignals})</p>
                  <div className="space-y-1 text-xs">
                    {sig.byCategory.map((c) => (
                      <div key={c.category} className="flex justify-between">
                        <span className="text-gray-400">{c.category}</span>
                        <span className="text-gray-300">{c.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Upcoming Games ── */}
        <SectionCard title={`Upcoming / Live Games — Next 48h (${upcomingGames.length})`}>
          {upcomingGames.length === 0 ? (
            <p className="px-4 py-6 text-center text-gray-600 text-sm">No games in the next 48 hours</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="px-3 py-2">Sport</th>
                    <th className="px-3 py-2">Matchup</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Books</th>
                    <th className="px-3 py-2 text-right">Quality</th>
                    <th className="px-3 py-2 text-right">Line Δ</th>
                    <th className="px-3 py-2">Picks</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingGames.map((g) => (
                    <tr key={g.id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                      <td className="px-3 py-2 text-gray-400">{g.sport}</td>
                      <td className="px-3 py-2 text-white font-medium">
                        {g.homeTeam} <span className="text-gray-500">vs</span> {g.awayTeam}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{fmtTime(g.commenceTime)}</td>
                      <td className="px-3 py-2">
                        <span className={`${g.status === "LIVE" ? "text-green-400 font-medium" : g.status === "FINAL" ? "text-gray-500" : "text-gray-400"}`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={g.bookmakerCoverageMax >= 7 ? "text-green-400" : g.bookmakerCoverageMax >= 4 ? "text-yellow-400" : "text-red-400"}>
                          {g.bookmakerCoverageMax}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={g.dataQualityScore >= 70 ? "text-green-400" : g.dataQualityScore >= 40 ? "text-yellow-400" : "text-red-400"}>
                          {g.dataQualityScore.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-400">
                        {g.lineMovementSpread !== null ? (
                          <span className={g.lineMovementSpread > 0 ? "text-red-400" : g.lineMovementSpread < 0 ? "text-green-400" : "text-gray-500"}>
                            {g.lineMovementSpread > 0 ? "+" : ""}{g.lineMovementSpread.toFixed(1)}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {g.picks.length === 0 ? (
                          <span className="text-gray-600">no picks</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {g.picks.map((p) => (
                              <span key={p.id} className={`px-1.5 py-0.5 rounded text-xs ${gradeColor(p.pickGrade)}`}>
                                {p.pickType.slice(0, 1)} {p.confidence}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Current Picks ── */}
        <SectionCard title={`Current Picks — Pending (${currentPicks.length})`}>
          {currentPicks.length === 0 ? (
            <p className="px-4 py-6 text-center text-gray-600 text-sm">
              No pending picks. Trigger a data refresh to generate picks.
            </p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 text-left border-b border-gray-800">
                    <th className="px-3 py-2">Grade</th>
                    <th className="px-3 py-2">Game</th>
                    <th className="px-3 py-2">Pick</th>
                    <th className="px-3 py-2 text-right">Conf</th>
                    <th className="px-3 py-2 text-right">Edge</th>
                    <th className="px-3 py-2 text-right">Books</th>
                    <th className="px-3 py-2 text-right">Quality</th>
                    <th className="px-3 py-2">Depth</th>
                    <th className="px-3 py-2">Flags</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {currentPicks.map((pick) => {
                    const isSelected = selectedPickId === pick.id;
                    return (
                      <Fragment key={pick.id}>
                        <tr
                          className={`border-t border-gray-800/50 cursor-pointer transition-colors ${
                            isSelected ? "bg-gray-800/50" : "hover:bg-gray-800/20"
                          }`}
                          onClick={() => setSelectedPickId(isSelected ? null : pick.id)}
                        >
                          <td className="px-3 py-2.5">
                            <Badge className={gradeColor(pick.pickGrade)}>{gradeLabel(pick.pickGrade)}</Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="text-white font-medium">
                              {pick.homeTeam} <span className="text-gray-500">vs</span> {pick.awayTeam}
                            </div>
                            <div className="text-gray-500">{pick.sport} · {fmtTime(pick.commenceTime)}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-gray-200">{pick.pickType}</span>
                            <span className="text-gray-400 ml-1.5">{pick.selection}</span>
                            {pick.line !== null && (
                              <span className="text-gray-500 ml-1">@ {pick.line > 0 ? "+" : ""}{pick.line}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-bold text-sm ${confColor(pick.confidence)}`}>{pick.confidence}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-gray-400">{pick.edgeScore.toFixed(0)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={pick.bookmakerCount >= 7 ? "text-green-400" : pick.bookmakerCount >= 4 ? "text-yellow-400" : "text-red-400"}>
                              {pick.bookmakerCount}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={pick.dataQualityScore >= 70 ? "text-green-400" : pick.dataQualityScore >= 40 ? "text-yellow-400" : "text-red-400"}>
                              {pick.dataQualityScore.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge className={depthColor(pick.depth)}>{pick.depth}</Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {pick.isBootstrap ? (
                                <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">BOOT</Badge>
                              ) : (
                                <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">CANON</Badge>
                              )}
                              {pick.isFeatured && (
                                <Badge className="bg-yellow-400/10 text-yellow-300 border border-yellow-400/30">★</Badge>
                              )}
                              {pick.isPublicEligible && (
                                <Badge className="bg-blue-500/10 text-blue-300 border border-blue-500/30">PUB</Badge>
                              )}
                              {pick.willBeLearningEligible && (
                                <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/30">LEARN</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 text-center">
                            {isSelected ? "▲" : "▼"}
                          </td>
                        </tr>
                        {isSelected && (
                          <tr className="border-t border-gray-700">
                            <td colSpan={10} className="p-0">
                              <PickDetailPanel pick={pick} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Recently Settled + Performance ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Recently settled */}
          <SectionCard title={`Recently Settled — Last 7 Days (${recentlySettled.length})`}>
            {recentlySettled.length === 0 ? (
              <p className="px-4 py-6 text-center text-gray-600 text-sm">No settled picks yet</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 text-left border-b border-gray-800">
                      <th className="px-3 py-2">Result</th>
                      <th className="px-3 py-2">Game</th>
                      <th className="px-3 py-2">Pick</th>
                      <th className="px-3 py-2 text-right">Conf</th>
                      <th className="px-3 py-2">Depth</th>
                      <th className="px-3 py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentlySettled.map((s) => (
                      <tr key={s.id} className="border-t border-gray-800/50 hover:bg-gray-800/20">
                        <td className="px-3 py-2">
                          <Badge className={resultColor(s.result)}>{s.result}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-200">{s.homeTeam} vs {s.awayTeam}</div>
                          <div className="text-gray-500">{s.sport} · {ago(s.settledAt)}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-300">
                          {s.pickType} {s.selection}
                          {s.line !== null && <span className="text-gray-500"> @ {s.line > 0 ? "+" : ""}{s.line}</span>}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={confColor(s.confidence)}>{s.confidence}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={depthColor(s.depth)}>{s.depth}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {s.isBootstrap ? (
                              <Badge className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30">BOOT</Badge>
                            ) : (
                              <Badge className="bg-green-500/10 text-green-400 border border-green-500/30">CANON</Badge>
                            )}
                            {s.eligibleForLearning && (
                              <Badge className="bg-purple-500/10 text-purple-300 border border-purple-500/30">LEARN✓</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Performance */}
          <SectionCard title="Performance — Canonical Picks Only">
            <div className="p-4 space-y-4">
              {perf.sampleSizeWarning && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2 text-xs text-yellow-400">
                  ⚠ Small sample ({perf.canonicalTotal} canonical settled picks). Stats are directional only — not statistically robust.
                </div>
              )}
              {perf.canonicalTotal === 0 ? (
                <p className="text-gray-600 text-xs">No canonical settled picks yet.</p>
              ) : (
                <>
                  {/* Overall */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Overall ({perf.canonicalTotal} picks)</p>
                    <div className="flex gap-4 text-xs">
                      <span className="text-green-400">{perf.overall.wins}W</span>
                      <span className="text-red-400">{perf.overall.losses}L</span>
                      <span className="text-gray-400">{perf.overall.pushes}P</span>
                      <span className={`font-bold ${
                        perf.overall.winRate !== null && perf.overall.winRate >= 55 ? "text-green-400" :
                        perf.overall.winRate !== null && perf.overall.winRate >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {perf.overall.winRate !== null ? `${perf.overall.winRate}% ATS` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* By confidence band */}
                  {perf.byConfidenceBand.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">By Confidence Band</p>
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-600 text-xs">
                            <th className="text-left pb-1">Band</th>
                            <th className="text-right pb-1">N</th>
                            <th className="text-right pb-1">W</th>
                            <th className="text-right pb-1">L</th>
                            <th className="text-right pb-1">Win%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {perf.byConfidenceBand.map((b) => <WinRateCell key={b.label} band={b} />)}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* By grade */}
                  {perf.byGrade.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">By Pick Grade</p>
                      <table className="w-full">
                        <tbody>
                          {perf.byGrade.map((b) => <WinRateCell key={b.label} band={b} />)}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* By depth */}
                  {perf.byDepth.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">By Signal Depth</p>
                      <table className="w-full">
                        <tbody>
                          {perf.byDepth.map((b) => <WinRateCell key={b.label} band={b} />)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>
        </div>

        {/* Footer disclaimer */}
        <div className="text-center text-gray-700 text-xs py-2">
          Internal operator tool. All confidence values are uncalibrated until sufficient canonical history is accumulated.
          Past performance does not guarantee future results. Bootstrap-era picks are excluded from all performance stats.
        </div>

      </div>
    </div>
  );
}
