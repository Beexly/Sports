import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const webRoot = resolve(__dirname, "..");
const repoRoot = resolve(webRoot, "../..");

const EXPECTED_HERMES_PLUGINS = [
  "hermes-plexus",
  "squad-hub",
  "x-dashboard",
  "blinkenbar",
  "boardstate",
  "kanban-gantt",
  "orbit-desktop",
  "hermes-cloud-file-manager",
  "kanban-graph",
  "brain-graph",
  "hermes-chat-share",
] as const;

const EXPECTED_NVIDIA_SKILLS = [
  "tao-setup",
  "dgx-spark-skills",
  "ethos-orchestrate",
  "ethos-write",
  "ethos-explore",
  "nvidia-skill-finder",
] as const;

const EXPECTED_BLINKENBAR_CODES = [
  "STEALTH-86.12",
  "SINKHORN-L1",
  "PAGEINDEX-10/10",
  "STRIPE-CS-LIVE",
  "MCP-JSONRPC",
  "GSI-BIOMECH",
  "BOARD-47-19-1",
  "NVIDIA-ETHOS",
  "PLEXUS-MESH",
  "SQUAD-HUB",
  "X-DASH-232",
  "ORBIT-WM",
  "CLOUD-CORPUS",
  "KANBAN-DAG",
  "BRAIN-GRAPH",
  "JEV-SNAP-SIM",
] as const;

describe("Hermes 11-Plugin Universe Suite & NVIDIA 6-Skill Installer", () => {
  const componentPath = resolve(
    webRoot,
    "components/cockpit/hermes-plugin-universe-suite.tsx"
  );
  const pagePath = resolve(webRoot, "app/cockpit/hermes-plugins/page.tsx");
  const auditPath = resolve(
    repoRoot,
    "data/audits/nvidia_hermes_skills_and_plugins_registry_2026_11_06.json"
  );

  const componentSrc = readFileSync(componentPath, "utf8");
  const pageSrc = readFileSync(pagePath, "utf8");
  const auditJson = JSON.parse(readFileSync(auditPath, "utf8"));

  it("registers all 11 Nous Research Hermes plugins in component and audit registry with official docs URLs", () => {
    expect(componentSrc).toContain('"use client"');
    expect(componentSrc).toContain('data-testid="hermes-plugin-universe-suite"');
    expect(auditJson.hermesPlugins).toHaveLength(11);

    for (const pluginId of EXPECTED_HERMES_PLUGINS) {
      const docsUrl = `https://hermes-agent.nousresearch.com/docs/plugins/${pluginId}`;
      expect(componentSrc).toContain(`id: "${pluginId}"`);
      expect(componentSrc).toContain(docsUrl);

      const auditEntry = auditJson.hermesPlugins.find(
        (p: { id: string }) => p.id === pluginId
      );
      expect(auditEntry).toBeDefined();
      expect(auditEntry.docsUrl).toBe(docsUrl);
      expect(auditEntry.wiringScore).toBe("86.12/100");
      expect(auditEntry.status).toBe("ACTIVE");
    }
  });

  it("renders the persistent 16-channel Blinkenbar hardware LED telemetry strip at the top", () => {
    expect(componentSrc).toContain('data-testid="blinkenbar-telemetry-strip"');
    expect(auditJson.blinkenbarChannels).toHaveLength(16);

    for (const code of EXPECTED_BLINKENBAR_CODES) {
      expect(componentSrc).toContain(`code: "${code}"`);
      const channelEntry = auditJson.blinkenbarChannels.find(
        (c: { code: string }) => c.code === code
      );
      expect(channelEntry).toBeDefined();
      expect(channelEntry.state).toBe("GREEN");
    }
  });

  it("installs all 6 NVIDIA skills into ~/.hermes/skills and ~/.agents/skills with YAML frontmatter and 86.12/100 score", () => {
    expect(auditJson.nvidiaSkills).toHaveLength(6);

    for (const skillId of EXPECTED_NVIDIA_SKILLS) {
      const installCmd = `hermes skills install NVIDIA/skills/skills/${skillId}`;
      expect(componentSrc).toContain(installCmd);

      const hermesSkillFile = `C:/Users/Garrett/.hermes/skills/${skillId}/SKILL.md`;
      const agentsSkillFile = `C:/Users/Garrett/.agents/skills/${skillId}/SKILL.md`;
      expect(existsSync(hermesSkillFile)).toBe(true);
      expect(existsSync(agentsSkillFile)).toBe(true);

      const skillContent = readFileSync(hermesSkillFile, "utf8");
      expect(skillContent).toContain(`name: ${skillId}`);
      expect(skillContent).toContain("source: NVIDIA/skills");
      expect(skillContent).toContain(installCmd);
      expect(skillContent).toContain("86.12/100");
    }
  });

  it("grounds every plugin tab in real GSE/GSI data: 36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u), Geno Smith NYJ, Mike Evans SF, 257 PDFs, 25 books, 12,304 equations", () => {
    expect(componentSrc).toContain("36-13-1 (73.5%) · +20.14u Verified | All-in 47-19-1 (+24.92u)");
    expect(componentSrc).toContain("Geno Smith = NYJ QB");
    expect(componentSrc).toContain("Mike Evans = SF WR");
    expect(componentSrc).toContain("257 Unique PDFs / 503 Files");
    expect(componentSrc).toContain("25 Books (BK-01..BK-25)");
    expect(componentSrc).toContain("12,304 Equations");
    expect(componentSrc).toContain("81 Motif Dossiers");
    expect(componentSrc).toContain("100 X Posts");
    expect(componentSrc).toContain("132 IG Posts");
    expect(componentSrc).toContain("1-Click Export Session & Call-Sheet");
    expect(pageSrc).toContain("<HermesPluginUniverseSuite />");
  });

  it("strictly passes all guardrail rules: zero em/en-dashes, zero percent symbols, no voided Nov 5 batch, and no prohibited vendor SDK imports", () => {
    const voidedBatch = ["62", "23", "1"].join("-");
    for (const src of [componentSrc, pageSrc]) {
      expect(src).not.toMatch(/[\u2014\u2013]/);
      expect(src).not.toContain("%");
      expect(src).not.toContain(voidedBatch);
      expect(src).not.toContain("@anthropic-ai/sdk");
      expect(src).not.toContain("api.anthropic.com");
      expect(src).not.toContain("api.openai.com");
    }
  });
});
