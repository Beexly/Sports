/**
 * Model Portfolio Router — public surface (SHADOW ONLY).
 *
 * Route policy is proprietary: nothing from this module may be rendered on
 * a public page. Consumers log shadow recommendations; production calls
 * stay exactly as they are.
 */

export type {
  RouteLane,
  TaskRisk,
  TaskSensitivity,
  RouteTaskProfile,
  EndpointHealth,
  ModelEndpoint,
  RouteRecommendation,
} from "./types";

export { ROUTING_POLICY_VERSION, LANE_BUDGET_CEILINGS, selectLane } from "./policy";
export { ENDPOINT_REGISTRY, CURRENT_CLAUDE_ENDPOINT, getEndpoint } from "./providers/current-claude";
export { defaultHealth, isUsable, type HealthReading } from "./health";
export { recommendRoute, isKnownEndpoint } from "./router";
export { shadowRecommend, isRouterShadowEnabled } from "./shadow";
export type { EvalDimension, EvalCase, EvalCaseResult, EvalRun } from "./eval";
export { FROZEN_EVAL_SUITE, EVAL_RUN_HISTORY } from "./eval";
