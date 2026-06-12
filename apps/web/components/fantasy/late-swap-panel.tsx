"use client";

/**
 * LateSwapPanel — find optimal player replacements after scratches are announced.
 *
 * Works on any imported lineup. Mark a player as scratched; the engine locks
 * everyone else and finds the best legal replacement within the remaining cap.
 * Shows before/after side-by-side so the call is easy.
 */

import { useMemo, useState } from "react";
import { lateSwap, metrics, type LateSwapResult } from "@/lib/fantasy/dfs-optimizer";
import { DFS_SLOTS, DFS_POS_HEX, SALARY_CAP, type DfsPlayer } from "@/lib/fantasy/dfs-slate";
import { BRAND_COLORS } from "@/lib/brand";

interface Props {
  lineup: readonly DfsPlayer[];
  slate: readonly DfsPlayer[];
}

export function LateSwapPanel({ lineup, slate }: Props) {
  const [scratched, setScratched] = useState<Set<string>>(new Set());
  const [mode] = useState<"cash" | "gpp" | "leverage">("gpp");

  const toggle = (id: string) => {
    setScratched((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const result: LateSwapResult | null = useMemo(() => {
    if (scratched.size === 0) return null;
    return lateSwap(lineup, scratched, mode, slate);
  }, [lineup, scratched, mode, slate]);

  const originalMetrics = useMemo(() => metrics(lineup), [lineup]);
  const swappedMetrics = useMemo(() => result ? metrics(result.swapped) : null, [result]);

  if (lineup.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-5 text-center text-sm text-ink-400" style={{ borderColor: BRAND_COLORS.steelGray }}>
        Generate a lineup first, then use Late Swap to handle scratches.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ background: BRAND_COLORS.ionMagenta, color: BRAND_COLORS.obsidianBlack }}>
          Late Swap
        </span>
        <p className="text-xs text-ink-300">
          Mark scratched players below — the engine locks everyone else and finds the best legal replacement.
        </p>
        {scratched.size > 0 && (
          <button type="button" onClick={() => setScratched(new Set())} className="ml-auto text-[11px] text-ink-500 hover:text-white">
            clear scratches
          </button>
        )}
      </div>

      {/* lineup with scratch toggles */}
      <div className="surface-card overflow-hidden p-0">
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 border-b px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <span>Slot</span><span>Player</span><span className="text-right">Salary</span><span className="text-right">Scratch?</span>
        </div>
        {lineup.map((p, i) => {
          const isScratch = scratched.has(p.id);
          const c = DFS_POS_HEX[p.pos];
          const slot = DFS_SLOTS[i] ?? p.pos;
          const replacement = result?.swapped[i];
          const changed = result?.changedSlots.includes(i);
          return (
            <div
              key={p.id + i}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b px-4 py-2.5 last:border-b-0"
              style={{ borderColor: `${BRAND_COLORS.steelGray}80`, background: isScratch ? `${BRAND_COLORS.ionMagenta}0a` : "transparent" }}
            >
              <span className="w-10 font-mono text-[10px] font-bold" style={{ color: c }}>{slot}</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: isScratch ? BRAND_COLORS.ionMagenta : "white", textDecoration: isScratch ? "line-through" : undefined }}>
                    {p.name}
                  </span>
                  {isScratch && <span className="rounded px-1 py-0.5 text-[9px] font-bold uppercase" style={{ background: `${BRAND_COLORS.ionMagenta}20`, color: BRAND_COLORS.ionMagenta }}>OUT</span>}
                </div>
                {changed && replacement && !isScratch && (
                  <p className="mt-0.5 text-[11px]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                    → {replacement.name} <span className="font-mono text-ink-500">${replacement.salary}</span>
                  </p>
                )}
                {isScratch && replacement && (
                  <p className="mt-0.5 text-[11px]" style={{ color: BRAND_COLORS.orbitalCyan }}>
                    Swap in: <strong>{replacement.name}</strong> <span className="font-mono text-ink-500">${replacement.salary} · {Math.round(replacement.proj * 10) / 10} proj</span>
                  </p>
                )}
                {isScratch && !result && (
                  <p className="mt-0.5 text-[11px] text-ink-500">No legal replacement found under the cap.</p>
                )}
              </div>
              <span className="font-mono text-[11px] text-ink-400">${p.salary.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors"
                style={{
                  background: isScratch ? BRAND_COLORS.ionMagenta : "rgba(255,255,255,0.07)",
                  color: isScratch ? BRAND_COLORS.obsidianBlack : "var(--ion-3,#8b9bb4)",
                  border: `1px solid ${isScratch ? BRAND_COLORS.ionMagenta : BRAND_COLORS.steelGray}`,
                }}
              >
                {isScratch ? "Scratched" : "Scratch"}
              </button>
            </div>
          );
        })}
      </div>

      {/* comparison footer */}
      {result && swappedMetrics && (
        <div className="surface-card p-4">
          <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-ink-500">Swap summary</p>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Salary" original={`$${originalMetrics.salary.toLocaleString()}`} updated={`$${swappedMetrics.salary.toLocaleString()}`} delta={result.salaryDelta !== 0 ? `${result.salaryDelta > 0 ? "+" : ""}$${result.salaryDelta}` : "—"} good={result.salaryDelta <= 0} />
            <Stat label="Projected" original={`${originalMetrics.proj}`} updated={`${swappedMetrics.proj}`} delta={result.projDelta !== 0 ? `${result.projDelta > 0 ? "+" : ""}${result.projDelta}` : "—"} good={result.projDelta >= 0} />
            <Stat label="Cap left" original={`$${(SALARY_CAP - originalMetrics.salary).toLocaleString()}`} updated={`$${(SALARY_CAP - swappedMetrics.salary).toLocaleString()}`} delta="" good />
          </div>
        </div>
      )}

      {scratched.size > 0 && !result && (
        <p className="text-xs" style={{ color: BRAND_COLORS.ionMagenta }}>
          No legal lineup found after these scratches — try a different scratch combination or adjust locks.
        </p>
      )}
    </div>
  );
}

function Stat({ label, original, updated, delta, good }: { label: string; original: string; updated: string; delta: string; good: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-0.5 font-mono text-xs text-ink-400 line-through">{original}</p>
      <p className="font-mono text-sm font-semibold text-white">{updated}</p>
      {delta && (
        <p className="font-mono text-[11px]" style={{ color: good ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{delta}</p>
      )}
    </div>
  );
}
