export function lineMovement(openingLine: number, currentLine: number): number { return currentLine - openingLine; }
export function impliedProbability(americanOdds: number): number { return americanOdds < 0 ? (-americanOdds) / ((-americanOdds) + 100) : 100 / (americanOdds + 100); }
export function noVigProbabilities(homeOdds: number, awayOdds: number) { const home = impliedProbability(homeOdds); const away = impliedProbability(awayOdds); const total = home + away; return { home: home / total, away: away / total }; }
