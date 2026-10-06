// Authored design-sync preview for ResultCard.
// FIXTURE: matchups, lines and CLV reads below are layout fixtures for the design tool, not real settled picks.
import type { CSSProperties } from "react";
import { ResultCard } from "sports-prediction-platform";
import type { CardResult } from "sports-prediction-platform";

const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, maxWidth: 720 };

const plate =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5FF'/%3E%3Cstop offset='1' stop-color='%237B61FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23g)'/%3E%3C/svg%3E";

const sweep: ReadonlyArray<{
  result: CardResult;
  matchup: string;
  pick: string;
  line?: string;
  confidenceLabel?: string;
  clvLabel?: string;
  meta?: string;
}> = [
  { result: "WIN", matchup: "BUF @ KC", pick: "Bills +2.5", line: "-110", confidenceLabel: "Moderate", clvLabel: "+1.2 pts CLV", meta: "NFL · settled · v5.2.7" },
  { result: "LOSS", matchup: "LAL @ BOS", pick: "Celtics -6.5", line: "-108", confidenceLabel: "Lean", clvLabel: "-0.4 pts CLV", meta: "NBA · settled · v5.2.7" },
  { result: "PUSH", matchup: "DAL @ PHI", pick: "Under 47.5", line: "-105", meta: "NFL · settled · v5.2.7" },
  { result: "PENDING", matchup: "NYY @ HOU", pick: "Yankees ML", line: "+134", confidenceLabel: "Moderate", meta: "MLB · line locked · v5.2.7" },
];

export const ResultSweep = () => (
  <div style={grid}>
    {sweep.map((r) => (
      <ResultCard key={r.matchup} {...r} />
    ))}
  </div>
);

export const Featured = () => (
  <div style={{ maxWidth: 380 }}>
    <ResultCard
      matchup="BUF @ KC"
      pick="Bills +2.5"
      line="-110"
      result="WIN"
      confidenceLabel="Moderate"
      clvLabel="+1.2 pts CLV"
      meta="NFL · settled 2026-01-12 · v5.2.7"
    />
  </div>
);

export const WithPlate = () => (
  <div style={{ maxWidth: 380 }}>
    <ResultCard
      matchup="LAL @ BOS"
      pick="Celtics -6.5"
      line="-108"
      result="WIN"
      confidenceLabel="Strong"
      clvLabel="+2.0 pts CLV"
      meta="NBA · settled · v5.2.7"
      plateSrc={plate}
    />
  </div>
);
