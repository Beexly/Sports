/**
 * Ten adversarial council seats — each returns DESTROY findings.
 */

import type {
  AuditSurface,
  CouncilSeat,
  DestroyFinding,
  Severity,
} from "./types";
import { assessComparativeClaim } from "./nad-comparative";

let _seq = 0;
function fid(seat: string): string {
  _seq += 1;
  return `destroy_${seat}_${_seq}`;
}

function finding(
  partial: Omit<DestroyFinding, "findingId">,
): DestroyFinding {
  return { ...partial, findingId: fid(partial.seat) };
}

const GUARANTEE_RE =
  /\b(guaranteed?\s+(profit|wins?|returns?)|sure\s+win|can'?t\s+lose|risk[- ]free|always\s+win|no[- ]lose)\b/i;
const EARNINGS_RE =
  /\b(i made \$?\d|make \$?\d+|passive income|print money|get rich|monthly income)\b/i;
const PERF_RE =
  /\b(\d{1,3}(\.\d+)?%\s*(win|hit|accuracy|roi)|win[- ]?rate|roi\s+of)\b/i;
const EXCHANGE_RE =
  /\b(place (a )?wager|bet with us|event contract|prediction market exchange|dcm|trade contracts on our)\b/i;
const TIPSTER_RE =
  /\b(daily picks service|lock of the day|guaranteed pick|tipster service)\b/i;
const PQ_WASH_RE =
  /\b(post[- ]quantum (commitment|ledger|pedersen|mint)|quantum[- ]safe (honesty|ledger|commitment)|zk[- ]proven (mint|pedersen|commitment))\b/i;
const SPORTSBOOK_CTA_RE =
  /\b(sign up at (draftkings|fanduel|betmgm)|betting partner bonus|our sportsbook affiliate)\b/i;

function isSportsbookPromo(text: string, meta?: AuditSurface["meta"]): boolean {
  if (meta?.sportsbookCpa === true) return true;
  if (meta?.sportsbookCpa === false) return false;
  if (/\b(permanently blocked|hard[_ ]?refuse|never|blocked forever|no sportsbook)\b/i.test(text)) {
    return false; // policy denial, not a CTA
  }
  return SPORTSBOOK_CTA_RE.test(text);
}

function ftcSection5(): CouncilSeat {
  return {
    id: "ftc_section5",
    name: "FTC §5 Assassin",
    mission: "Destroy unsubstantiated earnings/performance/guarantee claims",
    attackSurface: "All marketing and product copy strings",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (GUARANTEE_RE.test(s.text)) {
          out.push(
            finding({
              seat: "ftc_section5",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "User success is assured or risk-free",
              evidenceMissing: ["impossible_to_substantiate_guarantee"],
              regulationPattern: "FTC_SECTION_5",
              remediation: "HARD_REFUSE — delete or rewrite to process/refuse-default language",
              shipBlock: true,
            }),
          );
        }
        if (EARNINGS_RE.test(s.text)) {
          out.push(
            finding({
              seat: "ftc_section5",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Money-making opportunity with typical earnings",
              evidenceMissing: ["typicality_package", "four_field", "written_typical_results"],
              regulationPattern: "FTC_MMO_PENALTY_NOTICE",
              remediation: "HARD_REFUSE earnings claims; GSE is not a money-making opportunity",
              shipBlock: true,
            }),
          );
        }
        if (PERF_RE.test(s.text) && !s.meta?.hasFourField) {
          out.push(
            finding({
              seat: "ftc_section5",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Objective performance consumers can expect",
              evidenceMissing: [
                "coverage_nFired_nEligible",
                "wilson_or_cp",
                "clv",
                "walk_forward_id",
                "model_version",
                "watermark",
              ],
              regulationPattern: "FTC_SECTION_5",
              remediation: "Attach four-field + watermark or refuse to publish number",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function endorsementPredator(): CouncilSeat {
  return {
    id: "endorsement_predator",
    name: "Endorsement Predator",
    mission: "Destroy undisclosed material connections and testimonial-as-proof",
    attackSurface: "Partners, influencers, reviews, social proof",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (/\b(testimonial|i made \$|customer says|pro bettor says)\b/i.test(s.text)) {
          out.push(
            finding({
              seat: "endorsement_predator",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Typical user results via anecdote",
              evidenceMissing: ["four_field_not_testimonial"],
              regulationPattern: "FTC_REVIEWS_TESTIMONIALS_RULE",
              remediation: "HARD_REFUSE testimonial-as-proof",
              shipBlock: true,
            }),
          );
        }
        if (isSportsbookPromo(s.text, s.meta)) {
          out.push(
            finding({
              seat: "endorsement_predator",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Sportsbook affiliate growth channel",
              evidenceMissing: ["product_law_hard_refuse"],
              regulationPattern: "FTC_ENDORSEMENT_GUIDES",
              remediation: "HARD_REFUSE sportsbook CPA forever — product suicide path",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function classificationAuditor(): CouncilSeat {
  return {
    id: "classification_auditor",
    name: "Classification Auditor",
    mission: "Keep GSE as tool — not tipster, exchange, or sportsbook",
    attackSurface: "Identity, pricing, investor, product framing",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (EXCHANGE_RE.test(s.text) || s.meta?.classification === "exchange") {
          out.push(
            finding({
              seat: "classification_auditor",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "CFTC event-contract venue / betting exchange",
              evidenceMissing: ["product_identity_lock"],
              regulationPattern: "CFTC_IDENTITY",
              remediation: "Rewrite to decision-support / honesty ledger / stats API only",
              shipBlock: true,
            }),
          );
        }
        if (TIPSTER_RE.test(s.text) || s.meta?.classification === "tipster") {
          out.push(
            finding({
              seat: "classification_auditor",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Paid tipster service with picks as product",
              evidenceMissing: ["tool_not_tipster_identity"],
              regulationPattern: "FTC_MMO_PENALTY_NOTICE",
              remediation: "HARD_REFUSE tipster framing; glass ledger is not a tips product",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function substantiationAuditor(): CouncilSeat {
  return {
    id: "substantiation_auditor",
    name: "Substantiation Auditor",
    mission: "Every number needs four-field + watermark; superiority needs study",
    attackSurface: "Quantified claims, superiority, dominate language",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        const comp = assessComparativeClaim(s.text);
        if (comp.hardRefuse || (comp.requireStudy && !s.meta?.competitiveStudyId)) {
          out.push(
            finding({
              seat: "substantiation_auditor",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Comparative superiority without competent evidence",
              evidenceMissing: [
                "competitiveStudyId",
                "defined_universe",
                "recent_measurement",
                ...comp.hits.map((h) => h.id),
              ],
              regulationPattern: "NAD_COMPARATIVE",
              remediation:
                "HARD_REFUSE superiority / more-than-anyone / #1 without defined competitive study",
              shipBlock: true,
            }),
          );
        }
        if (PERF_RE.test(s.text) && !s.meta?.hasWatermark) {
          out.push(
            finding({
              seat: "substantiation_auditor",
              severity: s.meta?.hasFourField ? "HIGH" : "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Public performance figure is recompute-ready",
              evidenceMissing: ["metric_watermark"],
              regulationPattern: "FTC_SECTION_5",
              remediation: "Mint watermark or refuse number",
              shipBlock: !s.meta?.hasFourField,
            }),
          );
        }
      }
      return out;
    },
  };
}

function licenseVampire(): CouncilSeat {
  return {
    id: "license_vampire",
    name: "License Vampire",
    mission: "Infect copyleft, missing SPDX, illegal exports",
    attackSurface: "Deps, datasets, export endpoints",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (s.kind === "rights" || s.kind === "api") {
          if (s.meta?.spdxPresent === false) {
            out.push(
              finding({
                seat: "license_vampire",
                severity: "HIGH",
                surface: s.path,
                claim: s.text.slice(0, 200),
                impliedClaim: "Data may leave without rights metadata",
                evidenceMissing: ["licenseSpdx", "attributionRequired"],
                regulationPattern: "EXPORT_RIGHTS",
                remediation: "Require SPDX on FeatureRecord before public_api_eligible",
                shipBlock: true,
              }),
            );
          }
          if (/\b(AGPL|SSPL|Commons Clause)\b/i.test(s.text) && /allowed|approved|use/i.test(s.text)) {
            out.push(
              finding({
                seat: "license_vampire",
                severity: "CRITICAL",
                surface: s.path,
                claim: s.text.slice(0, 200),
                impliedClaim: "Copyleft network infection of proprietary product",
                evidenceMissing: ["blocked_spdx_enforcement"],
                regulationPattern: "LICENSE_COPYLEFT",
                remediation: "HARD_REFUSE AGPL/SSPL in prod allowlist",
                shipBlock: true,
              }),
            );
          }
        }
      }
      return out;
    },
  };
}

function cryptoHonesty(): CouncilSeat {
  return {
    id: "crypto_honesty",
    name: "Crypto Honesty Auditor",
    mission: "TLS hybrid OK; PQ-wash of Pedersen DESTROY",
    attackSurface: "Security/trust marketing, crypto docs",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (PQ_WASH_RE.test(s.text) || s.meta?.claimsPostQuantumLedger) {
          out.push(
            finding({
              seat: "crypto_honesty",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Ledger/mint is post-quantum or ZK-proven",
              evidenceMissing: ["plane_separation_tls_vs_ledger"],
              regulationPattern: "SP800_227_MISUSE",
              remediation:
                "REFUSE — SP 800-227 hybrid KEM is transport only; Pedersen stays classical",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function fireAuthoritySkeptic(): CouncilSeat {
  return {
    id: "fire_authority_skeptic",
    name: "Fire-Authority Skeptic",
    mission: "No public fire without topology; empty board is success",
    attackSurface: "Gate, LIVE_BOARD, selective fire claims",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (
          /\b(live board is (on|live|firing)|we are live firing|active picks board)\b/i.test(
            s.text,
          ) &&
          s.meta?.liveBoardOn === false
        ) {
          out.push(
            finding({
              seat: "fire_authority_skeptic",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Product is currently firing live recommendations",
              evidenceMissing: ["live_board_founder_gate"],
              regulationPattern: "FOUNDER_RESIDUAL",
              remediation: "Disclose LIVE_BOARD off; empty board = refuse-default success",
              shipBlock: true,
            }),
          );
        }
        if (/\b(phase c verified|5b measured|officially green)\b/i.test(s.text) && !s.meta?.phaseCVerified) {
          out.push(
            finding({
              seat: "fire_authority_skeptic",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Phase C measurement complete",
              evidenceMissing: ["founder_path_measurement"],
              regulationPattern: "FOUNDER_RESIDUAL",
              remediation: "Keep UNVERIFIED until non-book path measured",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function stateGamingAd(): CouncilSeat {
  return {
    id: "state_gaming_ad",
    name: "State Gaming Ad Auditor",
    mission: "Destroy risk-free / success-guaranteed ad patterns even as non-book",
    attackSurface: "Ads, affiliate copy, landing CTAs",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (/\brisk[- ]free\b|\bno sweat bet\b|\bchase (your )?losses\b/i.test(s.text)) {
          out.push(
            finding({
              seat: "state_gaming_ad",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Wagering is free of risk or recovery path",
              evidenceMissing: ["ny_style_ad_prohibition_pattern"],
              regulationPattern: "STATE_RISK_FREE",
              remediation: "HARD_REFUSE risk-free / chase-loss language",
              shipBlock: true,
            }),
          );
        }
        if (isSportsbookPromo(s.text, s.meta)) {
          out.push(
            finding({
              seat: "state_gaming_ad",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Unlicensed sports wagering promotion",
              evidenceMissing: ["no_sportsbook_cta"],
              regulationPattern: "NY_SPORTS_AD",
              remediation: "Remove sportsbook CTA entirely",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function aiClaimAuditor(): CouncilSeat {
  return {
    id: "ai_claim_auditor",
    name: "AI Claim Auditor",
    mission: "AI claims must match evidence; limits in claim not fine print",
    attackSurface: "AI edge / detect / calibrate marketing",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (
          /\b(ai (edge|guarantees?|always|detects better)|our ai is more accurate)\b/i.test(
            s.text,
          )
        ) {
          out.push(
            finding({
              seat: "ai_claim_auditor",
              severity: "HIGH",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "AI provides assured accuracy/safety beyond evidence",
              evidenceMissing: [
                "held_out_method",
                "in_product_validation",
                "limits_in_claim",
              ],
              regulationPattern: "NAD_AI_CLAIMS",
              remediation: "Rewrite to measured harness metrics or refuse",
              shipBlock: true,
            }),
          );
        }
      }
      return out;
    },
  };
}

function residualTruthTeller(): CouncilSeat {
  return {
    id: "residual_truth_teller",
    name: "Residual Truth-Teller",
    mission: "Founder gates stay residual — never silently promoted as shipped",
    attackSurface: "Living state, gap ledger, release notes",
    audit(surfaces) {
      const out: DestroyFinding[] = [];
      for (const s of surfaces) {
        if (s.meta?.founderGateClaimedShipped) {
          out.push(
            finding({
              seat: "residual_truth_teller",
              severity: "CRITICAL",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Founder-gated item is production complete",
              evidenceMissing: ["explicit_founder_yes"],
              regulationPattern: "FOUNDER_RESIDUAL",
              remediation: "Revert status to FOUNDER_GATE / UNVERIFIED / HOLD",
              shipBlock: true,
            }),
          );
        }
        // INFO: honest residual disclosure is good
        if (/\b(LIVE_BOARD off|Phase C UNVERIFIED|#226 HOLD|founder[- ]gate)\b/i.test(s.text)) {
          out.push(
            finding({
              seat: "residual_truth_teller",
              severity: "INFO",
              surface: s.path,
              claim: s.text.slice(0, 200),
              impliedClaim: "Honest residual disclosure",
              evidenceMissing: [],
              regulationPattern: "FOUNDER_RESIDUAL",
              remediation: "Keep explicit — do not paper over",
              shipBlock: false,
            }),
          );
        }
      }
      return out;
    },
  };
}

export function buildCouncilSeats(): CouncilSeat[] {
  _seq = 0;
  return [
    ftcSection5(),
    endorsementPredator(),
    classificationAuditor(),
    substantiationAuditor(),
    licenseVampire(),
    cryptoHonesty(),
    fireAuthoritySkeptic(),
    stateGamingAd(),
    aiClaimAuditor(),
    residualTruthTeller(),
  ];
}

export function severityRank(s: Severity): number {
  return { CRITICAL: 5, HIGH: 4, MEDIUM: 3, LOW: 2, INFO: 1 }[s];
}
