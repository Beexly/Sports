import {
  getRulesForTemplate,
  type ComplianceRule,
  type RuleLayer,
  type RuleSeverity,
} from "@/lib/compliance-scanner/rules";
import { normalizeForComplianceScan } from "@/lib/compliance-scanner/normalize";

export type JournalComplianceStatus = "green" | "yellow" | "red";

export interface JournalComplianceFlag {
  readonly id: string;
  readonly layer: RuleLayer;
  readonly severity: RuleSeverity;
  readonly span: { readonly start: number; readonly end: number };
  readonly message: string;
  readonly suggestion: string | null;
}

export interface JournalComplianceScanResult {
  readonly status: JournalComplianceStatus;
  readonly flags: readonly JournalComplianceFlag[];
  readonly publishAllowed: boolean;
}

function regexForScan(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags.replace("g", ""));
}

function scanRule(rule: ComplianceRule, content: string): JournalComplianceFlag | null {
  const match = regexForScan(rule.pattern).exec(content);
  if (!match) return null;

  return {
    id: rule.id,
    layer: rule.layer,
    severity: rule.severity,
    span: { start: match.index, end: match.index + match[0].length },
    message: rule.message,
    suggestion: rule.suggestion,
  };
}

export function scanModelJournalMarkdown(content: string): JournalComplianceScanResult {
  // Collapse soft line-wraps before scanning so a banned phrase split across a
  // newline (e.g. "a sure\nthing") can't slip the gate — Markdown renders the
  // wrap as one continuous claim. Mirrors the read-time public-journal guard.
  const scanTarget = normalizeForComplianceScan(content);
  const flags = getRulesForTemplate("MODEL_JOURNAL")
    .map((rule) => scanRule(rule, scanTarget))
    .filter((flag): flag is JournalComplianceFlag => flag !== null);

  const hasBlock = flags.some((flag) => flag.severity === "block");
  const hasWarn = flags.some((flag) => flag.severity === "warn");
  const status: JournalComplianceStatus = hasBlock ? "red" : hasWarn ? "yellow" : "green";

  return {
    status,
    flags,
    publishAllowed: status !== "red",
  };
}
