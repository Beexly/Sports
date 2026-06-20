"use client";

/**
 * GalaxyBroadcast. The cinematic, always-on transmission at the top of The Beat.
 *
 * The public face of the newsroom: Nova (the brand's synthetic field anchor)
 * reports the week's top signals on location, with a broadcast lower-third, a
 * teleprompter, and a segment rundown. It is the lean, public cut of the studio
 * broadcast. The persona bible and publish-readiness gate stay in the producer
 * view (/fantasy/studio). The AI-presenter disclosure is always on screen.
 *
 * No photoreal likeness: Nova is a stylized brand mark, never a generated face.
 * Reduced-motion safe: the scene is CSS only. No media element plays on load.
 */

import { useState } from "react";
import type { Broadcast } from "@/lib/fantasy/host";
import { SCENES } from "@/lib/fantasy/host";
import { BRAND_COLORS } from "@/lib/brand";

export function GalaxyBroadcast({ broadcast }: { broadcast: Broadcast }) {
  const segs = broadcast.segments;
  const [i, setI] = useState(0);
  const seg = segs[i]!;
  const scene = SCENES[seg.scene];
  const onColdOpen = i === 0;
  const onSignOff = i === segs.length - 1;

  return (
    <div className="surface-card overflow-hidden p-0">
      {/* On-air bar */}
      <div className="flex flex-wrap items-center gap-3 border-b p-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]"
          style={{ background: "rgba(255,45,45,0.16)", color: "#ff5a5a" }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#ff5a5a", animation: "pp-live-pulse 2s ease-in-out infinite" }} />
          On air
        </span>
        <p className="font-display text-sm font-semibold text-white">
          Galaxy Broadcast <span className="text-ink-500">· Week {broadcast.week}</span>
        </p>
        <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}>
          Synthetic presenter
        </span>
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
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 3px)" }} />
          <div className="relative flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${scene.accent}22`, color: scene.accent }}>
              On location · {scene.label}
            </span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-400" style={{ background: "rgba(255,255,255,0.04)" }}>
              {seg.kicker}
            </span>
          </div>

          {/* Presenter on stage */}
          <div className="relative mt-10 flex items-end gap-3">
            <Avatar accent={scene.accent} />
            <div className="mb-1">
              <p className="font-display text-xl text-white">{broadcast.persona.name}</p>
              <p className="text-[11px] text-ink-400">{broadcast.persona.role}</p>
              <p className="text-[10px] text-ink-600">reporting from {scene.setting}</p>
            </div>
          </div>

          {/* Lower third */}
          <div className="absolute inset-x-0 bottom-0 border-t p-3" style={{ borderColor: `${scene.accent}55`, background: "linear-gradient(0deg, rgba(0,0,0,0.65), transparent)" }}>
            <p className="text-[11px] uppercase tracking-[0.24em]" style={{ color: scene.accent }}>Galaxy Sports Network</p>
            <p className="mt-0.5 text-sm font-medium text-white">{broadcast.title}</p>
          </div>
        </div>

        {/* Teleprompter */}
        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-600">Teleprompter</p>
          <p className="mt-3 text-[15px] leading-relaxed text-white">
            {onColdOpen ? `${broadcast.coldOpen} ` : ""}
            {seg.script}
          </p>
          {onSignOff && <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{broadcast.signOff}</p>}

          {/* Transport */}
          <div className="mt-5 flex items-center gap-2">
            <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn btn-ghost btn-sm disabled:opacity-40">
              ‹ Prev
            </button>
            <span className="font-mono text-xs text-ink-500">{i + 1}/{segs.length}</span>
            <button type="button" onClick={() => setI((x) => Math.min(segs.length - 1, x + 1))} disabled={onSignOff} className="btn btn-primary btn-sm ml-auto disabled:opacity-40">
              Next segment ›
            </button>
          </div>
        </div>
      </div>

      {/* Rundown */}
      <div className="flex flex-wrap gap-1.5 border-t p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {segs.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setI(idx)}
            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
            style={{
              background: idx === i ? `${SCENES[s.scene].accent}22` : "rgba(255,255,255,0.04)",
              color: idx === i ? SCENES[s.scene].accent : "#9fb3c8",
            }}
          >
            {s.kicker}
          </button>
        ))}
      </div>

      {/* Disclosure. Always on screen */}
      <p className="border-t p-3 text-[11px] leading-relaxed text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {broadcast.disclosure}
      </p>
    </div>
  );
}

/** Stylized brand avatar. A gradient mark, deliberately not a photoreal person. */
function Avatar({ accent }: { accent: string }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{ width: 64, height: 64, background: `radial-gradient(circle at 35% 30%, ${accent}, ${BRAND_COLORS.softUltraviolet} 70%, ${BRAND_COLORS.obsidianBlack})`, boxShadow: `0 0 18px ${accent}55` }}
      aria-hidden
    >
      <span className="font-display font-bold text-white" style={{ fontSize: 26 }}>N</span>
    </div>
  );
}
