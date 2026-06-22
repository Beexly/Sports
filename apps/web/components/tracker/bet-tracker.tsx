"use client";

/**
 * BetTracker — your CLV ledger, persisted locally.
 *
 * Log the bets you make, settle them with the closing price, and watch the
 * metric that actually predicts edge: CLV. ROI and calibration come along for
 * free. Stored in your browser; nothing leaves the device.
 */

import { useEffect, useState } from "react";
import { portfolio, calibration, clvOf, profit, type Bet, type BetResult } from "@/lib/tracker/clv";
import { BRAND_COLORS } from "@/lib/brand";

const KEY = "gse_bets_v1";

const SAMPLE: Bet[] = [
  { id: "s1", date: "2026-01-04T18:00:00Z", sport: "NFL", event: "Eagles @ Cowboys", market: "Spread", selection: "PHI -3", odds: -110, stake: 1, closingOdds: -130, result: "win" },
  { id: "s2", date: "2026-01-05T20:00:00Z", sport: "NBA", event: "Nuggets @ Lakers", market: "Total", selection: "Under 228.5", odds: -108, stake: 1, closingOdds: -120, result: "loss" },
  { id: "s3", date: "2026-01-06T17:00:00Z", sport: "NFL", event: "Bills @ Dolphins", market: "Moneyline", selection: "BUF ML", odds: 135, stake: 1, closingOdds: 110, result: "win" },
  { id: "s4", date: "2026-01-07T19:00:00Z", sport: "NHL", event: "Bruins @ Rangers", market: "Puck line", selection: "BOS +1.5", odds: -120, stake: 1, result: "pending" },
];

const blankForm = { sport: "NFL", event: "", market: "Spread", selection: "", odds: "-110", stake: "1" };

export function BetTracker() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [form, setForm] = useState(blankForm);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setBets(JSON.parse(raw)); } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(bets)); } catch { /* ignore */ } }, [bets, loaded]);

  const p = portfolio(bets);
  const cal = calibration(bets);

  const add = () => {
    const odds = parseInt(form.odds, 10);
    const stake = parseFloat(form.stake);
    if (!form.event.trim() || !form.selection.trim() || !Number.isFinite(odds) || !Number.isFinite(stake)) return;
    const b: Bet = {
      id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(), sport: form.sport, event: form.event.trim(),
      market: form.market, selection: form.selection.trim(), odds, stake, result: "pending",
    };
    setBets((xs) => [b, ...xs]);
    setForm({ ...blankForm, sport: form.sport, market: form.market });
  };

  const settle = (id: string, result: BetResult, closingOdds?: number) =>
    setBets((xs) => xs.map((b) => (b.id === id ? { ...b, result, closingOdds: closingOdds ?? b.closingOdds } : b)));
  const remove = (id: string) => setBets((xs) => xs.filter((b) => b.id !== id));

  return (
    <div className="space-y-6">
      {/* portfolio */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-live="polite" aria-label="Portfolio summary">
        <Metric label="Record" value={p.record} />
        <Metric label="Units" value={`${p.profit >= 0 ? "+" : ""}${p.profit}`} hex={p.profit >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
        <Metric label="ROI" value={`${p.roi >= 0 ? "+" : ""}${p.roi}%`} hex={p.roi >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
        <Metric label="Avg CLV" value={`${p.avgClv >= 0 ? "+" : ""}${p.avgClv}`} hex={p.avgClv >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
        <Metric label="Beat close" value={`${p.clvWinRate}%`} hex={BRAND_COLORS.softUltraviolet} />
        <Metric label="Brier" value={`${p.brier}`} />
      </div>
      <p className="-mt-3 text-[11px] text-ink-600">
        <strong style={{ color: BRAND_COLORS.softUltraviolet }}>Beat close</strong> — how often you got a better number than the market closed at — is the leading indicator. The record follows the CLV, not the other way around.
      </p>

      {/* add bet */}
      <div className="surface-card p-4">
        <p className="mb-3 text-xs uppercase tracking-[0.18em] text-ink-500">Log a bet</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} aria-label="Sport" className="rounded-md border bg-transparent px-2 py-1.5 text-sm text-ink-200" style={{ borderColor: BRAND_COLORS.steelGray }}>
            {["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "Soccer"].map((s) => <option key={s} value={s} style={{ color: "#000" }}>{s}</option>)}
          </select>
          <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} placeholder="Matchup" aria-label="Matchup" className="col-span-2 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white sm:col-span-2" style={{ borderColor: BRAND_COLORS.steelGray }} />
          <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} aria-label="Market" className="rounded-md border bg-transparent px-2 py-1.5 text-sm text-ink-200" style={{ borderColor: BRAND_COLORS.steelGray }}>
            {["Spread", "Total", "Moneyline", "Prop", "Parlay"].map((m) => <option key={m} value={m} style={{ color: "#000" }}>{m}</option>)}
          </select>
          <input value={form.selection} onChange={(e) => setForm({ ...form, selection: e.target.value })} placeholder="Selection (e.g. PHI -3)" aria-label="Selection" className="col-span-2 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white sm:col-span-1" style={{ borderColor: BRAND_COLORS.steelGray }} />
          <div className="flex gap-2">
            <input value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="Odds" aria-label="Odds" className="w-16 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
            <input value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} placeholder="u" aria-label="Stake in units" className="w-12 rounded-md border bg-transparent px-2 py-1.5 text-sm text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={add} className="btn btn-primary btn-sm">Add bet</button>
          {bets.length === 0 && <button type="button" onClick={() => setBets(SAMPLE)} className="text-xs text-ink-500 underline">load a sample book</button>}
          {bets.length > 0 && <button type="button" onClick={() => setBets([])} className="text-xs text-ink-600 underline">clear all</button>}
        </div>
      </div>

      {/* bets */}
      <div className="space-y-2">
        {bets.map((b) => <BetRow key={b.id} bet={b} onSettle={settle} onRemove={remove} />)}
        {bets.length === 0 && <div className="surface-card p-6 text-sm text-ink-400">No bets yet. Log one above, or load a sample book to see CLV in action.</div>}
      </div>

      {/* calibration */}
      {cal.length > 0 && (
        <div className="surface-card p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.18em] text-ink-500">Calibration — predicted vs. actual win rate</p>
          <div className="space-y-2">
            {cal.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-ink-500">{c.label}</span>
                <div className="relative h-4 flex-1 rounded" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${c.actual}%`, background: `${BRAND_COLORS.orbitalCyan}66` }} />
                  <div className="absolute inset-y-0" style={{ left: `${c.predicted}%`, width: 2, background: BRAND_COLORS.ionMagenta }} title={`predicted ${c.predicted}%`} />
                </div>
                <span className="w-24 text-right font-mono text-[10px] text-ink-500">{c.actual}% act · {c.predicted}% pred (n={c.n})</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-ink-600">Cyan bar = your actual win rate; magenta line = what your odds implied. Close together = well-calibrated.</p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hex }: { label: string; value: string; hex?: string }) {
  return (
    <div className="surface-card p-3 text-center">
      <p className="font-display text-xl" style={{ color: hex ?? "#fff" }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}

function BetRow({ bet, onSettle, onRemove }: { bet: Bet; onSettle: (id: string, r: BetResult, c?: number) => void; onRemove: (id: string) => void }) {
  const [closing, setClosing] = useState("");
  const c = clvOf(bet);
  const pl = profit(bet);
  const settled = bet.result !== "pending";
  return (
    <div className="surface-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: "rgba(255,255,255,0.06)", color: "#c8d2dd" }}>{bet.sport}</span>
        <span className="text-sm font-semibold text-white">{bet.selection}</span>
        <span className="text-xs text-ink-500">{bet.event} · {bet.market} · {bet.odds > 0 ? "+" : ""}{bet.odds} · {bet.stake}u</span>
        <button type="button" onClick={() => onRemove(bet.id)} className="ml-auto px-1 text-ink-600 hover:text-white" aria-label="remove">×</button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        {settled ? (
          <>
            <span className="font-bold uppercase" style={{ color: bet.result === "win" ? BRAND_COLORS.orbitalCyan : bet.result === "loss" ? BRAND_COLORS.ionMagenta : "#9fb3c8" }}>{bet.result}</span>
            <span className="text-ink-500">P/L <strong style={{ color: pl >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{pl >= 0 ? "+" : ""}{pl}u</strong></span>
            {c && <span className="text-ink-500">CLV <strong style={{ color: c.beat ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>{c.pp >= 0 ? "+" : ""}{c.pp}pp</strong> {c.beat ? "(beat close)" : "(reverse-CLV)"}</span>}
            {!c && <span className="text-ink-600">add closing odds for CLV →
              <input value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="close" aria-label="Closing odds" className="ml-1 w-16 rounded border bg-transparent px-1 py-0.5 text-[11px] text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
              <button type="button" onClick={() => { const v = parseInt(closing, 10); if (Number.isFinite(v)) onSettle(bet.id, bet.result, v); }} className="ml-1 underline" style={{ color: BRAND_COLORS.orbitalCyan }}>save</button>
            </span>}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink-600">Settle:</span>
            <input value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="closing odds" aria-label="Closing odds" className="w-24 rounded border bg-transparent px-2 py-1 text-[11px] text-white" style={{ borderColor: BRAND_COLORS.steelGray }} />
            {(["win", "loss", "push"] as BetResult[]).map((r) => (
              <button key={r} type="button" onClick={() => { const v = parseInt(closing, 10); onSettle(bet.id, r, Number.isFinite(v) ? v : undefined); }} aria-label={`Settle as ${r}`}
                className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.06)", color: r === "win" ? BRAND_COLORS.orbitalCyan : r === "loss" ? BRAND_COLORS.ionMagenta : "#9fb3c8" }}>{r}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
