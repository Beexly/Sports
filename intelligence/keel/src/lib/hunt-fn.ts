import { createServerFn } from "@tanstack/react-start";
import type { FieldSnap, RawHit, Recount, SealCheck, ShiftResult } from "@/lib/types";
import { SEAL } from "@/lib/doctrine";

const UA = "KeelIntake/1.0 (research console; public arxiv and openalex)";

type ShiftInput = {
  arxivQuery: string;
  openalexQuery: string;
  laneId: string;
  laneLabel: string;
};

type CrawlInput = { url: string; key: string };

function asShiftInput(data: ShiftInput): ShiftInput {
  if (!data || typeof data.arxivQuery !== "string" || typeof data.openalexQuery !== "string") {
    throw new Error("Shift is missing a query.");
  }
  return {
    arxivQuery: data.arxivQuery.slice(0, 400),
    openalexQuery: data.openalexQuery.slice(0, 300),
    laneId: String(data.laneId ?? "").slice(0, 40),
    laneLabel: String(data.laneLabel ?? "").slice(0, 80),
  };
}

function decodeXml(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function clean(s: string) {
  return decodeXml(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, ms: number, headers?: Record<string, string>) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...headers },
    });
    if (!res.ok) throw new Error(`${res.status} from ${new URL(url).host}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseArxiv(xml: string, lane: string): RawHit[] {
  return xml
    .split("<entry>")
    .slice(1)
    .map((block) => {
      const grab = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return m ? clean(m[1]) : "";
      };
      const authors = [...block.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => clean(m[1]));
      const id = grab("id");
      const published = grab("published");
      return {
        id: id || grab("title"),
        title: grab("title"),
        authors: authors.slice(0, 8).join(", "),
        year: published.slice(0, 4),
        venue: "arXiv",
        url: id,
        abstract: grab("summary"),
        lane,
      };
    })
    .filter((h) => h.title && h.url);
}

function abstractFromIndex(idx: Record<string, number[]> | null | undefined) {
  if (!idx) return "";
  const pairs: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const p of positions) pairs.push([p, word]);
  }
  pairs.sort((a, b) => a[0] - b[0]);
  return pairs
    .map((p) => p[1])
    .join(" ")
    .slice(0, 1800);
}

type OpenAlexWork = {
  id?: string;
  display_name?: string;
  publication_year?: number;
  authorships?: { author?: { display_name?: string } }[];
  primary_location?: { source?: { display_name?: string }; landing_page_url?: string };
  abstract_inverted_index?: Record<string, number[]> | null;
  doi?: string;
};

function parseOpenAlex(json: string, lane: string): RawHit[] {
  const data = JSON.parse(json) as { results?: OpenAlexWork[] };
  return (data.results ?? []).map((work) => {
    const authors = (work.authorships ?? [])
      .map((a) => a.author?.display_name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 8)
      .join(", ");
    const url = work.doi
      ? work.doi.startsWith("http")
        ? work.doi
        : `https://doi.org/${work.doi.replace(/^doi:/, "")}`
      : work.primary_location?.landing_page_url || work.id || "";
    return {
      id: work.id || work.display_name || url,
      title: work.display_name || "Untitled",
      authors,
      year: work.publication_year ? String(work.publication_year) : "",
      venue: work.primary_location?.source?.display_name || "OpenAlex",
      url,
      abstract: abstractFromIndex(work.abstract_inverted_index),
      lane,
    };
  });
}

type ResearchPaper = { paperId?: string; primaryId?: string; title?: string; abstract?: string };

function researchUrl(primaryId: string) {
  if (primaryId.startsWith("arxiv:")) return `https://arxiv.org/abs/${primaryId.slice(6)}`;
  if (primaryId.startsWith("pmcid:")) return `https://www.ncbi.nlm.nih.gov/pmc/articles/${primaryId.slice(6)}/`;
  if (primaryId.startsWith("pmid:")) return `https://pubmed.ncbi.nlm.nih.gov/${primaryId.slice(5)}/`;
  if (primaryId.startsWith("doi:")) return `https://doi.org/${primaryId.slice(4)}`;
  return "";
}

function researchYear(primaryId: string) {
  const match = primaryId.match(/^arxiv:(\d{2})/);
  if (!match) return "";
  const yy = Number(match[1]);
  return String(yy >= 90 ? 1900 + yy : 2000 + yy);
}

function parseResearch(json: string, lane: string): RawHit[] {
  const data = JSON.parse(json) as { results?: ResearchPaper[] };
  return (data.results ?? []).flatMap((paper) => {
    const primary = paper.primaryId || "";
    const url = researchUrl(primary);
    if (!paper.title || !url) return [];
    return [
      {
        id: paper.paperId || primary || url,
        title: paper.title,
        authors: "Alexandria index",
        year: researchYear(primary),
        venue: "Alexandria",
        url,
        abstract: (paper.abstract || "").slice(0, 1800),
        lane,
      },
    ];
  });
}

type GhAsset = { name: string; size: number; updated_at: string };

async function releaseAssets(tag: string): Promise<GhAsset[]> {
  const text = await fetchText(
    `https://api.github.com/repos/nflverse/nflverse-data/releases/tags/${tag}`,
    12000,
    { Accept: "application/vnd.github+json" },
  );
  const data = JSON.parse(text) as { assets?: GhAsset[] };
  return data.assets ?? [];
}

export const runShift = createServerFn({ method: "POST" })
  .validator(asShiftInput)
  .handler(async ({ data }): Promise<ShiftResult> => {
    const errors: string[] = [];
    let hits: RawHit[] = [];
    const arxivUrl =
      "https://export.arxiv.org/api/query?search_query=" +
      encodeURIComponent(data.arxivQuery) +
      "&start=0&max_results=6&sortBy=submittedDate&sortOrder=descending";
    const alexUrl =
      "https://api.openalex.org/works?search=" +
      encodeURIComponent(data.openalexQuery) +
      "&per-page=6&sort=publication_date:desc&mailto=keel-intake@example.com";

    const [arxiv, alex, research] = await Promise.allSettled([
      fetchText(arxivUrl, 15000),
      fetchText(alexUrl, 15000, { Accept: "application/json" }),
      fetchText(
        "https://api.firecrawl.dev/v2/search/research/papers?query=" +
          encodeURIComponent(data.openalexQuery) +
          "&k=4",
        15000,
        { Accept: "application/json" },
      ),
    ]);

    if (arxiv.status === "fulfilled") {
      hits = hits.concat(parseArxiv(arxiv.value, data.laneLabel));
    } else {
      errors.push(`arXiv: ${arxiv.reason instanceof Error ? arxiv.reason.message : "failed"}`);
    }
    if (alex.status === "fulfilled") {
      hits = hits.concat(parseOpenAlex(alex.value, data.laneLabel));
    } else {
      const msg = alex.reason instanceof Error ? alex.reason.message : "failed";
      errors.push(
        msg.includes("429")
          ? "OpenAlex is rate-limited on this network today. arXiv still ran."
          : `OpenAlex: ${msg}`,
      );
    }
    if (research.status === "fulfilled") {
      try {
        hits = hits.concat(parseResearch(research.value, data.laneLabel));
      } catch {
        errors.push("Alexandria returned a page that was not papers.");
      }
    } else {
      const msg = research.reason instanceof Error ? research.reason.message : "failed";
      errors.push(msg.includes("429") ? "Alexandria is rate-limited." : `Alexandria: ${msg}`);
    }

    const seal: SealCheck = {
      ok: errors.length === 0,
      error: errors.length ? errors.join(" · ") : undefined,
      checkedAt: new Date().toISOString(),
      injuriesUpdated: null,
      injuriesBytes: null,
      ngsUpdated: null,
      ngsBytes: null,
      stubBytes: null,
      injuriesMatch: null,
      ngsMatch: null,
      stubMatch: null,
    };

    try {
      const [inj, ngs] = await Promise.all([releaseAssets("injuries"), releaseAssets("nextgen_stats")]);
      const injAsset = inj.find((a) => a.name === "injuries_2026.csv.gz");
      const ngsAsset = ngs.find((a) => a.name === "ngs_passing.csv.gz");
      const stub = ngs.find((a) => a.name === "ngs_2024_passing.csv.gz");
      seal.injuriesUpdated = injAsset?.updated_at ?? null;
      seal.injuriesBytes = injAsset?.size ?? null;
      seal.ngsUpdated = ngsAsset?.updated_at ?? null;
      seal.ngsBytes = ngsAsset?.size ?? null;
      seal.stubBytes = stub?.size ?? null;
      seal.injuriesMatch = injAsset ? injAsset.size === SEAL.injuriesBytes : null;
      seal.ngsMatch = ngsAsset ? ngsAsset.size === SEAL.ngsCombinedBytes : null;
      seal.stubMatch = stub ? stub.size === SEAL.ngsStubBytes : null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "release check failed";
      seal.error = seal.error ? `${seal.error} · nflverse: ${msg}` : `nflverse: ${msg}`;
      seal.ok = false;
    }

    return { ok: hits.length > 0 || seal.injuriesBytes !== null, error: seal.error, hits, seal, laneId: data.laneId };
  });

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const header = rows[0] ?? [];
  return rows.slice(1).filter((r) => r.some((v) => v.length > 0)).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = r[i] ?? "";
    });
    return obj;
  });
}

async function gunzipUrl(url: string, maxBytes: number) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${res.status} downloading ${url.split("/").pop()}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("File larger than the cap. Refusing to parse.");
    const { gunzipSync } = await import("node:zlib");
    return { text: gunzipSync(buf).toString("utf8"), bytes: buf.byteLength };
  } finally {
    clearTimeout(timer);
  }
}

function summarizeField(injuries: Record<string, string>[], passing: Record<string, string>[]): FieldSnap {
  const line = new Set(["C", "G", "T"]);
  const week4 = injuries.filter((row) => row.week === "4");
  const teams = [...new Set(week4.map((row) => row.team))].sort();
  const ol: FieldSnap["ol"] = [];
  const nullTeams: string[] = [];
  for (const team of teams) {
    const rows = week4.filter((row) => row.team === team && line.has(row.position));
    if (!rows.length) nullTeams.push(team);
    else ol.push({ team, ol: rows.length, out: rows.filter((row) => row.report_status === "Out").length });
  }
  ol.sort((a: FieldSnap["ol"][number], b: FieldSnap["ol"][number]) => b.out - a.out || b.ol - a.ol || a.team.localeCompare(b.team));
  const passers = passing
    .filter((row) => row.season === "2026" && row.week === "0" && row.avg_time_to_throw)
    .map((row) => ({
      name: row.player_display_name,
      team: row.team_abbr,
      ttt: Math.round(Number(row.avg_time_to_throw) * 1000) / 1000,
      att: Number(row.attempts) || 0,
      gsis: row.player_gsis_id,
    }))
    .filter((row) => Number.isFinite(row.ttt))
    .sort((a, b) => b.att - a.att);
  const ttts = passers.map((row) => row.ttt).sort((a, b) => a - b);
  const mid = ttts.length ? ttts[Math.floor(ttts.length / 2)] : 0;
  return { ol, nullTeams, passers, min: ttts[0] ?? 0, median: mid, max: ttts[ttts.length - 1] ?? 0 };
}

export const recountSeal = createServerFn({ method: "POST" })
  .validator((data: { confirm: boolean }) => {
    if (!data?.confirm) throw new Error("Recount was not confirmed.");
    return data;
  })
  .handler(async (): Promise<Recount> => {
    const checkedAt = new Date().toISOString();
    try {
      const [inj, ngs, stubMeta] = await Promise.all([
        gunzipUrl(
          "https://github.com/nflverse/nflverse-data/releases/download/injuries/injuries_2026.csv.gz",
          2_000_000,
        ),
        gunzipUrl(
          "https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_passing.csv.gz",
          8_000_000,
        ),
        releaseAssets("nextgen_stats"),
      ]);
      const injuries = parseCsv(inj.text);
      const OL = new Set(["C", "G", "T"]);
      const weeks: Record<string, number> = {};
      for (const r of injuries) weeks[r.week] = (weeks[r.week] ?? 0) + 1;
      const week4 = injuries.filter((r) => r.week === "4");
      const week4Ol = week4.filter((r) => OL.has(r.position));
      const cleveland = week4
        .filter((r) => r.team === "CLE" && OL.has(r.position))
        .map((r) => ({
          name: r.full_name,
          pos: r.position,
          report: r.report_status,
          practice: r.practice_status,
          reportInjury: r.report_primary_injury,
          practiceInjury: r.practice_primary_injury,
        }));
      const passing = parseCsv(ngs.text);
      const watson = passing
        .filter((r) => r.season === "2026" && r.player_gsis_id === "00-0033537")
        .map((r) => ({ week: r.week, ttt: r.avg_time_to_throw, attempts: r.attempts }))
        .sort((a, b) => Number(a.week) - Number(b.week));
      const rodgers4 = passing.find(
        (r) => r.season === "2026" && r.week === "4" && r.player_gsis_id === "00-0023459",
      );
      const stub = stubMeta.find((a) => a.name === "ngs_2024_passing.csv.gz");
      const field = summarizeField(injuries, passing);
      return {
        ok: true,
        checkedAt,
        stubBytes: stub?.size ?? null,
        injuries: {
          rows: injuries.length,
          weeks,
          week4: week4.length,
          week4Ol: week4Ol.length,
          week4OlOut: week4Ol.filter((r) => r.report_status === "Out").length,
          pitWeek4Ol: week4.filter((r) => r.team === "PIT" && OL.has(r.position)).length,
          cleveland,
          bytes: inj.bytes,
        },
        ngs: {
          rows: passing.length,
          week4Passers: passing.filter((r) => r.season === "2026" && r.week === "4").length,
          watsonSeason: watson.find((w) => w.week === "0")?.ttt ?? "",
          watsonWeeks: watson,
          rodgersWeek4: {
            ttt: rodgers4?.avg_time_to_throw ?? "",
            attempts: rodgers4?.attempts ?? "",
          },
          bytes: ngs.bytes,
        },
        field,
      };
    } catch (err) {
      return {
        ok: false,
        checkedAt,
        error: err instanceof Error ? err.message : "Recount failed.",
        stubBytes: null,
      };
    }
  });

export const crawlPage = createServerFn({ method: "POST" })
  .validator((data: CrawlInput) => {
    if (!data || typeof data.url !== "string" || typeof data.key !== "string") {
      throw new Error("Deep read needs a URL and a Firecrawl key.");
    }
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      throw new Error("That URL is not usable.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only http and https URLs can be read.");
    }
    return { url: parsed.toString().slice(0, 500), key: data.key.trim().slice(0, 200) };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; title: string; markdown: string; url: string }> => {
    if (!data.key) return { ok: false, error: "No Firecrawl key in this session.", title: "", markdown: "", url: data.url };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          Authorization: `Bearer ${data.key}`,
          "Content-Type": "application/json",
          "User-Agent": UA,
        },
        body: JSON.stringify({
          url: data.url,
          formats: ["markdown"],
          onlyMainContent: true,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { markdown?: string; metadata?: { title?: string; description?: string } };
      };
      if (!res.ok || json.success === false) {
        return {
          ok: false,
          error: json.error || `Firecrawl returned ${res.status}.`,
          title: "",
          markdown: "",
          url: data.url,
        };
      }
      const markdown = (json.data?.markdown ?? "").slice(0, 8000);
      const title = json.data?.metadata?.title || data.url;
      return { ok: true, title, markdown, url: data.url };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Firecrawl failed.",
        title: "",
        markdown: "",
        url: data.url,
      };
    } finally {
      clearTimeout(timer);
    }
  });
