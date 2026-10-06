import type { Finding, RawHit, Verdict } from "@/lib/types";

const REJECT_NOISE =
  /for beginners|getting started|tutorial|fantasy football draft|chatgpt|always wins|guaranteed lock|easy money|step-by-step guide/;

const FILLS_NULL =
  /imput\w+ (the )?(mean|median|zero|average)|fill\w* missing (with|using)|assume[sd]? healthy|not listed (means|as) healthy|time to throw[^.]{0,40}2\.1|constant time-to-throw|fixture value 2\.1/;

function grainOf(text: string): string {
  if (/play-by-play|play-level|per-play|tracking data|frame-level|10 hz/.test(text)) return "play";
  if (/player-week|week-level|weekly average|weekly mean/.test(text)) return "week";
  if (/season-long|season aggregate|season rate|season-level/.test(text)) return "season";
  if (/closing line|betting market|decimal odds|sportsbook/.test(text)) return "market";
  if (/scoring rule|calibration|conformal|isotonic|regret|decision-focused/.test(text)) return "theory";
  if (/fourth[- ]down|win probability/.test(text)) return "decision";
  return "unspecified";
}

function joinOf(text: string): string {
  if (/gsis/.test(text)) return "gsis_id";
  if (/game_id|play_id|tracking/.test(text)) return "game_id + play_id";
  if (/player-week|weekly/.test(text)) return "player × week";
  return "none";
}

function pack(
  hit: RawHit,
  verdict: Verdict,
  law: string,
  why: string,
  equation: string | null,
): Omit<Finding, "foundAt" | "origin"> {
  const text = `${hit.title} ${hit.abstract}`.toLowerCase();
  return {
    id: hit.id,
    title: hit.title,
    authors: hit.authors,
    year: hit.year,
    venue: hit.venue,
    url: hit.url,
    abstract: hit.abstract,
    verdict,
    grain: grainOf(text),
    join: joinOf(text),
    law,
    why,
    equation,
    lane: hit.lane,
  };
}

export function canonUrl(url: string) {
  const abs = url.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d+)(?:v\d+)?/i);
  if (abs) return `arxiv:${abs[1]}`;
  const doi = url.match(/doi\.org\/(10\.\S+)/i);
  if (doi) return `doi:${decodeURIComponent(doi[1]).replace(/\/$/, "").toLowerCase()}`;
  return url.replace(/\/$/, "").toLowerCase();
}

export function scoreHit(hit: RawHit): Omit<Finding, "foundAt" | "origin"> {
  const text = `${hit.title} ${hit.abstract}`.toLowerCase();

  if (REJECT_NOISE.test(text)) {
    return pack(
      hit,
      "reject",
      "01",
      "Noise. A beginner walkthrough or a lock does not enter the feed.",
      null,
    );
  }

  if (FILLS_NULL.test(text)) {
    return pack(
      hit,
      "reject",
      "01",
      "This would fill a null. A recorded absence is not a license to invent a value, and 2.1 is not a legal time-to-throw.",
      null,
    );
  }

  if (/\bimput/.test(text) && /injur|offensive line|time-to-throw|time to throw|missing/.test(text)) {
    return pack(
      hit,
      "hold",
      "01",
      "This proposes filling a missing cell. Hold the method. Do not apply it. A missing offensive line stays null.",
      null,
    );
  }

  if (/616-byte|616 byte|do not use it/.test(text) && /ngs_2024/.test(text)) {
    return pack(hit, "reject", "02", "The single-year 2024 NGS file is a stub. Do not use it.", null);
  }

  if (/fourth[- ]down/.test(text) && /uncertain|bootstrap|humility|confidence interval|abstain/.test(text)) {
    return pack(
      hit,
      "admit",
      "03",
      "Admitted to the decision shelf. Uncertainty belongs in the fourth-down procedure. This still does not emit a pick.",
      "Recommend a only when it beats every alternative under the uncertainty set; otherwise abstain.",
    );
  }

  if (/fourth[- ]down/.test(text)) {
    return pack(
      hit,
      "hold",
      "03",
      "Fourth-down work is on the problem, but a new point-estimate policy is not automatically feed. The shipped comparator is already win-probability-max.",
      null,
    );
  }

  if (/decision-focused|predict-then-optimize|smart predict|spo\+/.test(text)) {
    return pack(
      hit,
      "admit",
      "03",
      "Admitted as the reason a decision lift and a Brier score can move apart. It does not start a fourth training job, and it does not name the estimator's unpublished objective.",
      "regret(θ̂) = cost(decision(θ̂)) − cost(decision(θ))",
    );
  }

  if (/proper scoring|brier|conformal|venn-abers|beta calibration/.test(text) ||
      (/isotonic/.test(text) && /calibrat|brier|forecast|classifier|scoring rule|probability estimat/.test(text))) {
    const brake = /degrad|hurt|worse/.test(text)
      ? " This abstract reports that a calibrator can worsen a proper score. Check the 306-drive holdout before replacing the map."
      : " Owned by local CPU. Apply only if the 306-drive Brier does not get worse.";
    return pack(
      hit,
      "admit",
      "04",
      `Admitted to the scoring shelf.${brake}`,
      "BS = (1/n) Σ (p − y)²",
    );
  }

  if (/change of support|ecological fallacy|ecological inference|modifiable areal/.test(text)) {
    return pack(
      hit,
      "admit",
      "02",
      "Admitted as the law of grain. A weekly injury or a season time-to-throw may shift a prior. It may not be written into a play.",
      null,
    );
  }

  if (/favourite-longshot|favorite-longshot|closing line|shin method|devig|de-vig/.test(text)) {
    return pack(
      hit,
      "admit",
      "05",
      "Admitted to the closing-line shelf. It does not rent a card. The gate stays shut until 200 settled rows exist, and one spread column is not those rows.",
      "CLV = d_bet / d_close − 1",
    );
  }

  if (/win probability/.test(text) && /football|nfl/.test(text)) {
    return pack(
      hit,
      "hold",
      "03",
      "Win-probability point estimates are the baseline the estimator is already compared with. Another one is not a feature.",
      null,
    );
  }

  if (/time to throw|time-to-throw|next gen stats|avg_time_to_throw/.test(text)) {
    return pack(
      hit,
      "hold",
      "02",
      "Time-to-throw at week or season grain is a prior with an error bar. It is not a snap, and it does not validate Gate 3.",
      null,
    );
  }

  if (/big data bowl|player tracking|next gen stats tracking/.test(text)) {
    return pack(
      hit,
      "hold",
      "02",
      "Historical tracking can time a release on game_id and play_id for competition seasons. That key does not fill the 2026 public play-level cell.",
      null,
    );
  }

  if ((/injury/.test(text) && /nfl|football|offensive line|quarterback/.test(text))) {
    return pack(
      hit,
      "hold",
      "02",
      "Injury information is weekly unless the paper proves otherwise. Join on a player id when the row exists. Do not impute the weeks it does not.",
      null,
    );
  }

  if (/kaggle/.test(text) && /nfl|football/.test(text)) {
    return pack(
      hit,
      "hold",
      "02",
      "A dataset is not feed until its grain and its key are named. Hold it beside the seal.",
      null,
    );
  }

  return pack(
    hit,
    "reject",
    "01",
    "No gate in the closed record can use this. It does not enter the feed.",
    null,
  );
}
