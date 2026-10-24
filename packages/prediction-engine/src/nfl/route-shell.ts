/**
 * Targeted route against the same shell as league_sii, plus run EPA by box.
 * Regular season 2023-2025. A route is here only if the shell gap kept its
 * sign in every season. Scoring does not read this. It is not a side.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Side {
  n: number;
  epa: number;
}

export interface RouteSeason {
  season: number;
  single: Side;
  split: Side;
}

export interface RouteShell {
  route: string;
  favors: "SINGLE" | "SPLIT";
  seasons: RouteSeason[];
}

interface FileShape {
  routes: RouteShell[];
  runBox: Array<{ box: number; seasons: Array<{ season: number; n: number; epa: number }> }>;
}

function load(): FileShape {
  return JSON.parse(readFileSync(join(__dirname, "data", "route-shell.json"), "utf8")) as FileShape;
}

export function routeShell(route: string): RouteShell | null {
  return load().routes.find((row) => row.route === route) ?? null;
}

export function routeGap(route: string, season: number): number | null {
  const row = routeShell(route);
  const year = row?.seasons.find((s) => s.season === season);
  if (!year) return null;
  return year.single.epa - year.split.epa;
}

export function runBox(box: number, season: number): Side | null {
  const row = load().runBox.find((b) => b.box === box);
  return row?.seasons.find((s) => s.season === season) ?? null;
}
