import { db } from "@sports/db";
import type { AgentTask } from "./agent-task-types";

interface StoredAgentTaskRecord {
  readonly id: string;
  readonly payload?: unknown;
}

interface MinimalCockpitTaskDelegate {
  readonly findMany: (args: { where?: { source?: string } }) => Promise<readonly StoredAgentTaskRecord[]>;
  readonly create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  readonly update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
}

export interface AgentTaskStore {
  readonly list: () => Promise<readonly AgentTask[]>;
  readonly upsert: (task: AgentTask) => Promise<AgentTask>;
  readonly upsertMany: (tasks: readonly AgentTask[]) => Promise<readonly AgentTask[]>;
}

const SOURCE = "agent-os-runtime";

function toDelegate(client: unknown): MinimalCockpitTaskDelegate | null {
  const maybe = client as { cockpitTask?: MinimalCockpitTaskDelegate };
  return maybe.cockpitTask ?? null;
}

function taskToPayload(task: AgentTask): Record<string, unknown> {
  return { ...task, source: SOURCE };
}

function payloadToTask(record: StoredAgentTaskRecord): AgentTask | null {
  const payload = record.payload;
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as Partial<AgentTask>;
  return typeof maybe.id === "string" && typeof maybe.title === "string" ? maybe as AgentTask : null;
}

export function createPrismaAgentTaskStore(client: unknown = db): AgentTaskStore {
  const delegate = toDelegate(client);
  const memory = new Map<string, AgentTask>();
  return {
    async list() {
      if (!delegate) return [...memory.values()];
      try {
        const records = await delegate.findMany({ where: { source: SOURCE } });
        const tasks = records.map(payloadToTask).filter((task): task is AgentTask => task !== null);
        return tasks.length > 0 ? tasks : [...memory.values()];
      } catch {
        return [...memory.values()];
      }
    },
    async upsert(task) {
      const existing = memory.get(task.id);
      const stored = existing ? { ...task, createdAt: existing.createdAt } : task;
      memory.set(task.id, stored);
      if (delegate) {
        const data = {
          id: task.id,
          title: task.title,
          description: task.description,
          source: SOURCE,
          payload: taskToPayload(stored),
          decisionNotes: task.nextAction,
        };
        try {
          const records = await delegate.findMany({ where: { source: SOURCE } });
          const match = records.find((record) => payloadToTask(record)?.id === task.id);
          if (match) await delegate.update({ where: { id: match.id }, data });
          else await delegate.create({ data });
        } catch {
          // Stub/no-DB mode keeps the in-memory copy truthful without crashing.
        }
      }
      return stored;
    },
    async upsertMany(tasks) {
      const results: AgentTask[] = [];
      for (const task of tasks) results.push(await this.upsert(task));
      return results;
    },
  };
}
