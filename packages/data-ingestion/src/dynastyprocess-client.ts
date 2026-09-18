/**
 * DynastyProcess open dynasty values (registry id "dynastyprocess-values").
 *
 * VERIFIED LIVE 2026-09-18: HTTP 200 on values-players.csv (442 players:
 * ecr/value 1QB+2QB).
 *
 * DEFAULT ON (no env gate): open GitHub repo with a LICENSE present
 * (bulk-open-data), registry verdict "cleared". Attribution is appreciated
 * per repo norms, so public surfaces carry it ("Dynasty values via
 * DynastyProcess (CC/open data)."). We still call
 * assertIngestible("dynastyprocess-values") before any network.
 *
 * HOW: GET values-players.csv and values-picks.csv from
 * raw.githubusercontent.com/dynastyprocess/data/master/files, parse with a
 * quote-aware CSV reader (names like "Ja'Marr Chase" sit inside quotes and
 * some fields contain commas). Headers are normalized case-insensitively
 * (snake_case -> camel-ish, e.g. value_1qb -> value1qb) so column order and
 * casing changes do not break parsing. GET only, 15s timeout,
 * User-Agent "GSE-DataIngestion/1.0". Empty/unparseable CSV -> empty rows,
 * never a throw.
 */

import { assertIngestible } from "./source-registry.js";
import { noStoreFetch } from "./no-store-fetch.js";

export const DYNASTYPROCESS_SOURCE_ID = "dynastyprocess-values";
export const DYNASTYPROCESS_BASE = "https://raw.githubusercontent.com/dynastyprocess/data/master/files";
export const DYNASTYPROCESS_ATTRIBUTION = "Dynasty values via DynastyProcess (CC/open data).";

const TIMEOUT_MS = 15_000;
const USER_AGENT = "GSE-DataIngestion/1.0";

export class DynastyProcessError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "DynastyProcessError";
  }
}

export interface DpPlayerValue {
  readonly player: string;
  readonly pos: string;
  readonly team: string;
  readonly age: number | null;
  readonly draftYear: number | null;
  readonly ecr1qb: number | null;
  readonly ecr2qb: number | null;
  readonly ecrPos: number | null;
  readonly value1qb: number | null;
  readonly value2qb: number | null;
  readonly scrapeDate: string | null;
  readonly fpId: string | null;
}

export interface DpPlayerValues {
  readonly players: readonly DpPlayerValue[];
}

export interface DpPickValue {
  readonly pick: string;
  readonly value1qb: number | null;
  readonly value2qb: number | null;
}

export interface DpPickValues {
  readonly picks: readonly DpPickValue[];
}

function numOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function intOrNull(v: unknown): number | null {
  const n = numOrNull(v);
  return n === null ? null : Math.trunc(n);
}

function strOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** Split one CSV line, honoring double-quoted fields (incl. embedded commas and "" escapes). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === undefined) break;
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Normalize a header for case-insensitive lookup: value_1qb / Value_1QB -> value1qb. */
function normHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Parse CSV text into normalized-header records. Empty text -> []. */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/);
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (ln !== undefined && ln.trim() !== "") {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return [];
  const headerLine = lines[headerIdx];
  if (headerLine === undefined) return [];
  const headers = parseCsvLine(headerLine).map(normHeader);
  const rows: Array<Record<string, string>> = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const ln = lines[i];
    if (ln === undefined || ln.trim() === "") continue;
    const cells = parseCsvLine(ln);
    const rec: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const h = headers[j];
      if (h === undefined) continue;
      rec[h] = cells[j] ?? "";
    }
    rows.push(rec);
  }
  return rows;
}

function parsePlayerValue(r: Record<string, string>): DpPlayerValue | null {
  const player = strOrNull(r.player);
  if (!player) return null;
  return {
    player,
    pos: strOrNull(r.pos) ?? "",
    team: strOrNull(r.team) ?? "",
    age: intOrNull(r.age),
    draftYear: intOrNull(r.draftyear),
    ecr1qb: numOrNull(r.ecr1qb),
    ecr2qb: numOrNull(r.ecr2qb),
    ecrPos: numOrNull(r.ecrpos),
    value1qb: numOrNull(r.value1qb),
    value2qb: numOrNull(r.value2qb),
    scrapeDate: strOrNull(r.scrapedate),
    fpId: strOrNull(r.fpid),
  };
}

function parsePickValue(r: Record<string, string>): DpPickValue | null {
  const pick = strOrNull(r.pick) ?? strOrNull(r.picklabel);
  if (!pick) return null;
  return {
    pick,
    value1qb: numOrNull(r.value1qb),
    value2qb: numOrNull(r.value2qb),
  };
}

async function getText(url: string, fetchImpl: typeof fetch): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/csv,text/plain" },
      signal: controller.signal,
    });
    if (!res.ok) throw new DynastyProcessError(`DynastyProcess HTTP ${res.status}`, res.status);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export class DynastyProcessClient {
  constructor(private readonly fetchImpl: typeof fetch = noStoreFetch) {}

  /** Per-player dynasty values. Empty/unparseable CSV -> empty players. */
  async getPlayerValues(): Promise<DpPlayerValues> {
    assertIngestible(DYNASTYPROCESS_SOURCE_ID);
    const text = await getText(`${DYNASTYPROCESS_BASE}/values-players.csv`, this.fetchImpl);
    const players: DpPlayerValue[] = [];
    for (const rec of parseCsv(text)) {
      const p = parsePlayerValue(rec);
      if (p) players.push(p);
    }
    return { players };
  }

  /** Per-pick dynasty values. Empty/unparseable CSV -> empty picks. */
  async getPickValues(): Promise<DpPickValues> {
    assertIngestible(DYNASTYPROCESS_SOURCE_ID);
    const text = await getText(`${DYNASTYPROCESS_BASE}/values-picks.csv`, this.fetchImpl);
    const picks: DpPickValue[] = [];
    for (const rec of parseCsv(text)) {
      const p = parsePickValue(rec);
      if (p) picks.push(p);
    }
    return { picks };
  }
}
