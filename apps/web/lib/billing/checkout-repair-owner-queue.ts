/**
 * Durable owner queue for unresolved checkout ambiguity (directive 5.3:
 * "owner queue surfaces unresolved ambiguity").
 *
 * A repair pass that cannot prove an attempt's outcome writes a CockpitTask —
 * the repo's existing owner review queue (Founder OS cockpit reads
 * `cockpit_tasks` directly) — instead of only logging. One task per attempt:
 * repeated passes over the same still-unresolved attempt update the existing
 * open task rather than piling up duplicates.
 */

import type { CheckoutRepairOwnerQueue } from "@/lib/billing/checkout-attempt-repair";

const SOURCE = "checkout-attempt-repair";

/** Statuses that mean the owner already handled the task — mint a new one. */
const CLOSED_TASK_STATUSES = new Set(["APPROVED", "REJECTED", "ARCHIVED"]);

interface MinimalCockpitTaskDelegate {
  findMany(args: {
    where: Record<string, unknown>;
  }): Promise<Array<{ id: string; status?: unknown; payload?: unknown }>>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  update(args: {
    where: { id: string };
    data: Record<string, unknown>;
  }): Promise<unknown>;
}

/**
 * Build the production owner queue over the Prisma CockpitTask delegate.
 * Returns null when the client has no cockpitTask delegate (stub client) —
 * the caller falls back to log-only signalling rather than crashing the pass.
 */
export function cockpitCheckoutRepairOwnerQueue(
  client: unknown,
): CheckoutRepairOwnerQueue | null {
  const delegate = (client as { cockpitTask?: MinimalCockpitTaskDelegate }).cockpitTask;
  if (!delegate) return null;

  return {
    async surfaceUnresolvedAttempt(entry): Promise<void> {
      const existing = await delegate.findMany({ where: { source: SOURCE } });
      const open = existing.find((task) => {
        const payload = task.payload as { attemptId?: unknown } | null | undefined;
        return (
          payload?.attemptId === entry.attemptId &&
          !CLOSED_TASK_STATUSES.has(String(task.status))
        );
      });

      const description =
        `Checkout attempt ${entry.attemptId} is ${entry.status} past its ` +
        `reconciliation window and Stripe could not prove its outcome ` +
        `(${entry.reason}). A payable session may exist. The repair cron keeps ` +
        `retrying; review in Stripe if this persists.`;

      if (open) {
        await delegate.update({
          where: { id: open.id },
          data: {
            description,
            payload: { attemptId: entry.attemptId, status: entry.status, reason: entry.reason },
          },
        });
        return;
      }

      await delegate.create({
        data: {
          title: `Unresolved checkout attempt ${entry.attemptId}`,
          description,
          // BOBBY owns funnel/subscription review items.
          assignedAgent: "BOBBY",
          status: "NEEDS_REVIEW",
          priority: 90,
          riskLevel: "HIGH",
          source: SOURCE,
          payload: { attemptId: entry.attemptId, status: entry.status, reason: entry.reason },
        },
      });
    },
  };
}
