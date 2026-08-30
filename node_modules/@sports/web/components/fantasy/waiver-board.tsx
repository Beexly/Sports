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
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

// Conviction ladder mapped to the design-system confidence ladder:
// elite → plasma, strong → cyan, solid → ultraviolet, lean → silver.
const TIER_TONE: Record<FaabTier, string> = {
  Priority: "var(--plasma)",
  Target: "var(--orbital-cyan)",
  Speculative: "var(--ultraviolet)",
  Dart: "var(--ion-1)",
};

const TREND_MARK = { up: "▲", flat: "—", down: "▼" } as const;
// Directional trend pairs the sign glyph with a semantic tone (verify up /
// alert down) — never plasma for a negative direction.
const TREND_TONE = { up: "text-verify", flat: "text-ion-2", down: "text-alert" } as const;

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
        <label className="flex items-center gap-3 text-sm text-ion-1">
          Remaining FAAB
          <span className="font-mono text-lg tabular-nums text-ion-white">${budget}</span>
          <input type="range" min={1} max={1000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} className="accent-orbital-cyan" />
        </label>
        <p className="text-xs text-ion-2">Bids re-price to your budget. Tier sets the share; you set the pool.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* targets */}
        <div className="space-y-2.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">Waiver targets</p>
          {targets.map((rec) => {
            const tone = TIER_TONE[rec.tier];
            const phex = POS_HEX[rec.player.pos];
            return (
              <div key={rec.player.id} className="surface-card flex items-center gap-3 p-3">
                <div className="w-16 shrink-0 text-center">
                  <p className="font-numerals text-xl font-semibold tabular-nums text-ion-white">${bidDollars(rec, budget)}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider" style={{ color: tone }}>{rec.tier}</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-mineral pl-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ion-white">
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{rec.player.pos}</span>
                    {rec.player.name}
                    <span className="text-xs font-normal text-ion-2">{rec.player.team} · {rec.player.role}</span>
                    <span className={`text-[11px] ${TREND_TONE[rec.player.trend]}`}>{TREND_MARK[rec.player.trend]}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ion-1">{rec.reason}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-xs tabular-nums text-ion-1">{rec.player.proj}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">proj</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* drops */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="surface-card p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">Drop candidates</p>
            <p className="mt-1 text-xs text-ion-1">The weakest rostered value: the spot you&apos;d clear for a target.</p>
            <ul className="mt-4 space-y-2">
              {drops.map((p) => {
                const phex = POS_HEX[p.pos];
                return (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{p.pos}</span>
                    <span className="flex-1 truncate text-ion-white">{p.name}</span>
                    <span className={`text-[11px] ${TREND_TONE[p.trend]}`}>{TREND_MARK[p.trend]}</span>
                    <span className="font-mono text-[11px] tabular-nums text-ion-2">{p.proj}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-ion-2">
              Drop value is the floor of your bench, not last week&apos;s box score. A down-trending name with name
              value is often the right cut.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
