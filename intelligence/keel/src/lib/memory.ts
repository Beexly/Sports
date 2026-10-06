import type { Finding, Verdict } from "@/lib/types";

export type TermStat = { admits: number; rejects: number; holds: number };
export type Lexicon = Record<string, Record<string, TermStat>>;

const STOP = new Set(
  `the a an of and or to for in on with from by as is are was be this that not into over under than then
   nfl football national league paper model models using used use based via we our their its it they
   method methods approach data analysis study show shows shown between which these those have been were
   will also such only more most other when where while after before across within without about there
   here each both some many high low than player players season week play plays decision decisions
   estimate estimated estimation prediction predicted probability performance public results result
   national during game games team teams their this from into after first second third value values
   would could should after being being about because however therefore within among`.split(/\s+/),
);

export function termsOf(text: string) {
  const raw = text.toLowerCase().match(/[a-z][a-z-]{4,}/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of raw) {
    if (STOP.has(term) || seen.has(term)) continue;
    if (/imput|healthy|guaranteed|tutorial|chatgpt|lock/.test(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out.slice(0, 48);
}

function bump(stat: TermStat | undefined, verdict: Verdict): TermStat {
  const prev = stat ?? { admits: 0, rejects: 0, holds: 0 };
  return {
    admits: prev.admits + (verdict === "admit" ? 1 : 0),
    rejects: prev.rejects + (verdict === "reject" ? 1 : 0),
    holds: prev.holds + (verdict === "hold" ? 1 : 0),
  };
}

function trim(bucket: Record<string, TermStat>) {
  return Object.fromEntries(
    Object.entries(bucket)
      .sort((a, b) => b[1].admits - a[1].admits || a[1].rejects - b[1].rejects || a[0].localeCompare(b[0]))
      .slice(0, 80),
  );
}

export function observeLexicon(lex: Lexicon, laneId: string, rows: Pick<Finding, "verdict" | "title" | "abstract">[]) {
  const bucket = { ...(lex[laneId] ?? {}) };
  for (const row of rows) {
    for (const term of termsOf(`${row.title} ${row.abstract}`)) {
      bucket[term] = bump(bucket[term], row.verdict);
    }
  }
  return { ...lex, [laneId]: trim(bucket) };
}

export function learnedTerms(lex: Lexicon | undefined, laneId: string) {
  const bucket = lex?.[laneId] ?? {};
  const keep: { term: string; admits: number }[] = [];
  const retire: string[] = [];
  for (const [term, stat] of Object.entries(bucket)) {
    if (stat.admits >= 2 && stat.rejects === 0) keep.push({ term, admits: stat.admits });
    else if (stat.rejects >= 2 && stat.admits === 0) retire.push(term);
  }
  keep.sort((a, b) => b.admits - a.admits || a.term.localeCompare(b.term));
  retire.sort();
  return { keep: keep.slice(0, 3).map((row) => row.term), retire: retire.slice(0, 6) };
}

/** Natural-language query only. The arXiv string stays the doctrine query so a bad clause cannot zero the archive. */
export function learnedOpenAlex(base: string, keep: string[]) {
  const extra = keep.filter((term) => !base.toLowerCase().includes(term));
  if (!extra.length) return base;
  return `${base} ${extra.join(" ")}`.slice(0, 300);
}
