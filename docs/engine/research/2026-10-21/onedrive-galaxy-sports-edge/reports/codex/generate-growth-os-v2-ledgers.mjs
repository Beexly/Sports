import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "docs", "research", "growth-os-v2");
fs.mkdirSync(out, { recursive: true });

const asOf = "2026-06-09";
const rel = (p) => path.relative(root, p).replaceAll(path.sep, "/");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function csvEscape(v) {
  return `"${String(v ?? "").replaceAll('"', '""')}"`;
}

function write(relPath, content) {
  fs.mkdirSync(path.dirname(path.join(out, relPath)), { recursive: true });
  fs.writeFileSync(path.join(out, relPath), content.trim() + "\n", "utf8");
}

const files = walk(root).filter((p) => {
  const r = rel(p);
  return /^(docs|reports|apps|_logs)\//.test(r);
});

const docs = files.filter((p) => /\.(md|mdx|txt|json|jsonl|csv)$/i.test(p));

const buildItems = [];

function addBuild(item) {
  const category = item.category || inferCategory(item.title + " " + item.source_file);
  const fingerprint = norm([category, item.title, item.product_surface, item.internal_surface, item.user_value, item.repo_files_mentioned].join(" "));
  buildItems.push({
    existing_id: item.existing_id,
    title: item.title,
    source_file: item.source_file,
    line_reference: item.line_reference || "",
    category,
    short_description: item.short_description || item.title,
    product_surface: item.product_surface || "",
    internal_surface: item.internal_surface || "",
    user_value: item.user_value || "",
    business_value: item.business_value || "",
    repo_files_mentioned: item.repo_files_mentioned || "",
    analytics_events_mentioned: item.analytics_events_mentioned || "",
    data_models_mentioned: item.data_models_mentioned || "",
    status: item.status || "planned",
    priority: item.priority || "",
    dependencies: item.dependencies || "",
    duplicate_risk_notes: item.duplicate_risk_notes || "",
    normalized_fingerprint: fingerprint,
    semantic_intent: item.semantic_intent || `Build or design ${item.title} for GSE / GSN.`
  });
}

function inferCategory(text) {
  const t = norm(text);
  if (/affiliate|partner|referral|dub|promotion/.test(t)) return "promotions / affiliate revenue";
  if (/pricing|checkout|upgrade|conversion|stripe|plan|pro|elite/.test(t)) return "subscription conversion";
  if (/support|chatwoot|help|faq|inbox|success/.test(t)) return "customer support";
  if (/newsletter|email|listmonk|brief|digest|lifecycle|churn|retention|winback/.test(t)) return "retention / lifecycle";
  if (/content|article|seo|editorial|payload|cms/.test(t)) return "content / SEO / editorial";
  if (/analytics|posthog|event|telemetry|funnel|tracking/.test(t)) return "product analytics";
  if (/ai|rag|langfuse|anything|open webui|agent|prompt/.test(t)) return "AI automation";
  if (/api|hoppscotch|unkey|webhook|data/.test(t)) return "data engineering";
  if (/brand|copy|voice|verbiage/.test(t)) return "brand voice / copy auditor";
  if (/contest|leaderboard|community|viral/.test(t)) return "contests / community";
  if (/finance|unit economics|revenue|ltv|cac|arpu/.test(t)) return "financial dashboards";
  if (/cockpit|founder|ops|cadence/.test(t)) return "org design / founder cockpit";
  return "tooling / open-source integrations";
}

for (const p of files) {
  const r = rel(p);
  if (r.endsWith("build-queue.jsonl") || r.endsWith("build-packets.jsonl")) {
    const lines = read(p).split(/\r?\n/).filter(Boolean);
    lines.forEach((line, idx) => {
      try {
        const j = JSON.parse(line);
        addBuild({
          existing_id: j.id || `${path.basename(p)}-${idx + 1}`,
          title: j.title || "",
          source_file: r,
          line_reference: String(idx + 1),
          category: j.category,
          product_surface: Array.isArray(j.gse_surface) ? j.gse_surface.join("; ") : (Array.isArray(j.product_surface) ? j.product_surface.join("; ") : ""),
          internal_surface: Array.isArray(j.internal_surface) ? j.internal_surface.join("; ") : "",
          user_value: j.notes || "",
          business_value: `priority=${j.priority || ""}; values=${j.revenue_value || ""}/${j.retention_value || ""}/${j.speed_value || ""}`,
          repo_files_mentioned: Array.isArray(j.repo_files) ? j.repo_files.join("; ") : "",
          status: "planned",
          priority: j.priority,
          dependencies: Array.isArray(j.dependencies) ? j.dependencies.join("; ") : "",
          duplicate_risk_notes: "Imported from existing JSONL queue.",
          semantic_intent: `Existing queued build: ${j.title || j.id}.`
        });
      } catch {}
    });
  }
}

for (const p of files.filter((x) => /\/(cards|packets)\//.test(rel(x)) && /\.md$/i.test(x))) {
  const r = rel(p);
  const text = read(p);
  const title = (text.match(/^#\s+(.+)$/m)?.[1] || path.basename(p, ".md")).replace(/^BUILD-\d+:\s*/i, "").replace(/^NEXT-\d+:\s*/i, "");
  const id = text.match(/^#\s+((?:BUILD|NEXT)-\d+)/m)?.[1] || path.basename(p, ".md").match(/^(BUILD-\d+|NEXT-\d+)/i)?.[1] || path.basename(p, ".md");
  if (!buildItems.some((b) => b.existing_id === id && b.source_file.includes("jsonl"))) {
    addBuild({
      existing_id: id.toUpperCase(),
      title,
      source_file: r,
      category: inferCategory(title + " " + text.slice(0, 500)),
      short_description: text.match(/## Goal\s+([\s\S]*?)(?:\n##|\n#|$)/i)?.[1]?.trim().replace(/\s+/g, " ") || title,
      product_surface: text.match(/## Product Surface\s+([\s\S]*?)(?:\n##|\n#|$)/i)?.[1]?.trim().replace(/\s+/g, " ") || "",
      internal_surface: text.match(/## Internal Surface\s+([\s\S]*?)(?:\n##|\n#|$)/i)?.[1]?.trim().replace(/\s+/g, " ") || "",
      user_value: text.match(/## User-Facing Value\s+([\s\S]*?)(?:\n##|\n#|$)/i)?.[1]?.trim().replace(/\s+/g, " ") || "",
      business_value: text.match(/## Why It Matters\s+([\s\S]*?)(?:\n##|\n#|$)/i)?.[1]?.trim().replace(/\s+/g, " ") || "",
      repo_files_mentioned: text.match(/Likely[^.\n]+files[^.\n]*\.?/i)?.[0] || "",
      status: "planned",
      duplicate_risk_notes: "Imported from existing markdown card or packet.",
      semantic_intent: `Existing markdown card/packet: ${title}.`
    });
  }
}

const seen = new Set();
const uniqueBuilds = buildItems.filter((b) => {
  const key = `${b.existing_id}|${b.source_file}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const docRows = docs.map((p) => {
  const r = rel(p);
  const text = read(p).slice(0, 2000);
  return {
    doc_id: norm(r).replaceAll(" ", "-"),
    source_file: r,
    title: text.match(/^#\s+(.+)$/m)?.[1] || path.basename(p),
    category: inferCategory(r + " " + text),
    status: r.includes("growth-os-v2") ? "current-mission" : "existing",
    duplicate_relevance: /build|queue|roadmap|growth|affiliate|promotion|monetization|support|newsletter|content|sales|analytics|ai|cockpit|founder/i.test(r + text) ? "HIGH" : "MEDIUM",
    notes: r.includes("oss-leverage-stack") ? "Prior 120-card OSS leverage stack." : r.includes("oss-next-wave-stack") ? "Prior 60-packet next-wave OSS stack." : r.includes("_logs") ? "Workspace reality evidence." : ""
  };
});

const surfaceNames = [
  ["workspace-root", "control/docs lane", "No complete app source tree visible; Git resolves to user profile root.", "defer"],
  ["apps/web/app/api/nflverse/birthday-usage-trend", "api route directory only", "Directory exists but no files in this workspace scan.", "verify in real clone"],
  ["GSE Rating", "planned intelligence surface", "Mentioned in mission context and prior docs, not source-verified here.", "expand after source verification"],
  ["Player Lab", "planned intelligence surface", "Mentioned in mission context and prior docs, not source-verified here.", "expand after source verification"],
  ["Track Record / receipts", "trust surface", "Existing build concepts include weekly track-record email and trust explainers.", "extend"],
  ["Promotions / partner tab", "planned monetization surface", "Prior build coverage includes affiliate/creator pipeline, Dub link plan, and partner opportunity board; no live promotions present.", "extend with compliance"],
  ["Support / help", "support surface", "Prior cards cover Chatwoot inbox, support KB, support copilot, support-to-build-card flow.", "extend"],
  ["Newsletter / Daily Brief", "lifecycle surface", "Prior cards cover listmonk free newsletter, GSE Daily Brief, alerts, winback.", "extend"],
  ["Founder cockpit", "internal surface", "Prior cards cover weekly founder cockpit digest and founder-only method brain.", "extend"],
  ["Analytics/events", "internal/product surface", "Prior packets cover PostHog baseline, event taxonomy, funnels, attribution.", "extend"]
];

const surfaceRows = surfaceNames.map(([surface, state, notes, action]) => ({
  surface,
  current_state: state,
  purpose: notes,
  monetization_role: /promotion|newsletter|rating|player|track|analytics/i.test(surface) ? "HIGH" : "MEDIUM",
  engagement_role: /rating|player|newsletter|track/i.test(surface) ? "HIGH" : "MEDIUM",
  retention_role: /support|newsletter|founder|analytics/i.test(surface) ? "HIGH" : "MEDIUM",
  trust_role: /track|support|promotion|rating|method|analytics/i.test(surface + notes) ? "HIGH" : "MEDIUM",
  support_role: /support/.test(surface.toLowerCase()) ? "HIGH" : "LOW",
  data_needed: "Requires real app/source verification before implementation.",
  gaps: "Source files absent or not fully represented in this workspace.",
  duplicate_overlap: "Prior OSS leverage and next-wave stacks cover related implementation concepts.",
  recommended_action: action
}));

const buildCsvHeaders = Object.keys(uniqueBuilds[0] || {});
write("existing-build-ledger.jsonl", uniqueBuilds.map((b) => JSON.stringify(b)).join("\n"));
write("existing-build-ledger.csv", [buildCsvHeaders.join(","), ...uniqueBuilds.map((b) => buildCsvHeaders.map((h) => csvEscape(b[h])).join(","))].join("\n"));

const docHeaders = Object.keys(docRows[0] || {});
write("existing-doc-ledger.csv", [docHeaders.join(","), ...docRows.map((d) => docHeaders.map((h) => csvEscape(d[h])).join(","))].join("\n"));

const surfHeaders = Object.keys(surfaceRows[0] || {});
write("existing-surface-ledger.csv", [surfHeaders.join(","), ...surfaceRows.map((s) => surfHeaders.map((h) => csvEscape(s[h])).join(","))].join("\n"));

write("01-existing-work-inventory.md", `# Existing Work Inventory

As of: ${asOf}

## Workspace Evidence

- Scoped Git status: the Galaxy folder is untracked under the parent user-profile Git root.
- Scoped branch: parent Git branch is \`master\`; this does not prove Galaxy app branch state.
- Scoped log for this folder: no relevant commits returned.
- File inventory: 235 files under docs/reports/apps/_logs at the time of the initial scan.
- App source: only empty-looking app directories were visible in \`apps/web\`; no package manifest or full source tree was visible.

## Existing Build Queues Found

- Prior OSS leverage queue: \`docs/research/oss-leverage-stack/claude-build-queue/build-queue.jsonl\`
- Prior OSS leverage cards: \`docs/research/oss-leverage-stack/claude-build-queue/cards/\`
- Prior next-wave packets: \`docs/research/oss-next-wave-stack/claude-build-packets/build-packets.jsonl\`
- Prior next-wave packet markdown: \`docs/research/oss-next-wave-stack/claude-build-packets/packets/\`

## Inventory Counts

- Existing build ledger rows: ${uniqueBuilds.length}
- Existing docs indexed: ${docRows.length}
- Existing surfaces indexed: ${surfaceRows.length}

## Dominant Existing Categories

- AI/RAG/research brains
- support/customer success
- CRM/sales/partner pipeline
- newsletter/lifecycle/alerts
- product analytics and attribution
- API/data testing
- design/product workflow
- video/onboarding/trust content
- cross-stack automations
- customer-facing help and paid-tier education

## Duplicate Implications

New growth work must not recreate generic newsletters, Daily Brief, support inbox, support KB, support copilot, customer feedback loop, churn winback, paid conversion sequence, API playground, source transparency snippets, personalized alert digest, PostHog event taxonomy, Payload CMS schema, Dub link plan, Formbricks onboarding survey, Trigger.dev worker jobs, Langfuse trace schema, or founder cockpit digest. Those are existing builds or packets and should be extended, linked, or superseded only when materially different.
`);

write("02-current-product-surface-audit.md", `# Current Product Surface Audit

As of: ${asOf}

## Scope Reality

The requested workspace does not expose a complete application source tree. The available evidence is a control/docs lane with prior research and reports. The only app directories visible in the scan were \`apps/web/app/api/nflverse/birthday-usage-trend\`, \`apps/web/lib/nflverse\`, and \`apps/web/__tests__\`, with no files returned by the app file scan.

## Surface Ledger

| Surface | Current State | Purpose | Monetization | Engagement | Retention | Trust | Recommended Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
${surfaceRows.map((s) => `| ${s.surface} | ${s.current_state} | ${s.purpose} | ${s.monetization_role} | ${s.engagement_role} | ${s.retention_role} | ${s.trust_role} | ${s.recommended_action} |`).join("\n")}

## Recommended Product-Surface Rule

All implementation packets must start by verifying the real GSE shipping clone. In this workspace, product surfaces are treated as planned or research-derived unless app files prove otherwise.
`);

write("03-no-duplicate-gate.md", `# No-Duplicate Gate

As of: ${asOf}

## Gate Inputs

- \`existing-build-ledger.jsonl\`
- \`existing-build-ledger.csv\`
- \`existing-doc-ledger.csv\`
- \`existing-surface-ledger.csv\`
- Prior OSS leverage queue with 120 cards
- Prior next-wave stack with 60 packets

## Classifications

- DUPLICATE: same goal, same user value, same surface, same implementation path. Action: do not create.
- VARIANT: same goal but different audience, tier, or surface. Action: merge if possible; otherwise create child build.
- EXTENSION: existing build exists but lacks one important layer. Action: create child build with parent_id.
- DEPENDENCY: build must happen before or after an existing build. Action: create dependency link.
- REPLACEMENT: new idea is better than an old idea. Action: create supersedes relationship and explain why.
- CONFLICT: new idea contradicts product, legal, responsible-gambling, or brand direction. Action: founder review.
- NET_NEW: distinct user value, business value, surface, or data model. Action: create new build card.
- UNCERTAIN_REQUIRES_REVIEW: exclude from main queue and add to \`uncertain-builds-for-review.jsonl\`.

## Duplicate Pressure Found

- Support, CRM, newsletter, lifecycle, AI/RAG, API testing, design workflow, video workflow, PostHog analytics, Payload CMS, Dub attribution, Formbricks feedback, Trigger.dev workers, Unkey API access, Novu notifications, and SigNoz observability already have build concepts.
- New cards should emphasize GSE-specific sports intelligence, responsible-play-safe promotions, no-bet/risk logic, track-record trust, GSE Rating/Product Lab education, pricing psychology, unit economics, and non-duplicative operating cadence.

## Enforcement

Every new build must include duplicate_check_status, matched_existing_ids, relation_to_existing, reason_not_duplicate, parent_id, supersedes_id, dependency_ids, and merge_notes.
`);

write("no-duplicate-rules.md", `# No-Duplicate Rules

1. Search the existing ledgers before adding any new build.
2. Reuse existing IDs when the work is identical.
3. Create child builds only when the added layer is materially different.
4. Mark old work superseded only when the replacement is clearer, safer, and more executable.
5. Keep uncertain items out of the main build queue.
6. Do not create volume for its own sake.
7. Do not split one simple task into fake multiple cards.
8. Promotions and affiliate work must remain research-only until approved.
9. Any build touching founder-only methods must define a public/private boundary.
10. Any build touching betting-adjacent language must include responsible-gambling and no-bet/risk boundaries.
`);

write("uncertain-builds-for-review.jsonl", "");

console.log(JSON.stringify({ existingBuilds: uniqueBuilds.length, docs: docRows.length, surfaces: surfaceRows.length }, null, 2));
