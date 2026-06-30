/**
 * GSE Founding Waitlist — LOCAL-FILE storage fallback.
 *
 * The durable store is intended to be a Prisma `WaitlistLead` table, but adding
 * that table is an owner-gated schema/migration change. Until that gate is
 * cleared, leads are persisted to a local JSON file ONLY. This is:
 *   - local-only (no network, no DB, no external service),
 *   - lazy (no filesystem access at import time),
 *   - de-duplicated by lowercased email.
 *
 * Default path is the gitignored `.gse-local/` dir (override with
 * `GSE_WAITLIST_STORE_PATH`) so captured leads are discoverable for owner
 * review yet provably never committed.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import type { WaitlistLeadInput } from "@/lib/gse/waitlist-validation";

export interface StoredWaitlistLead {
  email: string;
  fullName: string;
  role: string;
  sportInterests: string[];
  currentStack?: string;
  weakestProcess?: string;
  consent: true;
  createdAt: string;
  utmSource?: string;
  utmCampaign?: string;
  referrer?: string;
  path?: string;
  copyVersion?: string;
  // Review workflow — owner-driven only; nothing auto-transitions or sends.
  reviewStatus: "QUEUED";
}

export interface RecordResult {
  stored: boolean;
  duplicate: boolean;
}

export interface WaitlistStore {
  readonly filePath: string;
  record(lead: WaitlistLeadInput): Promise<RecordResult>;
  list(): Promise<StoredWaitlistLead[]>;
}

function defaultStorePath(): string {
  return (
    process.env.GSE_WAITLIST_STORE_PATH ??
    // Repo-local but gitignored (.gse-local/ — see .gitignore). Discoverable for
    // owner review, and provably never committed.
    path.join(process.cwd(), ".gse-local", "waitlist-leads.json")
  );
}

// Serialize read-modify-write per file so concurrent submissions in one process
// can't clobber each other (the local fallback has no DB-level concurrency; the
// gated DB store will get real row-level guarantees — see pr3-durable-storage-plan).
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

export function createWaitlistStore(filePath: string = defaultStorePath()): WaitlistStore {
  async function readAll(): Promise<StoredWaitlistLead[]> {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredWaitlistLead[]) : [];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw err;
    }
  }

  async function record(lead: WaitlistLeadInput): Promise<RecordResult> {
    return withFileLock(filePath, async () => {
      const email = lead.email.trim().toLowerCase();
      const all = await readAll();
      if (all.some((existing) => existing.email === email)) {
        return { stored: false, duplicate: true };
      }
      const entry: StoredWaitlistLead = {
        email,
        fullName: lead.fullName,
        role: lead.role,
        sportInterests: lead.sportInterests,
        currentStack: lead.currentStack,
        weakestProcess: lead.weakestProcess,
        consent: true,
        createdAt: new Date().toISOString(),
        utmSource: lead.utmSource,
        utmCampaign: lead.utmCampaign,
        referrer: lead.referrer,
        path: lead.path,
        copyVersion: lead.copyVersion,
        reviewStatus: "QUEUED",
      };
      all.push(entry);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(all, null, 2), "utf8");
      return { stored: true, duplicate: false };
    });
  }

  async function list(): Promise<StoredWaitlistLead[]> {
    return readAll();
  }

  return { filePath, record, list };
}

/**
 * Choose the active waitlist store. Today this is always the local-file fallback.
 * It is the single switch point for the gated `WaitlistLead` DB store (see
 * `docs/gse/pr3-durable-storage-plan.md`): when that lands, branch here on
 * `WAITLIST_STORAGE=db` — no call site changes.
 */
export function selectWaitlistStore(): WaitlistStore {
  // if (process.env.WAITLIST_STORAGE === "db") return createDbWaitlistStore(); // gated
  return createWaitlistStore();
}
