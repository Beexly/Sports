/**
 * Source health agent.
 *
 * Today's source-intelligence module classifies evidence per call but
 * nothing watches it over time. When a source degrades FRESH → AGING →
 * STALE, picks generated against it are silently degraded. This module
 * gives operators an always-current read of source health.
 *
 * Pure-logic by design — the caller injects `probes` (one entry per
 * recent SourceSnapshot or IngestionRun). The route handler queries the
 * DB and calls this function with the result. Same module is therefore
 * unit-testable without a database.
 *
 * The narrative is one Claude call (Haiku, cached system prompt) that
 * turns the structured findings into a 2-3 sentence operator-readable
 * summary. Empty probes skips the Claude call entirely.
 */

import Anthropic from "@anthropic-ai/sdk";
import { makeAnthropicHolder } from "../ai/client.js";
import { withTelemetry } from "../ai/telemetry.js";

const NARRATIVE_MODEL = "claude-haiku-4-5";

const SOURCE_HEALTH_VERSION = "source-health/v1";

// Default thresholds (operator-tunable per category in a future cycle).
const FRESH_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const AGING_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

export type SourceHealthStatus = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type SourceHealthSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface SourceProbe {
  readonly provider: string;
  readonly sourceKind: string;
  readonly fetchedAt: Date;
  /** Optional override for per-category thresholds. */
  readonly freshThresholdMs?: number;
  readonly agingThresholdMs?: number;
}

export interface SourceHealthEntry {
  readonly provider: string;
  readonly sourceKind: string;
  readonly fetchedAt: string;
  readonly ageMs: number;
  readonly status: SourceHealthStatus;
}

export interface SourceHealthAlert {
  readonly severity: SourceHealthSeverity;
  readonly provider: string;
  readonly message: string;
}

export interface SourceHealthReport {
  readonly sources: readonly SourceHealthEntry[];
  readonly alerts: readonly SourceHealthAlert[];
  readonly narrative: string;
  readonly composerVersion: string;
  readonly model: string | null;
  readonly composedAt: string;
}

export interface AssessSourceHealthInput {
  readonly probes: readonly SourceProbe[];
  readonly now?: Date;
}

const NARRATIVE_SYSTEM_PROMPT = `You are an operations agent producing a 2-3 sentence read on source health.
You receive a JSON summary of source probes (provider, status, age). Speak in plain operator language.
If everything is FRESH, say so — don't invent risk. If anything is STALE, name the provider and call it out.
Do not invent numbers; use only what's in the summary. Maximum 3 sentences.`;

function classifyAge(
  ageMs: number,
  probe: SourceProbe
): SourceHealthStatus {
  if (ageMs < 0) return "FRESH";
  const fresh = probe.freshThresholdMs ?? FRESH_THRESHOLD_MS;
  const aging = probe.agingThresholdMs ?? AGING_THRESHOLD_MS;
  if (ageMs <= fresh) return "FRESH";
  if (ageMs <= aging) return "AGING";
  return "STALE";
}

function buildAlerts(entries: readonly SourceHealthEntry[]): SourceHealthAlert[] {
  const alerts: SourceHealthAlert[] = [];
  for (const e of entries) {
    if (e.status === "STALE") {
      alerts.push({
        severity: "HIGH",
        provider: e.provider,
        message: `${e.provider} (${e.sourceKind}) is STALE — last fetch was ${Math.round(e.ageMs / 60_000)} minutes ago`,
      });
    } else if (e.status === "AGING") {
      alerts.push({
        severity: "MEDIUM",
        provider: e.provider,
        message: `${e.provider} (${e.sourceKind}) is AGING — last fetch was ${Math.round(e.ageMs / 60_000)} minutes ago`,
      });
    }
  }
  return alerts;
}

function emptyReport(now: Date): SourceHealthReport {
  return {
    sources: [],
    alerts: [],
    narrative:
      "No source probes available — ingestion may not be running, or the DB query returned no recent SourceSnapshot rows.",
    composerVersion: SOURCE_HEALTH_VERSION,
    model: null,
    composedAt: now.toISOString(),
  };
}

const holder = makeAnthropicHolder();
const getClient = holder.get;

/** Test-only escape hatch for vitest. */
export const __setClientForTests = holder.setForTests;

/**
 * Build a structured source-health report from injected probes.
 * Calls Claude once (Haiku, cached system) to produce a 2-3 sentence
 * operator narrative. Empty probes skips the Claude call.
 * Falls back to a deterministic narrative when the Claude call fails.
 */
export async function assessSourceHealth(
  input: AssessSourceHealthInput
): Promise<SourceHealthReport> {
  const now = input.now ?? new Date();

  if (input.probes.length === 0) {
    return emptyReport(now);
  }

  // Dedupe to latest probe per provider+sourceKind (caller may pass a wider window)
  const byKey = new Map<string, SourceProbe>();
  for (const p of input.probes) {
    const key = `${p.provider}::${p.sourceKind}`;
    const existing = byKey.get(key);
    if (!existing || p.fetchedAt > existing.fetchedAt) {
      byKey.set(key, p);
    }
  }

  const sources: SourceHealthEntry[] = [];
  for (const probe of byKey.values()) {
    const ageMs = now.getTime() - probe.fetchedAt.getTime();
    sources.push({
      provider: probe.provider,
      sourceKind: probe.sourceKind,
      fetchedAt: probe.fetchedAt.toISOString(),
      ageMs,
      status: classifyAge(ageMs, probe),
    });
  }

  // Stable order: by ageMs DESC (oldest/staler first) so the UI puts trouble at the top.
  sources.sort((a, b) => b.ageMs - a.ageMs);

  const alerts = buildAlerts(sources);

  const summaryForClaude = {
    total: sources.length,
    fresh: sources.filter((s) => s.status === "FRESH").length,
    aging: sources.filter((s) => s.status === "AGING").length,
    stale: sources.filter((s) => s.status === "STALE").length,
    worst: sources.slice(0, 5).map((s) => ({
      provider: s.provider,
      sourceKind: s.sourceKind,
      status: s.status,
      ageMinutes: Math.round(s.ageMs / 60_000),
    })),
  };

  let narrative: string;
  let model: string | null = NARRATIVE_MODEL;

  try {
    const client = getClient();
    const response = await withTelemetry(
      { callSite: "source-health-narrative", model: NARRATIVE_MODEL },
      () =>
        client.messages.create({
          model: NARRATIVE_MODEL,
          max_tokens: 400,
          system: [
            {
              type: "text",
              text: NARRATIVE_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: [
            {
              role: "user",
              content: `SUMMARY:\n${JSON.stringify(summaryForClaude, null, 2)}\n\nWrite a 2-3 sentence operator read.`,
            },
          ],
        })
    );
    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    narrative = textBlock ? textBlock.text.trim() : fallbackNarrative(summaryForClaude);
  } catch {
    // If Claude is unreachable, fall back to a deterministic narrative
    // rather than failing the whole health read.
    narrative = fallbackNarrative(summaryForClaude);
    model = null;
  }

  return {
    sources,
    alerts,
    narrative,
    composerVersion: SOURCE_HEALTH_VERSION,
    model,
    composedAt: now.toISOString(),
  };
}

function fallbackNarrative(s: {
  total: number;
  fresh: number;
  aging: number;
  stale: number;
}): string {
  if (s.stale > 0) {
    return `${s.stale} of ${s.total} sources are STALE — picks generated against these are working from degraded data. Operator review required.`;
  }
  if (s.aging > 0) {
    return `${s.aging} of ${s.total} sources are AGING — within tolerances but worth watching.`;
  }
  return `All ${s.total} tracked sources are FRESH.`;
}
