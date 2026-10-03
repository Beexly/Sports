/**
 * NOVA S2 — structural schema validation for the captured capability
 * inventory documents under `data/nova/`.
 *
 * These validators take `unknown` and return an exact, deterministic list of
 * violations (empty list = valid). They fail closed: unknown top-level keys,
 * missing fields, wrong types, malformed tuples, and count drift between the
 * document's own `counts` block and its actual contents are all errors.
 *
 * Pure TypeScript. No Prisma, no I/O, no clocks, no randomness.
 */

const CAPTURE_DOCUMENT_ALLOWED_KEYS = [
  "schemaVersion",
  "capturedAt",
  "truthPolicy",
  "claude",
  "chatgpt",
  "counts",
  "pluginTuple",
] as const;

const ADDITIONS_DOCUMENT_ALLOWED_KEYS = [
  "schemaVersion",
  "capturedAt",
  "source",
  "verificationState",
  "policy",
  "plugins",
  "counts",
  "pluginTuple",
] as const;

const CAPTURED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function checkAllowedKeys(
  errors: string[],
  document: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(document)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`${path}.${key}: unexpected key — captured documents may not carry unvalidated content.`);
    }
  }
}

function checkStringArray(errors: string[], value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be an array of names.`);
    return;
  }
  value.forEach((item, index) => {
    if (!isNonEmptyString(item)) {
      errors.push(`${path}[${index}]: must be a non-empty string.`);
    }
  });
}

/** Validates `[name, author, skillCount, lastUpdated]` capture tuples. */
function checkPluginTuples(errors: string[], value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    errors.push(`${path}: must be an array of capture tuples.`);
    return;
  }
  value.forEach((tuple, index) => {
    if (!Array.isArray(tuple) || tuple.length !== 4) {
      errors.push(`${path}[${index}]: must be a 4-item [name, author, skillCount, lastUpdated] tuple.`);
      return;
    }
    const [name, author, skillCount, lastUpdated] = tuple as readonly unknown[];
    if (!isNonEmptyString(name)) errors.push(`${path}[${index}][0]: name must be a non-empty string.`);
    if (!isNonEmptyString(author)) errors.push(`${path}[${index}][1]: author must be a non-empty string.`);
    if (!isNonNegativeInteger(skillCount)) {
      errors.push(`${path}[${index}][2]: skillCount must be a non-negative integer.`);
    }
    if (typeof lastUpdated !== "string" || !CAPTURED_DATE_PATTERN.test(lastUpdated)) {
      errors.push(`${path}[${index}][3]: lastUpdated must be a YYYY-MM-DD date string.`);
    }
  });
}

function checkCount(
  errors: string[],
  counts: Record<string, unknown>,
  key: string,
  actual: number,
  describe: string,
): void {
  const declared = counts[key];
  if (!isNonNegativeInteger(declared)) {
    errors.push(`counts.${key}: must be a non-negative integer.`);
    return;
  }
  if (declared !== actual) {
    errors.push(`counts.${key}: declares ${declared} but the document contains ${actual} ${describe}.`);
  }
}

function tupleField(tuple: unknown, index: number): unknown {
  return Array.isArray(tuple) ? tuple[index] : undefined;
}

/**
 * Validates `data/nova/ai-capability-inventory-2026-07-21.json` — the initial
 * user-reported Claude capture plus the ChatGPT runtime capture.
 */
export function validateCapabilityCaptureDocument(input: unknown): readonly string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["document: must be a JSON object."];

  checkAllowedKeys(errors, input, CAPTURE_DOCUMENT_ALLOWED_KEYS, "document");
  if (input.schemaVersion !== 1) errors.push("schemaVersion: must be 1.");
  if (!isIsoTimestamp(input.capturedAt)) errors.push("capturedAt: must be an ISO timestamp.");

  const truthPolicy = input.truthPolicy;
  if (!isRecord(truthPolicy)) {
    errors.push("truthPolicy: must be an object.");
  } else {
    if (truthPolicy.inventoryIsNotApproval !== true) {
      errors.push("truthPolicy.inventoryIsNotApproval: must be exactly true.");
    }
    if (truthPolicy.discoveryDoesNotGrantExecution !== true) {
      errors.push("truthPolicy.discoveryDoesNotGrantExecution: must be exactly true.");
    }
    checkStringArray(errors, truthPolicy.selectionBasis, "truthPolicy.selectionBasis");
  }

  const claude = input.claude;
  if (!isRecord(claude)) {
    errors.push("claude: must be an object.");
  } else {
    if (claude.source !== "USER_REPORTED") errors.push('claude.source: must be "USER_REPORTED".');
    if (claude.verificationState !== "CAPTURED_NOT_RUNTIME_VERIFIED") {
      errors.push('claude.verificationState: must be "CAPTURED_NOT_RUNTIME_VERIFIED".');
    }
    checkPluginTuples(errors, claude.plugins, "claude.plugins");
    const connectors = claude.connectors;
    if (!isRecord(connectors)) {
      errors.push("claude.connectors: must be an object.");
    } else {
      checkStringArray(errors, connectors.connected, "claude.connectors.connected");
      checkStringArray(errors, connectors.reconnectRequired, "claude.connectors.reconnectRequired");
      checkStringArray(
        errors,
        connectors.notConnectedOrUnavailable,
        "claude.connectors.notConnectedOrUnavailable",
      );
    }
    checkStringArray(errors, claude.personalSkills, "claude.personalSkills");
  }

  const chatgpt = input.chatgpt;
  if (!isRecord(chatgpt)) {
    errors.push("chatgpt: must be an object.");
  } else {
    if (chatgpt.source !== "CURRENT_SESSION_RUNTIME") {
      errors.push('chatgpt.source: must be "CURRENT_SESSION_RUNTIME".');
    }
    if (chatgpt.verificationState !== "RUNTIME_VISIBLE_2026_07_21") {
      errors.push('chatgpt.verificationState: must be "RUNTIME_VISIBLE_2026_07_21".');
    }
    checkStringArray(errors, chatgpt.appsAndConnectors, "chatgpt.appsAndConnectors");
    const skillPacks = chatgpt.installedSkillPacks;
    if (!isRecord(skillPacks)) {
      errors.push("chatgpt.installedSkillPacks: must be an object of pack-name → skill names.");
    } else {
      for (const [pack, names] of Object.entries(skillPacks)) {
        checkStringArray(errors, names, `chatgpt.installedSkillPacks.${pack}`);
      }
    }
    checkStringArray(errors, chatgpt.installableObserved, "chatgpt.installableObserved");
    if (!isNonEmptyString(chatgpt.note)) errors.push("chatgpt.note: must be a non-empty string.");
  }

  const counts = input.counts;
  if (!isRecord(counts)) {
    errors.push("counts: must be an object.");
  } else if (isRecord(claude) && isRecord(chatgpt)) {
    const connectors = isRecord(claude.connectors) ? claude.connectors : {};
    const lengthOf = (value: unknown): number => (Array.isArray(value) ? value.length : 0);
    checkCount(errors, counts, "claudePlugins", lengthOf(claude.plugins), "captured Claude plugins");
    checkCount(
      errors,
      counts,
      "claudeConnectedConnectors",
      lengthOf(connectors.connected),
      "connected Claude connectors",
    );
    checkCount(
      errors,
      counts,
      "claudeReconnectRequired",
      lengthOf(connectors.reconnectRequired),
      "reconnect-required Claude connectors",
    );
    checkCount(
      errors,
      counts,
      "claudeNotConnectedOrUnavailable",
      lengthOf(connectors.notConnectedOrUnavailable),
      "not-connected Claude connectors",
    );
    checkCount(
      errors,
      counts,
      "claudePersonalSkills",
      lengthOf(claude.personalSkills),
      "Claude personal skills",
    );
    checkCount(
      errors,
      counts,
      "chatgptAppsAndConnectors",
      lengthOf(chatgpt.appsAndConnectors),
      "ChatGPT apps/connectors",
    );
    const installedSkillCount = isRecord(chatgpt.installedSkillPacks)
      ? Object.values(chatgpt.installedSkillPacks).reduce<number>(
          (total, names) => total + lengthOf(names),
          0,
        )
      : 0;
    checkCount(errors, counts, "chatgptInstalledSkills", installedSkillCount, "installed ChatGPT skills");
  }

  return errors;
}

/**
 * Validates `data/nova/ai-capability-inventory-additions-2026-07-21.json` —
 * the second user-reported Claude plugin capture. Cross-checks every declared
 * count against the actual tuples so silent drift is impossible.
 */
export function validateCapabilityAdditionsDocument(input: unknown): readonly string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["document: must be a JSON object."];

  checkAllowedKeys(errors, input, ADDITIONS_DOCUMENT_ALLOWED_KEYS, "document");
  if (input.schemaVersion !== 1) errors.push("schemaVersion: must be 1.");
  if (!isIsoTimestamp(input.capturedAt)) errors.push("capturedAt: must be an ISO timestamp.");
  if (input.source !== "USER_REPORTED_ADDITION") {
    errors.push('source: must be "USER_REPORTED_ADDITION".');
  }
  if (input.verificationState !== "CAPTURED_NOT_RUNTIME_VERIFIED") {
    errors.push('verificationState: must be "CAPTURED_NOT_RUNTIME_VERIFIED".');
  }

  const policy = input.policy;
  if (!isRecord(policy)) {
    errors.push("policy: must be an object.");
  } else {
    if (policy.inventoryIsNotApproval !== true) {
      errors.push("policy.inventoryIsNotApproval: must be exactly true.");
    }
    if (policy.autoActivationAllowed !== false) {
      errors.push("policy.autoActivationAllowed: must be exactly false.");
    }
    if (policy.thirdPartyCodeExecutionAllowed !== false) {
      errors.push("policy.thirdPartyCodeExecutionAllowed: must be exactly false.");
    }
    if (policy.mustInspectSkillBeforeUse !== true) {
      errors.push("policy.mustInspectSkillBeforeUse: must be exactly true.");
    }
    const maxActive = policy.maxActivePluginsPerTask;
    if (!isNonNegativeInteger(maxActive) || maxActive < 1 || maxActive > 3) {
      errors.push("policy.maxActivePluginsPerTask: must be an integer between 1 and 3.");
    }
  }

  checkPluginTuples(errors, input.plugins, "plugins");

  const counts = input.counts;
  if (!isRecord(counts)) {
    errors.push("counts: must be an object.");
  } else if (Array.isArray(input.plugins)) {
    const plugins = input.plugins;
    checkCount(errors, counts, "plugins", plugins.length, "captured plugins");
    checkCount(
      errors,
      counts,
      "skills",
      plugins.reduce<number>((total, tuple) => {
        const skillCount = tupleField(tuple, 2);
        return total + (isNonNegativeInteger(skillCount) ? skillCount : 0);
      }, 0),
      "captured skills",
    );
    checkCount(
      errors,
      counts,
      "updated20260721",
      plugins.filter((tuple) => tupleField(tuple, 3) === "2026-07-21").length,
      "plugins updated on 2026-07-21",
    );
    checkCount(
      errors,
      counts,
      "officialAnthropic",
      plugins.filter((tuple) => tupleField(tuple, 1) === "Anthropic").length,
      "Anthropic-authored plugins",
    );
    checkCount(
      errors,
      counts,
      "officialAws",
      plugins.filter((tuple) => {
        const author = tupleField(tuple, 1);
        return author === "Amazon Web Services" || author === "aws-samples";
      }).length,
      "AWS-authored plugins",
    );
    checkCount(
      errors,
      counts,
      "thirdPartyAlirezaRezvani",
      plugins.filter((tuple) => tupleField(tuple, 1) === "Alireza Rezvani").length,
      "Alireza Rezvani plugins",
    );
  }

  return errors;
}
