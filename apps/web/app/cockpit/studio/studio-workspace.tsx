"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2, Wand2 } from "lucide-react";
import type {
  StudioAssetDraft,
  StudioDashboardData,
  StudioGameOption,
} from "@/lib/studio/build-assets";
import {
  fileNameForStudioDraft,
  markdownForStudioDraft,
} from "@/lib/studio/export";
import type { CreatorAssetKind } from "@/lib/studio/templates";

interface StudioNodeSummary {
  readonly id: string;
  readonly matchup: string;
  readonly evidenceScore: number;
  readonly evidenceStatus: string;
  readonly edgeIndex: number | null;
}

interface StudioWorkspaceProps {
  readonly games: readonly StudioGameOption[];
  readonly selectedGame: StudioGameOption | null;
  readonly selectedNode: StudioNodeSummary | null;
  readonly drafts: readonly StudioAssetDraft[];
}

interface StudioGenerateResponse {
  readonly success: boolean;
  readonly draft?: StudioAssetDraft;
  readonly error?: string;
  readonly message?: string;
}

type GenerationState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "done"; readonly draft: StudioAssetDraft; readonly copied?: boolean };

function statusClass(status: string): string {
  switch (status) {
    case "READY":
    case "green":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "GATED":
    case "yellow":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "THIN":
    case "red":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/[0.10]/50 bg-obsidian/40 text-ink-300";
  }
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toISOString().replace("T", " ").slice(0, 16);
}

function stateFor(
  states: Partial<Record<CreatorAssetKind, GenerationState>>,
  kind: CreatorAssetKind
): GenerationState {
  return states[kind] ?? { status: "idle" };
}

export function StudioWorkspace({
  games,
  selectedGame,
  selectedNode,
  drafts,
}: StudioWorkspaceProps): JSX.Element {
  const [states, setStates] = useState<Partial<Record<CreatorAssetKind, GenerationState>>>({});

  async function generateDraft(templateKind: CreatorAssetKind): Promise<void> {
    if (!selectedGame) return;
    setStates((current) => ({ ...current, [templateKind]: { status: "loading" } }));

    try {
      const response = await fetch("/api/cockpit/studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedGame.id, templateKind }),
      });
      const payload = (await response.json()) as StudioGenerateResponse;

      if (!response.ok || !payload.success || !payload.draft) {
        setStates((current) => ({
          ...current,
          [templateKind]: {
            status: "error",
            message: payload.message ?? payload.error ?? "Draft generation failed.",
          },
        }));
        return;
      }

      setStates((current) => ({
        ...current,
        [templateKind]: { status: "done", draft: payload.draft },
      }));
    } catch {
      setStates((current) => ({
        ...current,
        [templateKind]: {
          status: "error",
          message: "Draft generation failed before the response returned.",
        },
      }));
    }
  }

  async function copyDraft(draft: StudioAssetDraft): Promise<void> {
    await navigator.clipboard.writeText(markdownForStudioDraft(draft));
    setStates((current) => ({
      ...current,
      [draft.templateKind]: { status: "done", draft, copied: true },
    }));
  }

  function saveDraftMarkdown(draft: StudioAssetDraft): void {
    const blob = new Blob([markdownForStudioDraft(draft)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileNameForStudioDraft(draft);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
      <section className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_18rem]">
        <aside className="rounded-lg border border-white/[0.06] bg-obsidian/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Games</h2>
            <span className="text-[10px] uppercase tracking-wide text-ink-500">
              {games.length} loaded
            </span>
          </div>

          {games.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">
              No canonical games are ready for Studio. The workspace will populate
              after ingestion attaches market evidence.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {games.map((game) => {
                const selected = game.id === selectedGame?.id;
                return (
                  <li key={game.id}>
                    <Link
                      href={`/cockpit/studio?gameId=${game.id}`}
                      className={`block rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-yellow-500/50 bg-yellow-500/10"
                          : "border-white/[0.06] bg-obsidian/40 hover:bg-white/[0.03]"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{game.matchup}</p>
                      <p className="mt-1 text-[11px] text-ink-500">
                        {game.sport} - {formatTime(game.commenceTime)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="min-w-0 rounded-lg border border-white/[0.06] bg-obsidian/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Template Grid</h2>
              <p className="mt-1 text-xs text-ink-500">
                Eight Claude-ready prompt packages with citations and scanner state.
              </p>
            </div>
            {selectedNode ? (
              <span className="rounded-md border border-white/[0.06] px-2 py-1 text-[10px] uppercase tracking-wide text-ink-400">
                {selectedNode.matchup}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {drafts.map((draft) => {
              const generation = stateFor(states, draft.templateKind);
              const generatedDraft = generation.status === "done" ? generation.draft : null;
              const activeDraft = generatedDraft ?? draft;
              const canGenerate = Boolean(selectedGame) && !draft.refusalReason && generation.status !== "loading";

              return (
                <article
                  key={draft.templateKind}
                  className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{draft.templateName}</h3>
                      <p className="mt-1 text-[11px] text-ink-500">
                        {draft.templateKind.replace(/_/g, " ")}
                      </p>
                    </div>
                    <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(activeDraft.gateState)}`}>
                      {activeDraft.gateState}
                    </span>
                  </div>

                  {draft.refusalReason ? (
                    <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                      {draft.refusalReason}
                    </p>
                  ) : (
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="rounded-md border border-white/[0.06] bg-obsidian/60 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-ink-500">
                            Citations
                          </p>
                          <p className="mt-1 text-xs text-ink-300">{activeDraft.citations.length}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void generateDraft(draft.templateKind)}
                          disabled={!canGenerate}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs font-semibold text-yellow-100 transition-colors hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.04]/40 disabled:text-ink-500"
                        >
                          {generation.status === "loading" ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Wand2 className="h-4 w-4" aria-hidden="true" />
                          )}
                          Generate
                        </button>
                      </div>

                      {generation.status === "error" ? (
                        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
                          {generation.message}
                        </p>
                      ) : null}

                      {generatedDraft?.body ? (
                        <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] uppercase tracking-wide text-ink-500">
                              Draft Preview
                            </p>
                            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass(generatedDraft.compliance.status)}`}>
                              {generatedDraft.compliance.publicReady ? (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {generatedDraft.compliance.status}
                            </span>
                          </div>
                          <p className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap text-xs leading-5 text-ink-300">
                            {generatedDraft.body}
                          </p>
                          {generatedDraft.compliance.flags.length > 0 ? (
                            <ul className="mt-3 flex flex-col gap-2">
                              {generatedDraft.compliance.flags.map((flag) => (
                                <li key={flag.id} className="text-xs text-amber-200">
                                  {flag.message}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void copyDraft(generatedDraft)}
                              className="min-h-11 rounded-lg border border-white/[0.06] px-3 py-2 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/[0.03]"
                            >
                              {generation.status === "done" && generation.copied ? "Copied" : "Copy markdown"}
                            </button>
                            <button
                              type="button"
                              onClick={() => saveDraftMarkdown(generatedDraft)}
                              className="min-h-11 rounded-lg border border-white/[0.06] px-3 py-2 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/[0.03]"
                            >
                              Save markdown
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-ink-400">
                          Prompt ready. Output must pass the compliance scanner before export.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-white/[0.06] bg-obsidian/50 p-4">
          <h2 className="text-sm font-semibold text-white">Review Rail</h2>

          {selectedNode ? (
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">Evidence</p>
                <p className="mt-1 text-ink-300">
                  {selectedNode.evidenceScore}/100 - {selectedNode.evidenceStatus}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">Market Pulse</p>
                <p className="mt-1 text-ink-300">
                  Edge Index {selectedNode.edgeIndex ?? "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-3">
                <p className="text-[10px] uppercase tracking-wide text-ink-500">Export</p>
                <p className="mt-1 text-xs text-ink-500">
                  Copy and markdown save controls unlock after generation and scanner review.
                  External publishing is intentionally absent.
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-500">
              Select a game once canonical evidence exists.
            </p>
          )}
        </aside>
      </section>
  );
}

export function studioWorkspaceProps(data: StudioDashboardData): StudioWorkspaceProps {
  return {
    games: data.games,
    selectedGame: data.selectedGame,
    selectedNode: data.selectedNode
      ? {
          id: data.selectedNode.id,
          matchup: data.selectedNode.matchup,
          evidenceScore: data.selectedNode.evidenceHealth.score,
          evidenceStatus: data.selectedNode.evidenceHealth.status,
          edgeIndex: data.selectedNode.marketPulse.edgeIndex,
        }
      : null,
    drafts: data.drafts,
  };
}
