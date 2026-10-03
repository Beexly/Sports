import type { WorkflowDefinition } from "./workflow-registry";

export function workflowRequiresOwnerApproval(workflow: WorkflowDefinition): boolean {
  return workflow.ownerApprovalRules.length > 0 || workflow.gates.includes("owner-approval");
}

export function workflowCanPublish(workflow: WorkflowDefinition): false {
  void workflow;
  return false;
}

export function workflowCanChangeModelWeights(workflow: WorkflowDefinition): false {
  void workflow;
  return false;
}
