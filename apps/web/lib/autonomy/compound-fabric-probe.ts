/**
 * Read-only filesystem probe for GSE Wave 14 Compound Fabric + Wave 16 GSI Telemetry.
 *
 * Strictly zero DB writes, zero LLM calls, zero public-gate mutations, and zero
 * external network calls. Safe for pure cron / autonomy-cycle introspection.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface CompoundFabricProbeResult {
  readonly artifactsPresent: boolean;
  readonly ok: boolean;
  readonly idempotent: true;
  readonly compoundFabricAgeMinutes: number | undefined;
  readonly gsiRuleInDoctrineHeld: boolean | undefined;
  readonly routerBitCount: number | null;
  readonly filesSwept: number | null;
  readonly primitivesExtractedTotal: number | null;
  readonly lessonsLedgerCount: number | null;
  readonly manifest877PdfCount: number | null;
  readonly sarEvaluatedCompounds: number | null;
  readonly sarDownsampled: boolean | null;
  readonly gfapDisorderWarningHeld: boolean | null;
  readonly progressionReportsCount: number | null;
  readonly failureReasons: readonly string[];
}

export interface CompoundFabricProbeOptions {
  readonly repoRoot?: string;
  readonly nowMs?: number;
}

const EXPECTED_BIOMARKERS = ["UCHL1", "GFAP", "MMP13"] as const;

function resolveRepoRoot(explicitRoot?: string): string | null {
  if (explicitRoot) return explicitRoot;
  let cur = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(cur, "data", "engine", "foundry_compound_corpus_index_2026.json");
    if (existsSync(candidate)) {
      return cur;
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function countHexSetBits(hexWords: unknown): number {
  if (!Array.isArray(hexWords)) return 0;
  let total = 0;
  for (const word of hexWords) {
    if (typeof word !== "string") continue;
    const cleaned = word.trim().toLowerCase().replace(/^0x/, "");
    if (!/^[0-9a-f]+$/.test(cleaned)) continue;
    for (const ch of cleaned) {
      let nibble = Number.parseInt(ch, 16);
      while (nibble > 0) {
        total += nibble & 1;
        nibble >>= 1;
      }
    }
  }
  return total;
}

interface FoundryIndexJson {
  readonly generated_at_utc?: unknown;
  readonly files_swept?: unknown;
  readonly primitives_extracted_total?: unknown;
  readonly lessons_ledger_count?: unknown;
  readonly manifest_877_pdfs_count?: unknown;
  readonly router_288bit_mask_hex?: unknown;
}

interface BiomarkerJson {
  readonly gene_symbol?: unknown;
  readonly rule_in_only_doctrine?: unknown;
  readonly intrinsically_disordered_warning?: unknown;
}

interface GsiTelemetryJson {
  readonly biomarker_structures?: unknown;
  readonly sar_benchmark?: {
    readonly evaluated_compounds?: unknown;
    readonly total_compounds?: unknown;
    readonly downsampled?: unknown;
    readonly top_attributed_features?: unknown;
  };
  readonly progression_reports?: unknown;
}

export function probeCompoundFabricAndGsiHealth(
  options: CompoundFabricProbeOptions = {},
): CompoundFabricProbeResult {
  const root = resolveRepoRoot(options.repoRoot);
  if (!root) {
    return {
      artifactsPresent: false,
      ok: true,
      idempotent: true,
      compoundFabricAgeMinutes: undefined,
      gsiRuleInDoctrineHeld: undefined,
      routerBitCount: null,
      filesSwept: null,
      primitivesExtractedTotal: null,
      lessonsLedgerCount: null,
      manifest877PdfCount: null,
      sarEvaluatedCompounds: null,
      sarDownsampled: null,
      gfapDisorderWarningHeld: null,
      progressionReportsCount: null,
      failureReasons: [],
    };
  }

  const foundryPath = path.join(root, "data", "engine", "foundry_compound_corpus_index_2026.json");
  const gsiPath = path.join(
    root,
    "data",
    "engine",
    "gsi_wave16_translational_and_datascience_telemetry_2026.json",
  );

  if (!existsSync(foundryPath) || !existsSync(gsiPath)) {
    return {
      artifactsPresent: false,
      ok: true,
      idempotent: true,
      compoundFabricAgeMinutes: undefined,
      gsiRuleInDoctrineHeld: undefined,
      routerBitCount: null,
      filesSwept: null,
      primitivesExtractedTotal: null,
      lessonsLedgerCount: null,
      manifest877PdfCount: null,
      sarEvaluatedCompounds: null,
      sarDownsampled: null,
      gfapDisorderWarningHeld: null,
      progressionReportsCount: null,
      failureReasons: [],
    };
  }

  const failures: string[] = [];
  let foundry: FoundryIndexJson;
  let gsi: GsiTelemetryJson;
  try {
    foundry = JSON.parse(readFileSync(foundryPath, "utf8")) as FoundryIndexJson;
    gsi = JSON.parse(readFileSync(gsiPath, "utf8")) as GsiTelemetryJson;
  } catch (err) {
    return {
      artifactsPresent: true,
      ok: false,
      idempotent: true,
      compoundFabricAgeMinutes: undefined,
      gsiRuleInDoctrineHeld: false,
      routerBitCount: null,
      filesSwept: null,
      primitivesExtractedTotal: null,
      lessonsLedgerCount: null,
      manifest877PdfCount: null,
      sarEvaluatedCompounds: null,
      sarDownsampled: null,
      gfapDisorderWarningHeld: null,
      progressionReportsCount: null,
      failureReasons: [`json_parse_error:${err instanceof Error ? err.message : String(err)}`],
    };
  }

  const nowMs = options.nowMs ?? Date.now();
  const generatedRaw = typeof foundry.generated_at_utc === "string" ? foundry.generated_at_utc : "";
  const generatedMs = generatedRaw ? Date.parse(generatedRaw) : Number.NaN;
  const ageMinutes = Number.isFinite(generatedMs)
    ? Math.max(0, Math.round((nowMs - generatedMs) / 60000))
    : undefined;
  if (ageMinutes === undefined) {
    failures.push("foundry_generated_at_utc_missing_or_invalid");
  }

  const filesSwept = typeof foundry.files_swept === "number" ? foundry.files_swept : 0;
  const primitivesTotal =
    typeof foundry.primitives_extracted_total === "number"
      ? foundry.primitives_extracted_total
      : 0;
  const lessonsCount =
    typeof foundry.lessons_ledger_count === "number" ? foundry.lessons_ledger_count : 0;
  const manifestCount =
    typeof foundry.manifest_877_pdfs_count === "number" ? foundry.manifest_877_pdfs_count : 0;
  const routerBits = countHexSetBits(foundry.router_288bit_mask_hex);

  if (filesSwept < 12469) failures.push(`files_swept_below_floor:${filesSwept}`);
  if (primitivesTotal < 47000) failures.push(`primitives_below_floor:${primitivesTotal}`);
  if (manifestCount !== 877) failures.push(`manifest_count_mismatch:${manifestCount}`);
  if (lessonsCount < 32) failures.push(`lessons_ledger_count_below_32:${lessonsCount}`);
  if (routerBits !== 276) failures.push(`router_288bit_popcount_mismatch:${routerBits}`);

  const biomarkers = Array.isArray(gsi.biomarker_structures)
    ? (gsi.biomarker_structures as readonly BiomarkerJson[])
    : [];
  const symbols = new Set(
    biomarkers
      .map((b) => (typeof b.gene_symbol === "string" ? b.gene_symbol.toUpperCase() : ""))
      .filter(Boolean),
  );
  const allExpectedPresent = EXPECTED_BIOMARKERS.every((sym) => symbols.has(sym));
  const allRuleInHeld =
    biomarkers.length >= EXPECTED_BIOMARKERS.length &&
    allExpectedPresent &&
    biomarkers.every((b) => b.rule_in_only_doctrine === true);

  const gfapEntry = biomarkers.find(
    (b) => typeof b.gene_symbol === "string" && b.gene_symbol.toUpperCase() === "GFAP",
  );
  const gfapDisorderHeld = gfapEntry?.intrinsically_disordered_warning === true;

  if (!allRuleInHeld) failures.push("adr0003_rule_in_only_doctrine_violated");
  if (!gfapDisorderHeld) failures.push("gfap_intrinsic_disorder_warning_missing");

  const sar = gsi.sar_benchmark ?? {};
  const sarEvaluated =
    typeof sar.evaluated_compounds === "number" ? sar.evaluated_compounds : 0;
  const sarTotal = typeof sar.total_compounds === "number" ? sar.total_compounds : 0;
  const sarDownsampled = sar.downsampled === true;
  const topFeatures = Array.isArray(sar.top_attributed_features)
    ? sar.top_attributed_features
    : [];

  if (sarEvaluated !== 81 || sarTotal !== 81) {
    failures.push(`sar_compounds_mismatch:${sarEvaluated}/${sarTotal}`);
  }
  if (sarDownsampled) failures.push("sar_downsampled_violation");
  if (topFeatures.length < 1) failures.push("sar_top_attributed_features_empty");

  const progCount = Array.isArray(gsi.progression_reports)
    ? gsi.progression_reports.length
    : 0;
  if (progCount < 1) failures.push("progression_reports_empty");

  return {
    artifactsPresent: true,
    ok: failures.length === 0,
    idempotent: true,
    compoundFabricAgeMinutes: ageMinutes,
    gsiRuleInDoctrineHeld: allRuleInHeld,
    routerBitCount: routerBits,
    filesSwept,
    primitivesExtractedTotal: primitivesTotal,
    lessonsLedgerCount: lessonsCount,
    manifest877PdfCount: manifestCount,
    sarEvaluatedCompounds: sarEvaluated,
    sarDownsampled,
    gfapDisorderWarningHeld: gfapDisorderHeld,
    progressionReportsCount: progCount,
    failureReasons: failures,
  };
}
