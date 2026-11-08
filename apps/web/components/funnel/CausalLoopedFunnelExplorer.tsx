import React, { useState, KeyboardEvent } from "react";

export interface FunnelMetricItem {
  readonly code: string;
  readonly label: string;
  readonly formattedValue: string;
  readonly tierLabel: string;
}

export interface FunnelStageSummary {
  readonly stageNumber: number;
  readonly title: string;
  readonly subtitle: string;
  readonly statusLabel: "VERIFIED" | "ACTIVE" | "LOCKED";
  readonly summaryCopy: string;
  readonly keyMetrics: ReadonlyArray<FunnelMetricItem>;
}

export interface CausalLoopedFunnelExplorerProps {
  readonly gameId: string;
  readonly matchupLabel: string;
  readonly readinessScore100: number;
  readonly stages: ReadonlyArray<FunnelStageSummary>;
  readonly isEntitledMember: boolean;
  readonly isLoading?: boolean;
  readonly errorMessage?: string | null;
}

/**
 * Editorial Sports Broadcast Telemetry Explorer for the 6-Stage Causal Looped Funnel.
 *
 * Surface Mode: Operate (dense, scannable, WCAG 2.2 AA contrast, zero em-dashes,
 * strict /100 confidence scale, server-redacted paywall safety).
 */
export function CausalLoopedFunnelExplorer({
  gameId,
  matchupLabel,
  readinessScore100,
  stages,
  isEntitledMember,
  isLoading = false,
  errorMessage = null,
}: CausalLoopedFunnelExplorerProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Matchup telemetry loading"
        className="rounded-xl border border-[#24324B] bg-[#111826] p-6 text-[#F3F6FA]"
      >
        <p className="font-mono text-sm text-[#B8C4D9]">
          Loading matchup environment telemetry for {matchupLabel}...
        </p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section
        role="alert"
        className="rounded-xl border border-[#F59E0B] bg-[#111826] p-6 text-[#F3F6FA]"
      >
        <h2 className="text-base font-semibold text-[#F59E0B]">
          Matchup Telemetry Unavailable
        </h2>
        <p className="mt-2 text-sm text-[#B8C4D9]">{errorMessage}</p>
      </section>
    );
  }

  if (!stages || stages.length === 0) {
    return (
      <section
        aria-label="Empty matchup telemetry"
        className="rounded-xl border border-[#24324B] bg-[#111826] p-6 text-[#F3F6FA]"
      >
        <p className="text-sm text-[#B8C4D9]">
          No funnel stages available for {matchupLabel} ({gameId}).
        </p>
      </section>
    );
  }

  const safeIdx = Math.min(Math.max(selectedIdx, 0), stages.length - 1);
  const activeStage = stages[safeIdx];

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setSelectedIdx((prev) => (prev + 1) % stages.length);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSelectedIdx((prev) => (prev - 1 + stages.length) % stages.length);
    }
  };

  return (
    <section
      aria-label={`Matchup Funnel Telemetry: ${matchupLabel}`}
      data-game-id={gameId}
      className="rounded-xl border border-[#24324B] bg-[#0B0F17] p-6 text-[#F3F6FA] shadow-lg"
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#24324B] pb-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-wider text-[#38BDF8]">
            6-Stage Looped Matchup Funnel
          </span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-[#F3F6FA]">
            {matchupLabel}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[#24324B] bg-[#111826] px-3 py-2 text-right">
            <span className="block font-mono text-[11px] uppercase text-[#B8C4D9]">
              Environment Score
            </span>
            <span className="font-mono text-base font-semibold text-[#34D399]">
              {readinessScore100.toFixed(2)}/100
            </span>
          </div>
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Funnel stages"
        onKeyDown={handleKeyDown}
        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
      >
        {stages.map((stage, idx) => {
          const isSelected = idx === safeIdx;
          return (
            <button
              key={stage.stageNumber}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={`funnel-stage-panel-${stage.stageNumber}`}
              id={`funnel-stage-tab-${stage.stageNumber}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => setSelectedIdx(idx)}
              className={`min-h-[48px] rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#38BDF8] ${
                isSelected
                  ? "border-[#38BDF8] bg-[#182235] text-[#F3F6FA]"
                  : "border-[#24324B] bg-[#111826] text-[#B8C4D9] hover:border-[#38BDF8]/60"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs">
                <span>STAGE {stage.stageNumber}</span>
                <span className="text-[#34D399]">{stage.statusLabel}</span>
              </div>
              <div className="mt-1 truncate text-xs font-semibold text-[#F3F6FA]">
                {stage.title}
              </div>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`funnel-stage-panel-${activeStage.stageNumber}`}
        aria-labelledby={`funnel-stage-tab-${activeStage.stageNumber}`}
        className="mt-5 rounded-lg border border-[#24324B] bg-[#111826] p-5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-[#F3F6FA]">
              Stage {activeStage.stageNumber}: {activeStage.title}
            </h3>
            <p className="text-xs text-[#B8C4D9]">{activeStage.subtitle}</p>
          </div>
          <span className="rounded bg-[#182235] px-2.5 py-1 font-mono text-xs text-[#38BDF8]">
            {activeStage.statusLabel}
          </span>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#F3F6FA]">
          {activeStage.summaryCopy}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeStage.keyMetrics.map((metric) => (
            <div
              key={metric.code}
              className="rounded-lg border border-[#24324B] bg-[#0B0F17] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#B8C4D9]">
                  {metric.label}
                </span>
                <span className="font-mono text-[11px] text-[#38BDF8]">
                  {metric.tierLabel}
                </span>
              </div>
              <div className="mt-1.5 font-mono text-base font-bold text-[#F3F6FA]">
                {metric.formattedValue}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-5 border-t border-[#24324B] pt-4">
          {isEntitledMember ? (
            <p className="font-mono text-xs text-[#34D399]">
              Member Access Active: Full projection board, prop edges, and DFS
              construction pools unlocked.
            </p>
          ) : (
            <p className="font-mono text-xs text-[#F59E0B]">
              Public Matchup Environment View: Official side, total, player
              prop tickets, and DFS lineups require active member access.
            </p>
          )}
        </footer>
      </div>
    </section>
  );
}
