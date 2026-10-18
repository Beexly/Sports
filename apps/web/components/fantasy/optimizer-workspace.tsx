"use client";

/**
 * OptimizerWorkspace — one tool, every contest. A contest switch merges the
 * previously-separate DFS optimizer and season-long start/sit into a single
 * workspace, with the draft board reachable from the same door. Fixes the
 * "which optimizer do I open?" confusion.
 *
 * One toolbar carries the switch, the one-line purpose of the active contest,
 * its data status, and the link to its full page; the tool itself follows with
 * no repeated blurb.
 */

import { useState } from "react";
import Link from "next/link";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { LineupOptimizer } from "@/components/fantasy/lineup-optimizer";
import { DraftAssistant } from "@/components/fantasy/draft-assistant";
import { PracticeSlateTag } from "@/components/fantasy/practice-slate-tag";
import type { Player } from "@/lib/fantasy/players";

type Tab = "dfs" | "startsit" | "draft";

const TABS: { key: Tab; label: string; blurb: string; href: string }[] = [
  { key: "dfs", label: "Classic DFS", blurb: "Cash, GPP, and leverage lineups: locks, fades, exposure, stacking.", href: "/fantasy/dfs" },
  { key: "startsit", label: "Start / Sit", blurb: "Season-long lineup by floor, Projection, and Ceiling.", href: "/fantasy/lineup" },
  { key: "draft", label: "Draft", blurb: "Tiers, value over replacement, positional scarcity, run alerts.", href: "/fantasy/draft" },
];

/**
 * @param pool When provided, the (already viewer-gated) graded pool resolved
 * server-side — threaded into the season Start/Sit and Draft tools. DFS uses its own
 * licensed slate seam, so it's intentionally left on its own gate. When omitted,
 * every tab runs on the illustrative default (unchanged).
 * @param canUseFantasyFull Server-provided entitlement. Defaults FALSE (fail-closed):
 * a caller that forgets it gets the capped trial board, never the full paid suite.
 */
export function OptimizerWorkspace({
  pool,
  canUseFantasyFull = false,
}: { pool?: readonly Player[]; canUseFantasyFull?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("dfs");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-mineral pb-4">
        <div className="flex flex-wrap rounded-full border border-mineral bg-carbon/60 p-0.5" role="group" aria-label="Contest">
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={on}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  on ? "bg-orbital-cyan text-ion-blue-ink" : "text-ion-1 hover:text-ion-white"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="min-w-0 flex-1 text-sm text-ion-1">{active.blurb}</p>
        {/* DFS shows its own Practice slate marker (it hides once a DK CSV is
            imported); the season tools follow the server-resolved pool. */}
        {tab !== "dfs" &&
          (pool ? (
            <span className="rounded-full bg-orbital-cyan/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-orbital-cyan">
              Live players
            </span>
          ) : (
            <PracticeSlateTag />
          ))}
        {/* Dual-door fix (ASTRA A-7): each tab is the same tool as its full
            page. Link through instead of shipping two experiences. */}
        <Link href={active.href} className="text-xs font-medium text-orbital-cyan hover:text-ion-white">
          Open full page →
        </Link>
      </div>

      {tab === "dfs" && <DfsOptimizer />}
      {tab === "startsit" && <LineupOptimizer pool={pool} />}
      {tab === "draft" && <DraftAssistant pool={pool} canUseFantasyFull={canUseFantasyFull} />}
    </div>
  );
}
