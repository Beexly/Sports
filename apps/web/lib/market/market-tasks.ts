import { AGENT_TASK_SEED } from "@/lib/tasks/agent-task-seed";
import type { AgentTask } from "@/lib/tasks/agent-task-types";
export function marketMovementToTask(gameId: string, movement: number, threshold = 1.5): AgentTask | null { if (Math.abs(movement) < threshold) return null; const base = AGENT_TASK_SEED.find((task) => task.id === "clv-tracking-foundation")!; return { ...base, id: `market:${gameId}`, assignedAgent: "delta", title: `Line movement alert for ${gameId}`, sourceEvidence: [`movement:${movement}`], nextAction: "Review movement without public/sharp claims." }; }
export function blockPublicSharpLabel(label: string): boolean { return /sharp|public|steam/i.test(label); }
