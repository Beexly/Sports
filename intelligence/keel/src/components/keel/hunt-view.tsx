import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { HUNT_PLAN } from "@/lib/doctrine";
import { nextLane } from "@/lib/learn";
import { crawlPage, runShift } from "@/lib/hunt-fn";
import { learnedOpenAlex, learnedTerms, observeLexicon } from "@/lib/memory";
import { canonUrl, scoreHit } from "@/lib/score";
import { SHELF } from "@/lib/shelf";
import { useKeel } from "@/lib/store";
import type { Finding, Verdict } from "@/lib/types";
import { Meta, Panel, Stamp, verdictTone, when } from "@/components/keel/ui";

const FILTERS = ["all", "admit", "hold", "reject", "shelf", "watch"] as const;
type Filter = (typeof FILTERS)[number];

export function HuntView({ ready }: { ready: boolean }) {
  const findings = useKeel((s) => s.findings);
  const laneIndex = useKeel((s) => s.laneIndex);
  const watch = useKeel((s) => s.watch);
  const intervalMin = useKeel((s) => s.intervalMin);
  const lastShiftAt = useKeel((s) => s.lastShiftAt);
  const lastShiftNote = useKeel((s) => s.lastShiftNote);
  const busy = useKeel((s) => s.busy);
  const seal = useKeel((s) => s.seal);
  const setWatch = useKeel((s) => s.setWatch);
  const setIntervalMin = useKeel((s) => s.setIntervalMin);
  const yields = useKeel((s) => s.yields);
  const shiftsRun = useKeel((s) => s.shiftsRun);
  const lexicon = useKeel((s) => s.lexicon);
  const ids = HUNT_PLAN.map((item) => item.id);
  const choice = nextLane(laneIndex, shiftsRun, yields, ids);
  const lane = HUNT_PLAN[choice.index];
  const learned = learnedTerms(lexicon, lane.id);
  const nextQuery = learnedOpenAlex(lane.openalex, learned.keep);

  const shiftFn = useServerFn(runShift);
  const crawlFn = useServerFn(crawlPage);
  const shiftRef = useRef(shiftFn);
  const crawlRef = useRef(crawlFn);
  shiftRef.current = shiftFn;
  crawlRef.current = crawlFn;

  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [url, setUrl] = useState("");
  const [crawlNote, setCrawlNote] = useState("");

  const run = useCallback(async (index: number) => {
    const state = useKeel.getState();
    if (state.busy) return;
    const lane = HUNT_PLAN[index % HUNT_PLAN.length];
    state.setBusy(true);
    try {
      const state = useKeel.getState();
      const learnedNow = learnedTerms(state.lexicon, lane.id);
      const result = await shiftRef.current({
        data: {
          arxivQuery: lane.arxiv,
          openalexQuery: learnedOpenAlex(lane.openalex, learnedNow.keep),
          laneId: lane.id,
          laneLabel: lane.label,
        },
      });
      const foundAt = new Date().toISOString();
      const shelfKeys = new Set(SHELF.map((item) => canonUrl(item.url)));
      const scored: Finding[] = result.hits
        .map((hit) => ({ ...scoreHit(hit), origin: "shift" as const, foundAt }))
        .filter((row) => row.url && !shelfKeys.has(canonUrl(row.url)));
      useKeel.getState().addFindings(scored);
      useKeel.getState().setSeal(result.seal);
      useKeel.getState().bumpLane();
      const admits = scored.filter((row) => row.verdict === "admit").length;
      const holds = scored.filter((row) => row.verdict === "hold").length;
      const rejects = scored.filter((row) => row.verdict === "reject").length;
      useKeel.getState().noteYield(lane.id, admits, holds, rejects);
      const nextLex = observeLexicon(useKeel.getState().lexicon ?? {}, lane.id, scored);
      useKeel.getState().setLexicon(nextLex);
      const nextLearned = learnedTerms(nextLex, lane.id);
      const learnedBit = nextLearned.keep.length
        ? ` Next paper query adds: ${nextLearned.keep.join(", ")}.`
        : " Nothing has been admitted twice on this lane yet.";
      const note = `${lane.label}: ${result.hits.length} documents from arXiv, OpenAlex, and Alexandria. ${admits} admitted, ${holds} held, ${rejects} rejected.${learnedBit}${result.error ? ` ${result.error}` : ""}`;
      useKeel.getState().noteShift(note);
    } catch (err) {
      useKeel.getState().noteShift(err instanceof Error ? err.message : "The shift failed.");
    } finally {
      useKeel.getState().setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const state = useKeel.getState();
    const age = state.lastShiftAt ? Date.now() - new Date(state.lastShiftAt).getTime() : Infinity;
    if (state.watch && age > state.intervalMin * 60_000) {
      const picked = nextLane(
        state.laneIndex,
        state.shiftsRun,
        state.yields,
        HUNT_PLAN.map((item) => item.id),
      );
      void run(picked.index);
    }
    const id = window.setInterval(() => {
      const current = useKeel.getState();
      if (!current.watch) return;
      const picked = nextLane(
        current.laneIndex,
        current.shiftsRun,
        current.yields,
        HUNT_PLAN.map((item) => item.id),
      );
      void run(picked.index);
    }, intervalMin * 60_000);
    return () => window.clearInterval(id);
  }, [ready, watch, intervalMin, run]);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const rows: Finding[] = [];
    const ordered = [...SHELF, ...findings.filter((row) => row.origin !== "shelf")];
    for (const row of ordered) {
      const key = canonUrl(row.url);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(row);
    }
    const rank: Record<Verdict, number> = { admit: 0, hold: 1, reject: 2 };
    return rows.sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.origin === "shelf" ? 1 : -1));
  }, [findings]);

  const visible = merged.filter((row) => {
    if (filter === "all") return true;
    if (filter === "shelf") return row.origin === "shelf";
    if (filter === "watch") return row.origin !== "shelf";
    return row.verdict === filter;
  });

  const counts = {
    admit: merged.filter((r) => r.verdict === "admit").length,
    hold: merged.filter((r) => r.verdict === "hold").length,
    reject: merged.filter((r) => r.verdict === "reject").length,
  };

  async function deepRead() {
    setCrawlNote("");
    if (!url.trim()) {
      setCrawlNote("Paste a paper or dataset URL first.");
      return;
    }
    if (useKeel.getState().busy) return;
    useKeel.getState().setBusy(true);
    try {
      const result = await crawlRef.current({ data: { url: url.trim(), key } });
      if (!result.ok) {
        setCrawlNote(result.error || "Firecrawl did not return a page.");
        return;
      }
      const hit = {
        id: result.url,
        title: result.title,
        authors: "Firecrawl extract",
        year: "",
        venue: "Firecrawl",
        url: result.url,
        abstract: result.markdown,
        lane: "deep read",
      };
      const scored: Finding = { ...scoreHit(hit), origin: "crawl", foundAt: new Date().toISOString() };
      useKeel.getState().addFindings([scored]);
      setOpenId(scored.id);
      setCrawlNote(`${scored.verdict.toUpperCase()} under law ${scored.law}. The key was not stored.`);
    } catch (err) {
      setCrawlNote(err instanceof Error ? err.message : "Deep read failed.");
    } finally {
      useKeel.getState().setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Meta>Watch · public sources only</Meta>
            <h2 className="mt-2 text-2xl">
              Next lane: {lane.label}
              <span className="text-muted"> · {choice.mode}</span>
            </h2>
            <p className="mt-2 max-w-2xl text-fg">
              While this console is open it asks arXiv, OpenAlex, and the Alexandria research index. It keeps a yield by lane and prefers the one that admits work. Every third shift it explores. Words admitted twice, and never rejected, are appended to the next OpenAlex and Alexandria query. arXiv stays on the doctrine string, so a bad clause cannot empty the archive.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(choice.index)}
              className="min-h-11 bg-primary px-4 font-mono text-sm text-primary-ink disabled:opacity-50"
            >
              {busy ? "Shift running" : "Run the shift"}
            </button>
            <button
              type="button"
              onClick={() => setWatch(!watch)}
              className="min-h-11 border border-line px-4 font-mono text-sm text-fg"
              aria-pressed={watch}
            >
              {watch ? "Watch on" : "Watch off"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-sm text-muted">
          <label className="flex items-center gap-2">
            Every
            <select
              value={intervalMin}
              onChange={(e) => setIntervalMin(Number(e.target.value))}
              className="min-h-11 border border-line bg-bg px-2 text-fg"
            >
              <option value={10}>10 min</option>
              <option value={20}>20 min</option>
              <option value={60}>60 min</option>
            </select>
          </label>
          <span>Last shift {when(lastShiftAt)}</span>
        </div>
        {lastShiftNote && <p className="mt-3 text-fg">{lastShiftNote}</p>}
        <div className="mt-4 border border-line bg-bg p-4">
          <Meta>Learned clause · this lane · OpenAlex and Alexandria</Meta>
          <p className="mt-2 text-fg">
            {learned.keep.length
              ? `Admitted at least twice and never rejected: ${learned.keep.join(", ")}.`
              : "No word on this lane has been admitted twice. The doctrine query runs alone."}
          </p>
          <p className="mt-2 break-words font-mono text-sm text-muted">{nextQuery}</p>
          {learned.retire.length > 0 && (
            <p className="mt-2 text-muted">Retired, rejected twice and never admitted: {learned.retire.join(", ")}.</p>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {HUNT_PLAN.map((item) => {
            const row = yields[item.id];
            const rate = row && row.pulls > 0 ? row.admits / row.pulls : 0;
            return (
              <div key={item.id}>
                <div className="flex justify-between font-mono text-xs text-muted">
                  <span>{item.label}</span>
                  <span>{row ? `${row.admits} admitted / ${row.pulls}` : "untried"}</span>
                </div>
                <div className="mt-1 h-1 bg-line">
                  <div className="h-1 bg-primary" style={{ width: `${Math.round(rate * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        {seal && (seal.injuriesMatch === false || seal.stubMatch === false || seal.ngsMatch === false) && (
          <p className="mt-3 text-accent">A sealed file changed size. Open the record and recount before citing the old counts.</p>
        )}
      </Panel>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {HUNT_PLAN.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => void run(index)}
            disabled={busy}
            className="min-h-11 shrink-0 border border-line px-3 font-mono text-xs uppercase tracking-wide text-fg disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`min-h-11 px-3 font-mono text-xs uppercase tracking-wide ${filter === item ? "bg-fg text-bg" : "border border-line text-muted"}`}
          >
            {item}
            {item === "admit" ? ` ${counts.admit}` : item === "hold" ? ` ${counts.hold}` : item === "reject" ? ` ${counts.reject}` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <Panel>
            <p>Nothing in this cut yet. Run the shift, or switch the filter back to all.</p>
          </Panel>
        )}
        {visible.map((row) => {
          const open = openId === row.id;
          return (
            <article key={row.id} className="border border-line bg-surface">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                aria-expanded={open}
                className="flex w-full flex-col gap-3 p-4 text-left sm:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Stamp tone={verdictTone(row.verdict)}>{row.verdict}</Stamp>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">Law {row.law}</span>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">{row.origin}</span>
                  <span className="font-mono text-xs uppercase tracking-wide text-muted">{row.grain}</span>
                </div>
                <h3 className="text-xl text-fg">{row.title}</h3>
                <p className="font-mono text-sm text-muted">
                  {row.authors}
                  {row.year ? ` · ${row.year}` : ""} · {row.venue}
                </p>
                <p className="text-fg">{row.why}</p>
              </button>
              {open && (
                <div className="border-t border-line px-4 py-4 sm:px-5">
                  <p className="text-fg">{row.abstract}</p>
                  {row.equation && (
                    <p className="mt-3 border border-line bg-bg p-3 font-mono text-sm text-fg">{row.equation}</p>
                  )}
                  <p className="mt-3 font-mono text-sm text-muted">Join: {row.join}</p>
                  <a href={row.url} className="mt-3 inline-flex min-h-11 items-center font-mono text-sm text-primary" target="_blank" rel="noreferrer">
                    Source
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <Panel>
        <Meta>Firecrawl · session only</Meta>
        <h2 className="mt-2 text-2xl">Deep-read one URL</h2>
        <p className="mt-2 max-w-2xl text-fg">
          Your key stays in this page’s memory. It is not written into the ledger. The page comes back as markdown and is scored by the same laws. A failed key is a failed read, not a guess.
        </p>
        <div className="mt-4 grid gap-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://arxiv.org/abs/…"
            className="min-h-11 border border-line bg-bg px-3 font-mono text-sm text-fg placeholder:text-muted"
            autoComplete="off"
          />
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Firecrawl key"
            type="password"
            className="min-h-11 border border-line bg-bg px-3 font-mono text-sm text-fg placeholder:text-muted"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => void deepRead()}
            disabled={busy}
            className="min-h-11 justify-self-start border border-line px-4 font-mono text-sm text-fg disabled:opacity-50"
          >
            Read and score
          </button>
          {crawlNote && <p className="text-fg">{crawlNote}</p>}
        </div>
      </Panel>
    </div>
  );
}
