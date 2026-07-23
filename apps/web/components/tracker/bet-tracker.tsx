"use client";

/**
 * BetTracker — your CLV ledger, persisted locally.
 *
 * Log the bets you make, settle them with the closing price, and watch the
 * metric that actually predicts edge: CLV. ROI and calibration come along for
 * free. Stored in your browser; nothing leaves the device.
 *
 * Presentation: pure design tokens. Settlement outcomes use the semantic pair
 * (win = verify, loss = alert) and always travel with a text/sign encoding so
 * color is never the only carrier of meaning.
 */

import { useEffect, useState } from "react";
import { portfolio, calibration, clvOf, profit, type Bet, type BetResult } from "@/lib/tracker/clv";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const KEY = "gse_bets_v1";

const SAMPLE: Bet[] = [
  { id: "s1", date: "2026-01-04T18:00:00Z", sport: "NFL", event: "Eagles @ Cowboys", market: "Spread", selection: "PHI -3", odds: -110, stake: 1, closingOdds: -130, result: "win" },
  { id: "s2", date: "2026-01-05T20:00:00Z", sport: "NBA", event: "Nuggets @ Lakers", market: "Total", selection: "Under 228.5", odds: -108, stake: 1, closingOdds: -120, result: "loss" },
  { id: "s3", date: "2026-01-06T17:00:00Z", sport: "NFL", event: "Bills @ Dolphins", market: "Moneyline", selection: "BUF ML", odds: 135, stake: 1, closingOdds: 110, result: "win" },
  { id: "s4", date: "2026-01-07T19:00:00Z", sport: "NHL", event: "Bruins @ Rangers", market: "Puck line", selection: "BOS +1.5", odds: -120, stake: 1, result: "pending" },
];

const blankForm = { sport: "NFL", event: "", market: "Spread", selection: "", odds: "-110", stake: "1" };

// Signed quantities: positive = verify, negative = alert (the +/- sign is the
// redundant, non-color encoding). Neutral values stay ion-white.
const signTone = (v: number) => (v >= 0 ? "text-verify" : "text-alert");

const RESULT_TONE: Record<string, string> = {
  win: "text-verify",
  loss: "text-alert",
  push: "text-ion-2",
};

const FIELD_CLASS =
  "rounded-md border border-mineral bg-transparent px-2 py-1.5 text-sm text-ion placeholder:text-ion-3";

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
        <Metric label="Units" value={`${p.profit >= 0 ? "+" : ""}${p.profit}`} tone={signTone(p.profit)} />
        <Metric label="ROI" value={`${p.roi >= 0 ? "+" : ""}${p.roi}%`} tone={signTone(p.roi)} />
        <Metric label="Avg CLV" value={`${p.avgClv >= 0 ? "+" : ""}${p.avgClv}`} tone={signTone(p.avgClv)} />
        <Metric label="Beat close" value={`${p.clvWinRate}%`} tone="text-ultraviolet-glow" />
        <Metric label="Brier" value={`${p.brier}`} />
      </div>
      <p className="-mt-3 text-[11px] leading-relaxed text-ion-2">
        <strong className="text-ultraviolet-glow">Beat close</strong>, how often you got a better number than the market closed at, is the leading indicator. The record follows the CLV, not the other way around.
      </p>

      {/* add bet */}
      <div className="surface-card p-4">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-ion-2">Log a bet</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
          <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} aria-label="Sport" className={FIELD_CLASS}>
            {["NFL", "NBA", "MLB", "NHL", "NCAAF", "NCAAB", "Soccer"].map((s) => <option key={s} value={s} style={{ color: "#000" }}>{s}</option>)}
          </select>
          <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} placeholder="Matchup" aria-label="Matchup" className={`col-span-2 sm:col-span-2 ${FIELD_CLASS}`} />
          <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })} aria-label="Market" className={FIELD_CLASS}>
            {["Spread", "Total", "Moneyline", "Prop", "Parlay"].map((m) => <option key={m} value={m} style={{ color: "#000" }}>{m}</option>)}
          </select>
          <input value={form.selection} onChange={(e) => setForm({ ...form, selection: e.target.value })} placeholder="Selection (e.g. PHI -3)" aria-label="Selection" className={`col-span-2 sm:col-span-1 ${FIELD_CLASS}`} />
          <div className="flex gap-2">
            <input value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} placeholder="Odds" aria-label="Odds" className={`w-16 ${FIELD_CLASS}`} />
            <input value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} placeholder="u" aria-label="Stake in units" className={`w-12 ${FIELD_CLASS}`} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={add} className="btn btn-primary btn-sm">Add bet</button>
          {bets.length === 0 && <button type="button" onClick={() => setBets(SAMPLE)} className="text-xs text-ion-2 underline hover:text-ion-1">load a sample book</button>}
          {bets.length > 0 && <button type="button" onClick={() => setBets([])} className="text-xs text-ion-2 underline hover:text-ion-1">clear all</button>}
        </div>
      </div>

      {/* bets */}
      <div className="space-y-2">
        {bets.map((b) => <BetRow key={b.id} bet={b} onSettle={settle} onRemove={remove} />)}
        {bets.length === 0 && <div className="surface-card p-6 text-sm text-ion-1">No bets yet. Log one above, or load a sample book to see CLV in action.</div>}
      </div>

      {/* calibration */}
      {cal.length > 0 && (
        <div className="surface-card p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-ion-2">Calibration: predicted vs. actual win rate</p>
          <div className="space-y-2">
            {cal.map((c) => (
              <div key={c.label} className="flex items-center gap-2 text-xs">
                <span className={`w-16 text-ion-2 ${NUMERIC_TEXT_CLASS}`}>{c.label}</span>
                <div className="relative h-4 flex-1 rounded bg-titanium">
                  <div className="absolute inset-y-0 left-0 rounded bg-orbital-cyan/40" style={{ width: `${c.actual}%` }} />
                  <div className="absolute inset-y-0 w-0.5 bg-ion-white/80" style={{ left: `${c.predicted}%` }} title={`predicted ${c.predicted}%`} />
                </div>
                <span className={`w-24 text-right font-mono text-[10px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>{c.actual}% act · {c.predicted}% pred (n={c.n})</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-ion-2">Cyan bar = your actual win rate; the white marker = what your odds implied. Close together = well-calibrated.</p>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="surface-card p-3 text-center">
      <p className={`text-xl font-bold ${NUMERIC_TEXT_CLASS} ${tone ?? "text-ion-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ion-2">{label}</p>
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
        <span className="rounded bg-titanium/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ion-1">{bet.sport}</span>
        <span className="text-sm font-semibold text-ion-white">{bet.selection}</span>
        <span className="text-xs text-ion-2">{bet.event} · {bet.market} · {bet.odds > 0 ? "+" : ""}{bet.odds} · {bet.stake}u</span>
        <button type="button" onClick={() => onRemove(bet.id)} className="ml-auto px-1 text-ion-2 hover:text-ion-white" aria-label="remove">×</button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        {settled ? (
          <>
            <span className={`font-bold uppercase ${RESULT_TONE[bet.result] ?? "text-ion-2"}`}>{bet.result}</span>
            <span className="text-ion-2">P/L <strong className={signTone(pl)}>{pl >= 0 ? "+" : ""}{pl}u</strong></span>
            {c && <span className="text-ion-2">CLV <strong className={c.beat ? "text-verify" : "text-alert"}>{c.pp >= 0 ? "+" : ""}{c.pp}pp</strong> {c.beat ? "(beat close)" : "(reverse-CLV)"}</span>}
            {!c && <span className="text-ion-2">add closing odds for CLV →
              <input value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="close" aria-label="Closing odds" className="ml-1 w-16 rounded border border-mineral bg-transparent px-1 py-0.5 text-[11px] text-ion placeholder:text-ion-3" />
              <button type="button" onClick={() => { const v = parseInt(closing, 10); if (Number.isFinite(v)) onSettle(bet.id, bet.result, v); }} className="ml-1 text-orbital-cyan underline">save</button>
            </span>}
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ion-2">Settle:</span>
            <input value={closing} onChange={(e) => setClosing(e.target.value)} placeholder="closing odds" aria-label="Closing odds" className="w-24 rounded border border-mineral bg-transparent px-2 py-1 text-[11px] text-ion placeholder:text-ion-3" />
            {(["win", "loss", "push"] as BetResult[]).map((r) => (
              <button key={r} type="button" onClick={() => { const v = parseInt(closing, 10); onSettle(bet.id, r, Number.isFinite(v) ? v : undefined); }} aria-label={`Settle as ${r}`}
                className={`rounded bg-titanium/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${RESULT_TONE[r] ?? "text-ion-2"}`}>{r}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
