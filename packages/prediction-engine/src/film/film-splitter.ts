/**
 * Film splitter — TypeScript wrapper over the gse-ml-service film backend.
 *
 * Public contract (matches the Python `film_splitter` output shape):
 *   splitPlays(videoRef) -> Array<{playIndex, tStart, tEnd}>
 *
 * Fail-closed contract
 * --------------------
 * Unavailable / malformed backend responses throw
 * {@link FilmBackendUnavailableError} and return NO play segments. Missing
 * FFmpeg (or a missing motion decoder) must produce a clear failure, never
 * fabricated cuts. A successful backend observation of a film with no
 * confirmed plays returns `[]` — that is a finding, not a failure.
 *
 * Motion onsets without a cadence marker within 2 s are excluded by the
 * backend; this wrapper never re-inflates them.
 */

import { FilmBackendUnavailableError } from "./highlight-detector.js";

// ── Output shape ───────────────────────────────────────────────────────────────

export interface PlaySegment {
  readonly playIndex: number;
  readonly tStart: number;
  readonly tEnd: number;
}

// ── Backend seam ───────────────────────────────────────────────────────────────

export interface FilmSplitterBackend {
  isAvailable(): boolean;
  splitPlays(videoRef: string): Promise<unknown>;
}

export interface FilmSplitterOptions {
  readonly backend?: FilmSplitterBackend;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly timeoutMs?: number;
}

export interface FilmSplitterApi {
  /**
   * Split a film into plays.
   *
   * @throws {FilmBackendUnavailableError} when the backend is unavailable or
   *   returns malformed data. Never fabricates play segments.
   */
  splitPlays(videoRef: string): Promise<PlaySegment[]>;
}

// ── Shape validation (pure) ────────────────────────────────────────────────────

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Validate one raw backend row into a {@link PlaySegment}. Returns null when
 * the row is malformed — the caller fails closed on any null.
 */
export function parsePlaySegmentRow(raw: unknown): PlaySegment | null {
  if (typeof raw !== "object" || raw === null) return null;
  const row = raw as Record<string, unknown>;
  const { playIndex, tStart, tEnd } = row;
  if (!isFiniteNumber(playIndex) || !Number.isInteger(playIndex) || playIndex < 0) return null;
  if (!isFiniteNumber(tStart) || !isFiniteNumber(tEnd)) return null;
  if (tEnd <= tStart) return null;
  return { playIndex, tStart, tEnd };
}

/**
 * Validate a raw backend payload into a play-segment list. Returns null when
 * the payload is not a well-formed list of well-formed rows, or when indices
 * are not a contiguous 0-based sequence in time order (the backend's contract).
 */
export function parsePlaySegmentList(raw: unknown): PlaySegment[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PlaySegment[] = [];
  for (const item of raw) {
    const parsed = parsePlaySegmentRow(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  for (let i = 0; i < out.length; i += 1) {
    const row = out[i];
    if (row === undefined || row.playIndex !== i) return null;
    if (i > 0) {
      const prev = out[i - 1];
      if (prev !== undefined && row.tStart < prev.tStart) return null;
    }
  }
  return out;
}

// ── HTTP backend (default) ─────────────────────────────────────────────────────

interface HttpFilmSplitterBackendDeps {
  readonly baseUrl: string;
  readonly fetchImpl: typeof fetch;
  readonly timeoutMs: number;
}

class HttpFilmSplitterBackend implements FilmSplitterBackend {
  readonly #deps: HttpFilmSplitterBackendDeps;

  constructor(deps: HttpFilmSplitterBackendDeps) {
    this.#deps = deps;
  }

  isAvailable(): boolean {
    return this.#deps.baseUrl.length > 0;
  }

  async splitPlays(videoRef: string): Promise<unknown> {
    const url = `${this.#deps.baseUrl.replace(/\/$/, "")}/film/split`;
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

function resolveBackend(options: FilmSplitterOptions): FilmSplitterBackend {
  if (options.backend) return options.backend;
  if (options.baseUrl !== undefined && options.baseUrl.length > 0) {
    return new HttpFilmSplitterBackend({
      baseUrl: options.baseUrl,
      fetchImpl: options.fetchImpl ?? globalThis.fetch.bind(globalThis),
      timeoutMs: options.timeoutMs ?? 10_000,
    });
  }
  return {
    isAvailable: () => false,
    splitPlays: async () => {
      throw new FilmBackendUnavailableError(
        "not_configured",
        "no FilmSplitterBackend and no baseUrl configured; refusing to fabricate play segments.",
      );
    },
  };
}

// ── Factory ────────────────────────────────────────────────────────────────────

/**
 * Create a film splitter. Zero-arg form (ethandojo handoff suite) yields a
 * fail-closed splitter: every call throws until a backend or baseUrl is set.
 */
export function createFilmSplitter(options: FilmSplitterOptions = {}): FilmSplitterApi {
  const backend = resolveBackend(options);
  return {
    async splitPlays(videoRef: string): Promise<PlaySegment[]> {
      if (!backend.isAvailable()) {
        throw new FilmBackendUnavailableError(
          "backend_unavailable",
          "film-splitter backend is not available; fail-closed, no segments fabricated.",
        );
      }
      let raw: unknown;
      try {
        raw = await backend.splitPlays(videoRef);
      } catch (err) {
        if (err instanceof FilmBackendUnavailableError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        throw new FilmBackendUnavailableError(
          "backend_error",
          `film-splitter backend call failed: ${message}`,
        );
      }
      const parsed = parsePlaySegmentList(raw);
      if (parsed === null) {
        throw new FilmBackendUnavailableError(
          "malformed_response",
          "malformed payload: film-splitter backend returned data that does not match the play-segment shape; fail-closed.",
        );
      }
      return parsed;
    },
  };
}
