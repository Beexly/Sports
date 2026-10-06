/** Closed record, recounted against public nflverse files on 4 Oct 2026. */

export const LAWS = [
  {
    id: "01",
    name: "Null is null",
    text: "A missing cell stays missing. Absence is not healthy, not injured, and not a draw from a prior.",
  },
  {
    id: "02",
    name: "Grain is a contract",
    text: "A season rate is not a snap. A weekly mean is a prior with an error bar. It does not fill a play.",
  },
  {
    id: "03",
    name: "No pick",
    text: "The estimator reports a partial label. It does not emit a pick. Uncertainty is not a rounding error.",
  },
  {
    id: "04",
    name: "CPU owns the score",
    text: "Local CPU owns isotonic, Brier, and closing-line value. τ̂ is named in the record and not defined. Keel will not invent the definition.",
  },
  {
    id: "05",
    name: "Cheapest reviewer first",
    text: "NVIDIA NIM, then Together under a weekly cap. Empty content is a miss. No rented card until 200 settled closing-line rows.",
  },
] as const;

export const SEAL = {
  pulledAt: "2026-10-04",
  injuriesFile: "injuries_2026.csv.gz",
  injuriesBytes: 21152,
  injuriesRows: 1052,
  injuriesWeeks: { "1": 182, "2": 251, "3": 301, "4": 318 } as Record<string, number>,
  week4Rows: 318,
  week4Ol: 41,
  week4OlOut: 15,
  season2025Rows: 6068,
  season2025Ol: 1086,
  pitWeek4Ol: 0,
  updateContract: "07:00 UTC",
  ngsCombined: "ngs_passing.csv.gz",
  ngsCombinedBytes: 596642,
  ngsCombinedUpdated: "2026-10-04T12:58:28Z",
  ngsStub: "ngs_2024_passing.csv.gz",
  ngsStubBytes: 616,
  ngsWeek4Passers: 2,
  watsonGsis: "00-0033537",
  watsonSeasonTtt: "2.79401739130435",
  watsonSeasonAttempts: "115",
  rodgersGsis: "00-0023459",
  rodgersWeek4Ttt: "2.81135",
  rodgersWeek4Attempts: "40",
  illegalFixture: "2.1",
} as const;

export const WATSON_WEEKS = [
  { week: "0", grain: "season", ttt: "2.79401739130435", attempts: "115" },
  { week: "1", grain: "week", ttt: "3.04322727272727", attempts: "22" },
  { week: "2", grain: "week", ttt: "2.55256666666667", attempts: "30" },
  { week: "3", grain: "week", ttt: "3.16786666666667", attempts: "30" },
  { week: "4", grain: "week", ttt: "2.50751515151515", attempts: "33" },
] as const;

export const CLEVELAND_WEEK4 = [
  {
    name: "Elgton Jenkins",
    pos: "C",
    report: "Out",
    practice: "Did Not Participate In Practice",
    reportInjury: "Concussion",
    practiceInjury: "Concussion",
  },
  {
    name: "Teven Jenkins",
    pos: "G",
    report: "Out",
    practice: "Limited Participation in Practice",
    reportInjury: "Back",
    practiceInjury: "Back",
  },
  {
    name: "Tytus Howard",
    pos: "T",
    report: "",
    practice: "Full Participation in Practice",
    reportInjury: "",
    practiceInjury: "Knee",
  },
] as const;

export const SHIPS = {
  name: "Fourth-down estimator",
  comparator: "win-probability-max",
  liftPp: 6.77,
  decisions: 3988,
  brier: 0.1621,
  brierBaseline: 0.1748,
  drives: 306,
} as const;

export function brierDelta() {
  return SHIPS.brierBaseline - SHIPS.brier;
}

export function brierSkill() {
  return 1 - SHIPS.brier / SHIPS.brierBaseline;
}

export const COST = {
  loraCount: 3,
  loraTotalPriceRaw: "4000000000",
  loraEachIfNanodollars: 4,
  h100Hourly: 3.99,
  h100Day: 95.76,
  nimRpm: 40,
  nimDaily: 10000,
  enterprisePerGpuYear: 4500,
  togetherWeekCap: 20,
  togetherIn: 0.15,
  togetherOut: 0.6,
  clvRowsRequired: 200,
  qwenMissTokens: 220,
} as const;

export const HUNT_PLAN = [
  {
    id: "fourth",
    label: "Fourth down under uncertainty",
    arxiv: 'all:"fourth down" OR (all:"win probability" AND all:football)',
    openalex: "fourth down football win probability bootstrap uncertainty",
  },
  {
    id: "calibration",
    label: "Calibration that can hurt a proper score",
    arxiv: '(ti:isotonic OR ti:"conformal prediction" OR ti:calibration) AND (abs:Brier OR abs:"proper scoring" OR abs:isotonic)',
    openalex: "isotonic regression conformal prediction Brier calibration",
  },
  {
    id: "decision",
    label: "Decision-focused learning",
    arxiv: 'all:"decision-focused learning" OR all:"predict-then-optimize" OR all:"SPO loss"',
    openalex: "decision-focused learning smart predict then optimize regret",
  },
  {
    id: "support",
    label: "Change of grain",
    arxiv: 'all:"change of support" OR all:"ecological fallacy" OR all:"ecological inference"',
    openalex: "change of support ecological inference aggregation bias multilevel",
  },
  {
    id: "market",
    label: "Closing line and the Shin de-vig",
    arxiv: 'all:"favourite-longshot" OR all:"favorite-longshot" OR (all:"closing line" AND all:betting)',
    openalex: "Shin method favourite longshot bias closing odds betting",
  },
  {
    id: "injury",
    label: "Weekly injury as a covariate, not a snap",
    arxiv: '(all:NFL OR all:football) AND all:injury AND (all:prediction OR all:"offensive line" OR all:quarterback)',
    openalex: "NFL injury report offensive line quarterback outcome model",
  },
  {
    id: "kaggle",
    label: "Kaggle and the Big Data Bowl, historical grain only",
    arxiv: 'all:"big data bowl" OR (all:kaggle AND all:NFL) OR (all:"player tracking" AND all:football)',
    openalex: "NFL Big Data Bowl Kaggle player tracking historical plays",
  },
  {
    id: "datasets",
    label: "Public NFL tables and the grain they actually have",
    arxiv: '(all:nflverse OR all:"expected points" OR all:"play-by-play") AND (all:NFL OR all:football) AND (all:reproducibility OR all:dataset)',
    openalex: "nflverse play-by-play expected points dataset reproducibility football",
  },
] as const;
