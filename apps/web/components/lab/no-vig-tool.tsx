"use client";

import { useState } from "react";

import { BRAND_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

// ── Result types (mirror the engine's NoVigOutput shape) ──────────────────────

interface SideResult {
  label: string;
  americanOdds: number;
  impliedProbability: number;
  fairProbability: number;
  fairAmericanOdds: number;
}

interface BookResult {
  name: string;
  sides: SideResult[];
  overround: number;
  hold: number;
}

interface ConsensusSide {
  label: string;
  fairProbability: number;
  fairAmericanOdds: number;
}

interface NoVigOutput {
  sideLabels: string[];
  books: BookResult[];
  consensus: ConsensusSide[] | null;
  averageHold: number;
  notes: string[];
  disclaimer: string;
}

// ── Form state ────────────────────────────────────────────────────────────────

interface BookForm {
  name: string;
  /** One American-odds string per side, in side order. */
  prices: string[];
}

interface FormState {
  sideLabels: string[];
  books: BookForm[];
}

/** A standard two-way -110/-110 market across two books, by default. */
const INITIAL: FormState = {
  sideLabels: ["Side A", "Side B"],
  books: [
    { name: "Book 1", prices: ["-110", "-110"] },
    { name: "Book 2", prices: ["-105", "-115"] },
  ],
};

const MIN_SIDES = 2;
const MAX_SIDES = 12;
const MAX_BOOKS = 20;

function pct(p: number): string {
  return `${(p * 100).toFixed(2)}%`;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`;
}

const FIELD_LABEL = "font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400";
const INPUT_CLASS =
  "mt-1 w-full rounded-md border bg-transparent px-3 py-2 font-numerals text-sm tabular-nums text-white outline-none focus:border-[--ring]";
const BORDER_STYLE = { borderColor: "rgba(255,255,255,0.12)" };

export function NoVigTool(): JSX.Element {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [result, setResult] = useState<NoVigOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sideCount = form.sideLabels.length;

  function setSideLabel(index: number, value: string): void {
    setForm((prev) => {
      const sideLabels = prev.sideLabels.slice();
      sideLabels[index] = value;
      return { ...prev, sideLabels };
    });
  }

  function addSide(): void {
    setForm((prev) => {
      if (prev.sideLabels.length >= MAX_SIDES) return prev;
      return {
        sideLabels: [...prev.sideLabels, `Side ${prev.sideLabels.length + 1}`],
        books: prev.books.map((b) => ({ ...b, prices: [...b.prices, "+100"] })),
      };
    });
    setResult(null);
  }

  function removeSide(): void {
    setForm((prev) => {
      if (prev.sideLabels.length <= MIN_SIDES) return prev;
      return {
        sideLabels: prev.sideLabels.slice(0, -1),
        books: prev.books.map((b) => ({ ...b, prices: b.prices.slice(0, -1) })),
      };
    });
    setResult(null);
  }

  function setBookName(bookIndex: number, value: string): void {
    setForm((prev) => {
      const books = prev.books.slice();
      const book = books[bookIndex];
      if (!book) return prev;
      books[bookIndex] = { ...book, name: value };
      return { ...prev, books };
    });
  }

  function setPrice(bookIndex: number, sideIndex: number, value: string): void {
    setForm((prev) => {
      const books = prev.books.slice();
      const book = books[bookIndex];
      if (!book) return prev;
      const prices = book.prices.slice();
      prices[sideIndex] = value;
      books[bookIndex] = { ...book, prices };
      return { ...prev, books };
    });
  }

  function addBook(): void {
    setForm((prev) => {
      if (prev.books.length >= MAX_BOOKS) return prev;
      return {
        ...prev,
        books: [
          ...prev.books,
          {
            name: `Book ${prev.books.length + 1}`,
            prices: prev.sideLabels.map(() => "+100"),
          },
        ],
      };
    });
    setResult(null);
  }

  function removeBook(index: number): void {
    setForm((prev) => {
      if (prev.books.length <= 1) return prev;
      return { ...prev, books: prev.books.filter((_, i) => i !== index) };
    });
    setResult(null);
  }

  async function run(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        sideLabels: form.sideLabels.map((l) => l.trim() || "Side"),
        books: form.books.map((b) => ({
          name: b.name.trim() || "Book",
          americanOdds: b.prices.map((p) => Number(p)),
        })),
      };
      const res = await fetch("/api/lab/no-vig", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json: {
        success: boolean;
        data?: NoVigOutput;
        error?: string;
      } = await res.json();
      if (!json.success || !json.data) {
        setError(json.error ?? "Calculation failed.");
        setResult(null);
        return;
      }
      setResult(json.data);
    } catch {
      setError("Could not reach the calculator. Try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {/* ── Inputs ─────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Market prices
            </h3>
            <div className="flex items-center gap-1.5">
              <SmallButton onClick={removeSide} disabled={sideCount <= MIN_SIDES}>
                − side
              </SmallButton>
              <SmallButton onClick={addSide} disabled={sideCount >= MAX_SIDES}>
                + side
              </SmallButton>
            </div>
          </div>

          {/* Side labels */}
          <div className="mt-4 grid gap-2" style={gridCols(sideCount)}>
            {form.sideLabels.map((label, i) => (
              <label key={i} className="block">
                <span className={FIELD_LABEL}>Side {i + 1} name</span>
                <input
                  className={INPUT_CLASS}
                  style={BORDER_STYLE}
                  value={label}
                  onChange={(e) => setSideLabel(i, e.target.value)}
                />
              </label>
            ))}
          </div>

          {/* Books */}
          <div className="mt-4 space-y-3">
            {form.books.map((book, bookIndex) => (
              <div
                key={bookIndex}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "rgba(255,255,255,0.09)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-white outline-none focus:border-[--ring]"
                    style={BORDER_STYLE}
                    value={book.name}
                    onChange={(e) => setBookName(bookIndex, e.target.value)}
                    aria-label={`Book ${bookIndex + 1} name`}
                  />
                  {form.books.length > 1 ? (
                    <SmallButton onClick={() => removeBook(bookIndex)}>
                      remove
                    </SmallButton>
                  ) : null}
                </div>
                <div className="mt-2 grid gap-2" style={gridCols(sideCount)}>
                  {book.prices.map((price, sideIndex) => (
                    <label key={sideIndex} className="block">
                      <span className={FIELD_LABEL}>
                        {form.sideLabels[sideIndex] ?? `Side ${sideIndex + 1}`}
                      </span>
                      <input
                        className={INPUT_CLASS}
                        style={BORDER_STYLE}
                        inputMode="numeric"
                        value={price}
                        onChange={(e) =>
                          setPrice(bookIndex, sideIndex, e.target.value)
                        }
                        placeholder="-110"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <SmallButton
            onClick={addBook}
            disabled={form.books.length >= MAX_BOOKS}
          >
            + add book
          </SmallButton>

          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className={cn(
              "mt-5 w-full rounded-md px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.16em] transition-opacity disabled:opacity-50",
            )}
            style={{
              background: BRAND_COLORS.orbitalCyan,
              color: BRAND_COLORS.obsidianBlack,
            }}
          >
            {loading ? "Calculating…" : "Remove the vig"}
          </button>
          {error ? (
            <p
              className="mt-3 font-mono text-[11px]"
              style={{ color: BRAND_COLORS.ionMagenta }}
            >
              {error}
            </p>
          ) : null}
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-500">
            Enter American odds (e.g. -110, +145). American prices have a
            magnitude of at least 100.
          </p>
        </div>

        {/* ── Results ────────────────────────────────────────── */}
        <div>
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-white">
            Vig-free breakdown
          </h3>
          {result ? (
            <div className="mt-4 space-y-4">
              <Stat
                label="Average hold across books"
                value={pct(result.averageHold)}
                accent={BRAND_COLORS.orbitalCyan}
              />

              {result.books.map((book, i) => (
                <div
                  key={i}
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: "rgba(255,255,255,0.09)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-300">
                      {book.name}
                    </p>
                    <p className="font-numerals text-xs tabular-nums text-white">
                      hold {pct(book.hold)}
                    </p>
                  </div>
                  <table className="mt-2 w-full border-collapse">
                    <thead>
                      <tr className={FIELD_LABEL}>
                        <th className="py-1 text-left font-normal">Side</th>
                        <th className="py-1 text-right font-normal">Price</th>
                        <th className="py-1 text-right font-normal">Implied</th>
                        <th className="py-1 text-right font-normal">Fair %</th>
                        <th className="py-1 text-right font-normal">Fair odds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {book.sides.map((side, j) => (
                        <tr
                          key={j}
                          className="font-numerals text-[11px] tabular-nums text-white"
                        >
                          <td className="py-1 text-left">{side.label}</td>
                          <td className="py-1 text-right">
                            {signed(side.americanOdds)}
                          </td>
                          <td className="py-1 text-right text-ink-300">
                            {pct(side.impliedProbability)}
                          </td>
                          <td className="py-1 text-right">
                            {pct(side.fairProbability)}
                          </td>
                          <td
                            className="py-1 text-right"
                            style={{ color: BRAND_COLORS.orbitalCyan }}
                          >
                            {signed(side.fairAmericanOdds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              {result.consensus ? (
                <div
                  className="rounded-lg border px-3 py-2.5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}30`,
                    background: `${BRAND_COLORS.orbitalCyan}08`,
                  }}
                >
                  <p className={FIELD_LABEL}>Consensus fair line (median)</p>
                  <table className="mt-2 w-full border-collapse">
                    <tbody>
                      {result.consensus.map((side, j) => (
                        <tr
                          key={j}
                          className="font-numerals text-[11px] tabular-nums text-white"
                        >
                          <td className="py-1 text-left">{side.label}</td>
                          <td className="py-1 text-right">
                            {pct(side.fairProbability)}
                          </td>
                          <td
                            className="py-1 text-right"
                            style={{ color: BRAND_COLORS.orbitalCyan }}
                          >
                            {signed(side.fairAmericanOdds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {result.notes.length > 0 ? (
                <ul className="space-y-1.5">
                  {result.notes.map((n, i) => (
                    <li
                      key={i}
                      className="font-mono text-[11px] leading-relaxed text-ink-300"
                    >
                      • {n}
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="font-mono text-[10px] leading-relaxed text-ink-500">
                {result.disclaimer}
              </p>
            </div>
          ) : (
            <div
              className="mt-4 rounded-lg border px-4 py-8 text-center"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-400">
                Enter a market&apos;s prices to strip the vig
              </p>
              <p className="mt-2 text-xs text-ink-500">
                The price you see includes the book&apos;s margin. This
                calculator removes it to show each side&apos;s vig-free fair
                probability and fair odds — computed only from the prices you
                enter.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function gridCols(n: number): { gridTemplateColumns: string } {
  // Keep columns readable: two-way side-by-side, n-way wraps to two columns.
  return {
    gridTemplateColumns: `repeat(${Math.min(2, n)}, minmax(0, 1fr))`,
  };
}

function SmallButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300 transition-opacity disabled:opacity-40"
      style={{ borderColor: "rgba(255,255,255,0.14)" }}
    >
      {children}
    </button>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}): JSX.Element {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "rgba(255,255,255,0.09)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <dt className={FIELD_LABEL}>{label}</dt>
      <dd
        className="mt-1 font-numerals text-base font-semibold tabular-nums"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </dd>
    </div>
  );
}
