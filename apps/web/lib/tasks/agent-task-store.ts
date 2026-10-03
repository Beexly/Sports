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

// CockpitTask.assignedAgent is the OLD 6-role OperatorAgent enum (deliberately a
// tight set — see lib/cockpit/agents.ts). The Agent OS has 23 agents, so we map
// each to its nearest operator bucket for the DB column; the PRECISE agent id is
// preserved in the task payload (which agent-task-store.list reads back from).
const OPERATOR_AGENT_BUCKET: Readonly<Record<string, string>> = {
  jarvis: "JARVIS", meter: "JARVIS", archive: "JARVIS", chain: "JARVIS", ledger: "JARVIS", audit: "JARVIS",
  scout: "SCOUT", delta: "SCOUT", prism: "SCOUT", ascend: "SCOUT",
  tal: "TAL", relay: "TAL", pilot: "TAL", echo: "TAL", vector: "TAL",
  sarah: "SARAH", gauge: "SARAH", pulse: "SARAH",
  ava: "AVA", quill: "AVA",
  bobby: "BOBBY", flare: "BOBBY", mint: "BOBBY",
};
export function toOperatorAgentBucket(agentId: string): string {
  return OPERATOR_AGENT_BUCKET[agentId.toLowerCase()] ?? "JARVIS";
}

// Map Agent OS task fields onto the CockpitTask columns the existing cockpit /
// review-queue views read directly — otherwise a NEEDS_OWNER_APPROVAL / BLOCKED_*
// / P0-CRITICAL task would persist as the column defaults (NEW · 50 · LOW) and
// silently drop out of the blocked/review workflows.
const COCKPIT_STATUS: Readonly<Record<string, string>> = {
  NEW: "NEW", QUEUED: "ROUTED", IN_PROGRESS: "ROUTED",
  NEEDS_OWNER_APPROVAL: "NEEDS_REVIEW", NEEDS_CLAUDE_REVIEW: "NEEDS_REVIEW", READY_FOR_REVIEW: "NEEDS_REVIEW",
  BLOCKED_BY_DATA: "BLOCKED", BLOCKED_BY_RIGHTS: "BLOCKED", BLOCKED_BY_INFRA: "BLOCKED",
  DRAFT_READY: "DRAFTED", COMPLETED: "APPROVED", REJECTED: "REJECTED", ARCHIVED: "ARCHIVED",
};
const COCKPIT_RISK: Readonly<Record<string, string>> = {
  LOW: "LOW", MEDIUM: "MODERATE", HIGH: "HIGH", CRITICAL: "HIGH",
};
// CockpitTask.priority is a higher-is-more-important Int (cockpit sorts desc).
const COCKPIT_PRIORITY: Readonly<Record<string, number>> = { P0: 90, P1: 70, P2: 50, P3: 30 };

export function toCockpitStatus(status: string): string {
  return COCKPIT_STATUS[status] ?? "NEW";
}
export function toCockpitRisk(risk: string): string {
  return COCKPIT_RISK[risk] ?? "LOW";
}
export function toCockpitPriority(priority: string): number {
  return COCKPIT_PRIORITY[priority] ?? 50;
}

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
          // Required OperatorAgent enum — map the 23-agent id to its 6-role bucket
          // so the row persists (without it, every real-DB write threw and silently
          // fell back to memory). The precise agent id stays in `payload`.
          assignedAgent: toOperatorAgentBucket(task.assignedAgent),
          // Normalize onto the CockpitTask columns so blocked/review/critical tasks
          // are truthful in the cockpit views (not silent NEW · 50 · LOW defaults).
          status: toCockpitStatus(task.status),
          priority: toCockpitPriority(task.priority),
          riskLevel: toCockpitRisk(task.risk),
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
