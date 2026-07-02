/**
 * GSE Founding Waitlist — no-claim copy (single source of truth).
 *
 * Every string here is process / transparency language only. It makes NO
 * performance claim: no win-rate, ROI, accuracy, edge, or guaranteed-outcome
 * wording. It is authored to pass the platform's own compliance scanner
 * (`@/lib/compliance-scanner/rules`) with zero `block` flags — see the test in
 * `apps/web/__tests__/gse-waitlist.test.ts`.
 *
 * The backtest-truth line is the honest current read and must stay visible and
 * unspun: the model does NOT beat a naive baseline on the tested setup.
 * Source of truth: `docs/gse/backtest-transparency.md`.
 *
 * Pure module — no network, no PII, fully unit-testable.
 */

/** Bump when copy changes so analytics/audit can version what a lead saw. */
export const WAITLIST_COPY_VERSION = "2026-06-29.1";

/** The verified, do-not-alter backtest figures (mirror of backtest-transparency.md). */
export const BACKTEST_TRUTH = {
  samples: 10_301,
  modelMae: 5.18,
  naiveMae: 4.9999,
  beatsNaive: false,
} as const;

/**
 * Honest transparency statement shown on the public-safe waitlist surface.
 * States that the model does not beat the naive baseline; promises nothing.
 */
export const BACKTEST_TRANSPARENCY =
  "Honest status: on the most recent out-of-sample test (10,301 samples), the model's " +
  "average error (MAE ~5.18) did not beat a simple naive baseline (MAE ~5.00). " +
  "The model does not beat naive on this tested setup. We show this openly. " +
  "No outcome is promised. This lane is about decision process, not predictions.";

export const WAITLIST_ROLE_LABELS = {
  operator: "Operator",
  analyst: "Analyst",
  founder: "Founder",
  bettor: "Bettor",
} as const;

export const WAITLIST_SPORT_OPTIONS = ["NFL", "NBA", "MLB", "NHL", "NCAAF"] as const;

/**
 * The waitlist page / form copy. Process-first, no-claim, scanner-clean.
 */
export const WAITLIST_COPY = {
  eyebrow: "Founding lane",
  headline: "Founding Decision-Process Lane",
  subhead: "For operators who want clarity first, not hype.",
  body: [
    "A documented process audit, source-quality checks, and decision discipline, built for people who want to understand their own decisions.",
    "No promised outcomes. No predictions sold as certainty. This is process work, not a tip service.",
    "Current model status is shown openly, including where it underperforms.",
    "Founding members get a process-audit packet and a research-brief lane, reviewed by a human before anything is sent.",
  ],
  consentLabel:
    "I'm opting in to occasional, non-promotional process updates and research notes. I can unsubscribe from non-essential messages anytime.",
  submitLabel: "Join the founding waitlist",
  thankYou:
    "Thanks. Your waitlist slot is captured. You're queued for founder review and will get the next opening note. Nothing is sent without explicit review.",
  // Field labels kept here so the form and tests share one source.
  fields: {
    fullName: "Full name",
    email: "Email",
    role: "Your role",
    sportInterests: "Sports you follow",
    currentStack: "Current stack or workflow (optional)",
    weakestProcess: "What's weakest in your process today? (optional)",
  },
} as const;

/** Flat list of every user-facing copy string, for the no-claim test sweep. */
export const ALL_WAITLIST_COPY_STRINGS: readonly string[] = [
  WAITLIST_COPY.eyebrow,
  WAITLIST_COPY.headline,
  WAITLIST_COPY.subhead,
  ...WAITLIST_COPY.body,
  WAITLIST_COPY.consentLabel,
  WAITLIST_COPY.submitLabel,
  WAITLIST_COPY.thankYou,
  ...Object.values(WAITLIST_COPY.fields),
  BACKTEST_TRANSPARENCY,
];
