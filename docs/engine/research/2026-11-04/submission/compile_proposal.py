#!/usr/bin/env python3
"""
GSI Submission Compiler & TeX/BibTeX Invariance Validator
Galaxy Science Institute (Texas SOS #15043440630001, IRS EIN 43-2804773)

Validates and compiles all scientific whitepapers and grant proposals:
  - wp06_finalized_camera_ready.tex (IEEE CompSoc 2-column)
  - fast_grants_proposal.tex (2-Page Fast Grants / Emergent Ventures)
  - gsi_20m_sovereign_grant_proposal.tex ($20M ARPA-H / DARPA BTO)
  - references.bib (Verified BibTeX database)

Usage:
  python compile_proposal.py --validate-only
  python compile_proposal.py [--all]
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


SUBMISSION_DIR = Path(__file__).resolve().parent

REQUIRED_TEX_FILES = [
    "wp06_finalized_camera_ready.tex",
    "fast_grants_proposal.tex",
    "gsi_20m_sovereign_grant_proposal.tex",
]

REQUIRED_BIB_FILE = "references.bib"

REQUIRED_AUTHORS = [
    "Byles, Lucy",
    "Crowley, P. J. D.",
]

REQUIRED_BIB_KEYS = [
    "byles2026measurement",
    "crowley2020failed",
    "seifert2005entropy",
    "chen1958integration",
    "granger1969investigating",
    "sugihara2012detecting",
    "gulen2024enhancing",
    "zhang2025topological",
    "villani2009optimal",
    "goulet2020probabilistic",
]


def check_balanced_environments(content: str, filename: str) -> None:
    """Ensure all \\begin{env} have matching \\end{env} in proper order."""
    # Strip comments to avoid false alarms
    clean_lines = []
    for line in content.splitlines():
        # Match % not preceded by backslash
        line_clean = re.sub(r'(?<!\\)%.*$', '', line)
        clean_lines.append(line_clean)
    clean_text = "\n".join(clean_lines)

    env_pattern = re.compile(r'\\(begin|end)\{([a-zA-Z0-9*]+)\}')
    stack = []
    for match in env_pattern.finditer(clean_text):
        action, env_name = match.groups()
        if action == "begin":
            stack.append((env_name, match.start()))
        elif action == "end":
            if not stack:
                raise ValueError(f"[{filename}] Found \\end{{{env_name}}} with no matching \\begin")
            last_env, pos = stack.pop()
            if last_env != env_name:
                raise ValueError(
                    f"[{filename}] Mismatched environment: expected \\end{{{last_env}}}, found \\end{{{env_name}}}"
                )
    if stack:
        unclosed = [e[0] for e in stack]
        raise ValueError(f"[{filename}] Unclosed environments at EOF: {unclosed}")


def check_forbidden_macros(content: str, filename: str) -> None:
    """Ensure no illegal \\hr macro calls exist (must be \\hrule or \\vspace...\\hrule)."""
    # Look for \hr followed by non-alpha character or end of line
    matches = list(re.finditer(r'\\hr(?![a-zA-Z])', content))
    if matches:
        raise ValueError(
            f"[{filename}] Found {len(matches)} illegal '\\hr' macros. Use '\\hrule' or valid LaTeX rules instead."
        )


def validate_bibtex(bib_path: Path) -> None:
    """Ensure references.bib exists and contains verified citations and authors."""
    if not bib_path.exists():
        raise FileNotFoundError(f"Missing required BibTeX file: {bib_path}")

    content = bib_path.read_text(encoding="utf-8")

    # Check required keys
    for key in REQUIRED_BIB_KEYS:
        if not re.search(rf'@\w+\s*\{{\s*{key}\s*,', content, re.IGNORECASE):
            raise ValueError(f"[references.bib] Missing required citation key: {key}")

    # Check verified author names
    for author in REQUIRED_AUTHORS:
        if author not in content:
            raise ValueError(f"[references.bib] Missing verified required author: '{author}'")

    print(f"  [OK] {bib_path.name}: All {len(REQUIRED_BIB_KEYS)} citation keys & verified authors present.")


def validate_tex_files() -> None:
    """Verify all TeX files exist, have balanced environments, and zero forbidden macros."""
    for tex_name in REQUIRED_TEX_FILES:
        tex_path = SUBMISSION_DIR / tex_name
        if not tex_path.exists():
            raise FileNotFoundError(f"Missing required LaTeX file: {tex_path}")

        content = tex_path.read_text(encoding="utf-8")
        check_forbidden_macros(content, tex_name)
        check_balanced_environments(content, tex_name)
        print(f"  [OK] {tex_name}: Syntax, macros, and environment closures verified.")


def compile_tex(tex_name: str) -> bool:
    """Compile a single TeX file with pdflatex and bibtex."""
    pdflatex = shutil.which("pdflatex")
    bibtex = shutil.which("bibtex")

    if not pdflatex:
        print(f"  [WARN] 'pdflatex' executable not found on PATH. Skipping compilation for {tex_name}.")
        return False

    base_name = Path(tex_name).stem
    cmd_env = os.environ.copy()

    try:
        print(f"  [RUN] Compiling {tex_name} (Pass 1)...")
        subprocess.run(
            [pdflatex, "-interaction=nonstopmode", tex_name],
            cwd=SUBMISSION_DIR,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )

        if bibtex and (SUBMISSION_DIR / f"{base_name}.aux").exists():
            print(f"  [RUN] Resolving citations with bibtex for {tex_name}...")
            subprocess.run(
                [bibtex, base_name],
                cwd=SUBMISSION_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )

        print(f"  [RUN] Finalizing {tex_name} (Pass 2 & 3)...")
        subprocess.run(
            [pdflatex, "-interaction=nonstopmode", tex_name],
            cwd=SUBMISSION_DIR,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        subprocess.run(
            [pdflatex, "-interaction=nonstopmode", tex_name],
            cwd=SUBMISSION_DIR,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        print(f"  [SUCCESS] Generated PDF: {SUBMISSION_DIR / (base_name + '.pdf')}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  [ERROR] Compilation failed for {tex_name}:")
        output = e.stdout.decode('utf-8', errors='replace')
        print(output[-1000:])
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="GSI TeX & BibTeX Validation and Build Suite")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Perform strict syntax, macro, and author verification without compiling PDFs.",
    )
    parser.add_argument(
        "--file",
        type=str,
        help="Compile a specific TeX file instead of all files.",
    )
    args = parser.parse_args()

    print("======================================================================")
    print("Galaxy Science Institute (GSI) Proposal & Whitepaper Validation Engine")
    print(f"Directory: {SUBMISSION_DIR}")
    print("======================================================================")

    # Step 1: Strict Validation
    try:
        print("\n1. Validating BibTeX Database:")
        validate_bibtex(SUBMISSION_DIR / REQUIRED_BIB_FILE)

        print("\n2. Validating LaTeX Source Files:")
        validate_tex_files()

        print("\n===> ALL VALIDATION CHECKS PASSED SUCCESSFULLY! <===")
    except Exception as exc:
        print(f"\n[VALIDATION FAILED] {exc}", file=sys.stderr)
        return 1

    if args.validate_only:
        return 0

    # Step 2: PDF Compilation (if requested and compiler present)
    print("\n3. Compilation Phase:")
    targets = [args.file] if args.file else REQUIRED_TEX_FILES
    all_compiled = True
    for target in targets:
        ok = compile_tex(target)
        if not ok:
            all_compiled = False

    return 0 if all_compiled else 2


if __name__ == "__main__":
    sys.exit(main())
