import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ContestEntryInput, StoredContestEntry } from "./types";
import { getCurrentContestWeek } from "./week";

function storePath(): string {
  return (
    process.env.GSE_CONTEST_STORE_PATH ??
    path.join(process.cwd(), ".gse-local", "contest-entries.json")
  );
}

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 24);
}

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

async function readAll(): Promise<StoredContestEntry[]> {
  try {
    const raw = await fs.readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredContestEntry[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(rows: StoredContestEntry[]): Promise<void> {
  const file = storePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(rows, null, 2), "utf8");
  await fs.rename(tmp, file);
}

export async function listEntries(weekId?: string): Promise<StoredContestEntry[]> {
  const all = await readAll();
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

  const file = storePath();
  return withFileLock(file, async () => {
    const all = await readAll();
    const emailHash = hashEmail(input.email);
    if (all.some((e) => e.weekId === week.weekId && e.emailHash === emailHash)) {
      return { ok: false, error: "You already entered this week with that email." };
    }

    const entry: StoredContestEntry = {
      id: `ce_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`,
      weekId: week.weekId,
      displayName: input.displayName.trim(),
      emailHash,
      picks: input.picks,
      createdAt: now.toISOString(),
      score: null,
      correct: null,
      total: null,
    };

    all.push(entry);
    await writeAll(all);
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
