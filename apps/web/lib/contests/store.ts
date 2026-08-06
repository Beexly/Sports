import { createHash } from "node:crypto";
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
  await fs.writeFile(file, JSON.stringify(rows, null, 2), "utf8");
}

export async function listEntries(weekId?: string): Promise<StoredContestEntry[]> {
  const all = await readAll();
  return weekId ? all.filter((e) => e.weekId === weekId) : all;
}

export async function enterContest(
  input: ContestEntryInput,
): Promise<{ ok: true; entry: StoredContestEntry } | { ok: false; error: string }> {
  const week = getCurrentContestWeek();
  if (week.status !== "open") {
    return { ok: false, error: "This contest week is locked." };
  }
  if (new Date() >= new Date(week.locksAt)) {
    return { ok: false, error: "Entries are locked for this week." };
  }

  const validIds = new Set(week.games.map((g) => g.gameId));
  for (const p of input.picks) {
    if (!validIds.has(p.gameId)) {
      return { ok: false, error: `Unknown game: ${p.gameId}` };
    }
  }

  const all = await readAll();
  const emailHash = hashEmail(input.email);
  if (all.some((e) => e.weekId === week.weekId && e.emailHash === emailHash)) {
    return { ok: false, error: "You already entered this week with that email." };
  }

  const entry: StoredContestEntry = {
    id: `ce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    weekId: week.weekId,
    displayName: input.displayName.trim(),
    emailHash,
    picks: input.picks,
    createdAt: new Date().toISOString(),
    score: null,
    correct: null,
    total: null,
  };

  all.push(entry);
  await writeAll(all);
  return { ok: true, entry };
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
  const entries = await listEntries(weekId);

  // Score against settled games if any
  const scored = entries.map((e) => {
    let correct = 0;
    let total = 0;
    for (const p of e.picks) {
      const g = week.games.find((x) => x.gameId === p.gameId);
      if (!g || g.result === null || g.result === "push") continue;
      total++;
      if (p.side === g.result) correct++;
    }
    const score = total > 0 ? correct : null;
    return {
      displayName: e.displayName,
      score,
      correct: total > 0 ? correct : null,
      total: total > 0 ? total : null,
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
