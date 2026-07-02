"use client";

/**
 * StakingCalculator — Kelly, made safe. Enter your honest win probability and the
 * price; see the edge, the EV, full Kelly, and a sane fractional-Kelly stake.
 * It refuses to size a bet with no edge. Educational, not advice.
 */

import { useState } from "react";
import { staking } from "@/lib/tracker/staking";
import { BRAND_COLORS } from "@/lib/brand";

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
      <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Staking calculator · Kelly</p>
      <p className="mt-1 text-xs text-ink-400">Your honest win probability vs. the price decides the stake, not your gut.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Input label="Your win %" value={prob} onChange={setProb} suffix="%" />
        <Input label="Odds (American)" value={odds} onChange={setOdds} />
        <Input label="Bankroll (units)" value={bankroll} onChange={setBankroll} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-ink-400">
          <span>Kelly fraction</span>
          <span className="font-mono text-white">{Math.round(frac * 100)}% {frac === 1 ? "(full: high variance)" : frac <= 0.25 ? "(conservative)" : ""}</span>
        </div>
        <input type="range" min={0.1} max={1} step={0.05} value={frac} onChange={(e) => setFrac(Number(e.target.value))} className="mt-1 w-full accent-cyan-400" />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite" aria-label="Stake recommendation">
        <Stat label="Edge" value={`${s.edgePp >= 0 ? "+" : ""}${s.edgePp}pp`} hex={s.edgePp >= 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
        <Stat label="EV / unit" value={`${s.evPerUnit >= 0 ? "+" : ""}${s.evPerUnit}`} hex={s.hasEdge ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta} />
        <Stat label="Full Kelly" value={`${Math.round(s.fullKelly * 1000) / 10}%`} />
        <Stat label="Stake" value={s.hasEdge ? `${s.stakeAmount}u` : "—"} hex={BRAND_COLORS.softUltraviolet} big />
      </div>

      <p className="mt-4 rounded-lg border p-3 text-[11px] leading-relaxed" style={{ borderColor: s.hasEdge ? `${BRAND_COLORS.orbitalCyan}33` : `${BRAND_COLORS.ionMagenta}44`, color: s.hasEdge ? "#aeb8c4" : BRAND_COLORS.ionMagenta }}>
        {s.hasEdge
          ? `At ${Math.round(p * 100)}% to win, the market only implies ${Math.round(s.marketProb * 100)}%. That's a real edge. ${Math.round(frac * 100)}%-Kelly sizes it at ${s.stakeAmount} of ${bk} units. Full Kelly swings hard; most disciplined bettors stay at a quarter or less.`
          : `No edge here. Your ${Math.round(p * 100)}% sits at or below the market's implied ${Math.round(s.marketProb * 100)}%. Kelly says don't bet. The discipline is passing.`}
      </p>
    </div>
  );
}

function Input({ label, value, onChange, suffix }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="text-xs text-ink-400">
      {label}
      <div className="mt-1 flex items-center rounded-md border bg-transparent px-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent py-2 text-sm text-white outline-none" />
        {suffix && <span className="text-xs text-ink-600">{suffix}</span>}
      </div>
    </label>
  );
}

function Stat({ label, value, hex, big }: { label: string; value: string; hex?: string; big?: boolean }) {
  return (
    <div className="rounded-lg border p-3 text-center" style={{ borderColor: BRAND_COLORS.steelGray }}>
      <p className={`font-display ${big ? "text-2xl" : "text-lg"}`} style={{ color: hex ?? "#fff" }}>{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-ink-600">{label}</p>
    </div>
  );
}
