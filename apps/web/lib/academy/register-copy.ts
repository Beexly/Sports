/**
 * Academy register copy — "same data, different doorway" (NFL House doctrine).
 *
 * Three voices for the same facts. No new statistics or fabricated claims;
 * every variant re-registers existing Academy copy only.
 *
 * Voice law (lib/voice/analyst-standard.ts): desk voice, no hype, no locks,
 * no guarantees. "Teach me" = warm + inline definitions; "Plain read" = default
 * direct copy; "Show me the math" = quantitative framing, named metrics.
 */

import type { ExplainRegister } from "@/lib/pick-explainer/prompts";

export interface AcademyCopy {
  /** Hero paragraph below the H1 */
  readonly heroParagraph: string;
  /** Course Floor section — supporting sentence */
  readonly courseSectionBody: string;
  /** Live Fire section — supporting sentence */
  readonly liveFireBody: string;
  /** Beat the Close section — supporting sentence */
  readonly beatTheCloseBody: string;
}

const COPY: Record<ExplainRegister, AcademyCopy> = {
  teach: {
    heroParagraph:
      "Four floors, each targeting one skill. The Course Floor walks you through how betting markets work: what a line is, why the vig (the bookmaker's built-in cut) matters, and how to read a move. Live Fire puts you in front of real past slates and grades the decision you make, not the result. Beat the Close is a game that teaches closing-line value (CLV): did you get a better price than where the market finished? The Film Room is in production.",
    courseSectionBody:
      "Three tracks (Line Literacy, Bankroll & Risk, Market Mechanics), each with short lessons and locked-in quizzes. 'Locked-in' means what it sounds like: once you answer, the answer stands, just like a placed bet. Complete a lesson to add it to your transcript.",
    liveFireBody:
      "You see the slate exactly as it looked before the result was known. Play, Watchlist, or No-Bet: you pick. Then the grade comes back on the read, not on whether the game went your way. Guessing right for the wrong reason is flagged; a correct No-Bet gets full credit.",
    beatTheCloseBody:
      "A line (the price, expressed as a spread) opens. Market intel lands tick by tick, and each piece can move the number. Take the current number any time, or pass. Your score is pure CLV: did the number you took beat where the market finally closed? There are no win/loss results here, only price.",
  },

  plain: {
    heroParagraph:
      "Four floors: quizzed courses, a live-fire simulator, a line-trading game scored on pure CLV, and a film room in production. Restraint counts. Lucky wins don't.",
    courseSectionBody:
      "Three tracks: line literacy, bankroll & risk, market mechanics. Read, get quizzed, build your transcript. Answers are final, like a placed bet.",
    liveFireBody:
      "The slate exactly as it looked before the result. Play, Watchlist, or No-Bet, then get graded on the read. Lucky wins get flagged; correct losses get respect.",
    beatTheCloseBody:
      "Intel drips in, the number moves, you pick your moment: take it or pass. No luck involved: your score is pure closing-line value.",
  },

  math: {
    heroParagraph:
      "Four training modules. Course Floor: graded curriculum across three quantitative tracks. Live Fire: decision grading on historical slates. Process score, not outcome. Beat the Close: CLV measurement per entry (your price minus closing price; positive = you beat the market). Film Room: in production. Calibration and restraint are the scored outputs throughout.",
    courseSectionBody:
      "Track 1, Line Literacy: spread as price, vig math (52.4% break-even at −110), key-number clustering at 3 and 7. Track 2, Bankroll & Risk: unit sizing (1-2% of roll), drawdown asymmetry (−50% requires +100% recovery), Kelly fraction theory. Track 3, Market Mechanics: CLV as edge measurement, steam origination, limit-weighted move interpretation.",
    liveFireBody:
      "Decision grading on pre-result historical slates: Play / Watchlist / No-Bet. Score is process-based: correct No-Bets on losing markets and incorrect Plays on winning ones are graded accordingly. Result does not enter the scoring function.",
    beatTheCloseBody:
      "Each round: opening line → sequential market-intel ticks (each carrying a signed line move) → closing drift applied after final tick. Entry CLV = close − your locked price; positive CLV beats the close. Session score (0-30 pts across 6 rounds) maps to a rank tier. No result signal, only price efficiency.",
  },
};

export function getAcademyCopy(register: ExplainRegister): AcademyCopy {
  return COPY[register];
}
