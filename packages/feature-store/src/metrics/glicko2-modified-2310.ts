/**
 * Modified Glicko-2 for NFL (HFA inside expectation + season-start update)
 *
 * Research port: arXiv:2310.11459
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Paper-ported Glicko-2 modifications: (a) home advantage h added inside the expectation function (tuned; no pandemic split), (b) season-start update that inflates phi toward the prior. Standard mu/phi/sigma otherwise.
 *
 * ACCEPTANCE GATE: ADOPT only if it beats BOTH baselines by >=0.004 mean log-loss on the 2021-2025 test block, robust with 2020 excluded. Live-data gate -> GSE_GLICKO2_MOD_ENABLED flag (default false).
 */

export interface Glicko2Rating {
  mu: number;
  phi: number;
  sigma: number;
}

export const GLICKO2_SCALE = 173.7178;

/** Home advantage in rating points, added inside the expectation (paper-tuned). */
export const HOME_ADVANTAGE = 65;

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/** Expectation with HFA: E = 1 / (1 + exp(-g(phi_j) * (mu - mu_j + h))),
 *  where h = +HOME_ADVANTAGE at home and -HOME_ADVANTAGE away (the edge belongs
 *  to someone in every game). */
export function expectation(mu: number, muOpp: number, phiOpp: number, home: boolean): number {
  const h = home ? HOME_ADVANTAGE : -HOME_ADVANTAGE;
  return 1 / (1 + Math.exp(-g(phiOpp) * (mu - muOpp + h)));
}

export interface RatedGame {
  oppMu: number;
  oppPhi: number;
  score: number; // 1 win, 0.5 draw, 0 loss
  home: boolean;
}

/** One Glicko-2 rating period update (volatility held fixed — season-start update covers drift). */
export function updateRating(r: Glicko2Rating, games: RatedGame[]): Glicko2Rating {
  if (games.length === 0) return r;
  let vInv = 0;
  let deltaSum = 0;
  for (const gm of games) {
    const e = expectation(r.mu, gm.oppMu, gm.oppPhi, gm.home);
    const gg = g(gm.oppPhi);
    vInv += gg * gg * e * (1 - e);
    deltaSum += gg * (gm.score - e);
  }
  const v = 1 / vInv;
  const delta = v * deltaSum;
  const phiStar = Math.sqrt(r.phi * r.phi + r.sigma * r.sigma);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = r.mu + phiPrime * phiPrime * deltaSum;
  return { mu: muPrime, phi: phiPrime, sigma: r.sigma };
}

/** Season-start update: regress phi toward the prior (inflates uncertainty over the break). */
export function seasonStartUpdate(r: Glicko2Rating, priorPhi = 350 / GLICKO2_SCALE): Glicko2Rating {
  return { mu: r.mu, phi: Math.sqrt(r.phi * r.phi + priorPhi * priorPhi), sigma: r.sigma };
}

/** Implied win probability for log-loss scoring. */
export function winProb(a: Glicko2Rating, b: Glicko2Rating, aHome: boolean): number {
  return expectation(a.mu, b.mu, Math.sqrt(a.phi * a.phi + b.phi * b.phi), aHome);
}

/** Live-data gate: >=0.004 log-loss gain on 2021-2025 vs both baselines. */
export const GSE_GLICKO2_MOD_ENABLED = false;

