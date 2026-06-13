/**
 * Routing rules — minimal type scaffold.
 *
 * Full routing rule definitions live in the operating director layer.
 * This stub satisfies the conversation engine's import while that layer
 * is designed but not wired.
 */

export type TaskType =
  | "pick-research"
  | "data-incident"
  | "stat-rd"
  | "content-draft"
  | "overnight-loop";

export interface RoutingRule {
  readonly taskType: TaskType;
  readonly description: string;
  readonly sequence: readonly { readonly seat: string }[];
}

/** Empty until the operating director layer is wired. */
export const ROUTING_RULES: readonly RoutingRule[] = [];
