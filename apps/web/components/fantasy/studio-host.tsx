"use client";

/**
 * StudioHost — the on-air broadcast, fronted by the brand presenter.
 *
 * Scene-switches like a real reporter on location (sideline, clubhouse, practice,
 * desk), with a teleprompter script per segment and production b-roll notes. The
 * presenter is a stylized BRAND avatar, not a generated photoreal person, and an
 * AI-presenter disclosure is always on screen — credible and non-deceptive.
 */

import { useState } from "react";
import type { Broadcast } from "@/lib/fantasy/host";
import { SCENES, assessPublishReadiness } from "@/lib/fantasy/host";
import { BRAND_COLORS } from "@/lib/brand";

export function StudioHost({ broadcast }: { broadcast: Broadcast }) {
  const segs = broadcast.segments;
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const seg = segs[i]!;
  const scene = SCENES[seg.scene];

  const copy = async () => {
    try { await navigator.clipboard.writeText(broadcast.plaintext); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* no-op */ }
  };

  return (
    <div className="space-y-5">
      {/* presenter bar */}
      <div className="surface-card flex flex-wrap items-center gap-4 p-4">
        <Avatar accent={BRAND_COLORS.orbitalCyan} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-white">{broadcast.persona.name} <span className="text-xs font-normal text-ink-500">{broadcast.persona.handle}</span></p>
          <p className="text-xs text-ink-400">{broadcast.persona.role} · {broadcast.persona.tagline}</p>
        </div>
        <span className="ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${BRAND_COLORS.softUltraviolet}1c`, color: BRAND_COLORS.softUltraviolet }}>Synthetic presenter</span>
        <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? "Copied ✓" : "Copy script"}</button>
      </div>

      {/* the broadcast frame */}
      <div className="surface-card overflow-hidden p-0">
        <div className="relative grid gap-0 md:grid-cols-[1.1fr_1fr]">
          {/* scene stage */}
          <div className="relative min-h-[260px] overflow-hidden p-5" style={{ background: `radial-gradient(120% 90% at 20% 100%, ${scene.accent}26, transparent 60%), radial-gradient(80% 70% at 90% 10%, ${scene.accent}14, transparent 60%), ${BRAND_COLORS.obsidianBlack}` }}>
            {/* scanlines */}
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 3px)" }} />
            <div className="relative flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: "rgba(255,45,45,0.18)", color: "#ff5a5a" }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#ff5a5a" }} /> Live
              </span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${scene.accent}22`, color: scene.accent }}>On location · {scene.label}</span>
            </div>

            {/* presenter on stage */}
            <div className="relative mt-8 flex items-end gap-3">
              <Avatar accent={scene.accent} large />
              <div className="mb-1">
                <p className="text-[10px] uppercase tracking-wider text-ink-500">{seg.kicker}</p>
                <p className="font-display text-lg text-white">{broadcast.persona.name}</p>
                <p className="text-[10px] text-ink-600">reporting from {scene.setting}</p>
              </div>
            </div>

            {/* lower third */}
            <div className="absolute inset-x-0 bottom-0 border-t p-3" style={{ borderColor: `${scene.accent}55`, background: "linear-gradient(0deg, rgba(0,0,0,0.6), transparent)" }}>
              <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: scene.accent }}>Galaxy Studios</p>
            </div>
          </div>

          {/* teleprompter */}
          <div className="p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-600">Teleprompter</p>
            <p className="mt-3 text-[15px] leading-relaxed text-white">{i === 0 ? `${broadcast.coldOpen} ` : ""}{seg.script}</p>
            {i === segs.length - 1 && <p className="mt-3 text-[15px] leading-relaxed text-ink-300">{broadcast.signOff}</p>}
            <p className="mt-4 border-t pt-3 text-[11px] text-ink-500" style={{ borderColor: BRAND_COLORS.steelGray }}><span className="text-ink-600">B-roll:</span> {seg.broll}</p>

            {/* transport */}
            <div className="mt-5 flex items-center gap-2">
              <button type="button" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="btn btn-ghost btn-sm disabled:opacity-40">‹ Prev</button>
              <span className="font-mono text-xs text-ink-500">{i + 1}/{segs.length}</span>
              <button type="button" onClick={() => setI((x) => Math.min(segs.length - 1, x + 1))} disabled={i === segs.length - 1} className="btn btn-primary btn-sm disabled:opacity-40 ml-auto">Next segment ›</button>
            </div>
          </div>
        </div>

        {/* rundown */}
        <div className="flex flex-wrap gap-1.5 border-t p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
          {segs.map((s, idx) => (
            <button key={s.id} type="button" onClick={() => setI(idx)} className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={{ background: idx === i ? `${SCENES[s.scene].accent}22` : "rgba(255,255,255,0.04)", color: idx === i ? SCENES[s.scene].accent : "#9fb3c8" }}>
              {s.kicker}
            </button>
          ))}
        </div>
      </div>

      {/* persona bible + disclosure */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">How {broadcast.persona.name} sounds</p>
          <ul className="mt-3 space-y-1.5">
            {broadcast.persona.voice.map((v, idx) => <li key={idx} className="flex gap-2 text-[13px] text-ink-300"><span style={{ color: BRAND_COLORS.orbitalCyan }}>▸</span>{v}</li>)}
          </ul>
        </div>
        <div className="surface-card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-ink-500">What she stands for</p>
          <ul className="mt-3 space-y-1.5">
            {broadcast.persona.values.map((v, idx) => <li key={idx} className="flex gap-2 text-[13px] text-ink-300"><span style={{ color: BRAND_COLORS.softUltraviolet }}>▸</span>{v}</li>)}
          </ul>
        </div>
      </div>

      <ReadinessPanel broadcast={broadcast} />

      <p className="rounded-lg border p-3 text-[11px] leading-relaxed text-ink-500" style={{ borderColor: `${BRAND_COLORS.softUltraviolet}44`, background: `${BRAND_COLORS.softUltraviolet}0a` }}>
        {broadcast.disclosure}
      </p>
    </div>
  );
}

/** The publish-readiness gate — nothing ships until every gate is green and a human signs off. */
function ReadinessPanel({ broadcast }: { broadcast: Broadcast }) {
  // Demo context: no consent on file, no human approver → intentionally not ready.
  const r = assessPublishReadiness(broadcast);
  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-500">Publish readiness</p>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: r.ready ? `${BRAND_COLORS.orbitalCyan}1c` : "rgba(255,255,255,0.06)", color: r.ready ? BRAND_COLORS.orbitalCyan : "#E0A800" }}>
          {r.ready ? "Ready to publish" : "Held — human approval required"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {r.gates.map((g) => (
          <div key={g.id} className="flex items-start gap-2 rounded-lg border p-2.5" style={{ borderColor: g.passed ? `${BRAND_COLORS.orbitalCyan}44` : BRAND_COLORS.steelGray }}>
            <span className="mt-0.5 text-sm" style={{ color: g.passed ? BRAND_COLORS.orbitalCyan : "#7b8794" }}>{g.passed ? "✓" : "○"}</span>
            <div>
              <p className="text-xs font-medium text-white">{g.label}</p>
              <p className="text-[10px] leading-relaxed text-ink-500">{g.note}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-ink-600">
        Brand-safety scans every script for sexual, hateful, unsafe, PII, and overclaiming content before it can pass.
        Consent and human sign-off are operator-set — a synthetic segment can never mark itself publish-ready.
      </p>
    </div>
  );
}

/** A stylized BRAND avatar — a gradient star-mark, deliberately not a photoreal person. */
function Avatar({ accent, large }: { accent: string; large?: boolean }) {
  const s = large ? 64 : 44;
  return (
    <div className="grid shrink-0 place-items-center rounded-full" style={{ width: s, height: s, background: `radial-gradient(circle at 35% 30%, ${accent}, ${BRAND_COLORS.softUltraviolet} 70%, ${BRAND_COLORS.obsidianBlack})`, boxShadow: `0 0 18px ${accent}55` }} aria-hidden>
      <span className="font-display font-bold text-white" style={{ fontSize: large ? 26 : 18 }}>N</span>
    </div>
  );
}
