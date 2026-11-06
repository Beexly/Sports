/**
 * Highlight detector — TypeScript wrapper over the gse-ml-service film backend.
 *
 * Canonical path per the @ethandojo handoff. The Python module in
 * `gse-ml-service/app/models/highlight_detector.py` does the FFmpeg/Whisper
 * work; this wrapper exposes the typed API and fails closed when the backend
 * is unavailable — never fabricates highlights.
 *
 * Public contract (matches the Python `highlight_detector` output shape):
 *   detectHighlights(videoRef) -> Array<{tStart, tEnd, type: "TD"|"INT", confidence}>
 *
 * Fail-closed contract
 * --------------------
 * When the backend is unavailable, malformed, or errors, this wrapper throws
 * {@link FilmBackendUnavailableError} and returns NO highlights. It never
 * fabricates a detection from a failed or missing backend — an empty result
 * is reserved for a backend that positively observed the film and found
 * nothing.
 *
 * Shape validation
 * ----------------
 * Every backend row is validated field-by-field before it is returned. A
 * malformed row (missing key, wrong type, non-finite time, unknown type)
 * fails the whole call closed rather than passing bad data downstream.
 *
 * Determinism
 * -----------
 * No Date.now()/Math.random(). The backend is injected or built from
 * explicit options; nothing here reads the wall clock.
 */

// ── Output shape ───────────────────────────────────────────────────────────────

export type HighlightType = "TD" | "INT";

export interface Highlight {
  readonly tStart: number;
  readonly tEnd: number;
  readonly type: HighlightType;
  readonly confidence: number;
}

/** Alias kept for the ethandojo handoff suite's public vocabulary. */
export type HighlightClip = Highlight;

// ── Errors ─────────────────────────────────────────────────────────────────────

export type FilmBackendFailureReason =
  | "backend_unavailable"
  | "backend_error"
  | "malformed_response"
  | "not_configured";

/**
 * Shared error for film backends — fail-closed when FFmpeg/Whisper/OpenCV
 * are unavailable. Never fabricate output.
 */
export class FilmBackendUnavailableError extends Error {
  readonly kind = "film_backend_unavailable" as const;
  readonly code: FilmBackendFailureReason;
  readonly reason: FilmBackendFailureReason;
  readonly detail: string;

  constructor(code: FilmBackendFailureReason, message: string) {
    super(message);
    this.name = "FilmBackendUnavailableError";
    this.code = code;
    this.reason = code;
    this.detail = message;
  }
}

// ── Backend seam ───────────────────────────────────────────────────────────────

/**
 * Minimal backend contract. The gse-ml-service HTTP surface (or a test stub)
 * implements this. `detectHighlights` may return raw unknown data — this
 * wrapper validates it.
 */
export interface HighlightBackend {
  isAvailable(): boolean;
  detectHighlights(videoRef: string): Promise<unknown>;
}

export interface HighlightDetectorOptions {
  /** Injected backend. When omitted, a baseUrl or runBackend must be supplied. */
  readonly backend?: HighlightBackend;
  /** Base URL of the gse-ml-service film API. */
  readonly baseUrl?: string;
  /** Injected fetch (tests). Defaults to globalThis.fetch. */
  readonly fetchImpl?: typeof fetch;
  /** Per-call timeout in ms. Defaults to 10_000. */
  readonly timeoutMs?: number;
  /** Legacy simple runner seam (returns already-shaped clips). */
  readonly runBackend?: (videoRef: string) => Promise<readonly Highlight[]>;
}

export interface HighlightDetectorApi {
  /**
   * Detect highlights in `videoRef`.
   *
   * @throws {FilmBackendUnavailableError} when the backend is unavailable or
   *   returns malformed data. Never returns fabricated highlights.
   */
  detectHighlights(videoRef: string): Promise<Highlight[]>;
}

// ── Shape validation (pure) ────────────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validate one raw backend row into a {@link Highlight}. Returns null when the
 * row is malformed — the caller fails closed on any null.
 */
export function parseHighlightRow(raw: unknown): Highlight | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const { tStart, tEnd, type, confidence } = row;
  if (!isFiniteNumber(tStart) || !isFiniteNumber(tEnd)) return null;
  if (tEnd <= tStart) return null;
  if (type !== "TD" && type !== "INT") return null;
  if (!isFiniteNumber(confidence) || confidence < 0 || confidence > 1) return null;
  return { tStart, tEnd, type, confidence };
}

/**
 * Validate a raw backend payload into a highlight list. Returns null when the
 * payload is not a well-formed list of well-formed rows.
 */
export function parseHighlightList(raw: unknown): Highlight[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Highlight[] = [];
  for (const item of raw) {
    const parsed = parseHighlightRow(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

// ── HTTP backend (default) ─────────────────────────────────────────────────────

interface HttpHighlightBackendDeps {
  readonly baseUrl: string;
  readonly fetchImpl: typeof fetch;
  readonly timeoutMs: number;
}

class HttpHighlightBackend implements HighlightBackend {
  readonly #deps: HttpHighlightBackendDeps;

  constructor(deps: HttpHighlightBackendDeps) {
    this.#deps = deps;
  }

  isAvailable(): boolean {
    return this.#deps.baseUrl.length > 0;
  }

  async detectHighlights(videoRef: string): Promise<unknown> {
    const url = `${this.#deps.baseUrl.replace(/\/$/, "")}/film/highlights`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#deps.timeoutMs);
    try {
      const response = await this.#deps.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoRef }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new FilmBackendUnavailableError(
          "backend_error",
          `gse-ml-service responded ${response.status} for ${videoRef}`,
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
}

function resolveBackend(options: HighlightDetectorOptions): HighlightBackend {
  if (options.backend) return options.backend;
  if (options.runBackend) {
    const run = options.runBackend;
    return {
      isAvailable: () => true,
      detectHighlights: (videoRef: string) => run(videoRef),
    };
  }
  if (options.baseUrl !== undefined && options.baseUrl.length > 0) {
    return new HttpHighlightBackend({
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl ?? globalThis.fetch.bind(globalThis),
      timeoutMs: options.timeoutMs ?? 10_000,
    });
  }
  return {
    isAvailable: () => false,
    detectHighlights: async () => {
      throw new FilmBackendUnavailableError(
        "not_configured",
        "no HighlightBackend and no baseUrl configured; refusing to fabricate highlights.",
      );
    },
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create a highlight detector. Zero-arg form (used by the ethandojo handoff
 * suite) yields a fail-closed detector: every call throws until a backend or
 * baseUrl is configured. Never fabricates highlights.
 */
export function createHighlightDetector(
  options: HighlightDetectorOptions = {},
): HighlightDetectorApi {
  const backend = resolveBackend(options);
  return {
    async detectHighlights(videoRef: string): Promise<Highlight[]> {
      if (typeof videoRef !== "string" || videoRef.length === 0) {
        throw new FilmBackendUnavailableError(
          "backend_error",
          "videoRef must be a non-empty string",
        );
      }
      if (!backend.isAvailable()) {
        throw new FilmBackendUnavailableError(
          "backend_unavailable",
          "film backend is not available; fail-closed, no highlights fabricated.",
        );
      }
      let raw: unknown;
      try {
        raw = await backend.detectHighlights(videoRef);
      } catch (err) {
        if (err instanceof FilmBackendUnavailableError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new FilmBackendUnavailableError(
          "backend_error",
          `film backend call failed: ${message}`,
        );
      }
      const parsed = parseHighlightList(raw);
      if (parsed === null) {
        throw new FilmBackendUnavailableError(
          "malformed_response",
          "malformed payload: film backend returned data that does not match the highlight row shape; fail-closed.",
        );
      }
      return parsed;
    },
  };
}
