"use client";

/**
 * AcademyRegisterToggle — the reader-register selector for Academy content.
 *
 * Renders the compact pill toggle (consistent with ask-why.tsx) plus the
 * register-aware lesson/explainer copy. Reads and writes the canonical
 * `gse-reader-register` localStorage key via the shared useReaderRegister hook
 * so the choice propagates site-wide.
 *
 * Server components in app/academy/page.tsx render everything except this
 * island. "use client" is required only here because state + localStorage.
 */

import {
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
} from "@/lib/pick-explainer/prompts";
import { useReaderRegister } from "@/lib/reader-register/use-reader-register";
import { getAcademyCopy } from "@/lib/academy/register-copy";

// ── Section copy blocks ────────────────────────────────────────────────────

export function AcademyHeroBody() {
  const [register] = useReaderRegister();
  return (
    <p
      data-testid="academy-hero-body"
      data-register={register}
      className="mt-5 max-w-2xl text-lg text-ink-300"
    >
      {getAcademyCopy(register).heroParagraph}
    </p>
  );
}

export function AcademyCourseSectionBody() {
  const [register] = useReaderRegister();
  return (
    <p
      data-testid="academy-course-body"
      data-register={register}
      className="mt-3 max-w-2xl text-ink-300"
    >
      {getAcademyCopy(register).courseSectionBody}
    </p>
  );
}

export function AcademyLiveFireBody() {
  const [register] = useReaderRegister();
  return (
    <p
      data-testid="academy-livefire-body"
      data-register={register}
      className="mt-3 max-w-2xl text-ink-300"
    >
      {getAcademyCopy(register).liveFireBody}
    </p>
  );
}

export function AcademyBeatTheCloseBody() {
  const [register] = useReaderRegister();
  return (
    <p
      data-testid="academy-btc-body"
      data-register={register}
      className="mt-3 max-w-2xl text-ink-300"
    >
      {getAcademyCopy(register).beatTheCloseBody}
    </p>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────

/**
 * Compact register pill, consistent with ask-why.tsx.
 * Placed at the top of the Academy hero so the choice is visible before any
 * lesson copy renders.
 */
export function AcademyRegisterToggle() {
  const [register, setRegister] = useReaderRegister();
  return (
    <div
      data-testid="academy-register-toggle"
      className="flex items-center gap-3"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">
        Reading mode
      </span>
      <div
        role="group"
        aria-label="Explanation depth"
        className="flex w-fit overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.04]/60"
      >
        {EXPLAIN_REGISTERS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={register === r}
            onClick={() => setRegister(r)}
            className={[
              "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition",
              register === r
                ? "bg-orbital-cyan/15 text-orbital-cyan"
                : "text-ink-400 hover:text-ink-300",
            ].join(" ")}
          >
            {EXPLAIN_REGISTER_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  );
}
