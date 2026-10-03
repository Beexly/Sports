/**
 * FTC penalty / enforcement reference fixtures for council education.
 * Sources: public FTC press releases & 16 CFR 1.98 inflation adjustments.
 * Engineering doctrine — not legal advice.
 */

export interface FtcPenaltyExample {
  readonly id: string;
  readonly caseOrRule: string;
  readonly year: number;
  readonly pattern: string;
  readonly outcome: string;
  readonly gseLesson: string;
  readonly approxCivilPenaltyPerViolationUsd?: number;
}

/** 2025 inflation adjustment: FTC Act §5(l)/(m) max civil penalty $53,088/violation. */
export const FTC_CIVIL_PENALTY_MAX_2025 = 53088;

export const FTC_PENALTY_EXAMPLES: readonly FtcPenaltyExample[] = [
  {
    id: "civil_penalty_cap_2025",
    caseOrRule: "16 CFR 1.98 inflation adjustment (Jan 2025 FR)",
    year: 2025,
    pattern: "Knowing violations after Notice of Penalty Offenses / rule violations",
    outcome:
      "Max civil penalty for FTC Act §5(l), 5(m)(1)(A), 5(m)(1)(B) raised from $51,744 to $53,088 per violation",
    gseLesson:
      "Each unsubstantiated performance/earnings string can be counted as a separate violation at five-figure statutory max",
    approxCivilPenaltyPerViolationUsd: FTC_CIVIL_PENALTY_MAX_2025,
  },
  {
    id: "mmo_notice_2021",
    caseOrRule: "Notice of Penalty Offenses — Money-Making Opportunities (Oct 2021)",
    year: 2021,
    pattern: "False/misleading earnings claims for money-making opportunities",
    outcome:
      "Puts recipients on notice; subsequent knowing violations expose civil penalties (indexed annually)",
    gseLesson:
      "Tipster-adjacent marketing of ROI/win-rate as typical user earnings is MMO-class risk — four-field or HARD_REFUSE",
  },
  {
    id: "sales_mentor_2023_2025",
    caseOrRule: "FTC v. Traffic and Funnels / The Sales Mentor",
    year: 2025,
    pattern: "Deceptive earnings claims after receiving MMO + endorsement penalty notices",
    outcome: "~$1M orders; ~$960k consumer refunds sent Jan 2025",
    gseLesson: "Continuing earnings claims after notice multiplies exposure — never soft-launch ROI",
  },
  {
    id: "ascend_ecom_2025",
    caseOrRule: "FTC v. Ascend Ecom",
    year: 2025,
    pattern: "AI-powered tools promising passive income thousands/month",
    outcome: "Proposed ban from business-opportunity marketing; ~$25M judgment (partially suspended)",
    gseLesson: "AI + income claims without competent evidence is ban-tier risk — GSE must never claim passive income",
  },
  {
    id: "im_mastery_2025",
    caseOrRule: "IM Mastery Academy settlements",
    year: 2025,
    pattern: "Baseless earnings + fake reviews via third party",
    outcome: "$2.5M pay; $36M judgment suspended; permanent ban on unsubstantiated typical earnings",
    gseLesson: "Testimonials/reviews cannot substitute for typicality evidence — HARD_REFUSE testimonial-as-proof",
  },
  {
    id: "reviews_rule_2024",
    caseOrRule: "Consumer Reviews and Testimonials Rule (16 CFR Part 465)",
    year: 2024,
    pattern: "Fake/AI reviews, incentivized sentiment, insider reviews without disclosure",
    outcome: "Civil penalties for knowing violations; 2025 warning letters cited ~$53,088/violation",
    gseLesson: "No AI users, no paid 5-star schemes, no employee social proof as independent",
    approxCivilPenaltyPerViolationUsd: FTC_CIVIL_PENALTY_MAX_2025,
  },
  {
    id: "truheight_2026",
    caseOrRule: "TruHeight influencer / fake reviews settlement (public reporting 2026)",
    year: 2026,
    pattern: "Unsubstantiated claims + employee reviews + AI fake social profiles",
    outcome: "Reported $750k payment on multi-million judgment under Reviews Rule",
    gseLesson: "Social proof theater is a balance-sheet event — council Endorsement Predator owns this",
  },
  {
    id: "wealthpress_mmo_penalty",
    caseOrRule: "WealthPress Holdings (investment advice)",
    year: 2023,
    pattern: "Outlandish false claims after MMO Notice of Penalty Offenses",
    outcome: "First civil penalties collected against MMO-notice recipient; refunds + $500k penalty",
    gseLesson: "Performance/ROI marketing after notice = direct path to civil penalties",
  },
] as const;

export function ftcPenaltyBrief(): {
  maxPerViolationUsd: number;
  topRisksForGse: string[];
  neverDo: string[];
} {
  return {
    maxPerViolationUsd: FTC_CIVIL_PENALTY_MAX_2025,
    topRisksForGse: [
      "Unsubstantiated win-rate/ROI as typical user result",
      "Guarantee / risk-free / sure-win language",
      "Testimonial or AI review as social proof of performance",
      "Superiority without competitive study",
      "Blurring tool identity into tipster or money-making opportunity",
    ],
    neverDo: [
      "Publish performance number without four-field + watermark",
      "Sportsbook CPA / revshare path",
      "Claim post-quantum or ZK for Pedersen mint",
      "Soft-launch LIVE_BOARD or Phase C as verified",
    ],
  };
}
