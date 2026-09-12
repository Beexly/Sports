"use client";

/**
 * GalaxyBroadcast. The cinematic, always-on transmission at the top of The Beat.
 *
 * The public face of the newsroom: two synthetic anchors, Nova works the field,
 * Orion holds the desk, trade the week's top signals, with a broadcast
 * lower-third, a teleprompter, a segment rundown, and a drop-cadence strip.
 *
 * Audio: the browser speech-synthesis Play control was removed 2026-09-12.
 * It sounded robotic and nothing like a human read. The founder called it
 * "horrible and nothing human-like." The segment script is still on screen;
 * when a real TTS lane lands it can come back behind an explicit opt-in.
 *
 * No photoreal likeness. The anchors are stylized brand marks, never
 * generated faces. Reduced-motion safe: the scene is CSS only. Nothing
 * plays on load.
 */

import { useEffect, useState } from "react";
import type { Broadcast } from "@/lib/fantasy/host";
import { SCENES } from "@/lib/fantasy/host";
import { BRAND_COLORS } from "@/lib/brand";
import { GsnLockup } from "@/components/brand/gsn-lockup";
import { nextTransmission, formatCountdown, type NextTransmission } from "@/lib/broadcast/schedule";

export function GalaxyBroadcast({ broadcast }: { broadcast: Broadcast }) {
  const segs = broadcast.segments;
  const [i, setI] = useState(0);
  // Guard against an empty rundown so the broadcast never crashes to a blank.
  const seg = segs[i] ?? segs[0] ?? null;
  const scene = seg ? SCENES[seg.scene] : null;
  const reporter = seg?.reporter ?? null;
  const onColdOpen = i === 0;
  const onSignOff = i === segs.length - 1;

  // ── Drop-cadence countdown (client-only; ticks each minute) ──────────────
  const [drop, setDrop] = useState<NextTransmission | null>(null);
  useEffect(() => {
    const update = () => setDrop(nextTransmission(new Date()));
    update();
    const t = window.setInterval(update, 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Empty rundown → a calm placeholder instead of a crash (hooks run first).
  if (!seg || !scene || !reporter) {
    return (
      <div className="surface-card p-6 text-sm text-ion-2">
        No transmission is queued right now. Check back at the next drop.
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden p-0">
      {/* On-air bar: the GSN network bug, live state, and presenter disclosure */}
      <div className="flex flex-wrap items-center gap-3 border-b p-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
        <GsnLockup variant="bug" size={22} />
        <span aria-hidden className="h-4 w-px" style={{ background: BRAND_COLORS.steelGray }} />
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ background: "rgba(255,45,45,0.16)", color: "#ff5a5a" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#ff5a5a", animation: "pp-live-pulse 2s ease-in-out infinite" }} />
          On air
        </span>
        <p className="font-display text-sm font-semibold text-ion-white">
          GSN Broadcast <span className="text-ion-3">· Week {broadcast.week}</span>
        </p>
        <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}>
          Synthetic presenters
        </span>
      </div>

      {/* One-line "what this is" + next-transmission countdown */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
        <p className="text-xs text-ion-1">
          The week&apos;s signals, anchored by Nova from the field and Orion at the desk. Press play to listen.
        </p>
        {drop && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mineral bg-carbon/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: BRAND_COLORS.orbitalCyan }} />
            Next: {drop.drop.cadence} · {formatCountdown(drop.msUntil)}
          </span>
        )}
      </div>

      {/* Broadcast frame */}
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        {/* Scene stage */}
        <div
          className="relative min-h-[280px] overflow-hidden p-5"
          style={{
            background: `radial-gradient(120% 90% at 20% 100%, ${scene.accent}26, transparent 60%), radial-gradient(80% 70% at 90% 10%, ${scene.accent}14, transparent 60%), ${BRAND_COLORS.obsidianBlack}`,
          }}
        >
          <div aria-hidden className="gsn-scanlines pointer-events-none absolute inset-0 opacity-[0.1]" />
          <div className="relative flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${scene.accent}22`, color: scene.accent }}>
              On location · {scene.label}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ion-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              {seg.kicker}
            </span>
          </div>

          {/* Presenter on stage, the active segment's reporter */}
          <div className="relative mt-10 flex items-end gap-3">
            <Avatar accent={scene.accent} initial={reporter.initial} />
            <div className="mb-1">
              <p className="font-display text-xl text-ion-white">{reporter.name}</p>
              <p className="text-[11px] text-ion-2">{reporter.role}</p>
              <p className="text-[10px] text-ion-3">reporting from {scene.setting}</p>
            </div>
          </div>

          {/* Lower third: the GSN network identity over the on-air title */}
          <div className="absolute inset-x-0 bottom-0 border-t p-3" style={{ borderColor: `${scene.accent}55`, background: "linear-gradient(0deg, rgba(0,0,0,0.72), transparent)" }}>
            <GsnLockup variant="full" size={18} />
            <p className="mt-1 text-sm font-medium text-ion-white">{broadcast.title}</p>
          </div>
        </div>

        {/* Teleprompter */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ion-3">Teleprompter · {reporter.name}</p>
          </div>
          <p className="mt-3 text-[15px] leading-relaxed text-ion-white">
            {onColdOpen ? `${broadcast.coldOpen} ` : ""}
            {seg.script}
          </p>
          {onSignOff && <p className="mt-3 text-[15px] leading-relaxed text-ion-1">{broadcast.signOff}</p>}

          {/* Transport */}
          <div className="mt-5 flex items-center gap-2">
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn btn-ghost btn-sm disabled:opacity-40">
              ‹ Prev
            </button>
            <span className="font-mono text-xs text-ion-2">{i + 1}/{segs.length}</span>
            <button type="button" onClick={() => setI((x) => Math.min(segs.length - 1, x + 1))} disabled={onSignOff} className="btn btn-primary btn-sm ml-auto disabled:opacity-40">
              Next segment ›
            </button>
          </div>
        </div>
      </div>

      {/* Rundown, each chip shows its reporter's initial */}
      <div className="flex flex-wrap gap-1.5 border-t p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {segs.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setI(idx)}
            aria-current={idx === i ? "true" : undefined}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{
              background: idx === i ? `${SCENES[s.scene].accent}22` : "rgba(255,255,255,0.04)",
              color: idx === i ? SCENES[s.scene].accent : "#9fb3c8",
            }}
          >
            <span aria-hidden className="opacity-70">{s.reporter.initial}</span>
            {s.kicker}
          </button>
        ))}
      </div>

      {/* Disclosure. Always on screen */}
      <p className="border-t p-3 text-[11px] leading-relaxed text-ion-2" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {broadcast.disclosure}
      </p>
    </div>
  );
}

/** Stylized brand avatar. A gradient mark, deliberately not a photoreal person. */
function Avatar({ accent, initial }: { accent: string; initial: string }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: 64, height: 64, background: `radial-gradient(circle at 35% 30%, ${accent}, ${BRAND_COLORS.softUltraviolet} 70%, ${BRAND_COLORS.obsidianBlack})`, boxShadow: `0 0 18px ${accent}55` }}
      aria-hidden
    >
      <span className="font-display font-bold text-ion-white" style={{ fontSize: 26 }}>{initial}</span>
    </div>
  );
}
