import * as fs from "node:fs";
import * as path from "node:path";

export interface ResearchCorpusCitation {
  source_id: string;
  chunk_id: string;
  item_id: string;
  title: string;
  location: string;
  category: string;
  section: string;
  page_or_line: string;
  relevance_score: number;
  relevance_reason: string;
  snippet: string;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9_+-]+/g) ?? []).filter((t) => t.length >= 2);
}

export function queryResearchCorpusSync(
  queryText: string,
  options?: {
    topK?: number;
    categoryFilter?: string;
    recordsJsonlPath?: string;
  }
): ResearchCorpusCitation[] {
  const topK = options?.topK ?? 5;
  const repoRoot = path.resolve(__dirname, "../../../..");
  const defaultFull = path.join(repoRoot, "data", "corpus", "research_records.jsonl");
  const defaultPriority = path.join(repoRoot, "data", "corpus", "research_records_priority.jsonl");
  const recordsPath =
    options?.recordsJsonlPath ?? (fs.existsSync(defaultFull) ? defaultFull : defaultPriority);

  const qTokens = Array.from(new Set(tokenize(queryText)));
  if (qTokens.length === 0 || !fs.existsSync(recordsPath)) {
    return [];
  }

  const qLower = queryText.toLowerCase().trim();
  const content = fs.readFileSync(recordsPath, "utf-8");
  const lines = content.split(/\r?\n/);
  const scored: ResearchCorpusCitation[] = [];

  for (const line of lines) {
    if (!line) continue;
    const lowLine = line.toLowerCase();
    if (!qTokens.some((tok) => lowLine.includes(tok))) continue;
    try {
      const rec = JSON.parse(line);
      const cat = String(rec.category ?? "");
      if (options?.categoryFilter && cat !== options.categoryFilter) continue;

      const title = String(rec.title ?? "");
      const section = String(rec.section ?? "");
      const fullText = String(rec.full_text ?? "");
      const haystack = `${title} ${section} ${fullText}`.toLowerCase();

      const matched = qTokens.filter((tok) => haystack.includes(tok));
      if (matched.length === 0) continue;

      const phraseBonus = qLower.length > 4 && haystack.includes(qLower) ? 3.5 : 0;
      const score = Number((matched.length + phraseBonus).toFixed(4));

      scored.push({
        source_id: String(rec.source_id ?? ""),
        chunk_id: String(rec.chunk_id ?? ""),
        item_id: String(rec.item_id ?? ""),
        title,
        location: String(rec.location ?? ""),
        category: cat,
        section,
        page_or_line: String(rec.page_or_line ?? "L1"),
        relevance_score: score,
        relevance_reason: `Matched ${matched.length}/${qTokens.length} query tokens (${matched.slice(0, 5).join(", ")}) in ${cat}:${section}`,
        snippet: fullText.slice(0, 320).replace(/\s+/g, " ").trim(),
      });
    } catch {
      continue;
    }
  }

  scored.sort((a, b) => b.relevance_score - a.relevance_score || a.chunk_id.localeCompare(b.chunk_id));
  return scored.slice(0, topK);
}
