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
import { extractNumericClaims, type GroundedValue } from "@/lib/claude-api/numeric-guard";
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

const GAME_DATA_GROUNDING_INSTRUCTION =
  "Ground every figure you write in the GAME DATA block above. Do NOT invent, " +
  "estimate, or infer any statistic, factor score, line or prop movement, win " +
  "rate, or numeric value that is not present in GAME DATA. When GAME DATA does " +
  "not contain a specific number the outline asks for, describe that read " +
  "qualitatively instead of citing a fabricated figure.";

/**
 * Serializes the node's verified factual fields into a structured GAME DATA
 * block. The Studio templates instruct the model to "cite specific factor
 * names and scores" and "specific numbers"; without the real values injected
 * here the model would be forced to fabricate every stat (non-negotiables #1
 * and #4). Only fields actually present on the node are emitted, and absent
 * market fields are explicitly marked "not available" so the model does not
 * invent a value. Bootstrap/seed nodes never reach this path — they gate to
 * THIN before prompt construction — so every value below is canonical.
 */
export function serializeNodeGameData(node: GameIntelligenceNode): string {
  const mp = node.marketPulse;
  const eh = node.evidenceHealth;
  const lines: string[] = [
    "=== GAME DATA (verified platform values) ===",
    `Matchup: ${node.matchup}`,
    `Sport: ${node.sport}`,
    `Commence time (UTC): ${node.commenceTime}`,
    mp.edgeIndex !== null
      ? `Edge Index: ${mp.edgeIndex}`
      : "Edge Index: not available - do not cite a value",
    `Bookmaker coverage: ${mp.bookmakerCoverage} book(s)`,
    mp.lineMovementSpread !== null
      ? `Line movement (spread): ${mp.lineMovementSpread}`
      : "Line movement (spread): not available - do not cite a value",
    mp.lineMovementTotal !== null
      ? `Line movement (total): ${mp.lineMovementTotal}`
      : "Line movement (total): not available - do not cite a value",
    `Evidence health: ${eh.score}/100 (${eh.status}); ${eh.sourceCount} source(s); ${eh.staleCount} stale`,
  ];

  if (node.picks.length === 0) {
    lines.push("Published picks: none published yet - do not invent a pick.");
  } else {
    lines.push("Published picks:");
    for (const pick of node.picks) {
      lines.push(
        `  - ${pick.selection} | market ${pick.market} | confidence ${pick.confidence} | edge score ${pick.edgeScore} | result ${pick.result ?? "PENDING"}`
      );
    }
  }

  lines.push("=== END GAME DATA ===");
  return lines.join("\n");
}

/**
 * The numbers a generated Studio asset is ALLOWED to contain.
 *
 * Grounding is the GAME DATA block ONLY. It is deliberately NOT the template's
 * system prompt — those carry EXAMPLE statistics (FANTASY_ANGLE's system prompt
 * literally illustrates prop movement as a "line moved from 7.5 to 8.5"), so
 * grounding on the system prompt would let the model's own instructions launder a
 * fabricated stat into "grounded". It is also not the assembled `prompt.user`,
 * which prefixes GAME DATA onto template instructions.
 *
 * The structured half of the set exists because signed values render as "-1.5"
 * and "Boston Celtics -4.5", and the claim extractor deliberately skips a digit
 * preceded by "-": without them the platform's own line would be missing from the
 * grounding set while legitimate copy ("laying 4.5") would read as fabricated.
 * Every value below is read off the verified node — the signed value and its
 * magnitude are the SAME real number. Nothing the node does not hold is added.
 */
export function buildStudioNumericGrounding(
  node: GameIntelligenceNode,
): readonly GroundedValue[] {
  const mp = node.marketPulse;
  const eh = node.evidenceHealth;
  // Claims extracted from the serialized node keep the kind their LABEL gave
  // them. Flattening them to bare numbers — which this builder used to do — is
  // exactly what discards the meaning: a number then grounds any claim that
  // shares its digits, whatever the copy says that number *is*.
  const values: GroundedValue[] = extractNumericClaims(serializeNodeGameData(node)).map(
    (claim) => ({ value: claim.value, kind: claim.kind }),
  );

  // Structured values, typed by what they are. Tallies are `count`; scores,
  // indices and lines read as bare numbers in prose, which the claim extractor
  // types `magnitude`. Where a body writes one of these as a percentage
  // ("72% confidence") the kinds are incompatible and the claim is refused —
  // the fail-closed direction, and the one this gate exists to take.
  const push = (value: number, kind: GroundedValue["kind"]): void => {
    values.push({ value, kind });
  };

  push(mp.bookmakerCoverage, "count");
  push(mp.publishedPickCount, "count");
  push(eh.sourceCount, "count");
  push(eh.staleCount, "count");
  push(eh.bootstrapCount, "count");
  push(eh.score, "magnitude");
  push(eh.averageTrust, "magnitude");

  for (const value of [mp.edgeIndex, mp.lineMovementSpread, mp.lineMovementTotal]) {
    if (value !== null) {
      push(value, "magnitude");
      push(Math.abs(value), "magnitude");
    }
  }

  for (const pick of node.picks) {
    push(pick.confidence, "magnitude");
    push(pick.edgeScore, "magnitude");
    // The pick's own line lives inside the selection string ("Boston Celtics -4.5").
    for (const token of pick.selection.match(/-?\d+(?:\.\d+)?/g) ?? []) {
      const parsed = Number(token);
      if (Number.isFinite(parsed)) {
        push(parsed, "magnitude");
        push(Math.abs(parsed), "magnitude");
      }
    }
  }

  return values;
}

/**
 * Wraps a template-built prompt so the model receives the node's real data and
 * an explicit instruction to use only those values. The templates themselves
 * ignore the node argument (declared `_node`); this is where the factual
 * grounding is attached before the prompt is handed to Claude.
 */
function attachNodeGameData(base: ClaudePrompt, node: GameIntelligenceNode): ClaudePrompt {
  return {
    ...base,
    user: `${serializeNodeGameData(node)}\n\n${GAME_DATA_GROUNDING_INSTRUCTION}\n\n${base.user}`,
  };
}

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
    prompt: refusalReason
      ? null
      : attachNodeGameData(template.promptBuilder(input.node, input.context), input.node),
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
