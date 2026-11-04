"""Measure analytics instrumentation coverage.

WHY THIS EXISTS

`apps/web/lib/analytics/events.ts` declares a 29-event conversion-funnel taxonomy
with a written rationale per event, and a `track()` that is a deliberate NO-OP
("Intentionally inert for now — no network, no identity") pending an owner
decision on a provider.

That is a defensible design. But it means two separate questions get conflated,
and only one of them is visible from a code review:

  1. Is the event DECLARED?          -> 29/29, all documented.
  2. Is it actually EMITTED?         -> measured below.
  3. Would emitting it RECORD anything? -> currently no, for every event.

A taxonomy that reads as complete while 69% of it never fires is worse than no
taxonomy, because it makes the funnel look instrumented. This script separates
the three questions and reports each with numbers.

It is a REPORT, not a gate. An event may be declared ahead of the wiring that
fires it — this codebase did exactly that on purpose. Gating on "every event must
be fired" would forbid deliberate ahead-of-time taxonomy design. What should not
happen is adding to the taxonomy believing it is already measured.

USAGE
    python scripts/ops/analytics_coverage.py
    python scripts/ops/analytics_coverage.py --json
    python scripts/ops/analytics_coverage.py --check-sink   # exit 1 if inert
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
EVENTS_FILE = REPO / "apps" / "web" / "lib" / "analytics" / "events.ts"

# Funnel stages, so a gap can be read as "the middle of the funnel is dark"
# rather than as an undifferentiated list.
STAGES: dict[str, tuple[str, ...]] = {
    "acquisition": ("ai_referral",),
    "pricing_visit": ("pricing_page_view", "plan_card_view", "plan_compare_expand"),
    "upgrade_intent": ("feature_lock_click", "upgrade_cta_click", "elite_feature_view",
                       "operator_waitlist_join"),
    "checkout": ("promo_code_apply", "promo_code_success", "promo_code_fail",
                 "checkout_start", "checkout_complete", "checkout_abandon"),
    "product_value": ("free_preview_pick_view", "locked_pick_click",
                      "no_bet_explainer_view", "confidence_explainer_view",
                      "calibration_view"),
    "churn": ("cancellation_start", "cancellation_reason_submit"),
    "waitlist": ("waitlist_viewed", "waitlist_started", "waitlist_submitted",
                 "waitlist_consent_blocked"),
    "trust": ("transparency_read", "research_brief_clicked", "audit_offer_clicked"),
    "compliance": ("claim_gate_hit",),
}


def parse_taxonomy(text: str) -> list[str]:
    """Event names from the union type. Comments between members are ignored."""
    body = re.search(r"export type AnalyticsEvent =(.*?);", text, re.S)
    if not body:
        raise SystemExit("could not locate the AnalyticsEvent union")
    # Not anchored to line-start: a union may be written on one line, and an
    # anchored pattern silently returned only its first member.
    names = re.findall(r'\|?\s*"([a-zA-Z0-9_]+)"', body.group(1))
    # Deduplicate while preserving declaration order.
    seen: dict[str, None] = {}
    for n in names:
        seen.setdefault(n, None)
    return list(seen)


def source_files() -> list[Path]:
    try:
        out = subprocess.run(["git", "ls-files"], cwd=REPO, capture_output=True,
                             text=True, check=True).stdout
        paths = [REPO / p for p in out.splitlines() if p.endswith((".ts", ".tsx"))]
    except (subprocess.CalledProcessError, FileNotFoundError):
        paths = list(REPO.glob("apps/web/**/*.ts")) + list(REPO.glob("apps/web/**/*.tsx"))
    return [p for p in paths if p.exists() and p != EVENTS_FILE
            and "analytics/events" not in str(p)]


def fired_events(files: list[Path], events: list[str]) -> dict[str, int]:
    """Count call sites per event. Matches track("evt") and track('evt')."""
    counts = {e: 0 for e in events}
    patterns = {e: (f'track("{e}"', f"track('{e}'") for e in events}
    for p in files:
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for e, pats in patterns.items():
            if pats[0] in text or pats[1] in text:
                counts[e] += 1
    return counts


def strip_comments(code: str) -> str:
    """Remove // line comments and /* */ blocks.

    Necessary, not cosmetic: the body of track() contains the COMMENT
    "dispatch here (e.g. window.analytics?.track(...))". A naive token scan
    reads that as real I/O and reports the sink as wired, which is the opposite
    of the truth. Prose describing the wiring is not the wiring.
    """
    code = re.sub(r"/\*.*?\*/", "", code, flags=re.S)
    code = re.sub(r"(?m)//.*$", "", code)
    return code


def sink_status(text: str) -> dict[str, object]:
    """Is track() wired to anything? Reports the evidence, not a guess."""
    body = re.search(r"export function track\((.*?)\n\}", text, re.S)
    raw_interior = body.group(1) if body else ""
    interior = strip_comments(raw_interior)
    # Detect I/O primitives in the executable body only.
    io_tokens = ("fetch(", "navigator.sendBeacon", "window.analytics",
                 "posthog", "amplitude", "mixpanel", "segment")
    found = [t for t in io_tokens if t in interior]
    # The inert marker lives IN a comment, so it must be read from the raw body;
    # checking the stripped body removed the very text it was looking for.
    inert_comment = ("Intentionally inert" in raw_interior or "NO-OP" in text
                     or "NO-OP" in raw_interior)
    return {
        "wired": bool(found),
        "io_tokens": found,
        "explicitly_inert": inert_comment,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--check-sink", action="store_true",
                    help="exit 1 when track() cannot record anything")
    args = ap.parse_args()

    text = EVENTS_FILE.read_text(encoding="utf-8")
    events = parse_taxonomy(text)
    counts = fired_events(source_files(), events)
    sink = sink_status(text)

    fired = {e: n for e, n in counts.items() if n}
    dead = [e for e, n in counts.items() if not n]

    staged = {}
    for stage, members in STAGES.items():
        present = [e for e in members if e in counts]
        live = [e for e in present if counts[e]]
        staged[stage] = {
            "total": len(present),
            "fired": len(live),
            "dead": [e for e in present if not counts[e]],
        }

    report = {
        "events_declared": len(events),
        "events_fired": len(fired),
        "events_dead": len(dead),
        "coverage_pct": round(100.0 * len(fired) / len(events), 1) if events else 0.0,
        "sink": sink,
        "dead_events": dead,
        "fired_events": fired,
        "by_stage": staged,
        "vacuous": not sink["wired"],
    }

    if args.json:
        print(json.dumps(report, indent=2))
        return 1 if (args.check_sink and not sink["wired"]) else 0

    print(f"declared: {report['events_declared']}   "
          f"fired: {report['events_fired']}   dead: {report['events_dead']}   "
          f"coverage: {report['coverage_pct']}%")
    print()
    if not sink["wired"]:
        print("SINK: track() cannot record anything (no I/O in its body).")
        if sink["explicitly_inert"]:
            print("      Documented as intentional — an owner decision, not an oversight.")
        print("      Every 'fired' event below is therefore ALSO vacuous.")
        print()
    print(f"{'stage':<16} {'fired':>5}/{'total':<5} dead")
    print("-" * 62)
    for stage, s in staged.items():
        print(f"{stage:<16} {s['fired']:>5}/{s['total']:<5} {', '.join(s['dead']) or '-'}")
    print()
    print("never fired:")
    for e in dead:
        print(f"  {e}")

    if args.check_sink and not sink["wired"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
