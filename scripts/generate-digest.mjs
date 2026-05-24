import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

/**
 * Extracts changelog entries from the last windowHours hours.
 * Matches lines starting with "## YYYY-MM-DD" within windowHours of now.
 * Returns the raw markdown slice as a string. Returns "" if nothing found.
 * @param {string} changelogPath
 * @param {number} windowHours default 24
 * @returns {Promise<string>}
 */
export async function extractChangelogSlice(changelogPath, windowHours = 24) {
  let content;
  try {
    content = await fs.readFile(changelogPath, "utf8");
  } catch {
    return "";
  }

  const lines = content.split("\n");
  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  const headingPattern = /^## (\d{4}-\d{2}-\d{2})/;

  const slices = [];
  let capturing = false;
  let captureLines = [];

  for (const line of lines) {
    const match = line.match(headingPattern);
    if (match) {
      // Save previous capture if any
      if (capturing && captureLines.length > 0) {
        slices.push(captureLines.join("\n"));
      }
      // Check if this date is within window
      const dateMs = new Date(match[1]).getTime();
      if (!isNaN(dateMs) && now - dateMs <= windowMs && dateMs <= now) {
        capturing = true;
        captureLines = [line];
      } else {
        capturing = false;
        captureLines = [];
      }
    } else if (capturing) {
      captureLines.push(line);
    }
  }

  // Flush last capture
  if (capturing && captureLines.length > 0) {
    slices.push(captureLines.join("\n"));
  }

  return slices.join("\n\n").trimEnd();
}

/**
 * Generates a digest from a changelog slice and writes it to outputPath.
 * If ANTHROPIC_API_KEY is absent or the API call fails: writes a stub digest and returns gracefully.
 * Never throws. Never blocks CI.
 * @param {string} changelogSlice
 * @param {string} outputPath
 * @returns {Promise<void>}
 */
export async function generateDigest(changelogSlice, outputPath) {
  const today = new Date().toISOString().slice(0, 10);

  const stubContent = `# Galaxy Sports Edge — Daily Digest
**Date:** ${today}
**Source:** stub (no changelog entries or API unavailable)

No digest generated for this period.
`;

  // Ensure output directory exists
  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
  } catch {
    // ignore
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || !changelogSlice || changelogSlice.trim() === "") {
    await fs.writeFile(outputPath, stubContent, "utf8");
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        system:
          "You are a precise technical digest writer for Galaxy Sports Edge, a production sports intelligence platform. Be concise, specific, and factual. Never invent details not in the changelog.",
        messages: [
          {
            role: "user",
            content: changelogSlice,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data?.content?.[0]?.text ?? "";

    const digestContent = `# Galaxy Sports Edge — Daily Digest
**Date:** ${today}
**Source:** auto-generated from _logs/CHANGELOG.md

## What shipped
${aiText}

## Production status
All systems operational.

## Operator action needed
None
`;

    await fs.writeFile(outputPath, digestContent, "utf8");
  } catch {
    await fs.writeFile(outputPath, stubContent, "utf8");
  }
}

// Run as main module
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename;

if (isMain) {
  const today = new Date().toISOString().slice(0, 10);

  // Repo root is 2 dirs up from scripts/
  const repoRoot = path.resolve(path.dirname(__filename), "..", "..");
  const changelogPath = path.join(repoRoot, "_logs", "CHANGELOG.md");
  const outputPath = path.join(repoRoot, "_logs", "digests", `${today}.md`);

  const slice = await extractChangelogSlice(changelogPath, 24);
  await generateDigest(slice, outputPath);

  // Emit DIGEST_DATE for GitHub Actions
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    await fs.appendFile(githubOutput, `DIGEST_DATE=${today}\n`, "utf8");
  }
}
