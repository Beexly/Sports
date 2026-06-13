"use client";

/**
 * SchemeIntel — pick a coaching/scheme change, watch the cascade.
 *
 * Each scenario re-prices a whole offense: the gainers, the faders, the delta,
 * the reason, and the confidence from the source tier.
 */

import { useState } from "react";
import { SCHEME_SCENARIOS, applyScheme } from "@/lib/fantasy/scheme";
import { POS_HEX } from "@/lib/fantasy/players";
import { coachByTeam } from "@/lib/nfl/coaches";
import { BRAND_COLORS } from "@/lib/brand";

export function SchemeIntel() {
  const [id, setId] = useState(SCHEME_SCENARIOS[0]!.id);
  const scenario = SCHEME_SCENARIOS.find((s) => s.id === id)!;
  const cascade = applyScheme(scenario);
  const maxDelta = Math.max(...cascade.impacts.map((i) => Math.abs(i.deltaPct)), 1);
  const coach = coachByTeam(scenario.team);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
      {/* scenario picker */}
      <div className="space-y-2.5">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Coaching / scheme change</p>
        {SCHEME_SCENARIOS.map((s) => {
          const active = s.id === id;
          const c = coachByTeam(s.team);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setId(s.id)}
              className="surface-card block w-full p-4 text-left transition-transform hover:-translate-y-0.5"
              style={{ boxShadow: active ? `inset 0 0 0 1px ${BRAND_COLORS.orbitalCyan}` : undefined }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: BRAND_COLORS.ionWhite, background: "rgba(255,255,255,0.06)" }}>{s.team}</span>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: s.tier === "Insider" ? BRAND_COLORS.orbitalCyan : s.tier === "Beat" ? BRAND_COLORS.ionMagenta : "#9fb3c8" }}>{s.tier}</span>
                {c && <span className="ml-auto text-[10px] text-ink-500">{c.headCoach}</span>}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-white">{s.headline}</p>
            </button>
          );
        })}
      </div>

      {/* cascade */}
      <div className="space-y-4">
        <div className="surface-card p-5">
          {coach && (
            <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-ink-400">
              <span>HC <strong className="text-white">{coach.headCoach}</strong></span>
              {coach.offCoordinator && coach.offCoordinator !== coach.headCoach && <span>OC <strong className="text-white">{coach.offCoordinator}</strong></span>}
              {coach.defCoordinator && coach.defCoordinator !== coach.headCoach && <span>DC <strong className="text-white">{coach.defCoordinator}</strong></span>}
              <span className="ml-auto text-ink-600">since {coach.hiredYear}</span>
            </div>
          )}
          <p className="text-sm text-ink-300">{scenario.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <span style={{ color: BRAND_COLORS.orbitalCyan }}>{cascade.gainers} gain</span>
            <span style={{ color: BRAND_COLORS.ionMagenta }}>{cascade.faders} fade</span>
            <span className="ml-auto text-ink-500">Source confidence <strong className="text-white">{Math.round(cascade.confidence * 100)}%</strong> ({scenario.tier})</span>
          </div>
        </div>

        <div className="space-y-2">
          {cascade.impacts.map((i) => {
            const hex = i.direction === "up" ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta;
            const phex = POS_HEX[i.player.pos];
            const w = (Math.abs(i.deltaPct) / maxDelta) * 100;
            return (
              <div key={i.player.id} className="surface-card p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1 py-0.5 text-[9px] font-bold" style={{ color: phex, background: `${phex}1c` }}>{i.player.pos}</span>
                  <span className="text-sm font-semibold text-white">{i.player.name}</span>
                  <span className="text-xs text-ink-500">{i.player.role}</span>
                  <span className="ml-auto font-mono text-sm font-bold" style={{ color: hex }}>{i.deltaPct >= 0 ? "+" : ""}{i.deltaPct}%</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: hex, marginLeft: i.direction === "down" ? `${100 - w}%` : 0 }} />
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-400">{i.why}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
