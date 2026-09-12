"use client";

/**
 * BankrollLedger — the money room. Your running bankroll, persisted locally.
 *
 * Three staged sections: 01 The count (a broadcast-grade profit-and-loss
 * numeral with total, peak, and drawdown), 02 The entry (a segmented
 * result control, not a raw form), 03 The tape (every logged result, newest
 * last, with a rich empty state before the first entry).
 *
 * Pending entries are tracked but never move the total. Everything stays in
 * your browser; nothing leaves the device. Educational record-keeping, not
 * betting advice — past results do not predict future results.
 *
 * Presentation: pure design tokens. Signed quantities pair verify/alert with
 * a +/- sign and ↑/↓ glyphs so color is never the only carrier of meaning.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { summarizeLedger, type BankrollEntry, type LedgerResult } from "@/lib/tracker/bankroll";
import { NUMERIC_TEXT_CLASS } from "@/lib/format/stat";

const ENTRIES_KEY = "gse_bankroll_entries_v1";
const START_KEY = "gse_bankroll_start_v1";

const RESULTS: LedgerResult[] = ["win", "loss", "push", "pending"];

const RESULT_GLYPH: Record<LedgerResult, string> = {
  win: "↑",
  loss: "↓",
  push: "−",
  pending: "···",
};

const RESULT_TONE: Record<LedgerResult, string> = {
  win: "text-verify",
  loss: "text-alert",
  push: "text-ion-1",
  pending: "text-caution",
};

const FIELD_CLASS =
  "rounded-md border border-mineral bg-eclipse/60 px-3 py-2 text-sm text-ion-white placeholder:text-ion-3 outline-none transition-colors focus:border-orbital-cyan/60";

const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

const blankForm = { stake: "10", result: "loss" as LedgerResult, returned: "", note: "" };

const fmt = (n: number): string => `${Math.round(n * 100) / 100}`;

export function BankrollLedger() {
  const [entries, setEntries] = useState<BankrollEntry[]>([]);
  const [startStr, setStartStr] = useState("100");
  const [form, setForm] = useState(blankForm);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawEntries = localStorage.getItem(ENTRIES_KEY);
      if (rawEntries) setEntries(JSON.parse(rawEntries));
      const rawStart = localStorage.getItem(START_KEY);
      if (rawStart) setStartStr(rawStart);
    } catch {
      /* ignore corrupt local storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      localStorage.setItem(START_KEY, startStr);
    } catch {
      /* ignore quota errors */
    }
  }, [entries, startStr, loaded]);

  const start = Math.max(0, parseFloat(startStr) || 0);
  const summary = summarizeLedger(start, entries);
  const pnl = Math.round((summary.current - start) * 100) / 100;
  const up = pnl >= 0;

  const add = () => {
    const stake = parseFloat(form.stake);
    if (!Number.isFinite(stake) || stake <= 0) return;
    const result = form.result;
    let returned: number | undefined;
    if (result === "win") {
      const r = parseFloat(form.returned);
      if (!Number.isFinite(r) || r < 0) return;
      returned = Math.round(r * 100) / 100;
    }
    const note = form.note.trim();
    setEntries((prev) => [
      ...prev,
      {
        id: newId(),
        stake: Math.round(stake * 100) / 100,
        result,
        ...(returned !== undefined ? { returned } : {}),
        ...(note ? { note } : {}),
      },
    ]);
    setForm(blankForm);
  };

  const remove = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const clear = () => setEntries([]);

  return (
    <div className="flex flex-col gap-6">
      {/* ── 01 · The count ─────────────────────────────────────────── */}
      <section aria-label="Running bankroll" className="surface-lifted overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="eyebrow text-ion-1">01 · The count</p>
          <label className="flex items-center gap-2 text-xs text-ion-1">
            Starting bankroll
            <span className={`flex items-center gap-1 ${FIELD_CLASS} px-2 py-1.5`}>
              <input
                aria-label="Starting bankroll (units)"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                inputMode="decimal"
                className={`w-20 bg-transparent text-right text-sm text-ion-white outline-none ${NUMERIC_TEXT_CLASS}`}
              />
              <span className="text-ion-2">u</span>
            </span>
          </label>
        </div>

        <div aria-live="polite" className="mt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-ion-1">
            Profit vs. start · {summary.settled} settled
            {summary.pending > 0 ? ` · ${summary.pending} pending` : ""}
          </p>
          <p
            className={`mt-1 font-bold leading-none ${NUMERIC_TEXT_CLASS} ${up ? "text-verify" : "text-alert"}`}
            style={{ fontSize: "clamp(3rem, 8vw, 5.5rem)", letterSpacing: "-0.02em" }}
          >
            {up ? "+" : "−"}{fmt(Math.abs(pnl))}u
          </p>
          <p className={`mt-2 text-sm text-ion-1 ${NUMERIC_TEXT_CLASS}`}>
            {fmt(summary.current)}u total · peak {fmt(summary.peak)}u · drawdown{" "}
            {summary.drawdown > 0 ? `−${fmt(summary.drawdown)}u ↓` : "0u −"}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Bankroll detail">
          <Tile label="Total" value={`${fmt(summary.current)}u`} />
          <Tile label="Peak" value={`${fmt(summary.peak)}u`} />
          <Tile
            label="Drawdown"
            value={summary.drawdown > 0 ? `−${fmt(summary.drawdown)}u` : "0u"}
            tone={summary.drawdown > 0 ? "text-alert" : undefined}
          />
          <Tile
            label="Record"
            value={`${summary.wins}W · ${summary.losses}L · ${summary.pushes}P`}
            sub={summary.pending > 0 ? `${summary.pending} pending` : "all settled"}
          />
        </div>

        {summary.guardTripped && (
          <div role="alert" className="mt-6 rounded-xl border border-alert/40 bg-alert/5 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-alert">
              Drawdown guard tripped
            </p>
            <p className="mt-1 text-sm leading-6 text-ion">
              Down {fmt(summary.drawdown)}u from a {fmt(summary.peak)}u peak — more than half the
              starting bankroll. Consider pausing and reviewing stake sizes before logging another
              result. A bookkeeping tripwire, not advice.
            </p>
          </div>
        )}
      </section>

      {/* ── 02 · The entry ─────────────────────────────────────────── */}
      <section aria-label="Log a result" className="surface-card p-6 sm:p-8">
        <p className="eyebrow text-ion-1">02 · The entry</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white">
          Log it like <span className="gse-editorial">it happened.</span>
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-ion-1">
          Stake in units, the result, and — for wins — what came back including the stake.
          Pending entries wait on the tape without moving the count.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-ion-1">
              Stake (units)
              <input
                aria-label="Stake (units)"
                value={form.stake}
                onChange={(e) => setForm((f) => ({ ...f, stake: e.target.value }))}
                inputMode="decimal"
                className={`mt-1.5 w-full ${FIELD_CLASS} ${NUMERIC_TEXT_CLASS}`}
              />
            </label>
            <label className="text-xs text-ion-1">
              Returned, incl. stake (wins)
              <input
                aria-label="Returned, including stake (wins)"
                value={form.returned}
                onChange={(e) => setForm((f) => ({ ...f, returned: e.target.value }))}
                inputMode="decimal"
                placeholder="e.g. 19.09"
                disabled={form.result !== "win"}
                className={`mt-1.5 w-full ${FIELD_CLASS} ${NUMERIC_TEXT_CLASS} disabled:opacity-40`}
              />
            </label>
          </div>
          <label className="text-xs text-ion-1">
            Note (optional)
            <input
              aria-label="Note (optional)"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. PHI −3 · closing −130"
              className={`mt-1.5 w-full ${FIELD_CLASS}`}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Result" className="flex flex-wrap gap-2">
            {RESULTS.map((r) => {
              const active = form.result === r;
              return (
                <button
                  key={r}
                  type="button"
                  aria-label={r}
                  aria-pressed={active}
                  onClick={() => setForm((f) => ({ ...f, result: r }))}
                  className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors ${
                    active
                      ? `${RESULT_TONE[r]} border-current`
                      : "border-mineral text-ion-2 hover:border-mineral-hi hover:text-ion"
                  }`}
                  style={active ? ({ backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)" } as React.CSSProperties) : undefined}
                >
                  {RESULT_GLYPH[r]} {r}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={add}
            className="rounded-md border border-orbital-cyan/40 px-5 py-1.5 text-sm font-semibold text-orbital-cyan transition-colors hover:border-orbital-cyan hover:text-ion-white"
          >
            Add result →
          </button>
        </div>
      </section>

      {/* ── 03 · The tape ──────────────────────────────────────────── */}
      <section aria-label="Logged entries" className="surface-card p-6 sm:p-8">
        <p className="eyebrow text-ion-1">03 · The tape</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ion-white">
          Every result, <span className="gse-editorial">in order.</span>
        </h2>

        {entries.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-1">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Stake</th>
                  <th className="px-2 py-2">Result</th>
                  <th className="px-2 py-2">Returned</th>
                  <th className="px-2 py-2">Note</th>
                  <th className="px-2 py-2">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id} className="border-t border-mineral text-ion transition-colors hover:bg-titanium/40">
                    <td className={`px-2 py-2.5 text-ion-2 ${NUMERIC_TEXT_CLASS}`}>{i + 1}</td>
                    <td className={`px-2 py-2.5 ${NUMERIC_TEXT_CLASS}`}>{fmt(e.stake)}u</td>
                    <td className={`px-2 py-2.5 font-semibold ${RESULT_TONE[e.result]}`}>
                      {RESULT_GLYPH[e.result]} {e.result === "win" ? "+ win" : e.result === "loss" ? "− loss" : e.result}
                    </td>
                    <td className={`px-2 py-2.5 ${NUMERIC_TEXT_CLASS}`}>
                      {e.result === "win" ? `${fmt(e.returned ?? 0)}u` : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-ion-1">{e.note ?? "—"}</td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        aria-label={`Remove entry ${i + 1}`}
                        className="rounded px-1 text-ion-2 transition-colors hover:text-alert"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={clear}
              className="mt-3 text-xs text-ion-2 transition-colors hover:text-alert"
            >
              Clear all entries
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-mineral-hi bg-eclipse/40 p-8 text-center sm:p-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
              The tape is blank
            </p>
            <p className="gse-editorial mx-auto mt-3 max-w-md text-2xl leading-snug text-ion-white">
              Every bankroll has a first entry.
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ion-1">
              No entries yet — log your first settled result above and the count comes alive:
              running total, peak, and drawdown, all computed on-device. Pending entries are
              welcome too; they wait patiently without moving a single unit.
            </p>
          </div>
        )}
      </section>

      <p className="text-center text-xs leading-relaxed text-ion-1">
        Sizing the next one?{" "}
        <Link href="/track" className="font-semibold text-orbital-cyan hover:text-ion-white">
          Size it with the Kelly staking calculator →
        </Link>
        <br />
        <span className="text-ion-2">
          Educational record-keeping — nothing here is betting advice, and nothing leaves your device.
        </span>
      </p>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-mineral bg-carbon/60 p-4 text-center">
      <p className={`text-xl font-bold ${NUMERIC_TEXT_CLASS} ${tone ?? "text-ion-white"}`}>{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ion-1">{label}</p>
      {sub && <p className={`mt-0.5 text-[11px] text-ion-2 ${NUMERIC_TEXT_CLASS}`}>{sub}</p>}
    </div>
  );
}
