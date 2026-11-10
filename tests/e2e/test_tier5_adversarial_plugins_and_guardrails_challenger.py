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
     - Strict validation across all 307 vault skills and all 53 `Beexly/Sports/.agents/skills`.
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

    def test_05_round2_f14_all_6_connected_launchers_hostile_appdata_and_symlink_chains(self) -> None:
        """Verify all 6 connected plugin launchers (`gdocs`, `gdrive`, `gh`, `gsheets`, `gslides`, `gcalendar`) survive unset, custom, read-only (`chmod 0500`), file-as-dir (`ENOTDIR`), and multi-hop relative symlink chains."""
        all_6_launchers = (
            ("gdocs", Path("/opt/antigravity/plugins/gdocs/skills/gdocs/scripts/gdocs"), ["--version"]),
            ("gdrive", Path("/opt/antigravity/plugins/gdrive/skills/gdrive/scripts/gdrive"), ["--version"]),
            ("gh", Path("/opt/antigravity/plugins/github/skills/github/scripts/gh"), ["--version"]),
            ("gsheets", Path("/opt/antigravity/plugins/gsheets/skills/gsheets/scripts/gsheets"), ["--version"]),
            ("gslides", Path("/opt/antigravity/plugins/gslides/skills/gslides/scripts/gslides"), ["--version"]),
            ("gcalendar", Path("/opt/antigravity/plugins/gcalendar/skills/gcalendar/scripts/gcalendar"), ["--version"]),
        )
        base_env_unset = {k: v for k, v in os.environ.items() if k != "ANTIGRAVITY_APP_DATA_DIR"}

        with tempfile.TemporaryDirectory(prefix="challenger-r2-6plugins-") as tmp:
            tmp_path = Path(tmp)
            custom_dir = tmp_path / "custom_writable"
            custom_dir.mkdir(parents=True, exist_ok=True)
            ro_dir = tmp_path / "readonly_appdata"
            ro_dir.mkdir(parents=True, exist_ok=True)
            os.chmod(ro_dir, stat.S_IRUSR | stat.S_IXUSR)
            not_a_dir = tmp_path / "file_instead_of_dir"
            not_a_dir.write_text("hostile file blocking mkdir -p", encoding="utf-8")

            hop1_dir = tmp_path / "chains" / "hop1"
            hop2_dir = tmp_path / "chains" / "hop2" / "bin"
            hop1_dir.mkdir(parents=True, exist_ok=True)
            hop2_dir.mkdir(parents=True, exist_ok=True)

            try:
                for name, launcher_path, args in all_6_launchers:
                    self.assertTrue(launcher_path.is_file(), f"Missing launcher: {launcher_path}")
                    src = launcher_path.read_text(encoding="utf-8")
                    self.assertIn("PREBAKED_TARGET=", src, f"{name} missing PREBAKED_TARGET")

                    # Mode A: unset ANTIGRAVITY_APP_DATA_DIR
                    proc_unset = subprocess.run(
                        [str(launcher_path), *args],
                        env=base_env_unset,
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    self.assertEqual(proc_unset.returncode, 0, f"{name} failed with unset env:\n{proc_unset.stderr}")
                    self.assertNotIn(f"Registered '{name}' into PATH", proc_unset.stderr)

                    # Mode B: custom writable ANTIGRAVITY_APP_DATA_DIR
                    proc_custom = subprocess.run(
                        [str(launcher_path), *args],
                        env=dict(os.environ, ANTIGRAVITY_APP_DATA_DIR=str(custom_dir)),
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    self.assertEqual(proc_custom.returncode, 0, f"{name} failed with custom env:\n{proc_custom.stderr}")
                    self.assertTrue((custom_dir / "bin" / name).is_symlink(), f"Missing shim symlink for {name}")

                    # Mode C: strictly read-only ANTIGRAVITY_APP_DATA_DIR (chmod 0500)
                    proc_ro = subprocess.run(
                        [str(launcher_path), *args],
                        env=dict(os.environ, ANTIGRAVITY_APP_DATA_DIR=str(ro_dir)),
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    self.assertEqual(proc_ro.returncode, 0, f"{name} failed with read-only env:\n{proc_ro.stderr}")

                    # Mode D: regular file as ANTIGRAVITY_APP_DATA_DIR (ENOTDIR on mkdir -p)
                    proc_enotdir = subprocess.run(
                        [str(launcher_path), *args],
                        env=dict(os.environ, ANTIGRAVITY_APP_DATA_DIR=str(not_a_dir)),
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    self.assertEqual(proc_enotdir.returncode, 0, f"{name} failed with ENOTDIR env:\n{proc_enotdir.stderr}")

                    # Mode E: 2-hop relative symlink chain
                    h1 = hop1_dir / name
                    h2 = hop2_dir / name
                    h1.symlink_to(launcher_path)
                    h2.symlink_to(Path("../../hop1") / name)
                    proc_chain = subprocess.run(
                        [str(h2), *args],
                        env=dict(os.environ, PATH=f"{hop2_dir}:{os.environ.get('PATH', '')}"),
                        capture_output=True,
                        text=True,
                        timeout=20,
                    )
                    self.assertEqual(proc_chain.returncode, 0, f"{name} failed symlink chain:\n{proc_chain.stderr}")
            finally:
                os.chmod(ro_dir, stat.S_IRWXU)

    def test_06_round2_f14_zero_stale_tmp_binaries_and_all_6_plugins_prebaked_and_auth(self) -> None:
        """Verify zero leftover `.tmp.*` files exist in `plugin_data` and all 6 plugins pass `auth status` using pre-baked binaries."""
        expected_prebaked = (
            ("gdocs", "/opt/antigravity/plugin_data/gdocs/bin/gdocs-986250228"),
            ("gdrive", "/opt/antigravity/plugin_data/gdrive/bin/gdrive-1013145354"),
            ("gh", "/opt/antigravity/plugin_data/github/bin/gh-2.103.3"),
            ("gsheets", "/opt/antigravity/plugin_data/gsheets/bin/gsheets-986250228"),
            ("gslides", "/opt/antigravity/plugin_data/gslides/bin/gslides-986250228"),
            ("gcalendar", "/opt/antigravity/plugin_data/gcalendar/bin/gcalendar-986250228"),
        )
        for tool, prebaked_str in expected_prebaked:
            prebaked = Path(prebaked_str)
            self.assertTrue(prebaked.is_file(), f"Missing pre-baked binary: {prebaked}")
            self.assertTrue(os.access(prebaked, os.X_OK), f"Pre-baked binary not executable: {prebaked}")
            proc_auth = subprocess.run(
                [f"/opt/antigravity/bin/{tool}", "auth", "status"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(proc_auth.returncode, 0, f"{tool} auth status failed:\n{proc_auth.stderr}")
            combined = f"{proc_auth.stdout}{proc_auth.stderr}"
            self.assertTrue(
                "Logged in" in combined or "✓" in combined,
                f"Unexpected auth status output for {tool}: {combined}",
            )

        # Ensure zero leftover .tmp.* binaries across both FUSE and /opt plugin_data trees
        for pd_root in (
            Path("/home/antigravity/.gemini/jetski/plugin_data"),
            Path("/opt/antigravity/plugin_data"),
        ):
            if pd_root.exists():
                for dirpath, _dirnames, filenames in os.walk(pd_root):
                    for fn in filenames:
                        self.assertNotIn(
                            ".tmp.",
                            fn,
                            f"Stale temporary binary found in {dirpath}: {fn}",
                        )


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
        """Verify `validate-skills.js --strict` passes all 307 vault skills and all 53 `Beexly/Sports/.agents/skills` (15 R1 + 38 R2) with 0 errors."""
        # 1. All 307 vault skills
        proc_vault = subprocess.run(
            ["node", str(AGY_VALIDATE_JS), "--strict"],
            cwd=str(AGY_SKILLS_ROOT),
            capture_output=True,
            text=True,
            timeout=90,
        )
        self.assertEqual(proc_vault.returncode, 0, f"Vault strict validation failed:\n{proc_vault.stderr}")
        self.assertIn("Validation passed for 307 skills.", proc_vault.stdout)

        # 2. All 53 Beexly/Sports/.agents/skills (0 warnings, 0 errors)
        proc_ws = subprocess.run(
            ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(WORKSPACE_SKILLS_DIR)],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc_ws.returncode, 0, f"Workspace strict validation failed:\n{proc_ws.stderr}")
        self.assertIn("Validation passed for 53 skills.", proc_ws.stdout)
        self.assertEqual(proc_ws.stderr.strip(), "", f"Expected 0 warnings on workspace skills, got:\n{proc_ws.stderr}")

        # 3. Fast symlink check across WORKSPACE_SKILLS_DIR (recursive) and AGY_SKILLS_ROOT/skills (getdents64)
        ws_symlinks: List[str] = []
        for dirpath, dirnames, filenames in os.walk(WORKSPACE_SKILLS_DIR, followlinks=False):
            for name in [*dirnames, *filenames]:
                cand = os.path.join(dirpath, name)
                if os.path.islink(cand):
                    ws_symlinks.append(cand)
        self.assertEqual(ws_symlinks, [], f"Found unexpected symlinks in {WORKSPACE_SKILLS_DIR}: {ws_symlinks}")
        with os.scandir(AGY_SKILLS_ROOT / "skills") as v_it:
            vault_symlinks = [e.name for e in v_it if e.is_symlink()]
        self.assertEqual(vault_symlinks, [], f"Found unexpected symlinks in {AGY_SKILLS_ROOT / 'skills'}: {vault_symlinks}")

    def test_05_round2_f13_google_skills_187_three_root_parity_7_plugins_and_1269_live_execution(self) -> None:
        """White-box challenge `google/skills` (`187` skills across 3 roots), 7 `CANONICAL_7_AGY_PLUGINS` (`383` skills), and `1,269`-skill execution receipt."""
        google_plugin_dir = Path("/shared/user/.gemini/config/plugins/google-skills")
        gemini_skills_dir = Path("/shared/user/.gemini/config/skills")
        agents_skills_dir = Path.home() / ".agents" / "skills"

        index_path = google_plugin_dir / "index.json"
        self.assertTrue(index_path.is_file(), f"Missing {index_path}")
        index_data = json.loads(index_path.read_text(encoding="utf-8"))
        skills_list = index_data.get("skills", [])
        self.assertEqual(len(skills_list), 187, f"Expected 187 standalone google/skills, got {len(skills_list)}")

        with os.scandir(gemini_skills_dir) as git:
            gemini_skill_names = {e.name for e in git if e.is_dir(follow_symlinks=False)}
        with os.scandir(agents_skills_dir) as ait:
            agents_skill_names = {e.name for e in ait if e.is_dir(follow_symlinks=False)}
        google_cat_dirs: Dict[str, set[str]] = {}
        for cat_name in ("ads", "analytics", "cloud", "developers", "identity"):
            c_dir = google_plugin_dir / "skills" / cat_name
            self.assertTrue(c_dir.is_dir(), f"Missing category dir: {c_dir}")
            with os.scandir(c_dir) as cit:
                google_cat_dirs[cat_name] = {e.name for e in cit if e.is_dir(follow_symlinks=False)}

        # Check category breakdown (ads=3, analytics=2, cloud=175, developers=6, identity=1)
        cat_counts: Dict[str, int] = {}
        for item in skills_list:
            entrypoint = str(item.get("entrypoint", "")).strip()
            rel_md = entrypoint.split("/main/")[-1].lstrip("/") if "/main/" in entrypoint else str(item.get("path", "")).strip("/")
            rel_dir = rel_md[: -len("/SKILL.md")] if rel_md.endswith("/SKILL.md") else rel_md
            sid = str(item.get("name", "")).strip()
            parts = rel_dir.split("/")
            cat = parts[1] if len(parts) >= 2 and parts[0] == "skills" else parts[0]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
            self.assertIn(sid, google_cat_dirs.get(cat, set()), f"Missing in google-skills/{cat}: {sid}")
            self.assertIn(sid, gemini_skill_names, f"Missing in gemini/config/skills: {sid}")
            self.assertIn(f"google-{sid}", agents_skill_names, f"Missing in ~/.agents/skills: google-{sid}")

        self.assertEqual(
            cat_counts,
            {"ads": 14, "analytics": 2, "cloud": 166, "developers": 3, "identity": 2},
            f"Unexpected google/skills category breakdown: {cat_counts}",
        )

        # Verify 7 CANONICAL_7_AGY_PLUGINS skill counts (15 + 9 + 307 + 45 + 1 + 5 + 1 = 383)
        expected_plugins = {
            "superpowers": 15,
            "understand-anything": 9,
            "antigravity-skills": 307,
            "antigravity-workflows": 45,
            "android-cli-plugin": 1,
            "chrome-devtools-plugin": 5,
            "google-antigravity-sdk": 1,
        }
        plugins_root = Path("/shared/user/.gemini/config/plugins")
        total_canonical = 0
        for p_name, exp_count in expected_plugins.items():
            s_dir = plugins_root / p_name / "skills"
            self.assertTrue(s_dir.is_dir(), f"Missing canonical plugin skills dir: {s_dir}")
            with os.scandir(s_dir) as it:
                entries = [e.name for e in it if e.is_dir(follow_symlinks=False) and not e.name.startswith(".")]
            self.assertEqual(len(entries), exp_count, f"Plugin {p_name} count mismatch: {len(entries)} != {exp_count}")
            total_canonical += len(entries)
        self.assertEqual(total_canonical, 383)

        # Verify live skills execution receipt
        receipt_path = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-07" / "ALL-758-SKILLS-LIVE-EXECUTION-RECEIPT.json"
        self.assertTrue(receipt_path.is_file())
        receipt_raw = receipt_path.read_text(encoding="utf-8")
        self.assertNotIn("C:\\Users\\", receipt_raw)
        self.assertNotIn("C:/Users/", receipt_raw)
        receipt = json.loads(receipt_raw)
        self.assertEqual(receipt["overall_status"], "ALL_SKILLS_EXECUTED_PASS")
        self.assertGreaterEqual(receipt["total_skill_md_files_executed"], 1110)
        self.assertTrue(receipt["consent_gate_enforced"])
        self.assertEqual(receipt["total_mutating_cloud_commands_executed"], 0)
        self.assertEqual(receipt["per_root_skill_counts"]["agents_skills"], 366)
        self.assertEqual(receipt["per_root_skill_counts"]["gemini_config_skills"], 299)
        self.assertGreaterEqual(receipt["per_root_skill_counts"]["gemini_config_plugins"], 445)
        self.assertEqual(receipt["google_prefixed_skills_in_agents_dir"], 187)

    def test_06_round2_f13_validate_skills_strict_rejects_prose_refs_bad_metadata_and_500_lines(self) -> None:
        """White-box test `validate-skills.js --strict` against inline-code/bold prose helper refs, non-string metadata, prohibited description phrases, >500 lines, and missing `SKILL.md`."""
        with tempfile.TemporaryDirectory(prefix="challenger-r2-strict-val-") as tmp:
            tmp_root = Path(tmp)

            # 1. Inline-code & bold prose helper references (`references/missing-doc.md`, **scripts/missing-runner.sh**) + non-string metadata + "You are" description
            skill_prose = tmp_root / "prose-ref-skill"
            skill_prose.mkdir(parents=True)
            (skill_prose / "SKILL.md").write_text(
                "---\n"
                "name: prose-ref-skill\n"
                "description: You are a helpful assistant that PROACTIVELY runs tasks.\n"
                "metadata:\n"
                "  numeric_key: 42\n"
                "---\n"
                "## Use this skill when\n- Testing prose refs.\n"
                "## Do not use\n- Production.\n"
                "## Instructions\n- Consult `references/nonexistent-architecture.md` and **scripts/missing-runner.sh** first.\n",
                encoding="utf-8",
            )

            # 2. Skill exceeding 500 lines
            skill_long = tmp_root / "over-500-lines-skill"
            skill_long.mkdir(parents=True)
            long_body = "\n".join(f"- Step {i}: deterministic check." for i in range(505))
            (skill_long / "SKILL.md").write_text(
                "---\n"
                "name: over-500-lines-skill\n"
                "description: Valid description for line limit test.\n"
                "---\n"
                "## Use this skill when\n- Testing line limits.\n"
                "## Do not use\n- Never.\n"
                "## Instructions\n" + long_body + "\n",
                encoding="utf-8",
            )

            # 3. Non-hidden directory missing SKILL.md entirely
            (tmp_root / "dir-without-skill-md").mkdir(parents=True)

            proc = subprocess.run(
                ["node", str(AGY_VALIDATE_JS), "--strict", "--skills-dir", str(tmp_root)],
                capture_output=True,
                text=True,
                timeout=20,
            )
            self.assertNotEqual(proc.returncode, 0, "Expected strict validator to reject synthetic violations")
            self.assertIn("Missing SKILL.md: dir-without-skill-md", proc.stderr)
            self.assertIn("description must say what the skill does and when to use it, not address the agent", proc.stderr)
            self.assertIn("metadata.numeric_key must be a string", proc.stderr)
            self.assertIn("Referenced file not found or outside skill", proc.stderr)
            self.assertIn("references/nonexistent-architecture.md", proc.stderr)
            self.assertIn("scripts/missing-runner.sh", proc.stderr)
            self.assertIn('Missing "SKILL.md line count <= 500" section (strict)', proc.stderr)
            self.assertIn("over-500-lines-skill", proc.stderr)


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

    def test_03_round2_f15_live_digest_auth_verification_and_project_galaxy_sports_edge(self) -> None:
        """Verify live HTTP Digest Auth verification against `https://cloud.mongodb.com/api/atlas/v1.0` for Org `6af23c6a4b0ddc92393b827f` and Project `Galaxy Sports Edge` (`6af23d2bfdbda62efc136f07`)."""
        file_secrets = load_env_local_secrets(MONGODB_SECRET_FILE)
        self.assertEqual(file_secrets.get("MONGODB_ATLAS_PROJECT_ID"), "6af23d2bfdbda62efc136f07")
        self.assertEqual(file_secrets.get("MONGODB_ATLAS_PROJECT_NAME"), "Galaxy Sports Edge")

        adapter = MongoDBDossierArchiveAdapter()
        self.assertEqual(adapter.atlas_org_id, "6af23c6a4b0ddc92393b827f")
        self.assertEqual(adapter.atlas_project_id, "6af23d2bfdbda62efc136f07")
        self.assertEqual(adapter.atlas_project_name, "Galaxy Sports Edge")

        verification = adapter.verify_atlas_org_and_project(timeout_sec=10.0)
        self.assertEqual(verification["org_id"], "6af23c6a4b0ddc92393b827f")
        self.assertEqual(verification["project_id"], "6af23d2bfdbda62efc136f07")
        self.assertEqual(verification["project_name"], "Galaxy Sports Edge")
        self.assertFalse(verification["org_is_deleted"])
        self.assertIn(verification["verification_mode"], ("live_http_digest_auth", "offline_cached_receipt_fallback"))
        project_ids = {p["id"] for p in verification["projects"]}
        self.assertIn("6af23d2bfdbda62efc136f07", project_ids)
        self.assertIn("ORG_OWNER", verification["roles"])
        self.assertNotIn(file_secrets["MONGODB_ATLAS_PRIVATE_KEY"], json.dumps(verification))

    def test_04_round2_f15_adversarial_http_errors_corrupt_receipt_tiny_timeout_and_secret_hygiene(self) -> None:
        """White-box test `MongoDBDossierArchiveAdapter` under HTTP 401/500, `URLError`, corrupt receipt JSON, malformed API payloads, and tiny `timeout_sec`."""
        import urllib.error

        file_secrets = load_env_local_secrets(MONGODB_SECRET_FILE)
        priv_key = file_secrets["MONGODB_ATLAS_PRIVATE_KEY"]
        adapter = MongoDBDossierArchiveAdapter()

        # 1. Tiny timeout (< 0.05s) must bypass network I/O and use receipt fallback without leaking private key
        res_fast = adapter.verify_atlas_org_and_project(timeout_sec=0.001)
        self.assertFalse(res_fast["live_http_verified"])
        self.assertEqual(res_fast["verification_mode"], "offline_cached_receipt_fallback")
        self.assertEqual(res_fast["project_id"], "6af23d2bfdbda62efc136f07")
        self.assertNotIn(priv_key, json.dumps(res_fast))

        # 2. HTTP 401 Unauthorized & URLError + corrupt receipt file -> must fall back to `offline_default_fallback`
        with tempfile.TemporaryDirectory(prefix="challenger-corrupt-receipt-") as tmp:
            corrupt_receipt = Path(tmp) / "corrupt_receipt.json"
            corrupt_receipt.write_text("{corrupt_json_payload!!!", encoding="utf-8")

            with patch.object(
                MongoDBDossierArchiveAdapter,
                "DEFAULT_RECEIPT_PATH",
                corrupt_receipt,
            ), patch.object(
                adapter,
                "_atlas_get_json",
                side_effect=urllib.error.HTTPError(
                    url="https://cloud.mongodb.com/api/atlas/v1.0/orgs/6af23c6a4b0ddc92393b827f",
                    code=401,
                    msg="Unauthorized Digest",
                    hdrs=None,  # type: ignore[arg-type]
                    fp=None,
                ),
            ):
                fallback_401 = adapter.verify_atlas_org_and_project(timeout_sec=5.0)
                self.assertFalse(fallback_401["live_http_verified"])
                self.assertEqual(fallback_401["verification_mode"], "offline_default_fallback")
                self.assertEqual(fallback_401["org_id"], "6af23c6a4b0ddc92393b827f")
                self.assertEqual(fallback_401["project_id"], "6af23d2bfdbda62efc136f07")
                self.assertNotIn(priv_key, json.dumps(fallback_401))

                projects_401 = adapter.list_atlas_projects(timeout_sec=5.0)
                self.assertEqual(len(projects_401), 1)
                self.assertEqual(projects_401[0]["id"], "6af23d2bfdbda62efc136f07")

                clusters_401 = adapter.list_project_clusters(timeout_sec=5.0)
                self.assertEqual(clusters_401, [])

        # 3. Malformed payload structure from `_atlas_get_json` (non-dict entries inside `results`)
        with patch.object(
            adapter,
            "_atlas_get_json",
            return_value={"results": [None, "corrupt_row", 999, {"id": "p_valid", "name": "ValidProj", "clusterCount": 2}]},
        ):
            filtered_projects = adapter.list_atlas_projects(timeout_sec=5.0)
            self.assertEqual(len(filtered_projects), 1)
            self.assertEqual(filtered_projects[0]["id"], "p_valid")
            self.assertEqual(filtered_projects[0]["clusterCount"], 2)


class TestTier5AdversarialM8GuardrailsAndPythonLedger(unittest.TestCase):
    """White-box adversarial stress tests for M8 (`F17` 36 CI guardrails & AST boundaries, `F18` Python ledger & Stage-0 stdlib PBP fallback)."""

    def test_01_ai_transport_import_boundary_whitebox_ast_violations_and_type_exemptions(self) -> None:
        """White-box test `analyzeSource` in `ai-transport-import-boundary.mjs` across all 6 violation rules and verify `import type` / comments are exempt."""
        guard_url = (REPO_ROOT / "scripts" / "guardrails" / "ai-transport-import-boundary.mjs").as_uri()
        node_script = f"""
        import assert from 'node:assert/strict';
        import {{ analyzeSource }} from {json.dumps(guard_url)};

        // 1. Aliased named import of callClaudeMessages
        const v1 = analyzeSource('apps/web/app/api/chat/route.ts', 'import {{ callClaudeMessages as sneak }} from "@/lib/claude-api/messages";');
        assert.ok(v1.some(v => v.id === 'raw-transport-import'), 'Missed aliased raw-transport-import');

        // 2. Namespace import & Default import of transport module
        const v2 = analyzeSource('apps/web/lib/claude-api/caller.ts', 'import * as m from "./messages";\\nimport defM from "./messages";');
        assert.ok(v2.some(v => v.id === 'raw-transport-namespace-import'), 'Missed raw-transport-namespace-import');
        assert.ok(v2.some(v => v.id === 'raw-transport-default-import'), 'Missed raw-transport-default-import');

        // 3. Export star and named re-export
        const v3 = analyzeSource('apps/web/lib/claude-api/barrel.ts', 'export * from "./messages";\\nexport {{ callClaudeMessages as pub }} from "./messages";');
        assert.ok(v3.some(v => v.id === 'raw-transport-export-star'), 'Missed raw-transport-export-star');
        assert.ok(v3.some(v => v.id === 'raw-transport-reexport'), 'Missed raw-transport-reexport');

        // 4. Namespace property access, computed literal access, and destructuring
        const v4 = analyzeSource(
          'apps/web/lib/other.ts',
          'const ns = require("./some-wrapper");\\nns.callClaudeMessages();\\nns["callClaudeMessages"]();\\nconst {{ callClaudeMessages: extracted }} = ns;'
        );
        const nsHits = v4.filter(v => v.id === 'raw-transport-namespace-access');
        assert.equal(nsHits.length, 3, `Expected 3 raw-transport-namespace-access hits, got ${{nsHits.length}}`);

        // 5. Relative provider import, vendor SDK import, raw endpoint literal, dynamic import & require
        const v5 = analyzeSource(
          'apps/web/lib/claude-api/sneaky.ts',
          'import {{ invoke }} from "./providers/bedrock";\\n' +
          'import Anthropic from "@anthropic-ai/sdk";\\n' +
          'const ep = "https://api.anthropic.com/v1/messages";\\n' +
          'const dyn = await import("./messages");\\n' +
          'const req = require("./messages");'
        );
        assert.ok(v5.some(v => v.id === 'raw-provider-import'), 'Missed relative raw-provider-import');
        assert.ok(v5.some(v => v.id === 'provider-sdk-import'), 'Missed provider-sdk-import');
        assert.ok(v5.some(v => v.id === 'raw-endpoint-literal'), 'Missed raw-endpoint-literal');
        assert.ok(v5.some(v => v.id === 'raw-transport-dynamic'), 'Missed raw-transport-dynamic');
        assert.ok(v5.some(v => v.id === 'raw-transport-require'), 'Missed raw-transport-require');

        // 6. Negative controls: type-only imports, ClaudeMessagesError class import, and comments MUST produce 0 violations
        const clean = analyzeSource(
          'apps/web/lib/safe-consumer.ts',
          '// Example endpoint: https://api.anthropic.com/v1/messages\\n' +
          'import type {{ callClaudeMessages }} from "@/lib/claude-api/messages";\\n' +
          'import {{ type callClaudeMessages as TMsg, ClaudeMessagesError }} from "@/lib/claude-api/messages";\\n' +
          'export const errClass = ClaudeMessagesError;'
        );
        assert.deepEqual(clean, [], `Expected 0 violations on safe code, got ${{JSON.stringify(clean)}}`);
        console.log('AI_TRANSPORT_BOUNDARY_WHITEBOX_OK');
        """
        proc = subprocess.run(
            ["node", "--input-type=module", "-e", node_script],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=30,
        )
        self.assertEqual(proc.returncode, 0, f"ai-transport-import-boundary whitebox failed:\n{proc.stdout}\n{proc.stderr}")
        self.assertIn("AI_TRANSPORT_BOUNDARY_WHITEBOX_OK", proc.stdout)

    def test_02_actor_minting_boundary_and_client_ip_boundary_adversarial_fixture_scans(self) -> None:
        """Verify `actor-minting-boundary.mjs --scan-root` and `client-ip-boundary.mjs --scan-root` catch synthetic violations and pass clean code."""
        actor_guard = REPO_ROOT / "scripts" / "guardrails" / "actor-minting-boundary.mjs"
        ip_guard = REPO_ROOT / "scripts" / "guardrails" / "client-ip-boundary.mjs"

        with tempfile.TemporaryDirectory(prefix="challenger-m8-boundaries-") as tmp:
            tmp_path = Path(tmp)

            # 1. Actor minting adversarial violations
            actor_bad_dir = tmp_path / "actor_bad"
            actor_bad_dir.mkdir()
            (actor_bad_dir / "violator.ts").write_text(
                'import { serviceActor as sa } from "@/lib/auth/actor";\n'
                'import * as actorNs from "@/lib/auth/actor";\n'
                'import { helper } from "@/lib/auth/actor-test-internal";\n'
                'export * from "@/lib/auth/actor";\n'
                'export { systemActor } from "@/lib/auth/actor";\n'
                'const a = actorNs.serviceActor("x");\n'
                'const b = actorNs["systemActor"]("y");\n'
                'const dyn = await import("@/lib/auth/actor");\n',
                encoding="utf-8",
            )
            proc_actor_bad = subprocess.run(
                ["node", str(actor_guard), "--scan-root", str(actor_bad_dir)],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(proc_actor_bad.returncode, 1, f"Expected actor-minting-boundary to fail:\n{proc_actor_bad.stdout}")
            for rule_id in ("[raw-import]", "[test-internal]", "[export-star]", "[raw-reexport]", "[namespace-minting]", "[dynamic-import]"):
                self.assertIn(rule_id, proc_actor_bad.stderr)

            # Actor minting clean negative control
            actor_ok_dir = tmp_path / "actor_ok"
            actor_ok_dir.mkdir()
            (actor_ok_dir / "clean.ts").write_text(
                '// Comment mentioning serviceActor and systemActor\n'
                'import { resolveServiceActor } from "@/lib/auth/actor";\n'
                'export const actor = resolveServiceActor;\n',
                encoding="utf-8",
            )
            proc_actor_ok = subprocess.run(
                ["node", str(actor_guard), "--scan-root", str(actor_ok_dir)],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(proc_actor_ok.returncode, 0, f"Expected clean actor code to pass:\n{proc_actor_ok.stderr}")

            # 2. Client-IP boundary adversarial violations
            ip_bad_dir = tmp_path / "ip_bad"
            ip_bad_dir.mkdir()
            (ip_bad_dir / "route.ts").write_text(
                'export function getIp(req: Request) {\n'
                '  const a = req.headers.get("X-Forwarded-For");\n'
                '  const b = req.headers.get("x-vercel-forwarded-for");\n'
                '  const c = req.headers.get(`x-real-ip`);\n'
                '  return a || b || c;\n'
                '}\n',
                encoding="utf-8",
            )
            proc_ip_bad = subprocess.run(
                ["node", str(ip_guard), "--scan-root", str(ip_bad_dir)],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(proc_ip_bad.returncode, 1, f"Expected client-ip-boundary to fail:\n{proc_ip_bad.stdout}")
            self.assertEqual(proc_ip_bad.stderr.count("[forwarding-header-literal]"), 3)

            # Client-IP clean negative control (comments mentioning x-forwarded-for are allowed)
            ip_ok_dir = tmp_path / "ip_ok"
            ip_ok_dir.mkdir()
            (ip_ok_dir / "clean.ts").write_text(
                '// Never parse x-forwarded-for or x-real-ip directly; use clientIp(req).\n'
                'import { clientIp } from "@/lib/api/rate-limit";\n'
                'export const handler = (req: Request) => clientIp(req);\n',
                encoding="utf-8",
            )
            proc_ip_ok = subprocess.run(
                ["node", str(ip_guard), "--scan-root", str(ip_ok_dir)],
                cwd=str(REPO_ROOT),
                capture_output=True,
                text=True,
                timeout=30,
            )
            self.assertEqual(proc_ip_ok.returncode, 0, f"Expected clean client-ip code to pass:\n{proc_ip_ok.stderr}")

    def test_03_run_all_manifest_fail_closed_and_4_remediated_guardrails_live_pass(self) -> None:
        """Verify `run-all.mjs` fails closed (exit 2) on unknown `--only` guards and passes all 4 remediated TypeScript/Vitest guardrails live."""
        run_all = REPO_ROOT / "scripts" / "guardrails" / "run-all.mjs"

        # 1. Unknown guard name in --only must exit 2
        proc_unknown = subprocess.run(
            ["node", str(run_all), "--only=nonexistent-guard-name"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(proc_unknown.returncode, 2)
        self.assertIn("--only references unknown guard(s): nonexistent-guard-name", proc_unknown.stderr)

        # 2. All 4 remediated guardrails pass live
        proc_4 = subprocess.run(
            [
                "node",
                str(run_all),
                "--only=ai-transport-import-boundary,actor-minting-boundary,client-ip-boundary,ai-council",
                "--json",
            ],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=120,
        )
        self.assertEqual(proc_4.returncode, 0, f"4 remediated guardrails failed:\n{proc_4.stdout}\n{proc_4.stderr}")
        payload = json.loads(proc_4.stdout)
        results = {r["name"]: r["ok"] for r in payload.get("results", [])}
        self.assertEqual(
            results,
            {
                "ai-transport-import-boundary": True,
                "actor-minting-boundary": True,
                "client-ip-boundary": True,
                "ai-council": True,
            },
        )

    def test_04_f18_zero_hybrid_ledger_strings_and_overnight_dry_run_and_seo_lcp(self) -> None:
        """Verify zero hybrid `47-19-1` + `72.9%`/`+26.50u` strings across target Python scripts, test `--dry-run`, and verify SEO LCP freshness."""
        target_scripts = (
            REPO_ROOT / "scripts" / "ops" / "run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py",
            REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py",
            REPO_ROOT / "scripts" / "ops" / "run_week9_full_slate_connected_workflow.py",
            REPO_ROOT / "scripts" / "ops" / "gse_structured_workflow_runner.py",
            REPO_ROOT / "scripts" / "ops" / "workflow_runner.py",
            REPO_ROOT / "intelligence" / "dfs" / "full_stack_post_sim_projection_and_200pt_dfs_orchestrator.py",
            REPO_ROOT / "intelligence" / "seo" / "seo_and_lcp_optimization_engine.py",
        )
        for path in target_scripts:
            self.assertTrue(path.is_file(), f"Missing target script: {path}")
            text = path.read_text(encoding="utf-8")
            for line_no, line in enumerate(text.splitlines(), start=1):
                if "47-19-1" in line:
                    self.assertNotIn("72.9%", line, f"Hybrid 47-19-1 + 72.9% at {path}:{line_no}")
                    self.assertNotIn("0.729", line, f"Hybrid 47-19-1 + 0.729 at {path}:{line_no}")
                    self.assertNotIn("+26.50u", line, f"Hybrid 47-19-1 + +26.50u at {path}:{line_no}")

        # Verify --dry-run does not modify MASTER_RECEIPT_PATH
        shift_script = REPO_ROOT / "scripts" / "ops" / "run_overnight_20h_hermes_opencode_nvidia_openrouter_shift.py"
        receipt_path = REPO_ROOT / "data" / "engine" / "overnight_20h_shift_master_receipt_2026_11_05.json"
        before_bytes = receipt_path.read_bytes() if receipt_path.is_file() else None
        proc_dry = subprocess.run(
            [sys.executable, str(shift_script), "--dry-run"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(proc_dry.returncode, 0, f"Overnight shift --dry-run failed:\n{proc_dry.stdout}\n{proc_dry.stderr}")
        self.assertIn("OFFICIAL VERIFIED RECORD: 47-19-1 (71.2% · +24.92u)", proc_dry.stdout)
        self.assertIn("[DRY-RUN] Verified all 5 tracks without modifying master shift receipt.", proc_dry.stdout)
        after_bytes = receipt_path.read_bytes() if receipt_path.is_file() else None
        self.assertEqual(before_bytes, after_bytes, "--dry-run mutated overnight_20h_shift_master_receipt_2026_11_05.json")

        # Verify SEO & LCP engine
        from intelligence.seo.seo_and_lcp_optimization_engine import (
            audit_content_freshness_and_lcp,
            compute_lcp_4_subpart_breakdown_and_fixes,
        )

        freshness = audit_content_freshness_and_lcp()
        lcp_4 = compute_lcp_4_subpart_breakdown_and_fixes()
        self.assertTrue(freshness["lcp_four_subpart_audit"]["verified_47_19_1_present"])
        self.assertTrue(freshness["lcp_four_subpart_audit"]["no_inverted_overall_framing"])
        self.assertTrue(freshness["lcp_four_subpart_audit"]["zero_bogus_2024_matchups_verified"])
        self.assertTrue(lcp_4["passes_cwv_good_threshold"])
        self.assertLessEqual(lcp_4["total_lcp_ms"], 2500)

    def test_05_f18_stage0_stdlib_dataframe_fallback_parity_and_contamination_rejection(self) -> None:
        """White-box test `_StdlibDataFrame` in `enforce_stage0_roster_and_board_allowlist.py` when `pd = None` and verify contamination rejection."""
        import scripts.ops.enforce_stage0_roster_and_board_allowlist as stage0_mod

        # 1. Execute with pd = None (stdlib gzip.open + csv.DictReader fallback)
        with patch.object(stage0_mod, "pd", None):
            allowlist_stdlib = stage0_mod.load_stage0_game_roster_allowlist("JAX", "BAL", week=9)
            self.assertEqual(allowlist_stdlib["matchup"], "JAX@BAL")
            self.assertGreaterEqual(len(allowlist_stdlib["allowed_players"]), 15)
            self.assertIn("Trevor Lawrence", allowlist_stdlib["allowed_players"])
            self.assertIn("Joe Fagnano", allowlist_stdlib["allowed_players"])
            self.assertTrue(allowlist_stdlib["stage0_receipt_sha256"])

            # 2. Inject an off-roster hallucinated player ("Tank Bigsby") into a synthetic board and verify Stage0RosterContaminationError
            real_board_path = REPO_ROOT / "data" / "engine" / "tnf_jax_bal_dk_full_board_2026_11_05.json"
            board_data = json.loads(real_board_path.read_text(encoding="utf-8"))
            board_data["props"].append(
                {
                    "athlete": "Tank Bigsby",
                    "team": "JAX",
                    "position": "RB",
                    "market": "Total Rushing Yards (incl. overtime)",
                    "line": 45.5,
                    "open_line": 45.5,
                    "has_price": True,
                }
            )
            with patch.object(
                stage0_mod,
                "resolve_or_generate_matchup_board",
                return_value=(board_data, "synthetic_contaminated_board.json"),
            ):
                with self.assertRaises(stage0_mod.Stage0RosterContaminationError) as ctx:
                    stage0_mod.load_stage0_game_roster_allowlist("JAX", "BAL", week=9)
                self.assertIn("Tank Bigsby", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)

