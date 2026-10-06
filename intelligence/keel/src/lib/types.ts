import type { FieldSnap } from "@/lib/field";

export type Verdict = "admit" | "hold" | "reject";

export type { FieldSnap };

export type Origin = "shelf" | "shift" | "crawl";

export type Finding = {
  id: string;
  origin: Origin;
  title: string;
  authors: string;
  year: string;
  venue: string;
  url: string;
  abstract: string;
  verdict: Verdict;
  grain: string;
  join: string;
  law: string;
  why: string;
  equation: string | null;
  lane: string;
  foundAt: string;
};

export type RawHit = {
  id: string;
  title: string;
  authors: string;
  year: string;
  venue: string;
  url: string;
  abstract: string;
  lane: string;
};

export type SealCheck = {
  ok: boolean;
  error?: string;
  checkedAt: string;
  injuriesUpdated: string | null;
  injuriesBytes: number | null;
  ngsUpdated: string | null;
  ngsBytes: number | null;
  stubBytes: number | null;
  injuriesMatch: boolean | null;
  ngsMatch: boolean | null;
  stubMatch: boolean | null;
};

export type ClevelandRow = {
  name: string;
  pos: string;
  report: string;
  practice: string;
  reportInjury: string;
  practiceInjury: string;
};

export type Recount = {
  ok: boolean;
  error?: string;
  checkedAt: string;
  injuries?: {
    rows: number;
    weeks: Record<string, number>;
    week4: number;
    week4Ol: number;
    week4OlOut: number;
    pitWeek4Ol: number;
    cleveland: ClevelandRow[];
    bytes: number;
  };
  ngs?: {
    rows: number;
    week4Passers: number;
    watsonSeason: string;
    watsonWeeks: { week: string; ttt: string; attempts: string }[];
    rodgersWeek4: { ttt: string; attempts: string };
    bytes: number;
  };
  stubBytes: number | null;
  field?: FieldSnap;
};

export type ShiftResult = {
  ok: boolean;
  error?: string;
  hits: RawHit[];
  seal: SealCheck;
  laneId: string;
};
