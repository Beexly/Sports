"use client";

/**
 * OptimizerWorkspace — one tool, every contest. A contest switch merges the
 * previously-separate DFS optimizer and season-long start/sit into a single
 * workspace, with the draft board reachable from the same door. Fixes the
 * "which optimizer do I open?" confusion.
 */

import { useState } from "react";
import Link from "next/link";
import { DfsOptimizer } from "@/components/fantasy/dfs-optimizer";
import { LineupOptimizer } from "@/components/fantasy/lineup-optimizer";
import { DraftAssistant } from "@/components/fantasy/draft-assistant";
import { BRAND_COLORS } from "@/lib/brand";
import type { Player } from "@/lib/fantasy/players";

type Tab = "dfs" | "startsit" | "draft";

const TABS: { key: Tab; label: string; blurb: string }[] = [
  { key: "dfs", label: "Classic DFS", blurb: "Build cash / GPP / leverage lineups against the slate — locks, fades, exposure, stacking." },
  { key: "startsit", label: "Start / Sit", blurb: "Season-long lineup by floor, median, and ceiling — who to start and why." },
  { key: "draft", label: "Draft", blurb: "Live draft board — tiers, value over replacement, positional scarcity, run alerts." },
];

/**
 * @param pool When provided, the LIVE graded pool resolved server-side — threaded
 * into the season Start/Sit and Draft tools (real players). DFS uses its own
 * licensed slate seam, so it's intentionally left on its own gate. When omitted,
 * every tab runs on the illustrative default (unchanged).
 */
export function OptimizerWorkspace({ pool }: { pool?: readonly Player[] } = {}) {
  const [tab, setTab] = useState<Tab>("dfs");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="space-y-5">
      <div className="surface-card flex flex-wrap items-center gap-3 p-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">Contest</span>
        <div className="flex flex-wrap rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
          {TABS.map((t) => {
            const on = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none"
                style={{ color: on ? BRAND_COLORS.obsidianBlack : "var(--ion-2,#c8d2dd)", background: on ? BRAND_COLORS.orbitalCyan : "transparent" }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-ink-400">{active.blurb}</p>
      </div>

      {tab === "dfs" && <DfsOptimizer />}
      {tab === "startsit" && <LineupOptimizer pool={pool} />}
      {tab === "draft" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-400">
              Live draft board — tiers, value over replacement, positional scarcity, run alerts, and your
              own ADP overlay. {pool ? "Live graded pool — real players." : "Illustrative pool until a licensed projections feed is connected."}
            </p>
            <Link href="/fantasy/draft" className="text-xs font-medium" style={{ color: BRAND_COLORS.orbitalCyan }}>Open full page →</Link>
          </div>
          <DraftAssistant pool={pool} />
        </div>
      )}
    </div>
  );
}
