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
import { LivePoolEmpty } from "@/components/fantasy/live-pool-empty";

// Verdict tones (design tokens): win = verify, fair = neutral silver,
// lose = alert. Never plasma for a negative verdict.
const FAIR_TONE: Record<Fairness, string> = {
  "you win": "var(--verify)",
  fair: "var(--ion-1)",
  "you lose": "var(--alert)",
};

// Side identity (not semantic outcome): give = plasma, get = cyan — the two
// ends of the brand signal fade.
const GIVE_TONE = "var(--plasma)";
const GET_TONE = "var(--orbital-cyan)";

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
        <Side title="You give" tone={GIVE_TONE} players={giveP} onRemove={(id) => removeFrom("give", id)} value={evalResult?.giveValue ?? 0} pool={universe} />
        <Side title="You get" tone={GET_TONE} players={getP} onRemove={(id) => removeFrom("get", id)} value={evalResult?.getValue ?? 0} pool={universe} />
      </div>

      {/* verdict */}
      {evalResult ? (
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="rounded-full px-3 py-1 font-mono text-sm font-bold uppercase tracking-wider" style={{ background: `color-mix(in srgb, ${FAIR_TONE[evalResult.fairness]} 12%, transparent)`, color: FAIR_TONE[evalResult.fairness] }}>{evalResult.fairness}</span>
            <span className="rounded-full bg-titanium px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-ion-1">{evalResult.lean} lean</span>
            <span className="ml-auto font-mono text-sm tabular-nums text-ion-1">{evalResult.giveValue} → {evalResult.getValue} <span style={{ color: FAIR_TONE[evalResult.fairness] }}>({evalResult.delta >= 0 ? "+" : ""}{evalResult.delta})</span></span>
          </div>
          {/* value bar */}
          <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-titanium">
            <div style={{ width: `${(evalResult.giveValue / (evalResult.giveValue + evalResult.getValue)) * 100}%`, background: GIVE_TONE }} />
            <div style={{ width: `${(evalResult.getValue / (evalResult.giveValue + evalResult.getValue)) * 100}%`, background: GET_TONE }} />
          </div>
          <ul className="mt-4 space-y-1.5">
            {evalResult.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-[13px] text-ion-1"><span aria-hidden style={{ color: FAIR_TONE[evalResult.fairness] }}>▸</span>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="surface-card p-5 text-sm text-ion-1">Add at least one player to each side to evaluate the trade.</div>
      )}

      {/* pool */}
      <div className="surface-card p-4">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">Player pool · add to a side</p>
        <div className="max-h-[40vh] space-y-0.5 overflow-y-auto">
          {sortedPool.map((p) => {
            const used = give.includes(p.id) || get.includes(p.id);
            const phex = POS_HEX[p.pos];
            return (
              <div key={p.id} className="flex items-center gap-2 rounded px-1.5 py-1" style={{ opacity: used ? 0.4 : 1 }}>
                <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{p.pos}</span>
                <span className="flex-1 truncate text-xs text-ion-white">{p.name} <span className="text-ion-2">{p.team}</span></span>
                <span className="w-8 text-right font-mono text-[10px] tabular-nums text-ion-2">{tradeValue(p, universe)}</span>
                <button type="button" disabled={used} onClick={() => addTo("give", p.id)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-plasma disabled:opacity-30">Give</button>
                <button type="button" disabled={used} onClick={() => addTo("get", p.id)} className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-orbital-cyan disabled:opacity-30">Get</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Side({ title, tone, players, onRemove, value, pool }: { title: string; tone: string; players: Player[]; onRemove: (id: string) => void; value: number; pool: readonly Player[] }) {
  return (
    <div className="surface-card p-4" style={{ boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 20%, transparent)` }}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: tone }}>{title}</p>
        <p className="font-mono text-sm tabular-nums text-ion-white">{value}</p>
      </div>
      {players.length === 0 ? (
        <p className="mt-3 text-xs text-ion-2">Nothing here yet.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className="rounded px-1 py-0.5 font-mono text-[9px] font-bold" style={{ color: POS_HEX[p.pos], background: `${POS_HEX[p.pos]}1c` }}>{p.pos}</span>
              <span className="flex-1 truncate text-ion-white">{p.name}</span>
              <span className="font-mono text-[11px] tabular-nums text-ion-2">{tradeValue(p, pool)}</span>
              <button type="button" onClick={() => onRemove(p.id)} className="px-1 text-ion-2 hover:text-ion-white" aria-label={`Remove ${p.name}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
