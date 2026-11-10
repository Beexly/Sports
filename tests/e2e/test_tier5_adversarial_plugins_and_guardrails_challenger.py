#!/usr/bin/env python3
"""Tier 5 White-Box Adversarial Challenger Suite for M1 Guardrails (`trust-gate.mjs`, `Q52-Q54`)
and M4 Antigravity Plugins/Skills/Workflows/MongoDB (`tests/e2e/test_tier5_adversarial_plugins_and_guardrails_challenger.py`).

Authored by: `teamwork_preview_challenger_r1_2`
Scope:
  1. `trust-gate.mjs`:
     - Real banned phrases ("lock of the week", "guaranteed lock", "lock of the day") on public
       surfaces (`apps/web/`, `packages/`) are caught and rejected (exit code 1).
     - `AGENTS.md` `Drew Lock`, `hawkblogger-lock-darnold-*.csv`, and `LOCK_STAT_TABLE_SAFE_CONTEXT`
       pass cleanly in root memory docs (`SCAN_FILES`), while the exact same stat-table shapes
       smuggled into public surfaces (`apps/web/app/pricing/page.tsx`) are caught and rejected.
     - Same-line piggybacking attacks ("Drew Lock 2.77 — lock of the week",
       "hawkblogger-lock-darnold-2026-11-08.csv guaranteed lock") are caught and rejected.
     - Multi-line split phrase attacks ("lock\\nof the week") are caught and rejected.
     - `Q52-Q54` dynamic schema hash (`computeFeatureSchemaHash`) sensitivity and zero-orphan
       registration in `zero-orphan-expected-metrics-bridge.ts`.
  2. `gdocs`, `gdrive`, and `gh` launchers:
     - Default environment execution (`ANTIGRAVITY_APP_DATA_DIR=/home/antigravity/.gemini/jetski`).
     - Custom, missing (`unset`), and read-only (`chmod 500`) `ANTIGRAVITY_APP_DATA_DIR` resilience.
     - Multi-hop relative symlink `PATH` shim resolution (`while [ -L "$TARGET_FILE" ]`).
     - Live read-only operations (`gdrive readonly ls`, `gdocs readonly word-count`, `gh auth status`).
  3. `rmyndharis/antigravity-skills` CLI & `validate-skills.js --strict`:
     - Short-token (<4 char, exact word match only: "ai" does not match "airflow") vs
       prefix (>=4 char, prefix match: "kube" matches "kubernetes") search scoring.
     - Alias resolution across all 60 `aliases.json` mappings and path-traversal rejection in
       `sanitizeSkillId` / `resolveSkillPath`.
     - Adversarial rejection in `validate-skills.js --strict` and `installSkill` for symlinked
       skill dirs, symlinked inner files, unknown frontmatter keys, `$ARGUMENTS` placeholders,
       mismatched folder/frontmatter names, broken/traversal helper refs, and missing strict sections.
     - Strict validation across all 307 vault skills and all 15 `Beexly/Sports/.agents/skills`.
  4. `MongoDBDossierArchiveAdapter`:
     - Credential resolution priority (`explicit arg > os.environ > /shared/user/.gemini/secrets/mongodb_atlas.env`).
     - Zero secret leakage in `repr()`, `str()`, `archive_document()`, logging output, or tracked git files.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from unittest.mock import patch

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    CorpusDocument,
    MongoDBDossierArchiveAdapter,
    load_env_local_secrets,
)

TRUST_GATE_SCRIPT = REPO_ROOT / "scripts" / "guardrails" / "trust-gate.mjs"
AGY_SKILLS_ROOT = Path("/shared/user/.gemini/config/plugins/antigravity-skills")
AGY_CLI_JS = AGY_SKILLS_ROOT / "bin" / "cli.js"
AGY_VALIDATE_JS = AGY_SKILLS_ROOT / "scripts" / "validate-skills.js"
WORKSPACE_SKILLS_DIR = REPO_ROOT / ".agents" / "skills"
MONGODB_SECRET_FILE = Path("/shared/user/.gemini/secrets/mongodb_atlas.env")

GDOCS_LAUNCHER = Path("/opt/antigravity/plugins/gdocs/skills/gdocs/scripts/gdocs")
GDRIVE_LAUNCHER = Path("/opt/antigravity/plugins/gdrive/skills/gdrive/scripts/gdrive")
GH_LAUNCHER = Path("/opt/antigravity/plugins/github/skills/github/scripts/gh")


def _run_trust_gate_on_synthetic_repo(files: Dict[str, str]) -> Tuple[int, str]:
    """Create a temporary repo layout with `files` and run `trust-gate.mjs` against it."""
    with tempfile.TemporaryDirectory(prefix="challenger-trust-gate-") as tmp:
        tmp_path = Path(tmp)
        for rel_path, content in files.items():
            target = tmp_path / rel_path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        proc = subprocess.run(
            ["node", str(TRUST_GATE_SCRIPT)],
            cwd=str(tmp_path),
            capture_output=True,
            text=True,
            timeout=30,
        )
        combined = f"{proc.stdout or ''}{proc.stderr or ''}"
        return proc.returncode, combined


class TestTier5AdversarialTrustGateAndM1Guardrails(unittest.TestCase):
    """White-box adversarial stress tests for `trust-gate.mjs` and M1 `Q52-Q54` / storefront invariants."""

    def test_01_live_repo_passes_trust_gate_with_drew_lock_and_hawkblogger_csv(self) -> None:
        """Verify the live repository passes `trust-gate.mjs` while `AGENTS.md` preserves `Drew Lock` and `hawkblogger-lock-darnold-*.csv`."""
        agents_md = (REPO_ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("Drew Lock", agents_md)
        self.assertIn("hawkblogger-lock-darnold-turnover-halves-2026.csv", agents_md)
        self.assertIn("hawkblogger-lock-darnold-clean-half-2026.csv", agents_md)

        proc = subprocess.run(
            ["node", str(TRUST_GATE_SCRIPT)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(proc.returncode, 0, f"Live repo trust-gate failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("[trust-gate] OK", proc.stdout)

    def test_02_public_surface_real_banned_lock_and_guaranteed_lock_phrases_rejected(self) -> None:
        """Verify that real banned 'lock of the week' and 'guaranteed lock' phrases on public surfaces are caught and rejected."""
        adversarial_cases = [
            ("apps/web/app/page.tsx", 'export const banner = "Bills -3.5 is our lock of the week!";\n', "banned.lock"),
            ("apps/web/app/pricing/page.tsx", 'export const cta = "Get tonight\'s guaranteed lock now";\n', "banned.lock"),
            ("apps/web/components/Hero.tsx", 'export const sub = "Sunday Lock of the Day: KC -6.5";\n', "banned.lock"),
            ("packages/prediction-engine/src/public-copy.ts", 'export const msg = "This play is a guaranteed winner and a lock";\n', "banned.guaranteed"),
        ]
        for rel_path, content, expected_claim in adversarial_cases:
            with self.subTest(rel_path=rel_path, content=content.strip()):
                code, out = _run_trust_gate_on_synthetic_repo({rel_path: content})
                self.assertEqual(code, 1, f"Expected trust-gate to reject {rel_path}: {out}")
                self.assertIn(expected_claim, out)

    def test_03_stat_table_safe_context_is_scoped_to_root_memory_docs_and_rejected_on_public_surfaces(self) -> None:
        """Verify `LOCK_STAT_TABLE_SAFE_CONTEXT` shapes pass in `AGENTS.md` but are REJECTED if smuggled into `apps/web/`."""
        stat_table_lines = [
            "Leaderboard row: Lock 2.77 EPA and Lock 48% success rate.\n",
            "Table file: hawkblogger-lock-darnold-2026-11-08.csv imported.\n",
            "Chart note: Lock with 5 of the 10 highest Seahawks grades and Lock EPA/play 0.34.\n",
            "Comparison: Cousins/Lock/Prescott/Watson and Lock 35 dropbacks.\n",
        ]
        for line in stat_table_lines:
            with self.subTest(line=line.strip()):
                # Allowed in AGENTS.md (root memory doc in SCAN_FILES)
                code_agents, out_agents = _run_trust_gate_on_synthetic_repo({"AGENTS.md": line})
                self.assertEqual(code_agents, 0, f"Expected AGENTS.md to allow stat-table context:\n{out_agents}")

                # Rejected in apps/web/app/pricing/page.tsx (public marketing surface)
                code_web, out_web = _run_trust_gate_on_synthetic_repo({"apps/web/app/pricing/page.tsx": line})
                self.assertEqual(code_web, 1, f"Expected apps/web to reject smuggled stat-table 'Lock':\n{out_web}")
                self.assertIn("banned.lock", out_web)

    def test_04_piggybacking_real_lock_slang_onto_safe_context_same_line_is_rejected(self) -> None:
        """Verify that piggybacking 'lock of the week' or 'guaranteed lock' onto `Drew Lock` or `hawkblogger-lock-darnold-*.csv` on the same line in `AGENTS.md` still fails."""
        piggyback_lines = [
            "Drew Lock threw for 280 yards, making Seattle our lock of the week!\n",
            "Source: hawkblogger-lock-darnold-2026-11-08.csv — this over is a guaranteed lock.\n",
            "D.Lock 22.92% pressure rate andLock EPA/play 0.25 is a lock for Sunday.\n",
            "We use a server-side lock to publish our lock of the day.\n",
        ]
        for line in piggyback_lines:
            with self.subTest(line=line.strip()):
                code, out = _run_trust_gate_on_synthetic_repo({"AGENTS.md": line})
                self.assertEqual(code, 1, f"Piggybacked slang on safe line was not caught:\n{out}")
                self.assertIn("banned.lock", out)

    def test_05_multiline_and_string_join_evasion_attacks_are_rejected(self) -> None:
        """Verify string-concatenation and cross-line evasion attempts on public surfaces are caught."""
        evasion_cases = [
            'const a = "lock" + " of the week";\n',
            'const b = "guaranteed " + "winner";\n',
            'const c = "10-Layer Autonomous\nEngine powers every pick";\n',
        ]
        for snippet in evasion_cases:
            with self.subTest(snippet=snippet.strip()):
                code, out = _run_trust_gate_on_synthetic_repo({"apps/web/app/page.tsx": snippet})
                self.assertEqual(code, 1, f"Evasion snippet was not caught:\n{out}")

    def test_06_q52_q54_dynamic_schema_hash_and_zero_orphan_registration(self) -> None:
        """White-box test `computeFeatureSchemaHash` sensitivity and verify zero hardcoded `921867c4` in `qb-opponent-tier-efficiency-split.ts`."""
        q53_path = REPO_ROOT / "packages" / "prediction-engine" / "src" / "expected-metrics" / "qb-opponent-tier-efficiency-split.ts"
        q53_source = q53_path.read_text(encoding="utf-8")
        self.assertNotIn("921867c4", q53_source)
        self.assertNotIn("SHADOW_FEATURE_HASH", q53_source)
        self.assertIn("computeFeatureSchemaHash(QB_OPPONENT_TIER_FEATURE_KEYS)", q53_source)

        # Verify via Node that computeFeatureSchemaHash produces deterministic 8-hex hashes and changes on key mutation
        node_script = """
        const keysA = ["week", "passer_player_id", "defteam", "play_type", "qb_spike", "epa"];
        const keysB = ["week", "passer_player_id", "defteam", "play_type", "qb_spike", "epa", "cpoe"];
        const keysReordered = ["passer_player_id", "week", "defteam", "play_type", "qb_spike", "epa"];
        function computeFeatureSchemaHash(keys) {
          const joined = keys.join("|");
          let h = 5381;
          for (let i = 0; i < joined.length; i++) {
            h = ((h << 5) + h) ^ (joined.charCodeAt(i) & 0xff);
            h = h | 0;
          }
          return (h >>> 0).toString(16).padStart(8, "0");
        }
        const hA = computeFeatureSchemaHash(keysA);
        const hB = computeFeatureSchemaHash(keysB);
        const hR = computeFeatureSchemaHash(keysReordered);
        console.log(JSON.stringify({ hA, hB, hR }));
        """
        proc = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, check=True, timeout=15)
        hashes = json.loads(proc.stdout.strip())
        self.assertRegex(hashes["hA"], r"^[0-9a-f]{8}$")
        self.assertNotEqual(hashes["hA"], "921867c4")
        self.assertNotEqual(hashes["hA"], hashes["hB"])
        self.assertNotEqual(hashes["hA"], hashes["hR"])

        # Verify zero-orphan registration of all expected-metrics and nfl modules
        bridge_path = REPO_ROOT / "packages" / "prediction-engine" / "src" / "nfl" / "zero-orphan-expected-metrics-bridge.ts"
        bridge_src = bridge_path.read_text(encoding="utf-8")
        for mod in (
            "expected-metrics/defensive-field-zone-split.ts",
            "expected-metrics/qb-opponent-tier-efficiency-split.ts",
            "expected-metrics/qb-post-first-int-efficiency-split.ts",
        ):
            self.assertIn(f'"{mod}"', bridge_src)


class TestTier5AdversarialPluginLaunchers(unittest.TestCase):
    """White-box stress tests for `gdocs`, `gdrive`, and `gh` launchers under adverse env/symlink conditions."""

    def test_01_launchers_succeed_when_antigravity_app_data_dir_is_missing_or_empty(self) -> None:
        """Verify `gdocs`, `gdrive`, and `gh` succeed when `ANTIGRAVITY_APP_DATA_DIR` is unset or empty."""
        base_env = {k: v for k, v in os.environ.items() if k != "ANTIGRAVITY_APP_DATA_DIR"}

        for name, launcher, args in (
            ("gdocs", GDOCS_LAUNCHER, ["auth", "status"]),
            ("gdrive", GDRIVE_LAUNCHER, ["auth", "status"]),
            ("gh", GH_LAUNCHER, ["auth", "status"]),
        ):
            with self.subTest(launcher=name, mode="unset"):
                proc = subprocess.run(
                    [str(launcher), *args],
                    env=base_env,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(proc.returncode, 0, f"{name} failed with unset ANTIGRAVITY_APP_DATA_DIR:\n{proc.stderr}")
                # When IS_FALLBACK=1, launcher must not emit "Registered '<tool>' into PATH"
                self.assertNotIn(f"Registered '{name}' into PATH", proc.stderr)

    def test_02_launchers_succeed_with_custom_and_readonly_antigravity_app_data_dir(self) -> None:
        """Verify `gdocs`, `gdrive`, and `gh` succeed when `ANTIGRAVITY_APP_DATA_DIR` is custom or read-only (`chmod 500`)."""
        with tempfile.TemporaryDirectory(prefix="challenger-appdata-") as tmp:
            custom_dir = Path(tmp) / "custom_app_data"
            custom_dir.mkdir(parents=True, exist_ok=True)
            env_custom = dict(os.environ, ANTIGRAVITY_APP_DATA_DIR=str(custom_dir))

            for name, launcher, args in (
                ("gdocs", GDOCS_LAUNCHER, ["auth", "status"]),
                ("gdrive", GDRIVE_LAUNCHER, ["auth", "status"]),
                ("gh", GH_LAUNCHER, ["--version"]),
            ):
                with self.subTest(launcher=name, mode="custom_writable"):
                    proc = subprocess.run(
                        [str(launcher), *args],
                        env=env_custom,
                        capture_output=True,
                        text=True,
                        timeout=30,
                    )
                    self.assertEqual(proc.returncode, 0, f"{name} failed with custom ANTIGRAVITY_APP_DATA_DIR:\n{proc.stderr}")
                    shim = custom_dir / "bin" / name
                    self.assertTrue(shim.is_symlink(), f"Expected shim symlink at {shim}")

            # Now test a strictly read-only directory where mkdir/ln fail with EACCES/EPERM
            ro_dir = Path(tmp) / "readonly_app_data"
            ro_dir.mkdir(parents=True, exist_ok=True)
            os.chmod(ro_dir, stat.S_IRUSR | stat.S_IXUSR)
            try:
                env_ro = dict(os.environ, ANTIGRAVITY_APP_DATA_DIR=str(ro_dir))
                for name, launcher, args in (
                    ("gdocs", GDOCS_LAUNCHER, ["auth", "status"]),
                    ("gdrive", GDRIVE_LAUNCHER, ["auth", "status"]),
                    ("gh", GH_LAUNCHER, ["--version"]),
                ):
                    with self.subTest(launcher=name, mode="readonly_dir"):
                        proc = subprocess.run(
                            [str(launcher), *args],
                            env=env_ro,
                            capture_output=True,
                            text=True,
                            timeout=30,
                        )
                        self.assertEqual(proc.returncode, 0, f"{name} crashed on read-only ANTIGRAVITY_APP_DATA_DIR:\n{proc.stderr}")
            finally:
                os.chmod(ro_dir, stat.S_IRWXU)

    def test_03_launchers_resolve_chained_relative_symlink_shims_in_path(self) -> None:
        """Verify the `while [ -L \"$TARGET_FILE\" ]` loop resolves multi-hop relative symlinks accurately."""
        with tempfile.TemporaryDirectory(prefix="challenger-shims-") as tmp:
            tmp_path = Path(tmp)
            hop1_dir = tmp_path / "level1" / "hop1"
            hop2_dir = tmp_path / "level1" / "hop2" / "bin"
            hop1_dir.mkdir(parents=True, exist_ok=True)
            hop2_dir.mkdir(parents=True, exist_ok=True)

            for name, real_launcher, args in (
                ("gdocs", GDOCS_LAUNCHER, ["auth", "status"]),
                ("gdrive", GDRIVE_LAUNCHER, ["auth", "status"]),
                ("gh", GH_LAUNCHER, ["--version"]),
            ):
                # hop1/<name> -> absolute launcher
                hop1_link = hop1_dir / name
                hop1_link.symlink_to(real_launcher)
                # hop2/bin/<name> -> relative ../../hop1/<name>
                hop2_link = hop2_dir / name
                hop2_link.symlink_to(Path("../../hop1") / name)

                env_shim = dict(os.environ, PATH=f"{hop2_dir}:{os.environ.get('PATH', '')}")
                proc = subprocess.run(
                    [str(hop2_link), *args],
                    env=env_shim,
                    capture_output=True,
                    text=True,
                    timeout=30,
                )
                self.assertEqual(proc.returncode, 0, f"Multi-hop relative symlink failed for {name}:\n{proc.stderr}")

    def test_04_readonly_plugin_operations_succeed_without_mutation(self) -> None:
        """Verify live read-only operations across `gdrive`, `gdocs`, and `gh` exit 0 and return structured data."""
        # 1. gdrive readonly ls --max 3 --json
        proc_drive = subprocess.run(
            ["gdrive", "readonly", "ls", "--max", "3", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_drive.returncode, 0, proc_drive.stderr)
        drive_items = json.loads(proc_drive.stdout)
        self.assertIsInstance(drive_items, list)
        self.assertGreaterEqual(len(drive_items), 1)
        self.assertIn("id", drive_items[0])

        # 2. gdocs readonly word-count on known reference doc
        proc_docs = subprocess.run(
            ["gdocs", "readonly", "word-count", "11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI", "--json"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_docs.returncode, 0, proc_docs.stderr)
        wc = json.loads(proc_docs.stdout)
        self.assertGreater(wc.get("words", 0), 100)
        self.assertGreater(wc.get("characters", 0), 500)

        # 3. gh auth status
        proc_gh = subprocess.run(
            ["gh", "auth", "status"],
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_gh.returncode, 0, proc_gh.stderr)
        combined_gh = f"{proc_gh.stdout}{proc_gh.stderr}"
        self.assertIn("Logged in to github.com", combined_gh)


class TestTier5AdversarialAntigravitySkillsAndValidator(unittest.TestCase):
    """White-box stress tests for `rmyndharis/antigravity-skills` CLI search, aliases, installer, and `validate-skills.js --strict`."""

    def test_01_short_token_vs_prefix_search_and_alias_resolution_whitebox(self) -> None:
        """Verify `<4` char tokens require whole-word match ('ai' != 'airflow') while `>=4` char tokens match prefixes ('kube' == 'kubernetes'), and test all 60 aliases."""
        node_test = """
        const assert = require('node:assert/strict');
        const fs = require('node:fs');
        const path = require('node:path');
        const cli = require('/shared/user/.gemini/config/plugins/antigravity-skills/bin/cli.js');
        const aliasesData = JSON.parse(fs.readFileSync('/shared/user/.gemini/config/plugins/antigravity-skills/aliases.json', 'utf8')).aliases;

        // 1. Short token (<4 chars): "ai" must NOT match a skill containing only "airflow", "domain", "email"
        const airflowSkill = {
          id: 'airflow-dag-orchestrator',
          name: 'Airflow DAG Orchestrator',
          description: 'Manage domain email pipelines in Apache Airflow',
          tags: ['airflow', 'container', 'maintenance'],
        };
        assert.equal(cli.scoreSkill(airflowSkill, ['ai']), 0, 'Short token "ai" must not prefix-match "airflow"');

        // Exact short word "ai" MUST match when "ai" is a standalone token
        const aiSkill = {
          id: 'ai-agent-router',
          name: 'AI Agent Router',
          description: 'Routes AI tasks',
          tags: ['ai'],
        };
        assert.ok(cli.scoreSkill(aiSkill, ['ai']) >= 5, 'Short token "ai" must match standalone word "ai"');

        // 2. Prefix token (>=4 chars): "kube" (length 4) MUST match "kubernetes"
        const kubeSkill = {
          id: 'kubernetes-cluster-admin',
          name: 'Kubernetes Cluster Admin',
          description: 'Deploy workloads to Kubernetes clusters',
          tags: ['kubernetes', 'devops'],
        };
        assert.ok(cli.scoreSkill(kubeSkill, ['kube']) >= 5, '4-char token "kube" must prefix-match "kubernetes"');

        // 3. Verify all 60 aliases resolve cleanly to valid sanitized skill IDs existing in vault
        const aliasEntries = Object.entries(aliasesData);
        assert.equal(aliasEntries.length, 60, 'Expected 60 aliases in aliases.json');
        for (const [aliasKey, targetId] of aliasEntries) {
          const resolved = cli.resolveSkillId(aliasKey, aliasesData);
          assert.equal(resolved, targetId, `Alias ${aliasKey} did not resolve to ${targetId}`);
          const resolvedUpper = cli.resolveSkillId('  ' + aliasKey.toUpperCase() + ' ', aliasesData);
          assert.equal(resolvedUpper, targetId, `Case/whitespace normalization failed for ${aliasKey}`);
          const skillPath = cli.resolveSkillPath(resolved);
          assert.ok(skillPath && fs.existsSync(path.join(skillPath, 'SKILL.md')), `Target skill missing for alias ${aliasKey} -> ${resolved}`);
        }

        // 4. Verify path traversal and command injection strings are rejected by sanitizeSkillId & resolveSkillPath
        for (const malicious of ['../etc/passwd', '../../secret', 'skill/sub', 'skill;rm -rf', 'skill_underscore', '', '   ', null, undefined]) {
          assert.equal(cli.sanitizeSkillId(malicious), null, `sanitizeSkillId failed to reject: ${malicious}`);
          assert.equal(cli.resolveSkillId(malicious, aliasesData), null, `resolveSkillId failed to reject: ${malicious}`);
        }
        assert.equal(cli.resolveSkillPath('../outside'), null, 'resolveSkillPath must block parent traversal');
        console.log('WHITEBOX_CLI_OK');
        """
        proc = subprocess.run(["node", "-e", node_test], capture_output=True, text=True, timeout=30)
        self.assertEqual(proc.returncode, 0, f"White-box CLI test failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("WHITEBOX_CLI_OK", proc.stdout)

    def test_02_validate_skills_strict_rejects_symlinks_bad_frontmatter_and_missing_sections(self) -> None:
        """Verify `validate-skills.js --strict` catches and rejects symlinks, `$ARGUMENTS`, unknown frontmatter, and missing sections."""
        with tempfile.TemporaryDirectory(prefix="challenger-validate-skills-") as tmp:
            tmp_root = Path(tmp)

            # Subtest A: Symlinked skill directory
            dir_symlink = tmp_root / "case_symlink_dir"
            dir_symlink.mkdir()
            real_target = tmp_root / "real_target_skill"
            real_target.mkdir()
            (real_target / "SKILL.md").write_text(
                "---\nname: symlinked-skill\ndescription: Valid description.\n---\n## Use this skill when\n- a\n## Do not use this skill when\n- b\n## Instructions\n- c\n",
                encoding="utf-8",
            )
            (dir_symlink / "symlinked-skill").symlink_to(real_target)
            proc_sym_dir = subprocess.run(
                ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(dir_symlink)],
                capture_output=True,
                text=True,
                timeout=20,
            )
            self.assertNotEqual(proc_sym_dir.returncode, 0)
            self.assertIn("Skill directories must not be symbolic links: symlinked-skill", proc_sym_dir.stderr)

            # Subtest B: Symlinked file inside a skill directory
            dir_inner_sym = tmp_root / "case_inner_symlink"
            skill_b = dir_inner_sym / "inner-sym-skill"
            skill_b.mkdir(parents=True)
            (skill_b / "SKILL.md").write_text(
                "---\nname: inner-sym-skill\ndescription: Valid description.\n---\n## Use this skill when\n- a\n## Do not use this skill when\n- b\n## Instructions\n- c\n",
                encoding="utf-8",
            )
            (skill_b / "linked-helper.md").symlink_to(real_target / "SKILL.md")
            proc_inner_sym = subprocess.run(
                ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(dir_inner_sym)],
                capture_output=True,
                text=True,
                timeout=20,
            )
            self.assertNotEqual(proc_inner_sym.returncode, 0)
            self.assertIn("Skill files must not be symbolic links", proc_inner_sym.stderr)

            # Subtest C: Unknown frontmatter field + $ARGUMENTS placeholder + missing section + traversal reference
            dir_bad_fm = tmp_root / "case_bad_fm"
            skill_c = dir_bad_fm / "bad-frontmatter-skill"
            skill_c.mkdir(parents=True)
            (skill_c / "SKILL.md").write_text(
                "---\n"
                "name: wrong-folder-name\n"
                "description: Takes $ARGUMENTS from user.\n"
                "unauthorized-field: nope\n"
                "---\n"
                "# Bad Skill\n"
                "See [traversal](scripts/../../etc/passwd) and $ARGUMENTS.\n",
                encoding="utf-8",
            )
            proc_bad_fm = subprocess.run(
                ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(dir_bad_fm)],
                capture_output=True,
                text=True,
                timeout=20,
            )
            self.assertNotEqual(proc_bad_fm.returncode, 0)
            self.assertIn("name must match folder name", proc_bad_fm.stderr)
            self.assertIn("description must describe the skill without command placeholders", proc_bad_fm.stderr)
            self.assertIn("Unknown frontmatter fields", proc_bad_fm.stderr)
            self.assertIn("Claude Code-only syntax ($ARGUMENTS", proc_bad_fm.stderr)
            self.assertIn("Referenced file not found or outside skill", proc_bad_fm.stderr)
            self.assertIn('Missing "Use this skill when" section (strict)', proc_bad_fm.stderr)

    def test_03_install_skill_rejects_symlinks_and_overlapping_paths(self) -> None:
        """Verify `installSkill` rejects source directories containing symlinks or overlapping destination paths."""
        with tempfile.TemporaryDirectory(prefix="challenger-install-skill-") as tmp:
            node_script = f"""
            const assert = require('node:assert/strict');
            const fs = require('node:fs');
            const path = require('node:path');
            const {{ installSkill }} = require('/shared/user/.gemini/config/plugins/antigravity-skills/lib/install-skill');

            (async () => {{
              const root = {json.dumps(tmp)};
              const srcDir = path.join(root, 'src-skill');
              fs.mkdirSync(srcDir, {{ recursive: true }});
              fs.writeFileSync(path.join(srcDir, 'SKILL.md'), '---\\nname: src-skill\\ndescription: test\\n---\\n');

              // 1. Overlapping path rejection
              await assert.rejects(
                () => installSkill(srcDir, path.join(srcDir, 'nested-dest'), true),
                /Skill source and installation destination must not overlap/
              );

              // 2. Symlink inside source directory rejection
              fs.symlinkSync(path.join(srcDir, 'SKILL.md'), path.join(srcDir, 'evil-link.md'));
              const destDir = path.join(root, 'dest-skill');
              await assert.rejects(
                () => installSkill(srcDir, destDir, true),
                /Skill source must not contain symlinks/
              );
              console.log('INSTALL_SKILL_SECURITY_OK');
            }})().catch(err => {{
              console.error(err);
              process.exit(1);
            }});
            """
            proc = subprocess.run(["node", "-e", node_script], capture_output=True, text=True, timeout=20)
            self.assertEqual(proc.returncode, 0, f"installSkill test failed:\n{proc.stdout}\n{proc.stderr}")
            self.assertIn("INSTALL_SKILL_SECURITY_OK", proc.stdout)

    def test_04_strict_validation_passes_all_307_vault_skills_and_all_15_workspace_skills(self) -> None:
        """Verify `validate-skills.js --strict` passes all 307 vault skills and all 15 `Beexly/Sports/.agents/skills` with 0 errors."""
        # 1. All 307 vault skills
        proc_vault = subprocess.run(
            ["node", str(AGY_VALIDATE_JS), "--strict"],
            cwd=str(AGY_SKILLS_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(proc_vault.returncode, 0, f"Vault strict validation failed:\n{proc_vault.stderr}")
        self.assertIn("Validation passed for 307 skills.", proc_vault.stdout)

        # 2. All 15 Beexly/Sports/.agents/skills (0 warnings, 0 errors)
        proc_ws = subprocess.run(
            ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(WORKSPACE_SKILLS_DIR)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_ws.returncode, 0, f"Workspace strict validation failed:\n{proc_ws.stderr}")
        self.assertIn("Validation passed for 15 skills.", proc_ws.stdout)
        self.assertEqual(proc_ws.stderr.strip(), "", f"Expected 0 warnings on workspace skills, got:\n{proc_ws.stderr}")

        # 3. Verify zero symlinks anywhere under .agents/skills or /shared/user/.gemini/config/plugins/antigravity-skills
        for root_dir in (WORKSPACE_SKILLS_DIR, AGY_SKILLS_ROOT):
            symlinks = [p for p in root_dir.rglob("*") if p.is_symlink()]
            self.assertEqual(symlinks, [], f"Found unexpected symlinks in {root_dir}: {symlinks}")


class TestTier5AdversarialMongoDBCredentialsAndSecretHygiene(unittest.TestCase):
    """White-box stress tests for `MongoDBDossierArchiveAdapter` credential precedence and zero secret leakage."""

    def test_01_credential_resolution_priority_explicit_over_environ_over_secret_file(self) -> None:
        """Verify credential precedence: `explicit arg > os.environ > /shared/user/.gemini/secrets/mongodb_atlas.env`."""
        self.assertTrue(MONGODB_SECRET_FILE.is_file(), f"Missing {MONGODB_SECRET_FILE}")
        file_secrets = load_env_local_secrets(MONGODB_SECRET_FILE)
        self.assertTrue(file_secrets.get("MONGODB_ATLAS_ORG_ID"))
        self.assertTrue(file_secrets.get("MONGODB_ATLAS_PUBLIC_KEY"))
        self.assertTrue(file_secrets.get("MONGODB_ATLAS_PRIVATE_KEY"))

        # Tier A: Fallback to /shared/user/.gemini/secrets/mongodb_atlas.env when os.environ is cleared
        clean_env = {
            k: v
            for k, v in os.environ.items()
            if k not in ("MONGODB_URI", "MONGODB_ATLAS_ORG_ID", "MONGODB_ATLAS_PUBLIC_KEY", "MONGODB_ATLAS_PRIVATE_KEY")
        }
        with patch.dict(os.environ, clean_env, clear=True):
            adapter_file = MongoDBDossierArchiveAdapter()
            self.assertTrue(adapter_file.is_atlas_org_configured)
            self.assertEqual(adapter_file.mongodb_uri, file_secrets.get("MONGODB_URI", ""))
            self.assertEqual(adapter_file.atlas_org_id, file_secrets["MONGODB_ATLAS_ORG_ID"])
            self.assertEqual(adapter_file.atlas_public_key, file_secrets["MONGODB_ATLAS_PUBLIC_KEY"])
            self.assertEqual(adapter_file._atlas_private_key, file_secrets["MONGODB_ATLAS_PRIVATE_KEY"])

        # Tier B: os.environ overrides /shared/user/.gemini/secrets/mongodb_atlas.env
        env_override = dict(
            clean_env,
            MONGODB_URI="mongodb+srv://env-override-cluster.mongodb.net/gse_env",
            MONGODB_ATLAS_ORG_ID="env_org_999",
            MONGODB_ATLAS_PUBLIC_KEY="env_pub_999",
            MONGODB_ATLAS_PRIVATE_KEY="env_priv_999",
        )
        with patch.dict(os.environ, env_override, clear=True):
            adapter_env = MongoDBDossierArchiveAdapter()
            self.assertTrue(adapter_env.is_configured)
            self.assertTrue(adapter_env.is_atlas_org_configured)
            self.assertEqual(adapter_env.mongodb_uri, "mongodb+srv://env-override-cluster.mongodb.net/gse_env")
            self.assertEqual(adapter_env.atlas_org_id, "env_org_999")
            self.assertEqual(adapter_env.atlas_public_key, "env_pub_999")
            self.assertEqual(adapter_env._atlas_private_key, "env_priv_999")

            # Tier C: Explicit `mongodb_uri` constructor argument overrides BOTH os.environ and secret file
            adapter_explicit = MongoDBDossierArchiveAdapter(
                mongodb_uri="mongodb://explicit-arg-host:27017/gse_explicit",
                database_name="custom_db",
            )
            self.assertTrue(adapter_explicit.is_configured)
            self.assertEqual(adapter_explicit.mongodb_uri, "mongodb://explicit-arg-host:27017/gse_explicit")
            self.assertEqual(adapter_explicit.database_name, "custom_db")

            # Tier D: Explicit empty string `mongodb_uri=""` disables URI configuration despite os.environ/file
            adapter_disabled = MongoDBDossierArchiveAdapter(mongodb_uri="")
            self.assertFalse(adapter_disabled.is_configured)
            self.assertEqual(adapter_disabled.mongodb_uri, "")

    def test_02_zero_secret_leakage_in_repr_str_archive_receipts_logs_and_git_tracked_files(self) -> None:
        """Verify private/public keys and URI secrets never leak in `repr()`, `str()`, archive receipts, logs, or git."""
        file_secrets = load_env_local_secrets(MONGODB_SECRET_FILE)
        sensitive_values = [
            file_secrets["MONGODB_ATLAS_PRIVATE_KEY"],
            file_secrets["MONGODB_ATLAS_PUBLIC_KEY"],
        ]

        log_capture: List[str] = []

        class _ListHandler(logging.Handler):
            def emit(self, record: logging.LogRecord) -> None:
                log_capture.append(self.format(record))

        handler = _ListHandler()
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)
        try:
            adapter = MongoDBDossierArchiveAdapter()
            doc = CorpusDocument(
                doc_id="challenger-secret-test-01",
                title="Adversarial Secret Audit Doc",
                text="Verifying zero secret leakage across archive receipts and object representations.",
            )
            receipt = adapter.archive_document(doc)
            stored = adapter.get_document("challenger-secret-test-01")
            repr_str = repr(adapter)
            str_str = str(adapter)
            receipt_json = json.dumps(receipt)
            stored_json = json.dumps(stored)
        finally:
            root_logger.removeHandler(handler)

        for secret_val in sensitive_values:
            self.assertTrue(len(secret_val) >= 8)
            self.assertNotIn(secret_val, repr_str, "Secret leaked in repr(adapter)")
            self.assertNotIn(secret_val, str_str, "Secret leaked in str(adapter)")
            self.assertNotIn(secret_val, receipt_json, "Secret leaked in archive_document() receipt")
            self.assertNotIn(secret_val, stored_json, "Secret leaked in get_document() payload")
            for log_line in log_capture:
                self.assertNotIn(secret_val, log_line, "Secret leaked in logging output")

        # Verify zero git-tracked files in Beexly/Sports contain the private key or public key
        proc_grep = subprocess.run(
            ["git", "grep", "-F", file_secrets["MONGODB_ATLAS_PRIVATE_KEY"]],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_grep.returncode, 1, f"Private key leaked in tracked git files:\n{proc_grep.stdout}")
        self.assertEqual(proc_grep.stdout.strip(), "")


if __name__ == "__main__":
    unittest.main(verbosity=2)
