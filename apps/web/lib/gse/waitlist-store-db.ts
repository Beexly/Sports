/**
 * GSE Waitlist — durable (DB) store LOGIC for PR3.
 *
 * This is the real store implementation for the gated `WaitlistLead` table, written
 * against a small INJECTED delegate interface (Prisma-compatible) rather than the
 * generated client. That keeps it:
 *   - gate-safe: it does NOT modify `packages/db/prisma/schema.prisma`, import the
 *     Prisma client, connect to a database, or run a migration. On this deploy-target
 *     repo (migrate-in-build), adding a model/migration would auto-apply on a future
 *     deploy — an owner-gated step. See `pr3-durable-storage-plan.md` /
 *     `pr3-migration-runbook.md`.
 *   - fully testable now: the dedup/insert/list logic is unit-tested against an
 *     in-memory fake delegate, with the SAME contract as the file store.
 *
 * PR3 wiring (owner-run, after the model + migration exist): pass `db.waitlistLead`
 * (which satisfies `WaitlistLeadDelegate`) into `createDbWaitlistStore()` from
 * `selectWaitlistStore()` when `WAITLIST_STORAGE=db`.
 */

import type { WaitlistLeadInput } from "@/lib/gse/waitlist-validation";
import type {
  StoredWaitlistLead,
  RecordResult,
  WaitlistStore,
} from "@/lib/gse/waitlist-store";

/** A persisted row, mirroring the proposed `WaitlistLead` Prisma model. */
export interface WaitlistLeadRow {
  email: string;
  fullName: string;
  role: string;
  sportInterests: string[];
  currentStack: string | null;
  weakestProcess: string | null;
  consent: boolean;
  consentAt: Date;
  copyVersion: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  sourcePath: string | null;
  reviewStatus: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CreateWaitlistLeadData {
  email: string;
  fullName: string;
  role: string;
  sportInterests: string[];
  currentStack: string | null;
  weakestProcess: string | null;
  consent: boolean;
  consentAt: Date;
  copyVersion: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  referrer: string | null;
  sourcePath: string | null;
}

/**
 * The minimal slice of `PrismaClient["waitlistLead"]` this store needs. The real
 * Prisma delegate satisfies it structurally once the model exists.
 */
export interface WaitlistLeadDelegate {
  findUnique(args: { where: { email: string } }): Promise<WaitlistLeadRow | null>;
  create(args: { data: CreateWaitlistLeadData }): Promise<WaitlistLeadRow>;
  findMany(args: {
    where: { deletedAt: null };
    orderBy?: { createdAt: "asc" | "desc" };
  }): Promise<WaitlistLeadRow[]>;
}

/** Prisma's unique-constraint violation code, for the create() race. */
const PRISMA_UNIQUE_VIOLATION = "P2002";
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
  );
}

function toStored(row: WaitlistLeadRow): StoredWaitlistLead {
  return {
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    sportInterests: row.sportInterests,
    currentStack: row.currentStack ?? undefined,
    weakestProcess: row.weakestProcess ?? undefined,
    consent: true,
    createdAt: row.createdAt.toISOString(),
    utmSource: row.utmSource ?? undefined,
    utmCampaign: row.utmCampaign ?? undefined,
    referrer: row.referrer ?? undefined,
    path: row.sourcePath ?? undefined,
    copyVersion: row.copyVersion ?? undefined,
    reviewStatus: "QUEUED",
  };
}

export function createDbWaitlistStore(leads: WaitlistLeadDelegate): WaitlistStore {
  async function record(lead: WaitlistLeadInput): Promise<RecordResult> {
    const email = lead.email.trim().toLowerCase();
    const existing = await leads.findUnique({ where: { email } });
    if (existing) {
      return { stored: false, duplicate: true };
    }
    try {
      await leads.create({
        data: {
          email,
          fullName: lead.fullName,
          role: lead.role,
          sportInterests: lead.sportInterests,
          currentStack: lead.currentStack ?? null,
          weakestProcess: lead.weakestProcess ?? null,
          consent: true,
          consentAt: new Date(),
          copyVersion: lead.copyVersion ?? null,
          utmSource: lead.utmSource ?? null,
          utmCampaign: lead.utmCampaign ?? null,
          referrer: lead.referrer ?? null,
          sourcePath: lead.path ?? null,
        },
      });
      return { stored: true, duplicate: false };
    } catch (err) {
      // Lost the race against a concurrent insert with the same email — the
      // unique index is the source of truth. Treat as a safe duplicate, not a 500.
      if (isUniqueViolation(err)) {
        return { stored: false, duplicate: true };
      }
      throw err;
    }
  }

  async function list(): Promise<StoredWaitlistLead[]> {
    const rows = await leads.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toStored);
  }

  // filePath is part of the interface (file store); not meaningful for the DB store.
  return { filePath: "db://waitlist_lead", record, list };
}
