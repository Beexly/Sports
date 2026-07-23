"use client";

/**
 * StakingCalculator — Kelly, made safe. Enter your honest win probability and the
 * price; see the edge, the EV, full Kelly, and a sane fractional-Kelly stake.
 * It refuses to size a bet with no edge. Educational, not advice.
 *
 * Presentation: pure design tokens. Signed quantities pair verify/alert with a
 * +/- sign; the no-edge state is a caution (a warning to pass), not a loss.
 */

import { useState } from "react";
import { staking } from "@/lib/tracker/staking";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

export function StakingCalculator() {
  const [prob, setProb] = useState("55");
  const [odds, setOdds] = useState("-110");
  const [bankroll, setBankroll] = useState("100");
  const [frac, setFrac] = useState(0.25);

  const p = Math.max(0, Math.min(100, parseFloat(prob) || 0)) / 100;
  const o = parseInt(odds, 10) || -110;
  const bk = Math.max(0, parseFloat(bankroll) || 0);
  const s = staking(p, o, bk, frac);

  return (
    <div className="surface-card p-5">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ion-2">Staking calculator · Kelly</p>
      <p className="mt-1 text-xs text-ion-1">Your honest win probability vs. the price decides the stake, not your gut.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input label="Your win %" value={prob} onChange={setProb} suffix="%" />
        <Input label="Odds (American)" value={odds} onChange={setOdds} />
        <Input label="Bankroll (units)" value={bankroll} onChange={setBankroll} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ion-1">
          <span>Kelly fraction</span>
          <span className={`font-mono text-ion-white ${NUMERIC_TEXT_CLASS}`}>{Math.round(frac * 100)}% {frac === 1 ? "(full: high variance)" : frac <= 0.25 ? "(conservative)" : ""}</span>
        </div>
        <input type="range" min={0.1} max={1} step={0.05} value={frac} onChange={(e) => setFrac(Number(e.target.value))} className="mt-1 w-full accent-orbital-cyan" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite" aria-label="Stake recommendation">
        <Stat label="Edge" value={`${s.edgePp >= 0 ? "+" : ""}${s.edgePp}pp`} tone={s.edgePp >= 0 ? "text-verify" : "text-alert"} />
        <Stat label="EV / unit" value={`${s.evPerUnit >= 0 ? "+" : ""}${s.evPerUnit}`} tone={s.hasEdge ? "text-verify" : "text-alert"} />
        <Stat label="Full Kelly" value={`${Math.round(s.fullKelly * 1000) / 10}%`} />
        <Stat label="Stake" value={s.hasEdge ? `${s.stakeAmount}u` : "—"} tone="text-ultraviolet-glow" big />
      </div>

      <p className={`mt-4 rounded-lg border p-3 text-[11px] leading-relaxed ${s.hasEdge ? "border-verify/30 text-ion-1" : "border-caution/40 text-caution"}`}>
        {s.hasEdge
          ? `At ${Math.round(p * 100)}% to win, the market only implies ${Math.round(s.marketProb * 100)}%. That's a real edge. ${Math.round(frac * 100)}%-Kelly sizes it at ${s.stakeAmount} of ${bk} units. Full Kelly swings hard; most disciplined bettors stay at a quarter or less.`
          : `No edge here. Your ${Math.round(p * 100)}% sits at or below the market's implied ${Math.round(s.marketProb * 100)}%. Kelly says don't bet. The discipline is passing.`}
      </p>
    </div>
  );
}

function Input({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="text-xs text-ion-1">
      {label}
      <div className="mt-1 flex items-center rounded-md border border-mineral bg-transparent px-3">
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-2 text-sm text-ion-white outline-none" />
        {suffix && <span className="text-xs text-ion-2">{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, tone, big }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="rounded-lg border border-mineral p-3 text-center">
      <p className={`${big ? "text-2xl" : "text-lg"} font-bold ${NUMERIC_TEXT_CLASS} ${tone ?? "text-ion-white"}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-ion-2">{label}</p>
    </div>
  );
}
