/**
 * Disclosures and help resources.
 *
 * SOURCE: `apps/web/lib/brand.ts` (the HELPLINE constant and the support
 * addresses) and `COMPLIANCE_AND_RESPONSIBLE_GAMING.md`. The app does not
 * paraphrase any of it — a helpline number that has been "tidied up" in a
 * native client is a compliance failure with a human cost.
 *
 * These strings are asserted in tests against the repo's own source, because
 * the phone number is the single most important string in the binary.
 */

export const HELPLINE = {
  name: "National Problem Gambling Helpline",
  number: "1-800-GAMBLER",
  /** Dialable form. `tel:` needs no separators; the 1-800 number is US/CA. */
  telHref: "tel:18004262253",
  /** Verbatim from `brand.ts` HELPLINE.href. */
  href: "https://www.ncpgambling.org/help-treatment/",
  shortLabel: "1-800-GAMBLER",
  /** From the NCPG. Stated as given, never embellished. */
  availability: "Free, confidential, 24 hours a day",
} as const;

export const SUPPORT_EMAIL = "support@galaxysportsedge.com";
export const LEGAL_EMAIL = "legal@galaxysportsedge.com";

/**
 * The age gate copy.
 *
 * The product is 17+ on the App Store because of sportsbook adjacency
 * (guideline 1.4.3 / 5.3), and the gate is a statement rather than a birthdate
 * field: collecting a date of birth would be collecting personal data the
 * product does not need, and Apple does not require it.
 */
export const AGE_GATE = {
  title: "This app is for adults.",
  body:
    "Galaxy Sports Edge publishes sports analysis and references sportsbook odds. " +
    "It is rated 17+ and is intended for adults of legal age in their jurisdiction.",
  confirm:
    "It is not a sportsbook. It does not take bets, hold funds, or place wagers on your behalf.",
  action: "I am 17 or older",
  decline: "Not now",
} as const;

/**
 * The product's own statement of what it is not. Used on onboarding and the
 * About surface. Every clause here maps to a real review guideline or a real
 * positioning rule.
 */
export const NOT_A_SPORTSBOOK = [
  "We do not take bets or hold money.",
  "We do not place wagers for you.",
  // Deliberately phrased to avoid the banned token itself. The rule-8 list
  // matches on the word, not on intent, and it is right to: a copy rule that
  // makes exceptions for negations is a rule nobody can enforce mechanically.
  "We do not sell picks as a subscription that promises outcomes.",
  "We do not share revenue with a sportsbook for sending you to one.",
] as const;

/**
 * The responsible-play commitments the app actually implements.
 *
 * Written as a list of what IS done, not what is aspired to. A screen that
 * promises more than the app does is worse than no screen, because it converts
 * a real safeguard into a marketing claim.
 */
export const RESPONSIBLE_PLAY = {
  intro:
    "Galaxy Sports Edge is a research surface. It is not a place to bet, and it is not " +
    "built to increase how much you wager.",
  commitments: [
    "We never prompt you to deposit or to stake more.",
    "Session reminders fire on a time interval you choose, and they cannot be turned off silently.",
    "A cool-down can be started at any time, and it is enforced on the device and on the server.",
    "Self-exclusion is available without contacting support.",
    "We do not use your behaviour to target offers. Behaviour triggers a responsible-play nudge, never an upsell.",
  ],
  limitsNote:
    "A cool-down or self-exclusion you start here is stored on your account, so signing out " +
    "or reinstalling does not clear it.",
} as const;

/** Legal routes, kept in one place so no screen invents a URL. */
export const LEGAL_URLS = {
  terms: "https://www.galaxysportsedge.com/terms",
  privacy: "https://www.galaxysportsedge.com/privacy",
  disclosure: "https://www.galaxysportsedge.com/how-we-make-money",
  methodology: "https://www.galaxysportsedge.com/methodology",
  integrity: "https://www.galaxysportsedge.com/integrity",
  verify: "https://www.galaxysportsedge.com/verify",
} as const;