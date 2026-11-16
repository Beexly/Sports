"use client";

import React, { useId, useState } from "react";
import type { ContestFormat, LineupDoctorReport } from "@/lib/fantasy/lineup-doctor";

const SAMPLE_CLASSIC = [
  "C.J. Stroud",
  "James Cook III",
  "Christian McCaffrey",
  "Matthew Golden",
  "Khalil Shakir",
  "Xavier Hutchinson",
  "Dalton Schultz",
  "Ashton Jeanty",
  "Vikings DST",
].join("\n");

export function LineupDoctorPanel({ canSeeRepairs }: { readonly canSeeRepairs: boolean }) {
  const inputId = useId();
  const modeId = useId();
  const [contestType, setContestType] = useState<ContestFormat>("classic");
  const [playersText, setPlayersText] = useState(SAMPLE_CLASSIC);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<LineupDoctorReport | null>(null);

  async function handleAudit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const parsed = playersText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/dfs/lineup-doctor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contestType, players: parsed }),
      });
      const data = (await res.json()) as LineupDoctorReport & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Unable to check lineup.");
        setReport(null);
      } else {
        setReport(data);
      }
    } catch {
      setError("Network error while checking lineup.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="lineup-doctor-heading"
      className="surface-card mb-8 border border-mineral bg-eclipse p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-mineral pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-plasma">
            Instant Pre-Lock Check · Active Starters &amp; Salary Cap
          </p>
          <h2 id="lineup-doctor-heading" className="mt-1 font-display text-2xl font-semibold text-ion-white">
            DraftKings Lineup Doctor (Classic 2-TE &amp; Showdown)
          </h2>
        </div>
        <span className="border border-mineral bg-carbon px-3 py-1 font-mono text-xs text-orbital-cyan">
          {canSeeRepairs ? "Full Swap Repairs Unlocked" : "Free Check · Swaps Unlock in DFS Packs"}
        </span>
      </div>

      <form onSubmit={handleAudit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={modeId} className="block font-mono text-xs uppercase tracking-wider text-ion-2">
              Contest Format
            </label>
            <select
              id={modeId}
              value={contestType}
              onChange={(ev) => setContestType(ev.target.value as ContestFormat)}
              className="mt-1.5 w-full rounded border border-mineral bg-obsidian px-3 py-2 text-sm text-ion-white focus:border-plasma focus:outline-none"
            >
              <option value="classic">Classic ($50K · 9 Slots · 2-TE Legal)</option>
              <option value="showdown">Showdown ($50K · 1 CPT + 5 FLEX)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={inputId} className="block font-mono text-xs uppercase tracking-wider text-ion-2">
              Paste Player Names (one per line or comma separated)
            </label>
            <textarea
              id={inputId}
              rows={4}
              value={playersText}
              onChange={(ev) => setPlayersText(ev.target.value)}
              className="mt-1.5 w-full rounded border border-mineral bg-obsidian p-3 font-mono text-xs text-ion-white focus:border-plasma focus:outline-none"
              placeholder="Paste 9 Classic players or 6 Showdown players (Captain first)"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded border border-plasma bg-plasma px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-obsidian transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Checking Starters..." : "Run Lineup Check"}
          </button>
          <span className="text-xs text-ion-2">
            Flags inactive players, backup QBs, salary overages, and latest kickoff FLEX ordering.
          </span>
        </div>
      </form>

      <div aria-live="polite" className="mt-5">
        {error && (
          <div role="alert" className="rounded border border-alert/60 bg-alert/10 p-3 text-sm text-ion-white">
            {error}
          </div>
        )}

        {report && (
          <div className="space-y-4 rounded border border-mineral bg-carbon p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mineral/60 pb-3">
              <strong className={report.ok ? "text-verify" : "text-caution"}>
                {report.ok
                  ? `PASS · Week ${report.week} Active Starters & Salary Verified`
                  : `ACTION NEEDED · ${report.issues.length} Issue${report.issues.length === 1 ? "" : "s"} Found`}
              </strong>
              <span className="font-mono text-xs text-ion-1">
                Salary: ${report.totalSalary.toLocaleString()} / ${report.salaryCap.toLocaleString()}
                {report.projectedPoints !== null ? ` · Proj: ${report.projectedPoints} pts` : ""}
              </span>
            </div>

            {report.issues.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-xs text-caution">
                {report.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}

            {report.recommendedFlexPlayer && (
              <p className="text-xs text-orbital-cyan">
                Late-swap FLEX placement: place {report.recommendedFlexPlayer} in FLEX for maximum kickoff flexibility.
              </p>
            )}

            {report.suggestedSwaps && report.suggestedSwaps.length > 0 && (
              <div className="rounded border border-verify/40 bg-obsidian p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-verify">
                  Optimal Cap-Legal Swap Repair
                </div>
                <ul className="mt-1 space-y-1 text-xs text-ion-white">
                  {report.suggestedSwaps.map((sw) => (
                    <li key={`${sw.slot}-${sw.dropName}`}>
                      [{sw.slot}] Drop {sw.dropName} (${sw.dropSalary.toLocaleString()}) · Add{" "}
                      <strong>{sw.addName}</strong> ({sw.addPos} · {sw.addTeam} · ${sw.addSalary.toLocaleString()})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.requiresUpgradeForRepairs && report.issues.length > 0 && (
              <p className="text-xs text-ion-2">
                Full 1-swap optimal replacement suggestions and point totals unlock with any RedZone DFS or All-Access pack below.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
