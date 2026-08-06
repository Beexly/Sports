/**
 * Contest Bay entry store — dual backend.
 *
 * 1) Postgres (production Neon via Prisma raw) when !isStubMode()
 *    — serverless-safe, durable across instances.
 * 2) Local JSON file when not on Vercel and stub/local.
 * 3) Closed (honest refuse) on Vercel+stub — never pretend entries persist.
 *
 * No Prisma schema migration required: bootstrap CREATE TABLE IF NOT EXISTS.
 * Table is namespaced `gse_contest_entries` so it never collides with core models.
 */

import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db, isStubMode } from "@sports/db";
import type { ContestEntryInput, StoredContestEntry } from "./types";
import { getCurrentContestWeek } from "./week";

export type ContestStorageMode = "postgres" | "file" | "unavailable";

export function resolveContestStorageMode(): ContestStorageMode {
  if (!isStubMode()) return "postgres";
  // Vercel serverless filesystem is ephemeral / not shared across isolates.
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
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}

// ─── File backend (local / CI) ───────────────────────────────────────────────

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

// ─── Postgres backend ────────────────────────────────────────────────────────

let pgReady: Promise<void> | null = null;

async function ensurePgTable(): Promise<void> {
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
  picks: StoredContestEntry["picks"];
  created_at: Date;
};

function rowToEntry(r: PgRow): StoredContestEntry {
  return {
    id: r.id,
    weekId: r.week_id,
    displayName: r.display_name,
    emailHash: r.email_hash,
    picks: r.picks,
    createdAt: new Date(r.created_at).toISOString(),
    score: null,
    correct: null,
    total: null,
  };
}

async function pgList(weekId?: string): Promise<StoredContestEntry[]> {
  await ensurePgTable();
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
  await ensurePgTable();
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

// ─── Public API ──────────────────────────────────────────────────────────────

export async function listEntries(weekId?: string): Promise<StoredContestEntry[]> {
  const mode = resolveContestStorageMode();
  if (mode === "unavailable") return [];
  if (mode === "postgres") return pgList(weekId);
  const all = await fileReadAll();
  return weekId ? all.filter((e) => e.weekId === weekId) : all;
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

  const week = getCurrentContestWeek(now);
  if (week.status !== "open" || now >= new Date(week.locksAt)) {
    return { ok: false, error: "This contest week is locked." };
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

  if (mode === "postgres") {
    const res = await pgInsert(entry);
    if (res === "duplicate") {
      return { ok: false, error: "You already entered this week with that email." };
    }
    return { ok: true, entry };
  }

  // file
  return withFileLock(storePath(), async () => {
    const all = await fileReadAll();
    if (all.some((e) => e.weekId === week.weekId && e.emailHash === entry.emailHash)) {
      return { ok: false, error: "You already entered this week with that email." };
    }
    all.push(entry);
    await fileWriteAll(all);
    return { ok: true, entry };
  });
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
  const week = getCurrentContestWeek();
  const results: Record<string, "home" | "away" | "push" | null> = {};
  for (const g of week.games) results[g.gameId] = g.result;

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

