/**
 * GSE Formal Foundry — Shared Types
 * Soundness role: common contracts for all modules.
 * Linear-only. Fail-closed. Silent-launch compatible.
 */

export type Frame = Record<string, unknown>;
export type Candidate = Record<string, unknown>;
export type State = Record<string, unknown>;

export type ProofStatus = "PASSED" | "REJECTED" | "MANUAL_REVIEW" | "PROCESSED";

export interface ProofGatedChange {
  pr: string;
  invariantsChecked: string[];
  ctiCount: number;
  status: ProofStatus;
  timestamp: string;
  verifier: "Apalache+IC3" | "Owner" | "Lifting";
}

export interface VelocityMetrics {
  changesUnderProof: number;
  ctiCaught: number;
  incidentRateProtected: number;
  averageProofLatencyMs: number;
  lastProofDate: string;
}

/**
 * Base error for every Apalache RPC / IC3 controller failure. Kept as the
 * ORIGINAL public class name and constructor signature
 * `(message, code?, data?)` so every existing call site (apalache-client.ts,
 * ic3-controller.ts) keeps working unchanged. `this.name` uses
 * `new.target.name` so a subclass automatically reports its own name
 * (`ApalacheSolverUnknownError`, etc.) without each subclass needing to
 * repeat `this.name = ...` in its own constructor.
 */
export class ApalacheRpcError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Custom JSON-RPC error codes THIS CLIENT defines. This is the SAME honesty
 * posture as the rest of this package's Apalache-protocol code (see
 * apalache-client.ts's header): no real Apalache server has ever been
 * reachable from this environment, so these codes are this client's OWN
 * convention, not a transcription of a verified Apalache artifact. Standard
 * JSON-RPC 2.0 reserves -32768..-32000 for protocol/implementation-defined
 * errors; -32000..-32099 is the spec's explicit "reserved for
 * implementation-defined server-errors" band, which is where the
 * Apalache-specific codes below live.
 */
export const APALACHE_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SOLVER_UNKNOWN: -32000, // the SMT backend returned `unknown` rather than sat/unsat
  SOLVER_TIMEOUT: -32001, // a solver call exceeded its time/resource budget
  SPEC_LOAD_ERROR: -32002, // loadSpec failed (parse/typecheck)
  SESSION_ERROR: -32003, // unknown/expired sessionId or snapshotId (no active session)
  MALFORMED_ITF: -32004, // server rejected/could not produce valid ITF
} as const;

/** Transport/network-layer failure: connection refused, DNS, a non-2xx HTTP
 *  status, or a response body that was not valid JSON at all. Distinct from
 *  a well-formed JSON-RPC `error` response — see `ApalacheServerError`. */
export class ApalacheTransportError extends ApalacheRpcError {
  constructor(message: string, data?: unknown) {
    super(message, undefined, data);
  }
}

/** The HTTP response WAS JSON but did not conform to the JSON-RPC 2.0
 *  envelope this client expects. */
export class ApalacheProtocolError extends ApalacheRpcError {
  constructor(message: string, data?: unknown) {
    super(message, undefined, data);
  }
}

/** The server returned a well-formed JSON-RPC error whose `code` this
 *  client recognizes as one of the codes above. Base class for the specific
 *  ones below; also used directly for a `code` this client does not
 *  otherwise distinguish. */
export class ApalacheServerError extends ApalacheRpcError {}

/** SOLVER_UNKNOWN: the SMT backend returned `unknown` rather than a
 *  definite sat/unsat. Per this repo's non-negotiables, `unknown` is NEVER
 *  treated as success or failure — it is always this exception. */
export class ApalacheSolverUnknownError extends ApalacheServerError {}

/** SOLVER_TIMEOUT: the solver call exceeded its time/resource budget before
 *  reaching a verdict. Also always a hard failure, never a default. */
export class ApalacheSolverTimeoutError extends ApalacheServerError {}

export class ApalacheSpecLoadError extends ApalacheServerError {}

/** No active session (no `loadSpec` call yet), or an unknown/expired
 *  sessionId/snapshotId. */
export class ApalacheSessionError extends ApalacheServerError {}

export class ApalacheMalformedItfError extends ApalacheServerError {}

/** Map a well-formed JSON-RPC error body to the right typed subclass. */
export function apalacheErrorForCode(code: number, message: string, data?: unknown): ApalacheServerError {
  switch (code) {
    case APALACHE_ERROR_CODES.SOLVER_UNKNOWN:
      return new ApalacheSolverUnknownError(message, code, data);
    case APALACHE_ERROR_CODES.SOLVER_TIMEOUT:
      return new ApalacheSolverTimeoutError(message, code, data);
    case APALACHE_ERROR_CODES.SPEC_LOAD_ERROR:
      return new ApalacheSpecLoadError(message, code, data);
    case APALACHE_ERROR_CODES.SESSION_ERROR:
      return new ApalacheSessionError(message, code, data);
    case APALACHE_ERROR_CODES.MALFORMED_ITF:
      return new ApalacheMalformedItfError(message, code, data);
    default:
      return new ApalacheServerError(message, code, data);
  }
}
