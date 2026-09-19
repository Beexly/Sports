/**
 * Corpus validation. Refuses malformed rows with a descriptive reason
 * rather than coercing, defaulting, or inventing a value — a validated row
 * always came from the source file, never from a guess.
 *
 * Pure. Returns a list of issue strings; an empty list means the corpus is
 * clean. Never throws itself — callers (harness.ts, loader.ts) decide when
 * to refuse.
 */

import type { HistoricalGameRow } from "./types.js";

export function validateCorpus(rows: readonly HistoricalGameRow[]): string[] {
  const issues: string[] = [];
  rows.forEach((row, index) => {
    issues.push(...validateRow(row, index));
  });
  return issues;
}

function validateRow(row: HistoricalGameRow, index: number): string[] {
  const issues: string[] = [];
  const tag = `row ${index}`;

  if (!Number.isFinite(row.season) || row.season < 1900) {
    issues.push(`${tag}: season must be a finite year >= 1900, got ${JSON.stringify(row.season)}`);
  }
  if (!Number.isFinite(row.week) || row.week < 0) {
    issues.push(`${tag}: week must be a finite non-negative number, got ${JSON.stringify(row.week)}`);
  }
  if (typeof row.kickoffUtc !== "string" || Number.isNaN(Date.parse(row.kickoffUtc))) {
    issues.push(`${tag}: kickoffUtc must be a parseable ISO-8601 timestamp, got ${JSON.stringify(row.kickoffUtc)}`);
  }
  if (typeof row.homeTeam !== "string" || row.homeTeam.trim().length === 0) {
    issues.push(`${tag}: homeTeam must be a non-empty string`);
  }
  if (typeof row.awayTeam !== "string" || row.awayTeam.trim().length === 0) {
    issues.push(`${tag}: awayTeam must be a non-empty string`);
  }
  if (row.homeTeam === row.awayTeam) {
    issues.push(`${tag}: homeTeam and awayTeam must differ, both are ${JSON.stringify(row.homeTeam)}`);
  }
  if (!Number.isFinite(row.homeScore) || !Number.isInteger(row.homeScore) || row.homeScore < 0) {
    issues.push(`${tag}: homeScore must be a non-negative integer, got ${JSON.stringify(row.homeScore)}`);
  }
  if (!Number.isFinite(row.awayScore) || !Number.isInteger(row.awayScore) || row.awayScore < 0) {
    issues.push(`${tag}: awayScore must be a non-negative integer, got ${JSON.stringify(row.awayScore)}`);
  }
  if (!Number.isFinite(row.closingSpreadHome)) {
    issues.push(`${tag}: closingSpreadHome must be a finite number, got ${JSON.stringify(row.closingSpreadHome)}`);
  }
  if (!Number.isFinite(row.closingTotal) || row.closingTotal <= 0) {
    issues.push(`${tag}: closingTotal must be a finite positive number, got ${JSON.stringify(row.closingTotal)}`);
  }
  if (!Number.isFinite(row.closingMlHome) || row.closingMlHome === 0) {
    issues.push(`${tag}: closingMlHome must be a finite non-zero American price, got ${JSON.stringify(row.closingMlHome)}`);
  }
  if (!Number.isFinite(row.closingMlAway) || row.closingMlAway === 0) {
    issues.push(`${tag}: closingMlAway must be a finite non-zero American price, got ${JSON.stringify(row.closingMlAway)}`);
  }
  if (typeof row.sourceUrl !== "string" || row.sourceUrl.trim().length === 0) {
    issues.push(`${tag}: sourceUrl must be a non-empty string`);
  }

  return issues;
}
