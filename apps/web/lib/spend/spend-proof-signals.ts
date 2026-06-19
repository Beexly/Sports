/**
 * Real proof-signal counts for the Spend Governor's upgrade ladder.
 *
 * Reads ONLY real data (subscription rows, the newsletter store, Ask Galaxy
 * submissions). NEVER fabricates: a count is the true DB value, or `null` when the
 * DB is unreachable (degraded honestly, never silently treated as a met signal).
 *
 * NEVER THROWS — every read degrades to null on error so the cockpit always renders.
 */

import { db } from "@sports/db";
import type { ProofSignalCounts } from "@/lib/spend/spend-governor";

export type ProofSignalsDataMode = "live" | "partial" | "unavailable";

export interface SpendProofSignals {
  readonly counts: ProofSignalCounts;
  /** True for fields that came back null (DB unreachable) rather than a real zero. */
  readonly unknown: Readonly<Record<string, boolean>>;
  readonly dataMode: ProofSignalsDataMode;
  readonly loadedAtIso: string;
}

/** Active paid members = non-FREE subscriptions in an ACTIVE/TRIALING state. */
async function readPaidMembers(): Promise<number | null> {
  try {
    return await db.subscription.count({
      where: {
        tier: { not: "FREE" },
        status: { in: ["ACTIVE", "TRIALING"] },
      },
    });
  } catch {
    return null;
  }
}

async function readEmailSubscribers(): Promise<number | null> {
  try {
    return await db.newsletterSubscriber.count();
  } catch {
    return null;
  }
}

async function readAskGalaxy(): Promise<number | null> {
  try {
    return await db.askGalaxySubmission.count();
  } catch {
    return null;
  }
}

/**
 * Load the real proof-signal counts. Revenue + sponsor + owner-approval are not
 * DB-derived here (revenue is computed elsewhere; sponsor/approval are owner
 * actions) — they default to 0 (honestly "not met") and remain owner-supplied.
 */
export async function loadSpendProofSignals(now: Date = new Date()): Promise<SpendProofSignals> {
  const [paidMembers, emails, askGalaxy] = await Promise.all([
    readPaidMembers(),
    readEmailSubscribers(),
    readAskGalaxy(),
  ]);

  const counts: ProofSignalCounts = {
    paid_members_10: paidMembers ?? 0,
    emails_100: emails ?? 0,
    ask_galaxy_25: askGalaxy ?? 0,
    // Not DB-derived in this loader — never fabricated; owner-supplied / computed elsewhere.
    revenue_100: 0,
    sponsor_signed: 0,
    owner_approval: 0,
  };

  const unknown = {
    paid_members_10: paidMembers === null,
    emails_100: emails === null,
    ask_galaxy_25: askGalaxy === null,
  };

  const reads = [paidMembers, emails, askGalaxy];
  const ok = reads.filter((r) => r !== null).length;
  const dataMode: ProofSignalsDataMode =
    ok === reads.length ? "live" : ok === 0 ? "unavailable" : "partial";

  return { counts, unknown, dataMode, loadedAtIso: now.toISOString() };
}
