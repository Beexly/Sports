/**
 * Materialize draft-only tasks from Jarvis recommended actions.
 * Pure: no DB, no external send. Snapshot cron surfaces them for the operator.
 *
 * Law: externalActions NONE · draft only · no autonomous publish.
 */

import type { JarvisAssessment } from "@/lib/cockpit/jarvis";

export type JarvisDraftTask = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly assignedAgent: "jarvis" | "tal" | "sarah" | "ava" | "scout" | "bobby";
  readonly priority: "P0" | "P1" | "P2";
  readonly source: "jarvis_recommendation" | "jarvis_safety" | "jarvis_config";
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function assignAgent(text: string): JarvisDraftTask["assignedAgent"] {
  const t = text.toLowerCase();
  if (
    t.includes("ingest") ||
    t.includes("source") ||
    t.includes("odds") ||
    t.includes("gamma") ||
    t.includes("stale")
  )
    return "tal";
  if (t.includes("content") || t.includes("draft") || t.includes("newsletter")) return "ava";
  if (t.includes("customer") || t.includes("support") || t.includes("review")) return "sarah";
  if (t.includes("pick") || t.includes("slate") || t.includes("brief")) return "scout";
  if (t.includes("stripe") || t.includes("revenue") || t.includes("promo")) return "bobby";
  return "jarvis";
}

/** Build deterministic draft tasks from a Jarvis assessment (max ~15). */
export function materializeJarvisDraftTasks(
  assessment: JarvisAssessment,
): readonly JarvisDraftTask[] {
  const out: JarvisDraftTask[] = [];

  for (const w of assessment.safetyWarnings.slice(0, 5)) {
    out.push({
      id: `jarvis-safety-${slug(w)}`,
      title: "Safety: resolve before public exposure",
      detail: w,
      assignedAgent: assignAgent(w),
      priority: "P0",
      source: "jarvis_safety",
    });
  }

  for (const w of assessment.externalConfigWarnings.slice(0, 4)) {
    out.push({
      id: `jarvis-config-${slug(w)}`,
      title: `Config missing: ${w}`,
      detail: `Set ${w} in Production. Free path does not need THE_ODDS_API_KEY.`,
      assignedAgent: "jarvis",
      priority: w === "DATABASE_URL" || w === "NEXTAUTH_SECRET" ? "P0" : "P1",
      source: "jarvis_config",
    });
  }

  for (const a of assessment.recommendedNextActions.slice(0, 6)) {
    out.push({
      id: `jarvis-action-${slug(a)}`,
      title: a.slice(0, 80),
      detail: a,
      assignedAgent: assignAgent(a),
      priority: "P2",
      source: "jarvis_recommendation",
    });
  }

  const seen = new Set<string>();
  return out.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}
