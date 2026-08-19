/**
 * Deterministic eval scorer for the Sports-OS prompt set.
 *
 * Two scores per surface, both honest and reproducible:
 *   - QUALITY: static rubric checks over the actual prompt text (placeholder
 *     present, no banned phrases from trust-claims, factual-grounding
 *     instruction, calm/no-hype instruction, risk disclosure on
 *     public-facing surfaces, sane length).
 *   - COST: blended $/Mtok at the ACTIVE and RECOMMENDED tiers, computed from
 *     the repo's vendored models.dev snapshot (same prices model-economics
 *     uses). Never a guess; no fabricated pricing.
 *
 * This is the offline, deterministic half of the eval gate — the live parity
 * half stays in promptfooconfig.yaml (needs API keys). Nothing here makes
 * network calls, and the same inputs always produce the same report.
 */
import {
  ALL_SURFACES,
  MODELS,
  type ClaudeSurface,
  type ModelTier,
} from "../../apps/web/lib/claude-api/model-router";
import { getBannedPhraseList } from "../../apps/web/lib/trust-claims";
import snapshot from "../../apps/web/__tests__/fixtures/models-dev-snapshot.json";
import { promptForSurface, type SurfacePrompt } from "./surface-prompts";

export interface QualityCheckResult {
  readonly check: string;
  readonly pass: boolean;
  /** Human-readable detail; for failures, what was missing/found. */
  readonly detail: string;
}

export interface QualityScore {
  readonly pass: boolean;
  readonly checks: readonly QualityCheckResult[];
}

export interface CostScore {
  readonly activeModelId: string;
  readonly recommendedModelId: string;
  readonly activeBlendedUsdPerM: number;
  readonly recommendedBlendedUsdPerM: number;
  /** Fraction saved moving active → recommended (negative = upgrade costs more). */
  readonly savingsFraction: number;
}

export interface SurfaceScore {
  readonly surface: ClaudeSurface;
  readonly activeTier: ModelTier;
  readonly recommendedTier: ModelTier;
  readonly quality: QualityScore;
  readonly cost: CostScore;
}

export interface EvalReport {
  readonly generatedAt: string;
  readonly surfaces: readonly SurfaceScore[];
  readonly qualityPassCount: number;
  readonly qualityFailCount: number;
}

/** Assumed input share for the blended $/Mtok (mirrors model-economics). */
export const INPUT_SHARE = 0.75;

interface ModelsDevModelCost {
  readonly input?: number;
  readonly output?: number;
}

type ModelsDevModel = { readonly cost?: ModelsDevModelCost };
type ModelsDevProvider = { readonly models?: Record<string, ModelsDevModel> };
type ModelsDevCatalog = Record<string, ModelsDevProvider>;

// ---------------------------------------------------------------------------
// Quality rubric (static, deterministic)
// ---------------------------------------------------------------------------

const GROUNDING_RE =
  /(based (only )?on|base .{0,40}on the provided|grounded in|ground .{0,40}in the provided|using (only )?the (provided|given)|from the provided|given the|use only)/i;
const CALM_TONE_RE = /(no hype|no guarantees|no certainty|calm|factual|data-grounded|skeptic|restrained)/i;
const RISK_DISCLOSURE_RE = /(past performance|does not guarantee|no guaranteed outcome)/i;

export function scoreQuality(prompt: SurfacePrompt): QualityScore {
  const checks: QualityCheckResult[] = [];
  const haystack = `${prompt.system}\n${prompt.userTemplate}`;

  checks.push({
    check: "user-placeholder",
    pass: prompt.userTemplate.includes("{{input}}"),
    detail: prompt.userTemplate.includes("{{input}}")
      ? "userTemplate contains the {{input}} slot"
      : "userTemplate is missing the {{input}} slot",
  });

  const banned = getBannedPhraseList().find((phrase) =>
    haystack.toLowerCase().includes(phrase.toLowerCase())
  );
  checks.push({
    check: "no-banned-phrases",
    pass: banned === undefined,
    detail: banned
      ? `contains banned phrase: "${banned}"`
      : "no banned phrases from the trust-claims registry",
  });

  checks.push({
    check: "factual-grounding",
    pass: GROUNDING_RE.test(prompt.system),
    detail: GROUNDING_RE.test(prompt.system)
      ? "system instructs grounding on the provided input only"
      : "system lacks an explicit grounding instruction",
  });

  checks.push({
    check: "calm-tone",
    pass: CALM_TONE_RE.test(prompt.system),
    detail: CALM_TONE_RE.test(prompt.system)
      ? "system requires calm/factual tone, no hype or guarantees"
      : "system lacks an explicit no-hype / calm-tone instruction",
  });

  if (prompt.publicFacing) {
    const ok = RISK_DISCLOSURE_RE.test(prompt.system);
    checks.push({
      check: "risk-disclosure",
      pass: ok,
      detail: ok
        ? "public-facing system prompt carries risk disclosure"
        : "public-facing system prompt is MISSING risk disclosure",
    });
  }

  const lengthOk = prompt.system.length >= 200 && prompt.system.length <= 4000;
  checks.push({
    check: "length-sanity",
    pass: lengthOk,
    detail: `system prompt is ${prompt.system.length} chars (200–4000 required)`,
  });

  return {
    pass: checks.every((check) => check.pass),
    checks,
  };
}

// ---------------------------------------------------------------------------
// Cost scoring (vendored models.dev snapshot — real prices)
// ---------------------------------------------------------------------------

export function costForModelId(
  catalog: ModelsDevCatalog,
  modelId: string
): { readonly input: number; readonly output: number } | null {
  for (const provider of Object.values(catalog)) {
    const cost = provider.models?.[modelId]?.cost;
    if (
      cost &&
      typeof cost.input === "number" &&
      typeof cost.output === "number"
    ) {
      return { input: cost.input, output: cost.output };
    }
  }
  return null;
}

export function blendedUsdPerM(
  cost: { readonly input: number; readonly output: number },
  inputShare = INPUT_SHARE
): number {
  return cost.input * inputShare + cost.output * (1 - inputShare);
}

export function scoreCost(prompt: SurfacePrompt): CostScore {
  const catalog = snapshot as ModelsDevCatalog;
  const activeModelId = MODELS[prompt.activeTier];
  const recommendedModelId = MODELS[prompt.recommendedTier];

  const activeCost = costForModelId(catalog, activeModelId);
  const recommendedCost = costForModelId(catalog, recommendedModelId);
  if (!activeCost || !recommendedCost) {
    throw new Error(
      `eval-prompts: no vendored models.dev price for ${activeModelId} or ${recommendedModelId}`
    );
  }

  const activeBlended = blendedUsdPerM(activeCost);
  const recommendedBlended = blendedUsdPerM(recommendedCost);
  const savingsFraction =
    activeBlended > 0
      ? (activeBlended - recommendedBlended) / activeBlended
      : 0;

  return {
    activeModelId,
    recommendedModelId,
    activeBlendedUsdPerM: round2(activeBlended),
    recommendedBlendedUsdPerM: round2(recommendedBlended),
    savingsFraction: round4(savingsFraction),
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export function scoreAllSurfaces(
  surfaces: readonly ClaudeSurface[] = [...ALL_SURFACES]
): EvalReport {
  const scored = surfaces.map((surface) => {
    const prompt = promptForSurface(surface);
    return {
      surface,
      activeTier: prompt.activeTier,
      recommendedTier: prompt.recommendedTier,
      quality: scoreQuality(prompt),
      cost: scoreCost(prompt),
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    surfaces: scored,
    qualityPassCount: scored.filter((s) => s.quality.pass).length,
    qualityFailCount: scored.filter((s) => !s.quality.pass).length,
  };
}

export function buildReportMarkdown(report: EvalReport): string {
  const lines: string[] = [
    "# Eval:prompts — per-surface cost & quality report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "> HONESTY NOTE: this report is STATIC analysis. No live model inference was",
    "> run to produce it. Cost figures come from the repo's vendored models.dev",
    "> snapshot (same source model-economics uses); quality is a deterministic",
    "> rubric over the harness prompt text. Live parity checking happens in",
    "> promptfooconfig.yaml via `npm run eval:prompts` (requires API keys).",
    "",
    "## Summary",
    "",
    `- Surfaces scored: ${report.surfaces.length}`,
    `- Quality pass: ${report.qualityPassCount}`,
    `- Quality fail: ${report.qualityFailCount}`,
    "",
    "## Per-surface",
    "",
    "| Surface | Active tier | Active model | $/Mtok (act.) | $/Mtok (rec.) | Savings | Quality |",
    "|---|---|---|---|---|---|---|",
  ];

  for (const surface of report.surfaces) {
    const { cost, quality } = surface;
    const savings = formatSavings(cost.savingsFraction);
    lines.push(
      [
        surface.surface,
        surface.activeTier,
        `\`${cost.activeModelId}\``,
        `$${cost.activeBlendedUsdPerM.toFixed(2)}`,
        `$${cost.recommendedBlendedUsdPerM.toFixed(2)}`,
        savings,
        quality.pass ? "PASS" : "FAIL",
      ].join(" | ")
    );
  }

  const failing = report.surfaces.filter((s) => !s.quality.pass);
  if (failing.length > 0) {
    lines.push("", "## Quality failures", "");
    for (const surface of failing) {
      lines.push(`### ${surface.surface}`, "");
      for (const check of surface.quality.checks) {
        if (!check.pass) {
          lines.push(`- ${check.check}: ${check.detail}`);
        }
      }
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

export function reportFileName(generatedAt: string): string {
  const date = generatedAt.slice(0, 10);
  return `eval-prompts-${date}.md`;
}

function formatSavings(fraction: number): string {
  if (fraction === 0) return "—";
  const pct = Math.round(fraction * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
