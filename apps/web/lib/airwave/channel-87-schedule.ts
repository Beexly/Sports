/**
 * Airwave Intelligence Intake — Channel 87 Schedule Contract.
 *
 * SiriusXM Channel 87 (Fantasy Sports Radio) is the primary satellite-radio
 * intelligence source for Galaxy Sports Edge and Galaxy Sports Network.
 *
 * KEY CONSTRAINTS (enforced in code + tests):
 *   1. Channel 87 capture window is 05:00–23:00 CT only.
 *   2. Schedule data is OPERATOR-PROVIDED / MANUAL. This module defines the
 *      contract and sample placeholders only — no scraping of SiriusXM
 *      schedules, no automated endpoint calls.
 *   3. Show blocks are read-only data structures. No capture happens here.
 *   4. All schedule fixtures are marked SAMPLE/MANUAL until an operator
 *      provides verified schedule data.
 */

export const CH87_CHANNEL_NUMBER = 87 as const;
export const CH87_CHANNEL_NAME = "SiriusXM Fantasy Sports Radio" as const;
export const CH87_TIMEZONE = "America/Chicago" as const;

/** Capture window: 05:00–23:00 Central Time. */
export const CH87_WINDOW = { startHour: 5, endHour: 23 } as const;

export type ShowRightsStatus =
  | "OPERATOR_NOTED"
  | "MANUAL_IMPORT_ONLY"
  | "HELD"
  | "LEGAL_REVIEW_REQUIRED";

export type ShowSourceConfidence =
  | "OPERATOR_PROVIDED"
  | "MANUALLY_VERIFIED"
  | "SAMPLE_PLACEHOLDER"
  | "UNVERIFIED";

export type ShowBlock = {
  /** Unique show identifier (internal slug). */
  readonly showId: string;
  readonly showName: string;
  /** Start time in CT as "HH:MM" 24-hour format. */
  readonly startsAtCt: string;
  /** End time in CT as "HH:MM" 24-hour format. */
  readonly endsAtCt: string;
  /** Start hour (0–23) for window comparison. */
  readonly startHour: number;
  /** End hour (0–23) for window comparison. */
  readonly endHour: number;
  readonly expectedHosts: readonly string[];
  readonly sportFocus: readonly string[];
  readonly fantasyFocus: boolean;
  readonly bettingRelevance: boolean;
  /** Confidence level in the accuracy of this schedule data. */
  readonly sourceConfidence: ShowSourceConfidence;
  /** Whether operator must review before any extracted claims go to review queue. */
  readonly manualReviewRequired: boolean;
  readonly rightsStatus: ShowRightsStatus;
  readonly operatorNotes: string;
};

export type Channel87ScheduleContract = {
  readonly channelNumber: typeof CH87_CHANNEL_NUMBER;
  readonly channelName: typeof CH87_CHANNEL_NAME;
  readonly timezone: typeof CH87_TIMEZONE;
  readonly window: typeof CH87_WINDOW;
  readonly scheduleSource: "OPERATOR_PROVIDED_MANUAL";
  readonly scheduleLocked: false;
  readonly shows: readonly ShowBlock[];
  readonly policy: {
    readonly canScrapeSchedule: false;
    readonly canAutoCapture: false;
    readonly requiresLegalAck: true;
    readonly requiresOperatorReview: true;
    readonly manualImportOnly: true;
  };
  readonly complianceNote: string;
  readonly nextOperatorAction: string;
};

/** Returns true when the given CT hour falls within the CH87 capture window. */
export function isWithinChannel87Window(hourCt: number): boolean {
  return hourCt >= CH87_WINDOW.startHour && hourCt < CH87_WINDOW.endHour;
}

/**
 * Validate a ShowBlock for required fields and time integrity.
 * Returns an array of validation errors (empty if valid).
 */
export function validateShowBlock(block: ShowBlock): string[] {
  const errors: string[] = [];

  if (!block.showId || block.showId.trim().length === 0) {
    errors.push("showId is required.");
  }
  if (!block.showName || block.showName.trim().length === 0) {
    errors.push("showName is required.");
  }
  if (!block.startsAtCt || !/^\d{2}:\d{2}$/.test(block.startsAtCt)) {
    errors.push("startsAtCt must be HH:MM format.");
  }
  if (!block.endsAtCt || !/^\d{2}:\d{2}$/.test(block.endsAtCt)) {
    errors.push("endsAtCt must be HH:MM format.");
  }
  if (errors.length === 0 && block.startHour >= block.endHour) {
    errors.push("startHour must be before endHour.");
  }
  if (!isWithinChannel87Window(block.startHour)) {
    errors.push(
      `Show start hour ${block.startHour} is outside the 05:00-23:00 CT capture window.`,
    );
  }
  if (block.rightsStatus === "HELD" || block.rightsStatus === "LEGAL_REVIEW_REQUIRED") {
    if (!block.manualReviewRequired) {
      errors.push("Shows with HELD or LEGAL_REVIEW_REQUIRED rights must have manualReviewRequired=true.");
    }
  }

  return errors;
}

/** Sort show blocks by start hour, then by show name. */
export function sortShowBlocks(blocks: readonly ShowBlock[]): readonly ShowBlock[] {
  return [...blocks].sort((a, b) => {
    if (a.startHour !== b.startHour) return a.startHour - b.startHour;
    return a.showName.localeCompare(b.showName);
  });
}

/**
 * Returns the show block currently airing at the given Date.
 * Returns undefined if no show is scheduled or the hour is outside the window.
 */
export function getCurrentShowBlock(
  blocks: readonly ShowBlock[],
  date: Date,
): ShowBlock | undefined {
  const hourCt = date.getUTCHours(); // caller is responsible for CT offset
  if (!isWithinChannel87Window(hourCt)) return undefined;
  return blocks.find((block) => hourCt >= block.startHour && hourCt < block.endHour);
}

/**
 * Returns the next show block after the given Date.
 * Returns undefined if no future show block is found in the schedule.
 */
export function getNextShowBlock(
  blocks: readonly ShowBlock[],
  date: Date,
): ShowBlock | undefined {
  const hourCt = date.getUTCHours();
  const sorted = sortShowBlocks(blocks);
  return sorted.find((block) => block.startHour > hourCt);
}

export type Channel87ScheduleSummary = {
  readonly channelNumber: number;
  readonly channelName: string;
  readonly timezone: string;
  readonly windowOpen: boolean;
  readonly currentShow: ShowBlock | undefined;
  readonly nextShow: ShowBlock | undefined;
  readonly totalShows: number;
  readonly sampleOnlyShows: number;
  readonly heldShows: number;
  readonly scheduleSource: string;
  readonly requiresLegalAck: true;
  readonly operatorNote: string;
};

/** Summarize the CH87 schedule state for a given date. */
export function summarizeChannel87Schedule(
  blocks: readonly ShowBlock[],
  date: Date,
): Channel87ScheduleSummary {
  const hourCt = date.getUTCHours();
  const windowOpen = isWithinChannel87Window(hourCt);
  const currentShow = getCurrentShowBlock(blocks, date);
  const nextShow = getNextShowBlock(blocks, date);
  const sampleOnlyShows = blocks.filter(
    (b) => b.sourceConfidence === "SAMPLE_PLACEHOLDER",
  ).length;
  const heldShows = blocks.filter(
    (b) => b.rightsStatus === "HELD" || b.rightsStatus === "LEGAL_REVIEW_REQUIRED",
  ).length;

  return {
    channelNumber: CH87_CHANNEL_NUMBER,
    channelName: CH87_CHANNEL_NAME,
    timezone: CH87_TIMEZONE,
    windowOpen,
    currentShow,
    nextShow,
    totalShows: blocks.length,
    sampleOnlyShows,
    heldShows,
    scheduleSource: "OPERATOR_PROVIDED_MANUAL",
    requiresLegalAck: true,
    operatorNote:
      sampleOnlyShows > 0
        ? "Schedule contains SAMPLE_PLACEHOLDER blocks. Replace with operator-verified data before enabling intake."
        : "Schedule is operator-provided. Verify before enabling intake.",
  };
}

/**
 * Sample/manual show blocks for CH87.
 * These are ILLUSTRATIVE ONLY — marked SAMPLE_PLACEHOLDER.
 * Replace with operator-verified schedule data.
 */
const SAMPLE_CH87_SHOWS: readonly ShowBlock[] = [
  {
    showId: "ch87-morning-drive",
    showName: "Morning Drive (Sample)",
    startsAtCt: "06:00",
    endsAtCt: "10:00",
    startHour: 6,
    endHour: 10,
    expectedHosts: ["[Sample Host A]", "[Sample Host B]"],
    sportFocus: ["NFL", "NBA", "MLB"],
    fantasyFocus: true,
    bettingRelevance: true,
    sourceConfidence: "SAMPLE_PLACEHOLDER",
    manualReviewRequired: true,
    rightsStatus: "MANUAL_IMPORT_ONLY",
    operatorNotes:
      "SAMPLE PLACEHOLDER. Replace with verified CH87 morning show data. Capture held pending legal acknowledgement.",
  },
  {
    showId: "ch87-midday",
    showName: "Midday Fantasy (Sample)",
    startsAtCt: "10:00",
    endsAtCt: "14:00",
    startHour: 10,
    endHour: 14,
    expectedHosts: ["[Sample Host C]"],
    sportFocus: ["NFL", "DFS"],
    fantasyFocus: true,
    bettingRelevance: false,
    sourceConfidence: "SAMPLE_PLACEHOLDER",
    manualReviewRequired: true,
    rightsStatus: "MANUAL_IMPORT_ONLY",
    operatorNotes:
      "SAMPLE PLACEHOLDER. Replace with verified CH87 midday show data. Capture held pending legal acknowledgement.",
  },
  {
    showId: "ch87-afternoon-lines",
    showName: "Afternoon Lines (Sample)",
    startsAtCt: "14:00",
    endsAtCt: "18:00",
    startHour: 14,
    endHour: 18,
    expectedHosts: ["[Sample Host D]"],
    sportFocus: ["NFL", "NBA"],
    fantasyFocus: false,
    bettingRelevance: true,
    sourceConfidence: "SAMPLE_PLACEHOLDER",
    manualReviewRequired: true,
    rightsStatus: "MANUAL_IMPORT_ONLY",
    operatorNotes:
      "SAMPLE PLACEHOLDER. Replace with verified CH87 afternoon show data. Capture held pending legal acknowledgement.",
  },
  {
    showId: "ch87-evening-debrief",
    showName: "Evening Debrief (Sample)",
    startsAtCt: "18:00",
    endsAtCt: "22:00",
    startHour: 18,
    endHour: 22,
    expectedHosts: ["[Sample Host E]", "[Sample Host F]"],
    sportFocus: ["NFL", "NBA", "MLB", "College"],
    fantasyFocus: true,
    bettingRelevance: true,
    sourceConfidence: "SAMPLE_PLACEHOLDER",
    manualReviewRequired: true,
    rightsStatus: "MANUAL_IMPORT_ONLY",
    operatorNotes:
      "SAMPLE PLACEHOLDER. Replace with verified CH87 evening show data. Capture held pending legal acknowledgement.",
  },
];

/**
 * Build the full Channel 87 schedule contract.
 * Returns the contract with sample show blocks until operator-verified data is provided.
 */
export function createChannel87ScheduleContract(): Channel87ScheduleContract {
  return {
    channelNumber: CH87_CHANNEL_NUMBER,
    channelName: CH87_CHANNEL_NAME,
    timezone: CH87_TIMEZONE,
    window: CH87_WINDOW,
    scheduleSource: "OPERATOR_PROVIDED_MANUAL",
    scheduleLocked: false,
    shows: SAMPLE_CH87_SHOWS,
    policy: {
      canScrapeSchedule: false,
      canAutoCapture: false,
      requiresLegalAck: true,
      requiresOperatorReview: true,
      manualImportOnly: true,
    },
    complianceNote:
      "Channel 87 (SiriusXM Fantasy Sports Radio) is a satellite radio source. " +
      "No scraping of schedule data. No automated capture. No DRM bypass. No stream ripping. " +
      "Founder personal subscription for live listening only. " +
      "Notes imported manually via the spreadsheet contract. " +
      "Legal acknowledgement (AIRWAVE_SIRIUSXM_LEGAL_ACK) required before any claim extraction.",
    nextOperatorAction:
      "Replace SAMPLE_PLACEHOLDER show blocks with verified CH87 schedule data. " +
      "Set AIRWAVE_SIRIUSXM_LEGAL_ACK after legal review. " +
      "Import founder notes via CSV/TSV using the spreadsheet contract.",
  };
}
