/**
 * Airwave Intelligence Intake — Claim Candidate Batch Validator.
 *
 * Accepts a JSON array or CSV of ClaimCandidate-shaped objects, runs each
 * through the extraction contract, and reports validation status, review-gate
 * counts, and GSE/GSN readiness — all without writing to a database,
 * capturing audio, or publishing anything.
 *
 * ENV (optional):
 *   AIRWAVE_CLAIM_BATCH_FILE — local path to a JSON or CSV file to validate.
 */

import {
  validateClaimCandidate,
  redactClaimCandidateForPublic,
  isClaimCandidateGseRelevant,
  isClaimCandidateGsnRelevant,
  type ClaimCandidate,
  type ClaimCandidateOperatorStatus,
  type PublicClaimCandidate,
} from "./claim-extraction-contract";
import { parseAirwaveDelimitedTable } from "./intake-readiness";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ClaimBatchRow = {
  readonly rowIndex: number;
  readonly id: string;
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly operatorStatus: ClaimCandidateOperatorStatus | "UNKNOWN";
  readonly gseRelevant: boolean;
  readonly gsnRelevant: boolean;
  readonly publicSafe: boolean;
  readonly publicProjection: PublicClaimCandidate | null;
};

export type ClaimBatchSummary = {
  readonly generatedAt: string;
  readonly source: "json" | "csv" | "inline";
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
  readonly byStatus: {
    readonly DRAFT: number;
    readonly REVIEW: number;
    readonly APPROVED: number;
    readonly REJECTED: number;
    readonly SETTLED: number;
    readonly UNKNOWN: number;
  };
  readonly gseReadyRows: number;
  readonly gsnReadyRows: number;
  readonly publicSafeRows: number;
  readonly rows: readonly ClaimBatchRow[];
  readonly policy: {
    readonly validatesOnly: true;
    readonly writesDatabase: false;
    readonly capturesAudio: false;
    readonly publishesOutput: false;
    readonly sourcePointerPrivateNeverLeaks: true;
  };
};

// ─── CSV → ClaimCandidate mapping ─────────────────────────────────────────────

function rowToClaim(row: Record<string, string>): Partial<ClaimCandidate> {
  const bool = (v: string | undefined): boolean =>
    (v ?? "").trim().toLowerCase() === "true";

  return {
    id: row["id"]?.trim(),
    aired_at_ct: row["aired_at_ct"]?.trim(),
    channel: row["channel"]?.trim(),
    source_policy_id: row["source_policy_id"]?.trim(),
    show: row["show"]?.trim(),
    segment: row["segment"]?.trim() ?? "",
    speaker: row["speaker"]?.trim(),
    paraphrased_claim: row["paraphrased_claim"]?.trim(),
    sport: row["sport"]?.trim(),
    league: row["league"]?.trim() ?? "",
    entity: row["entity"]?.trim(),
    entity_type: (row["entity_type"]?.trim() as ClaimCandidate["entity_type"]) || undefined,
    claim_type: (row["claim_type"]?.trim() as ClaimCandidate["claim_type"]) || undefined,
    confidence_language:
      (row["confidence_language"]?.trim() as ClaimCandidate["confidence_language"]) || "UNKNOWN",
    actionability:
      (row["actionability"]?.trim() as ClaimCandidate["actionability"]) || "NONE",
    evidence_type:
      (row["evidence_type"]?.trim() as ClaimCandidate["evidence_type"]) || undefined,
    rights_status:
      (row["rights_status"]?.trim() as ClaimCandidate["rights_status"]) || undefined,
    operator_status:
      (row["operator_status"]?.trim() as ClaimCandidateOperatorStatus) || undefined,
    source_pointer_private: row["source_pointer_private"]?.trim() ?? "",
    public_safe: bool(row["public_safe"]),
    review_notes: row["review_notes"]?.trim() ?? "",
  };
}

// ─── Core validator ───────────────────────────────────────────────────────────

function validateBatch(
  claims: readonly Partial<ClaimCandidate>[],
  source: "json" | "csv" | "inline",
  now: Date,
): ClaimBatchSummary {
  const rows: ClaimBatchRow[] = [];
  const statusCounts = {
    DRAFT: 0,
    REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
    SETTLED: 0,
    UNKNOWN: 0,
  };

  for (let i = 0; i < claims.length; i += 1) {
    const candidate = claims[i]!;
    const result = validateClaimCandidate(candidate);
    const id = candidate.id ?? `(row-${i + 1})`;
    const operatorStatus = candidate.operator_status ?? "UNKNOWN";
    const statusKey = operatorStatus in statusCounts
      ? (operatorStatus as keyof typeof statusCounts)
      : "UNKNOWN";
    statusCounts[statusKey] += 1;

    let gseRelevant = false;
    let gsnRelevant = false;
    let publicProjection: PublicClaimCandidate | null = null;

    if (result.valid && candidate.claim_type) {
      const full = candidate as ClaimCandidate;
      gseRelevant = isClaimCandidateGseRelevant(full);
      gsnRelevant = isClaimCandidateGsnRelevant(full);
      publicProjection = redactClaimCandidateForPublic(full);
    }

    rows.push({
      rowIndex: i + 1,
      id,
      valid: result.valid,
      errors: result.errors,
      operatorStatus: statusKey,
      gseRelevant,
      gsnRelevant,
      publicSafe: candidate.public_safe === true,
      publicProjection,
    });
  }

  const validRows = rows.filter((r) => r.valid).length;
  return {
    generatedAt: now.toISOString(),
    source,
    totalRows: claims.length,
    validRows,
    invalidRows: claims.length - validRows,
    byStatus: statusCounts,
    gseReadyRows: rows.filter((r) => r.gseRelevant).length,
    gsnReadyRows: rows.filter((r) => r.gsnRelevant).length,
    publicSafeRows: rows.filter((r) => r.publicSafe && r.valid).length,
    rows,
    policy: {
      validatesOnly: true,
      writesDatabase: false,
      capturesAudio: false,
      publishesOutput: false,
      sourcePointerPrivateNeverLeaks: true,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a JSON array of claim-shaped objects (inline or pre-parsed).
 * This is a pure function with no side effects.
 */
export function validateClaimBatchJson(
  claims: readonly unknown[],
  now = new Date(),
): ClaimBatchSummary {
  const candidates = claims.map((c) =>
    typeof c === "object" && c !== null ? (c as Partial<ClaimCandidate>) : {},
  );
  return validateBatch(candidates, "json", now);
}

/**
 * Validate a raw CSV/TSV string of claim candidates.
 * Columns map to ClaimCandidate field names (snake_case).
 * This is a pure function with no side effects.
 */
export function validateClaimBatchCsv(rawCsv: string, now = new Date()): ClaimBatchSummary {
  const parsed = parseAirwaveDelimitedTable(rawCsv);
  const candidates = parsed.rows.map(rowToClaim);
  return validateBatch(candidates, "csv", now);
}

/**
 * Read and validate a JSON or CSV file from a local path (async, Node.js only).
 */
export async function validateClaimBatchFromFile(
  filePath: string,
  now = new Date(),
): Promise<ClaimBatchSummary & { readonly fileStatus: "ok" | "unreadable" | "parse-error" }> {
  let raw: string;
  try {
    const { readFile } = await import("node:fs/promises");
    raw = await readFile(filePath, "utf8");
  } catch {
    return {
      ...validateBatch([], "json", now),
      source: "json",
      totalRows: 0,
      fileStatus: "unreadable",
    };
  }

  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "csv" || ext === "tsv") {
    return { ...validateClaimBatchCsv(raw, now), fileStatus: "ok" };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    return { ...validateClaimBatchJson(arr, now), fileStatus: "ok" };
  } catch {
    return {
      ...validateBatch([], "json", now),
      source: "json",
      totalRows: 0,
      fileStatus: "parse-error",
    };
  }
}

/**
 * Read and validate claims from the path in AIRWAVE_CLAIM_BATCH_FILE.
 * Returns undefined if the env var is not set.
 */
export async function validateClaimBatchFromEnv(
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<
  (ClaimBatchSummary & { readonly fileStatus: "ok" | "unreadable" | "parse-error" }) | undefined
> {
  const path = env["AIRWAVE_CLAIM_BATCH_FILE"]?.trim();
  if (!path) return undefined;
  return validateClaimBatchFromFile(path, now);
}
