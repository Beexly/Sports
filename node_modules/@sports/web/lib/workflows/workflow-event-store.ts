import type { WorkflowEvent } from "./workflow-events";

export interface WorkflowEventStore {
  readonly append: (event: WorkflowEvent) => Promise<WorkflowEvent>;
  readonly list: (workflowId?: string) => Promise<readonly WorkflowEvent[]>;
}

export function createMemoryWorkflowEventStore(initial: readonly WorkflowEvent[] = []): WorkflowEventStore {
  const events = [...initial];
  return {
    async append(event) {
      events.push(event);
      return event;
    },
    async list(workflowId) {
      return workflowId ? events.filter((event) => event.workflowId === workflowId) : events;
    },
  };
}
