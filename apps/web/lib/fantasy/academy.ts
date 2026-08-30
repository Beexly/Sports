/**
 * The GM Academy — a real curriculum, not a quiz.
 *
 * Drills are graded on the quality of the REASONING (sound / thin / unsound) with
 * feedback that teaches the underlying pattern — the same patterns the GM Ledger
 * grades. The curriculum spans four tracks and three difficulty tiers, and runs
 * up to a level a 20-year bettor/analyst will feel: market structure and CLV,
 * regression and variance, Bayesian updating, and an injury decoder that reads
 * what a designation ACTUALLY means — mechanism, surgery, recovery window, and
 * performance on return.
 *
 * Educational only; not medical, legal, or betting advice. Pure, illustrative.
 */

export type ProcessVerdict = "sound" | "thin" | "unsound";
export type Track = "Process" | "Market" | "Analytics" | "Injury";
export type Difficulty = "Core" | "Advanced" | "Pro";

export const TRACKS: readonly Track[] = ["Process", "Market", "Analytics", "Injury"];

export type DrillOption = {
  readonly id: string;
  readonly label: string;
  readonly verdict: ProcessVerdict;
  readonly feedback: string;
};

export type Drill = {
  readonly id: string;
  readonly track: Track;
  readonly difficulty: Difficulty;
  readonly pattern: string;
  readonly principle: string;
  readonly scenario: string;
  readonly question: string;
  readonly options: readonly DrillOption[];
};

export const DRILLS: readonly Drill[] = [
  // ─────────────── PROCESS (Core) ───────────────
  {
    id: "process-over-outcome", track: "Process", difficulty: "Core",
    pattern: "Process over outcome", principle: "Grade the decision against what was knowable, not the result.",
    scenario: "You benched a WR in a brutal shadow-corner matchup with rain in the forecast. He broke one long touchdown anyway and you lost by 4.",
    question: "How should you log this decision?",
    options: [
      { id: "a", label: "Sound call, bad beat. I'd do it again", verdict: "sound", feedback: "Right. The matchup and weather both pointed down; a low-probability outcome hit. Repeat the process and the math wins over a season." },
      { id: "b", label: "Terrible call. Never bench him again", verdict: "unsound", feedback: "Outcome bias. Learning 'never bench him' from one variance result makes your next decision worse." },
      { id: "c", label: "Should've started him for the ceiling", verdict: "thin", feedback: "Defensible only if you specifically needed a ceiling. But with the floor read you had, the bench was higher-EV." },
    ],
  },
  {
    id: "faab-discipline", track: "Process", difficulty: "Core",
    pattern: "FAAB discipline", principle: "Pay for confirmed role and opportunity, not for last week's points.",
    scenario: "A backup RB exploded for 140 yards in a blowout, but the starter is healthy and returns next week. A different RB just inherited a confirmed lead role after an injury but scored quietly.",
    question: "Where does the bigger FAAB bid go?",
    options: [
      { id: "a", label: "The confirmed lead role", verdict: "sound", feedback: "Yes. You're buying repeatable opportunity, not a non-repeatable blowout script." },
      { id: "b", label: "The 140-yard back", verdict: "unsound", feedback: "Chasing points. The starter's return erases the role; you'd pay a premium for a number that won't recur." },
      { id: "c", label: "Small darts on both", verdict: "thin", feedback: "Spreading thin can miss the one that matters. The confirmed role deserves real budget." },
    ],
  },
  {
    id: "recency-bias", track: "Process", difficulty: "Core",
    pattern: "Recency bias", principle: "One game is noise; usage and role are the signal.",
    scenario: "A WR you roster posted 3 catches for 22 yards, his worst game of the year. His target share and route participation were actually up.",
    question: "What do you do?",
    options: [
      { id: "a", label: "Hold. The underlying usage is strong", verdict: "sound", feedback: "Targets and routes are sticky and predictive; a low box score in a strong-usage week is a buy signal, not a sell." },
      { id: "b", label: "Bench or drop him after that dud", verdict: "unsound", feedback: "Recency bias: selling the bottom on rising usage because of one noisy result." },
      { id: "c", label: "Shop him before he busts again", verdict: "thin", feedback: "You'd likely be selling the player you should keep. Only move him for clear value." },
    ],
  },
  {
    id: "bye-planning", track: "Process", difficulty: "Core",
    pattern: "Bye-week planning", principle: "A known bye stack is a solvable problem if you act early.",
    scenario: "It's Week 5. Three starters share a Week 7 bye. A streamable bench piece is available now; a slightly better one will likely be there next week.",
    question: "When do you address the Week 7 hole?",
    options: [
      { id: "a", label: "Secure coverage now", verdict: "sound", feedback: "Right. Act early on a known exposure; waiting lets a rival take your fill-in." },
      { id: "b", label: "Wait and stream in Week 7", verdict: "unsound", feedback: "Procrastinating a known risk. By Week 7 the best streamers are gone." },
      { id: "c", label: "Wait one week for the upgrade", verdict: "thin", feedback: "A reasonable gamble if the upgrade is real and likely available, but it adds risk to a solvable problem." },
    ],
  },
  {
    id: "calibration", track: "Process", difficulty: "Advanced",
    pattern: "Calibration", principle: "Confidence should match the evidence: earned, not felt.",
    scenario: "You feel 80% sure a boom/bust WR 'has a big week coming,' but there's no usage, matchup, or role edge behind the feeling.",
    question: "How confident should that start actually be?",
    options: [
      { id: "a", label: "Closer to a coin flip. The conviction isn't earned", verdict: "sound", feedback: "With no evidentiary edge, an 80% feeling is miscalibrated. Naming the true uncertainty is the skill." },
      { id: "b", label: "80%. Trust the gut, you watch film", verdict: "unsound", feedback: "Overconfidence with no supporting signal is exactly what calibration scoring punishes over time." },
      { id: "c", label: "Start him but size it as a volatile dart", verdict: "thin", feedback: "Starting the upside can be fine. Just call it a dart, not an 80%-conviction play." },
    ],
  },
  {
    id: "injury-contingency", track: "Process", difficulty: "Advanced",
    pattern: "Injury contingency", principle: "A questionable tag is a known tail risk. Hedge it before kickoff.",
    scenario: "Your star is 'questionable' but practiced fully Friday and the beat writer expects him to play. Kickoff is the early window.",
    question: "What's the right move?",
    options: [
      { id: "a", label: "Plan to start him, but queue a healthy contingency", verdict: "sound", feedback: "Lean on the information (likely plays) while hedging the known tail (a warmup scratch costs you a zero)." },
      { id: "b", label: "Start him and don't worry about it", verdict: "unsound", feedback: "Under-hedging a known risk. An early-window scratch can leave you with an empty slot." },
      { id: "c", label: "Bench him to be safe", verdict: "thin", feedback: "Over-correcting. The evidence says he plays; benching a star on a low tail risk leaves real points on the bench." },
    ],
  },

  // ─────────────── MARKET / SPORTSBOOK ───────────────
  {
    id: "clv-truth", track: "Market", difficulty: "Advanced",
    pattern: "Closing line value", principle: "CLV is the process metric; a single result is noise.",
    scenario: "You bet a team at −3. By kickoff the market closed −4.5. You lost the game outright.",
    question: "What's the correct read on this bet?",
    options: [
      { id: "a", label: "Good bet. You beat the close by 1.5 points", verdict: "sound", feedback: "Correct. Beating the closing line is the strongest public proxy for long-run edge; the single result tells you almost nothing about the decision." },
      { id: "b", label: "Bad bet. You lost, the number was wrong", verdict: "unsound", feedback: "Pure outcome bias. The closing line moved toward you, which is exactly the signal you want; results are high-variance." },
      { id: "c", label: "Can't say without more bets", verdict: "thin", feedback: "True that one data point isn't a track record. But on THIS bet, beating the close is a clearly positive process signal, not a shrug." },
    ],
  },
  {
    id: "no-vig", track: "Market", difficulty: "Pro",
    pattern: "Removing the vig", principle: "The price you're paid is not the probability you need.",
    scenario: "A two-way market is −110 / −110. A friend says 'it's a coin flip, so −110 prints on a 51% edge.'",
    question: "What's the break-even, and is he right?",
    options: [
      { id: "a", label: "Break-even ≈ 52.4%; a true 51% side is a LOSER at −110", verdict: "sound", feedback: "Exactly. −110 implies ~52.4% break-even after vig. A 51% edge doesn't clear the juice; you need to beat 52.4%, not 50%." },
      { id: "b", label: "Break-even is 50%; 51% prints", verdict: "unsound", feedback: "That ignores the vig entirely. −110/−110 isn't a fair coin flip price; the hold is built into both sides." },
      { id: "c", label: "Depends on the book's hold", verdict: "thin", feedback: "The hold matters in general, but −110/−110 is a specific, known ~4.5% two-way hold → ~52.4% break-even. The answer is computable here." },
    ],
  },
  {
    id: "steam-trap", track: "Market", difficulty: "Pro",
    pattern: "Steam vs. origination", principle: "Being right about direction is worthless if the value is already gone.",
    scenario: "A total screams from 44 to 47.5 on heavy money an hour before kickoff. You agree it should be higher.",
    question: "Do you bet the over at 47.5?",
    options: [
      { id: "a", label: "No. The value lived at 44; at 47.5 you may be on the wrong side of the number now", verdict: "sound", feedback: "Right. Sharp origination already moved it; chasing steam at the new number often means buying a price with no remaining edge, or negative CLV." },
      { id: "b", label: "Yes. Smart money loves the over, follow it", verdict: "unsound", feedback: "Tailing a move after it happens is how you get reverse-CLV. The information is priced in; you're paying retail for it." },
      { id: "c", label: "Bet a smaller over to follow the sharps", verdict: "thin", feedback: "Sizing down limits the damage, but it doesn't fix that you may be buying a number with little or no edge left." },
    ],
  },

  // ─────────────── ANALYTICS ───────────────
  {
    id: "regression-tds", track: "Analytics", difficulty: "Advanced",
    pattern: "Regression to the mean", principle: "Unsustainable rates regress; price the role, not the rate.",
    scenario: "A WR is the TD leader, scoring on ~30% of his red-zone targets (far above the ~20% positional norm) on modest target volume.",
    question: "How do you value him going forward?",
    options: [
      { id: "a", label: "Expect TD regression; hold or sell-high, don't pay up", verdict: "sound", feedback: "Correct. A 30% RZ-TD rate on modest volume is variance, not skill at that magnitude. Buy volume and role; fade unsustainable efficiency." },
      { id: "b", label: "He's elite in the red zone. Trade for him", verdict: "unsound", feedback: "Paying a premium for a rate that's almost certain to regress is buying the top. The volume doesn't support the scoring." },
      { id: "c", label: "Hold and hope it continues", verdict: "thin", feedback: "Holding is fine; banking on the rate continuing is not. If you can sell at the inflated price, that's the higher-EV move." },
    ],
  },
  {
    id: "sample-variance", track: "Analytics", difficulty: "Pro",
    pattern: "Sample size & stabilization", principle: "Different stats stabilize at different sample sizes; trust the fast-stabilizing ones first.",
    scenario: "Three games in, you have a RB's yards-per-carry (volatile) and his snap share and route participation (stabilize fast).",
    question: "Which do you weight for a buy/sell decision now?",
    options: [
      { id: "a", label: "Snaps and routes. They stabilize in a handful of games; YPC is still noise", verdict: "sound", feedback: "Right. Opportunity metrics stabilize far faster than efficiency. At n=3, YPC is mostly variance; snap and route share are already meaningful." },
      { id: "b", label: "Yards per carry. It shows how good he actually is", verdict: "unsound", feedback: "YPC is one of the noisiest back stats and needs a large sample. Acting on it at n=3 is reading noise as signal." },
      { id: "c", label: "Average them into one number", verdict: "thin", feedback: "Blending a fast-stabilizing metric with a noisy one dilutes the signal. Weight by how quickly each stabilizes, don't average blindly." },
    ],
  },
  {
    id: "bayesian-update", track: "Analytics", difficulty: "Pro",
    pattern: "Bayesian updating", principle: "Update proportional to the strength of the new evidence. Don't overreact or anchor.",
    scenario: "Your strong preseason prior says a RB is a low-end RB2. In Week 1 he posts a monster line, but it came on 3 broken tackles and a 70-yard screen in garbage time.",
    question: "How much do you move your projection?",
    options: [
      { id: "a", label: "Move a little. The box score is loud but the inputs were fluky and low-signal", verdict: "sound", feedback: "Correct Bayesian behavior: a strong prior moves modestly against weak, fluky evidence. Discount garbage-time and explosive-play variance." },
      { id: "b", label: "Tear up the prior. He's a smash now", verdict: "unsound", feedback: "Overreacting to one low-signal sample. The evidence is loud but weak; a strong prior shouldn't collapse on it." },
      { id: "c", label: "Ignore it entirely. Stick to the prior", verdict: "thin", feedback: "Refusing to update at all is its own error. There IS some signal (he was on the field, made guys miss); move a little, not a lot." },
    ],
  },

  // ─────────────── INJURY SCIENCE ───────────────
  {
    id: "high-ankle", track: "Injury", difficulty: "Advanced",
    pattern: "High-ankle (syndesmosis) sprain", principle: "Return ≠ recovered. Read the injury's effect on the player's game, not just the status.",
    scenario: "A burst-dependent WR had a high-ankle sprain, missed three weeks, and is now active and 'no longer on the report.'",
    question: "How do you price his first game back?",
    options: [
      { id: "a", label: "Active but capped. Syndesmosis injuries sap cutting and burst for weeks after return; fade the ceiling, don't pay full price", verdict: "sound", feedback: "Right. High-ankle sprains linger; explosiveness and change-of-direction return last. Week 1 back is a discount-the-ceiling spot, not a 'he's fine' start." },
      { id: "b", label: "Active means healthy. Start him at full value", verdict: "unsound", feedback: "'Active' is a binary that hides the gradient. A burst player off a syndesmosis injury is commonly limited well past his return date." },
      { id: "c", label: "Bench him entirely for a month", verdict: "thin", feedback: "Too blunt. He can be startable in the right matchup, just at a tempered projection, especially for the ceiling outcomes." },
    ],
  },
  {
    id: "acl-return", track: "Injury", difficulty: "Pro",
    pattern: "ACL reconstruction: return vs. form", principle: "Volume often returns before efficiency; year-one back is a tempered projection.",
    scenario: "A star RB is ~10 months removed from ACL reconstruction and cleared for Week 1. Reports say he 'looks explosive.'",
    question: "What's the disciplined fantasy read?",
    options: [
      { id: "a", label: "Expect the workload but temper efficiency and watch for a maintenance/snap cap; re-injury and compensation risk are real year one", verdict: "sound", feedback: "Correct. The literature and history say touches can return on schedule while burst, efficiency, and durability often lag in year one. Project volume, discount the per-touch ceiling." },
      { id: "b", label: "He's cleared and explosive. Draft him at his old ADP", verdict: "unsound", feedback: "Paying full pre-injury price ignores the well-documented year-one efficiency dip and elevated re-injury/contralateral risk." },
      { id: "c", label: "Avoid him entirely. ACL backs are busts", verdict: "thin", feedback: "Too absolute; many return to form by year two and some sooner. The edge is the DISCOUNT, not a blanket fade." },
    ],
  },
  {
    id: "hamstring-trap", track: "Injury", difficulty: "Advanced",
    pattern: "Soft-tissue re-injury risk", principle: "Hamstrings re-aggravate; a quick 'questionable' return is a trap, not a green light.",
    scenario: "A speed WR strained his hamstring, sat one week, and is 'questionable' but expected to play this week.",
    question: "How do you treat him?",
    options: [
      { id: "a", label: "High re-aggravation risk on a rushed return. Either fade or accept a capped, volatile projection, and have a backup ready", verdict: "sound", feedback: "Right. Hamstrings have among the highest re-injury rates in football, especially on a fast return for a speed-dependent player. Hedge it." },
      { id: "b", label: "He's playing, so start him as usual", verdict: "unsound", feedback: "A rushed soft-tissue return is exactly the profile that re-tweaks mid-game and leaves you a zero. 'Playing' isn't 'right.'" },
      { id: "c", label: "Start him only in a great matchup", verdict: "thin", feedback: "Matchup-gating helps, but the core risk is the soft-tissue re-injury itself. Keep the contingency regardless of matchup." },
    ],
  },
  {
    id: "designation-decode", track: "Injury", difficulty: "Pro",
    pattern: "Decoding the report", principle: "The injury type and the practice trend tell you more than the one-word status.",
    scenario: "Two RBs are both 'Questionable.' One has a turf-toe injury and was DNP→Limited→Limited. The other has a one-week-old shoulder AC sprain and was Limited→Full→Full.",
    question: "Which 'Questionable' do you trust more to play and produce?",
    options: [
      { id: "a", label: "The AC sprain trending up in practice. Turf toe lingers and a DNP→Limited trend is shakier", verdict: "sound", feedback: "Correct. Same word, very different reads: an improving practice trend on a play-through injury beats a stalled trend on turf toe, which quietly saps push-off for weeks." },
      { id: "b", label: "The turf toe. Toes heal fast", verdict: "unsound", feedback: "A common trap. Turf toe is deceptively serious and slow; it impairs burst and push-off far longer than people assume." },
      { id: "c", label: "They're both Questionable, so treat them the same", verdict: "thin", feedback: "The whole skill is that 'Questionable' is not one thing. Injury type plus practice trend separates these two completely." },
    ],
  },
];

export const VERDICT_POINTS: Record<ProcessVerdict, number> = { sound: 2, thin: 1, unsound: 0 };

export function gradeOption(drill: Drill, optionId: string): DrillOption | null {
  return drill.options.find((o) => o.id === optionId) ?? null;
}

export function drillsByTrack(track: Track | "All"): Drill[] {
  return track === "All" ? [...DRILLS] : DRILLS.filter((d) => d.track === track);
}

export type AcademyResult = {
  readonly answered: number;
  readonly soundCount: number;
  readonly gmIq: number; // 0..100
  readonly grade: string;
  readonly weakPatterns: string[];
};

function letter(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "A−";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  return "C";
}

export function scoreAcademy(choices: ReadonlyMap<string, string>): AcademyResult {
  let pts = 0;
  let max = 0;
  let soundCount = 0;
  const weak: string[] = [];
  for (const [drillId, optId] of choices) {
    const drill = DRILLS.find((d) => d.id === drillId);
    if (!drill) continue;
    const opt = gradeOption(drill, optId);
    if (!opt) continue;
    max += VERDICT_POINTS.sound;
    pts += VERDICT_POINTS[opt.verdict];
    if (opt.verdict === "sound") soundCount++;
    else weak.push(drill.pattern);
  }
  const gmIq = max > 0 ? Math.round((pts / max) * 100) : 0;
  return { answered: choices.size, soundCount, gmIq, grade: letter(gmIq), weakPatterns: weak };
}

// ─────────────── REFERENCE LESSONS ───────────────

export type Lesson = {
  readonly id: string;
  readonly track: Track;
  readonly title: string;
  readonly level: Difficulty;
  readonly summary: string;
  readonly body: readonly string[];
  readonly terms?: readonly { readonly term: string; readonly def: string }[];
};

/** The Injury Decoder — what a designation ACTUALLY means. Educational, generic, not medical advice. */
export const INJURY_DECODER: readonly {
  readonly injury: string;
  readonly mechanism: string;
  readonly management: string;
  readonly window: string;
  readonly onReturn: string;
  readonly fantasyRead: string;
}[] = [
  { injury: "ACL tear", mechanism: "Knee ligament ruptured on a plant/cut or contact; the stabilizer for rotation.", management: "Surgical reconstruction (graft).", window: "~9-12 months to return.", onReturn: "Volume can return on schedule; burst, cutting, and efficiency often lag into year one; elevated re-tear / opposite-knee risk.", fantasyRead: "Year-one is a tempered projection. Buy the discount, not the old ADP." },
  { injury: "Achilles rupture", mechanism: "The Achilles tendon snaps on push-off; explosive plant injury.", management: "Surgical repair.", window: "~9-12 months; often longer to true form.", onReturn: "Historically tough returns, especially for older or burst-dependent players; first year frequently muted.", fantasyRead: "Heavily discount the first season back; be patient before paying up." },
  { injury: "High-ankle sprain (syndesmosis)", mechanism: "The ligaments between the two lower-leg bones twist/separate. Different and worse than a rolled ankle.", management: "Usually non-surgical; rest/boot; sometimes a screw if severe.", window: "~4-8 weeks; lingers.", onReturn: "Cutting and burst return last; players are often limited weeks past their return date.", fantasyRead: "On return, fade the ceiling and don't pay full price the first game or two back." },
  { injury: "Hamstring strain", mechanism: "Soft-tissue tear of the hamstring; graded I-III by severity.", management: "Rest and rehab; rarely surgical.", window: "Grade I ~1-2 wks, II ~3-6 wks, III longer.", onReturn: "Among the highest re-injury rates in football, especially on a fast return for speed players.", fantasyRead: "A rushed 'questionable' hamstring is a trap. Hedge it or accept a capped, volatile start." },
  { injury: "Turf toe", mechanism: "Sprain of the big-toe joint; impairs push-off and burst.", management: "Rest, taping, occasionally surgery in severe cases.", window: "Deceptively long: weeks to months.", onReturn: "Quietly saps explosiveness and acceleration well after 'return.'", fantasyRead: "Discount burst-dependent producers; the status hides how much it lingers." },
  { injury: "Lisfranc (midfoot)", mechanism: "Injury to the midfoot joint complex; ligament and/or bone.", management: "Often surgical for displacement.", window: "~4-6+ months; frequently season-ending.", onReturn: "Lingering effects on push-off; cautious year-one outlook.", fantasyRead: "Usually an IR/stash situation; don't expect a quick, full-strength return." },
  { injury: "MCL sprain", mechanism: "Inner-knee ligament stretched/torn; graded I-III.", management: "Most are non-surgical.", window: "~1-6 weeks by grade.", onReturn: "Lower-grade MCLs return to form relatively cleanly versus other knee injuries.", fantasyRead: "One of the more 'readable' knee injuries. Grade and practice trend tell you a lot." },
  { injury: "Concussion", mechanism: "Brain injury; managed by a graduated protocol, not a calendar.", management: "Protocol-driven, independent clearance.", window: "No fixed timeline. Can be days or weeks.", onReturn: "Once cleared, on-field performance is usually unaffected; the uncertainty is the timeline, not the output.", fantasyRead: "Don't anchor to 'weeks'; track protocol stage and have a contingency until cleared." },
];

export const LESSONS: readonly Lesson[] = [
  {
    id: "lesson-clv", track: "Market", title: "CLV is the only honest scoreboard", level: "Advanced",
    summary: "Why beating the closing line, not your win/loss record, is the real measure of edge.",
    body: [
      "The closing line is the market's most informed price: maximum money, maximum information, minimum vig advantage to the book. Beating it consistently is the strongest public proxy that you're finding real edges, because results are drowned in variance over any human-sized sample.",
      "If you bet −3 and it closes −4.5, you got a better number than the sharpest snapshot of the game, regardless of whether that single game won. Track your CLV, not your hot streak; the record will follow the CLV, not the other way around.",
    ],
    terms: [
      { term: "Closing line", def: "The final price before kickoff: the market's best estimate." },
      { term: "CLV", def: "Closing line value: the gap between your number and the close." },
      { term: "Reverse-CLV", def: "Getting a worse number than the close: a sign you're chasing, not originating." },
    ],
  },
  {
    id: "lesson-vig", track: "Market", title: "Remove the vig before you trust a number", level: "Pro",
    summary: "The price you're paid encodes the book's hold; the probability you need is higher than it looks.",
    body: [
      "A −110/−110 market is not a fair coin flip. Each side implies ~52.4% once you account for the vig, so a true 50/50 bet at −110 is a slow loser. Your edge has to clear the juice, not just the 50% line.",
      "To compare your model to the market, strip the vig from both sides to get the 'no-vig' fair price, then bet only when your number beats the fair price by enough to also clear the hold you're actually paying.",
    ],
    terms: [
      { term: "Vig / juice", def: "The book's built-in margin on a market." },
      { term: "Break-even %", def: "The win rate you need just to not lose; ~52.4% at −110." },
      { term: "No-vig price", def: "The fair probability after the hold is removed from both sides." },
    ],
  },
  {
    id: "lesson-stabilize", track: "Analytics", title: "Not all stats are trustworthy at the same time", level: "Pro",
    summary: "Opportunity metrics stabilize fast; efficiency metrics need big samples. Weight accordingly.",
    body: [
      "Early in a season, snap share, route participation, target share, and carry share become meaningful within a handful of games. They describe opportunity, which is stable and largely coach-controlled. Per-touch efficiency (YPC, yards per route, TD rate) is noisy and needs a far larger sample before it means much.",
      "The practical rule: at small n, decide on opportunity and treat efficiency as provisional. Don't average a fast-stabilizing metric with a slow one; weight by how quickly each becomes reliable.",
    ],
    terms: [
      { term: "Stabilization", def: "The sample size at which a stat reliably reflects true talent, not noise." },
      { term: "Opportunity metrics", def: "Snaps, routes, targets, carries. These stabilize quickly." },
      { term: "Regression to the mean", def: "Extreme rates on small samples tend to move back toward the norm." },
    ],
  },
  {
    id: "lesson-injury", track: "Injury", title: "The Injury Decoder", level: "Advanced",
    summary: "Same word ('Questionable', 'active'), very different realities. Read mechanism, surgery, window, and form-on-return.",
    body: [
      "A status is a binary that hides a gradient. The edge is knowing what the specific injury does to THIS player's game and how the recovery curve behaves. Volume can return long before burst, and some injuries (high-ankle, turf toe, hamstrings) quietly sap a player for weeks after they're 'back.'",
      "Pair the injury type with the practice trend (DNP → Limited → Full) and the player's profile (is he burst-dependent?). The table below is the generic decoder; it is educational, not medical advice.",
    ],
  },
];

export function lessonsByTrack(track: Track | "All"): Lesson[] {
  return track === "All" ? [...LESSONS] : LESSONS.filter((l) => l.track === track);
}
