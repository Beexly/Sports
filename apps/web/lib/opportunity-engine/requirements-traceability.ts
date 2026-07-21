import traceabilityData from "../../../../data/nova/requirements-traceability-2026-07-21.json";

export type RequirementState = "IMPLEMENTED" | "PARTIAL" | "READY" | "OWNER_GATED" | "PLANNED";

export interface TracedRequirement {
  readonly id: string;
  readonly requirement: string;
  readonly state: RequirementState;
  readonly codeRefs: readonly string[];
  readonly tests: readonly string[];
  readonly next: string;
}

export interface RequirementsTraceabilitySummary {
  readonly total: number;
  readonly implemented: number;
  readonly partial: number;
  readonly ready: number;
  readonly ownerGated: number;
  readonly planned: number;
  readonly implementationCoverage: number;
  readonly codingReadyCoverage: number;
}

const REQUIREMENTS = traceabilityData.requirements as readonly TracedRequirement[];
const ALLOWED_STATES = new Set<RequirementState>([
  "IMPLEMENTED",
  "PARTIAL",
  "READY",
  "OWNER_GATED",
  "PLANNED",
]);

export function getTracedRequirements(): readonly TracedRequirement[] {
  return REQUIREMENTS;
}

export function getTracedRequirement(id: string): TracedRequirement | undefined {
  return REQUIREMENTS.find((requirement) => requirement.id === id);
}

export function summarizeRequirementsTraceability(
  requirements: readonly TracedRequirement[] = REQUIREMENTS,
): RequirementsTraceabilitySummary {
  const count = (state: RequirementState): number =>
    requirements.filter((requirement) => requirement.state === state).length;
  const implemented = count("IMPLEMENTED");
  const partial = count("PARTIAL");
  const ready = count("READY");
  const ownerGated = count("OWNER_GATED");
  const planned = count("PLANNED");
  const total = requirements.length;
  return {
    total,
    implemented,
    partial,
    ready,
    ownerGated,
    planned,
    implementationCoverage: total === 0 ? 0 : implemented / total,
    codingReadyCoverage: total === 0 ? 0 : (implemented + partial + ready + ownerGated) / total,
  };
}

export function validateRequirementsTraceability(
  requirements: readonly TracedRequirement[] = REQUIREMENTS,
): readonly string[] {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const item of requirements) {
    if (!/^REQ-\d{3}$/.test(item.id)) errors.push(`${item.id} has an invalid requirement id.`);
    if (ids.has(item.id)) errors.push(`Duplicate requirement id: ${item.id}`);
    ids.add(item.id);
    if (!item.requirement.trim()) errors.push(`${item.id} has no requirement statement.`);
    if (!ALLOWED_STATES.has(item.state)) errors.push(`${item.id} has an unsupported state.`);
    if (item.codeRefs.length === 0) errors.push(`${item.id} has no code or documentation reference.`);
    if (!item.next.trim()) errors.push(`${item.id} has no next action.`);
    for (const ref of [...item.codeRefs, ...item.tests]) {
      if (ref.startsWith("/") || ref.includes("\\")) {
        errors.push(`${item.id} contains a non-portable repository reference: ${ref}`);
      }
    }
  }

  const summary = summarizeRequirementsTraceability(requirements);
  if (summary.total !== 22) errors.push(`Expected 22 traced requirements, found ${summary.total}.`);
  if (summary.planned > 0) errors.push("Every requirement should be at least coding-ready or explicitly owner-gated.");
  if (summary.codingReadyCoverage !== 1) errors.push("Not every requirement is implementation- or coding-ready.");
  return errors;
}
