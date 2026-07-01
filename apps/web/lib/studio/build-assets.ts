import {
  buildGameIntelligenceNode,
  type GameIntelligenceNode,
  type IntelligenceGameInput,
  type IntelligencePickInput,
  type IntelligenceSignalInput,
} from "@/lib/intelligence-graph";
import {
  getRulesForTemplate,
  type ComplianceRule as PlatformComplianceRule,
  type RuleLayer,
  type RuleSeverity,
} from "@/lib/compliance-scanner/rules";
import { normalizeForComplianceScan } from "@/lib/compliance-scanner/normalize";
import {
  STUDIO_TEMPLATES,
  type ClaudePrompt,
  type CreatorAssetKind,
  type GenerationContext,
  type StudioTemplate,
} from "@/lib/studio/templates";

export type StudioGateState = "READY" | "GATED" | "THIN";
export type StudioScanStatus = "green" | "yellow" | "red";

export interface StudioCitationRef {
  readonly id: string;
  readonly label: string;
  readonly source: string;
}

export interface StudioComplianceFlag {
  readonly id: string;
  readonly layer: RuleLayer;
  readonly severity: RuleSeverity;
  readonly span: { readonly start: number; readonly end: number };
  readonly message: string;
  readonly suggestion: string | null;
}

export interface StudioComplianceScanResult {
  readonly status: StudioScanStatus;
  readonly flags: readonly StudioComplianceFlag[];
  readonly publicReady: boolean;
}

export interface StudioAssetDraft {
  readonly templateKind: CreatorAssetKind;
  readonly templateName: string;
  readonly gateState: StudioGateState;
  readonly refusalReason: string | null;
  readonly prompt: ClaudePrompt | null;
  readonly body: string | null;
  readonly citations: readonly StudioCitationRef[];
  readonly compliance: StudioComplianceScanResult;
}

export interface StudioGameOption {
  readonly id: string;
  readonly matchup: string;
  readonly sport: string;
  readonly commenceTime: string;
  readonly edgeIndex: number | null;
  readonly evidenceStatus: string;
}

export interface StudioDashboardData {
  readonly games: readonly StudioGameOption[];
  readonly selectedGame: StudioGameOption | null;
  readonly selectedNode: GameIntelligenceNode | null;
  readonly drafts: readonly StudioAssetDraft[];
}

interface ScanRule {
  readonly id: string;
  readonly layer: RuleLayer;
  readonly severity: RuleSeverity;
  readonly pattern: RegExp;
  readonly message: string;
  readonly suggestion: string | null;
}

export const STUDIO_THIN_EVIDENCE_REFUSAL = "Evidence is thin - no asset generated.";

function regexForScan(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace("g", ""));
}

function templateRuleToScanRule(
  templateKind: CreatorAssetKind,
  index: number,
  rule: StudioTemplate["complianceRules"][number]
): ScanRule {
  return {
    id: `${templateKind}-TEMPLATE-${index + 1}`,
    layer: 3,
    severity: rule.severity,
    pattern: rule.pattern,
    message: rule.message,
    suggestion: null,
  };
}

function platformRuleToScanRule(rule: PlatformComplianceRule): ScanRule {
  return {
    id: rule.id,
    layer: rule.layer,
    severity: rule.severity,
    pattern: rule.pattern,
    message: rule.message,
    suggestion: rule.suggestion,
  };
}

export function getStudioTemplate(kind: CreatorAssetKind): StudioTemplate {
  const template = STUDIO_TEMPLATES.find((candidate) => candidate.kind === kind);
  if (!template) throw new Error(`Unknown Studio template: ${kind}`);
  return template;
}

export function inferStudioGateState(node: GameIntelligenceNode): StudioGateState {
  if (
    node.marketPulse.gatedByBootstrap ||
    node.evidenceHealth.sourceCount === 0 ||
    node.evidenceHealth.status === "THIN"
  ) {
    return "THIN";
  }
  if (node.picks.length === 0) return "GATED";
  return "READY";
}

export function buildStudioCitations(node: GameIntelligenceNode): readonly StudioCitationRef[] {
  const refs: StudioCitationRef[] = [
    {
      id: `room:${node.id}`,
      label: "Game Intelligence Room",
      source: `/room/${node.id}`,
    },
    {
      id: `evidence:${node.id}`,
      label: `Evidence Health ${node.evidenceHealth.score}/100`,
      source: "Intelligence Graph",
    },
  ];

  for (const pick of node.picks.slice(0, 3)) {
    refs.push({
      id: `pick:${pick.id}`,
      label: `${pick.selection} (${pick.market})`,
      source: "PickSignalSnapshot",
    });
  }

  return refs;
}

export function scanStudioContent(
  templateKind: CreatorAssetKind,
  content: string
): StudioComplianceScanResult {
  const template = getStudioTemplate(templateKind);
  const rules: readonly ScanRule[] = [
    ...getRulesForTemplate(templateKind).map(platformRuleToScanRule),
    ...template.complianceRules.map((rule, index) => templateRuleToScanRule(templateKind, index, rule)),
  ];
  const flags: StudioComplianceFlag[] = [];

  // Collapse soft line-wraps before scanning so a banned phrase split across a
  // newline can't slip the gate (defense in depth, matching the read-time guard).
  const scanTarget = normalizeForComplianceScan(content);

  for (const rule of rules) {
    const match = regexForScan(rule.pattern).exec(scanTarget);
    if (!match) continue;
    flags.push({
      id: rule.id,
      layer: rule.layer,
      severity: rule.severity,
      span: { start: match.index, end: match.index + match[0].length },
      message: rule.message,
      suggestion: rule.suggestion,
    });
  }

  const hasBlock = flags.some((flag) => flag.severity === "block");
  const hasWarn = flags.some((flag) => flag.severity === "warn");
  const status: StudioScanStatus = hasBlock ? "red" : hasWarn ? "yellow" : "green";

  return {
    status,
    flags,
    publicReady: status === "green",
  };
}

export function buildStudioAssetDraft(input: {
  readonly node: GameIntelligenceNode;
  readonly templateKind: CreatorAssetKind;
  readonly context: GenerationContext;
  readonly generatedBody?: string | null;
}): StudioAssetDraft {
  const template = getStudioTemplate(input.templateKind);
  const gateState = inferStudioGateState(input.node);
  const refusalReason = gateState === "THIN" ? STUDIO_THIN_EVIDENCE_REFUSAL : null;
  const body = input.generatedBody ?? null;

  return {
    templateKind: template.kind,
    templateName: template.displayName,
    gateState,
    refusalReason,
    prompt: refusalReason ? null : template.promptBuilder(input.node, input.context),
    body,
    citations: refusalReason ? [] : buildStudioCitations(input.node),
    compliance: body
      ? scanStudioContent(template.kind, body)
      : { status: "yellow", flags: [], publicReady: false },
  };
}

export function buildStudioDraftsForNode(
  node: GameIntelligenceNode,
  context: GenerationContext
): readonly StudioAssetDraft[] {
  return STUDIO_TEMPLATES.map((template) =>
    buildStudioAssetDraft({
      node,
      templateKind: template.kind,
      context,
    })
  );
}

export function buildStudioNode(input: {
  readonly game: IntelligenceGameInput;
  readonly picks?: readonly IntelligencePickInput[];
  readonly signals?: readonly IntelligenceSignalInput[];
  readonly now?: Date;
}): GameIntelligenceNode {
  return buildGameIntelligenceNode(input);
}
