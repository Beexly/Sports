"use client";

/**
 * AcademySimulator — decide blind, then get graded on process.
 *
 * Walks the trainee through illustrative historical-style scenarios: read the
 * market state, choose PLAY / WATCHLIST / NO-BET, then see the disciplined
 * verdict, the outcome, and a grade that rewards process (restraint included)
 * over luck. Ends on an earned rank. Fully keyboard-operable.
 */

import { useState } from "react";
import {
  SCENARIOS, MAX_SCORE, RANKS, GRADE_HEX, gradeChoice, rankFor,
  type AcademyChoice,
} from "@/lib/academy/scenarios";
import { BRAND_COLORS } from "@/lib/brand";

const CHOICE_HEX: Record<AcademyChoice, string> = {
  PLAY: BRAND_COLORS.orbitalCyan,
  WATCHLIST: BRAND_COLORS.softUltraviolet,
  "NO-BET": BRAND_COLORS.ionMagenta,
};
const CHOICES: AcademyChoice[] = ["PLAY", "WATCHLIST", "NO-BET"];

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 border-t py-2.5" style={{ borderColor: BRAND_COLORS.steelGray }}>
      <span className="text-[11px] uppercase tracking-wider text-ink-500">{label}</span>
      <span className="text-sm text-ink-200">{value}</span>
    </div>
  );
}

export function AcademySimulator() {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<AcademyChoice | null>(null);
  const [score, setScore] = useState(0);

  const done = index >= SCENARIOS.length;

  if (done) {
    const pct = MAX_SCORE ? score / MAX_SCORE : 0;
    const rank = rankFor(pct);
    return (
      <div className="surface-card relative overflow-hidden p-8 text-center">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${BRAND_COLORS.orbitalCyan}1f` }} />
        <p className="eyebrow justify-center" style={{ color: BRAND_COLORS.orbitalCyan }}>Session complete</p>
        <p className="mt-3 font-display text-5xl text-white">{score}<span className="text-2xl text-ink-500"> / {MAX_SCORE}</span></p>
        <p className="mt-1 text-sm text-ink-500">process score</p>
        <p className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-base font-bold" style={{ color: BRAND_COLORS.orbitalCyan, background: `${BRAND_COLORS.orbitalCyan}14`, border: `1px solid ${BRAND_COLORS.orbitalCyan}55` }}>
          <span aria-hidden>◆</span> {rank.name}
        </p>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-ink-300">
          You were scored on the quality of your decisions — not whether they won. Restraint counted,
          lucky wins didn&apos;t. That&apos;s the only track record worth building.
        </p>

        <div className="mx-auto mt-7 flex max-w-md flex-wrap items-center justify-center gap-1.5">
          {RANKS.map((r) => {
            const reached = pct >= r.minPct;
            const isCurrent = r.name === rank.name;
            return (
              <span
                key={r.name}
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: isCurrent ? BRAND_COLORS.obsidianBlack : reached ? BRAND_COLORS.orbitalCyan : "var(--ion-4,#4b5563)",
                  background: isCurrent ? BRAND_COLORS.orbitalCyan : reached ? `${BRAND_COLORS.orbitalCyan}14` : "transparent",
                  border: `1px solid ${reached ? `${BRAND_COLORS.orbitalCyan}44` : BRAND_COLORS.steelGray}`,
                }}
              >
                {r.name}
              </span>
            );
          })}
        </div>

        <button type="button" onClick={() => { setIndex(0); setPicked(null); setScore(0); }} className="btn btn-primary mt-8">
          Train again
        </button>
      </div>
    );
  }

  const s = SCENARIOS[index]!;
  const grade = picked ? gradeChoice(picked, s) : null;
  const modeHex = picked ? GRADE_HEX[grade!.tone] : BRAND_COLORS.ionMagenta;

  return (
    <div className="surface-card relative overflow-hidden p-6 sm:p-8">
      {/* header — mode chip makes "deciding" vs "graded" unmistakable */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em]"
          style={{ color: modeHex, background: `${modeHex}14`, border: `1px solid ${modeHex}55` }}
        >
          <span aria-hidden>{picked ? "◆" : "●"}</span>
          {picked ? "Graded" : "Your call"}
        </span>
        <span className="font-mono text-xs text-ink-400">process score · {score}</span>
      </div>

      {/* progress */}
      <div className="mt-4 flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
          Scenario {index + 1} / {SCENARIOS.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${((index + (picked ? 1 : 0)) / SCENARIOS.length) * 100}%`,
              background: `linear-gradient(90deg, ${BRAND_COLORS.ionMagenta}, ${BRAND_COLORS.softUltraviolet})`,
            }}
          />
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">{s.label}</span>
      </div>

      {/* market state */}
      <div className="mt-5">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
          Read the market state
        </p>
        <StateRow label="Lines" value={s.market} />
        <StateRow label="Injury" value={s.injury} />
        <StateRow label="Public" value={s.publicPressure} />
        <StateRow label="Model view" value={s.modelView} />
        <StateRow label="Counter-evidence" value={s.counterEvidence} />
      </div>

      {/* choices */}
      {!picked && (
        <div className="mt-6">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500">
            Decide blind — pick one before the result reveals
          </p>
          <div className="grid grid-cols-3 gap-3">
            {CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setPicked(c); setScore((v) => v + gradeChoice(c, s).points); }}
                className="rounded-xl py-3 text-sm font-bold transition-transform hover:-translate-y-0.5 focus-visible:outline-none"
                style={{ color: CHOICE_HEX[c], background: `${CHOICE_HEX[c]}10`, border: `1px solid ${CHOICE_HEX[c]}55` }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* reveal */}
      {picked && grade && (
        <div className="motion-safe:animate-[gse-step_450ms_ease-out] mt-6">
          <div className="rounded-xl p-5" style={{ background: `${GRADE_HEX[grade.tone]}0c`, border: `1px solid ${GRADE_HEX[grade.tone]}3a` }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold" style={{ color: GRADE_HEX[grade.tone], background: `${GRADE_HEX[grade.tone]}14`, border: `1px solid ${GRADE_HEX[grade.tone]}55` }}>
                {grade.label}
              </span>
              <span className="font-mono text-sm" style={{ color: grade.points > 0 ? BRAND_COLORS.orbitalCyan : BRAND_COLORS.ionMagenta }}>
                +{grade.points} pts
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-400">
              <span>Your call: <strong style={{ color: CHOICE_HEX[picked] }}>{picked}</strong></span>
              <span>Disciplined verdict: <strong style={{ color: CHOICE_HEX[s.correct] }}>{s.correct}</strong></span>
              <span>Outcome: <strong className="text-ink-200">{s.outcome}</strong></span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-200">{grade.note}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-400">{s.rationale}</p>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => { setIndex((i) => i + 1); setPicked(null); }} className="btn btn-primary">
              {index + 1 < SCENARIOS.length ? "Next scenario →" : "See your rank →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
