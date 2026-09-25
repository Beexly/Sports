/**
 * Coverage analyzer — TypeScript wrapper over the gse-ml-service coverage
 * backend.
 *
 * Public contract (matches the Python `coverage_classifier` output shape):
 *   analyzePlay(input) -> {
 *     preSnap, postSnap, disguised, safetyDepth, cornerLeverage, boxCount
 *   }
 *   aggregate(plays) -> {
 *     coverageDistribution, disguiseRate, downDistanceTendency
 *   }
 *
 * Fail-closed contract
 * --------------------
 * Unavailable / malformed backend responses throw
 * {@link FilmBackendUnavailableError} and return NO coverage label. A missing
 * YOLO/OpenCV detector must produce a clear failure, never a fabricated
 * "Cover 0" from an empty field.
 *
 * Labels are geometric readings, not calibrated probabilities. Do not publish
 * them as win rates.
 */

import { FilmBackendUnavailableError } from "./highlight-detector.js";

// ── Output shape ───────────────────────────────────────────────────────────────

export type CoverageLabel =
  | "Cover 0"
  | "Cover 1"
  | "Cover 2"
  | "Cover 3"
  | "Cover 4-Quarters"
  | "Cover 6"
  | "1-Man"
  | "Cover 1 Man";

export const COVER_LABELS: readonly CoverageLabel[] = [
  "Cover 0",
  "Cover 1",
  "Cover 2",
  "Cover 3",
  "Cover 4-Quarters",
  "Cover 6",
  "1-Man",
  "Cover 1 Man",
];

export type CornerSide = "left" | "right";
export type CornerTechnique = "press" | "off" | "bail";
export type CornerAlignment = "inside" | "outside" | "head_up";

export interface CornerLeverage {
  readonly side: CornerSide;
  readonly technique: CornerTechnique;
  readonly leverage: CornerAlignment;
}

export interface CoveragePlayResult {
  readonly preSnap: CoverageLabel;
  readonly postSnap: CoverageLabel;
  readonly disguised: boolean;
  readonly safetyDepth: number;
  readonly cornerLeverage: readonly CornerLeverage[];
  readonly boxCount: number;
}

export type DistanceBand = "short" | "medium" | "long";

export interface DownDistanceTendency {
  readonly down: number;
  readonly distanceBand: DistanceBand;
  readonly coverage: CoverageLabel;
  readonly rate: number;
}

export interface CoverageAggregate {
  readonly coverageDistribution: Readonly<Record<string, number>>;
  /** Alias of coverageDistribution (compat with older backends). */
  readonly distribution: Readonly<Record<string, number>>;
  readonly disguiseRate: number;
  readonly downDistanceTendency: readonly DownDistanceTendency[];
  /** Alias of downDistanceTendency (compat with older backends). */
  readonly byDownDistance: readonly DownDistanceTendency[];
}

// ── Backend seam ───────────────────────────────────────────────────────────────

export interface CoverageBackend {
  isAvailable(): boolean;
  /** Preferred method name. */
  analyzePlay?(input: unknown): Promise<unknown>;
  /** Accepted alias used by some backends. */
  classifyPlay?(input: unknown): Promise<unknown>;
  aggregate(plays: readonly unknown[]): Promise<unknown>;
}

export interface CoverageAnalyzerOptions {
  readonly backend?: CoverageBackend;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface CoverageAnalyzerApi {
  /**
   * Classify one play's pre- and post-snap look.
   *
   * @throws {FilmBackendUnavailableError} when the backend is unavailable or
   *   returns malformed data. Never fabricates a coverage label.
   */
  analyzePlay(input: unknown): Promise<CoveragePlayResult>;
  /**
   * Aggregate play results into distribution / disguise rate / tendency.
   *
   * @throws {FilmBackendUnavailableError} under the same fail-closed rule.
   */
  aggregate(plays: readonly unknown[]): Promise<CoverageAggregate>;
}

// ── Shape validation (pure) ────────────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isCoverageLabel(value: unknown): value is CoverageLabel {
  return typeof value === "string" && (COVER_LABELS as readonly string[]).includes(value);
}

function parseCornerLeverage(raw: unknown): CornerLeverage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const { side, technique, leverage } = row;
  if (side !== "left" && side !== "right") return null;
  if (technique !== "press" && technique !== "off" && technique !== "bail") return null;
  if (leverage !== "inside" && leverage !== "outside" && leverage !== "head_up") return null;
  return { side, technique, leverage };
}

/** Validate one raw backend row into a {@link CoveragePlayResult}. */
export function parseCoveragePlayResult(raw: unknown): CoveragePlayResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const { preSnap, postSnap, disguised, safetyDepth, cornerLeverage, boxCount } = row;
  if (!isCoverageLabel(preSnap) || !isCoverageLabel(postSnap)) return null;
  if (typeof disguised !== "boolean") return null;
  if (!isFiniteNumber(safetyDepth) || safetyDepth < 0) return null;
  if (!isFiniteNumber(boxCount) || boxCount < 0 || !Number.isInteger(boxCount)) return null;
  if (!Array.isArray(cornerLeverage)) return null;
  const corners: CornerLeverage[] = [];
  for (const item of cornerLeverage) {
    const parsed = parseCornerLeverage(item);
    if (parsed === null) return null;
    corners.push(parsed);
  }
  return {
    preSnap,
    postSnap,
    disguised,
    safetyDepth,
    cornerLeverage: corners,
    boxCount,
  };
}

function isDistanceBand(value: unknown): value is DistanceBand {
  return value === "short" || value === "medium" || value === "long";
}

function parseTendencyRow(raw: unknown): DownDistanceTendency | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const { down, distanceBand, coverage, rate } = row;
  if (!isFiniteNumber(down) || !Number.isInteger(down) || down < 1 || down > 4) return null;
  if (!isDistanceBand(distanceBand)) return null;
  if (!isCoverageLabel(coverage)) return null;
  if (!isFiniteNumber(rate) || rate < 0 || rate > 1) return null;
  return { down, distanceBand, coverage, rate };
}

/** Validate a raw backend payload into a {@link CoverageAggregate}. */
export function parseCoverageAggregate(raw: unknown): CoverageAggregate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const distRaw = row["coverageDistribution"] ?? row["distribution"];
  const tendencyRaw = row["downDistanceTendency"] ?? row["byDownDistance"];
  const { disguiseRate } = row;
  if (typeof distRaw !== "object" || distRaw === null) return null;
  const distribution: Record<string, number> = {};
  for (const [key, value] of Object.entries(distRaw as Record<string, unknown>)) {
    if (!isCoverageLabel(key)) return null;
    if (!isFiniteNumber(value) || value < 0 || value > 1) return null;
    distribution[key] = value;
  }
  if (!isFiniteNumber(disguiseRate) || disguiseRate < 0 || disguiseRate > 1) return null;
  if (!Array.isArray(tendencyRaw)) return null;
  const tendency: DownDistanceTendency[] = [];
  for (const item of tendencyRaw) {
    const parsed = parseTendencyRow(item);
    if (parsed === null) return null;
    tendency.push(parsed);
  }
  return {
    coverageDistribution: distribution,
    distribution,
    disguiseRate,
    downDistanceTendency: tendency,
    byDownDistance: tendency,
  };
}

// ── HTTP backend (default) ─────────────────────────────────────────────────────

interface HttpCoverageBackendDeps {
  readonly baseUrl: string;
  readonly fetchImpl: typeof fetch;
  readonly timeoutMs: number;
}

class HttpCoverageBackend implements CoverageBackend {
  readonly #deps: HttpCoverageBackendDeps;

  constructor(deps: HttpCoverageBackendDeps) {
    this.#deps = deps;
  }

  isAvailable(): boolean {
    return this.#deps.baseUrl.length > 0;
  }

  async #post(path: string, body: unknown): Promise<unknown> {
    const url = `${this.#deps.baseUrl.replace(/\/$/, "")}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#deps.timeoutMs);
    try {
      const response = await this.#deps.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new FilmBackendUnavailableError(
          "backend_error",
          `gse-ml-service responded ${response.status} for ${path}`,
        );
      }
      return await response.json();
    } catch (err) {
      if (err instanceof FilmBackendUnavailableError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new FilmBackendUnavailableError(
        "backend_error",
        `request to gse-ml-service failed: ${message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  analyzePlay(input: unknown): Promise<unknown> {
    return this.#post("/film/coverage/analyze", input);
  }

  aggregate(plays: readonly unknown[]): Promise<unknown> {
    return this.#post("/film/coverage/aggregate", { plays });
  }
}

function resolveBackend(options: CoverageAnalyzerOptions): CoverageBackend {
  if (options.backend) return options.backend;
  if (options.baseUrl !== undefined && options.baseUrl.length > 0) {
    return new HttpCoverageBackend({
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl ?? globalThis.fetch.bind(globalThis),
      timeoutMs: options.timeoutMs ?? 10_000,
    });
  }
  return {
    isAvailable: () => false,
    analyzePlay: async () => {
      throw new FilmBackendUnavailableError(
        "not_configured",
        "no CoverageBackend and no baseUrl configured; refusing to fabricate coverage labels.",
      );
    },
    aggregate: async () => {
      throw new FilmBackendUnavailableError(
        "not_configured",
        "no CoverageBackend and no baseUrl configured; refusing to fabricate coverage labels.",
      );
    },
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create a coverage analyzer. Zero-arg form (ethandojo handoff suite) yields a
 * fail-closed analyzer: every call throws until a backend or baseUrl is set.
 */
export function createCoverageAnalyzer(
  options: CoverageAnalyzerOptions = {},
): CoverageAnalyzerApi {
  const backend = resolveBackend(options);
  return {
    async analyzePlay(input: unknown): Promise<CoveragePlayResult> {
      if (!backend.isAvailable()) {
        throw new FilmBackendUnavailableError(
          "backend_unavailable",
          "coverage backend is not available; fail-closed, no labels fabricated.",
        );
      }
      let raw: unknown;
      try {
        const analyze =
          typeof backend.analyzePlay === "function"
            ? backend.analyzePlay.bind(backend)
            : backend.classifyPlay?.bind(backend);
        if (typeof analyze !== "function") {
          throw new Error("coverage backend exposes neither analyzePlay nor classifyPlay");
        }
        raw = await analyze(input);
      } catch (err) {
        if (err instanceof FilmBackendUnavailableError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new FilmBackendUnavailableError(
          "backend_error",
          `coverage backend call failed: ${message}`,
        );
      }
      const parsed = parseCoveragePlayResult(raw);
      if (parsed === null) {
        throw new FilmBackendUnavailableError(
          "malformed_response",
          "malformed payload: coverage backend returned data that does not match the play-result shape; fail-closed.",
        );
      }
      return parsed;
    },

    async aggregate(plays: readonly unknown[]): Promise<CoverageAggregate> {
      if (!backend.isAvailable()) {
        throw new FilmBackendUnavailableError(
          "backend_unavailable",
          "coverage backend is not available; fail-closed, no labels fabricated.",
        );
      }
      let raw: unknown;
      try {
        raw = await backend.aggregate(plays);
      } catch (err) {
        if (err instanceof FilmBackendUnavailableError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new FilmBackendUnavailableError(
          "backend_error",
          `coverage backend call failed: ${message}`,
        );
      }
      const parsed = parseCoverageAggregate(raw);
      if (parsed === null) {
        throw new FilmBackendUnavailableError(
          "malformed_response",
          "malformed payload: coverage backend returned data that does not match the aggregate shape; fail-closed.",
        );
      }
      return parsed;
    },
  };
}
