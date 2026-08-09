/**
 * Durable ACI state — JarvisMemoryEvent. Isolated from publish / PERFORMANCE_STATS.
 */

import { db, isStubMode } from "@sports/db";
import {
  DEFAULT_ACI_CONFIG,
  emptyGroupState,
  type AciArtifact,
  type AciConfig,
  type AciGroupState,
  isConformalAbstainEnabled,
} from "@/lib/calibration/aci-state";

export const ACI_SCOPE = "ops.calibration.aci-state";

export function loadAciConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AciConfig {
  return { ...DEFAULT_ACI_CONFIG };
}

export async function loadAciArtifact(): Promise<AciArtifact | null> {
  if (isStubMode()) return null;
  try {
    const row = await db.jarvisMemoryEvent.findFirst({
      where: { scope: ACI_SCOPE, memory_type: "episodic" },
      orderBy: { created_at: "desc" },
      select: { full_text: true, metadata: true },
    });
    if (!row) return null;
    const raw =
      typeof row.metadata === "object" && row.metadata !== null
        ? row.metadata
        : row.full_text
          ? JSON.parse(row.full_text)
          : null;
    if (!raw || typeof raw !== "object") return null;
    return raw as AciArtifact;
  } catch {
    return null;
  }
}

export async function persistAciArtifact(
  artifact: AciArtifact,
): Promise<"ok" | "stub" | "error"> {
  if (isStubMode()) return "stub";
  try {
    await db.jarvisMemoryEvent.create({
      data: {
        memory_type: "episodic",
        memory_state: "confirmed",
        scope: ACI_SCOPE,
        title: `ACI groups=${artifact.groups.length}`,
        summary: artifact.note,
        full_text: JSON.stringify(artifact),
        source_type: "ops.aci",
        source_timestamp: new Date(artifact.generatedAt),
        actor: "system",
        owner: "system",
        confidence: 80,
        tags: ["aci", "conformal", "internal"],
        metadata: artifact as object,
        owner_approval: true,
      },
    });
    return "ok";
  } catch {
    return "error";
  }
}

export async function getOrInitGroup(
  groupKey: string,
  config: AciConfig = DEFAULT_ACI_CONFIG,
): Promise<AciGroupState> {
  const art = await loadAciArtifact();
  const found = art?.groups.find((g) => g.groupKey === groupKey);
  return found ?? emptyGroupState(groupKey, config.alphaTarget);
}

export function aciPublicPosture(env: NodeJS.ProcessEnv = process.env): {
  readonly enabled: boolean;
  readonly drivesPublish: false;
  readonly operatorHint: string;
} {
  const enabled = isConformalAbstainEnabled(env);
  return {
    enabled,
    drivesPublish: false,
    operatorHint: enabled
      ? "CONFORMAL_ABSTAIN_ENABLED — show/abstain only; does not publish performance."
      : "ACI flag off (default). Set CONFORMAL_ABSTAIN_ENABLED=true to enable abstain routing.",
  };
}
