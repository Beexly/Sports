/**
 * Contest Bay entry store — dual backend.
 *
 * 1) Postgres when !isStubMode() — serverless-safe, durable.
 * 2) Local JSON file when not on Vercel and stub/local.
 * 3) Closed (honest refuse) on Vercel+stub.
 *
 * Bootstraps gse_contest_entries + gse_contest_settlements via CREATE IF NOT EXISTS.
 */

import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db, isStubMode } from "@sports/db";
import type { ContestEntryInput, ContestWeek, StoredContestEntry } from "./types";
import {
  buildContestWeek,
  isoWeekId,
  loadFileSettlements,
  type SettlementMap,
} from "./week";

export type ContestStorageMode = "postgres" | "file" | "unavailable";

export function resolveContestStorageMode(): ContestStorageMode {
  if (!isStubMode()) return "postgres";
  if (process.env.VERCEL === "1") return "unavailable";
  return "file";
}

function storePath(): string {
  return (
    process.env.GSE_CONTEST_STORE_PATH ??
    path.join(process.cwd(), ".gse-local", "contest-entries.json")
  );
}

function hashEmail(email: string): string {
  const pepper = process.env.GSE_EMAIL_HASH_PEPPER ?? "";
  return createHash("sha256")
    .update(pepper + email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

function parsePicks(raw: unknown): StoredContestEntry["picks"] {
  let v: unknown = raw;
  if (typeof v === "string") {
    try {
      v = JSON.parse(v);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: StoredContestEntry["picks"] = [];
  for (const item of v) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { gameId?: unknown }).gameId === "string" &&
      ((item as { side?: unknown }).side === "home" ||
        (item as { side?: unknown }).side === "away")
    ) {
      out.push({
        gameId: (item as { gameId: string }).gameId,
        side: (item as { side: "home" | "away" }).side,
      });
    }
  }
  return out;
}

// ─── File backend ────────────────────────────────────────────────────────────

const fileWriteLocks = new Map<string, Promise<unknown>>();
function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileWriteLocks.get(filePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  fileWriteLocks.set(
    filePath,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function fileReadAll(): Promise<StoredContestEntry[]> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredContestEntry[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function fileWriteAll(rows: StoredContestEntry[]): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, file);
}

// ─── Postgres ────────────────────────────────────────────────────────────────

let pgReady: Promise<void> | null = null;

async function ensurePgTables(): Promise<void> {
  if (!pgReady) {
    pgReady = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS gse_contest_entries (
          id TEXT PRIMARY KEY,
          week_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          email_hash TEXT NOT NULL,
          picks JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (week_id, email_hash)
        )
      `);
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS gse_contest_entries_week_idx
        ON gse_contest_entries (week_id)
      `);
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS gse_contest_settlements (
          week_id TEXT NOT NULL,
          game_id TEXT NOT NULL,
          result TEXT NOT NULL CHECK (result IN ('home', 'away', 'push')),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (week_id, game_id)
        )
      `);
    })().catch((err) => {
      pgReady = null;
      throw err;
    });
  }
  await pgReady;
}

type PgRow = {
  id: string;
  week_id: string;
  display_name: string;
  email_hash: string;
  picks: unknown;
  created_at: Date;
};

function rowToEntry(r: PgRow): StoredContestEntry {
  return {
    id: r.id,
    weekId: r.week_id,
    displayName: r.display_name,
    emailHash: r.email_hash,
    picks: parsePicks(r.picks),
    createdAt: new Date(r.created_at).toISOString(),
    score: null,
    correct: null,
    total: null,
  };
}

async function pgList(weekId?: string): Promise<StoredContestEntry[]> {
  await ensurePgTables();
  if (weekId) {
    const rows = await db.$queryRaw<PgRow[]>`
      SELECT id, week_id, display_name, email_hash, picks, created_at
      FROM gse_contest_entries
      WHERE week_id = ${weekId}
      ORDER BY created_at ASC
    `;
    return rows.map(rowToEntry);
  }
  const rows = await db.$queryRaw<PgRow[]>`
    SELECT id, week_id, display_name, email_hash, picks, created_at
    FROM gse_contest_entries
    ORDER BY created_at ASC
  `;
  return rows.map(rowToEntry);
}

async function pgInsert(entry: StoredContestEntry): Promise<"ok" | "duplicate"> {
  await ensurePgTables();
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO gse_contest_entries (id, week_id, display_name, email_hash, picks, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)`,
      entry.id,
      entry.weekId,
      entry.displayName,
      entry.emailHash,
      JSON.stringify(entry.picks),
      entry.createdAt,
    );
    return "ok";
  } catch (err) {
    const msg = String(err);
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    if (code === "P2002" || code === "23505" || /unique/i.test(msg)) {
      return "duplicate";
    }
    throw err;
  }
}

async function pgLoadSettlements(weekId: string): Promise<SettlementMap> {
  await ensurePgTables();
  const rows = await db.$queryRaw<Array<{ game_id: string; result: string }>>`
    SELECT game_id, result FROM gse_contest_settlements WHERE week_id = ${weekId}
  `;
  const out: SettlementMap = {};
  for (const r of rows) {
    if (r.result === "home" || r.result === "away" || r.result === "push") {
      out[r.game_id] = r.result;
    }
  }
  return out;
}

/** Merge file + pg settlements (pg wins on conflict). */
export async function loadMergedSettlements(weekId: string): Promise<SettlementMap> {
  const file = loadFileSettlements(weekId);
  const mode = resolveContestStorageMode();
  if (mode !== "postgres") return file;
  try {
    const pg = await pgLoadSettlements(weekId);
    return { ...file, ...pg };
  } catch {
    return file;
  }
}

export async function loadCurrentContestWeek(now = new Date()): Promise<ContestWeek> {
  const weekId = isoWeekId(now);
  const settlements = await loadMergedSettlements(weekId);
  return buildContestWeek(now, settlements);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function listEntries(weekId?: string): Promise<StoredContestEntry[]> {
  const mode = resolveContestStorageMode();
  if (mode === "unavailable") return [];
  try {
    if (mode === "postgres") return await pgList(weekId);
    const all = await fileReadAll();
    return weekId ? all.filter((e) => e.weekId === weekId) : all;
  } catch (err) {
    console.error("[contests] listEntries failed", err);
    return [];
  }
}

export function scoreEntry(
  picks: StoredContestEntry["picks"],
  results: Record<string, "home" | "away" | "push" | null>,
): { score: number | null; correct: number | null; total: number | null } {
  let correct = 0;
  let total = 0;
  for (const p of picks) {
    const r = results[p.gameId];
    if (r === null || r === undefined || r === "push") continue;
    total++;
    if (p.side === r) correct++;
  }
  if (total === 0) return { score: null, correct: null, total: null };
  return { score: correct, correct, total };
}

export async function enterContest(
  input: ContestEntryInput,
  now = new Date(),
): Promise<{ ok: true; entry: StoredContestEntry } | { ok: false; error: string }> {
  const mode = resolveContestStorageMode();
  if (mode === "unavailable") {
    return {
      ok: false,
      error:
        "Entry storage is unavailable on this host (no durable database). Operator: ensure DATABASE_URL is configured.",
    };
  }

  let week: ContestWeek;
  try {
    week = await loadCurrentContestWeek(now);
  } catch {
    week = buildContestWeek(now, loadFileSettlements(isoWeekId(now)));
  }

  if (week.status !== "open" || now >= new Date(week.locksAt)) {
    return { ok: false, error: "This contest week is closed." };
  }

  if (input.picks.length < week.games.length) {
    return {
      ok: false,
      error: `Pick every game on the slate (${week.games.length} required).`,
    };
  }

  const validIds = new Set(week.games.map((g) => g.gameId));
  for (const p of input.picks) {
    if (!validIds.has(p.gameId)) {
      return { ok: false, error: `Unknown game: ${p.gameId}` };
    }
  }

  const entry: StoredContestEntry = {
    id: `ce_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
    weekId: week.weekId,
    displayName: input.displayName.trim(),
    emailHash: hashEmail(input.email),
    picks: input.picks,
    createdAt: now.toISOString(),
    score: null,
    correct: null,
    total: null,
  };

  try {
    if (mode === "postgres") {
      const res = await pgInsert(entry);
      if (res === "duplicate") {
        return { ok: false, error: "You already entered this week with that email." };
      }
      return { ok: true, entry };
    }

    return await withFileLock(storePath(), async () => {
      const all = await fileReadAll();
      if (all.some((e) => e.weekId === week.weekId && e.emailHash === entry.emailHash)) {
        return { ok: false, error: "You already entered this week with that email." };
      }
      all.push(entry);
      await fileWriteAll(all);
      return { ok: true, entry };
    });
  } catch (err) {
    console.error("[contests] enterContest failed", err);
    return {
      ok: false,
      error: "Could not store entry. Try again — if this persists, storage is unhealthy.",
    };
  }
}

export async function leaderboard(weekId: string): Promise<
  Array<{
    rank: number;
    displayName: string;
    score: number | null;
    correct: number | null;
    total: number | null;
    enteredAt: string;
  }>
> {
  const settlements = await loadMergedSettlements(weekId);
  const results: Record<string, "home" | "away" | "push" | null> = { ...settlements };

  const entries = await listEntries(weekId);
  const scored = entries.map((e) => {
    const s = scoreEntry(e.picks, results);
    return {
      displayName: e.displayName,
      score: s.score,
      correct: s.correct,
      total: s.total,
      enteredAt: e.createdAt,
    };
  });

  scored.sort((a, b) => {
    const sa = a.score ?? -1;
    const sb = b.score ?? -1;
    if (sb !== sa) return sb - sa;
    return a.enteredAt.localeCompare(b.enteredAt);
  });

  return scored.map((row, i) => ({ rank: i + 1, ...row }));
}
