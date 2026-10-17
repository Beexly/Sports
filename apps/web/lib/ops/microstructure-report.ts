/**
 * Microstructure report — wires market-consensus-q + kalshi-book-divergence
 * (both loaded-but-never-invoked) onto REAL inputs, rights-clean.
 *
 * RIGHTS POSTURE (do not loosen):
 *  - Kalshi ingest into game_signals/scoring is PAID-REQUIRED and stays
 *    founder-gated OFF. This module reads the kalshi_full_slate RESEARCH
 *    artifacts (public trade-API reads already landed by the snapshot job)
 *    and emits a REPORT only — priced:false, direction flags, no scoring
 *    input, no game_signals write, no pick influence. Same transparency
 *    posture the X4 module's header mandates.
 *  - Book two-ways come from the Odds table rows refresh-odds already
 *    fetched via the free ESPN path. Nothing new is fetched.
 *
 * OUTPUTS
 *  - consensus q: logit-weighted (kalshi_research mid + any book consensus
 *    row present), glass-box, labeled q — never published as p.
 *  - divergence flags: "book X is too long vs Kalshi on side Y by gap" —
 *    the audit surface a sharp reads before trusting a displayed price.
 */

import {
  scanKalshiVsBooks,
  consensusMarketQ,
  type KalshiBookFlag,
  type LabeledQ,
  type ConsensusQ,
} from "@sports/prediction-engine";
import { db } from "@sports/db";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const KALSHI_DIR = path.join(
  process.cwd(),
  "docs",
  "data-sources",
  "research",
  "2026-10-14",
  "kalshi",
);

interface KalshiRow {
  readonly event_ticker: string;
  readonly away: string;
  readonly home: string;
  readonly ticker: string;
  readonly title: string;
  readonly yes_bid: number;
  readonly yes_ask: number;
  readonly mid: number;
  readonly spread: number;
  readonly status: string;
}

export interface GameMicroReport {
  readonly home: string;
  readonly away: string;
  readonly kalshiMid: number | null;
  readonly kalshiSpread: number | null;
  readonly consensusQ: ConsensusQ | null;
  readonly divergenceFlags: readonly KalshiBookFlag[];
  readonly booksScanned: readonly string[];
  readonly refused: string | null;
}

export interface MicrostructureReport {
  readonly generatedAt: string;
  readonly sourceArtifact: string;
  readonly priced: false;
  readonly games: readonly GameMicroReport[];
  readonly note: string;
}

function latestKalshiArtifact(): { file: string; rows: KalshiRow[] } | null {
  if (!existsSync(KALSHI_DIR)) return null;
  const files = readdirSync(KALSHI_DIR)
    .filter((f) => f.startsWith("kalshi_full_slate_") && f.endsWith(".json"))
    .sort();
  const file = files.at(-1);
  if (!file) return null;
  try {
    const blob = JSON.parse(readFileSync(path.join(KALSHI_DIR, file), "utf-8"));
    return { file, rows: blob.rows ?? [] };
  } catch {
    return null;
  }
}

export async function buildMicrostructureReport(): Promise<MicrostructureReport> {
  const art = latestKalshiArtifact();
  if (!art || art.rows.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      sourceArtifact: art?.file ?? "none",
      priced: false,
      games: [],
      note: "no kalshi_full_slate research artifact found — nothing to audit",
    };
  }

  // group kalshi rows per event (home/away pair); each event has two rows
  // (home-wins, away-wins contracts). Use the home-wins row: its yes bid/ask
  // is P(home).
  const byEvent = new Map<string, KalshiRow>();
  for (const r of art.rows) {
    if (r.title.includes("wins") && r.ticker.endsWith(`-${r.away}`)) continue; // away contract
    byEvent.set(r.event_ticker, r);
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 21 * 24 * 3600 * 1000);
  const games = await db.game.findMany({
    where: { commenceTime: { gte: now, lte: horizon } },
    select: {
      id: true,
      homeTeamName: true,
      awayTeamName: true,
      commenceTime: true,
      homeTeam: { select: { abbreviation: true } },
      awayTeam: { select: { abbreviation: true } },
    },
  });

  const outGames: GameMicroReport[] = [];

  for (const g of games) {
    // match kalshi event by team abbreviation (Team.abbreviation from the
    // ESPN seed); case-insensitive.
    const h = g.homeTeam?.abbreviation ?? "";
    const a = g.awayTeam?.abbreviation ?? "";
    let row: KalshiRow | undefined;
    if (h && a) {
      for (const kr of byEvent.values()) {
        if (
          kr.home.toUpperCase() === h.toUpperCase() &&
          kr.away.toUpperCase() === a.toUpperCase()
        ) {
          row = kr;
          break;
        }
      }
    }
    if (!row || !(row.mid > 0 && row.mid < 1)) {
      outGames.push({
        home: g.homeTeamName,
        away: g.awayTeamName,
        kalshiMid: null,
        kalshiSpread: null,
        consensusQ: null,
        divergenceFlags: [],
        booksScanned: [],
        refused: "no_kalshi_match",
      });
      continue;
    }

    // book two-ways for this game from the Odds table (free ESPN path rows)
    const oddsRows = await db.odds.findMany({
      where: { gameId: g.id, market: "H2H" },
      orderBy: { fetchedAt: "desc" },
      take: 40,
    });
    const seenBooks = new Map<string, { home: number; away: number; at: Date }>();
    for (const o of oddsRows) {
      if (o.homePrice == null || o.awayPrice == null) continue;
      const prev = seenBooks.get(o.bookmaker);
      if (!prev || prev.at < o.fetchedAt) {
        seenBooks.set(o.bookmaker, {
          home: o.homePrice,
          away: o.awayPrice,
          at: o.fetchedAt,
        });
      }
    }
    const books = [...seenBooks.entries()].map(([book, v]) => ({
      book,
      homeAmerican: v.home,
      awayAmerican: v.away,
    }));

    // consensus q: kalshi research mid as one labeled source. Book consensus
    // joins only if >=2 books (a single book is not a consensus).
    const sources: LabeledQ[] = [
      { id: "kalshi_research_mid", q: row.mid, weight: 1.0 },
    ];
    if (books.length >= 2) {
      // quick mean of devigged book home probs via American->prob
      const probs = books.map((b) => {
        const ph =
          b.homeAmerican > 0
            ? 100 / (b.homeAmerican + 100)
            : (-b.homeAmerican) / ((-b.homeAmerican) + 100);
        const pa =
          b.awayAmerican > 0
            ? 100 / (b.awayAmerican + 100)
            : (-b.awayAmerican) / ((-b.awayAmerican) + 100);
        return ph / (ph + pa); // overround-normalized home prob
      });
      const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
      if (mean > 0 && mean < 1) {
        sources.push({ id: "book_consensus_free", q: mean, weight: 1.0 });
      }
    }

    const consensus = consensusMarketQ(sources);

    // divergence scan: Kalshi two-way (home-referenced) vs each book
    const scan = scanKalshiVsBooks(
      { bid: row.yes_bid, ask: row.yes_ask },
      books,
    );
    const flags = scan.ok ? scan.flags : [];

    outGames.push({
      home: g.homeTeamName,
      away: g.awayTeamName,
      kalshiMid: row.mid,
      kalshiSpread: row.spread,
      consensusQ: consensus,
      divergenceFlags: flags,
      booksScanned: books.map((b) => b.book),
      refused: scan.ok ? null : scan.refuse,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    sourceArtifact: art.file,
    priced: false,
    games: outGames,
    note:
      "REPORT ONLY — priced:false. Kalshi rows are public trade-API research " +
      "reads (paid-required ingest gate untouched). Divergence direction is " +
      "'book too long vs Kalshi', an audit surface, never a bet signal.",
  };
}
