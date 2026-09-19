/**
 * Grouping utilities for the data-ingestion pipeline.
 * Provides helper functions to group games by various dimensions
 * (season, week, team, etc.) for downstream processing.
 */

import { Game } from '../models/Game';

/**
 * Groups games by season and week.
 */
export function groupBySeasonWeek(games: Game[]): Map<number, Array<Game>> {
  const groups: Map<number, Array<Game>> = new Map();
  for (const game of games) {
    const key = game.season * 1000 + game.week;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(game);
  }
  return groups;
}

/**
 * Groups games by team abbreviation.
 */
export function groupByTeam(games: Game[]): Map<string, Array<Game>> {
  const groups: Map<string, Array<Game>> = new Map();
  for (const game of games) {
    const key = game.teamAbbreviation;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(game);
  }
  return groups;
}

/**
 * Groups games by season only.
 */
export function groupBySeason(games: Game[]): Map<number, Array<Game>> {
  const groups: Map<number, Array<Game>> = new Map();
  for (const game of games) {
    const key = game.season;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(game);
  }
  return groups;
}
