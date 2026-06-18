"use client";

/**
 * CoursePlayer — the Academy's interactive course floor.
 *
 * Track → lesson reader → embedded quiz → graded transcript. Progress
 * persists in localStorage (client-only training state; nothing leaves
 * the device, mirroring the CLV tracker's posture). All content is market
 * mechanics and math — no fabricated stats about real teams.
 */

import { useEffect, useMemo, useState } from "react";
import {
  COURSE_TRACKS,
  lessonsFor,
  trackGrade,
  type CourseLesson,
  type CourseTrack,
  type QuizQuestion,
} from "@/lib/academy/curriculum";
import { BRAND_COLORS } from "@/lib/brand";

const STORE_KEY = "gse-academy-courses-v1";

const TRACK_HEX: Record<CourseTrack, string> = {
  "Line Literacy": BRAND_COLORS.orbitalCyan,
  "Bankroll & Risk": BRAND_COLORS.ionMagenta,
  "Market Mechanics": BRAND_COLORS.softUltraviolet,
};

/** answers[lessonId][questionId] = chosen option id */
type Answers = Record<string, Record<string, string>>;

function loadAnswers(): Answers {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Answers) : {};
  } catch {
    return {};
  }
}

function saveAnswers(a: Answers): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(a));
  } catch {
    /* private mode etc. — session-only is fine */
  }
}

function countCorrect(lesson: CourseLesson, answers: Answers): number {
  const a = answers[lesson.id];
  if (!a) return 0;
  return lesson.quiz.filter((q) => {
    const chosen = a[q.id];
    return chosen !== undefined && q.options.find((o) => o.id === chosen)?.correct === true;
  }).length;
}

function lessonComplete(lesson: CourseLesson, answers: Answers): boolean {
  const a = answers[lesson.id];
  return a !== undefined && lesson.quiz.every((q) => a[q.id] !== undefined);
}

export function CoursePlayer() {
  const [track, setTrack] = useState<CourseTrack>("Line Literacy");
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAnswers(loadAnswers());
    setHydrated(true);
  }, []);

  const pick = (lessonId: string, questionId: string, optionId: string) => {
    setAnswers((prev) => {
      if (prev[lessonId]?.[questionId] !== undefined) return prev; // answers are final — it's a quiz
      const next: Answers = { ...prev, [lessonId]: { ...prev[lessonId], [questionId]: optionId } };
      saveAnswers(next);
      return next;
    });
  };

  const resetTrack = () => {
    setAnswers((prev) => {
      const next = { ...prev };
      for (const l of lessonsFor(track)) delete next[l.id];
      saveAnswers(next);
      return next;
    });
  };

  const lessons = lessonsFor(track);
  const hex = TRACK_HEX[track];

  const transcript = useMemo(
    () =>
      COURSE_TRACKS.map((t) => {
        const ls = lessonsFor(t);
        const questions = ls.reduce((n, l) => n + l.quiz.length, 0);
        const correct = ls.reduce((n, l) => n + countCorrect(l, answers), 0);
        const completed = ls.filter((l) => lessonComplete(l, answers)).length;
        return { track: t, lessons: ls.length, completed, correct, questions };
      }),
    [answers],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* transcript strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        {transcript.map((t) => (
          <button
            key={t.track}
            type="button"
            onClick={() => {
              setTrack(t.track);
              setOpenLesson(null);
            }}
            className="rounded-xl border p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              borderColor: track === t.track ? `${TRACK_HEX[t.track]}66` : "rgba(120,120,140,0.25)",
              background:
                track === t.track
                  ? `radial-gradient(100% 100% at 50% 0%, ${TRACK_HEX[t.track]}14, transparent 75%)`
                  : "rgba(10,11,15,0.6)",
            }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: TRACK_HEX[t.track] }}>
              {t.track}
            </p>
            <p className="mt-2 text-sm text-ink-200">
              {hydrated ? (
                <>
                  {t.completed}/{t.lessons} lessons ·{" "}
                  <span className="font-mono">{trackGrade(t.correct, hydrated && t.completed > 0 ? t.questions : 0)}</span>
                </>
              ) : (
                <>
                  {t.lessons} lessons · <span className="font-mono">—</span>
                </>
              )}
            </p>
          </button>
        ))}
      </div>

      {/* lesson list */}
      <div className="flex flex-col gap-3">
        {lessons.map((lesson, i) => {
          const open = openLesson === lesson.id;
          const done = hydrated && lessonComplete(lesson, answers);
          const correct = hydrated ? countCorrect(lesson, answers) : 0;
          return (
            <div
              key={lesson.id}
              className="surface-card overflow-hidden"
              style={open ? { borderColor: `${hex}55` } : undefined}
            >
              <button
                type="button"
                onClick={() => setOpenLesson(open ? null : lesson.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                aria-expanded={open}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[11px]" style={{ color: hex }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold text-white">{lesson.title}</span>
                  <span className="hidden font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:inline">
                    {lesson.level} · {lesson.minutes} min
                  </span>
                </span>
                <span className="font-mono text-[11px]" style={{ color: done ? hex : "var(--ink-400, #6b7280)" }}>
                  {done ? `${correct}/${lesson.quiz.length} ✓` : open ? "−" : "+"}
                </span>
              </button>

              {open && (
                <div className="border-t border-white/[0.08]/60 px-5 py-5">
                  <div className="max-w-3xl space-y-3">
                    {lesson.body.map((para) => (
                      <p key={para.slice(0, 32)} className="text-sm leading-relaxed text-ink-200">
                        {para}
                      </p>
                    ))}
                  </div>
                  <div className="mt-6 space-y-5">
                    {lesson.quiz.map((q, qi) => (
                      <Question
                        key={q.id}
                        q={q}
                        index={qi}
                        hex={hex}
                        chosen={answers[lesson.id]?.[q.id]}
                        onPick={(optionId) => pick(lesson.id, q.id, optionId)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={resetTrack}
        className="w-fit font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500 underline-offset-4 hover:text-ink-300 hover:underline"
      >
        reset this track
      </button>
    </div>
  );
}

function Question({
  q,
  index,
  hex,
  chosen,
  onPick,
}: {
  q: QuizQuestion;
  index: number;
  hex: string;
  chosen: string | undefined;
  onPick: (optionId: string) => void;
}) {
  const answered = chosen !== undefined;
  return (
    <div className="rounded-xl border border-white/[0.08]/60 bg-black/30 p-4">
      <p className="text-sm font-semibold text-white">
        <span className="mr-2 font-mono text-[11px]" style={{ color: hex }}>
          Q{index + 1}
        </span>
        {q.prompt}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {q.options.map((o) => {
          const isChosen = chosen === o.id;
          const showState = answered && (isChosen || o.correct);
          return (
            <button
              key={o.id}
              type="button"
              disabled={answered}
              onClick={() => onPick(o.id)}
              className="rounded-lg border px-3.5 py-2.5 text-left text-sm transition-colors"
              style={{
                borderColor: showState ? (o.correct ? `${hex}88` : `${BRAND_COLORS.ionMagenta}66`) : "rgba(120,120,140,0.25)",
                background: showState ? (o.correct ? `${hex}14` : `${BRAND_COLORS.ionMagenta}10`) : "transparent",
                color: answered && !showState ? "rgba(170,175,190,0.5)" : "#e7e9f0",
                cursor: answered ? "default" : "pointer",
              }}
            >
              <span className="flex items-start justify-between gap-3">
                <span>{o.label}</span>
                {showState && (
                  <span className="font-mono text-[11px]" style={{ color: o.correct ? hex : BRAND_COLORS.ionMagenta }}>
                    {o.correct ? "✓" : "✗"}
                  </span>
                )}
              </span>
              {showState && <span className="mt-1.5 block text-xs leading-relaxed text-ink-300">{o.why}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
