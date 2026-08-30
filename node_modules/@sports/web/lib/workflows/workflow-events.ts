export interface WorkflowEvent {
  readonly workflowId: string;
  readonly kind: "STALE_DATA" | "SAFETY_WARNING" | "OWNER_GATE" | "PROTECTED_SOURCE" | "UNSETTLED_SEASON" | "NORMAL";
  readonly message: string;
  readonly createdAt: string;
}
