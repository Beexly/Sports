"use client";

/**
 * GmAcademy — a real curriculum: track-filtered drills graded on reasoning, plus
 * reference lessons and the Injury Decoder. Mirrors how the GM Ledger grades.
 */

import { useMemo, useState } from "react";
import {
  TRACKS, drillsByTrack, lessonsByTrack, gradeOption, scoreAcademy, INJURY_DECODER,
  type ProcessVerdict, type Track, type Difficulty,
} from "@/lib/fantasy/academy";
import { BRAND_COLORS } from "@/lib/brand";

const V_HEX: Record<ProcessVerdict, string> = { sound: BRAND_COLORS.orbitalCyan, thin: "#E0A800", unsound: BRAND_COLORS.ionMagenta };
const V_LABEL: Record<ProcessVerdict, string> = { sound: "Sound process", thin: "Thin", unsound: "Unsound" };
const DIFF_HEX: Record<Difficulty, string> = { Core: "#9fb3c8", Advanced: BRAND_COLORS.softUltraviolet, Pro: BRAND_COLORS.ionMagenta };
const TRACK_HEX: Record<Track, string> = { Process: BRAND_COLORS.orbitalCyan, Market: "#E0A800", Analytics: BRAND_COLORS.softUltraviolet, Injury: BRAND_COLORS.ionMagenta };

type View = "drills" | "reference";

export function GmAcademy() {
  const [view, setView] = useState<View>("drills");
  const [track, setTrack] = useState<Track | "All">("All");
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<Map<string, string>>(new Map());
  const [done, setDone] = useState(false);

  const drills = useMemo(() => drillsByTrack(track), [track]);
  const result = useMemo(() => scoreAcademy(choices), [choices]);
  const drill = drills[Math.min(idx, drills.length - 1)];

  const switchTrack = (t: Track | "All") => { setTrack(t); setIdx(0); setDone(false); };
  const pick = (optId: string) => { if (drill && !choices.get(drill.id)) setChoices((m) => new Map(m).set(drill.id, optId)); };
  const next = () => { if (idx < drills.length - 1) setIdx(idx + 1); else setDone(true); };

  return (
    <div className="space-y-5">
      {/* mode + track */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full p-0.5" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BRAND_COLORS.steelGray}` }}>
          {(["drills", "reference"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className="rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: view === v ? BRAND_COLORS.obsidianBlack : "#c8d2dd", background: view === v ? BRAND_COLORS.orbitalCyan : "transparent" }}>
              {v === "drills" ? "Drills" : "Reference"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...TRACKS] as (Track | "All")[]).map((t) => {
            const active = track === t;
            const hex = t === "All" ? "#fff" : TRACK_HEX[t];
            return (
              <button key={t} type="button" onClick={() => switchTrack(t)} aria-pressed={active} className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
                style={{ background: active ? `${hex}22` : "transparent", color: hex, boxShadow: active ? `inset 0 0 0 1px ${hex}` : "none" }}>
                {t}
              </button>
            );
          })}
        </div>
        <a href="/fantasy/studio" className="ml-auto text-xs" style={{ color: BRAND_COLORS.softUltraviolet }}>Nova breaks down a lesson each week in Studios →</a>
      </div>

      {view === "reference" ? (
        <Reference track={track} />
      ) : done ? (
        <Summary result={result} onRestart={() => { setIdx(0); setDone(false); }} />
      ) : drill ? (
        <>
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(((idx + (choices.get(drill.id) ? 1 : 0)) / drills.length) * 100)}%`, background: BRAND_COLORS.orbitalCyan }} />
            </div>
            <span className="font-mono text-xs text-ink-500">{idx + 1}/{drills.length}</span>
            <span className="font-mono text-xs" style={{ color: BRAND_COLORS.orbitalCyan }}>GM IQ {result.gmIq}</span>
          </div>
          <DrillCard drill={drill} chosenId={choices.get(drill.id)} onPick={pick} onNext={next} last={idx === drills.length - 1} />
        </>
      ) : null}
    </div>
  );
}

function DrillCard({ drill, chosenId, onPick, onNext, last }: { drill: ReturnType<typeof drillsByTrack>[number]; chosenId?: string; onPick: (id: string) => void; onNext: () => void; last: boolean }) {
  const chosen = chosenId ? gradeOption(drill, chosenId) : null;
  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: TRACK_HEX[drill.track], background: `${TRACK_HEX[drill.track]}1c` }}>{drill.track}</span>
        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: DIFF_HEX[drill.difficulty], background: `${DIFF_HEX[drill.difficulty]}1c` }}>{drill.difficulty}</span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-600">{drill.pattern}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-200">{drill.scenario}</p>
      <p className="mt-3 text-base font-semibold text-white">{drill.question}</p>

      <div className="mt-4 space-y-2" role="status" aria-live="polite">
        {drill.options.map((o) => {
          const isChosen = chosenId === o.id;
          const reveal = Boolean(chosenId);
          const hex = V_HEX[o.verdict];
          return (
            <button key={o.id} type="button" onClick={() => onPick(o.id)} disabled={reveal} aria-pressed={isChosen}
              className="block w-full rounded-lg border p-3 text-left text-sm"
              style={{
                borderColor: reveal ? (o.verdict === "sound" ? `${BRAND_COLORS.orbitalCyan}88` : isChosen ? `${hex}88` : BRAND_COLORS.steelGray) : BRAND_COLORS.steelGray,
                background: reveal && (isChosen || o.verdict === "sound") ? `${hex}12` : "transparent",
                opacity: reveal && !isChosen && o.verdict !== "sound" ? 0.5 : 1,
                cursor: reveal ? "default" : "pointer",
              }}>
              <span className="flex items-center gap-2">
                <span className="text-white">{o.label}</span>
                {reveal && (isChosen || o.verdict === "sound") && <span className="ml-auto text-[10px] font-bold uppercase tracking-wider" style={{ color: hex }}>{V_LABEL[o.verdict]}</span>}
              </span>
              {reveal && isChosen && <p className="mt-2 text-[13px] leading-relaxed text-ink-300">{o.feedback}</p>}
            </button>
          );
        })}
      </div>

      {chosen && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
          <p className="text-xs text-ink-400"><span className="text-ink-600">Principle:</span> {drill.principle}</p>
          <button type="button" onClick={onNext} className="btn btn-primary btn-sm ml-auto">{last ? "See your GM IQ" : "Next drill →"}</button>
        </div>
      )}
    </div>
  );
}

function Summary({ result, onRestart }: { result: ReturnType<typeof scoreAcademy>; onRestart: () => void }) {
  return (
    <div className="surface-card p-8 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-ink-500">GM IQ</p>
      <div className="mt-2 flex items-end justify-center gap-3">
        <span className="font-display leading-none text-white" style={{ fontSize: "4.5rem" }}>{result.grade}</span>
        <span className="mb-3 font-mono text-2xl" style={{ color: BRAND_COLORS.orbitalCyan }}>{result.gmIq}</span>
      </div>
      <p className="mt-2 text-sm text-ink-300">{result.soundCount} of {result.answered} answered on sound process.</p>
      {result.weakPatterns.length > 0 && (
        <div className="mx-auto mt-5 max-w-md text-left">
          <p className="text-xs uppercase tracking-wider text-ink-600">Patterns to drill</p>
          <ul className="mt-2 space-y-1">{[...new Set(result.weakPatterns)].map((p) => <li key={p} className="text-sm" style={{ color: "#E0A800" }}>▸ {p}</li>)}</ul>
        </div>
      )}
      <button type="button" onClick={onRestart} className="btn btn-primary mt-6">Run this track again</button>
    </div>
  );
}

function Reference({ track }: { track: Track | "All" }) {
  const lessons = lessonsByTrack(track);
  const showInjury = track === "All" || track === "Injury";
  return (
    <div className="space-y-5">
      {lessons.map((l) => (
        <div key={l.id} className="surface-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: TRACK_HEX[l.track], background: `${TRACK_HEX[l.track]}1c` }}>{l.track}</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: DIFF_HEX[l.level], background: `${DIFF_HEX[l.level]}1c` }}>{l.level}</span>
          </div>
          <h3 className="mt-3 font-display text-xl text-white">{l.title}</h3>
          <p className="mt-1 text-sm text-ink-400">{l.summary}</p>
          {l.body.map((p, i) => <p key={i} className="mt-3 text-[14px] leading-relaxed text-ink-200">{p}</p>)}
          {l.terms && (
            <dl className="mt-4 grid gap-2 sm:grid-cols-3">
              {l.terms.map((t) => (
                <div key={t.term} className="rounded-lg border p-3" style={{ borderColor: BRAND_COLORS.steelGray }}>
                  <dt className="text-xs font-semibold text-white">{t.term}</dt>
                  <dd className="mt-1 text-[11px] leading-relaxed text-ink-400">{t.def}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}

      {showInjury && (
        <div className="surface-card p-6">
          <h3 className="font-display text-xl text-white">The Injury Decoder</h3>
          <p className="mt-1 text-sm text-ink-400">What a designation actually means. Educational, generic. Not medical advice.</p>
          <div className="mt-4 space-y-2.5">
            {INJURY_DECODER.map((e) => (
              <div key={e.injury} className="rounded-lg border p-4" style={{ borderColor: BRAND_COLORS.steelGray }}>
                <p className="text-sm font-semibold" style={{ color: BRAND_COLORS.ionMagenta }}>{e.injury}</p>
                <div className="mt-2 grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
                  <p className="text-ink-400"><span className="text-ink-600">Mechanism:</span> {e.mechanism}</p>
                  <p className="text-ink-400"><span className="text-ink-600">Management:</span> {e.management}</p>
                  <p className="text-ink-400"><span className="text-ink-600">Recovery window:</span> {e.window}</p>
                  <p className="text-ink-400"><span className="text-ink-600">On return:</span> {e.onReturn}</p>
                </div>
                <p className="mt-2 text-[12px]" style={{ color: BRAND_COLORS.orbitalCyan }}>▸ Fantasy read: {e.fantasyRead}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
