"use client";

// ============================================================
// Beat the Model — deploy-native, free skill-based pick'em
// ============================================================
//
// A FREE, SKILL-based pick'em. The user reads each signal the model
// already published on Today's Board and decides to TRUST it (the pick
// hits) or FADE it (the pick misses). Up to 5 calls per slate, locked
// before each game's kick-off (commenceTime), stored anonymously in
// localStorage only.
//
// CONSTRAINTS BAKED IN (see project-gse-gaming-stance):
//   • Free skill only — no money mechanics of any kind, no games of chance,
//     no gambling. Nothing is ever paid in or won out.
//   • Anonymous — localStorage only, no account, no network write.
//   • NEVER fabricates a result. A call is graded ONLY against the
//     published `PublicPick.result`, which defaults to "PENDING" and
//     only flips to WIN/LOSS/PUSH/VOID after the game settles upstream.
//     `gradeCall()` returns "pending" for any non-settled result, so no
//     outcome is ever shown before the week's games settle.
//
// The reducer (`pickemReducer`) and the grading function (`gradeCall`)
// are pure and exported so the gate can prove these guarantees in tests.

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { PickResult } from "@sports/types";

// ── Serializable pick shape from the server (subset of PublicPick) ────────────
export interface BeatablePick {
  readonly id: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly sport: string;
  readonly commenceTime: string; // ISO kick-off — calls freeze at this time
  readonly pickType: "SPREAD" | "MONEYLINE" | "TOTAL";
  readonly selection: string;
  readonly line: number;
  readonly pickGrade: string; // ELITE_PLAY | STRONG_PLAY | SOLID_PLAY | LEAN
  readonly reasoningShort: string;
  readonly dataQualityScore: number;
  readonly result: PickResult; // PENDING until settled upstream
}

export interface BeatableSlate {
  readonly date: string; // YYYY-MM-DD
  readonly picks: readonly BeatablePick[];
}

// ── localStorage schema ───────────────────────────────────────────────────────
export type UserCall = "trust" | "fade";

export interface SlateEntry {
  date: string;
  /** keyed by PublicPick.id */
  calls: Record<string, UserCall>;
  lockedAt: string | null;
}

export interface BtmStore {
  entries: SlateEntry[];
}

export const STORAGE_KEY = "gse_btm_v1";
export const MAX_PICKS = 5;

// ── Settlement-gated grading ──────────────────────────────────────────────────
// A user's CALL outcome is derived purely from the published `result`. There is
// no separate "answer key" the client could fabricate. Until the model's own
// pick settles (result leaves "PENDING"), every call is "pending".
export type CallOutcome = "pending" | "correct" | "incorrect" | "void";

/**
 * Grade a single Trust/Fade call against the model's published result.
 *
 * - PENDING  → "pending"   (game not settled — NEVER fabricate an outcome)
 * - VOID     → "void"      (no action — doesn't count W or L)
 * - PUSH     → "void"      (tie — doesn't count W or L)
 * - WIN      → trust ⇒ correct, fade ⇒ incorrect
 * - LOSS     → trust ⇒ incorrect, fade ⇒ correct
 */
export function gradeCall(call: UserCall, result: PickResult): CallOutcome {
  switch (result) {
    case "WIN":
      return call === "trust" ? "correct" : "incorrect";
    case "LOSS":
      return call === "trust" ? "incorrect" : "correct";
    case "PUSH":
    case "VOID":
      return "void";
    case "PENDING":
    default:
      return "pending";
  }
}

export interface CallRecord {
  correct: number;
  incorrect: number;
  pending: number;
  void: number;
}

/** Tally a locked slate's calls against the picks' published results. */
export function tallySlate(
  entry: SlateEntry,
  picks: readonly BeatablePick[],
): CallRecord {
  const byId = new Map(picks.map((p) => [p.id, p]));
  const rec: CallRecord = { correct: 0, incorrect: 0, pending: 0, void: 0 };
  for (const [pickId, call] of Object.entries(entry.calls)) {
    const pick = byId.get(pickId);
    // If the pick is no longer on the board we can't grade it — treat as pending,
    // never as a win/loss.
    const outcome = pick ? gradeCall(call, pick.result) : "pending";
    rec[outcome] += 1;
  }
  return rec;
}

// ── Pure reducer for the active (unlocked) slate ──────────────────────────────
export type PickemAction =
  | { type: "toggle"; pickId: string; call: UserCall }
  | { type: "submit"; at: string }
  | { type: "hydrate"; entry: SlateEntry };

/**
 * Pure transition for the active slate entry. Enforces:
 *   • locked entries are immutable (no call changes after lock)
 *   • a second tap on the same call clears it
 *   • the MAX_PICKS ceiling
 */
export function pickemReducer(state: SlateEntry, action: PickemAction): SlateEntry {
  switch (action.type) {
    case "hydrate":
      return action.entry;
    case "submit":
      if (state.lockedAt !== null) return state;
      if (Object.keys(state.calls).length < 1) return state;
      return { ...state, lockedAt: action.at };
    case "toggle": {
      if (state.lockedAt !== null) return state;
      const calls = { ...state.calls };
      if (calls[action.pickId] === action.call) {
        delete calls[action.pickId];
        return { ...state, calls };
      }
      const isNew = !calls[action.pickId];
      if (isNew && Object.keys(calls).length >= MAX_PICKS) return state;
      calls[action.pickId] = action.call;
      return { ...state, calls };
    }
    default:
      return state;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────
export function loadStore(): BtmStore {
  if (typeof window === "undefined") return { entries: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as BtmStore;
    if (!Array.isArray(parsed.entries)) return { entries: [] };
    return parsed;
  } catch {
    return { entries: [] };
  }
}

export function saveStore(store: BtmStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage quota / disabled — silently drop; this is a local convenience only
  }
}

export function getOrCreateEntry(store: BtmStore, date: string): SlateEntry {
  return store.entries.find((e) => e.date === date) ?? { date, calls: {}, lockedAt: null };
}

function upsertEntry(store: BtmStore, entry: SlateEntry): BtmStore {
  const idx = store.entries.findIndex((e) => e.date === entry.date);
  const entries =
    idx >= 0 ? store.entries.map((e, i) => (i === idx ? entry : e)) : [...store.entries, entry];
  return { entries };
}

// ── Display helpers ───────────────────────────────────────────────────────────
function gradeLabel(grade: string): string {
  switch (grade) {
    case "ELITE_PLAY":
      return "Elite";
    case "STRONG_PLAY":
      return "Strong";
    case "SOLID_PLAY":
      return "Solid";
    default:
      return "Lean";
  }
}

function pickTypeLabel(t: BeatablePick["pickType"]): string {
  if (t === "SPREAD") return "Spread";
  if (t === "TOTAL") return "Total";
  return "Moneyline";
}

function outcomeTag(o: CallOutcome): { label: string; cls: string } {
  switch (o) {
    case "correct":
      return { label: "You called it", cls: "text-orbital-cyan bg-orbital-cyan/10" };
    case "incorrect":
      return { label: "Model won this one", cls: "text-alert bg-alert/10" };
    case "void":
      return { label: "Push / void", cls: "text-ion-2 bg-surface-line" };
    case "pending":
    default:
      return { label: "Awaiting settlement", cls: "text-soft-ultraviolet bg-soft-ultraviolet/10" };
  }
}

function isLockedOut(commenceTime: string, now: number): boolean {
  const kickoff = Date.parse(commenceTime);
  if (Number.isNaN(kickoff)) return false;
  return now >= kickoff;
}

// ── Past record block ─────────────────────────────────────────────────────────
function PastRecord({ entries, currentDate }: { entries: SlateEntry[]; currentDate: string }) {
  const past = entries
    .filter((e) => e.lockedAt !== null && e.date !== currentDate)
    .slice(-6)
    .reverse();
  if (past.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">Your locked slates</p>
      <div className="flex flex-wrap gap-2">
        {past.map((e) => {
          const callCount = Object.keys(e.calls).length;
          return (
            <span
              key={e.date}
              className="rounded-ds-sm border border-surface-line bg-surface-raised px-3 py-1.5 font-mono text-xs text-ion-1"
            >
              {e.date}&nbsp;·&nbsp;{callCount} calls
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function BeatTheModel({ slate }: { slate: BeatableSlate }) {
  const { date, picks } = slate;

  const [entry, dispatch] = useReducer(pickemReducer, { date, calls: {}, lockedAt: null });
  const [store, setStore] = useState<BtmStore>({ entries: [] });
  const [showConfirm, setShowConfirm] = useState(false);
  // `now` is only read after mount; kept in state so lock-out re-renders.
  const [now, setNow] = useState<number>(() => Date.now());
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount (avoids SSR/client mismatch).
  useEffect(() => {
    const s = loadStore();
    setStore(s);
    dispatch({ type: "hydrate", entry: getOrCreateEntry(s, date) });
    setNow(Date.now());
  }, [date]);

  // Re-check kick-off lock-outs once a minute while the slate is open.
  useEffect(() => {
    if (entry.lockedAt !== null) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [entry.lockedAt]);

  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
    };
  }, []);

  const callCount = useMemo(() => Object.keys(entry.calls).length, [entry.calls]);
  const isLocked = entry.lockedAt !== null;
  const trustCount = useMemo(
    () => Object.values(entry.calls).filter((c) => c === "trust").length,
    [entry.calls],
  );
  const fadeCount = useMemo(
    () => Object.values(entry.calls).filter((c) => c === "fade").length,
    [entry.calls],
  );

  // Once locked, grade against published results (settlement-gated).
  const record = useMemo(
    () => (isLocked ? tallySlate(entry, picks) : null),
    [isLocked, entry, picks],
  );
  const settledCount = record ? record.correct + record.incorrect + record.void : 0;

  const toggle = useCallback(
    (pickId: string, call: UserCall) => {
      dispatch({ type: "toggle", pickId, call });
    },
    [],
  );

  const submitSlate = useCallback(() => {
    if (callCount < 1 || isLocked) return;
    const lockedEntry: SlateEntry = { ...entry, lockedAt: new Date().toISOString() };
    dispatch({ type: "submit", at: lockedEntry.lockedAt as string });
    setStore((prev) => {
      const next = upsertEntry(prev, lockedEntry);
      saveStore(next);
      return next;
    });
    setShowConfirm(true);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setShowConfirm(false), 3000);
  }, [entry, callCount, isLocked]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
            Slate · {date}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ion-white">
            {isLocked
              ? `Slate locked — ${trustCount} trust, ${fadeCount} fade`
              : callCount >= MAX_PICKS
                ? "Calls full — submit them or swap one"
                : `Call up to ${MAX_PICKS} signals on today's board`}
          </h2>
          <p className="mt-1 text-sm text-ion-1">
            {isLocked
              ? settledCount > 0
                ? `Results settling: ${record?.correct ?? 0} called, ${record?.incorrect ?? 0} to the model. The rest post after each game settles.`
                : "Results post after the board's games settle."
              : "Trust the model's signal or fade it. Submit before kick-off — you can swap any call until then."}
          </p>
        </div>
        {!isLocked && (
          <button
            onClick={submitSlate}
            disabled={callCount < 1}
            className="mt-3 self-start rounded-ds-sm border border-surface-line-strong bg-surface-raised px-5 py-2.5 text-sm font-semibold text-ion-white transition-colors hover:border-orbital-cyan hover:text-orbital-cyan disabled:pointer-events-none disabled:opacity-40 sm:mt-0 sm:self-auto"
          >
            Submit slate ({callCount}/{MAX_PICKS})
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="rounded-ds-sm border border-orbital-cyan/30 bg-orbital-cyan/5 px-4 py-3">
          <p className="font-mono text-xs text-orbital-cyan">
            Slate locked. Check back after the games settle to see how you did.
          </p>
        </div>
      )}

      {/* Pick list */}
      <ol className="flex flex-col divide-y divide-surface-line overflow-hidden rounded-ds-md border border-surface-line">
        {picks.map((p, i) => {
          const call = entry.calls[p.id] ?? null;
          const isTrust = call === "trust";
          const isFade = call === "fade";
          const kickedOff = isLockedOut(p.commenceTime, now);
          // Per-pick disable: locked slate, OR this game already kicked off, OR
          // the call ceiling is reached and this pick isn't already chosen.
          const disableNew = isLocked || kickedOff || (!call && callCount >= MAX_PICKS);
          const outcome: CallOutcome | null =
            isLocked && call ? gradeCall(call, p.result) : null;
          const tag = outcome ? outcomeTag(outcome) : null;
          return (
            <li
              key={p.id}
              className="flex items-start gap-4 bg-surface-raised px-4 py-4 sm:items-center"
            >
              {/* Rank */}
              <span className="mt-0.5 w-5 flex-none font-mono text-sm tabular-nums text-ion-2 sm:mt-0">
                {i + 1}
              </span>

              {/* Pick info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-ion-white">{p.selection}</span>
                  <span className="font-mono text-xs text-ion-2">
                    {p.awayTeam} @ {p.homeTeam} · {p.sport}
                  </span>
                  <span className="rounded-full bg-surface-line px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-soft-ultraviolet">
                    {gradeLabel(p.pickGrade)}
                  </span>
                  {tag && (
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${tag.cls}`}
                    >
                      {tag.label}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="font-mono text-xs text-ion-2">
                    {pickTypeLabel(p.pickType)}
                    {p.pickType !== "MONEYLINE" ? ` ${p.line > 0 ? "+" : ""}${p.line}` : ""}
                  </span>
                  <span className="font-numerals text-xs tabular-nums text-ion-1">
                    Data quality {p.dataQualityScore}
                  </span>
                </div>
                {p.reasoningShort && (
                  <p className="mt-1 text-xs leading-5 text-ion-1">{p.reasoningShort}</p>
                )}
                {!isLocked && kickedOff && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ion-2">
                    Kicked off — locked
                  </p>
                )}
              </div>

              {/* Call buttons */}
              <div className="flex flex-none gap-2">
                <button
                  onClick={() => toggle(p.id, "trust")}
                  disabled={disableNew && !isTrust}
                  aria-pressed={isTrust}
                  aria-label={`Trust the model on ${p.selection}`}
                  className={`rounded-ds-sm border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors disabled:pointer-events-none disabled:opacity-30 ${
                    isTrust
                      ? "border-orbital-cyan bg-orbital-cyan/10 text-orbital-cyan"
                      : "border-surface-line text-ion-2 hover:border-orbital-cyan/50 hover:text-orbital-cyan"
                  }`}
                >
                  Trust
                </button>
                <button
                  onClick={() => toggle(p.id, "fade")}
                  disabled={disableNew && !isFade}
                  aria-pressed={isFade}
                  aria-label={`Fade the model on ${p.selection}`}
                  className={`rounded-ds-sm border px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors disabled:pointer-events-none disabled:opacity-30 ${
                    isFade
                      ? "border-alert/60 bg-alert/10 text-alert"
                      : "border-surface-line text-ion-2 hover:border-alert/50 hover:text-alert"
                  }`}
                >
                  Fade
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Past record */}
      {store.entries.length > 0 && <PastRecord entries={store.entries} currentDate={date} />}

      <p className="text-xs leading-5 text-ion-2">
        Free and skill-based — nothing to pay, nothing to win but bragging
        rights. Your calls are stored only in this browser. Results are graded
        against the board&apos;s published outcomes after each game settles,
        never before.
      </p>
    </div>
  );
}
