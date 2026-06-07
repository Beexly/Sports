"use client";

/**
 * WaiverBoard — ranked adds, FAAB bids, and drop candidates, with the why.
 *
 * Set your remaining FAAB budget and every target's recommended bid re-prices
 * live. Tiered by conviction (Priority → Dart), each with a one-line rationale,
 * and the weakest rostered players surfaced as the spot you'd clear. Illustrative.
 */

import { useMemo, useState } from "react";
import { waiverTargets, bidDollars, dropCandidates, type FaabTier } from "@/lib/fantasy/waivers";
import { POS_HEX, type Player } from "@/lib/fantasy/players";
import { BRAND_COLORS } from "@/lib/brand";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

const TIER_HEX: Record<FaabTier, string> = {
  Priority: BRAND_COLORS.orbitalCyan,
  Target: BRAND_COLORS.softUltraviolet,
  Speculative: BRAND_COLORS.ionMagenta,
  Dart: "#7b8794",
};

const TREND_MARK = { up: "▲", flat: "—", down: "▼" } as const;

/**
 * @param pool When provided, the LIVE graded pool resolved server-side (real
 * players). When omitted, the tool runs on the illustrative default (unchanged).
 */
export function WaiverBoard({ pool }: { pool?: readonly Player[] } = {}) {
  const targets = useMemo(() => waiverTargets(pool), [pool]);
  const drops = useMemo(() => dropCandidates(pool), [pool]);
  const [budget, setBudget] = useState(100);

  // Live but the graded pool is empty/unavailable — honest empty state.
  if (pool != null && pool.length === 0) return <LivePoolEmpty />;

  return (
    <div className="space-y-6">
      <div className="surface-card flex flex-wrap items-center gap-4 p-4">
        <label className="flex items-center gap-3 text-sm text-ink-300">
          Remaining FAAB
          <span className="font-mono text-lg text-white">${budget}</span>
          <input type="range" min={1} max={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="accent-cyan-400" />
        </label>
        <p className="text-xs text-ink-500">Bids re-price to your budget. Tier sets the share; you set the pool.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* targets */}
        <div className="space-y-2.5">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Waiver targets</p>
          {targets.map((rec) => {
            const hex = TIER_HEX[rec.tier];
            const phex = POS_HEX[rec.player.pos];
            return (
              <div key={rec.player.id} className="surface-card flex items-center gap-3 p-3">
                <div className="w-16 shrink-0 text-center">
                  <p className="font-display text-xl text-white">${bidDollars(rec, budget)}</p>
                  <p className="text-[9px] uppercase tracking-wider" style={{ color: hex }}>{rec.tier}</p>
                </div>
                <div className="min-w-0 flex-1 border-l pl-3" style={{ borderColor: `${BRAND_COLORS.steelGray}90` }}>
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{rec.player.pos}</span>
                    {rec.player.name}
                    <span className="text-xs font-normal text-ink-500">{rec.player.team} · {rec.player.role}</span>
                    <span className="text-[11px]" style={{ color: rec.player.trend === "up" ? BRAND_COLORS.orbitalCyan : rec.player.trend === "down" ? BRAND_COLORS.ionMagenta : "#7b8794" }}>{TREND_MARK[rec.player.trend]}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">{rec.reason}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-xs text-ink-300">{rec.player.proj}</p>
                  <p className="text-[9px] uppercase tracking-wider text-ink-600">proj</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* drops */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="surface-card p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Drop candidates</p>
            <p className="mt-1 text-xs text-ink-400">The weakest rostered value — the spot you&apos;d clear for a target.</p>
            <ul className="mt-4 space-y-2">
              {drops.map((p) => {
                const phex = POS_HEX[p.pos];
                return (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{p.pos}</span>
                    <span className="flex-1 truncate text-white">{p.name}</span>
                    <span className="text-[11px]" style={{ color: p.trend === "down" ? BRAND_COLORS.ionMagenta : "#7b8794" }}>{TREND_MARK[p.trend]}</span>
                    <span className="font-mono text-[11px] text-ink-500">{p.proj}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[10px] leading-relaxed text-ink-600">
              Drop value is the floor of your bench, not last week&apos;s box score — a down-trending name with name
              value is often the right cut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
