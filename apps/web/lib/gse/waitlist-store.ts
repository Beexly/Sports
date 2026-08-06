/**
 * GSE Founding Waitlist store — dual backend.
 *
 * 1) Postgres when !isStubMode() — durable on Vercel (CREATE TABLE IF NOT EXISTS).
 * 2) Local JSON file for dev/CI / stub mode (non-Vercel).
 * 3) On Vercel+stub: refuse writes (unavailable) — never claim durable file store.
 *
 * Does NOT require the gated Prisma WaitlistLead model. Table: gse_waitlist_leads.
 * Owner may later migrate to formal Prisma model; selectWaitlistStore stays the switch.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { db, isStubMode } from "@sports/db";
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
  reviewStatus: "QUEUED";
}

export interface RecordResult {
  stored: boolean;
  duplicate: boolean;
}

export interface WaitlistStore {
  /** Optional: which backend is active (file | postgres). */
  readonly backend?: "postgres" | "file";
  readonly filePath: string;
  record(lead: WaitlistLeadInput): Promise<RecordResult>;
  list(): Promise<StoredWaitlistLead[]>;
}

export type WaitlistStorageMode = "postgres" | "file" | "unavailable";

export function resolveWaitlistStorageMode(): WaitlistStorageMode {
  if (!isStubMode()) return "postgres";
  if (process.env.VERCEL === "1") return "unavailable";
  return "file";
}

function defaultStorePath(): string {
  return (
    process.env.GSE_WAITLIST_STORE_PATH ??
    path.join(process.cwd(), ".gse-local", "waitlist-leads.json")
  );
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
      const tmp = `${filePath}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(all, null, 2), "utf8");
      await fs.rename(tmp, filePath);
      return { stored: true, duplicate: false };
    });
  }

  async function list(): Promise<StoredWaitlistLead[]> {
    return readAll();
  }

  return { backend: "file", filePath, record, list };
}

// ─── Postgres ────────────────────────────────────────────────────────────────

let pgReady: Promise<void> | null = null;

async function ensurePgTable(): Promise<void> {
  if (!pgReady) {
    pgReady = (async () => {
      await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS gse_waitlist_leads (
          email TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL,
          sport_interests JSONB NOT NULL,
          current_stack TEXT,
          weakest_process TEXT,
          consent BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          utm_source TEXT,
          utm_campaign TEXT,
          referrer TEXT,
          source_path TEXT,
          copy_version TEXT,
          review_status TEXT NOT NULL DEFAULT 'QUEUED'
        )
      `);
    })().catch((err) => {
      pgReady = null;
      throw err;
    });
  }
  await pgReady;
}

function createPgWaitlistStore(): WaitlistStore {
  async function record(lead: WaitlistLeadInput): Promise<RecordResult> {
    await ensurePgTable();
    const email = lead.email.trim().toLowerCase();
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO gse_waitlist_leads (
           email, full_name, role, sport_interests, current_stack, weakest_process,
           consent, created_at, utm_source, utm_campaign, referrer, source_path, copy_version, review_status
         ) VALUES ($1,$2,$3,$4::jsonb,$5,$6,TRUE,NOW(),$7,$8,$9,$10,$11,'QUEUED')`,
        email,
        lead.fullName,
        lead.role,
        JSON.stringify(lead.sportInterests),
        lead.currentStack ?? null,
        lead.weakestProcess ?? null,
        lead.utmSource ?? null,
        lead.utmCampaign ?? null,
        lead.referrer ?? null,
        lead.path ?? null,
        lead.copyVersion ?? null,
      );
      return { stored: true, duplicate: false };
    } catch (err) {
      const msg = String(err);
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code: unknown }).code)
          : "";
      if (code === "23505" || code === "P2002" || /unique/i.test(msg)) {
        return { stored: false, duplicate: true };
      }
      throw err;
    }
  }

  async function list(): Promise<StoredWaitlistLead[]> {
    await ensurePgTable();
    const rows = await db.$queryRaw<
      Array<{
        email: string;
        full_name: string;
        role: string;
        sport_interests: unknown;
        current_stack: string | null;
        weakest_process: string | null;
        created_at: Date;
        utm_source: string | null;
        utm_campaign: string | null;
        referrer: string | null;
        source_path: string | null;
        copy_version: string | null;
      }>
    >`
      SELECT email, full_name, role, sport_interests, current_stack, weakest_process,
             created_at, utm_source, utm_campaign, referrer, source_path, copy_version
      FROM gse_waitlist_leads
      ORDER BY created_at ASC
    `;
    return rows.map((r) => {
      let sports: string[] = [];
      if (Array.isArray(r.sport_interests)) sports = r.sport_interests as string[];
      else if (typeof r.sport_interests === "string") {
        try {
          sports = JSON.parse(r.sport_interests) as string[];
        } catch {
          sports = [];
        }
      }
      return {
        email: r.email,
        fullName: r.full_name,
        role: r.role,
        sportInterests: sports,
        currentStack: r.current_stack ?? undefined,
        weakestProcess: r.weakest_process ?? undefined,
        consent: true as const,
        createdAt: new Date(r.created_at).toISOString(),
        utmSource: r.utm_source ?? undefined,
        utmCampaign: r.utm_campaign ?? undefined,
        referrer: r.referrer ?? undefined,
        path: r.source_path ?? undefined,
        copyVersion: r.copy_version ?? undefined,
        reviewStatus: "QUEUED" as const,
      };
    });
  }

  return {
    backend: "postgres",
    filePath: "postgres:gse_waitlist_leads",
    record,
    list,
  };
}

/**
 * Active waitlist store.
 * - Neon live → durable Postgres bootstrap table
 * - Local stub → file
 * - Vercel+stub → unavailable store that refuses writes honestly
 */
export function selectWaitlistStore(): WaitlistStore {
  // Explicit file path (tests + operator local capture) always wins.
  if (process.env.GSE_WAITLIST_STORE_PATH) {
    return createWaitlistStore(process.env.GSE_WAITLIST_STORE_PATH);
  }
  if (process.env.WAITLIST_STORAGE === "file") {
    return createWaitlistStore();
  }
  const mode = resolveWaitlistStorageMode();
  if (mode === "postgres") return createPgWaitlistStore();
  if (mode === "file") return createWaitlistStore();
  // Vercel without DB: refuse durable claim — record() throws; route returns 503.
  return {
    backend: "file",
    filePath: "unavailable",
    async record() {
      throw new Error(
        "Waitlist storage unavailable: no durable database on this host (DATABASE_URL / Neon required).",
      );
    },
    async list() {
      return [];
    },
  };
}
