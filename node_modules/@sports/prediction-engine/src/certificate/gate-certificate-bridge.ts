/**
 * Bridge selective-gate / Phase C style outcomes → DecisionCertificate.
 * Does not replace selective-gate.ts. Consume gate outputs only.
 */

import {
  fireCertificate,
  humanSummaryForReasons,
  mapExclusionToReasons,
  noBetCertificate,
  withContentHash,
  type DecisionCertificate,
  type MultiprobInterval,
  type NoBetReasonCode,
} from "./decision-certificate.js";

export interface GateCandidateView {
  eventId: string;
  market: string;
  stratumKey: string;
  modelVersion: string;
  admitted: boolean;
  exclusions?: readonly string[];
  oddsFetchedAt?: string;
  stratumN?: number;
  interval?: MultiprobInterval;
  priceDecimal?: number;
  fired?: boolean;
}

export interface BridgeOptions {
  hash?: boolean;
  verifyPathPrefix?: string;
}

export async function certificateFromGateCandidate(
  c: GateCandidateView,
  opts: BridgeOptions = {},
): Promise<DecisionCertificate> {
  const verifyPath = opts.verifyPathPrefix
    ? `${opts.verifyPathPrefix}${c.eventId}`
    : undefined;

  let cert: DecisionCertificate;

  if (c.fired && c.admitted && c.interval) {
    cert = fireCertificate({
      stratumKey: c.stratumKey,
      modelVersion: c.modelVersion,
      eventId: c.eventId,
      market: c.market,
      summary: "Selective gate admitted FIRE under current multiprob interval",
      interval: c.interval,
      priceDecimal: c.priceDecimal,
      oddsFetchedAt: c.oddsFetchedAt,
      stratumN: c.stratumN,
      verifyPath,
    });
  } else {
    const reasons: NoBetReasonCode[] =
      c.exclusions && c.exclusions.length > 0
        ? mapExclusionToReasons(c.exclusions)
        : (["GATE_OTHER"] as NoBetReasonCode[]);
    cert = noBetCertificate({
      stratumKey: c.stratumKey,
      modelVersion: c.modelVersion,
      eventId: c.eventId,
      market: c.market,
      reasons,
      summary: humanSummaryForReasons(reasons),
      interval: c.interval,
      oddsFetchedAt: c.oddsFetchedAt,
      stratumN: c.stratumN,
      verifyPath,
    });
  }

  if (opts.hash) return withContentHash(cert);
  return cert;
}

export async function certificatesFromGateCandidates(
  candidates: readonly GateCandidateView[],
  opts: BridgeOptions = {},
): Promise<DecisionCertificate[]> {
  const out: DecisionCertificate[] = [];
  for (const c of candidates) {
    out.push(await certificateFromGateCandidate(c, opts));
  }
  return out;
}
