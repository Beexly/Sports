"use client";

/**
 * CoursePlayer — the Academy's interactive course floor.
 *
 * Guided flow: pick a track → open a lesson → READ the lesson (one clear
 * "reading" mode) → take the QUIZ one question at a time (one clear
 * "quizzing" mode) → see the graded result. At every moment a mode header
 * tells the trainee exactly what they're doing. Progress persists in
 * localStorage (client-only training state; nothing leaves the device,
 * mirroring the CLV tracker's posture). All content is market mechanics and
 * math — no fabricated stats about real teams.
 */

import { type ReactNode, useEffect, useMemo, useState } from "react";
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

/** What the trainee is doing inside an open lesson. */
type Mode = "read" | "quiz";

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

function answeredCount(lesson: CourseLesson, answers: Answers): number {
  const a = answers[lesson.id];
  if (!a) return 0;
  return lesson.quiz.filter((q) => a[q.id] !== undefined).length;
}

function lessonComplete(lesson: CourseLesson, answers: Answers): boolean {
  const a = answers[lesson.id];
  return a !== undefined && lesson.quiz.every((q) => a[q.id] !== undefined);
}

export function CoursePlayer() {
  const [track, setTrack] = useState<CourseTrack>("Line Literacy");
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("read");
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
    setOpenLesson(null);
  };

  const openInMode = (lessonId: string, m: Mode) => {
    setOpenLesson(lessonId);
    setMode(m);
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
      {/* ── STEP 1 — choose a track ─────────────────────────────────── */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-500">
          Step 1 · Choose a track
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {transcript.map((t) => {
            const active = track === t.track;
            const th = TRACK_HEX[t.track];
            return (
              <button
                key={t.track}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTrack(t.track);
                  setOpenLesson(null);
                }}
                className="rounded-xl border p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  borderColor: active ? `${th}66` : "rgba(120,120,140,0.25)",
                  background: active
                    ? `radial-gradient(100% 100% at 50% 0%, ${th}14, transparent 75%)`
                    : "rgba(10,11,15,0.6)",
                  boxShadow: active ? `0 0 0 1px ${th}33` : undefined,
                }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: th }}>
                  {t.track}
                </p>
                <p className="mt-2 text-sm text-ink-200">
                  {hydrated ? (
                    <>
                      {t.completed}/{t.lessons} lessons ·{" "}
                      <span className="font-mono">
                        {trackGrade(t.correct, t.completed > 0 ? t.questions : 0)}
                      </span>
                    </>
                  ) : (
                    <>
                      {t.lessons} lessons · <span className="font-mono">—</span>
                    </>
                  )}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 2 — pick a lesson, then read & quiz ───────────────── */}
      <div>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-500">
          Step 2 · {track} — read, then quiz
        </p>
        <div className="flex flex-col gap-3">
          {lessons.map((lesson, i) => {
            const open = openLesson === lesson.id;
            const done = hydrated && lessonComplete(lesson, answers);
            const correct = hydrated ? countCorrect(lesson, answers) : 0;
            const answered = hydrated ? answeredCount(lesson, answers) : 0;
            const inProgress = !done && answered > 0;
            return (
              <div
                key={lesson.id}
                className="surface-card overflow-hidden transition-shadow"
                style={open ? { borderColor: `${hex}55`, boxShadow: `0 0 0 1px ${hex}22` } : undefined}
              >
                {/* lesson header / toggle */}
                <button
                  type="button"
                  onClick={() => (open ? setOpenLesson(null) : openInMode(lesson.id, "read"))}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid h-8 w-8 flex-none place-items-center rounded-lg font-mono text-[11px] font-semibold"
                      style={{
                        color: done ? BRAND_COLORS.obsidianBlack : hex,
                        background: done ? hex : `${hex}14`,
                        border: `1px solid ${hex}44`,
                      }}
                    >
                      {done ? "✓" : String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{lesson.title}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">
                        {lesson.level} · {lesson.minutes} min · {lesson.quiz.length}-question quiz
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-3">
                    {hydrated && done && (
                      <span className="hidden font-mono text-[11px] sm:inline" style={{ color: hex }}>
                        {correct}/{lesson.quiz.length} ✓
                      </span>
                    )}
                    {hydrated && inProgress && (
                      <span className="hidden font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:inline">
                        in progress
                      </span>
                    )}
                    <span className="font-mono text-lg leading-none text-ink-400" aria-hidden>
                      {open ? "−" : "+"}
                    </span>
                  </span>
                </button>

                {open && (
                  <div className="border-t border-mineral/60">
                    <LessonStage
                      lesson={lesson}
                      index={i}
                      hex={hex}
                      mode={mode}
                      answers={answers[lesson.id]}
                      onSetMode={setMode}
                      onPick={(questionId, optionId) => pick(lesson.id, questionId, optionId)}
                      onClose={() => setOpenLesson(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

/** A mode chip — the unmistakable "what am I doing right now" signal. */
function ModeChip({ kind, hex, children }: { kind: "lesson" | "quiz"; hex: string; children: ReactNode }) {
  const color = kind === "lesson" ? hex : BRAND_COLORS.softUltraviolet;
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.24em]"
      style={{ color, background: `${color}14`, border: `1px solid ${color}55` }}
    >
      <span aria-hidden>{kind === "lesson" ? "▤" : "◆"}</span>
      {children}
    </span>
  );
}

/**
 * LessonStage — switches between the unmistakable READING mode and the
 * unmistakable QUIZ mode for a single lesson. Both carry a clear header
 * chip, progress, and one obvious primary action.
 */
function LessonStage({
  lesson,
  index,
  hex,
  mode,
  answers,
  onSetMode,
  onPick,
  onClose,
}: {
  lesson: CourseLesson;
  index: number;
  hex: string;
  mode: Mode;
  answers: Record<string, string> | undefined;
  onSetMode: (m: Mode) => void;
  onPick: (questionId: string, optionId: string) => void;
  onClose: () => void;
}) {
  const total = lesson.quiz.length;
  const answered = lesson.quiz.filter((q) => answers?.[q.id] !== undefined).length;
  const correct = lesson.quiz.filter(
    (q) => q.options.find((o) => o.id === answers?.[q.id])?.correct === true,
  ).length;
  const complete = answered === total;

  if (mode === "read") {
    return (
      <div className="px-5 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ModeChip kind="lesson" hex={hex}>
            Lesson {index + 1} · Reading
          </ModeChip>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-500">
            {lesson.minutes} min read
          </span>
        </div>

        <h4 className="mt-4 font-display text-xl font-semibold text-white">{lesson.title}</h4>
        <div className="mt-3 max-w-3xl space-y-3">
          {lesson.body.map((para) => (
            <p key={para.slice(0, 32)} className="text-[15px] leading-relaxed text-ink-200">
              {para}
            </p>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onSetMode("quiz")}
            className="rounded-full px-6 py-3 text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{
              color: BRAND_COLORS.obsidianBlack,
              background: `linear-gradient(110deg, ${hex}, ${BRAND_COLORS.softUltraviolet})`,
              boxShadow: `0 0 28px ${hex}44`,
            }}
          >
            {complete ? `Review the quiz (${correct}/${total} ✓) →` : `Start the quiz · ${total} questions →`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500 hover:text-ink-300"
          >
            close lesson
          </button>
        </div>
      </div>
    );
  }

  // ── QUIZ MODE ────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeChip kind="quiz" hex={hex}>
          Quiz · {answered} of {total} answered
        </ModeChip>
        <button
          type="button"
          onClick={() => onSetMode("read")}
          className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500 hover:text-ink-300"
        >
          ← back to lesson
        </button>
      </div>

      {/* progress bar */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${(answered / total) * 100}%`, background: `linear-gradient(90deg, ${hex}, ${BRAND_COLORS.softUltraviolet})` }}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-ink-400">
        Answers are final — pick the best read, then keep the rationale. No do-overs, just like the close.
      </p>

      <div className="mt-5 space-y-5">
        {lesson.quiz.map((q, qi) => (
          <Question
            key={q.id}
            q={q}
            index={qi}
            total={total}
            hex={hex}
            chosen={answers?.[q.id]}
            onPick={(optionId) => onPick(q.id, optionId)}
          />
        ))}
      </div>

      {complete && (
        <div
          className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"
          style={{ background: `${hex}0c`, border: `1px solid ${hex}3a` }}
        >
          <p className="text-sm text-ink-200">
            Quiz complete —{" "}
            <span className="font-mono font-bold" style={{ color: hex }}>
              {correct}/{total} correct
            </span>
            . Read the rationale on each — that&apos;s where the learning is.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-5 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{ color: BRAND_COLORS.obsidianBlack, background: hex }}
          >
            Finish lesson ✓
          </button>
        </div>
      )}
    </div>
  );
}

function Question({
  q,
  index,
  total,
  hex,
  chosen,
  onPick,
}: {
  q: QuizQuestion;
  index: number;
  total: number;
  hex: string;
  chosen: string | undefined;
  onPick: (optionId: string) => void;
}) {
  const answered = chosen !== undefined;
  return (
    <div className="rounded-xl border border-mineral/60 bg-black/30 p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex-none rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider"
          style={{ color: hex, background: `${hex}14`, border: `1px solid ${hex}33` }}
        >
          Q{index + 1}/{total}
        </span>
        <p className="text-sm font-semibold text-white">{q.prompt}</p>
      </div>
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
