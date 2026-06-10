/**
 * JsonHumanizer — turn any API/JSON-looking payload into a human-readable
 * table/card.
 *
 * The product principle: a reader should never hit a raw JSON dump. An object
 * or array returned by an endpoint becomes a plain TITLE, a short SCHEMA
 * EXPLANATION (what each field means), a one-line "what this is used for", and
 * a readable table/card of the actual values. The raw JSON is DEMOTED to a
 * quiet secondary affordance ({@link JsonRawActions}: copy / download) — never
 * a primary CTA, never a <pre> wall.
 *
 * Honesty contract (matches the rest of the codebase):
 *   - Renders EXACTLY what the source returns. Never fabricates a value.
 *   - An empty object / empty array / null renders an honest empty state, not a
 *     placeholder or a faked row.
 *   - A field with no schema description still renders (its value is real); the
 *     description column simply shows an em dash. We never invent an explanation.
 *
 * Rendering shape:
 *   - An ARRAY of objects → a table: one row per item, columns derived from the
 *     union of keys (schema order first, then any extras), values formatted.
 *   - An ARRAY of primitives → a simple ordered list.
 *   - An OBJECT → a field table: Field | Value | What it means, driven by the
 *     schema where provided.
 *   - Nested objects/arrays recurse sensibly (a nested object becomes an inline
 *     key/value block; a nested array becomes a compact list / count).
 *
 * Ported from canonical (Sports-canonical-2026-06-03). Deltas from canonical:
 * this clone does not carry the shared kit (CardSurface / Eyebrow / HelpLayer),
 * so the card surface and eyebrow markup are inlined here with the exact same
 * token classes, and the optional HelpLayer explainer prop is omitted. The
 * design tokens (surface-*, ion-*) are already present in this clone's
 * Tailwind config.
 *
 * Server-safe: this file ships no client hooks. It mounts {@link JsonRawActions}
 * (a small "use client" affordance) for the copy/download buttons only.
 *
 * Token-only: surface and ion families plus orbital-cyan. Tables use
 * divide-surface-line for row borders, per the kit conventions. None of the
 * deprecated legacy color shorthands, and no raw hex.
 */

import type { ReactNode } from "react";
import { JsonRawActions } from "@/components/ui/json-raw-actions";

/** A per-field human explanation. Order in the array drives column/row order. */
export interface JsonFieldSchema {
  /** The object key this describes (e.g. "rateLimit"). */
  readonly key: string;
  /** Human label for the field. Defaults to a humanized form of `key`. */
  readonly label?: string;
  /** One short sentence: what this field means. */
  readonly description?: ReactNode;
}

export interface JsonHumanizerProps {
  /** The resolved payload to humanize — object or array. Rendered as-is. */
  data: unknown;
  /** Plain-language title for the surface (NOT the raw endpoint path). */
  title: string;
  /** Optional kicker above the title. Defaults to "Readable view". */
  eyebrow?: string;
  /** One line: what this data is used for. Renders under the title. */
  usedFor?: ReactNode;
  /**
   * Per-field schema. For an object: drives the field rows. For an array of
   * objects: drives the leading columns (extra keys still render after them).
   */
  schema?: ReadonlyArray<JsonFieldSchema>;
  /** Suggested download filename (without extension) for the raw payload. */
  rawFilename?: string;
  /** Message shown when the payload is empty/null. Honest, never a fake row. */
  emptyLabel?: string;
  className?: string;
  "data-testid"?: string;
}

// ── value formatting ─────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Is this an "empty" payload that should render the honest empty state? */
function isEmptyPayload(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (isPlainObject(data)) return Object.keys(data).length === 0;
  return false;
}

/**
 * Render a single scalar / nested value as readable inline content. Recurses
 * one level for nested objects/arrays so the table stays scannable rather than
 * exploding into a tree.
 */
function ValueCell({ value }: { value: unknown }): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-ion-2">—</span>;
  }
  if (typeof value === "boolean") {
    return <span className="font-mono text-ion-1">{value ? "yes" : "no"}</span>;
  }
  if (typeof value === "number") {
    return (
      <span className="font-mono tabular-nums text-ion-1">{String(value)}</span>
    );
  }
  if (typeof value === "string") {
    if (value.length === 0) return <span className="text-ion-2">(empty)</span>;
    return <span className="text-ion-1">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-ion-2">none</span>;
    // Array of primitives → compact chips. Array of objects → a count (the
    // detail belongs in its own humanized table, not a crammed cell).
    const allPrimitive = value.every(
      (v) => v === null || typeof v !== "object",
    );
    if (allPrimitive) {
      return (
        <span className="flex flex-wrap gap-1.5">
          {value.slice(0, 12).map((v, i) => (
            <span
              key={i}
              className="rounded-ds-sm border border-surface-line px-1.5 py-0.5 font-mono text-[10px] text-ion-2"
            >
              {String(v)}
            </span>
          ))}
          {value.length > 12 ? (
            <span className="px-1 font-mono text-[10px] text-ion-2">
              +{value.length - 12} more
            </span>
          ) : null}
        </span>
      );
    }
    return (
      <span className="font-mono text-[11px] text-ion-2">
        {value.length} item{value.length === 1 ? "" : "s"}
      </span>
    );
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-ion-2">{"{}"}</span>;
    return (
      <span className="flex flex-col gap-0.5">
        {entries.slice(0, 6).map(([k, v]) => (
          <span key={k} className="text-[11px] leading-5">
            <span className="font-mono text-ion-2">{k}: </span>
            <span className="text-ion-1">
              {v === null || typeof v !== "object" ? String(v) : "…"}
            </span>
          </span>
        ))}
        {entries.length > 6 ? (
          <span className="font-mono text-[10px] text-ion-2">
            +{entries.length - 6} more
          </span>
        ) : null}
      </span>
    );
  }
  return <span className="text-ion-1">{String(value)}</span>;
}

// ── header ───────────────────────────────────────────────────────────────────

function HumanizerHeader({
  title,
  eyebrow,
  usedFor,
  data,
  rawFilename,
}: {
  title: string;
  eyebrow: string;
  usedFor?: ReactNode;
  data: unknown;
  rawFilename: string;
}): JSX.Element {
  return (
    <header className="flex flex-col gap-3 border-b border-surface-line pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {/* Inline eyebrow — same classes as the canonical kit's sm variant. */}
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-orbital-cyan">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-ion-white">
          {title}
        </h3>
        {usedFor ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ion-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">
              Used for:
            </span>{" "}
            {usedFor}
          </p>
        ) : null}
      </div>
      {/* Raw JSON demoted to a quiet secondary action — never a CTA. */}
      <JsonRawActions
        data={data}
        filename={rawFilename}
        className="shrink-0 sm:justify-end"
      />
    </header>
  );
}

// ── body renderers ─────────────────────────────────────────────────────────

function describeKey(
  key: string,
  schema?: ReadonlyArray<JsonFieldSchema>,
): { label: string; description?: ReactNode } {
  const hit = schema?.find((s) => s.key === key);
  return {
    label: hit?.label ?? humanizeKey(key),
    description: hit?.description,
  };
}

/** Object → Field | Value | What it means. */
function ObjectTable({
  data,
  schema,
}: {
  data: Record<string, unknown>;
  schema?: ReadonlyArray<JsonFieldSchema>;
}): JSX.Element {
  // Schema-described keys first (in schema order), then any remaining real keys.
  const dataKeys = Object.keys(data);
  const schemaKeys = (schema ?? [])
    .map((s) => s.key)
    .filter((k) => k in data);
  const rest = dataKeys.filter((k) => !schemaKeys.includes(k));
  const orderedKeys = [...schemaKeys, ...rest];
  const hasAnyDescription = orderedKeys.some(
    (k) => describeKey(k, schema).description != null,
  );

  return (
    <table className="w-full text-sm" data-testid="json-humanizer-object-table">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ion-2">
          <th className="py-2 pr-4 font-mono font-semibold">Field</th>
          <th className="py-2 pr-4 font-mono font-semibold">Value</th>
          {hasAnyDescription ? (
            <th className="py-2 font-mono font-semibold">What it means</th>
          ) : null}
        </tr>
      </thead>
      <tbody className="divide-y divide-surface-line">
        {orderedKeys.map((key) => {
          const meta = describeKey(key, schema);
          return (
            <tr key={key} className="align-top">
              <td className="py-2.5 pr-4 font-mono text-[12px] text-ion-white">
                {meta.label}
              </td>
              <td className="py-2.5 pr-4">
                <ValueCell value={data[key]} />
              </td>
              {hasAnyDescription ? (
                <td className="py-2.5 text-[13px] leading-6 text-ion-2">
                  {meta.description ?? <span className="text-ion-2">—</span>}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Array of objects → a table with derived columns. */
function ArrayTable({
  rows,
  schema,
}: {
  rows: ReadonlyArray<Record<string, unknown>>;
  schema?: ReadonlyArray<JsonFieldSchema>;
}): JSX.Element {
  // Column order: schema keys first, then any other keys seen across rows.
  const seen = new Set<string>();
  for (const row of rows) for (const k of Object.keys(row)) seen.add(k);
  const schemaKeys = (schema ?? []).map((s) => s.key).filter((k) => seen.has(k));
  const rest = [...seen].filter((k) => !schemaKeys.includes(k));
  const columns = [...schemaKeys, ...rest];

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full min-w-[480px] text-sm"
        data-testid="json-humanizer-array-table"
      >
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ion-2">
            {columns.map((key) => {
              const meta = describeKey(key, schema);
              return (
                <th
                  key={key}
                  scope="col"
                  className="py-2 pr-4 font-mono font-semibold"
                  title={
                    typeof meta.description === "string"
                      ? meta.description
                      : undefined
                  }
                >
                  {meta.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-line">
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {columns.map((key) => (
                <td key={key} className="py-2.5 pr-4">
                  <ValueCell value={row[key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Array of primitives → an ordered list. */
function PrimitiveList({ items }: { items: ReadonlyArray<unknown> }): JSX.Element {
  return (
    <ul
      className="flex flex-col gap-1.5 text-sm text-ion-1"
      data-testid="json-humanizer-primitive-list"
    >
      {items.map((v, i) => (
        <li key={i} className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] text-ion-2">{i + 1}.</span>
          <ValueCell value={v} />
        </li>
      ))}
    </ul>
  );
}

function HumanizerBody({
  data,
  schema,
  emptyLabel,
}: {
  data: unknown;
  schema?: ReadonlyArray<JsonFieldSchema>;
  emptyLabel: string;
}): JSX.Element {
  if (isEmptyPayload(data)) {
    return (
      <p
        className="rounded-ds-sm border border-dashed border-surface-line px-4 py-6 text-center text-sm text-ion-2"
        data-testid="json-humanizer-empty"
      >
        {emptyLabel}
      </p>
    );
  }

  if (Array.isArray(data)) {
    const allObjects = data.every((v) => isPlainObject(v));
    if (allObjects) {
      return (
        <ArrayTable
          rows={data as ReadonlyArray<Record<string, unknown>>}
          schema={schema}
        />
      );
    }
    return <PrimitiveList items={data} />;
  }

  if (isPlainObject(data)) {
    return <ObjectTable data={data} schema={schema} />;
  }

  // A bare scalar payload — render it plainly rather than forcing a table.
  return (
    <p className="text-sm text-ion-1" data-testid="json-humanizer-scalar">
      <ValueCell value={data} />
    </p>
  );
}

// ── public component ─────────────────────────────────────────────────────────

export function JsonHumanizer({
  data,
  title,
  eyebrow = "Readable view",
  usedFor,
  schema,
  rawFilename = "data",
  emptyLabel = "No data available yet — nothing has been returned for this view.",
  className = "",
  ...rest
}: JsonHumanizerProps): JSX.Element {
  return (
    <section
      // Inline card surface — same classes as the canonical kit's lg pad.
      className={`flex flex-col gap-4 rounded-ds-md border border-surface-line bg-surface-raised p-6 sm:p-8 ${className}`.trim()}
      {...rest}
    >
      <HumanizerHeader
        title={title}
        eyebrow={eyebrow}
        usedFor={usedFor}
        data={data}
        rawFilename={rawFilename}
      />
      <HumanizerBody data={data} schema={schema} emptyLabel={emptyLabel} />
    </section>
  );
}
