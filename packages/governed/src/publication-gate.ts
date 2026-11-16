import { createHash } from "node:crypto";
import { createGoverned, type GateOutput } from "./governed";
import type { GovernedResult, SignedGovernedReceipt } from "./receipt-types";

export interface CandidateSlateItem {
  readonly id?: string;
  readonly matchup?: string;
  readonly market?: string;
  readonly selection?: string;
  readonly decision: "PLAY" | "PASS" | "PUBLISH" | "ABSTAIN";
  readonly publishAllowed: boolean;
  readonly confidenceDisplay: string;
  readonly expectedClv: number;
  readonly overAmerican?: number | null;
  readonly underAmerican?: number | null;
  readonly publicCopy?: string;
}

export interface CandidateSlatePacket {
  readonly season: number;
  readonly week: number;
  readonly windowSlot: string;
  readonly lockVersion: string;
  readonly namedVolumeShare?: number;
  readonly items: readonly CandidateSlateItem[];
}

export interface ReceiptSigner {
  readonly kid: string;
  readonly privateKeyPem: string;
}

export const CAGE_POLICY_VERSION = 3;
export const CAGE_POLICY_ID = "gse-cage-prepublish-v3";
export const CAGE_POLICY_SHA256 = createHash("sha256").update(CAGE_POLICY_ID).digest("hex");

const JARGON_LEAK_RE =
  /\b(STAGE5_SPREAD_GATE|Romano\s+CQR|Sinkhorn(?:-Knopp)?|JEV|Cholesky|tau_hat|10,000\s+worlds|22,750,000\s+snap)\b/i;

function isValidConfidenceDisplay(value: string): boolean {
  if (!value || value.includes("%")) return false;
  const match = value.trim().match(/^(\d{1,3})\/100$/);
  if (!match) return false;
  const n = Number(match[1]);
  return Number.isInteger(n) && n >= 0 && n <= 100;
}

function isTwoSidedMarketItem(item: CandidateSlateItem): boolean {
  const m = (item.market ?? "").toLowerCase();
  if (!m) return false;
  const oneSidedAllowed = m.includes("anytime") || m.includes("first_td") || m === "atd";
  if (oneSidedAllowed) return true;
  return (
    typeof item.overAmerican === "number" &&
    Number.isFinite(item.overAmerican) &&
    typeof item.underAmerican === "number" &&
    Number.isFinite(item.underAmerican)
  );
}

/**
 * Deterministic CAGE pre-publication gate. Inspects every candidate item and
 * packet invariant prior to sealing; never invokes an LLM or mutates input.
 */
export function evaluateCagePublicationPolicy(packet: CandidateSlatePacket): GateOutput {
  const reasons: string[] = [];

  if (
    typeof packet.namedVolumeShare === "number" &&
    (!Number.isFinite(packet.namedVolumeShare) || packet.namedVolumeShare < 0.94)
  ) {
    reasons.push("UNATTRIBUTED_VOLUME_LEAK");
  }

  for (let i = 0; i < packet.items.length; i++) {
    const item = packet.items[i]!;
    const tag = item.id ?? `item_${i}`;
    const isActivePlay =
      item.publishAllowed && (item.decision === "PLAY" || item.decision === "PUBLISH");

    if ((item.decision === "PASS" || item.decision === "ABSTAIN") && item.publishAllowed) {
      reasons.push(`PASS_MARKED_PUBLISHABLE:${tag}`);
    }
    if (isActivePlay && (!Number.isFinite(item.expectedClv) || item.expectedClv < 0)) {
      reasons.push(`NEGATIVE_CLV_PLAY:${tag}`);
    }
    if (!isValidConfidenceDisplay(item.confidenceDisplay)) {
      reasons.push(`CONFIDENCE_PERCENT_FORBIDDEN:${tag}`);
    }
    if (isActivePlay && item.market && !isTwoSidedMarketItem(item)) {
      reasons.push(`SINGLE_SIDED_PROP_FORBIDDEN:${tag}`);
    }
    if (item.publicCopy && JARGON_LEAK_RE.test(item.publicCopy)) {
      reasons.push(`INTERNAL_JARGON_LEAK:${tag}`);
    }
  }

  return {
    decision: reasons.length === 0 ? "ADMIT" : "REFUSE",
    reasons: Array.from(new Set(reasons)),
  };
}

export function digestCandidatePacket(packet: CandidateSlatePacket): string {
  return createHash("sha256").update(JSON.stringify(packet)).digest("hex");
}

/**
 * Runs CAGE deterministic pre-publication policy through `@sports/governed`
 * in explicit ENFORCE mode, minting an Ed25519 SignedGovernedReceipt whether
 * admitted or refused.
 */
export async function enforceSlatePublication<T>(
  packet: CandidateSlatePacket,
  signer: ReceiptSigner,
  persistReceipt: (receipt: SignedGovernedReceipt) => Promise<{ controlEventId?: string }>,
  publishFn: () => Promise<T>,
  options?: { agentId?: string; receiptBaseUrl?: string },
): Promise<GovernedResult<T>> {
  const sha256 = digestCandidatePacket(packet);
  const governed = createGoverned({
    gate: async () => evaluateCagePublicationPolicy(packet),
    persistReceipt,
    getSigner: async () => signer,
    receiptBaseUrl: options?.receiptBaseUrl,
  });

  return governed(
    "slate.publish",
    {
      season: packet.season,
      week: packet.week,
      windowSlot: packet.windowSlot,
      lockVersion: packet.lockVersion,
      sha256,
    },
    {
      policyVersion: CAGE_POLICY_VERSION,
      policyHash: CAGE_POLICY_SHA256,
      agentId: options?.agentId ?? "gse-noon-lock",
      mode: "ENFORCE",
    },
    publishFn,
  );
}
