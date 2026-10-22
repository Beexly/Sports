#!/usr/bin/env python3
"""High-confidence secret scan and redaction.

Mirrors scripts/guardrails/secret-scan.mjs. Used by the workspace harvester
so credentials are never copied into the audit branch. Exit 1 if a scanned
file still contains a high-confidence secret.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Long tails required so provider-prefix examples in docs do not trip.
RULES: list[tuple[str, re.Pattern[str]]] = [
    ("stripe.secret.live", re.compile(r"\bsk_live_[A-Za-z0-9]{20,}\b")),
    ("stripe.secret.test", re.compile(r"\bsk_test_[A-Za-z0-9]{20,}\b")),
    ("stripe.restricted.live", re.compile(r"\brk_live_[A-Za-z0-9]{20,}\b")),
    ("stripe.webhook", re.compile(r"\bwhsec_[A-Za-z0-9]{24,}\b")),
    ("anthropic.key", re.compile(r"\bsk-ant-[A-Za-z0-9_\-]{30,}\b")),
    ("aws.access-key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("google.oauth.secret", re.compile(r"\bGOCSPX-[A-Za-z0-9_\-]{20,}\b")),
    ("openai.key", re.compile(r"\bsk-proj-[A-Za-z0-9_\-]{30,}\b")),
    ("openai.key.legacy", re.compile(r"\bsk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}\b")),
    ("openrouter.key", re.compile(r"\bsk-or-v1-[A-Za-z0-9]{20,}\b")),
    ("github.token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b")),
    ("github.pat.fine-grained", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{50,}\b")),
    ("slack.token", re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{20,}\b")),
    ("neon.api-key", re.compile(r"\bnapi_[A-Za-z0-9]{40,}\b")),
    ("xai.key", re.compile(r"\bxai-[A-Za-z0-9]{30,}\b")),
    ("private-key-block", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----")),
    (
        "db.url.with-password",
        re.compile(r"\bpostgres(?:ql)?://[^\s:/@]+:([^\s:/@]{6,})@(?!localhost|127\.0\.0\.1)[^\s:/?#]+", re.I),
    ),
    (
        "redis.url.with-password",
        re.compile(r"\brediss?://[^\s:/@]*:([^\s:/@]{6,})@(?!localhost|127\.0\.0\.1)[^\s:/?#]+", re.I),
    ),
]
# Provider prefix is concatenated so this source file does not itself contain a key-shaped literal.
_ALI = "LT" + "AI"
RULES.append(("alibaba.access-key", re.compile(r"\b" + _ALI + r"[A-Za-z0-9]{16,24}\b")))
_HF = "hf_"
RULES.append(("huggingface.token", re.compile(r"\b" + _HF + r"[A-Za-z0-9]{30,}\b")))

SKIP_NAMES = {
    ".env",
    ".env.local",
    ".env.production",
    "auth.json",
    "credentials.json",
    "id_rsa",
    "id_ed25519",
    "cookies.txt",
}
SKIP_NAME_PARTS = (
    "prod-mc-billing",
    "prod-mc-auth",
    "service-account",
    "accesskey",
    ".pem",
)


def credential_filename(name: str) -> bool:
    low = name.lower()
    if low in SKIP_NAMES or low.startswith(".env"):
        return True
    return any(part in low for part in SKIP_NAME_PARTS)


def find_secrets(text: str) -> list[str]:
    hits: list[str] = []
    for rule_id, pattern in RULES:
        if pattern.search(text):
            hits.append(rule_id)
    return hits


def redact(text: str) -> tuple[str, int]:
    count = 0
    for rule_id, pattern in RULES:
        text, n = pattern.subn(f"[REDACTED:{rule_id}]", text)
        count += n
    return text, count


def scan_path(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        return [f"unreadable:{exc}"]
    return find_secrets(text)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scan files for high-confidence secrets")
    parser.add_argument("--paths", nargs="*", default=[])
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        sample = "token sk-or-v1-" + ("a" * 32) + " end"
        red, n = redact(sample)
        assert n == 1 and "sk-or-v1-" not in red, red
        assert find_secrets("whsec_test") == []
        print("scan_sensitive self-test passed")
        return 0
    failed = 0
    for raw in args.paths:
        path = Path(raw)
        if not path.is_file():
            print(f"MISSING {path}")
            failed += 1
            continue
        hits = scan_path(path)
        if hits:
            failed += 1
            print(f"SECRET {path} rules={','.join(hits)}")
    if failed:
        print(f"scan_sensitive: {failed} file(s) failed")
        return 1
    print(f"scan_sensitive: clean ({len(args.paths)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
