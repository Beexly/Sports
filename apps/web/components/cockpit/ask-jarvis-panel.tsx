"use client";

import { useState } from "react";
import {
  askJarvis,
  JARVIS_QUESTIONS,
  JARVIS_INTENT_ORDER,
  JARVIS_INTENT_GROUPS,
  JARVIS_GROUP_LABELS,
  type JarvisIntentGroup,
  type JarvisIntent,
  type JarvisAnswer,
} from "@/lib/cockpit/ask-jarvis";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";
import {
  OUR_STEALTH_SKELETON_MODELS,
  runJarvisJynxAutonomousBrain,
  type JarvisJynxBrainMode,
  type JarvisJynxAutonomousResponse,
  type OurStealthSkeletonModel,
} from "@/lib/jarvis/stealth-skeleton-brain";

const QUICK_AUTONOMOUS_MODES: readonly {
  readonly id: JarvisJynxBrainMode;
  readonly label: string;
  readonly prompt: string;
}[] = [
  {
    id: "content_making",
    label: "Content Making",
    prompt: "Generate Week 9 X post, IG carousel slides, and Chalkboard Reel script from our 132 IG + 100 X corpus",
  },
  {
    id: "dfs_picking",
    label: "DFS Picking",
    prompt: "Build optimal DraftKings and FanDuel Cash Flagship + GPP Tournament lineups and 14-player core pool",
  },
  {
    id: "bet_predicting",
    label: "Bet Predicting",
    prompt: "Run 5-Stage Conjunction Gate across Week 9 sides, totals, 360 player props, and correlated SGPs",
  },
  {
    id: "corpus_and_gsi",
    label: "Full Corpus & GSI",
    prompt: "Synthesize 5,367 equations, 25 graduate books (BK-01..BK-25), 257 PDFs, 81 Motif dossiers, and GSI trauma curves",
  },
];

export function AskJarvisPanel({ summary }: { summary: OwnerSummary }) {
  const [active, setActive] = useState<JarvisIntent | null>(null);
  const [answer, setAnswer] = useState<JarvisAnswer | null>(null);

  const [selectedModel, setSelectedModel] = useState<OurStealthSkeletonModel>("gse/skeleton-stealth");
  const [selectedMode, setSelectedMode] = useState<JarvisJynxBrainMode>("autonomous_all");
  const [promptInput, setPromptInput] = useState<string>(
    "Synthesize live Week 9 Content Pack, DFS Optimal Lineups, 5-Stage Bet Predictions, and GSI Biomechanics"
  );
  const [brainOutput, setBrainOutput] = useState<JarvisJynxAutonomousResponse>(() =>
    runJarvisJynxAutonomousBrain({
      prompt: "Synthesize live Week 9 Content Pack, DFS Optimal Lineups, 5-Stage Bet Predictions, and GSI Biomechanics",
      mode: "autonomous_all",
      model: "gse/skeleton-stealth",
    })
  );
  const [apiSyncState, setApiSyncState] = useState<"READY" | "SYNCING" | "SYNCED">("READY");

  function handleSelect(intent: JarvisIntent) {
    if (active === intent) {
      setActive(null);
      setAnswer(null);
      return;
    }
    setActive(intent);
    setAnswer(askJarvis(intent, summary));
  }

  async function handleRunAutonomousBrain(
    overrideMode?: JarvisJynxBrainMode,
    overridePrompt?: string,
    overrideModel?: OurStealthSkeletonModel
  ) {
    const nextMode = overrideMode ?? selectedMode;
    const nextPrompt = overridePrompt ?? promptInput;
    const nextModel = overrideModel ?? selectedModel;

    setSelectedMode(nextMode);
    if (overridePrompt) setPromptInput(overridePrompt);
    if (overrideModel) setSelectedModel(overrideModel);

    const immediate = runJarvisJynxAutonomousBrain({
      prompt: nextPrompt,
      mode: nextMode,
      model: nextModel,
    });
    setBrainOutput(immediate);
    setApiSyncState("SYNCING");

    try {
      const res = await fetch("/api/cockpit/jarvis/jynx-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nextPrompt,
          mode: nextMode,
          model: nextModel,
        }),
      });
      if (res.ok) {
        const remoteData = (await res.json()) as JarvisJynxAutonomousResponse;
        if (remoteData && remoteData.answer) {
          setBrainOutput(remoteData);
        }
      }
    } catch {
      // Instant local synthesis already populated brainOutput
    } finally {
      setApiSyncState("SYNCED");
    }
  }

  return (
    <section
      data-testid="ask-jarvis-panel"
      className="overflow-hidden rounded-2xl border border-titanium/50 bg-carbon/80"
    >
      {/* Terminal chrome */}
      <div className="flex items-center justify-between border-b border-titanium/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-alert/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-caution/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-verify/50" />
          </div>
          <span className="font-mono text-[10px] text-ion-3">
            <span className="text-accent-500">jarvis×jynx</span>
            <span className="text-ion-2">@gse</span>
            <span className="text-ion-3"> · OUR MODEL ({selectedModel})</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[9px] uppercase tracking-widest text-ion-3/60 sm:block">
            Composite 86.62/100 · Ledger 47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)
          </p>
          {active && (
            <button
              onClick={() => {
                setActive(null);
                setAnswer(null);
              }}
              className="font-mono text-[9px] text-ion-3 transition-colors hover:text-ion"
            >
              esc
            </button>
          )}
        </div>
      </div>

      {/* Jarvis x Jynx Autonomous Model Console */}
      <div
        data-testid="jarvis-jynx-autonomous-console"
        className="border-b border-titanium/40 bg-obsidian/50 p-5"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-accent-500/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-500">
                OUR MODEL: {selectedModel}
              </span>
              <span className="rounded border border-titanium/50 bg-carbon px-2 py-0.5 font-mono text-[9px] text-ion-2">
                Composite 86.62/100
              </span>
              <span className="rounded border border-titanium/50 bg-carbon px-2 py-0.5 font-mono text-[9px] text-ion-2">
                47-19-1 (+24.92u) | Base 38-13-1 (+22.85u)
              </span>
              <span className="rounded border border-titanium/50 bg-carbon px-2 py-0.5 font-mono text-[9px] text-ion-3">
                Geno Smith = NYJ QB · Mike Evans = SF WR
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ion-2">
              Jarvis x Jynx Autonomous Brain · 5,367 Equations · 25 Graduate Books (BK-01..BK-25) · 257 PDFs · 81 Motif Dossiers · GSI Biomechanics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="jarvis-jynx-model-select"
              className="font-mono text-[9px] uppercase tracking-wider text-ion-3"
            >
              Model
            </label>
            <select
              id="jarvis-jynx-model-select"
              data-testid="jarvis-jynx-model-select"
              value={selectedModel}
              onChange={(e) => {
                const next = e.target.value as OurStealthSkeletonModel;
                handleRunAutonomousBrain(selectedMode, promptInput, next);
              }}
              className="rounded-lg border border-titanium/60 bg-carbon px-2.5 py-1.5 font-mono text-[10px] text-ion-white focus:border-accent-500 focus:outline-none"
            >
              {OUR_STEALTH_SKELETON_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <span className="font-mono text-[9px] text-ion-3">
              API: {apiSyncState}
            </span>
          </div>
        </div>

        {/* 4 Quick-Action Autonomous Mode Buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_AUTONOMOUS_MODES.map((m) => {
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                data-testid={`jarvis-jynx-mode-${m.id}`}
                onClick={() => handleRunAutonomousBrain(m.id, m.prompt, selectedModel)}
                className={[
                  "rounded-lg border px-3 py-1.5 font-mono text-[10px] transition-all",
                  isSelected
                    ? "border-accent-500 bg-accent-500/15 text-ion-white"
                    : "border-titanium/50 bg-carbon/70 text-ion-2 hover:border-plasma/50 hover:text-ion-white",
                ].join(" ")}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Live Prompt Input + Run Our Model Button */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            data-testid="jarvis-jynx-prompt-input"
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            placeholder="Ask Jarvis x Jynx to generate content, build DFS lineups, score bets, or query GSI biomechanics..."
            className="flex-1 rounded-lg border border-titanium/60 bg-carbon px-3 py-2 font-mono text-xs text-ion-white placeholder:text-ion-3/50 focus:border-accent-500 focus:outline-none"
          />
          <button
            type="button"
            data-testid="jarvis-jynx-run-btn"
            onClick={() => handleRunAutonomousBrain(selectedMode, promptInput, selectedModel)}
            className="rounded-lg bg-accent-500 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-obsidian transition-opacity hover:opacity-90"
          >
            Run Our Model
          </button>
        </div>

        {/* Autonomous Synthesis Readout */}
        <div
          data-testid="jarvis-jynx-output"
          className="mt-4 space-y-3 rounded-xl border border-titanium/40 bg-carbon/90 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-titanium/30 pb-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent-500">
              {brainOutput.modelUsed} · Lane: {brainOutput.jynxRoutingLane} · Mode: {brainOutput.modeUsed}
            </span>
            <span className="font-mono text-[9px] text-ion-3">
              {brainOutput.corpusTelemetry.ragArchitecture}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-ion-white">
            {brainOutput.answer}
          </p>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Content Making Pack */}
            <div
              data-testid="jarvis-jynx-content-pack"
              className="rounded-lg border border-titanium/40 bg-obsidian/60 p-3"
            >
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-500">
                1. Autonomous Content Pack ({brainOutput.contentPack.socialArchiveStats})
              </p>
              <div className="space-y-1.5 text-[11px] text-ion-2">
                <p>
                  <span className="font-mono text-[9px] text-ion-3">X POST: </span>
                  {brainOutput.contentPack.xPost}
                </p>
                <p>
                  <span className="font-mono text-[9px] text-ion-3">IG CAROUSEL: </span>
                  {brainOutput.contentPack.igCarouselCaption}
                </p>
                <p>
                  <span className="font-mono text-[9px] text-ion-3">REEL SCRIPT: </span>
                  {brainOutput.contentPack.chalkboardReelScript}
                </p>
              </div>
            </div>

            {/* DFS Lineup Card */}
            <div
              data-testid="jarvis-jynx-dfs-card"
              className="rounded-lg border border-titanium/40 bg-obsidian/60 p-3"
            >
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-500">
                2. Autonomous DFS Lineup & Core Pool Card
              </p>
              <p className="mb-1 font-mono text-[10px] text-ion-white">
                {brainOutput.dfsLineupCard.cashFlagshipSummary}
              </p>
              <p className="mb-2 font-mono text-[10px] text-ion-2">
                {brainOutput.dfsLineupCard.gppTournamentSummary}
              </p>
              <ul className="space-y-1 text-[10px] text-ion-2">
                {brainOutput.dfsLineupCard.corePlays.slice(0, 4).map((play, idx) => (
                  <li key={idx} className="font-mono">
                    [{play.pos}] {play.player} ({play.salary} · {play.projection}) - {play.injuryRedistributionNote}
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-titanium/30 pt-1.5 text-[10px] text-ion-3">
                {brainOutput.dfsLineupCard.standingRosterNotes.map((note, idx) => (
                  <p key={idx}>· {note}</p>
                ))}
              </div>
            </div>

            {/* 360 Bet Prediction Card */}
            <div
              data-testid="jarvis-jynx-bet-card"
              className="rounded-lg border border-titanium/40 bg-obsidian/60 p-3"
            >
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-500">
                3. 360-Degree 5-Stage Gated Bet & SGP Card ({brainOutput.betPredictionCard.seasonLedger})
              </p>
              <ul className="space-y-1 text-[10px] text-ion-2">
                {brainOutput.betPredictionCard.gatedGameCalls.map((call, idx) => (
                  <li key={idx} className="font-mono">
                    [{call.stageGateDecision}] {call.selection} ({call.convictionScore} · +{call.clvBps} bps CLV)
                  </li>
                ))}
                {brainOutput.betPredictionCard.topPlayerProps.slice(0, 3).map((prop, idx) => (
                  <li key={`prop-${idx}`} className="font-mono">
                    [PROP {prop.stageGateDecision}] {prop.selection} ({prop.convictionScore} · +{prop.clvBps} bps CLV)
                  </li>
                ))}
              </ul>
            </div>

            {/* GSI Biomechanics & Corpus Overlay */}
            <div
              data-testid="jarvis-jynx-gsi-overlay"
              className="rounded-lg border border-titanium/40 bg-obsidian/60 p-3"
            >
              <p className="mb-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent-500">
                4. GSI Biomechanics & Full Corpus Overlay (BK-01..BK-25)
              </p>
              <p className="mb-1.5 text-[10px] text-ion-white">
                {brainOutput.gsiBiomechanicsOverlay.summary}
              </p>
              <ul className="space-y-1 text-[10px] text-ion-2">
                {brainOutput.gsiBiomechanicsOverlay.returnToPlayDegradationNotes.map((n, idx) => (
                  <li key={idx}>· {n}</li>
                ))}
                {brainOutput.gsiBiomechanicsOverlay.verifiedRosterBiomechanics.map((n, idx) => (
                  <li key={`roster-${idx}`} className="font-mono text-ion-3">
                    · {n}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Deterministic Operator State Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Command list */}
        <div className="border-b border-titanium/30 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 font-mono text-[10px] text-ion-3">
            <span className="text-accent-500">$</span>{" "}
            <span className="text-ion-white">ask</span>
            {!active && (
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-cursor-blink bg-accent-500 align-middle" />
            )}
          </p>

          <div className="space-y-3">
            {(Object.keys(JARVIS_INTENT_GROUPS) as JarvisIntentGroup[]).map((group) => (
              <div key={group}>
                <p className="mb-1 px-3 font-mono text-[8px] font-bold uppercase tracking-widest text-ion-3/60">
                  {JARVIS_GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {JARVIS_INTENT_GROUPS[group].map((intent) => (
                    <button
                      key={intent}
                      onClick={() => handleSelect(intent)}
                      data-testid={`ask-jarvis-btn-${intent}`}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-left transition-all",
                        active === intent
                          ? "border-plasma bg-plasma/10"
                          : "border-transparent hover:bg-titanium/40",
                      ].join(" ")}
                    >
                      <span className="w-5 flex-shrink-0 font-mono text-[9px] tabular-nums text-ion-3">
                        {String(JARVIS_INTENT_ORDER.indexOf(intent) + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={[
                          "flex-1 text-[11px] transition-colors",
                          active === intent ? "text-ion-white" : "text-ion-2",
                        ].join(" ")}
                      >
                        {JARVIS_QUESTIONS[intent]}
                      </span>
                      {active === intent && (
                        <span className="flex-shrink-0 text-[10px] text-plasma">▶</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer pane */}
        <div className="p-4">
          {answer ? (
            <div
              data-testid="ask-jarvis-answer"
              className="animate-fade-up"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-accent-500">
                {answer.question}
              </p>

              <p className="mb-4 text-sm leading-relaxed text-ion-white">
                {answer.answer}
              </p>

              {answer.supportingState.length > 0 && (
                <div className="mb-3 rounded-lg border border-titanium/40 bg-obsidian/60 p-3">
                  <ul className="space-y-0.5">
                    {answer.supportingState.map((s, idx) => (
                      <li key={idx} className="font-mono text-[9px] text-ion-2">
                        <span className="select-none text-ion-3">· </span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-[9px] text-ion-3">
                  confidence{" "}
                  <span
                    className={
                      answer.confidence === "HIGH"
                        ? "text-accent-500"
                        : answer.confidence === "MEDIUM"
                          ? "text-caution"
                          : "text-ion-2"
                    }
                  >
                    {answer.confidence}
                  </span>
                </span>
              </div>

              {answer.caveat && (
                <p className="mt-3 text-[9px] italic leading-relaxed text-ion-3/70">
                  {answer.caveat}
                </p>
              )}

              {answer.nextAction && (
                <div className="mt-3 rounded-lg border border-titanium/40 bg-obsidian/40 px-3 py-2">
                  <p className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-ion-3">
                    next_action
                  </p>
                  <p className="text-[10px] leading-snug text-ion-white">{answer.nextAction}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col justify-between">
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="font-mono text-[10px] text-ion-3">
                    <span className="text-accent-500">$</span>{" "}
                    <span className="text-ion-white">jarvis ask</span>
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-cursor-blink bg-accent-500 align-middle" />
                  </p>
                  <p className="mt-2 text-[9px] text-ion-3/50">
                    Select a question to query Jarvis
                  </p>
                  <p className="mt-0.5 text-[9px] text-ion-3">
                    All answers derived from live operator state
                  </p>
                </div>
              </div>

              {/* Quick command chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(["picks", "launch-ready", "what-is-wired"] as const).map((intent) => (
                  <button
                    key={intent}
                    onClick={() => handleSelect(intent)}
                    className="rounded-full border border-titanium/50 bg-obsidian/60 px-3 py-1 font-mono text-[8px] text-ion-2 transition-all hover:border-plasma/40 hover:bg-plasma/10 hover:text-plasma"
                  >
                    {JARVIS_QUESTIONS[intent]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
