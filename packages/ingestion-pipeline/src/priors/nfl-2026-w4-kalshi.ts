/**
 * Kalshi KXNFLGAME orderbooks, read 2026-10-02T00:00:52Z.
 * Home-ticker best YES bid, YES ask = 1 - best NO bid.
 * Not a close. Not blended with the games-file moneyline.
 * JAC is Kalshi's code for the club the games file calls JAX.
 * LAR is Kalshi's code for the club the games file calls LA.
 * A club with no row abstains.
 */
export const KALSHI_NFL_SNAPSHOT_AT = "2026-10-02T00:00:52Z";

export interface KalshiHomeBook {
  readonly home: string;
  readonly away: string;
  readonly gameday: string;
  readonly yesBid: number;
  readonly yesAsk: number;
  readonly ticker: string;
}

export const KALSHI_NFL_HOME_BOOKS: readonly KalshiHomeBook[] = [
  { home: "CLE", away: "PIT", gameday: "2026-10-01", yesBid: 0.4, yesAsk: 0.41, ticker: "KXNFLGAME-26OCT01PITCLE-CLE" },
  { home: "WAS", away: "IND", gameday: "2026-10-04", yesBid: 0.36, yesAsk: 0.37, ticker: "KXNFLGAME-26OCT04INDWAS-WAS" },
  { home: "NYG", away: "ARI", gameday: "2026-10-04", yesBid: 0.43, yesAsk: 0.44, ticker: "KXNFLGAME-26OCT04ARINYG-NYG" },
  { home: "HOU", away: "DAL", gameday: "2026-10-04", yesBid: 0.59, yesAsk: 0.6, ticker: "KXNFLGAME-26OCT04DALHOU-HOU" },
  { home: "TB", away: "GB", gameday: "2026-10-04", yesBid: 0.37, yesAsk: 0.38, ticker: "KXNFLGAME-26OCT04GBTB-TB" },
  { home: "CIN", away: "JAX", gameday: "2026-10-04", yesBid: 0.57, yesAsk: 0.58, ticker: "KXNFLGAME-26OCT04JACCIN-CIN" },
  { home: "PHI", away: "LA", gameday: "2026-10-04", yesBid: 0.36, yesAsk: 0.37, ticker: "KXNFLGAME-26OCT04LARPHI-PHI" },
  { home: "BUF", away: "NE", gameday: "2026-10-04", yesBid: 0.73, yesAsk: 0.74, ticker: "KXNFLGAME-26OCT04NEBUF-BUF" },
  { home: "CHI", away: "NYJ", gameday: "2026-10-04", yesBid: 0.62, yesAsk: 0.63, ticker: "KXNFLGAME-26OCT04NYJCHI-CHI" },
  { home: "BAL", away: "TEN", gameday: "2026-10-04", yesBid: 0.84, yesAsk: 0.85, ticker: "KXNFLGAME-26OCT04TENBAL-BAL" },
  { home: "MIN", away: "MIA", gameday: "2026-10-04", yesBid: 0.84, yesAsk: 0.85, ticker: "KXNFLGAME-26OCT04MIAMIN-MIN" },
  { home: "SF", away: "DEN", gameday: "2026-10-04", yesBid: 0.56, yesAsk: 0.57, ticker: "KXNFLGAME-26OCT04DENSF-SF" },
  { home: "LV", away: "KC", gameday: "2026-10-04", yesBid: 0.35, yesAsk: 0.36, ticker: "KXNFLGAME-26OCT04KCLV-LV" },
  { home: "SEA", away: "LAC", gameday: "2026-10-04", yesBid: 0.75, yesAsk: 0.76, ticker: "KXNFLGAME-26OCT04LACSEA-SEA" },
  { home: "CAR", away: "DET", gameday: "2026-10-04", yesBid: 0.35, yesAsk: 0.36, ticker: "KXNFLGAME-26OCT04DETCAR-CAR" },
  { home: "NO", away: "ATL", gameday: "2026-10-05", yesBid: 0.55, yesAsk: 0.56, ticker: "KXNFLGAME-26OCT05ATLNO-NO" },
];
