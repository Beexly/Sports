/**
 * Public GSE surface corpus for DESTROY pass.
 * Includes known-good process language + attack strings + live product phrases.
 */

import type { AuditSurface } from "./types";

/** Attack / risk corpus — intentional bad strings to verify detectors. */
export const ATTACK_CORPUS: readonly AuditSurface[] = [
  {
    id: "atk_roi",
    path: "/attack/roi",
    kind: "marketing",
    text: "72% win rate this season — guaranteed profit every week",
  },
  {
    id: "atk_more_stats",
    path: "/attack/superiority",
    kind: "marketing",
    text: "More stats than anyone else in the world. We dominate the game.",
  },
  {
    id: "atk_testimonial",
    path: "/attack/testimonial",
    kind: "marketing",
    text: "Customer says: I made $12k last month with GSE picks",
  },
  {
    id: "atk_book",
    path: "/attack/affiliate",
    kind: "partner",
    text: "Sign up at DraftKings with our sportsbook affiliate bonus",
    meta: { sportsbookCpa: true },
  },
  {
    id: "atk_pq",
    path: "/attack/crypto",
    kind: "crypto",
    text: "Our post-quantum Pedersen mint is ZK-proven commitment security",
    meta: { claimsPostQuantumLedger: true },
  },
  {
    id: "atk_exchange",
    path: "/attack/class",
    kind: "marketing",
    text: "Trade event contracts and place a wager on our prediction market exchange",
    meta: { classification: "exchange" },
  },
  {
    id: "atk_live_lie",
    path: "/attack/gate",
    kind: "gate",
    text: "Live board is firing active picks now — Phase C verified",
    meta: { liveBoardOn: false, phaseCVerified: false },
  },
  {
    id: "atk_risk_free",
    path: "/attack/ad",
    kind: "marketing",
    text: "Risk-free returns — chase your losses with our edge",
  },
  {
    id: "atk_ai",
    path: "/attack/ai",
    kind: "marketing",
    text: "Our AI is more accurate than any model and AI always detects value",
  },
  {
    id: "atk_spdx",
    path: "/api/export",
    kind: "api",
    text: "Bulk export of feature values",
    meta: { spdxPresent: false, publicApiEligible: true },
  },
  {
    id: "atk_founder",
    path: "/gaps",
    kind: "residual",
    text: "#226 HEOS shipped to production",
    meta: { founderGateClaimedShipped: true },
  },
] as const;

/** Live product-facing strings (must pass after remediation). */
export const LIVE_PRODUCT_CORPUS: readonly AuditSurface[] = [
  {
    id: "live_home",
    path: "/",
    kind: "marketing",
    text: "Refusal-native forecasting with a first-party API spine. Honesty not volume. LIVE_BOARD off. Phase C UNVERIFIED.",
    meta: { liveBoardOn: false, phaseCVerified: false, classification: "tool" },
  },
  {
    id: "live_own_api",
    path: "/own-api",
    kind: "api",
    text: "First-party feed: rights-tagged contracts in our registry. Self-referential inventory — not a competitive ranking. oddsApiRequired=false.",
    meta: { spdxPresent: true, classification: "tool" },
  },
  {
    id: "live_claims",
    path: "/claims",
    kind: "product",
    text: "We refuse-default when dual-asOf fails. No guarantee language. Empty board is successful refuse-default. founder-gate residual.",
    meta: { classification: "tool" },
  },
  {
    id: "live_partners",
    path: "/partners",
    kind: "partner",
    text: "Sportsbook CPA is permanently blocked. Stripe spine only. Credits never convert to cash or wager stake.",
    meta: { sportsbookCpa: false },
  },
  {
    id: "live_crypto",
    path: "/claims#sp800",
    kind: "crypto",
    text: "NIST SP 800-227 hybrid TLS allowed at edge. Pedersen mint remains classical secp256k1. No PQ-wash of ledger.",
    meta: { claimsPostQuantumLedger: false },
  },
  {
    id: "live_residual",
    path: "/gaps",
    kind: "residual",
    text: "LIVE_BOARD off · Phase C UNVERIFIED · #226 HOLD · founder-gate only",
    meta: {
      liveBoardOn: false,
      phaseCVerified: false,
      founderGateClaimedShipped: false,
    },
  },
  {
    id: "live_glass",
    path: "/verify",
    kind: "product",
    text: "Glass ledger and selective gate: measurement > narrative. UK tipster proofing analog — never imply typical user ROI.",
    meta: { classification: "tool" },
  },
] as const;

export const GSE_PUBLIC_CORPUS: readonly AuditSurface[] = [
  ...ATTACK_CORPUS,
  ...LIVE_PRODUCT_CORPUS,
];
