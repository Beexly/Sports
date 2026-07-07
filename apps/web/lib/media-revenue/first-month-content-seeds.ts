export type FirstMonthWeeklySeed = {
  readonly week: number;
  readonly longVideos: readonly string[];
  readonly shorts: readonly string[];
  readonly newsletter: string;
  readonly founderBuildLog: string;
  readonly boardMeeting: string;
};

export const FIRST_WEEK_LONG_VIDEO_TITLES = [
  "Confidence Is Not Probability - Why Most Sports Prediction Sites Mislead You",
  "I am Building a Sports AI That Is Allowed to Say No",
] as const;

export const FIRST_WEEK_SHORT_TITLES = [
  "No bet is a position.",
  "Why stale odds break trust.",
  "The line moved. That does not mean edge.",
  "Box score lied: targets are not role.",
  "Most models fail because they cannot say I do not know.",
  "What GSE refuses to do.",
  "Why I am building this in public.",
  "Market Mirage in 60 seconds.",
  "Loss autopsy > fake win-rate screenshots.",
  "The sports data business in one sentence.",
] as const;

export const FIRST_MONTH_WEEKLY_SEEDS: readonly FirstMonthWeeklySeed[] = [
  {
    boardMeeting: "The First GSE Board Meeting.",
    founderBuildLog: "Building GSE under pressure without lowering the evidence bar.",
    longVideos: FIRST_WEEK_LONG_VIDEO_TITLES,
    newsletter: "The First GSE Board Meeting.",
    shorts: FIRST_WEEK_SHORT_TITLES,
    week: 1,
  },
  {
    boardMeeting: "GSE Board Meeting 2 - What shipped, what blocked, what stayed manual.",
    founderBuildLog: "The week the workflow started saying no on purpose.",
    longVideos: ["Why Raw Sports Data Is Not Intelligence", "The No-Bet Governor Is a Feature, Not a Bug"],
    newsletter: "Board Notes 2 - Source rights before loud opinions.",
    shorts: [
      "Raw data is not intelligence.",
      "A stale source can poison a good model.",
      "No-bet pressure is not weakness.",
      "Confidence is earned after calibration.",
      "Role beats box score when the sample is honest.",
      "Public narrative heat is not evidence.",
      "A partner cannot buy model control.",
      "Source rights come before charts.",
      "Market Mirage starts with freshness.",
      "Decision quality is not win probability.",
    ],
    week: 2,
  },
  {
    boardMeeting: "GSE Board Meeting 3 - The audit trail is the product.",
    founderBuildLog: "How the repo became the media operating system.",
    longVideos: ["How GSE Turns a Loss Into an Autopsy", "Sports Data APIs Sell Reliability Before Predictions"],
    newsletter: "Board Notes 3 - The evidence chain from data to content.",
    shorts: [
      "A win can still be a bad decision.",
      "Loss autopsy beats highlight reels.",
      "A model should explain why it passed.",
      "Protected weights stay protected.",
      "Public claims need public evidence.",
      "The box score is a first draft.",
      "Line movement is context, not command.",
      "Good sponsors respect editorial independence.",
      "Calibration debt has a cost.",
      "The board can say wait.",
    ],
    week: 3,
  },
  {
    boardMeeting: "GSE Board Meeting 4 - What gets promoted, what stays shadow.",
    founderBuildLog: "The first month of proof, pressure, and restraint.",
    longVideos: [
      "The Sports Prediction Site That Refuses Fake Certainty",
      "Building a Partner-Ready Sports Intelligence Company",
    ],
    newsletter: "Board Notes 4 - The first month operating review.",
    shorts: [
      "Shadow mode protects trust.",
      "A good API should not leak raw payloads.",
      "The model is allowed to be uncertain.",
      "No public probability without calibration evidence.",
      "Partner fit starts with boundaries.",
      "A dashboard is not a claim.",
      "The cleanest signal can still be a pass.",
      "Audience trust compounds slowly.",
      "GSE sells discipline, not noise.",
      "The next month starts with review.",
    ],
    week: 4,
  },
] as const;

export const FIRST_MONTH_DAILY_WATCH_TOPICS = [
  "source freshness before action",
  "market movement quality",
  "role signal versus box score",
  "injury-context caution",
  "calibration debt",
  "model disagreement",
  "weather and total movement",
  "public narrative pressure",
  "player usage truth",
  "no-bet governor review",
] as const;
