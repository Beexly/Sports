/**
 * Customer-proof loader — Workstream L3 (cockpit/customer-proof).
 *
 * NEVER THROWS. Every DB read degrades to null on error.
 * null means UNKNOWN — it is never silently treated as 0.
 *
 * HONESTY RULES (non-negotiable):
 * - `emailSignups` and `askGalaxyTotal` are real DB counts or null (unknown).
 * - Event-based funnel stages (views, checkouts) are NOT instrumented yet —
 *   they are shown as "not yet instrumented" to the operator, never as 0.
 * - Classification breakdown comes from real grouped DB query or null.
 * - dataMode = "live" only when both DB reads returned real results.
 */

import { db } from "@sports/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type CustomerProofDataMode = "live" | "partial" | "unavailable";

/**
 * A funnel stage where we have real DB counts.
 */
export interface DbFunnelStage {
  readonly kind: "db";
  readonly label: string;
  readonly count: number | null;
  /** When null = unknown (DB error), count = 0 is confirmed zero */
  readonly unknown: boolean;
}

/**
 * A funnel stage that requires an analytics provider and is not yet instrumented.
 */
export interface AnalyticsFunnelStage {
  readonly kind: "analytics";
  readonly label: string;
  readonly eventName: string;
}

export type FunnelStage = DbFunnelStage | AnalyticsFunnelStage;

/**
 * Ask Galaxy classification counts from the DB.
 * null = unknown (DB error).
 */
export interface ClassificationBreakdown {
  readonly PENDING: number | null;
  readonly ACTION: number | null;
  readonly CAUTION: number | null;
  readonly NO_BET: number | null;
  readonly INSUFFICIENT_DATA: number | null;
}

export interface CustomerProofState {
  readonly dataMode: CustomerProofDataMode;
  readonly loadedAtIso: string;
  readonly funnel: readonly FunnelStage[];
  readonly askGalaxyTotal: number | null;
  readonly classification: ClassificationBreakdown | null;
  readonly emailSignups: number | null;
}

// ── Never-throw DB reads ──────────────────────────────────────────────────────

async function readEmailSignups(): Promise<number | null> {
  try {
    return await db.newsletterSubscriber.count();
  } catch {
    return null;
  }
}

async function readAskGalaxyTotal(): Promise<number | null> {
  try {
    return await db.askGalaxySubmission.count();
  } catch {
    return null;
  }
}

async function readClassificationBreakdown(): Promise<ClassificationBreakdown | null> {
  try {
    const rows = await db.askGalaxySubmission.groupBy({
      by: ["classification"],
      _count: { _all: true },
    });

    const blank: Record<string, number> = {
      PENDING: 0,
      ACTION: 0,
      CAUTION: 0,
      NO_BET: 0,
      INSUFFICIENT_DATA: 0,
    };

    for (const row of rows) {
      const key = row.classification as string;
      if (key in blank) {
        blank[key] = row._count._all;
      }
    }

    return {
      PENDING: blank["PENDING"] ?? 0,
      ACTION: blank["ACTION"] ?? 0,
      CAUTION: blank["CAUTION"] ?? 0,
      NO_BET: blank["NO_BET"] ?? 0,
      INSUFFICIENT_DATA: blank["INSUFFICIENT_DATA"] ?? 0,
    };
  } catch {
    return null;
  }
}

// ── Public loader ─────────────────────────────────────────────────────────────

/**
 * Load the customer-proof state for /cockpit/customer-proof.
 *
 * NEVER THROWS. DB errors degrade individual fields to null.
 *
 * The conversion funnel mixes:
 * - Analytics-event stages (views, checkouts): NOT YET INSTRUMENTED.
 *   Shown honestly as "not yet instrumented — wire an analytics provider."
 * - DB-backed stages (Ask Galaxy, email signups): real counts or null.
 */
export async function loadCustomerProofState(
  now: Date = new Date()
): Promise<CustomerProofState> {
  const loadedAtIso = now.toISOString();

  const [emailSignups, askGalaxyTotal, classification] = await Promise.all([
    readEmailSignups(),
    readAskGalaxyTotal(),
    readClassificationBreakdown(),
  ]);

  // Funnel: founding_desk_view → sample → ask_galaxy → email → checkout → paid
  const funnel: readonly FunnelStage[] = [
    {
      kind: "analytics",
      label: "Founding Desk page views",
      eventName: "founding_desk_view",
    },
    {
      kind: "analytics",
      label: "Sample Desk views",
      eventName: "sample_desk_view",
    },
    {
      kind: "db",
      label: "Ask Galaxy submissions",
      count: askGalaxyTotal,
      unknown: askGalaxyTotal === null,
    },
    {
      kind: "db",
      label: "Email signups",
      count: emailSignups,
      unknown: emailSignups === null,
    },
    {
      kind: "analytics",
      label: "Checkout started",
      eventName: "checkout_started",
    },
    {
      kind: "analytics",
      label: "Checkout completed (paid)",
      eventName: "checkout_completed",
    },
  ];

  // dataMode: live if both DB reads succeeded, partial if one failed, unavailable if both failed
  const dbSuccesses = [emailSignups, askGalaxyTotal, classification].filter(
    (v) => v !== null
  ).length;

  const dataMode: CustomerProofDataMode =
    dbSuccesses === 3 ? "live" : dbSuccesses > 0 ? "partial" : "unavailable";

  return {
    dataMode,
    loadedAtIso,
    funnel,
    askGalaxyTotal,
    classification,
    emailSignups,
  };
}
