import { createHash } from "node:crypto";

const URGENCY = Object.freeze({
  SECURITY: 100,
  BREAKING_CHANGE: 95,
  DEPRECATION: 90,
  TERMS_CHANGE: 88,
  PRICE_CHANGE: 85,
  LIMIT_CHANGE: 82,
  ELIGIBILITY_CHANGE: 78,
  CREDIT_PROGRAM: 72,
  API_CHANGE: 70,
  PROTOCOL_CHANGE: 70,
  REGISTRY_CHANGE: 68,
  MODEL_RELEASE: 62,
  SDK_RELEASE: 60,
  AGENT_TOOL_RELEASE: 60,
  LOCAL_MODEL_RUNTIME: 58,
  MODEL_SUPPORT: 55,
  PLATFORM_CHANGE: 55,
  WORKFLOW_CHANGE: 52,
});

function normalizeScalar(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") return value;
  return String(value);
}

export function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(normalizeScalar(value));
}

export function sha256(value) {
  return createHash("sha256").update(typeof value === "string" ? value : stableSerialize(value)).digest("hex");
}

function canonicalItem(item) {
  if (!item || typeof item !== "object") return null;
  const id = String(item.id ?? item.tag ?? item.url ?? item.title ?? "").trim();
  if (!id) return null;
  return {
    id,
    title: String(item.title ?? item.name ?? item.tag ?? id).trim(),
    publishedAt: item.publishedAt ?? item.addedAt ?? null,
    url: item.url ?? null,
    payload: item,
    hash: sha256(item),
  };
}

function canonicalItems(summary) {
  if (!Array.isArray(summary)) return [];
  return summary.map(canonicalItem).filter(Boolean);
}

function inferEventClass(source, text) {
  const lower = String(text).toLowerCase();
  const allowed = new Set(source.eventClasses ?? []);
  const prefer = (eventClass, pattern) => allowed.has(eventClass) && pattern.test(lower) ? eventClass : null;

  return (
    prefer("SECURITY", /\b(cve|security|vulnerab|exploit|supply[ -]?chain|malicious|credential|token leak)\b/) ??
    prefer("BREAKING_CHANGE", /\b(breaking|incompatible|migration required|removed support|major version)\b/) ??
    prefer("DEPRECATION", /\b(deprecat|sunset|end of life|eol|retir|removed on|shutdown)\b/) ??
    prefer("TERMS_CHANGE", /\b(terms|license|acceptable use|usage policy|commercial use)\b/) ??
    prefer("PRICE_CHANGE", /\b(pricing|price|cost|discount|billing|per million|per token)\b/) ??
    prefer("LIMIT_CHANGE", /\b(rate limit|quota|context window|token limit|concurrency|usage limit)\b/) ??
    prefer("ELIGIBILITY_CHANGE", /\b(eligib|qualification|requirements?|application window)\b/) ??
    prefer("CREDIT_PROGRAM", /\b(credit|grant|startup program|accelerator|inception)\b/) ??
    prefer("PROTOCOL_CHANGE", /\b(protocol|specification|spec release|schema)\b/) ??
    prefer("REGISTRY_CHANGE", /\b(registry|catalog|directory)\b/) ??
    prefer("AGENT_TOOL_RELEASE", /\b(agent|tool use|computer use|coding agent|cli)\b/) ??
    prefer("LOCAL_MODEL_RUNTIME", /\b(local|ollama|gguf|quantiz|gpu|cpu)\b/) ??
    prefer("MODEL_RELEASE", /\b(model|reasoning|multimodal|embedding|vision|audio)\b/) ??
    prefer("SDK_RELEASE", /\b(sdk|typescript|python|javascript|client library)\b/) ??
    prefer("API_CHANGE", /\b(api|endpoint|parameter|request|response)\b/) ??
    prefer("PLATFORM_CHANGE", /\b(platform|service|runtime|deployment|infrastructure)\b/) ??
    prefer("WORKFLOW_CHANGE", /\b(workflow|automation|integration|connector)\b/) ??
    source.eventClasses?.[0] ?? "PLATFORM_CHANGE"
  );
}

function eventKey(sourceId, itemId, kind, currentHash) {
  return sha256({ sourceId, itemId, kind, currentHash }).slice(0, 24);
}

export function diffSnapshots(source, previousSnapshot, currentSnapshot, now = new Date()) {
  const observedAt = now.toISOString();
  const previousSummary = previousSnapshot?.summary ?? null;
  const currentSummary = currentSnapshot?.summary ?? null;
  const events = [];

  if (currentSummary === null || currentSummary === undefined) return events;

  const previousItems = canonicalItems(previousSummary);
  const currentItems = canonicalItems(currentSummary);
  if (currentItems.length > 0 || previousItems.length > 0) {
    const before = new Map(previousItems.map((item) => [item.id, item]));
    const after = new Map(currentItems.map((item) => [item.id, item]));

    for (const item of currentItems) {
      const prior = before.get(item.id);
      const kind = prior ? (prior.hash === item.hash ? null : "UPDATED_ITEM") : "NEW_ITEM";
      if (!kind) continue;
      const eventClass = inferEventClass(source, `${item.title} ${stableSerialize(item.payload)}`);
      events.push({
        id: eventKey(source.id, item.id, kind, item.hash),
        sourceId: source.id,
        kind,
        eventClass,
        urgency: URGENCY[eventClass] ?? 50,
        observedAt,
        effectiveAt: item.publishedAt,
        itemId: item.id,
        title: item.title,
        url: item.url,
        previousHash: prior?.hash ?? null,
        currentHash: item.hash,
        evidenceAuthority: source.authority,
        verified: source.authority === "primary",
      });
    }

    for (const item of previousItems) {
      if (after.has(item.id)) continue;
      events.push({
        id: eventKey(source.id, item.id, "MISSING_ITEM", item.hash),
        sourceId: source.id,
        kind: "MISSING_ITEM",
        eventClass: "DEPRECATION",
        urgency: 65,
        observedAt,
        effectiveAt: null,
        itemId: item.id,
        title: item.title,
        url: item.url,
        previousHash: item.hash,
        currentHash: null,
        evidenceAuthority: source.authority,
        verified: false,
        caution: "An item disappearing from a bounded feed is not proof of deprecation; verify manually.",
      });
    }
    return events.sort((a, b) => b.urgency - a.urgency || a.id.localeCompare(b.id));
  }

  const previousHash = previousSnapshot?.summaryHash ?? (previousSummary === null ? null : sha256(previousSummary));
  const currentHash = currentSnapshot?.summaryHash ?? sha256(currentSummary);
  if (previousHash === currentHash) return events;

  const title = currentSummary?.title ?? `${source.name} changed`;
  const eventClass = inferEventClass(source, `${title} ${stableSerialize(currentSummary)}`);
  events.push({
    id: eventKey(source.id, source.id, "PAGE_DELTA", currentHash),
    sourceId: source.id,
    kind: "PAGE_DELTA",
    eventClass,
    urgency: URGENCY[eventClass] ?? 50,
    observedAt,
    effectiveAt: null,
    itemId: source.id,
    title,
    url: source.url,
    previousHash,
    currentHash,
    evidenceAuthority: source.authority,
    verified: source.authority === "primary",
  });
  return events;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizedProjects(projectFits) {
  return Array.isArray(projectFits)
    ? projectFits.filter((fit) => fit && typeof fit === "object" && typeof fit.projectId === "string")
    : [];
}

export function scoreOpportunity(input) {
  const event = input.event;
  const fits = normalizedProjects(input.projectFits);
  const evidenceQuality = event.verified ? 1 : 0.35;
  const bestFit = fits.reduce((max, fit) => Math.max(max, Number(fit.fitScore) || 0), 0) / 100;
  const reuse = clamp((fits.filter((fit) => (Number(fit.fitScore) || 0) >= 50).length - 1) / 4, 0, 1);
  const timeToValueDays = Math.max(0, Number(input.timeToValueDays) || 0);
  const timeValue = 1 / (1 + timeToValueDays / 14);
  const expectedAnnualValue = Math.max(0, Number(input.expectedAnnualNetValue) || 0);
  const valueScale = clamp(Math.log10(expectedAnnualValue + 1) / 5, 0, 1);
  const implementationHours = Math.max(0, Number(input.implementationHours) || 0);
  const effort = clamp(implementationHours / 160, 0, 1);
  const reversibility = clamp(Number(input.reversibility) || 0, 0, 1);
  const risk = clamp(Number(input.risk) || 0, 0, 1);
  const maintenance = clamp(Number(input.maintenanceBurden) || 0, 0, 1);
  const attention = clamp(Number(input.founderAttentionCost) || 0, 0, 1);
  const competitiveHalfLifeDays = Math.max(0, Number(input.competitiveHalfLifeDays) || 0);
  const urgencyFit = 1 / (1 + competitiveHalfLifeDays / 90);

  const positive =
    evidenceQuality * 15 +
    bestFit * 15 +
    reuse * 10 +
    timeValue * 15 +
    valueScale * 20 +
    reversibility * 5 +
    urgencyFit * 5 +
    clamp((event.urgency ?? 50) / 100, 0, 1) * 15;
  const penalties = effort * 12 + risk * 18 + maintenance * 8 + attention * 12;
  const score = Math.round(clamp(positive - penalties, 0, 100));

  return {
    score,
    components: {
      evidenceQuality,
      bestFit,
      reuse,
      timeValue,
      valueScale,
      effort,
      reversibility,
      risk,
      maintenance,
      attention,
      urgencyFit,
    },
    assumptions: [
      "Weights are initial policy, not learned truth.",
      "Expected annual value is an estimate and is not revenue.",
      "Primary-source evidence verifies the change, not the projected business outcome.",
    ],
  };
}

export function buildOpportunityCandidate(input, now = new Date()) {
  const score = scoreOpportunity(input);
  const fits = normalizedProjects(input.projectFits);
  const status = input.event.verified ? "VERIFIED" : "OBSERVED";
  return {
    id: `nova-${sha256({ eventId: input.event.id, projects: fits.map((fit) => fit.projectId) }).slice(0, 20)}`,
    eventId: input.event.id,
    status,
    title: input.title ?? input.event.title,
    eventClass: input.event.eventClass,
    observedAt: input.event.observedAt,
    recordedAt: now.toISOString(),
    sourceId: input.event.sourceId,
    evidenceAuthority: input.event.evidenceAuthority,
    verifiedChange: input.event.verified,
    projectFits: fits,
    economics: {
      expectedAnnualNetValue: Number(input.expectedAnnualNetValue) || 0,
      timeToValueDays: Number(input.timeToValueDays) || 0,
      implementationHours: Number(input.implementationHours) || 0,
      realizedRevenue: 0,
      usableCredits: 0,
    },
    priority: score,
    nextSmallestTest: input.nextSmallestTest ?? "Create a bounded verification experiment before integration.",
    prohibitedActions: [
      "Auto-install discovered software",
      "Merge or deploy code",
      "Spend money or consume billable fallback",
      "Apply to programs or contact third parties",
      "Represent estimated value as realized revenue",
    ],
  };
}

export function deduplicateEvents(events) {
  const byId = new Map();
  for (const event of events) {
    if (!event?.id) continue;
    const existing = byId.get(event.id);
    if (!existing || String(event.observedAt) > String(existing.observedAt)) byId.set(event.id, event);
  }
  return [...byId.values()].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0) || a.id.localeCompare(b.id));
}

export function routeEvent(event) {
  const reviewers = new Set(["NOVA", "JARVIS"]);
  if (["SECURITY", "BREAKING_CHANGE", "DEPRECATION", "TERMS_CHANGE"].includes(event.eventClass)) {
    reviewers.add("TAL");
    reviewers.add("GAUGE");
  }
  if (["PRICE_CHANGE", "LIMIT_CHANGE", "CREDIT_PROGRAM", "ELIGIBILITY_CHANGE"].includes(event.eventClass)) {
    reviewers.add("METER");
    reviewers.add("BOBBY");
  }
  if (["MODEL_RELEASE", "SDK_RELEASE", "AGENT_TOOL_RELEASE", "PROTOCOL_CHANGE", "REGISTRY_CHANGE"].includes(event.eventClass)) {
    reviewers.add("TAL");
    reviewers.add("RELAY");
  }
  return {
    eventId: event.id,
    immediate: (event.urgency ?? 0) >= 85,
    reviewers: [...reviewers],
    externalActionsAllowed: false,
    ownerApprovalRequired: true,
  };
}
