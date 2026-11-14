/**
 * one_mind_agent_bus_daemon.ts — Unified Two-Way Agent-Bus & `mind_guardian` Daemon
 * Commercial Entity: Galaxy Sports Network LLC, DBA Galaxy Sports Edge (https://www.galaxysportsedge.com)
 * Repositories: Beexly/agent-bus <-> Beexly/Sports (`brain/mind.jsonl`)
 *
 * Implements the `strictNullChecks` / `noUncheckedIndexedAccess`-safe TypeScript daemon counterpart
 * to `gse_one_mind_autonomous_os.py` with bit-for-bit SHA-256 canonical JSON parity:
 * 1. Content-Addressed SHA-256 Single-Writer Ledger (`MindGuardianDaemon` protocol) over `brain/mind.jsonl`.
 * 2. Warm-Start Agent Context Hydration (eliminating cold-start agent amnesia across Motif, Hermes/OpenCode,
 *    Jules, Mimo, OpenDots, and Antigravity) + deterministic `efficient-claude` model-tier routing.
 * 3. Bidirectional `inbox/from-*` -> atomic lock claiming -> Paired Adversarial Audit Gate +
 *    6-Stage Claim-Matrix Provenance + `00-TRUTH-FILE` compliance -> `outbox/receipts-*` receipts +
 *    `brain/mind.jsonl` write-back.
 * 4. Canonical `516325` OpenTelemetry / Sentry / PostHog Wide-Event emission, SLO burn-rate circuit breaker,
 *    and Neon Serverless Postgres `02:30-06:30 CST` autosuspend zero-cron sleep-window guard.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================================
// 0. Canonical Constants (`00-TRUTH-FILE` & Sealed Invariants)
// ============================================================================

export const LEGAL_ENTITY_NAME = "Galaxy Sports Network LLC";
export const PUBLIC_CALIBRATION_LEDGER_URL = "https://galaxysportsedge.com/calibration";
export const PUBLIC_LEDGER_ATTESTATION =
  "Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration";

export const CANONICAL_SEALED_HASH_FIXTURE =
  "85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8";
export const SEALED_TAU = 0.42;
export const QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947;
export const PROB_PER_POINT = 0.033;
export const CANONICAL_RECORD = "62-23-1";
export const CANONICAL_NET_UNITS = 26.5;
export const NUM_MCP_DOMAINS = 31;
export const WIDE_EVENT_SCHEMA_CODE = "516325";
export const WIDE_EVENT_SCHEMA_ID = "gse.wide_event.516325";

export const MAX_C_HAT = 12.42;
export const MAX_ABS_DELTA_LOG_ODDS = 0.35;
export const MIN_E_VALUE = 1.35;
export const MAX_CRPS = 7.099;

const NEON_SLEEP_START_MINUTES_CST = 2 * 60 + 30; // 02:30 CST
const NEON_SLEEP_END_MINUTES_CST = 6 * 60 + 30;   // 06:30 CST
const STALE_CLAIM_TTL_SECONDS = 4 * 3600;

const AUTONOMOUS_ALLOWED_VERBS = new Set([
  "find",
  "draft",
  "monitor",
  "rank",
  "package",
  "report",
]);
const FOUNDER_APPROVAL_REQUIRED_VERBS = new Set([
  "send",
  "submit",
  "post",
  "pay",
  "deploy",
]);

const FORBIDDEN_JARGON_REGEX =
  /\b(22,750,000 snap evaluations|1,750,000 snaps|10-Layer Autonomous Engine|Romano CQR|Optimal Transport|Sinkhorn-Knopp|tau_hat|ACI-CRC|James-Stein|31-11 banner is retracted|buildContextMask|stageC|stageD|guaranteed lock|risk-free|easy money|free money|cannot lose|sure thing|verified track record)\b/i;

const PERCENT_CONFIDENCE_HEADLINE_REGEX =
  /\b\d+(?:\.\d+)?%\s*(?:confidence|win\s*rate|hit\s*rate)\b/i;

const INTEGER_CONFIDENCE_BADGE_REGEX = /^(\d{1,3})\/100$/;

const ENCODING_CORRUPTION_REGEX = /\uFFFD|\s\?\s|[\x80-\x9F]/;

const SECRET_LEAK_REGEX =
  /(sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z\-_]{20,}|postgres(?:ql)?:\/\/[^\s"']+|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;

// ============================================================================
// 1. Fail-Closed Doctrine Errors (`honest-refusal`, `paired-audit`, etc.)
// ============================================================================

export class DataGapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataGapError";
  }
}

export class SecondWriterForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SecondWriterForbiddenError";
  }
}

export class NoOverwriteViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoOverwriteViolationError";
  }
}

export class PairedAuditError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PairedAuditError";
  }
}

export class ClaimMatrixIncompleteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimMatrixIncompleteError";
  }
}

export class InductiveGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InductiveGateError";
  }
}

export class NeonSleepWindowViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NeonSleepWindowViolationError";
  }
}

export class SloCircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SloCircuitOpenError";
  }
}

// ============================================================================
// 2. `TS2532`-Impossible Safe Indexing, Canonical JSON & `00-TRUTH-FILE` Guards
// ============================================================================

export function atOrThrow<T>(arr: readonly T[], index: number, context: string): T {
  if (index < 0 || index >= arr.length) {
    throw new DataGapError(`Bounds violation in ${context}: index=${index}, length=${arr.length}`);
  }
  const item = arr[index];
  if (item === undefined) {
    throw new DataGapError(`Undefined element in ${context} at index=${index}`);
  }
  return item;
}

export function normalizeCanonicalValue(val: unknown): unknown {
  if (val === null || val === undefined) {
    if (val === undefined) {
      throw new DataGapError("Undefined field encountered in canonical JSON normalization.");
    }
    return null;
  }
  if (typeof val === "number") {
    if (!Number.isFinite(val)) {
      throw new DataGapError(`Non-finite numeric value encountered: ${String(val)}`);
    }
    const rounded = Number(val.toFixed(12));
    if (Object.is(rounded, -0) || rounded === 0) {
      return 0;
    }
    if (Number.isInteger(rounded) && Math.abs(rounded) < 1e15) {
      return Math.trunc(rounded);
    }
    return rounded;
  }
  if (Array.isArray(val)) {
    return val.map((item) => normalizeCanonicalValue(item));
  }
  if (typeof val === "object") {
    const record = val as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (let i = 0; i < sortedKeys.length; i++) {
      const k = atOrThrow(sortedKeys, i, "normalizeCanonicalValue.sortedKeys");
      out[k] = normalizeCanonicalValue(record[k]);
    }
    return out;
  }
  return val;
}

export function canonicalJson(val: unknown): string {
  return JSON.stringify(normalizeCanonicalValue(val));
}

export function sha256Hex(input: string | Buffer): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function assertZeroSecretLeaks(serialized: string): void {
  const match = SECRET_LEAK_REGEX.exec(serialized);
  if (match) {
    const snippet = atOrThrow(match, 0, "SECRET_LEAK_REGEX").slice(0, 12);
    throw new InductiveGateError(`Blocked secret/credential leak in payload: ${snippet}...`);
  }
}

export function validateConfidenceBadge00Truth(badge: string): number {
  const match = INTEGER_CONFIDENCE_BADGE_REGEX.exec(badge.trim());
  if (!match) {
    throw new InductiveGateError(
      `00-TRUTH-FILE violation: confidence badge '${badge}' must use integer 'XX/100' format.`
    );
  }
  const val = Number(atOrThrow(match, 1, "INTEGER_CONFIDENCE_BADGE_REGEX"));
  if (val < 0 || val > 100) {
    throw new InductiveGateError(`00-TRUTH-FILE violation: badge score ${val} outside [0, 100].`);
  }
  return val;
}

export function sanitizePublicCopyUtf8(copyText: string): string {
  const cleaned = copyText.replace(/\s+\?\s+/g, " \u2014 ").normalize("NFC");
  if (ENCODING_CORRUPTION_REGEX.test(cleaned)) {
    throw new InductiveGateError(`UTF-8 / CP1252 '?' encoding corruption detected: ${cleaned}`);
  }
  if (FORBIDDEN_JARGON_REGEX.test(cleaned)) {
    throw new InductiveGateError(`Forbidden internal math jargon or casino phrasing detected: ${cleaned}`);
  }
  if (PERCENT_CONFIDENCE_HEADLINE_REGEX.test(cleaned)) {
    throw new InductiveGateError(`00-TRUTH-FILE violation: '%' confidence/win-rate headline forbidden: ${cleaned}`);
  }
  return cleaned;
}

export function enforceAutonomousBoundary(
  verb: string,
  founderApproved = false
): "EXECUTED_AUTONOMOUSLY" | "EXECUTED_WITH_FOUNDER_APPROVAL" | "QUEUED_FOR_FOUNDER_APPROVAL" {
  const normalized = verb.trim().toLowerCase();
  if (AUTONOMOUS_ALLOWED_VERBS.has(normalized)) {
    return "EXECUTED_AUTONOMOUSLY";
  }
  if (FOUNDER_APPROVAL_REQUIRED_VERBS.has(normalized)) {
    return founderApproved ? "EXECUTED_WITH_FOUNDER_APPROVAL" : "QUEUED_FOR_FOUNDER_APPROVAL";
  }
  throw new InductiveGateError(`Unclassified operational action verb: '${verb}'`);
}

// ============================================================================
// 3. Interfaces & Schemas
// ============================================================================

export type ModelTierRoute =
  | "claude-opus-5.5/medium"
  | "claude-sonnet-5.5/medium"
  | "claude-haiku-4.5/low";

export interface ClaimMatrixInput {
  research_id: string;
  verbatim_quote_span: [number, number];
  equation_id: string;
  bitmask_288_hex: string;
  code_path: string;
  code_sha256: string;
  test_target: string;
  test_passed: boolean;
  real_data_manifest_uri: string;
  real_data_sha256: string;
  real_data_rows: number;
  is_synthetic_fixture: boolean;
  source_tier: 1 | 2 | 3 | 4 | 5 | 6;
  receipt_sha256?: string;
}

export interface IndependentAuditInput {
  agent_id: string;
  model_family: string;
  quality_score: number;
  directional_prob: number;
  sealed_hash_observed: string;
  prm_step_indicators: number[];
  noisy_verifier_reward: 0 | 1;
  false_positive_rate_rho0: number;
  false_negative_rate_rho1: number;
  diff_sha256: string;
  lexical_clean: boolean;
  allows_execution_verification?: boolean;
}

export interface PairedAuditVerdict {
  auditor_a_id: string;
  auditor_b_id: string;
  backward_corrected_reward_a: number;
  backward_corrected_reward_b: number;
  bellman_q_product: number;
  model_family_a: string;
  model_family_b: string;
  prob_divergence: number;
  receipt_sha256: string;
  reconciled_prob: number;
  sealed_hash: string;
  status: "VERIFIED";
  target_id: string;
}

export interface MindJsonlRecord {
  claim_matrix_sha256: string;
  conditions_on: {
    qb_questionable_epa: number;
    tau: number;
    version: string;
  };
  content_sha256: string;
  domain_slug: string;
  entry_id: string;
  entry_sha256: string;
  kind: string;
  paired_audit_receipt_sha256: string;
  payload: Record<string, unknown>;
  prev_entry_sha256: string;
  schema_version: string;
  sealed_hash: string;
  transaction_time_iso: string;
  valid_time_iso: string;
  writer_role: "mind_guardian";
}

export interface AgentWarmStartPacket {
  active_lessons: string[];
  active_sealed_hash: string;
  agent_id: string;
  conditions_on: {
    qb_questionable_epa: number;
    tau: number;
    version: string;
  };
  domain_weights_log_odds: number[];
  mind_entry_count: number;
  mind_head_sha256: string;
  recent_verified_receipts: string[];
  routed_model_tier: ModelTierRoute;
}

export interface InboxTaskEnvelope {
  created_at_iso: string;
  has_complete_spec: boolean;
  is_mechanical_scan: boolean;
  origin_agent: string;
  payload: Record<string, unknown>;
  requires_judgment: boolean;
  task_id: string;
}

// ============================================================================
// 4. Six-Stage Claim-Matrix & Paired Adversarial Audit Verifiers
// ============================================================================

export function validateClaimMatrix(
  matrix: ClaimMatrixInput,
  requireReceipt = false
): string {
  if (
    !matrix.research_id ||
    (!matrix.research_id.startsWith("arXiv:") && !matrix.research_id.startsWith("DOI:"))
  ) {
    throw new ClaimMatrixIncompleteError(`Invalid Link 1 (research): ${matrix.research_id}`);
  }
  const [start, end] = matrix.verbatim_quote_span;
  if (start < 0 || end <= start) {
    throw new ClaimMatrixIncompleteError(`Invalid verbatim_quote_span: [${start}, ${end}]`);
  }
  if (!matrix.equation_id || matrix.bitmask_288_hex.length !== 72) {
    throw new ClaimMatrixIncompleteError("Link 2 (equation) requires equation_id and 72-hex 288-bit mask.");
  }
  if (!matrix.code_path || matrix.code_sha256.length !== 64) {
    throw new ClaimMatrixIncompleteError("Link 3 (code) requires code_path and 64-hex SHA-256.");
  }
  if (!matrix.test_target || !matrix.test_passed) {
    throw new ClaimMatrixIncompleteError("Link 4 (test) requires passing deterministic test target.");
  }
  if (
    !matrix.real_data_manifest_uri ||
    matrix.real_data_sha256.length !== 64 ||
    matrix.real_data_rows <= 0 ||
    matrix.is_synthetic_fixture
  ) {
    throw new ClaimMatrixIncompleteError(
      "Link 5 (real_data_manifest) rejects synthetic fixtures and requires 64-hex manifest SHA-256."
    );
  }
  if (matrix.source_tier >= 5) {
    throw new ClaimMatrixIncompleteError(
      `Source Tier ${matrix.source_tier} rejected (Tiers 5-6 community/AI chatter cannot ground claims).`
    );
  }
  if (requireReceipt && (!matrix.receipt_sha256 || matrix.receipt_sha256.length !== 64)) {
    throw new ClaimMatrixIncompleteError("Link 6 (receipt) missing 64-hex receipt digest.");
  }

  return sha256Hex(
    canonicalJson({
      bitmask_288_hex: matrix.bitmask_288_hex,
      code_path: matrix.code_path,
      code_sha256: matrix.code_sha256,
      equation_id: matrix.equation_id,
      real_data_manifest_uri: matrix.real_data_manifest_uri,
      real_data_rows: matrix.real_data_rows,
      real_data_sha256: matrix.real_data_sha256,
      research_id: matrix.research_id,
      source_tier: matrix.source_tier,
      test_passed: matrix.test_passed,
      test_target: matrix.test_target,
      verbatim_quote_span: [start, end],
    })
  );
}

export function runPairedAdversarialAudit(
  targetId: string,
  auditA: IndependentAuditInput,
  auditB: IndependentAuditInput,
  expectedSealedHash: string,
  minQualityBar = 9.2,
  maxProbDivergence = 0.015
): PairedAuditVerdict {
  if (auditA.agent_id === auditB.agent_id) {
    throw new PairedAuditError(`Self-audit rejected: identical agent_id '${auditA.agent_id}'`);
  }
  if (auditA.model_family.toLowerCase() === auditB.model_family.toLowerCase()) {
    throw new PairedAuditError(`Same-family audit rejected: '${auditA.model_family}'`);
  }

  const pair: readonly IndependentAuditInput[] = [auditA, auditB];
  for (let idx = 0; idx < pair.length; idx++) {
    const sub = atOrThrow(pair, idx, "runPairedAdversarialAudit.pair");
    const canExec = sub.allows_execution_verification ?? true;
    if (sub.model_family.toLowerCase().includes("deepseek") || !canExec) {
      throw new PairedAuditError(
        `Theorist-only model (${sub.agent_id} / ${sub.model_family}) cannot sign execution verification.`
      );
    }
    if (sub.quality_score < minQualityBar) {
      throw new PairedAuditError(`Quality score ${sub.quality_score} below ${minQualityBar} bar on ${sub.agent_id}`);
    }
    if (!sub.lexical_clean) {
      throw new PairedAuditError(`Lexical/encoding firewall failed on ${sub.agent_id}`);
    }
    if (sub.sealed_hash_observed !== expectedSealedHash) {
      throw new InductiveGateError(
        `Sealed hash mismatch on ${sub.agent_id}: ${sub.sealed_hash_observed} !== ${expectedSealedHash}`
      );
    }
    if (!Number.isFinite(sub.directional_prob) || sub.directional_prob <= 0 || sub.directional_prob >= 1) {
      throw new DataGapError(`Invalid directional_prob ${sub.directional_prob} on ${sub.agent_id}`);
    }
    const uninformativeMidpoint = 1 / 2;
    if (Math.abs(sub.directional_prob - uninformativeMidpoint) < 1e-12) {
      throw new DataGapError(`Honest-refusal gate blocked uninformative midpoint fallback on ${sub.agent_id}`);
    }
    if (sub.diff_sha256.length !== 64) {
      throw new PairedAuditError(`Missing 64-hex diff_sha256 on ${sub.agent_id}`);
    }
    if (sub.prm_step_indicators.length === 0) {
      throw new PairedAuditError(`Empty PRM trace on ${sub.agent_id}`);
    }
  }

  const computeBellmanQ = (steps: readonly number[]): number => {
    let prod = 1;
    for (let i = 0; i < steps.length; i++) {
      const stepVal = atOrThrow(steps, i, "computeBellmanQ.steps");
      if (stepVal !== 0 && stepVal !== 1) {
        throw new PairedAuditError(`Non-binary PRM indicator: ${stepVal}`);
      }
      prod *= stepVal;
    }
    return prod;
  };

  const computeBackwardReward = (rTilde: 0 | 1, rho0: number, rho1: number): number => {
    const denom = 1 - rho0 - rho1;
    if (denom <= 0) {
      throw new PairedAuditError(`Uninformative verifier channel (1 - rho0 - rho1 = ${denom} <= 0).`);
    }
    return (rTilde - rho0) / denom;
  };

  const qA = computeBellmanQ(auditA.prm_step_indicators);
  const qB = computeBellmanQ(auditB.prm_step_indicators);
  if (qA !== 1 || qB !== 1) {
    throw new PairedAuditError(`Bellman PRM Q-decay failed (qA=${qA}, qB=${qB}).`);
  }

  const rBackA = computeBackwardReward(
    auditA.noisy_verifier_reward,
    auditA.false_positive_rate_rho0,
    auditA.false_negative_rate_rho1
  );
  const rBackB = computeBackwardReward(
    auditB.noisy_verifier_reward,
    auditB.false_positive_rate_rho0,
    auditB.false_negative_rate_rho1
  );
  const minSurrogateReward = 1 / 2;
  if (rBackA <= minSurrogateReward || rBackB <= minSurrogateReward) {
    throw new PairedAuditError(`Backward-corrected verifier reward too low (${rBackA}, ${rBackB}).`);
  }

  if (auditA.diff_sha256 !== auditB.diff_sha256) {
    throw new PairedAuditError("Auditors inspected mismatched diff SHA-256 digests.");
  }

  const probDivergence = Number(Math.abs(auditA.directional_prob - auditB.directional_prob).toFixed(6));
  if (probDivergence > maxProbDivergence) {
    throw new PairedAuditError(`Probability divergence ${probDivergence} > ${maxProbDivergence}`);
  }

  const reconciledProb = Number(((auditA.directional_prob + auditB.directional_prob) / 2).toFixed(6));
  const draft = {
    auditor_a_id: auditA.agent_id,
    auditor_b_id: auditB.agent_id,
    backward_corrected_reward_a: Number(rBackA.toFixed(6)),
    backward_corrected_reward_b: Number(rBackB.toFixed(6)),
    bellman_q_product: 1,
    diff_sha256: auditA.diff_sha256,
    model_family_a: auditA.model_family,
    model_family_b: auditB.model_family,
    prob_divergence: probDivergence,
    reconciled_prob: reconciledProb,
    sealed_hash: expectedSealedHash,
    status: "VERIFIED" as const,
    target_id: targetId,
  };
  const receiptSha256 = sha256Hex(canonicalJson(draft));
  return {
    auditor_a_id: draft.auditor_a_id,
    auditor_b_id: draft.auditor_b_id,
    backward_corrected_reward_a: draft.backward_corrected_reward_a,
    backward_corrected_reward_b: draft.backward_corrected_reward_b,
    bellman_q_product: draft.bellman_q_product,
    model_family_a: draft.model_family_a,
    model_family_b: draft.model_family_b,
    prob_divergence: draft.prob_divergence,
    receipt_sha256: receiptSha256,
    reconciled_prob: draft.reconciled_prob,
    sealed_hash: draft.sealed_hash,
    status: "VERIFIED",
    target_id: draft.target_id,
  };
}

// ============================================================================
// 5. Single-Writer `MindGuardianDaemon` (`brain/mind.jsonl`)
// ============================================================================

export class MindGuardianDaemon {
  public static readonly GUARDIAN_TOKEN = "MIND_GUARDIAN_SINGLE_WRITER_V1";
  private readonly mindPath: string;
  private readonly lockPath: string;

  constructor(mindJsonlPath: string) {
    this.mindPath = mindJsonlPath;
    const parent = path.dirname(mindJsonlPath);
    fs.mkdirSync(parent, { recursive: true });
    this.lockPath = path.join(parent, ".mind_guardian.lock");
  }

  public readAll(): MindJsonlRecord[] {
    if (!fs.existsSync(this.mindPath)) {
      return [];
    }
    const raw = fs.readFileSync(this.mindPath, "utf8");
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as MindJsonlRecord);
  }

  public verifyChain(): { headSha256: string; count: number } {
    const entries = this.readAll();
    let prevSha = "0".repeat(64);
    const seenIds = new Set<string>();
    const seenContent = new Set<string>();

    for (let idx = 0; idx < entries.length; idx++) {
      const entry = atOrThrow(entries, idx, "MindGuardianDaemon.verifyChain");
      if (seenIds.has(entry.entry_id)) {
        throw new NoOverwriteViolationError(`Duplicate entry_id at index ${idx}: ${entry.entry_id}`);
      }
      seenIds.add(entry.entry_id);

      if (entry.prev_entry_sha256 !== prevSha) {
        throw new InductiveGateError(
          `Broken mind.jsonl hash chain at index ${idx}: expected ${prevSha}, got ${entry.prev_entry_sha256}`
        );
      }

      const expectedContentSha = sha256Hex(canonicalJson(entry.payload));
      if (entry.content_sha256 !== expectedContentSha) {
        throw new InductiveGateError(
          `Content SHA-256 mismatch at index ${idx}: expected ${expectedContentSha}, got ${entry.content_sha256}`
        );
      }
      if (seenContent.has(expectedContentSha)) {
        throw new NoOverwriteViolationError(`Duplicate content_sha256 at index ${idx}`);
      }
      seenContent.add(expectedContentSha);

      const { entry_sha256: observedSha, ...draftWithoutSha } = entry;
      const expectedEntrySha = sha256Hex(canonicalJson(draftWithoutSha));
      if (observedSha !== expectedEntrySha) {
        throw new InductiveGateError(
          `Entry SHA-256 mismatch at index ${idx}: expected ${expectedEntrySha}, got ${observedSha}`
        );
      }
      prevSha = observedSha;
    }

    return { count: entries.length, headSha256: prevSha };
  }

  public appendEntry(params: {
    claimMatrixSha256: string;
    domainSlug: string;
    entryId: string;
    guardianToken: string;
    kind: string;
    pairedAuditReceiptSha256: string;
    payload: Record<string, unknown>;
    sealedHash: string;
    transactionTimeIso: string;
    validTimeIso: string;
    writerRole: string;
  }): MindJsonlRecord {
    if (
      params.writerRole !== "mind_guardian" ||
      params.guardianToken !== MindGuardianDaemon.GUARDIAN_TOKEN
    ) {
      throw new SecondWriterForbiddenError(
        `Unauthorized writer '${params.writerRole}': second writers to mind.jsonl are strictly forbidden.`
      );
    }

    const normalizedPayload = normalizeCanonicalValue(params.payload) as Record<string, unknown>;
    const serializedPayload = canonicalJson(normalizedPayload);
    assertZeroSecretLeaks(serializedPayload);
    const contentSha256 = sha256Hex(serializedPayload);

    let lockFd: number | null = null;
    try {
      lockFd = fs.openSync(this.lockPath, "wx", 0o600);
      fs.writeSync(lockFd, `${process.pid}:${params.transactionTimeIso}`);
    } catch {
      throw new SecondWriterForbiddenError("Concurrent mind.jsonl writer lock active.");
    }

    try {
      const { headSha256 } = this.verifyChain();
      const existing = this.readAll();
      for (let i = 0; i < existing.length; i++) {
        const row = atOrThrow(existing, i, "MindGuardianDaemon.appendEntry.existing");
        if (row.entry_id === params.entryId) {
          throw new NoOverwriteViolationError(`Duplicate entry_id ${params.entryId}`);
        }
        if (row.content_sha256 === contentSha256) {
          throw new NoOverwriteViolationError(`Duplicate content_sha256 ${contentSha256}`);
        }
      }

      const draft = {
        claim_matrix_sha256: params.claimMatrixSha256,
        conditions_on: {
          qb_questionable_epa: QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
          tau: SEALED_TAU,
          version: "v1.0",
        },
        content_sha256: contentSha256,
        domain_slug: params.domainSlug,
        entry_id: params.entryId,
        kind: params.kind,
        paired_audit_receipt_sha256: params.pairedAuditReceiptSha256,
        payload: normalizedPayload,
        prev_entry_sha256: headSha256,
        schema_version: "gse-one-mind-ledger-v1.0",
        sealed_hash: params.sealedHash,
        transaction_time_iso: params.transactionTimeIso,
        valid_time_iso: params.validTimeIso,
        writer_role: "mind_guardian" as const,
      };
      const entrySha256 = sha256Hex(canonicalJson(draft));
      const finalRecord: MindJsonlRecord = {
        ...draft,
        entry_sha256: entrySha256,
      };
      fs.appendFileSync(this.mindPath, canonicalJson(finalRecord) + "\n", "utf8");
      return finalRecord;
    } finally {
      if (lockFd !== null) {
        fs.closeSync(lockFd);
      }
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    }
  }
}

// ============================================================================
// 6. Two-Way Agent-Bus Daemon + `516325` Telemetry & Neon Sleep Window Guard
// ============================================================================

export class OneMindAgentBusDaemon {
  private readonly busRoot: string;
  private readonly mindGuardian: MindGuardianDaemon;
  private readonly telemetryPath: string;
  private readonly fastOutcomes: number[] = [];
  private readonly slowOutcomes: number[] = [];

  constructor(busRoot: string, mindGuardian: MindGuardianDaemon, telemetryPath: string) {
    this.busRoot = busRoot;
    this.mindGuardian = mindGuardian;
    this.telemetryPath = telemetryPath;

    const dirs = [
      "inbox/from-motif",
      "inbox/from-opencode",
      "inbox/from-jules",
      "inbox/from-mimo",
      "inbox/from-antigravity",
      "claims",
      "outbox/receipts-motif",
      "outbox/receipts-opencode",
      "outbox/receipts-jules",
      "outbox/receipts-mimo",
      "outbox/receipts-antigravity",
    ];
    for (let i = 0; i < dirs.length; i++) {
      fs.mkdirSync(path.join(this.busRoot, atOrThrow(dirs, i, "OneMindAgentBusDaemon.dirs")), {
        recursive: true,
      });
    }
    fs.mkdirSync(path.dirname(this.telemetryPath), { recursive: true });
  }

  public static routeModelTier(
    requiresJudgment: boolean,
    hasCompleteSpec: boolean,
    isMechanicalScan: boolean
  ): ModelTierRoute {
    if (requiresJudgment || (!hasCompleteSpec && !isMechanicalScan)) {
      return "claude-opus-5.5/medium";
    }
    if (hasCompleteSpec && !isMechanicalScan) {
      return "claude-sonnet-5.5/medium";
    }
    return "claude-haiku-4.5/low";
  }

  public static isNeonSleepWindowCst(epochMs: number): boolean {
    const cstMillis = epochMs - 6 * 3600 * 1000;
    const cstDate = new Date(cstMillis);
    const minutesOfDay = cstDate.getUTCHours() * 60 + cstDate.getUTCMinutes();
    return (
      minutesOfDay >= NEON_SLEEP_START_MINUTES_CST &&
      minutesOfDay < NEON_SLEEP_END_MINUTES_CST
    );
  }

  public assertNeonCronAllowed(epochMs: number, isTier1Emergency = false): void {
    if (OneMindAgentBusDaemon.isNeonSleepWindowCst(epochMs) && !isTier1Emergency) {
      throw new NeonSleepWindowViolationError(
        `Neon 02:30-06:30 CST zero-cron autosuspend window active at epochMs=${epochMs}`
      );
    }
  }

  public emitWideEvent516325(params: {
    epochMs: number;
    gameId: string;
    isError?: boolean;
    lifecycleStage: string;
    metrics: Record<string, unknown>;
    nflWeek: number;
    sealedHash: string;
  }): Record<string, unknown> {
    const errBit = params.isError ? 1 : 0;
    this.fastOutcomes.push(errBit);
    this.slowOutcomes.push(errBit);
    if (this.fastOutcomes.length > 50) this.fastOutcomes.shift();
    if (this.slowOutcomes.length > 300) this.slowOutcomes.shift();

    const errorBudget = 0.005;
    const fastBurn =
      this.fastOutcomes.reduce((a, b) => a + b, 0) / this.fastOutcomes.length / errorBudget;
    const slowBurn =
      this.slowOutcomes.reduce((a, b) => a + b, 0) / this.slowOutcomes.length / errorBudget;

    if (this.fastOutcomes.length >= 10 && (fastBurn >= 14.4 || slowBurn >= 6.0)) {
      throw new SloCircuitOpenError(
        `SLO Burn-Rate Circuit Breaker OPEN (fast=${fastBurn.toFixed(2)}x, slow=${slowBurn.toFixed(2)}x)`
      );
    }

    const iso = new Date(params.epochMs).toISOString();
    const traceSeed = `${params.gameId}:${params.nflWeek}:${params.lifecycleStage}:${iso}`;
    const eventDoc = {
      canonical_code: WIDE_EVENT_SCHEMA_CODE,
      entity: LEGAL_ENTITY_NAME,
      game_id: params.gameId,
      lifecycle_stage: params.lifecycleStage,
      metrics: normalizeCanonicalValue(params.metrics),
      neon_sleep_window_active: OneMindAgentBusDaemon.isNeonSleepWindowCst(params.epochMs),
      nfl_week: params.nflWeek,
      otel: {
        "service.name": "one-mind-agent-bus-daemon",
        span_id: sha256Hex(traceSeed + ":span").slice(0, 16),
        status_code: params.isError ? "ERROR" : "OK",
        trace_id: sha256Hex(traceSeed).slice(0, 32),
      },
      posthog: {
        distinct_id: `gse_bus_wk${params.nflWeek}_${params.gameId}`,
        event: `gse_516325_${params.lifecycleStage.toLowerCase()}`,
        properties: {
          calibration_ledger_url: PUBLIC_CALIBRATION_LEDGER_URL,
          db_transport: "neon_http_443",
          nfl_week: params.nflWeek,
        },
      },
      schema_id: WIDE_EVENT_SCHEMA_ID,
      sealed_hash: params.sealedHash,
      sentry: {
        check_in_status: params.isError ? "error" : "ok",
        fingerprint: [WIDE_EVENT_SCHEMA_CODE, params.lifecycleStage, params.gameId],
        level: params.isError ? "error" : "info",
      },
      slo_burn: {
        fast_burn_rate: Number(fastBurn.toFixed(4)),
        slow_burn_rate: Number(slowBurn.toFixed(4)),
      },
      timestamp_iso: iso,
    };
    const serialized = canonicalJson(eventDoc);
    assertZeroSecretLeaks(serialized);
    fs.appendFileSync(this.telemetryPath, serialized + "\n", "utf8");
    return eventDoc;
  }

  public hydrateAgentWarmStart(
    agentId: string,
    activeSealedHash: string,
    requiresJudgment = false,
    hasCompleteSpec = true,
    isMechanicalScan = false
  ): AgentWarmStartPacket {
    const { count, headSha256 } = this.mindGuardian.verifyChain();
    const entries = this.mindGuardian.readAll();
    let weights = Array.from({ length: NUM_MCP_DOMAINS }, () => 0);
    const lessons: string[] = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = atOrThrow(entries, i, "hydrateAgentWarmStart.entries");
      const maybeWeights = entry.payload["shrunk_domain_weights"];
      if (Array.isArray(maybeWeights) && maybeWeights.length === NUM_MCP_DOMAINS) {
        weights = maybeWeights.map((x) => Number(x));
      }
      const maybeLesson = entry.payload["lesson_summary"];
      if (typeof maybeLesson === "string" && maybeLesson.length > 0) {
        lessons.push(maybeLesson);
      }
    }

    const recentReceipts: string[] = [];
    const outboxRoot = path.join(this.busRoot, "outbox");
    const subNames = fs.readdirSync(outboxRoot).sort();
    for (let i = 0; i < subNames.length; i++) {
      const subDir = path.join(outboxRoot, atOrThrow(subNames, i, "outboxRoot.subNames"));
      if (fs.statSync(subDir).isDirectory()) {
        const files = fs.readdirSync(subDir).sort();
        for (let j = 0; j < files.length; j++) {
          const f = atOrThrow(files, j, "outboxRoot.files");
          if (f.endsWith(".receipt.json")) {
            recentReceipts.push(f.replace(/\.receipt\.json$/, ""));
          }
        }
      }
    }

    return {
      active_lessons: lessons.slice(-10),
      active_sealed_hash: activeSealedHash,
      agent_id: agentId,
      conditions_on: {
        qb_questionable_epa: QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
        tau: SEALED_TAU,
        version: "v1.0",
      },
      domain_weights_log_odds: weights,
      mind_entry_count: count,
      mind_head_sha256: headSha256,
      recent_verified_receipts: recentReceipts.slice(-10),
      routed_model_tier: OneMindAgentBusDaemon.routeModelTier(
        requiresJudgment,
        hasCompleteSpec,
        isMechanicalScan
      ),
    };
  }

  public enqueueInboxTask(task: InboxTaskEnvelope): string {
    const inboxDir = path.join(this.busRoot, `inbox/from-${task.origin_agent}`);
    fs.mkdirSync(inboxDir, { recursive: true });
    const targetPath = path.join(inboxDir, `${task.task_id}.json`);
    if (fs.existsSync(targetPath)) {
      throw new NoOverwriteViolationError(`Inbox task ${task.task_id} already exists.`);
    }
    const serialized = canonicalJson(task);
    assertZeroSecretLeaks(serialized);
    fs.writeFileSync(targetPath, serialized + "\n", "utf8");
    return targetPath;
  }

  public reclaimStaleClaims(nowEpochSeconds: number): string[] {
    const claimsDir = path.join(this.busRoot, "claims");
    const reclaimed: string[] = [];
    const files = fs.readdirSync(claimsDir).sort();
    for (let i = 0; i < files.length; i++) {
      const file = atOrThrow(files, i, "reclaimStaleClaims.files");
      if (!file.endsWith(".claim.json")) continue;
      const fullPath = path.join(claimsDir, file);
      const parsed = JSON.parse(fs.readFileSync(fullPath, "utf8")) as {
        claimed_at_epoch_s: number;
        task_id: string;
      };
      if (nowEpochSeconds - parsed.claimed_at_epoch_s > STALE_CLAIM_TTL_SECONDS) {
        reclaimed.push(parsed.task_id);
        fs.unlinkSync(fullPath);
      }
    }
    return reclaimed;
  }

  private hasCompletedReceipt(taskId: string): boolean {
    const outboxRoot = path.join(this.busRoot, "outbox");
    const subs = fs.readdirSync(outboxRoot);
    for (let i = 0; i < subs.length; i++) {
      const sub = atOrThrow(subs, i, "hasCompletedReceipt.subs");
      const candidate = path.join(outboxRoot, sub, `${taskId}.receipt.json`);
      if (fs.existsSync(candidate)) return true;
    }
    return false;
  }

  public claimNextTask(
    claimingAgent: string,
    activeSealedHash: string,
    nowEpochSeconds: number
  ): { task: InboxTaskEnvelope; warmStart: AgentWarmStartPacket } | null {
    this.reclaimStaleClaims(nowEpochSeconds);
    const inboxRoot = path.join(this.busRoot, "inbox");
    const subDirs = fs.readdirSync(inboxRoot).sort();

    for (let i = 0; i < subDirs.length; i++) {
      const subDir = path.join(inboxRoot, atOrThrow(subDirs, i, "claimNextTask.subDirs"));
      if (!fs.statSync(subDir).isDirectory()) continue;

      const files = fs.readdirSync(subDir).sort();
      for (let j = 0; j < files.length; j++) {
        const file = atOrThrow(files, j, "claimNextTask.files");
        if (!file.endsWith(".json")) continue;
        const fullTaskPath = path.join(subDir, file);
        const task = JSON.parse(fs.readFileSync(fullTaskPath, "utf8")) as InboxTaskEnvelope;
        if (this.hasCompletedReceipt(task.task_id)) continue;

        const warmStart = this.hydrateAgentWarmStart(
          claimingAgent,
          activeSealedHash,
          task.requires_judgment,
          task.has_complete_spec,
          task.is_mechanical_scan
        );

        const claimPath = path.join(this.busRoot, "claims", `${task.task_id}.claim.json`);
        let fd: number | null = null;
        try {
          fd = fs.openSync(claimPath, "wx", 0o600);
          const claimDoc = {
            claimed_at_epoch_s: nowEpochSeconds,
            claiming_agent: claimingAgent,
            inbox_path: path.relative(this.busRoot, fullTaskPath),
            mind_head_at_claim: warmStart.mind_head_sha256,
            routed_model_tier: warmStart.routed_model_tier,
            task_id: task.task_id,
          };
          fs.writeSync(fd, canonicalJson(claimDoc) + "\n");
          return { task, warmStart };
        } catch (err: unknown) {
          if ((err as NodeJS.ErrnoException).code === "EEXIST") {
            continue;
          }
          throw err;
        } finally {
          if (fd !== null) fs.closeSync(fd);
        }
      }
    }
    return null;
  }

  public settleTaskWithPairedAudit(params: {
    auditA: IndependentAuditInput;
    auditB: IndependentAuditInput;
    claimMatrix: ClaimMatrixInput;
    claimingAgent: string;
    deliverableSummary: Record<string, unknown>;
    expectedSealedHash: string;
    lessonSummary: string;
    nflWeek: number;
    taskId: string;
    transactionEpochMs: number;
    validTimeIso: string;
  }): Record<string, unknown> {
    const verdict = runPairedAdversarialAudit(
      params.taskId,
      params.auditA,
      params.auditB,
      params.expectedSealedHash
    );
    const matrixWithReceipt: ClaimMatrixInput = {
      ...params.claimMatrix,
      receipt_sha256: verdict.receipt_sha256,
    };
    const matrixSha = validateClaimMatrix(matrixWithReceipt, true);
    const txIso = new Date(params.transactionEpochMs).toISOString();

    const outboxDir = path.join(this.busRoot, `outbox/receipts-${params.claimingAgent}`);
    fs.mkdirSync(outboxDir, { recursive: true });
    const receiptPath = path.join(outboxDir, `${params.taskId}.receipt.json`);
    if (fs.existsSync(receiptPath)) {
      throw new NoOverwriteViolationError(`Outbox receipt already exists for ${params.taskId}`);
    }

    const mindEntry = this.mindGuardian.appendEntry({
      claimMatrixSha256: matrixSha,
      domainSlug: "FLEET_BUS",
      entryId: `bus-verified-${params.taskId}`,
      guardianToken: MindGuardianDaemon.GUARDIAN_TOKEN,
      kind: "AGENT_BUS_VERIFIED_RECEIPT",
      pairedAuditReceiptSha256: verdict.receipt_sha256,
      payload: {
        claiming_agent: params.claimingAgent,
        deliverable_summary: params.deliverableSummary,
        lesson_summary: params.lessonSummary,
        reconciled_prob: verdict.reconciled_prob,
        status: "VERIFIED",
        task_id: params.taskId,
      },
      sealedHash: params.expectedSealedHash,
      transactionTimeIso: txIso,
      validTimeIso: params.validTimeIso,
      writerRole: "mind_guardian",
    });

    const receiptDoc = {
      autonomous_boundary_status: enforceAutonomousBoundary("report"),
      claim_matrix_sha256: matrixSha,
      claiming_agent: params.claimingAgent,
      mind_entry_sha256: mindEntry.entry_sha256,
      paired_audit: verdict,
      status: "VERIFIED",
      task_id: params.taskId,
      transaction_time_iso: txIso,
    };
    fs.writeFileSync(receiptPath, canonicalJson(receiptDoc) + "\n", "utf8");

    const claimPath = path.join(this.busRoot, "claims", `${params.taskId}.claim.json`);
    if (fs.existsSync(claimPath)) {
      fs.unlinkSync(claimPath);
    }

    this.emitWideEvent516325({
      epochMs: params.transactionEpochMs,
      gameId: params.taskId,
      lifecycleStage: "AGENT_BUS_TASK_VERIFIED",
      metrics: {
        claiming_agent: params.claimingAgent,
        mind_entry_sha256: mindEntry.entry_sha256,
        prob_divergence: verdict.prob_divergence,
        reconciled_prob: verdict.reconciled_prob,
      },
      nflWeek: params.nflWeek,
      sealedHash: params.expectedSealedHash,
    });

    return receiptDoc;
  }
}
