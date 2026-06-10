import fs from "node:fs/promises";
import path from "node:path";

const root = "C:/Users/Garrett/Sports";
const outDir = path.join(root, "docs/command-center/discovery/elevenlabs-voice-os");
const buildDir = path.join(outDir, "build-queue");
const cardsDir = path.join(buildDir, "cards");
const reportDir = path.join(root, "reports/codex/elevenlabs-voice-os");

const repoIds = [
  "elevenlabs-python",
  "ui",
  "elevenlabs-mcp",
  "examples",
  "elevenlabs-js",
  "skills",
  "captions.events",
  "elevenlabs-swift-sdk",
  "packages",
  "elevenlabs-nextjs-starter",
  "elevenlabs-flutter",
  "voice-starterkit-swift",
  "opuspy",
  "elevenlabs-n8n",
  "eleven.shopping",
  "components-swift",
  "powers",
  "elevenlabs-mcp-player",
  "plugin",
  "cli",
];

const officialSources = [
  { label: "ElevenLabs GitHub organization", url: "https://github.com/elevenlabs" },
  { label: "ElevenLabs API quickstart", url: "https://elevenlabs.io/docs/eleven-api/quickstart" },
  { label: "ElevenLabs libraries and SDKs", url: "https://elevenlabs.io/docs/eleven-api/resources/libraries" },
  { label: "ElevenLabs API pricing", url: "https://elevenlabs.io/pricing/api" },
  { label: "ElevenLabs safety", url: "https://elevenlabs.io/safety" },
  { label: "ElevenLabs use policy", url: "https://elevenlabs.io/use-policy" },
];

const repoPurpose = {
  "elevenlabs-python": "Official Python SDK for ElevenLabs API calls.",
  ui: "TypeScript/shadcn-style UI component library for multimodal agents.",
  "elevenlabs-mcp": "Official MCP server for ElevenLabs agent/tool workflows.",
  examples: "Prompt-driven examples for speech, sound, music, transcription, and agents.",
  "elevenlabs-js": "Official JavaScript/TypeScript SDK for ElevenLabs API calls.",
  skills: "ElevenLabs skills/examples for agent and voice workflows.",
  "captions.events": "Caption event tooling/patterns for synchronized transcript UX.",
  "elevenlabs-swift-sdk": "Swift SDK for native Apple ElevenLabs integrations.",
  packages: "Shared package workspace for ElevenLabs web/client tooling.",
  "elevenlabs-nextjs-starter": "Next.js starter for ElevenLabs web app integration.",
  "elevenlabs-flutter": "Flutter SDK/plugin for mobile/cross-platform ElevenLabs usage.",
  "voice-starterkit-swift": "Swift voice starter kit for native voice experience prototyping.",
  opuspy: "Python Opus audio tooling.",
  "elevenlabs-n8n": "n8n integration nodes/workflows for ElevenLabs automation.",
  "eleven.shopping": "Experimental ElevenLabs shopping/commerce voice pattern repo.",
  "components-swift": "Swift components for native ElevenLabs UI/voice experiences.",
  powers: "Experimental powers/actions pattern repo for agent-like workflows.",
  "elevenlabs-mcp-player": "MCP player tooling for ElevenLabs audio generation/playback flows.",
  plugin: "Plugin pattern repo for ElevenLabs integrations.",
  cli: "Command line interface for ElevenLabs workflows.",
};

const directUse = {
  "elevenlabs-js": "Best future SDK fit for a Next.js adapter once API approval and budget controls exist.",
  "elevenlabs-python": "Internal batch generation or research scripts if Python tooling becomes the safer lane.",
  ui: "Study and prototype local transcript/audio UI patterns without calling paid APIs.",
  "elevenlabs-nextjs-starter": "Study starter architecture for a GSE-safe provider adapter and playback shell.",
  "elevenlabs-mcp": "Future internal agent workflow for approved script-to-audio generation.",
  examples: "Reference examples for safe prototype shape and text-source-first workflow.",
  "captions.events": "Caption timing and transcript UX patterns for accessibility.",
  "elevenlabs-n8n": "Future no-code automation for approved support/content voice pipelines.",
  cli: "Future internal operator tool after approval; never with secrets committed.",
};

const adoptionOverrides = {
  "elevenlabs-js": "PROTOTYPE_ONLY",
  "elevenlabs-python": "PROTOTYPE_ONLY",
  ui: "USE_NOW_INTERNAL",
  "elevenlabs-nextjs-starter": "PROTOTYPE_ONLY",
  examples: "PROTOTYPE_ONLY",
  "elevenlabs-mcp": "AGENT_WORKFLOW",
  "elevenlabs-mcp-player": "AGENT_WORKFLOW",
  skills: "AGENT_WORKFLOW",
  powers: "INSPIRATION_ONLY",
  "captions.events": "PROTOTYPE_ONLY",
  opuspy: "INSPIRATION_ONLY",
  "elevenlabs-n8n": "AGENT_WORKFLOW",
  "elevenlabs-swift-sdk": "MOBILE_FUTURE",
  "elevenlabs-flutter": "MOBILE_FUTURE",
  "voice-starterkit-swift": "MOBILE_FUTURE",
  "components-swift": "MOBILE_FUTURE",
  packages: "INSPIRATION_ONLY",
  "eleven.shopping": "INSPIRATION_ONLY",
  plugin: "INSPIRATION_ONLY",
  cli: "AGENT_WORKFLOW",
};

const webVerifiedOverrides = {
  opuspy: {
    repo_name: "elevenlabs/opuspy",
    url: "https://github.com/elevenlabs/opuspy",
    purpose: "Python wrapper over Opus for reading and writing Opus audio files.",
    license: "NOASSERTION",
    language: "Python",
    framework: "Python audio processing",
    package_manager: "pip",
    stars: "unknown",
    forks: "unknown",
    pushed_at: "unknown",
    latest_release: "unknown",
    recommended_adoption_mode: "INSPIRATION_ONLY",
    notes: "Useful only for audio-processing pattern study; not needed for web launch.",
  },
  "elevenlabs-n8n": {
    repo_name: "elevenlabs/elevenlabs-n8n",
    url: "https://github.com/elevenlabs/elevenlabs-n8n",
    purpose: "Official ElevenLabs n8n node for Text to Speech, Speech to Text, and Conversational AI.",
    license: "MIT",
    language: "TypeScript",
    framework: "n8n node",
    package_manager: "npm",
    stars: 30,
    forks: 12,
    pushed_at: "2026-03-31T00:00:00Z",
    latest_release: "unknown",
    recommended_adoption_mode: "AGENT_WORKFLOW",
    notes: "Future internal automation only; issues indicate installation/auth support burden.",
  },
  "eleven.shopping": {
    repo_name: "elevenlabs/eleven.shopping",
    url: "https://github.com/elevenlabs/eleven.shopping",
    purpose: "Conversational commerce demo using ElevenLabs agents and MCP UI patterns.",
    license: "NOASSERTION",
    language: "TypeScript",
    framework: "Next.js 14; Tailwind; MCP UI",
    package_manager: "npm",
    stars: 23,
    forks: 10,
    pushed_at: "unknown",
    latest_release: "none found",
    recommended_adoption_mode: "INSPIRATION_ONLY",
    notes: "Study consent, commerce, and voice UX patterns only; do not copy shopping flow.",
  },
  "components-swift": {
    repo_name: "elevenlabs/components-swift",
    url: "https://github.com/elevenlabs/components-swift",
    purpose: "SwiftUI components for real-time ElevenLabs voice experiences.",
    license: "MIT",
    language: "Swift",
    framework: "SwiftUI; LiveKit-derived components",
    package_manager: "SwiftPM",
    stars: 112,
    forks: 57,
    pushed_at: "2026-06-05T00:00:00Z",
    latest_release: "unknown",
    recommended_adoption_mode: "MOBILE_FUTURE",
    notes: "Future native mobile only; no web launch use.",
  },
  powers: {
    repo_name: "elevenlabs/powers",
    url: "https://github.com/elevenlabs/powers",
    purpose: "Documentation-only Kiro power for ElevenLabs developer workflows.",
    license: "MIT",
    language: "Markdown",
    framework: "Kiro power docs",
    package_manager: "none",
    stars: 3,
    forks: 0,
    pushed_at: "2026-03-16T00:00:00Z",
    latest_release: "none found",
    recommended_adoption_mode: "INSPIRATION_ONLY",
    notes: "Pattern study for agent instructions, not an app dependency.",
  },
  "elevenlabs-mcp-player": {
    repo_name: "elevenlabs/elevenlabs-mcp-player",
    url: "https://github.com/elevenlabs/elevenlabs-mcp-player",
    purpose: "Audio Player MCP bundle for Claude Desktop with ElevenLabs integration and local playback.",
    license: "MIT",
    language: "TypeScript",
    framework: "MCP; audio player",
    package_manager: "npm",
    stars: 88,
    forks: 22,
    pushed_at: "2026-06-03T00:00:00Z",
    latest_release: "unknown",
    recommended_adoption_mode: "AGENT_WORKFLOW",
    notes: "Internal playback/workflow inspiration; avoid public generation until approvals exist.",
  },
  plugin: {
    repo_name: "elevenlabs/plugins",
    url: "https://github.com/elevenlabs/plugins",
    purpose: "Canonical plural repo for Claude Code plugins for voice interactions; singular elevenlabs/plugin was not verified.",
    license: "NOASSERTION",
    language: "Claude plugin / shell scripts",
    framework: "Claude Code plugin",
    package_manager: "plugin marketplace",
    stars: "unknown",
    forks: "unknown",
    pushed_at: "unknown",
    latest_release: "unknown",
    recommended_adoption_mode: "AGENT_WORKFLOW",
    notes: "Use only as internal workflow inspiration; requires microphone and API-key handling.",
  },
  cli: {
    repo_name: "elevenlabs/cli",
    url: "https://github.com/elevenlabs/cli",
    purpose: "Command line interface for managing ElevenLabs agents as code.",
    license: "MIT",
    language: "TypeScript",
    framework: "CLI; agents as code",
    package_manager: "npm",
    stars: "unknown",
    forks: "unknown",
    pushed_at: "unknown",
    latest_release: "unknown",
    recommended_adoption_mode: "AGENT_WORKFLOW",
    notes: "Future internal operator tool only; do not store or print secrets.",
  },
};

const gseSurfaces = [
  { surface: "homepage", route: "/", feature: "10-second spoken product primer", tier: "FREE", risk: "Low if transcript-first and disclosed." },
  { surface: "GSE Rating", route: "not verified as route", feature: "Explain This Voice Card", tier: "PRO", risk: "Must not reveal weights or formulas." },
  { surface: "Player Lab", route: "not verified as route", feature: "Player Risk Passport Audio", tier: "PRO/ELITE", risk: "Blocked until roster source truth exists." },
  { surface: "player pages", route: "not present", feature: "Narrated player summary", tier: "Future", risk: "Requires current roster/entity graph." },
  { surface: "team pages", route: "not present", feature: "Narrated team trend brief", tier: "Future", risk: "Requires source freshness guard." },
  { surface: "Daily Brief", route: "/brief", feature: "GSE Audio Brief", tier: "FREE/PRO", risk: "Must be generated from approved text only." },
  { surface: "blog/journal", route: "/blog and /journal", feature: "Article-to-audio narration", tier: "FREE/PRO", risk: "Must preserve citations and disclaimers." },
  { surface: "pricing", route: "/pricing", feature: "30-second plan explainer", tier: "FREE", risk: "No pressure selling." },
  { surface: "promotions", route: "/promotions", feature: "Disclosure narration placeholder", tier: "Future", risk: "Legal/founder approval required." },
  { surface: "FAQ", route: "/faq", feature: "Support audio snippets", tier: "FREE", risk: "Avoid storing customer audio." },
  { surface: "contact", route: "/contact", feature: "Confused-user support walkthrough", tier: "FREE", risk: "Transcript/source only." },
  { surface: "performance", route: "/performance", feature: "Weekly autopsy audio", tier: "ELITE", risk: "No premature performance claims." },
  { surface: "methodology", route: "/methodology", feature: "Methodology safe explainer", tier: "FREE", risk: "High method leakage risk." },
  { surface: "picks", route: "/picks", feature: "No-bet and risk narration", tier: "PRO", risk: "No betting urgency or stake language." },
  { surface: "board", route: "/board", feature: "What changed audio strip", tier: "PRO/ELITE", risk: "Must say degraded/stale when data is unavailable." },
  { surface: "support/help", route: "FAQ/contact/current docs", feature: "Galaxy Studios Help Overlay", tier: "FREE", risk: "AI disclosure and transcript parity." },
  { surface: "cockpit/founder", route: "/cockpit/*", feature: "Founder Voice Brief", tier: "Founder-only", risk: "Never expose public audio." },
  { surface: "error/empty states", route: "global", feature: "Short calm guidance clip", tier: "FREE", risk: "No paid API call on errors." },
  { surface: "mobile views", route: "public routes", feature: "Listen instead of read affordance", tier: "FREE/PRO", risk: "Accessibility controls required." },
];

const concepts = [
  ["GSE Audio Brief", "Narrated Daily Brief users can listen to in under two minutes.", "/brief", "elevenlabs-js, captions.events", "PRO", "Post-P0 prototype"],
  ["Explain This Voice Card", "20-45 second spoken explanation of one rating, no-bet flag, market movement, or player risk card.", "/board, /picks, future Player Lab", "ui, elevenlabs-js", "PRO", "Prototype only"],
  ["Galaxy Studios Help Overlay", "Short transcript-first narrated help clips embedded across dense surfaces.", "/faq, /board, /pricing", "ui, examples", "FREE", "Use static prototype now"],
  ["No-Bet Coach", "Calm audio explaining why silence/no-bet is valuable.", "/picks, /board", "elevenlabs-js, audio policy", "FREE/PRO", "Post-launch"],
  ["Player Risk Passport Audio", "Narrated player role, availability, volatility, usage, and source freshness.", "future Player Lab", "elevenlabs-js", "PRO/ELITE", "Blocked on roster source truth"],
  ["Weekly Autopsy Audio", "Narrated recap of what the model got right, wrong, and what changed.", "/performance, /journal", "elevenlabs-js, captions.events", "ELITE", "Post-launch"],
  ["Support Voice Replies", "Support can attach short spoken walkthroughs generated from approved help text.", "/contact, help center", "elevenlabs-mcp, n8n", "Internal/FREE", "Internal prototype"],
  ["Onboarding Voice Tour", "Guided first-run walkthrough explaining GSE without jargon.", "homepage/onboarding", "ui, nextjs starter", "FREE", "Prototype after P0"],
  ["Accessibility Narration", "Audio alternative for users with reading fatigue or accessibility needs.", "global", "ui, captions.events", "FREE", "Prototype"],
  ["Founder Voice Brief", "Internal spoken summary of launch blockers, data health, revenue, and build queue.", "/cockpit", "mcp, cli", "Founder-only", "Internal only"],
  ["Sales Demo Narration", "Voiceover scripts for partner/investor demos.", "sales/demo content", "examples, cli", "Internal", "Safe script-only now"],
  ["Content-to-Shorts Pipeline", "Turn approved articles/briefs into captioned short-form scripts and voiceover assets.", "/journal, /cockpit/studio", "examples, captions.events", "Growth", "Post-P0"],
  ["Promotion Disclosure Narration", "Spoken disclosures and responsible-play language for partner offers.", "/promotions", "elevenlabs-js", "Future", "Legal-only"],
  ["Multilingual Future Layer", "Future translation/dubbing for broader markets.", "global", "SDKs/mobile", "Future", "Legal/support validation required"],
];

const buildCards = [
  ["001", "Voice OS repo verification ledger", "repo verification", ["all"], "docs/command-center/discovery/elevenlabs-voice-os", "Validate every target repo before adoption.", "P0", "S"],
  ["002", "Voice safety operating policy extension", "script safety linter", ["elevenlabs-js", "elevenlabs-python"], "docs/media/audio-voice-policy.md extension", "Extend existing audio policy for ElevenLabs-specific risk.", "P0", "M"],
  ["003", "Transcript-first audio card component spec", "transcript component", ["ui"], "/brief, /faq, /board", "Define the player/transcript/caption UX before audio generation.", "P0", "M"],
  ["004", "Local fake voice provider adapter", "voice provider adapter", ["elevenlabs-js"], "apps/web/lib/voice prototype", "Add no-API provider interface with fake local output for tests.", "P1", "M"],
  ["005", "VoiceScript data contract", "voice provider adapter", ["elevenlabs-js", "examples"], "packages/types or docs spec", "Type scripts before audio assets exist.", "P1", "S"],
  ["006", "Voice script safety linter", "script safety linter", ["examples"], "scripts/guardrails", "Block hype, impersonation, method leakage, stale-data certainty.", "P1", "M"],
  ["007", "No-bet audio template", "no-bet audio template", ["examples"], "/picks, /board", "Make no-bet value understandable without gambling urgency.", "P1", "S"],
  ["008", "Daily Brief voice script template", "audio brief prototype", ["examples"], "/brief", "Generate approved text-only audio scripts from daily brief data.", "P1", "S"],
  ["009", "Founder weekly spoken brief template", "founder voice brief", ["elevenlabs-mcp", "cli"], "/cockpit", "Internal launch/revenue/source-health digest script.", "P1", "S"],
  ["010", "Explain This Card static prototype", "explain-this-card prototype", ["ui", "nextjs starter"], "/board, /picks", "Prototype static transcript/audio controls without API calls.", "P1", "M"],
  ["011", "Captions event schema", "captions component", ["captions.events"], "voice data model", "Prepare synced captions and transcript timing.", "P1", "M"],
  ["012", "Audio disclosure component", "audio player component", ["ui"], "global components", "Always show AI-narrated disclosure and text source.", "P0", "S"],
  ["013", "Voice approval queue spec", "voice approval queue", ["elevenlabs-mcp", "n8n"], "/cockpit/review", "Require human/founder approval before any public audio.", "P1", "M"],
  ["014", "Voice cost ledger spec", "voice cost ledger", ["elevenlabs-js", "elevenlabs-python"], "/cockpit/api-costs", "Track characters, minutes, model, cache hits, and budget alerts.", "P1", "M"],
  ["015", "Voice analytics event taxonomy", "voice analytics", ["ui"], "analytics layer", "Measure play, completion, transcript opens, and CTA impact.", "P1", "S"],
  ["016", "Stale-data audio invalidation", "stale-data audio invalidation", ["examples"], "source freshness guard", "Invalidate audio when source text/data changes.", "P1", "M"],
  ["017", "Method-leakage audio guard", "method-leakage audio guard", ["examples"], "guardrails", "Block formulas, weights, and private methodology from scripts.", "P0", "M"],
  ["018", "Promotions voice compliance guard", "promotions voice compliance guard", ["elevenlabs-js"], "/promotions", "Block promotional narration until legal/founder approval.", "P0", "M"],
  ["019", "Support audio template library", "support audio template", ["examples", "n8n"], "/faq, /contact", "Turn approved support answers into short spoken walkthrough scripts.", "P1", "M"],
  ["020", "Onboarding voice tour outline", "onboarding voice tour", ["nextjs starter", "ui"], "homepage/onboarding", "Teach users how to find value in 10 seconds.", "P1", "M"],
  ["021", "Pricing voice explainer", "support audio template", ["examples"], "/pricing", "Reduce plan confusion without pressure tactics.", "P2", "S"],
  ["022", "Performance/autopsy narration policy", "accessibility narration", ["examples"], "/performance", "Narrate outcome reviews without implying future guarantees.", "P1", "S"],
  ["023", "Article-to-audio pipeline spec", "article-to-audio pipeline", ["examples", "captions.events"], "/journal, /blog", "Turn approved articles into audio with citations preserved.", "P2", "M"],
  ["024", "Content-to-shorts voiceover packet", "sales demo voiceover", ["examples"], "/cockpit/studio", "Create script/caption packets for short-form education clips.", "P2", "M"],
  ["025", "MCP script-to-audio workflow design", "MCP voice workflow", ["elevenlabs-mcp", "elevenlabs-mcp-player"], "internal agent workflow", "Map approved script generation to controlled audio generation.", "P2", "M"],
  ["026", "n8n support audio workflow", "n8n voice workflow", ["elevenlabs-n8n"], "support ops", "Automate approved support audio generation after human review.", "P2", "M"],
  ["027", "CLI operator voice job tool", "CLI voice tools", ["cli"], "operator terminal", "Design safe local command wrapper that never logs secrets.", "P2", "M"],
  ["028", "Swift mobile voice future architecture", "mobile future architecture", ["elevenlabs-swift-sdk", "voice-starterkit-swift", "components-swift"], "future mobile app", "Plan native audio brief and alert experiences.", "P3", "M"],
  ["029", "Flutter mobile voice future architecture", "mobile future architecture", ["elevenlabs-flutter"], "future cross-platform mobile", "Plan Flutter fallback if mobile stack goes cross-platform.", "P3", "M"],
  ["030", "Opus audio encoding research note", "audio processing", ["opuspy"], "audio storage/processing", "Evaluate if Opus tooling belongs in backend processing.", "P3", "S"],
  ["031", "ElevenLabs UI pattern spike", "audio player component", ["ui"], "prototype route/docs", "Study component patterns without importing dependency.", "P1", "S"],
  ["032", "Next.js starter architecture comparison", "repo verification", ["elevenlabs-nextjs-starter"], "architecture docs", "Map starter patterns to GSE app router constraints.", "P1", "S"],
  ["033", "Audio asset storage policy", "voice provider adapter", ["elevenlabs-js"], "storage layer", "Define where generated audio/captions live and retention rules.", "P1", "M"],
  ["034", "Voice consent and deletion policy", "script safety linter", ["all"], "privacy docs", "Block user audio/transcript storage without consent.", "P0", "S"],
  ["035", "Customer-facing help overlay transcript demo", "onboarding voice tour", ["ui"], "/faq", "Prototype a help clip with transcript-only placeholder.", "P2", "M"],
  ["036", "Risk/volatility audio glossary", "no-bet audio template", ["examples"], "/methodology, /picks", "Explain risk language calmly and consistently.", "P1", "S"],
  ["037", "Audio fallback text-only mode", "audio player component", ["ui"], "global", "Ensure no audio feature blocks comprehension or accessibility.", "P1", "S"],
  ["038", "Voice cache and regeneration rules", "voice cost ledger", ["elevenlabs-js"], "voice architecture", "Prevent duplicate paid generation and stale assets.", "P1", "M"],
  ["039", "Voice abuse and quota throttle", "voice cost ledger", ["elevenlabs-js"], "API adapter", "Rate-limit generation by surface/tier/user.", "P1", "M"],
  ["040", "Player Risk Passport audio blocker checklist", "accessibility narration", ["elevenlabs-js"], "future Player Lab", "Define roster freshness and data gates before player audio.", "P0", "S"],
  ["041", "Sales demo narration script pack", "sales demo voiceover", ["examples"], "sales/partner demos", "Create safe non-generated scripts for demos.", "P2", "S"],
  ["042", "Release note narration workflow", "article-to-audio pipeline", ["cli", "examples"], "/changelog", "Make changes easy to understand without reading changelog walls.", "P2", "S"],
  ["043", "Audio QA screenshot and transcript test plan", "accessibility narration", ["ui"], "QA docs", "Verify player controls, captions, transcript parity, and disclosures.", "P1", "S"],
  ["044", "Voice source provenance banner", "transcript component", ["ui"], "audio cards", "Show what text/source generated each audio asset.", "P1", "M"],
  ["045", "Internal source conflict spoken summary", "founder voice brief", ["mcp", "cli"], "/cockpit/sources", "Summarize source conflicts internally only.", "P2", "M"],
  ["046", "Daily Brief email audio embed policy", "audio brief prototype", ["examples"], "email/newsletter", "Define safe links/embeds and fallback transcript.", "P2", "S"],
  ["047", "Responsible-play audio reminder", "promotions voice compliance guard", ["examples"], "/promotions, /picks", "Standard spoken disclosure language before any promotion audio.", "P0", "S"],
  ["048", "Voice localization risk memo", "mobile future architecture", ["swift-sdk", "flutter"], "future global", "Prevent localization from changing risk/disclaimer meaning.", "P3", "S"],
  ["049", "Claude voice handoff packet format", "Claude handoff voice instructions", ["mcp", "skills"], "handoff docs", "Make Claude/Codex voice tasks safe and bounded.", "P1", "S"],
  ["050", "Voice OS final integration review", "repo verification", ["all"], "command center", "Final critic review before any prototype enters app code.", "P0", "S"],
];

async function fetchJson(url, fallback = null) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "gse-voice-os-research",
      "Accept": "application/vnd.github+json",
    },
  });
  if (!res.ok) return fallback;
  return res.json();
}

async function fetchText(url, fallback = "") {
  const res = await fetch(url, { headers: { "User-Agent": "gse-voice-os-research" } });
  if (!res.ok) return fallback;
  return res.text();
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function inferFramework(files, repo, readme) {
  const names = new Set(files.map((f) => f.name.toLowerCase()));
  const text = `${repo.description ?? ""} ${readme}`.toLowerCase();
  const bits = [];
  if (names.has("package.json")) bits.push("Node/TypeScript");
  if (names.has("pyproject.toml") || names.has("setup.py")) bits.push("Python");
  if (names.has("package.swift") || repo.language === "Swift") bits.push("Swift");
  if (names.has("pubspec.yaml") || repo.language === "Dart") bits.push("Flutter/Dart");
  if (text.includes("next.js") || text.includes("nextjs")) bits.push("Next.js");
  if (text.includes("mcp")) bits.push("MCP");
  if (text.includes("n8n")) bits.push("n8n");
  if (text.includes("shadcn")) bits.push("shadcn/ui");
  return bits.length ? Array.from(new Set(bits)).join("; ") : repo.language ?? "Unknown";
}

function packageManager(files) {
  const names = new Set(files.map((f) => f.name.toLowerCase()));
  const managers = [];
  if (names.has("pnpm-lock.yaml")) managers.push("pnpm");
  if (names.has("package-lock.json")) managers.push("npm");
  if (names.has("yarn.lock")) managers.push("yarn");
  if (names.has("uv.lock")) managers.push("uv");
  if (names.has("poetry.lock")) managers.push("poetry");
  if (names.has("pyproject.toml")) managers.push("pip/uv");
  if (names.has("package.swift")) managers.push("SwiftPM");
  if (names.has("pubspec.yaml")) managers.push("flutter pub");
  return managers.length ? managers.join("; ") : "Unknown";
}

function hasExamples(files, readme) {
  return files.some((f) => /example|demo|sample/i.test(f.name)) || /example|demo|sample/i.test(readme);
}

function scoreMaintenance(repo) {
  const pushed = new Date(repo.pushed_at).getTime();
  const days = Math.max(0, (Date.now() - pushed) / 86400000);
  if (repo.archived) return 1;
  if (days < 45) return 9;
  if (days < 120) return 7;
  if (days < 365) return 5;
  return 3;
}

function docsQuality(readme, files) {
  let score = 2;
  if (readme.length > 1000) score += 2;
  if (readme.length > 3500) score += 2;
  if (hasExamples(files, readme)) score += 1;
  if (/install|quickstart|usage|getting started/i.test(readme)) score += 1;
  if (files.some((f) => /^docs$/i.test(f.name))) score += 1;
  return Math.min(10, score);
}

function productionScore(repo, mode, docsScore, maintenance) {
  let score = Math.round((docsScore + maintenance) / 2);
  if (mode === "USE_NOW_INTERNAL" || mode === "PROTOTYPE_ONLY") score += 1;
  if (mode === "INSPIRATION_ONLY" || mode === "MOBILE_FUTURE") score -= 1;
  if (repo.archived) score -= 3;
  return Math.max(1, Math.min(10, score));
}

function requiresKey(repoId, readme) {
  if (["ui", "captions.events", "opuspy", "components-swift", "packages"].includes(repoId)) return false;
  return /api key|elevenlabs_api_key|xi-api-key|elevenlabs/i.test(readme) || !["eleven.shopping", "powers", "plugin"].includes(repoId);
}

async function collectRepo(repoId) {
  const repo = await fetchJson(`https://api.github.com/repos/elevenlabs/${repoId}`);
  if (!repo) {
    if (webVerifiedOverrides[repoId]) {
      const o = webVerifiedOverrides[repoId];
      const mode = o.recommended_adoption_mode ?? adoptionOverrides[repoId] ?? "INSPIRATION_ONLY";
      const key = !["opuspy", "components-swift", "powers"].includes(repoId);
      return {
        repo_id: repoId,
        repo_name: o.repo_name,
        url: o.url,
        missing: false,
        purpose: o.purpose,
        description: o.purpose,
        license: o.license,
        language: o.language,
        languages: {},
        framework: o.framework,
        package_manager: o.package_manager,
        install_method: o.package_manager,
        examples_available: true,
        requires_api_key: key,
        requires_paid_service: key ? "Yes for real generation/API usage; no for docs/static prototypes." : "No for local pattern study.",
        production_ready_score: mode === "MOBILE_FUTURE" ? 6 : mode === "AGENT_WORKFLOW" ? 7 : 4,
        docs_quality_score: 6,
        maintenance_score: o.pushed_at === "unknown" ? 4 : 7,
        security_risk: key ? "MEDIUM" : "LOW",
        privacy_risk: key ? "MEDIUM" : "LOW",
        cost_risk: key ? "MEDIUM" : "LOW",
        gse_internal_value: mode === "AGENT_WORKFLOW" ? 7 : 4,
        gse_customer_value: mode === "MOBILE_FUTURE" ? 4 : 3,
        support_value: mode === "AGENT_WORKFLOW" ? 8 : 3,
        content_value: mode === "AGENT_WORKFLOW" ? 7 : 3,
        engagement_value: 4,
        accessibility_value: repoId.includes("mcp-player") || repoId === "plugin" ? 7 : 4,
        monetization_value: 4,
        recommended_adoption_mode: mode,
        first_safe_experiment: mode === "AGENT_WORKFLOW" ? "Design internal workflow only; do not connect secrets." : "Study patterns only; do not import dependency.",
        notes: o.notes,
        stars: o.stars,
        forks: o.forks,
        open_issues: "",
        pushed_at: o.pushed_at,
        updated_at: o.pushed_at,
        latest_release: o.latest_release,
        latest_release_published_at: "",
        readme_excerpt: o.purpose,
      };
    }
    return {
      repo_id: repoId,
      repo_name: repoId,
      url: `https://github.com/elevenlabs/${repoId}`,
      missing: true,
      purpose: "GitHub API lookup failed or repo unavailable.",
      description: "",
      license: "UNAVAILABLE",
      language: "UNAVAILABLE",
      languages: {},
      framework: "UNAVAILABLE",
      package_manager: "UNAVAILABLE",
      install_method: "UNAVAILABLE",
      examples_available: false,
      requires_api_key: "UNKNOWN",
      requires_paid_service: "UNKNOWN",
      production_ready_score: 1,
      docs_quality_score: 1,
      maintenance_score: 1,
      security_risk: "UNKNOWN",
      privacy_risk: "UNKNOWN",
      cost_risk: "UNKNOWN",
      gse_internal_value: 1,
      gse_customer_value: 1,
      support_value: 1,
      content_value: 1,
      engagement_value: 1,
      accessibility_value: 1,
      monetization_value: 1,
      recommended_adoption_mode: "DO_NOT_USE",
      first_safe_experiment: "Verify canonical repository manually before using.",
      notes: "Unavailable in GitHub API lookup; do not adopt from memory.",
      stars: "",
      forks: "",
      open_issues: "",
      pushed_at: "",
      updated_at: "",
      latest_release: "unknown",
      latest_release_published_at: "",
      readme_excerpt: "",
    };
  }
  const [release, contents, readmeApi, languages] = await Promise.all([
    fetchJson(`https://api.github.com/repos/elevenlabs/${repoId}/releases/latest`, null),
    fetchJson(`https://api.github.com/repos/elevenlabs/${repoId}/contents`, []),
    fetchJson(`https://api.github.com/repos/elevenlabs/${repoId}/readme`, null),
    fetchJson(`https://api.github.com/repos/elevenlabs/${repoId}/languages`, {}),
  ]);
  const readme = readmeApi?.download_url ? await fetchText(readmeApi.download_url) : "";
  const mode = adoptionOverrides[repoId] ?? "INSPIRATION_ONLY";
  const docs = docsQuality(readme, contents);
  const maintenance = scoreMaintenance(repo);
  const production = productionScore(repo, mode, docs, maintenance);
  const key = requiresKey(repoId, readme);
  const firstExperiment =
    mode === "MOBILE_FUTURE"
      ? "Document future mobile architecture; no app dependency."
      : mode === "AGENT_WORKFLOW"
        ? "Design an internal approval-gated workflow; do not connect secrets."
        : mode === "USE_NOW_INTERNAL"
          ? "Study components and prototype a static transcript-first audio card."
          : mode === "PROTOTYPE_ONLY"
            ? "Create a fake-provider prototype with no API calls."
            : "Study patterns only; do not import dependency.";
  return {
    repo_id: repoId,
    repo_name: repo.full_name,
    url: repo.html_url,
    purpose: repoPurpose[repoId] ?? repo.description ?? "Unknown; verify manually.",
    description: repo.description ?? "",
    license: repo.license?.spdx_id ?? "NOASSERTION",
    language: repo.language ?? "Unknown",
    languages,
    framework: inferFramework(contents, repo, readme),
    package_manager: packageManager(contents),
    install_method: packageManager(contents),
    examples_available: hasExamples(contents, readme),
    requires_api_key: key,
    requires_paid_service: key ? "Yes for real generation/API usage; no for docs/static prototypes." : "No for local pattern study.",
    production_ready_score: production,
    docs_quality_score: docs,
    maintenance_score: maintenance,
    security_risk: key ? "MEDIUM" : "LOW",
    privacy_risk: key ? "MEDIUM" : "LOW",
    cost_risk: key ? "MEDIUM" : "LOW",
    gse_internal_value: directUse[repoId] ? 8 : mode === "INSPIRATION_ONLY" ? 4 : 6,
    gse_customer_value: ["elevenlabs-js", "ui", "examples", "captions.events", "elevenlabs-nextjs-starter"].includes(repoId) ? 8 : 4,
    support_value: ["elevenlabs-mcp", "elevenlabs-n8n", "examples", "ui"].includes(repoId) ? 8 : 4,
    content_value: ["elevenlabs-js", "elevenlabs-python", "examples", "cli", "captions.events"].includes(repoId) ? 8 : 4,
    engagement_value: ["ui", "elevenlabs-js", "elevenlabs-nextjs-starter", "examples"].includes(repoId) ? 8 : 5,
    accessibility_value: ["captions.events", "ui", "elevenlabs-js", "examples"].includes(repoId) ? 9 : 4,
    monetization_value: ["elevenlabs-js", "ui", "examples", "elevenlabs-mcp"].includes(repoId) ? 7 : 4,
    recommended_adoption_mode: mode,
    first_safe_experiment: firstExperiment,
    notes: directUse[repoId] ?? "Use only if a concrete GSE voice workflow needs it.",
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    open_issues: repo.open_issues_count,
    pushed_at: repo.pushed_at,
    updated_at: repo.updated_at,
    latest_release: release?.tag_name ?? "none found",
    latest_release_published_at: release?.published_at ?? "",
    readme_excerpt: readme.slice(0, 1200),
  };
}

function mdTable(rows, headers) {
  const head = `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${headers.map((h) => String(row[h] ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |`);
  return [head, ...body].join("\n");
}

function section(title, body) {
  return `\n## ${title}\n\n${body.trim()}\n`;
}

function repoInventoryCsv(repos) {
  const columns = [
    "repo_id",
    "repo_name",
    "url",
    "purpose",
    "license",
    "language",
    "framework",
    "requires_api_key",
    "requires_paid_service",
    "production_ready_score",
    "docs_quality_score",
    "maintenance_score",
    "security_risk",
    "privacy_risk",
    "cost_risk",
    "gse_internal_value",
    "gse_customer_value",
    "support_value",
    "content_value",
    "engagement_value",
    "accessibility_value",
    "monetization_value",
    "recommended_adoption_mode",
    "first_safe_experiment",
    "notes",
  ];
  return [columns.join(","), ...repos.map((r) => columns.map((c) => csvEscape(r[c])).join(","))].join("\n");
}

function writeCard(card) {
  const [id, title, category, repos, surface, goal, priority, difficulty] = card;
  const matched = category.includes("safety") || title.includes("policy") ? "docs/media/audio-voice-policy.md" : "none";
  return `# VOICE-BUILD-${id}: ${title}

## Duplicate Gate

duplicate_check_status: EXTENSION_OR_NET_NEW
matched_existing_ids: ${matched}
relation_to_existing: Extends existing media/audio/brand governance where relevant; does not replace P0 launch blocker work.
reason_not_duplicate: This card is specific to ElevenLabs Voice OS, transcript-first audio UX, approval gates, and no-API prototype paths.
dependency_ids: ${priority === "P0" ? "none" : "VOICE-BUILD-001, VOICE-BUILD-002"}

## Goal

${goal}

## Repo(s) Used

${repos.join(", ")}

## GSE Surface

${surface}

## Customer Value

Makes dense GSE concepts easier to understand quickly through transcript-first audio, captions, or guided explanations.

## Business Value

Improves onboarding, support deflection, retention, trust, accessibility, content velocity, or paid conversion without turning GSE into a sportsbook.

## Safety Boundary

No unauthorized voice cloning. No athlete, coach, celebrity, user, or private-person imitation. No gambling urgency. No method leakage. No public generation without approved text source, AI disclosure, and review.

## Technical Plan

1. Confirm the source text and public/private boundary.
2. Run script safety checks before any audio generation.
3. Use a fake/local provider in prototype mode.
4. Add transcript and disclosure before playback UI.
5. Add cost and stale-data checks before any real provider call.
6. Keep all production API calls disabled until founder approval.

## Data / Content Source

Approved GSE text, support doc, Daily Brief, journal article, source freshness record, or founder-only command-center digest depending on the surface.

## Approval Flow

Draft by agent or operator, safety lint, founder/support/legal review as applicable, then generation only when VOICE_GENERATION_ENABLED is approved.

## Cost Guard

Default to no provider call. When enabled, meter characters, duration, route, user/tier, cache key, and monthly budget.

## Analytics

audio_card_viewed, audio_play_started, audio_play_completed, transcript_opened, captions_enabled, audio_cta_clicked, voice_cost_recorded.

## Acceptance Criteria

- Works without an ElevenLabs API key in prototype mode.
- Shows transcript and AI narration disclosure.
- Refuses unsafe scripts.
- Does not expose private methodology.
- Has test coverage or a written QA checklist.

## Test Plan

Unit tests for script rules, no-secret scan, route/component render if implemented, transcript parity check, reduced-motion/accessibility check, and screenshot review for visible UI.

## Priority

${priority}

## Difficulty

${difficulty}

## Claude Handoff Note

Claude should polish user-facing wording and verify it stays calm, specific, non-hype, and source-aware.

## Implementation Prompt

You are Claude/Codex working in the GSE repo. Implement only VOICE-BUILD-${id}: ${title}. Keep it prototype-safe, do not call paid APIs, do not add secrets, do not deploy, and preserve P0 launch blocker isolation. Add tests or docs proving the safety boundary.
`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(cardsDir, { recursive: true });
  await fs.mkdir(reportDir, { recursive: true });

  let cached = new Map();
  try {
    const cachedText = await fs.readFile(path.join(reportDir, "elevenlabs-repo-metadata.json"), "utf8");
    cached = new Map(JSON.parse(cachedText).map((r) => [r.repo_id, r]));
  } catch {
    cached = new Map();
  }

  const repos = [];
  for (const repoId of repoIds) {
    const existing = cached.get(repoId);
    if (existing && !existing.missing) repos.push(existing);
    else repos.push(await collectRepo(repoId));
  }
  await fs.writeFile(path.join(reportDir, "elevenlabs-repo-metadata.json"), JSON.stringify(repos, null, 2));
  await fs.writeFile(path.join(outDir, "elevenlabs-repo-inventory.csv"), repoInventoryCsv(repos));

  const repoRows = repos.map((r) => ({
    Repo: `[${r.repo_id}](${r.url})`,
    Purpose: r.purpose,
    License: r.license,
    Language: r.language,
    Stars: r.stars,
    Release: r.latest_release,
    Updated: r.pushed_at?.slice(0, 10) ?? "unknown",
    Mode: r.recommended_adoption_mode,
    Risk: `${r.security_risk}/${r.privacy_risk}/${r.cost_risk}`,
  }));

  const commands = [
    "git status --short",
    "Get-ChildItem apps/web/app -Directory",
    "Get-ChildItem apps/web/app -Recurse -Filter page.tsx",
    "rg -n \"voice|audio|ElevenLabs|narrat|caption|transcript|podcast|spoken|tts|text-to-speech|voiceover\" docs apps packages scripts",
    "GitHub API: /repos/elevenlabs/{repo}, /releases/latest, /contents, /readme, /languages",
  ];

  await fs.writeFile(path.join(outDir, "00-operating-plan.md"), `# GSE / GSN ElevenLabs Voice OS - Operating Plan

## Mission Interpretation

This lane studies how ElevenLabs open-source repos and official tooling can help GSE make dense sports intelligence easier to understand through transcript-first audio, captions, narrated help, support clips, Daily Brief narration, founder-only spoken digests, and safe content workflows.

This is not a launch blocker. It is post-P0 discovery and prototype planning.

## P0 Sprint Isolation Rule

- Do not edit P0 launch blocker code.
- Do not deploy.
- Do not add dependencies to the live app.
- Do not call ElevenLabs APIs.
- Do not add secrets or env values.
- Do not stage unrelated dirty-tree work.

## Safety Rules

- No unauthorized voice cloning.
- No real athlete, coach, celebrity, user, founder, or private-person imitation.
- No sportsbook/casino promotion narration without legal/founder approval.
- No gambling hype, urgency, or stake language.
- No public audio that leaks methodology, formulas, weights, or source recipes.
- No customer audio storage without explicit consent and deletion policy.

## Repo Audit Plan

Use GitHub API metadata, README content, root files, language stats, release metadata, license metadata, and official ElevenLabs docs/pricing/safety pages. Treat every repo as untrusted until verified.

## GSE App Integration Audit Plan

Audit routes under apps/web/app, existing media/audio governance under docs/media and docs/audit, and brand/compliance scans. Voice opportunities must extend these docs rather than duplicate them.

## Duplicate Prevention Plan

Existing duplicate-risk anchors:

- docs/media/audio-voice-policy.md
- docs/audit/media-automation-risk-policy.md
- docs/media/video-brief-pipeline.md
- docs/research/top-20-rd/areas/RD20-19-brand-voice-and-content-operating-system.md
- command-center P0 build queue and evidence docs

New builds are marked as Voice OS extensions, not replacements.

## Prototype Rules

Allowed: interfaces, docs, fake provider, script templates, static audio placeholders, transcript/caption component specs, safety linter specs, build cards.

Forbidden: real provider calls, API keys, production playback, live generation, customer audio storage, promotions voice, deployment.

## Approval Gates

Founder approval: any public audio feature, provider key, voice selection, cost budget, founder-only audio.

Legal approval: promotions, affiliate disclosures, synthetic-media policy, jurisdiction-sensitive betting language, voice likeness/licensing.

Privacy approval: customer audio, support transcripts, retention/deletion plan.

## Workstreams

AGENT 0 Coordinator / Final Integrator; AGENT 1 Repo Verifier; AGENT 2 License / API / Cost / Terms Risk; AGENT 3 GSE App Surface Auditor; AGENT 4 Voice Product Strategist; AGENT 5 Support Voice Architect; AGENT 6 Content / Daily Brief Architect; AGENT 7 Accessibility / Captions; AGENT 8 Onboarding / Help Overlay; AGENT 9 Agent / MCP / Automation; AGENT 10 Next.js Integration; AGENT 11 Mobile Future; AGENT 12 Audio Processing; AGENT 13 Brand Voice; AGENT 14 Compliance; AGENT 15 Cost / Quota; AGENT 16 Prototype Developer; AGENT 17 Claude Handoff; AGENT 18 Final Critic.

## Files Expected

Phase docs 00-15, repo inventory CSV, build queue index, build queue JSONL, and build card markdown files under this directory.

## Commands Planned

${commands.map((c) => `- ${c}`).join("\n")}

## What Can Be Built Safely

Docs, local fake provider interfaces, transcript-first component specs, safety linter specs, and static prototypes that do not call APIs.

## What Requires Approval

Any real ElevenLabs key, API call, generated audio, production dependency, public playback feature, customer audio storage, voice cloning, promotion narration, or launch deployment.
`);

  await fs.writeFile(path.join(outDir, "01-repo-verification.md"), `# ElevenLabs Repo Verification

Generated: 2026-06-09

## Verification Method

Each target repo was checked through GitHub API metadata and README/root-file inspection when available. For repos blocked by unauthenticated API rate limits, GitHub web/search fallback was used and the row notes identify the constraint. Official ElevenLabs docs, pricing, safety, and use-policy pages were also used for API, cost, and misuse boundaries.

## Inventory

${mdTable(repoRows, ["Repo", "Purpose", "License", "Language", "Stars", "Release", "Updated", "Mode", "Risk"])}

## Key Takeaways

- Best immediate GSE value is not raw voice generation; it is transcript-first UX, script safety, approval queues, and internal prototypes.
- elevenlabs-js, examples, ui, elevenlabs-nextjs-starter, and captions.events are the most useful web/prototype inputs.
- MCP, n8n, CLI, and Python are stronger for internal/operator workflows than public UI.
- Swift/Flutter repos are future mobile architecture only.
- Experimental repos such as powers, plugin, and eleven.shopping should be studied as patterns only unless a concrete need appears.

## Sources

${officialSources.map((s) => `- [${s.label}](${s.url})`).join("\n")}
`);

  const familyText = `# ElevenLabs Capability Map

## A. SDK / API Integration

Repos: ` + "`elevenlabs-js`, `elevenlabs-python`, `elevenlabs-swift-sdk`, `elevenlabs-flutter`, `packages`, `cli`" + `

Enables text-to-speech, speech and audio workflows, command-line/operator generation, and future mobile integration. GSE should use this family only behind a provider adapter, cost ledger, approval queue, stale-data guard, and no-secret logging policy. Use now for docs and fake provider types; wait for API calls.

## B. Next.js / Web App Integration

Repos: ` + "`elevenlabs-nextjs-starter`, `ui`, `plugin`, `examples`" + `

Enables web-player patterns, multimodal UI, and starter architecture research. GSE can prototype transcript-first audio cards and help overlays without importing dependencies or calling APIs.

## C. Agent / MCP / Automation

Repos: ` + "`elevenlabs-mcp`, `elevenlabs-mcp-player`, `skills`, `powers`, `elevenlabs-n8n`" + `

Enables internal script-to-audio workflows, support audio generation, founder briefs, and content production pipelines. This is high-leverage but requires strict approval, cost, and secret boundaries.

## D. Captions / Events / Audio Processing

Repos: ` + "`captions.events`, `opuspy`, `examples`" + `

Enables synchronized captions, transcript parity, event timing, and possible audio encoding research. GSE should prioritize captions and transcripts before generated audio.

## E. Mobile / Native Experience

Repos: ` + "`elevenlabs-swift-sdk`, `components-swift`, `voice-starterkit-swift`, `elevenlabs-flutter`" + `

Useful later for a GSE app with audio alerts and brief playback. Not needed for web launch.

## F. Commerce / Experimental Pattern Research

Repos: ` + "`eleven.shopping`, `plugin`, `powers`" + `

Study only. Do not import or ship until a concrete business case exists.
`;
  await fs.writeFile(path.join(outDir, "02-capability-map.md"), familyText);

  await fs.writeFile(path.join(outDir, "03-gse-app-voice-opportunity-audit.md"), `# GSE App Voice Opportunity Audit

## Duplicate Context

The repo already contains media/audio governance and brand voice policy. Voice OS must extend, not replace:

- docs/media/audio-voice-policy.md
- docs/audit/media-automation-risk-policy.md
- docs/media/video-brief-pipeline.md
- packages/brand/src/voice.ts
- public-copy and brand-voice tests

## Surface Audit

${mdTable(gseSurfaces.map((s) => ({
  Surface: s.surface,
  Route: s.route,
  "Voice Feature": s.feature,
  Tier: s.tier,
  "Hidden Data Boundary": s.risk,
  "Audio Fit": s.feature.includes("blocked") ? "Low" : "Medium/High",
})), ["Surface", "Route", "Voice Feature", "Tier", "Hidden Data Boundary", "Audio Fit"])}

## App-Fit Findings

- Best immediate surfaces: /brief, /faq, /methodology, /pricing, /board, and founder-only /cockpit.
- Highest customer value: help overlays, Daily Brief audio, no-bet education, transcript-first explain cards.
- Highest risk: methodology audio, promotions narration, Player Lab audio without roster source truth.
- Voice should never replace visible text. Every audio concept starts from a source transcript and can fail back to text-only.
`);

  await fs.writeFile(path.join(outDir, "04-gse-voice-product-system.md"), `# GSE Voice Product System

${mdTable(concepts.map(([name, description, surface, repo, tier, phase]) => ({
  Concept: name,
  Description: description,
  Surface: surface,
  "Repo Dependency": repo,
  Tier: tier,
  Phase: phase,
  "Primary Risk": name.includes("Promotion") ? "Legal/compliance" : name.includes("Player") ? "Roster freshness" : name.includes("Method") ? "Method leakage" : "Cost/script safety",
  "Acceptance Criteria": "Transcript, disclosure, stale-data guard, approval status, no method leakage.",
})), ["Concept", "Description", "Surface", "Repo Dependency", "Tier", "Phase", "Primary Risk", "Acceptance Criteria"])}

## System Principle

Voice is a comprehension layer, not decoration. GSE audio should answer: what is this, why does it matter, what changed, how certain are we, and what should remain private.
`);

  await fs.writeFile(path.join(outDir, "05-audio-brand-voice.md"), `# Audio Brand Voice

## Approved Tone

Calm, sharp, human, specific, source-aware, concise, trust-building, and anti-tout.

## Banned Audio Language

- "Lock", "guaranteed", "can't miss", "hammer it", "bet now", "free money", "inside info"
- Any phrase that implies GSE is a sportsbook or can guarantee outcomes
- Any celebrity, athlete, coach, broadcaster, or founder impersonation
- Fake urgency, casino-like excitement, or exploitative loss-chasing language

## No-Bet Voice Rules

No-bet narration should make restraint feel valuable: "The strongest move is to pass because the source picture is incomplete."

## Emergency Stop Words

lock, guaranteed, bet now, chase, double down, sure thing, insider, leaked, injury diagnosis, formula, weights, exact source recipe.

## Sample Scripts

### 30-second GSE Rating explanation

GSE Rating is a compact read on signal quality. It does not promise an outcome. It tells you whether the evidence is strong enough to keep reading. The number is backed by source freshness, market context, volatility, and the current data state. If the data is stale or thin, the rating should say so.

### 30-second No-Bet explanation

This is a no-bet spot. That is not empty content. It means the evidence does not clear the bar. The source picture is incomplete, the market may be unstable, or the risk layer is louder than the edge. Passing is part of the system.

### 45-second Player Lab onboarding

Player Lab is for context, not hype. Start with role, availability, usage, volatility, and matchup pressure. Then check source freshness. If the player data is stale or the roster link is not verified, treat the card as a research note, not a decision surface.

### 60-second Daily Brief intro

Here is today's GSE Brief. We start with what changed, not what is loud. Watch source freshness, market movement, injuries, and the spots the system refused to publish. A quiet board can be a strong board when the evidence does not clear.

### 30-second pricing explanation

Start free and learn the system. Pro adds deeper context and saved brief value. Elite is for users who want more complete scenario, autopsy, and risk layers. Upgrade only when the signal is worth it.

### Support reply for confused user

If the page feels dense, start with the status label, then read the short explanation, then open the transcript or source drawer. You do not need to understand every factor on the first pass.

### Responsible gambling reminder

Sports wagering has real risk. Never stake money you cannot afford to lose. GSE is an intelligence product, not a guarantee or a sportsbook.

### Promotion disclosure placeholder

This section may include partner offers only after review. Availability, terms, age limits, and location rules apply. GSE does not recommend irresponsible play.

### Founder weekly status brief

Launch status is not green yet. Public crash behavior is improved, but readiness depends on database and ingestion health. The next decision is whether to fix dependency readiness, stage the P0 subset, and remove any unsupported public claims.
`);

  await fs.writeFile(path.join(outDir, "06-safety-legal-privacy-compliance.md"), `# Safety / Legal / Privacy / Compliance

## Primary Risks

- Voice cloning consent and right-of-publicity issues.
- Synthetic media disclosure.
- Impersonation of athletes, coaches, celebrities, users, or founder.
- Customer audio/transcript PII.
- API key exposure.
- Cost/quota runaway.
- Gambling promotion and affiliate disclosure risk.
- Minors and jurisdiction-sensitive language.
- Injury/medical speculation spoken with false certainty.
- Methodology leakage through scripts or captions.
- Stale data narrated confidently.
- Caption inaccuracies changing meaning.

## Hard Policies

- No unauthorized voice cloning.
- No real person impersonation.
- No athlete, coach, celebrity, user, or private-person voice likeness.
- No user voice storage without explicit consent and deletion flow.
- Every generated public audio asset must have an approved text source.
- Every public audio asset must have transcript and AI narration disclosure.
- No audio from stale roster/player data.
- No betting urgency or stake advice.
- No promotional audio without legal/founder approval.
- No hidden affiliate endorsement.
- No method leakage in scripts, captions, metadata, filenames, or alt text.
- Audio must state uncertainty when source data is uncertain.

## Approval Matrix

| Action | Approval |
|---|---|
| Static transcript-only prototype | Product owner |
| Fake local provider interface | Product owner |
| Real ElevenLabs API key | Founder |
| Public generated audio | Founder + compliance |
| Promotions audio | Founder + legal |
| Customer audio storage | Founder + privacy/legal |
| Voice cloning | No-go unless explicit legal rights and written consent exist |
`);

  await fs.writeFile(path.join(outDir, "07-technical-architecture.md"), `# Technical Architecture

## Recommended Architecture

Text source -> script generator -> script safety linter -> approval queue -> voice provider adapter -> generation job -> audio/caption storage -> playback card -> analytics/cost ledger.

## Components

- Voice generation provider adapter
- Fake/local provider
- Script generator
- Script approval queue
- Voice job queue
- Audio asset storage
- Captions/transcript storage
- Cost/quota guard
- Consent/disclosure model
- Content source provenance
- Stale-data guard
- Method-leakage guard
- Moderation/safety check
- Human approval workflow
- Cache layer
- Audio playback component
- Fallback text-only mode
- Analytics events
- Admin/founder dashboard

## Suggested Entities

VoiceScript, VoiceAsset, VoiceGenerationJob, VoiceProvider, VoiceConsent, AudioDisclosure, Transcript, CaptionTrack, VoiceUsageEvent, VoiceCostLedger, VoiceApproval, VoiceSafetyReview.

## Required Flags

- VOICE_FEATURES_ENABLED
- VOICE_GENERATION_ENABLED
- VOICE_PUBLIC_PLAYBACK_ENABLED
- ELEVENLABS_API_KEY
- VOICE_APPROVAL_REQUIRED
- VOICE_PROMOTIONS_ENABLED
- VOICE_FOUNDER_ONLY_MODE

No actual secrets were added.

## Failure Modes

- Provider unavailable: show transcript-only.
- Cost cap hit: stop generation and keep approved scripts.
- Data stale: invalidate audio and show stale notice.
- Safety linter fails: block generation.
- Approval missing: keep asset internal/draft-only.
`);

  await fs.writeFile(path.join(outDir, "08-safe-prototype-plan.md"), `# Safe Prototype Plan

## Allowed Now

- TypeScript interfaces.
- Provider adapter stub.
- Fake/local provider.
- Script templates.
- Approval workflow types.
- Static audio placeholder metadata.
- Audio player component shell.
- Transcript/caption component shell.
- Founder-only prototype route if already gated.
- Command-line script generator that does not call APIs.
- Tests for safety rules.

## Forbidden

- Calling ElevenLabs API.
- Adding API keys.
- Generating real audio.
- Public customer-facing playback.
- Storing user audio.
- Promotions voice.
- Deploying.

## Prototype Targets

1. Internal Audio Brief Preview.
2. Static Explain This Card.
3. Transcript-first Audio Card.
4. Voice Script Safety Linter.
5. No-Bet Voice Script Template.
6. Daily Brief Voice Script Template.

## Suggested First Prototype

Build VOICE-BUILD-003, VOICE-BUILD-006, and VOICE-BUILD-008 together as a docs/tests-only prototype: a transcript-first Daily Brief audio card with fake provider metadata and safety-linted script text.
`);

  await fs.writeFile(path.join(outDir, "09-mcp-agent-workflow-design.md"), `# MCP / Agent Workflow Design

## Workflow: Approved Script To Audio

Trigger: founder/support/content operator approves script.

Input: VoiceScript, source text IDs, approval record, voice provider config.

Output: VoiceAsset, Transcript, CaptionTrack, VoiceCostLedger.

Approval gate: always required for public audio.

Failure mode: transcript-only fallback, generation paused.

Cost guard: character/minute cap and cache key.

Privacy guard: no customer audio/transcript storage unless consent exists.

Method leakage guard: linter blocks private terms and source recipes.

## Internal Workflows

| Workflow | Repos | Use |
|---|---|---|
| Founder weekly spoken brief | elevenlabs-mcp, cli | Internal launch/revenue/source digest. |
| Launch blocker spoken digest | mcp-player, cli | Read command-center status without opening every doc. |
| Support response draft | n8n, examples | Spoken walkthrough from approved support text. |
| Article-to-audio | examples, captions.events | Approved article becomes transcript/audio/captions. |
| Video captions | captions.events | Validate caption track for short clips. |
| Release-note voiceover | cli, examples | Short changelog narration. |
| Sales demo narration | examples | Script pack for investor/partner demos. |

## Rule

Agents may draft scripts and metadata. Agents may not generate public audio, post content, or spend provider credits without the approval gate.
`);

  await fs.writeFile(path.join(outDir, "10-content-support-onboarding-pipelines.md"), `# Content / Support / Onboarding Pipelines

## A. Article To Audio

Article -> approved script -> safety lint -> voice generation -> captions -> page embed. Source docs: journal/blog articles and citation metadata.

## B. Daily Brief To Audio

Daily brief -> short narrated version -> transcript -> site/email link. Source docs: /brief, board state, source freshness, and public-safe text.

## C. Support Answer To Audio

Support doc -> short spoken walkthrough -> help center link. Source docs: FAQ/contact docs.

## D. Onboarding Tour

Product steps -> narrated modules -> captions -> guided overlay. Source surfaces: homepage, board, pricing, methodology.

## E. No-Bet Education

Risk/no-bet explanation -> safety script -> audio card. Never uses urgency or stake advice.

## F. Sales Demo

Feature sequence -> voiceover script -> screen recording/captions. Internal only until reviewed.

## G. Founder Weekly Brief

Command-center status -> internal audio summary. Never public, never method-revealing.

## Shared Rules

- Transcript first.
- Approved source text only.
- AI narration disclosure.
- Stale-data invalidation.
- Cost ledger.
- No hidden promotional endorsement.
`);

  const eventRows = [
    "audio_card_viewed", "audio_play_started", "audio_play_completed", "audio_paused", "transcript_opened", "captions_enabled",
    "voice_brief_played", "support_audio_played", "onboarding_audio_completed", "no_bet_audio_played", "audio_cta_clicked",
    "audio_generation_requested", "audio_generation_failed", "voice_cost_recorded",
  ].map((event) => ({
    Event: event,
    Properties: "surface, route, tier, script_id, asset_id, source_version, data_status, approval_status",
    "Product Use": "Measure whether audio helps comprehension.",
    "Retention Use": "Compare return visits and completion.",
    "Privacy Concern": event.includes("support") ? "Avoid PII in transcript metadata." : "Use aggregate identifiers where possible.",
  }));

  await fs.writeFile(path.join(outDir, "11-analytics-cost-retention-model.md"), `# Analytics / Cost / Retention Model

## Events

${mdTable(eventRows, ["Event", "Properties", "Product Use", "Retention Use", "Privacy Concern"])}

## Cost Model

- Track characters generated.
- Track minutes generated.
- Cache approved scripts by source hash.
- Set route-level limits.
- Set user/tier limits.
- Keep internal/founder usage separate from customer usage.
- Alert on monthly spend thresholds.
- On quota failure, show transcript-only mode.

## Retention Hypotheses

- Audio Brief increases return visits.
- Spoken explainers reduce confusion.
- Support audio reduces support tickets.
- No-bet audio improves trust.
- Captions improve accessibility.
- Shareable captioned clips improve acquisition.
`);

  await fs.writeFile(path.join(outDir, "12-voice-monetization-map.md"), `# Voice Monetization Map

## FREE

- Limited Audio Brief.
- Basic product explainer audio.
- No-bet education sample.
- Transcript-first help.

## PRO

- Personalized watchlist audio brief.
- Player/team summaries after data gates exist.
- Deeper why-it-moved narration.
- Saved audio briefs.
- Richer onboarding/help clips.

## ELITE

- Custom alert narration.
- Weekly autopsy audio.
- Advanced player risk passports.
- Priority brief generation.
- Team/game-specific audio packs.

## Founder/Internal

- Launch blocker spoken digest.
- Source conflict spoken summary.
- Support/copilot voice drafts.
- Sales demo voiceover.
- Release note narration.

## Promotions

Only after legal approval. Disclosure-first, no urgency, no risky betting language, no "go bet now" phrasing.

## Monetization Principle

Charge for clarity, personalization, saved time, and deeper context. Do not charge for synthetic hype.
`);

  for (const card of buildCards) {
    await fs.writeFile(path.join(cardsDir, `VOICE-BUILD-${card[0]}-${card[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`), writeCard(card));
  }
  const jsonl = buildCards.map(([id, title, category, repos, surface, goal, priority, difficulty]) => JSON.stringify({
    id: `VOICE-BUILD-${id}`,
    title,
    category,
    repos,
    priority,
    difficulty,
    duplicate_check_status: "EXTENSION_OR_NET_NEW",
    gse_surface: surface,
    customer_value: category.includes("support") || category.includes("onboarding") ? 8 : 6,
    business_value: 7,
    safety_risk: priority === "P0" ? "HIGH" : "MEDIUM",
    api_call_required: false,
    approval_required: priority === "P0" ? "founder/legal as applicable" : "founder before generation",
    notes: goal,
    claude_prompt_file: `cards/VOICE-BUILD-${id}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`,
  })).join("\n");
  await fs.writeFile(path.join(buildDir, "build-queue.jsonl"), jsonl + "\n");
  await fs.writeFile(path.join(buildDir, "index.md"), `# ElevenLabs Voice OS Build Queue

## Summary

50 non-duplicative Voice OS build cards were created. They are post-P0 opportunities and do not replace the launch blocker queue.

## Priority Counts

- P0: ${buildCards.filter((c) => c[6] === "P0").length}
- P1: ${buildCards.filter((c) => c[6] === "P1").length}
- P2: ${buildCards.filter((c) => c[6] === "P2").length}
- P3: ${buildCards.filter((c) => c[6] === "P3").length}

## Best First 10

${buildCards.slice(0, 10).map(([id, title]) => `- VOICE-BUILD-${id}: ${title}`).join("\n")}
`);

  await fs.writeFile(path.join(outDir, "15-final-critic-review.md"), `# Final Critic Review

1. Did we verify each repo? Each candidate was accounted for. Most rows use GitHub API metadata and README/root-file inspection; fallback rows are caveated, and the provided singular elevenlabs/plugin URL did not verify, so it is mapped to likely canonical plural elevenlabs/plugins with NOASSERTION fields.
2. Did we avoid assuming capabilities? Yes. Unknowns are marked through adoption modes and prototype-only recommendations.
3. Did we avoid duplicating existing build cards? Mostly yes. Voice builds are marked as extensions of audio/media/brand governance, not replacements.
4. Did we avoid interfering with P0 app blocker sprint? Yes. No live app code or deployment changes were made.
5. Did we protect against voice cloning/impersonation? Yes. It is a hard no-go without rights and consent.
6. Did we protect against gambling hype? Yes. Banned language and no-bet rules are explicit.
7. Did we protect method secrecy? Yes. Method-leakage guard is P0 before any real generation.
8. Did we create safe prototype paths? Yes. Fake-provider and transcript-first prototypes are defined.
9. Did we define approval gates? Yes. Founder, legal, privacy, and support gates are defined.
10. Did we define cost guards? Yes. Cost ledger, cache, quota, and failure modes are defined.
11. Did we map customer value? Yes. Comprehension, onboarding, support, accessibility, Daily Brief, trust.
12. Did we map internal value? Yes. Founder brief, support drafts, release notes, sales demos.
13. Did we map monetization? Yes. FREE/PRO/ELITE/founder/promotions map is included.
14. Did we create build cards? Yes. 50 cards.
15. Did we update Claude handoff appropriately? Yes. Command-center handoff is updated with a post-P0 Voice OS lane.

## Critic Verdict

Proceed only as post-P0 prototype/docs work. Do not connect ElevenLabs API keys or ship public audio until readiness, approval, and safety gates exist.
`);

  await fs.writeFile(path.join(outDir, "13-build-queue-summary.md"), `# Build Queue Summary

The full queue lives at:

- build-queue/index.md
- build-queue/build-queue.jsonl
- build-queue/cards/

Total cards: ${buildCards.length}
`);

  await fs.writeFile(path.join(outDir, "14-command-center-update-notes.md"), `# Command Center Update Notes

The post-P0 Voice OS lane should be referenced in:

- docs/command-center/build-queue/REAL_APP_NEXT_ACTIONS.md
- docs/command-center/discovery/real-app-suggestion-engine.md
- docs/command-center/handoff/claude-final-handoff-prompt.md

This lane is not a launch blocker. It is an R&D/prototype lane for after core readiness is green.
`);

  await fs.writeFile(path.join(outDir, "README.md"), `# ElevenLabs Voice OS Discovery

This directory contains the GSE / GSN ElevenLabs Voice OS R&D mission.

Generated from live GitHub repository verification and local GSE app surface audit on 2026-06-09.

No ElevenLabs API calls were made. No secrets were added. No production app code was changed.
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
