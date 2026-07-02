"use client";

/**
 * TradeAnalyzer — build both sides, read the verdict.
 *
 * Add players to "you give" and "you get"; the values, fairness, win-now/depth
 * lean, and the reasoning re-compute live. Illustrative.
 */

import { useMemo, useState } from "react";
import { evaluateTrade, tradeValue, type Fairness } from "@/lib/fantasy/trade";
import { PLAYERS, POS_HEX, type Player } from "@/lib/fantasy/players";
import { BRAND_COLORS } from "@/lib/brand";
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

const FAIR_HEX: Record<Fairness, string> = {
  "you win": BRAND_COLORS.orbitalCyan,
  fair: BRAND_COLORS.ionWhite,
  "you lose": BRAND_COLORS.ionMagenta,
};

/**
 * @param pool When provided, the LIVE graded pool resolved server-side (real
 * players). When omitted, the tool runs on the illustrative default (unchanged).
 */
export function TradeAnalyzer({ pool }: { pool?: readonly Player[] } = {}) {
  const universe = useMemo(() => pool ?? PLAYERS, [pool]);
  const sortedPool = useMemo(() => [...universe].sort((a, b) => tradeValue(b, universe) - tradeValue(a, universe)), [universe]);
  const [give, setGive] = useState<string[]>([]);
  const [get, setGet] = useState<string[]>([]);

  const byId = (id: string) => sortedPool.find((p) => p.id === id)!;
  const giveP = give.map(byId);
  const getP = get.map(byId);
  const evalResult = evaluateTrade(giveP, getP, universe);

  const addTo = (side: "give" | "get", id: string) => {
    if (give.includes(id) || get.includes(id)) return;
    (side === "give" ? setGive : setGet)((xs) => [...xs, id]);
  };
  const removeFrom = (side: "give" | "get", id: string) => {
    (side === "give" ? setGive : setGet)((xs) => xs.filter((x) => x !== id));
  };

  // Live but the graded pool is empty/unavailable — honest empty state.
  if (pool != null && pool.length === 0) return <LivePoolEmpty />;

  return (
    <div className="space-y-6">
      {/* two sides */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Side title="You give" hex={BRAND_COLORS.ionMagenta} players={giveP} onRemove={(id) => removeFrom("give", id)} value={evalResult?.giveValue ?? 0} pool={universe} />
        <Side title="You get" hex={BRAND_COLORS.orbitalCyan} players={getP} onRemove={(id) => removeFrom("get", id)} value={evalResult?.getValue ?? 0} pool={universe} />
      </div>

      {/* verdict */}
      {evalResult ? (
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wider" style={{ background: `${FAIR_HEX[evalResult.fairness]}1f`, color: FAIR_HEX[evalResult.fairness] }}>{evalResult.fairness}</span>
            <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.06)", color: "#c8d2dd" }}>{evalResult.lean} lean</span>
            <span className="ml-auto font-mono text-sm text-ink-400">{evalResult.giveValue} → {evalResult.getValue} <span style={{ color: FAIR_HEX[evalResult.fairness] }}>({evalResult.delta >= 0 ? "+" : ""}{evalResult.delta})</span></span>
          </div>
          {/* value bar */}
          <div className="mt-4 flex h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div style={{ width: `${(evalResult.giveValue / (evalResult.giveValue + evalResult.getValue)) * 100}%`, background: BRAND_COLORS.ionMagenta }} />
            <div style={{ width: `${(evalResult.getValue / (evalResult.giveValue + evalResult.getValue)) * 100}%`, background: BRAND_COLORS.orbitalCyan }} />
          </div>
          <ul className="mt-4 space-y-1.5">
            {evalResult.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ink-300"><span style={{ color: FAIR_HEX[evalResult.fairness] }}>▸</span>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="surface-card p-5 text-sm text-ink-400">Add at least one player to each side to evaluate the trade.</div>
      )}

      {/* pool */}
      <div className="surface-card p-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-500">Player pool · add to a side</p>
        <div className="max-h-[40vh] space-y-0.5 overflow-y-auto">
          {sortedPool.map((p) => {
            const used = give.includes(p.id) || get.includes(p.id);
            const phex = POS_HEX[p.pos];
            return (
              <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1" style={{ opacity: used ? 0.4 : 1 }}>
                <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{p.pos}</span>
                <span className="flex-1 truncate text-xs text-white">{p.name} <span className="text-ink-600">{p.team}</span></span>
                <span className="w-8 text-right font-mono text-[10px] text-ink-500">{tradeValue(p, universe)}</span>
                <button type="button" disabled={used} onClick={() => addTo("give", p.id)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-30" style={{ color: BRAND_COLORS.ionMagenta }}>Give</button>
                <button type="button" disabled={used} onClick={() => addTo("get", p.id)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold disabled:opacity-30" style={{ color: BRAND_COLORS.orbitalCyan }}>Get</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Side({ title, hex, players, onRemove, value, pool }: { title: string; hex: string; players: Player[]; onRemove: (id: string) => void; value: number; pool: readonly Player[] }) {
  return (
    <div className="surface-card p-4" style={{ boxShadow: `inset 0 0 0 1px ${hex}33` }}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.16em]" style={{ color: hex }}>{title}</p>
        <p className="font-mono text-sm text-white">{value}</p>
      </div>
      {players.length === 0 ? (
        <p className="mt-3 text-xs text-ink-600">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: POS_HEX[p.pos], background: `${POS_HEX[p.pos]}1c` }}>{p.pos}</span>
              <span className="flex-1 truncate text-white">{p.name}</span>
              <span className="font-mono text-[11px] text-ink-500">{tradeValue(p, pool)}</span>
              <button type="button" onClick={() => onRemove(p.id)} className="px-1 text-ink-600 hover:text-white" aria-label="remove">×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
