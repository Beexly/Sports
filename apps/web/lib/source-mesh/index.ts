/**
 * Source Acquisition Mesh (ADR 007)
 *
 * Registry and health monitor for every data source the platform polls.
 * The circuit breaker pattern prevents hammering failing sources. The
 * licenseApproved gate blocks polling of any source that hasn't been
 * explicitly approved by an operator.
 *
 * Design:
 *   - Workers call pollSource() to get the next due source.
 *   - After each attempt they call recordPollResult() with the outcome.
 *   - Circuit opens after CIRCUIT_OPEN_THRESHOLD consecutive failures.
 *   - Circuit closes when an operator calls resetCircuit() or when a
 *     successful poll occurs after the cool-down window.
 */

import { db as prisma, Prisma } from "@sports/db";
import type { DataSource, SourceHealthEvent } from "@prisma/client";

// ── Constants ─────────────────────────────────────────────────────────────

const CIRCUIT_OPEN_THRESHOLD = 5;

// ── Types ─────────────────────────────────────────────────────────────────

export type HealthEventType =
  | "poll_ok"
  | "timeout"
  | "error"
  | "circuit_opened"
  | "circuit_closed"
  | "license_denied";

export interface PollResult {
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  errorMessage?: string;
  recordCount?: number;
}

export interface SourceRegistration {
  slug: string;
  displayName: string;
  tier: 1 | 2 | 3 | 4 | 5 | 6;
  pollIntervalMs?: number;
  ttlSeconds?: number;
  rateLimitRpm?: number;
  crawlDelayMs?: number;
  authType?: "api_key" | "oauth2" | "none";
  metadata?: Record<string, unknown>;
}

// ── Registration ──────────────────────────────────────────────────────────

export async function registerSource(
  input: SourceRegistration,
): Promise<DataSource> {
  return prisma.dataSource.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      displayName: input.displayName,
      tier: input.tier,
      pollIntervalMs: input.pollIntervalMs ?? 30_000,
      ttlSeconds: input.ttlSeconds ?? 300,
      rateLimitRpm: input.rateLimitRpm ?? 60,
      crawlDelayMs: input.crawlDelayMs ?? 0,
      authType: input.authType ?? "api_key",
      licenseApproved: false, // operator must explicitly approve
      isActive: false,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
    update: {
      displayName: input.displayName,
      tier: input.tier,
      pollIntervalMs: input.pollIntervalMs ?? 30_000,
      ttlSeconds: input.ttlSeconds ?? 300,
      rateLimitRpm: input.rateLimitRpm ?? 60,
      crawlDelayMs: input.crawlDelayMs ?? 0,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

/** Operator action: approve a source's license and activate it. */
export async function approveLicense(slug: string): Promise<DataSource> {
  return prisma.dataSource.update({
    where: { slug },
    data: { licenseApproved: true, isActive: true },
  });
}

// ── Polling lifecycle ─────────────────────────────────────────────────────

/**
 * Fetch the next source due for a poll.
 * Returns null if nothing is due or all due sources have open circuits.
 */
export async function getNextDueSource(): Promise<DataSource | null> {
  const now = new Date();

  const sources = await prisma.dataSource.findMany({
    where: {
      isActive: true,
      licenseApproved: true,
      circuitOpen: false,
    },
    orderBy: { lastPolledAt: "asc" },
  });

  for (const source of sources) {
    if (!source.lastPolledAt) return source;
    const nextPollDue = new Date(
      source.lastPolledAt.getTime() + source.pollIntervalMs,
    );
    if (nextPollDue <= now) return source;
  }

  return null;
}

/**
 * Record the result of a poll attempt. Manages circuit state automatically.
 * Returns the updated DataSource.
 */
export async function recordPollResult(
  sourceId: string,
  result: PollResult,
): Promise<DataSource> {
  const now = new Date();

  const source = await prisma.dataSource.findUniqueOrThrow({
    where: { id: sourceId },
  });

  if (!source.licenseApproved) {
    await appendHealthEvent(sourceId, "license_denied", now, {});
    return source;
  }

  if (result.success) {
    const updated = await prisma.dataSource.update({
      where: { id: sourceId },
      data: {
        lastPolledAt: now,
        lastSuccessAt: now,
        consecutiveFails: 0,
        // Auto-close circuit on success after cool-down
        circuitOpen: false,
      },
    });

    await appendHealthEvent(sourceId, "poll_ok", now, {
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      recordCount: result.recordCount,
    });

    if (source.circuitOpen) {
      await appendHealthEvent(sourceId, "circuit_closed", now, {
        reason: "successful_poll",
      });
    }

    return updated;
  }

  // Failure path
  const newConsecutiveFails = source.consecutiveFails + 1;
  const shouldOpenCircuit =
    !source.circuitOpen && newConsecutiveFails >= CIRCUIT_OPEN_THRESHOLD;

  const eventType: HealthEventType =
    result.statusCode === undefined ? "timeout" : "error";

  const updated = await prisma.dataSource.update({
    where: { id: sourceId },
    data: {
      lastPolledAt: now,
      consecutiveFails: newConsecutiveFails,
      circuitOpen: shouldOpenCircuit || source.circuitOpen,
    },
  });

  await appendHealthEvent(sourceId, eventType, now, {
    statusCode: result.statusCode,
    latencyMs: result.latencyMs,
    errorMessage: result.errorMessage,
  });

  if (shouldOpenCircuit) {
    await appendHealthEvent(sourceId, "circuit_opened", now, {
      consecutiveFails: newConsecutiveFails,
    });
  }

  return updated;
}

/** Operator action: manually reset a tripped circuit. */
export async function resetCircuit(slug: string): Promise<DataSource> {
  const source = await prisma.dataSource.update({
    where: { slug },
    data: { circuitOpen: false, consecutiveFails: 0 },
  });

  await appendHealthEvent(source.id, "circuit_closed", new Date(), {
    reason: "operator_reset",
  });

  return source;
}

// ── Read ──────────────────────────────────────────────────────────────────

export async function getSourceBySlug(slug: string): Promise<DataSource | null> {
  return prisma.dataSource.findUnique({ where: { slug } });
}

export async function listActiveSources(): Promise<DataSource[]> {
  return prisma.dataSource.findMany({
    where: { isActive: true, licenseApproved: true },
    orderBy: [{ tier: "asc" }, { slug: "asc" }],
  });
}

export async function getSourceHealth(
  sourceId: string,
  limit = 50,
): Promise<SourceHealthEvent[]> {
  return prisma.sourceHealthEvent.findMany({
    where: { sourceId },
    orderBy: { eventAt: "desc" },
    take: limit,
  });
}

// ── Internal ──────────────────────────────────────────────────────────────

async function appendHealthEvent(
  sourceId: string,
  eventType: HealthEventType,
  eventAt: Date,
  data: {
    statusCode?: number;
    latencyMs?: number;
    errorMessage?: string;
    recordCount?: number;
    reason?: string;
    consecutiveFails?: number;
  },
): Promise<SourceHealthEvent> {
  return prisma.sourceHealthEvent.create({
    data: {
      sourceId,
      eventType,
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      errorMessage: data.errorMessage,
      recordCount: data.recordCount,
      eventAt,
    },
  });
}
