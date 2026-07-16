/**
 * Model Portfolio Router — types (SHADOW MODE ONLY in this wave).
 *
 * The router maps a task profile to a lane and an endpoint recommendation
 * with a reason. It never performs a call: production call sites remain
 * authoritative and untouched. The recommendation object is serializable so
 * shadow comparisons can be logged, tested, and audited.
 */

export type RouteLane =
  | "NO_MODEL"            // deterministic code — a model would add risk, not value
  | "PLAN_FRONTIER"       // deep planning/architecture — strongest model
  | "EXECUTE_BOUNDED"     // well-specified bounded work
  | "EXTRACT_STRUCTURED"  // schema-constrained extraction
  | "VERIFY_INDEPENDENT"  // adversarial second opinion
  | "LOCAL_PRIVATE"       // must not leave GSE-controlled compute
  | "PUBLIC_HIGH_STAKES"; // output becomes a public claim

export type TaskRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type TaskSensitivity = "PUBLIC" | "INTERNAL" | "SENSITIVE";

export interface RouteTaskProfile {
  /** Where the task originates (cockpit surface, worker, api route). */
  readonly surface: string;
  readonly taskType: string;
  readonly risk: TaskRisk;
  readonly sensitivity: TaskSensitivity;
  /** True when the output becomes (or feeds) a public claim. */
  readonly publicVisibility: boolean;
  readonly requiresStructuredOutput: boolean;
  readonly requiresTools: boolean;
  /** Milliseconds; null = no latency target. */
  readonly latencyTargetMs: number | null;
  /** USD ceiling for this task; null = lane default applies. */
  readonly budgetUsd: number | null;
  /** True when deterministic code fully solves the task. */
  readonly deterministicSolutionExists: boolean;
}

export type EndpointHealth = "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";

export interface ModelEndpoint {
  readonly id: string;
  readonly provider: string;
  /** Model identifier as configured in env/config — never invented here. */
  readonly modelEnvVar: string;
  /** True when the provider may train on submitted data. GSE requires false. */
  readonly trainsOnData: boolean;
  /** Which lanes this endpoint is approved to serve. */
  readonly approvedLanes: readonly RouteLane[];
  /** True for the endpoint production call sites already use. */
  readonly isCurrentProduction: boolean;
}

export interface RouteRecommendation {
  readonly policyVersion: string;
  readonly lane: RouteLane;
  /** Endpoint id, or null for NO_MODEL / blocked outcomes. */
  readonly endpointId: string | null;
  /** Ordered fallback endpoint ids. Shadow mode NEVER calls them. */
  readonly fallbackOrder: readonly string[];
  readonly blocked: boolean;
  /** Human-readable rationale — required on every recommendation. */
  readonly reason: string;
  /** Ceiling that applies (lane default or task override). */
  readonly budgetCeilingUsd: number;
  /**
   * SHADOW CONTRACT: consumers may log this object; nothing in this module
   * performs or alters a model call. The current production path stays
   * authoritative until the owner promotes the router.
   */
  readonly shadow: true;
}
